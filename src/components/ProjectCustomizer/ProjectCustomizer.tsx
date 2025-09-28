import React, { useState, useEffect } from 'react';
import { ResponsiveDialog } from '../ResponsiveDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { WorkflowDecisionEngine } from './WorkflowDecisionEngine';
import { CustomWorkManager } from './CustomWorkManager';
import { PhaseBrowser } from './PhaseBrowser';
import { ProjectRun } from '../../interfaces/ProjectRun';
import { Project, Phase } from '../../interfaces/Project';
import { useProject } from '../../contexts/ProjectContext';
import { Settings, GitBranch, Plus, Clock, AlertTriangle } from 'lucide-react';
import { useIsMobile } from '../../hooks/use-mobile';

interface ProjectCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProjectRun?: ProjectRun;
  mode?: 'initial-plan' | 'final-plan' | 'unplanned-work' | 'replan';
}

interface CustomizationState {
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
  const [activeTab, setActiveTab] = useState('decisions');
  const [customizationState, setCustomizationState] = useState<CustomizationState>({
    standardDecisions: {},
    ifNecessaryWork: {},
    customPlannedWork: [],
    customUnplannedWork: [],
    workflowOrder: []
  });
  const isMobile = useIsMobile();

  const [showPhaseBrowser, setShowPhaseBrowser] = useState(false);
  const [showCustomWorkManager, setShowCustomWorkManager] = useState(false);

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
      // Apply customizations to project run phases
      let newPhases = [...(currentProjectRun.phases || [])];

      // Apply standard decisions and if-necessary work
      newPhases = newPhases.map(phase => {
        const standardChoices = customizationState.standardDecisions[phase.id] || [];
        const ifNecessaryChoices = customizationState.ifNecessaryWork[phase.id] || [];

        // Apply operation filtering based on choices
        let modifiedOperations = [...phase.operations];
        
        // Filter operations based on standard decisions
        if (standardChoices.length > 0) {
          modifiedOperations = modifiedOperations.filter(op => 
            standardChoices.some(choice => op.name.toLowerCase().includes(choice.toLowerCase()))
          );
        }
        
        // Add if-necessary operations
        // This would need more complex logic based on your operation structure
        
        return {
          ...phase,
          operations: modifiedOperations
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

      // Update the project run
      const updatedProjectRun = {
        ...currentProjectRun,
        phases: orderedPhases,
        updatedAt: new Date()
      };

      await updateProjectRun(updatedProjectRun);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving customization:', error);
    }
  };

  const getModeTitle = () => {
    switch (mode) {
      case 'initial-plan': return 'Project Customizer';
      case 'final-plan': return 'Finalize Project Plan';
      case 'unplanned-work': return 'Add New Work';
      case 'replan': return 'Re-plan Project';
      default: return 'Project Customizer';
    }
  };

  const getModeDescription = () => {
    switch (mode) {
      case 'initial-plan': return 'Define your project scope and customize the workflow to match your specific needs.';
      case 'final-plan': return 'Review and finalize all project decisions before starting execution.';
      case 'unplanned-work': return 'Add new work that wasn\'t in the original plan.';
      case 'replan': return 'Modify your project plan and add or remove work as needed.';
      default: return 'Customize your project workflow with decision points and additional work.';
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            {/* Tab Headers - Positioned directly after header */}
            <div className="shrink-0 border-b bg-background">
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
                      Workflow Decisions
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
                    <TabsTrigger value="decisions" className="text-xs md:text-sm px-2 py-3">
                      <Settings className="w-4 h-4 mr-2" />
                      Workflow Decisions
                    </TabsTrigger>
                    <TabsTrigger value="custom-work" className="text-xs md:text-sm px-2 py-3">
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
                    <WorkflowDecisionEngine
                      projectRun={currentProjectRun}
                      onStandardDecision={handleStandardDecision}
                      onIfNecessaryWork={handleIfNecessaryWork}
                      customizationState={{
                        standardDecisions: customizationState.standardDecisions,
                        ifNecessaryWork: customizationState.ifNecessaryWork
                      }}
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
                        Add Conventional Work
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

                  {/* Novel Work Section */}
                  <Card className="border-orange-200 bg-orange-50/50">
                    <CardHeader className={isMobile ? 'pb-3' : ''}>
                      <CardTitle className={`flex items-center gap-2 text-orange-800 ${isMobile ? 'text-base' : ''}`}>
                        <AlertTriangle className="w-5 h-5" />
                        Add Novel Work
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className={`text-orange-700 mb-4 ${isMobile ? 'text-sm' : 'text-sm'}`}>
                        Create completely new work that's not in our standard project library. 
                        Use with caution - this may affect project timeline and safety.
                      </p>
                      <Button 
                        onClick={() => setShowCustomWorkManager(true)} 
                        variant="outline" 
                        size={isMobile ? "default" : "sm"}
                        className="w-full sm:w-auto"
                      >
                        Create Custom Work
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
      />

      <CustomWorkManager
        open={showCustomWorkManager}
        onOpenChange={setShowCustomWorkManager}
        onCreateCustomWork={handleAddCustomUnplannedWork}
      />
    </>
  );
};