import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";
import { getRequiredSecret } from "../_shared/auth.ts";
import { escapeHtml } from "../_shared/validation.ts";
import {
  collectDigestLines,
  fetchStateFromUsZip,
  formatDateInIana,
  formatHmInIana,
  ianaFromStateAbbrev,
  isWithinDailyWindow,
} from "../_shared/workflowDigest.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

/**
 * Invoke on a schedule (e.g. every 10 minutes) with header:
 *   x-cron-secret: CRON_SECRET
 * Env: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, RESEND_API_KEY, CRON_SECRET
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
    const sent = req.headers.get("x-cron-secret") ?? "";
    if (!cronSecret || sent !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const resendKey = getRequiredSecret("RESEND_API_KEY");
    const resend = new Resend(resendKey);

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: rows, error: qErr } = await supabase
      .from("portfolio_notification_settings")
      .select(
        "user_id, email_address, email_enabled, notify_daily_task_status, daily_notification_local_time, last_daily_task_digest_for_local_date",
      )
      .eq("notify_daily_task_status", true)
      .eq("email_enabled", true);

    if (qErr) throw qErr;

    const now = new Date();
    let processed = 0;
    let sentCount = 0;

    for (const row of rows ?? []) {
      const userId = row.user_id as string;
      processed += 1;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("time_zone")
        .eq("user_id", userId)
        .maybeSingle();

      let iana = typeof profile?.time_zone === "string" && profile.time_zone.trim()
        ? profile.time_zone.trim()
        : null;

      if (!iana) {
        let zip: string | null = null;
        const { data: primaryHome } = await supabase
          .from("homes")
          .select("ZIP_code")
          .eq("user_id", userId)
          .eq("is_primary", true)
          .maybeSingle();
        if (typeof primaryHome?.ZIP_code === "string" && primaryHome.ZIP_code.trim()) {
          zip = primaryHome.ZIP_code.trim();
        }
        if (!zip) {
          const { data: anyHome } = await supabase
            .from("homes")
            .select("ZIP_code")
            .eq("user_id", userId)
            .not("ZIP_code", "is", null)
            .limit(1)
            .maybeSingle();
          if (typeof anyHome?.ZIP_code === "string" && anyHome.ZIP_code.trim()) {
            zip = anyHome.ZIP_code.trim();
          }
        }
        if (zip) {
          const st = await fetchStateFromUsZip(zip);
          if (st) iana = ianaFromStateAbbrev(st);
        }
      }

      if (!iana) {
        console.warn(
          `daily-workflow-task-digest: skip user ${userId} — no time_zone and could not derive from ZIP`,
        );
        continue;
      }

      const targetHm =
        typeof row.daily_notification_local_time === "string" &&
          /^\d{2}:\d{2}$/.test(row.daily_notification_local_time)
          ? row.daily_notification_local_time
          : "09:00";

      if (!isWithinDailyWindow(now, iana, targetHm, 12)) {
        continue;
      }

      const todayLocal = formatDateInIana(now, iana);
      if (row.last_daily_task_digest_for_local_date === todayLocal) {
        continue;
      }

      const { data: runs, error: runsErr } = await supabase
        .from("project_runs")
        .select(
          "id, name, custom_project_name, schedule_events, completed_steps, status",
        )
        .eq("user_id", userId)
        .in("status", ["not-started", "in-progress"]);

      if (runsErr) {
        console.error("runs fetch", runsErr);
        continue;
      }

      const { dueToday, overdue } = collectDigestLines(runs ?? [], todayLocal);

      const emailTo = (row.email_address as string | null)?.trim() || null;
      if (!emailTo) continue;

      const linesToHtml = (items: typeof dueToday) =>
        items.length === 0
          ? `<p style="margin:0;color:#9CA3AF;font-size:14px;">None right now.</p>`
          : `<ul style="margin:8px 0 0 18px;padding:0;color:#E5E7EB;font-size:14px;line-height:1.5;">${items.map((l) =>
            `<li><strong>${escapeHtml(l.runName)}</strong> — ${escapeHtml(l.taskLabel)} <span style="color:#9CA3AF;">(${escapeHtml(l.scheduledDate)})</span></li>`
          ).join("")}</ul>`;

      const intro =
        `Local date: ${escapeHtml(todayLocal)} · Your time (${escapeHtml(iana)}): ${escapeHtml(formatHmInIana(now, iana))}`;

      const bodyText = [
        `${intro}\n\n`,
        `These things were supposed to get done today, did they?\n`,
        dueToday.length
          ? dueToday.map((l) => `• ${l.runName} — ${l.taskLabel}`).join("\n")
          : "• None right now.",
        `\n\nThese tasks are due as of yesterday\n`,
        overdue.length
          ? overdue.map((l) => `• ${l.runName} — ${l.taskLabel}`).join("\n")
          : "• None right now.",
        `\n\nBe sure to update status on these tasks in your workflow.`,
      ].join("");

      const htmlContent = `
        <div style="max-width:640px;margin:0 auto;padding:24px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#F9FAFB;background-color:#000000;">
          <div style="text-align:left;margin-bottom:24px;">
            <span style="display:inline-block;font-size:28px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:#F97316;">Project Partner</span>
          </div>
          <div style="background-color:#111827;border-radius:12px;padding:24px 20px;border:1px solid #4B5563;">
            <h2 style="margin:0 0 12px;font-size:20px;color:#F97316;">Daily workflow check-in</h2>
            <p style="margin:0 0 20px;font-size:13px;color:#9CA3AF;">${intro}</p>
            <h3 style="margin:0 0 8px;font-size:16px;color:#FBBF24;">These things were supposed to get done today, did they?</h3>
            ${linesToHtml(dueToday)}
            <h3 style="margin:24px 0 8px;font-size:16px;color:#F87171;">These tasks are due as of yesterday</h3>
            ${linesToHtml(overdue)}
            <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#F9FAFB;">Be sure to update status on these tasks in your workflow.</p>
          </div>
        </div>`;

      const emailResult = await resend.emails.send({
        from: "Project Partner <onboarding@resend.dev>",
        to: [emailTo],
        subject: `Today’s project tasks — ${todayLocal}`,
        html: htmlContent,
      });

      if (emailResult.error) {
        console.error("Resend error", emailResult.error);
        continue;
      }

      await supabase.from("notifications").insert({
        user_id: userId,
        type: "daily_workflow_tasks",
        title: "Today’s scheduled work & overdue tasks",
        body: bodyText,
        metadata: {
          local_date: todayLocal,
          time_zone: iana,
          due_today_count: dueToday.length,
          overdue_count: overdue.length,
        },
      });

      await supabase
        .from("portfolio_notification_settings")
        .update({
          last_daily_task_digest_for_local_date: todayLocal,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      sentCount += 1;
    }

    return new Response(
      JSON.stringify({ ok: true, processed, sent: sentCount }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (e) {
    console.error("daily-workflow-task-digest", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});
