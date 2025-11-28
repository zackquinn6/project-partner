import { Phase, Operation, WorkflowStep } from '@/interfaces/Project';
import { ProjectRun } from '@/interfaces/ProjectRun';

export interface ProjectSpace {
  id: string;
  name: string;
  priority: number | null;
  spaceType?: string;
}

export type FlowType = 'single-piece-flow' | 'batch-flow';

/**
 * Determines the flow type from project run settings
 * Defaults to 'single-piece-flow' if not set
 */
export function getFlowType(projectRun: ProjectRun | null): FlowType {
  if (!projectRun) return 'single-piece-flow';
  
  // Check for schedule_optimization_method (newer field name)
  const optimizationMethod = (projectRun as any).schedule_optimization_method || projectRun.completion_priority;
  
  if (optimizationMethod === 'waterfall' || optimizationMethod === 'batch-flow') {
    return 'batch-flow';
  }
  
  // Default to single-piece-flow (agile)
  return 'single-piece-flow';
}

/**
 * Gets standard phases (phases with isStandard=true, excluding Close Project)
 * These are always shown in order and not affected by spaces
 * Uses isStandard flag instead of hardcoded names
 */
export function getStandardPhases(phases: Phase[]): Phase[] {
  // Filter for standard phases, excluding Close Project (which should be last)
  const standardPhases = phases.filter(phase => 
    phase.isStandard === true && 
    !phase.isLinked &&
    phase.phaseOrderNumber !== 'last' // Close Project uses 'last'
  );
  
  // Sort by phaseOrderNumber
  return standardPhases.sort((a, b) => {
    const aOrder = a.phaseOrderNumber;
    const bOrder = b.phaseOrderNumber;
    
    // Handle 'first' special case
    if (aOrder === 'first') return -1;
    if (bOrder === 'first') return 1;
    
    // Both are numbers
    if (typeof aOrder === 'number' && typeof bOrder === 'number') {
      return aOrder - bOrder;
    }
    
    // Fallback: alphabetical
    return (a.name || '').localeCompare(b.name || '');
  });
}

/**
 * Gets custom phases (non-standard phases)
 * Uses isStandard flag instead of hardcoded names
 */
export function getCustomPhases(phases: Phase[]): Phase[] {
  return phases.filter(phase => phase.isStandard !== true || phase.isLinked === true);
}

/**
 * Gets the Close Project phase (standard phase with phaseOrderNumber='last')
 * Uses isStandard flag and phaseOrderNumber instead of hardcoded name
 */
export function getCloseProjectPhase(phases: Phase[]): Phase | null {
  return phases.find(phase => 
    phase.isStandard === true && 
    !phase.isLinked &&
    phase.phaseOrderNumber === 'last'
  ) || null;
}

/**
 * Checks if a phase applies to a specific space
 * This should check space-specific decisions or phase assignments
 * For now, returns true for all phases (can be enhanced with actual space-phase mapping)
 */
export function phaseAppliesToSpace(phase: Phase, spaceId: string, projectRun: ProjectRun | null): boolean {
  // TODO: Implement actual space-phase mapping logic
  // This could check:
  // - spaceDecisions in customization_decisions
  // - phase assignments in schedule_events
  // - space-specific phase filters
  
  // Standard phases always apply to all spaces
  // Use isStandard flag instead of hardcoded names
  if (phase.isStandard === true && !phase.isLinked) {
    return true;
  }
  
  // Check if phase is assigned to this space in customization decisions
  if (projectRun?.customization_decisions) {
    const decisions = projectRun.customization_decisions as any;
    const spaceDecisions = decisions.spaceDecisions || {};
    const spaceDecision = spaceDecisions[spaceId];
    
    // If space has decisions, check if this phase is included
    if (spaceDecision) {
      // This is a simplified check - actual implementation would need
      // to check phase assignments per space
      return true; // Default to true for now
    }
  }
  
  return true; // Default: phase applies to all spaces
}

/**
 * Reorganizes workflow steps for Single Piece Flow navigation
 * Structure: Standard Phases → Space Containers (each with ALL custom phases) → Close Project
 * 
 * Single-piece-flow means: Complete each space's ALL custom phases before moving to next space
 * Each space container contains ALL custom phases for that space
 */
export function organizeStepsForSinglePieceFlow(
  phases: Phase[],
  spaces: ProjectSpace[],
  projectRun: ProjectRun | null
): Array<{
  type: 'standard-phase' | 'space-container' | 'close-project';
  id: string;
  name: string;
  spaces?: ProjectSpace[];
  phase?: Phase;
  steps: WorkflowStep[];
}> {
  const result: Array<{
    type: 'standard-phase' | 'space-container' | 'close-project';
    id: string;
    name: string;
    spaces?: ProjectSpace[];
    phase?: Phase;
    steps: WorkflowStep[];
  }> = [];
  
  // Sort spaces by priority (lower number = higher priority)
  const sortedSpaces = spaces.length > 0 
    ? [...spaces].sort((a, b) => {
        const aPriority = a.priority ?? 999;
        const bPriority = b.priority ?? 999;
        return aPriority - bPriority;
      })
    : [];
  
  // Separate standard phases, custom phases, and close project
  const standardPhases: Phase[] = [];
  const customPhases: Phase[] = [];
  let closeProjectPhase: Phase | null = null;
  
  phases.forEach(phase => {
    const isStandardPhase = phase.isStandard === true && !phase.isLinked;
    const isCloseProject = phase.isStandard === true && !phase.isLinked && phase.phaseOrderNumber === 'last';
    
    if (isCloseProject) {
      closeProjectPhase = phase;
    } else if (isStandardPhase) {
      standardPhases.push(phase);
    } else {
      // Custom phase (non-standard or linked)
      customPhases.push(phase);
    }
  });
  
  // Sort standard phases by phaseOrderNumber to preserve template order
  standardPhases.sort((a, b) => {
    if (a.phaseOrderNumber === 'first') return -1;
    if (b.phaseOrderNumber === 'first') return 1;
    if (typeof a.phaseOrderNumber === 'number' && typeof b.phaseOrderNumber === 'number') {
      return a.phaseOrderNumber - b.phaseOrderNumber;
    }
    return 0;
  });
  
  console.log('🔍 organizeStepsForSinglePieceFlow:', {
    standardPhasesCount: standardPhases.length,
    standardPhases: standardPhases.map(p => p.name),
    customPhasesCount: customPhases.length,
    customPhases: customPhases.map(p => p.name),
    sortedSpacesCount: sortedSpaces.length,
    sortedSpaces: sortedSpaces.map(s => s.name),
    hasCloseProject: !!closeProjectPhase
  });
  
  // 1. Add standard phases (show ONCE, in order)
  standardPhases.forEach(phase => {
    const steps = phase.operations.flatMap(op => 
      (op.steps || []).map(step => ({
        ...step,
        phaseId: phase.id,
        phaseName: phase.name,
        operationId: op.id,
        operationName: op.name
      }))
    );
    
    console.log(`  ✅ Added standard phase "${phase.name}" with ${steps.length} steps`);
    
    result.push({
      type: 'standard-phase',
      id: phase.id,
      name: phase.name,
      phase,
      steps
    });
  });
  
  // 2. Create space containers with ALL custom phases (if spaces exist)
  if (sortedSpaces.length > 0 && customPhases.length > 0) {
    console.log('🔧 Creating space containers for single-piece-flow:', {
      spacesCount: sortedSpaces.length,
      customPhasesCount: customPhases.length,
      spaces: sortedSpaces.map(s => s.name),
      customPhases: customPhases.map(p => p.name)
    });
    
    sortedSpaces.forEach(space => {
      // Collect ALL steps from ALL custom phases for this space
      // CRITICAL: Preserve phase structure - each step must have phaseName
      const allSpaceSteps: WorkflowStep[] = [];
      
      // Process custom phases in their template order
      customPhases.forEach(phase => {
        const phaseSteps: WorkflowStep[] = [];
        // Sort operations by displayOrder
        const sortedOperations = [...phase.operations].sort((a, b) => {
          const aOrder = (a as any).displayOrder ?? 999;
          const bOrder = (b as any).displayOrder ?? 999;
          return aOrder - bOrder;
        });
        
        sortedOperations.forEach(operation => {
          // Sort steps by displayOrder
          const sortedSteps = [...(operation.steps || [])].sort((a, b) => {
            const aOrder = (a as any).displayOrder ?? 999;
            const bOrder = (b as any).displayOrder ?? 999;
            return aOrder - bOrder;
          });
          
          const operationSteps = sortedSteps.map(step => ({
            ...step,
            phaseId: phase.id,
            phaseName: phase.name, // CRITICAL: Preserve phase name for grouping
            operationId: operation.id,
            operationName: operation.name,
            spaceId: space.id,
            spaceName: space.name
          }));
          phaseSteps.push(...operationSteps);
          allSpaceSteps.push(...operationSteps);
        });
        
        console.log(`  - Space "${space.name}": Phase "${phase.name}" = ${phaseSteps.length} steps`);
      });
      
      console.log(`  - Created space container "${space.name}" with ${allSpaceSteps.length} total steps from ${customPhases.length} phases`);
      
      result.push({
        type: 'space-container',
        id: `space-${space.id}`,
        name: space.name, // Space name only - contains all custom phases
        spaces: [space],
        // CRITICAL: Don't include phase here - space container has steps from multiple phases
        // The groupedSteps function will extract phases from step phaseName properties
        steps: allSpaceSteps
      });
    });
  } else if (customPhases.length > 0) {
    // No spaces but has custom phases: show as single container with all custom phases
    const allSteps: WorkflowStep[] = [];
    customPhases.forEach(phase => {
      // Sort operations by displayOrder
      const sortedOperations = [...phase.operations].sort((a, b) => {
        const aOrder = (a as any).displayOrder ?? 999;
        const bOrder = (b as any).displayOrder ?? 999;
        return aOrder - bOrder;
      });
      
      sortedOperations.forEach(operation => {
        // Sort steps by displayOrder
        const sortedSteps = [...(operation.steps || [])].sort((a, b) => {
          const aOrder = (a as any).displayOrder ?? 999;
          const bOrder = (b as any).displayOrder ?? 999;
          return aOrder - bOrder;
        });
        
        const operationSteps = sortedSteps.map(step => ({
          ...step,
          phaseId: phase.id,
          phaseName: phase.name,
          operationId: operation.id,
          operationName: operation.name
        }));
        allSteps.push(...operationSteps);
      });
    });
    
    result.push({
      type: 'space-container',
      id: 'no-space-custom-phases',
      name: 'Custom Work',
      steps: allSteps
    });
  }
  
  // 3. Add Close Project phase (show ONCE at the end)
  if (closeProjectPhase) {
    const steps = closeProjectPhase.operations.flatMap(op => 
      (op.steps || []).map(step => ({
        ...step,
        phaseId: closeProjectPhase!.id,
        phaseName: closeProjectPhase!.name,
        operationId: op.id,
        operationName: op.name
      }))
    );
    result.push({
      type: 'close-project',
      id: closeProjectPhase.id,
      name: closeProjectPhase.name,
      phase: closeProjectPhase,
      steps
    });
  }
  
  return result;
}

/**
 * Reorganizes workflow steps for Batch Flow navigation
 * Structure: Standard Phases → Custom Phases (with spaces nested inside) → Close Project
 * 
 * Batch-flow means: Complete each phase for all spaces before moving to next phase
 * Each custom phase contains all spaces, with operations repeated per space
 */
export function organizeStepsForBatchFlow(
  phases: Phase[],
  spaces: ProjectSpace[],
  projectRun: ProjectRun | null
): Array<{
  type: 'standard-phase' | 'custom-phase' | 'close-project';
  id: string;
  name: string;
  phase: Phase;
  spaces?: ProjectSpace[];
  steps: WorkflowStep[];
}> {
  const result: Array<{
    type: 'standard-phase' | 'custom-phase' | 'close-project';
    id: string;
    name: string;
    phase: Phase;
    spaces?: ProjectSpace[];
    steps: WorkflowStep[];
  }> = [];
  
  // Sort spaces by priority
  const sortedSpaces = spaces.length > 0
    ? [...spaces].sort((a, b) => {
        const aPriority = a.priority ?? 999;
        const bPriority = b.priority ?? 999;
        return aPriority - bPriority;
      })
    : [];
  
  // Separate standard phases, custom phases, and close project
  const standardPhases: Phase[] = [];
  const customPhases: Phase[] = [];
  let closeProjectPhase: Phase | null = null;
  
  phases.forEach(phase => {
    const isStandardPhase = phase.isStandard === true && !phase.isLinked;
    const isCloseProject = phase.isStandard === true && !phase.isLinked && phase.phaseOrderNumber === 'last';
    
    if (isCloseProject) {
      closeProjectPhase = phase;
    } else if (isStandardPhase) {
      standardPhases.push(phase);
    } else {
      customPhases.push(phase);
    }
  });
  
  // Sort standard phases by phaseOrderNumber
  standardPhases.sort((a, b) => {
    if (a.phaseOrderNumber === 'first') return -1;
    if (b.phaseOrderNumber === 'first') return 1;
    if (typeof a.phaseOrderNumber === 'number' && typeof b.phaseOrderNumber === 'number') {
      return a.phaseOrderNumber - b.phaseOrderNumber;
    }
    return 0;
  });
  
  // 1. Add standard phases (show ONCE, in order)
  standardPhases.forEach(phase => {
    const steps = phase.operations.flatMap(op => 
      (op.steps || []).map(step => ({
        ...step,
        phaseId: phase.id,
        phaseName: phase.name,
        operationId: op.id,
        operationName: op.name
      }))
    );
    result.push({
      type: 'standard-phase',
      id: phase.id,
      name: phase.name,
      phase,
      steps
    });
  });
  
  // 2. Add custom phases with spaces nested inside (operations repeated per space)
  customPhases.forEach(phase => {
    if (sortedSpaces.length > 0) {
      // For batch flow: operations are repeated for each space
      // Collect all steps from all operations, repeated for each space
      const phaseSteps: WorkflowStep[] = [];
      
      // Sort operations by displayOrder
      const sortedOperations = [...phase.operations].sort((a, b) => {
        const aOrder = (a as any).displayOrder ?? 999;
        const bOrder = (b as any).displayOrder ?? 999;
        return aOrder - bOrder;
      });
      
      sortedSpaces.forEach(space => {
        sortedOperations.forEach(operation => {
          // Sort steps by displayOrder
          const sortedSteps = [...(operation.steps || [])].sort((a, b) => {
            const aOrder = (a as any).displayOrder ?? 999;
            const bOrder = (b as any).displayOrder ?? 999;
            return aOrder - bOrder;
          });
          
          const operationSteps = sortedSteps.map(step => ({
            ...step,
            phaseId: phase.id,
            phaseName: phase.name,
            operationId: operation.id,
            operationName: operation.name,
            spaceId: space.id,
            spaceName: space.name
          }));
          phaseSteps.push(...operationSteps);
        });
      });
      
      result.push({
        type: 'custom-phase',
        id: phase.id,
        name: phase.name,
        phase,
        spaces: sortedSpaces, // All spaces associated with this phase
        steps: phaseSteps
      });
    } else {
      // No spaces: show custom phase without space logic
      // Sort operations by displayOrder
      const sortedOperations = [...phase.operations].sort((a, b) => {
        const aOrder = (a as any).displayOrder ?? 999;
        const bOrder = (b as any).displayOrder ?? 999;
        return aOrder - bOrder;
      });
      
      const steps = sortedOperations.flatMap(op => {
        // Sort steps by displayOrder
        const sortedSteps = [...(op.steps || [])].sort((a, b) => {
          const aOrder = (a as any).displayOrder ?? 999;
          const bOrder = (b as any).displayOrder ?? 999;
          return aOrder - bOrder;
        });
        
        return sortedSteps.map(step => ({
          ...step,
          phaseId: phase.id,
          phaseName: phase.name,
          operationId: op.id,
          operationName: op.name
        }));
      });
      result.push({
        type: 'custom-phase',
        id: phase.id,
        name: phase.name,
        phase,
        steps
      });
    }
  });
  
  // 3. Add Close Project phase (show ONCE at the end)
  if (closeProjectPhase) {
    const steps = closeProjectPhase.operations.flatMap(op => 
      (op.steps || []).map(step => ({
        ...step,
        phaseId: closeProjectPhase!.id,
        phaseName: closeProjectPhase!.name,
        operationId: op.id,
        operationName: op.name
      }))
    );
    result.push({
      type: 'close-project',
      id: closeProjectPhase.id,
      name: closeProjectPhase.name,
      phase: closeProjectPhase,
      steps
    });
  }
  
  return result;
}

/**
 * Main function to organize workflow navigation based on flow type
 */
export function organizeWorkflowNavigation(
  phases: Phase[],
  spaces: ProjectSpace[],
  projectRun: ProjectRun | null
): Array<{
  type: 'standard-phase' | 'space-container' | 'custom-phase' | 'close-project';
  id: string;
  name: string;
  spaces?: ProjectSpace[];
  phase?: Phase;
  steps: WorkflowStep[];
}> {
  const flowType = getFlowType(projectRun);
  
  console.log('🔄 organizeWorkflowNavigation:', {
    phasesCount: phases.length,
    spacesCount: spaces.length,
    flowType,
    projectRunId: projectRun?.id,
    schedule_optimization_method: (projectRun as any)?.schedule_optimization_method,
    completion_priority: projectRun?.completion_priority,
    phases: phases.map(p => ({ name: p.name, isStandard: p.isStandard, isLinked: p.isLinked })),
    spaces: spaces.map(s => ({ name: s.name, priority: s.priority }))
  });
  
  if (flowType === 'batch-flow') {
    const result = organizeStepsForBatchFlow(phases, spaces, projectRun);
    console.log('📋 Batch flow result:', result.map(r => ({ type: r.type, name: r.name, spacesCount: r.spaces?.length || 0, stepsCount: r.steps.length })));
    return result;
  } else {
    // Default to single-piece-flow
    const result = organizeStepsForSinglePieceFlow(phases, spaces, projectRun);
    console.log('📋 Single-piece flow result:', result.map(r => ({ type: r.type, name: r.name, spacesCount: r.spaces?.length || 0, stepsCount: r.steps.length })));
    return result;
  }
}

/**
 * Converts organized navigation structure to grouped steps format
 * for use with WorkflowSidebar
 * Handles both Single Piece Flow (space containers) and Batch Flow (phases with spaces)
 */
export function convertToGroupedSteps(
  organizedNavigation: ReturnType<typeof organizeWorkflowNavigation>
): Record<string, Record<string, WorkflowStep[]>> {
  const grouped: Record<string, Record<string, WorkflowStep[]>> = {} as Record<string, Record<string, WorkflowStep[]>>;
  
  organizedNavigation.forEach(item => {
    if (item.type === 'space-container') {
      // Single Piece Flow: Space containers contain custom phases
      // Group by space name, then by phase name, then by operation name
      // Structure: { "Room 1": { "Phase Name": { "Operation Name": [steps...] } } }
      item.spaces?.forEach(space => {
        const spaceKey = space.name; // Use space name directly
        if (!grouped[spaceKey]) {
          grouped[spaceKey] = {};
        }
        
        // Group steps by phase name first, then by operation name
        // Steps should have phaseName and operationName preserved from organizeStepsForSinglePieceFlow
        item.steps.forEach(step => {
          const phaseName = (step as any).phaseName || 'Workflow';
          const operationName = (step as any).operationName || 'General';
          
          // Create nested structure: space → phase → operation → steps
          // Note: This creates a 3-level structure, but the return type is 2-level
          // The phase name becomes the key, and operation name is nested inside
          const phaseKey = `${spaceKey} - ${phaseName}`;
          if (!grouped[phaseKey]) {
            grouped[phaseKey] = {} as Record<string, WorkflowStep[]>;
          }
          
          if (!grouped[phaseKey][operationName]) {
            grouped[phaseKey][operationName] = [] as WorkflowStep[];
          }
          
          // Dedupe by step ID
          if (!grouped[phaseKey][operationName].some((s: any) => s.id === step.id)) {
            grouped[phaseKey][operationName].push(step);
          }
          
        });
      });
    } else if (item.type === 'custom-phase' && item.spaces && item.spaces.length > 0) {
      // Batch Flow: Custom phases contain spaces
      // Group by phase name, then show spaces within
      const phaseName = item.phase.name;
      if (!grouped[phaseName]) {
        grouped[phaseName] = {};
      }
      
      // Group steps by space and operation
      item.spaces.forEach(space => {
        item.phase.operations.forEach(operation => {
          const operationSteps = (item.steps || []).filter(step => {
            const stepSpaceId = (step as any).spaceId;
            const stepOperationId = (step as any).operationId;
            return stepSpaceId === space.id && stepOperationId === operation.id;
          });
          
          if (operationSteps.length > 0) {
            // CRITICAL: Use space.name which is dynamically linked to database
            // If space_name changes in project_run_spaces, this will automatically reflect it
            const operationKey = `${space.name} - ${operation.name}`;
            if (!grouped[phaseName][operationKey]) {
              grouped[phaseName][operationKey] = [];
            }
            grouped[phaseName][operationKey].push(...operationSteps);
          }
        });
      });
      
      // If no space-specific grouping worked, fall back to operation grouping
      if (Object.keys(grouped[phaseName]).length === 0) {
        item.phase.operations.forEach(operation => {
          const operationSteps = (operation.steps || []).filter(step =>
            item.steps.some(s => s.id === step.id)
          );
          if (operationSteps.length > 0) {
            grouped[phaseName][operation.name] = operationSteps;
          }
        });
      }
    } else if (item.phase) {
      // Standard phases and Close Project: group by phase name and operation
      const phaseName = item.phase.name;
      if (!grouped[phaseName]) {
        grouped[phaseName] = {};
      }
      
      // Group steps by their operation
      item.phase.operations.forEach(operation => {
        const operationSteps = (operation.steps || []).filter(step =>
          item.steps.some(s => s.id === step.id)
        );
        if (operationSteps.length > 0) {
          grouped[phaseName][operation.name] = operationSteps;
        }
      });
    }
  });
  
  return grouped;
}

