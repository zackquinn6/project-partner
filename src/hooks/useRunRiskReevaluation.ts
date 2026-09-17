import { useEffect, useRef, useState } from 'react';
import { reevaluateProjectRunRiskLogic } from '@/utils/applyProjectRiskLogic';

interface UseRunRiskReevaluationOptions {
  projectRunId: string | null | undefined;
  /** Pass the surface's open state, so the work happens when the user is about to read it. */
  enabled: boolean;
  /** Called once the run's applied risk list has been rebuilt, to reload what is on screen. */
  onReevaluated?: () => void;
}

export interface RunRiskReevaluationState {
  running: boolean;
  /** Set when the rebuild failed, so the surface can say the numbers are stale. */
  error: string | null;
}

/**
 * Rebuilds a run's applied risk list when a risk surface opens.
 *
 * The scores depend on the user's tools, spaces, and history, all of which change between
 * sessions, so a list written at run creation goes stale. Re-evaluation only rewrites the
 * derived baseline; mitigation progress and hidden rows are the user's and are left alone.
 *
 * It runs once per run per open. A failure is reported rather than retried, because a rule
 * set that cannot be evaluated is an authoring problem, not a transient one.
 */
export function useRunRiskReevaluation({
  projectRunId,
  enabled,
  onReevaluated,
}: UseRunRiskReevaluationOptions): RunRiskReevaluationState {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRunRef = useRef<string | null>(null);
  const callbackRef = useRef(onReevaluated);
  callbackRef.current = onReevaluated;

  useEffect(() => {
    if (!enabled || !projectRunId) {
      lastRunRef.current = null;
      return;
    }
    if (lastRunRef.current === projectRunId) return;
    lastRunRef.current = projectRunId;

    let cancelled = false;
    setRunning(true);
    setError(null);

    void reevaluateProjectRunRiskLogic(projectRunId)
      .then(() => {
        if (cancelled) return;
        callbackRef.current?.();
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('Risk re-evaluation failed:', err);
        setError(err instanceof Error ? err.message : 'Risk re-evaluation failed');
      })
      .finally(() => {
        if (!cancelled) setRunning(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, projectRunId]);

  return { running, error };
}
