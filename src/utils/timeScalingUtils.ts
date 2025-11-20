import { WorkflowStep, Phase, Project } from '@/interfaces/Project';

export interface SpaceSize {
  spaceId: string;
  spaceName: string;
  size: number; // The numeric size value
  unit: string; // e.g., 'sq ft', 'linear ft', etc.
}

export interface ProjectCustomization {
  spaces?: SpaceSize[];
  [key: string]: any;
}

/**
 * Calculate scaled time for a step based on its stepType and project spaces
 * 
 * @param step - The workflow step
 * @param spaces - Array of space sizes from project customization
 * @param projectScalingUnit - The project's scaling unit (e.g., 'per square foot')
 * @param sourceScalingUnit - For incorporated phases, the original project's scaling unit
 * @returns Total estimated time in hours { low, medium, high }
 */
export function calculateStepTime(
  step: WorkflowStep,
  spaces: SpaceSize[] = [],
  projectScalingUnit?: string,
  sourceScalingUnit?: string
): { low: number; medium: number; high: number } {
  const timeEstimation = step.timeEstimation?.variableTime;
  
  if (!timeEstimation) {
    return { low: 0, medium: 0, high: 0 };
  }

  // For prime and quality_control_non_scaled steps, time doesn't scale
  if (step.stepType === 'prime' || step.stepType === 'quality_control_non_scaled' || !step.stepType) {
    return {
      low: timeEstimation.low || 0,
      medium: timeEstimation.medium || 0,
      high: timeEstimation.high || 0
    };
  }

  // For scaled and quality_control_scaled steps, calculate based on total project size
  if (step.stepType === 'scaled' || step.stepType === 'quality_control_scaled') {
    // Use sourceScalingUnit if this is an incorporated phase, otherwise use projectScalingUnit
    const scalingUnit = sourceScalingUnit || projectScalingUnit;
    
    if (!scalingUnit || spaces.length === 0) {
      // If no scaling unit or spaces, return unscaled time
      return {
        low: timeEstimation.low || 0,
        medium: timeEstimation.medium || 0,
        high: timeEstimation.high || 0
      };
    }

    // Calculate total size across all spaces
    const totalSize = spaces.reduce((sum, space) => sum + space.size, 0);

    // Scale the time estimates by total size
    return {
      low: (timeEstimation.low || 0) * totalSize,
      medium: (timeEstimation.medium || 0) * totalSize,
      high: (timeEstimation.high || 0) * totalSize
    };
  }

  // Default fallback
  return {
    low: timeEstimation.low || 0,
    medium: timeEstimation.medium || 0,
    high: timeEstimation.high || 0
  };
}

/**
 * Calculate total time for an operation (sum of all its steps)
 */
export function calculateOperationTime(
  steps: WorkflowStep[],
  spaces: SpaceSize[] = [],
  projectScalingUnit?: string,
  sourceScalingUnit?: string
): { low: number; medium: number; high: number } {
  return steps.reduce(
    (total, step) => {
      const stepTime = calculateStepTime(step, spaces, projectScalingUnit, sourceScalingUnit);
      return {
        low: total.low + stepTime.low,
        medium: total.medium + stepTime.medium,
        high: total.high + stepTime.high
      };
    },
    { low: 0, medium: 0, high: 0 }
  );
}

/**
 * Calculate total time for a phase
 */
export function calculatePhaseTime(
  phase: Phase,
  spaces: SpaceSize[] = [],
  projectScalingUnit?: string
): { low: number; medium: number; high: number } {
  // For incorporated phases, use their source scaling unit
  const scalingUnit = phase.sourceScalingUnit || projectScalingUnit;
  
  return phase.operations.reduce(
    (total, operation) => {
      const operationTime = calculateOperationTime(
        operation.steps,
        spaces,
        projectScalingUnit,
        scalingUnit
      );
      return {
        low: total.low + operationTime.low,
        medium: total.medium + operationTime.medium,
        high: total.high + operationTime.high
      };
    },
    { low: 0, medium: 0, high: 0 }
  );
}

/**
 * Calculate total project time across all phases
 */
export function calculateProjectTime(
  project: Project,
  spaces: SpaceSize[] = []
): { low: number; medium: number; high: number } {
  return project.phases.reduce(
    (total, phase) => {
      const phaseTime = calculatePhaseTime(phase, spaces, project.scalingUnit);
      return {
        low: total.low + phaseTime.low,
        medium: total.medium + phaseTime.medium,
        high: total.high + phaseTime.high
      };
    },
    { low: 0, medium: 0, high: 0 }
  );
}

/**
 * Format time in hours to a human-readable string
 */
export function formatTimeEstimate(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)} min`;
  } else if (hours < 24) {
    return `${hours.toFixed(1)} hrs`;
  } else {
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    if (remainingHours === 0) {
      return `${days} day${days !== 1 ? 's' : ''}`;
    }
    return `${days}d ${remainingHours}h`;
  }
}
