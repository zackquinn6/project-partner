import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { verifyAuth, getRequiredSecret } from "../_shared/auth.ts";
import { escapeHtml } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const requestSchema = z.object({
  type: z.enum(["test"]),
  email: z.string().email().max(255),
  userName: z.string().max(100),
});

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await verifyAuth(req);

    const RESEND_API_KEY = getRequiredSecret("RESEND_API_KEY");
    const resend = new Resend(RESEND_API_KEY);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const parseResult = requestSchema.safeParse(body);
    if (!parseResult.success) {
      const first = parseResult.error.flatten().fieldErrors;
      const msg = Object.values(first).flat().find(Boolean) as
        | string
        | undefined;
      return new Response(
        JSON.stringify({ error: msg ?? "Invalid request" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }
    const validatedData = parseResult.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: req.headers.get("Authorization") ?? "" },
      },
    });

    const { data: settings, error: settingsError } = await supabaseClient
      .from("portfolio_notification_settings")
      .select("email_address")
      .eq("user_id", user.id)
      .maybeSingle();

    if (settingsError) throw settingsError;

    const requestedEmail = validatedData.email.trim().toLowerCase();
    const allowedEmail = (settings?.email_address ?? "").trim().toLowerCase();
    const authEmail = (user.email ?? "").trim().toLowerCase();

    if (allowedEmail) {
      if (requestedEmail !== allowedEmail) {
        throw new Error("Email mismatch with saved notification settings");
      }
    } else {
      if (!authEmail) {
        throw new Error("No notification email is saved for this account");
      }
      if (requestedEmail !== authEmail) {
        throw new Error("Email mismatch with saved notification settings");
      }
    }

    const subject = "Test Project & Portfolio Reminder";
    const htmlContent = `
        <div style="max-width: 640px; margin: 0 auto; padding: 24px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #F9FAFB; background-color: #000000;">
          <div style="text-align: left; margin-bottom: 24px;">
            <span style="display: inline-block; font-size: 28px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #F97316;">
              Project Partner
            </span>
          </div>
          <div style="background-color: #111827; border-radius: 12px; padding: 24px 20px; border: 1px solid #4B5563;">
            <h2 style="margin: 0 0 16px; font-size: 22px; line-height: 1.3; color: #F97316;">
              Test Project &amp; Portfolio Reminder
            </h2>
            <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.6; color: #F9FAFB;">
              Hey ${escapeHtml(validatedData.userName)},
            </p>
            <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #E5E7EB;">
              This is a test of your project dashboard and task manager reminder email. If you’re reading this, delivery is working.
            </p>
            <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6; color: #FBBF24;">
              You can enable reminders for:
            </p>
            <ul style="margin: 0 0 16px 18px; padding: 0; color: #F9FAFB; font-size: 14px; line-height: 1.6;">
              <li>Weekly budget update</li>
              <li>Daily task status update</li>
              <li>Daily completions celebration</li>
            </ul>
            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #9CA3AF;">
              — The Project Partner Team
            </p>
          </div>
        </div>
      `;

    const emailResponse = await resend.emails.send({
      from: "Project Partner <onboarding@resend.dev>",
      to: [validatedData.email],
      subject,
      html: htmlContent,
    });

    if (emailResponse.error) {
      console.error("Resend API error:", emailResponse.error);
      throw new Error(
        (emailResponse.error as { message?: string }).message ||
          "Email service failed to send",
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Portfolio reminder test sent successfully!",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Error in send-portfolio-reminder function:", err);

    const msg = err.message;
    const statusCode =
      msg.includes("authorization") || msg.includes("token") ||
        msg.includes("Authentication")
        ? 401
        : msg.includes("Email mismatch") || msg.includes("notification email")
        ? 403
        : 500;
    const message =
      statusCode === 401 ? "Authentication required"
      : statusCode === 403 ? msg
      : "Failed to send reminder";

    return new Response(
      JSON.stringify({ error: message }),
      {
        status: statusCode,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
};

serve(handler);
