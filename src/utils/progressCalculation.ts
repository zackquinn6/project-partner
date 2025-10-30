import { ProjectRun } from '@/interfaces/ProjectRun';

/**
 * STEP WEIGHT CONSTANTS
 * These weights are used for progress calculation:
 * - Scaled steps: 1.0 point (main work that scales with project size)
 * - Prime steps: 0.1 points (one-time setup/prep steps)
 * - Quality Control steps: 0.1 points (verification/inspection steps)
 */
export const STEP_WEIGHTS = {
  scaled: 1.0,
  prime: 0.1,
  quality_control: 0.1
} as const;

/**
 * Get the weight for a step based on its type
 */
export function getStepWeight(stepType?: string): number {
  if (!stepType) return STEP_WEIGHTS.prime; // Default to prime weight
  return STEP_WEIGHTS[stepType as keyof typeof STEP_WEIGHTS] ?? STEP_WEIGHTS.prime;
}

/**
 * UNIFIED WEIGHTED PROGRESS CALCULATION UTILITY
 * Single source of truth for calculating project progress
 * 
 * Uses weighted progress where:
 * - Scaled steps are worth 1 point each
 * - Prime and Quality Control steps are worth 0.1 points each
 * 
 * IMPORTANT: Counts ALL steps including standard phases (Kickoff, Planning, Ordering, Close Project)
 * For manual projects (is_manual_entry), uses the stored progress value instead of calculating
 */
export function calculateProjectProgress(projectRun: ProjectRun): number {
  // For manual projects, use the stored progress value
  if (projectRun.isManualEntry) {
    return projectRun.progress ?? 0;
  }
  
  if (!projectRun.phases || projectRun.phases.length === 0) {
    return 0;
  }
  
  let totalWeight = 0;
  let completedWeight = 0;
  const completedStepIds = new Set(projectRun.completedSteps || []);
  
  // Calculate weighted progress for ALL phases
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
  
  if (totalWeight === 0) {
    return 0;
  }
  
  return Math.round((completedWeight / totalWeight) * 100);
}

/**
 * Get weighted steps count (INCLUDING all phases - kickoff and standard phases)
 * Returns both raw counts and weighted values
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
