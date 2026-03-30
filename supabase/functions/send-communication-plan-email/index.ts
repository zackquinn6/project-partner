import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { verifyAuth, getRequiredSecret } from "../_shared/auth.ts";
import { escapeHtml } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const requestSchema = z.object({
  projectRunId: z.string().uuid(),
  planId: z.string().uuid(),
  stakeholderId: z.string().uuid(),
  subject: z.string().min(1).max(300),
  bodyText: z.string().min(1).max(50000),
  templateKey: z.string().min(1).max(100),
});

function sanitizePlainEmailBody(input: string): string {
  let s = input.replace(/<[^>]*>/g, "");
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  return s.trim();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await verifyAuth(req);
    const senderEmail = user.email?.trim();
    if (!senderEmail) {
      return new Response(
        JSON.stringify({
          error:
            "Your account has no email on file. Add an email address to send updates.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const raw = await req.json();
    const body = requestSchema.parse(raw);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: "Service configuration error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: runRow, error: runErr } = await admin
      .from("project_runs")
      .select("id, user_id")
      .eq("id", body.projectRunId)
      .maybeSingle();

    if (runErr || !runRow || runRow.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Project run not found" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: planRow, error: planErr } = await admin
      .from("project_communication_plans")
      .select("id, project_run_id, enabled")
      .eq("id", body.planId)
      .maybeSingle();

    if (planErr || !planRow || planRow.project_run_id !== body.projectRunId) {
      return new Response(JSON.stringify({ error: "Communication plan not found" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!planRow.enabled) {
      return new Response(
        JSON.stringify({ error: "Communication plan is not enabled for this project" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const { data: stakeholder, error: stErr } = await admin
      .from("communication_stakeholders")
      .select("id, plan_id, delivery_method, email")
      .eq("id", body.stakeholderId)
      .maybeSingle();

    if (stErr || !stakeholder || stakeholder.plan_id !== body.planId) {
      return new Response(JSON.stringify({ error: "Stakeholder not found" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (stakeholder.delivery_method !== "email") {
      return new Response(
        JSON.stringify({
          error: "This stakeholder is not set up for email delivery",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const toEmail = stakeholder.email?.trim();
    if (!toEmail) {
      return new Response(
        JSON.stringify({ error: "Stakeholder has no email address" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const subject = sanitizePlainEmailBody(body.subject).slice(0, 300);
    const bodyText = sanitizePlainEmailBody(body.bodyText).slice(0, 50000);
    if (!subject || !bodyText) {
      return new Response(JSON.stringify({ error: "Subject and message are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const RESEND_API_KEY = getRequiredSecret("RESEND_API_KEY");
    const resend = new Resend(RESEND_API_KEY);

    const { error: sendErr } = await resend.emails.send({
      from: "Project Partner <onboarding@resend.dev>",
      to: [toEmail],
      replyTo: senderEmail,
      subject,
      html: `
        <div style="font-family: Georgia, serif; max-width: 640px; margin: 0 auto; line-height: 1.6; color: #1a1a1a;">
          <p style="color: #555; font-size: 14px;">Update from ${escapeHtml(senderEmail)} via Project Partner</p>
          <div style="white-space: pre-wrap; margin-top: 16px;">${escapeHtml(bodyText)}</div>
        </div>
      `,
    });

    if (sendErr) {
      console.error("Resend communication-plan error:", sendErr);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { error: logErr } = await admin.from("communication_outbound_log").insert({
      plan_id: body.planId,
      project_run_id: body.projectRunId,
      stakeholder_id: body.stakeholderId,
      channel: "email",
      recipient_email: toEmail,
      subject,
      body_text: bodyText,
      template_key: body.templateKey.slice(0, 100),
      created_by_user_id: user.id,
    });

    if (logErr) {
      console.error("communication_outbound_log insert error:", logErr);
      return new Response(
        JSON.stringify({
          error: "Email was sent but could not be saved to project history",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: "Invalid request", details: e.errors }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    console.error("send-communication-plan-email:", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
