import { useCallback, useEffect, useState } from 'react';
import {
  fetchOccurrenceDriverTable,
  type OccurrenceDriverTable,
} from '@/utils/keyCharacteristics';
import { useAuth } from '@/contexts/AuthContext';
import { reportUserFacingError } from '@/utils/errorReporting';

interface UseOccurrenceDriversResult {
  table: OccurrenceDriverTable | null;
  loading: boolean;
  /**
   * Plain-language sentence with a support code, set when the vocabulary could not be loaded.
   * Callers must show this rather than offering an empty driver list, since an unclassified
   * cause keeps items off the KC register.
   */
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Loads risk_occurrence_drivers once per mount, alongside useActionPriorityTable. Both are
 * small seeded lookups that the Key Characteristic test reads together.
 */
export function useOccurrenceDrivers(): UseOccurrenceDriversResult {
  const { user } = useAuth();
  const [table, setTable] = useState<OccurrenceDriverTable | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTable(await fetchOccurrenceDriverTable());
    } catch (err) {
      setTable(null);
      const supportCode = await reportUserFacingError({
        source: 'risk_radar',
        operation: 'load_occurrence_drivers',
        userId: user?.id,
        error: err,
        userMessage: 'Occurrence driver guidance is unavailable right now.',
        notificationTitle: 'Occurrence driver guidance did not load',
        toastPresenter: 'none',
      });
      setError(`Occurrence driver guidance is unavailable right now. Error code: ${supportCode}`);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  return { table, loading, error, reload: load };
}
