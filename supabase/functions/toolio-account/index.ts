import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getRequiredSecret } from "../_shared/auth.ts";

/**
 * Shared login: tells the signed-in user whether a Toolio account with their confirmed email exists
 * and whether it is already linked (identity `custom:toolio`), so the app can offer to link them.
 * Only ever asks about the caller's own email. Toolio answers through project-partner-link with the
 * shared sync token. Contract: docs/PROJECT_PARTNER_INTEGRATION.md ("Shared login").
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function respond(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return respond(405, { error: "Method not allowed" });

  try {
    const body = (await req.json()) as { action?: unknown };
    if (body.action !== "status") return respond(400, { error: "Unknown or missing action" });

    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
    if (token === "") return respond(401, { error: "Unauthorized" });
    const db = createClient(getRequiredSecret("SUPABASE_URL"), getRequiredSecret("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    });
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user) return respond(401, { error: "Unauthorized" });
    const user = data.user;

    const linked = (user.identities ?? []).some((i) => i.provider === "custom:toolio");
    if (linked) return respond(200, { linked: true, toolio_account: true });
    // Linking relies on Supabase matching confirmed emails.
    if (!user.email || !user.email_confirmed_at) return respond(200, { linked: false, toolio_account: false });

    const response = await fetch(getRequiredSecret("TOOLIO_LINK_URL"), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-project-partner-sync-token": getRequiredSecret("TOOLIO_SYNC_TOKEN") },
      body: JSON.stringify({ action: "account_exists", email: user.email }),
    });
    const answer = (await response.json()) as { exists?: unknown; error?: unknown };
    if (!response.ok || typeof answer.exists !== "boolean") {
      console.error("toolio-account: Toolio lookup failed", response.status, answer.error);
      return respond(502, { error: "Toolio could not be reached" });
    }
    return respond(200, { linked: false, toolio_account: answer.exists, email: user.email });
  } catch (error) {
    console.error("toolio-account", error instanceof Error ? error.message : String(error));
    return respond(500, { error: "Service error" });
  }
});
