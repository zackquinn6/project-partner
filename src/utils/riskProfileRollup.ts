/**
 * Rolling a run's applied risk list up to one line per component.
 *
 * Counts rather than a single score, because a project with one High and a project with nine
 * Lows are not the same problem and averaging them into a number hides which one to work on.
 * Unscored items are their own count: an item nobody scored is not a Low.
 */

import {
  RISK_DIMENSIONS,
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
