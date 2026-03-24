import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const PLANNING_WINDOW_MS = 30 * 60 * 1000;

function formatMmSs(remainingMs: number): string {
  const totalSec = Math.max(0, Math.floor(remainingMs / 1000));
  const m = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export interface ProjectPlanningCountdownBannerProps {
  /** When the project run was first created (`project_runs.created_at`). */
  projectCreatedAt: Date;
  className?: string;
}

/**
 * Live countdown from project creation to creation + 30 minutes.
 * Shown during kickoff and project planning workflow.
 */
export function ProjectPlanningCountdownBanner({
  projectCreatedAt,
  className,
}: ProjectPlanningCountdownBannerProps) {
  const createdMs = projectCreatedAt.getTime();

  const [remainingMs, setRemainingMs] = useState(() => {
    if (Number.isNaN(createdMs)) return 0;
    return Math.max(0, createdMs + PLANNING_WINDOW_MS - Date.now());
  });

  useEffect(() => {
    if (Number.isNaN(createdMs)) return;
    const tick = () => {
      setRemainingMs(Math.max(0, createdMs + PLANNING_WINDOW_MS - Date.now()));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [createdMs]);

  if (Number.isNaN(createdMs)) return null;

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Time remaining to plan within thirty minutes of project start: ${formatMmSs(remainingMs)}`}
      className={cn(
        'flex flex-col gap-1 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4',
        remainingMs === 0 && 'border-amber-500/50 bg-amber-500/10',
        className
      )}
    >
      <p className="text-sm font-medium text-foreground">Project planned in 30 min or less</p>
      <p
        className={cn(
          'font-mono text-lg font-semibold tabular-nums sm:text-xl',
          remainingMs === 0 ? 'text-amber-900 dark:text-amber-100' : 'text-primary'
        )}
      >
        {formatMmSs(remainingMs)}
      </p>
    </div>
  );
}
