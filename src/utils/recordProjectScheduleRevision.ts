import { supabase } from '@/integrations/supabase/client';
import type { ProjectRun } from '@/interfaces/ProjectRun';
import { finishDateFromScheduleEventsBlob } from '@/utils/estimatedFinishDate';
import { appendSinglePlanningChangeEvent } from '@/utils/planningChangeTracking';

export type ScheduleRevisionSource = 'manual' | 'auto_regen' | 'slip';

export type RecordScheduleRevisionResult = {
  finishAt: Date | null;
  firstScheduleFinishAt: Date | null;
};

function isGuestProjectRunId(projectRunId: string): boolean {
  return projectRunId.startsWith('guest_');
}

function parseExistingFirst(
  current: Date | string | null | undefined,
): Date | null {
  if (!current) return null;
  const d = current instanceof Date ? current : new Date(current);
  return Number.isNaN(d.getTime()) ? null : d;
}

const REVISION_SOURCE_LABEL: Record<ScheduleRevisionSource, string> = {
  manual: 'manual save',
  auto_regen: 'auto-regeneration',
  slip: 'schedule slip',
};

/**
 * Append a schedule revision row and lock first_schedule_finish_at on first write.
 * Guest / local runs skip DB writes and only compute dates for in-memory state.
 */
export async function recordProjectScheduleRevision(params: {
  projectRunId: string;
  scheduleEvents: ProjectRun['schedule_events'] | Record<string, unknown> | null | undefined;
  source: ScheduleRevisionSource;
  currentFirstScheduleFinishAt?: Date | string | null;
  planningCompletedAt?: Date | string | null;
  userId?: string | null;
}): Promise<RecordScheduleRevisionResult> {
  const finishAt = finishDateFromScheduleEventsBlob(params.scheduleEvents);
  const existingFirst = parseExistingFirst(params.currentFirstScheduleFinishAt);
  const firstScheduleFinishAt = existingFirst ?? finishAt;

  if (!finishAt || !params.scheduleEvents) {
    return { finishAt: null, firstScheduleFinishAt: existingFirst };
  }

  if (isGuestProjectRunId(params.projectRunId)) {
    return { finishAt, firstScheduleFinishAt };
  }

  const { error: insertError } = await supabase
    .from('project_run_schedule_revisions')
    .insert({
      project_run_id: params.projectRunId,
      source: params.source,
      finish_at: finishAt.toISOString(),
      schedule_events: params.scheduleEvents as Record<string, unknown>,
    });

  if (insertError) {
    console.error('Error recording schedule revision:', insertError);
    return { finishAt, firstScheduleFinishAt: existingFirst ?? finishAt };
  }

  if (!existingFirst) {
    const { error: updateError } = await supabase
      .from('project_runs')
      .update({ first_schedule_finish_at: finishAt.toISOString() })
      .eq('id', params.projectRunId)
      .is('first_schedule_finish_at', null);

    if (updateError) {
      console.error('Error setting first_schedule_finish_at:', updateError);
    }
  }

  let userId = params.userId ?? null;
  if (!userId) {
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  }

  let planningCompletedAt = params.planningCompletedAt;
  if (planningCompletedAt === undefined) {
    const { data: runRow } = await supabase
      .from('project_runs')
      .select('planning_completed_at')
      .eq('id', params.projectRunId)
      .maybeSingle();
    planningCompletedAt = runRow?.planning_completed_at ?? null;
  }

  await appendSinglePlanningChangeEvent({
    projectRunId: params.projectRunId,
    userId,
    planningCompletedAt,
    event: {
      planning_tool: 'schedule',
      change_summary: `Schedule revision recorded (${REVISION_SOURCE_LABEL[params.source]}).`,
      change_detail: {
        kind: 'schedule_revision',
        revision_source: params.source,
        finish_at: finishAt.toISOString(),
      },
    },
  });

  return { finishAt, firstScheduleFinishAt };
}
