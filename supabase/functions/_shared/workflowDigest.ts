import { US_STATE_ABBREV_TO_PRIMARY_IANA } from "./usStatePrimaryTimeZone.ts";

export function formatDateInIana(date: Date, iana: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: iana,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !d) throw new Error("Could not format local date");
  return `${y}-${m}-${d}`;
}

export function formatHmInIana(date: Date, iana: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: iana,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const min = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h.padStart(2, "0")}:${min.padStart(2, "0")}`;
}

function toMinutes(hm: string): number {
  const [h, m] = hm.split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
}

/** True if current local HM is within `windowMinutes` of target HM (same calendar day in zone). */
export function isWithinDailyWindow(
  now: Date,
  iana: string,
  targetHm: string,
  windowMinutes: number,
): boolean {
  const cur = toMinutes(formatHmInIana(now, iana));
  const tgt = toMinutes(targetHm);
  if (cur < 0 || tgt < 0) return false;
  const diff = Math.abs(cur - tgt);
  const wrap = 24 * 60 - diff;
  return Math.min(diff, wrap) <= windowMinutes;
}

export function parseCompletedSteps(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string");
  }
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function isSchedulerTaskCompleted(completedSteps: string[], taskId: string): boolean {
  if (!taskId) return false;
  return completedSteps.some(
    (c) => c === taskId || (typeof c === "string" && c.startsWith(`${taskId}:`)),
  );
}

export interface ScheduleEventRow {
  id: string;
  date: string;
  phaseId?: string;
  operationId?: string;
  notes?: string;
}

export interface DigestLine {
  runId: string;
  runName: string;
  taskLabel: string;
  scheduledDate: string;
}

export function collectDigestLines(
  runs: Array<{
    id: string;
    name: string | null;
    custom_project_name: string | null;
    schedule_events: unknown;
    completed_steps: unknown;
    status: string | null;
  }>,
  todayYmd: string,
): { dueToday: DigestLine[]; overdue: DigestLine[] } {
  const dueToday: DigestLine[] = [];
  const overdue: DigestLine[] = [];

  for (const run of runs) {
    if (run.status !== "in-progress" && run.status !== "not-started") continue;
    const runName =
      (typeof run.custom_project_name === "string" && run.custom_project_name.trim()
        ? run.custom_project_name.trim()
        : null) ??
      (typeof run.name === "string" && run.name.trim() ? run.name.trim() : run.id);

    let se = run.schedule_events;
    if (typeof se === "string") {
      try {
        se = JSON.parse(se);
      } catch {
        se = null;
      }
    }
    const events = (se as { events?: ScheduleEventRow[] } | null)?.events;
    if (!Array.isArray(events)) continue;

    const completed = parseCompletedSteps(run.completed_steps);

    for (const ev of events) {
      if (!ev || typeof ev.date !== "string" || !ev.id) continue;
      const d = ev.date.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
      if (isSchedulerTaskCompleted(completed, ev.id)) continue;

      const label =
        typeof ev.notes === "string" && ev.notes.trim()
          ? ev.notes.trim()
          : `Scheduled work (${ev.id})`;

      const line: DigestLine = {
        runId: run.id,
        runName,
        taskLabel: label,
        scheduledDate: d,
      };

      if (d === todayYmd) dueToday.push(line);
      else if (d < todayYmd) overdue.push(line);
    }
  }

  return { dueToday, overdue };
}

export async function fetchStateFromUsZip(zip: string): Promise<string | null> {
  const digits = zip.replace(/\D/g, "");
  if (digits.length < 5) return null;
  const five = digits.slice(0, 5);
  const res = await fetch(`https://api.zippopotam.us/us/${five}`);
  if (!res.ok) return null;
  const j = (await res.json()) as { places?: Record<string, unknown>[] };
  const place = j?.places?.[0];
  if (!place || typeof place !== "object") return null;
  const abbr =
    typeof place["state abbreviation"] === "string"
      ? (place["state abbreviation"] as string)
      : typeof place.state === "string"
      ? place.state
      : null;
  if (typeof abbr !== "string" || abbr.length !== 2) return null;
  return abbr.toUpperCase();
}

export function ianaFromStateAbbrev(abbr: string): string | null {
  return US_STATE_ABBREV_TO_PRIMARY_IANA[abbr] ?? null;
}
