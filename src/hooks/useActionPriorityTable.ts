import { useCallback, useEffect, useState } from 'react';
import {
  fetchActionPriorityTable,
  type ActionPriorityTable,
} from '@/utils/actionPriorityTable';

interface UseActionPriorityTableResult {
  table: ActionPriorityTable | null;
  loading: boolean;
  /**
   * Set when the table could not be loaded. Callers must show this rather than scoring
   * without it: a priority produced without the table would be a guess.
   */
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Loads pfmea_action_priority_rules and risk_action_priority_labels once per mount.
 * Small, seeded, and rarely edited, so there is no pagination or invalidation here.
 */
export function useActionPriorityTable(): UseActionPriorityTableResult {
  const [table, setTable] = useState<ActionPriorityTable | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTable(await fetchActionPriorityTable());
    } catch (err) {
      console.error('Action priority table load failed:', err);
      setTable(null);
      setError(err instanceof Error ? err.message : 'Failed to load the action priority table');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { table, loading, error, reload: load };
}
