import type { ProjectRun } from '@/interfaces/ProjectRun';
import type { PlanningToolId } from '@/components/KickoffSteps/ProjectToolsStep';
import { differenceInCalendarDays, differenceInCalendarMonths, format, parseISO } from 'date-fns';
import { mergeQualityControlSettings } from '@/utils/qualityControlSettings';

export const PLANNING_SCOPE_BASELINE_VERSION = 1 as const;

export type PlanningScopeBaselineV1 = {
  version: typeof PLANNING_SCOPE_BASELINE_VERSION;
  recorded_at: string;
  schedule: {
    start_date: string;
    plan_end_date: string;
    initial_timeline: string | null;
    schedule_optimization_method: string | null;
    schedule_events_fingerprint: string | null;
  };
  budget: {
    budget_data_fingerprint: string | null;
    initial_budget: string | null;
  };
  scope: {
    customization_work_fingerprint: string | null;
    selected_planning_tools_fingerprint: string | null;
  };
};

export type PlanningChangeEventPayload = {
  planning_tool: PlanningToolId;
  change_summary: string;
  change_detail?: Record<string, unknown>;
};

function sortKeysDeep(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(o).sort()) {
      out[k] = sortKeysDeep(o[k]);
    }
    return out;
  }
  return value;
}

function stableStringify(value: unknown): string {
  try {
    return JSON.stringify(sortKeysDeep(value));
  } catch {
    return '';
  }
}

function isoDate(d: Date): string {
  if (!d || Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

function budgetDataFingerprint(run: ProjectRun): string | null {
  if (run.budget_data === undefined || run.budget_data === null) return null;
  return stableStringify(run.budget_data);
}

function scheduleEventsFingerprint(run: ProjectRun): string | null {
  if (run.schedule_events === undefined || run.schedule_events === null) return null;
  return stableStringify(run.schedule_events);
}

function customizationWorkFingerprint(run: ProjectRun): string | null {
  const cd = run.customization_decisions;
  if (cd === undefined || cd === null) return null;
  const { selected_planning_tools: _t, ...rest } = cd as Record<string, unknown>;
  return stableStringify(rest);
}

function selectedPlanningToolsFingerprint(run: ProjectRun): string | null {
  const tools = run.customization_decisions?.selected_planning_tools;
  if (!Array.isArray(tools)) return null;
  return stableStringify([...tools].sort());
}

function budgetedLineItemsTotal(run: ProjectRun): number | null {
  const items = run.budget_data?.lineItems;
  if (!Array.isArray(items) || items.length === 0) return null;
  let sum = 0;
  for (const li of items) {
    if (li && typeof li.budgetedAmount === 'number' && !Number.isNaN(li.budgetedAmount)) {
      sum += li.budgetedAmount;
    }
  }
  return sum;
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function fmtDateLabel(iso: string | null | undefined): string | null {
  if (iso === undefined || iso === null || iso === '') return null;
  try {
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return null;
    return format(d, 'MMMM d, yyyy');
  } catch {
    return null;
  }
}

function timelineShiftSummary(prevIso: string | null, nextIso: string | null): string | null {
  if (prevIso === nextIso) return null;
  const prevLabel = fmtDateLabel(prevIso);
  const nextLabel = fmtDateLabel(nextIso);
  if (!nextLabel) return 'Project goal completion date cleared or reset.';
  if (!prevLabel) return `Project goal completion date set to ${nextLabel}.`;

  try {
    const a = parseISO(prevIso!);
    const b = parseISO(nextIso!);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) {
      return `Project goal date updated to ${nextLabel}.`;
    }
    const months = differenceInCalendarMonths(b, a);
    const days = differenceInCalendarDays(b, a);
    if (months >= 1) {
      return `Project goal date moved from ${prevLabel} to ${nextLabel} (about ${months} month${months === 1 ? '' : 's'} ${b > a ? 'later' : 'earlier'}).`;
    }
    if (Math.abs(days) >= 7) {
      return `Project goal date moved from ${prevLabel} to ${nextLabel} (${Math.abs(days)} days ${b > a ? 'later' : 'earlier'}).`;
    }
    return `Project goal date updated from ${prevLabel} to ${nextLabel}.`;
  } catch {
    return `Project goal date updated to ${nextLabel}.`;
  }
}

function planBoundsSummary(
  label: string,
  prev: Date | undefined,
  next: Date | undefined
): string | null {
  const prevIso = prev && !Number.isNaN(prev.getTime()) ? prev.toISOString() : null;
  const nextIso = next && !Number.isNaN(next.getTime()) ? next.toISOString() : null;
  if (prevIso === nextIso) return null;
  const p = fmtDateLabel(prevIso);
  const n = fmtDateLabel(nextIso);
  if (!n) return `${label} cleared or reset.`;
  if (!p) return `${label} set to ${n}.`;
  try {
    const a = parseISO(prevIso!);
    const b = parseISO(nextIso!);
    const months = differenceInCalendarMonths(b, a);
    if (months >= 1) {
      return `${label} moved from ${p} to ${n} (about ${months} month${months === 1 ? '' : 's'} ${b > a ? 'later' : 'earlier'}).`;
    }
    const days = differenceInCalendarDays(b, a);
    if (Math.abs(days) >= 7) {
      return `${label} moved from ${p} to ${n} (${Math.abs(days)} days ${b > a ? 'later' : 'earlier'}).`;
    }
    return `${label} updated from ${p} to ${n}.`;
  } catch {
    return `${label} updated to ${n}.`;
  }
}

function qcFingerprint(run: ProjectRun): string {
  return stableStringify(mergeQualityControlSettings(run.quality_control_settings ?? null));
}

/**
 * Snapshot written once when planning completes (and backfilled for older runs that lack it).
 */
export function buildPlanningScopeBaseline(run: ProjectRun, recordedAt: Date): PlanningScopeBaselineV1 {
  return {
    version: PLANNING_SCOPE_BASELINE_VERSION,
    recorded_at: recordedAt.toISOString(),
    schedule: {
      start_date: isoDate(run.startDate),
      plan_end_date: isoDate(run.planEndDate),
      initial_timeline: run.initial_timeline ?? null,
      schedule_optimization_method: run.schedule_optimization_method ?? null,
      schedule_events_fingerprint: scheduleEventsFingerprint(run),
    },
    budget: {
      budget_data_fingerprint: budgetDataFingerprint(run),
      initial_budget: run.initial_budget ?? null,
    },
    scope: {
      customization_work_fingerprint: customizationWorkFingerprint(run),
      selected_planning_tools_fingerprint: selectedPlanningToolsFingerprint(run),
    },
  };
}

/**
 * Compare previous vs next run; emit one summary per planning tool that changed.
 * Call only after baseline exists (caller skips planning-completion transition).
 */
export function collectPlanningToolChangeSummaries(
  prev: ProjectRun | null | undefined,
  next: ProjectRun
): PlanningChangeEventPayload[] {
  if (!prev || prev.id !== next.id) return [];

  const out: PlanningChangeEventPayload[] = [];

  const prevScopeFp = customizationWorkFingerprint(prev);
  const nextScopeFp = customizationWorkFingerprint(next);
  if (prevScopeFp !== nextScopeFp) {
    out.push({
      planning_tool: 'scope',
      change_summary: 'Scope (spaces and work selections) updated.',
      change_detail: { kind: 'scope_work' },
    });
  }

  const prevToolsFp = selectedPlanningToolsFingerprint(prev);
  const nextToolsFp = selectedPlanningToolsFingerprint(next);
  if (prevToolsFp !== nextToolsFp) {
    out.push({
      planning_tool: 'scope',
      change_summary: 'Active planning tools for this run were updated.',
      change_detail: { kind: 'selected_planning_tools' },
    });
  }

  const scheduleParts: string[] = [];
  const goal = timelineShiftSummary(prev.initial_timeline ?? null, next.initial_timeline ?? null);
  if (goal) scheduleParts.push(goal);
  const start = planBoundsSummary('Planned start date', prev.startDate, next.startDate);
  if (start) scheduleParts.push(start);
  const end = planBoundsSummary('Plan end date', prev.planEndDate, next.planEndDate);
  if (end) scheduleParts.push(end);
  if (prev.schedule_optimization_method !== next.schedule_optimization_method) {
    scheduleParts.push('Schedule workflow method (single-piece vs batch) changed.');
  }
  if (scheduleEventsFingerprint(prev) !== scheduleEventsFingerprint(next)) {
    scheduleParts.push('Scheduled tasks or calendar data changed.');
  }
  if (scheduleParts.length > 0) {
    out.push({
      planning_tool: 'schedule',
      change_summary: scheduleParts.join(' '),
      change_detail: { kind: 'schedule', parts: scheduleParts },
    });
  }

  const budgetParts: string[] = [];
  const prevTotal = budgetedLineItemsTotal(prev);
  const nextTotal = budgetedLineItemsTotal(next);
  const prevBd = budgetDataFingerprint(prev);
  const nextBd = budgetDataFingerprint(next);
  if (prevBd !== nextBd) {
    if (prevTotal != null && nextTotal != null && prevTotal !== nextTotal) {
      const delta = nextTotal - prevTotal;
      const dir = delta > 0 ? 'increased' : 'decreased';
      budgetParts.push(
        `Budgeted total ${dir} by ${fmtMoney(Math.abs(delta))} (now ${fmtMoney(nextTotal)}).`
      );
    } else {
      budgetParts.push('Budget line items or details updated.');
    }
  }
  const prevKickoffBudget = prev.initial_budget?.trim() || null;
  const nextKickoffBudget = next.initial_budget?.trim() || null;
  if (prevKickoffBudget !== nextKickoffBudget) {
    budgetParts.push(
      nextKickoffBudget
        ? `Kickoff budget figure updated to ${nextKickoffBudget}.`
        : 'Kickoff budget figure cleared.'
    );
  }
  if (budgetParts.length > 0) {
    out.push({
      planning_tool: 'budget',
      change_summary: budgetParts.join(' '),
      change_detail: { kind: 'budget' },
    });
  }

  const prevShop = stableStringify(prev.shopping_checklist_data ?? null);
  const nextShop = stableStringify(next.shopping_checklist_data ?? null);
  if (prevShop !== nextShop) {
    out.push({
      planning_tool: 'shopping_list',
      change_summary: 'Shopping list or material lead times updated.',
      change_detail: { kind: 'shopping' },
    });
  }

  if (qcFingerprint(prev) !== qcFingerprint(next)) {
    out.push({
      planning_tool: 'quality_control',
      change_summary: 'Quality control settings updated.',
      change_detail: { kind: 'quality_control' },
    });
  }

  return out;
}
