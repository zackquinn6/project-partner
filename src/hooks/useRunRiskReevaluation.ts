import { useEffect, useRef, useState } from 'react';
import { reevaluateProjectRunRiskLogic } from '@/utils/applyProjectRiskLogic';
import { useAuth } from '@/contexts/AuthContext';
import { reportUserFacingError } from '@/utils/errorReporting';

interface UseRunRiskReevaluationOptions {
  projectRunId: string | null | undefined;
  /** Pass the surface's open state, so the work happens when the user is about to read it. */
  enabled: boolean;
  /** Called once the run's applied risk list has been rebuilt, to reload what is on screen. */
  onReevaluated?: () => void;
}

export interface RunRiskReevaluationState {
  running: boolean;
}

/**
 * Rebuilds a run's applied risk list when a risk surface opens.
 *
 * The scores depend on the user's tools, spaces, and history, all of which change between
 * sessions, so a list written at run creation goes stale. Re-evaluation only rewrites the
 * derived baseline; mitigation progress and hidden rows are the user's and are left alone.
 *
 * It runs once per run per open. A failure is toasted (with a support code) and reported to
 * admins rather than retried, because a rule set that cannot be evaluated is an authoring
 * problem, not a transient one. Risk Radar itself never surfaces an in-app error banner for
 * this - the list stays on screen and a toast is enough.
 */
export function useRunRiskReevaluation({
  projectRunId,
  enabled,
  onReevaluated,
}: UseRunRiskReevaluationOptions): RunRiskReevaluationState {
  const { user } = useAuth();
  const [running, setRunning] = useState(false);
  const lastRunRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?.id ?? null;
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

    void reevaluateProjectRunRiskLogic(projectRunId)
      .then(() => {
        if (cancelled) return;
        callbackRef.current?.();
      })
      .catch(async (err: unknown) => {
        if (cancelled) return;
        await reportUserFacingError({
          source: 'risk_radar',
          operation: 'reevaluate_run_risk',
          userId: userIdRef.current,
          projectRunId,
          error: err,
          userMessage: 'Your risk priorities could not be refreshed for your profile.',
          notificationTitle: 'Risk priorities not refreshed',
          toastPresenter: 'sonner',
        });
      })
      .finally(() => {
        if (!cancelled) setRunning(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, projectRunId]);

  return { running };
}
