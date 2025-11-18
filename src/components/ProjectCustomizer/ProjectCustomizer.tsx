import React, { useState, useEffect } from 'react';
import { ResponsiveDialog } from '../ResponsiveDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { WorkflowDecisionEngine } from './WorkflowDecisionEngine';
import { SimplifiedCustomWorkManager } from './SimplifiedCustomWorkManager';
import { PhaseBrowser } from './PhaseBrowser';
import { SpaceSelector } from './SpaceSelector';
import { SpaceDecisionFlow } from './SpaceDecisionFlow';
import { ProjectRun } from '../../interfaces/ProjectRun';
import { Project, Phase } from '../../interfaces/Project';
import { useProject } from '../../contexts/ProjectContext';
import { Settings, GitBranch, Plus, Clock, AlertTriangle, Home, Edit2 } from 'lucide-react';
import { useIsMobile } from '../../hooks/use-mobile';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { KickoffWorkflow } from '../KickoffWorkflow';

interface ProjectCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProjectRun?: ProjectRun;
  mode?: 'initial-plan' | 'final-plan' | 'unplanned-work' | 'replan';
}

interface ProjectSpace {
  id: string;
  name: string;
  spaceType: string;
  homeSpaceId?: string;
  scaleValue?: number;
  scaleUnit?: string;
  isFromHome: boolean;
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
  customPlannedWork: Phase[]; // phases added from other projects
  customUnplannedWork: Phase[]; // novel phases created by user
  workflowOrder: string[]; // ordered phase ids
}

export const ProjectCustomizer: React.FC<ProjectCustomizerProps> = ({
  open,
  onOpenChange,
  currentProjectRun,
  mode = 'initial-plan'
}) => {
  const { projects, updateProjectRun } = useProject();
  const [activeTab, setActiveTab] = useState(mode === 'unplanned-work' ? 'custom-work' : 'decisions');
  const [customizationState, setCustomizationState] = useState<CustomizationState>({
    spaces: [],
    spaceDecisions: {},
    standardDecisions: {},
    ifNecessaryWork: {},
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

  // Helper function to create default "Space 1" placeholder
  const createDefaultSpace = (): ProjectSpace => ({
    id: 'default-space-1',
    name: 'Space 1',
    spaceType: 'general',
    isFromHome: false
  });

  // Load customization decisions from database on mount
  useEffect(() => {
    if (!open) return;
    
    if (currentProjectRun?.customization_decisions) {
      const savedData = currentProjectRun.customization_decisions as any;
      const savedSpaces = savedData.spaces || [];
      
      // If no spaces are saved, initialize with default "Space 1"
      const spaces = savedSpaces.length > 0 ? savedSpaces : [createDefaultSpace()];
      
      setCustomizationState({
        spaces,
        spaceDecisions: savedData.spaceDecisions || {},
        standardDecisions: savedData.standardDecisions || {},
        ifNecessaryWork: savedData.ifNecessaryWork || {},
        customPlannedWork: savedData.customPlannedWork || [],
        customUnplannedWork: savedData.customUnplannedWork || [],
        workflowOrder: savedData.workflowOrder || []
      });
    } else {
      // No saved customization decisions - initialize with default "Space 1"
      setCustomizationState(prev => ({
        ...prev,
        spaces: [createDefaultSpace()]
      }));
    }
  }, [open, currentProjectRun]);

  // Load home name
  useEffect(() => {
    if (open && currentProjectRun?.home_id) {
      fetchHomeName();
    }
  }, [open, currentProjectRun?.home_id]);

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
      
      toast({
        title: "Success", 
        description: `Project customization saved. Workflow now has ${orderedPhases.length} phases.`
      });
      
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

  return (
    <>
      <ResponsiveDialog 
        open={open} 
        onOpenChange={onOpenChange}
        title={getModeTitle()}
        description={getModeDescription()}
        size={isMobile ? "content-full" : "large"}
      >
        <div className="flex flex-col h-full px-4 pb-4">
          {/* Home Selection Display */}
          {homeName && currentProjectRun?.home_id && (
            <div className="mb-3 py-2 px-3 bg-muted/50 rounded-lg border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Project Home:</span>
                <Badge variant="outline" className="text-xs">{homeName}</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowKickoffEdit(true)}
                className="h-6 w-6 p-0"
                title="Change home"
              >
                <Edit2 className="w-3 h-3" />
              </Button>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            {/* Tab Headers - Positioned directly after header */}
            <div className="shrink-0 border-b bg-background pb-4">
              <TabsList className={`grid w-full ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} ${isMobile ? 'h-auto' : 'h-12'}`}>
                {isMobile ? (
                  // Mobile: Dropdown-style tab selection
                  <div className="space-y-2 p-2">
                    <Button
                      variant={activeTab === 'decisions' ? 'default' : 'outline'}
                      onClick={() => setActiveTab('decisions')}
                      className="w-full justify-start text-sm py-3"
                      size="sm"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Project Choices
                    </Button>
                    <Button
                      variant={activeTab === 'custom-work' ? 'default' : 'outline'}
                      onClick={() => setActiveTab('custom-work')}
                      className="w-full justify-start text-sm py-3"
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Custom Work
                    </Button>
                  </div>
                ) : (
                  // Desktop: Traditional tabs
                  <>
                    <TabsTrigger value="decisions" className="text-xs md:text-sm px-2 py-2">
                      <Settings className="w-4 h-4 mr-2" />
                      Project Choices
                    </TabsTrigger>
                    <TabsTrigger value="custom-work" className="text-xs md:text-sm px-2 py-2">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Custom Work
                    </TabsTrigger>
                  </>
                )}
              </TabsList>
            </div>

            {/* Tab Content - Consistent height containers */}
            <div className="flex-1 min-h-0 relative">
              <TabsContent value="decisions" className="absolute inset-0 data-[state=active]:block data-[state=inactive]:hidden">
                <ScrollArea className="h-full">
                  <div className={`${isMobile ? 'p-3' : 'p-4'} space-y-4`}>
                    {/* Project Spaces Button */}
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm mb-1">Project Spaces</h4>
                            <p className="text-xs text-muted-foreground mb-3">
                              Use this when the project will have unique spaces or rooms
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

                    <SpaceDecisionFlow
                      spaces={customizationState.spaces}
                      projectRun={currentProjectRun}
                      spaceDecisions={customizationState.spaceDecisions}
                      onSpaceDecision={handleSpaceDecision}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="custom-work" className="absolute inset-0 data-[state=active]:block data-[state=inactive]:hidden">
              <ScrollArea className="h-full">
                <div className={`${isMobile ? 'p-3' : 'p-4'} space-y-4`}>
                  {/* Planned Work Section */}
                  <Card>
                    <CardHeader className={isMobile ? 'pb-3' : ''}>
                      <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
                        <GitBranch className="w-5 h-5" />
                        Add Workflow Steps
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className={`text-muted-foreground mb-4 ${isMobile ? 'text-sm' : 'text-sm'}`}>
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

                  {/* Added Planned Work */}
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

                  {/* Added Novel Work */}
                  {customizationState.customUnplannedWork.length > 0 && (
                    <Card>
                      <CardHeader className={isMobile ? 'pb-3' : ''}>
                        <CardTitle className={isMobile ? 'text-base' : ''}>Added Novel Work</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {customizationState.customUnplannedWork.map((phase, index) => (
                          <div key={index} className={`flex flex-col sm:flex-row sm:items-center justify-between ${isMobile ? 'p-4' : 'p-3'} bg-muted rounded-lg gap-3`}>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm">{phase.name}</h4>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{phase.description}</p>
                            </div>
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800 self-start sm:self-center">
                              Novel
                            </Badge>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            </div>
          </Tabs>

          {/* Footer with action buttons - Mobile optimized */}
          <div className={`shrink-0 border-t ${isMobile ? 'p-3' : 'p-4'} bg-muted/30`}>
            <div className={`flex ${isMobile ? 'flex-col' : 'justify-between items-center'} gap-3`}>
              <div className={`flex items-center gap-2 ${isMobile ? 'justify-center' : ''}`}>
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {mode === 'initial-plan' ? 'Planning Phase' : 
                   mode === 'final-plan' ? 'Final Review' : 
                   mode === 'unplanned-work' ? 'Adding New Work' : 'Re-planning'}
                </span>
              </div>
              <div className={`flex gap-3 ${isMobile ? 'w-full' : ''}`}>
                <Button 
                  variant="outline" 
                  onClick={() => onOpenChange(false)} 
                  size="sm"
                  className={isMobile ? 'flex-1' : ''}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveCustomization} 
                  size="sm"
                  className={isMobile ? 'flex-1' : ''}
                >
                  Apply Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ResponsiveDialog>

      <PhaseBrowser
        open={showPhaseBrowser}
        onOpenChange={setShowPhaseBrowser}
        availableProjects={projects}
        onSelectPhases={handleAddCustomPlannedWork}
        currentProjectId={currentProjectRun.templateId}
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
              projectScaleUnit="square foot"
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
    </>
  );
};