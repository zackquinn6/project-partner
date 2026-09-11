import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const PROBE_TIMEOUT_MS = 12000;
const POLL_INTERVAL_MS = 30000;
const FAILURE_THRESHOLD = 3;
const STATUS_URL = 'https://status.supabase.com/api/v2/status.json';

type StatusIndicator = 'none' | 'minor' | 'major' | 'critical' | string;

async function probeDatabase(): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const { error } = await supabase
      .from('app_settings')
      .select('setting_key')
      .limit(1)
      .abortSignal(controller.signal);

    if (error) {
      return false;
    }
    return true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function isMajorOrCritical(indicator: StatusIndicator | null): boolean {
  return indicator === 'major' || indicator === 'critical';
}

/** Fetch Supabase Statuspage indicator. Returns null when the formal signal cannot be confirmed. */
async function fetchStatusIndicator(): Promise<StatusIndicator | null> {
  try {
    const response = await fetch(STATUS_URL, { method: 'GET' });
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as { status?: { indicator?: StatusIndicator } };
    const indicator = body.status?.indicator;
    if (indicator === undefined) {
      return null;
    }
    return indicator;
  } catch {
    return null;
  }
}

/** Primary health check against PostgREST. Auth can still work when this is false. */
export function useDatabaseHealth() {
  const [isUnreachable, setIsUnreachable] = useState(false);
  const consecutiveFailuresRef = useRef(0);
  const statusConfirmedRef = useRef(false);

  const check = useCallback(async () => {
    const reachable = await probeDatabase();

    if (reachable) {
      consecutiveFailuresRef.current = 0;
      statusConfirmedRef.current = false;
      setIsUnreachable(false);
      return;
    }

    consecutiveFailuresRef.current += 1;

    if (consecutiveFailuresRef.current < FAILURE_THRESHOLD) {
      setIsUnreachable(false);
      return;
    }

    // Formal gate: only fetch / refresh status once local threshold is met, and while banner may show
    const indicator = await fetchStatusIndicator();
    statusConfirmedRef.current = isMajorOrCritical(indicator);
    setIsUnreachable(
      consecutiveFailuresRef.current >= FAILURE_THRESHOLD && statusConfirmedRef.current
    );
  }, []);

  useEffect(() => {
    void check();

    const intervalId = window.setInterval(() => {
      void check();
    }, POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void check();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [check]);

  return { isUnreachable };
}
