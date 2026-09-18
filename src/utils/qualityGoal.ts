import type { Phase, WorkflowStep } from '@/interfaces/Project';

export const QUALITY_GOAL_OPTIONS = [
  { value: 'good', label: 'Good' },
  { value: 'great', label: 'Great' },
  { value: 'professional', label: 'Professional' },
] as const;

export type QualityGoal = (typeof QUALITY_GOAL_OPTIONS)[number]['value'];

/** Minimum quality goal on a step/op: null means included at every level. */
export type MinQualityGoal = 'great' | 'professional';

/** Default quality goal for new project runs. */
export const DEFAULT_QUALITY_GOAL: QualityGoal = 'great';

const QUALITY_GOAL_RANK: Record<QualityGoal, number> = {
  good: 0,
  great: 1,
  professional: 2,
};

export function isQualityGoal(value: unknown): value is QualityGoal {
  return value === 'good' || value === 'great' || value === 'professional';
}

export function isMinQualityGoal(value: unknown): value is MinQualityGoal {
  return value === 'great' || value === 'professional';
}

/** Parse a project_runs.initial_quality_goal column value. */
export function parseQualityGoalColumn(raw: unknown): QualityGoal | undefined {
  if (isQualityGoal(raw)) return raw;
  return undefined;
}

export function qualityGoalRank(goal: QualityGoal): number {
  return QUALITY_GOAL_RANK[goal];
}

export function qualityGoalLabel(goal: QualityGoal): string {
  const found = QUALITY_GOAL_OPTIONS.find((o) => o.value === goal);
  if (!found) {
    throw new Error(`Unknown quality goal: ${String(goal)}`);
  }
  return found.label;
}

/** Lower adjacent level, if any (Great → Good, Professional → Great). */
export function qualityGoalBelow(goal: QualityGoal): QualityGoal | undefined {
  if (goal === 'great') return 'good';
  if (goal === 'professional') return 'great';
  return undefined;
}

/**
 * Whether a step/op with min_quality_goal is included for the run goal.
 * NULL / missing min → all levels. great → Great+Professional. professional → Professional only.
 */
export function meetsMinQualityGoal(
  runGoal: QualityGoal,
  minQualityGoal: MinQualityGoal | null | undefined,
): boolean {
  if (minQualityGoal == null) return true;
  if (!isMinQualityGoal(minQualityGoal)) return true;
  return qualityGoalRank(runGoal) >= qualityGoalRank(minQualityGoal);
}

export function getStepMinQualityGoal(
  step:
    | Pick<WorkflowStep, 'minQualityGoal'>
    | { minQualityGoal?: string | null; min_quality_goal?: string | null },
): MinQualityGoal | null {
  const raw =
    (step as { minQualityGoal?: string | null }).minQualityGoal ??
    (step as { min_quality_goal?: string | null }).min_quality_goal;
  if (isMinQualityGoal(raw)) return raw;
  return null;
}

/**
 * Forward-path visibility: include when the step meets the quality gate,
 * or when it is already completed (mid-run goal changes must not hide finished work).
 */
export function isStepVisibleForQualityGoal(
  step: Pick<WorkflowStep, 'id' | 'minQualityGoal'>,
  runGoal: QualityGoal,
  completedStepIds: ReadonlySet<string> | readonly string[],
): boolean {
  const completed =
    completedStepIds instanceof Set
      ? completedStepIds
      : new Set(completedStepIds);

  if (completed.has(step.id)) return true;
  for (const key of completed) {
    if (key.startsWith(`${step.id}:`)) return true;
  }

  return meetsMinQualityGoal(runGoal, getStepMinQualityGoal(step));
}

/** Filter phases for navigation/progress: keep completed gated steps; drop incomplete gated-out steps. */
export function filterPhasesForQualityGoal(
  phases: Phase[] | null | undefined,
  runGoal: QualityGoal,
  completedStepIds: ReadonlySet<string> | readonly string[],
): Phase[] {
  if (!phases?.length) return [];

  return phases.map((phase) => ({
    ...phase,
    operations: (phase.operations || []).map((op) => ({
      ...op,
      steps: (op.steps || []).filter((step) =>
        isStepVisibleForQualityGoal(step, runGoal, completedStepIds),
      ),
    })),
  }));
}

/** Step titles that appear at `higher` but not at `lower` (Professional extras vs Great). */
export function gatedStepTitlesBetween(
  phases: Phase[] | null | undefined,
  lower: QualityGoal,
  higher: QualityGoal,
): string[] {
  if (!phases?.length) return [];
  if (qualityGoalRank(higher) <= qualityGoalRank(lower)) return [];

  const titles: string[] = [];
  for (const phase of phases) {
    for (const op of phase.operations || []) {
      for (const step of op.steps || []) {
        const min = getStepMinQualityGoal(step);
        if (!meetsMinQualityGoal(lower, min) && meetsMinQualityGoal(higher, min)) {
          titles.push(step.step || step.stepTitle || step.id);
        }
      }
    }
  }
  return titles;
}
