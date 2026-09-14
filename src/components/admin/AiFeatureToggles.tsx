import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAiFeatureSettings } from '@/hooks/useAiFeatureSettings';

type AiSettingKey =
  | 'ai_features_enabled'
  | 'ai_project_generator_enabled'
  | 'ai_scheduler_availability_enabled'
  | 'ai_repair_enabled'
  | 'ai_project_help_chat_enabled';

const CHILD_KEYS: AiSettingKey[] = [
  'ai_project_generator_enabled',
  'ai_scheduler_availability_enabled',
  'ai_repair_enabled',
  'ai_project_help_chat_enabled',
];

export const AiFeatureToggles: React.FC = () => {
  const {
    aiFeaturesEnabled,
    aiProjectGeneratorSetting,
    aiSchedulerSetting,
    aiRepairSetting,
    aiHelpChatSetting,
    loading,
    refetch,
  } = useAiFeatureSettings();

  const [updatingAll, setUpdatingAll] = useState(false);
  const [updatingGenerator, setUpdatingGenerator] = useState(false);
  const [updatingScheduler, setUpdatingScheduler] = useState(false);
  const [updatingRepair, setUpdatingRepair] = useState(false);
  const [updatingHelpChat, setUpdatingHelpChat] = useState(false);

  const busyFor = (key: AiSettingKey) => {
    if (key === 'ai_features_enabled') return setUpdatingAll;
    if (key === 'ai_project_generator_enabled') return setUpdatingGenerator;
    if (key === 'ai_scheduler_availability_enabled') return setUpdatingScheduler;
    if (key === 'ai_repair_enabled') return setUpdatingRepair;
    return setUpdatingHelpChat;
  };

  const labelFor = (key: AiSettingKey) => {
    if (key === 'ai_features_enabled') return 'All AI features';
    if (key === 'ai_project_generator_enabled') return 'AI Project Generator';
    if (key === 'ai_scheduler_availability_enabled') return 'Scheduler AI';
    if (key === 'ai_repair_enabled') return 'AI Repair';
    return 'Ask AI';
  };

  const updateSetting = async (key: AiSettingKey, enabled: boolean) => {
    const setBusy = busyFor(key);
    setBusy(true);
    try {
      const now = new Date().toISOString();
      // Disabling All cascades every child to off so dependent UI cannot stay enabled.
      const payload =
        key === 'ai_features_enabled' && enabled === false
          ? (['ai_features_enabled', ...CHILD_KEYS] as AiSettingKey[]).map(settingKey => ({
              setting_key: settingKey,
              setting_value: { enabled: false },
              updated_at: now,
            }))
          : [
              {
                setting_key: key,
                setting_value: { enabled },
                updated_at: now,
              },
            ];

      const { error } = await supabase.from('app_settings').upsert(payload, { onConflict: 'setting_key' });
      if (error) throw error;
      await refetch();
      toast.success(`${labelFor(key)} updated`);
    } catch (err) {
      console.error('Error updating AI feature setting:', err);
      toast.error('Failed to update setting');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI features</CardTitle>
        <CardDescription>
          Turn AI features on or off site-wide. When a feature is off, its buttons and entry points are hidden.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="ai-features-all" className="flex-1">
            <div className="font-medium">All AI features</div>
            <div className="text-sm text-muted-foreground">
              Master switch for every AI application below
            </div>
          </Label>
          <Switch
            id="ai-features-all"
            checked={aiFeaturesEnabled}
            onCheckedChange={checked => updateSetting('ai_features_enabled', checked)}
            disabled={loading || updatingAll}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="ai-project-generator" className="flex-1">
            <div className="font-medium">AI Project Generator</div>
            <div className="text-sm text-muted-foreground">
              Project Management and workflow editor AI generator
            </div>
          </Label>
          <Switch
            id="ai-project-generator"
            checked={aiProjectGeneratorSetting}
            onCheckedChange={checked => {
              if (!aiFeaturesEnabled) return;
              updateSetting('ai_project_generator_enabled', checked);
            }}
            disabled={loading || updatingGenerator || !aiFeaturesEnabled}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="ai-scheduler" className="flex-1">
            <div className="font-medium">Scheduler AI</div>
            <div className="text-sm text-muted-foreground">
              Natural-language availability entry in the project scheduler
            </div>
          </Label>
          <Switch
            id="ai-scheduler"
            checked={aiSchedulerSetting}
            onCheckedChange={checked => {
              if (!aiFeaturesEnabled) return;
              updateSetting('ai_scheduler_availability_enabled', checked);
            }}
            disabled={loading || updatingScheduler || !aiFeaturesEnabled}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="ai-repair" className="flex-1">
            <div className="font-medium">AI Repair</div>
            <div className="text-sm text-muted-foreground">
              Photo diagnosis entry points on Home and related surfaces
            </div>
          </Label>
          <Switch
            id="ai-repair"
            checked={aiRepairSetting}
            onCheckedChange={checked => {
              if (!aiFeaturesEnabled) return;
              updateSetting('ai_repair_enabled', checked);
            }}
            disabled={loading || updatingRepair || !aiFeaturesEnabled}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="ai-help-chat" className="flex-1">
            <div className="font-medium">Ask AI</div>
            <div className="text-sm text-muted-foreground">
              Project help chat in the workflow
            </div>
          </Label>
          <Switch
            id="ai-help-chat"
            checked={aiHelpChatSetting}
            onCheckedChange={checked => {
              if (!aiFeaturesEnabled) return;
              updateSetting('ai_project_help_chat_enabled', checked);
            }}
            disabled={loading || updatingHelpChat || !aiFeaturesEnabled}
          />
        </div>
      </CardContent>
    </Card>
  );
};
