/**
 * The four risk components and the Action Priority vocabulary shared by both authoring
 * layers: PFMEA owns quality, the project risk register owns safety, schedule, and budget.
 */

export const RISK_DIMENSIONS = ['quality', 'safety', 'schedule', 'budget'] as const;
export type RiskDimension = (typeof RISK_DIMENSIONS)[number];

/** The three components authored in the register rather than the PFMEA. */
export const REGISTER_RISK_DIMENSIONS = ['safety', 'schedule', 'budget'] as const;
export type RegisterRiskDimension = (typeof REGISTER_RISK_DIMENSIONS)[number];

export type ActionPriority = 'H' | 'M' | 'L';

export type RiskSource = 'pfmea' | 'register';

export function isRiskDimension(value: unknown): value is RiskDimension {
  return typeof value === 'string' && (RISK_DIMENSIONS as readonly string[]).includes(value);
}

export function isRegisterRiskDimension(value: unknown): value is RegisterRiskDimension {
  return typeof value === 'string' && (REGISTER_RISK_DIMENSIONS as readonly string[]).includes(value);
}

export function isActionPriority(value: unknown): value is ActionPriority {
  return value === 'H' || value === 'M' || value === 'L';
}

/** Admin-facing component names. Consumer wording comes from risk_action_priority_labels. */
export const RISK_DIMENSION_LABELS: Record<RiskDimension, string> = {
  quality: 'Quality',
  safety: 'Safety',
  schedule: 'Schedule',
  budget: 'Budget',
};

/**
 * Ascending urgency, so the worst priority across a set is a max rather than a hardcoded
 * H/M/L comparison chain. Mirrors risk_action_priority_labels.urgency_rank.
 */
const ACTION_PRIORITY_URGENCY: Record<ActionPriority, number> = {
  L: 1,
  M: 2,
  H: 3,
};

export function actionPriorityUrgency(ap: ActionPriority): number {
  return ACTION_PRIORITY_URGENCY[ap];
}

/** Worst priority in the list, or null when the list is empty. */
export function worstActionPriority(values: readonly ActionPriority[]): ActionPriority | null {
  let worst: ActionPriority | null = null;
  for (const value of values) {
    if (worst === null || actionPriorityUrgency(value) > actionPriorityUrgency(worst)) {
      worst = value;
    }
  }
  return worst;
}

/** Descending urgency, for "close out the Highs first" ordering. */
export function compareActionPriorityHighFirst(a: ActionPriority, b: ActionPriority): number {
  return actionPriorityUrgency(b) - actionPriorityUrgency(a);
}
