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
  onPlanningWizard?: () => void; // Handler to open planning wizard
}
export const KickoffWorkflow: React.FC<KickoffWorkflowProps> = ({
  onKickoffComplete,
  onExit,
  onPlanningWizard
}) => {
  const {
    currentProjectRun,
    updateProjectRun,
    deleteProjectRun
  } = useProject();
  const { user } = useAuth();
  const { partnerAppsEnabled, expertSupportEnabled, toolRentalsEnabled } = usePartnerAppSettings();
  const [kickoffOrderResolved, setKickoffOrderResolved] = useState(false);
  const [kickoffStepOrder, setKickoffStepOrder] = useState<'profile_first' | 'match_first'>('match_first');
  const [currentKickoffStep, setCurrentKickoffStep] = useState(0);
  const [completedKickoffSteps, setCompletedKickoffSteps] = useState<Set<number>>(new Set());
  const [checkedOutputs, setCheckedOutputs] = useState<Record<string, Set<string>>>({});
  const [selectedPlanningTools, setSelectedPlanningTools] = useState<PlanningToolId[]>([]);
  // CRITICAL FIX: Use ref instead of state to avoid race conditions
  const isCompletingStepRef = useRef(false);

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
        console.error('KickoffWorkflow: could not load profile for step order', error);
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

      // Update completed kickoff steps state immediately
      const newCompletedKickoffSteps = new Set(completedKickoffSteps);
      newCompletedKickoffSteps.add(stepIndex);
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
          toolRentalsEnabled
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
      console.error("❌ Error completing kickoff step:", error);
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
        <CardContent className="p-1.5 sm:p-2 md:p-2.5">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
            <div className="flex items-center space-x-2 sm:space-x-2 md:space-x-4 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 -mx-2 sm:mx-0 px-2 sm:px-0 scrollbar-hide">
              {kickoffSteps.map((step, index) => <div key={step.id} className="flex items-center flex-shrink-0">
                  <div className={`
                    flex items-center justify-center w-8 h-8 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full border-2 transition-colors flex-shrink-0
                    ${index === currentKickoffStep ? 'border-primary bg-primary text-primary-foreground' : isStepCompleted(index) ? 'border-green-500 bg-green-500 text-white' : 'border-muted-foreground bg-background'}
                  `}>
                    {isStepCompleted(index) ? <CheckCircle className="w-4 h-4 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" /> : <span className="text-xs sm:text-xs md:text-sm font-medium">{index + 1}</span>}
                  </div>
                  <div className="ml-1.5 sm:ml-1.5 md:ml-2 hidden sm:block">
                    <p className={`text-xs sm:text-sm font-medium whitespace-nowrap ${index === currentKickoffStep ? 'text-primary' : isStepCompleted(index) ? 'text-green-700' : 'text-muted-foreground'}`}>
                      {step.title}
                    </p>
                  </div>
                  {index < kickoffSteps.length - 1 && <div className="mx-2 sm:mx-2 md:mx-4 w-4 sm:w-4 md:w-8 h-0.5 bg-muted-foreground/20 flex-shrink-0" />}
                </div>)}
            </div>

            <div className="w-full sm:w-auto">
              <div className="flex items-center justify-center gap-1.5">
                <Button variant="outline" size="sm" onClick={handlePrevious} disabled={currentKickoffStep === 0} className="flex-1 sm:flex-initial text-xs h-11 sm:h-9">
                  <ChevronLeft className="w-4 h-4 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Prev</span>
                </Button>
                <div className="min-w-[70px] px-1 text-center leading-tight">
                  <div className="text-[10px] sm:text-xs font-medium text-foreground">Step</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">
                    {currentKickoffStep + 1} of {kickoffSteps.length}
                  </div>
                  {allKickoffStepsComplete && (
                    <CheckCircle className="mx-auto mt-0.5 h-3.5 w-3.5 text-green-500" aria-label="Kickoff complete" />
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={handleNext} disabled={currentKickoffStep === kickoffSteps.length - 1} className="flex-1 sm:flex-initial text-xs h-11 sm:h-9">
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="w-4 h-4 sm:w-4 sm:h-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Purpose Sub-header - white box like project kickoff header */}
      {currentStepPurpose && (
        <Card className="shrink-0">
          <CardContent className="p-2 sm:p-3 flex flex-row items-center justify-between gap-2">
            <h2 className="min-w-0 flex-1 break-words pr-2 text-base font-semibold sm:text-lg">
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

      {/* Step body: mobile = internal scroll + pinned actions; desktop = page scroll */}
      <div className="flex min-h-0 flex-1 flex-col md:min-h-[min(520px,70vh)]">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] -mx-2 px-2 pb-2 sm:mx-0 sm:px-0 sm:pb-4 md:flex-none md:overflow-visible md:pb-0">
          {renderCurrentStep()}
        </div>
        <div className="mt-2 shrink-0 border-t bg-background px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:mt-4 sm:px-0 sm:pb-2 sm:pt-4">
          <Card>
            <CardContent className="p-2.5 sm:p-4">
              {!isStepCompleted(currentKickoffStep) ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:items-stretch sm:gap-3">
                  {/* Row 1 / left col: secondary; row 2 / right col: Continue — same slot every step */}
                  <div className="flex flex-col sm:col-start-1 sm:row-start-1">
                    {currentStepId === 'kickoff-step-1' ? (
                      <Button 
                        onClick={async () => {
                          if (currentProjectRun) {
                            await deleteProjectRun(currentProjectRun.id);
                            toast.success('Project removed');
                            if (onExit) onExit();
                          }
                        }} 
                        variant="outline"
                        size="lg"
                        className="w-full min-h-[48px] border-red-300 text-red-700 hover:bg-red-50 text-xs sm:text-sm px-2"
                      >
                        <ArrowLeft className="w-4 h-4 mr-1.5 sm:mr-2 shrink-0" />
                        <span className="hidden sm:inline sm:text-left sm:leading-tight">Not a match -<br />take me back to catalog</span>
                        <span className="sm:hidden">Not a match — back</span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        className="w-full min-h-[48px] border-muted-foreground/40 text-muted-foreground hover:bg-muted/40 text-xs sm:text-sm px-2"
                        onClick={() => {
                          onKickoffComplete();
                        }}
                      >
                        <span className="hidden sm:inline">Skip direct to project workflow</span>
                        <span className="sm:hidden">Skip to workflow</span>
                      </Button>
                    )}
                  </div>
                  <Button 
                    onClick={async () => {
                      if (currentStepId === 'kickoff-step-3' && (window as any).__projectProfileStepSave) {
                        try {
                          await (window as any).__projectProfileStepSave();
                          await new Promise(resolve => setTimeout(resolve, 100));
                          await handleStepComplete(currentKickoffStep);
                          return;
                        } catch (error) {
                          console.error('❌ KickoffWorkflow: Error saving project profile:', error);
                          toast.error('Failed to save project profile. Please try again.');
                          return;
                        }
                      }

                      if (currentStepId === 'kickoff-step-4') {
                        await handleStepComplete(currentKickoffStep, selectedPlanningTools);
                        if (onPlanningWizard) {
                          onPlanningWizard();
                        }
                        return;
                      }
                      
                      handleStepComplete(currentKickoffStep);
                    }} 
                    size="lg"
                    className="w-full min-h-[48px] bg-green-600 hover:bg-green-700 text-sm px-3 sm:col-start-2 sm:row-start-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 shrink-0" />
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
                  </Button>
                </div>
              ) : (
                <div className="w-full p-2 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-green-800 text-xs sm:text-sm">Step Completed ✓</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
