import { differenceInDays, startOfDay } from 'date-fns';
import { getTaskProgress, type TaskForProgress } from '@/utils/maintenanceProgress';

export type MaintenanceTaskListSort = 'relevance' | 'alpha';

export type TaskForSort = TaskForProgress & {
  title: string;
  next_due: string;
  criticality?: number | null;
};

/** Severity weights: High outweighs long Low overdue (e.g. High+7d > Low+28d). */
function getCriticalityWeight(criticality: number | null | undefined): number {
  if (criticality === 3) return 5;
  if (criticality === 1) return 1;
  return 2;
}

function getCriticalityValue(criticality: number | null | undefined): number {
  if (criticality === 1 || criticality === 2 || criticality === 3) return criticality;
  return 2;
}

/** Positive = days overdue, negative = days until due, 0 = due today. */
export function getDaysRelativeToDue(task: Pick<TaskForSort, 'next_due'>, today: Date = startOfDay(new Date())): number {
  const dueDate = startOfDay(new Date(task.next_due));
  const todayStart = startOfDay(today);
  return -differenceInDays(dueDate, todayStart);
}

/**
 * RPN-style attention score: criticalityWeight × urgency.
 * Overdue urgency = 1 + daysOverdue; due-soon = 0.5; otherwise 0.
 */
export function getMaintenanceRelevanceScore(
  task: TaskForSort,
  today: Date = startOfDay(new Date())
): number {
  const weight = getCriticalityWeight(task.criticality);
  const daysRelative = getDaysRelativeToDue(task, today);
  const daysOverdue = Math.max(0, daysRelative);

  let urgency = 0;
  if (daysOverdue > 0 || daysRelative === 0) {
    // Due today counts as overdue intensity of 1 day (1 + 0)
    urgency = daysRelative >= 0 ? 1 + daysOverdue : 0;
  } else {
    const progress = getTaskProgress(task, today);
    if (progress >= 90 && progress < 100) {
      urgency = 0.5;
    }
  }

  return weight * urgency;
}

export function compareMaintenanceTasksByRelevance(
  a: TaskForSort,
  b: TaskForSort,
  today: Date = startOfDay(new Date())
): number {
  const scoreDiff = getMaintenanceRelevanceScore(b, today) - getMaintenanceRelevanceScore(a, today);
  if (scoreDiff !== 0) return scoreDiff;

  const critDiff = getCriticalityValue(b.criticality) - getCriticalityValue(a.criticality);
  if (critDiff !== 0) return critDiff;

  const dueDiff = new Date(a.next_due).getTime() - new Date(b.next_due).getTime();
  if (dueDiff !== 0) return dueDiff;

  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
}

export function compareMaintenanceTasksByTitle(
  a: TaskForSort,
  b: TaskForSort
): number {
  const titleDiff = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  if (titleDiff !== 0) return titleDiff;
  return new Date(a.next_due).getTime() - new Date(b.next_due).getTime();
}

export function compareMaintenanceTasks(
  a: TaskForSort,
  b: TaskForSort,
  sort: MaintenanceTaskListSort,
  today: Date = startOfDay(new Date())
): number {
  if (sort === 'alpha') return compareMaintenanceTasksByTitle(a, b);
  return compareMaintenanceTasksByRelevance(a, b, today);
}
