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
 * Apply exponential transformation to linear progress
 * Maps linear progress (0-100) to exponential progress where:
 * - 90% linear → ~60% exponential (reflects heavier effort to complete final work)
 * Uses a power function to compress progress at higher values
 * Formula: exponential = 100 * (linear/100)^k where k > 1 compresses high values
 * To achieve 90% → 60%: 60 = 100 * 0.9^k, so k = log(0.6)/log(0.9) ≈ 4.48
 * We use a moderated k ≈ 2.2 for a smoother curve that still provides noticeable compression
 */
function applyExponentialTransform(linearProgress: number): number {
  if (linearProgress <= 0) return 0;
  if (linearProgress >= 100) return 100;
  
  const normalized = linearProgress / 100;
  // Use power function with exponent > 1 to compress high-end progress
  // To achieve 90% → 60%: 60 = 100 * 0.9^k, so k = log(0.6)/log(0.9) ≈ 4.48
  // Using k = 4.5 to closely match the requirement
  const compressionFactor = 4.5;
  const exponential = 100 * Math.pow(normalized, compressionFactor);
  
  return Math.round(exponential);
}

/**
 * UNIFIED PROGRESS CALCULATION UTILITY
 * Single source of truth for calculating project progress
 * 
 * Supports three progress reporting styles:
 * 1. Linear: Simple step count-based (step 7 of 14 = 50%)
 * 2. Exponential: Weighted toward completion (90% linear → 60% exponential)
 * 3. Time-based: Uses time estimates aligned to speed setting (fast-track = low, steady = medium, extended = high)
 * 
 * IMPORTANT: Counts ALL steps including standard phases (Kickoff, Planning, Ordering, Close Project)
 * For manual projects (is_manual_entry), uses the stored progress value instead of calculating
 */
export function calculateProjectProgress(
  projectRun: ProjectRun,
  progressStyle: ProgressReportingStyle = 'linear'
): number {
  // For manual projects, use the stored progress value
  if (projectRun.isManualEntry) {
    return projectRun.progress ?? 0;
  }
  
  if (!projectRun.phases || projectRun.phases.length === 0) {
    return 0;
  }
  
  const completedStepIds = new Set(projectRun.completedSteps || []);
  
  // LINEAR: Simple step count-based progress
  if (progressStyle === 'linear') {
    let totalSteps = 0;
    let completedSteps = 0;
    
    projectRun.phases.forEach(phase => {
      phase.operations?.forEach(op => {
        op.steps?.forEach(step => {
          totalSteps++;
          if (completedStepIds.has(step.id)) {
            completedSteps++;
          }
        });
      });
    });
    
    if (totalSteps === 0) return 0;
    return Math.round((completedSteps / totalSteps) * 100);
  }
  
  // TIME-BASED: Uses time estimates with speed setting
  if (progressStyle === 'time-based') {
    // Get speed setting from schedule_events or default to 'steady'
    const scheduleEvents = projectRun.schedule_events as any;
    const scheduleTempo = scheduleEvents?.scheduleTempo || 'steady';
    const speedSetting = scheduleTempo as 'fast_track' | 'steady' | 'extended';
    
    let totalTime = 0;
    let completedTime = 0;
    
    projectRun.phases.forEach(phase => {
      phase.operations?.forEach(op => {
        op.steps?.forEach(step => {
          const stepTime = getStepTimeEstimate(step, speedSetting);
          totalTime += stepTime;
          
          if (completedStepIds.has(step.id)) {
            completedTime += stepTime;
          }
        });
      });
    });
    
    if (totalTime === 0) return 0;
    const linearProgress = (completedTime / totalTime) * 100;
    return Math.round(linearProgress);
  }
  
  // EXPONENTIAL: Weighted progress with exponential transformation
  // First calculate linear weighted progress, then apply exponential transform
  let totalWeight = 0;
  let completedWeight = 0;
  
  projectRun.phases.forEach(phase => {
    phase.operations?.forEach(op => {
      op.steps?.forEach(step => {
        const weight = getStepWeight(step.stepType);
        totalWeight += weight;
        
        if (completedStepIds.has(step.id)) {
          completedWeight += weight;
        }
      });
    });
  });
  
  if (totalWeight === 0) return 0;
  
  const linearProgress = (completedWeight / totalWeight) * 100;
  return applyExponentialTransform(linearProgress);
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
  
  // Count ALL phases including standard phases with weights
  projectRun.phases.forEach(phase => {
    phase.operations?.forEach(op => {
      op.steps?.forEach(step => {
        totalSteps++;
        const weight = getStepWeight(step.stepType);
        totalWeight += weight;
        
        if (completedStepIds.has(step.id)) {
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
