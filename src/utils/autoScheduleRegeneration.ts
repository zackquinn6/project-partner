import { ProjectRun } from '@/interfaces/ProjectRun';
import { Project } from '@/interfaces/Project';
import { Phase } from '@/interfaces/Project';
import { SchedulingEngine } from './schedulingEngine';
import { SchedulingInputs } from '@/interfaces/Scheduling';
import { format, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

/**
 * Checks if a schedule needs to be regenerated (older than 1 day)
 */
export function shouldRegenerateSchedule(projectRun: ProjectRun): boolean {
  const scheduleEvents = projectRun.schedule_events as any;
  
  // If no schedule exists, don't regenerate (user needs to create initial schedule)
  if (!scheduleEvents?.events || !Array.isArray(scheduleEvents.events) || scheduleEvents.events.length === 0) {
    return false;
  }
  
  // Check last generation time
  const lastGeneratedAt = scheduleEvents.lastGeneratedAt;
  if (!lastGeneratedAt) {
    // If no timestamp, assume it needs regeneration (old schedule)
    return true;
  }
  
  const lastGenerated = new Date(lastGeneratedAt);
  const now = new Date();
  const hoursSinceGeneration = (now.getTime() - lastGenerated.getTime()) / (1000 * 60 * 60);
  
  // Regenerate if older than 24 hours
  return hoursSinceGeneration >= 24;
}

/**
 * Automatically regenerates the project schedule
 * This replicates the logic from ProjectScheduler's computeAdvancedSchedule
 */
export async function autoRegenerateSchedule(
  projectRun: ProjectRun,
  project: Project,
  workflowPhases: Phase[],
  completedSteps: Set<string>
): Promise<boolean> {
  try {
    const scheduleEvents = projectRun.schedule_events as any;
    
    // Get scheduling settings from saved schedule
    const scheduleTempo = scheduleEvents?.scheduleTempo || 'steady';
    const planningMode = scheduleEvents?.planningMode || 'standard';
    const completionPriority = (projectRun.completion_priority as 'agile' | 'waterfall') || 'agile';
    const teamMembers = scheduleEvents?.teamMembers || [];
    const globalSettings = scheduleEvents?.globalSettings || { quietHours: { start: '21:00', end: '07:00' } };
    
    // Get target date from project run or default
    const targetDate = projectRun.planEndDate ? new Date(projectRun.planEndDate) : addDays(new Date(), 30);
    const dropDeadDate = addDays(targetDate, 7); // Default buffer
    
    // Load spaces with priority and sizing
    const { data: spacesData, error: spacesError } = await supabase
      .from('project_run_spaces')
      .select('id, space_name, priority, scale_value, scale_unit')
      .eq('project_run_id', projectRun.id)
      .order('priority', { ascending: true, nullsLast: true });
    
    if (spacesError) {
      console.error('Error loading spaces for auto-schedule:', spacesError);
      return false;
    }
    
    // Load sizing values
    const spaceIds = (spacesData || []).map(s => s.id);
    const { data: sizingData } = await supabase
      .from('project_run_space_sizing')
      .select('space_id, scaling_unit, size_value')
      .in('space_id', spaceIds);
    
    // Build sizing map
    const sizingMap = new Map<string, Record<string, number>>();
    (sizingData || []).forEach(sizing => {
      if (!sizingMap.has(sizing.space_id)) {
        sizingMap.set(sizing.space_id, {});
      }
      sizingMap.get(sizing.space_id)![sizing.scaling_unit] = sizing.size_value;
    });
    
    const spaces = (spacesData || []).map(space => {
      const relationalSizing = sizingMap.get(space.id) || {};
      if (Object.keys(relationalSizing).length === 0 && space.scale_value && space.scale_unit) {
        relationalSizing[space.scale_unit] = space.scale_value;
      }
      return {
        id: space.id,
        space_name: space.space_name,
        priority: space.priority,
        sizingValues: relationalSizing
      };
    });
    
    // Build tasks from remaining steps (similar to ProjectScheduler logic)
    const tasks: any[] = [];
    const spacesByPriority = [...spaces].sort((a, b) => (a.priority || 999) - (b.priority || 999));
    
    workflowPhases.forEach(phase => {
      // Skip standard phases (Kickoff, Planning, Ordering, Close Project)
      if (phase.isStandard) return;
      
      phase.operations.forEach(operation => {
        operation.steps.forEach((step, stepIndex) => {
          // Skip completed steps
          if (completedSteps.has(step.id)) return;
          
          // Apply to each space
          spacesByPriority.forEach((space, spaceIndex) => {
            const spacePriority = space.priority || spaceIndex + 1;
            
            // Get time estimates
            const timeEstimation = step.timeEstimation;
            const baseLow = timeEstimation?.variableTime?.low || 1;
            const baseMed = timeEstimation?.variableTime?.medium || 2;
            const baseHigh = timeEstimation?.variableTime?.high || 3;
            
            // Apply scaling from space sizing
            let adjustedLow = baseLow;
            let adjustedMed = baseMed;
            let adjustedHigh = baseHigh;
            
            if (step.scalingUnit && space.sizingValues) {
              const sizeValue = space.sizingValues[step.scalingUnit];
              if (sizeValue) {
                adjustedLow = baseLow * sizeValue;
                adjustedMed = baseMed * sizeValue;
                adjustedHigh = baseHigh * sizeValue;
              }
            }
            
            // Select time estimate based on schedule tempo
            const selectedTimeEstimate = scheduleTempo === 'fast_track' ? adjustedLow :
                                        scheduleTempo === 'extended' ? adjustedHigh :
                                        adjustedMed;
            
            // Build dependencies
            const dependencies: string[] = [];
            if (completionPriority === 'agile') {
              // Single-piece flow: Step N depends on Step N-1 in same space
              if (stepIndex > 0) {
                dependencies.push(`${operation.id}-step-${stepIndex - 1}-space-${space.id}`);
              }
            } else {
              // Batch flow: Step N of space M depends on Step N of space M-1
              if (spaceIndex > 0) {
                const prevSpace = spacesByPriority[spaceIndex - 1];
                dependencies.push(`${operation.id}-step-${stepIndex}-space-${prevSpace.id}`);
              }
            }
            
            tasks.push({
              id: `${operation.id}-step-${stepIndex}-space-${space.id}`,
              title: `${step.step} - ${space.space_name}`,
              estimatedHours: selectedTimeEstimate,
              minContiguousHours: Math.min(adjustedMed, 2),
              dependencies,
              tags: [`space:${space.id}`, `priority:${spacePriority}`, `phase:${phase.id}`, `workers:${step.workersNeeded || 1}`],
              confidence: 0.7,
              phaseId: phase.id,
              operationId: operation.id,
              stepId: step.id,
              metadata: {
                spaceId: space.id,
                spacePriority,
                workersNeeded: step.workersNeeded || 1
              }
            });
          });
        });
      });
    });
    
    // Sort tasks by space priority
    const sortedTasks = tasks.sort((a, b) => {
      const aMetadata = a.metadata;
      const bMetadata = b.metadata;
      if (aMetadata && bMetadata) {
        return aMetadata.spacePriority - bMetadata.spacePriority;
      }
      if (aMetadata) return -1;
      if (bMetadata) return 1;
      return 0;
    });
    
    // Convert team members to workers format
    const workers = teamMembers.map(tm => ({
      id: tm.id || '1',
      name: tm.name || 'You',
      type: (tm.type || 'owner') as 'owner' | 'helper',
      skillLevel: (tm.skillLevel || 'intermediate') as 'novice' | 'intermediate' | 'expert',
      maxTotalHours: tm.maxTotalHours || 40,
      weekendsOnly: tm.weekendsOnly || false,
      weekdaysAfterFivePm: tm.weekdaysAfterFivePm || false,
      workingHours: tm.workingHours || { start: '09:00', end: '17:00' },
      availability: [{
        start: new Date(),
        end: addDays(new Date(), 90),
        workerId: tm.id || '1',
        isAvailable: true
      }]
    }));
    
    // If no team members, create default owner
    if (workers.length === 0) {
      workers.push({
        id: '1',
        name: 'You',
        type: 'owner',
        skillLevel: 'intermediate',
        maxTotalHours: 40,
        weekendsOnly: false,
        weekdaysAfterFivePm: false,
        workingHours: { start: '09:00', end: '17:00' },
        availability: [{
          start: new Date(),
          end: addDays(new Date(), 90),
          workerId: '1',
          isAvailable: true
        }]
      });
    }
    
    // Create scheduling inputs
    const schedulingInputs: SchedulingInputs = {
      targetCompletionDate: targetDate,
      dropDeadDate: dropDeadDate,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      tasks: sortedTasks,
      workers: workers,
      siteConstraints: {
        allowedWorkHours: {
          weekdays: { start: '07:00', end: '21:00' },
          weekends: { start: '07:00', end: '21:00' }
        },
        weekendsOnly: false,
        allowNightWork: false,
        noiseCurfew: globalSettings.quietHours?.start || '21:00'
      },
      blackoutDates: [],
      scheduleTempo: scheduleTempo,
      preferHelpers: teamMembers.some(tm => tm.type === 'helper'),
      mode: planningMode,
      completionPriority: completionPriority
    };
    
    // Compute schedule
    const schedulingEngine = new SchedulingEngine();
    const result = schedulingEngine.computeSchedule(schedulingInputs);
    
    // Save the regenerated schedule
    const updatedProjectRun = {
      ...projectRun,
      schedule_events: {
        events: result.scheduledTasks.map(task => ({
          id: task.taskId,
          date: format(task.startTime, 'yyyy-MM-dd'),
          phaseId: sortedTasks.find(t => t.id === task.taskId)?.phaseId || '',
          operationId: sortedTasks.find(t => t.id === task.taskId)?.operationId || '',
          duration: Math.round((task.endTime.getTime() - task.startTime.getTime()) / 60000),
          notes: sortedTasks.find(t => t.id === task.taskId)?.title || '',
          assignedTo: (task as any).assignedTo || ''
        })),
        teamMembers: teamMembers,
        globalSettings: globalSettings,
        scheduleTempo: scheduleTempo,
        planningMode: planningMode,
        lastGeneratedAt: new Date().toISOString() // Store generation timestamp
      },
      calendar_integration: {
        scheduledDays: result.scheduledTasks.reduce((acc, task) => {
          const dateKey = format(task.startTime, 'yyyy-MM-dd');
          if (!acc[dateKey]) {
            acc[dateKey] = {
              date: dateKey,
              timeSlots: []
            };
          }
          acc[dateKey].timeSlots.push({
            startTime: format(task.startTime, 'HH:mm'),
            endTime: format(task.endTime, 'HH:mm'),
            phaseId: sortedTasks.find(t => t.id === task.taskId)?.phaseId,
            operationId: sortedTasks.find(t => t.id === task.taskId)?.operationId
          });
          return acc;
        }, {} as Record<string, any>),
        preferences: {
          preferredStartTime: '09:00',
          maxHoursPerDay: 8,
          preferredDays: [1, 2, 3, 4, 5, 6, 0]
        }
      }
    };
    
    // Update project run in database
    const { error } = await supabase
      .from('project_runs')
      .update({
        schedule_events: updatedProjectRun.schedule_events,
        calendar_integration: updatedProjectRun.calendar_integration
      })
      .eq('id', projectRun.id);
    
    if (error) {
      console.error('Error saving auto-regenerated schedule:', error);
      return false;
    }
    
    // Dispatch refresh event
    window.dispatchEvent(new CustomEvent('project-scheduler-updated', {
      detail: { projectRunId: projectRun.id }
    }));
    
    console.log('✅ Auto-regenerated schedule successfully');
    return true;
  } catch (error) {
    console.error('Error auto-regenerating schedule:', error);
    return false;
  }
}

