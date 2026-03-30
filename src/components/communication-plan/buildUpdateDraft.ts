import type { Phase } from '@/interfaces/Project';
import type { ProjectRun } from '@/interfaces/ProjectRun';

export const TEMPLATE_KEYS = [
  'weekly_summary',
  'budget_change',
  'schedule_shift',
  'decision_needed',
  'milestone',
  'heads_up',
  'task_slip',
  'risk_active',
  'budget_overage',
  'custom',
] as const;

export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export interface DraftContext {
  projectDisplayName: string;
  progressPercent: number | null;
  completedStepCount: number;
  totalStepCount: number;
  startDateLabel: string | null;
  planEndDateLabel: string | null;
  scheduledEventCount: number;
  budgetVarianceSummary: string | null;
  openRiskCount: number;
  openRiskTitles: string[];
}

function countStepsInPhases(phases: Phase[] | undefined): number {
  if (!phases?.length) return 0;
  let n = 0;
  for (const p of phases) {
    for (const op of p.operations ?? []) {
      n += op.steps?.length ?? 0;
    }
  }
  return n;
}

function formatDate(d: Date | undefined | null): string | null {
  if (!d || Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function buildDraftContextFromRun(
  run: ProjectRun,
  openRisks: { risk_title: string }[],
): DraftContext {
  const name =
    run.customProjectName?.trim() ||
    run.name?.trim() ||
    'Project';

  const total = countStepsInPhases(run.phases);
  const completed = Array.isArray(run.completedSteps) ? run.completedSteps.length : 0;
  const progress =
    run.progress != null && Number.isFinite(run.progress)
      ? Math.round(run.progress)
      : total > 0
        ? Math.round((completed / total) * 100)
        : null;

  let budgetVarianceSummary: string | null = null;
  const bd = run.budget_data;
  if (bd?.lineItems?.length) {
    let budgeted = 0;
    let actual = 0;
    for (const li of bd.lineItems) {
      budgeted += Number(li.budgetedAmount) || 0;
      actual += Number(li.actualAmount) || 0;
    }
    const delta = actual - budgeted;
    budgetVarianceSummary =
      delta === 0
        ? `Budget tracked: ${bd.lineItems.length} line items; actuals match budgeted totals.`
        : `Budget tracked: ${bd.lineItems.length} line items; variance vs budgeted: ${delta >= 0 ? '+' : ''}${delta.toFixed(2)} (budgeted ${budgeted.toFixed(2)}, line-item actuals total ${actual.toFixed(2)}).`;
  }

  const evs = run.schedule_events?.events;
  const scheduledEventCount = Array.isArray(evs) ? evs.length : 0;

  return {
    projectDisplayName: name,
    progressPercent: progress,
    completedStepCount: completed,
    totalStepCount: total,
    startDateLabel: formatDate(run.startDate),
    planEndDateLabel: formatDate(run.planEndDate),
    scheduledEventCount,
    budgetVarianceSummary,
    openRiskCount: openRisks.length,
    openRiskTitles: openRisks.map((r) => r.risk_title).filter(Boolean),
  };
}

export function buildUpdateDraft(
  templateKey: TemplateKey,
  ctx: DraftContext,
): { subject: string; body: string } {
  const p = ctx.projectDisplayName;
  const progressLine =
    ctx.progressPercent != null && ctx.totalStepCount > 0
      ? `Progress: about ${ctx.progressPercent}% (${ctx.completedStepCount} of ${ctx.totalStepCount} steps completed).`
      : ctx.totalStepCount > 0
        ? `Progress: ${ctx.completedStepCount} of ${ctx.totalStepCount} steps completed.`
        : 'Progress: step counts are not available for this project yet.';

  const scheduleLine = [
    ctx.startDateLabel ? `Start: ${ctx.startDateLabel}` : null,
    ctx.planEndDateLabel ? `Target finish: ${ctx.planEndDateLabel}` : null,
    ctx.scheduledEventCount > 0
      ? `Scheduled work blocks on the calendar: ${ctx.scheduledEventCount}.`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  const budgetBlock = ctx.budgetVarianceSummary
    ? ctx.budgetVarianceSummary
    : 'No budget line items are recorded in Project Partner for this run yet.';

  const riskBlock =
    ctx.openRiskCount > 0
      ? `Open or monitored risks (${ctx.openRiskCount}): ${ctx.openRiskTitles.slice(0, 8).join('; ')}${ctx.openRiskTitles.length > 8 ? ' …' : ''}`
      : 'No open risks are listed in the risk register for this project right now.';

  switch (templateKey) {
    case 'weekly_summary':
      return {
        subject: `${p} — weekly update`,
        body: `Hi — quick update on "${p}".

${progressLine}

${scheduleLine || 'Schedule: dates not set in the app yet.'}

Budget snapshot:
${budgetBlock}

Risks:
${riskBlock}

Let me know if you want more detail on any area.`,
      };
    case 'budget_change':
      return {
        subject: `${p} — budget update`,
        body: `Hi — sharing a budget update for "${p}".

${budgetBlock}

${progressLine}

Reply if you want the full breakdown or receipts.`,
      };
    case 'schedule_shift':
      return {
        subject: `${p} — schedule change`,
        body: `Hi — there’s a change to the timeline for "${p}".

${scheduleLine || 'Please see the project calendar in the app for the latest dates.'}

${progressLine}

I’ll keep you posted if anything else moves.`,
      };
    case 'decision_needed':
      return {
        subject: `${p} — need your input`,
        body: `Hi — I need a decision on "${p}".

[Describe the choice and options here]

Context:
${progressLine}

${budgetBlock}`,
      };
    case 'milestone':
      return {
        subject: `${p} — milestone reached`,
        body: `Hi — we hit a milestone on "${p}".

${progressLine}

${scheduleLine || ''}

Thanks for bearing with the disruption — next up: [describe what’s next].`,
      };
    case 'heads_up':
      return {
        subject: `${p} — quick heads-up`,
        body: `Hi — heads-up about work on "${p}":

• [Noise / access / water shutoff / parking / etc. — add specifics]

When: [date/time window]
${scheduleLine ? `\n${scheduleLine}` : ''}

Thanks for your patience.`,
      };
    case 'task_slip':
      return {
        subject: `${p} — timeline slipping`,
        body: `Hi — some work on "${p}" is running behind what we planned.

${progressLine}

${scheduleLine || 'I’ll revise dates in the schedule and follow up with a new target.'}

I’ll share a revised plan shortly.`,
      };
    case 'risk_active':
      return {
        subject: `${p} — risk to flag`,
        body: `Hi — I want you aware of a risk on "${p}".

${riskBlock}

${progressLine}

Here’s what I’m doing about it: [add mitigation steps]`,
      };
    case 'budget_overage':
      return {
        subject: `${p} — spending over budget`,
        body: `Hi — actual costs on "${p}" are above what we budgeted.

${budgetBlock}

${progressLine}

Let’s talk about how we want to handle the gap.`,
      };
    case 'custom':
    default:
      return {
        subject: `${p} — update`,
        body: `[Write your update here]\n\n${progressLine}`,
      };
  }
}

export const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  weekly_summary: 'Weekly progress summary',
  budget_change: 'Budget changes',
  schedule_shift: 'Schedule shift or delay',
  decision_needed: 'Decision needed',
  milestone: 'Milestone completion',
  heads_up: 'Heads-up (noise, access, shutoff, etc.)',
  task_slip: 'Task / timeline slipping',
  risk_active: 'Risk became active',
  budget_overage: 'Budget overage',
  custom: 'Blank',
};

export const TRIGGER_TYPES = [
  'task_slip',
  'risk_active',
  'budget_overage',
  'milestone_complete',
  'decision_needed',
] as const;

export type TriggerType = (typeof TRIGGER_TYPES)[number];

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  task_slip: 'A task slips vs the plan',
  risk_active: 'A risk needs attention',
  budget_overage: 'Spending exceeds budget',
  milestone_complete: 'A milestone completes',
  decision_needed: 'A decision needs input',
};

/** Maps a trigger row to the best default template for drafting. */
export function templateKeyForTrigger(triggerType: TriggerType): TemplateKey {
  switch (triggerType) {
    case 'task_slip':
      return 'task_slip';
    case 'risk_active':
      return 'risk_active';
    case 'budget_overage':
      return 'budget_overage';
    case 'milestone_complete':
      return 'milestone';
    case 'decision_needed':
      return 'decision_needed';
    default:
      return 'custom';
  }
}
