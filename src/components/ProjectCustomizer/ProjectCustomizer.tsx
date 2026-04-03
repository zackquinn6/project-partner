import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveDialog } from '../ResponsiveDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { SimplifiedCustomWorkManager } from './SimplifiedCustomWorkManager';
import { PhaseBrowser } from './PhaseBrowser';
import { SpaceSelector } from './SpaceSelector';
import { SpaceDecisionFlow } from './SpaceDecisionFlow';
import { ProjectRun } from '../../interfaces/ProjectRun';
import { Phase } from '../../interfaces/Project';
import { useProject } from '../../contexts/ProjectContext';
import { Settings, GitBranch, Home, Edit2 } from 'lucide-react';
import { useIsMobile } from '../../hooks/use-mobile';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { KickoffWorkflow } from '../KickoffWorkflow';
import { HomeManager } from '../HomeManager';
import { useAuth } from '../../contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { PLANNING_TOOL_WINDOW_CONTENT_PADDING_CLASSNAME } from '../PlanningWizardSteps/planningToolWindowChrome';
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

  // Helper function to format scaling unit for display
  const getScalingUnitDisplay = () => {
    // Standard scaling units (handle both old singular and new plural forms for backward compatibility)
    if (scalingUnit === 'per square feet' || scalingUnit === 'per square foot') return 'sq ft';
    if (scalingUnit === 'per 10x10 room') return 'rooms';
    if (scalingUnit === 'per linear feet' || scalingUnit === 'per linear foot') return 'linear ft';
    if (scalingUnit === 'per cubic yard') return 'cu yd';
    
    // For "per item", check if there's a custom item_type
    if (scalingUnit === 'per item') {
      if (itemType) return itemType.toLowerCase();
      return 'items';
    }
    
    // If scalingUnit is a custom value (not one of the standard ones), use it directly
    return scalingUnit;
  };

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
          .order('priority', { ascending: true, nullsLast: true });

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

          } catch (error) {
      console.error('Error updating home:', error);
      toast({
        title: "Error",
        description: "Failed to update home",
        variant: "destructive"
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
      console.log('💾 Saving customization decisions:', customizationState);
      
      // Create a deep copy of phases
      let newPhases = JSON.parse(JSON.stringify(currentProjectRun.phases || []));

      // Apply standard decisions and if-necessary work filtering
      newPhases = newPhases.map(phase => {
        const standardChoices = customizationState.standardDecisions[phase.id] || [];
        const ifNecessaryChoices = customizationState.ifNecessaryWork[phase.id] || [];

        console.log(`Processing phase ${phase.name}:`, { standardChoices, ifNecessaryChoices });

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
            console.log(`Operation ${op.name} (${op.id}) is alternate, selected:`, isSelected);
            return isSelected;
          }
          
          // For if-necessary operations, only keep selected ones
          if (flowType === 'if-necessary') {
            const isSelected = ifNecessaryChoices.includes(op.id);
            console.log(`Operation ${op.name} (${op.id}) is if-necessary, selected:`, isSelected);
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

      console.log(`✅ Filtered workflow from ${currentProjectRun.phases.length} to ${orderedPhases.length} phases`);

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
      case 'initial-plan': return 'Define project size and customize for unique rooms and spaces.';
      case 'final-plan': return 'Review and finalize all project decisions before starting execution.';
      case 'unplanned-work': return 'Add new work that wasn\'t in the original plan.';
      case 'replan': return 'Modify your project plan and add or remove work as needed.';
      default: return 'Define project size and customize for unique rooms and spaces.';
    }
  };

  if (!currentProjectRun) {
    return null;
  }

  const StepCircle = ({ step }: { step: number }) => (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
      {step}
    </div>
  );

  const StepHeading = ({
    step,
    title,
    description,
  }: {
    step: number;
    title: string;
    description: string;
  }) => (
    <div className="flex items-start gap-3 text-left">
      <StepCircle step={step} />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground md:text-base">{title}</div>
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
          {/* Project Sizing Estimate Header */}
          {currentProjectRun?.initial_sizing && (
            <div className={cn('pb-2 pt-4 md:pt-5', PLANNING_TOOL_WINDOW_CONTENT_PADDING_CLASSNAME)}>
              <div className="rounded-lg border border-primary/20 bg-primary/10 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Project Size Estimate</div>
                    <div className="text-xl font-bold text-primary">
                      {currentProjectRun.initial_sizing} {getScalingUnitDisplay()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                    description="Choose the home this project belongs to before customizing spaces and work."
                  />
                </AccordionTrigger>
                <AccordionContent className="border-t bg-muted/10 px-4 pb-4 pt-4 md:px-5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Project Home</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowHomeManager(true)}
                        className="h-7 px-2 text-xs"
                        title="Manage homes"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Manage
                      </Button>
                    </div>
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
                      <Badge variant="outline" className="text-xs">{homeName || 'Unknown Home'}</Badge>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step-2" className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <AccordionTrigger className="px-4 py-4 hover:no-underline md:px-5">
                  <StepHeading
                    step={2}
                    title="Select / Edit Project Spaces"
                    description="Define the spaces that are part of this project so the workflow can be customized correctly."
                  />
                </AccordionTrigger>
                <AccordionContent className="border-t bg-muted/10 px-4 pb-4 pt-4 md:px-5">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm mb-1">Project Spaces</h4>
                          <p className="text-xs text-muted-foreground mb-3">
                            Use this when the project will have unique spaces or rooms.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowSpacesWindow(true)}
                            className="text-xs"
                          >
                            <Settings className="w-3 h-3 mr-2" />
                            Manage Project Spaces
                          </Button>
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
                    description="Review each selected space and choose the workflow options that apply to it."
                  />
                </AccordionTrigger>
                <AccordionContent className="border-t bg-muted/10 px-4 pb-4 pt-4 md:px-5">
                  {filteredGeneralProjectDecisions.length > 0 ? (
                    <Card className="mb-6 border-primary/20">
                      <CardHeader className={isMobile ? 'pb-3' : ''}>
                        <CardTitle className={isMobile ? 'text-base' : ''}>Project choices</CardTitle>
                        <CardDescription className="text-xs">
                          General options for this project. They work together with phase and alternate
                          decisions below.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        {filteredGeneralProjectDecisions.map((decision) => (
                          <div
                            key={decision.id}
                            className="space-y-2 border-b border-border/60 pb-4 last:border-0 last:pb-0"
                          >
                            <Label className="text-sm font-medium">{decision.label}</Label>
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
                        ))}
                      </CardContent>
                    </Card>
                  ) : null}
                  <SpaceDecisionFlow
                    spaces={customizationState.spaces}
                    projectRun={currentProjectRun}
                    spaceDecisions={customizationState.spaceDecisions}
                    onSpaceDecision={handleSpaceDecision}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step-4" className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <AccordionTrigger className="px-4 py-4 hover:no-underline md:px-5">
                  <StepHeading
                    step={4}
                    title="Add Custom Work"
                    description="Append related workflow steps or fully custom work after the main project decisions are set."
                  />
                </AccordionTrigger>
                <AccordionContent className="border-t bg-muted/10 px-4 pb-4 pt-4 md:px-5">
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className={isMobile ? 'pb-3' : ''}>
                        <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
                          <GitBranch className="w-5 h-5" />
                          Add Workflow Steps
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          Browse phases from related projects and add them to your workflow.
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
                          <CardTitle className={isMobile ? 'text-base' : ''}>Added Planned Work</CardTitle>
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
                          <CardTitle className={isMobile ? 'text-base' : ''}>Added Custom Work</CardTitle>
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
      <Dialog open={showSpacesWindow} onOpenChange={setShowSpacesWindow}>
        <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
          <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-lg md:text-xl font-bold">Project Spaces</DialogTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowSpacesWindow(false)} 
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