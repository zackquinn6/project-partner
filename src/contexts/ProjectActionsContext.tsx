import React, { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';
import { Project } from '@/interfaces/Project';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useProjectData } from './ProjectDataContext';
import { useGuest } from './GuestContext';
import { toast } from '@/components/ui/use-toast';
import { isKickoffPhaseComplete, KICKOFF_UI_STEP_IDS } from '@/utils/projectUtils';
import { useOptimizedState } from '@/hooks/useOptimizedState';
import { mergeQualityControlSettings, parseQualityControlSettingsColumn } from '@/utils/qualityControlSettings';
import { parseCustomizationDecisions } from '@/utils/customizationDecisions';
import { reportUserFacingError } from '@/utils/errorReporting';
import {
  buildPlanningScopeBaseline,
  collectPlanningToolChangeSummaries,
} from '@/utils/planningChangeTracking';
import type { Json } from '@/integrations/supabase/types';
import { getDefaultHomeIdForUser } from '@/utils/ensureDefaultHome';

function parseCompletedStepsColumn(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((x): x is string => typeof x === 'string');
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((x): x is string => typeof x === 'string')
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Copy `project_risks` → `project_run_risks`: tolerate driver/PostgREST types for nullable text columns. */
function optionalDbTextForRiskCopy(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') {
    const t = value.trim();
    return t.length > 0 ? t : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  throw new Error('Risk row text field has unsupported type for copy');
}

function numberOrNullForRunRisk(value: unknown, field: string): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${field} must be a finite number`);
    return value;
  }
  if (typeof value === 'string') {
    const n = Number(value.trim());
    if (!Number.isFinite(n)) throw new Error(`${field} must be a valid number`);
    return n;
  }
  throw new Error(`${field} has invalid type`);
}

function normalizeMitigationActionsForRunRisk(value: unknown): Json | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value as Json;
  if (typeof value === 'string') {
    const t = value.trim();
    if (!t) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(t);
    } catch {
      throw new Error('mitigation_actions is not valid JSON');
    }
    if (parsed == null) return null;
    if (Array.isArray(parsed) || (typeof parsed === 'object' && !Array.isArray(parsed))) {
      return parsed as Json;
    }
    throw new Error('mitigation_actions JSON must be an object or array');
  }
  if (typeof value === 'object' && !Array.isArray(value)) return value as Json;
  throw new Error('mitigation_actions has invalid type');
}

function sanitizeMitigationActionsForInsert(value: unknown): Json | null {
  const normalized = normalizeMitigationActionsForRunRisk(value);
  if (normalized == null) return null;
  try {
    return JSON.parse(JSON.stringify(normalized)) as Json;
  } catch {
    throw new Error('mitigation_actions could not be serialized for storage');
  }
}

type ProjectRunRiskInsertRow = {
  project_run_id: string;
  template_risk_id: string;
  /** Copied from Standard Project Foundation project_risks vs this template's project_risks. */
  from_standard_foundation: boolean;
  risk_title: string;
  risk_description: string | null;
  likelihood: string | null;
  severity: string | null;
  schedule_impact_low_days: number | null;
  schedule_impact_high_days: number | null;
  budget_impact_low: number | null;
  budget_impact_high: number | null;
  mitigation_strategy: string | null;
  mitigation_actions: Json | null;
  mitigation_cost: number | null;
  recommendation: string | null;
  impact: string | null;
  benefit: string | null;
  display_order: number;
};

function isPostgresUniqueViolation(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  if (err.code === '23505') return true;
  const m = (err.message || '').toLowerCase();
  return m.includes('duplicate key') || m.includes('unique constraint');
}

function mutableProjectRunRiskFields(row: ProjectRunRiskInsertRow) {
  return {
    template_risk_id: row.template_risk_id,
    risk_title: row.risk_title,
    risk_description: row.risk_description,
    likelihood: row.likelihood,
    severity: row.severity,
    schedule_impact_low_days: row.schedule_impact_low_days,
    schedule_impact_high_days: row.schedule_impact_high_days,
    budget_impact_low: row.budget_impact_low,
    budget_impact_high: row.budget_impact_high,
    mitigation_strategy: row.mitigation_strategy,
    mitigation_actions: row.mitigation_actions,
    mitigation_cost: row.mitigation_cost,
    recommendation: row.recommendation,
    impact: row.impact,
    benefit: row.benefit,
    display_order: row.display_order,
  };
}

/** Sync one template-derived run risk: update by template id, else insert, else resolve unique conflict by title. */
async function upsertProjectRunRiskRow(row: ProjectRunRiskInsertRow): Promise<void> {
  const fields = mutableProjectRunRiskFields(row);
  const { data: byTemplate, error: updateByTemplateError } = await supabase
    .from('project_run_risks')
    .update(fields)
    .eq('project_run_id', row.project_run_id)
    .eq('template_risk_id', row.template_risk_id)
    .select('id');

  if (updateByTemplateError) {
    throw updateByTemplateError;
  }
  if (byTemplate && byTemplate.length > 0) {
    return;
  }

  const { error: insertError } = await supabase.from('project_run_risks').insert(row);

  if (!insertError) {
    return;
  }

  if (isPostgresUniqueViolation(insertError)) {
    const { data: byTitle, error: updateByTitleError } = await supabase
      .from('project_run_risks')
      .update(fields)
      .eq('project_run_id', row.project_run_id)
      .eq('risk_title', row.risk_title)
      .select('id');

    if (updateByTitleError) {
      throw updateByTitleError;
    }
    if (byTitle && byTitle.length > 0) {
      return;
    }
  }

  throw insertError;
}

const RISK_ASSEMBLY_ACCESS_MESSAGE =
  'Cannot contact database to access risks. Contact administrator';

/** Root template id for `project_risks` (revision rows use `parent_project_id` when set). */
async function resolveTemplateRootIdForRisks(projectId: string): Promise<string> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, parent_project_id')
    .eq('id', projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error('Template not found for risk assembly');
  const parent = data.parent_project_id as string | null | undefined;
  return parent && parent.length > 0 ? parent : data.id;
}

/**
 * Merge Standard Project Foundation `project_risks` + template `project_risks` onto `project_run_risks`.
 * Same rules as Risk-Less / createProjectRun — must run for catalog starts (`addProjectRun`) too.
 */
async function syncFoundationAndTemplateRisksToProjectRun(
  projectRunId: string,
  templateRootIdForRisks: string
): Promise<void> {
  const { data: standardProject, error: standardProjectError } = await supabase
    .from('projects')
    .select('id')
    .eq('is_standard', true)
    .single();

  if (standardProjectError) throw standardProjectError;
  if (!standardProject?.id) {
    throw new Error('Standard project foundation not found (is_standard = true).');
  }

  const { data: foundationRisksRes, error: foundationRisksError } = await supabase
    .from('project_risks')
    .select('*')
    .eq('project_id', standardProject.id)
    .order('display_order', { ascending: true });

  if (foundationRisksError) throw foundationRisksError;

  let projectRisks: any[] = [];
  if (standardProject.id !== templateRootIdForRisks) {
    const { data: projectRisksRes, error: projectRisksError } = await supabase
      .from('project_risks')
      .select('*')
      .eq('project_id', templateRootIdForRisks)
      .order('display_order', { ascending: true });

    if (projectRisksError) throw projectRisksError;
    projectRisks = projectRisksRes || [];
  }

  const foundationRisks = foundationRisksRes || [];
  const foundationRiskIds = new Set(
    foundationRisks
      .map((r: { id?: unknown }) => (r?.id != null && String(r.id).length > 0 ? String(r.id) : null))
      .filter((id): id is string => id != null)
  );
  const sourceRisksOrdered = [...foundationRisks, ...projectRisks];

  if (sourceRisksOrdered.length === 0) {
    throw new Error(RISK_ASSEMBLY_ACCESS_MESSAGE);
  }

  const seenNormalizedTitles = new Set<string>();
  const mergedForInsert = sourceRisksOrdered.filter((risk: any) => {
    const title = typeof risk?.risk_title === 'string' ? risk.risk_title.trim() : '';
    if (!title) return false;
    const key = title.toLowerCase();
    if (seenNormalizedTitles.has(key)) return false;
    seenNormalizedTitles.add(key);
    return true;
  });

  if (mergedForInsert.length === 0) {
    throw new Error(RISK_ASSEMBLY_ACCESS_MESSAGE);
  }

  const insertRows: ProjectRunRiskInsertRow[] = mergedForInsert.map((risk: any, idx: number) => {
    const templateRiskId =
      typeof risk?.id === 'string' && risk.id.length > 0
        ? risk.id
        : risk?.id != null && String(risk.id).length > 0
          ? String(risk.id)
          : null;
    if (!templateRiskId) {
      throw new Error('Risk row from database is missing id');
    }
    const fromStandardFoundation = foundationRiskIds.has(templateRiskId);
    return {
      project_run_id: projectRunId,
      template_risk_id: templateRiskId,
      from_standard_foundation: fromStandardFoundation,
      risk_title: risk.risk_title.trim(),
      risk_description: optionalDbTextForRiskCopy(risk.risk_description),
      likelihood: optionalDbTextForRiskCopy(risk.likelihood),
      severity: optionalDbTextForRiskCopy(risk.severity),
      schedule_impact_low_days: numberOrNullForRunRisk(risk.schedule_impact_low_days, 'schedule_impact_low_days'),
      schedule_impact_high_days: numberOrNullForRunRisk(
        risk.schedule_impact_high_days,
        'schedule_impact_high_days'
      ),
      budget_impact_low: numberOrNullForRunRisk(risk.budget_impact_low, 'budget_impact_low'),
      budget_impact_high: numberOrNullForRunRisk(risk.budget_impact_high, 'budget_impact_high'),
      mitigation_strategy: optionalDbTextForRiskCopy(risk.mitigation_strategy),
      mitigation_actions: sanitizeMitigationActionsForInsert(risk.mitigation_actions),
      mitigation_cost: numberOrNullForRunRisk(risk.mitigation_cost, 'mitigation_cost'),
      recommendation: optionalDbTextForRiskCopy(risk.recommendation),
      impact: optionalDbTextForRiskCopy(risk.impact),
      benefit: optionalDbTextForRiskCopy(risk.benefit),
      display_order: idx,
    };
  });

  const { data: existingForRun, error: existingErr } = await supabase
    .from('project_run_risks')
    .select('template_risk_id')
    .eq('project_run_id', projectRunId);

  if (existingErr) {
    throw existingErr;
  }

  const existingTemplateIds = new Set(
    (existingForRun ?? [])
      .map((r) => r.template_risk_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
  );

  const toBulkInsert = insertRows.filter(
    (r) => r.template_risk_id != null && !existingTemplateIds.has(r.template_risk_id)
  );
  const toUpsert = insertRows.filter(
    (r) => r.template_risk_id != null && existingTemplateIds.has(r.template_risk_id)
  );

  if (toBulkInsert.length > 0) {
    const { error: bulkInsertError } = await supabase.from('project_run_risks').insert(toBulkInsert);
    if (bulkInsertError) {
      throw bulkInsertError;
    }
  }

  if (toUpsert.length > 0) {
    await Promise.all(
      toUpsert.map((row) =>
        upsertProjectRunRiskRow(row).catch((rowErr) => {
          console.error('❌ project_run_risks row sync failed:', rowErr, {
            projectRunId,
            risk_title: row.risk_title,
            template_risk_id: row.template_risk_id,
          });
          throw rowErr;
        })
      )
    );
  }
}

async function applyRiskFocusSessionToRun(runId: string): Promise<void> {
  const { data: row, error } = await supabase
    .from('project_runs')
    .select('completed_steps, customization_decisions')
    .eq('id', runId)
    .single();

  if (error) throw error;
  if (!row) throw new Error('Project run not found for Risk-Less finalize');

  const existingSteps = parseCompletedStepsColumn(row.completed_steps);
  const mergedSteps = [...new Set([...existingSteps, ...KICKOFF_UI_STEP_IDS])];

  let decisions: Record<string, unknown> = {};
  const raw = row.customization_decisions;
  if (raw != null) {
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          decisions = { ...(parsed as Record<string, unknown>) };
        }
      } catch {
        decisions = {};
      }
    } else if (typeof raw === 'object' && !Array.isArray(raw)) {
      decisions = { ...(raw as Record<string, unknown>) };
    }
  }
  decisions.risk_focus = true;

  const completedStepsJson = JSON.parse(JSON.stringify(mergedSteps)) as Json;
  const decisionsJson = JSON.parse(JSON.stringify(decisions)) as Json;

  const { error: updErr } = await supabase
    .from('project_runs')
    .update({
      completed_steps: completedStepsJson,
      customization_decisions: decisionsJson,
      status: 'in-progress',
    })
    .eq('id', runId);

  if (updErr) throw updErr;
}

interface ProjectActionsContextType {
  currentProject: Project | null;
  currentProjectRun: ProjectRun | null;
  setCurrentProject: (project: Project | null) => void;
  setCurrentProjectRun: (projectRun: ProjectRun | null) => void;
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  createProjectRun: (
    project: Project,
    customName?: string,
    homeId?: string,
    options?: { riskFocusSession?: boolean }
  ) => Promise<string | null>;
  addProjectRun: (projectRun: Omit<ProjectRun, 'id' | 'createdAt' | 'updatedAt'>, onSuccess?: (projectRunId: string) => void) => Promise<void>;
  updateProject: (project: Project) => Promise<void>;
  updateProjectRun: (projectRun: ProjectRun) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  deleteProjectRun: (projectRunId: string) => Promise<void>;
  refreshProjectRunFromTemplate: (runId: string) => Promise<void>;
}

const ProjectActionsContext = createContext<ProjectActionsContextType | undefined>(undefined);

export const useProjectActions = () => {
  const context = useContext(ProjectActionsContext);
  if (context === undefined) {
    throw new Error('useProjectActions must be used within a ProjectActionsProvider');
  }
  return context;
};

interface ProjectActionsProviderProps {
  children: ReactNode;
}

export const ProjectActionsProvider: React.FC<ProjectActionsProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { refetchProjects, refetchProjectRuns, updateProjectsCache, updateProjectRunsCache, projects, projectRuns } = useProjectData();
  const { isGuest, addGuestProjectRun, updateGuestProjectRun, deleteGuestProjectRun } = useGuest();
  
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentProjectRun, setCurrentProjectRun] = useState<ProjectRun | null>(null);

  // Refs to track update state and implement debouncing
  const updateInProgressRef = useRef(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<string>('');

  const addProject = useCallback(async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user || !isAdmin) {
      toast({
        title: "Error",
        description: "Only administrators can create projects",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate project name (case-insensitive)
    const normalizedName = projectData.name.trim().toLowerCase();
    const { data: existingProjects, error: checkError } = await supabase
      .from('projects')
      .select('id, name')
      .ilike('name', projectData.name.trim());

    if (checkError) {
      await reportUserFacingError({
        source: 'project_actions',
        operation: 'validate_project_name_create',
        userId: user.id,
        error: checkError,
        userMessage: 'Failed to validate project name.',
        notificationTitle: 'Project name validation failed',
        toastPresenter: 'ui-toast',
      });
      return;
    }

    if (existingProjects && existingProjects.length > 0) {
      const exactMatch = existingProjects.find(p => p.name.trim().toLowerCase() === normalizedName);
      if (exactMatch) {
        toast({
          title: "Duplicate Project Name",
          description: `A project with the name "${projectData.name}" already exists. Please choose a unique name.`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      // Use database function for proper project_phases architecture
      const { data: projectId, error } = await supabase
        .rpc('create_project_with_standard_foundation', {
          p_project_name: projectData.name,
          p_project_description: projectData.description || '',
          p_category: Array.isArray(projectData.category) ? projectData.category[0] : (projectData.category || 'general')
        });

      if (error) {
        // Check if error is due to duplicate name constraint
        if (error.code === '23505' && error.message.includes('idx_projects_name_unique')) {
          toast({
            title: "Duplicate Project Name",
            description: `A project with the name "${projectData.name}" already exists. Please choose a unique name.`,
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      // Update the created project with additional fields not in RPC
      if (projectId) {
        const { error: updateError } = await supabase
          .from('projects')
          .update({
            skill_level: projectData.skillLevel || 'Intermediate',
            effort_level: projectData.effortLevel || 'Medium',
            scaling_unit: projectData.scalingUnit || null,
            project_challenges: projectData.projectChallenges || null,
            estimated_time_per_unit: projectData.estimatedTimePerUnit || null,
            project_type: projectData.projectType?.toLowerCase() === 'secondary' ? 'secondary' : 'primary'
          })
          .eq('id', projectId);

        if (updateError) {
          console.error('Error updating additional project fields:', updateError);
        }
      }


      // Refetch projects so new template appears in context
      await refetchProjects();

      // NOTE: Standard phases for runs are always provided by the database via
      // get_project_workflow_with_standards / create_project_run_snapshot.
      // We do NOT synthesize or mutate phases on the client here to avoid
      // diverging from the canonical database representation.

      toast({
        title: "Success",
        description: "Project created successfully with standard foundation",
      });
    } catch (error) {
      await reportUserFacingError({
        source: 'project_actions',
        operation: 'create_project',
        userId: user.id,
        error,
        userMessage: 'Failed to create project.',
        notificationTitle: 'Project creation failed',
        toastPresenter: 'ui-toast',
      });
    }
  }, [user, isAdmin, refetchProjects]);

  const createProjectRun = useCallback(async (
    project: Project,
    customName?: string,
    homeId?: string,
    options?: { riskFocusSession?: boolean }
  ): Promise<string | null> => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Sign in to create a project run.',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const { data, error } = await supabase.rpc('create_project_run_snapshot', {
        p_project_id: project.id,
        p_user_id: user.id,
        p_run_name: customName || project.name,
        p_home_id: homeId || null,
        p_start_date: new Date().toISOString(),
        p_plan_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

      if (error) {
        console.error('❌ Error calling create_project_run_snapshot:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: JSON.stringify(error, null, 2)
        });
        // Show full error message to user
        toast({
          title: "Failed to Create Project Run",
          description: error.message || "Unknown error occurred while creating project run. Please check console for details.",
          variant: "destructive",
        });
        throw error;
      }

      if (!data) {
        console.error('❌ create_project_run_snapshot returned no ID');
        throw new Error('Project run creation returned no ID');
      }

      // Verify that phases were copied to the project run (immutable snapshot)
      const { data: createdRun, error: fetchError } = await supabase
        .from('project_runs')
        .select('id, phases, project_id, name')
        .eq('id', data)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching created project run:', fetchError);
        throw fetchError;
      }

      // Validate phases exist AND match template phase count
      let parsedPhases: any[] = [];
      let phasesExist = false;
      
      if (createdRun.phases) {
        if (Array.isArray(createdRun.phases)) {
          parsedPhases = createdRun.phases;
          phasesExist = parsedPhases.length > 0;
        } else if (typeof createdRun.phases === 'string') {
          try {
            parsedPhases = JSON.parse(createdRun.phases);
            if (Array.isArray(parsedPhases)) {
              phasesExist = parsedPhases.length > 0;
            }
          } catch (e) {
            console.error('❌ Error parsing phases JSON:', e);
          }
        }
      }

      // Catalog templates often omit `phases` on the client; never call `.filter` on undefined.
      const templatePhases = Array.isArray(project.phases) ? project.phases : [];
      const templatePhasesCount = templatePhases.length;
      const runPhasesCount = parsedPhases.length;

      const templateIncorporatedCount = templatePhases.filter(p => p.isLinked === true).length;
      const runIncorporatedCount = parsedPhases.filter(p => p.isLinked === true).length;

      if (!phasesExist || runPhasesCount === 0) {
        console.error('❌ CRITICAL: Project run created without phases!', {
          runId: data,
          projectId: project.id,
          templateName: project.name,
          runPhases: createdRun.phases,
          runPhasesType: typeof createdRun.phases,
          templateHasPhases: !!(project.phases && project.phases.length > 0),
          templatePhasesCount,
          runPhasesCount
        });
        
        // Delete the invalid project run - it should not exist without phases
        await supabase
          .from('project_runs')
          .delete()
          .eq('id', data);
        
        throw new Error('Project run was created without phases. The create_project_run_snapshot database function failed. Please ensure the template has phases in the database and the function is working correctly.');
      }

      // CRITICAL: When the client has phase data, the run snapshot must cover it (RPC is source of truth).
      if (templatePhasesCount > 0 && runPhasesCount < templatePhasesCount) {
        console.error('❌ CRITICAL: Project run created with incomplete phases!', {
          runId: data,
          projectId: project.id,
          templateName: project.name,
          templatePhasesCount,
          runPhasesCount,
          missingPhases: templatePhasesCount - runPhasesCount,
          templateIncorporatedCount,
          runIncorporatedCount
        });
        
        // Delete the invalid project run - it must have all phases
        await supabase
          .from('project_runs')
          .delete()
          .eq('id', data);
        
        throw new Error(`Project run was created with only ${runPhasesCount} of ${templatePhasesCount} phases. This indicates a problem with the create_project_run_snapshot function. The project run must be a complete snapshot of the template.`);
      }
      
      if (templatePhasesCount > 0 && runIncorporatedCount < templateIncorporatedCount) {
        console.error('❌ CRITICAL: Project run missing incorporated phases!', {
          runId: data,
          projectId: project.id,
          templateName: project.name,
          templateIncorporatedCount,
          runIncorporatedCount,
          missingIncorporatedPhases: templateIncorporatedCount - runIncorporatedCount,
          templateIncorporatedPhaseNames: templatePhases.filter(p => p.isLinked === true).map(p => p.name),
          runIncorporatedPhaseNames: parsedPhases.filter(p => p.isLinked === true).map(p => p.name)
        });
        
        // Delete the invalid project run - it must include ALL phases including incorporated ones
        await supabase
          .from('project_runs')
          .delete()
          .eq('id', data);
        
        throw new Error(`Project run is missing ${templateIncorporatedCount - runIncorporatedCount} incorporated phases. The create_project_run_snapshot database function failed to copy incorporated phases. This is a critical error - project runs must be complete immutable snapshots.`);
      }

      // Verify spaces were created
      const { data: spacesData, error: spacesError } = await supabase
        .from('project_run_spaces')
        .select('id, space_name')
        .eq('project_run_id', data);
      
      if (spacesError) {
        console.warn('⚠️ Error checking spaces for new project run:', spacesError);
      } else {
        if (!spacesData || spacesData.length === 0) {
          console.error('❌ CRITICAL: No spaces created for project run! Default "Room 1" should have been created.');
        }
      }

      // Risk management rules:
      // - Foundation risks + project risks are assembled ONLY at project run creation.
      // - Mitigation/action tracking is maintained at `project_run_risks` level.
      // - Run-specific risks (user-added later) have `template_risk_id = null` and must not be modified.
      // - Sync merged foundation + template `project_risks` onto `project_run_risks` via per-row upsert
      //   (RPC may pre-seed rows; bulk delete is avoided so RLS/policy quirks cannot block launch).
      try {
        const templateRootIdForRisks = await resolveTemplateRootIdForRisks(project.id);
        await syncFoundationAndTemplateRisksToProjectRun(data, templateRootIdForRisks);
      } catch (riskAssemblyError) {
        console.error('❌ Risk assembly failed; deleting created run for consistency:', riskAssemblyError);
        await supabase.from('project_runs').delete().eq('id', data);
        throw new Error(RISK_ASSEMBLY_ACCESS_MESSAGE);
      }

      // Update additional fields that the function doesn't handle
      if (customName || project.projectChallenges || project.scalingUnit || project.estimatedTimePerUnit) {
        await supabase
          .from('project_runs')
          .update({
            custom_project_name: customName || null,
            project_challenges: project.projectChallenges || null,
            scaling_unit: project.scalingUnit || null,
            estimated_time_per_unit: project.estimatedTimePerUnit || null
          })
          .eq('id', data);
      }

      if (options?.riskFocusSession) {
        try {
          await applyRiskFocusSessionToRun(data);
        } catch (riskFocusFinalizeError) {
          console.error('❌ Risk-Less finalize failed; deleting created run:', riskFocusFinalizeError);
          await supabase.from('project_runs').delete().eq('id', data);
          throw riskFocusFinalizeError;
        }
      }

      await refetchProjectRuns();
      return data || null;
    } catch (error) {
      await reportUserFacingError({
        source: 'project_actions',
        operation: 'create_project_run',
        userId: user.id,
        projectId: project.id,
        error,
        userMessage: 'Failed to create project run.',
        notificationTitle: 'Project run creation failed',
        toastPresenter: 'ui-toast',
      });
      return null;
    }
  }, [user, refetchProjectRuns]);

  const addProjectRun = useCallback(async (
    projectRunData: Omit<ProjectRun, 'id' | 'createdAt' | 'updatedAt'>, 
    onSuccess?: (projectRunId: string) => void
  ) => {
    if (isGuest) {
      // Handle guest mode
      addGuestProjectRun(projectRunData);
      const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      if (onSuccess) {
        onSuccess(guestId);
      }
      toast({
        title: "Success",
        description: "Project run saved temporarily (sign up to keep permanently)"
      });
      return;
    }

    if (!user) return;

    try {
      const defaultHomeId = await getDefaultHomeIdForUser(user.id);

      // Use RPC function to create immutable project run snapshot
      const { data: newProjectRunId, error } = await supabase
        .rpc('create_project_run_snapshot', {
          p_project_id: projectRunData.projectId,
          p_user_id: user.id,
          p_run_name: projectRunData.name,
          p_home_id: defaultHomeId,
          p_start_date: projectRunData.startDate.toISOString(),
          p_plan_end_date: projectRunData.planEndDate.toISOString()
        });

      if (error) throw error;

      // Same foundation + template risk merge as createProjectRun / Risk-Less (catalog uses addProjectRun only).
      if (newProjectRunId) {
        try {
          const templateRootIdForRisks = await resolveTemplateRootIdForRisks(projectRunData.projectId);
          await syncFoundationAndTemplateRisksToProjectRun(newProjectRunId, templateRootIdForRisks);
        } catch (riskAssemblyError) {
          console.error('❌ Risk assembly failed; deleting created run:', riskAssemblyError);
          await supabase.from('project_runs').delete().eq('id', newProjectRunId);
          await reportUserFacingError({
            source: 'project_actions',
            operation: 'assemble_project_run_risks',
            userId: user.id,
            projectId: projectRunData.projectId,
            projectRunId: newProjectRunId,
            error: riskAssemblyError,
            userMessage: RISK_ASSEMBLY_ACCESS_MESSAGE,
            notificationTitle: 'Project risk assembly failed',
            toastPresenter: 'ui-toast',
          });
          throw riskAssemblyError;
        }
      }

      // Update project run with additional fields that aren't copied by the RPC function
      // The RPC function only copies phases, so we need to update description and other metadata
      if (newProjectRunId) {
        const updateFields: any = {
          updated_at: new Date().toISOString()
        };
        
        // Update description (even if empty string - ensures it's set from template)
        if (projectRunData.description !== undefined) {
          updateFields.description = projectRunData.description || null;
        }
        
        // Only update other fields if they are provided in projectRunData
        if (projectRunData.category !== undefined) {
          updateFields.category = Array.isArray(projectRunData.category) 
            ? projectRunData.category 
            : (projectRunData.category ? [projectRunData.category] : null);
        }
        if (projectRunData.effortLevel !== undefined) updateFields.effort_level = projectRunData.effortLevel || null;
        if (projectRunData.skillLevel !== undefined) updateFields.skill_level = projectRunData.skillLevel || null;
        if (projectRunData.estimatedTime !== undefined) updateFields.estimated_time = projectRunData.estimatedTime || null;
        if (projectRunData.estimatedTotalTime !== undefined) updateFields.estimated_total_time = projectRunData.estimatedTotalTime || null;
        if (projectRunData.typicalProjectSize !== undefined) updateFields.typical_project_size = projectRunData.typicalProjectSize || null;
        if (projectRunData.scalingUnit !== undefined) updateFields.scaling_unit = projectRunData.scalingUnit || null;
        if (projectRunData.itemType !== undefined) updateFields.item_type = projectRunData.itemType || null;
        if (projectRunData.projectChallenges !== undefined) updateFields.project_challenges = projectRunData.projectChallenges || null;
        
        // Always update (at minimum updated_at, but usually description and other fields too)
        const { error: updateError } = await supabase
          .from('project_runs')
          .update(updateFields)
          .eq('id', newProjectRunId);
        
        if (updateError) {
          await reportUserFacingError({
            source: 'project_actions',
            operation: 'update_project_run_metadata_after_create',
            userId: user.id,
            projectId: projectRunData.projectId,
            projectRunId: newProjectRunId,
            error: updateError,
            userMessage: 'Could not save project run details.',
            notificationTitle: 'Project run metadata update failed',
            toastPresenter: 'ui-toast',
          });
        }
      }

      // Refetch to get the complete project run data
      await refetchProjectRuns();

      // Defer navigation until after React applies context updates from refetch (setState is async).
      const notifySuccess = () => {
        if (newProjectRunId && onSuccess) {
          onSuccess(newProjectRunId);
        } else if (newProjectRunId) {
          window.dispatchEvent(
            new CustomEvent('navigate-to-kickoff', {
              detail: { projectRunId: newProjectRunId },
            })
          );
        }
      };
      queueMicrotask(notifySuccess);
    } catch (error) {
      await reportUserFacingError({
        source: 'project_actions',
        operation: 'add_project_run',
        userId: user.id,
        projectId: projectRunData.projectId,
        error,
        userMessage: 'Failed to add project run.',
        notificationTitle: 'Project run start failed',
        toastPresenter: 'ui-toast',
      });
      // Re-throw error so caller can handle it
      throw error;
    }
  }, [isGuest, addGuestProjectRun, user, refetchProjectRuns]);

  const updateProject = useCallback(async (project: Project) => {
    if (!user || !isAdmin) {
      toast({
        title: "Error",
        description: "Only administrators can update projects",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🔧 updateProject called:', { 
        projectId: project.id, 
        phasesCount: project.phases?.length 
      });
      
      // Check for duplicate project name if name is being changed
      if (project.name && project.name.trim()) {
        const normalizedName = project.name.trim().toLowerCase();
        const { data: existingProjects, error: checkError } = await supabase
          .from('projects')
          .select('id, name')
          .neq('id', project.id) // Exclude current project
          .ilike('name', project.name.trim());

        if (checkError) {
          await reportUserFacingError({
            source: 'project_actions',
            operation: 'validate_project_name_update',
            userId: user.id,
            projectId: project.id,
            error: checkError,
            userMessage: 'Failed to validate project name.',
            notificationTitle: 'Project name validation failed',
            toastPresenter: 'ui-toast',
          });
          return;
        }

        if (existingProjects && existingProjects.length > 0) {
          const exactMatch = existingProjects.find(p => p.name.trim().toLowerCase() === normalizedName);
          if (exactMatch) {
            toast({
              title: "Duplicate Project Name",
              description: `A project with the name "${project.name}" already exists. Please choose a unique name.`,
              variant: "destructive",
            });
            return;
          }
        }
      }
      
      // For all projects (including Standard Project), we DON'T update phases JSON
      // The database triggers will automatically rebuild it from template_operations/template_steps
      
      // Update only the project metadata (not phases)
      const projectMeta: Record<string, unknown> = {
        name: project.name,
        description: project.description,
        category: Array.isArray(project.category) ? project.category : (project.category ? [project.category] : []),
        scaling_unit: project.scalingUnit,
        estimated_time_per_unit: project.estimatedTimePerUnit,
        skill_level: project.skillLevel,
        effort_level: project.effortLevel,
        estimated_time: project.estimatedTime,
        project_challenges: project.projectChallenges,
        image: project.image,
        updated_at: new Date().toISOString()
      };
      if (project.instructionsDataSources !== undefined) {
        projectMeta.instructions_data_sources = project.instructionsDataSources;
      }

      const { error: updateError } = await supabase
        .from('projects')
        .update(projectMeta)
        .eq('id', project.id);

      if (updateError) {
        // Check if error is due to duplicate name constraint
        if (updateError.code === '23505' && updateError.message.includes('idx_projects_name_unique')) {
          toast({
            title: "Duplicate Project Name",
            description: `A project with the name "${project.name}" already exists. Please choose a unique name.`,
            variant: "destructive",
          });
          return;
        }
        console.error('❌ Error updating project:', updateError);
        throw updateError;
      }

      console.log('✅ Project metadata updated successfully');
      
      // NOTE: step_number was renamed to display_order in template_steps
      // Ordering is handled by position_rule/position_value for phases and display_order for steps

      // Optimistically update cache
      const updatedProjects = projects.map(p => p.id === project.id ? project : p);
      updateProjectsCache(updatedProjects);
      
      if (currentProject?.id === project.id) {
        setCurrentProject(project);
      }
      
      toast({
        title: "Success",
        description: "Project updated successfully",
      });
    } catch (error) {
      await reportUserFacingError({
        source: 'project_actions',
        operation: 'update_project',
        userId: user.id,
        projectId: project.id,
        error,
        userMessage: 'Failed to update project.',
        notificationTitle: 'Project update failed',
        toastPresenter: 'ui-toast',
      });
    }
  }, [user, isAdmin, projects, updateProjectsCache, currentProject, setCurrentProject]);

  const updateProjectRun = useCallback(async (projectRun: ProjectRun) => {
    if (isGuest) {
      // Handle guest mode
      updateGuestProjectRun(projectRun);
      toast({
        title: "Success",
        description: "Project run updated (sign up to keep permanently)"
      });
      return;
    }

    if (!user) return;

    // Create a unique key for this update to detect duplicates
    // Include budget_data, issue_reports, time_tracking, and initial budget fields to ensure these updates are never skipped
    const budgetDataKey = projectRun.budget_data ? JSON.stringify(projectRun.budget_data) : 'null';
    const issueReportsKey = projectRun.issue_reports ? JSON.stringify(projectRun.issue_reports) : 'null';
    const timeTrackingKey = projectRun.time_tracking ? JSON.stringify(projectRun.time_tracking) : 'null';
    const initialBudgetKey = (projectRun as any).initial_budget !== undefined ? String((projectRun as any).initial_budget) : 'undefined';
    const initialTimelineKey = (projectRun as any).initial_timeline !== undefined ? String((projectRun as any).initial_timeline) : 'undefined';
    const initialSizingKey = (projectRun as any).initial_sizing !== undefined ? String((projectRun as any).initial_sizing) : 'undefined';

    // Include fields that can change independently (e.g. schedule_optimization_method)
    const scheduleOptimizationMethodKey = JSON.stringify((projectRun as any).schedule_optimization_method);

    const progressReportingStyleKey = JSON.stringify((projectRun as any).progress_reporting_style);
    const shouldIncludeProgressReportingStyleKey =
      progressReportingStyleKey !== JSON.stringify(currentProjectRun?.progress_reporting_style);

    const qualityControlSettingsKey = JSON.stringify(
      mergeQualityControlSettings((projectRun as any).quality_control_settings ?? null)
    );

    const instructionLevelPreferenceKey = JSON.stringify(
      (projectRun as any).instruction_level_preference ?? null
    );

    const updateKeyParts = [
      projectRun.id,
      projectRun.progress,
      JSON.stringify(projectRun.completedSteps),
      budgetDataKey,
      issueReportsKey,
      timeTrackingKey,
      initialBudgetKey,
      initialTimelineKey,
      initialSizingKey,
      scheduleOptimizationMethodKey,
      qualityControlSettingsKey,
      instructionLevelPreferenceKey,
      ...(shouldIncludeProgressReportingStyleKey ? [progressReportingStyleKey] : [])
    ];

    const updateKey = updateKeyParts.join('-');
    
    // Skip if this is the exact same update as the last one
    if (lastUpdateRef.current === updateKey) {
      console.log("🔄 ProjectActions - Skipping duplicate update");
      return;
    }

    // Clear any pending updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // IMMEDIATE optimistic cache update - no debounce for step completion
    // Ensure progress is always a number (handle null, undefined, or missing)
    const safeProgress = Math.round(projectRun.progress ?? 0);
    const updatedProjectRun = { ...projectRun, progress: safeProgress };
    
    // CRITICAL: Ensure initial_budget, initial_timeline, initial_sizing are preserved
    // These come from the database as snake_case but need to be in the context object
    if ((projectRun as any).initial_budget !== undefined) {
      (updatedProjectRun as any).initial_budget = (projectRun as any).initial_budget;
    }
    if ((projectRun as any).initial_timeline !== undefined) {
      (updatedProjectRun as any).initial_timeline = (projectRun as any).initial_timeline;
    }
    if ((projectRun as any).initial_sizing !== undefined) {
      (updatedProjectRun as any).initial_sizing = (projectRun as any).initial_sizing;
    }
    
    const updatedProjectRuns = projectRuns.map(run => run.id === projectRun.id ? updatedProjectRun : run);
    updateProjectRunsCache(updatedProjectRuns);
    
    if (currentProjectRun?.id === projectRun.id) {
      setCurrentProjectRun(updatedProjectRun);
      console.log('✅ ProjectActions: Updated currentProjectRun with initial_budget:', (updatedProjectRun as any).initial_budget);
    }

    // CRITICAL: For budget_data, issue_reports, time_tracking, initial budget fields, and kickoff completion updates, save immediately
    // These are user-initiated changes that must be persisted right away
    const isBudgetDataUpdate = projectRun.budget_data !== undefined;
    const isIssueReportsUpdate = projectRun.issue_reports !== undefined;
    const isTimeTrackingUpdate = projectRun.time_tracking !== undefined;
    const isInitialBudgetUpdate = (projectRun as any).initial_budget !== undefined;
    const isInitialTimelineUpdate = (projectRun as any).initial_timeline !== undefined;
    const isInitialSizingUpdate = (projectRun as any).initial_sizing !== undefined;
    // Check if this is a kickoff completion update (status changing to 'in-progress' with kickoff steps completed)
    const incomingKickoffComplete = isKickoffPhaseComplete(projectRun.completedSteps || []);
    const previousKickoffComplete = isKickoffPhaseComplete(currentProjectRun?.completedSteps || []);
    const isKickoffCompletion =
      projectRun.status === 'in-progress' &&
      incomingKickoffComplete &&
      (currentProjectRun?.status !== 'in-progress' || !previousKickoffComplete);
    const qcIncoming = (projectRun as any).quality_control_settings;
    const isQualityControlSettingsUpdate =
      qcIncoming !== undefined &&
      JSON.stringify(mergeQualityControlSettings(qcIncoming)) !==
        JSON.stringify(mergeQualityControlSettings(currentProjectRun?.quality_control_settings ?? null));
    const planningToolsSignature = (raw: unknown) => {
      const d = parseCustomizationDecisions(raw);
      const tools = d.selected_planning_tools;
      return JSON.stringify(Array.isArray(tools) ? tools : []);
    };
    const isSelectedPlanningToolsChange =
      planningToolsSignature(currentProjectRun?.customization_decisions) !==
      planningToolsSignature(projectRun.customization_decisions);
    const isInstructionLevelPreferenceUpdate =
      (projectRun as any).instruction_level_preference !==
      (currentProjectRun as any)?.instruction_level_preference;
    const requiresImmediateSave =
      isBudgetDataUpdate ||
      isIssueReportsUpdate ||
      isTimeTrackingUpdate ||
      isInitialBudgetUpdate ||
      isInitialTimelineUpdate ||
      isInitialSizingUpdate ||
      isKickoffCompletion ||
      isQualityControlSettingsUpdate ||
      isSelectedPlanningToolsChange ||
      isInstructionLevelPreferenceUpdate;
    
    // For immediate saves (budget, issues, time tracking), execute right away
    // For other updates, debounce to avoid excessive database writes
    const saveToDatabase = async () => {
      // Prevent concurrent updates
      if (updateInProgressRef.current) {
        console.log("🔄 ProjectActions - Update already in progress, queuing...");
        setTimeout(() => updateProjectRun(projectRun), 100);
        return;
      }

      updateInProgressRef.current = true;
      lastUpdateRef.current = updateKey;

      try {
        // CRITICAL: Fetch current values from database to preserve settings that might be omitted
        // in certain update payloads (e.g. when changing schedule_optimization_method).
        let preservedBudget = (projectRun as any).initial_budget;
        let preservedTimeline = (projectRun as any).initial_timeline;
        let preservedSizing = (projectRun as any).initial_sizing;

        let preservedProgressReportingStyle = (projectRun as any).progress_reporting_style;
        let preservedScheduleOptimizationMethod = (projectRun as any).schedule_optimization_method;
        let preservedQualityControlSettings = (projectRun as any).quality_control_settings;
        
        // If any of these fields are undefined, fetch from database to preserve existing values
        if (
          preservedBudget === undefined ||
          preservedTimeline === undefined ||
          preservedSizing === undefined ||
          preservedProgressReportingStyle === undefined ||
          preservedScheduleOptimizationMethod === undefined ||
          preservedQualityControlSettings === undefined
        ) {
          const { data: currentRun, error: fetchError } = await supabase
            .from('project_runs')
            .select('initial_budget, initial_timeline, initial_sizing, progress_reporting_style, schedule_optimization_method, quality_control_settings')
            .eq('id', projectRun.id)
            .single();
          
          if (!fetchError && currentRun) {
            // Only use database values if the field was undefined (not explicitly set to null)
            if (preservedBudget === undefined) {
              preservedBudget = currentRun.initial_budget;
            }
            if (preservedTimeline === undefined) {
              preservedTimeline = currentRun.initial_timeline;
            }
            if (preservedSizing === undefined) {
              preservedSizing = currentRun.initial_sizing;
            }

            if (preservedProgressReportingStyle === undefined) {
              preservedProgressReportingStyle = currentRun.progress_reporting_style;
            }

            if (preservedScheduleOptimizationMethod === undefined) {
              preservedScheduleOptimizationMethod = currentRun.schedule_optimization_method;
            }

            if (preservedQualityControlSettings === undefined) {
              preservedQualityControlSettings = currentRun.quality_control_settings;
            }
          }
        }

        // If these settings are still undefined after attempting to preserve from the DB,
        // the database schema is missing the required columns or returned unexpected data.
        if (preservedProgressReportingStyle === undefined) {
          throw new Error('progress_reporting_style is missing from project run data');
        }
        if (preservedScheduleOptimizationMethod === undefined) {
          throw new Error('schedule_optimization_method is missing from project run data');
        }

        // New runs from create_project_run_snapshot may leave these NULL; NOT NULL / CHECK
        // constraints reject PATCH with null. Use the same defaults as documented migrations.
        const VALID_PROGRESS_REPORTING_STYLES = new Set(['linear', 'exponential', 'time-based']);
        const VALID_SCHEDULE_OPTIMIZATION_METHODS = new Set(['single-piece-flow', 'batch-flow']);
        if (
          preservedProgressReportingStyle == null ||
          typeof preservedProgressReportingStyle !== 'string' ||
          !VALID_PROGRESS_REPORTING_STYLES.has(preservedProgressReportingStyle)
        ) {
          preservedProgressReportingStyle = 'linear';
        }
        if (
          preservedScheduleOptimizationMethod == null ||
          typeof preservedScheduleOptimizationMethod !== 'string' ||
          !VALID_SCHEDULE_OPTIMIZATION_METHODS.has(preservedScheduleOptimizationMethod)
        ) {
          preservedScheduleOptimizationMethod = 'single-piece-flow';
        }

        console.log('💾 ProjectActions - Saving project run to database:', {
          projectRunId: projectRun.id,
          userId: user.id,
          name: projectRun.name,
          completedStepsCount: projectRun.completedSteps.length,
          progress: safeProgress,
          initial_budget: preservedBudget,
          initial_timeline: preservedTimeline,
          initial_sizing: preservedSizing,
          hasBudgetData: !!projectRun.budget_data,
          hasPhotos: !!(projectRun.project_photos),
          home_id: (projectRun as any).home_id
        });

        const isPlanningCompletionTransition =
          projectRun.planningCompletedAt != null && currentProjectRun?.planningCompletedAt == null;

        let planningBaselinePayload: ReturnType<typeof buildPlanningScopeBaseline> | null = null;
        if (projectRun.planningCompletedAt != null) {
          if (isPlanningCompletionTransition) {
            planningBaselinePayload = buildPlanningScopeBaseline(
              projectRun,
              projectRun.planningCompletedAt
            );
          } else {
            const { data: baselineCheck, error: baselineCheckError } = await supabase
              .from('project_runs')
              .select('planning_scope_baseline')
              .eq('id', projectRun.id)
              .single();
            if (!baselineCheckError && baselineCheck?.planning_scope_baseline == null) {
              planningBaselinePayload = buildPlanningScopeBaseline(
                projectRun,
                projectRun.planningCompletedAt
              );
            }
          }
        }

        const updateData = {
          name: projectRun.name,
          description: projectRun.description,
          start_date: projectRun.startDate.toISOString(),
          plan_end_date: projectRun.planEndDate.toISOString(),
          end_date: projectRun.endDate?.toISOString(),
          status: projectRun.status,
          project_leader: projectRun.projectLeader,
          accountability_partner: projectRun.accountabilityPartner,
          custom_project_name: projectRun.customProjectName,
          home_id: (projectRun as any).home_id || null,
          current_phase_id: projectRun.currentPhaseId,
          current_operation_id: projectRun.currentOperationId,
          current_step_id: projectRun.currentStepId,
          completed_steps: JSON.stringify(projectRun.completedSteps),
          progress: safeProgress || 0,
          phases: JSON.stringify(projectRun.phases),
          category: Array.isArray(projectRun.category) ? projectRun.category.join(', ') : projectRun.category,
          estimated_time: projectRun.estimatedTime,
          customization_decisions: projectRun.customization_decisions ? JSON.stringify(projectRun.customization_decisions) : null,
          budget_data: projectRun.budget_data ? JSON.stringify(projectRun.budget_data) : null,
          issue_reports: projectRun.issue_reports ? JSON.stringify(projectRun.issue_reports) : null,
          time_tracking: projectRun.time_tracking ? JSON.stringify(projectRun.time_tracking) : null,
          project_photos: projectRun.project_photos ? JSON.stringify(projectRun.project_photos) : null,
          phase_ratings: projectRun.phase_ratings ? JSON.stringify(projectRun.phase_ratings) : null,
          schedule_events: projectRun.schedule_events ? JSON.stringify(projectRun.schedule_events) : null,
          shopping_checklist_data: projectRun.shopping_checklist_data ? JSON.stringify(projectRun.shopping_checklist_data) : null,
          progress_reporting_style: preservedProgressReportingStyle,
          schedule_optimization_method: preservedScheduleOptimizationMethod,
          instruction_level_preference: (projectRun as any).instruction_level_preference || null,
          initial_budget: preservedBudget !== undefined ? preservedBudget : null,
          initial_timeline: preservedTimeline !== undefined ? preservedTimeline : null,
          initial_sizing: preservedSizing !== undefined ? preservedSizing : null,
          updated_at: new Date().toISOString(),
          ...(projectRun.planningCompletedAt != null
            ? {
                planning_completed_at: projectRun.planningCompletedAt.toISOString()
              }
            : {}),
          ...(planningBaselinePayload != null
            ? { planning_scope_baseline: planningBaselinePayload as unknown as Json }
            : {}),
          ...(preservedQualityControlSettings !== undefined
            ? {
                quality_control_settings:
                  preservedQualityControlSettings === null
                    ? null
                    : JSON.stringify(mergeQualityControlSettings(preservedQualityControlSettings))
              }
            : {})
        };

        const { error } = await supabase
          .from('project_runs')
          .update(updateData)
          .eq('id', projectRun.id)
          .eq('user_id', user.id);

        if (error) {
          console.error('❌ ProjectActions - Database update error:', error.message, error);
          throw error;
        }

        if (planningBaselinePayload != null) {
          const merged = { ...projectRun, planningScopeBaseline: planningBaselinePayload };
          const updatedRuns = projectRuns.map((r) => (r.id === projectRun.id ? merged : r));
          updateProjectRunsCache(updatedRuns);
          if (currentProjectRun?.id === projectRun.id) {
            setCurrentProjectRun(merged);
          }
        }

        const shouldLogPlanningChanges =
          currentProjectRun?.planningCompletedAt != null && !isPlanningCompletionTransition;
        if (shouldLogPlanningChanges) {
          const summaries = collectPlanningToolChangeSummaries(currentProjectRun, projectRun);
          if (summaries.length > 0) {
            const rows = summaries.map((s) => ({
              project_run_id: projectRun.id,
              user_id: user.id,
              planning_tool: s.planning_tool,
              change_summary: s.change_summary,
              change_detail: (s.change_detail ?? null) as Json | null,
            }));
            const { error: logError } = await supabase
              .from('project_run_planning_change_events')
              .insert(rows);
            if (logError) {
              console.error('❌ ProjectActions - planning change log insert failed:', logError);
            } else {
              window.dispatchEvent(
                new CustomEvent('planning-change-events-updated', {
                  detail: { projectRunId: projectRun.id },
                })
              );
            }
          }
        }

        console.log("✅ ProjectActions - Project run updated successfully in database for user:", user.id);
        
      } catch (error) {
        await reportUserFacingError({
          source: 'project_actions',
          operation: 'update_project_run',
          userId: user.id,
          projectId: projectRun.projectId,
          projectRunId: projectRun.id,
          error,
          userMessage: 'Failed to update project run.',
          notificationTitle: 'Project run update failed',
          toastPresenter: 'ui-toast',
        });
      } finally {
        updateInProgressRef.current = false;
      }
    };
    
    if (requiresImmediateSave) {
      // Save immediately for budget_data, issue_reports, time_tracking
      saveToDatabase();
    } else {
      // Debounce other updates
      updateTimeoutRef.current = setTimeout(saveToDatabase, 300);
    }
  }, [isGuest, updateGuestProjectRun, user, projectRuns, updateProjectRunsCache, currentProjectRun, setCurrentProjectRun]);

  const deleteProject = useCallback(async (projectId: string) => {
    if (!user || !isAdmin) {
      toast({
        title: "Error",
        description: "Only administrators can delete projects",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      // Optimistically update cache
      const updatedProjects = projects.filter(p => p.id !== projectId);
      updateProjectsCache(updatedProjects);
      
      if (currentProject?.id === projectId) {
        setCurrentProject(null);
      }

      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
    } catch (error) {
      await reportUserFacingError({
        source: 'project_actions',
        operation: 'delete_project',
        userId: user.id,
        projectId,
        error,
        userMessage: 'Failed to delete project.',
        notificationTitle: 'Project deletion failed',
        toastPresenter: 'ui-toast',
      });
    }
  }, [user, isAdmin, projects, updateProjectsCache, currentProject, setCurrentProject]);

  const deleteProjectRun = useCallback(async (projectRunId: string) => {
    if (isGuest) {
      // Handle guest mode
      deleteGuestProjectRun(projectRunId);
      toast({
        title: "Success",
        description: "Project run deleted"
      });
      return;
    }

    if (!user) return;

    try {
      const { error } = await supabase
        .from('project_runs')
        .delete()
        .eq('id', projectRunId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Optimistically update cache
      const updatedProjectRuns = projectRuns.filter(run => run.id !== projectRunId);
      updateProjectRunsCache(updatedProjectRuns);
      
      if (currentProjectRun?.id === projectRunId) {
        setCurrentProjectRun(null);
      }

      // Success - no toast notification needed
    } catch (error) {
      await reportUserFacingError({
        source: 'project_actions',
        operation: 'delete_project_run',
        userId: user.id,
        projectRunId,
        error,
        userMessage: 'Failed to delete project run.',
        notificationTitle: 'Project run deletion failed',
        toastPresenter: 'ui-toast',
      });
    }
  }, [isGuest, deleteGuestProjectRun, user, projectRuns, updateProjectRunsCache, currentProjectRun, setCurrentProjectRun]);

  const refreshProjectRunFromTemplate = useCallback(async (runId: string) => {
    console.log('🔄 refreshProjectRunFromTemplate CALLED:', { runId });
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to refresh project runs",
        variant: "destructive",
      });
      return;
    }

    try {
      // Call the database function to refresh the project run
      const { data, error } = await supabase.rpc('refresh_project_run_from_template', {
        p_run_id: runId
      });

      if (error) throw error;

      // Fetch the refreshed project run
      const { data: freshRun, error: fetchError } = await supabase
        .from('project_runs')
        .select('*')
        .eq('id', runId)
        .single();

      if (fetchError) throw fetchError;

      if (freshRun) {
        // Transform the data (handle JSON fields and snake_case to camelCase)
        const transformedRun: ProjectRun = {
          id: freshRun.id,
          projectId: freshRun.project_id ?? '',
          name: freshRun.name,
          description: freshRun.description || '',
          home_id: freshRun.home_id || undefined,
          status: freshRun.status as 'not-started' | 'in-progress' | 'complete' | 'cancelled',
          createdAt: new Date(freshRun.created_at),
          updatedAt: new Date(freshRun.updated_at),
          startDate: new Date(freshRun.start_date),
          planEndDate: new Date(freshRun.plan_end_date),
          endDate: freshRun.end_date ? new Date(freshRun.end_date) : undefined,
          phases: typeof freshRun.phases === 'string' ? JSON.parse(freshRun.phases) : freshRun.phases,
          currentPhaseId: freshRun.current_phase_id,
          currentOperationId: freshRun.current_operation_id,
          currentStepId: freshRun.current_step_id,
          completedSteps: typeof freshRun.completed_steps === 'string' ? JSON.parse(freshRun.completed_steps) : freshRun.completed_steps || [],
          progress: freshRun.progress || 0,
          category: Array.isArray(freshRun.category) ? freshRun.category : freshRun.category ? [freshRun.category] : undefined,
          estimatedTime: freshRun.estimated_time,
          effortLevel: freshRun.effort_level as 'Low' | 'Medium' | 'High',
          skillLevel: freshRun.skill_level as 'Beginner' | 'Intermediate' | 'Advanced',
          projectChallenges: freshRun.project_challenges,
          projectLeader: freshRun.project_leader,
          customProjectName: freshRun.custom_project_name,
          accountabilityPartner: freshRun.accountability_partner,
          budget_data: typeof freshRun.budget_data === 'string' ? JSON.parse(freshRun.budget_data) : freshRun.budget_data,
          phase_ratings: typeof freshRun.phase_ratings === 'string' ? JSON.parse(freshRun.phase_ratings) : freshRun.phase_ratings,
          issue_reports: typeof freshRun.issue_reports === 'string' ? JSON.parse(freshRun.issue_reports) : freshRun.issue_reports,
          shopping_checklist_data: typeof freshRun.shopping_checklist_data === 'string' ? JSON.parse(freshRun.shopping_checklist_data) : freshRun.shopping_checklist_data,
          schedule_events: typeof freshRun.schedule_events === 'string' ? JSON.parse(freshRun.schedule_events) : freshRun.schedule_events,
          customization_decisions: typeof freshRun.customization_decisions === 'string' ? JSON.parse(freshRun.customization_decisions) : freshRun.customization_decisions,
          instruction_level_preference: freshRun.instruction_level_preference as 'beginner' | 'intermediate' | 'advanced' | undefined,
          progress_reporting_style: freshRun.progress_reporting_style
            ? (freshRun.progress_reporting_style as 'linear' | 'exponential' | 'time-based')
            : undefined,
          // CRITICAL: Include initial_budget, initial_timeline, initial_sizing from database
          initial_budget: freshRun.initial_budget || null,
          initial_timeline: freshRun.initial_timeline || null,
          initial_sizing: freshRun.initial_sizing || null,
          quality_control_settings: parseQualityControlSettingsColumn(freshRun.quality_control_settings),
          planningCompletedAt: freshRun.planning_completed_at
            ? new Date(freshRun.planning_completed_at)
            : undefined,
          planningScopeBaseline:
            freshRun.planning_scope_baseline != null &&
            typeof freshRun.planning_scope_baseline === 'object'
              ? (freshRun.planning_scope_baseline as Record<string, unknown>)
              : undefined
        };

        // Update cache and current project run
        const updatedProjectRuns = projectRuns.map(run => 
          run.id === runId ? transformedRun : run
        );
        updateProjectRunsCache(updatedProjectRuns);
        
        if (currentProjectRun?.id === runId) {
          setCurrentProjectRun(transformedRun);
        }

        toast({
          title: "Success",
          description: "Project refreshed with latest template updates!",
        });
      }
    } catch (error) {
      await reportUserFacingError({
        source: 'project_actions',
        operation: 'refresh_project_run_from_template',
        userId: user.id,
        projectRunId: runId,
        error,
        userMessage: 'Failed to refresh project run.',
        notificationTitle: 'Project refresh failed',
        toastPresenter: 'ui-toast',
      });
    }
  }, [user, projectRuns, updateProjectRunsCache, currentProjectRun, setCurrentProjectRun]);


  const value = {
    currentProject,
    currentProjectRun,
    setCurrentProject,
    setCurrentProjectRun,
    addProject,
    createProjectRun,
    addProjectRun,
    updateProject,
    updateProjectRun,
    deleteProject,
    deleteProjectRun,
    refreshProjectRunFromTemplate
  };

  return (
    <ProjectActionsContext.Provider value={value}>
      {children}
    </ProjectActionsContext.Provider>
  );
};