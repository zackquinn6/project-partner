import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  points: number;
  criteria: any;
  created_at: string;
  updated_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  progress: any;
  achievement?: Achievement;
}

export function useAchievements(userId?: string) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
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
    try {
      setLoading(true);

      // Fetch all achievements
      const { data: allAchievements, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .order('category', { ascending: true });

      if (achievementsError) throw achievementsError;

      // Fetch user's unlocked achievements
      const { data: unlocked, error: unlockedError } = await supabase
        .from('user_achievements')
        .select('*, achievement:achievements(*)')
        .eq('user_id', userId);

      if (unlockedError) throw unlockedError;

      setAchievements(allAchievements || []);
      setUserAchievements(unlocked || []);

      // Calculate total points
      const points = (unlocked || []).reduce(
        (sum, ua) => sum + ((ua.achievement as any)?.points || 0),
        0
      );
      setTotalPoints(points);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAndUnlockAchievements = async (projectData: any) => {
    if (!userId) return;

    try {
      // Fetch user's project history
      const { data: projects, error } = await supabase
        .from('project_runs')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'completed');

      if (error) throw error;

      const completedProjects = projects || [];
      const newlyUnlocked: Achievement[] = [];

      // Check each achievement
      for (const achievement of achievements) {
        // Skip if already unlocked
        const alreadyUnlocked = userAchievements.some(
          (ua) => ua.achievement_id === achievement.id
        );
        if (alreadyUnlocked) continue;

        let shouldUnlock = false;

        // Check criteria
        const criteria = achievement.criteria;

        if (criteria.project_count !== undefined) {
          shouldUnlock = completedProjects.length >= criteria.project_count;
        }

        if (criteria.category && criteria.project_count !== undefined) {
          const categoryProjects = completedProjects.filter(
            (p) => p.category === criteria.category
          );
          shouldUnlock = categoryProjects.length >= criteria.project_count;
        }

        if (criteria.difficulty) {
          const difficultyProjects = completedProjects.filter(
            (p) => p.difficulty === criteria.difficulty
          );
          shouldUnlock = difficultyProjects.length >= 1;
        }

        if (criteria.projects_in_month !== undefined) {
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          const recentProjects = completedProjects.filter(
            (p) => new Date(p.end_date) >= oneMonthAgo
          );
          shouldUnlock = recentProjects.length >= criteria.projects_in_month;
        }

        if (criteria.projects_in_year !== undefined) {
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          const yearProjects = completedProjects.filter(
            (p) => new Date(p.end_date) >= oneYearAgo
          );
          shouldUnlock = yearProjects.length >= criteria.projects_in_year;
        }

        if (criteria.category_repeat !== undefined) {
          const categoryCounts = completedProjects.reduce((acc: any, p) => {
            acc[p.category] = (acc[p.category] || 0) + 1;
            return acc;
          }, {});
          shouldUnlock = Object.values(categoryCounts).some(
            (count: any) => count >= criteria.category_repeat
          );
        }

        if (criteria.category_depth !== undefined) {
          const categoryCounts = completedProjects.reduce((acc: any, p) => {
            acc[p.category] = (acc[p.category] || 0) + 1;
            return acc;
          }, {});
          shouldUnlock = Object.values(categoryCounts).some(
            (count: any) => count >= criteria.category_depth
          );
        }

        if (criteria.category_breadth !== undefined) {
          const uniqueCategories = new Set(completedProjects.map((p) => p.category));
          shouldUnlock = uniqueCategories.size >= criteria.category_breadth;
        }

        // Unlock if criteria met
        if (shouldUnlock) {
          const { error: insertError } = await supabase
            .from('user_achievements')
            .insert({
              user_id: userId,
              achievement_id: achievement.id,
              progress: {},
            });

          if (!insertError) {
            newlyUnlocked.push(achievement);
          }
        }
      }

      // Show toast for newly unlocked achievements
      if (newlyUnlocked.length > 0) {
        newlyUnlocked.forEach((achievement) => {
          toast.success(`🏆 Achievement Unlocked: ${achievement.name}!`, {
            description: achievement.description,
          });
        });

        // Refresh achievements
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
