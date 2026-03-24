import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { verifyAuth, getRequiredSecret } from "../_shared/auth.ts";
import { sanitizeInput, escapeHtml } from "../_shared/validation.ts";

/** Like sanitizeInput but keeps newlines for email body text. */
function sanitizeMultiline(input: string): string {
  if (!input || typeof input !== "string") return "";
  let s = input.replace(/<[^>]*>/g, "");
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  s = s.replace(/javascript:/gi, "");
  s = s.replace(/on\w+\s*=/gi, "");
  s = s.replace(/<script[^>]*>.*?<\/script>/gi, "");
  return s.trim();
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Inbound contact form messages from the app (authenticated users only). */
const CONTACT_INBOX = "zackquinn6@gmail.com";

const requestSchema = z.object({
  userEmail: z.string().email().max(255),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  currentUrl: z.string().url().max(500).optional(),
});

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await verifyAuth(req);
    const RESEND_API_KEY = getRequiredSecret("RESEND_API_KEY");
    const resend = new Resend(RESEND_API_KEY);

    const body = await req.json();
    const validatedData = requestSchema.parse(body);

    if (validatedData.userEmail !== user.email) {
      throw new Error("Email mismatch with authenticated user");
    }

    const sanitizedSubject = sanitizeInput(validatedData.subject);
    const sanitizedMessage = sanitizeMultiline(validatedData.message);
    if (!sanitizedSubject || !sanitizedMessage) {
      return new Response(JSON.stringify({ error: "Subject and message are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    await resend.emails.send({
      from: "Project Partner Contact <onboarding@resend.dev>",
      to: [CONTACT_INBOX],
      replyTo: validatedData.userEmail,
      subject: `Contact: ${escapeHtml(sanitizedSubject)}`,
      html: `
        <h2>Contact form message</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>From:</strong> ${escapeHtml(validatedData.userEmail)}</p>
          ${validatedData.currentUrl ? `<p><strong>Page:</strong> ${escapeHtml(validatedData.currentUrl)}</p>` : ""}
          <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <h3>${escapeHtml(sanitizedSubject)}</h3>
        <div style="background: white; padding: 15px; border-left: 4px solid #7f1d1d; margin: 10px 0;">
          ${escapeHtml(sanitizedMessage).replace(/\n/g, "<br>")}
        </div>
      `,
    });

    return new Response(
      JSON.stringify({ success: true, message: "Message sent." }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: unknown) {
    console.error("Error in send-contact function:", error);
    const msg = error instanceof Error ? error.message : String(error);
    const statusCode =
      msg.includes("authorization") ||
      msg.includes("token") ||
      msg.includes("Missing authorization")
        ? 401
        : 500;
    const message =
      statusCode === 401 ? "Authentication required" : "Failed to send message";
    return new Response(JSON.stringify({ error: message }), {
      status: statusCode,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
