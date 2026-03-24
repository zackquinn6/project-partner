import type { Project } from '@/interfaces/Project';
import type { ProjectRun } from '@/interfaces/ProjectRun';
import { parseQualityControlSettingsColumn } from '@/utils/qualityControlSettings';

function parseJsonField<T>(value: unknown, fieldLabel: string): T | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch (e) {
      console.error(`Failed to parse ${fieldLabel} JSON:`, e);
      return undefined;
    }
  }
  return value as T;
}

/**
 * Maps a `project_runs` row (Supabase select('*')) to the app `ProjectRun` shape.
 * Keeps camelCase fields and parsed JSON columns consistent with ProjectActionsContext refresh.
 */
export function projectRunFromSupabaseRow(freshRun: Record<string, unknown>): ProjectRun | null {
  if (!freshRun?.id || typeof freshRun.id !== 'string') {
    return null;
  }

  let phases: Project['phases'] = [];
  if (freshRun.phases) {
    if (Array.isArray(freshRun.phases)) {
      phases = freshRun.phases as Project['phases'];
    } else if (typeof freshRun.phases === 'string') {
      const parsed = parseJsonField<Project['phases']>(freshRun.phases, 'phases');
      if (Array.isArray(parsed)) phases = parsed;
    }
  }

  let completedSteps: string[] = [];
  if (freshRun.completed_steps) {
    if (Array.isArray(freshRun.completed_steps)) {
      completedSteps = freshRun.completed_steps as string[];
    } else if (typeof freshRun.completed_steps === 'string') {
      const parsed = parseJsonField<string[]>(freshRun.completed_steps, 'completed_steps');
      if (Array.isArray(parsed)) completedSteps = parsed;
    }
  }

  let customizationDecisions: ProjectRun['customization_decisions'] = undefined;
  if (freshRun.customization_decisions !== null && freshRun.customization_decisions !== undefined) {
    if (typeof freshRun.customization_decisions === 'string') {
      customizationDecisions = parseJsonField(freshRun.customization_decisions, 'customization_decisions');
    } else {
      customizationDecisions = freshRun.customization_decisions as ProjectRun['customization_decisions'];
    }
  }

  return {
    id: freshRun.id,
    templateId: freshRun.template_id as string,
    name: typeof freshRun.name === 'string' ? freshRun.name : '',
    description: typeof freshRun.description === 'string' ? freshRun.description : '',
    projectChallenges:
      typeof freshRun.project_challenges === 'string' ? freshRun.project_challenges : undefined,
    isManualEntry: Boolean(freshRun.is_manual_entry),
    createdAt: new Date(freshRun.created_at as string),
    updatedAt: new Date(freshRun.updated_at as string),
    startDate: new Date(freshRun.start_date as string),
    planEndDate: new Date(freshRun.plan_end_date as string),
    endDate: freshRun.end_date ? new Date(freshRun.end_date as string) : undefined,
    status: freshRun.status as ProjectRun['status'],
    projectLeader: typeof freshRun.project_leader === 'string' ? freshRun.project_leader : undefined,
    accountabilityPartner:
      typeof freshRun.accountability_partner === 'string' ? freshRun.accountability_partner : undefined,
    customProjectName:
      typeof freshRun.custom_project_name === 'string' ? freshRun.custom_project_name : undefined,
    home_id: typeof freshRun.home_id === 'string' ? freshRun.home_id : undefined,
    currentPhaseId: typeof freshRun.current_phase_id === 'string' ? freshRun.current_phase_id : undefined,
    currentOperationId:
      typeof freshRun.current_operation_id === 'string' ? freshRun.current_operation_id : undefined,
    currentStepId: typeof freshRun.current_step_id === 'string' ? freshRun.current_step_id : undefined,
    completedSteps,
    progress: freshRun.progress as number,
    phases,
    category: Array.isArray(freshRun.category)
      ? (freshRun.category as string[])
      : freshRun.category
        ? [String(freshRun.category)]
        : undefined,
    effortLevel: freshRun.effort_level as Project['effortLevel'],
    skillLevel: freshRun.skill_level as Project['skillLevel'],
    estimatedTime: typeof freshRun.estimated_time === 'string' ? freshRun.estimated_time : undefined,
    scalingUnit: freshRun.scaling_unit as Project['scalingUnit'],
    budget_data: parseJsonField(freshRun.budget_data, 'budget_data'),
    phase_ratings: parseJsonField(freshRun.phase_ratings, 'phase_ratings'),
    issue_reports: parseJsonField(freshRun.issue_reports, 'issue_reports'),
    shopping_checklist_data: parseJsonField(freshRun.shopping_checklist_data, 'shopping_checklist_data'),
    schedule_events: parseJsonField(freshRun.schedule_events, 'schedule_events'),
    time_tracking: parseJsonField(freshRun.time_tracking, 'time_tracking'),
    project_photos: parseJsonField(freshRun.project_photos, 'project_photos'),
    schedule_optimization_method: freshRun.schedule_optimization_method as
      | 'single-piece-flow'
      | 'batch-flow'
      | undefined,
    customization_decisions: customizationDecisions,
    instruction_level_preference: freshRun.instruction_level_preference as
      | 'beginner'
      | 'intermediate'
      | 'advanced'
      | undefined,
    initial_budget: typeof freshRun.initial_budget === 'string' ? freshRun.initial_budget : undefined,
    initial_timeline: typeof freshRun.initial_timeline === 'string' ? freshRun.initial_timeline : undefined,
    initial_sizing:
      typeof freshRun.initial_sizing === 'string'
        ? freshRun.initial_sizing
        : freshRun.initial_sizing != null
          ? (JSON.stringify(freshRun.initial_sizing) as ProjectRun['initial_sizing'])
          : undefined,
    progress_reporting_style: freshRun.progress_reporting_style
      ? (freshRun.progress_reporting_style as 'linear' | 'exponential' | 'time-based')
      : undefined,
    quality_control_settings: parseQualityControlSettingsColumn(freshRun.quality_control_settings),
  };
}
