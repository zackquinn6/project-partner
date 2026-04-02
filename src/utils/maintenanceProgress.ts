import { differenceInDays, startOfDay } from 'date-fns';

export interface TaskForProgress {
  id: string;
  last_completed: string | null;
  /** When set, progress is derived from calendar days until due (matches “Due …” in the UI). */
  next_due?: string | null;
  frequency_days: number;
  progress_percentage?: number | null;
}

/**
 * Progress through the current cycle (0–100+).
 * Uses progress_percentage when set.
 * Otherwise, when next_due is set: (frequency_days − full days until due) / frequency_days × 100,
 * using start-of-day dates so it matches “due in N days” (e.g. 30-day cycle, due in 3 days → 90%).
 * Falls back to last_completed vs today only when next_due is missing.
 */
export function getTaskProgress(
  task: TaskForProgress,
  today: Date = startOfDay(new Date())
): number {
  if (task.progress_percentage != null) {
    return Math.max(0, task.progress_percentage);
  }
  const freq = task.frequency_days;
  if (!freq || freq < 1) {
    return 0;
  }
  const todayStart = startOfDay(today);

  if (task.next_due) {
    const dueStart = startOfDay(new Date(task.next_due));
    const daysUntilDue = differenceInDays(dueStart, todayStart);
    const elapsedInCycle = freq - daysUntilDue;
    return Math.max(0, (elapsedInCycle / freq) * 100);
  }

  if (!task.last_completed) return 0;
  const lastStart = startOfDay(new Date(task.last_completed));
  const daysSince = differenceInDays(todayStart, lastStart);
  return Math.max(0, (daysSince / freq) * 100);
}

/**
 * Count of tasks that are "Due Soon" in the Maintenance tracker: progress >= 90% and < 100%.
 */
export function countDueSoon(
  tasks: TaskForProgress[],
  today?: Date
): number {
  const t = today ?? startOfDay(new Date());
  return tasks.filter((task) => {
    const p = getTaskProgress(task, t);
    return p >= 90 && p < 100;
  }).length;
}
