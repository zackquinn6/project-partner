import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const KEYS = [
  'simplified_public_landing',
  'project_catalog_enabled',
  'workshop_labs_accordion_enabled',
  'tile_focus_mode',
] as const;

type GlobalPublicSettings = {
  simplifiedPublicLanding: boolean;
  projectCatalogEnabled: boolean;
  workshopLabsAccordionEnabled: boolean;
  tileFocusMode: boolean;
};

const DEFAULTS: GlobalPublicSettings = {
  simplifiedPublicLanding: false,
  projectCatalogEnabled: true,
  workshopLabsAccordionEnabled: true,
  tileFocusMode: false,
};

/** Survives remounts so consumers (e.g. ProjectCatalog after the page gate) don't flash wrong filters. */
let settingsCache: GlobalPublicSettings | null = null;

function parseSettingsRows(
  data: { setting_key: string; setting_value: unknown }[]
): GlobalPublicSettings {
  const next: GlobalPublicSettings = { ...(settingsCache ?? DEFAULTS) };
  for (const row of data) {
    const enabled = (row.setting_value as { enabled?: boolean } | null)?.enabled;
    if (typeof enabled !== 'boolean') continue;
    if (row.setting_key === 'simplified_public_landing') {
      next.simplifiedPublicLanding = enabled;
    }
    if (row.setting_key === 'project_catalog_enabled') {
      next.projectCatalogEnabled = enabled;
    }
    if (row.setting_key === 'workshop_labs_accordion_enabled') {
      next.workshopLabsAccordionEnabled = enabled;
    }
    if (row.setting_key === 'tile_focus_mode') {
      next.tileFocusMode = enabled;
    }
  }
  return next;
}

export function useGlobalPublicSettings() {
  const [simplifiedPublicLanding, setSimplifiedPublicLanding] = useState(
    () => settingsCache?.simplifiedPublicLanding ?? DEFAULTS.simplifiedPublicLanding
  );
  const [projectCatalogEnabled, setProjectCatalogEnabled] = useState(
    () => settingsCache?.projectCatalogEnabled ?? DEFAULTS.projectCatalogEnabled
  );
  const [workshopLabsAccordionEnabled, setWorkshopLabsAccordionEnabled] = useState(
    () => settingsCache?.workshopLabsAccordionEnabled ?? DEFAULTS.workshopLabsAccordionEnabled
  );
  const [tileFocusMode, setTileFocusMode] = useState(
    () => settingsCache?.tileFocusMode ?? DEFAULTS.tileFocusMode
  );
  const [loading, setLoading] = useState(() => settingsCache === null);

  const applySettings = useCallback((next: GlobalPublicSettings) => {
    settingsCache = next;
    setSimplifiedPublicLanding(next.simplifiedPublicLanding);
    setProjectCatalogEnabled(next.projectCatalogEnabled);
    setWorkshopLabsAccordionEnabled(next.workshopLabsAccordionEnabled);
    setTileFocusMode(next.tileFocusMode);
  }, []);

  const load = useCallback(async () => {
    const SETTINGS_TIMEOUT_MS = 5000;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), SETTINGS_TIMEOUT_MS);

    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [...KEYS])
        .abortSignal(controller.signal);

      if (error || !data) {
        return;
      }

      applySettings(parseSettingsRows(data));
    } catch {
      // Preview/network/CORS failures: keep prior defaults; avoid console noise.
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [applySettings]);

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
