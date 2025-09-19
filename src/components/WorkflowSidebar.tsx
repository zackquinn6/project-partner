import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, EyeOff } from "lucide-react";
import { getStepIndicator, FlowTypeLegend } from './FlowTypeLegend';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";

interface WorkflowSidebarProps {
  allSteps: any[];
  currentStep: any;
  currentStepIndex: number;
  completedSteps: Set<string>;
  progress: number;
  groupedSteps: any;
  isKickoffComplete: boolean;
  onStepClick: (stepIndex: number, step: any) => void;
  onHelpClick: () => void;
  onUnplannedWorkClick: () => void;
  onKeysToSuccessClick: () => void;
}

export function WorkflowSidebar({
  allSteps,
  currentStep,
  currentStepIndex,
  completedSteps,
  progress,
  groupedSteps,
  isKickoffComplete,
  onStepClick,
  onHelpClick,
  onUnplannedWorkClick,
  onKeysToSuccessClick
}: WorkflowSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [showStepTypesInfo, setShowStepTypesInfo] = useState(false);

  return (
    <Sidebar collapsible="icon">
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workflow Progress</SidebarGroupLabel>
          <SidebarGroupContent>
            {!collapsed && (
              <div className="space-y-4 p-2">
                {/* Progress Header */}
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Step {currentStepIndex + 1} of {allSteps.length}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col items-center space-y-2">
                  <Button 
                    onClick={onHelpClick}
                    variant="outline"
                    size="sm"
                    className="px-3 py-1 text-xs bg-blue-900/20 hover:bg-blue-900/30 text-blue-800 hover:text-blue-900 border-blue-900/30 w-fit"
                  >
                    <div className="text-center">
                      <div>Expert Virtual Consults</div>
                      <div className="text-[10px] opacity-75">Get Expert Help</div>
                    </div>
                  </Button>
                  
                  <Button 
                    onClick={onKeysToSuccessClick}
                    variant="outline"
                    size="sm"
                    className="px-3 py-1 text-xs bg-green-900/20 hover:bg-green-900/30 text-green-800 hover:text-green-900 border-green-900/30 w-fit"
                  >
                    <div className="text-center">
                      <div>🔑 Keys to Success</div>
                      <div className="text-[10px] opacity-75">Critical characteristics</div>
                    </div>
                  </Button>
                  
                  {isKickoffComplete && (
                    <Button 
                      onClick={onUnplannedWorkClick}
                      variant="outline"
                      size="sm"
                      className="px-3 py-1 text-xs bg-red-900/20 hover:bg-red-900/30 text-red-800 hover:text-red-900 border-red-900/30 w-fit"
                    >
                      <div className="text-center">
                        <div>❗ Call an audible</div>
                        <div className="text-[10px] opacity-75">Update project plan</div>
                      </div>
                    </Button>
                  )}

                </div>

                {/* Step Navigation */}
                <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                  {Object.entries(groupedSteps).map(([phase, operations]) => (
                    <div key={phase} className="space-y-2">
                      <h4 className="font-semibold text-primary text-sm">{phase}</h4>
                      {Object.entries(operations as any).map(([operation, opSteps]) => (
                        <div key={operation} className="ml-2 space-y-1">
                          <h5 className="text-xs font-medium text-muted-foreground">{operation}</h5>
                          {(opSteps as any[]).map(step => {
                            const stepIndex = allSteps.findIndex(s => s.id === step.id);
                            return (
                              <div 
                                key={step.id} 
                                className={`ml-2 p-2 rounded text-xs cursor-pointer transition-fast border ${
                                  step.id === currentStep?.id ? 'bg-primary/10 text-primary border-primary/20' : 
                                  completedSteps.has(step.id) ? 'bg-green-50 text-green-700 border-green-200' : 
                                  'hover:bg-muted/50 border-transparent hover:border-muted-foreground/20'
                                }`} 
                                onClick={() => {
                                  if (stepIndex >= 0 && isKickoffComplete) {
                                    onStepClick(stepIndex, step);
                                  }
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  {getStepIndicator(step.flowType)}
                                  {completedSteps.has(step.id) && <CheckCircle className="w-3 h-3" />}
                                  <span className="truncate">{step.step}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Step Types Button - Moved to Bottom */}
                <div className="mt-4 pt-4 border-t border-border">
                  <Button 
                    variant="outline"
                    onClick={() => setShowStepTypesInfo(true)}
                    className="w-full py-2 px-4 text-sm"
                  >
                    Step Types
                  </Button>
                </div>
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Step Types Info Dialog */}
      <Dialog open={showStepTypesInfo} onOpenChange={setShowStepTypesInfo}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Workflow Step Types</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <FlowTypeLegend compact={false} showDescriptions={true} />
          </div>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}