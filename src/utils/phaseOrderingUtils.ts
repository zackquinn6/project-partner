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
        // Handle 'last' special case
        if (aOrder === 'last') return 1;
        if (bOrder === 'last') return -1;
        
        // Both are numbers
        if (typeof aOrder === 'number' && typeof bOrder === 'number') {
          return aOrder - bOrder;
        }
      }
      
      // Fallback: use phaseOrderNumber from the phase itself
      if (a.phaseOrderNumber !== undefined && b.phaseOrderNumber !== undefined) {
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
    
    // Validate numbered phases are in correct position (position 1 = index 0)
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
  
  if (phase.phaseOrderNumber === 'last') {
    return totalPhases - 1;
  }
  
  if (typeof phase.phaseOrderNumber === 'number') {
    return phase.phaseOrderNumber - 1; // Convert 1-based to 0-based index
  }
  
  return -1; // Invalid order number
}

/**
 * Validates and fixes phase ordering positions to ensure:
 * 1. All phases have an ordering position (1-based sequential numbers)
 * 2. Phases are in sequential order with no gaps (1, 2, 3, 4...)
 * 3. No duplicate ordering positions
 * 
 * This is the single source of truth for ordering validation.
 * 
 * @param phases - The phases to validate and fix
 * @returns Validated phases with sequential ordering positions (1, 2, 3, ...)
 */
export function validateAndFixSequentialOrdering(phases: Phase[]): Phase[] {
  if (phases.length === 0) {
    return [];
  }

  // CRITICAL: First, ensure all phases have at least a temporary order position
  // Phases without order positions will be sorted to the end initially
  const phasesWithTemporaryOrder = phases.map((phase, index) => {
    // If phase has no order position, assign based on current index
    if (phase.phaseOrderNumber === undefined || phase.phaseOrderNumber === null) {
      return {
        ...phase,
        phaseOrderNumber: index + 1 as number // Temporary order based on current position
      };
    }
    return phase;
  });

  // Sort phases by their current order (handling 'last' and numbers)
  const sortedPhases = [...phasesWithTemporaryOrder].sort((a, b) => {
    const aOrder = a.phaseOrderNumber;
    const bOrder = b.phaseOrderNumber;
    
    // Handle 'last' - always comes last
    if (aOrder === 'last') return 1;
    if (bOrder === 'last') return -1;
    
    // Handle numeric ordering
    const aNum = typeof aOrder === 'number' ? aOrder : Number.MAX_SAFE_INTEGER;
    const bNum = typeof bOrder === 'number' ? bOrder : Number.MAX_SAFE_INTEGER;
    
    if (aNum !== bNum) {
      return aNum - bNum;
    }
    
    // If same order number, maintain relative position (stable sort)
    return 0;
  });

  // CRITICAL: Assign sequential ordering positions (1, 2, 3, ...) to ALL phases
  // This ensures no phase is missing an order position
  return sortedPhases.map((phase, index) => ({
    ...phase,
    phaseOrderNumber: index + 1 as number // Sequential: 1, 2, 3, 4... (all phases must have positions)
  }));
}