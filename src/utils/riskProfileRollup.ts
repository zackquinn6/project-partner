/**
 * Rolling a run's applied risk list up to one line per component.
 *
 * Counts rather than a single score, because a project with one High and a project with nine
 * Lows are not the same problem and averaging them into a number hides which one to work on.
 * Unscored items are their own count: an item nobody scored is not a Low.
 */

import {
  RISK_DIMENSIONS,
  actionPriorityUrgency,
  isActionPriority,
  isRiskDimension,
  worstActionPriority,
  type ActionPriority,
  type RiskDimension,
} from '@/utils/riskDimensions';

export interface RiskRollupRow {
  risk_dimension: string | null;
  action_priority: string | null;
  excluded_by_customization?: boolean | null;
  hidden_from_register?: boolean | null;
}

export interface RiskRpnRow extends RiskRollupRow {
  rpn?: number | null;
}

export interface RiskComponentRollup {
  dimension: RiskDimension;
  worstActionPriority: ActionPriority | null;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  unscoredCount: number;
  /** Items counted for this component, scored or not. */
  totalCount: number;
}

/**
 * One rollup per component, always all four, so a component with nothing in it reads as
 * "nothing recorded" rather than disappearing from the overview.
 *
 * Rows the user hid, and rows a rule or a customization decision excluded, do not count: they
 * are not part of this run's work.
 */
export function rollupRiskComponents(
  rows: readonly RiskRollupRow[]
): Record<RiskDimension, RiskComponentRollup> {
  const rollups = {} as Record<RiskDimension, RiskComponentRollup>;
  const priorities = new Map<RiskDimension, ActionPriority[]>();

  for (const dimension of RISK_DIMENSIONS) {
    rollups[dimension] = {
      dimension,
      worstActionPriority: null,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      unscoredCount: 0,
      totalCount: 0,
    };
  }

  for (const row of rows) {
    if (!isRiskDimension(row.risk_dimension)) continue;
    if (row.excluded_by_customization === true || row.hidden_from_register === true) continue;

    const rollup = rollups[row.risk_dimension];
    rollup.totalCount += 1;

    if (!isActionPriority(row.action_priority)) {
      rollup.unscoredCount += 1;
      continue;
    }
    if (row.action_priority === 'H') rollup.highCount += 1;
    else if (row.action_priority === 'M') rollup.mediumCount += 1;
    else rollup.lowCount += 1;

    const list = priorities.get(row.risk_dimension);
    if (list) {
      list.push(row.action_priority);
    } else {
      priorities.set(row.risk_dimension, [row.action_priority]);
    }
  }

  for (const [dimension, list] of priorities) {
    rollups[dimension].worstActionPriority = worstActionPriority(list);
  }

  return rollups;
}

/**
 * The worst line's RPN per component, on the 1-1000 scale every scored line already carries.
 *
 * The max rather than an average or a weighted sum: an average is an invented weighting, and
 * it lets nine Lows hide the one High that is the actual problem. Null means no line in the
 * component is scored, which is not the same reading as a low score.
 */
export function worstRpnByComponent(
  rows: readonly RiskRpnRow[]
): Record<RiskDimension, number | null> {
  const worst = {} as Record<RiskDimension, number | null>;
  for (const dimension of RISK_DIMENSIONS) {
    worst[dimension] = null;
  }

  for (const row of rows) {
    if (!isRiskDimension(row.risk_dimension)) continue;
    if (row.excluded_by_customization === true || row.hidden_from_register === true) continue;
    if (row.rpn == null || !Number.isFinite(row.rpn)) continue;

    const current = worst[row.risk_dimension];
    if (current === null || row.rpn > current) {
      worst[row.risk_dimension] = row.rpn;
    }
  }

  return worst;
}

export interface RiskPriorityOrderRow {
  action_priority: string | null;
  rpn?: number | null;
  title: string;
}

/**
 * Worst priority first, then the bigger RPN, then alphabetical, so "top items" means the same
 * thing in the register and in the dashboard. Unscored rows sort last rather than being given
 * a priority they do not have.
 */
export function compareByRiskPriority(a: RiskPriorityOrderRow, b: RiskPriorityOrderRow): number {
  const apA = isActionPriority(a.action_priority) ? actionPriorityUrgency(a.action_priority) : 0;
  const apB = isActionPriority(b.action_priority) ? actionPriorityUrgency(b.action_priority) : 0;
  if (apA !== apB) return apB - apA;
  const rpnA = a.rpn ?? 0;
  const rpnB = b.rpn ?? 0;
  if (rpnA !== rpnB) return rpnB - rpnA;
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
}

/** DIY-facing component names for the overview. */
export const RISK_COMPONENT_CONSUMER_LABELS: Record<RiskDimension, string> = {
  quality: 'Result',
  safety: 'Safety',
  schedule: 'Time',
  budget: 'Cost',
};

/** What a component being High actually threatens, for the overview subtext. */
export const RISK_COMPONENT_CONSUMER_STAKES: Record<RiskDimension, string> = {
  quality: 'how the finished work turns out',
  safety: 'getting hurt or breaking code',
  schedule: 'finishing when you planned to',
  budget: 'spending more than you planned',
};
