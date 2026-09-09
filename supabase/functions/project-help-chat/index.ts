import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { verifyAuth, getRequiredSecret } from "../_shared/auth.ts";
import { sanitizeInput } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const HELP_MESSAGE_CAP = 20;
const HELP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const requestSchema = z.object({
  threadId: z.string().uuid().optional().nullable(),
  projectRunId: z.string().uuid().optional().nullable(),
  templateProjectId: z.string().uuid().optional().nullable(),
  templateFamily: z.string().min(1).max(64),
  stepId: z.string().max(200).optional().nullable(),
  stepTitle: z.string().max(500).optional().nullable(),
  phaseId: z.string().max(200).optional().nullable(),
  phaseName: z.string().max(500).optional().nullable(),
  message: z.string().min(1).max(4000),
  photoPaths: z.array(z.string().max(500)).max(3).optional(),
  localCodeAck: z.boolean().optional(),
  instructionLevel: z.string().max(40).optional().nullable(),
});

type SafetyFlag = "gas" | "electrical" | "structural" | "injury" | "general";

function detectSafety(text: string): SafetyFlag[] {
  const flags = new Set<SafetyFlag>();
  if (/\b(gas\s*(line|valve|stove|furnace|dryer|appliance|leak)|natural\s*gas|propane|pilot\s*light)\b/i.test(text)) {
    flags.add("gas");
  }
  if (/\b(outlet|receptacle|switch|breaker|panel|wiring|wire|fixture|gfci|afci|electrical)\b/i.test(text)) {
    flags.add("electrical");
  }
  if (/\b(load[\s-]*bearing|joist|beam|header|foundation|structural|remove\s*(a\s*)?wall)\b/i.test(text)) {
    flags.add("structural");
  }
  if (/\b(injur(y|ed)|bleeding|broke(n)?\s*(bone|arm|leg)|near[\s-]*miss|emergency|911)\b/i.test(text)) {
    flags.add("injury");
  }
  if (flags.size === 0) flags.add("general");
  return [...flags];
}

function extractStepContext(
  phases: unknown,
  stepId: string | null | undefined,
  stepTitle: string | null | undefined,
  instructionLevel: string | null | undefined,
): string {
  if (!Array.isArray(phases)) return "";
  for (const phase of phases as Array<Record<string, unknown>>) {
    const ops = Array.isArray(phase.operations) ? phase.operations : [];
    for (const op of ops as Array<Record<string, unknown>>) {
      const steps = Array.isArray(op.steps) ? op.steps : [];
      for (const step of steps as Array<Record<string, unknown>>) {
        const idMatch = stepId && step.id === stepId;
        const titleMatch =
          stepTitle &&
          typeof step.step === "string" &&
          step.step.toLowerCase() === stepTitle.toLowerCase();
        if (!idMatch && !titleMatch) continue;

        const tools = Array.isArray(step.tools)
          ? (step.tools as Array<{ name?: string; item?: string }>)
              .map((t) => t.name || t.item)
              .filter(Boolean)
              .join(", ")
          : "";
        const materials = Array.isArray(step.materials)
          ? (step.materials as Array<{ name?: string; item?: string }>)
              .map((m) => m.name || m.item)
              .filter(Boolean)
              .join(", ")
          : "";
        const outputs = Array.isArray(step.outputs)
          ? (step.outputs as Array<{ name?: string; qualityChecks?: string }>)
              .map((o) => `${o.name || ""}${o.qualityChecks ? ` (${o.qualityChecks})` : ""}`)
              .filter(Boolean)
              .join("; ")
          : "";

        let instructions = "";
        if (typeof step.content === "string") {
          instructions = step.content;
        } else if (Array.isArray(step.contentSections)) {
          instructions = (step.contentSections as Array<{ content?: string; title?: string }>)
            .map((s) => `${s.title || ""}: ${s.content || ""}`)
            .join("\n");
        } else if (Array.isArray(step.content)) {
          instructions = (step.content as Array<{ content?: string; title?: string }>)
            .map((s) => `${s.title || ""}: ${s.content || ""}`)
            .join("\n");
        }

        return [
          `Phase: ${phase.name || ""}`,
          `Operation: ${op.name || ""}`,
          `Step: ${step.step || stepTitle || ""}`,
          `Instruction level preference: ${instructionLevel || "intermediate"}`,
          `Tools: ${tools || "n/a"}`,
          `Materials: ${materials || "n/a"}`,
          `Quality checkpoints: ${outputs || "n/a"}`,
          `Instructions:\n${instructions.slice(0, 6000)}`,
        ].join("\n");
      }
    }
  }
  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await verifyAuth(req);
    const GOOGLE_GEMINI_API_KEY = getRequiredSecret("GOOGLE_GEMINI_API_KEY");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const input = requestSchema.parse(body);
    const message = sanitizeInput(input.message).slice(0, 4000);
    const photoPaths = input.photoPaths || [];
    const safetyFlags = detectSafety(
      `${message} ${input.stepTitle || ""} ${input.phaseName || ""}`,
    );

    // Usage cap (user messages in last 7 days)
    const windowStart = new Date(Date.now() - HELP_WINDOW_MS).toISOString();
    const { count: usedCount, error: countError } = await admin
      .from("help_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("role", "user")
      .gte("created_at", windowStart);

    if (countError) {
      console.error("usage count error", countError);
      throw new Error("Could not check usage");
    }

    const messageCount = usedCount ?? 0;
    if (messageCount >= HELP_MESSAGE_CAP) {
      return new Response(
        JSON.stringify({
          error:
            "AI help cap reached (20 messages / 7 days). Wait for the window to reset or escalate to a live pro on the Projects plan.",
          usage: {
            messageCount,
            messageCap: HELP_MESSAGE_CAP,
            remaining: 0,
            capped: true,
          },
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Load / create thread
    let threadId = input.threadId || null;
    if (threadId) {
      const { data: existing, error: threadErr } = await admin
        .from("help_threads")
        .select("id, user_id, template_family")
        .eq("id", threadId)
        .maybeSingle();
      if (threadErr || !existing || existing.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Thread not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (existing.template_family !== input.templateFamily) {
        return new Response(
          JSON.stringify({ error: "Thread family mismatch" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    } else {
      const { data: created, error: createErr } = await admin
        .from("help_threads")
        .insert({
          user_id: user.id,
          project_run_id: input.projectRunId || null,
          template_project_id: input.templateProjectId || null,
          template_family: input.templateFamily,
          step_id: input.stepId || null,
          step_title: input.stepTitle || null,
          phase_id: input.phaseId || null,
          phase_name: input.phaseName || null,
          title: input.stepTitle || "Project help",
          status: "open",
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .maybeSingle();
      if (createErr || !created) {
        console.error("create thread", createErr);
        throw new Error("Could not create help thread");
      }
      threadId = created.id;
    }

    // Grounding pack: run phases + sibling thread history (same family)
    let stepContext = "";
    let projectName = "";
    if (input.projectRunId) {
      const { data: run } = await admin
        .from("project_runs")
        .select("id, user_id, name, phases, project_id, instruction_level_preference")
        .eq("id", input.projectRunId)
        .maybeSingle();
      if (run && run.user_id === user.id) {
        projectName = run.name || "";
        const phases =
          typeof run.phases === "string" ? JSON.parse(run.phases) : run.phases;
        stepContext = extractStepContext(
          phases,
          input.stepId,
          input.stepTitle,
          input.instructionLevel || run.instruction_level_preference,
        );
      }
    }

    // Prior messages in this thread
    const { data: priorMsgs } = await admin
      .from("help_messages")
      .select("role, content")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Stuck aggregates for this family/step
    let stuckHint = "";
    if (input.stepId) {
      const { data: aggs } = await admin.rpc("get_step_stuck_aggregates", {
        p_template_family: input.templateFamily,
        p_step_id: input.stepId,
      });
      if (Array.isArray(aggs) && aggs.length > 0) {
        stuckHint = aggs
          .slice(0, 5)
          .map(
            (a: { triage_type: string; event_count: number }) =>
              `${a.triage_type}: ${a.event_count}`,
          )
          .join("; ");
      }
    }

    // Hard refuses
    if (safetyFlags.includes("injury")) {
      const refuse =
        "Stop the DIY work. If anyone is injured or you had a serious near-miss, get medical help first. I will not coach continuing the task until it is safe. When you are ready, use Something Wrong? to log a safety stop, and escalate to a live pro if needed.";
      return await persistAndRespond({
        admin,
        userId: user.id,
        threadId: threadId!,
        message,
        photoPaths,
        safetyFlags,
        reply: refuse,
        refused: true,
        messageCount: messageCount + 1,
      });
    }

    if (safetyFlags.includes("gas")) {
      const refuse =
        "Project Partner does not support DIY gas work (lines, valves, appliances, leaks). Hire a licensed professional. I will not provide gas how-to.";
      return await persistAndRespond({
        admin,
        userId: user.id,
        threadId: threadId!,
        message,
        photoPaths,
        safetyFlags,
        reply: refuse,
        refused: true,
        messageCount: messageCount + 1,
      });
    }

    if (safetyFlags.includes("electrical") && !input.localCodeAck) {
      const refuse =
        "Electrical DIY (outlets, switches, fixtures) is only allowed where your local town rules permit it. Confirm that DIY electrical work is allowed where you live, then ask again with that confirmation. Always shut power off at the breaker before any electrical work.";
      return await persistAndRespond({
        admin,
        userId: user.id,
        threadId: threadId!,
        message,
        photoPaths,
        safetyFlags,
        reply: refuse,
        refused: true,
        messageCount: messageCount + 1,
      });
    }

    const structuralCaution = safetyFlags.includes("structural")
      ? "STRUCTURAL CAUTION: Prefer stopping and consulting a licensed pro for load-bearing or structural changes. Only give limited guidance that does not encourage removing structural members."
      : "";

    const systemPrompt = `You are Project Partner AI Help for DIY home improvement.
You ONLY answer questions within the template family: "${input.templateFamily}".
Project: ${projectName || "current project"}.
If the user asks about a different trade/family, refuse and tell them to open the matching project template.

Safety rules (hard):
- Never advise DIY gas work.
- Electrical outlets/switches/fixtures only when local codes allow; always emphasize breaker off and verification.
- Structural/load-bearing: caution first; prefer pro for anything structural.
- Prefer recovery plans: reopen step, rework, shopping top-up, schedule slip.

Be concise, practical, and step-specific. Use the provided step instructions and checkpoints.
${structuralCaution}

STEP CONTEXT:
${stepContext || "(No step snapshot loaded — stay within family knowledge and ask clarifying questions.)"}

OTHERS GOT STUCK HERE (counts): ${stuckHint || "none yet"}
`;

    const historyText = (priorMsgs || [])
      .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
      .join("\n");

    const userBlock = [
      historyText ? `Prior thread:\n${historyText}\n` : "",
      `User question:\n${message}`,
      photoPaths.length
        ? `User attached ${photoPaths.length} photo(s) (paths only; describe based on question if images not inline).`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\n${userBlock}` }],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1024,
          },
        }),
      },
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error", geminiRes.status, errText);
      throw new Error("AI help service error");
    }

    const geminiJson = await geminiRes.json();
    const reply =
      geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "I could not generate a reply. Try again or escalate to a live pro.";

    return await persistAndRespond({
      admin,
      userId: user.id,
      threadId: threadId!,
      message,
      photoPaths,
      safetyFlags,
      reply,
      refused: false,
      messageCount: messageCount + 1,
      model: "gemini-1.5-flash",
    });
  } catch (error) {
    console.error("project-help-chat error", error);
    const msg = error instanceof Error ? error.message : "Help chat failed";
    const status =
      msg.includes("authorization") || msg.includes("token") ? 401 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function persistAndRespond(args: {
  admin: ReturnType<typeof createClient>;
  userId: string;
  threadId: string;
  message: string;
  photoPaths: string[];
  safetyFlags: SafetyFlag[];
  reply: string;
  refused: boolean;
  messageCount: number;
  model?: string;
}) {
  const {
    admin,
    userId,
    threadId,
    message,
    photoPaths,
    safetyFlags,
    reply,
    refused,
    messageCount,
    model,
  } = args;

  const { data: userMsg, error: userMsgErr } = await admin
    .from("help_messages")
    .insert({
      thread_id: threadId,
      user_id: userId,
      role: "user",
      content: message,
      photo_paths: photoPaths,
      safety_flags: safetyFlags,
    })
    .select("id")
    .maybeSingle();

  if (userMsgErr) {
    console.error("user message insert", userMsgErr);
    throw new Error("Could not save message");
  }

  const { data: assistantMsg, error: asstErr } = await admin
    .from("help_messages")
    .insert({
      thread_id: threadId,
      user_id: userId,
      role: "assistant",
      content: reply,
      photo_paths: [],
      safety_flags: safetyFlags,
      model: model || "policy",
    })
    .select("id")
    .maybeSingle();

  if (asstErr) {
    console.error("assistant message insert", asstErr);
    throw new Error("Could not save reply");
  }

  await admin
    .from("help_threads")
    .update({
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: refused ? "open" : "open",
    })
    .eq("id", threadId);

  const remaining = Math.max(HELP_MESSAGE_CAP - messageCount, 0);

  return new Response(
    JSON.stringify({
      threadId,
      userMessageId: userMsg?.id,
      assistantMessageId: assistantMsg?.id,
      reply,
      safetyFlags,
      refused,
      usage: {
        messageCount,
        messageCap: HELP_MESSAGE_CAP,
        remaining,
        capped: remaining <= 0,
      },
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
