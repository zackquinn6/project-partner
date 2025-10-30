import { ProjectRun } from '@/interfaces/ProjectRun';

/**
 * UNIFIED PROGRESS CALCULATION UTILITY
 * Single source of truth for calculating project progress
 * 
 * IMPORTANT: Counts ALL steps including standard phases (Kickoff, Planning, Ordering, Close Project)
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
 * Get all steps count (INCLUDING all phases - kickoff and standard phases)
 */
export function getWorkflowStepsCount(projectRun: ProjectRun): { total: number; completed: number } {
  if (!projectRun.phases || projectRun.phases.length === 0) {
    return { total: 0, completed: 0 };
  }
  
  // Count ALL phases including standard phases
  const total = projectRun.phases.reduce((sum, phase) => 
    sum + (phase.operations?.reduce((opSum, op) => 
      opSum + (op.steps?.length || 0), 0) || 0), 0);
  
  const completedStepIds = new Set(projectRun.completedSteps || []);
  const completed = projectRun.phases.reduce((sum, phase) => 
    sum + (phase.operations?.reduce((opSum, op) => 
      opSum + (op.steps?.filter(step => completedStepIds.has(step.id)).length || 0), 0) || 0), 0);
  
  return { total, completed };
}
