import { ProjectRun } from '@/interfaces/ProjectRun';
import { WorkflowStep } from '@/interfaces/Project';

/**
 * STEP WEIGHT CONSTANTS
 * These weights are used for progress calculation:
 * - Scaled steps: 1.0 point (main work that scales with project size)
 * - Quality Control – Scaled: 1.0 point (QC that scales with project size)
 * - Prime steps: 0.1 points (one-time setup/prep steps)
 * - Quality Control – Non Scaled: 0.1 points (fixed verification/inspection steps)
 */
export const STEP_WEIGHTS = {
  scaled: 1.0,
  quality_control_scaled: 1.0,
  prime: 0.1,
  quality_control_non_scaled: 0.1
} as const;

export type ProgressReportingStyle = 'linear' | 'exponential' | 'time-based';

/**
 * Get the weight for a step based on its type
 */
export function getStepWeight(stepType?: string): number {
  if (!stepType) return STEP_WEIGHTS.prime; // Default to prime weight
  return STEP_WEIGHTS[stepType as keyof typeof STEP_WEIGHTS] ?? STEP_WEIGHTS.prime;
}

/**
 * True if this step counts as completed (simple id or composite stepId:spaceId keys).
 */
export function isStepCompletedInRun(
  stepId: string,
  completedStepIds: Set<string>
): boolean {
  if (completedStepIds.has(stepId)) {
    return true;
  }
  for (const key of completedStepIds) {
    if (key.startsWith(`${stepId}:`)) {
      return true;
    }
  }
  return false;
}

/**
 * Get time estimate for a step based on speed setting
 * fast_track = low, steady = medium, extended = high
 */
function getStepTimeEstimate(
  step: WorkflowStep,
  speedSetting: 'fast_track' | 'steady' | 'extended' = 'steady'
): number {
  const timeEstimation = step.timeEstimation?.variableTime;
  if (!timeEstimation) return 0;

  switch (speedSetting) {
    case 'fast_track':
      return timeEstimation.low || 0;
    case 'steady':
      return timeEstimation.medium || 0;
    case 'extended':
      return timeEstimation.high || 0;
    default:
      return timeEstimation.medium || 0;
  }
}

/**
 * Apply exponential transformation to linear (weighted) progress.
 * Maps high linear progress down (e.g. ~90% linear → ~60%) while keeping 0→0 and 100→100.
 * Uses a power curve; very low linear values are floored by finalizeStartedProgress so they are not rounded to 0%.
 */
function applyExponentialTransform(linearProgress: number): number {
  if (linearProgress <= 0) return 0;
  if (linearProgress >= 100) return 100;

  const normalized = linearProgress / 100;
  const compressionFactor = 4.5;
  const exponential = 100 * Math.pow(normalized, compressionFactor);

  return Math.round(exponential);
}

/**
 * If any weighted work is done but the rounded percentage is 0 (or stuck below 1), show 1%
 * so "started" projects never read as 0% across linear / exponential / time-based.
 */
function finalizeStartedProgress(rawPercent: number, completedWeight: number): number {
  if (rawPercent >= 100) return 100;
  if (completedWeight <= 0) return rawPercent;
  if (rawPercent < 1) return 1;
  return rawPercent;
}

type ProgressMetrics = {
  totalWeight: number;
  completedWeight: number;
  totalTime: number;
  completedTime: number;
};

function accumulateProgressMetrics(
  projectRun: ProjectRun,
  completedStepIds: Set<string>,
  speedSetting: 'fast_track' | 'steady' | 'extended'
): ProgressMetrics {
  let totalWeight = 0;
  let completedWeight = 0;
  let totalTime = 0;
  let completedTime = 0;

  projectRun.phases?.forEach((phase) => {
    phase.operations?.forEach((op) => {
      op.steps?.forEach((step) => {
        const weight = getStepWeight(step.stepType);
        totalWeight += weight;
        const done = isStepCompletedInRun(step.id, completedStepIds);
        if (done) {
          completedWeight += weight;
        }

        const stepTime = getStepTimeEstimate(step, speedSetting);
        totalTime += stepTime;
        if (done) {
          completedTime += stepTime;
        }
      });
    });
  });

  return { totalWeight, completedWeight, totalTime, completedTime };
}

/**
 * UNIFIED PROGRESS CALCULATION UTILITY
 * Single source of truth for calculating project progress
 *
 * Supports three progress reporting styles:
 * 1. Linear: Weighted step progress (prime vs scaled weights)
 * 2. Exponential: Same weighted base as linear, then curved (high linear compresses down)
 * 3. Time-based: By step time estimates and schedule tempo; if no time data exists, same as linear
 *
 * IMPORTANT: Counts ALL steps including standard phases (Kickoff, Planning, Ordering, Close Project)
 * For manual projects (is_manual_entry), uses the stored progress value instead of calculating
 */
export function calculateProjectProgress(
  projectRun: ProjectRun,
  progressStyle?: ProgressReportingStyle
): number {
  const style = progressStyle ?? projectRun.progress_reporting_style;
  if (!style) {
    throw new Error('progress_reporting_style is missing from project run data');
  }
  if (projectRun.isManualEntry) {
    return projectRun.progress ?? 0;
  }

  if (!projectRun.phases || projectRun.phases.length === 0) {
    return 0;
  }

  const completedStepIds = new Set(projectRun.completedSteps || []);
  const scheduleEvents = projectRun.schedule_events as { scheduleTempo?: string } | undefined;
  const scheduleTempo = scheduleEvents?.scheduleTempo || 'steady';
  const speedSetting = scheduleTempo as 'fast_track' | 'steady' | 'extended';

  const metrics = accumulateProgressMetrics(projectRun, completedStepIds, speedSetting);
  const { totalWeight, completedWeight, totalTime, completedTime } = metrics;

  if (totalWeight === 0) {
    return 0;
  }

  const linearWeightedPercent = (completedWeight / totalWeight) * 100;
  const linearRounded = Math.round(linearWeightedPercent);

  let raw: number;

  if (style === 'linear') {
    raw = linearRounded;
  } else if (style === 'time-based') {
    if (totalTime > 0) {
      raw = Math.round((completedTime / totalTime) * 100);
    } else {
      // No per-step time estimates: fall back to weighted linear so progress matches workflow/dashboard
      raw = linearRounded;
    }
  } else {
    // exponential
    raw = applyExponentialTransform(linearWeightedPercent);
  }

  return finalizeStartedProgress(raw, completedWeight);
}

/**
 * Get weighted steps count (INCLUDING all phases - kickoff and standard phases)
 * Returns both raw counts and weighted values
 *
 * NOTE: This function always returns step counts (for "Step X of Y" display),
 * regardless of progress reporting style. The progress percentage is calculated separately.
 */
export function getWorkflowStepsCount(projectRun: ProjectRun): {
  total: number;
  completed: number;
  totalWeight: number;
  completedWeight: number;
} {
  if (!projectRun.phases || projectRun.phases.length === 0) {
    return { total: 0, completed: 0, totalWeight: 0, completedWeight: 0 };
  }

  let totalSteps = 0;
  let completedSteps = 0;
  let totalWeight = 0;
  let completedWeight = 0;
  const completedStepIds = new Set(projectRun.completedSteps || []);

  projectRun.phases.forEach((phase) => {
    phase.operations?.forEach((op) => {
      op.steps?.forEach((step) => {
        totalSteps++;
        const weight = getStepWeight(step.stepType);
        totalWeight += weight;

        if (isStepCompletedInRun(step.id, completedStepIds)) {
          completedSteps++;
          completedWeight += weight;
        }
      });
    });
  });

  return {
    total: totalSteps,
    completed: completedSteps,
    totalWeight,
    completedWeight
  };
}
