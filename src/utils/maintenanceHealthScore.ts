import { getTaskProgress, type TaskForProgress } from '@/utils/maintenanceProgress';

const W_O = 5;
const W_C = 3;
const W_D = 1;
const DEFAULT_CRITICALITY = 2;

export type TaskForHealthScore = TaskForProgress & {
  criticality?: number | null;
};

function getCriticality(task: TaskForHealthScore): number {
  const c = task.criticality;
  if (c === 1 || c === 2 || c === 3) return c;
  return DEFAULT_CRITICALITY;
}

/**
 * Same formula as MaintenanceDashboard: 100 minus penalties for overdue tasks,
 * their criticality sum, and “due soon” (90–99% progress) tasks.
 */
export function computeMaintenanceHealthScore(
  tasks: TaskForHealthScore[],
  referenceDate?: Date
): number {
  const now = referenceDate ?? new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const overdue = tasks.filter((t) => getTaskProgress(t, today) >= 100);
  const caution = tasks.filter((t) => {
    const p = getTaskProgress(t, today);
    return p >= 90 && p < 100;
  });
  const O = overdue.length;
  const C = overdue.reduce((sum, t) => sum + getCriticality(t), 0);
  const D = caution.length;

  return Math.max(0, Math.min(100, Math.round(100 - W_O * O - W_C * C - W_D * D)));
}

/** Consumer-facing label for a 0–100 maintenance health score. */
export function getMaintenanceHealthScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Great';
  if (score >= 60) return 'Good';
  return 'Needs attention';
}

/** Tailwind text color class aligned with the health score label bands. */
export function getMaintenanceHealthScoreColorClass(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-warning-soft';
  return 'text-destructive';
}
