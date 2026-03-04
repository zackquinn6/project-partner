import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePartnerAppSettings } from '@/hooks/usePartnerAppSettings';

export const PartnerAppToggles: React.FC = () => {
  const { partnerAppsEnabled, expertSupportEnabled, loading, refetch } = usePartnerAppSettings();
  const [updatingPartner, setUpdatingPartner] = useState(false);
  const [updatingExpert, setUpdatingExpert] = useState(false);

  const updateSetting = async (key: 'partner_apps_enabled' | 'expert_support_enabled', enabled: boolean) => {
    const setBusy = key === 'partner_apps_enabled' ? setUpdatingPartner : setUpdatingExpert;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert(
          {
            setting_key: key,
            setting_value: { enabled },
            updated_at: new Date().toISOString()
          },
          { onConflict: 'setting_key' }
        );

      if (error) throw error;
      await refetch();
      const label = key === 'partner_apps_enabled' ? 'Partner apps' : 'Expert support';
      toast.success(`${label} ${enabled ? 'enabled' : 'disabled'}`);
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
          Turn on or off usage of partner apps and expert support. When Expert support is off, it is removed from project planning and kickoff tool options.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
          <Label htmlFor="expert-support" className="flex-1">
            <div className="font-medium">Expert support</div>
            <div className="text-sm text-muted-foreground">
              When enabled, Expert support (Call the Trades) appears in project planning and Workflow Setup
            </div>
          </Label>
          <Switch
            id="expert-support"
            checked={expertSupportEnabled}
            onCheckedChange={checked => updateSetting('expert_support_enabled', checked)}
            disabled={loading || updatingExpert}
          />
        </div>

        {!expertSupportEnabled && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Expert support is off. The option will not appear in the project planning workflow or in Kickoff step 4 (Workflow Setup).
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
