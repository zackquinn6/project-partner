import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { ProjectRun } from '@/interfaces/ProjectRun';
import { projectRunDisplayName } from '@/utils/projectRunDisplayName';
import { PLANNING_TOOL_WINDOW_CONTENT_PADDING_CLASSNAME } from '@/components/PlanningWizardSteps/planningToolWindowChrome';

export interface PlanningToolContextBannerProps {
  projectRun?: ProjectRun | null;
  /**
   * Explicit display name when a full project run is not available
   * (e.g. template Risk Radar). Prefer `projectRun` when both are set.
   */
  projectName?: string | null;
  /**
   * Step-specific label shown above the primary line
   * (e.g. "Size estimate", "Timeline", "Budget goal").
   * Omit for name-only banners.
   */
  label?: string;
  /**
   * Key info for this step, shown after the project name
   * (e.g. "75 sq ft", "October 10, 2026").
   */
  detail?: string | null;
  /** Optional right-side content (e.g. budgeted vs goal). */
  trailing?: ReactNode;
  /**
   * When true, omit horizontal content padding (caller already pads).
   * Default false — banner includes standard planning-tool horizontal padding.
   */
  flush?: boolean;
  className?: string;
}

/**
 * Shared project context strip for Planning Studio tools.
 * Primary line: "{ProjectName}" or "{ProjectName} - {detail}".
 */
export function PlanningToolContextBanner({
  projectRun,
  projectName: projectNameProp,
  label,
  detail,
  trailing,
  flush = false,
  className,
}: PlanningToolContextBannerProps) {
  const projectName =
    projectRunDisplayName(projectRun) ||
    (typeof projectNameProp === 'string' ? projectNameProp.trim() : '') ||
    null;
  if (!projectName) return null;

  const detailText = typeof detail === 'string' ? detail.trim() : '';
  const primary =
    detailText.length > 0 ? `${projectName} - ${detailText}` : projectName;

  return (
    <div
      className={cn(
        flush ? 'pb-2 pt-0' : cn('pb-2 pt-4 md:pt-5', PLANNING_TOOL_WINDOW_CONTENT_PADDING_CLASSNAME),
        className
      )}
    >
      <div className="rounded-lg border border-primary/20 bg-primary/10 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            {label ? (
              <div className="mb-1 text-xs text-muted-foreground">{label}</div>
            ) : null}
            <div className="truncate text-lg font-bold text-primary md:text-xl">
              {primary}
            </div>
          </div>
          {trailing ? <div className="shrink-0 text-right">{trailing}</div> : null}
        </div>
      </div>
    </div>
  );
}
