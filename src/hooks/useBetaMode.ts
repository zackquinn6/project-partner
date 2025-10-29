import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useBetaMode() {
  const [isBetaMode, setIsBetaMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchBetaMode = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'beta_mode')
        .single();

      if (error) throw error;
      
      setIsBetaMode((data?.setting_value as { enabled?: boolean })?.enabled ?? false);
    } catch (error) {
      console.error('Error fetching beta mode:', error);
      setIsBetaMode(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBetaMode();

    // Listen for changes to beta mode setting
    const channel = supabase
      .channel('beta-mode-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_settings',
          filter: 'setting_key=eq.beta_mode'
        },
        () => {
          fetchBetaMode();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { isBetaMode, loading, refetch: fetchBetaMode };
}
