import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { ChevronLeft, ChevronRight, CheckCircle, Settings2 } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { PLANNING_TOOLS } from './KickoffSteps/ProjectToolsStep';
import type { PlanningToolId } from './KickoffSteps/ProjectToolsStep';
import { CustomizationStep } from './PlanningWizardSteps/CustomizationStep';
import { ScheduleStep } from './PlanningWizardSteps/ScheduleStep';
import { UncertaintyStep } from './PlanningWizardSteps/UncertaintyStep';
import { BudgetStep } from './PlanningWizardSteps/BudgetStep';
import { ShoppingStep } from './PlanningWizardSteps/ShoppingStep';
import { QualityControlStep } from './PlanningWizardSteps/QualityControlStep';
import { ExpertSupportStep } from './PlanningWizardSteps/ExpertSupportStep';
import { usePartnerAppSettings } from '@/hooks/usePartnerAppSettings';

const WIZARD_TOOL_ORDER: PlanningToolId[] = [
  'scope', 'schedule', 'risk', 'budget', 'shopping_list',
  'quality_control', 'expert_support'
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
  /** Persist workflow step completion + outputs when the user finishes every wizard step */
  onWorkflowFullyComplete?: (selectedTools: PlanningToolId[]) => void | Promise<void>;
}

export const ProjectPlanningWizard: React.FC<ProjectPlanningWizardProps> = ({
  open,
  onOpenChange,
  onGoToWorkflow,
  onOpenBudgeting,
  onOpenRiskManagement,
  onOpenQualityControl,
  onWorkflowFullyComplete,
}) => {
  const { currentProjectRun, updateProjectRun } = useProject();
  const { expertSupportEnabled } = usePartnerAppSettings();
  const validToolIds = useMemo(() => new Set(PLANNING_TOOLS.map(t => t.id)), []);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const stepNavRef = useRef<HTMLDivElement | null>(null);
  /** Local copy of selected tools so dropdown changes apply immediately without waiting for context */
  const [localSelectedTools, setLocalSelectedTools] = useState<PlanningToolId[] | null>(null);

  const selectedToolsFromContext = useMemo(() => {
    const decisions = currentProjectRun?.customization_decisions as Record<string, unknown> | undefined;
    const rawSelected = (decisions?.selected_planning_tools as unknown as string[] | undefined) ?? [];
    const normalized = rawSelected.filter((id): id is PlanningToolId => validToolIds.has(id as any));
    return expertSupportEnabled ? normalized : normalized.filter(id => id !== 'expert_support');
  }, [currentProjectRun?.id, currentProjectRun?.customization_decisions, expertSupportEnabled, validToolIds]);

  const wizardSteps = useMemo(() => {
    const selected = localSelectedTools ?? selectedToolsFromContext;
    const selectedSet = new Set(selected);
    const orderFiltered = expertSupportEnabled
      ? WIZARD_TOOL_ORDER
      : WIZARD_TOOL_ORDER.filter(id => id !== 'expert_support');
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
      return {
        id: `planning-${toolId}`,
        toolId,
        title: meta?.label ?? toolId,
        description: meta?.benefit ?? ''
      };
    });
  }, [localSelectedTools, selectedToolsFromContext, expertSupportEnabled]);

  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setCompletedSteps(new Set());
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
    if (currentStep < wizardSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isStepCompleted = (stepIndex: number) => completedSteps.has(stepIndex);
  const allStepsComplete = wizardSteps.length > 0 && completedSteps.size === wizardSteps.length;
  const progress = wizardSteps.length > 0 ? completedSteps.size / wizardSteps.length * 100 : 0;
  const currentToolId = wizardSteps[currentStep]?.toolId ?? null;

  const planningToolsForWizard = useMemo(
    () => PLANNING_TOOLS.filter(t =>
      WIZARD_TOOL_ORDER.includes(t.id) && (t.id !== 'expert_support' || expertSupportEnabled)
    ),
    [expertSupportEnabled]
  );

  const handlePlanningToolToggle = useCallback(
    (toolId: PlanningToolId, checked: boolean) => {
      if (!currentProjectRun || toolId === 'scope') return;
      const decisions = (currentProjectRun.customization_decisions || {}) as Record<string, unknown>;
      // Use effective selection (local + context) so rapid toggles don't overwrite with stale context
      const effectiveSelected = localSelectedTools ?? selectedToolsFromContext;
      const currentSet = new Set(
        effectiveSelected.filter(id => validToolIds.has(id as any))
      );
      if (checked) currentSet.add(toolId);
      else currentSet.delete(toolId);
      currentSet.add('scope');
      const next = Array.from(currentSet);
      setLocalSelectedTools(next);
      updateProjectRun({
        ...currentProjectRun,
        customization_decisions: { ...decisions, selected_planning_tools: next },
        updatedAt: new Date()
      });
    },
    [currentProjectRun, updateProjectRun, localSelectedTools, selectedToolsFromContext, validToolIds]
  );

  const renderCurrentStep = () => {
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
      case 'risk':
        return <UncertaintyStep {...stepProps} onOpenRiskManagement={onOpenRiskManagement} />;
      case 'budget':
        return <BudgetStep {...stepProps} onOpenBudgeting={onOpenBudgeting} />;
      case 'shopping_list':
        return <ShoppingStep {...stepProps} />;
      case 'quality_control':
        return (
          <QualityControlStep
            {...stepProps}
            onOpenQualityControlApp={onOpenQualityControl}
          />
        );
      case 'expert_support':
        return <ExpertSupportStep {...stepProps} />;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col gap-0 overflow-hidden border-0 p-0 md:h-[min(95vh,56rem)] md:max-h-[95vh] md:max-w-[95vw] md:rounded-lg md:border [&>button]:hidden">
        {/* Accessibility: DialogTitle and DialogDescription required */}
        <DialogTitle className="sr-only">Project Planning Workflow</DialogTitle>
        <DialogDescription className="sr-only">Plan and customize your project workflow</DialogDescription>

        <div className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 sm:right-4 sm:top-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="min-h-10 text-xs sm:min-h-9 sm:text-sm"
          >
            Close
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-2 pb-2 pt-14 sm:px-4 sm:pb-4 sm:pt-16 md:px-6 md:pb-6 md:pt-16">
            <div className="mx-auto max-w-6xl space-y-2 sm:space-y-4 md:space-y-6">
            {/* Progress Header */}
            <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg sm:text-xl md:text-2xl flex items-center gap-2">
                  Project Planning Workflow
                  {allStepsComplete && <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-green-500 flex-shrink-0" />}
                </CardTitle>
                <p className="text-base sm:text-lg font-semibold mt-2 text-foreground">Build your complete project plan</p>
              </div>
              <div className="flex w-full flex-shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full text-xs sm:w-auto sm:text-sm">
                      <Settings2 className="w-4 h-4 mr-1.5" />
                      Change planning tools
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
                          onCheckedChange={value => handlePlanningToolToggle(id, value === true)}
                          disabled={isScope}
                        >
                          {label}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="text-right">
                  <div className="text-xs sm:text-sm text-muted-foreground mb-1">
                    Step {currentStep + 1} of {wizardSteps.length}
                  </div>
                  <Progress value={progress} className="w-20 sm:w-24 md:w-32 h-1.5 sm:h-2" />
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Step Navigation */}
        <Card>
        <CardContent className="p-1 sm:p-2 md:p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0 sm:hidden"
                  onClick={() => scrollStepNav('left')}
                  disabled={wizardSteps.length <= 4}
                  aria-label="Scroll steps left"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div
                  ref={stepNavRef}
                  className="flex items-center space-x-2 sm:space-x-2 md:space-x-4 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 -mx-2 sm:mx-0 px-2 sm:px-0 scrollbar-hide whitespace-nowrap"
                >
                  {wizardSteps.map((step, index) => (
                    <div key={step.id} className="flex items-center flex-shrink-0">
                      <div className={`
                        flex items-center justify-center w-8 h-8 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full border-2 transition-colors flex-shrink-0
                        ${index === currentStep ? 'border-primary bg-primary text-primary-foreground' : isStepCompleted(index) ? 'border-green-500 bg-green-500 text-white' : 'border-muted-foreground bg-background'}
                      `}>
                        {isStepCompleted(index) ? (
                          <CheckCircle className="w-4 h-4 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                        ) : (
                          <span className="text-xs sm:text-xs md:text-sm font-medium">{index + 1}</span>
                        )}
                      </div>
                      <div className="ml-1.5 sm:ml-1.5 md:ml-2 hidden sm:block">
                        <p className={`text-xs sm:text-sm font-medium whitespace-nowrap ${index === currentStep ? 'text-primary' : isStepCompleted(index) ? 'text-green-700' : 'text-muted-foreground'}`}>
                          {step.title}
                        </p>
                      </div>
                      {index < wizardSteps.length - 1 && (
                        <div className="mx-2 sm:mx-2 md:mx-4 w-4 sm:w-4 md:w-8 h-0.5 bg-muted-foreground/20 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0 sm:hidden"
                  onClick={() => scrollStepNav('right')}
                  disabled={wizardSteps.length <= 4}
                  aria-label="Scroll steps right"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={handlePrevious} disabled={currentStep === 0} className="flex-1 sm:flex-initial text-xs h-11 sm:h-9">
                  <ChevronLeft className="w-4 h-4 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Prev</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleNext} disabled={currentStep === wizardSteps.length - 1} className="flex-1 sm:flex-initial text-xs h-11 sm:h-9">
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="w-4 h-4 sm:w-4 sm:h-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

              {/* Current step */}
              <div className="min-w-0">{renderCurrentStep()}</div>
            </div>
          </div>

          <div className="shrink-0 border-t bg-background px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-4 sm:pb-3">
            <Card className="mx-auto max-w-6xl border-0 shadow-none sm:border sm:shadow-sm">
              <CardContent className="p-3 sm:p-4">
                {allStepsComplete ? (
                  <Button
                    onClick={async () => {
                      const isNoToolsPlaceholder =
                        wizardSteps.length === 1 && wizardSteps[0].toolId === null;
                      if (!isNoToolsPlaceholder && onWorkflowFullyComplete) {
                        const tools = localSelectedTools ?? selectedToolsFromContext;
                        await onWorkflowFullyComplete(tools);
                      }
                      onOpenChange(false);
                    }}
                    className="min-h-11 w-full bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Complete Planning
                  </Button>
                ) : (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    Complete all steps to finish planning
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

