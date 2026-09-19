import { differenceInCalendarDays, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { finishDateFromScheduleEventsBlob } from '@/utils/estimatedFinishDate';
import { PLANNING_TOOL_IDS, type PlanningToolId } from '@/components/KickoffSteps/ProjectToolsStep';

export type PlanningChangeAnalyticsEvent = {
  id: string;
  project_run_id: string;
  occurred_at: string;
  planning_tool: string;
  change_summary: string;
};

export type PlanningChangeAnalyticsRun = {
  id: string;
  project_id: string | null;
  name: string;
  status: string | null;
  initial_timeline: string | null;
  initial_budget: string | null;
  first_schedule_finish_at: string | null;
  schedule_events: unknown;
  budget_data: unknown;
  end_date: string | null;
  planning_completed_at: string | null;
};

export type PlanningChangeAnalyticsRevision = {
  project_run_id: string;
  finish_at: string;
  created_at: string;
  source: string;
};

export type PlanningChangeAnalyticsPayload = {
  events: PlanningChangeAnalyticsEvent[];
  runs: PlanningChangeAnalyticsRun[];
  revisions: PlanningChangeAnalyticsRevision[];
};

export type PlanningChangeAnalyticsMetrics = {
  totalEvents: number;
  eventsByTool: Array<{ tool: string; count: number }>;
  runCount: number;
  runsWithChanges: number;
  avgChangesPerRun: number;
  timelineDeltasDays: number[];
  avgTimelineDeltaDays: number | null;
  medianTimelineDeltaDays: number | null;
  budgetDeltas: number[];
  avgBudgetDelta: number | null;
  medianBudgetDelta: number | null;
  scheduledRunCount: number;
  avgRevisionsPerScheduledRun: number | null;
  pctRunsWithMultipleRevisions: number | null;
};

function parseBudgetGoal(raw: string | null | undefined): number | null {
  if (!raw || !raw.trim()) return null;
  const n = Number(String(raw).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function budgetedTotal(budgetData: unknown): number | null {
  const items = (budgetData as { lineItems?: Array<{ budgetedAmount?: number }> } | null)?.lineItems;
  if (!Array.isArray(items) || items.length === 0) return null;
  let sum = 0;
  let any = false;
  for (const li of items) {
    if (li && typeof li.budgetedAmount === 'number' && !Number.isNaN(li.budgetedAmount)) {
      sum += li.budgetedAmount;
      any = true;
    }
  }
  return any ? sum : null;
}

function parseDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  try {
    const d = raw.length <= 10 ? parseISO(raw.slice(0, 10)) : new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export async function fetchPlanningChangeAnalytics(params: {
  projectIds?: string[] | null;
  from?: Date | null;
  to?: Date | null;
}): Promise<PlanningChangeAnalyticsPayload> {
  const { data, error } = await supabase.rpc('get_planning_change_analytics_payload', {
    p_project_ids: params.projectIds?.length ? params.projectIds : null,
    p_from: params.from ? params.from.toISOString() : null,
    p_to: params.to ? params.to.toISOString() : null,
  });

  if (error) {
    console.error('get_planning_change_analytics_payload failed:', error);
    return { events: [], runs: [], revisions: [] };
  }

  const payload = data as PlanningChangeAnalyticsPayload | null;
  return {
    events: Array.isArray(payload?.events) ? payload!.events : [],
    runs: Array.isArray(payload?.runs) ? payload!.runs : [],
    revisions: Array.isArray(payload?.revisions) ? payload!.revisions : [],
  };
}

export function computePlanningChangeAnalyticsMetrics(
  payload: PlanningChangeAnalyticsPayload,
): PlanningChangeAnalyticsMetrics {
  const { events, runs, revisions } = payload;
  const toolCounts = new Map<string, number>();
  for (const id of PLANNING_TOOL_IDS) {
    toolCounts.set(id, 0);
  }
  for (const e of events) {
    const key = e.planning_tool || 'unknown';
    toolCounts.set(key, (toolCounts.get(key) ?? 0) + 1);
  }

  const eventsByTool = [...toolCounts.entries()]
    .map(([tool, count]) => ({ tool, count }))
    .sort((a, b) => b.count - a.count);

  const eventsByRun = new Map<string, number>();
  for (const e of events) {
    eventsByRun.set(e.project_run_id, (eventsByRun.get(e.project_run_id) ?? 0) + 1);
  }
  const runsWithChanges = eventsByRun.size;
  const runCount = runs.length;
  const avgChangesPerRun = runCount > 0 ? events.length / runCount : 0;

  const revisionsByRun = new Map<string, PlanningChangeAnalyticsRevision[]>();
  for (const r of revisions) {
    const list = revisionsByRun.get(r.project_run_id) ?? [];
    list.push(r);
    revisionsByRun.set(r.project_run_id, list);
  }

  const timelineDeltasDays: number[] = [];
  const budgetDeltas: number[] = [];

  for (const run of runs) {
    const goalDate =
      parseDate(run.first_schedule_finish_at) ?? parseDate(run.initial_timeline);
    const latestFromRevs = (revisionsByRun.get(run.id) ?? [])
      .map((r) => parseDate(r.finish_at))
      .filter((d): d is Date => d != null)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const latestFinish =
      latestFromRevs ??
      finishDateFromScheduleEventsBlob(
        run.schedule_events as { events?: Array<{ date?: string; duration?: number }> } | null,
      );
    if (goalDate && latestFinish) {
      timelineDeltasDays.push(differenceInCalendarDays(latestFinish, goalDate));
    }

    const goalBudget = parseBudgetGoal(run.initial_budget);
    const currentBudget = budgetedTotal(run.budget_data);
    if (goalBudget != null && currentBudget != null) {
      budgetDeltas.push(currentBudget - goalBudget);
    }
  }

  const scheduledRunCount = [...revisionsByRun.keys()].length;
  const revisionCounts = [...revisionsByRun.values()].map((list) => list.length);
  const avgRevisionsPerScheduledRun = average(revisionCounts);
  const multi = revisionCounts.filter((c) => c >= 2).length;
  const pctRunsWithMultipleRevisions =
    scheduledRunCount > 0 ? (multi / scheduledRunCount) * 100 : null;

  return {
    totalEvents: events.length,
    eventsByTool,
    runCount,
    runsWithChanges,
    avgChangesPerRun,
    timelineDeltasDays,
    avgTimelineDeltaDays: average(timelineDeltasDays),
    medianTimelineDeltaDays: median(timelineDeltasDays),
    budgetDeltas,
    avgBudgetDelta: average(budgetDeltas),
    medianBudgetDelta: median(budgetDeltas),
    scheduledRunCount,
    avgRevisionsPerScheduledRun,
    pctRunsWithMultipleRevisions,
  };
}

export function exportPlanningChangeAnalyticsCsv(
  metrics: PlanningChangeAnalyticsMetrics,
  filters: { project?: string; category?: string },
): void {
  const lines = [
    'Planning change analytics',
    `Project filter,${filters.project ?? 'all'}`,
    `Category filter,${filters.category ?? 'all'}`,
    `Total change events,${metrics.totalEvents}`,
    `Runs in scope,${metrics.runCount}`,
    `Runs with changes,${metrics.runsWithChanges}`,
    `Avg changes per run,${metrics.avgChangesPerRun.toFixed(2)}`,
    `Avg timeline delta (days),${metrics.avgTimelineDeltaDays?.toFixed(1) ?? ''}`,
    `Median timeline delta (days),${metrics.medianTimelineDeltaDays?.toFixed(1) ?? ''}`,
    `Avg budget delta,${metrics.avgBudgetDelta?.toFixed(0) ?? ''}`,
    `Median budget delta,${metrics.medianBudgetDelta?.toFixed(0) ?? ''}`,
    `Scheduled runs,${metrics.scheduledRunCount}`,
    `Avg revisions per scheduled run,${metrics.avgRevisionsPerScheduledRun?.toFixed(2) ?? ''}`,
    `Pct runs with 2+ revisions,${metrics.pctRunsWithMultipleRevisions?.toFixed(1) ?? ''}`,
    '',
    'Events by planning tool',
    'Tool,Count',
    ...metrics.eventsByTool.map((r) => `${r.tool},${r.count}`),
  ].join('\n');

  const blob = new Blob([lines], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `planning-change-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  window.URL.revokeObjectURL(url);
}

export function planningToolDisplayLabel(tool: string): string {
  const labels: Record<PlanningToolId, string> = {
    scope: 'Scope',
    schedule: 'Schedule',
    communication_plan: 'Communication',
    risk: 'Risk',
    budget: 'Budget',
    shopping_list: 'Shopping',
    tool_rentals: 'Tool rentals',
    waste_removal: 'Waste removal',
    quality_control: 'Quality',
    expert_support: 'Expert support',
  };
  return (labels as Record<string, string>)[tool] ?? tool;
}
