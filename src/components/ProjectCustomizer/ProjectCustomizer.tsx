import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ResponsiveDialog } from '../ResponsiveDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { SimplifiedCustomWorkManager } from './SimplifiedCustomWorkManager';
import { PhaseBrowser } from './PhaseBrowser';
import { SpaceSelector } from './SpaceSelector';
import { SpaceDecisionFlow, areSpaceRequiredDecisionsComplete } from './SpaceDecisionFlow';
import { ProjectRun } from '../../interfaces/ProjectRun';
import { Phase } from '../../interfaces/Project';
import { useProject } from '../../contexts/ProjectContext';
import { Settings, Home, Edit2, Check, CheckCircle2, AlertCircle } from 'lucide-react';
import { useIsMobile } from '../../hooks/use-mobile';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { KickoffWorkflow } from '../KickoffWorkflow';
import { HomeManager } from '../HomeManager';
import { useAuth } from '../../contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import type { GeneralProjectDecision } from '../../interfaces/Project';
import { filterGeneralDecisionsForPhases, parseGeneralProjectDecisionsFromPrerequisites } from '../../utils/generalProjectDecisions';
import {
  applyWorkflowDecisionDetailsToPhases,
  mergeWorkflowDecisionFieldsByOpId,
  parsePhasesJson,
  restoreDecisionOperationsFromTemplate,
  workflowDecisionFieldsByOpIdFromPhases,
  workflowDecisionFieldsByOpIdFromPrerequisites,
  type WorkflowDecisionDetailFields,
} from '../../utils/workflowDecisionDetails';
import { PLANNING_TOOL_WINDOW_CONTENT_PADDING_CLASSNAME } from '../PlanningWizardSteps/planningToolWindowChrome';
import { PlanningToolContextBanner } from '../PlanningWizardSteps/PlanningToolContextBanner';
import { formatProjectSizeDetail } from '@/utils/projectRunDisplayName';
import { getDefaultHomeIdForUser } from '@/utils/ensureDefaultHome';
import { parseCustomizationDecisions } from '@/utils/customizationDecisions';
import { cn } from '@/lib/utils';
import { useSteppedAutoAdvance } from '@/hooks/useSteppedAutoAdvance';

interface ProjectCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProjectRun?: ProjectRun;
  mode?: 'initial-plan' | 'final-plan' | 'unplanned-work' | 'replan';
  /** When opened from Planning Studio, Save and Close gates on full Scope completion. */
  fromPlanningWizard?: boolean;
  /** Called after a successful Save and Close when Scope is fully complete (Planning Studio checkoff). */
  onPlanningWizardComplete?: () => void;
}

interface ProjectSpace {
  id: string;
  space_name: string; // Changed from 'name' to 'space_name' for clarity and consistency with database
  spaceType: string;
  homeSpaceId?: string;
  scaleValue?: number;
  scaleUnit?: string;
  isFromHome: boolean;
  priority?: number; // Lower number = higher priority (1 is highest) - used for display order in workflow navigation
}

interface CustomizationState {
  spaces: ProjectSpace[];
  spaceDecisions: Record<string, {
    standardDecisions: Record<string, string[]>;
    ifNecessaryWork: Record<string, string[]>;
  }>;
  // Legacy fields for backward compatibility
  standardDecisions: Record<string, string[]>; // phaseId -> selected alternatives
  ifNecessaryWork: Record<string, string[]>; // phaseId -> selected optional work
  /** General project decision id -> selected choice id (from template scheduling_prerequisites). */
  generalProjectChoices: Record<string, string>;
  customPlannedWork: Phase[]; // phases added from other projects
  customUnplannedWork: Phase[]; // custom phases created by user
  workflowOrder: string[]; // ordered phase ids
}

export const ProjectCustomizer: React.FC<ProjectCustomizerProps> = ({
  open,
  onOpenChange,
  currentProjectRun,
  mode = 'initial-plan',
  fromPlanningWizard = false,
  onPlanningWizardComplete,
}) => {
  const { projects, updateProjectRun } = useProject();
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(mode === 'unplanned-work' ? 'step-4' : 'step-1');
  const activeStepRef = useRef(activeStep);
  activeStepRef.current = activeStep;
  /** Open phase row inside step 4 (`spaceId::phaseId`). */
  const [openBuiltInPhaseKey, setOpenBuiltInPhaseKey] = useState<string>('');
  const [customizationState, setCustomizationState] = useState<CustomizationState>({
    spaces: [],
    spaceDecisions: {},
    standardDecisions: {},
    ifNecessaryWork: {},
    generalProjectChoices: {},
    customPlannedWork: [],
    customUnplannedWork: [],
    workflowOrder: []
  });
  const isMobile = useIsMobile();

  const [showPhaseBrowser, setShowPhaseBrowser] = useState(false);
  const [showCustomWorkManager, setShowCustomWorkManager] = useState(false);
  const [showSpacesWindow, setShowSpacesWindow] = useState(false);
  const [focusSpaceId, setFocusSpaceId] = useState<string | null>(null);
  const [homeName, setHomeName] = useState<string>('');
  const [showKickoffEdit, setShowKickoffEdit] = useState(false);
  const [showHomeManager, setShowHomeManager] = useState(false);
  const [homes, setHomes] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedHomeId, setSelectedHomeId] = useState<string | null>(null);
  const [itemType, setItemType] = useState<string | null>(null);
  const [templateGeneralDecisions, setTemplateGeneralDecisions] = useState<GeneralProjectDecision[]>([]);
  const [templatePhasesForDecisions, setTemplatePhasesForDecisions] = useState<Phase[]>([]);
  const [templateWorkflowDecisionFieldsByOpId, setTemplateWorkflowDecisionFieldsByOpId] = useState<
    Record<string, WorkflowDecisionDetailFields>
  >({});
  const isSavingRef = useRef(false);

  useEffect(() => {
    if (open) {
      setActiveStep(mode === 'unplanned-work' ? 'step-4' : 'step-1');
      setOpenBuiltInPhaseKey('');
    }
  }, [open, mode]);

  // Keep the active customizer step accordion in view when it changes.
  useEffect(() => {
    if (!open || !activeStep) return;
    const frame = window.requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-customizer-step="${activeStep}"]`
      );
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, activeStep]);

  // Keep the expanded phase accordion in view when browsing built-in work.
  useEffect(() => {
    if (!open || !openBuiltInPhaseKey || activeStep !== 'step-4') return;
    const frame = window.requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-built-in-phase="${openBuiltInPhaseKey}"]`
      );
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, openBuiltInPhaseKey, activeStep]);

  // Get template project to access scaling unit and item type
  const templateProject = currentProjectRun?.projectId
    ? projects.find(p => p.id === currentProjectRun.projectId)
    : null;
  const scalingUnit = templateProject?.scalingUnit || currentProjectRun?.scalingUnit || 'per item';

  const projectRunForDecisions = useMemo(() => {
    if (!currentProjectRun) return currentProjectRun;
    const templatePhases =
      templatePhasesForDecisions.length > 0
        ? templatePhasesForDecisions
        : templateProject?.phases;
    const phasesWithDecisionOps = restoreDecisionOperationsFromTemplate(
      currentProjectRun.phases,
      templatePhases
    );
    const fromRun = workflowDecisionFieldsByOpIdFromPhases(phasesWithDecisionOps);
    const fromTemplateCache = workflowDecisionFieldsByOpIdFromPhases(templatePhases);
    const fieldsByOpId = mergeWorkflowDecisionFieldsByOpId(
      templateWorkflowDecisionFieldsByOpId,
      mergeWorkflowDecisionFieldsByOpId(fromTemplateCache, fromRun)
    );
    if (Object.keys(fieldsByOpId).length === 0) {
      return {
        ...currentProjectRun,
        phases: phasesWithDecisionOps,
      };
    }
    return {
      ...currentProjectRun,
      phases: applyWorkflowDecisionDetailsToPhases(phasesWithDecisionOps, fieldsByOpId),
    };
  }, [
    currentProjectRun,
    templateProject?.phases,
    templatePhasesForDecisions,
    templateWorkflowDecisionFieldsByOpId,
  ]);

  const filteredGeneralProjectDecisions = useMemo(
    () =>
      filterGeneralDecisionsForPhases(
        templateGeneralDecisions,
        currentProjectRun?.phases
      ),
    [templateGeneralDecisions, currentProjectRun?.phases]
  );

  const builtInWorkBySpace = useMemo(() => {
    const phases = (projectRunForDecisions?.phases || currentProjectRun?.phases || []).filter(
      (phase) => phase.isStandard !== true
    );
    return customizationState.spaces.map((space) => {
      const spaceState = customizationState.spaceDecisions[space.id];
      const phaseRows = phases
        .map((phase) => {
          const standardChoices = spaceState?.standardDecisions[phase.id] || [];
          const ifNecessaryChoices = spaceState?.ifNecessaryWork[phase.id] || [];
          const selectedOpIds = new Set(
            standardChoices.map((choice) => {
              const parts = choice.split(':');
              return parts.length > 1 ? parts[1] : choice;
            })
          );

          const operations: Array<{
            id: string;
            name: string;
            description?: string;
            kind: 'included' | 'choice' | 'optional' | 'pending';
            pendingPrompt?: string;
            steps: Array<{ id: string; name: string }>;
          }> = [];

          const pendingGroups = new Map<string, string>();

          const mapSteps = (op: { id: string; steps?: Array<{ id: string; step?: string }> }) =>
            (op.steps || [])
              .map((step) => ({
                id: step.id,
                name: typeof step.step === 'string' ? step.step.trim() : '',
              }))
              .filter((step) => step.name.length > 0);

          phase.operations.forEach((op) => {
            const flowType = (op as any).flowType || 'prime';
            if (flowType === 'prime') {
              operations.push({
                id: op.id,
                name: op.name,
                description: op.description || undefined,
                kind: 'included',
                steps: mapSteps(op),
              });
              return;
            }
            if (flowType === 'alternate') {
              const groupKey = (op as any).alternateGroup || 'choice-group';
              if (selectedOpIds.has(op.id)) {
                operations.push({
                  id: op.id,
                  name: op.name,
                  description: op.description || undefined,
                  kind: 'choice',
                  steps: mapSteps(op),
                });
              } else if (!standardChoices.some((d) => d.startsWith(groupKey + ':'))) {
                if (!pendingGroups.has(groupKey)) {
                  pendingGroups.set(
                    groupKey,
                    (op as any).userPrompt || 'Choice still needed'
                  );
                }
              }
              return;
            }
            if (flowType === 'if-necessary' && ifNecessaryChoices.includes(op.id)) {
              operations.push({
                id: op.id,
                name: op.name,
                description: op.description || undefined,
                kind: 'optional',
                steps: mapSteps(op),
              });
            }
          });

          pendingGroups.forEach((prompt, groupKey) => {
            operations.push({
              id: `pending-${phase.id}-${groupKey}`,
              name: prompt,
              kind: 'pending',
              pendingPrompt: prompt,
              steps: [],
            });
          });

          if (operations.length === 0) return null;
          return {
            phaseId: phase.id,
            phaseName: phase.name,
            operations,
          };
        })
        .filter(Boolean) as Array<{
        phaseId: string;
        phaseName: string;
        operations: Array<{
          id: string;
          name: string;
          description?: string;
          kind: 'included' | 'choice' | 'optional' | 'pending';
          pendingPrompt?: string;
          steps: Array<{ id: string; name: string }>;
        }>;
      }>;

      return {
        spaceId: space.id,
        spaceName: space.space_name,
        phases: phaseRows,
      };
    });
  }, [
    projectRunForDecisions?.phases,
    currentProjectRun?.phases,
    customizationState.spaces,
    customizationState.spaceDecisions,
  ]);

  const openSpacesEditor = (spaceId?: string) => {
    setFocusSpaceId(spaceId ?? null);
    setShowSpacesWindow(true);
  };

  const step3Complete = useMemo(() => {
    if (!projectRunForDecisions) return false;
    return (
      filteredGeneralProjectDecisions.every((decision) =>
        Boolean(customizationState.generalProjectChoices[decision.id])
      ) &&
      customizationState.spaces.length > 0 &&
      customizationState.spaces.every((space) =>
        areSpaceRequiredDecisionsComplete(
          projectRunForDecisions,
          space.id,
          customizationState.spaceDecisions
        )
      )
    );
  }, [
    projectRunForDecisions,
    filteredGeneralProjectDecisions,
    customizationState.generalProjectChoices,
    customizationState.spaces,
    customizationState.spaceDecisions,
  ]);

  const setActiveStepStable = useCallback((next: string) => {
    setActiveStep(next);
  }, []);

  // Auto-advance step 3 → 4 when required decisions become complete (or step 3 has nothing left to answer).
  // Steps 1–2 stay incomplete here so the hook can detect arrival from step-2 without skipping past them on open.
  useSteppedAutoAdvance({
    enabled: open && mode !== 'unplanned-work',
    activeStep,
    setActiveStep: setActiveStepStable,
    steps: [
      { key: 'step-1', isComplete: false, next: 'step-2' },
      { key: 'step-2', isComplete: false, next: 'step-3' },
      { key: 'step-3', isComplete: step3Complete, next: 'step-4' },
    ],
  });

  useEffect(() => {
    const templateId = templateProject?.id || currentProjectRun?.projectId;
    if (!open || !templateId) {
      setTemplateGeneralDecisions([]);
      setTemplatePhasesForDecisions([]);
      setTemplateWorkflowDecisionFieldsByOpId({});
      return;
    }
    let cancelled = false;
    void supabase
      .from('projects')
      .select('scheduling_prerequisites, phases')
      .eq('id', templateId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setTemplateGeneralDecisions(
          parseGeneralProjectDecisionsFromPrerequisites(data?.scheduling_prerequisites)
        );
        const parsedPhases = parsePhasesJson(data?.phases);
        setTemplatePhasesForDecisions(parsedPhases);
        const fromPrereqs = workflowDecisionFieldsByOpIdFromPrerequisites(
          data?.scheduling_prerequisites
        );
        const fromPhases = workflowDecisionFieldsByOpIdFromPhases(parsedPhases);
        setTemplateWorkflowDecisionFieldsByOpId(
          mergeWorkflowDecisionFieldsByOpId(fromPrereqs, fromPhases)
        );
      });
    return () => {
      cancelled = true;
    };
  }, [open, templateProject?.id, currentProjectRun?.projectId]);

  // Fetch item_type directly from database since it's not in the transformed Project interface
  useEffect(() => {
    const fetchItemType = async () => {
      if (templateProject?.id) {
        try {
          const { data, error } = await supabase
            .from('projects')
            .select('item_type')
            .eq('id', templateProject.id)
            .maybeSingle();

          if (error) throw error;
          setItemType(data?.item_type || null);
        } catch (error) {
          console.error('Error fetching item_type:', error);
        }
      }
    };

    if (open && templateProject?.id) {
      fetchItemType();
    }
  }, [open, templateProject?.id]);

  // Helper function to create default "Room 1" placeholder
  const createDefaultSpace = (): ProjectSpace => ({
    id: 'default-space-1',
    space_name: 'Room 1',
    spaceType: 'general',
    isFromHome: false
  });

  // Load customization decisions from database on mount
  useEffect(() => {
    if (!open || !currentProjectRun?.id) return;
    
    const loadSpaces = async () => {
      try {
        // Load spaces from project_run_spaces table with priority
        const { data: dbSpaces, error } = await supabase
          .from('project_run_spaces')
          .select('*')
          .eq('project_run_id', currentProjectRun.id)
          .order('priority', { ascending: true, nullsFirst: false } as any);

        if (error) throw error;

        const loadedSpaces: ProjectSpace[] = (dbSpaces || []).map(space => ({
          id: space.id,
          space_name: space.space_name,
          spaceType: space.space_type,
          homeSpaceId: space.home_space_id || undefined,
          scaleValue: space.scale_value || undefined,
          scaleUnit: space.scale_unit || undefined,
          isFromHome: space.is_from_home || false,
          priority: space.priority || undefined
        }));

        // If no spaces in database, check customization_decisions
        let spaces = loadedSpaces;
        const savedData = parseCustomizationDecisions(currentProjectRun?.customization_decisions);
        const hasSavedDecisions = Object.keys(savedData).length > 0;
        if (spaces.length === 0 && hasSavedDecisions) {
          const savedSpaces = Array.isArray(savedData.spaces) ? (savedData.spaces as ProjectSpace[]) : [];
          spaces = savedSpaces.length > 0 ? savedSpaces : [createDefaultSpace()];
        } else if (spaces.length === 0) {
          spaces = [createDefaultSpace()];
        }

        if (hasSavedDecisions) {
          setCustomizationState({
            spaces,
            spaceDecisions: (savedData.spaceDecisions as CustomizationState['spaceDecisions']) || {},
            standardDecisions: (savedData.standardDecisions as CustomizationState['standardDecisions']) || {},
            ifNecessaryWork: (savedData.ifNecessaryWork as CustomizationState['ifNecessaryWork']) || {},
            generalProjectChoices:
              (savedData.generalProjectChoices as CustomizationState['generalProjectChoices']) || {},
            customPlannedWork: (savedData.customPlannedWork as Phase[]) || [],
            customUnplannedWork: (savedData.customUnplannedWork as Phase[]) || [],
            workflowOrder: (savedData.workflowOrder as string[]) || []
          });
        } else {
          setCustomizationState(prev => ({
            ...prev,
            spaces
          }));
        }
      } catch (error) {
        console.error('Error loading spaces:', error);
        // Fallback to customization_decisions if database load fails
        const savedData = parseCustomizationDecisions(currentProjectRun?.customization_decisions);
        if (Object.keys(savedData).length > 0) {
          const savedSpaces = Array.isArray(savedData.spaces) ? (savedData.spaces as ProjectSpace[]) : [];
          const spaces = savedSpaces.length > 0 ? savedSpaces : [createDefaultSpace()];
          setCustomizationState({
            spaces,
            spaceDecisions: (savedData.spaceDecisions as CustomizationState['spaceDecisions']) || {},
            standardDecisions: (savedData.standardDecisions as CustomizationState['standardDecisions']) || {},
            ifNecessaryWork: (savedData.ifNecessaryWork as CustomizationState['ifNecessaryWork']) || {},
            generalProjectChoices:
              (savedData.generalProjectChoices as CustomizationState['generalProjectChoices']) || {},
            customPlannedWork: (savedData.customPlannedWork as Phase[]) || [],
            customUnplannedWork: (savedData.customUnplannedWork as Phase[]) || [],
            workflowOrder: (savedData.workflowOrder as string[]) || []
          });
        } else {
          setCustomizationState(prev => ({
            ...prev,
            spaces: [createDefaultSpace()]
          }));
        }
      }
    };

    loadSpaces();
  }, [open, currentProjectRun?.id]);

  // Load homes list and home name
  useEffect(() => {
    if (open && user) {
      fetchHomes();
      if (currentProjectRun?.home_id) {
        fetchHomeName();
        setSelectedHomeId(currentProjectRun.home_id);
      }
    }
  }, [open, currentProjectRun?.home_id, user]);

  const fetchHomes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('homes')
        .select('id, name')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHomes(data || []);
    } catch (error) {
      console.error('Error fetching homes:', error);
      toast({
        title: "Error",
        description: "Failed to load homes",
        variant: "destructive"
      });
    }
  };

  const fetchHomeName = async () => {
    if (!currentProjectRun?.home_id) return;

    try {
      const { data, error } = await supabase
        .from('homes')
        .select('name')
        .eq('id', currentProjectRun.home_id)
        .maybeSingle();

      if (error) throw error;
      setHomeName(data?.name || 'Unknown Home');
    } catch (error) {
      console.error('Error fetching home:', error);
      setHomeName('Unknown Home');
    }
  };

  const handleHomeChange = async (homeId: string) => {
    if (!currentProjectRun || !homeId) return;

    try {
      // Update project run with new home_id
      await updateProjectRun({
        ...currentProjectRun,
        home_id: homeId
      });

      // Update local state
      setSelectedHomeId(homeId);
      const selectedHome = homes.find(h => h.id === homeId);
      setHomeName(selectedHome?.name || 'Unknown Home');

      if (activeStepRef.current === 'step-1') {
        setActiveStep('step-2');
      }
    } catch (error) {
      console.error('Error updating home:', error);
      toast({
        title: "Error",
        description: "Failed to update home",
        variant: "destructive"
      });
    }
  };

  const handleUseDefaultHome = async () => {
    if (!user?.id || !currentProjectRun) return;
    try {
      const defaultHomeId = await getDefaultHomeIdForUser(user.id);
      const { data: defaultHome, error: homeLookupError } = await supabase
        .from('homes')
        .select('id, name')
        .eq('id', defaultHomeId)
        .maybeSingle();
      if (homeLookupError) throw homeLookupError;

      await handleHomeChange(defaultHomeId);
      if (defaultHome?.name) setHomeName(defaultHome.name);
      await fetchHomes();
      setActiveStep('step-2');
    } catch (error) {
      console.error('Error selecting default home:', error);
      toast({
        title: 'Error',
        description: 'Failed to select default home',
        variant: 'destructive',
      });
    }
  };

  const handleUseOneDefaultRoom = async () => {
    if (!currentProjectRun?.id) return;

    try {
      const { data: existingSpaces, error: spacesError } = await supabase
        .from('project_run_spaces')
        .select('*')
        .eq('project_run_id', currentProjectRun.id)
        .order('priority', { ascending: true, nullsFirst: false } as any);

      if (spacesError) throw spacesError;

      let room1 = (existingSpaces || []).find((space) => space.space_name === 'Room 1');

      if (!room1) {
        const parsedSizing =
          typeof currentProjectRun.initial_sizing === 'string'
            ? Number.parseFloat(currentProjectRun.initial_sizing)
            : Number.NaN;
        const hasSizing = !Number.isNaN(parsedSizing) && parsedSizing > 0;
        const sizingByUnit =
          hasSizing && scalingUnit ? { [scalingUnit]: parsedSizing } : null;

        const { data: created, error: createError } = await supabase
          .from('project_run_spaces')
          .insert({
            project_run_id: currentProjectRun.id,
            space_name: 'Room 1',
            space_type: 'general',
            is_from_home: false,
            priority: 1,
            ...(hasSizing
              ? {
                  scale_value: parsedSizing,
                  scale_unit: scalingUnit,
                  ...(sizingByUnit ? { sizing_by_unit: sizingByUnit } : {}),
                }
              : {}),
          })
          .select('*')
          .single();

        if (createError) throw createError;
        room1 = created;
      } else if (
        (room1.scale_value === null || room1.scale_value === undefined) &&
        typeof currentProjectRun.initial_sizing === 'string' &&
        currentProjectRun.initial_sizing.trim()
      ) {
        const parsedSizing = Number.parseFloat(currentProjectRun.initial_sizing);
        if (!Number.isNaN(parsedSizing) && parsedSizing > 0) {
          const currentSizing =
            room1.sizing_by_unit && typeof room1.sizing_by_unit === 'object'
              ? (room1.sizing_by_unit as Record<string, number>)
              : {};
          const sizingByUnit = { ...currentSizing, [scalingUnit]: parsedSizing };
          const { data: updated, error: updateError } = await supabase
            .from('project_run_spaces')
            .update({
              scale_value: parsedSizing,
              scale_unit: scalingUnit,
              sizing_by_unit: sizingByUnit,
              updated_at: new Date().toISOString(),
            })
            .eq('id', room1.id)
            .select('*')
            .single();
          if (updateError) throw updateError;
          room1 = updated;
        }
      }

      const extras = (existingSpaces || []).filter((space) => space.id !== room1!.id);
      if (extras.length > 0) {
        const { error: deleteError } = await supabase
          .from('project_run_spaces')
          .delete()
          .in(
            'id',
            extras.map((space) => space.id)
          );
        if (deleteError) throw deleteError;
      }

      const roomSpace: ProjectSpace = {
        id: room1.id,
        space_name: room1.space_name,
        spaceType: room1.space_type || 'general',
        homeSpaceId: room1.home_space_id || undefined,
        scaleValue: room1.scale_value || undefined,
        scaleUnit: room1.scale_unit || undefined,
        isFromHome: room1.is_from_home || false,
        priority: room1.priority || 1,
      };

      handleSpacesChange([roomSpace]);
      setActiveStep('step-3');
    } catch (error) {
      console.error('Error applying default room:', error);
      toast({
        title: 'Error',
        description: 'Failed to apply default room',
        variant: 'destructive',
      });
    }
  };

  // Initialize workflow order from current project run
  useEffect(() => {
    if (currentProjectRun?.phases && open) {
      const phaseIds = currentProjectRun.phases.map(p => p.id);
      setCustomizationState(prev => ({
        ...prev,
        workflowOrder: phaseIds
      }));
    }
  }, [currentProjectRun, open]);

  const handleStandardDecision = (phaseId: string, alternatives: string[]) => {
    setCustomizationState(prev => ({
      ...prev,
      standardDecisions: {
        ...prev.standardDecisions,
        [phaseId]: alternatives
      }
    }));
  };

  const handleIfNecessaryWork = (phaseId: string, optionalWork: string[]) => {
    setCustomizationState(prev => ({
      ...prev,
      ifNecessaryWork: {
        ...prev.ifNecessaryWork,
        [phaseId]: optionalWork
      }
    }));
  };

  const handleSpacesChange = (spaces: ProjectSpace[]) => {
    setCustomizationState(prev => ({
      ...prev,
      spaces
    }));
  };

  const handleSpaceDecision = (
    spaceId: string,
    phaseId: string,
    type: 'standard' | 'ifNecessary',
    decisions: string[]
  ) => {
    setCustomizationState(prev => {
      const newSpaceDecisions = { ...prev.spaceDecisions };
      if (!newSpaceDecisions[spaceId]) {
        newSpaceDecisions[spaceId] = {
          standardDecisions: {},
          ifNecessaryWork: {}
        };
      }
      
      if (type === 'standard') {
        newSpaceDecisions[spaceId].standardDecisions = {
          ...newSpaceDecisions[spaceId].standardDecisions,
          [phaseId]: decisions
        };
      } else {
        newSpaceDecisions[spaceId].ifNecessaryWork = {
          ...newSpaceDecisions[spaceId].ifNecessaryWork,
          [phaseId]: decisions
        };
      }
      
      return {
        ...prev,
        spaceDecisions: newSpaceDecisions
      };
    });
  };

  const handleAddCustomPlannedWork = (phases: Phase[], insertAfterPhaseId?: string) => {
    setCustomizationState(prev => {
      const newCustomPlanned = [...prev.customPlannedWork, ...phases];
      let newWorkflowOrder = [...prev.workflowOrder];
      
      if (insertAfterPhaseId) {
        const insertIndex = newWorkflowOrder.findIndex(id => id === insertAfterPhaseId) + 1;
        const newPhaseIds = phases.map(p => p.id);
        newWorkflowOrder.splice(insertIndex, 0, ...newPhaseIds);
      } else {
        // Insert before close phase
        const closePhaseIndex = newWorkflowOrder.findIndex(id => 
          currentProjectRun?.phases?.find(p => p.id === id)?.name.toLowerCase().includes('close')
        );
        if (closePhaseIndex !== -1) {
          newWorkflowOrder.splice(closePhaseIndex, 0, ...phases.map(p => p.id));
        } else {
          newWorkflowOrder.push(...phases.map(p => p.id));
        }
      }
      
      return {
        ...prev,
        customPlannedWork: newCustomPlanned,
        workflowOrder: newWorkflowOrder
      };
    });
    setShowPhaseBrowser(false);
  };

  const handleAddCustomUnplannedWork = (phase: Phase, insertAfterPhaseId?: string) => {
    setCustomizationState(prev => {
      const newCustomUnplanned = [...prev.customUnplannedWork, phase];
      let newWorkflowOrder = [...prev.workflowOrder];
      
      if (insertAfterPhaseId) {
        const insertIndex = newWorkflowOrder.findIndex(id => id === insertAfterPhaseId) + 1;
        newWorkflowOrder.splice(insertIndex, 0, phase.id);
      } else {
        // Insert before close phase
        const closePhaseIndex = newWorkflowOrder.findIndex(id => 
          currentProjectRun?.phases?.find(p => p.id === id)?.name.toLowerCase().includes('close')
        );
        if (closePhaseIndex !== -1) {
          newWorkflowOrder.splice(closePhaseIndex, 0, phase.id);
        } else {
          newWorkflowOrder.push(phase.id);
        }
      }
      
      return {
        ...prev,
        customUnplannedWork: newCustomUnplanned,
        workflowOrder: newWorkflowOrder
      };
    });
    setShowCustomWorkManager(false);
  };

  const handleSaveCustomization = async () => {
    if (!currentProjectRun) return;
    if (isSavingRef.current) return;
    isSavingRef.current = true;

    try {
      // Prefer restored decision catalog so selected alternate ops missing from a
      // previously stripped run snapshot are written back into phases on save.
      const phasesForSave = projectRunForDecisions?.phases || currentProjectRun.phases || [];
      let newPhases = JSON.parse(JSON.stringify(phasesForSave));

      // Apply standard decisions and if-necessary work filtering.
      // Space-scoped choices live under spaceDecisions; also honor top-level maps.
      newPhases = newPhases.map((phase) => {
        const standardChoices = [
          ...(customizationState.standardDecisions[phase.id] || []),
          ...Object.values(customizationState.spaceDecisions).flatMap(
            (spaceState) => spaceState.standardDecisions?.[phase.id] || []
          ),
        ];
        const ifNecessaryChoices = [
          ...(customizationState.ifNecessaryWork[phase.id] || []),
          ...Object.values(customizationState.spaceDecisions).flatMap(
            (spaceState) => spaceState.ifNecessaryWork?.[phase.id] || []
          ),
        ];

        // Extract selected operation IDs from "groupKey:operationId" format
        const selectedOpIds = new Set(
          standardChoices.map((choice) => {
            const parts = choice.split(':');
            return parts.length > 1 ? parts[1] : choice;
          })
        );
        const selectedIfNecessaryIds = new Set(ifNecessaryChoices);
        const answeredAlternateGroups = new Set(
          standardChoices
            .map((choice) => {
              const sep = choice.indexOf(':');
              return sep > 0 ? choice.slice(0, sep) : null;
            })
            .filter((groupKey): groupKey is string => Boolean(groupKey))
        );

        // Filter operations based on flowType.
        // Keep unanswered alternate groups intact so Scope can reopen them.
        // Only drop rivals once a group has an explicit selection.
        const filteredOperations = phase.operations.filter((op) => {
          const flowType = (op as any).flowType || 'prime';

          // Always keep prime operations
          if (flowType === 'prime') return true;

          // For alternate operations, only keep selected ones once answered
          if (flowType === 'alternate') {
            const groupKey = (op as any).alternateGroup || 'choice-group';
            if (!answeredAlternateGroups.has(groupKey)) return true;
            return selectedOpIds.has(op.id);
          }

          // For if-necessary operations, only keep selected ones
          if (flowType === 'if-necessary') {
            return selectedIfNecessaryIds.has(op.id);
          }

          return true;
        });

        return {
          ...phase,
          operations: filteredOperations,
        };
      });

      // Add custom planned work phases
      customizationState.customPlannedWork.forEach(phase => {
        if (!newPhases.find(p => p.id === phase.id)) {
          newPhases.push(phase);
        }
      });

      // Add custom unplanned work phases  
      customizationState.customUnplannedWork.forEach(phase => {
        if (!newPhases.find(p => p.id === phase.id)) {
          newPhases.push(phase);
        }
      });

      // Reorder phases based on workflow order
      const orderedPhases = customizationState.workflowOrder
        .map(id => newPhases.find(p => p.id === id))
        .filter(Boolean) as Phase[];

      // Add any phases not in the order at the end
      newPhases.forEach(phase => {
        if (!orderedPhases.find(p => p.id === phase.id)) {
          orderedPhases.push(phase);
        }
      });

      // Merge into existing decisions so Planning Studio keys
      // (selected_planning_tools, planning_wizard_completed_tools, etc.) are preserved.
      const existingDecisions = parseCustomizationDecisions(
        currentProjectRun.customization_decisions
      );
      const completedToolsRaw = existingDecisions.planning_wizard_completed_tools;
      const completedTools = Array.isArray(completedToolsRaw)
        ? completedToolsRaw.filter((id): id is string => typeof id === 'string')
        : [];

      const homeSelected = Boolean(selectedHomeId || currentProjectRun.home_id);
      const spacesSelected = customizationState.spaces.length > 0;
      const runForRequiredCheck = projectRunForDecisions || currentProjectRun;
      const requiredDecisionsComplete =
        filteredGeneralProjectDecisions.every((decision) =>
          Boolean(customizationState.generalProjectChoices[decision.id])
        ) &&
        customizationState.spaces.every((space) =>
          areSpaceRequiredDecisionsComplete(
            runForRequiredCheck,
            space.id,
            customizationState.spaceDecisions
          )
        );
      const customizerFullyComplete =
        homeSelected && spacesSelected && requiredDecisionsComplete;

      if (fromPlanningWizard && !customizerFullyComplete) {
        toast({
          title: 'Scope incomplete',
          description: 'Finish home, spaces, and required decisions before completing Scope.',
          variant: 'destructive',
        });
        // Still persist progress, but do not mark Scope complete or advance Planning Studio.
      }

      if (fromPlanningWizard && customizerFullyComplete && !completedTools.includes('scope')) {
        completedTools.push('scope');
      }

      const updatedProjectRun = {
        ...currentProjectRun,
        phases: orderedPhases,
        customization_decisions: {
          ...existingDecisions,
          ...customizationState,
          ...(fromPlanningWizard && customizerFullyComplete
            ? { planning_wizard_completed_tools: completedTools }
            : fromPlanningWizard
              ? {
                  // Keep prior completed-tools list; do not add scope until fully complete.
                  planning_wizard_completed_tools: completedTools.filter((id) => id !== 'scope'),
                }
              : {}),
        } as ProjectRun['customization_decisions'],
        updatedAt: new Date()
      };

      await updateProjectRun(updatedProjectRun);
      
      // Dispatch refresh event for workflow navigation
      window.dispatchEvent(new CustomEvent('project-customizer-updated', {
        detail: { projectRunId: currentProjectRun.id }
      }));

      if (fromPlanningWizard && customizerFullyComplete) {
        onPlanningWizardComplete?.();
      }
      
            
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving customization:', error);
      toast({
        title: "Error",
        description: "Failed to save customization",
        variant: "destructive"
      });
    } finally {
      isSavingRef.current = false;
    }
  };

  const getModeTitle = () => {
    return 'Scope';
  };

  const getModeDescription = () => {
    switch (mode) {
      case 'initial-plan': return 'Shape the job around your home and rooms.';
      case 'final-plan': return 'Lock in your choices before you start.';
      case 'unplanned-work': return "Add work that wasn't in the original plan.";
      case 'replan': return 'Every project has its own decisions to make';
      default: return 'Shape the job around your home and rooms.';
    }
  };

  if (!currentProjectRun) {
    return null;
  }

  const step1Complete = Boolean(selectedHomeId || currentProjectRun.home_id);
  const step2Complete = customizationState.spaces.length > 0;
  const step4Complete =
    customizationState.customPlannedWork.length > 0 ||
    customizationState.customUnplannedWork.length > 0 ||
    (step3Complete && Boolean(currentProjectRun.customization_decisions));

  const StepCircle = ({ step, complete }: { step: number; complete?: boolean }) => (
    <div
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold',
        complete
          ? 'bg-success text-success-foreground'
          : 'bg-primary text-primary-foreground'
      )}
      aria-label={complete ? `Step ${step} complete` : `Step ${step}`}
    >
      {complete ? <Check className="h-5 w-5" strokeWidth={3} aria-hidden /> : step}
    </div>
  );

  const StepHeading = ({
    step,
    title,
    description,
    complete,
  }: {
    step: number;
    title: string;
    description: string;
    complete?: boolean;
  }) => (
    <div className="flex items-start gap-3 text-left">
      <StepCircle step={step} complete={complete} />
      <div className="min-w-0">
        <div className="text-base font-semibold text-foreground md:text-lg">{title}</div>
        <div className="mt-1 text-xs leading-relaxed text-muted-foreground md:text-sm">{description}</div>
      </div>
    </div>
  );

  return (
    <>
      <ResponsiveDialog 
        open={open} 
        onOpenChange={onOpenChange}
        title={getModeTitle()}
        description={getModeDescription()}
        size={isMobile ? "content-full" : "large"}
        planningToolHeader
        planningToolOnCancel={() => onOpenChange(false)}
        planningToolOnSave={() => void handleSaveCustomization()}
        planningToolSaveLabel="Save and Close"
      >
        <div className="flex flex-col h-full">
          <PlanningToolContextBanner
            projectRun={currentProjectRun}
            label="Size estimate"
            detail={formatProjectSizeDetail(
              {
                initial_sizing: currentProjectRun?.initial_sizing,
                scalingUnit,
              },
              itemType
            )}
          />

          <ScrollArea className={cn('flex-1 min-h-0', PLANNING_TOOL_WINDOW_CONTENT_PADDING_CLASSNAME)}>
            <Accordion
              type="single"
              collapsible
              value={activeStep}
              onValueChange={setActiveStep}
              className="space-y-4 pb-4"
            >
              <AccordionItem
                value="step-1"
                data-customizer-step="step-1"
                className="overflow-hidden rounded-xl border bg-card shadow-sm"
              >
                <AccordionTrigger className="px-4 py-4 hover:no-underline md:px-5">
                  <StepHeading
                    step={1}
                    title="Select / Edit Project Home"
                    description="Choose the home this project belongs to"
                    complete={step1Complete}
                  />
                </AccordionTrigger>
                <AccordionContent className="border-t bg-muted/10 px-4 pb-4 pt-4 md:px-5">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Project Home</span>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        {currentProjectRun?.home_id && homes.length > 0 ? (
                          <Select
                            value={selectedHomeId || currentProjectRun.home_id}
                            onValueChange={handleHomeChange}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Select a home" />
                            </SelectTrigger>
                            <SelectContent>
                              {homes.map((home) => (
                                <SelectItem key={home.id} value={home.id}>
                                  {home.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {homeName || 'Unknown Home'}
                          </Badge>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void handleUseDefaultHome()}
                          className="h-9 bg-success px-3 text-xs text-success-foreground hover:bg-success"
                        >
                          Use Default Home and Continue
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowHomeManager(true)}
                          className="h-9 px-3 text-xs"
                          title="Manage homes"
                        >
                          <Edit2 className="mr-1 h-3 w-3" />
                          Manage Homes
                        </Button>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="step-2"
                data-customizer-step="step-2"
                className="overflow-hidden rounded-xl border bg-card shadow-sm"
              >
                <AccordionTrigger className="px-4 py-4 hover:no-underline md:px-5">
                  <StepHeading
                    step={2}
                    title="Select / Edit Project Spaces"
                    description="Pick which rooms are in play"
                    complete={step2Complete}
                  />
                </AccordionTrigger>
                <AccordionContent className="border-t bg-muted/10 px-4 pb-4 pt-4 md:px-5">
                  <Card className="bg-info/10 border-info/40">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm mb-1">Project Spaces</h4>
                          <p className="text-xs text-muted-foreground mb-3">
                            Open this when rooms need their own setup.
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openSpacesEditor()}
                              className="text-xs"
                            >
                              <Settings className="w-3 h-3 mr-2" />
                              Manage Project Spaces
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => void handleUseOneDefaultRoom()}
                              className="bg-success text-xs text-success-foreground hover:bg-success"
                            >
                              Use (1) Default Room and Continue
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="step-3"
                data-customizer-step="step-3"
                className="overflow-hidden rounded-xl border bg-card shadow-sm"
              >
                <AccordionTrigger className="px-4 py-4 hover:no-underline md:px-5">
                  <StepHeading
                    step={3}
                    title="Make Project Choices for each Space"
                    description="Answer the calls that change how you build"
                    complete={step3Complete}
                  />
                </AccordionTrigger>
                <AccordionContent className="border-t bg-muted/10 px-4 pb-4 pt-4 md:px-5">
                  {filteredGeneralProjectDecisions.length > 0 ? (
                    <Card className="mb-6 border-primary/20">
                      <CardHeader className={isMobile ? 'pb-3' : ''}>
                        <CardTitle className="text-base font-semibold">Project choices</CardTitle>
                        <CardDescription className="text-xs">
                          Project-wide choices that pair with the space decisions below.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        {filteredGeneralProjectDecisions.map((decision) => {
                          const isAnswered = Boolean(
                            customizationState.generalProjectChoices[decision.id]
                          );
                          return (
                          <div
                            key={decision.id}
                            className={`space-y-2 border-b border-border/60 pb-4 last:border-0 last:pb-0 ${
                              isAnswered ? 'rounded-lg border border-success/40 bg-success/10 px-3 pt-3' : ''
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {isAnswered ? (
                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
                              ) : (
                                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning-soft" aria-hidden />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  <Label className="text-sm font-medium">{decision.label}</Label>
                                  {isAnswered ? (
                                    <Badge variant="secondary" className="bg-success/15 text-xs text-success">
                                      Done
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive" className="text-xs">
                                      Required
                                    </Badge>
                                  )}
                                </div>
                            <RadioGroup
                              value={customizationState.generalProjectChoices[decision.id] ?? ''}
                              onValueChange={(v) =>
                                setCustomizationState((prev) => ({
                                  ...prev,
                                  generalProjectChoices: {
                                    ...prev.generalProjectChoices,
                                    [decision.id]: v,
                                  },
                                }))
                              }
                            >
                              {decision.choices.map((c) => (
                                <div key={c.id} className="flex items-center space-x-2">
                                  <RadioGroupItem value={c.id} id={`gpc-${decision.id}-${c.id}`} />
                                  <Label
                                    htmlFor={`gpc-${decision.id}-${c.id}`}
                                    className="font-normal cursor-pointer text-sm"
                                  >
                                    {c.label}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                              </div>
                            </div>
                          </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  ) : null}
                  <SpaceDecisionFlow
                    spaces={customizationState.spaces}
                    projectRun={projectRunForDecisions || currentProjectRun}
                    spaceDecisions={customizationState.spaceDecisions}
                    onSpaceDecision={handleSpaceDecision}
                    onEditSpace={(spaceId) => openSpacesEditor(spaceId)}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="step-4"
                data-customizer-step="step-4"
                className="overflow-hidden rounded-xl border bg-card shadow-sm"
              >
                <AccordionTrigger className="px-4 py-4 hover:no-underline md:px-5">
                  <StepHeading
                    step={4}
                    title="Add Custom Work"
                    description="Add extra work only if you need it"
                    complete={step4Complete}
                  />
                </AccordionTrigger>
                <AccordionContent className="border-t bg-muted/10 px-4 pb-4 pt-4 md:px-5">
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className={isMobile ? 'pb-3' : ''}>
                        <CardTitle className="text-base font-semibold">
                          Built into this project
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Work already included from the plan and your step 3 choices. Add custom steps below only if you need more.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {builtInWorkBySpace.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Add spaces in step 2 to see the project work list.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {builtInWorkBySpace
                              .filter((spaceRow) => spaceRow.phases.length === 0)
                              .map((spaceRow) => (
                                <div
                                  key={`${spaceRow.spaceId}-empty`}
                                  className="rounded-md border border-dashed px-2.5 py-2"
                                >
                                  <p className="text-sm font-semibold text-foreground">
                                    {spaceRow.spaceName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    No operations listed for this space yet.
                                  </p>
                                </div>
                              ))}
                            <Accordion
                              type="single"
                              collapsible
                              value={openBuiltInPhaseKey}
                              onValueChange={(value) => {
                                setOpenBuiltInPhaseKey(value || '');
                              }}
                              className="space-y-2"
                            >
                              {builtInWorkBySpace.flatMap((spaceRow) =>
                                spaceRow.phases.map((phaseRow) => {
                                  const phaseKey = `${spaceRow.spaceId}::${phaseRow.phaseId}`;
                                  const showSpacePrefix = builtInWorkBySpace.length > 1;
                                  return (
                                    <AccordionItem
                                      key={phaseKey}
                                      value={phaseKey}
                                      data-built-in-phase={phaseKey}
                                      className="overflow-hidden rounded-md border bg-background/80"
                                    >
                                      <AccordionTrigger className="px-2.5 py-2 text-xs font-medium hover:no-underline">
                                        <span className="flex min-w-0 flex-col items-start gap-0.5 text-left">
                                          {showSpacePrefix ? (
                                            <span className="text-[10px] font-normal text-muted-foreground">
                                              {spaceRow.spaceName}
                                            </span>
                                          ) : null}
                                          <span className="flex min-w-0 items-center gap-2">
                                            <span className="truncate">{phaseRow.phaseName}</span>
                                            <span className="shrink-0 text-[10px] font-normal text-muted-foreground">
                                              {phaseRow.operations.length} op
                                              {phaseRow.operations.length === 1 ? '' : 's'}
                                            </span>
                                          </span>
                                        </span>
                                      </AccordionTrigger>
                                      <AccordionContent className="border-t px-0 pb-0">
                                        <div className="divide-y">
                                          {phaseRow.operations.map((op) => (
                                            <div key={op.id} className="space-y-1.5 px-2.5 py-2">
                                              <div className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] gap-x-3 text-xs sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
                                                <div className="truncate font-medium leading-5">
                                                  {op.name}
                                                </div>
                                                <div className="truncate text-muted-foreground leading-5">
                                                  {op.kind === 'pending'
                                                    ? 'Needs choice in step 3'
                                                    : op.description || '—'}
                                                </div>
                                              </div>
                                              {op.steps.length > 0 ? (
                                                <ul className="space-y-1 border-l border-border/60 pl-3">
                                                  {op.steps.map((step) => (
                                                    <li
                                                      key={step.id}
                                                      className="truncate text-[11px] leading-4 text-muted-foreground"
                                                    >
                                                      {step.name}
                                                    </li>
                                                  ))}
                                                </ul>
                                              ) : null}
                                            </div>
                                          ))}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  );
                                })
                              )}
                            </Accordion>
                          </div>
                        )}
                        <div className="flex flex-row items-center gap-2 pt-1">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void handleSaveCustomization()}
                            className="flex-1 bg-success text-xs text-success-foreground hover:bg-success sm:flex-none"
                          >
                            Continue with no Custom Work
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setShowCustomWorkManager(true)}
                            className="flex-1 text-xs sm:flex-none"
                          >
                            Add Custom Work
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {customizationState.customPlannedWork.length > 0 && (
                      <Card>
                        <CardHeader className={isMobile ? 'pb-3' : ''}>
                          <CardTitle className="text-base font-semibold">Added Planned Work</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {customizationState.customPlannedWork.map((phase, index) => (
                            <div key={index} className={`flex flex-col sm:flex-row sm:items-center justify-between ${isMobile ? 'p-4' : 'p-3'} bg-muted rounded-lg gap-3`}>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm">{phase.name}</h4>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{phase.description}</p>
                              </div>
                              <Badge variant="secondary" className="self-start sm:self-center">Planned</Badge>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {customizationState.customUnplannedWork.length > 0 && (
                      <Card>
                        <CardHeader className={isMobile ? 'pb-3' : ''}>
                          <CardTitle className="text-base font-semibold">Added Custom Work</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {customizationState.customUnplannedWork.map((phase, index) => (
                            <div key={index} className={`flex flex-col sm:flex-row sm:items-center justify-between ${isMobile ? 'p-4' : 'p-3'} bg-muted rounded-lg gap-3`}>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm">{phase.name}</h4>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{phase.description}</p>
                              </div>
                              <Badge variant="secondary" className="bg-warning-soft/15 text-warning-soft self-start sm:self-center">
                                Custom
                              </Badge>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </ScrollArea>
        </div>
      </ResponsiveDialog>

      <PhaseBrowser
        open={showPhaseBrowser}
        onOpenChange={setShowPhaseBrowser}
        availableProjects={projects}
        onSelectPhases={handleAddCustomPlannedWork}
        currentProjectId={currentProjectRun.projectId}
        onAddCustomWork={() => {
          setShowPhaseBrowser(false);
          setShowCustomWorkManager(true);
        }}
      />

      <SimplifiedCustomWorkManager
        open={showCustomWorkManager}
        onOpenChange={setShowCustomWorkManager}
        onCreateCustomWork={handleAddCustomUnplannedWork}
      />

      {/* Project Spaces Window */}
      <Dialog
        open={showSpacesWindow}
        onOpenChange={(nextOpen) => {
          setShowSpacesWindow(nextOpen);
          if (!nextOpen) {
            setFocusSpaceId(null);
            if (
              activeStepRef.current === 'step-2' &&
              customizationState.spaces.length > 0
            ) {
              setActiveStep('step-3');
            }
          }
        }}
      >
        <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
          <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-lg font-semibold">Project Spaces</DialogTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowSpacesWindow(false);
                  setFocusSpaceId(null);
                  if (
                    activeStepRef.current === 'step-2' &&
                    customizationState.spaces.length > 0
                  ) {
                    setActiveStep('step-3');
                  }
                }} 
                className="h-7 px-2 text-[9px] md:text-xs"
              >
                Close
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
            <SpaceSelector
              projectRunId={currentProjectRun.id}
              projectRunHomeId={currentProjectRun.home_id}
              selectedSpaces={customizationState.spaces}
              onSpacesChange={handleSpacesChange}
              projectScaleUnit={scalingUnit?.replace('per ', '') || 'item'}
              currentProjectName={templateProject?.name || currentProjectRun.name || 'Current Project'}
              phases={currentProjectRun.phases || []}
              initialSizing={currentProjectRun.initial_sizing}
              focusSpaceId={focusSpaceId}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Kickoff Edit Window - opens to step 3 (Project Profile) */}
      {showKickoffEdit && currentProjectRun && (
        <KickoffWorkflow
          onKickoffComplete={() => {
            setShowKickoffEdit(false);
            fetchHomeName(); // Refresh home name after edit
          }}
          onExit={() => setShowKickoffEdit(false)}
        />
      )}

      {/* Home Manager */}
      <HomeManager
        open={showHomeManager}
        onOpenChange={setShowHomeManager}
        selectedHomeId={currentProjectRun?.home_id || undefined}
        onHomeSelected={async (homeId) => {
          await handleHomeChange(homeId);
          setShowHomeManager(false);
        }}
      />
    </>
  );
};