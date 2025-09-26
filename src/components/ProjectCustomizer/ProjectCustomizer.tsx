import React, { useState, useEffect } from 'react';
import { ScrollableDialog } from '../ScrollableDialog';
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
      case 'initial-plan': return 'Project Work Scope';
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
      <ScrollableDialog 
        open={open} 
        onOpenChange={onOpenChange}
        title={getModeTitle()}
        description={getModeDescription()}
      >
        <div className="flex flex-col flex-1 overflow-hidden min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 h-full">
            {/* Tab Headers - Fixed */}
            <div className="shrink-0 border-b">
              <TabsList className="grid w-full grid-cols-3 h-12">
                <TabsTrigger value="decisions" className="text-xs md:text-sm px-2 py-3">
                  <Settings className="w-4 h-4 mr-2" />
                  Workflow Decisions
                </TabsTrigger>
                <TabsTrigger value="custom-planned" className="text-xs md:text-sm px-2 py-3">
                  <GitBranch className="w-4 h-4 mr-2" />
                  Add Planned Work
                </TabsTrigger>
                <TabsTrigger value="custom-unplanned" className="text-xs md:text-sm px-2 py-3">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Novel Work
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content - Scrollable */}
            <TabsContent value="decisions" className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              <WorkflowDecisionEngine
                projectRun={currentProjectRun}
                onStandardDecision={handleStandardDecision}
                onIfNecessaryWork={handleIfNecessaryWork}
                customizationState={{
                  standardDecisions: customizationState.standardDecisions,
                  ifNecessaryWork: customizationState.ifNecessaryWork
                }}
              />
            </TabsContent>

            <TabsContent value="custom-planned" className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GitBranch className="w-5 h-5" />
                      Add Conventional Work
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Browse phases from related projects and add them to your workflow.
                    </p>
                    <Button onClick={() => setShowPhaseBrowser(true)} variant="outline" size="sm">
                      Browse Related Project Phases
                    </Button>
                  </CardContent>
                </Card>

                {customizationState.customPlannedWork.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Added Planned Work</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {customizationState.customPlannedWork.map((phase, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <h4 className="font-medium">{phase.name}</h4>
                            <p className="text-sm text-muted-foreground">{phase.description}</p>
                          </div>
                          <Badge variant="secondary">Planned</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="custom-unplanned" className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              <div className="space-y-4">
                <Card className="border-orange-200 bg-orange-50/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-800">
                      <AlertTriangle className="w-5 h-5" />
                      Add Novel Work
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-orange-700 mb-4">
                      Create completely new work that's not in our standard project library. 
                      Use with caution - this may affect project timeline and safety.
                    </p>
                    <Button onClick={() => setShowCustomWorkManager(true)} variant="outline" size="sm">
                      Create Custom Work
                    </Button>
                  </CardContent>
                </Card>

                {customizationState.customUnplannedWork.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Added Novel Work</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {customizationState.customUnplannedWork.map((phase, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <h4 className="font-medium">{phase.name}</h4>
                            <p className="text-sm text-muted-foreground">{phase.description}</p>
                          </div>
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                            Novel
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Footer with action buttons - Fixed */}
          <div className="shrink-0 border-t p-4 flex justify-between items-center bg-muted/30">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {mode === 'initial-plan' ? 'Planning Phase' : 
                 mode === 'final-plan' ? 'Final Review' : 
                 mode === 'unplanned-work' ? 'Adding New Work' : 'Re-planning'}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} size="sm">
                Cancel
              </Button>
              <Button onClick={handleSaveCustomization} size="sm">
                Apply Changes
              </Button>
            </div>
          </div>
        </div>
      </ScrollableDialog>

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