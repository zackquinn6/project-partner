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
  base_xp: number;
  scales_with_project_size: boolean;
  criteria: any;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  xp_earned: number;
  notification_sent: boolean;
  achievement?: Achievement;
}

export interface XPHistory {
  id: string;
  xp_amount: number;
  reason: string;
  phase_name?: string;
  created_at: string;
}

export function useEnhancedAchievements(userId?: string) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
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
    // Level formula: level = floor(sqrt(xp / 100)) + 1
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  };

  const xpForNextLevel = (currentLevel: number) => {
    // XP needed for next level
    return Math.pow(currentLevel, 2) * 100;
  };

  const fetchAchievementsData = async () => {
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

      // Fetch XP history (type='xp' rows in user_achievements)
      const { data: history, error: historyError } = await supabase
        .from('user_achievements')
        .select('id, xp_amount, reason, phase_name, created_at')
        .eq('user_id', userId)
        .eq('type', 'xp')
        .order('created_at', { ascending: false })
        .limit(50);

      if (historyError) throw historyError;

      setAchievements(allAchievements || []);
      setUserAchievements(unlocked || []);
      setXpHistory((history || []).map((r: { id: string; xp_amount: number; reason: string; phase_name?: string; created_at: string }) => ({
        id: r.id,
        xp_amount: r.xp_amount,
        reason: r.reason,
        phase_name: r.phase_name,
        created_at: r.created_at
      })));

      // Calculate total XP from unlock rows (xp_amount on user_achievements)
      const xp = (unlocked || []).reduce((sum, ua) => sum + (Number((ua as any).xp_amount) || 0), 0);
      setTotalXP(xp);
      setLevel(calculateLevel(xp));

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

  const calculateXPForProject = (projectData: any) => {
    let baseXP = 50; // Base XP per step
    
    // Count completed steps
    const completedSteps = projectData.completedSteps?.length || 0;
    let xp = baseXP * completedSteps;

    // Scale by project size if available
    if (projectData.customization_decisions?.standardDecisions?.projectSize) {
      const size = parseFloat(projectData.customization_decisions.standardDecisions.projectSize);
      if (!isNaN(size) && size > 0) {
        // Scale XP by project size (e.g., 1000 sq ft = 2x multiplier)
        const sizeMultiplier = 1 + (size / 1000);
        xp = Math.floor(xp * sizeMultiplier);
      }
    }

    // Difficulty multiplier
    const difficultyMultipliers: Record<string, number> = {
      'Beginner': 1,
      'Intermediate': 1.5,
      'Advanced': 2
    };
    xp = Math.floor(xp * (difficultyMultipliers[projectData.difficulty] || 1));

    return xp;
  };

  const awardXP = async (xpAmount: number, reason: string, projectRunId?: string, phaseName?: string) => {
    if (!userId) return;

    try {
      const now = new Date().toISOString();
      const { error: xpError } = await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          type: 'xp',
          project_run_id: projectRunId ?? null,
          phase_name: phaseName ?? null,
          xp_amount: xpAmount,
          reason,
          earned_at: now
        });

      if (xpError) throw xpError;

      // Refresh data
      await fetchAchievementsData();

      // Show toast notification
      toast.success(`🎉 +${xpAmount} XP earned!`, {
        description: reason
      });
    } catch (error) {
      console.error('Error awarding XP:', error);
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
        let earnedXP = achievement.base_xp;

        // Check criteria (same logic as before)
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

        // Scale XP if achievement scales with project size
        if (shouldUnlock && achievement.scales_with_project_size && projectData) {
          earnedXP = calculateXPForProject(projectData);
        }

        // Unlock if criteria met (one row in user_achievements with type='unlock', is_read=false for notification)
        if (shouldUnlock) {
          const now = new Date().toISOString();
          const { error: insertError } = await supabase
            .from('user_achievements')
            .insert({
              user_id: userId,
              achievement_id: achievement.id,
              type: 'unlock',
              xp_amount: earnedXP,
              project_run_id: projectData?.id ?? null,
              is_read: false,
              earned_at: now
            });

          if (!insertError) {
            newlyUnlocked.push(achievement);

            // Award XP
            await awardXP(
              earnedXP,
              `Achievement unlocked: ${achievement.name}`,
              projectData?.id
            );
          }
        }
      }

      // Show toast for newly unlocked achievements
      if (newlyUnlocked.length > 0) {
        newlyUnlocked.forEach((achievement) => {
          toast.success(`🏆 Achievement Unlocked: ${achievement.name}!`, {
            description: achievement.description,
            duration: 5000
          });
        });

        // Refresh achievements
        await fetchAchievementsData();
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
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
    refreshAchievements: fetchAchievementsData,
  };
}
