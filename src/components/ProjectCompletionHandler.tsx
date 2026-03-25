import { useEffect, useRef } from 'react';
import { useEnhancedAchievements } from '@/hooks/useEnhancedAchievements';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ProjectCompletionHandlerProps {
  projectRunId?: string;
  status?: string;
  currentPhaseId?: string;
  completedSteps?: Set<string>;
}

export function ProjectCompletionHandler({ 
  projectRunId, 
  status, 
  currentPhaseId,
  completedSteps 
}: ProjectCompletionHandlerProps) {
  const { user } = useAuth();
  const { checkAndUnlockAchievements, awardXP, calculateXPForProject } = useEnhancedAchievements(user?.id);
  const lastPhaseRef = useRef<string>('');
  const lastProjectStatusRef = useRef<string>('');

  // Award XP when phase is completed
  useEffect(() => {
    if (!user || !projectRunId || !currentPhaseId) return;

    const handlePhaseCompletion = async () => {
      if (lastPhaseRef.current !== currentPhaseId) {
        lastPhaseRef.current = currentPhaseId;

        // Fetch project data
        const { data: projectRun } = await supabase
          .from('project_runs')
          .select('*')
          .eq('id', projectRunId)
          .single();

        if (projectRun) {
          // Calculate XP based on completed steps in this phase
          const phaseSteps = completedSteps?.size || 0;
          const xpAmount = Math.floor(phaseSteps * 50 * 1.2); // Bonus for phase completion

          await awardXP(
            xpAmount,
            `Phase completed: ${currentPhaseId}`,
            projectRunId,
            currentPhaseId
          );
        }
      }
    };

    handlePhaseCompletion();
  }, [currentPhaseId, projectRunId, user, awardXP, completedSteps]);

  // Check achievements when project is completed
  useEffect(() => {
    if (!user || !projectRunId || !status) return;

    const handleProjectCompletion = async () => {
      if (status === 'complete' && lastProjectStatusRef.current !== 'complete') {
        lastProjectStatusRef.current = 'complete';

        // Fetch project data
        const { data: projectRun } = await supabase
          .from('project_runs')
          .select('*')
          .eq('id', projectRunId)
          .single();

        if (projectRun) {
          const { data: otherRuns } = await supabase
            .from('project_runs')
            .select('id, status, progress')
            .eq('user_id', user.id)
            .neq('id', projectRunId);

          const priorCompletedCount = (otherRuns ?? []).filter((p) => {
            const progress = p.progress ?? 0;
            return p.status === 'complete' || progress >= 100;
          }).length;

          const completionXP = calculateXPForProject(projectRun, priorCompletedCount);
          await awardXP(
            completionXP,
            `Project completed: ${projectRun.name}`,
            projectRunId
          );

          await checkAndUnlockAchievements(projectRun);
        }
      }
    };

    handleProjectCompletion();
  }, [status, projectRunId, user, checkAndUnlockAchievements, awardXP, calculateXPForProject]);

  return null;
}
