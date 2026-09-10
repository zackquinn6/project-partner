import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const PROBE_TIMEOUT_MS = 4000;
const POLL_INTERVAL_MS = 30000;

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

/** Primary health check against PostgREST. Auth can still work when this is false. */
export function useDatabaseHealth() {
  const [isUnreachable, setIsUnreachable] = useState(false);

  const check = useCallback(async () => {
    const reachable = await probeDatabase();
    setIsUnreachable(!reachable);
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
