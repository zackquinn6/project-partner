import { useCallback, useEffect, useState } from 'react';
import {
  fetchActionPriorityTable,
  type ActionPriorityTable,
} from '@/utils/actionPriorityTable';
import { useAuth } from '@/contexts/AuthContext';
import { reportUserFacingError } from '@/utils/errorReporting';

interface UseActionPriorityTableResult {
  table: ActionPriorityTable | null;
  loading: boolean;
  /**
   * Plain-language sentence with a support code, set when the table could not be loaded.
   * Callers must show this rather than scoring without it: a priority produced without the
   * table would be a guess.
   */
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Loads pfmea_action_priority_rules and risk_action_priority_labels once per mount.
 * Small, seeded, and rarely edited, so there is no pagination or invalidation here.
 */
export function useActionPriorityTable(): UseActionPriorityTableResult {
  const { user } = useAuth();
  const [table, setTable] = useState<ActionPriorityTable | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTable(await fetchActionPriorityTable());
    } catch (err) {
      setTable(null);
      const supportCode = await reportUserFacingError({
        source: 'risk_radar',
        operation: 'load_action_priority_table',
        userId: user?.id,
        error: err,
        userMessage: 'Action priority guidance is unavailable right now.',
        notificationTitle: 'Action priority guidance did not load',
        toastPresenter: 'none',
      });
      setError(`Action priority guidance is unavailable right now. Error code: ${supportCode}`);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  return { table, loading, error, reload: load };
}
