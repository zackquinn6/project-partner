import { Project, Phase, WorkflowStep } from '@/interfaces/Project';

export interface TimeEstimateBreakdown {
  fixedTime: {
    low: number;
    medium: number;
    high: number;
  };
  scaledTimePerUnit: {
    low: number;
    medium: number;
    high: number;
  };
  incorporatedPhases: Array<{
    phaseName: string;
    sourceProjectName?: string;
    fixedTime: { low: number; medium: number; high: number };
    scaledTimePerUnit: { low: number; medium: number; high: number };
    scalingUnit: string;
  }>;
}

/**
 * Calculate time estimates for a single step
 * Returns fixed time (for prime/QC non-scaled) and time per unit (for scaled/QC scaled)
 */
function calculateStepTimeEstimate(step: WorkflowStep): {
  fixedTime: { low: number; medium: number; high: number };
  timePerUnit: { low: number; medium: number; high: number };
} {
  const timeEstimation = step.timeEstimation?.variableTime;
  
  if (!timeEstimation) {
    return {
      fixedTime: { low: 0, medium: 0, high: 0 },
      timePerUnit: { low: 0, medium: 0, high: 0 }
    };
  }

  const low = timeEstimation.low || 0;
  const medium = timeEstimation.medium || 0;
  const high = timeEstimation.high || 0;

  // Prime and QC Non-Scaled are fixed time
  if (step.stepType === 'prime' || step.stepType === 'quality_control_non_scaled' || !step.stepType) {
    return {
      fixedTime: { low, medium, high },
      timePerUnit: { low: 0, medium: 0, high: 0 }
    };
  }

  // Scaled and QC Scaled are time per unit
  if (step.stepType === 'scaled' || step.stepType === 'quality_control_scaled') {
    return {
      fixedTime: { low: 0, medium: 0, high: 0 },
      timePerUnit: { low, medium, high }
    };
  }

  // Default: treat as fixed time
  return {
    fixedTime: { low, medium, high },
    timePerUnit: { low: 0, medium: 0, high: 0 }
  };
}

/**
 * Calculate time estimates for all steps in an operation
 */
function calculateOperationTimeEstimate(operation: { steps: WorkflowStep[] }): {
  fixedTime: { low: number; medium: number; high: number };
  timePerUnit: { low: number; medium: number; high: number };
} {
  // Safety check: ensure steps array exists
  if (!operation.steps || operation.steps.length === 0) {
    return {
      fixedTime: { low: 0, medium: 0, high: 0 },
      timePerUnit: { low: 0, medium: 0, high: 0 }
    };
  }

  return operation.steps.reduce(
    (total, step) => {
      const stepEstimate = calculateStepTimeEstimate(step);
      return {
        fixedTime: {
          low: total.fixedTime.low + stepEstimate.fixedTime.low,
          medium: total.fixedTime.medium + stepEstimate.fixedTime.medium,
          high: total.fixedTime.high + stepEstimate.fixedTime.high
        },
        timePerUnit: {
          low: total.timePerUnit.low + stepEstimate.timePerUnit.low,
          medium: total.timePerUnit.medium + stepEstimate.timePerUnit.medium,
          high: total.timePerUnit.high + stepEstimate.timePerUnit.high
        }
      };
    },
    {
      fixedTime: { low: 0, medium: 0, high: 0 },
      timePerUnit: { low: 0, medium: 0, high: 0 }
    }
  );
}

/**
 * Calculate time estimates for a phase
 */
function calculatePhaseTimeEstimate(phase: Phase): {
  fixedTime: { low: number; medium: number; high: number };
  timePerUnit: { low: number; medium: number; high: number };
} {
  // Safety check: ensure operations array exists
  if (!phase.operations || phase.operations.length === 0) {
    return {
      fixedTime: { low: 0, medium: 0, high: 0 },
      timePerUnit: { low: 0, medium: 0, high: 0 }
    };
  }

  return phase.operations.reduce(
    (total, operation) => {
      // Safety check: ensure operation has steps
      if (!operation.steps || operation.steps.length === 0) {
        return total;
      }
      const operationEstimate = calculateOperationTimeEstimate(operation);
      return {
        fixedTime: {
          low: total.fixedTime.low + operationEstimate.fixedTime.low,
          medium: total.fixedTime.medium + operationEstimate.fixedTime.medium,
          high: total.fixedTime.high + operationEstimate.fixedTime.high
        },
        timePerUnit: {
          low: total.timePerUnit.low + operationEstimate.timePerUnit.low,
          medium: total.timePerUnit.medium + operationEstimate.timePerUnit.medium,
          high: total.timePerUnit.high + operationEstimate.timePerUnit.high
        }
      };
    },
    {
      fixedTime: { low: 0, medium: 0, high: 0 },
      timePerUnit: { low: 0, medium: 0, high: 0 }
    }
  );
}

/**
 * Calculate total time estimates for a project, separating:
 * - Fixed time (from Prime and QC Non-Scaled steps)
 * - Scaled time per unit (from Scaled and QC Scaled steps)
 * - Incorporated phases (separated by phase, excluding standard phases)
 */
export function calculateProjectTimeEstimate(project: Project): TimeEstimateBreakdown {
  // Main phases: non-linked phases OR standard phases (standard phases are always included in main project)
  const mainPhases = project.phases.filter(phase => !phase.isLinked || phase.isStandard);
  // Incorporated phases: linked phases that are NOT standard (standard phases should not appear separately)
  const incorporatedPhases = project.phases.filter(phase => phase.isLinked && !phase.isStandard);

  // Calculate main project time estimates (includes standard phases even if they're linked)
  const mainProjectEstimate = mainPhases.reduce(
    (total, phase) => {
      const phaseEstimate = calculatePhaseTimeEstimate(phase);
      return {
        fixedTime: {
          low: total.fixedTime.low + phaseEstimate.fixedTime.low,
          medium: total.fixedTime.medium + phaseEstimate.fixedTime.medium,
          high: total.fixedTime.high + phaseEstimate.fixedTime.high
        },
        timePerUnit: {
          low: total.timePerUnit.low + phaseEstimate.timePerUnit.low,
          medium: total.timePerUnit.medium + phaseEstimate.timePerUnit.medium,
          high: total.timePerUnit.high + phaseEstimate.timePerUnit.high
        }
      };
    },
    {
      fixedTime: { low: 0, medium: 0, high: 0 },
      timePerUnit: { low: 0, medium: 0, high: 0 }
    }
  );

  // Calculate incorporated phases separately (excluding standard phases)
  const incorporatedPhasesBreakdown = incorporatedPhases.map(phase => {
    const phaseEstimate = calculatePhaseTimeEstimate(phase);
    const scalingUnit = phase.sourceScalingUnit || project.scalingUnit || 'per item';
    
    return {
      phaseName: phase.name,
      sourceProjectName: phase.sourceProjectName,
      fixedTime: phaseEstimate.fixedTime,
      scaledTimePerUnit: phaseEstimate.timePerUnit,
      scalingUnit
    };
  });

  return {
    fixedTime: mainProjectEstimate.fixedTime,
    scaledTimePerUnit: mainProjectEstimate.timePerUnit,
    incorporatedPhases: incorporatedPhasesBreakdown
  };
}

/**
 * Format scaling unit for display
 */
export function formatScalingUnit(unit?: string): string {
  if (!unit) return 'unit';
  
  switch (unit) {
    case 'per square foot':
      return 'sq ft';
    case 'per 10x10 room':
      return 'room';
    case 'per linear foot':
      return 'lin ft';
    case 'per cubic yard':
      return 'cu yd';
    case 'per item':
      return 'item';
    default:
      return unit.replace('per ', '');
  }
}

