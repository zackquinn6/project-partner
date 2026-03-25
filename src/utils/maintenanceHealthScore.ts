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
