import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBetaMode } from '@/hooks/useBetaMode';

export const BetaModeToggle = () => {
  const { isBetaMode, loading, refetch } = useBetaMode();
  const [updating, setUpdating] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({
          setting_value: { enabled: checked },
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'beta_mode');

      if (error) throw error;

      await refetch();
      toast.success(`Beta mode ${checked ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating beta mode:', error);
      toast.error('Failed to update beta mode');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Beta Testing Mode</CardTitle>
        <CardDescription>
          Control beta testing features for the entire app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="beta-mode" className="flex-1">
            <div className="font-medium">Enable Beta Mode</div>
            <div className="text-sm text-muted-foreground">
              When enabled, all users can access premium features without membership
            </div>
          </Label>
          <Switch
            id="beta-mode"
            checked={isBetaMode}
            onCheckedChange={handleToggle}
            disabled={loading || updating}
          />
        </div>

        {isBetaMode && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Beta mode is currently active. All membership requirements are disabled and a beta banner is displayed in the header.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
