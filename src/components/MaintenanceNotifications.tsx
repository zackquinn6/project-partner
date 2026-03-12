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
  onSaved?: () => void;
}
export function MaintenanceNotifications({
  selectedHomeId,
  onSaved,
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

  // Load saved notification settings when user is available
  const [loadingSettings, setLoadingSettings] = useState(true);
  useEffect(() => {
    if (!user?.id || !selectedHomeId) {
      setLoadingSettings(false);
      return;
    }
    let cancelled = false;
    setLoadingSettings(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from('maintenance_notification_settings')
          .select('email_enabled, email_address, sms_enabled, phone_number, notify_monthly, notify_weekly, notify_due_date')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) throw error;
        if (!cancelled && data) {
          setEmailEnabled(data.email_enabled ?? true);
          setEmailAddress(data.email_address ?? user.email ?? '');
          setSmsEnabled(data.sms_enabled ?? false);
          setPhoneNumber(data.phone_number ?? '');
          setNotifyMonthly(data.notify_monthly ?? true);
          setNotifyWeekly(data.notify_weekly ?? true);
          setNotifyDueDate(data.notify_due_date ?? true);
        }
      } catch (e) {
        if (!cancelled) console.error('Error loading notification settings:', e);
      } finally {
        if (!cancelled) setLoadingSettings(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, user?.email, selectedHomeId]);

  const saveNotificationSettings = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const payload = {
        email_enabled: emailEnabled,
        email_address: emailAddress.trim() || null,
        sms_enabled: smsEnabled,
        phone_number: phoneNumber.trim() || null,
        notify_monthly: notifyMonthly,
        notify_weekly: notifyWeekly,
        notify_due_date: notifyDueDate,
        updated_at: new Date().toISOString(),
      };
      const { data: existing } = await supabase
        .from('maintenance_notification_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (existing?.id) {
        const { error } = await supabase
          .from('maintenance_notification_settings')
          .update(payload)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('maintenance_notification_settings')
          .insert({ user_id: user.id, ...payload });
        if (error) throw error;
      }
      toast({
        title: "Settings Saved",
        description: "Your notification preferences have been updated.",
      });
      // Defer close so the dialog state update runs after toast and focus handling
      setTimeout(() => onSaved?.(), 0);
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast({
        title: "Error",
        description: "Failed to save notification settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  const DEBUG_PREFIX = '[MaintenanceAlerts SendTest]';

  const testEmailNotification = async () => {
    console.warn(`${DEBUG_PREFIX} 1. Click received — starting send test flow`);
    if (!user) {
      toast({
        title: "Error",
        description: "Please sign in to send a test email.",
        variant: "destructive"
      });
      return;
    }

    const testEmail = emailAddress.trim();
    console.log(`${DEBUG_PREFIX} 2. Resolved email`, {
      testEmail: testEmail || '(empty)',
      userEmail: user?.email ?? '(no user email)',
      inputEmailAddress: emailAddress.trim() || '(empty)',
    });
    if (!testEmail) {
      console.warn(`${DEBUG_PREFIX} 2b. Abort — no email address available`);
      toast({
        title: "Error",
        description: "Enter an email address (then Save Settings) before sending a test.",
        variant: "destructive"
      });
      return;
    }

    const userName = (user.email ?? '').split('@')[0]?.trim();
    if (!userName) {
      toast({
        title: "Error",
        description: "Could not determine your name for the email.",
        variant: "destructive"
      });
      return;
    }
    const payload = {
      type: 'test' as const,
      email: testEmail,
      userName,
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
  return <div className="space-y-4 md:space-y-6 text-sm md:text-base">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-2 text-base md:text-lg font-semibold">
          <Bell className="h-4 w-4 md:h-5 md:w-5 text-amber-500 shrink-0" />
          Notification Settings
        </h3>
        <Button onClick={saveNotificationSettings} disabled={saving || loadingSettings} size="sm" className="shrink-0">
          {saving ? "Saving..." : loadingSettings ? "Loading..." : "Save Settings"}
        </Button>
      </div>
        
        {/* Email and SMS Settings - Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          
          {/* Email Settings */}
          <div className="space-y-3 md:space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="email-enabled" checked={emailEnabled} onCheckedChange={checked => setEmailEnabled(checked === true)} className="sm:h-5 sm:w-5 h-3 w-3 shrink-0" />
              <Label htmlFor="email-enabled" className="flex items-center gap-1.5 text-xs md:text-sm">
                <Mail className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
                Enable Email Notifications
              </Label>
              <Badge variant="secondary" className="text-[10px] md:text-xs">Available</Badge>
            </div>
            
            {emailEnabled && <div className="ml-5 md:ml-6 space-y-2 md:space-y-3">
                <div className="max-w-xs">
                  <Label htmlFor="email-address" className="text-xs md:text-sm">Email Address</Label>
                  <Input id="email-address" type="email" value={emailAddress} onChange={e => setEmailAddress(e.target.value)} placeholder="Enter your email" className="text-xs md:text-sm h-8 md:h-9" />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 md:h-9"
                  onClick={() => {
                    console.warn('[MaintenanceAlerts] Send Test Email button clicked');
                    testEmailNotification();
                  }}
                  disabled={sendingTest || !user || !emailAddress?.trim()}
                >
                  {sendingTest ? "Sending…" : "Send Test Email"}
                </Button>
                <p className="text-[11px] md:text-xs text-muted-foreground">We'll send a test to your email so you can confirm it works.</p>
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
          <div className="space-y-3 md:space-y-4 lg:col-start-2 lg:row-start-1">
            <div className="flex items-center space-x-2">
              <Checkbox id="sms-enabled" checked={smsEnabled} onCheckedChange={checked => {
                if (checked) {
                  showSMSNotAvailable();
                } else {
                  setSmsEnabled(false);
                }
              }} className="sm:h-5 sm:w-5 h-3 w-3 shrink-0" disabled />
              <Label htmlFor="sms-enabled" className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
                Enable SMS Notifications
              </Label>
              <Badge variant="outline" className="text-[10px] md:text-xs">Coming Soon</Badge>
            </div>
            
            <div className="ml-5 md:ml-6 space-y-2 md:space-y-3">
              <div className="max-w-xs">
                <Label htmlFor="phone-number" className="text-xs md:text-sm text-muted-foreground">Phone Number</Label>
                <Input id="phone-number" type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="Enter your phone number" disabled className="text-xs md:text-sm h-8 md:h-9" />
              </div>
              <Button variant="outline" size="sm" className="text-xs h-8 md:h-9" disabled>
                Send Test SMS
              </Button>
            </div>
          </div>
        </div>

        {/* Notification Timing */}
        <div className="space-y-3 md:space-y-4">
          <Label className="text-xs md:text-base font-medium flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground shrink-0" />
            When to Send Reminders
          </Label>
          
          <div className="space-y-2 md:space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox id="notify-monthly" checked={notifyMonthly} onCheckedChange={checked => setNotifyMonthly(checked === true)} className="sm:h-5 sm:w-5 h-3 w-3 shrink-0" />
              <Label htmlFor="notify-monthly" className="text-xs md:text-sm">
                Tasks due in the upcoming month
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="notify-weekly" checked={notifyWeekly} onCheckedChange={checked => setNotifyWeekly(checked === true)} className="sm:h-5 sm:w-5 h-3 w-3 shrink-0" />
              <Label htmlFor="notify-weekly" className="text-xs md:text-sm">
                Tasks due in the upcoming week
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="notify-due-date" checked={notifyDueDate} onCheckedChange={checked => setNotifyDueDate(checked === true)} className="sm:h-5 sm:w-5 h-3 w-3 shrink-0" />
              <Label htmlFor="notify-due-date" className="text-xs md:text-sm">
                Tasks due today
              </Label>
            </div>
          </div>
        </div>

    </div>;
}