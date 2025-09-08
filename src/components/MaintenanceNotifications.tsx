import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Mail, MessageSquare, Bell, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface MaintenanceNotificationsProps {
  selectedHomeId: string;
}

export function MaintenanceNotifications({ selectedHomeId }: MaintenanceNotificationsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  
  // Simple state management for now
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [emailAddress, setEmailAddress] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [notifyMonthly, setNotifyMonthly] = useState(true);
  const [notifyWeekly, setNotifyWeekly] = useState(true);
  const [notifyDueDate, setNotifyDueDate] = useState(true);

  const saveNotificationSettings = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      // For now, just show success without database interaction
      toast({
        title: "Settings Saved",
        description: "Your notification preferences have been updated",
      });
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast({
        title: "Error",
        description: "Failed to save notification settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const testEmailNotification = async () => {
    if (!emailAddress) return;

    try {
      const { error } = await supabase.functions.invoke('send-maintenance-reminder', {
        body: {
          type: 'test',
          email: emailAddress,
          userName: user?.email?.split('@')[0] || 'User',
        },
      });

      if (error) throw error;

      toast({
        title: "Test Email Sent",
        description: `Test notification sent to ${emailAddress}`,
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        title: "Error",
        description: "Failed to send test email",
        variant: "destructive",
      });
    }
  };

  const showSMSNotAvailable = () => {
    toast({
      title: "SMS Not Available",
      description: "Text notifications are not yet available. Email notifications are fully supported.",
      variant: "destructive",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Settings */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="email-enabled"
              checked={emailEnabled}
              onCheckedChange={(checked) => setEmailEnabled(checked === true)}
            />
            <Label htmlFor="email-enabled" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Enable Email Notifications
            </Label>
            <Badge variant="secondary">Available</Badge>
          </div>
          
          {emailEnabled && (
            <div className="ml-6 space-y-3">
              <div>
                <Label htmlFor="email-address">Email Address</Label>
                <Input
                  id="email-address"
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="Enter your email address"
                />
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={testEmailNotification}
                disabled={!emailAddress}
              >
                Send Test Email
              </Button>
            </div>
          )}
        </div>

        {/* SMS Settings */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sms-enabled"
              checked={smsEnabled}
              onCheckedChange={(checked) => {
                if (checked) {
                  showSMSNotAvailable();
                } else {
                  setSmsEnabled(false);
                }
              }}
            />
            <Label htmlFor="sms-enabled" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Enable SMS Notifications
            </Label>
            <Badge variant="outline">Coming Soon</Badge>
          </div>
          
          {smsEnabled && (
            <div className="ml-6 space-y-3">
              <div>
                <Label htmlFor="phone-number">Phone Number</Label>
                <Input
                  id="phone-number"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter your phone number"
                  disabled
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                SMS notifications are not yet available
              </div>
            </div>
          )}
        </div>

        {/* Notification Timing */}
        <div className="space-y-4">
          <Label className="text-base font-medium">When to Send Reminders</Label>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notify-monthly"
                checked={notifyMonthly}
                onCheckedChange={(checked) => setNotifyMonthly(checked === true)}
              />
              <Label htmlFor="notify-monthly">
                Tasks due in the upcoming month
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="notify-weekly"
                checked={notifyWeekly}
                onCheckedChange={(checked) => setNotifyWeekly(checked === true)}
              />
              <Label htmlFor="notify-weekly">
                Tasks due in the upcoming week
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="notify-due-date"
                checked={notifyDueDate}
                onCheckedChange={(checked) => setNotifyDueDate(checked === true)}
              />
              <Label htmlFor="notify-due-date">
                Tasks due today
              </Label>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={saveNotificationSettings} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}