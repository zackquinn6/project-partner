import { CheckCircle, Settings, Sparkles, Calendar, MessageCircle, Key, FileText, Image, BarChart3, Wrench, ChevronDown, ChevronLeft, Shield, DollarSign, ShoppingCart, ClipboardCheck, ClipboardList, Handshake, Crosshair, Trash2, Eye, Video } from "lucide-react";
import * as LucideIcons from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { AppReference } from '@/interfaces/Project';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, useSidebar } from "@/components/ui/sidebar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { WorkflowTutorial } from './WorkflowTutorial';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ProgressReportingStyleDialog } from './ProgressReportingStyleDialog';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { useProject } from '@/contexts/ProjectContext';
import { formatEstimatedFinishDate } from '@/utils/estimatedFinishDate';
import { usePartnerAppSettings } from '@/hooks/usePartnerAppSettings';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect, useMemo } from "react";
interface WorkflowSidebarProps {
  allSteps: any[];
  currentStep: any;
  currentStepIndex: number;
  completedSteps: Set<string>;
  progress: number;
  groupedSteps: any;
  isKickoffComplete: boolean;
  instructionLevel: 'beginner' | 'intermediate' | 'advanced';
  projectName: string;
  projectRunId?: string;
  projectRun?: ProjectRun;
  estimatedFinishDate?: Date | null;
  estimatedFinishDateLoading?: boolean;
  onInstructionLevelChange: (level: 'beginner' | 'intermediate' | 'advanced') => void;
  onStepClick: (stepIndex: number, step: any) => void;
  onHelpClick: () => void;
  onUnplannedWorkClick: () => void;
  onKeysToSuccessClick: () => void;
  onPhotosClick: () => void;
  /** When set (e.g. post-kickoff), shows “Guide Videos” next to Photos. */
  onShowVideosClick?: () => void;
  onNotesClick: () => void;
  onViewScheduleClick: () => void;
  onProgressViewsClick?: () => void;
  onToolRentalsClick?: () => void;
  onProjectNameClick?: () => void;
  onProjectVisualizerClick?: () => void;
  /** When true, Planning Studio is open — workflow tutorial must not auto-open. */
  projectPlanningWizardOpen?: boolean;
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
  onShowVideosClick,
  onNotesClick,
  onViewScheduleClick,
  onProgressViewsClick,
  onToolRentalsClick,
  onProjectNameClick,
  onProjectVisualizerClick,
  projectPlanningWizardOpen = false,
}: WorkflowSidebarProps) {
  const { updateProjectRun } = useProject();
  const { user } = useAuth();
  const { expertSupportEnabled, toolRentalsEnabled, wasteRemovalEnabled } = usePartnerAppSettings();
  const {
    state,
    toggleSidebar,
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
  
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showProgressReportingDialog, setShowProgressReportingDialog] = useState(false);

  // Auto-open tutorial when viewing the main workflow (not during Planning Studio).
  // Runs once per dependency change; cleanup clears the timer to avoid repeated popups.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const maybeShowTutorial = async () => {
      if (typeof window === 'undefined') return;
      if (!projectRunId || !isKickoffComplete || projectPlanningWizardOpen) return;
      if (!user?.id) return;

      try {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('do_not_show_workflow_tutorial')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        if (profile?.do_not_show_workflow_tutorial === true) return;

        timer = setTimeout(() => {
          if (!cancelled) setShowTutorial(true);
        }, 1000);
      } catch (err) {
        console.error('Failed to read workflow tutorial preference from profile:', err);
      }
    };

    void maybeShowTutorial();

    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
    };
  }, [projectRunId, isKickoffComplete, projectPlanningWizardOpen, user?.id]);

  const handleTutorialPermanentOptOut = async () => {
    if (!user?.id) return;
    const { error } = await supabase
      .from('user_profiles')
      .update({ do_not_show_workflow_tutorial: true })
      .eq('user_id', user.id);
    if (error) {
      console.error('Failed to persist workflow tutorial opt-out to profile:', error);
      throw error;
    }
  };

  const openAppByActionKey = (actionKey: string) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('open-app', { detail: { actionKey } }));
  };
  
  // Track which phases and operations are open
  // Initialize with first phase open so steps are visible by default
  const [openPhases, setOpenPhases] = useState<Set<string>>(() => {
    if (groupedSteps && Object.keys(groupedSteps).length > 0) {
      return new Set([Object.keys(groupedSteps)[0]]);
    }
    return new Set();
  });
  const [openOperations, setOpenOperations] = useState<Set<string>>(() => {
    if (groupedSteps && Object.keys(groupedSteps).length > 0) {
      const firstPhaseKey = Object.keys(groupedSteps)[0];
      const firstPhaseValue = groupedSteps[firstPhaseKey];
      if (firstPhaseValue && typeof firstPhaseValue === 'object' && !Array.isArray(firstPhaseValue)) {
        const firstOperationKey = Object.keys(firstPhaseValue)[0];
        if (firstOperationKey) {
          return new Set([`${firstPhaseKey}-${firstOperationKey}`]);
        }
      }
    }
    return new Set();
  });
  
  // Helper function to check if a value is a space container (nested structure)
  const isSpaceContainer = (value: any): boolean => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    // Space container has nested structure: { "Phase": { "Operation": [steps] } }
    // Check if all values are objects (phases) that contain operations
    return Object.values(value).every(phaseValue => 
      phaseValue && typeof phaseValue === 'object' && !Array.isArray(phaseValue) &&
      Object.values(phaseValue as any).some(opValue => Array.isArray(opValue))
    );
  };

  // Find the current step's phase and operation, and determine operation order
  const currentStepPhaseAndOperation = useMemo(() => {
    if (!currentStep || !groupedSteps) return null;
    
    for (const [topLevelKey, topLevelValue] of Object.entries(groupedSteps)) {
      if (isSpaceContainer(topLevelValue)) {
        // Space container: { "Space": { "Phase": { "Operation": [steps] } } }
        for (const [phase, phaseValue] of Object.entries(topLevelValue as any)) {
          const phaseOps = Object.entries(phaseValue as any);
          for (let i = 0; i < phaseOps.length; i++) {
            const [operation, opSteps] = phaseOps[i];
            if (Array.isArray(opSteps)) {
              const hasCurrentStep = opSteps.some((step: any) => step.id === currentStep.id);
              if (hasCurrentStep) {
                return { 
                  space: topLevelKey,
                  phase, 
                  operation,
                  operationIndex: i,
                  allOperationsInPhase: phaseOps.map(([op]) => op)
                };
              }
            }
          }
        }
      } else {
        // Regular phase: { "Phase": { "Operation": [steps] } }
        const phaseOps = Object.entries(topLevelValue as any);
        for (let i = 0; i < phaseOps.length; i++) {
          const [operation, opSteps] = phaseOps[i];
          if (Array.isArray(opSteps)) {
            const hasCurrentStep = opSteps.some((step: any) => step.id === currentStep.id);
            if (hasCurrentStep) {
              return { 
                phase: topLevelKey, 
                operation,
                operationIndex: i,
                allOperationsInPhase: phaseOps.map(([op]) => op)
              };
            }
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
      const { space, phase, operation } = currentStepPhaseAndOperation;
      
      // For space containers, use "Space-Phase" as the phase key
      // For regular phases, use just the phase name
      const phaseKey = space ? `${space}-${phase}` : phase;
      const operationKey = space ? `${space}-${phase}-${operation}` : `${phase}-${operation}`;
      
      // Open the current phase and operation
      setOpenPhases(new Set([phaseKey]));
      
      // Open the current operation
      setOpenOperations(new Set([operationKey]));
    } else {
      // If no current step found, open the first phase by default so user can see steps
      if (groupedSteps && Object.keys(groupedSteps).length > 0) {
        const firstPhaseKey = Object.keys(groupedSteps)[0];
        setOpenPhases(new Set([firstPhaseKey]));
        // Also open the first operation of the first phase
        const firstPhaseValue = groupedSteps[firstPhaseKey];
        if (firstPhaseValue && typeof firstPhaseValue === 'object' && !Array.isArray(firstPhaseValue)) {
          const firstOperationKey = Object.keys(firstPhaseValue)[0];
          if (firstOperationKey) {
            setOpenOperations(new Set([`${firstPhaseKey}-${firstOperationKey}`]));
          }
        }
      } else {
        setOpenPhases(new Set());
        setOpenOperations(new Set());
      }
    }
  }, [currentStepPhaseAndOperation, currentStepIndex, currentStep?.id, groupedSteps]); // Trigger on step change or groupedSteps change
  
  // Also ensure first phase is open when groupedSteps first becomes available
  useEffect(() => {
    if (groupedSteps && Object.keys(groupedSteps).length > 0 && openPhases.size === 0 && !currentStep) {
      const firstPhaseKey = Object.keys(groupedSteps)[0];
      setOpenPhases(new Set([firstPhaseKey]));
      
      const firstPhaseValue = groupedSteps[firstPhaseKey];
      if (firstPhaseValue && typeof firstPhaseValue === 'object' && !Array.isArray(firstPhaseValue)) {
        const firstOperationKey = Object.keys(firstPhaseValue)[0];
        if (firstOperationKey) {
          setOpenOperations(new Set([`${firstPhaseKey}-${firstOperationKey}`]));
        }
      }
    }
  }, [groupedSteps, openPhases.size, currentStep]);

  // Calculate completed operations and phases (handles both regular phases and space containers)
  const completedOperations = useMemo(() => {
    const completed = new Set<string>();
    if (!groupedSteps) return completed;

    Object.entries(groupedSteps).forEach(([topLevelKey, topLevelValue]) => {
      if (isSpaceContainer(topLevelValue)) {
        // Space container: { "Space": { "Phase": { "Operation": [steps] } } }
        Object.entries(topLevelValue as any).forEach(([phase, phaseValue]) => {
          Object.entries(phaseValue as any).forEach(([operation, opSteps]) => {
            if (Array.isArray(opSteps) && opSteps.length > 0) {
              const allStepsCompleted = opSteps.every((step: any) => completedSteps.has(step.id));
              if (allStepsCompleted) {
                completed.add(`${topLevelKey}-${phase}-${operation}`);
              }
            }
          });
        });
      } else {
        // Regular phase: { "Phase": { "Operation": [steps] } }
        Object.entries(topLevelValue as any).forEach(([operation, opSteps]) => {
          if (Array.isArray(opSteps) && opSteps.length > 0) {
            const allStepsCompleted = opSteps.every((step: any) => completedSteps.has(step.id));
            if (allStepsCompleted) {
              completed.add(`${topLevelKey}-${operation}`);
            }
          }
        });
      }
    });

    return completed;
  }, [groupedSteps, completedSteps]);

  const completedPhases = useMemo(() => {
    const completed = new Set<string>();
    if (!groupedSteps) return completed;

    Object.entries(groupedSteps).forEach(([topLevelKey, topLevelValue]) => {
      if (isSpaceContainer(topLevelValue)) {
        // Space container: check each phase within the space
        Object.entries(topLevelValue as any).forEach(([phase, phaseValue]) => {
          const phaseOperations = Object.entries(phaseValue as any);
          const allOperationsCompleted = phaseOperations.every(([operation, opSteps]) => {
            if (!Array.isArray(opSteps) || opSteps.length === 0) return true;
            return opSteps.every((step: any) => completedSteps.has(step.id));
          });
          if (allOperationsCompleted && phaseOperations.length > 0) {
            completed.add(`${topLevelKey}-${phase}`);
          }
        });
      } else {
        // Regular phase
        const phaseOperations = Object.entries(topLevelValue as any);
        const allOperationsCompleted = phaseOperations.every(([operation, opSteps]) => {
          if (!Array.isArray(opSteps) || opSteps.length === 0) return true;
          return opSteps.every((step: any) => completedSteps.has(step.id));
        });
        if (allOperationsCompleted && phaseOperations.length > 0) {
          completed.add(topLevelKey);
        }
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
  
  
  return <Sidebar collapsible="offcanvas">
      <div className="flex justify-end px-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-foreground"
          onClick={toggleSidebar}
          aria-label="Hide navigation"
          aria-expanded={!collapsed}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      <SidebarContent className="pt-2 flex flex-col h-full overflow-hidden">
        <SidebarGroup className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <SidebarGroupLabel className="px-4 text-sm font-semibold flex-shrink-0" data-tutorial="project-name">
            <button
              type="button"
              className="w-full text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
              onClick={() => onProjectNameClick?.()}
              aria-label="Open project overview"
            >
              {projectName || 'Project Progress'}
            </button>
          </SidebarGroupLabel>
          <SidebarGroupContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {!collapsed && <div className="flex flex-col h-full p-2 min-h-0 overflow-hidden min-w-0">
                {/* Fixed Upper Section - scrolls when viewport short so Project Tools are never clipped */}
                <div className="flex-shrink-0 min-h-0 min-w-0 overflow-y-auto overflow-x-visible max-h-[45vh] space-y-3 pb-3">
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
                    <Select value={instructionLevel || 'intermediate'} onValueChange={onInstructionLevelChange} defaultValue="intermediate">
                      <SelectTrigger className="w-[140px] text-xs">
                        <SelectValue placeholder="Intermediate">
                          {instructionLevel === 'beginner' ? 'Beginner' : instructionLevel === 'advanced' ? 'Advanced' : 'Intermediate'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner" className="text-xs">Beginner: Extra guidance</SelectItem>
                        <SelectItem value="intermediate" className="text-xs">Intermediate: Short step-by-step</SelectItem>
                        <SelectItem value="advanced" className="text-xs">Advanced: Key points only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug pl-[3.25rem]">
                    Applies to every step you open, including ones already marked complete.
                  </p>

                  {/* Project Tools: primary buttons + more in menu (Experts/Tool Rentals follow admin app_settings toggles) */}
                    <div className="space-y-1.5 min-w-0" data-tutorial="project-tools">
                    <div className="text-xs font-semibold text-muted-foreground">Project Tools</div>
                    {/* Priorities, Course Correct - Course Correct is wider so the label fits without an icon */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={onKeysToSuccessClick}
                        className="h-7 px-2 text-[11px] flex-[1] min-w-0 flex items-center justify-center gap-1 bg-category-3 text-category-3-foreground hover:bg-category-3/85"
                      >
                        <Key className="h-3 w-3 shrink-0" />
                        <span className="truncate">Priorities</span>
                      </Button>
                      {isKickoffComplete && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={onUnplannedWorkClick}
                          className="h-7 px-2 text-[11px] flex-[1.35] min-w-0 flex items-center justify-center bg-category-5 text-category-5-foreground hover:bg-category-5/85"
                        >
                          <span className="whitespace-nowrap">Course Correct</span>
                        </Button>
                      )}
                    </div>
                    {/* Notes, Photos, Videos - Photos is wider so the label fits */}
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={onNotesClick}
                          className="h-7 px-2 text-[11px] flex-[1] min-w-0 flex items-center justify-center gap-1 bg-category-2 text-category-2-foreground hover:bg-category-2/85"
                        >
                          <FileText className="h-3 w-3 shrink-0" />
                          <span className="truncate">Notes</span>
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={onPhotosClick}
                          className="h-7 px-2 text-[11px] flex-[1.35] min-w-0 flex items-center justify-center gap-1 bg-category-4 text-category-4-foreground hover:bg-category-4/85"
                        >
                          <Image className="h-3 w-3 shrink-0" />
                          <span className="whitespace-nowrap">Photos</span>
                        </Button>
                      </div>
                      {onShowVideosClick ? (
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={onShowVideosClick}
                          className="h-8 w-full min-w-0 justify-center px-2 text-[11px] font-medium flex items-center gap-1.5 bg-category-1 text-category-1-foreground hover:bg-category-1/85"
                        >
                          <Video className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">Guide Videos</span>
                        </Button>
                      ) : null}
                    </div>

                        {/* Partner Tools + Progress first (A-Z); project apps below (A-Z): Budget, Quality, Risk Radar, Schedule, Shopping */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="relative h-7 w-full min-w-0 justify-center px-7 text-[11px] font-normal bg-category-6/15 border-category-6/40 text-category-6 hover:bg-category-6/25 hover:text-category-6"
                        >
                          <span className="truncate text-center">More Project Tools</span>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 shrink-0 -translate-y-1/2 opacity-70" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="min-w-[var(--radix-dropdown-menu-trigger-width)] w-[var(--radix-dropdown-menu-trigger-width)] max-w-[min(100%,14rem)] bg-popover border-category-6/30"
                      >
                        {/* Non–project-tool entries first, alphabetical: Partner Tools, Progress */}
                        {(expertSupportEnabled || (toolRentalsEnabled && onToolRentalsClick) || wasteRemovalEnabled) && (
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="text-xs gap-2 cursor-pointer px-2 py-1.5">
                              <Handshake className="h-3.5 w-3.5 shrink-0" />
                              Partner Tools
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="min-w-[10rem] bg-popover border-category-6/30">
                              {expertSupportEnabled && (
                                <DropdownMenuItem
                                  className="text-xs gap-2 cursor-pointer"
                                  onClick={onHelpClick}
                                >
                                  <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                                  Expert Support
                                </DropdownMenuItem>
                              )}
                              {toolRentalsEnabled && onToolRentalsClick && (
                                <DropdownMenuItem
                                  className="text-xs gap-2 cursor-pointer"
                                  onClick={onToolRentalsClick}
                                >
                                  <Wrench className="h-3.5 w-3.5 shrink-0" />
                                  Tool Rental
                                </DropdownMenuItem>
                              )}
                              {wasteRemovalEnabled && (
                                <DropdownMenuItem
                                  className="text-xs gap-2 cursor-pointer"
                                  onClick={() => openAppByActionKey('waste-removal')}
                                >
                                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                                  Waste Removal
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        )}
                        <DropdownMenuItem
                          className="text-xs gap-2 cursor-pointer"
                          onClick={() => (onProgressViewsClick ?? (() => {}))()}
                        >
                          <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                          Progress
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-category-6/30" />
                        {/* Project tools at bottom, alphabetical */}
                        <DropdownMenuItem
                          className="text-xs gap-2 cursor-pointer"
                          onClick={() => openAppByActionKey('project-budgeting')}
                        >
                          <DollarSign className="h-3.5 w-3.5 shrink-0" />
                          Budget
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-xs gap-2 cursor-pointer"
                          onClick={() => onProjectVisualizerClick?.()}
                        >
                          <Eye className="h-3.5 w-3.5 shrink-0" />
                          Project Visualizer
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-xs gap-2 cursor-pointer"
                          onClick={() => openAppByActionKey('quality-check')}
                        >
                          <ClipboardCheck className="h-3.5 w-3.5 shrink-0" />
                          Quality
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-xs gap-2 cursor-pointer"
                          onClick={() => openAppByActionKey('after-action-review')}
                        >
                          <ClipboardList className="h-3.5 w-3.5 shrink-0" />
                          After Action Review
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-xs gap-2 cursor-pointer"
                          onClick={() => openAppByActionKey('risk-management')}
                        >
                          <Crosshair className="h-3.5 w-3.5 shrink-0" />
                          Risk Radar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-xs gap-2 cursor-pointer"
                          onClick={onViewScheduleClick}
                        >
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          Schedule
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-xs gap-2 cursor-pointer"
                          onClick={() => openAppByActionKey('shopping-checklist')}
                        >
                          <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
                          Shopping
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                      {Object.entries(groupedSteps).map(([topLevelKey, topLevelValue]) => {
                        if (isSpaceContainer(topLevelValue)) {
                          // Space container: { "Space": { "Phase": { "Operation": [steps] } } }
                          return (
                            <AccordionItem key={topLevelKey} value={topLevelKey} className="border-none">
                              <AccordionTrigger 
                                className="py-2 px-0 hover:no-underline text-sm font-semibold text-foreground"
                              >
                                <span>{topLevelKey}</span>
                              </AccordionTrigger>
                              <AccordionContent className="pt-1 pb-2">
                                <Accordion 
                                  type="multiple"
                                  value={Object.keys(topLevelValue as any)
                                    .map(phase => `${topLevelKey}-${phase}`)
                                    .filter(key => openPhases.has(key))
                                  }
                                  onValueChange={(values) => {
                                    const newOpenPhases = new Set(values);
                                    setOpenPhases(prev => {
                                      const updated = new Set(prev);
                                      // Remove all phases for this space
                                      Object.keys(topLevelValue as any).forEach(phase => {
                                        updated.delete(`${topLevelKey}-${phase}`);
                                      });
                                      // Add back the ones that should be open
                                      newOpenPhases.forEach(key => {
                                        if (key.startsWith(`${topLevelKey}-`)) {
                                          updated.add(key);
                                        }
                                      });
                                      return updated;
                                    });
                                  }}
                                  className="w-full"
                                >
                                  {Object.entries(topLevelValue as any).map(([phase, phaseValue]) => {
                                    const phaseOperations = Object.entries(phaseValue as any);
                                    const hasSteps = phaseOperations.some(([_, opSteps]) => 
                                      Array.isArray(opSteps) && opSteps.length > 0
                                    );
                                    
                                    if (!hasSteps) return null;
                                    
                                    const phaseKey = `${topLevelKey}-${phase}`;
                                    const isPhaseCompleted = completedPhases.has(phaseKey);
                                    const isPhaseInProgress = inProgressPhase === phaseKey;
                                    
                                    return (
                                      <AccordionItem key={phaseKey} value={phaseKey} className="border-none ml-2">
                                        <AccordionTrigger 
                                          className={`py-2 px-0 hover:no-underline text-xs font-semibold text-foreground ${
                                            isPhaseCompleted
                                              ? 'bg-success/12 border-success/35 rounded px-2'
                                              : isPhaseInProgress
                                              ? 'bg-warning-soft/15 border-warning-soft/40 rounded px-2'
                                              : ''
                                          }`}
                                        >
                                          <span className="inline-flex items-center gap-1">
                                            {isPhaseCompleted && (
                                              <CheckCircle className="w-3 h-3 text-success flex-shrink-0" />
                                            )}
                                            <span>{phase}</span>
                                          </span>
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-1 pb-2">
                                          <Accordion 
                                            type="multiple"
                                            value={phaseOperations
                                              .map(([operation]) => `${topLevelKey}-${phase}-${operation}`)
                                              .filter(key => openOperations.has(key))
                                            }
                                            onValueChange={(values) => {
                                              const newOpenOps = new Set(values);
                                              setOpenOperations(prev => {
                                                const updated = new Set(prev);
                                                phaseOperations.forEach(([op]) => {
                                                  updated.delete(`${topLevelKey}-${phase}-${op}`);
                                                });
                                                newOpenOps.forEach(key => {
                                                  if (key.startsWith(`${topLevelKey}-${phase}-`)) {
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
                                              const operationKey = `${topLevelKey}-${phase}-${operation}`;
                                              const isOperationCompleted = completedOperations.has(operationKey);
                                              const isOperationInProgress = inProgressOperation === operationKey;
                                              
                                              return (
                                                <AccordionItem 
                                                  key={operationKey} 
                                                  value={operationKey}
                                                  className="border-none ml-2"
                                                >
                                                  <AccordionTrigger 
                                                    className={`py-1 px-0 hover:no-underline text-xs font-medium text-foreground ${
                                                      isOperationCompleted
                                                        ? 'bg-success/12 border-success/35 rounded px-2'
                                                        : isOperationInProgress
                                                        ? 'bg-warning-soft/15 border-warning-soft/40 rounded px-2'
                                                        : ''
                                                    }`}
                                                  >
                                                    <span className="inline-flex items-center gap-1">
                                                      {isOperationCompleted && (
                                                        <CheckCircle className="w-3 h-3 text-success flex-shrink-0" />
                                                      )}
                                                      <span>{operation}</span>
                                                    </span>
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
                                                            className={`p-2 rounded text-xs cursor-pointer transition-fast border text-foreground ${
                                                              step.id === currentStep?.id 
                                                                ? 'bg-primary/10 border-primary/20' 
                                                                : isStepCompleted
                                                                ? 'bg-success/12 border-success/35' 
                                                                : isStepInProgress
                                                                ? 'bg-warning-soft/15 border-warning-soft/40'
                                                                : 'hover:bg-muted/50 border-transparent hover:border-muted-foreground/20'
                                                            }`} 
                                                            onClick={() => {
                                                              if (stepIndex >= 0 && isKickoffComplete) {
                                                                onStepClick(stepIndex, step);
                                                              }
                                                            }}
                                                          >
                                                            <div className="flex items-center gap-1">
                                                              {isStepCompleted && (
                                                                <CheckCircle className="w-3 h-3 text-success flex-shrink-0" />
                                                              )}
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
                              </AccordionContent>
                            </AccordionItem>
                          );
                        } else {
                          // Regular phase: { "Phase": { "Operation": [steps] } }
                          const phaseOperations = Object.entries(topLevelValue as any);
                          const hasSteps = phaseOperations.some(([_, opSteps]) => 
                            Array.isArray(opSteps) && opSteps.length > 0
                          );
                          
                          if (!hasSteps) return null;
                          
                          const isPhaseCompleted = completedPhases.has(topLevelKey);
                          const isPhaseInProgress = inProgressPhase === topLevelKey;
                          
                          return (
                            <AccordionItem key={topLevelKey} value={topLevelKey} className="border-none">
                              <AccordionTrigger 
                                className={`py-2 px-0 hover:no-underline text-sm font-semibold text-foreground ${
                                  isPhaseCompleted
                                    ? 'bg-success/12 border-success/35 rounded px-2'
                                    : isPhaseInProgress
                                    ? 'bg-warning-soft/15 border-warning-soft/40 rounded px-2'
                                    : ''
                                }`}
                              >
                                <span className="inline-flex items-center gap-1">
                                  {isPhaseCompleted && (
                                    <CheckCircle className="w-3 h-3 text-success flex-shrink-0" />
                                  )}
                                  <span>{topLevelKey}</span>
                                </span>
                              </AccordionTrigger>
                              <AccordionContent className="pt-1 pb-2">
                                <Accordion 
                                  type="multiple"
                                  value={phaseOperations
                                    .map(([operation]) => `${topLevelKey}-${operation}`)
                                    .filter(key => openOperations.has(key))
                                  }
                                  onValueChange={(values) => {
                                    const newOpenOps = new Set(values);
                                    setOpenOperations(prev => {
                                      const updated = new Set(prev);
                                      phaseOperations.forEach(([op]) => {
                                        updated.delete(`${topLevelKey}-${op}`);
                                      });
                                      newOpenOps.forEach(key => {
                                        if (key.startsWith(`${topLevelKey}-`)) {
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
                                    const operationKey = `${topLevelKey}-${operation}`;
                                    const isOperationCompleted = completedOperations.has(operationKey);
                                    const isOperationInProgress = inProgressOperation === operationKey;
                                    
                                    return (
                                      <AccordionItem 
                                        key={operationKey} 
                                        value={operationKey}
                                        className="border-none ml-2"
                                      >
                                        <AccordionTrigger 
                                          className={`py-1 px-0 hover:no-underline text-xs font-medium text-foreground ${
                                            isOperationCompleted
                                              ? 'bg-success/12 border-success/35 rounded px-2'
                                              : isOperationInProgress
                                              ? 'bg-warning-soft/15 border-warning-soft/40 rounded px-2'
                                              : ''
                                          }`}
                                        >
                                          <span className="inline-flex items-center gap-1">
                                            {isOperationCompleted && (
                                              <CheckCircle className="w-3 h-3 text-success flex-shrink-0" />
                                            )}
                                            <span>{operation}</span>
                                          </span>
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
                                                  className={`p-2 rounded text-xs cursor-pointer transition-fast border text-foreground ${
                                                    step.id === currentStep?.id 
                                                      ? 'bg-primary/10 border-primary/20' 
                                                      : isStepCompleted
                                                      ? 'bg-success/12 border-success/35' 
                                                      : isStepInProgress
                                                      ? 'bg-warning-soft/15 border-warning-soft/40'
                                                      : 'hover:bg-muted/50 border-transparent hover:border-muted-foreground/20'
                                                  }`} 
                                                  onClick={() => {
                                                    if (stepIndex >= 0 && isKickoffComplete) {
                                                      onStepClick(stepIndex, step);
                                                    }
                                                  }}
                                                >
                                                  <div className="flex items-center gap-1">
                                                    {isStepCompleted && (
                                                      <CheckCircle className="w-3 h-3 text-success flex-shrink-0" />
                                                    )}
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
                        }
                      })}
                    </Accordion>
                  )}
                </div>
              </div>}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

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
        onPermanentOptOut={handleTutorialPermanentOptOut}
      />

      {/* Progress Reporting Style Dialog */}
      <ProgressReportingStyleDialog
        open={showProgressReportingDialog}
        onOpenChange={setShowProgressReportingDialog}
        projectRun={projectRun}
      />
    </Sidebar>;
}