import { ProjectRun } from '@/interfaces/ProjectRun';

/**
 * UNIFIED PROGRESS CALCULATION UTILITY
 * Single source of truth for calculating project progress
 * 
 * IMPORTANT: Counts ALL steps including standard phases
 */
export function calculateProjectProgress(projectRun: ProjectRun): number {
  if (!projectRun.phases || projectRun.phases.length === 0) {
    return 0;
  }
  
  // Count total steps in ALL phases
  const totalSteps = projectRun.phases.reduce((sum, phase) => 
    sum + (phase.operations?.reduce((opSum, op) => 
      opSum + (op.steps?.length || 0), 0) || 0), 0);
  
  if (totalSteps === 0) {
    return 0;
  }
  
  // Count completed steps in ALL phases
  const completedStepIds = new Set(projectRun.completedSteps || []);
  const completedSteps = projectRun.phases.reduce((sum, phase) => 
    sum + (phase.operations?.reduce((opSum, op) => 
      opSum + (op.steps?.filter(step => completedStepIds.has(step.id)).length || 0), 0) || 0), 0);
  
  return Math.round((completedSteps / totalSteps) * 100);
}

/**
 * Calculate workflow progress (EXCLUDING standard phases like Kickoff, Planning, Ordering, Close Project)
 * This is the correct progress shown to users for actual project work
 */
export function calculateWorkflowProgress(projectRun: ProjectRun): number {
  if (!projectRun.phases || projectRun.phases.length === 0) {
    return 0;
  }
  
  // Only count non-standard phases
  const workflowPhases = projectRun.phases.filter(phase => phase.isStandard !== true);
  
  // Count total steps in workflow phases only
  const totalSteps = workflowPhases.reduce((sum, phase) => 
    sum + (phase.operations?.reduce((opSum, op) => 
      opSum + (op.steps?.length || 0), 0) || 0), 0);
  
  if (totalSteps === 0) {
    return 0;
  }
  
  // Count completed steps in workflow phases only
  const completedStepIds = new Set(projectRun.completedSteps || []);
  const completedSteps = workflowPhases.reduce((sum, phase) => 
    sum + (phase.operations?.reduce((opSum, op) => 
      opSum + (op.steps?.filter(step => completedStepIds.has(step.id)).length || 0), 0) || 0), 0);
  
  return Math.round((completedSteps / totalSteps) * 100);
}

/**
 * Get all steps count (including standard phases)
 */
export function getWorkflowStepsCount(projectRun: ProjectRun): { total: number; completed: number } {
  if (!projectRun.phases || projectRun.phases.length === 0) {
    return { total: 0, completed: 0 };
  }
  
  // Only count non-standard phases for workflow progress
  const workflowPhases = projectRun.phases.filter(phase => phase.isStandard !== true);
  
  const total = workflowPhases.reduce((sum, phase) => 
    sum + (phase.operations?.reduce((opSum, op) => 
      opSum + (op.steps?.length || 0), 0) || 0), 0);
  
  const completedStepIds = new Set(projectRun.completedSteps || []);
  const completed = workflowPhases.reduce((sum, phase) => 
    sum + (phase.operations?.reduce((opSum, op) => 
      opSum + (op.steps?.filter(step => completedStepIds.has(step.id)).length || 0), 0) || 0), 0);
  
  return { total, completed };
}
