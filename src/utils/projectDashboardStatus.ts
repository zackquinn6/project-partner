/** Project Dashboard status derived only from calculated progress (0–100). */

export type DashboardRunStatus = 'not-started' | 'in-progress' | 'complete';

/**
 * Maps progress % to dashboard status (no other inputs):
 * - 0% → not started
 * - strictly between 0% and 100% → in progress
 * - 100% → complete
 * Non-finite values are treated as not started.
 */
export function dashboardStatusFromProgressPercent(progress: number): DashboardRunStatus {
  const p = Number(progress);
  if (!Number.isFinite(p) || p <= 0) return 'not-started';
  if (p >= 100) return 'complete';
  return 'in-progress';
}

export function dashboardStatusBadgeLabel(status: DashboardRunStatus): string {
  switch (status) {
    case 'not-started':
      return 'not started';
    case 'in-progress':
      return 'in progress';
    case 'complete':
      return 'complete';
  }
}

export function dashboardStatusBadgeClassName(status: DashboardRunStatus): string {
  switch (status) {
    case 'not-started':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'in-progress':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'complete':
      return 'bg-green-100 text-green-800 border-green-200';
  }
}
