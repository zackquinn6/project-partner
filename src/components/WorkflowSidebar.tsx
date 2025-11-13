import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, EyeOff, MessageCircle, Key, Settings, Layers, Sparkles } from "lucide-react";
import { getStepIndicator, FlowTypeLegend } from './FlowTypeLegend';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
interface WorkflowSidebarProps {
  allSteps: any[];
  currentStep: any;
  currentStepIndex: number;
  completedSteps: Set<string>;
  progress: number;
  groupedSteps: any;
  isKickoffComplete: boolean;
  instructionLevel: 'quick' | 'detailed' | 'new_user';
  projectName: string;
  onInstructionLevelChange: (level: 'quick' | 'detailed' | 'new_user') => void;
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
  instructionLevel,
  projectName,
  onInstructionLevelChange,
  onStepClick,
  onHelpClick,
  onUnplannedWorkClick,
  onKeysToSuccessClick
}: WorkflowSidebarProps) {
  const {
    state
  } = useSidebar();
  const collapsed = state === "collapsed";
  const [showStepTypesInfo, setShowStepTypesInfo] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  return <Sidebar collapsible="icon">
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-sm font-semibold">{projectName || 'Project Progress'}</SidebarGroupLabel>
          <SidebarGroupContent>
            {!collapsed && <div className="space-y-4 p-2">
                {/* Progress Header */}
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">
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

                {/* Instruction Detail Level */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-primary">Detail Level</h3>
                  </div>
                  <Select value={instructionLevel} onValueChange={onInstructionLevelChange}>
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue>
                        {instructionLevel === 'new_user' && 'New DIY'}
                        {instructionLevel === 'detailed' && 'Mid-level DIY'}
                        {instructionLevel === 'quick' && 'Advanced DIY'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new_user" className="text-xs">New DIY: Extra guidance</SelectItem>
                      <SelectItem value="detailed" className="text-xs">Mid-level DIY — Step-by-step</SelectItem>
                      <SelectItem value="quick" className="text-xs">Advanced DIY: Quick content</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* DIY Tools Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-primary">DIY Tools</h3>
                  <div className="flex gap-2">
                    <Button onClick={() => setShowComingSoon(true)} variant="outline" size="sm" className="flex-1 h-12 flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-150 border-blue-200 hover:border-blue-300 transition-all shadow-sm hover:shadow-md text-blue-800 hover:text-blue-900 rounded-lg">
                      <MessageCircle className="w-4 h-4" />
                      <div className="text-[10px] font-semibold">Chat</div>
                    </Button>
                    
                    <Button onClick={onKeysToSuccessClick} variant="outline" size="sm" className="flex-1 h-12 flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-150 border-green-200 hover:border-green-300 transition-all shadow-sm hover:shadow-md text-green-800 hover:text-green-900 rounded-lg">
                      <Key className="w-4 h-4" />
                      <div className="text-[10px] font-semibold">KeyInfo</div>
                    </Button>
                    
                    {isKickoffComplete && <Button onClick={onUnplannedWorkClick} variant="outline" size="sm" className="flex-1 h-12 flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-150 border-orange-200 hover:border-orange-300 transition-all shadow-sm hover:shadow-md text-orange-800 hover:text-orange-900 rounded-lg">
                        <Settings className="w-4 h-4" />
                        <div className="text-[10px] font-semibold">Re-Plan</div>
                      </Button>}
                  </div>
                </div>

                {/* Separator */}
                <div className="border-t border-border my-4"></div>

                {/* Step Navigation */}
                <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                  {Object.entries(groupedSteps).map(([phase, operations]) => <div key={phase} className="space-y-2">
                      <h4 className="font-semibold text-primary text-sm">{phase}</h4>
                      {Object.entries(operations as any).map(([operation, opSteps]) => <div key={operation} className="ml-2 space-y-1">
                          <h5 className="text-xs font-medium text-muted-foreground">{operation}</h5>
                          {(opSteps as any[]).map(step => {
                    const stepIndex = allSteps.findIndex(s => s.id === step.id);
                    return <div key={step.id} className={`ml-2 p-2 rounded text-xs cursor-pointer transition-fast border ${step.id === currentStep?.id ? 'bg-primary/10 text-primary border-primary/20' : completedSteps.has(step.id) ? 'bg-green-50 text-green-700 border-green-200' : 'hover:bg-muted/50 border-transparent hover:border-muted-foreground/20'}`} onClick={() => {
                      if (stepIndex >= 0 && isKickoffComplete) {
                        onStepClick(stepIndex, step);
                      }
                    }}>
                                <div className="flex items-center gap-2">
                                  {getStepIndicator(step.stepType || 'prime')}
                                  {completedSteps.has(step.id) && <CheckCircle className="w-3 h-3" />}
                                  <span className="truncate">{step.step}</span>
                                </div>
                              </div>;
                  })}
                        </div>)}
                    </div>)}
                </div>

                {/* Step Types Button - Moved to Bottom */}
                <div className="mt-4 pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setShowStepTypesInfo(true)} className="w-full py-1.5 px-4 text-xs ">
                    Step Types
                  </Button>
                </div>
              </div>}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Step Types Info Dialog */}
      <Dialog open={showStepTypesInfo} onOpenChange={setShowStepTypesInfo}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Step Types</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <FlowTypeLegend compact={false} showDescriptions={true} showOnlyStepTypes={true} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Coming Soon Dialog */}
      <Dialog open={showComingSoon} onOpenChange={setShowComingSoon}>
        <DialogContent className="max-w-md">
          <div className="relative">
            {/* Blurred background effect */}
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg" />
            
            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="mb-4 p-4 rounded-full bg-primary/10">
                <Sparkles className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Feature Coming Soon</h3>
              <p className="text-muted-foreground">
                We're building a network of on-demand pro's to help support your project. Got a question? Call or text (617) 545-3367
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Sidebar>;
}