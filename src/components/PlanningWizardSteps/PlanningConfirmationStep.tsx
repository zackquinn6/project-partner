import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Circle } from 'lucide-react';
import type { PlanningToolId } from '@/components/KickoffSteps/ProjectToolsStep';
import type { Phase } from '@/interfaces/Project';
import { parseCustomizationDecisions } from '@/utils/customizationDecisions';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  PLANNING_TOOL_SUCCESS_SURFACE_CLASSNAME,
  PLANNING_TOOL_WARNING_SURFACE_CLASSNAME,
} from '@/components/PlanningWizardSteps/planningToolWindowChrome';

function phaseTitle(phases: Phase[], phaseId: string): string {
  const p = phases.find((ph) => ph.id === phaseId);
  return typeof p?.name === 'string' && p.name.trim() ? p.name.trim() : phaseId;
}

function resolveChoiceLabel(phases: Phase[], choice: string): string {
  const parts = choice.split(':');
  const opId = parts.length > 1 ? parts[parts.length - 1] : choice;
  for (const phase of phases) {
    const op = phase.operations?.find((operation) => operation.id === opId);
    if (op && typeof op.name === 'string' && op.name.trim()) {
      return op.name.trim();
    }
  }
  return choice;
}

function appendPhaseChoices(
  target: Record<string, string[]>,
  phaseId: string,
  choices: string[],
  phases: Phase[]
) {
  if (!Array.isArray(choices) || choices.length === 0) return;
  const labels = choices.map((choice) => resolveChoiceLabel(phases, choice));
  const existing = target[phaseId] || [];
  target[phaseId] = Array.from(new Set([...existing, ...labels]));
}

export interface PlanningConfirmationToolStatus {
  toolId: PlanningToolId;
  label: string;
  doneWhen: string;
  complete: boolean;
}

export interface PlanningConfirmationStepProps {
  selectedTools: PlanningToolId[];
  /** Per-tool Planning Summary checklist for this review. */
  toolStatuses: PlanningConfirmationToolStatus[];
  phases: Phase[];
  customizationDecisionsRaw: unknown;
  initialBudget?: string;
  initialTimeline?: string;
  /** Latest end date from schedule_events after scheduling. */
  scheduledTimelineEnd?: Date | null;
  /** Sum of budget_data.lineItems budgeted amounts. */
  calculatedBudgetTotal?: number | null;
  onOpenTool?: (toolId: PlanningToolId) => void;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatTimelineDate(value: string | Date | null | undefined): string | null {
  if (value === undefined || value === null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return typeof value === 'string' ? value : null;
  return format(d, 'MMM d, yyyy');
}

export function PlanningConfirmationStep({
  selectedTools,
  toolStatuses,
  phases,
  customizationDecisionsRaw,
  initialBudget,
  initialTimeline,
  scheduledTimelineEnd = null,
  calculatedBudgetTotal = null,
  onOpenTool,
}: PlanningConfirmationStepProps) {
  const decisions = useMemo(() => parseCustomizationDecisions(customizationDecisionsRaw), [customizationDecisionsRaw]);

  const { standardRows, necessaryRows, generalRows, spaceRows, hasStoredScopeContext } = useMemo(() => {
    const standardMap: Record<string, string[]> = {};
    const necessaryMap: Record<string, string[]> = {};

    const topStandard =
      decisions.standardDecisions &&
      typeof decisions.standardDecisions === 'object' &&
      !Array.isArray(decisions.standardDecisions)
        ? (decisions.standardDecisions as Record<string, string[]>)
        : {};
    const topNecessary =
      decisions.ifNecessaryWork &&
      typeof decisions.ifNecessaryWork === 'object' &&
      !Array.isArray(decisions.ifNecessaryWork)
        ? (decisions.ifNecessaryWork as Record<string, string[]>)
        : {};

    Object.entries(topStandard).forEach(([phaseId, vals]) => {
      appendPhaseChoices(standardMap, phaseId, vals, phases);
    });
    Object.entries(topNecessary).forEach(([phaseId, vals]) => {
      appendPhaseChoices(necessaryMap, phaseId, vals, phases);
    });

    const spaceDecisions =
      decisions.spaceDecisions &&
      typeof decisions.spaceDecisions === 'object' &&
      !Array.isArray(decisions.spaceDecisions)
        ? (decisions.spaceDecisions as Record<
            string,
            {
              standardDecisions?: Record<string, string[]>;
              ifNecessaryWork?: Record<string, string[]>;
            }
          >)
        : {};

    Object.values(spaceDecisions).forEach((spaceState) => {
      const spaceStandard =
        spaceState?.standardDecisions &&
        typeof spaceState.standardDecisions === 'object' &&
        !Array.isArray(spaceState.standardDecisions)
          ? spaceState.standardDecisions
          : {};
      const spaceNecessary =
        spaceState?.ifNecessaryWork &&
        typeof spaceState.ifNecessaryWork === 'object' &&
        !Array.isArray(spaceState.ifNecessaryWork)
          ? spaceState.ifNecessaryWork
          : {};
      Object.entries(spaceStandard).forEach(([phaseId, vals]) => {
        appendPhaseChoices(standardMap, phaseId, vals, phases);
      });
      Object.entries(spaceNecessary).forEach(([phaseId, vals]) => {
        appendPhaseChoices(necessaryMap, phaseId, vals, phases);
      });
    });

    const generalChoices =
      decisions.generalProjectChoices &&
      typeof decisions.generalProjectChoices === 'object' &&
      !Array.isArray(decisions.generalProjectChoices)
        ? (decisions.generalProjectChoices as Record<string, string>)
        : {};
    const general = Object.entries(generalChoices).filter(
      ([, value]) => typeof value === 'string' && value.trim() !== ''
    );

    const spaces = Array.isArray(decisions.spaces) ? decisions.spaces : [];
    const spaceNames = spaces
      .map((space) => {
        if (!space || typeof space !== 'object') return null;
        const record = space as Record<string, unknown>;
        const name = record.space_name ?? record.name;
        return typeof name === 'string' && name.trim() ? name.trim() : null;
      })
      .filter((name): name is string => name != null);

    const completedTools = Array.isArray(decisions.planning_wizard_completed_tools)
      ? decisions.planning_wizard_completed_tools
      : [];
    const scopeComplete = completedTools.includes('scope');

    return {
      standardRows: Object.entries(standardMap).filter(([, vals]) => vals.length > 0),
      necessaryRows: Object.entries(necessaryMap).filter(([, vals]) => vals.length > 0),
      generalRows: general,
      spaceRows: spaceNames,
      hasStoredScopeContext:
        scopeComplete || spaces.length > 0 || Object.keys(spaceDecisions).length > 0,
    };
  }, [decisions, phases]);

  const incompleteCount = toolStatuses.filter((t) => !t.complete).length;
  const allComplete = toolStatuses.length > 0 && incompleteCount === 0;
  const originalTimelineLabel = formatTimelineDate(initialTimeline);
  const scheduledTimelineLabel = formatTimelineDate(scheduledTimelineEnd);
  const originalBudgetLabel =
    initialBudget !== undefined && initialBudget !== '' ? initialBudget.trim() : null;
  const calculatedBudgetLabel =
    calculatedBudgetTotal !== null && !Number.isNaN(calculatedBudgetTotal)
      ? formatMoney(calculatedBudgetTotal)
      : null;
  const hasReflectComparison =
    originalTimelineLabel !== null ||
    scheduledTimelineLabel !== null ||
    originalBudgetLabel !== null ||
    calculatedBudgetLabel !== null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Planning Summary</CardTitle>
          <p className="text-sm text-muted-foreground">
            Starting the project locks this plan as your baseline. Reflect on kickoff goals, then start, or edit the plan
            for any incomplete tools.
          </p>
        </CardHeader>
        <CardContent className="space-y-6 p-4 pt-0 sm:p-6 sm:pt-0">
          <section>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Planning checklist</h3>
            {toolStatuses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No planning tools are selected. Select Planning Studio Tools, or start if you intentionally have none.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {toolStatuses.map((tool) => (
                  <li key={tool.toolId}>
                    <button
                      type="button"
                      onClick={() => onOpenTool?.(tool.toolId)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                        'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        tool.complete
                          ? PLANNING_TOOL_SUCCESS_SURFACE_CLASSNAME
                          : PLANNING_TOOL_WARNING_SURFACE_CLASSNAME
                      )}
                      aria-label={`Open ${tool.label}`}
                    >
                      {tool.complete ? (
                        <CheckCircle
                          className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400"
                          aria-hidden
                        />
                      ) : (
                        <Circle
                          className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                          aria-hidden
                        />
                      )}
                      <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                        {tool.label}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {toolStatuses.length > 0 && !allComplete ? (
              <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
                {incompleteCount} tool{incompleteCount === 1 ? '' : 's'} still incomplete. Finish them or remove them from
                Planning Studio tools before starting.
              </p>
            ) : null}
          </section>

          <Separator />

          <section>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Reflect</h3>
            <p className="mb-3 text-sm text-muted-foreground">
              Compare your original ambitions with what planning produced. If the gap is too large, edit the plan
              before you start.
            </p>
            {hasReflectComparison ? (
              <div className="space-y-3">
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div className="rounded-md border bg-muted/30 px-3 py-2">
                    <p className="text-muted-foreground">Original timeline</p>
                    <p className="font-medium text-foreground">
                      {originalTimelineLabel ?? (
                        <span className="font-normal text-muted-foreground">Not set at kickoff</span>
                      )}
                    </p>
                  </div>
                  <div className="rounded-md border bg-muted/30 px-3 py-2">
                    <p className="text-muted-foreground">Scheduled timeline</p>
                    <p className="font-medium text-foreground">
                      {scheduledTimelineLabel ?? (
                        <span className="font-normal text-muted-foreground">Not scheduled yet</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div className="rounded-md border bg-muted/30 px-3 py-2">
                    <p className="text-muted-foreground">Original budget</p>
                    <p className="font-medium text-foreground">
                      {originalBudgetLabel ?? (
                        <span className="font-normal text-muted-foreground">Not set at kickoff</span>
                      )}
                    </p>
                  </div>
                  <div className="rounded-md border bg-muted/30 px-3 py-2">
                    <p className="text-muted-foreground">Calculated Budget</p>
                    <p className="font-medium text-foreground">
                      {calculatedBudgetLabel ?? (
                        <span className="font-normal text-muted-foreground">No budget line items yet</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No kickoff targets or planned timeline/budget values are available to compare yet.
              </p>
            )}
          </section>

          <Separator />

          <section>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Key scope decisions</h3>
            {standardRows.length === 0 &&
            necessaryRows.length === 0 &&
            generalRows.length === 0 &&
            spaceRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {hasStoredScopeContext
                  ? 'No alternate or optional scope choices were needed for this run.'
                  : 'No customization choices are stored yet. If you used Customize (scope), open that step and save your selections, or continue if scope is unchanged.'}
              </p>
            ) : (
              <div className="space-y-4">
                {spaceRows.length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Spaces
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="rounded-md border bg-muted/30 px-3 py-2 text-muted-foreground">
                        {spaceRows.join(', ')}
                      </li>
                    </ul>
                  </div>
                ) : null}
                {generalRows.length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Project choices
                    </p>
                    <ul className="space-y-2 text-sm">
                      {generalRows.map(([decisionId, value]) => (
                        <li key={decisionId} className="rounded-md border bg-muted/30 px-3 py-2">
                          <span className="font-medium text-foreground">{decisionId}</span>
                          <p className="mt-1 text-muted-foreground">{value}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {standardRows.length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Standard path</p>
                    <ul className="space-y-2 text-sm">
                      {standardRows.map(([phaseId, vals]) => (
                        <li key={phaseId} className="rounded-md border bg-muted/30 px-3 py-2">
                          <span className="font-medium text-foreground">{phaseTitle(phases, phaseId)}</span>
                          <ul className="mt-1 list-inside list-disc text-muted-foreground">
                            {vals.map((v) => (
                              <li key={v}>{v}</li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {necessaryRows.length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">If necessary</p>
                    <ul className="space-y-2 text-sm">
                      {necessaryRows.map(([phaseId, vals]) => (
                        <li key={phaseId} className="rounded-md border bg-muted/30 px-3 py-2">
                          <span className="font-medium text-foreground">{phaseTitle(phases, phaseId)}</span>
                          <ul className="mt-1 list-inside list-disc text-muted-foreground">
                            {vals.map((v) => (
                              <li key={v}>{v}</li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </section>

          {selectedTools.length === 0 ? null : (
            <>
              <Separator />
              <p className="text-xs text-muted-foreground">
                Starting locks scope, schedule, and budget as the planning baseline for change tracking.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
