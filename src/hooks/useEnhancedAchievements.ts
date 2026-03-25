import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  achievementCriteriaMet,
  achievementDefinitionById,
  achievementDefinitionsSorted,
  type AchievementDefinition,
  type UserAchievementStats,
} from '@/constants/achievementDefinitions';

/** Loads counts used for photo / task / tool / risk milestones. */
export async function fetchUserAchievementStats(userId: string): Promise<UserAchievementStats> {
  const [
    photosRes,
    profileRes,
    tasksClosedRes,
    homesRes,
    linkedTasksRes,
    maintRes,
    runsRes,
  ] = await Promise.all([
    supabase.from('project_run_photos').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('user_profiles').select('owned_tools').eq('user_id', userId).maybeSingle(),
    supabase.from('home_tasks').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'closed'),
    supabase.from('homes').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase
      .from('home_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('project_run_id', 'is', null),
    supabase
      .from('user_maintenance_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('last_completed', 'is', null),
    supabase.from('project_runs').select('id').eq('user_id', userId),
  ]);

  const owned = profileRes.data?.owned_tools;
  const toolsInLibrary = Array.isArray(owned) ? owned.length : 0;

  const runIds = (runsRes.data ?? []).map((r) => r.id);
  let risksLogged = 0;
  if (runIds.length > 0) {
    const { count } = await supabase
      .from('project_run_risks')
      .select('*', { count: 'exact', head: true })
      .in('project_run_id', runIds);
    risksLogged = count ?? 0;
  }

  return {
    photoCount: photosRes.count ?? 0,
    toolsInLibrary,
    tasksClosed: tasksClosedRes.count ?? 0,
    homesCount: homesRes.count ?? 0,
    risksLogged,
    linkedTasksCount: linkedTasksRes.count ?? 0,
    maintenanceCompletions: maintRes.count ?? 0,
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
      (typeof projectData.difficulty_level === 'string' && projectData.difficulty_level) ||
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
        toast.success(`🎉 +${xpAmount} XP earned!`, {
          description: reason,
        });
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
        toast.success(`🏆 Achievement Unlocked: ${achievement.name}!`, {
          description: achievement.description,
          duration: 5000,
        });
      });

      await fetchAchievementsData();
    }
  };

  const checkAndUnlockAchievements = async (projectData: Record<string, unknown>) => {
    if (!userId) return;

    try {
      const stats = await fetchUserAchievementStats(userId);

      const { data: projects, error } = await supabase.from('project_runs').select('*').eq('user_id', userId);

      if (error) throw error;

      const completedProjects = (projects || []).filter((p) => {
        const progress = p.progress ?? 0;
        return p.status === 'complete' || progress >= 100;
      });

      await performAchievementUnlockPass(projectData, completedProjects as Record<string, unknown>[], stats);
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  };

  /** Re-evaluate milestones that depend on photos, tasks, tools, etc. (no project completion required). */
  const checkMilestoneUnlocks = async () => {
    if (!userId) return;

    try {
      const stats = await fetchUserAchievementStats(userId);
      const { data: projects, error } = await supabase.from('project_runs').select('*').eq('user_id', userId);
      if (error) throw error;
      const completedProjects = (projects || []).filter((p) => {
        const progress = p.progress ?? 0;
        return p.status === 'complete' || progress >= 100;
      });
      await performAchievementUnlockPass(null, completedProjects as Record<string, unknown>[], stats);
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
    calculateXPForProject,
    awardXP,
    checkAndUnlockAchievements,
    checkMilestoneUnlocks,
    refreshAchievements: fetchAchievementsData,
  };
}
