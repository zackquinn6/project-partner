import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { Settings, GitBranch, Home, Edit2, Check, CheckCircle2, AlertCircle } from 'lucide-react';
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
import { PLANNING_TOOL_WINDOW_CONTENT_PADDING_CLASSNAME } from '../PlanningWizardSteps/planningToolWindowChrome';
import { PlanningToolContextBanner } from '../PlanningWizardSteps/PlanningToolContextBanner';
import { formatProjectSizeDetail } from '@/utils/projectRunDisplayName';
import { getDefaultHomeIdForUser } from '@/utils/ensureDefaultHome';
import { cn } from '@/lib/utils';

interface ProjectCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProjectRun?: ProjectRun;
  mode?: 'initial-plan' | 'final-plan' | 'unplanned-work' | 'replan';
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
  mode = 'initial-plan'
}) => {
  const { projects, updateProjectRun } = useProject();
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(mode === 'unplanned-work' ? 'step-4' : 'step-1');
  const activeStepRef = useRef(activeStep);
  activeStepRef.current = activeStep;
  const step3AutoAdvanceRef = useRef<{ step: string; complete: boolean }>({
    step: activeStep,
    complete: false,
  });
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

  useEffect(() => {
    if (open) {
      setActiveStep(mode === 'unplanned-work' ? 'step-4' : 'step-1');
    }
  }, [open, mode]);

  // Get template project to access scaling unit and item type
  const templateProject = currentProjectRun?.projectId
    ? projects.find(p => p.id === currentProjectRun.projectId)
    : null;
  const scalingUnit = templateProject?.scalingUnit || currentProjectRun?.scalingUnit || 'per item';

  const filteredGeneralProjectDecisions = useMemo(
    () =>
      filterGeneralDecisionsForPhases(
        templateGeneralDecisions,
        currentProjectRun?.phases
      ),
    [templateGeneralDecisions, currentProjectRun?.phases]
  );

  const builtInWorkBySpace = useMemo(() => {
    const phases = currentProjectRun?.phases || [];
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
          }> = [];

          const pendingGroups = new Map<string, string>();

          phase.operations.forEach((op) => {
            const flowType = (op as any).flowType || 'prime';
            if (flowType === 'prime') {
              operations.push({
                id: op.id,
                name: op.name,
                description: op.description || undefined,
                kind: 'included',
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
              });
            }
          });

          pendingGroups.forEach((prompt, groupKey) => {
            operations.push({
              id: `pending-${phase.id}-${groupKey}`,
              name: prompt,
              kind: 'pending',
              pendingPrompt: prompt,
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
        }>;
      }>;

      return {
        spaceId: space.id,
        spaceName: space.space_name,
        phases: phaseRows,
      };
    });
  }, [
    currentProjectRun?.phases,
    customizationState.spaces,
    customizationState.spaceDecisions,
  ]);

  const openSpacesEditor = (spaceId?: string) => {
    setFocusSpaceId(spaceId ?? null);
    setShowSpacesWindow(true);
  };

  const step3Complete = useMemo(() => {
    if (!currentProjectRun) return false;
    return (
      filteredGeneralProjectDecisions.every((decision) =>
        Boolean(customizationState.generalProjectChoices[decision.id])
      ) &&
      customizationState.spaces.length > 0 &&
      customizationState.spaces.every((space) =>
        areSpaceRequiredDecisionsComplete(
          currentProjectRun,
          space.id,
          customizationState.spaceDecisions
        )
      )
    );
  }, [
    currentProjectRun,
    filteredGeneralProjectDecisions,
    customizationState.generalProjectChoices,
    customizationState.spaces,
    customizationState.spaceDecisions,
  ]);

  // Auto-advance step 3 → 4 when required decisions become complete (or step 3 has nothing left to answer).
  useEffect(() => {
    if (!open) {
      step3AutoAdvanceRef.current = { step: activeStep, complete: false };
      return;
    }

    const prev = step3AutoAdvanceRef.current;
    const shouldAdvanceFromCompletion =
      activeStep === 'step-3' &&
      step3Complete &&
      prev.step === 'step-3' &&
      !prev.complete;
    const shouldSkipEmptyStep3 =
      activeStep === 'step-3' &&
      step3Complete &&
      prev.step === 'step-2';

    step3AutoAdvanceRef.current = { step: activeStep, complete: step3Complete };

    if (!shouldAdvanceFromCompletion && !shouldSkipEmptyStep3) return;

    const timer = window.setTimeout(() => {
      if (activeStepRef.current === 'step-3') {
        setActiveStep('step-4');
      }
    }, 280);
    return () => window.clearTimeout(timer);
  }, [open, activeStep, step3Complete]);

  useEffect(() => {
    if (!open || !templateProject?.id) {
      setTemplateGeneralDecisions([]);
      return;
    }
    let cancelled = false;
    void supabase
      .from('projects')
      .select('scheduling_prerequisites')
      .eq('id', templateProject.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setTemplateGeneralDecisions(
          parseGeneralProjectDecisionsFromPrerequisites(data?.scheduling_prerequisites)
        );
      });
    return () => {
      cancelled = true;
    };
  }, [open, templateProject?.id]);

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
        if (spaces.length === 0 && currentProjectRun?.customization_decisions) {
          const savedData = currentProjectRun.customization_decisions as any;
          const savedSpaces = savedData.spaces || [];
          spaces = savedSpaces.length > 0 ? savedSpaces : [createDefaultSpace()];
        } else if (spaces.length === 0) {
          spaces = [createDefaultSpace()];
        }

        if (currentProjectRun?.customization_decisions) {
          const savedData = currentProjectRun.customization_decisions as any;
          setCustomizationState({
            spaces,
            spaceDecisions: savedData.spaceDecisions || {},
            standardDecisions: savedData.standardDecisions || {},
            ifNecessaryWork: savedData.ifNecessaryWork || {},
            generalProjectChoices: savedData.generalProjectChoices || {},
            customPlannedWork: savedData.customPlannedWork || [],
            customUnplannedWork: savedData.customUnplannedWork || [],
            workflowOrder: savedData.workflowOrder || []
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
        if (currentProjectRun?.customization_decisions) {
          const savedData = currentProjectRun.customization_decisions as any;
          const savedSpaces = savedData.spaces || [];
          const spaces = savedSpaces.length > 0 ? savedSpaces : [createDefaultSpace()];
          setCustomizationState({
            spaces,
            spaceDecisions: savedData.spaceDecisions || {},
            standardDecisions: savedData.standardDecisions || {},
            ifNecessaryWork: savedData.ifNecessaryWork || {},
            generalProjectChoices: savedData.generalProjectChoices || {},
            customPlannedWork: savedData.customPlannedWork || [],
            customUnplannedWork: savedData.customUnplannedWork || [],
            workflowOrder: savedData.workflowOrder || []
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

    try {
      
      // Create a deep copy of phases
      let newPhases = JSON.parse(JSON.stringify(currentProjectRun.phases || []));

      // Apply standard decisions and if-necessary work filtering
      newPhases = newPhases.map(phase => {
        const standardChoices = customizationState.standardDecisions[phase.id] || [];
        const ifNecessaryChoices = customizationState.ifNecessaryWork[phase.id] || [];

        // Extract selected operation IDs from "groupKey:operationId" format
        const selectedOpIds = new Set(standardChoices.map(choice => {
          const parts = choice.split(':');
          return parts.length > 1 ? parts[1] : choice;
        }));

        // Filter operations based on flowType
        const filteredOperations = phase.operations.filter(op => {
          const flowType = (op as any).flowType || 'prime';
          
          // Always keep prime operations
          if (flowType === 'prime') return true;
          
          // For alternate operations, only keep selected ones
          if (flowType === 'alternate') {
            const isSelected = selectedOpIds.has(op.id);
            return isSelected;
          }
          
          // For if-necessary operations, only keep selected ones
          if (flowType === 'if-necessary') {
            const isSelected = ifNecessaryChoices.includes(op.id);
            return isSelected;
          }
          
          return true;
        });
        
        return {
          ...phase,
          operations: filteredOperations
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

      // Update the project run with filtered phases and saved decisions
      const updatedProjectRun = {
        ...currentProjectRun,
        phases: orderedPhases,
        customization_decisions: customizationState,
        updatedAt: new Date()
      };

      await updateProjectRun(updatedProjectRun);
      
      // Dispatch refresh event for workflow navigation
      window.dispatchEvent(new CustomEvent('project-customizer-updated', {
        detail: { projectRunId: currentProjectRun.id }
      }));
      
            
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving customization:', error);
      toast({
        title: "Error",
        description: "Failed to save customization",
        variant: "destructive"
      });
    }
  };

  const getModeTitle = () => {
    return 'Project Customizer';
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
          ? 'bg-green-600 text-white'
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
        planningToolSaveLabel="Save & Apply"
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
              <AccordionItem value="step-1" className="overflow-hidden rounded-xl border bg-card shadow-sm">
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
                          className="h-9 bg-green-600 px-3 text-xs text-white hover:bg-green-700"
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

              <AccordionItem value="step-2" className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <AccordionTrigger className="px-4 py-4 hover:no-underline md:px-5">
                  <StepHeading
                    step={2}
                    title="Select / Edit Project Spaces"
                    description="Pick which rooms are in play"
                    complete={step2Complete}
                  />
                </AccordionTrigger>
                <AccordionContent className="border-t bg-muted/10 px-4 pb-4 pt-4 md:px-5">
                  <Card className="bg-blue-50 border-blue-200">
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
                              className="bg-green-600 text-xs text-white hover:bg-green-700"
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

              <AccordionItem value="step-3" className="overflow-hidden rounded-xl border bg-card shadow-sm">
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
                              isAnswered ? 'rounded-lg border border-green-300 bg-green-50/40 px-3 pt-3' : ''
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {isAnswered ? (
                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden />
                              ) : (
                                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" aria-hidden />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  <Label className="text-sm font-medium">{decision.label}</Label>
                                  {isAnswered ? (
                                    <Badge variant="secondary" className="bg-green-100 text-xs text-green-800">
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
                    projectRun={currentProjectRun}
                    spaceDecisions={customizationState.spaceDecisions}
                    onSpaceDecision={handleSpaceDecision}
                    onEditSpace={(spaceId) => openSpacesEditor(spaceId)}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step-4" className="overflow-hidden rounded-xl border bg-card shadow-sm">
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
                      <CardContent className="space-y-5">
                        {builtInWorkBySpace.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Add spaces in step 2 to see the project work list.
                          </p>
                        ) : (
                          builtInWorkBySpace.map((spaceRow) => (
                            <div key={spaceRow.spaceId} className="space-y-3">
                              <h4 className="text-sm font-semibold text-foreground">
                                {spaceRow.spaceName}
                              </h4>
                              {spaceRow.phases.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                  No operations listed for this space yet.
                                </p>
                              ) : (
                                spaceRow.phases.map((phaseRow) => (
                                  <div
                                    key={`${spaceRow.spaceId}-${phaseRow.phaseId}`}
                                    className="rounded-lg border bg-background/80 p-3"
                                  >
                                    <div className="mb-2 text-sm font-medium">
                                      {phaseRow.phaseName}
                                    </div>
                                    <ul className="space-y-2">
                                      {phaseRow.operations.map((op) => (
                                        <li
                                          key={op.id}
                                          className="flex items-start justify-between gap-3 text-sm"
                                        >
                                          <div className="min-w-0">
                                            <div className="font-medium leading-snug">
                                              {op.name}
                                            </div>
                                            {op.description && op.kind !== 'pending' ? (
                                              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                                                {op.description}
                                              </p>
                                            ) : null}
                                          </div>
                                          <Badge
                                            variant="secondary"
                                            className={
                                              op.kind === 'choice'
                                                ? 'shrink-0 bg-green-100 text-green-800'
                                                : op.kind === 'optional'
                                                  ? 'shrink-0 bg-blue-100 text-blue-800'
                                                  : op.kind === 'pending'
                                                    ? 'shrink-0 bg-orange-100 text-orange-800'
                                                    : 'shrink-0'
                                            }
                                          >
                                            {op.kind === 'choice'
                                              ? 'Your choice'
                                              : op.kind === 'optional'
                                                ? 'Optional'
                                                : op.kind === 'pending'
                                                  ? 'Needs choice'
                                                  : 'Included'}
                                          </Badge>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))
                              )}
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void handleSaveCustomization()}
                        className="bg-green-600 text-xs text-white hover:bg-green-700"
                      >
                        Continue with No Custom Work
                      </Button>
                    </div>
                    <Card>
                      <CardHeader className={isMobile ? 'pb-3' : ''}>
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                          <GitBranch className="h-4 w-4" />
                          Add Workflow Steps
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          Pull in related phases when this job needs more than the base plan.
                        </p>
                        <Button
                          onClick={() => setShowPhaseBrowser(true)}
                          variant="outline"
                          size={isMobile ? "default" : "sm"}
                          className="w-full sm:w-auto"
                        >
                          Browse Related Project Phases
                        </Button>
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
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800 self-start sm:self-center">
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