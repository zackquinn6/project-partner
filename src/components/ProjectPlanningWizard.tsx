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
import { ChevronLeft, CheckCircle, Settings2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useProject } from '@/contexts/ProjectContext';
import { PLANNING_TOOLS, PLANNING_TOOLS_DISPLAY_ORDER } from './KickoffSteps/ProjectToolsStep';
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
import { PlanningJourneyHeader } from '@/components/PlanningJourneyHeader';
import { PlanningConfirmationStep } from './PlanningWizardSteps/PlanningConfirmationStep';
import {
  PLANNING_WIZARD_OPEN_APP_BUTTON_CLASSNAME,
  PLANNING_WIZARD_STEP_ACTION_SLOT_CLASSNAME,
  PLANNING_WIZARD_STEP_BODY_CLASSNAME,
  PLANNING_WIZARD_STEP_BUTTON_WRAP_CLASSNAME,
  PLANNING_WIZARD_STEP_CARD_CLASSNAME,
  PLANNING_WIZARD_STEP_CONTENT_CLASSNAME,
  PLANNING_WIZARD_STEP_DESCRIPTION_CLASSNAME,
  PLANNING_WIZARD_STEP_HEADER_CLASSNAME,
  PLANNING_WIZARD_STEP_STATUS_ROW_CLASSNAME,
  PLANNING_WIZARD_STEP_TITLE_CLASSNAME,
} from '@/components/PlanningWizardSteps/planningWizardOpenAppButton';
import type { Phase } from '@/interfaces/Project';

interface ProjectPlanningWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoToWorkflow?: () => void;
  /** Return from Plan stage to Kickoff (Discover). */
  onReturnToKickoff?: () => void;
  /** When provided, opens Project Budgeting from the Budget step without relying on window event */
  onOpenBudgeting?: (options?: { fromPlanningWizard?: boolean; onComplete?: () => void }) => void;
  /** When provided, opens Risk Management at the host level (avoids nested dialog) */
  onOpenRiskManagement?: (options?: { fromPlanningWizard?: boolean; onComplete?: () => void }) => void;
  /** Opens Quality Control with settings expanded (Planning Studio quality tab). */
  onOpenQualityControl?: (options?: { fromPlanningWizard?: boolean; onComplete?: () => void }) => void;
  /** Opens Tool Access / rentals at host level (e.g. UserView). */
  onOpenToolRentals?: (options?: { fromPlanningWizard?: boolean; onComplete?: () => void }) => void;
  /** Opens Expert Support at host level (e.g. UserView). */
  onOpenExpertSupport?: (options?: { fromPlanningWizard?: boolean; onComplete?: () => void }) => void;
  /** Opens Communication Plan at host level (e.g. UserView). */
  onOpenCommunicationPlan?: (options?: { fromPlanningWizard?: boolean; onComplete?: () => void }) => void;
  /** Opens Waste Removal placeholder at host level (e.g. UserView). */
  onOpenWasteRemoval?: (options?: { fromPlanningWizard?: boolean; onComplete?: () => void }) => void;
  /** Persist workflow step completion + outputs when the user finishes every wizard step */
  onWorkflowFullyComplete?: (selectedTools: PlanningToolId[]) => void | Promise<void>;
  /** `fullscreen` = same shell as project kickoff (desktop). `dialog` = modal (e.g. mobile). */
  layout?: 'dialog' | 'fullscreen';
}

export const ProjectPlanningWizard: React.FC<ProjectPlanningWizardProps> = ({
  open,
  onOpenChange,
  onGoToWorkflow,
  onReturnToKickoff,
  onOpenBudgeting,
  onOpenRiskManagement,
  onOpenQualityControl,
  onOpenToolRentals,
  onOpenExpertSupport,
  onOpenCommunicationPlan,
  onOpenWasteRemoval,
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
  const autoOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Step index last auto-opened this studio session (first-pass only). */
  const lastAutoOpenedStepRef = useRef<number | null>(null);
  /** Tracks which run id we hydrated completion for on this open. */
  const hydratedCompletionRunIdRef = useRef<string | null>(null);
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

  const planningWizardFirstPassCompleted = useMemo(() => {
    const decisions = parseCustomizationDecisions(currentProjectRun?.customization_decisions);
    return decisions.planning_wizard_first_pass_completed === true;
  }, [currentProjectRun?.customization_decisions]);

  const wizardSteps = useMemo(() => {
    const selected = localSelectedTools ?? selectedToolsFromContext;
    const selectedSet = new Set(selected);
    const orderFiltered = PLANNING_TOOLS_DISPLAY_ORDER.filter(id => {
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
        description: 'Choose planning tools in Discover (Plan tools) for this run.',
        doneWhen: '',
      }];
    }
    return ordered.map(toolId => {
      const meta = PLANNING_TOOLS.find(t => t.id === toolId);
      const title = meta?.trackerLabel ?? meta?.label ?? toolId;
      return {
        id: `planning-${toolId}`,
        toolId,
        title,
        description: meta?.benefit ?? '',
        doneWhen: meta?.doneWhen ?? '',
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

  const persistCompletedToolIds = useCallback(
    (nextCompleted: Set<number>, markFirstPass?: boolean) => {
      if (!currentProjectRun) return;
      const decisions = parseCustomizationDecisions(currentProjectRun.customization_decisions);
      const toolIds = wizardSteps
        .map((s, idx) => (nextCompleted.has(idx) ? s.toolId : null))
        .filter((id): id is PlanningToolId => typeof id === 'string');
      const nextDecisions = {
        ...decisions,
        planning_wizard_completed_tools: toolIds,
        ...(markFirstPass ? { planning_wizard_first_pass_completed: true } : {}),
      };
      void updateProjectRun({
        ...currentProjectRun,
        customization_decisions: nextDecisions as any,
        updatedAt: new Date(),
      });
    },
    [currentProjectRun, updateProjectRun, wizardSteps]
  );

  useEffect(() => {
    if (!open) {
      setLocalSelectedTools(null);
      setCompletedSteps(new Set());
      setCurrentStep(0);
      setWizardPhase('steps');
      lastAutoOpenedStepRef.current = null;
      hydratedCompletionRunIdRef.current = null;
      if (autoOpenTimerRef.current) {
        clearTimeout(autoOpenTimerRef.current);
        autoOpenTimerRef.current = null;
      }
      return;
    }

    const runId = currentProjectRun?.id ?? null;
    if (!runId) return;

    const decisions = parseCustomizationDecisions(currentProjectRun?.customization_decisions);
    const persistedTools = Array.isArray(decisions.planning_wizard_completed_tools)
      ? (decisions.planning_wizard_completed_tools as string[])
      : [];
    const completed = new Set<number>();
    wizardSteps.forEach((step, index) => {
      if (step.toolId && persistedTools.includes(step.toolId)) {
        completed.add(index);
      }
    });

    const isNewHydration = hydratedCompletionRunIdRef.current !== runId;
    if (isNewHydration) {
      hydratedCompletionRunIdRef.current = runId;
      setCompletedSteps(completed);
      setWizardPhase('steps');
      lastAutoOpenedStepRef.current = null;
      const firstIncomplete = wizardSteps.findIndex((_, index) => !completed.has(index));
      setCurrentStep(firstIncomplete >= 0 ? firstIncomplete : 0);
      return;
    }

    setCompletedSteps((prev) => {
      const prevToolIds = new Set(
        Array.from(prev)
          .map((idx) => wizardSteps[idx]?.toolId)
          .filter((id): id is PlanningToolId => typeof id === 'string')
      );
      persistedTools.forEach((id) => {
        if (typeof id === 'string') prevToolIds.add(id);
      });
      const next = new Set<number>();
      wizardSteps.forEach((step, index) => {
        if (step.toolId && prevToolIds.has(step.toolId)) next.add(index);
      });
      if (next.size === prev.size && Array.from(next).every((idx) => prev.has(idx))) {
        return prev;
      }
      return next;
    });
  }, [open, currentProjectRun?.id, currentProjectRun?.customization_decisions, wizardSteps]);

  useEffect(() => {
    return () => {
      if (autoOpenTimerRef.current) {
        clearTimeout(autoOpenTimerRef.current);
        autoOpenTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (currentStep >= wizardSteps.length) {
      setCurrentStep(Math.max(0, wizardSteps.length - 1));
    }
  }, [wizardSteps.length, currentStep]);

  const markPlanningWizardFirstPassComplete = useCallback(() => {
    if (!currentProjectRun || planningWizardFirstPassCompleted) return;
    const decisions = parseCustomizationDecisions(currentProjectRun.customization_decisions);
    void updateProjectRun({
      ...currentProjectRun,
      customization_decisions: {
        ...decisions,
        planning_wizard_first_pass_completed: true,
      } as any,
      updatedAt: new Date(),
    });
  }, [currentProjectRun, planningWizardFirstPassCompleted, updateProjectRun]);

  const openPlanningTool = useCallback(
    (toolId: PlanningToolId | null, onComplete?: () => void) => {
      if (!toolId) return;
      const detail = { fromPlanningWizard: true, onComplete };

      switch (toolId) {
        case 'scope':
          window.dispatchEvent(new CustomEvent('open-project-customizer', { detail }));
          return;
        case 'schedule':
          window.dispatchEvent(new CustomEvent('open-project-scheduler', { detail }));
          return;
        case 'communication_plan':
          if (onOpenCommunicationPlan) onOpenCommunicationPlan(detail);
          else window.dispatchEvent(new CustomEvent('open-app', { detail: { actionKey: 'communication-plan' } }));
          return;
        case 'risk':
          onOpenRiskManagement?.(detail);
          return;
        case 'budget':
          if (onOpenBudgeting) onOpenBudgeting(detail);
          else window.dispatchEvent(new CustomEvent('open-project-budgeting', { detail }));
          return;
        case 'shopping_list':
          window.dispatchEvent(new CustomEvent('openShoppingChecklist', { detail }));
          return;
        case 'quality_control':
          onOpenQualityControl?.(detail);
          return;
        case 'tool_rentals':
          if (onOpenToolRentals) onOpenToolRentals(detail);
          else window.dispatchEvent(new CustomEvent('show-tool-rentals'));
          return;
        case 'expert_support':
          if (onOpenExpertSupport) onOpenExpertSupport(detail);
          else window.dispatchEvent(new CustomEvent('show-expert-help'));
          return;
        case 'waste_removal':
          if (onOpenWasteRemoval) onOpenWasteRemoval(detail);
          else window.dispatchEvent(new CustomEvent('open-app', { detail: { actionKey: 'waste-removal', ...detail } }));
          return;
        default:
          return;
      }
    },
    [
      onOpenBudgeting,
      onOpenCommunicationPlan,
      onOpenExpertSupport,
      onOpenQualityControl,
      onOpenRiskManagement,
      onOpenToolRentals,
      onOpenWasteRemoval,
    ]
  );

  const handleStepComplete = useCallback((stepIndex: number) => {
    if (autoOpenTimerRef.current) {
      clearTimeout(autoOpenTimerRef.current);
      autoOpenTimerRef.current = null;
    }

    setCompletedSteps((prev) => {
      const nextCompleted = new Set(prev);
      nextCompleted.add(stepIndex);
      // Persist after computing the next set (avoid side effects reading stale state).
      queueMicrotask(() => persistCompletedToolIds(nextCompleted));
      return nextCompleted;
    });
    // Stay on completed step — sticky Continue advances (no auto-open chain).
  }, [persistCompletedToolIds]);

  const isStepCompleted = (stepIndex: number) => completedSteps.has(stepIndex);

  const allWorkflowStepsComplete =
    wizardSteps.length > 0 &&
    wizardSteps.every((_, i) => completedSteps.has(i));

  // First-pass: auto-open current incomplete tool once when landed on (no post-close chain).
  useEffect(() => {
    if (!open) return;
    if (planningWizardFirstPassCompleted) return;
    if (wizardPhase !== 'steps') return;
    if (isStepCompleted(currentStep)) return;

    const toolId = wizardSteps[currentStep]?.toolId ?? null;
    if (!toolId) return;
    if (lastAutoOpenedStepRef.current === currentStep) return;

    lastAutoOpenedStepRef.current = currentStep;
    if (autoOpenTimerRef.current) {
      clearTimeout(autoOpenTimerRef.current);
    }
    autoOpenTimerRef.current = setTimeout(() => {
      autoOpenTimerRef.current = null;
      openPlanningTool(toolId, () => handleStepComplete(currentStep));
    }, 0);

    return () => {
      if (autoOpenTimerRef.current) {
        clearTimeout(autoOpenTimerRef.current);
        autoOpenTimerRef.current = null;
      }
    };
  }, [
    open,
    wizardPhase,
    currentStep,
    wizardSteps,
    planningWizardFirstPassCompleted,
    openPlanningTool,
    handleStepComplete,
    completedSteps,
  ]);

  const canVisitPlanningStep = (index: number) => {
    if (index < 0 || index >= wizardSteps.length) return false;
    if (planningWizardFirstPassCompleted) return true;
    if (index === currentStep) return true;
    return completedSteps.has(index);
  };

  const goToPlanningStep = (index: number) => {
    if (!canVisitPlanningStep(index)) {
      toast.message('Finish the current tool to continue');
      return;
    }
    if (autoOpenTimerRef.current) {
      clearTimeout(autoOpenTimerRef.current);
      autoOpenTimerRef.current = null;
    }
    setWizardPhase('steps');
    setCurrentStep(index);
  };

  const handlePrevious = () => {
    if (autoOpenTimerRef.current) {
      clearTimeout(autoOpenTimerRef.current);
      autoOpenTimerRef.current = null;
    }
    if (wizardPhase === 'confirm') {
      setWizardPhase('steps');
      setCurrentStep(Math.max(0, wizardSteps.length - 1));
      return;
    }
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleContinueFromSticky = () => {
    if (autoOpenTimerRef.current) {
      clearTimeout(autoOpenTimerRef.current);
      autoOpenTimerRef.current = null;
    }
    if (wizardPhase === 'confirm') return;

    if (!isStepCompleted(currentStep)) {
      openPlanningTool(wizardSteps[currentStep]?.toolId ?? null, () => handleStepComplete(currentStep));
      return;
    }

    if (currentStep < wizardSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      return;
    }

    if (allWorkflowStepsComplete) {
      markPlanningWizardFirstPassComplete();
      setWizardPhase('confirm');
    }
  };

  const progress = wizardSteps.length > 0 ? completedSteps.size / wizardSteps.length * 100 : 0;
  const currentToolId = wizardSteps[currentStep]?.toolId ?? null;
  const currentToolMeta = currentToolId
    ? PLANNING_TOOLS.find((t) => t.id === currentToolId)
    : undefined;
  const openAppLabel = currentToolMeta?.label
    ? `Open ${currentToolMeta.label}`
    : 'Open app';

  const phasesForSummary = useMemo(
    () => (Array.isArray(currentProjectRun?.phases) ? (currentProjectRun!.phases as Phase[]) : []),
    [currentProjectRun?.phases]
  );

  const scheduledTimelineEnd = useMemo(() => {
    const events = currentProjectRun?.schedule_events?.events;
    if (!Array.isArray(events) || events.length === 0) return null;

    const endDates = events
      .map((event: { date?: string; duration?: number; endTime?: string }) => {
        if (event.date) {
          const d = new Date(event.date);
          if (typeof event.duration === 'number' && !Number.isNaN(event.duration)) {
            d.setMinutes(d.getMinutes() + event.duration);
          }
          return d;
        }
        if (event.endTime) return new Date(event.endTime);
        return null;
      })
      .filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()));

    if (endDates.length === 0) return null;
    return endDates.reduce((latest, d) => (d > latest ? d : latest));
  }, [currentProjectRun?.schedule_events]);

  const calculatedBudgetTotal = useMemo(() => {
    const items = currentProjectRun?.budget_data?.lineItems;
    if (!Array.isArray(items) || items.length === 0) return null;

    let sum = 0;
    let hasAmount = false;
    for (const item of items) {
      if (!item) continue;
      const amount =
        typeof item.budgetedAmount === 'number'
          ? item.budgetedAmount
          : Number.parseFloat(String(item.budgetedAmount ?? ''));
      if (Number.isNaN(amount)) continue;
      sum += amount;
      hasAmount = true;
    }
    return hasAmount ? sum : null;
  }, [currentProjectRun?.budget_data]);

  const effectiveSelectedTools = localSelectedTools ?? selectedToolsFromContext;

  const planningToolsForWizard = useMemo(() => {
    const orderIdx = (id: PlanningToolId) => PLANNING_TOOLS_DISPLAY_ORDER.indexOf(id);
    return PLANNING_TOOLS.filter(t => {
      if (!PLANNING_TOOLS_DISPLAY_ORDER.includes(t.id)) return false;
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
        customization_decisions: { ...decisions, selected_planning_tools: next } as any,
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
      const toolStatuses = wizardSteps
        .map((s, index) => {
          if (s.toolId == null) return null;
          const meta = PLANNING_TOOLS.find((t) => t.id === s.toolId);
          return {
            toolId: s.toolId,
            label: meta?.label ?? s.title,
            doneWhen: meta?.doneWhen ?? s.doneWhen ?? '',
            complete: isStepCompleted(index),
          };
        })
        .filter((row): row is NonNullable<typeof row> => row != null);
      return (
        <PlanningConfirmationStep
          selectedTools={effectiveSelectedTools}
          toolStatuses={toolStatuses}
          phases={phasesForSummary}
          customizationDecisionsRaw={currentProjectRun?.customization_decisions}
          initialBudget={currentProjectRun?.initial_budget}
          initialTimeline={currentProjectRun?.initial_timeline}
          scheduledTimelineEnd={scheduledTimelineEnd}
          calculatedBudgetTotal={calculatedBudgetTotal}
          onOpenTool={(toolId) => openPlanningTool(toolId)}
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
              Choose planning tools in Discover (Plan tools) for this run. Each tool becomes a step in Planning Studio and opens its app when you select it.
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
                  <div className={PLANNING_WIZARD_STEP_ACTION_SLOT_CLASSNAME}>
                    <div className={PLANNING_WIZARD_STEP_BUTTON_WRAP_CLASSNAME}>
                      <Button
                        type="button"
                        variant="default"
                        className={PLANNING_WIZARD_OPEN_APP_BUTTON_CLASSNAME}
                        onClick={() => {
                          openPlanningTool('waste_removal', stepProps.onComplete);
                        }}
                      >
                        <Trash2 className="shrink-0" aria-hidden />
                        Open Waste Removal
                      </Button>
                    </div>
                  </div>
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
      ? 'Review your project plan'
      : wizardSteps[currentStep]?.description?.trim() ||
        wizardSteps[currentStep]?.title ||
        '';

  const currentStepDoneWhen =
    wizardPhase === 'steps' ? wizardSteps[currentStep]?.doneWhen?.trim() || '' : '';

  if (layout === 'fullscreen' && !open) {
    return null;
  }

  const renderStickyActions = () => {
    if (wizardPhase === 'confirm') {
      return (
        <div className="flex min-h-12 w-full flex-row items-stretch gap-2 sm:min-h-[3.25rem] sm:gap-3">
          <div className="flex min-h-12 min-w-0 flex-[3] basis-0 flex-col sm:min-h-[3.25rem]">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-12 min-h-12 w-full border-slate-400 bg-slate-200 px-3 text-sm text-slate-900 hover:bg-slate-300 hover:text-slate-950 sm:h-full sm:min-h-[3.25rem]"
              onClick={() => {
                const firstIncomplete = wizardSteps.findIndex((_, i) => !completedSteps.has(i));
                setWizardPhase('steps');
                setCurrentStep(firstIncomplete >= 0 ? firstIncomplete : 0);
              }}
            >
              Edit Plan
            </Button>
          </div>
          <div className="flex min-h-12 min-w-0 flex-[7] basis-0 flex-col sm:min-h-[3.25rem]">
            <Button
              type="button"
              size="lg"
              disabled={!allWorkflowStepsComplete && wizardSteps.some((s) => s.toolId != null)}
              className="h-12 min-h-12 w-full bg-green-600 px-3 text-sm hover:bg-green-700 disabled:opacity-50 sm:h-full sm:min-h-[3.25rem]"
              onClick={async () => {
                if (!allWorkflowStepsComplete && wizardSteps.some((s) => s.toolId != null)) return;
                if (onWorkflowFullyComplete) {
                  await onWorkflowFullyComplete(effectiveSelectedTools);
                }
                onOpenChange(false);
              }}
            >
              <CheckCircle className="mr-2 h-4 w-4 shrink-0" />
              Start project
            </Button>
          </div>
        </div>
      );
    }

    const stepDone = isStepCompleted(currentStep);
    const isLast = currentStep >= wizardSteps.length - 1;
    const primaryLabel = !stepDone
      ? openAppLabel
      : isLast
        ? 'Continue to Summary'
        : 'Continue';

    return (
      <div className="flex min-h-12 w-full flex-row items-stretch gap-2 sm:min-h-[3.25rem] sm:gap-3">
        {stepDone && currentToolId ? (
          <div className="flex min-h-12 min-w-0 flex-[3] basis-0 flex-col sm:min-h-[3.25rem]">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-12 min-h-12 w-full px-3 text-sm sm:h-full sm:min-h-[3.25rem]"
              onClick={() => openPlanningTool(currentToolId)}
            >
              Reopen {currentToolMeta?.label ?? 'app'}
            </Button>
          </div>
        ) : (
          <div className="min-w-0 flex-[3] basis-0" aria-hidden />
        )}
        <div className="flex min-h-12 min-w-0 flex-[7] basis-0 flex-col sm:min-h-[3.25rem]">
          <Button
            type="button"
            size="lg"
            className="h-12 min-h-12 w-full bg-green-600 px-3 text-sm hover:bg-green-700 sm:h-full sm:min-h-[3.25rem]"
            disabled={!currentToolId && !stepDone}
            onClick={handleContinueFromSticky}
          >
            <CheckCircle className="mr-2 h-4 w-4 shrink-0" />
            <span className="text-left leading-tight">{primaryLabel}</span>
          </Button>
        </div>
      </div>
    );
  };

  const shell = (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-2 overflow-hidden p-2 sm:gap-3 sm:p-3 md:h-auto md:overflow-visible">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <PlanningJourneyHeader
          activeStage="plan"
          className="min-w-0 flex-1"
          onDiscoverClick={onReturnToKickoff}
        />
        {open && currentProjectRun ? (
          <ProjectPlanningCountdownBanner
            minimal
            projectCreatedAt={currentProjectRun.createdAt}
            className="shrink-0"
          />
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onOpenChange(false)}
          className="min-h-9 shrink-0 text-xs sm:text-sm"
        >
          Close
        </Button>
      </div>

      <Card className="shrink-0">
        <CardContent className="space-y-1.5 p-1.5 sm:p-2 md:p-2.5">
          {/* Mobile: compact dots */}
          <div className="flex items-center gap-1 sm:hidden">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handlePrevious}
              disabled={wizardPhase === 'steps' && currentStep === 0}
              aria-label="Previous step"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="scrollbar-hide flex min-w-0 flex-1 items-center justify-center gap-0 overflow-x-auto py-0.5">
              {wizardSteps.map((step, index) => {
                const visitable = canVisitPlanningStep(index);
                return (
                  <React.Fragment key={step.id}>
                    {index > 0 ? (
                      <div className="h-px w-1 shrink-0 bg-muted-foreground/30" aria-hidden />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => goToPlanningStep(index)}
                      aria-label={`${step.title}, step ${index + 1}`}
                      aria-current={wizardPhase === 'steps' && index === currentStep ? 'step' : undefined}
                      aria-disabled={!visitable}
                      className={`
                        flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors
                        ${visitable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
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
                        <CheckCircle className="h-3 w-3" aria-hidden />
                      ) : (
                        <span className="text-[10px] font-semibold">{index + 1}</span>
                      )}
                    </button>
                  </React.Fragment>
                );
              })}
              {wizardSteps.length > 0 ? (
                <>
                  <div className="h-px w-1 shrink-0 bg-muted-foreground/30" aria-hidden />
                  <button
                    type="button"
                    onClick={() => {
                      if (!allWorkflowStepsComplete) {
                        toast.message('Finish all tools to open Planning Summary');
                        return;
                      }
                      markPlanningWizardFirstPassComplete();
                      setWizardPhase('confirm');
                    }}
                    disabled={!allWorkflowStepsComplete && wizardPhase !== 'confirm'}
                    aria-label="Go to Planning Summary"
                    className={`
                      flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2
                      ${
                        wizardPhase === 'confirm'
                          ? 'border-primary bg-primary text-primary-foreground'
                          : allWorkflowStepsComplete
                            ? 'cursor-pointer border-muted-foreground bg-background'
                            : 'cursor-not-allowed border-muted-foreground/40 opacity-50'
                      }
                    `}
                  >
                    <span className="text-[10px] font-semibold">{wizardSteps.length + 1}</span>
                  </button>
                </>
              ) : null}
            </div>
            <div className="shrink-0 text-center leading-none tabular-nums">
              <div className="text-[10px] font-medium text-muted-foreground">
                {wizardPhase === 'confirm' ? 'Sum' : `${currentStep + 1}/${wizardSteps.length}`}
              </div>
            </div>
          </div>

          {/* sm+: labeled strip */}
          <div className="hidden flex-col gap-1.5 sm:flex sm:flex-row sm:items-center sm:justify-between sm:gap-2">
            <div className="flex min-w-0 flex-1 items-start gap-1">
              <div
                ref={stepNavRef}
                className="scrollbar-hide flex min-w-0 flex-1 items-start overflow-x-auto px-0.5 pb-1 sm:overflow-visible sm:px-1 sm:pb-0"
              >
                {wizardSteps.map((step, index) => {
                  const visitable = canVisitPlanningStep(index);
                  return (
                    <React.Fragment key={step.id}>
                      {index > 0 ? (
                        <div
                          className="mt-[13px] h-0.5 w-2 shrink-0 self-start bg-muted-foreground/25 sm:mt-[15px] sm:min-w-2 sm:flex-1 sm:w-auto"
                          aria-hidden
                        />
                      ) : null}
                      <div className="flex w-11 shrink-0 flex-col items-center px-0.5 sm:w-14 md:w-[4.25rem]">
                        <button
                          type="button"
                          onClick={() => goToPlanningStep(index)}
                          aria-label={`Go to ${step.title}, step ${index + 1}`}
                          aria-current={
                            wizardPhase === 'steps' && index === currentStep ? 'step' : undefined
                          }
                          aria-disabled={!visitable}
                          className={`
                            flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-8 md:w-8
                            ${visitable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
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
                            <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden />
                          ) : (
                            <span className="text-[11px] font-medium md:text-sm">{index + 1}</span>
                          )}
                        </button>
                        <p
                          className={`mt-1 w-full text-center text-[9px] font-medium leading-[1.15] md:text-xs line-clamp-3 break-words ${
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
                  );
                })}
                {wizardSteps.length > 0 ? (
                  <>
                    <div
                      className="mt-[13px] h-0.5 w-2 shrink-0 self-start bg-muted-foreground/25 sm:mt-[15px] sm:min-w-2 sm:flex-1 sm:w-auto"
                      aria-hidden
                    />
                    <div className="flex w-11 shrink-0 flex-col items-center px-0.5 sm:w-14 md:w-[4.25rem]">
                      <button
                        type="button"
                        onClick={() => {
                          if (!allWorkflowStepsComplete) {
                            toast.message('Finish all tools to open Planning Summary');
                            return;
                          }
                          markPlanningWizardFirstPassComplete();
                          setWizardPhase('confirm');
                        }}
                        disabled={!allWorkflowStepsComplete && wizardPhase !== 'confirm'}
                        aria-label="Go to Planning Summary"
                        aria-current={wizardPhase === 'confirm' ? 'step' : undefined}
                        className={`
                          flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors md:h-8 md:w-8
                          ${
                            wizardPhase === 'confirm'
                              ? 'cursor-pointer border-primary bg-primary text-primary-foreground'
                              : allWorkflowStepsComplete
                                ? 'cursor-pointer border-muted-foreground bg-background'
                                : 'cursor-not-allowed border-muted-foreground/40 bg-background text-muted-foreground/50'
                          }
                        `}
                      >
                        <span className="text-[11px] font-medium md:text-sm">
                          {wizardSteps.length + 1}
                        </span>
                      </button>
                      <p
                        className={`mt-1 w-full text-center text-[9px] font-medium leading-[1.15] md:text-xs line-clamp-3 ${
                          wizardPhase === 'confirm'
                            ? 'text-primary'
                            : allWorkflowStepsComplete
                              ? 'text-muted-foreground'
                              : 'text-muted-foreground/60'
                        }`}
                      >
                        Summary
                      </p>
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto">
              <div className="flex w-full items-center justify-center gap-1.5 sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Previous step"
                  onClick={handlePrevious}
                  disabled={wizardPhase === 'steps' && currentStep === 0}
                  className="h-9 w-9 shrink-0 p-0 lg:h-9 lg:w-auto lg:px-3"
                >
                  <ChevronLeft className="h-4 w-4 lg:mr-1" />
                  <span className="hidden lg:inline">Previous</span>
                </Button>
                <div className="min-w-[70px] px-1 text-center leading-tight">
                  <div className="text-[10px] font-medium text-foreground sm:text-xs">
                    {wizardPhase === 'confirm' ? 'Planning' : 'Step'}
                  </div>
                  <div className="text-[10px] text-muted-foreground sm:text-xs">
                    {wizardPhase === 'confirm'
                      ? 'Summary'
                      : `${currentStep + 1} of ${wizardSteps.length}`}
                  </div>
                  <Progress value={progress} className="mx-auto mt-1 h-1.5 w-16 sm:h-2 sm:w-20" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 px-2 text-[10px] text-muted-foreground sm:text-xs"
                    >
                      <Settings2 className="mr-1 h-3.5 w-3.5 shrink-0" />
                      Adjust tools
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
                          onSelect={(event) => event.preventDefault()}
                          onCheckedChange={(value) => handlePlanningToolToggle(id, value === true)}
                          disabled={isScope}
                        >
                          {label}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {(currentStepPurpose || currentStepDoneWhen) && wizardPhase === 'steps' ? (
            <div className="space-y-0.5 border-t border-border/60 pt-1.5">
              {currentStepPurpose ? (
                <p className="text-xs text-muted-foreground sm:text-sm">{currentStepPurpose}</p>
              ) : null}
              {currentStepDoneWhen ? (
                <p className="text-[11px] text-muted-foreground/90">Done when: {currentStepDoneWhen}</p>
              ) : null}
            </div>
          ) : wizardPhase === 'confirm' && currentStepPurpose ? (
            <div className="border-t border-border/60 pt-1.5">
              <p className="text-xs text-muted-foreground sm:text-sm">{currentStepPurpose}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex min-h-0 flex-1 flex-col md:min-h-[min(520px,70vh)]">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] -mx-2 px-2 pb-2 sm:mx-0 sm:px-0 sm:pb-4 md:flex-none md:overflow-visible md:pb-0">
          <div className="min-w-0">{renderCurrentStep()}</div>
        </div>
      </div>

      <Card className="sticky bottom-0 z-10 shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:static md:border md:bg-card md:backdrop-blur-none">
        <CardContent className="p-2.5 sm:p-4">{renderStickyActions()}</CardContent>
      </Card>
    </div>
  );

  if (layout === 'fullscreen') {
    return (
      <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
        <span className="sr-only">Planning Studio</span>
        {shell}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-[calc(100vw-1rem)] max-w-6xl flex-col gap-0 overflow-hidden border-0 p-0 sm:w-full md:h-[min(100dvh,56rem)] md:max-h-[min(100dvh,56rem)] md:max-w-6xl md:rounded-lg md:border [&>button]:hidden">
        <DialogTitle className="sr-only">Planning Studio</DialogTitle>
        <DialogDescription className="sr-only">Iterate planning tools, review your Planning Summary, then start your project</DialogDescription>
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">{shell}</div>
      </DialogContent>
    </Dialog>
  );
};

