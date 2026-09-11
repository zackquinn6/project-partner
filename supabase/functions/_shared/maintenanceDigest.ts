import { Resend } from "npm:resend@2.0.0";
import { escapeHtml } from "./validation.ts";
import {
  fetchStateFromUsZip,
  formatDateInIana,
  ianaFromStateAbbrev,
} from "./workflowDigest.ts";

export type MaxReminderFrequency = "weekly" | "biweekly" | "monthly" | "quarterly";

const FREQUENCY_MIN_DAYS: Record<MaxReminderFrequency, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
};

function parseFrequency(raw: unknown): MaxReminderFrequency | null {
  if (raw === "weekly" || raw === "biweekly" || raw === "monthly" || raw === "quarterly") {
    return raw;
  }
  return null;
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function taskDueYmd(nextDue: string): string {
  // next_due may be date or timestamptz; take calendar date portion
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(nextDue.trim());
  if (!m) throw new Error(`Invalid next_due: ${nextDue}`);
  return m[1];
}

type SettingsRow = {
  user_id: string;
  email_address: string | null;
  email_enabled: boolean | null;
  notify_monthly: boolean | null;
  notify_weekly: boolean | null;
  notify_due_date: boolean | null;
  max_reminder_frequency: string | null;
  last_reminder_sent_at: string | null;
};

type TaskRow = {
  title: string;
  category: string | null;
  next_due: string;
};

type SupabaseLike = {
  from: (table: string) => {
    select: (cols: string) => any;
    update: (vals: Record<string, unknown>) => any;
  };
};

async function resolveIana(
  supabase: SupabaseLike,
  userId: string,
): Promise<string | null> {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("time_zone")
    .eq("user_id", userId)
    .maybeSingle();

  if (typeof profile?.time_zone === "string" && profile.time_zone.trim()) {
    return profile.time_zone.trim();
  }

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
    if (st) return ianaFromStateAbbrev(st);
  }
  return null;
}

function daysSince(iso: string, now: Date): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  return (now.getTime() - then) / (1000 * 60 * 60 * 24);
}

function pickTasks(
  tasks: TaskRow[],
  todayLocal: string,
  notifyDueDate: boolean,
  notifyWeekly: boolean,
  notifyMonthly: boolean,
): TaskRow[] {
  const weekEnd = addDaysYmd(todayLocal, 7);
  const monthEnd = addDaysYmd(todayLocal, 30);
  const out: TaskRow[] = [];
  const seen = new Set<string>();

  for (const t of tasks) {
    let due: string;
    try {
      due = taskDueYmd(t.next_due);
    } catch {
      continue;
    }
    const include =
      (notifyDueDate && due <= todayLocal) ||
      (notifyWeekly && due <= weekEnd) ||
      (notifyMonthly && due <= monthEnd);
    if (!include) continue;
    const key = `${t.title}|${due}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }

  out.sort((a, b) => taskDueYmd(a.next_due).localeCompare(taskDueYmd(b.next_due)));
  return out;
}

/**
 * Sends maintenance reminder emails for eligible users.
 * Respects max_reminder_frequency and notify_* horizon flags.
 * Safe to invoke from multiple cron entrypoints in the same hour (last_reminder_sent_at gate).
 */
export async function processMaintenanceReminders(
  supabase: SupabaseLike,
  resend: Resend,
  now = new Date(),
): Promise<{ processed: number; sent: number }> {
  const { data: rows, error: qErr } = await supabase
    .from("maintenance_notification_settings")
    .select(
      "user_id, email_address, email_enabled, notify_monthly, notify_weekly, notify_due_date, max_reminder_frequency, last_reminder_sent_at",
    )
    .eq("email_enabled", true);

  if (qErr) throw qErr;

  let processed = 0;
  let sent = 0;

  for (const row of (rows ?? []) as SettingsRow[]) {
    const userId = row.user_id;
    processed += 1;

    const notifyMonthly = row.notify_monthly === true;
    const notifyWeekly = row.notify_weekly === true;
    const notifyDueDate = row.notify_due_date === true;
    if (!notifyMonthly && !notifyWeekly && !notifyDueDate) continue;

    const emailTo = (row.email_address ?? "").trim();
    if (!emailTo) {
      console.warn(`maintenance-reminders: skip ${userId} — no email_address`);
      continue;
    }

    const frequency = parseFrequency(row.max_reminder_frequency);
    if (!frequency) {
      console.warn(`maintenance-reminders: skip ${userId} — invalid max_reminder_frequency`);
      continue;
    }
    const minDays = FREQUENCY_MIN_DAYS[frequency];
    if (row.last_reminder_sent_at && daysSince(row.last_reminder_sent_at, now) < minDays) {
      continue;
    }

    let iana: string | null;
    try {
      iana = await resolveIana(supabase, userId);
    } catch (e) {
      console.error(`maintenance-reminders: TZ resolve failed for ${userId}`, e);
      continue;
    }
    if (!iana) {
      console.warn(`maintenance-reminders: skip ${userId} — no time_zone / ZIP`);
      continue;
    }

    const todayLocal = formatDateInIana(now, iana);

    const { data: tasks, error: tasksErr } = await supabase
      .from("user_maintenance_tasks")
      .select("title, category, next_due")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (tasksErr) {
      console.error(`maintenance-reminders: tasks fetch ${userId}`, tasksErr);
      continue;
    }

    const matched = pickTasks(
      (tasks ?? []) as TaskRow[],
      todayLocal,
      notifyDueDate,
      notifyWeekly,
      notifyMonthly,
    );
    if (matched.length === 0) continue;

    const userName = emailTo.split("@")[0]?.trim();
    if (!userName) continue;

    const taskListHtml = matched
      .map((task) => {
        const due = taskDueYmd(task.next_due);
        const cat = task.category?.trim();
        return `
            <div style="border-left:4px solid #F97316;padding-left:15px;margin:15px 0;">
              <h4 style="margin:0;color:#F9FAFB;">${escapeHtml(task.title)}</h4>
              <p style="margin:5px 0;color:#9CA3AF;">
                ${cat ? `Category: ${escapeHtml(cat)} | ` : ""}Due: ${escapeHtml(due)}
              </p>
            </div>`;
      })
      .join("");

    const subject = `Home Maintenance Reminder — ${matched.length} task${matched.length === 1 ? "" : "s"}`;
    const htmlContent = `
        <div style="max-width:640px;margin:0 auto;padding:24px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#F9FAFB;background-color:#000000;">
          <div style="text-align:left;margin-bottom:24px;">
            <span style="display:inline-block;font-size:28px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:#F97316;">Project Partner</span>
          </div>
          <div style="background-color:#111827;border-radius:12px;padding:24px 20px;border:1px solid #4B5563;">
            <h2 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#F97316;">Home Maintenance Reminder</h2>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#F9FAFB;">Hello ${escapeHtml(userName)},</p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#E5E7EB;">
              You have ${matched.length} maintenance task${matched.length === 1 ? "" : "s"} that need attention (as of ${escapeHtml(todayLocal)}):
            </p>
            <div style="background:#0B1220;padding:12px 16px;border-radius:8px;margin:12px 0 20px;">
              ${taskListHtml}
            </div>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#D1D5DB;">
              Regular maintenance helps prevent costly repairs and keeps your home in excellent condition.
            </p>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#E5E7EB;">
              Log into Project Partner to mark tasks complete and track your progress.
            </p>
            <p style="margin:0;font-size:14px;line-height:1.6;color:#9CA3AF;">— The Project Partner Team</p>
          </div>
        </div>`;

    const emailResult = await resend.emails.send({
      from: "Project Partner <onboarding@resend.dev>",
      to: [emailTo],
      subject,
      html: htmlContent,
    });

    if (emailResult.error) {
      console.error(`maintenance-reminders: Resend error ${userId}`, emailResult.error);
      continue;
    }

    const sentAt = now.toISOString();
    const { error: updErr } = await supabase
      .from("maintenance_notification_settings")
      .update({
        last_reminder_sent_at: sentAt,
        updated_at: sentAt,
      })
      .eq("user_id", userId);

    if (updErr) {
      console.error(`maintenance-reminders: failed to stamp last_reminder_sent_at ${userId}`, updErr);
    }

    sent += 1;
  }

  return { processed, sent };
}
