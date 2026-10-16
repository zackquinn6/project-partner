import { addMinutes, parseISO } from 'date-fns';
import type { ScheduledTask, SchedulingResult, Task, TaskStatus } from '@/interfaces/Scheduling';

export interface ScheduleEventRow {
  id: string;
  date: string;
  phaseId?: string;
  operationId?: string;
  duration?: number;
  notes?: string;
  assignedTo?: string;
}

/**
 * Rebuild in-memory schedule state from persisted schedule_events.events
 * so Sheet / View Schedule can open without regenerating.
 */
export function schedulingStateFromEvents(
  events: ScheduleEventRow[],
  fallbackTasks: Task[] = []
): { result: SchedulingResult; tasks: Task[] } {
  const tasks: Task[] = [];
  const scheduledTasks: ScheduledTask[] = [];
  const taskById = new Map(fallbackTasks.map((t) => [t.id, t]));

  for (const event of events) {
    if (!event?.id || !event.date) continue;
    const existing = taskById.get(event.id);
    const durationMinutes =
      typeof event.duration === 'number' && Number.isFinite(event.duration)
        ? event.duration
        : existing
          ? Math.round(existing.estimatedHours * 60)
          : null;
    if (durationMinutes == null || durationMinutes <= 0) continue;

    const title =
      (typeof event.notes === 'string' && event.notes.trim() !== ''
        ? event.notes
        : existing?.title) ?? event.id;
    const phaseId = event.phaseId || existing?.phaseId;
    const operationId = event.operationId || existing?.operationId;

    const task: Task = {
      id: event.id,
      title,
      estimatedHours: durationMinutes / 60,
      minContiguousHours: existing?.minContiguousHours ?? Math.min(durationMinutes / 60, 1),
      dependencies: existing?.dependencies ?? [],
      tags: existing?.tags ?? [],
      phaseId,
      operationId,
      materialLeadTimeDays: existing?.materialLeadTimeDays,
      confidence: existing?.confidence,
    };
    tasks.push(task);
    taskById.set(task.id, task);

    const startTime = parseISO(`${event.date}T09:00:00`);
    if (Number.isNaN(startTime.getTime())) continue;
    const endTime = addMinutes(startTime, durationMinutes);
    const status: TaskStatus = 'confirmed';
    scheduledTasks.push({
      taskId: event.id,
      workerId: event.assignedTo || '',
      startTime,
      endTime,
      targetCompletionDate: endTime,
      latestCompletionDate: endTime,
      status,
      bufferApplied: 0,
      isManualEdit: true,
    });
  }

  const totalDuration = scheduledTasks.reduce((sum, st) => {
    return sum + (st.endTime.getTime() - st.startTime.getTime()) / 3600000;
  }, 0);

  return {
    result: {
      scheduledTasks,
      criticalPath: [],
      totalDuration,
      remediations: [],
      warnings: [],
      slackTimes: {},
    },
    tasks,
  };
}
