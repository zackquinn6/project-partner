import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const KEYS = [
  'simplified_public_landing',
  'project_catalog_enabled',
  'workshop_labs_accordion_enabled',
  'tile_focus_mode',
] as const;

export function useGlobalPublicSettings() {
  const [simplifiedPublicLanding, setSimplifiedPublicLanding] = useState(false);
  const [projectCatalogEnabled, setProjectCatalogEnabled] = useState(true);
  const [workshopLabsAccordionEnabled, setWorkshopLabsAccordionEnabled] = useState(true);
  const [tileFocusMode, setTileFocusMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const SETTINGS_TIMEOUT_MS = 5000;
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      setLoading(false);
    }, SETTINGS_TIMEOUT_MS);

    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [...KEYS]);

      if (timedOut) return;

      if (error) {
        console.error('Error loading global public settings:', error);
        return;
      }

      for (const row of data ?? []) {
        const enabled = (row.setting_value as { enabled?: boolean } | null)?.enabled;
        if (typeof enabled !== 'boolean') continue;
        if (row.setting_key === 'simplified_public_landing') {
          setSimplifiedPublicLanding(enabled);
        }
        if (row.setting_key === 'project_catalog_enabled') {
          setProjectCatalogEnabled(enabled);
        }
        if (row.setting_key === 'workshop_labs_accordion_enabled') {
          setWorkshopLabsAccordionEnabled(enabled);
        }
        if (row.setting_key === 'tile_focus_mode') {
          setTileFocusMode(enabled);
        }
      }
    } catch (err) {
      if (!timedOut) {
        console.error('Unexpected error loading global public settings:', err);
      }
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    const channel = supabase
      .channel('global-public-settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings' },
        (payload) => {
          const key =
            (payload.new as { setting_key?: string } | null)?.setting_key ??
            (payload.old as { setting_key?: string } | null)?.setting_key;
          if (key && KEYS.includes(key as (typeof KEYS)[number])) {
            load();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  return {
    simplifiedPublicLanding,
    projectCatalogEnabled,
    workshopLabsAccordionEnabled,
    tileFocusMode,
    loading,
    refetch: load,
  };
}
