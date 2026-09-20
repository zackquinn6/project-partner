/**
 * Persist practiced time and completions onto user_skill_experience for skills
 * linked to a completed project run (template key skills + step skills used).
 */

import { supabase } from '@/integrations/supabase/client';

const PROFICIENCY_NUDGE_CAP = 5;
const PROFICIENCY_NUDGE_CEILING = 40;

export async function recordSkillExperienceForCompletedRun(params: {
  userId: string;
  projectRunId: string;
  templateProjectId: string;
}): Promise<void> {
  const { userId, projectRunId, templateProjectId } = params;

  const [{ data: keySkills, error: keyErr }, { data: runtimeRows, error: runtimeErr }] =
    await Promise.all([
      supabase
        .from('project_key_skills')
        .select('skill_id')
        .eq('project_id', templateProjectId),
      supabase
        .from('user_projects_runtime')
        .select('canonical_step_id, started_at, ended_at')
        .eq('project_run_id', projectRunId)
        .not('started_at', 'is', null)
        .not('ended_at', 'is', null),
    ]);

  if (keyErr) {
    throw new Error(`Skill experience: failed loading project_key_skills: ${keyErr.message}`);
  }
  if (runtimeErr) {
    throw new Error(`Skill experience: failed loading runtime: ${runtimeErr.message}`);
  }

  const skillIds = new Set<string>((keySkills ?? []).map((row) => row.skill_id));

  const stepIds = Array.from(
    new Set((runtimeRows ?? []).map((row) => row.canonical_step_id).filter(Boolean))
  );

  if (stepIds.length > 0) {
    const { data: stepSkills, error: stepSkillErr } = await supabase
      .from('operation_step_skills')
      .select('skill_id')
      .in('operation_step_id', stepIds);
    if (stepSkillErr) {
      throw new Error(`Skill experience: failed loading operation_step_skills: ${stepSkillErr.message}`);
    }
    for (const row of stepSkills ?? []) {
      skillIds.add(row.skill_id);
    }
  }

  if (skillIds.size === 0) return;

  let practicedSeconds = 0;
  for (const row of runtimeRows ?? []) {
    const started = row.started_at ? Date.parse(row.started_at) : NaN;
    const ended = row.ended_at ? Date.parse(row.ended_at) : NaN;
    if (!Number.isFinite(started) || !Number.isFinite(ended) || ended <= started) continue;
    practicedSeconds += Math.round((ended - started) / 1000);
  }

  const secondsPerSkill = Math.max(0, Math.floor(practicedSeconds / skillIds.size));
  const now = new Date().toISOString();

  for (const skillId of skillIds) {
    const { data: existing, error: readErr } = await supabase
      .from('user_skill_experience')
      .select('id, experience_seconds, completion_count')
      .eq('user_id', userId)
      .eq('skill_id', skillId)
      .maybeSingle();
    if (readErr) {
      throw new Error(`Skill experience: read failed: ${readErr.message}`);
    }

    if (existing) {
      const { error: updateErr } = await supabase
        .from('user_skill_experience')
        .update({
          experience_seconds: existing.experience_seconds + secondsPerSkill,
          completion_count: existing.completion_count + 1,
          last_practiced_at: now,
          updated_at: now,
        })
        .eq('id', existing.id);
      if (updateErr) {
        throw new Error(`Skill experience: update failed: ${updateErr.message}`);
      }
    } else {
      const { error: insertErr } = await supabase.from('user_skill_experience').insert({
        user_id: userId,
        skill_id: skillId,
        experience_seconds: secondsPerSkill,
        completion_count: 1,
        last_practiced_at: now,
        updated_at: now,
      });
      if (insertErr) {
        throw new Error(`Skill experience: insert failed: ${insertErr.message}`);
      }
    }

    // Modest proficiency nudge only when still in the beginner band and experience exists.
    const { data: rating } = await supabase
      .from('user_skill_ratings')
      .select('id, proficiency, source')
      .eq('user_id', userId)
      .eq('skill_id', skillId)
      .maybeSingle();

    if (rating && rating.source === 'assessment') {
      continue;
    }

    const current = rating?.proficiency ?? 0;
    if (current >= PROFICIENCY_NUDGE_CEILING) continue;

    const nudged = Math.min(PROFICIENCY_NUDGE_CEILING, current + PROFICIENCY_NUDGE_CAP);
    if (rating) {
      await supabase
        .from('user_skill_ratings')
        .update({
          proficiency: nudged,
          source: 'achievement',
          assumed_low: false,
          updated_at: now,
        })
        .eq('id', rating.id);
    } else {
      await supabase.from('user_skill_ratings').insert({
        user_id: userId,
        skill_id: skillId,
        proficiency: nudged,
        source: 'achievement',
        assumed_low: false,
        updated_at: now,
      });
    }
  }
}
