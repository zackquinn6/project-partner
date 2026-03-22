import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useGlobalPublicSettings } from '@/hooks/useGlobalPublicSettings';

export const PublicSiteSettingsCard: React.FC = () => {
  const {
    simplifiedPublicLanding,
    projectCatalogEnabled,
    workshopLabsAccordionEnabled,
    loading,
    refetch,
  } = useGlobalPublicSettings();
  const [updatingSimplified, setUpdatingSimplified] = useState(false);
  const [updatingCatalog, setUpdatingCatalog] = useState(false);
  const [updatingLabs, setUpdatingLabs] = useState(false);

  const updateSetting = async (
    settingKey:
      | 'simplified_public_landing'
      | 'project_catalog_enabled'
      | 'workshop_labs_accordion_enabled',
    enabled: boolean,
    setBusy: (v: boolean) => void
  ) => {
    setBusy(true);
    try {
      const { error } = await supabase.from('app_settings').upsert(
        {
          setting_key: settingKey,
          setting_value: { enabled },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'setting_key' }
      );

      if (error) throw error;

      await refetch();
      const label =
        settingKey === 'simplified_public_landing'
          ? 'Simplified public landing'
          : settingKey === 'project_catalog_enabled'
            ? 'Project catalog'
            : 'Workshop Labs accordion';
      toast.success(`${label} ${enabled ? 'on' : 'off'} for all users`);
    } catch (err) {
      console.error('Error updating public site setting:', err);
      toast.error('Failed to update setting');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Public site & catalog</CardTitle>
        <CardDescription>
          These toggles apply to every user and anonymous visitors. When the catalog is off, the
          catalog page and entry points are hidden; post-sign-in routing uses workspace home if the
          default was catalog.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="simplified-landing" className="flex-1">
            <div className="font-medium">Simplified landing page</div>
            <div className="text-sm text-muted-foreground">
              Anonymous visitors see a short hero with Get started and Learn more (full marketing
              page).
            </div>
          </Label>
          <Switch
            id="simplified-landing"
            checked={simplifiedPublicLanding}
            onCheckedChange={(checked) =>
              updateSetting('simplified_public_landing', checked, setUpdatingSimplified)
            }
            disabled={loading || updatingSimplified}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="catalog-enabled" className="flex-1">
            <div className="font-medium">Project catalog</div>
            <div className="text-sm text-muted-foreground">
              When off, the catalog route and in-app links to start a template project are hidden for
              everyone.
            </div>
          </Label>
          <Switch
            id="catalog-enabled"
            checked={projectCatalogEnabled}
            onCheckedChange={(checked) =>
              updateSetting('project_catalog_enabled', checked, setUpdatingCatalog)
            }
            disabled={loading || updatingCatalog}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="workshop-labs" className="flex-1">
            <div className="font-medium">Workshop Labs accordion</div>
            <div className="text-sm text-muted-foreground">
              When off, the Labs section (experimental features) is hidden on the signed-in My Workshop
              page for all users.
            </div>
          </Label>
          <Switch
            id="workshop-labs"
            checked={workshopLabsAccordionEnabled}
            onCheckedChange={(checked) =>
              updateSetting('workshop_labs_accordion_enabled', checked, setUpdatingLabs)
            }
            disabled={loading || updatingLabs}
          />
        </div>
      </CardContent>
    </Card>
  );
};
