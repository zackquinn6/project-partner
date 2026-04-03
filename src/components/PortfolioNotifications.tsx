import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Mail,
  MessageSquare,
  Bell,
  Calendar,
  Globe,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface PortfolioNotificationsProps {
  onSaved?: () => void;
}

export function PortfolioNotifications({ onSaved }: PortfolioNotificationsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const [emailEnabled, setEmailEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [notifyWeeklyBudget, setNotifyWeeklyBudget] = useState(false);
  const [notifyDailyTaskStatus, setNotifyDailyTaskStatus] = useState(false);
  const [timeZone, setTimeZone] = useState("");
  const [dailyLocalTime, setDailyLocalTime] = useState("09:00");
  const [zipSuggestionNote, setZipSuggestionNote] = useState<string | null>(null);
  const [resolvingZip, setResolvingZip] = useState(false);

  const [loadingSettings, setLoadingSettings] = useState(true);

  const ianaTimeZones = useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return [
        "UTC",
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "America/Phoenix",
        "America/Anchorage",
        "Pacific/Honolulu",
      ];
    }
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setLoadingSettings(false);
      return;
    }
    let cancelled = false;
    setLoadingSettings(true);
    (async () => {
      try {
        const [portfolioRes, profileRes] = await Promise.all([
          supabase
            .from("portfolio_notification_settings")
            .select(
              "email_enabled, email_address, sms_enabled, phone_number, notify_weekly_budget, notify_daily_task_status, notify_daily_celebrations, daily_notification_local_time",
            )
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("user_profiles")
            .select("time_zone")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);
        if (portfolioRes.error) throw portfolioRes.error;
        if (profileRes.error) {
          console.warn("user_profiles time_zone load:", profileRes.error);
        }
        if (cancelled) return;
        const data = portfolioRes.data;
        const profTz =
          typeof profileRes.data?.time_zone === "string"
            ? profileRes.data.time_zone.trim()
            : "";

        if (data) {
          setEmailEnabled(data.email_enabled === true);
          setEmailAddress(
            typeof data.email_address === "string" ? data.email_address : "",
          );
          setSmsEnabled(data.sms_enabled === true);
          setPhoneNumber(
            typeof data.phone_number === "string" ? data.phone_number : "",
          );
          setNotifyWeeklyBudget(data.notify_weekly_budget === true);
          setNotifyDailyTaskStatus(data.notify_daily_task_status === true);
          const dlt = data.daily_notification_local_time;
          if (typeof dlt === "string" && /^\d{2}:\d{2}$/.test(dlt)) {
            setDailyLocalTime(dlt);
          }
        } else {
          setEmailEnabled(!!user.email);
          setEmailAddress(user.email ?? "");
          setSmsEnabled(false);
          setPhoneNumber("");
          setNotifyWeeklyBudget(false);
          setNotifyDailyTaskStatus(false);
        }

        if (profTz) {
          setTimeZone(profTz);
          setZipSuggestionNote(null);
        } else {
          setTimeZone("");
          const { data: home } = await supabase
            .from("homes")
            .select("ZIP_code")
            .eq("user_id", user.id)
            .eq("is_primary", true)
            .maybeSingle();
          const zip =
            typeof home?.ZIP_code === "string" ? home.ZIP_code.trim() : "";
          if (zip) {
            const { data: tzBody, error: fnErr } =
              await supabase.functions.invoke<{
                time_zone?: string;
                error?: string;
              }>("resolve-timezone-from-zip", { body: { zip } });
            if (
              !cancelled &&
              !fnErr &&
              typeof tzBody?.time_zone === "string" &&
              tzBody.time_zone
            ) {
              setTimeZone(tzBody.time_zone);
              setZipSuggestionNote(
                `Time zone was filled in from your primary home ZIP (${zip}). Save to store it on your profile, or pick a different zone below.`,
              );
            }
          }
        }
      } catch (e) {
        if (!cancelled) console.error("Error loading portfolio notifications:", e);
      } finally {
        if (!cancelled) setLoadingSettings(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email]);

  const saveNotificationSettings = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const trimmedEmail = emailAddress.trim();
      const hm = dailyLocalTime.trim();
      const payload = {
        email_enabled: emailEnabled,
        email_address: trimmedEmail === "" ? null : trimmedEmail,
        sms_enabled: smsEnabled,
        phone_number: phoneNumber.trim() === "" ? null : phoneNumber.trim(),
        notify_weekly_budget: notifyWeeklyBudget,
        notify_daily_task_status: notifyDailyTaskStatus,
        notify_daily_celebrations: false,
        daily_notification_local_time: /^\d{2}:\d{2}$/.test(hm) ? hm : null,
        updated_at: new Date().toISOString(),
      };
      const { data: existing } = await supabase
        .from("portfolio_notification_settings")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing?.id) {
        const { error } = await supabase
          .from("portfolio_notification_settings")
          .update(payload)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("portfolio_notification_settings")
          .insert({ user_id: user.id, ...payload });
        if (error) throw error;
      }

      const tzTrim = timeZone.trim();
      const { error: profErr } = await supabase
        .from("user_profiles")
        .update({
          time_zone: tzTrim === "" ? null : tzTrim,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
      if (profErr) throw profErr;

            queueMicrotask(() => {
        onSaved?.();
      });
    } catch (error) {
      console.error("Error saving portfolio notification settings:", error);
      toast({
        title: "Error",
        description: "Failed to save notification settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const testEmailNotification = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please sign in to send a test email.",
        variant: "destructive",
      });
      return;
    }

    const testEmail = emailAddress.trim();
    if (!testEmail) {
      toast({
        title: "Error",
        description:
          "Enter an email address (then Save Settings) before sending a test.",
        variant: "destructive",
      });
      return;
    }

    const userName = (user.email ?? "").split("@")[0]?.trim();
    if (!userName) {
      toast({
        title: "Error",
        description: "Could not determine your name for the email.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      type: "test" as const,
      email: testEmail,
      userName,
    };
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-portfolio-reminder",
        { body: payload },
      );
      if (error) {
        let errMsg = "Failed to send test email";
        if (
          data &&
          typeof data === "object" &&
          "error" in data &&
          typeof (data as { error?: unknown }).error === "string"
        ) {
          errMsg = (data as { error: string }).error;
        } else {
          errMsg = (error as { message?: string }).message ?? errMsg;
          const errAny = error as { details?: string };
          if (errAny?.details && typeof errAny.details === "string") {
            try {
              const parsed = JSON.parse(errAny.details) as { error?: string };
              if (parsed?.error) errMsg = parsed.error;
            } catch {
              if (errAny.details.length < 200) errMsg = errAny.details;
            }
          }
        }
        throw new Error(errMsg);
      }
      if (
        data &&
        typeof data === "object" &&
        "error" in data &&
        (data as { error?: string }).error
      ) {
        throw new Error((data as { error: string }).error);
      }
          } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to send test email",
        variant: "destructive",
      });
    } finally {
      setSendingTest(false);
    }
  };

  const suggestTimeZoneFromZip = async () => {
    if (!user?.id) return;
    setResolvingZip(true);
    try {
      const { data: home } = await supabase
        .from("homes")
        .select("ZIP_code")
        .eq("user_id", user.id)
        .eq("is_primary", true)
        .maybeSingle();
      let zip =
        typeof home?.ZIP_code === "string" ? home.ZIP_code.trim() : "";
      if (!zip) {
        const { data: anyHome } = await supabase
          .from("homes")
          .select("ZIP_code")
          .eq("user_id", user.id)
          .not("ZIP_code", "is", null)
          .limit(1)
          .maybeSingle();
        zip =
          typeof anyHome?.ZIP_code === "string" ? anyHome.ZIP_code.trim() : "";
      }
      if (!zip) {
        toast({
          title: "No ZIP on file",
          description:
            "Add a ZIP code to a home in My Homes first, then try again.",
          variant: "destructive",
        });
        return;
      }
      const { data, error } = await supabase.functions.invoke<{
        time_zone?: string;
        error?: string;
      }>("resolve-timezone-from-zip", { body: { zip } });
      if (error) throw error;
      if (typeof data?.time_zone === "string" && data.time_zone) {
        setTimeZone(data.time_zone);
        setZipSuggestionNote(
          `Suggested from ZIP ${zip} (${data.time_zone}). Save to keep this on your profile.`,
        );
              } else {
        toast({
          title: "Could not resolve",
          description:
            data?.error ??
            "Check the ZIP code on your home, or pick a time zone manually.",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Error",
        description:
          e instanceof Error ? e.message : "Failed to resolve time zone.",
        variant: "destructive",
      });
    } finally {
      setResolvingZip(false);
    }
  };

  const useBrowserTimeZone = () => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      setTimeZone(tz);
      setZipSuggestionNote("Using this browser’s time zone. Save to store on your profile.");
    }
  };

  const showSMSNotAvailable = () => {
    toast({
      title: "SMS Not Available",
      description:
        "Text notifications are not yet available. Email notifications are fully supported.",
      variant: "destructive",
    });
  };

  return (
    <div className="space-y-4 md:space-y-6 text-xs md:text-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-2 text-sm md:text-base font-semibold leading-snug md:leading-snug">
          <Bell className="h-4 w-4 md:h-5 md:w-5 text-amber-500 shrink-0" />
          Stay on top of project and task activity. Turn on notifications so updates land where you already check every day.
        </h3>
        <Button
          type="button"
          onClick={() => void saveNotificationSettings()}
          disabled={saving || loadingSettings || !user?.id}
          size="sm"
          className="shrink-0"
        >
          {saving ? "Saving..." : loadingSettings ? "Loading..." : "Save"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="lg:col-span-1">
          <div className="space-y-3 md:space-y-4 rounded-md border border-dotted border-muted-foreground/40 bg-muted/10 p-3 md:p-4 h-full">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="portfolio-email-enabled"
                checked={emailEnabled}
                onCheckedChange={(checked) =>
                  setEmailEnabled(checked === true)
                }
                className="sm:h-5 sm:w-5 h-3 w-3 shrink-0"
              />
              <Label
                htmlFor="portfolio-email-enabled"
                className="flex items-center gap-1.5 text-xs md:text-sm"
              >
                <Mail className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
                Enable Email Notifications
              </Label>
              <Badge variant="secondary" className="text-[10px] md:text-xs">
                Available
              </Badge>
            </div>

            {emailEnabled && (
              <div className="ml-5 md:ml-6 space-y-2 md:space-y-3">
                <div className="max-w-xs">
                  <Label
                    htmlFor="portfolio-email-address"
                    className="text-xs md:text-sm"
                  >
                    Email Address
                  </Label>
                  <Input
                    id="portfolio-email-address"
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="Enter your email"
                    className="text-xs md:text-sm h-8 md:h-9"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 md:h-9"
                  onClick={testEmailNotification}
                  disabled={sendingTest || !user || !emailAddress?.trim()}
                >
                  {sendingTest ? "Sending…" : "Send Test Email"}
                </Button>
                <p className="text-[11px] md:text-xs text-muted-foreground">
                  We&apos;ll send a test to your email so you can confirm it
                  works.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="space-y-3 md:space-y-4 rounded-md border border-dotted border-muted-foreground/40 bg-muted/10 p-3 md:p-4 h-full">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="portfolio-sms-enabled"
                checked={smsEnabled}
                onCheckedChange={(checked) => {
                  if (checked) {
                    showSMSNotAvailable();
                  } else {
                    setSmsEnabled(false);
                  }
                }}
                className="sm:h-5 sm:w-5 h-3 w-3 shrink-0"
                disabled
              />
              <Label
                htmlFor="portfolio-sms-enabled"
                className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground"
              >
                <MessageSquare className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
                Enable SMS Notifications
              </Label>
              <Badge variant="outline" className="text-[10px] md:text-xs">
                Coming Soon
              </Badge>
            </div>

            <div className="ml-5 md:ml-6 space-y-2 md:space-y-3">
              <div className="max-w-xs">
                <Label
                  htmlFor="portfolio-phone-number"
                  className="text-xs md:text-sm text-muted-foreground"
                >
                  Phone Number
                </Label>
                <Input
                  id="portfolio-phone-number"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter your phone number"
                  disabled
                  className="text-xs md:text-sm h-8 md:h-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 md:h-9"
                disabled
              >
                Send Test SMS
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 md:space-y-4">
        <Label className="text-xs md:text-base font-medium flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground shrink-0" />
          Notifications
        </Label>

        <div className="space-y-2 md:space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="notify-weekly-budget"
              checked={notifyWeeklyBudget}
              onCheckedChange={(checked) =>
                setNotifyWeeklyBudget(checked === true)
              }
              className="sm:h-5 sm:w-5 h-3 w-3 shrink-0"
            />
            <Label htmlFor="notify-weekly-budget" className="text-xs md:text-sm">
              Open task report (weekly)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="notify-daily-task-status"
              checked={notifyDailyTaskStatus}
              onCheckedChange={(checked) =>
                setNotifyDailyTaskStatus(checked === true)
              }
              className="sm:h-5 sm:w-5 h-3 w-3 shrink-0"
            />
            <Label
              htmlFor="notify-daily-task-status"
              className="text-xs md:text-sm"
            >
              Open task report (daily)
            </Label>
          </div>

          {notifyDailyTaskStatus ? (
            <div className="mt-4 space-y-3 rounded-md border border-border/60 bg-background/80 p-3 md:p-4">
              <div className="flex items-center gap-2 text-xs md:text-sm font-medium">
                <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                Daily digest — time &amp; region
              </div>
              <p className="text-[11px] md:text-xs text-muted-foreground leading-relaxed">
                The daily email lists workflow tasks from your Timekeeper schedule that are due
                today and tasks that were due before today, with reminders to update status in the
                app. Delivery uses your region&apos;s local date and the time you choose.
              </p>
              {zipSuggestionNote ? (
                <Alert>
                  <AlertTitle className="text-sm">Time zone</AlertTitle>
                  <AlertDescription className="text-xs">
                    {zipSuggestionNote}
                  </AlertDescription>
                </Alert>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="daily-local-time" className="text-xs md:text-sm">
                    Daily notification time
                  </Label>
                  <Input
                    id="daily-local-time"
                    type="time"
                    value={dailyLocalTime}
                    onChange={(e) => setDailyLocalTime(e.target.value)}
                    className="text-xs md:text-sm h-8 md:h-9 w-full max-w-[200px]"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="workflow-time-zone" className="text-xs md:text-sm">
                    Time zone (IANA)
                  </Label>
                  <select
                    id="workflow-time-zone"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs md:text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring max-h-[min(40vh,240px)]"
                    value={timeZone}
                    onChange={(e) => {
                      setTimeZone(e.target.value);
                      setZipSuggestionNote(null);
                    }}
                  >
                    <option value="">Select time zone…</option>
                    {ianaTimeZones.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  disabled={resolvingZip || !user?.id}
                  onClick={() => void suggestTimeZoneFromZip()}
                >
                  {resolvingZip ? "Looking up…" : "Suggest from home ZIP"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={useBrowserTimeZone}
                >
                  Use this device’s time zone
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Email wording includes: &quot;These things were supposed to get done today, did
                they?&quot; and a separate section for overdue work: &quot;These tasks are due as of
                yesterday&quot; — plus a reminder to update task status in your workflow.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
