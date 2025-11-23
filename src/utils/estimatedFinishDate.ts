import { SchedulingEngine } from './schedulingEngine';
import { SchedulingInputs, Task, Worker } from '@/interfaces/Scheduling';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { Phase, WorkflowStep } from '@/interfaces/Project';
import { format, addDays } from 'date-fns';

/**
 * Calculates estimated finish date for a project run based on remaining steps
 * Uses the project scheduler to reschedule remaining work
 */
export async function calculateEstimatedFinishDate(
  projectRun: ProjectRun,
  projectPhases: Phase[],
  completedSteps: Set<string>,
  teamMembers?: any[],
  scheduleSettings?: {
    scheduleTempo?: 'fast_track' | 'steady' | 'extended';
    planningMode?: 'quick' | 'standard' | 'detailed';
    targetDate?: Date;
  }
): Promise<Date | null> {
  try {
    // Get all remaining steps (not completed)
    const allSteps: WorkflowStep[] = [];
    projectPhases.forEach(phase => {
      phase.operations.forEach(operation => {
        operation.steps.forEach(step => {
          if (!completedSteps.has(step.id)) {
            allSteps.push(step);
          }
        });
      });
    });

    // If all steps are completed, return today
    if (allSteps.length === 0) {
      return new Date();
    }

    // Get team members from project run or use defaults
    const workers: Worker[] = (teamMembers || []).map(member => ({
      id: member.id || '1',
      name: member.name || 'You',
      type: (member.type || 'owner') as 'owner' | 'helper',
      skillLevel: (member.skillLevel || 'intermediate') as 'novice' | 'intermediate' | 'expert',
      maxTotalHours: member.maxTotalHours || 40,
      weekendsOnly: member.weekendsOnly || false,
      weekdaysAfterFivePm: member.weekdaysAfterFivePm || false,
      workingHours: member.workingHours || { start: '09:00', end: '17:00' },
      availability: member.availability || {}
    }));

    // If no team members, create a default owner
    if (workers.length === 0) {
      // Generate default availability for the next 30 days
      const defaultAvailability: Record<string, { start: Date; end: Date }[]> = {};
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        defaultAvailability[dateStr] = [{
          start: new Date(`${dateStr}T09:00:00`),
          end: new Date(`${dateStr}T17:00:00`)
        }];
      }
      
      workers.push({
        id: '1',
        name: 'You',
        type: 'owner',
        skillLevel: 'intermediate',
        maxTotalHours: 40,
        weekendsOnly: false,
        weekdaysAfterFivePm: false,
        workingHours: { start: '09:00', end: '17:00' },
        availability: defaultAvailability
      });
    } else {
      // Ensure all workers have some availability
      workers.forEach(worker => {
        if (!worker.availability || Object.keys(worker.availability).length === 0) {
          // Generate default availability for the next 30 days
          const defaultAvailability: Record<string, { start: Date; end: Date }[]> = {};
          const today = new Date();
          for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            defaultAvailability[dateStr] = [{
              start: new Date(`${dateStr}T09:00:00`),
              end: new Date(`${dateStr}T17:00:00`)
            }];
          }
          worker.availability = defaultAvailability;
        }
      });
    }

    // Build tasks from remaining steps
    const tasks: Task[] = [];
    const scheduleTempo = scheduleSettings?.scheduleTempo || 
      (projectRun.schedule_events as any)?.scheduleTempo || 
      'steady';

    allSteps.forEach((step, index) => {
      // Get time estimate based on schedule tempo
      const timeEstimate = step.timeEstimation?.variableTime || { low: 1, medium: 2, high: 3 };
      let estimatedHours = timeEstimate.medium || 2;
      
      if (scheduleTempo === 'fast_track') {
        estimatedHours = timeEstimate.low || 1;
      } else if (scheduleTempo === 'extended') {
        estimatedHours = timeEstimate.high || 3;
      }

      // Apply scaling if needed
      if (projectRun.initial_sizing) {
        const size = parseFloat(String(projectRun.initial_sizing)) || 1;
        estimatedHours *= size;
      }

      // Build dependencies (steps in same operation depend on previous step)
      const dependencies: string[] = [];
      if (index > 0) {
        const prevStep = allSteps[index - 1];
        if (prevStep.operationId === step.operationId) {
          dependencies.push(prevStep.id);
        }
      }

      tasks.push({
        id: step.id,
        title: step.step || step.stepTitle || 'Step',
        estimatedHours,
        minContiguousHours: Math.min(estimatedHours, 2),
        dependencies,
        tags: [`phase:${step.phaseId}`, `operation:${step.operationId}`],
        confidence: 0.7
      });
    });

    // Use target date from settings or project run, or default to 30 days from now
    const targetDate = scheduleSettings?.targetDate || 
      (projectRun.planEndDate ? new Date(projectRun.planEndDate) : null) ||
      addDays(new Date(), 30);

    // Create scheduling inputs
    const schedulingInputs: SchedulingInputs = {
      tasks,
      workers,
      targetCompletionDate: targetDate,
      scheduleTempo: scheduleTempo,
      planningMode: scheduleSettings?.planningMode || 'standard',
      quietHours: {
        start: '21:00',
        end: '07:00'
      }
    };

    // Run scheduler
    const scheduler = new SchedulingEngine();
    const result = scheduler.computeSchedule(schedulingInputs);

    // Find the latest completion date from scheduled tasks
    if (result.scheduledTasks.length === 0) {
      // If no tasks could be scheduled, estimate based on total hours
      const totalHours = tasks.reduce((sum, task) => sum + task.estimatedHours, 0);
      const avgHoursPerDay = 4; // Default assumption
      const daysNeeded = Math.ceil(totalHours / avgHoursPerDay);
      return addDays(new Date(), daysNeeded);
    }

    // Get the latest end time from all scheduled tasks
    const latestEndTime = result.scheduledTasks.reduce((latest, task) => {
      const endTime = task.endTime.getTime();
      return endTime > latest ? endTime : latest;
    }, 0);

    return new Date(latestEndTime);
  } catch (error) {
    console.error('Error calculating estimated finish date:', error);
    return null;
  }
}

/**
 * Formats estimated finish date for display
 */
export function formatEstimatedFinishDate(date: Date | null): string {
  if (!date) return 'Calculating...';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const finishDate = new Date(date);
  finishDate.setHours(0, 0, 0, 0);
  
  const diffDays = Math.ceil((finishDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return 'Overdue';
  } else if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Tomorrow';
  } else if (diffDays < 7) {
    return `In ${diffDays} days`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `In ${weeks} week${weeks > 1 ? 's' : ''}`;
  } else {
    return format(finishDate, 'MMM d, yyyy');
  }
}

/**
 * Checks if estimated finish date should be refreshed
 * Returns true if:
 * - Last refresh was more than 24 hours ago
 * - Never been calculated
 * - Project was just opened
 */
export function shouldRefreshEstimatedFinishDate(
  lastRefreshDate: Date | null,
  forceRefresh: boolean = false
): boolean {
  if (forceRefresh) return true;
  if (!lastRefreshDate) return true;
  
  const now = new Date();
  const hoursSinceRefresh = (now.getTime() - lastRefreshDate.getTime()) / (1000 * 60 * 60);
  
  return hoursSinceRefresh >= 24;
}

