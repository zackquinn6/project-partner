import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { verifyAuth, getRequiredSecret } from "../_shared/auth.ts";
import { sanitizeInput } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const rosterPersonSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().optional(),
});

const requestSchema = z.object({
  message: z.string().min(1).max(4000),
  conversation: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      })
    )
    .max(20)
    .default([]),
  context: z.object({
    timezone: z.string().max(100),
    today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    dropDeadDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    teamRoster: z.array(rosterPersonSchema).max(30),
    contractorRoster: z.array(rosterPersonSchema).max(30).default([]),
    knownHolidays: z
      .array(z.object({ name: z.string(), date: z.string() }))
      .max(40)
      .default([]),
  }),
});

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatYmd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function nthWeekdayOfMonth(year: number, monthIndex: number, weekday: number, n: number): Date {
  const first = new Date(year, monthIndex, 1);
  const firstWeekday = first.getDay();
  const day = 1 + ((weekday - firstWeekday + 7) % 7) + (n - 1) * 7;
  return new Date(year, monthIndex, day);
}

function upcomingWeekendDates(today: Date): string[] {
  const day = today.getDay();
  const saturday = new Date(today);
  if (day === 0) saturday.setDate(today.getDate() - 1);
  else if (day !== 6) saturday.setDate(today.getDate() + (6 - day));
  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);
  return [formatYmd(saturday), formatYmd(sunday)];
}

function resolveHolidayLocal(name: string, today: Date, known: { name: string; date: string }[]): string | null {
  const n = name.trim().toLowerCase().replace(/['']/g, "");
  const fromKnown = known.find(
    (h) => h.name.toLowerCase().replace(/['']/g, "") === n || h.name.toLowerCase().includes(n)
  );
  if (fromKnown) return fromKnown.date;

  const aliases: Record<string, (y: number) => Date> = {
    "labor day": (y) => nthWeekdayOfMonth(y, 8, 1, 1),
    "mothers day": (y) => nthWeekdayOfMonth(y, 4, 0, 2),
    "mother's day": (y) => nthWeekdayOfMonth(y, 4, 0, 2),
    "memorial day": (y) => {
      const last = new Date(y, 5, 0);
      const diff = (last.getDay() - 1 + 7) % 7;
      return new Date(y, 4, last.getDate() - diff);
    },
    "independence day": (y) => new Date(y, 6, 4),
    christmas: (y) => new Date(y, 11, 25),
    thanksgiving: (y) => nthWeekdayOfMonth(y, 10, 4, 4),
  };
  const fn = aliases[n];
  if (!fn) return null;
  const todayKey = formatYmd(today);
  for (let y = today.getFullYear(); y <= today.getFullYear() + 1; y++) {
    const d = formatYmd(fn(y));
    if (d >= todayKey) return d;
  }
  return null;
}

/** Expand Mon–Thu (or similar) after-hours into concrete slots in [today, windowEnd]. */
function expandWeekdaySlots(
  weekdays: number[],
  start: string,
  end: string,
  from: Date,
  to: Date
): { date: string; start: string; end: string }[] {
  const out: { date: string; start: string; end: string }[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const endD = new Date(to);
  while (cursor <= endD) {
    if (weekdays.includes(cursor.getDay())) {
      out.push({ date: formatYmd(cursor), start, end });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

type RawPatch = {
  target?: { kind?: string; id?: string; nameHint?: string };
  weekendsOnly?: boolean;
  weekdaysAfterFivePm?: boolean;
  workingHours?: { start?: string; end?: string };
  availableSlots?: { date?: string; start?: string; end?: string }[];
  blackoutDates?: string[];
  blackoutHolidayNames?: string[];
  blackoutRelative?: string[];
  availableWeekdays?: number[];
  notes?: string;
};

function postProcessPatches(
  patches: RawPatch[],
  today: Date,
  windowEnd: Date,
  knownHolidays: { name: string; date: string }[]
): Record<string, unknown>[] {
  return patches.map((p) => {
    const blackout = new Set<string>(Array.isArray(p.blackoutDates) ? p.blackoutDates.filter(Boolean) : []);

    for (const name of p.blackoutHolidayNames ?? []) {
      const d = resolveHolidayLocal(name, today, knownHolidays);
      if (d) blackout.add(d);
    }
    for (const rel of p.blackoutRelative ?? []) {
      const r = rel.toLowerCase();
      if (r.includes("weekend") || r.includes("vacation this upcoming weekend") || r === "upcoming_weekend") {
        for (const d of upcomingWeekendDates(today)) blackout.add(d);
      }
    }

    let availableSlots = Array.isArray(p.availableSlots)
      ? p.availableSlots
          .filter((s) => s?.date && s?.start && s?.end)
          .map((s) => ({ date: s.date!, start: s.start!, end: s.end! }))
      : [];

    const hoursStart = p.workingHours?.start || (p.weekdaysAfterFivePm ? "17:00" : "09:00");
    const hoursEnd = p.workingHours?.end || (p.weekdaysAfterFivePm ? "21:00" : "17:00");

    if (Array.isArray(p.availableWeekdays) && p.availableWeekdays.length > 0 && availableSlots.length === 0) {
      availableSlots = expandWeekdaySlots(p.availableWeekdays, hoursStart, hoursEnd, today, windowEnd);
    }

    // Common phrase: after 5 Mon–Thu → weekdays 1–4
    if (
      availableSlots.length === 0 &&
      p.weekdaysAfterFivePm === true &&
      Array.isArray(p.availableWeekdays) === false
    ) {
      // leave pattern flags; client/engine expand Mon–Fri via weekdaysAfterFivePm
    }

    return {
      target: {
        kind: p.target?.kind === "contractor" ? "contractor" : "team_member",
        id: p.target?.id || null,
        nameHint: p.target?.nameHint || null,
      },
      weekendsOnly: p.weekendsOnly ?? false,
      weekdaysAfterFivePm: p.weekdaysAfterFivePm ?? false,
      workingHours: {
        start: hoursStart,
        end: hoursEnd,
      },
      availableSlots,
      blackoutDates: [...blackout].sort(),
      notes: p.notes || null,
    };
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await verifyAuth(req);
    const OPENAI_API_KEY = getRequiredSecret("OPENAI_API_KEY");

    const body = await req.json();
    const validated = requestSchema.parse(body);
    const message = sanitizeInput(validated.message);
    const today = parseYmd(validated.context.today);
    const windowEnd = parseYmd(
      validated.context.dropDeadDate ||
        validated.context.targetDate ||
        formatYmd(new Date(today.getFullYear(), today.getMonth() + 3, today.getDate()))
    );

    const systemPrompt = `You convert natural-language DIY project availability into structured JSON for a scheduler.

Today (YYYY-MM-DD): ${validated.context.today}
Timezone: ${validated.context.timezone}
Schedule window end: ${formatYmd(windowEnd)}
Team roster: ${JSON.stringify(validated.context.teamRoster)}
Contractor roster: ${JSON.stringify(validated.context.contractorRoster)}
Known holidays in window: ${JSON.stringify(validated.context.knownHolidays)}

Rules:
- If the user says "I" / "me", target the owner team member (type owner) or the first team member.
- If a named person matches a contractor, use kind "contractor".
- If ambiguous who it applies to, set status to "needs_clarification" and ask.
- For vacations / can't-work days: put holiday names in blackoutHolidayNames (e.g. "Labor Day", "Mother's Day") and relative phrases in blackoutRelative (use "upcoming_weekend" for this upcoming weekend).
- For "after 5pm Mon-Thu": set weekdaysAfterFivePm true, workingHours start "17:00" end "21:00", and availableWeekdays [1,2,3,4] (0=Sun).
- For weekends only: weekendsOnly true, workingHours as stated or 09:00-17:00.
- Do not invent absolute holiday dates yourself; use blackoutHolidayNames / blackoutRelative.
- Prefer status "ready" only when targets and constraints are clear.
- Return ONLY valid JSON matching the schema.

JSON schema:
{
  "assistantMessage": string,
  "status": "needs_clarification" | "ready",
  "clarifyingQuestions": string[],
  "patches": [{
    "target": { "kind": "team_member" | "contractor", "id": string|null, "nameHint": string|null },
    "weekendsOnly": boolean,
    "weekdaysAfterFivePm": boolean,
    "workingHours": { "start": "HH:mm", "end": "HH:mm" },
    "availableSlots": [{ "date": "YYYY-MM-DD", "start": "HH:mm", "end": "HH:mm" }],
    "blackoutDates": string[],
    "blackoutHolidayNames": string[],
    "blackoutRelative": string[],
    "availableWeekdays": number[],
    "notes": string|null
  }]
}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...validated.conversation.map((t) => ({
        role: t.role,
        content: sanitizeInput(t.content).slice(0, 4000),
      })),
      { role: "user", content: message },
    ];

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.2,
        messages,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI error:", errText);
      return new Response(JSON.stringify({ error: "Availability parse failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiJson = await openaiRes.json();
    const content = openaiJson.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      return new Response(JSON.stringify({ error: "Empty model response" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: {
      assistantMessage?: string;
      status?: string;
      clarifyingQuestions?: string[];
      patches?: RawPatch[];
    };
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid model JSON" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const status = parsed.status === "ready" ? "ready" : "needs_clarification";
    const patches =
      status === "ready" && Array.isArray(parsed.patches)
        ? postProcessPatches(parsed.patches, today, windowEnd, validated.context.knownHolidays)
        : [];

    return new Response(
      JSON.stringify({
        assistantMessage: parsed.assistantMessage || (status === "ready" ? "Applied your availability." : "I need a bit more detail."),
        status,
        clarifyingQuestions: Array.isArray(parsed.clarifyingQuestions) ? parsed.clarifyingQuestions : [],
        patches,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("parse-availability-nl error:", error);
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: "Invalid request", details: error.errors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const msg = error instanceof Error ? error.message : "Unknown error";
    const status = msg.includes("Unauthorized") || msg.includes("authorization") ? 401 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
