export const QUALITY_GOAL_OPTIONS = [
  { value: 'good', label: 'Good' },
  { value: 'great', label: 'Great' },
  { value: 'professional', label: 'Professional' },
] as const;

export type QualityGoal = (typeof QUALITY_GOAL_OPTIONS)[number]['value'];

/** Default quality goal for new project runs. */
export const DEFAULT_QUALITY_GOAL: QualityGoal = 'great';

export function isQualityGoal(value: unknown): value is QualityGoal {
  return value === 'good' || value === 'great' || value === 'professional';
}

/** Parse a project_runs.initial_quality_goal column value. */
export function parseQualityGoalColumn(raw: unknown): QualityGoal | undefined {
  if (isQualityGoal(raw)) return raw;
  return undefined;
}
