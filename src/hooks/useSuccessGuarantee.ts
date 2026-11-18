import { useCallback, useEffect, useState } from 'react';
import {
  deriveGuaranteeCoverage,
  fetchGuaranteeEvents,
  fetchGuaranteeReadiness,
  type GuaranteeCoverage,
  type GuaranteeEvent,
  type GuaranteeReadiness,
} from '@/utils/successGuarantee';
import { fetchRunAssumptions, type RunAssumption } from '@/utils/projectAssumptions';

export interface SuccessGuaranteeState {
  loading: boolean;
  error: Error | null;
  events: GuaranteeEvent[];
  coverage: GuaranteeCoverage;
  readiness: GuaranteeReadiness | null;
  assumptions: RunAssumption[];
  refresh: () => Promise<void>;
}

/** Guarantee coverage, template readiness, and run assumptions for one run. */
export function useSuccessGuarantee(
  projectRunId: string | null | undefined,
  templateProjectId: string | null | undefined
): SuccessGuaranteeState {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [events, setEvents] = useState<GuaranteeEvent[]>([]);
  const [readiness, setReadiness] = useState<GuaranteeReadiness | null>(null);
  const [assumptions, setAssumptions] = useState<RunAssumption[]>([]);

  const refresh = useCallback(async () => {
    if (!projectRunId || !templateProjectId) {
      setEvents([]);
      setReadiness(null);
      setAssumptions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [nextEvents, nextReadiness, nextAssumptions] = await Promise.all([
        fetchGuaranteeEvents(projectRunId),
        fetchGuaranteeReadiness(templateProjectId),
        fetchRunAssumptions(projectRunId),
      ]);
      setEvents(nextEvents);
      setReadiness(nextReadiness);
      setAssumptions(nextAssumptions);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [projectRunId, templateProjectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    loading,
    error,
    events,
    coverage: deriveGuaranteeCoverage(events),
    readiness,
    assumptions,
    refresh,
  };
}
