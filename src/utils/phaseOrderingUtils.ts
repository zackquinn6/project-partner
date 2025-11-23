import { Phase } from "@/interfaces/Project";

/**
 * Ensures standard phases are in the correct order in a project
 * Standard phases: Kickoff -> Planning -> Order -> [Other Standard Phases] -> [Custom/Incorporated Phases] -> Close Project
 * 
 * Custom phases and incorporated phases can be reordered throughout the workflow,
 * as long as the first 3 phases are Kickoff, Planning, Order (in that order)
 * and Close Project is always last.
 * 
 * Standard phases are identified by isStandard: true flag, not just by name.
 * Newly added standard phases (when editing Standard Project Foundation) should be included.
 */
export function enforceStandardPhaseOrdering(phases: Phase[]): Phase[] {
  const standardPhaseNames = ['Kickoff', 'Planning', 'Ordering', 'Close Project'];
  
  // Extract the 4 specific standard phases by name (for fixed positioning)
  const kickoffPhase = phases.find(p => p.name === 'Kickoff' && !p.isLinked);
  const planningPhase = phases.find(p => p.name === 'Planning' && !p.isLinked);
  const orderingPhase = phases.find(p => p.name === 'Ordering' && !p.isLinked);
  const closeProjectPhase = phases.find(p => p.name === 'Close Project' && !p.isLinked);
  
  // Get all other standard phases (isStandard: true but not one of the 4 specific names)
  // These are newly added standard phases when editing Standard Project Foundation
  const otherStandardPhases = phases.filter(phase => {
    if (phase.isLinked) return false; // Exclude incorporated phases
    if (!phase.isStandard) return false; // Only include standard phases
    // Exclude the 4 specific standard phases (they're handled separately)
    return !standardPhaseNames.includes(phase.name);
  });
  
  // Sort other standard phases by order number or name
  otherStandardPhases.sort((a, b) => {
    // First try to sort by order number
    if (a.phaseOrderNumber !== undefined && b.phaseOrderNumber !== undefined) {
      if (typeof a.phaseOrderNumber === 'number' && typeof b.phaseOrderNumber === 'number') {
        return a.phaseOrderNumber - b.phaseOrderNumber;
      }
    }
    // Fall back to name sorting
    return (a.name || '').localeCompare(b.name || '');
  });
  
  // Get all non-standard phases (custom and incorporated) while preserving their order
  const nonStandardPhases = phases.filter(phase => {
    if (phase.isLinked) return true; // Include incorporated phases
    // Exclude standard phases (both the 4 specific ones and other standard phases)
    if (phase.isStandard) return false;
    return !standardPhaseNames.includes(phase.name); // Include custom phases
  });
  
  // Build ordered array: First 3 standard phases -> Other Standard Phases -> Custom/Incorporated -> Close Project
  const orderedPhases: Phase[] = [];
  
  // Add first 3 standard phases in fixed order
  if (kickoffPhase) orderedPhases.push(kickoffPhase);
  if (planningPhase) orderedPhases.push(planningPhase);
  if (orderingPhase) orderedPhases.push(orderingPhase);
  
  // Add other standard phases (newly added standard phases)
  orderedPhases.push(...otherStandardPhases);
  
  // Add custom and incorporated phases in their current order (preserves drag-and-drop reordering)
  orderedPhases.push(...nonStandardPhases);
  
  // Add Close Project last
  if (closeProjectPhase) orderedPhases.push(closeProjectPhase);
  
  return orderedPhases;
}

/**
 * Validates that standard phases are in the correct order
 * First 3 phases must be: Kickoff, Planning, Order (in that order)
 * Close Project must be last
 * Custom and incorporated phases can be anywhere in between
 */
export function validateStandardPhaseOrdering(phases: Phase[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const kickoffIndex = phases.findIndex(p => p.name === 'Kickoff' && !p.isLinked);
  const planningIndex = phases.findIndex(p => p.name === 'Planning' && !p.isLinked);
  const orderingIndex = phases.findIndex(p => p.name === 'Ordering' && !p.isLinked);
  const closeProjectIndex = phases.findIndex(p => p.name === 'Close Project' && !p.isLinked);
  
  // Check that first 3 phases are Kickoff, Planning, Order (in that order)
  if (kickoffIndex !== -1 && kickoffIndex !== 0) {
    errors.push('Kickoff phase must be the first phase');
  }
  
  if (planningIndex !== -1 && planningIndex !== 1) {
    errors.push('Planning phase must be the second phase');
  }
  
  if (orderingIndex !== -1 && orderingIndex !== 2) {
    errors.push('Order phase must be the third phase');
  }
  
  // Check that Close Project is last (if it exists)
  if (closeProjectIndex !== -1) {
    const expectedLastIndex = phases.length - 1;
    if (closeProjectIndex !== expectedLastIndex) {
      errors.push('Close Project must be the last phase');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Gets the expected position for a standard phase
 */
export function getStandardPhaseExpectedPosition(phaseName: string, totalPhases: number): number {
  switch (phaseName) {
    case 'Kickoff':
      return 0;
    case 'Planning':
      return 1;
    case 'Ordering':
      return 2;
    case 'Close Project':
      return totalPhases - 1; // Always last
    default:
      return -1; // Not a standard phase
  }
}