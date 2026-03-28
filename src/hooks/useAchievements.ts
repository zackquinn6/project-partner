import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  achievementCriteriaMet,
  achievementDefinitionById,
  achievementDefinitionsSorted,
  type AchievementDefinition,
} from '@/constants/achievementDefinitions';
import { fetchUserAchievementStats } from '@/hooks/useEnhancedAchievements';

export type Achievement = AchievementDefinition & { created_at?: string; updated_at?: string };

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: Achievement | null;
}

/** @deprecated Prefer useEnhancedAchievements for XP and full history. */
export function useAchievements(userId?: string) {
  const [achievements] = useState<Achievement[]>(() => achievementDefinitionsSorted() as Achievement[]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchAchievements();
  }, [userId]);

  const fetchAchievements = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      const { data: rows, error: unlockedError } = await supabase
        .from('user_achievements')
        .select('id, user_id, achievement_id, earned_at, created_at, type')
        .eq('user_id', userId);

      if (unlockedError) throw unlockedError;

      const unlockRows = (rows || []).filter(
        (r: { type?: string | null; achievement_id?: string | null }) =>
          (r.type ?? 'unlock') !== 'xp' && Boolean(r.achievement_id)
      );

      const unlocked: UserAchievement[] = unlockRows.map((ua: Record<string, unknown>) => {
        const aid = ua.achievement_id as string;
        const earnedAt = (ua.earned_at as string) ?? (ua.created_at as string);
        return {
          id: ua.id as string,
          user_id: ua.user_id as string,
          achievement_id: aid,
          unlocked_at: earnedAt,
          achievement: achievementDefinitionById(aid) ?? null,
        };
      });

      setUserAchievements(unlocked);

      const points = unlocked.reduce((sum, ua) => sum + (ua.achievement?.points ?? 0), 0);
      setTotalPoints(points);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAndUnlockAchievements = async (projectData: Record<string, unknown>) => {
    if (!userId) return;

    try {
      const [uaRes, projectsRes, stats] = await Promise.all([
        supabase.from('user_achievements').select('achievement_id, type').eq('user_id', userId),
        supabase
          .from('project_runs')
          .select(
            'id, progress, status, budget_data, category, actual_end_date, end_date, instruction_level_preference, customization_decisions, completed_steps'
          )
          .eq('user_id', userId),
        fetchUserAchievementStats(userId),
      ]);

      const uaExisting = uaRes.data;
      const { data: projects, error } = projectsRes;

      if (error) throw error;

      const unlockedIds = new Set(
        (uaExisting || [])
          .filter((r: { type?: string | null; achievement_id?: string | null }) => {
            const t = r.type ?? 'unlock';
            return t !== 'xp' && Boolean(r.achievement_id);
          })
          .map((r: { achievement_id: string }) => r.achievement_id)
      );

      const completedProjects = (projects || []).filter((p) => {
        const progress = p.progress ?? 0;
        return p.status === 'complete' || progress >= 100;
      });

      const newlyUnlocked: AchievementDefinition[] = [];
      const catalog = achievementDefinitionsSorted();

      for (const achievement of catalog) {
        if (unlockedIds.has(achievement.id)) continue;

        const shouldUnlock = achievementCriteriaMet(
          achievement.criteria,
          completedProjects as Record<string, unknown>[],
          stats
        );

        if (shouldUnlock) {
          const now = new Date().toISOString();
          const { error: insertError } = await supabase.from('user_achievements').insert({
            user_id: userId,
            achievement_id: achievement.id,
            type: 'unlock',
            xp_amount: null,
            project_run_id: (projectData?.id as string | undefined) ?? null,
            is_read: false,
            notification_sent: false,
            earned_at: now,
          });

          if (!insertError) {
            unlockedIds.add(achievement.id);
            newlyUnlocked.push(achievement);
          }
        }
      }

      if (newlyUnlocked.length > 0) {
        newlyUnlocked.forEach((achievement) => {
          toast.success(`🏆 Achievement Unlocked: ${achievement.name}!`, {
            description: achievement.description,
          });
        });

        await fetchAchievements();
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  };

  return {
    achievements,
    userAchievements,
    loading,
    totalPoints,
    checkAndUnlockAchievements,
    refreshAchievements: fetchAchievements,
  };
}
