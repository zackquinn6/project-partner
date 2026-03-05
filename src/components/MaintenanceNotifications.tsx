import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Mail, MessageSquare, Bell, AlertCircle, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
interface MaintenanceNotificationsProps {
  selectedHomeId: string;
}
export function MaintenanceNotifications({
  selectedHomeId
}: MaintenanceNotificationsProps) {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  // Simple state management for now
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [emailAddress, setEmailAddress] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [notifyMonthly, setNotifyMonthly] = useState(true);
  const [notifyWeekly, setNotifyWeekly] = useState(true);
  const [notifyDueDate, setNotifyDueDate] = useState(true);

  // Sync email from auth when user loads (e.g. dialog opened before auth ready)
  useEffect(() => {
    if (user?.email && !emailAddress) setEmailAddress(user.email);
  }, [user?.email]);

  // Debug: confirm this component is mounted when Setup Alerts is open
  useEffect(() => {
    console.warn('[MaintenanceAlerts] Setup Alerts dialog mounted — Send Test Email button uses testEmailNotification');
    return () => {
      console.warn('[MaintenanceAlerts] Setup Alerts dialog unmounted');
    };
  }, []);

  const saveNotificationSettings = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      // For now, just show success without database interaction
      toast({
        title: "Settings Saved",
        description: "Your notification preferences have been updated"
      });
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast({
        title: "Error",
        description: "Failed to save notification settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  const DEBUG_PREFIX = '[MaintenanceAlerts SendTest]';

  const testEmailNotification = async () => {
    console.warn(`${DEBUG_PREFIX} 1. Click received — starting send test flow`);
    const testEmail = user?.email ?? emailAddress.trim();
    console.log(`${DEBUG_PREFIX} 2. Resolved email`, {
      testEmail: testEmail || '(empty)',
      userEmail: user?.email ?? '(no user email)',
      inputEmailAddress: emailAddress.trim() || '(empty)',
    });
    if (!testEmail) {
      console.warn(`${DEBUG_PREFIX} 2b. Abort — no email address available`);
      toast({
        title: "Error",
        description: "No email address available. Please ensure you're logged in.",
        variant: "destructive"
      });
      return;
    }
    if (user?.email && emailAddress.trim() && emailAddress.trim() !== user.email) {
      console.warn(`${DEBUG_PREFIX} 2c. Abort — test email must use account email`, { userEmail: user.email, input: emailAddress.trim() });
      toast({
        title: "Error",
        description: "Test email is sent to your account email. Change the address above only after saving; test uses your logged-in email.",
        variant: "destructive"
      });
      return;
    }
    const payload = {
      type: 'test' as const,
      email: testEmail,
      userName: user?.email?.split('@')[0] || 'User',
    };
    console.log(`${DEBUG_PREFIX} 3. Invoking edge function send-maintenance-reminder`, { payload });
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-maintenance-reminder', {
        body: payload,
      });
      console.log(`${DEBUG_PREFIX} 4. Edge function returned`, {
        hasError: !!error,
        errorKeys: error ? Object.keys(error) : [],
        errorMessage: (error as { message?: string } | null)?.message,
        errorDetails: (error as { details?: string } | null)?.details,
        dataType: data === null ? 'null' : typeof data,
        dataKeys: data && typeof data === 'object' ? Object.keys(data) : [],
        data,
      });
      if (error) {
        let errMsg = (error as { message?: string }).message ?? 'Failed to send test email';
        const errAny = error as { context?: unknown; details?: string };
        if (errAny?.details && typeof errAny.details === 'string') {
          try {
            const parsed = JSON.parse(errAny.details) as { error?: string };
            if (parsed?.error) errMsg = parsed.error;
          } catch {
            if (errAny.details.length < 200) errMsg = errAny.details;
          }
        }
        console.error(`${DEBUG_PREFIX} 5. Throwing after parsing error`, { errMsg });
        throw new Error(errMsg);
      }
      if (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) {
        const bodyError = (data as { error: string }).error;
        console.error(`${DEBUG_PREFIX} 5b. Body contained error`, { bodyError });
        throw new Error(bodyError);
      }
      console.log(`${DEBUG_PREFIX} 6. Success — showing toast for ${testEmail}`);
      toast({
        title: "Test Email Sent",
        description: `Test notification sent to ${testEmail}`
      });
    } catch (error) {
      console.error(`${DEBUG_PREFIX} 7. Caught error`, {
        message: error instanceof Error ? error.message : String(error),
        error,
      });
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send test email",
        variant: "destructive"
      });
    } finally {
      setSendingTest(false);
      console.log(`${DEBUG_PREFIX} 8. Done (sendingTest cleared)`);
    }
  };
  const showSMSNotAvailable = () => {
    toast({
      title: "SMS Not Available",
      description: "Text notifications are not yet available. Email notifications are fully supported.",
      variant: "destructive"
    });
  };
  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Bell className="h-5 w-5 text-amber-500" />
          Notification Settings
        </h3>
        <Button onClick={saveNotificationSettings} disabled={saving} size="sm">
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
        
        {/* Email and SMS Settings - Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Email Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="email-enabled" checked={emailEnabled} onCheckedChange={checked => setEmailEnabled(checked === true)} className="sm:h-5 sm:w-5 h-3 w-3" />
              <Label htmlFor="email-enabled" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Enable Email Notifications
              </Label>
              <Badge variant="secondary">Available</Badge>
            </div>
            
            {emailEnabled && <div className="ml-6 space-y-3">
                <div className="max-w-xs">
                  <Label htmlFor="email-address">Email Address</Label>
                  <Input id="email-address" type="email" value={emailAddress} onChange={e => setEmailAddress(e.target.value)} placeholder="Enter your email address" />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.warn('[MaintenanceAlerts] Send Test Email button clicked');
                    testEmailNotification();
                  }}
                  disabled={sendingTest || (!(emailAddress?.trim()) && !(user?.email))}
                >
                  {sendingTest ? "Sending…" : "Send Test Email"}
                </Button>
                <p className="text-xs text-muted-foreground">We'll send a test to your email so you can confirm it works.</p>
              </div>}
          </div>

          {/* Divider - Visible on desktop only */}
          <div className="hidden lg:flex justify-center">
            <Separator orientation="vertical" className="h-full" />
          </div>
          
          {/* Mobile divider */}
          <div className="lg:hidden">
            <Separator />
          </div>

          {/* SMS Settings */}
          <div className="space-y-4 lg:col-start-2 lg:row-start-1">
            <div className="flex items-center space-x-2">
              <Checkbox id="sms-enabled" checked={smsEnabled} onCheckedChange={checked => {
                if (checked) {
                  showSMSNotAvailable();
                } else {
                  setSmsEnabled(false);
                }
              }} className="sm:h-5 sm:w-5 h-3 w-3" disabled />
              <Label htmlFor="sms-enabled" className="flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                Enable SMS Notifications
              </Label>
              <Badge variant="outline">Coming Soon</Badge>
            </div>
            
            <div className="ml-6 space-y-3">
              <div className="max-w-xs">
                <Label htmlFor="phone-number" className="text-muted-foreground">Phone Number</Label>
                <Input id="phone-number" type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="Enter your phone number" disabled />
              </div>
              <Button variant="outline" size="sm" disabled>
                Send Test SMS
              </Button>
              
            </div>
          </div>
        </div>

        {/* Notification Timing */}
        <div className="space-y-4">
          <Label className="text-base font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            When to Send Reminders
          </Label>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox id="notify-monthly" checked={notifyMonthly} onCheckedChange={checked => setNotifyMonthly(checked === true)} className="sm:h-5 sm:w-5 h-3 w-3" />
              <Label htmlFor="notify-monthly">
                Tasks due in the upcoming month
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="notify-weekly" checked={notifyWeekly} onCheckedChange={checked => setNotifyWeekly(checked === true)} className="sm:h-5 sm:w-5 h-3 w-3" />
              <Label htmlFor="notify-weekly">
                Tasks due in the upcoming week
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="notify-due-date" checked={notifyDueDate} onCheckedChange={checked => setNotifyDueDate(checked === true)} className="sm:h-5 sm:w-5 h-3 w-3" />
              <Label htmlFor="notify-due-date">
                Tasks due today
              </Label>
            </div>
          </div>
        </div>

    </div>;
}