import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function usePartnerAppSettings() {
  const [partnerAppsEnabled, setPartnerAppsEnabled] = useState(true);
  const [expertSupportEnabled, setExpertSupportEnabled] = useState(true);
  const [toolRentalsEnabled, setToolRentalsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const keys = ['partner_apps_enabled', 'expert_support_enabled', 'tool_rentals_enabled'];
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value')
        .in('setting_key', keys);

      if (error) throw error;

      const map = new Map((data ?? []).map(row => [row.setting_key, row.setting_value as { enabled?: boolean }]));
      setPartnerAppsEnabled(map.get('partner_apps_enabled')?.enabled ?? true);
      setExpertSupportEnabled(map.get('expert_support_enabled')?.enabled ?? true);
      setToolRentalsEnabled(map.get('tool_rentals_enabled')?.enabled ?? true);
    } catch (err) {
      console.error('Error fetching partner app settings:', err);
      setPartnerAppsEnabled(true);
      setExpertSupportEnabled(true);
      setToolRentalsEnabled(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();

    const channel = supabase
      .channel('partner-app-settings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_settings'
        },
        (payload) => {
          const key = (payload.new as { setting_key?: string })?.setting_key;
          if (key === 'partner_apps_enabled' || key === 'expert_support_enabled' || key === 'tool_rentals_enabled') fetchSettings();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { partnerAppsEnabled, expertSupportEnabled, toolRentalsEnabled, loading, refetch: fetchSettings };
}
