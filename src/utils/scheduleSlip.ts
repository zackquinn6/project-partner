import { addDays } from 'date-fns';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { Project, Phase } from '@/interfaces/Project';
import { autoRegenerateSchedule } from '@/utils/autoScheduleRegeneration';
import { formatEstimatedFinishDate } from '@/utils/estimatedFinishDate';
import { supabase } from '@/integrations/supabase/client';

export type ScheduleDelta = {
  previousFinish: Date | null;
  nextFinish: Date | null;
  previousLabel: string;
  nextLabel: string;
  slipped: boolean;
  daysDelta: number | null;
  summary: string;
};

function latestFinishFromEvents(scheduleEvents: unknown): Date | null {
  const events = (scheduleEvents as { events?: Array<{ date?: string; duration?: number }> } | null)
    ?.events;
  if (!events?.length) return null;
  let latest: Date | null = null;
  for (const event of events) {
    if (!event.date) continue;
    const start = new Date(`${event.date}T00:00:00`);
    if (Number.isNaN(start.getTime())) continue;
    const end = new Date(start.getTime() + (event.duration || 0) * 60 * 1000);
    if (!latest || end > latest) latest = end;
  }
  return latest;
}

/**
 * Slip the living schedule after a rework/delay: push plan end by buffer days,
 * regenerate remaining work, and return an old→new finish delta.
 */
export async function applyScheduleSlip(params: {
  projectRun: ProjectRun;
  project: Project;
  workflowPhases: Phase[];
  completedSteps: Set<string> | string[];
  updateProjectRun: (run: ProjectRun) => Promise<void> | void;
  bufferDays?: number;
}): Promise<ScheduleDelta | null> {
  const { projectRun, project, workflowPhases, updateProjectRun } = params;
  const completed =
    params.completedSteps instanceof Set
      ? params.completedSteps
      : new Set(params.completedSteps);
  const bufferDays = params.bufferDays ?? 2;

  const previousFinish = latestFinishFromEvents(projectRun.schedule_events);
  const baseTarget = projectRun.planEndDate
    ? new Date(projectRun.planEndDate)
    : previousFinish || addDays(new Date(), 14);
  const slippedTarget = addDays(baseTarget, bufferDays);

  const slippedRun: ProjectRun = {
    ...projectRun,
    planEndDate: slippedTarget,
    updatedAt: new Date(),
  };

  await updateProjectRun(slippedRun);

  const hasExistingSchedule = Boolean(
    (projectRun.schedule_events as { events?: unknown[] } | null)?.events?.length
  );

  let nextFinish: Date | null = slippedTarget;
  let nextSchedule = projectRun.schedule_events;

  if (hasExistingSchedule) {
    const regenerated = await autoRegenerateSchedule(
      slippedRun,
      project,
      workflowPhases,
      completed
    );
    if (regenerated) {
      const { data } = await supabase
        .from('project_runs')
        .select('schedule_events')
        .eq('id', projectRun.id)
        .maybeSingle();
      if (data?.schedule_events) {
        nextSchedule = data.schedule_events as ProjectRun['schedule_events'];
        nextFinish = latestFinishFromEvents(nextSchedule) || slippedTarget;
        await updateProjectRun({
          ...slippedRun,
          schedule_events: nextSchedule,
          planEndDate: slippedTarget,
          updatedAt: new Date(),
        });
      }
    }
  } else {
    nextFinish = slippedTarget;
  }

  const previousLabel = previousFinish
    ? formatEstimatedFinishDate(previousFinish)
    : 'TBD';
  const nextLabel = formatEstimatedFinishDate(nextFinish);
  const daysDelta =
    previousFinish && nextFinish
      ? Math.round(
          (nextFinish.getTime() - previousFinish.getTime()) / (1000 * 60 * 60 * 24)
        )
      : bufferDays;

  return {
    previousFinish,
    nextFinish,
    previousLabel,
    nextLabel,
    slipped: true,
    daysDelta,
    summary: `Schedule updated: ${previousLabel} → ${nextLabel}${
      daysDelta != null
        ? ` (${daysDelta >= 0 ? '+' : ''}${daysDelta} day${Math.abs(daysDelta) === 1 ? '' : 's'})`
        : ''
    }.`,
  };
}
