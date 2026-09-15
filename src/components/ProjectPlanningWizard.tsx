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
import { toast } from 'sonner';
import { useProject } from '@/contexts/ProjectContext';
import { PLANNING_TOOLS, PLANNING_TOOLS_DISPLAY_ORDER, normalizePlanningToolsSelection } from './KickoffSteps/ProjectToolsStep';
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
import { parseCustomizationDecisions, isPlanningScopeComplete } from '@/utils/customizationDecisions';
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
import { cn } from '@/lib/utils';

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
    const asIds = rawSelected.filter((id): id is PlanningToolId => validToolIds.has(id as any));
    return normalizePlanningToolsSelection(
      asIds,
      partnerAppsEnabled,
      expertSupportEnabled,
      toolRentalsEnabled,
      wasteRemovalEnabled
    );
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

  // Persist Scope when the run is missing selected_planning_tools (or omitted scope).
  useEffect(() => {
    if (!open || !currentProjectRun) return;
    const decisions = parseCustomizationDecisions(currentProjectRun.customization_decisions);
    const raw = decisions.selected_planning_tools;
    const rawIds = Array.isArray(raw)
      ? raw.filter((id): id is PlanningToolId => typeof id === 'string' && validToolIds.has(id as any))
      : [];
    const normalized = normalizePlanningToolsSelection(
      rawIds,
      partnerAppsEnabled,
      expertSupportEnabled,
      toolRentalsEnabled,
      wasteRemovalEnabled
    );
    const prevSig = [...rawIds].sort().join(',');
    const nextSig = [...normalized].sort().join(',');
    if (prevSig === nextSig) return;
    void updateProjectRun({
      ...currentProjectRun,
      customization_decisions: {
        ...decisions,
        selected_planning_tools: normalized,
      } as any,
      updatedAt: new Date(),
    });
  }, [
    open,
    currentProjectRun?.id,
    currentProjectRun?.customization_decisions,
    partnerAppsEnabled,
    expertSupportEnabled,
    toolRentalsEnabled,
    wasteRemovalEnabled,
    validToolIds,
    updateProjectRun,
    currentProjectRun,
  ]);

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
    // Scope is always required; normalizePlanningToolsSelection guarantees it is selected.
    const steps = ordered.length > 0 ? ordered : (['scope'] as PlanningToolId[]);
    return steps.map(toolId => {
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
        if (typeof id === 'string') prevToolIds.add(id as PlanningToolId);
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
    // Stay on completed step - sticky Continue advances (no auto-open chain).
  }, [persistCompletedToolIds]);

  const isStepCompleted = (stepIndex: number) => completedSteps.has(stepIndex);

  const allWorkflowStepsComplete =
    wizardSteps.length > 0 &&
    wizardSteps.every((_, i) => completedSteps.has(i));

  // Auto-open the current incomplete tool within 2s of first landing on that step.
  useEffect(() => {
    if (!open) return;
    if (wizardPhase !== 'steps') return;
    if (isStepCompleted(currentStep)) return;

    const toolId = wizardSteps[currentStep]?.toolId ?? null;
    if (!toolId) return;
    if (lastAutoOpenedStepRef.current === currentStep) return;

    if (autoOpenTimerRef.current) {
      clearTimeout(autoOpenTimerRef.current);
    }
    autoOpenTimerRef.current = setTimeout(() => {
      autoOpenTimerRef.current = null;
      lastAutoOpenedStepRef.current = currentStep;
      openPlanningTool(toolId, () => handleStepComplete(currentStep));
    }, 2000);

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
    openPlanningTool,
    handleStepComplete,
    completedSteps,
  ]);

  const scopeStepIndex = useMemo(
    () => wizardSteps.findIndex((step) => step.toolId === 'scope'),
    [wizardSteps]
  );

  const isScopeComplete = useMemo(() => {
    if (scopeStepIndex < 0) return true;
    if (completedSteps.has(scopeStepIndex)) return true;
    return isPlanningScopeComplete(currentProjectRun?.customization_decisions);
  }, [scopeStepIndex, completedSteps, currentProjectRun?.customization_decisions]);

  /** Free navigation among tools after Scope is complete; Scope is always reachable. */
  const canVisitPlanningStep = (index: number) => {
    if (index < 0 || index >= wizardSteps.length) return false;
    if (wizardSteps[index]?.toolId === 'scope') return true;
    return isScopeComplete;
  };

  const goToPlanningStep = (index: number) => {
    if (!canVisitPlanningStep(index)) {
      toast.message('Complete Scope before opening other planning tools');
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

  const handleNext = () => {
    if (autoOpenTimerRef.current) {
      clearTimeout(autoOpenTimerRef.current);
      autoOpenTimerRef.current = null;
    }
    if (wizardPhase === 'confirm') return;

    if (currentStep < wizardSteps.length - 1) {
      const nextIndex = currentStep + 1;
      if (!canVisitPlanningStep(nextIndex)) {
        toast.message('Complete Scope before opening other planning tools');
        return;
      }
      setCurrentStep(nextIndex);
      return;
    }

    if (allWorkflowStepsComplete) {
      markPlanningWizardFirstPassComplete();
      setWizardPhase('confirm');
      return;
    }

    toast.message('Finish all tools to open Planning Summary');
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
      const nextIndex = currentStep + 1;
      if (!canVisitPlanningStep(nextIndex)) {
        toast.message('Complete Scope before opening other planning tools');
        return;
      }
      setCurrentStep(nextIndex);
      return;
    }

    if (allWorkflowStepsComplete) {
      markPlanningWizardFirstPassComplete();
      setWizardPhase('confirm');
    }
  };

  const handleSkipToWorkflow = () => {
    if (!isScopeComplete) {
      toast.message('Complete Scope before opening your project workflow');
      return;
    }
    if (!onGoToWorkflow) return;
    onGoToWorkflow();
  };

  const progress = wizardSteps.length > 0 ? completedSteps.size / wizardSteps.length * 100 : 0;
  const currentToolId = wizardSteps[currentStep]?.toolId ?? null;

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
      return <CustomizationStep {...stepProps} />;
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
                    Plan disposal and debris handling during the project.
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
                    {stepProps.isCompleted ? '✓ Waste Removal completed' : '\u00a0'}
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

  if (layout === 'fullscreen' && !open) {
    return null;
  }

  const renderStickyActions = () => {
    /** Match Kickoff footer geometry: escape row + full-width h-14 continue. */
    const primaryButtonClass =
      'font-display h-14 min-h-14 max-h-14 w-full shrink-0 rounded-xl px-3 text-sm font-semibold leading-none';

    if (wizardPhase === 'confirm') {
      return (
        <div className="flex h-[4.75rem] w-full flex-col justify-between">
          <div className="flex h-5 w-full shrink-0 items-center justify-center overflow-hidden">
            <button
              type="button"
              className="max-w-full truncate text-sm text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => {
                const firstIncomplete = wizardSteps.findIndex((_, i) => !completedSteps.has(i));
                setWizardPhase('steps');
                setCurrentStep(firstIncomplete >= 0 ? firstIncomplete : 0);
              }}
            >
              Edit plan
            </button>
          </div>
          <div className="h-14 w-full shrink-0">
            <Button
              type="button"
              disabled={!allWorkflowStepsComplete && wizardSteps.some((s) => s.toolId != null)}
              className={cn(primaryButtonClass, 'bg-green-600 hover:bg-green-700')}
              onClick={async () => {
                if (!allWorkflowStepsComplete && wizardSteps.some((s) => s.toolId != null)) return;
                if (onWorkflowFullyComplete) {
                  await onWorkflowFullyComplete(effectiveSelectedTools);
                }
                onOpenChange(false);
              }}
            >
              Start project
            </Button>
          </div>
        </div>
      );
    }

    const stepDone = isStepCompleted(currentStep);
    const isLast = currentStep >= wizardSteps.length - 1;
    const onScopeStep = currentToolId === 'scope';
    const showSkipToWorkflow = Boolean(onGoToWorkflow) && isScopeComplete && !onScopeStep;
    const primaryLabel = !stepDone
      ? 'Continue'
      : isLast
        ? 'Continue to Summary'
        : 'Continue';

    return (
      <div className="flex h-[4.75rem] w-full flex-col justify-between">
        <div className="flex h-5 w-full shrink-0 items-center justify-center overflow-hidden">
          {showSkipToWorkflow ? (
            <button
              type="button"
              className="max-w-full truncate text-sm text-muted-foreground underline-offset-4 hover:underline"
              onClick={handleSkipToWorkflow}
            >
              Skip ahead to workflow
            </button>
          ) : null}
        </div>
        <div className="h-14 w-full shrink-0">
          <Button
            type="button"
            className={primaryButtonClass}
            disabled={!currentToolId && !stepDone}
            onClick={handleContinueFromSticky}
          >
            {primaryLabel}
          </Button>
        </div>
      </div>
    );
  };

  const shell = (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-2 overflow-hidden p-2 sm:gap-3 sm:p-3 md:h-[min(800px,calc(100dvh-5rem))] md:min-h-[min(800px,calc(100dvh-5rem))]">
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
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleNext}
              disabled={wizardPhase === 'confirm'}
              aria-label="Next step"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Next step"
                  onClick={handleNext}
                  disabled={wizardPhase === 'confirm'}
                  className="h-9 w-9 shrink-0 p-0 lg:h-9 lg:w-auto lg:px-3"
                >
                  <span className="hidden lg:inline">Next</span>
                  <ChevronRight className="h-4 w-4 lg:ml-1" />
                </Button>
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

          {currentStepPurpose && wizardPhase === 'steps' ? (
            <div className="border-t border-border/60 pt-1.5">
              <p className="text-xs text-muted-foreground sm:text-sm">{currentStepPurpose}</p>
            </div>
          ) : wizardPhase === 'confirm' && currentStepPurpose ? (
            <div className="border-t border-border/60 pt-1.5">
              <p className="text-xs text-muted-foreground sm:text-sm">{currentStepPurpose}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        <div className="min-w-0">{renderCurrentStep()}</div>
      </div>

      <Card className="z-10 h-[6.25rem] shrink-0 border-t bg-background">
        <CardContent className="flex h-full items-center p-3">{renderStickyActions()}</CardContent>
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

