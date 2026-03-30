import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { ChevronLeft, ChevronRight, CheckCircle, Settings2, Trash2 } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { PLANNING_TOOLS } from './KickoffSteps/ProjectToolsStep';
import type { PlanningToolId } from './KickoffSteps/ProjectToolsStep';
import { CustomizationStep } from './PlanningWizardSteps/CustomizationStep';
import { ScheduleStep } from './PlanningWizardSteps/ScheduleStep';
import { UncertaintyStep } from './PlanningWizardSteps/UncertaintyStep';
import { BudgetStep } from './PlanningWizardSteps/BudgetStep';
import { ShoppingStep } from './PlanningWizardSteps/ShoppingStep';
import { ToolRentalsStep } from './PlanningWizardSteps/ToolRentalsStep';
import { QualityControlStep } from './PlanningWizardSteps/QualityControlStep';
import { ExpertSupportStep } from './PlanningWizardSteps/ExpertSupportStep';
import { CommunicationPlanStep } from './PlanningWizardSteps/CommunicationPlanStep';
import { usePartnerAppSettings } from '@/hooks/usePartnerAppSettings';
import { parseCustomizationDecisions } from '@/utils/customizationDecisions';
import { ProjectPlanningCountdownBanner } from '@/components/ProjectPlanningCountdownBanner';
import { PlanningConfirmationStep } from '@/components/PlanningWizardSteps/PlanningConfirmationStep';
import {
  PLANNING_WIZARD_OPEN_APP_BUTTON_CLASSNAME,
  PLANNING_WIZARD_STEP_BODY_CLASSNAME,
  PLANNING_WIZARD_STEP_CARD_CLASSNAME,
  PLANNING_WIZARD_STEP_CONTENT_CLASSNAME,
  PLANNING_WIZARD_STEP_DESCRIPTION_CLASSNAME,
  PLANNING_WIZARD_STEP_HEADER_CLASSNAME,
  PLANNING_WIZARD_STEP_STATUS_ROW_CLASSNAME,
  PLANNING_WIZARD_STEP_TITLE_CLASSNAME,
} from '@/components/PlanningWizardSteps/planningWizardOpenAppButton';
import type { Phase } from '@/interfaces/Project';

const WIZARD_TOOL_ORDER: PlanningToolId[] = [
  'scope',
  'schedule',
  'communication_plan',
  'risk',
  'shopping_list',
  'quality_control',
  'budget',
  'tool_rentals',
  'waste_removal',
  'expert_support',
];

interface ProjectPlanningWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoToWorkflow?: () => void;
  /** When provided, opens Project Budgeting from the Budget step without relying on window event */
  onOpenBudgeting?: () => void;
  /** When provided, opens Risk Management at the host level (avoids nested dialog) */
  onOpenRiskManagement?: () => void;
  /** Opens Quality Control with settings expanded (planning wizard quality tab). */
  onOpenQualityControl?: () => void;
  /** Opens Tool Access / rentals at host level (e.g. UserView). */
  onOpenToolRentals?: () => void;
  /** Opens Expert Support at host level (e.g. UserView). */
  onOpenExpertSupport?: () => void;
  /** Opens Communication Plan at host level (e.g. UserView). */
  onOpenCommunicationPlan?: () => void;
  /** Persist workflow step completion + outputs when the user finishes every wizard step */
  onWorkflowFullyComplete?: (selectedTools: PlanningToolId[]) => void | Promise<void>;
  /** `fullscreen` = same shell as project kickoff (desktop). `dialog` = modal (e.g. mobile). */
  layout?: 'dialog' | 'fullscreen';
}

export const ProjectPlanningWizard: React.FC<ProjectPlanningWizardProps> = ({
  open,
  onOpenChange,
  onGoToWorkflow,
  onOpenBudgeting,
  onOpenRiskManagement,
  onOpenQualityControl,
  onOpenToolRentals,
  onOpenExpertSupport,
  onOpenCommunicationPlan,
  onWorkflowFullyComplete,
  layout = 'dialog',
}) => {
  const { currentProjectRun, updateProjectRun } = useProject();
  const { partnerAppsEnabled, expertSupportEnabled, toolRentalsEnabled, wasteRemovalEnabled } = usePartnerAppSettings();
  const validToolIds = useMemo(() => new Set(PLANNING_TOOLS.map(t => t.id)), []);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  /** Final review screen after all tool steps are marked complete */
  const [wizardPhase, setWizardPhase] = useState<'steps' | 'confirm'>('steps');
  const stepNavRef = useRef<HTMLDivElement | null>(null);
  /** Local copy of selected tools so dropdown changes apply immediately without waiting for context */
  const [localSelectedTools, setLocalSelectedTools] = useState<PlanningToolId[] | null>(null);

  const selectedToolsFromContext = useMemo(() => {
    const decisions = parseCustomizationDecisions(currentProjectRun?.customization_decisions);
    const rawSelected = (decisions.selected_planning_tools as unknown as string[] | undefined) ?? [];
    const normalized = rawSelected.filter((id): id is PlanningToolId => validToolIds.has(id as any));
    return normalized.filter(id => {
      if (!partnerAppsEnabled && (id === 'expert_support' || id === 'tool_rentals' || id === 'waste_removal')) return false;
      if (id === 'expert_support' && !expertSupportEnabled) return false;
      if (id === 'tool_rentals' && !toolRentalsEnabled) return false;
      if (id === 'waste_removal' && !wasteRemovalEnabled) return false;
      return true;
    });
  }, [
    currentProjectRun?.id,
    currentProjectRun?.customization_decisions,
    partnerAppsEnabled,
    expertSupportEnabled,
    toolRentalsEnabled,
    wasteRemovalEnabled,
    validToolIds,
  ]);

  const wizardSteps = useMemo(() => {
    const selected = localSelectedTools ?? selectedToolsFromContext;
    const selectedSet = new Set(selected);
    const orderFiltered = WIZARD_TOOL_ORDER.filter(id => {
      if (!partnerAppsEnabled && (id === 'expert_support' || id === 'tool_rentals' || id === 'waste_removal')) return false;
      if (id === 'expert_support' && !expertSupportEnabled) return false;
      if (id === 'tool_rentals' && !toolRentalsEnabled) return false;
      if (id === 'waste_removal' && !wasteRemovalEnabled) return false;
      return true;
    });
    const ordered = orderFiltered.filter(id => selectedSet.has(id));
    if (ordered.length === 0) {
      return [{
        id: 'no-tools',
        toolId: null as PlanningToolId | null,
        title: 'No tools selected',
        description: 'Complete Workflow Setup (Kickoff step 4) to choose planning tools for this run.'
      }];
    }
    return ordered.map(toolId => {
      const meta = PLANNING_TOOLS.find(t => t.id === toolId);
      const title = meta?.trackerLabel ?? meta?.label ?? toolId;
      return {
        id: `planning-${toolId}`,
        toolId,
        title,
        description: meta?.benefit ?? ''
      };
    });
  }, [
    localSelectedTools,
    selectedToolsFromContext,
    partnerAppsEnabled,
    expertSupportEnabled,
    toolRentalsEnabled,
    wasteRemovalEnabled,
  ]);

  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setCompletedSteps(new Set());
      setWizardPhase('steps');
      // Do not clear localSelectedTools here: a stale full array from a prior open would paint
      // every step for one frame, then this effect nulls local state and empty context would
      // collapse the wizard. Local overrides are cleared when the dialog closes instead.
    } else {
      setLocalSelectedTools(null);
    }
  }, [open]);

  useEffect(() => {
    if (currentStep >= wizardSteps.length) {
      setCurrentStep(Math.max(0, wizardSteps.length - 1));
    }
  }, [wizardSteps.length, currentStep]);

  const handleStepComplete = (stepIndex: number) => {
    const newCompletedSteps = new Set(completedSteps);
    newCompletedSteps.add(stepIndex);
    setCompletedSteps(newCompletedSteps);
    if (stepIndex < wizardSteps.length - 1) {
      setCurrentStep(stepIndex + 1);
    } else {
      setWizardPhase('confirm');
    }
  };

  const scrollStepNav = (direction: 'left' | 'right') => {
    const el = stepNavRef.current;
    if (!el) return;
    const amount = Math.max(160, Math.floor(el.clientWidth * 0.9));
    el.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth'
    });
  };

  const handleNext = () => {
    if (wizardPhase === 'confirm') return;
    if (currentStep < wizardSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (wizardPhase === 'confirm') {
      setWizardPhase('steps');
      setCurrentStep(Math.max(0, wizardSteps.length - 1));
      return;
    }
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isStepCompleted = (stepIndex: number) => completedSteps.has(stepIndex);
  const allStepsComplete = wizardSteps.length > 0 && completedSteps.size === wizardSteps.length;
  const progress = wizardSteps.length > 0 ? completedSteps.size / wizardSteps.length * 100 : 0;
  const currentToolId = wizardSteps[currentStep]?.toolId ?? null;

  const phasesForSummary = useMemo(
    () => (Array.isArray(currentProjectRun?.phases) ? (currentProjectRun!.phases as Phase[]) : []),
    [currentProjectRun?.phases]
  );

  const effectiveSelectedTools = localSelectedTools ?? selectedToolsFromContext;

  const planningToolsForWizard = useMemo(() => {
    const orderIdx = (id: PlanningToolId) => WIZARD_TOOL_ORDER.indexOf(id);
    return PLANNING_TOOLS.filter(t => {
      if (!WIZARD_TOOL_ORDER.includes(t.id)) return false;
      if (!partnerAppsEnabled && (t.id === 'expert_support' || t.id === 'tool_rentals' || t.id === 'waste_removal')) return false;
      if (t.id === 'expert_support' && !expertSupportEnabled) return false;
      if (t.id === 'tool_rentals' && !toolRentalsEnabled) return false;
      if (t.id === 'waste_removal' && !wasteRemovalEnabled) return false;
      return true;
    }).sort((a, b) => orderIdx(a.id) - orderIdx(b.id));
  }, [partnerAppsEnabled, expertSupportEnabled, toolRentalsEnabled, wasteRemovalEnabled]);

  const handlePlanningToolToggle = useCallback(
    (toolId: PlanningToolId, checked: boolean) => {
      if (!currentProjectRun || toolId === 'scope') return;
      if (!partnerAppsEnabled && (toolId === 'expert_support' || toolId === 'tool_rentals' || toolId === 'waste_removal')) return;
      if (toolId === 'expert_support' && !expertSupportEnabled) return;
      if (toolId === 'tool_rentals' && !toolRentalsEnabled) return;
      if (toolId === 'waste_removal' && !wasteRemovalEnabled) return;
      const decisions = parseCustomizationDecisions(currentProjectRun.customization_decisions);
      // Use effective selection (local + context) so rapid toggles don't overwrite with stale context
      const effectiveSelected = localSelectedTools ?? selectedToolsFromContext;
      const currentSet = new Set(
        effectiveSelected.filter(id => validToolIds.has(id as any))
      );
      if (checked) currentSet.add(toolId);
      else currentSet.delete(toolId);
      currentSet.add('scope');
      if (!partnerAppsEnabled) {
        currentSet.delete('expert_support');
        currentSet.delete('tool_rentals');
        currentSet.delete('waste_removal');
      } else {
        if (!expertSupportEnabled) currentSet.delete('expert_support');
        if (!toolRentalsEnabled) currentSet.delete('tool_rentals');
        if (!wasteRemovalEnabled) currentSet.delete('waste_removal');
      }
      const next = Array.from(currentSet);
      setLocalSelectedTools(next);
      updateProjectRun({
        ...currentProjectRun,
        customization_decisions: { ...decisions, selected_planning_tools: next },
        updatedAt: new Date()
      });
    },
    [
      currentProjectRun,
      updateProjectRun,
      localSelectedTools,
      selectedToolsFromContext,
      validToolIds,
      partnerAppsEnabled,
      expertSupportEnabled,
      toolRentalsEnabled,
      wasteRemovalEnabled,
    ]
  );

  const renderCurrentStep = () => {
    if (wizardPhase === 'confirm') {
      return (
        <PlanningConfirmationStep
          selectedTools={effectiveSelectedTools}
          phases={phasesForSummary}
          customizationDecisionsRaw={currentProjectRun?.customization_decisions}
          initialBudget={currentProjectRun?.initial_budget}
          initialTimeline={currentProjectRun?.initial_timeline}
        />
      );
    }

    const stepProps = {
      onComplete: () => handleStepComplete(currentStep),
      isCompleted: isStepCompleted(currentStep)
    };

    if (currentToolId === null) {
      return (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              Complete Workflow Setup (Kickoff step 4) to choose planning tools for this run. Each tool becomes a step in this wizard and opens its app when you select it.
            </p>
          </CardContent>
        </Card>
      );
    }

    switch (currentToolId) {
      case 'scope':
        return <CustomizationStep {...stepProps} />;
      case 'schedule':
        return (
          <ScheduleStep
            {...stepProps}
            onNext={() => setCurrentStep(currentStep + 1)}
            onGoToWorkflow={() => {
              onOpenChange(false);
              if (onGoToWorkflow) onGoToWorkflow();
            }}
          />
        );
      case 'communication_plan':
        return (
          <CommunicationPlanStep
            {...stepProps}
            onOpenCommunicationPlan={onOpenCommunicationPlan}
          />
        );
      case 'risk':
        return <UncertaintyStep {...stepProps} onOpenRiskManagement={onOpenRiskManagement} />;
      case 'budget':
        return <BudgetStep {...stepProps} onOpenBudgeting={onOpenBudgeting} />;
      case 'shopping_list':
        return <ShoppingStep {...stepProps} />;
      case 'tool_rentals':
        return <ToolRentalsStep {...stepProps} onOpenToolRentals={onOpenToolRentals} />;
      case 'waste_removal':
        return (
          <div className="space-y-3">
            <Card className={PLANNING_WIZARD_STEP_CARD_CLASSNAME}>
              <CardHeader className={PLANNING_WIZARD_STEP_HEADER_CLASSNAME}>
                <CardTitle className={PLANNING_WIZARD_STEP_TITLE_CLASSNAME}>
                  <Trash2 className="h-5 w-5" aria-hidden />
                  Waste Removal
                  {stepProps.isCompleted && (
                    <Badge variant="secondary" className="flex-shrink-0 text-xs">
                      Complete
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className={PLANNING_WIZARD_STEP_CONTENT_CLASSNAME}>
                <div className={PLANNING_WIZARD_STEP_BODY_CLASSNAME}>
                  <p className={PLANNING_WIZARD_STEP_DESCRIPTION_CLASSNAME}>
                    Open Waste Removal to track cleanup and disposal planning for this project.
                  </p>
                  <Button
                    type="button"
                    variant="default"
                    className={PLANNING_WIZARD_OPEN_APP_BUTTON_CLASSNAME}
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent('open-app', { detail: { actionKey: 'waste-removal' } })
                      );
                      stepProps.onComplete();
                    }}
                  >
                    <Trash2 className="shrink-0" aria-hidden />
                    Open Waste Removal
                  </Button>
                  <p className={PLANNING_WIZARD_STEP_STATUS_ROW_CLASSNAME}>
                    {stepProps.isCompleted ? '✓ Waste Removal reviewed' : '\u00a0'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'quality_control':
        return (
          <QualityControlStep
            {...stepProps}
            onOpenQualityControlApp={onOpenQualityControl}
          />
        );
      case 'expert_support':
        return <ExpertSupportStep {...stepProps} onOpenExpertSupport={onOpenExpertSupport} />;
      default:
        return (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">
                Use this tool from the workflow when you reach the relevant step.
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  const currentStepPurpose =
    wizardPhase === 'confirm'
      ? 'Review your planning, then start the project or go back to make changes.'
      : wizardSteps[currentStep]?.description?.trim() ||
        wizardSteps[currentStep]?.title ||
        '';

  if (layout === 'fullscreen' && !open) {
    return null;
  }

  const shell = (
    <div className="relative mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-2 overflow-hidden px-2 pb-2 pt-11 sm:gap-3 sm:px-3 sm:pb-3 sm:pt-12 md:h-auto md:overflow-visible">
      <div className="pointer-events-none absolute right-2 top-[max(0.5rem,env(safe-area-inset-top))] z-20 sm:right-3 sm:top-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onOpenChange(false)}
          className="pointer-events-auto min-h-10 text-xs sm:min-h-9 sm:text-sm"
        >
          Close
        </Button>
      </div>

      {open && currentProjectRun ? (
        <ProjectPlanningCountdownBanner
          minimal
          projectCreatedAt={currentProjectRun.createdAt}
          className="shrink-0"
        />
      ) : null}

      {/* Step navigation — same card padding / layout rhythm as KickoffWorkflow */}
      <Card className="shrink-0">
        <CardContent className="p-1.5 sm:p-2 md:p-2.5">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
            <div className="flex min-w-0 flex-1 items-start gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="mt-0.5 h-9 w-9 shrink-0 sm:hidden"
                onClick={() => scrollStepNav('left')}
                disabled={wizardSteps.length <= 4}
                aria-label="Scroll steps left"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div
                ref={stepNavRef}
                className="scrollbar-hide flex min-w-0 flex-1 items-start overflow-x-auto px-0.5 pb-1 sm:overflow-visible sm:px-1 sm:pb-0"
              >
                {wizardSteps.map((step, index) => (
                  <React.Fragment key={step.id}>
                    {index > 0 ? (
                      <div
                        className="mt-[13px] h-0.5 w-2 shrink-0 self-start bg-muted-foreground/25 sm:mt-[15px] sm:min-w-2 sm:flex-1 sm:w-auto"
                        aria-hidden
                      />
                    ) : null}
                    <div className="flex w-11 shrink-0 flex-col items-center px-0.5 sm:w-14 md:w-[4.25rem]">
                      <div
                        className={`
                          flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors sm:h-7 sm:w-7 md:h-8 md:w-8
                          ${
                            wizardPhase === 'confirm'
                              ? 'border-green-500 bg-green-500 text-white'
                              : index === currentStep
                                ? 'border-primary bg-primary text-primary-foreground'
                                : isStepCompleted(index)
                                  ? 'border-green-500 bg-green-500 text-white'
                                  : 'border-muted-foreground bg-background'
                          }
                        `}
                      >
                        {wizardPhase === 'confirm' || isStepCompleted(index) ? (
                          <CheckCircle className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                        ) : (
                          <span className="text-[11px] font-medium sm:text-xs md:text-sm">{index + 1}</span>
                        )}
                      </div>
                      <p
                        className={`mt-1 w-full text-center text-[9px] font-medium leading-[1.15] sm:text-[10px] md:text-xs line-clamp-3 break-words hyphens-auto ${
                          wizardPhase === 'confirm'
                            ? 'text-green-700 dark:text-green-400'
                            : index === currentStep
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
                className="mt-0.5 h-9 w-9 shrink-0 sm:hidden"
                onClick={() => scrollStepNav('right')}
                disabled={wizardSteps.length <= 4}
                aria-label="Scroll steps right"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full max-w-full text-[10px] leading-tight sm:w-auto sm:text-xs"
                  >
                    <Settings2 className="mr-1 h-3.5 w-3.5 shrink-0 sm:mr-1.5 sm:h-4 sm:w-4" />
                    <span className="hidden lg:inline">Change planning tools</span>
                    <span className="inline lg:hidden">Change tools</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Planning tools for this run</DropdownMenuLabel>
                  {planningToolsForWizard.map(({ id, label }) => {
                    const isScope = id === 'scope';
                    const effectiveSelected = localSelectedTools ?? selectedToolsFromContext;
                    const checked = effectiveSelected.includes(id);
                    return (
                      <DropdownMenuCheckboxItem
                        key={id}
                        checked={checked}
                        onSelect={event => event.preventDefault()}
                        onCheckedChange={value => handlePlanningToolToggle(id, value === true)}
                        disabled={isScope}
                      >
                        {label}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="flex w-full items-center justify-center gap-1.5 sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Previous step"
                  onClick={handlePrevious}
                  disabled={wizardPhase === 'steps' && currentStep === 0}
                  className="h-9 w-9 shrink-0 p-0 lg:h-9 lg:w-auto lg:px-3 lg:flex-initial"
                >
                  <ChevronLeft className="h-4 w-4 lg:mr-1" />
                  <span className="hidden lg:inline">Previous</span>
                </Button>
                <div className="min-w-[70px] px-1 text-center leading-tight">
                  <div className="text-[10px] font-medium text-foreground sm:text-xs">
                    {wizardPhase === 'confirm' ? 'Review' : 'Step'}
                  </div>
                  <div className="text-[10px] text-muted-foreground sm:text-xs">
                    {wizardPhase === 'confirm'
                      ? 'Confirmation'
                      : `${currentStep + 1} of ${wizardSteps.length}`}
                  </div>
                  <Progress value={progress} className="mx-auto mt-1 h-1.5 w-16 sm:h-2 sm:w-20" />
                  {allStepsComplete ? (
                    <CheckCircle
                      className="mx-auto mt-0.5 h-3.5 w-3.5 text-green-500"
                      aria-label="Planning complete"
                    />
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Next step"
                  onClick={handleNext}
                  disabled={wizardPhase === 'confirm' || currentStep === wizardSteps.length - 1}
                  className="h-9 w-9 shrink-0 p-0 lg:h-9 lg:w-auto lg:px-3 lg:flex-initial"
                >
                  <span className="hidden lg:inline lg:mr-1">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step purpose — matches KickoffWorkflow purpose card */}
      {currentStepPurpose ? (
        <Card className="shrink-0">
          <CardContent className="flex flex-row items-center justify-between gap-2 p-2 sm:p-3">
            <h2 className="min-w-0 flex-1 break-words pr-2 text-base font-semibold sm:text-lg">
              {currentStepPurpose}
            </h2>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col md:min-h-[min(520px,70vh)]">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] -mx-2 px-2 pb-2 sm:mx-0 sm:px-0 sm:pb-4 md:flex-none md:overflow-visible md:pb-0">
          <div className="min-w-0">{renderCurrentStep()}</div>
        </div>
        <div className="mt-2 shrink-0 border-t bg-background px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:mt-4 sm:px-0 sm:pb-2 sm:pt-4">
          <Card>
            <CardContent className="p-2.5 sm:p-4">
              {wizardPhase === 'confirm' ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="min-h-[48px] w-full sm:w-auto sm:min-w-[140px]"
                    onClick={() => {
                      setWizardPhase('steps');
                      setCurrentStep(0);
                    }}
                  >
                    Make changes
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    className="min-h-[48px] w-full bg-green-600 px-3 text-sm hover:bg-green-700 sm:w-auto sm:min-w-[160px]"
                    onClick={async () => {
                      if (onWorkflowFullyComplete) {
                        await onWorkflowFullyComplete(effectiveSelectedTools);
                      }
                      onOpenChange(false);
                    }}
                  >
                    <CheckCircle className="mr-1.5 h-3.5 w-3.5 shrink-0 sm:mr-2 sm:h-4 sm:w-4" />
                    Start project
                  </Button>
                </div>
              ) : (
                <div className="p-2 text-center text-sm text-muted-foreground">
                  Complete all steps to finish planning
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  if (layout === 'fullscreen') {
    return (
      <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
        <span className="sr-only">Project Planning Workflow</span>
        {shell}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-[calc(100vw-1rem)] max-w-6xl flex-col gap-0 overflow-hidden border-0 p-0 sm:w-full md:h-[min(100dvh,56rem)] md:max-h-[min(100dvh,56rem)] md:max-w-6xl md:rounded-lg md:border [&>button]:hidden">
        <DialogTitle className="sr-only">Project Planning Workflow</DialogTitle>
        <DialogDescription className="sr-only">Plan and customize your project workflow</DialogDescription>
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">{shell}</div>
      </DialogContent>
    </Dialog>
  );
};

