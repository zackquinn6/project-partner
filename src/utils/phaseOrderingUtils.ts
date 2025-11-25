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
 * Uses isStandard flag and phaseOrderNumber instead of hardcoded names
 * Standard phases must be in order based on their phaseOrderNumber
 * Close Project (phaseOrderNumber='last') must be last
 * Custom and incorporated phases can be anywhere in between
 */
export function validateStandardPhaseOrdering(phases: Phase[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Get standard phases (excluding Close Project which should be last)
  const standardPhases = phases.filter(p => 
    p.isStandard === true && 
    !p.isLinked &&
    p.phaseOrderNumber !== 'last'
  );
  
  // Get Close Project phase (standard phase with phaseOrderNumber='last')
  const closeProjectPhase = phases.find(p => 
    p.isStandard === true && 
    !p.isLinked &&
    p.phaseOrderNumber === 'last'
  );
  
  // Validate standard phases are in correct order by phaseOrderNumber
  standardPhases.forEach((phase, index) => {
    const expectedOrder = typeof phase.phaseOrderNumber === 'number' ? phase.phaseOrderNumber : -1;
    const actualIndex = phases.findIndex(p => p.id === phase.id);
    
    // Validate 'first' phase is at index 0
    if (phase.phaseOrderNumber === 'first' && actualIndex !== 0) {
      errors.push(`${phase.name} phase must be the first phase`);
    }
    
    // Validate numbered phases are in correct position
    if (typeof expectedOrder === 'number' && expectedOrder > 0 && actualIndex !== expectedOrder - 1) {
      errors.push(`${phase.name} phase must be at position ${expectedOrder}`);
    }
  });
  
  // Check that Close Project is last (if it exists)
  if (closeProjectPhase) {
    const closeProjectIndex = phases.findIndex(p => p.id === closeProjectPhase.id);
    const expectedLastIndex = phases.length - 1;
    if (closeProjectIndex !== expectedLastIndex) {
      errors.push(`${closeProjectPhase.name} phase must be the last phase`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Gets the expected position for a standard phase based on phaseOrderNumber
 * Uses phaseOrderNumber instead of hardcoded phase names
 */
export function getStandardPhaseExpectedPosition(phase: Phase, totalPhases: number): number {
  if (phase.isStandard !== true || phase.isLinked) {
    return -1; // Not a standard phase
  }
  
  if (phase.phaseOrderNumber === 'first') {
    return 0;
  }
  
  if (phase.phaseOrderNumber === 'last') {
    return totalPhases - 1;
  }
  
  if (typeof phase.phaseOrderNumber === 'number') {
    return phase.phaseOrderNumber - 1; // Convert 1-based to 0-based index
  }
  
  return -1; // Invalid order number
}