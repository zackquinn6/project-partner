import { Phase } from '@/interfaces/Project';
import { enforceStandardPhaseOrdering } from './phaseOrderingUtils';

// Function to ensure standard phases for new project creation only - with deduplication
// Database-backed projects must already contain their standard phases.
export const ensureStandardPhasesForNewProject = (phases: Phase[]): Phase[] => {
  return enforceStandardPhaseOrdering(phases);
};

// NEW: Function to check if project has all standard phases
// Uses isStandard flag and phaseOrderNumber instead of hardcoded names
export const hasAllStandardPhases = (phases: Phase[]): boolean => {
  const standardPhases = phases.filter(p => p.isStandard === true && !p.isLinked);
  const hasFirst = standardPhases.some(p => p.phaseOrderNumber === 'first');
  const hasLast = standardPhases.some(p => p.phaseOrderNumber === 'last');
  const hasNumbered = standardPhases.some(p => typeof p.phaseOrderNumber === 'number' && p.phaseOrderNumber >= 2);
  
  // At minimum, should have 'first' and 'last' phases, plus at least one numbered phase in between
  return hasFirst && hasLast && hasNumbered && standardPhases.length >= 3;
};

export const addStandardPhasesToProjectRun = (phases: Phase[]): Phase[] => {
  console.warn('addStandardPhasesToProjectRun is deprecated. Project structure must come from the database.');
  return phases;
};

/**
 * @deprecated This is an alias for addStandardPhasesToProjectRun which is also deprecated.
 * This function will be removed in a future version.
 */
export const addKickoffPhaseToProjectRun = addStandardPhasesToProjectRun;

/**
 * Gets the completion key for a step, using composite key format when spaceId exists
 * Format: "stepId:spaceId" when spaceId exists, "stepId" otherwise
 * This enables per-space completion tracking for multi-space projects
 */
export const getStepCompletionKey = (stepId: string, spaceId?: string | null): string => {
  if (spaceId) {
    return `${stepId}:${spaceId}`;
  }
  return stepId;
};

/**
 * Checks if a step is completed, handling both composite keys (stepId:spaceId) and simple keys (stepId)
 * Supports backward compatibility with old format (simple stepId)
 * Also checks if step is completed globally (without spaceId) for backward compatibility
 */
export const isStepCompleted = (
  completedSteps: Set<string> | string[],
  stepId: string,
  spaceId?: string | null
): boolean => {
  const completedSet = Array.isArray(completedSteps) ? new Set(completedSteps) : completedSteps;
  
  // If spaceId exists, check for composite key first
  if (spaceId) {
    const compositeKey = getStepCompletionKey(stepId, spaceId);
    if (completedSet.has(compositeKey)) {
      return true;
    }
    // Backward compatibility: also check if step is marked complete globally (without spaceId)
    if (completedSet.has(stepId)) {
      return true;
    }
    return false;
  }
  
  // No spaceId: check simple key
  return completedSet.has(stepId);
};

/**
 * Extracts step ID from a completion key (handles both "stepId" and "stepId:spaceId" formats)
 */
export const extractStepIdFromCompletionKey = (completionKey: string): string => {
  const colonIndex = completionKey.indexOf(':');
  if (colonIndex === -1) {
    return completionKey; // Simple format: just stepId
  }
  return completionKey.substring(0, colonIndex); // Composite format: stepId:spaceId
};

/**
 * Extracts space ID from a completion key (returns null if not a composite key)
 */
export const extractSpaceIdFromCompletionKey = (completionKey: string): string | null => {
  const colonIndex = completionKey.indexOf(':');
  if (colonIndex === -1) {
    return null; // Simple format: no spaceId
  }
  return completionKey.substring(colonIndex + 1); // Composite format: extract spaceId
};

/** Stable UI kickoff step ids (must match KickoffWorkflow / template kickoff steps). */
export const KICKOFF_UI_STEP_IDS = [
  'kickoff-step-1',
  'kickoff-step-2',
  'kickoff-step-3',
  'kickoff-step-4',
] as const;

export const isKickoffPhaseComplete = (completedSteps: string[] | null | undefined): boolean => {
  if (!completedSteps || !Array.isArray(completedSteps)) {
    return false;
  }
  const kickoffStepIds = KICKOFF_UI_STEP_IDS;

  // STRICT CHECK: All 4 UI kickoff step IDs must be present
  const allKickoffStepsComplete = kickoffStepIds.every(stepId =>
    completedSteps.includes(stepId)
  );
  
  console.log('🎯 isKickoffPhaseComplete check:', {
    completedSteps,
    kickoffStepIds,
    stepCompletion: kickoffStepIds.map(id => ({
      id,
      completed: completedSteps.includes(id)
    })),
    result: allKickoffStepsComplete
  });
  
  return allKickoffStepsComplete;
};

export const getKickoffStepIndex = (stepId: string): number => {
  return (KICKOFF_UI_STEP_IDS as readonly string[]).indexOf(stepId);
};