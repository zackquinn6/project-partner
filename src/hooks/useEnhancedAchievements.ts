import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  achievementCriteriaMet,
  achievementDefinitionById,
  achievementDefinitionsSorted,
  runHasBeforeAndAfter,
  runHasDocumentation,
  type AchievementDefinition,
  type UserAchievementStats,
} from '@/constants/achievementDefinitions';

/** `project_runs` columns for achievement passes (must match live PostgREST schema). */
const PROJECT_RUNS_ACHIEVEMENT_SELECT =
  'id, progress, status, budget_data, category, actual_end_date, end_date, effort_level, skill_level, instruction_level_preference, customization_decisions, completed_steps, project_photos';

function isCompletedRun(p: { progress?: number | null; status?: string | null }): boolean {
  const progress = p.progress ?? 0;
  return p.status === 'complete' || progress >= 100;
}

async function enrichCompletedProjects(
  userId: string,
  projects: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  if (projects.length === 0) return projects;

  const { data: photos, error } = await supabase
    .from('project_run_photos')
    .select('project_run_id')
    .eq('user_id', userId);
  if (error) throw error;

  const photoCountByRun = new Map<string, number>();
  for (const row of photos ?? []) {
    const runId = row.project_run_id;
    if (!runId) continue;
    photoCountByRun.set(runId, (photoCountByRun.get(runId) ?? 0) + 1);
  }

  return projects.map((p) => ({
    ...p,
    _photo_count: photoCountByRun.get(String(p.id)) ?? 0,
  }));
}

/** Loads counts used for evidence / stewardship milestones. */
export async function fetchUserAchievementStats(userId: string): Promise<UserAchievementStats> {
  const [tasksClosedRes, maintRes, runsRes, photosRes] = await Promise.all([
    supabase.from('home_tasks').select('id', { count: 'exact' }).eq('user_id', userId).eq('status', 'closed'),
    supabase
      .from('user_maintenance_tasks')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .not('last_completed', 'is', null),
    supabase
      .from('project_runs')
      .select('id, progress, status, project_photos')
      .eq('user_id', userId),
    supabase.from('project_run_photos').select('project_run_id').eq('user_id', userId),
  ]);

  if (tasksClosedRes.error) throw tasksClosedRes.error;
  if (maintRes.error) throw maintRes.error;
  if (runsRes.error) throw runsRes.error;
  if (photosRes.error) throw photosRes.error;

  if (tasksClosedRes.count === null) throw new Error(`Missing closed task count for user ${userId}`);
  if (maintRes.count === null) throw new Error(`Missing maintenance count for user ${userId}`);

  const photoCountByRun = new Map<string, number>();
  for (const row of photosRes.data ?? []) {
    const runId = row.project_run_id;
    if (!runId) continue;
    photoCountByRun.set(runId, (photoCountByRun.get(runId) ?? 0) + 1);
  }

  const completed = (runsRes.data ?? []).filter(isCompletedRun);
  let documentedFinishes = 0;
  let beforeAfterFinishes = 0;

  for (const run of completed) {
    const enriched: Record<string, unknown> = {
      ...run,
      _photo_count: photoCountByRun.get(run.id) ?? 0,
    };
    if (runHasDocumentation(enriched)) documentedFinishes += 1;
    if (runHasBeforeAndAfter(enriched)) beforeAfterFinishes += 1;
  }

  return {
    documentedFinishes,
    beforeAfterFinishes,
    tasksClosed: tasksClosedRes.count,
    maintenanceCompletions: maintRes.count,
  };
}

export type Achievement = AchievementDefinition;

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  xp_earned: number;
  notification_sent: boolean;
  achievement?: Achievement | null;
  type?: string;
}

export interface XPHistory {
  id: string;
  xp_amount: number;
  reason: string;
  phase_name?: string;
  created_at: string;
}

export function useEnhancedAchievements(userId?: string) {
  const [achievements] = useState<Achievement[]>(() => achievementDefinitionsSorted());
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [xpHistory, setXpHistory] = useState<XPHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalXP, setTotalXP] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [progressStats, setProgressStats] = useState<UserAchievementStats | null>(null);
  const [completedProjects, setCompletedProjects] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchAchievementsData();
  }, [userId]);

  const calculateLevel = (xp: number) => {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  };

  const xpForNextLevel = (currentLevel: number) => {
    return Math.pow(currentLevel, 2) * 100;
  };

  const fetchProgressContext = async () => {
    if (!userId) return;
    try {
      const [stats, projectsRes] = await Promise.all([
        fetchUserAchievementStats(userId),
        supabase.from('project_runs').select(PROJECT_RUNS_ACHIEVEMENT_SELECT).eq('user_id', userId),
      ]);
      if (projectsRes.error) throw projectsRes.error;
      const completed = await enrichCompletedProjects(
        userId,
        (projectsRes.data || []).filter(isCompletedRun) as Record<string, unknown>[]
      );
      setProgressStats(stats);
      setCompletedProjects(completed);
    } catch (error) {
      console.error('Error fetching achievement progress context:', error);
    }
  };

  const fetchAchievementsData = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      const { data: rows, error: rowsError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId);

      if (rowsError) throw rowsError;

      const allRows = rows || [];
      const unlockRows = allRows.filter((r: { type?: string }) => (r.type ?? 'unlock') !== 'xp');
      const xpRows = allRows.filter((r: { type?: string }) => r.type === 'xp');

      const unlocked: UserAchievement[] = unlockRows
        .filter((r: { achievement_id?: string | null }) => r.achievement_id)
        .map((ua: Record<string, unknown>) => {
          const aid = ua.achievement_id as string;
          const earnedAt = (ua.earned_at as string) ?? (ua.created_at as string);
          return {
            id: ua.id as string,
            user_id: ua.user_id as string,
            achievement_id: aid,
            unlocked_at: earnedAt,
            xp_earned: Number(ua.xp_amount) || 0,
            notification_sent: Boolean(ua.notification_sent),
            type: ua.type as string | undefined,
            achievement: achievementDefinitionById(aid) ?? null,
          };
        });

      setXpHistory(
        xpRows.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          xp_amount: Number(r.xp_amount) || 0,
          reason: (r.reason as string) ?? '',
          phase_name: r.phase_name as string | undefined,
          created_at: (r.created_at as string) ?? (r.earned_at as string),
        }))
      );

      setUserAchievements(unlocked);

      const xpFromLog = xpRows.reduce((sum, r: { xp_amount?: number | null }) => {
        return sum + (Number(r.xp_amount) || 0);
      }, 0);
      setTotalXP(xpFromLog);
      setLevel(calculateLevel(xpFromLog));

      const points = unlocked.reduce((sum, ua) => {
        return sum + (ua.achievement?.points ?? 0);
      }, 0);
      setTotalPoints(points);

      await fetchProgressContext();
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * XP for completing a project run (always granted on completion, even when no new badge unlocks).
   * priorCompletedCount: number of other completed runs the user already had (excludes this run).
   */
  const calculateXPForProject = (
    projectData: Record<string, unknown>,
    priorCompletedCount = 0
  ) => {
    let baseXP = 50;

    const completedStepsRaw =
      projectData.completed_steps ?? projectData.completedSteps;
    const completedSteps = Array.isArray(completedStepsRaw)
      ? completedStepsRaw.length
      : typeof completedStepsRaw === 'object' && completedStepsRaw !== null
        ? Object.keys(completedStepsRaw as object).length
        : 0;
    let xp = baseXP * Math.max(completedSteps, 1);

    const customization = projectData.customization_decisions as
      | { standardDecisions?: { projectSize?: string } }
      | undefined;
    if (customization?.standardDecisions?.projectSize) {
      const size = parseFloat(String(customization.standardDecisions.projectSize));
      if (!Number.isNaN(size) && size > 0) {
        const sizeMultiplier = 1 + size / 1000;
        xp = Math.floor(xp * sizeMultiplier);
      }
    }

    const difficultyMultipliers: Record<string, number> = {
      Beginner: 1,
      Intermediate: 1.5,
      Advanced: 2,
      Professional: 2.25,
    };
    const skillLevel =
      (typeof projectData.skill_level === 'string' && projectData.skill_level) ||
      (typeof projectData.instruction_level_preference === 'string' &&
        projectData.instruction_level_preference.charAt(0).toUpperCase() +
          projectData.instruction_level_preference.slice(1)) ||
      undefined;
    const difficulty =
      (typeof projectData.difficulty === 'string' && projectData.difficulty) || skillLevel;
    xp = Math.floor(xp * (difficulty ? difficultyMultipliers[difficulty] ?? 1 : 1));

    const effortMultipliers: Record<string, number> = {
      Low: 1,
      Medium: 1.15,
      High: 1.35,
    };
    const effort =
      typeof projectData.effort_level === 'string' ? projectData.effort_level : undefined;
    if (effort) {
      xp = Math.floor(xp * (effortMultipliers[effort] ?? 1));
    }

    const repeatBonus = Math.min(280, Math.floor(Math.max(0, priorCompletedCount) * 14));
    xp += repeatBonus;

    return xp;
  };

  const awardXP = async (
    xpAmount: number,
    reason: string,
    projectRunId?: string,
    phaseName?: string,
    options?: { skipRefetch?: boolean; skipToast?: boolean }
  ) => {
    if (!userId) return;

    try {
      const now = new Date().toISOString();
      const { error: xpError } = await supabase.from('user_achievements').insert({
        user_id: userId,
        type: 'xp',
        achievement_id: null,
        project_run_id: projectRunId ?? null,
        phase_name: phaseName ?? null,
        xp_amount: xpAmount,
        reason,
        earned_at: now,
        is_read: false,
        notification_sent: false,
      });

      if (xpError) throw xpError;

      if (!options?.skipRefetch) {
        await fetchAchievementsData();
      }

      if (!options?.skipToast) {
        toast.success(`+${xpAmount} XP`, { description: reason });
      }
    } catch (error) {
      console.error('Error awarding XP:', error);
    }
  };

  const performAchievementUnlockPass = async (
    projectData: Record<string, unknown> | null,
    completedProjects: Record<string, unknown>[],
    stats: UserAchievementStats
  ) => {
    if (!userId) return;

    const { data: uaExisting } = await supabase
      .from('user_achievements')
      .select('achievement_id, type')
      .eq('user_id', userId);

    const unlockedIds = new Set(
      (uaExisting || [])
        .filter((r: { type?: string | null; achievement_id?: string | null }) => {
          const t = r.type ?? 'unlock';
          return t !== 'xp' && Boolean(r.achievement_id);
        })
        .map((r: { achievement_id: string }) => r.achievement_id)
    );

    const newlyUnlocked: Achievement[] = [];
    const catalog = achievementDefinitionsSorted();
    const runId = (projectData?.id as string | undefined) ?? null;

    for (const achievement of catalog) {
      if (unlockedIds.has(achievement.id)) continue;

      const shouldUnlock = achievementCriteriaMet(achievement.criteria, completedProjects, stats);

      let earnedXP = achievement.base_xp;
      if (shouldUnlock && achievement.scales_with_project_size && projectData) {
        earnedXP = calculateXPForProject(projectData, 0);
      }

      if (shouldUnlock) {
        const now = new Date().toISOString();
        const { error: insertError } = await supabase.from('user_achievements').insert({
          user_id: userId,
          achievement_id: achievement.id,
          type: 'unlock',
          xp_amount: null,
          project_run_id: runId,
          is_read: false,
          notification_sent: false,
          earned_at: now,
        });

        if (insertError) {
          console.error('user_achievements unlock insert failed:', insertError.message, insertError);
        }

        if (!insertError) {
          unlockedIds.add(achievement.id);
          newlyUnlocked.push(achievement);

          await awardXP(
            earnedXP,
            `Achievement unlocked: ${achievement.name}`,
            runId ?? undefined,
            undefined,
            { skipRefetch: true, skipToast: true }
          );
        }
      }
    }

    if (newlyUnlocked.length > 0) {
      newlyUnlocked.forEach((achievement) => {
        toast.success(`You earned ${achievement.name}`, {
          description: achievement.description,
        });
      });

      await fetchAchievementsData();
    }
  };

  const checkAndUnlockAchievements = async (projectData: Record<string, unknown>) => {
    if (!userId) return;

    try {
      const [stats, projectsRes] = await Promise.all([
        fetchUserAchievementStats(userId),
        supabase.from('project_runs').select(PROJECT_RUNS_ACHIEVEMENT_SELECT).eq('user_id', userId),
      ]);

      const { data: projects, error } = projectsRes;

      if (error) throw error;

      const completed = await enrichCompletedProjects(
        userId,
        (projects || []).filter(isCompletedRun) as Record<string, unknown>[]
      );

      await performAchievementUnlockPass(projectData, completed, stats);
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  };

  /** Re-evaluate milestones that depend on photos, tasks, maintenance, etc. */
  const checkMilestoneUnlocks = async () => {
    if (!userId) return;

    try {
      const [stats, projectsRes] = await Promise.all([
        fetchUserAchievementStats(userId),
        supabase.from('project_runs').select(PROJECT_RUNS_ACHIEVEMENT_SELECT).eq('user_id', userId),
      ]);
      const { data: projects, error } = projectsRes;
      if (error) throw error;
      const completed = await enrichCompletedProjects(
        userId,
        (projects || []).filter(isCompletedRun) as Record<string, unknown>[]
      );
      await performAchievementUnlockPass(null, completed, stats);
    } catch (error) {
      console.error('Error checking milestone achievements:', error);
    }
  };

  return {
    achievements,
    userAchievements,
    xpHistory,
    loading,
    totalXP,
    totalPoints,
    level,
    xpForNextLevel: xpForNextLevel(level),
    progressStats,
    completedProjects,
    calculateXPForProject,
    awardXP,
    checkAndUnlockAchievements,
    checkMilestoneUnlocks,
    refreshAchievements: fetchAchievementsData,
  };
}
