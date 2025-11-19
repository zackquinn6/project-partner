import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, EyeOff, MessageCircle, Key, Settings, Layers, Sparkles, Image, FileText, Info } from "lucide-react";
import { getStepIndicator, FlowTypeLegend } from './FlowTypeLegend';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { WorkflowThemeSelector } from './WorkflowThemeSelector';
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
  projectRunId?: string;
  onInstructionLevelChange: (level: 'quick' | 'detailed' | 'new_user') => void;
  onStepClick: (stepIndex: number, step: any) => void;
  onHelpClick: () => void;
  onUnplannedWorkClick: () => void;
  onKeysToSuccessClick: () => void;
  onPhotosClick: () => void;
  onNotesClick: () => void;
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
  projectRunId,
  onInstructionLevelChange,
  onStepClick,
  onHelpClick,
  onUnplannedWorkClick,
  onKeysToSuccessClick,
  onPhotosClick,
  onNotesClick
}: WorkflowSidebarProps) {
  const {
    state
  } = useSidebar();
  const collapsed = state === "collapsed";
  
  // Debug logging
  console.log('🔍 WorkflowSidebar Debug:', {
    allStepsLength: allSteps.length,
    groupedStepsKeys: Object.keys(groupedSteps || {}),
    groupedStepsPhases: Object.entries(groupedSteps || {}).map(([phase, ops]) => ({
      phase,
      operationsCount: Object.keys(ops as any).length,
      operations: Object.keys(ops as any)
    })),
    isKickoffComplete,
    collapsed
  });
  const [showStepTypesInfo, setShowStepTypesInfo] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  
  // Track which phases and operations are open
  const [openPhases, setOpenPhases] = useState<Set<string>>(new Set());
  const [openOperations, setOpenOperations] = useState<Set<string>>(new Set());
  
  // Find the current step's phase and operation, and determine operation order
  const currentStepPhaseAndOperation = useMemo(() => {
    if (!currentStep || !groupedSteps) return null;
    
    for (const [phase, operations] of Object.entries(groupedSteps)) {
      const phaseOps = Object.entries(operations as any);
      for (let i = 0; i < phaseOps.length; i++) {
        const [operation, opSteps] = phaseOps[i];
        if (Array.isArray(opSteps)) {
          const hasCurrentStep = opSteps.some((step: any) => step.id === currentStep.id);
          if (hasCurrentStep) {
            return { 
              phase, 
              operation,
              operationIndex: i,
              allOperationsInPhase: phaseOps.map(([op]) => op)
            };
          }
        }
      }
    }
    return null;
  }, [currentStep, groupedSteps]);
  
  // Auto-open/collapse based on current step
  // This runs whenever the current step changes (via next/previous navigation or step click)
  useEffect(() => {
    if (currentStepPhaseAndOperation) {
      const { phase, operation } = currentStepPhaseAndOperation;
      
      // Close ALL phases except the current one
      setOpenPhases(new Set([phase]));
      
      // Close ALL operations except the current one
      // Only open the current operation - all others (including future ones) should be closed
      setOpenOperations(new Set([`${phase}-${operation}`]));
    } else {
      // If no current step found, close everything
      setOpenPhases(new Set());
      setOpenOperations(new Set());
    }
  }, [currentStepPhaseAndOperation, currentStepIndex, currentStep?.id]); // Trigger on step change

  // Calculate completed operations and phases
  const completedOperations = useMemo(() => {
    const completed = new Set<string>();
    if (!groupedSteps) return completed;

    Object.entries(groupedSteps).forEach(([phase, operations]) => {
      Object.entries(operations as any).forEach(([operation, opSteps]) => {
        if (Array.isArray(opSteps) && opSteps.length > 0) {
          const allStepsCompleted = opSteps.every((step: any) => completedSteps.has(step.id));
          if (allStepsCompleted) {
            completed.add(`${phase}-${operation}`);
          }
        }
      });
    });

    return completed;
  }, [groupedSteps, completedSteps]);

  const completedPhases = useMemo(() => {
    const completed = new Set<string>();
    if (!groupedSteps) return completed;

    Object.entries(groupedSteps).forEach(([phase, operations]) => {
      const phaseOperations = Object.entries(operations as any);
      const allOperationsCompleted = phaseOperations.every(([operation, opSteps]) => {
        if (!Array.isArray(opSteps) || opSteps.length === 0) return true;
        return opSteps.every((step: any) => completedSteps.has(step.id));
      });
      if (allOperationsCompleted && phaseOperations.length > 0) {
        completed.add(phase);
      }
    });

    return completed;
  }, [groupedSteps, completedSteps]);

  // Find the earliest uncompleted step (in-progress)
  const inProgressStep = useMemo(() => {
    if (!allSteps || allSteps.length === 0) return null;
    
    for (const step of allSteps) {
      if (!completedSteps.has(step.id)) {
        return step.id;
      }
    }
    return null;
  }, [allSteps, completedSteps]);

  // Find the in-progress operation and phase
  const inProgressOperation = useMemo(() => {
    if (!inProgressStep || !groupedSteps) return null;

    for (const [phase, operations] of Object.entries(groupedSteps)) {
      for (const [operation, opSteps] of Object.entries(operations as any)) {
        if (Array.isArray(opSteps)) {
          const hasInProgressStep = opSteps.some((step: any) => step.id === inProgressStep);
          if (hasInProgressStep) {
            return `${phase}-${operation}`;
          }
        }
      }
    }
    return null;
  }, [inProgressStep, groupedSteps]);

  const inProgressPhase = useMemo(() => {
    if (!inProgressOperation) return null;
    return inProgressOperation.split('-')[0];
  }, [inProgressOperation]);
  
  
  return <Sidebar collapsible="icon">
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-sm font-semibold">{projectName || 'Project Progress'}</SidebarGroupLabel>
          <SidebarGroupContent>
            {!collapsed && <div className="flex flex-col h-full p-2">
                {/* Fixed Upper Section */}
                <div className="flex-shrink-0 space-y-4">
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
                      <h3 className="font-semibold text-primary text-xs">Detail Level</h3>
                    </div>
                    <Select value={instructionLevel} onValueChange={onInstructionLevelChange}>
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue>
                          {instructionLevel === 'new_user' && 'Beginner'}
                          {instructionLevel === 'detailed' && 'Intermediate'}
                          {instructionLevel === 'quick' && 'Advanced'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new_user" className="text-xs">Beginner: Extra guidance</SelectItem>
                        <SelectItem value="detailed" className="text-xs">Intermediate: Short step-by-step</SelectItem>
                        <SelectItem value="quick" className="text-xs">Advanced: Key points only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Project Tools Section */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-primary">Project Tools</h3>
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

                  {/* Photos and Notes Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={onPhotosClick}
                      variant="outline"
                      size="sm"
                      className="flex-1 h-12 flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-150 border-purple-200 hover:border-purple-300 text-purple-800 hover:text-purple-900 rounded-lg shadow-sm hover:shadow-md transition-all"
                    >
                      <Image className="w-4 h-4" />
                      <span className="text-[10px] font-semibold">Photos</span>
                    </Button>
                    <Button
                      onClick={onNotesClick}
                      variant="outline"
                      size="sm"
                      className="flex-1 h-12 flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-150 border-indigo-200 hover:border-indigo-300 text-indigo-800 hover:text-indigo-900 rounded-lg shadow-sm hover:shadow-md transition-all"
                    >
                      <FileText className="w-4 h-4" />
                      <span className="text-[10px] font-semibold">Notes</span>
                    </Button>
                  </div>

                  {/* Separator */}
                  <div className="border-t border-border my-4"></div>

                  {/* Step Types Tooltip Button - Above first phase */}
                  <div className="mb-2 flex justify-start">
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowStepTypesInfo(true)}
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          >
                            <Info className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Step Types</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* Scrollable Workflow Navigation Section */}
                <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
                  {!groupedSteps || Object.keys(groupedSteps).length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-4">
                      No workflow steps available. Please check project structure.
                    </div>
                  ) : (
                    <Accordion 
                      type="multiple" 
                      value={Array.from(openPhases)}
                      onValueChange={(values) => {
                        // Update state when accordion changes
                        const newOpenPhases = new Set(values);
                        setOpenPhases(newOpenPhases);
                      }}
                      className="w-full"
                    >
                      {Object.entries(groupedSteps).map(([phase, operations]) => {
                        const phaseOperations = Object.entries(operations as any);
                        const hasSteps = phaseOperations.some(([_, opSteps]) => 
                          Array.isArray(opSteps) && opSteps.length > 0
                        );
                        
                        if (!hasSteps) return null;
                        
                        const isPhaseCompleted = completedPhases.has(phase);
                        const isPhaseInProgress = inProgressPhase === phase;
                        
                        return (
                          <AccordionItem key={phase} value={phase} className="border-none">
                            <AccordionTrigger 
                              className={`py-2 px-0 hover:no-underline text-sm font-semibold ${
                                isPhaseCompleted
                                  ? 'text-green-700 bg-green-50 border-green-200 rounded px-2'
                                  : isPhaseInProgress
                                  ? 'text-yellow-700 bg-yellow-50 border-yellow-200 rounded px-2'
                                  : 'text-primary'
                              }`}
                            >
                              <span>{phase}</span>
                            </AccordionTrigger>
                            <AccordionContent className="pt-1 pb-2">
                              <Accordion 
                                type="multiple"
                                value={phaseOperations
                                  .map(([operation]) => `${phase}-${operation}`)
                                  .filter(key => openOperations.has(key))
                                }
                                onValueChange={(values) => {
                                  // Update state when nested accordion changes
                                  const newOpenOps = new Set(values);
                                  setOpenOperations(prev => {
                                    const updated = new Set(prev);
                                    // Remove all operations for this phase
                                    phaseOperations.forEach(([op]) => {
                                      updated.delete(`${phase}-${op}`);
                                    });
                                    // Add back the ones that should be open
                                    newOpenOps.forEach(key => {
                                      if (key.startsWith(`${phase}-`)) {
                                        updated.add(key);
                                      }
                                    });
                                    return updated;
                                  });
                                }}
                                className="w-full"
                              >
                                {phaseOperations.map(([operation, opSteps]) => {
                                  if (!Array.isArray(opSteps) || opSteps.length === 0) {
                                    return null;
                                  }
                                  const operationKey = `${phase}-${operation}`;
                                  const isOperationCompleted = completedOperations.has(operationKey);
                                  const isOperationInProgress = inProgressOperation === operationKey;
                                  
                                  return (
                                    <AccordionItem 
                                      key={operationKey} 
                                      value={operationKey}
                                      className="border-none ml-2"
                                    >
                                      <AccordionTrigger 
                                        className={`py-1.5 px-0 hover:no-underline text-xs font-medium ${
                                          isOperationCompleted
                                            ? 'text-green-700 bg-green-50 border-green-200 rounded px-2'
                                            : isOperationInProgress
                                            ? 'text-yellow-700 bg-yellow-50 border-yellow-200 rounded px-2'
                                            : 'text-muted-foreground'
                                        }`}
                                      >
                                        <span>{operation}</span>
                                      </AccordionTrigger>
                                      <AccordionContent className="pt-1 pb-1">
                                        <div className="space-y-1 ml-2">
                                          {opSteps.map((step: any) => {
                                            const stepIndex = allSteps.findIndex(s => s.id === step.id);
                                            const isStepCompleted = completedSteps.has(step.id);
                                            const isStepInProgress = inProgressStep === step.id;
                                            
                                            return (
                                              <div 
                                                key={step.id} 
                                                className={`p-2 rounded text-xs cursor-pointer transition-fast border ${
                                                  step.id === currentStep?.id 
                                                    ? 'bg-primary/10 text-primary border-primary/20' 
                                                    : isStepCompleted
                                                    ? 'bg-green-50 text-green-700 border-green-200' 
                                                    : isStepInProgress
                                                    ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                    : 'hover:bg-muted/50 border-transparent hover:border-muted-foreground/20'
                                                }`} 
                                                onClick={() => {
                                                  if (stepIndex >= 0 && isKickoffComplete) {
                                                    onStepClick(stepIndex, step);
                                                  }
                                                }}
                                              >
                                                <div className="flex items-center gap-2">
                                                  {getStepIndicator(step.stepType || 'prime')}
                                                  {isStepCompleted && <CheckCircle className="w-3 h-3" />}
                                                  <span className="truncate">{step.step}</span>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  );
                                })}
                              </Accordion>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  )}
                </div>

                {/* Theme Button - Fixed at bottom of scrollable section */}
                <div className="flex-shrink-0 mt-4 pt-4 border-t border-border">
                  <WorkflowThemeSelector projectRunId={projectRunId} />
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
                We're building a network of on-demand pro's to help support your project.
Got a question?
Call or text (617) 545-3367
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Sidebar>;
}