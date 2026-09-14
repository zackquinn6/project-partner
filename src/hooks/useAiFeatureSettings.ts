import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const AI_SETTING_KEYS = [
  'ai_features_enabled',
  'ai_project_generator_enabled',
  'ai_scheduler_availability_enabled',
  'ai_repair_enabled',
  'ai_project_help_chat_enabled',
] as const;

type AiSettingKey = (typeof AI_SETTING_KEYS)[number];

function parseEnabled(value: unknown): boolean | undefined {
  if (value && typeof value === 'object' && 'enabled' in value) {
    const enabled = (value as { enabled?: unknown }).enabled;
    if (typeof enabled === 'boolean') return enabled;
  }
  return undefined;
}

export function useAiFeatureSettings() {
  // Match seeded defaults: All on, generator off, other features on.
  const [aiFeaturesEnabled, setAiFeaturesEnabled] = useState(true);
  const [aiProjectGeneratorSetting, setAiProjectGeneratorSetting] = useState(false);
  const [aiSchedulerSetting, setAiSchedulerSetting] = useState(true);
  const [aiRepairSetting, setAiRepairSetting] = useState(true);
  const [aiHelpChatSetting, setAiHelpChatSetting] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [...AI_SETTING_KEYS]);

      if (error) throw error;

      const map = new Map(
        (data ?? []).map(row => [row.setting_key as AiSettingKey, parseEnabled(row.setting_value)])
      );

      const all = map.get('ai_features_enabled');
      const generator = map.get('ai_project_generator_enabled');
      const scheduler = map.get('ai_scheduler_availability_enabled');
      const repair = map.get('ai_repair_enabled');
      const helpChat = map.get('ai_project_help_chat_enabled');

      if (all === undefined) throw new Error('Missing ai_features_enabled');
      if (generator === undefined) throw new Error('Missing ai_project_generator_enabled');
      if (scheduler === undefined) throw new Error('Missing ai_scheduler_availability_enabled');
      if (repair === undefined) throw new Error('Missing ai_repair_enabled');
      if (helpChat === undefined) throw new Error('Missing ai_project_help_chat_enabled');

      setAiFeaturesEnabled(all);
      setAiProjectGeneratorSetting(generator);
      setAiSchedulerSetting(scheduler);
      setAiRepairSetting(repair);
      setAiHelpChatSetting(helpChat);
    } catch (err) {
      console.error('Error fetching AI feature settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();

    const channel = supabase
      .channel('ai-feature-settings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_settings',
        },
        (payload) => {
          const key = (payload.new as { setting_key?: string })?.setting_key;
          if (key && (AI_SETTING_KEYS as readonly string[]).includes(key)) {
            fetchSettings();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    aiFeaturesEnabled,
    aiProjectGeneratorSetting,
    aiSchedulerSetting,
    aiRepairSetting,
    aiHelpChatSetting,
    aiProjectGeneratorEnabled: aiFeaturesEnabled && aiProjectGeneratorSetting,
    aiSchedulerAvailabilityEnabled: aiFeaturesEnabled && aiSchedulerSetting,
    aiRepairEnabled: aiFeaturesEnabled && aiRepairSetting,
    aiProjectHelpChatEnabled: aiFeaturesEnabled && aiHelpChatSetting,
    loading,
    refetch: fetchSettings,
  };
}
