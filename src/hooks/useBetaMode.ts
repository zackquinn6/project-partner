import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const FETCH_TIMEOUT_MS = 5000;

type UseBetaModeOptions = {
  /** When false, skip network/realtime (e.g. logged-out /auth). Default true. */
  enabled?: boolean;
};

export function useBetaMode(options?: UseBetaModeOptions) {
  const enabled = options?.enabled ?? true;
  const [isBetaMode, setIsBetaMode] = useState(false);
  const [loading, setLoading] = useState(enabled);

  const fetchBetaMode = async () => {
    if (!enabled) {
      setIsBetaMode(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'beta_mode')
        .abortSignal(controller.signal)
        .maybeSingle();

      if (error) {
        setIsBetaMode(false);
        return;
      }

      const enabledFlag = (data?.setting_value as { enabled?: boolean } | null)?.enabled;
      setIsBetaMode(enabledFlag === true);
    } catch {
      setIsBetaMode(false);
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) {
      setIsBetaMode(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    void fetchBetaMode();

    const channel = supabase
      .channel('beta-mode-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_settings',
          filter: 'setting_key=eq.beta_mode',
        },
        () => {
          void fetchBetaMode();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]);

  return { isBetaMode, loading, refetch: fetchBetaMode };
}
