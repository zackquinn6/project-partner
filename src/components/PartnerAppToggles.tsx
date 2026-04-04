import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePartnerAppSettings } from '@/hooks/usePartnerAppSettings';

export const PartnerAppToggles: React.FC = () => {
  const { partnerAppsEnabled, expertSupportEnabled, toolRentalsEnabled, wasteRemovalEnabled, loading, refetch } = usePartnerAppSettings();
  const [updatingPartner, setUpdatingPartner] = useState(false);
  const [updatingExpert, setUpdatingExpert] = useState(false);
  const [updatingToolRentals, setUpdatingToolRentals] = useState(false);
  const [updatingWasteRemoval, setUpdatingWasteRemoval] = useState(false);

  const updateSetting = async (key: 'partner_apps_enabled' | 'expert_support_enabled' | 'tool_rentals_enabled' | 'waste_removal_enabled', enabled: boolean) => {
    const setBusy =
      key === 'partner_apps_enabled'
        ? setUpdatingPartner
        : key === 'expert_support_enabled'
          ? setUpdatingExpert
          : key === 'tool_rentals_enabled'
            ? setUpdatingToolRentals
            : setUpdatingWasteRemoval;
    setBusy(true);
    try {
      // When disabling partner apps, disable all dependent options at the same time.
      // This ensures expert support / tool rentals cannot be used when partner apps are off.
      const keysToUpdate =
        key === 'partner_apps_enabled' && enabled === false
          ? ['partner_apps_enabled', 'expert_support_enabled', 'tool_rentals_enabled', 'waste_removal_enabled']
          : [key];

      const payload = keysToUpdate.map(settingKey => ({
        setting_key: settingKey,
        setting_value: { enabled: settingKey === 'partner_apps_enabled' ? enabled : false },
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase.from('app_settings').upsert(payload, { onConflict: 'setting_key' });

      if (error) throw error;
      await refetch();
      const label =
        key === 'partner_apps_enabled'
          ? 'Partner apps'
          : key === 'expert_support_enabled'
            ? 'Support'
            : key === 'tool_rentals_enabled'
              ? 'Tool Rental'
              : 'Waste Removal';
          } catch (err) {
      console.error('Error updating partner app setting:', err);
      toast.error('Failed to update setting');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Partner apps</CardTitle>
        <CardDescription>
          Turn on or off partner apps and Expert Support. When Support is off, it is removed from project planning and kickoff tool options.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/*
          When partner apps are disabled, dependent options must be off and non-interactive.
        */}
        <div className="flex items-center justify-between">
          <Label htmlFor="partner-apps" className="flex-1">
            <div className="font-medium">Use partner apps</div>
            <div className="text-sm text-muted-foreground">
              When enabled, partner app integrations are available in the app
            </div>
          </Label>
          <Switch
            id="partner-apps"
            checked={partnerAppsEnabled}
            onCheckedChange={checked => updateSetting('partner_apps_enabled', checked)}
            disabled={loading || updatingPartner}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="waste-removal" className="flex-1">
            <div className="font-medium">Waste Removal</div>
            <div className="text-sm text-muted-foreground">
              When enabled, Waste Removal appears in the project workflow under Partner Tools
            </div>
          </Label>
          <Switch
            id="waste-removal"
            checked={wasteRemovalEnabled}
            onCheckedChange={checked => {
              if (!partnerAppsEnabled) return;
              updateSetting('waste_removal_enabled', checked);
            }}
            disabled={loading || updatingWasteRemoval || !partnerAppsEnabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="expert-support" className="flex-1">
            <div className="font-medium">Support</div>
            <div className="text-sm text-muted-foreground">
              When enabled, Expert Support appears in project planning and Workflow Setup
            </div>
          </Label>
          <Switch
            id="expert-support"
            checked={expertSupportEnabled}
            onCheckedChange={checked => {
              if (!partnerAppsEnabled) return;
              updateSetting('expert_support_enabled', checked);
            }}
            disabled={loading || updatingExpert || !partnerAppsEnabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="tool-rentals" className="flex-1">
            <div className="font-medium">Tool Rental</div>
            <div className="text-sm text-muted-foreground">
              When enabled, Tool Rental appears in the project workflow sidebar (Project Tools)
            </div>
          </Label>
          <Switch
            id="tool-rentals"
            checked={toolRentalsEnabled}
            onCheckedChange={checked => {
              if (!partnerAppsEnabled) return;
              updateSetting('tool_rentals_enabled', checked);
            }}
            disabled={loading || updatingToolRentals || !partnerAppsEnabled}
          />
        </div>
      </CardContent>
    </Card>
  );
};
