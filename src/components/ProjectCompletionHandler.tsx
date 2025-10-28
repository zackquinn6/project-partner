import { useEffect } from 'react';
import { useAchievements } from '@/hooks/useAchievements';
import { useAuth } from '@/contexts/AuthContext';

interface ProjectCompletionHandlerProps {
  projectRunId?: string;
  status?: string;
}

export function ProjectCompletionHandler({ projectRunId, status }: ProjectCompletionHandlerProps) {
  const { user } = useAuth();
  const { checkAndUnlockAchievements } = useAchievements(user?.id);

  useEffect(() => {
    if (status === 'completed' && projectRunId && user) {
      // Check achievements when project is completed
      checkAndUnlockAchievements({ projectRunId });
    }
  }, [status, projectRunId, user, checkAndUnlockAchievements]);

  return null;
}
