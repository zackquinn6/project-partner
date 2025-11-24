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
  const optimizationMethod = projectRun.schedule_optimization_method || projectRun.completion_priority;
  
  if (optimizationMethod === 'waterfall' || optimizationMethod === 'batch-flow') {
    return 'batch-flow';
  }
  
  // Default to single-piece-flow (agile)
  return 'single-piece-flow';
}

/**
 * Gets standard phases (Kickoff, Planning, Ordering)
 * These are always shown in order and not affected by spaces
 */
export function getStandardPhases(phases: Phase[]): Phase[] {
  const standardPhaseNames = ['Kickoff', 'Planning', 'Ordering'];
  return phases
    .filter(phase => standardPhaseNames.includes(phase.name))
    .sort((a, b) => {
      const aIndex = standardPhaseNames.indexOf(a.name);
      const bIndex = standardPhaseNames.indexOf(b.name);
      return aIndex - bIndex;
    });
}

/**
 * Gets custom phases (non-standard, non-close-project phases)
 */
export function getCustomPhases(phases: Phase[]): Phase[] {
  const standardPhaseNames = ['Kickoff', 'Planning', 'Ordering', 'Close Project'];
  return phases.filter(phase => !standardPhaseNames.includes(phase.name));
}

/**
 * Gets the Close Project phase
 */
export function getCloseProjectPhase(phases: Phase[]): Phase | null {
  return phases.find(phase => phase.name === 'Close Project') || null;
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
  
  // For now, return true for all custom phases
  // Standard phases always apply
  const standardPhaseNames = ['Kickoff', 'Planning', 'Ordering', 'Close Project'];
  if (standardPhaseNames.includes(phase.name)) {
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
 * Structure: Standard Phases → Space Containers (with custom phases) → Close Project
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
  
  // 1. Add standard phases (Kickoff, Planning, Ordering)
  const standardPhases = getStandardPhases(phases);
  standardPhases.forEach(phase => {
    const steps = phase.operations.flatMap(op => op.steps || []);
    result.push({
      type: 'standard-phase',
      id: phase.id,
      name: phase.name,
      phase,
      steps
    });
  });
  
  // 2. Sort spaces by priority (lower number = higher priority)
  const sortedSpaces = [...spaces].sort((a, b) => {
    const aPriority = a.priority ?? 999;
    const bPriority = b.priority ?? 999;
    return aPriority - bPriority;
  });
  
  // 3. Add space containers with their custom phases
  const customPhases = getCustomPhases(phases);
  sortedSpaces.forEach(space => {
    // Get custom phases that apply to this space
    const applicablePhases = customPhases.filter(phase => 
      phaseAppliesToSpace(phase, space.id, projectRun)
    );
    
    if (applicablePhases.length > 0) {
      // Collect all steps from applicable phases for this space
      // CRITICAL: Preserve phase and operation information on each step
      const spaceSteps: WorkflowStep[] = [];
      applicablePhases.forEach(phase => {
        phase.operations.forEach(operation => {
          const operationSteps = (operation.steps || []).map(step => ({
            ...step,
            phaseId: phase.id,
            phaseName: phase.name,
            operationId: operation.id,
            operationName: operation.name,
            spaceId: space.id,
            spaceName: space.name
          }));
          spaceSteps.push(...operationSteps);
        });
      });
      
      result.push({
        type: 'space-container',
        id: `space-${space.id}`,
        name: space.name, // CRITICAL: This comes from database via dynamic linkage
        // Always use space.name which is dynamically linked to project_run_spaces.space_name
        spaces: [space],
        steps: spaceSteps
      });
    }
  });
  
  // 4. Add Close Project phase (outside all space containers)
  const closeProjectPhase = getCloseProjectPhase(phases);
  if (closeProjectPhase) {
    const steps = closeProjectPhase.operations.flatMap(op => op.steps || []);
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
 * Structure: Standard Phases → Custom Phases (with spaces) → Close Project
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
  
  // 1. Add standard phases (Kickoff, Planning, Ordering)
  const standardPhases = getStandardPhases(phases);
  standardPhases.forEach(phase => {
    const steps = phase.operations.flatMap(op => op.steps || []);
    result.push({
      type: 'standard-phase',
      id: phase.id,
      name: phase.name,
      phase,
      steps
    });
  });
  
  // 2. Sort spaces by priority
  const sortedSpaces = [...spaces].sort((a, b) => {
    const aPriority = a.priority ?? 999;
    const bPriority = b.priority ?? 999;
    return aPriority - bPriority;
  });
  
  // 3. Add custom phases with spaces nested inside
  const customPhases = getCustomPhases(phases);
  customPhases.forEach(phase => {
    // Get spaces that this phase applies to
    const applicableSpaces = sortedSpaces.filter(space =>
      phaseAppliesToSpace(phase, space.id, projectRun)
    );
    
    if (applicableSpaces.length > 0) {
      // For batch flow, operations are repeated under each space
      // Collect steps from all operations for all applicable spaces
      const phaseSteps: WorkflowStep[] = [];
      applicableSpaces.forEach(space => {
        phase.operations.forEach(operation => {
          const operationSteps = (operation.steps || []).map(step => ({
            ...step,
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
        spaces: applicableSpaces,
        steps: phaseSteps
      });
    }
  });
  
  // 4. Add Close Project phase
  const closeProjectPhase = getCloseProjectPhase(phases);
  if (closeProjectPhase) {
    const steps = closeProjectPhase.operations.flatMap(op => op.steps || []);
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
  
  if (flowType === 'batch-flow') {
    return organizeStepsForBatchFlow(phases, spaces, projectRun);
  } else {
    // Default to single-piece-flow
    return organizeStepsForSinglePieceFlow(phases, spaces, projectRun);
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
  const grouped: Record<string, Record<string, WorkflowStep[]>> = {};
  
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
          if (!grouped[spaceKey][phaseName]) {
            grouped[spaceKey][phaseName] = {};
          }
          
          if (!grouped[spaceKey][phaseName][operationName]) {
            grouped[spaceKey][phaseName][operationName] = [];
          }
          
          // Dedupe by step ID
          if (!grouped[spaceKey][phaseName][operationName].some((s: any) => s.id === step.id)) {
            grouped[spaceKey][phaseName][operationName].push(step);
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

