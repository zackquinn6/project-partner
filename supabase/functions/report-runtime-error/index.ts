import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { verifyAuth } from "../_shared/auth.ts";
import {
  assertUserRateLimit,
  createServiceClient,
} from "../_shared/entitlement.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await verifyAuth(req);
    const admin = createServiceClient();

    const { allowed } = await assertUserRateLimit(
      admin,
      user.id,
      "report-runtime-error",
      20,
      60,
    );
    if (!allowed) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const title =
      typeof body?.title === "string" ? body.title.trim().slice(0, 200) : "";
    const notificationBody =
      typeof body?.body === "string" ? body.body.trim().slice(0, 2000) : "";
    const type =
      typeof body?.type === "string" && body.type.trim().length > 0
        ? body.type.trim().slice(0, 80)
        : "runtime_error";

    if (!title) {
      return new Response(JSON.stringify({ error: "title required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metadata =
      body?.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? { ...body.metadata, affected_user_id: user.id }
        : { affected_user_id: user.id };

    // Strip stacks from client-supplied metadata before persisting.
    if ("error_stack" in metadata) {
      delete (metadata as Record<string, unknown>).error_stack;
    }

    const { error } = await admin.rpc("notifications_notify_admins", {
      p_type: type,
      p_title: title,
      p_body: notificationBody,
      p_metadata: metadata,
    });

    if (error) {
      console.error("notifications_notify_admins failed", error.message);
      return new Response(JSON.stringify({ error: "Unable to notify admins" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "error";
    const status =
      message === "Missing authorization header" ||
      message === "Invalid or expired token"
        ? 401
        : 500;
    return new Response(
      JSON.stringify({
        error: status === 401 ? message : "Unable to notify admins",
      }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
