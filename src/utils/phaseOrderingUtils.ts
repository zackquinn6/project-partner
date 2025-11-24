import { Phase } from "@/interfaces/Project";

/**
 * Ensures standard phases are in the correct order in a project
 * Uses the order defined in the Standard Project Foundation (not hardcoded positions)
 * 
 * Standard phases are identified by isStandard: true flag, not just by name.
 * The order is determined by phaseOrderNumber values from the Standard Project Foundation.
 * 
 * @param phases - The phases to order
 * @param standardProjectPhases - Optional: The phases from Standard Project Foundation to use as reference for ordering
 */
export function enforceStandardPhaseOrdering(phases: Phase[], standardProjectPhases?: Phase[]): Phase[] {
  // Separate standard and non-standard phases
  const standardPhases = phases.filter(p => p.isStandard && !p.isLinked);
  const nonStandardPhases = phases.filter(p => !p.isStandard || p.isLinked);
  
  // If we have standard project phases as reference, use them to determine order
  if (standardProjectPhases && standardProjectPhases.length > 0) {
    // Create a map of phase names to their order numbers from Standard Project Foundation
    const standardOrderMap = new Map<string, string | number>();
    standardProjectPhases.forEach(phase => {
      if (phase.name && phase.phaseOrderNumber !== undefined) {
        standardOrderMap.set(phase.name, phase.phaseOrderNumber);
      }
    });
    
    // Sort standard phases based on their order in Standard Project Foundation
    standardPhases.sort((a, b) => {
      const aOrder = standardOrderMap.get(a.name || '');
      const bOrder = standardOrderMap.get(b.name || '');
      
      // If both have order numbers from standard project, use those
      if (aOrder !== undefined && bOrder !== undefined) {
        // Handle 'first' and 'last' special cases
        if (aOrder === 'first') return -1;
        if (bOrder === 'first') return 1;
        if (aOrder === 'last') return 1;
        if (bOrder === 'last') return -1;
        
        // Both are numbers
        if (typeof aOrder === 'number' && typeof bOrder === 'number') {
          return aOrder - bOrder;
        }
      }
      
      // Fallback: use phaseOrderNumber from the phase itself
      if (a.phaseOrderNumber !== undefined && b.phaseOrderNumber !== undefined) {
        if (a.phaseOrderNumber === 'first') return -1;
        if (b.phaseOrderNumber === 'first') return 1;
        if (a.phaseOrderNumber === 'last') return 1;
        if (b.phaseOrderNumber === 'last') return -1;
        if (typeof a.phaseOrderNumber === 'number' && typeof b.phaseOrderNumber === 'number') {
          return a.phaseOrderNumber - b.phaseOrderNumber;
        }
      }
      
      // Final fallback: alphabetical
      return (a.name || '').localeCompare(b.name || '');
    });
  } else {
    // No standard project reference - sort by phaseOrderNumber
    standardPhases.sort((a, b) => {
      const aOrder = a.phaseOrderNumber;
      const bOrder = b.phaseOrderNumber;
      
      if (aOrder === 'first') return -1;
      if (bOrder === 'first') return 1;
      if (aOrder === 'last') return 1;
      if (bOrder === 'last') return -1;
      
      if (typeof aOrder === 'number' && typeof bOrder === 'number') {
        return aOrder - bOrder;
      }
      
      return (a.name || '').localeCompare(b.name || '');
    });
  }
  
  // Reconstruct array: sorted standard phases -> non-standard phases
  const result: Phase[] = [];
  
  // Add standard phases (sorted)
  result.push(...standardPhases);
  
  // Add non-standard phases (preserving their relative order)
  result.push(...nonStandardPhases);
  
  return result;
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