import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle, Settings, Sparkles, Info, HelpCircle, Calendar, MessageCircle, Key, Layers, FileText, Image } from "lucide-react";
import { getStepIndicator, FlowTypeLegend } from './FlowTypeLegend';
import * as LucideIcons from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { AppReference } from '@/interfaces/Project';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { WorkflowThemeSelector } from './WorkflowThemeSelector';
import { WorkflowTutorial } from './WorkflowTutorial';
import { ProgressReportingStyleDialog } from './ProgressReportingStyleDialog';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { useProject } from '@/contexts/ProjectContext';
import { formatEstimatedFinishDate } from '@/utils/estimatedFinishDate';
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
  projectRun?: ProjectRun;
  estimatedFinishDate?: Date | null;
  estimatedFinishDateLoading?: boolean;
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
  projectRun,
  estimatedFinishDate,
  estimatedFinishDateLoading = false,
  onInstructionLevelChange,
  onStepClick,
  onHelpClick,
  onUnplannedWorkClick,
  onKeysToSuccessClick,
  onPhotosClick,
  onNotesClick
}: WorkflowSidebarProps) {
  const { updateProjectRun } = useProject();
  const {
    state
  } = useSidebar();
  const collapsed = state === "collapsed";
  
  // Function to get icon component from icon name (same logic as CompactAppsSection)
  const getIconComponent = (iconName: string | undefined): LucideIcon => {
    if (!iconName) {
      return Sparkles;
    }
    
    // Try exact match first
    let Icon = (LucideIcons as any)[iconName];
    
    // If not found, try with first letter capitalized (common lucide pattern)
    if (!Icon && iconName.length > 0) {
      const capitalized = iconName.charAt(0).toUpperCase() + iconName.slice(1);
      Icon = (LucideIcons as any)[capitalized];
    }
    
    // If still not found, try all lowercase
    if (!Icon) {
      Icon = (LucideIcons as any)[iconName.toLowerCase()];
    }
    
    // Try matching case-insensitive
    if (!Icon) {
      const iconKeys = Object.keys(LucideIcons);
      const matchedKey = iconKeys.find(key => key.toLowerCase() === iconName.toLowerCase());
      if (matchedKey) {
        Icon = (LucideIcons as any)[matchedKey];
      }
    }
    
    if (!Icon) {
      return Sparkles;
    }
    
    return Icon;
  };
  
  // Debug logging - check for apps in steps
  const stepsWithApps = allSteps.filter(s => s.apps && Array.isArray(s.apps) && s.apps.length > 0);
  console.log('🔍 WorkflowSidebar Debug:', {
    allStepsLength: allSteps.length,
    stepsWithAppsCount: stepsWithApps.length,
    sampleStepWithApps: stepsWithApps.length > 0 ? {
      step: stepsWithApps[0].step,
      appsCount: stepsWithApps[0].apps?.length,
      apps: stepsWithApps[0].apps?.map((app: AppReference) => ({
        id: app.id,
        appName: app.appName,
        icon: app.icon
      }))
    } : null,
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
  const [showTutorial, setShowTutorial] = useState(false);
  const [showProgressReportingDialog, setShowProgressReportingDialog] = useState(false);

  // Check if user is new and should see tutorial
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tutorialCompleted = localStorage.getItem('workflow-tutorial-completed');
      const isFirstProjectRun = !tutorialCompleted && projectRunId;
      if (isFirstProjectRun && !showTutorial) {
        // Small delay to ensure UI is rendered
        const timer = setTimeout(() => {
          setShowTutorial(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [projectRunId]);

  const handleTutorialComplete = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('workflow-tutorial-completed', 'true');
    }
  };
  
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
      
      <SidebarContent className="pt-4 flex flex-col h-full overflow-hidden">
        <SidebarGroup className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <SidebarGroupLabel className="px-4 text-sm font-semibold flex-shrink-0" data-tutorial="project-name">{projectName || 'Project Progress'}</SidebarGroupLabel>
          <SidebarGroupContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {!collapsed && <div className="flex flex-col h-full p-2 min-h-0 overflow-hidden">
                {/* Fixed Upper Section - No scrolling */}
                <div className="flex-shrink-0 space-y-3 pb-3">
                  {/* Progress Header */}
                  <div className="space-y-0.5" data-tutorial="progress-bar">
                    <div className="flex justify-between items-center text-xs">
                      <span>Progress</span>
                      <div className="flex items-center gap-2.5">
                        <span className="text-muted-foreground text-[10px]">
                          Step {currentStepIndex + 1} of {allSteps.length}
                        </span>
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowProgressReportingDialog(true)}
                                className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                              >
                                <Settings className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Progress Reporting Style</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {/* Estimated Finish Date */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Est. Finish</span>
                    </div>
                    <span className="font-medium text-foreground">
                      {estimatedFinishDateLoading ? (
                        <span className="text-muted-foreground text-[10px]">Calculating...</span>
                      ) : estimatedFinishDate ? (
                        <span className="text-[10px]">{formatEstimatedFinishDate(estimatedFinishDate)}</span>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">TBD</span>
                      )}
                    </span>
                  </div>

                  {/* Instruction Detail Level */}
                  <div className="flex items-center gap-3" data-tutorial="detail-level">
                    <div className="flex-shrink-0">
                      <div className="font-semibold text-primary text-xs leading-tight">
                        <div>Detail</div>
                        <div>Level</div>
                      </div>
                    </div>
                    <Select value={instructionLevel} onValueChange={onInstructionLevelChange}>
                      <SelectTrigger className="w-[140px] text-xs">
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
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground">Project Tools</div>
                    {/* First row: Chat, KeyInfo, Re-Plan - Icons on top of text */}
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={onHelpClick}
                        className="h-auto py-1.5 px-2 text-[10px] flex-1 flex-col gap-1"
                        style={{ backgroundColor: 'rgba(59, 130, 246, 0.40)', color: 'black' }}
                      >
                        <MessageCircle className="h-3.5 w-3.5" style={{ color: 'black' }} />
                        <span>Chat</span>
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={onKeysToSuccessClick}
                        className="h-auto py-1.5 px-2 text-[10px] flex-1 flex-col gap-1"
                        style={{ backgroundColor: 'rgba(168, 85, 247, 0.40)', color: 'black' }}
                      >
                        <Key className="h-3.5 w-3.5" style={{ color: 'black' }} />
                        <span>KeyInfo</span>
                      </Button>
                      {isKickoffComplete && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={onUnplannedWorkClick}
                          className="h-auto py-1.5 px-2 text-[10px] flex-1 flex-col gap-1"
                          style={{ backgroundColor: 'rgba(236, 72, 153, 0.40)', color: 'black' }}
                        >
                          <Layers className="h-3.5 w-3.5" style={{ color: 'black' }} />
                          <span>Re-Plan</span>
                        </Button>
                      )}
                    </div>
                    {/* Second row: Notes, Photos - Icons to the left of text */}
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={onNotesClick}
                        className="h-7 px-2 text-[10px] flex-1"
                        style={{ backgroundColor: 'rgba(34, 197, 94, 0.40)', color: 'black' }}
                      >
                        <FileText className="h-3 w-3 mr-1.5" style={{ color: 'black' }} />
                        <span>Notes</span>
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={onPhotosClick}
                        className="h-7 px-2 text-[10px] flex-1"
                        style={{ backgroundColor: 'rgba(251, 146, 60, 0.40)', color: 'black' }}
                      >
                        <Image className="h-3 w-3 mr-1.5" style={{ color: 'black' }} />
                        <span>Photos</span>
                      </Button>
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="border-t border-border my-4"></div>
                </div>

                {/* Scrollable Workflow Navigation Section - Only this section scrolls */}
                <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pb-2" data-tutorial="workflow-navigation">
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
                                        className={`py-1 px-0 hover:no-underline text-xs font-medium ${
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
                                                <span className="truncate">{step.step}</span>
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

                {/* Theme, Step Types, and Tutorial Buttons - Fixed at bottom, outside scrollable section */}
                <div className="flex-shrink-0 pt-2 pb-2 border-t border-border mt-2 flex items-center justify-center gap-2">
                  <WorkflowThemeSelector projectRunId={projectRunId} />
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowStepTypesInfo(true)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Step Types</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowTutorial(true)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          data-tutorial="help-button"
                        >
                          <HelpCircle className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Workflow Tutorial</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Step Types Info Dialog */}
      <Dialog open={showStepTypesInfo} onOpenChange={setShowStepTypesInfo}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Step Types</DialogTitle>
            <DialogDescription>
              Configure step types and progress reporting style
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
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

      {/* Workflow Tutorial */}
      <WorkflowTutorial 
        open={showTutorial} 
        onOpenChange={setShowTutorial}
        onComplete={handleTutorialComplete}
      />

      {/* Progress Reporting Style Dialog */}
      <ProgressReportingStyleDialog
        open={showProgressReportingDialog}
        onOpenChange={setShowProgressReportingDialog}
        projectRun={projectRun}
      />
    </Sidebar>;
}