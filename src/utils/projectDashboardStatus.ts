import type { ProjectRun } from '@/interfaces/ProjectRun';
import { calculateProjectProgress } from '@/utils/progressCalculation';

/** Project Dashboard status: progress-derived, or explicit run status when Not a fit. */

export type DashboardRunStatus = 'not-started' | 'in-progress' | 'complete' | 'not-a-fit';

/**
 * Maps progress % to dashboard status (no other inputs):
 * - 0% → not started
 * - strictly between 0% and 100% → in progress
 * - 100% → complete
 * Non-finite values are treated as not started.
 */
export function dashboardStatusFromProgressPercent(progress: number): Exclude<DashboardRunStatus, 'not-a-fit'> {
  const p = Number(progress);
  if (!Number.isFinite(p) || p <= 0) return 'not-started';
  if (p >= 100) return 'complete';
  return 'in-progress';
}

/** Prefer explicit Not a fit; otherwise derive from calculated progress. */
export function dashboardStatusForProjectRun(
  run: ProjectRun,
  progress: number
): DashboardRunStatus {
  if (run.status === 'not-a-fit') return 'not-a-fit';
  return dashboardStatusFromProgressPercent(progress);
}

export function dashboardStatusBadgeLabel(status: DashboardRunStatus): string {
  switch (status) {
    case 'not-started':
      return 'not started';
    case 'in-progress':
      return 'in progress';
    case 'complete':
      return 'complete';
    case 'not-a-fit':
      return 'Not a fit';
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
    case 'not-a-fit':
      return 'bg-red-100 text-red-800 border-red-200';
  }
}

/**
 * Counts project runs that show as **In progress** on the Project Dashboard (same rule as
 * {@link dashboardStatusFromProgressPercent} on calculated progress). Cancelled and Not a fit runs are excluded.
 */
export function countProjectRunsInProgressOnDashboard(runs: ProjectRun[] | undefined | null): number {
  if (!runs?.length) return 0;
  return runs.filter((run) => {
    if (run.status === 'cancelled' || run.status === 'not-a-fit') return false;
    try {
      const p = calculateProjectProgress(run);
      return dashboardStatusFromProgressPercent(p) === 'in-progress';
    } catch {
      if (run.status === 'in-progress') return true;
      const raw = run.progress ?? 0;
      return raw > 0 && raw < 100;
    }
  }).length;
}
