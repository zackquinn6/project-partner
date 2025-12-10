import { Phase, Operation, WorkflowStep } from '@/interfaces/Project';
import { ProjectRun } from '@/interfaces/ProjectRun';

export interface ProjectSpace {
  id: string;
  space_name: string; // Changed from 'name' to 'space_name' for clarity and consistency with database
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
  
  const optimizationMethod = projectRun.schedule_optimization_method;
  
  if (optimizationMethod === 'batch-flow') {
    return 'batch-flow';
  }
  
  // Default to single-piece-flow
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
  
  // NOTE: This function now only handles CUSTOM phases
  // Standard phases and Close Project are handled at the top level in organizeWorkflowNavigation
  // Filter out any standard phases that might have been passed in (defensive programming)
  const customPhases = phases.filter(phase => {
    const isStandardPhase = phase.isStandard === true && !phase.isLinked;
    return !isStandardPhase; // Only include non-standard phases
  });
  
  console.log('🔍 organizeStepsForSinglePieceFlow (CUSTOM PHASES ONLY):', {
    inputPhasesCount: phases.length,
    customPhasesCount: customPhases.length,
    customPhases: customPhases.map(p => p.name),
    sortedSpacesCount: sortedSpaces.length,
    sortedSpaces: sortedSpaces.map(s => s.space_name),
    note: 'Standard phases are handled at top level in organizeWorkflowNavigation'
  });
  
  // 2. Create space containers with ALL custom phases (if spaces exist)
  if (sortedSpaces.length > 0 && customPhases.length > 0) {
    console.log('🔧 Creating space containers for single-piece-flow:', {
      spacesCount: sortedSpaces.length,
      customPhasesCount: customPhases.length,
      spaces: sortedSpaces.map(s => s.space_name),
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
            spaceName: space.space_name
          }));
          phaseSteps.push(...operationSteps);
          allSpaceSteps.push(...operationSteps);
        });
        
        console.log(`  - Space "${space.space_name}": Phase "${phase.name}" = ${phaseSteps.length} steps`);
      });
      
      console.log(`  - Created space container "${space.space_name}" with ${allSpaceSteps.length} total steps from ${customPhases.length} phases`);
      
      result.push({
        type: 'space-container',
        id: `space-${space.id}`,
        name: space.space_name, // Space name only - contains all custom phases
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
  
  // NOTE: Close Project phase is handled at the top level in organizeWorkflowNavigation
  // This function only returns space containers for custom phases
  
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
  
  // NOTE: This function now only handles CUSTOM phases
  // Standard phases and Close Project are handled at the top level in organizeWorkflowNavigation
  // Filter out any standard phases that might have been passed in (defensive programming)
  const customPhases = phases.filter(phase => {
    const isStandardPhase = phase.isStandard === true && !phase.isLinked;
    return !isStandardPhase; // Only include non-standard phases
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
            spaceName: space.space_name
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
  
  // NOTE: Close Project phase is handled at the top level in organizeWorkflowNavigation
  // This function only returns custom phases with spaces
  
  return result;
}

/**
 * Main function to organize workflow navigation based on flow type
 * CRITICAL: Standard phases are ALWAYS shown separately and are NOT affected by flow type
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
  // CRITICAL: Standard phases are ALWAYS shown separately, regardless of flow type
  // Separate standard phases, custom phases, and close project FIRST
  const standardPhases: Phase[] = [];
  const customPhases: Phase[] = [];
  let closeProjectPhase: Phase | null = null;
  
  phases.forEach(phase => {
    // CRITICAL: Check if phase is standard
    // A phase is standard if: isStandard === true AND not linked
    // A phase is close project if: isStandard === true AND not linked AND phaseOrderNumber === 'last'
    // Everything else is a custom phase
    const isStandardPhase = phase.isStandard === true && !phase.isLinked;
    const isCloseProject = phase.isStandard === true && !phase.isLinked && phase.phaseOrderNumber === 'last';
    
    if (isCloseProject) {
      closeProjectPhase = phase;
    } else if (isStandardPhase) {
      standardPhases.push(phase);
    } else {
      // Custom phase (isStandard is false, undefined, or phase is linked)
      customPhases.push(phase);
    }
  });
  
  console.log('🔍 Phase categorization:', {
    totalPhases: phases.length,
    standardPhasesCount: standardPhases.length,
    customPhasesCount: customPhases.length,
    closeProjectPhase: !!closeProjectPhase,
    phaseDetails: phases.map(p => ({
      name: p.name,
      isStandard: p.isStandard,
      isLinked: p.isLinked,
      phaseOrderNumber: p.phaseOrderNumber,
      categorizedAs: p.isStandard === true && !p.isLinked && p.phaseOrderNumber === 'last' 
        ? 'close-project' 
        : p.isStandard === true && !p.isLinked 
          ? 'standard' 
          : 'custom',
      operationsCount: p.operations?.length || 0,
      totalSteps: p.operations?.reduce((sum, op) => sum + (op.steps?.length || 0), 0) || 0
    }))
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
  
  const flowType = getFlowType(projectRun);
  
  console.log('🔄 organizeWorkflowNavigation:', {
    phasesCount: phases.length,
    spacesCount: spaces.length,
    flowType,
    projectRunId: projectRun?.id,
    schedule_optimization_method: projectRun?.schedule_optimization_method,
    standardPhasesCount: standardPhases.length,
    standardPhases: standardPhases.map(p => p.name),
    customPhasesCount: customPhases.length,
    customPhases: customPhases.map(p => p.name),
    phases: phases.map(p => ({ name: p.name, isStandard: p.isStandard, isLinked: p.isLinked })),
    spaces: spaces.map(s => ({ name: s.space_name, priority: s.priority }))
  });
  
  // Build result: Standard phases first, then flow-specific organization, then Close Project
  const result: Array<{
    type: 'standard-phase' | 'space-container' | 'custom-phase' | 'close-project';
    id: string;
    name: string;
    spaces?: ProjectSpace[];
    phase?: Phase;
    steps: WorkflowStep[];
  }> = [];
  
  // 1. Add standard phases FIRST (always separate, not affected by flow type)
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
    
    console.log(`📋 Adding standard phase "${phase.name}":`, {
      operationsCount: phase.operations?.length || 0,
      stepsCount: steps.length,
      operations: phase.operations?.map(op => ({
        name: op.name,
        stepsCount: op.steps?.length || 0
      }))
    });
    
    result.push({
      type: 'standard-phase',
      id: phase.id,
      name: phase.name,
      phase,
      steps
    });
  });
  
  // 2. Add flow-specific organization for CUSTOM phases only
  if (flowType === 'batch-flow') {
    const batchResult = organizeStepsForBatchFlow(customPhases, spaces, projectRun);
    // Since we're already passing only custom phases, the result should only contain custom-phase types
    // But filter defensively just in case
    const customOnly = batchResult.filter(item => {
      // Only include items that are NOT standard phases or close-project
      // These functions should only return custom-phase types, but be defensive
      return item.type !== 'standard-phase' && item.type !== 'close-project';
    });
    console.log('📋 Batch flow custom phases result:', {
      inputCustomPhasesCount: customPhases.length,
      batchResultCount: batchResult.length,
      filteredCount: customOnly.length,
      resultTypes: batchResult.map(r => r.type),
      filteredTypes: customOnly.map(r => r.type)
    });
    result.push(...customOnly);
  } else {
    // Default to single-piece-flow
    const singlePieceResult = organizeStepsForSinglePieceFlow(customPhases, spaces, projectRun);
    // Since we're already passing only custom phases, the result should only contain space-container types
    // But filter defensively just in case
    const customOnly = singlePieceResult.filter(item => {
      // Only include items that are NOT standard phases or close-project
      // These functions should only return space-container types, but be defensive
      return item.type !== 'standard-phase' && item.type !== 'close-project';
    });
    console.log('📋 Single-piece flow custom phases result:', {
      inputCustomPhasesCount: customPhases.length,
      singlePieceResultCount: singlePieceResult.length,
      filteredCount: customOnly.length,
      resultTypes: singlePieceResult.map(r => r.type),
      filteredTypes: customOnly.map(r => r.type),
      resultStepsCount: singlePieceResult.reduce((sum, r) => sum + r.steps.length, 0),
      filteredStepsCount: customOnly.reduce((sum, r) => sum + r.steps.length, 0)
    });
    result.push(...customOnly);
  }
  
  // 3. Add Close Project phase LAST (always separate, not affected by flow type)
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
  
  const totalSteps = result.reduce((sum, r) => sum + r.steps.length, 0);
  console.log('📋 Final navigation result:', {
    totalItems: result.length,
    totalSteps: totalSteps,
    items: result.map(r => ({ 
      type: r.type, 
      name: r.name, 
      spacesCount: r.spaces?.length || 0, 
      stepsCount: r.steps.length,
      hasSteps: r.steps.length > 0
    }))
  });
  
  // CRITICAL: If result has no steps, log a warning
  if (totalSteps === 0 && phases.length > 0) {
    console.error('❌ CRITICAL: organizeWorkflowNavigation returned 0 steps but had phases!', {
      phasesCount: phases.length,
      standardPhasesCount: standardPhases.length,
      customPhasesCount: customPhases.length,
      closeProjectPhase: !!closeProjectPhase,
      standardPhases: standardPhases.map(p => ({
        name: p.name,
        operationsCount: p.operations?.length || 0,
        totalSteps: p.operations?.reduce((sum, op) => sum + (op.steps?.length || 0), 0) || 0
      })),
      customPhases: customPhases.map(p => ({
        name: p.name,
        operationsCount: p.operations?.length || 0,
        totalSteps: p.operations?.reduce((sum, op) => sum + (op.steps?.length || 0), 0) || 0
      }))
    });
  }
  
  return result;
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
        const spaceKey = space.space_name; // Use space name directly
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
            // CRITICAL: Use space.space_name which is dynamically linked to database
            // If space_name changes in project_run_spaces, this will automatically reflect it
            const operationKey = `${space.space_name} - ${operation.name}`;
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

