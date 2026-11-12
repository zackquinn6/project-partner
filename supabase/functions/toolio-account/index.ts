import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getRequiredSecret, verifyAdmin } from "../_shared/auth.ts";

/**
 * Shared login with Toolio. Contract: docs/PROJECT_PARTNER_INTEGRATION.md ("Shared login").
 *
 * - `status` (signed-in user): whether a Toolio account with the caller's confirmed email exists and is
 *   linked, so the app can offer to link. Only ever asks about the caller's own email.
 * - `admin_links`, `admin_link { user_id, toolio_email }`, `admin_unlink { user_id }` (admins): view and
 *   change links, including accounts whose emails differ. A link is the account's `custom:toolio` identity.
 *
 * Toolio answers through project-partner-link with the shared sync token.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

class RequestError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function respond(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function requireString(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (typeof value !== "string" || value.trim() === "") throw new RequestError(400, `${field} is required`);
  return value.trim();
}

async function askToolio(action: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch(getRequiredSecret("TOOLIO_LINK_URL"), {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-project-partner-sync-token": getRequiredSecret("TOOLIO_SYNC_TOKEN") },
    body: JSON.stringify({ action, ...payload }),
  });
  const answer = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    console.error("toolio-account: Toolio", action, response.status, answer.error);
    throw new RequestError(502, "Toolio could not be reached");
  }
  return answer;
}

async function rpc(db: SupabaseClient, fn: string, params: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await db.rpc(fn, params);
  if (error) throw new RequestError(400, error.message);
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return respond(405, { error: "Method not allowed" });

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const db = createClient(getRequiredSecret("SUPABASE_URL"), getRequiredSecret("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    });

    if (body.action === "status") {
      const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
      if (token === "") return respond(401, { error: "Unauthorized" });
      const { data, error } = await db.auth.getUser(token);
      if (error || !data.user) return respond(401, { error: "Unauthorized" });
      const user = data.user;
      const linked = (user.identities ?? []).some((i) => i.provider === "custom:toolio");
      if (linked) return respond(200, { linked: true, toolio_account: true });
      // Linking by sign-in relies on Supabase matching confirmed emails.
      if (!user.email || !user.email_confirmed_at) return respond(200, { linked: false, toolio_account: false });
      const answer = await askToolio("account_exists", { email: user.email });
      if (typeof answer.exists !== "boolean") throw new RequestError(502, "Toolio could not be reached");
      return respond(200, { linked: false, toolio_account: answer.exists, email: user.email });
    }

    if (body.action === "admin_links" || body.action === "admin_link" || body.action === "admin_unlink") {
      try {
        await verifyAdmin(req);
      } catch (authError) {
        const message = authError instanceof Error ? authError.message : String(authError);
        return respond(message === "Admin access required" ? 403 : 401, { error: message });
      }

      if (body.action === "admin_links") {
        return respond(200, { links: await rpc(db, "toolio_account_links", {}) });
      }
      if (body.action === "admin_link") {
        const userId = requireString(body, "user_id");
        const toolioEmail = requireString(body, "toolio_email");
        const found = await askToolio("account_lookup", { email: toolioEmail });
        if (typeof found.user_id !== "string") throw new RequestError(404, `No Toolio account uses ${toolioEmail}`);
        await rpc(db, "toolio_link_account", {
          p_user_id: userId,
          p_toolio_user_id: found.user_id,
          p_toolio_email: found.email,
        });
        return respond(200, { linked: true });
      }
      await rpc(db, "toolio_unlink_account", { p_user_id: requireString(body, "user_id") });
      return respond(200, { linked: false });
    }

    return respond(400, { error: "Unknown or missing action" });
  } catch (error) {
    if (error instanceof RequestError) return respond(error.status, { error: error.message });
    console.error("toolio-account", error instanceof Error ? error.message : String(error));
    return respond(500, { error: "Service error" });
  }
});
