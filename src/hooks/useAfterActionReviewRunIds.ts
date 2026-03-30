import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { ProjectRun } from '@/interfaces/ProjectRun';

/**
 * Project run ids that have at least one after_action_reviews row.
 * Refetches when `after-action-reviews-changed` is dispatched (e.g. after save in the AAR app).
 */
export function useAfterActionReviewRunIds(projectRuns: ProjectRun[] | undefined) {
  const { user } = useAuth();
  const [runIdsWithAar, setRunIdsWithAar] = useState<Set<string>>(() => new Set());
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    const onChanged = () => setRefreshNonce((n) => n + 1);
    window.addEventListener('after-action-reviews-changed', onChanged);
    return () => window.removeEventListener('after-action-reviews-changed', onChanged);
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setRunIdsWithAar(new Set());
      return;
    }
    const list = projectRuns ?? [];
    const activeIds = list.filter((r) => r.status !== 'cancelled').map((r) => r.id);
    if (activeIds.length === 0) {
      setRunIdsWithAar(new Set());
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from('after_action_reviews')
        .select('project_run_id')
        .in('project_run_id', activeIds);
      if (cancelled) return;
      if (error) {
        console.error('useAfterActionReviewRunIds:', error);
        return;
      }
      setRunIdsWithAar(new Set((data ?? []).map((row) => row.project_run_id)));
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, projectRuns, refreshNonce]);

  return runIdsWithAar;
}
