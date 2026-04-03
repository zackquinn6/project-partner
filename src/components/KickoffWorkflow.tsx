import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CheckCircle, ArrowLeft } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useProject } from '@/contexts/ProjectContext';
import { DIYProfileStep } from './KickoffSteps/DIYProfileStep';
import { ProjectOverviewStep } from './KickoffSteps/ProjectOverviewStep';
import { ProjectProfileStep } from './KickoffSteps/ProjectProfileStep';
import {
  ProjectToolsStep,
  PLANNING_TOOLS,
  type PlanningToolId,
  filterByPartnerAvailability,
  DEFAULT_PLANNING_TOOLS_SELECTION,
} from './KickoffSteps/ProjectToolsStep';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePartnerAppSettings } from '@/hooks/usePartnerAppSettings';
import { parseCustomizationDecisions } from '@/utils/customizationDecisions';
import { ProjectPlanningCountdownBanner } from '@/components/ProjectPlanningCountdownBanner';
import type { ProjectRun } from '@/interfaces/ProjectRun';
import { reportUserFacingError } from '@/utils/errorReporting';

/** Passed when finishing kickoff on step 4 so UserView does not use a stale customization_decisions closure. */
export type KickoffCompletePersist = {
  customization_decisions: ProjectRun['customization_decisions'];
};

const KICKOFF_STEP_DEFINITIONS: { id: string; title: string; description: string }[] = [
  {
    id: 'kickoff-step-1',
    title: 'Project Match',
    description: 'Review and customize your project details',
  },
  {
    id: 'kickoff-step-2',
    title: 'Personalize',
    description: 'Complete your DIY profile for personalized guidance',
  },
  {
    id: 'kickoff-step-3',
    title: 'Goals',
    description: 'Set your project name, home, and initial goals',
  },
  {
    id: 'kickoff-step-4',
    title: 'Workflow Setup',
    description: 'Choose which planning tools to use',
  },
];

interface KickoffWorkflowProps {
  onKickoffComplete: (persist?: KickoffCompletePersist) => void | Promise<void>;
  onExit?: () => void; // Add optional exit handler
  /**
   * Called synchronously immediately before the final DB save that marks all kickoff steps complete.
   * Use this to open the planning wizard so a render never sees kickoff-complete with the wizard still closed.
   */
  onBeforeFinalKickoffPersistence?: () => void;
}
export const KickoffWorkflow: React.FC<KickoffWorkflowProps> = ({
  onKickoffComplete,
  onExit,
  onBeforeFinalKickoffPersistence,
}) => {
  const {
    currentProjectRun,
    updateProjectRun,
    deleteProjectRun
  } = useProject();
  const { user } = useAuth();
  const { partnerAppsEnabled, expertSupportEnabled, toolRentalsEnabled, wasteRemovalEnabled } = usePartnerAppSettings();
  const [kickoffOrderResolved, setKickoffOrderResolved] = useState(false);
  const [kickoffStepOrder, setKickoffStepOrder] = useState<'profile_first' | 'match_first'>('match_first');
  const [currentKickoffStep, setCurrentKickoffStep] = useState(0);
  const [completedKickoffSteps, setCompletedKickoffSteps] = useState<Set<number>>(new Set());
  const [checkedOutputs, setCheckedOutputs] = useState<Record<string, Set<string>>>({});
  const [selectedPlanningTools, setSelectedPlanningTools] = useState<PlanningToolId[]>([]);
  // CRITICAL FIX: Use ref instead of state to avoid race conditions
  const isCompletingStepRef = useRef(false);
  const kickoffStepNavRef = useRef<HTMLDivElement | null>(null);

  const scrollKickoffStepNav = (direction: 'left' | 'right') => {
    const el = kickoffStepNavRef.current;
    if (!el) return;
    const amount = Math.max(160, Math.floor(el.clientWidth * 0.9));
    el.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  const kickoffSteps = useMemo(() => {
    const copy = KICKOFF_STEP_DEFINITIONS.map((s) => ({ ...s }));
    if (kickoffStepOrder === 'profile_first') {
      return [copy[1], copy[0], copy[2], copy[3]];
    }
    return copy;
  }, [kickoffStepOrder]);

  useEffect(() => {
    if (!currentProjectRun?.id) {
      setKickoffOrderResolved(true);
      setKickoffStepOrder('match_first');
      return;
    }
    if (!user?.id) {
      setKickoffOrderResolved(true);
      setKickoffStepOrder('match_first');
      return;
    }
    let cancelled = false;
    setKickoffOrderResolved(false);
    (async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('survey_completed_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        await reportUserFacingError({
          source: 'kickoff',
          operation: 'load_step_order_profile',
          userId: user.id,
          projectRunId: currentProjectRun.id,
          error,
          userMessage: 'Failed to load kickoff setup.',
          notificationTitle: 'Kickoff profile load failed',
        });
        setKickoffStepOrder('match_first');
        setKickoffOrderResolved(true);
        return;
      }
      const profileDone = Boolean(data?.survey_completed_at);
      setKickoffStepOrder(profileDone ? 'match_first' : 'profile_first');
      setKickoffOrderResolved(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentProjectRun?.id, user?.id]);

  // Initialize completed steps from project run data - ONLY on mount or when project changes
  useEffect(() => {
    if (!kickoffOrderResolved) return;
    // Don't overwrite state during step completion
    if (isCompletingStepRef.current) {
      return;
    }
    if (currentProjectRun?.completedSteps) {
      const completedIndices = new Set<number>();
      const stepIdsInDisplayOrder = kickoffSteps.map((s) => s.id);

      stepIdsInDisplayOrder.forEach((stepId, index) => {
        const isKickoffStepComplete = currentProjectRun.completedSteps.includes(stepId);
        if (isKickoffStepComplete) {
          completedIndices.add(index);
        }
      });
      setCompletedKickoffSteps(completedIndices);

      if (completedIndices.size < kickoffSteps.length) {
        const firstIncomplete = kickoffSteps.findIndex((_, index) => !completedIndices.has(index));
        if (firstIncomplete !== -1) {
          setCurrentKickoffStep(firstIncomplete);
        }
      }
    }
  }, [currentProjectRun?.id, kickoffOrderResolved, kickoffSteps, kickoffStepOrder]);

  const handleStepComplete = async (stepIndex: number, selectedTools?: PlanningToolId[]) => {
    if (!currentProjectRun) {
      console.error("❌ handleStepComplete: currentProjectRun is null/undefined!");
      return;
    }

    // Set flag to prevent useEffect from overwriting during completion
    isCompletingStepRef.current = true;
    try {
      const stepId = kickoffSteps[stepIndex].id;
      const newCompletedSteps = [...(currentProjectRun.completedSteps || [])];

      // Resolve workflow step by stable kickoff id (display order may swap steps 1 and 2)
      const kickoffPhase = currentProjectRun.phases.find(p => p.name === 'Kickoff');
      let actualStepId = stepId;
      if (kickoffPhase?.operations?.length) {
        const allKickoffSteps = kickoffPhase.operations.flatMap(op => op.steps || []);
        const matched = allKickoffSteps.find(s => s.id === stepId);
        if (matched) {
          actualStepId = matched.id;
        }
      }

      // Add both the kickoff step ID and the actual workflow step ID
      if (!newCompletedSteps.includes(stepId)) {
        newCompletedSteps.push(stepId);
      }
      if (actualStepId !== stepId && !newCompletedSteps.includes(actualStepId)) {
        newCompletedSteps.push(actualStepId);
      }

      // Derive UI completion from the list we are about to persist — not from React state, which can be stale
      // when users advance quickly and would otherwise leave finishingEntireKickoff false after the last step.
      const pendingCompletedIds = new Set(newCompletedSteps);
      const newCompletedKickoffSteps = new Set<number>();
      kickoffSteps.forEach((s, idx) => {
        if (pendingCompletedIds.has(s.id)) {
          newCompletedKickoffSteps.add(idx);
        }
      });
      setCompletedKickoffSteps(newCompletedKickoffSteps);

      // CRITICAL: Fetch initial_budget, initial_timeline, initial_sizing directly from database
      // This ensures we get the latest values that were just saved by ProjectProfileStep
      // The context might not be updated yet, so we fetch from the source of truth
      const { data: freshRun, error: fetchError } = await supabase
        .from('project_runs')
        .select('initial_budget, initial_timeline, initial_sizing')
        .eq('id', currentProjectRun.id)
        .single();
      
      const preservedBudget = freshRun?.initial_budget ?? (currentProjectRun as any)?.initial_budget ?? (currentProjectRun as any)?.initialBudget ?? null;
      const preservedTimeline = freshRun?.initial_timeline ?? (currentProjectRun as any)?.initial_timeline ?? (currentProjectRun as any)?.initialTimeline ?? null;
      const preservedSizing = freshRun?.initial_sizing ?? (currentProjectRun as any)?.initial_sizing ?? (currentProjectRun as any)?.initialSizing ?? null;

      // Step 4: persist planning tools the user sees (parent state can be [] until ProjectToolsStep syncs).
      const existingDecisions = parseCustomizationDecisions(currentProjectRun.customization_decisions);
      let customization_decisions: typeof currentProjectRun.customization_decisions =
        currentProjectRun.customization_decisions;
      if (stepId === 'kickoff-step-4') {
        let tools: PlanningToolId[] | undefined = Array.isArray(selectedTools) ? selectedTools : undefined;
        if (!tools || tools.length === 0) {
          const persisted = existingDecisions.selected_planning_tools;
          if (Array.isArray(persisted) && persisted.length > 0) {
            tools = persisted as PlanningToolId[];
          } else {
            tools = [...DEFAULT_PLANNING_TOOLS_SELECTION];
          }
        }
        const normalized = filterByPartnerAvailability(
          tools,
          partnerAppsEnabled,
          expertSupportEnabled,
          toolRentalsEnabled,
          wasteRemovalEnabled
        );
        customization_decisions = { ...existingDecisions, selected_planning_tools: normalized };
      }

      // Update project run with completed step - WAIT for completion
      const updatedProjectRun = {
        ...currentProjectRun,
        completedSteps: newCompletedSteps,
        progress: Math.round(newCompletedSteps.length / getTotalStepsCount() * 100),
        // CRITICAL: Always include initial_budget, initial_timeline, initial_sizing (even if null)
        initial_budget: preservedBudget,
        initial_timeline: preservedTimeline,
        initial_sizing: preservedSizing,
        ...(customization_decisions !== undefined && { customization_decisions }),
        updatedAt: new Date()
      };

      const finishingEntireKickoff = newCompletedKickoffSteps.size === kickoffSteps.length;
      const kickoffUiIds = [
        'kickoff-step-1',
        'kickoff-step-2',
        'kickoff-step-3',
        'kickoff-step-4',
      ] as const;
      const allKickoffUiPresent = kickoffUiIds.every((id) => newCompletedSteps.includes(id));
      if (finishingEntireKickoff && allKickoffUiPresent) {
        onBeforeFinalKickoffPersistence?.();
      }

      // Wait for database update to complete
      await updateProjectRun(updatedProjectRun);

      // Check if all kickoff steps are complete
      if (newCompletedKickoffSteps.size === kickoffSteps.length) {
        // DEFENSIVE CHECK: Verify all 4 UI kickoff step IDs are in database
        const kickoffStepIds = ['kickoff-step-1', 'kickoff-step-2', 'kickoff-step-3', 'kickoff-step-4'];
        const allIdsPresent = kickoffStepIds.every(id => newCompletedSteps.includes(id));
        if (!allIdsPresent) {
          console.error('❌ Not all kickoff step IDs present in database:', {
            expected: kickoffStepIds,
            actual: newCompletedSteps.filter(id => kickoffStepIds.includes(id))
          });
          toast.error('Error: Kickoff steps not properly saved');
          isCompletingStepRef.current = false;
          return;
        }

        await Promise.resolve(
          onKickoffComplete(
            stepId === 'kickoff-step-4'
              ? {
                  customization_decisions: customization_decisions as ProjectRun['customization_decisions'],
                }
              : undefined
          )
        );
        isCompletingStepRef.current = false;
      } else {
        // Move to next step if not already there
        if (stepIndex === currentKickoffStep && stepIndex < kickoffSteps.length - 1) {
          setCurrentKickoffStep(stepIndex + 1);
        }
        // Clear flag after short delay
        setTimeout(() => {
          isCompletingStepRef.current = false;
        }, 200);
      }
    } catch (error) {
      await reportUserFacingError({
        source: 'kickoff',
        operation: 'complete_kickoff_step',
        userId: user?.id,
        projectRunId: currentProjectRun.id,
        stepId: kickoffSteps[stepIndex]?.id ?? null,
        error,
        userMessage: 'Failed to save kickoff progress.',
        notificationTitle: 'Kickoff step save failed',
      });
      // Clear flag on error
      isCompletingStepRef.current = false;
    }
  };
  const getTotalStepsCount = () => {
    if (!currentProjectRun) return kickoffSteps.length;
    return currentProjectRun.phases.reduce((total, phase) => {
      return total + phase.operations.reduce((opTotal, operation) => {
        return opTotal + operation.steps.length;
      }, 0);
    }, 0);
  };

  const currentStepId = kickoffSteps[currentKickoffStep]?.id;

  const currentStepPurpose = (() => {
    switch (currentStepId) {
      case 'kickoff-step-1':
        return "Let's make sure this project is a great fit";
      case 'kickoff-step-2':
        return 'Personalize the project to your unique DIY experience level and preferences';
      case 'kickoff-step-3':
        return 'Complete initial customization to your unique project';
      case 'kickoff-step-4':
        return 'Equip your project with the right planning tools';
      default:
        return '';
    }
  })();
  const handleNext = () => {
    if (currentKickoffStep < kickoffSteps.length - 1) {
      setCurrentKickoffStep(currentKickoffStep + 1);
    }
  };
  const handlePrevious = () => {
    if (currentKickoffStep > 0) {
      setCurrentKickoffStep(currentKickoffStep - 1);
    }
  };
  const isStepCompleted = (stepIndex: number) => completedKickoffSteps.has(stepIndex);
  const allKickoffStepsComplete = completedKickoffSteps.size === kickoffSteps.length;

  const goToKickoffStep = (index: number) => {
    if (index < 0 || index >= kickoffSteps.length) return;
    setCurrentKickoffStep(index);
  };
  const handleOutputToggle = (stepId: string, outputId: string) => {
    setCheckedOutputs(prev => {
      const stepOutputs = new Set(prev[stepId] || []);
      if (stepOutputs.has(outputId)) {
        stepOutputs.delete(outputId);
      } else {
        stepOutputs.add(outputId);
      }
      return {
        ...prev,
        [stepId]: stepOutputs
      };
    });
  };
  const renderCurrentStep = () => {
    const stepIndex = currentKickoffStep;
    const stepProps = {
      onComplete: () => {
        handleStepComplete(stepIndex);
      },
      isCompleted: isStepCompleted(currentKickoffStep),
      checkedOutputs: checkedOutputs[kickoffSteps[currentKickoffStep].id] || new Set(),
      onOutputToggle: (outputId: string) => handleOutputToggle(kickoffSteps[currentKickoffStep].id, outputId)
    };
    const existingDecisions = parseCustomizationDecisions(currentProjectRun?.customization_decisions);
    const initialTools = (existingDecisions.selected_planning_tools as PlanningToolId[] | undefined) || [];

    switch (kickoffSteps[currentKickoffStep]?.id) {
      case 'kickoff-step-1':
        return <ProjectOverviewStep {...stepProps} />;
      case 'kickoff-step-2':
        return <DIYProfileStep {...stepProps} />;
      case 'kickoff-step-3':
        return <ProjectProfileStep {...stepProps} />;
      case 'kickoff-step-4':
        return (
          <ProjectToolsStep
            {...stepProps}
            compact
            onComplete={() => handleStepComplete(currentKickoffStep, selectedPlanningTools)}
            initialSelected={initialTools}
            onSelectionChange={setSelectedPlanningTools}
          />
        );
      default:
        return null;
    }
  };

  if (!currentProjectRun) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">No project selected</CardContent>
        </Card>
      </div>
    );
  }

  if (!kickoffOrderResolved) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Loading kickoff…</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-2 overflow-hidden p-2 sm:gap-3 sm:p-3 md:h-auto md:overflow-visible">
      <ProjectPlanningCountdownBanner
        minimal
        projectCreatedAt={currentProjectRun.createdAt}
        className="shrink-0"
      />
      {/* Step Navigation (no separate project-name header) */}
      <Card className="shrink-0">
        <CardContent className="p-2 sm:p-2.5 md:p-3">
          {/* Mobile: one row — prev arrow | compact steps | next arrow | step x/y */}
          <div className="flex items-center gap-1 sm:hidden">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handlePrevious}
              disabled={currentKickoffStep === 0}
              aria-label="Previous step"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="scrollbar-hide flex min-w-0 flex-1 items-center justify-center gap-0 overflow-x-auto py-0.5">
              {kickoffSteps.map((step, index) => (
                <React.Fragment key={step.id}>
                  {index > 0 ? (
                    <div className="h-px w-1 shrink-0 bg-muted-foreground/30" aria-hidden />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => goToKickoffStep(index)}
                    aria-label={`${step.title}, step ${index + 1}`}
                    aria-current={index === currentKickoffStep ? 'step' : undefined}
                    className={`
                      flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1
                      ${
                        index === currentKickoffStep
                          ? 'border-primary bg-primary text-primary-foreground'
                          : isStepCompleted(index)
                            ? 'border-green-500 bg-green-500 text-white'
                            : 'border-muted-foreground bg-background'
                      }
                    `}
                  >
                    {isStepCompleted(index) ? (
                      <CheckCircle className="h-3 w-3" aria-hidden />
                    ) : (
                      <span className="text-[10px] font-semibold">{index + 1}</span>
                    )}
                  </button>
                </React.Fragment>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleNext}
              disabled={currentKickoffStep === kickoffSteps.length - 1}
              aria-label="Next step"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="shrink-0 text-center leading-none tabular-nums">
              <div className="text-[10px] font-medium text-muted-foreground">
                {currentKickoffStep + 1}/{kickoffSteps.length}
              </div>
              {allKickoffStepsComplete ? (
                <CheckCircle className="mx-auto mt-0.5 h-3 w-3 text-green-500" aria-label="Kickoff complete" />
              ) : null}
            </div>
          </div>

          {/* sm+: original layout with step titles + scroll affordance */}
          <div className="hidden flex-col gap-1.5 sm:flex sm:flex-row sm:items-center sm:justify-between sm:gap-2">
            <div className="flex min-w-0 flex-1 items-start gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="mt-0.5 h-9 w-9 shrink-0 md:hidden"
                onClick={() => scrollKickoffStepNav('left')}
                aria-label="Scroll steps left"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div
                ref={kickoffStepNavRef}
                className="scrollbar-hide flex min-w-0 flex-1 items-start overflow-x-auto px-0.5 pb-1 md:overflow-visible md:px-1 md:pb-0"
              >
                {kickoffSteps.map((step, index) => (
                  <React.Fragment key={step.id}>
                    {index > 0 ? (
                      <div
                        className="mt-[13px] h-0.5 w-1 shrink-0 self-start bg-muted-foreground/25 md:mt-[15px] md:w-1.5"
                        aria-hidden
                      />
                    ) : null}
                    <div className="flex min-w-[4.25rem] flex-1 basis-0 flex-col items-center px-0.5 md:min-w-[5rem]">
                      <button
                        type="button"
                        onClick={() => goToKickoffStep(index)}
                        aria-label={`Go to ${step.title}, step ${index + 1}`}
                        aria-current={index === currentKickoffStep ? 'step' : undefined}
                        className={`
                          flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-8 md:w-8
                          ${
                            index === currentKickoffStep
                              ? 'border-primary bg-primary text-primary-foreground'
                              : isStepCompleted(index)
                                ? 'border-green-500 bg-green-500 text-white'
                                : 'border-muted-foreground bg-background'
                          }
                        `}
                      >
                        {isStepCompleted(index) ? (
                          <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden />
                        ) : (
                          <span className="text-[11px] font-medium md:text-sm">{index + 1}</span>
                        )}
                      </button>
                      <p
                        className={`mt-1 w-full text-center text-[9px] font-medium leading-tight md:text-xs break-normal [overflow-wrap:normal] [word-break:normal] ${
                          index === currentKickoffStep
                            ? 'text-primary'
                            : isStepCompleted(index)
                              ? 'text-green-700 dark:text-green-400'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {step.title}
                      </p>
                    </div>
                  </React.Fragment>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="mt-0.5 h-9 w-9 shrink-0 md:hidden"
                onClick={() => scrollKickoffStepNav('right')}
                aria-label="Scroll steps right"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex w-full flex-col gap-2 md:w-auto">
              <div className="flex w-full items-center justify-center gap-1.5 md:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={currentKickoffStep === 0}
                  className="h-9 w-9 shrink-0 p-0 md:h-9 md:w-auto md:px-3"
                  aria-label="Previous step"
                >
                  <ChevronLeft className="h-4 w-4 md:mr-1" />
                  <span className="hidden md:inline">Previous</span>
                </Button>
                <div className="min-w-[70px] px-1 text-center leading-tight">
                  <div className="text-[10px] font-medium text-foreground md:text-xs">Step</div>
                  <div className="text-[10px] text-muted-foreground md:text-xs">
                    {currentKickoffStep + 1} of {kickoffSteps.length}
                  </div>
                  {allKickoffStepsComplete && (
                    <CheckCircle className="mx-auto mt-0.5 h-3.5 w-3.5 text-green-500" aria-label="Kickoff complete" />
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={currentKickoffStep === kickoffSteps.length - 1}
                  className="h-9 w-9 shrink-0 p-0 md:h-9 md:w-auto md:px-3"
                  aria-label="Next step"
                >
                  <span className="hidden md:inline md:mr-1">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Purpose Sub-header - white box like project kickoff header */}
      {currentStepPurpose && (
        <Card className="shrink-0">
          <CardContent className="flex flex-row items-center justify-between gap-2 px-2 py-1.5 sm:px-3 sm:py-2">
            <h2 className="min-w-0 flex-1 break-words pr-2 text-base font-semibold leading-snug sm:text-lg">
              {currentStepPurpose}
            </h2>
            {currentStepId === 'kickoff-step-1' && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary underline decoration-dotted hover:opacity-80 inline-flex items-center gap-1 shrink-0 cursor-help"
                      aria-label="What is a good fit?"
                    >
                      What is a good fit?
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs z-[100]" sideOffset={8}>
                    <p className="text-sm">A good fit means the project matches your goals, timeline, and skill level. Check the overview, estimated time, and challenges—if they align with what you want to take on, it&apos;s a good fit. You can always adjust scope and schedule later.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </CardContent>
        </Card>
      )}

      {/* Primary actions: fixed slot below purpose so Continue / Not a match stay in the same place every step */}
      <Card className="shrink-0">
        <CardContent className="p-2.5 sm:p-4">
          {!isStepCompleted(currentKickoffStep) ? (
            <div className="flex min-h-[3rem] flex-col gap-2 sm:min-h-[3.25rem] sm:flex-row sm:items-stretch sm:gap-3">
              <div className="flex min-h-12 min-w-0 flex-1 flex-col justify-center sm:min-h-[3.25rem]">
                {currentStepId === 'kickoff-step-1' ? (
                  <Button
                    onClick={async () => {
                      if (currentProjectRun) {
                        await deleteProjectRun(currentProjectRun.id);
                                                if (onExit) onExit();
                      }
                    }}
                    variant="outline"
                    size="lg"
                    className="h-12 min-h-12 w-full border-red-300 px-3 text-sm text-red-700 hover:bg-red-50 sm:h-full sm:min-h-[3.25rem] sm:py-3"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4 shrink-0" />
                    <span className="text-left leading-tight sm:line-clamp-2">
                      <span className="hidden sm:inline">Not a match — back to catalog</span>
                      <span className="sm:hidden">Not a match — back</span>
                    </span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-12 min-h-12 w-full border-muted-foreground/40 px-3 text-sm text-muted-foreground hover:bg-muted/40 sm:h-full sm:min-h-[3.25rem] sm:py-3"
                    onClick={() => {
                      onKickoffComplete();
                    }}
                  >
                    <span className="text-left leading-tight sm:line-clamp-2">
                      <span className="hidden sm:inline">Skip direct to project workflow</span>
                      <span className="sm:hidden">Skip to workflow</span>
                    </span>
                  </Button>
                )}
              </div>
              <div className="flex w-full shrink-0 flex-col sm:w-[17.5rem] sm:min-h-[3.25rem]">
                <Button
                  onClick={async () => {
                    if (currentStepId === 'kickoff-step-3' && (window as any).__projectProfileStepSave) {
                      try {
                        await (window as any).__projectProfileStepSave();
                        await new Promise(resolve => setTimeout(resolve, 100));
                        await handleStepComplete(currentKickoffStep);
                        return;
                      } catch (error) {
                        await reportUserFacingError({
                          source: 'kickoff',
                          operation: 'save_project_profile_step',
                          userId: user?.id,
                          projectRunId: currentProjectRun?.id,
                          stepId: currentStepId,
                          error,
                          userMessage: 'Failed to save project profile.',
                          notificationTitle: 'Kickoff project profile save failed',
                        });
                        return;
                      }
                    }

                    if (currentStepId === 'kickoff-step-4') {
                      await handleStepComplete(currentKickoffStep, selectedPlanningTools);
                      return;
                    }

                    handleStepComplete(currentKickoffStep);
                  }}
                  size="lg"
                  className="h-12 min-h-12 w-full bg-green-600 px-3 text-sm hover:bg-green-700 sm:h-full sm:min-h-[3.25rem] sm:py-3"
                >
                  <CheckCircle className="mr-2 h-4 w-4 shrink-0" />
                  <span className="text-left leading-tight sm:line-clamp-2">
                    {currentStepId === 'kickoff-step-3' ? (
                      <>
                        <span className="hidden sm:inline">Continue to Workflow Setup</span>
                        <span className="sm:hidden">Continue</span>
                      </>
                    ) : currentStepId === 'kickoff-step-4' ? (
                      <>
                        <span className="hidden sm:inline">Complete & Start Planning</span>
                        <span className="sm:hidden">Complete</span>
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Complete & Continue</span>
                        <span className="sm:hidden">Continue</span>
                      </>
                    )}
                  </span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[3rem] items-center justify-center rounded-lg border border-green-200 bg-green-50 p-2 sm:min-h-[3.25rem] sm:p-3">
              <p className="text-sm text-green-800">Step Completed ✓</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step body: scrollable content only; actions stay above */}
      <div className="flex min-h-0 flex-1 flex-col md:min-h-[min(560px,70vh)]">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] -mx-2 px-2 pb-2 sm:mx-0 sm:px-0 sm:pb-4 md:flex-none md:overflow-visible md:pb-0">
          {renderCurrentStep()}
        </div>
      </div>
    </div>
  );
};
