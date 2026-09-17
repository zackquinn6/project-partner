import { useCallback, useEffect, useState } from 'react';
import {
  fetchOccurrenceDriverTable,
  type OccurrenceDriverTable,
} from '@/utils/keyCharacteristics';

interface UseOccurrenceDriversResult {
  table: OccurrenceDriverTable | null;
  loading: boolean;
  /**
   * Set when the vocabulary could not be loaded. Callers must show this rather than offering
   * an empty driver list, since an unclassified cause keeps items off the KC register.
   */
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Loads risk_occurrence_drivers once per mount, alongside useActionPriorityTable. Both are
 * small seeded lookups that the Key Characteristic test reads together.
 */
export function useOccurrenceDrivers(): UseOccurrenceDriversResult {
  const [table, setTable] = useState<OccurrenceDriverTable | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTable(await fetchOccurrenceDriverTable());
    } catch (err) {
      console.error('Occurrence driver table load failed:', err);
      setTable(null);
      setError(err instanceof Error ? err.message : 'Failed to load occurrence drivers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { table, loading, error, reload: load };
}
