import { differenceInDays } from 'date-fns';

export interface TaskForProgress {
  id: string;
  last_completed: string | null;
  frequency_days: number;
  progress_percentage?: number | null;
}

/**
 * Progress toward next due (0–100+). Same logic as MaintenanceDashboard.
 * Uses progress_percentage when set; otherwise (days since last_completed / frequency_days) * 100.
 */
export function getTaskProgress(
  task: TaskForProgress,
  today: Date = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
): number {
  if (task.progress_percentage != null) {
    return Math.max(0, task.progress_percentage);
  }
  if (!task.last_completed) return 0;
  const daysSince = differenceInDays(today, new Date(task.last_completed));
  return Math.max(0, (daysSince / task.frequency_days) * 100);
}

/**
 * Count of tasks that are "Due Soon" in the Maintenance tracker: progress >= 90% and < 100%.
 */
export function countDueSoon(
  tasks: TaskForProgress[],
  today?: Date
): number {
  const t = today ?? new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  return tasks.filter((task) => {
    const p = getTaskProgress(task, t);
    return p >= 90 && p < 100;
  }).length;
}
