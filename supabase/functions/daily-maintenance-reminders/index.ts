import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";
import { getRequiredSecret } from "../_shared/auth.ts";
import { processMaintenanceReminders } from "../_shared/maintenanceDigest.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

/**
 * Invoke on a schedule (e.g. daily or every ~10 minutes) with header:
 *   x-cron-secret: CRON_SECRET
 * Env: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, RESEND_API_KEY, CRON_SECRET
 *
 * Also runs from daily-workflow-task-digest so an existing digest cron covers maintenance.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
    const sent = req.headers.get("x-cron-secret") ?? "";
    if (!cronSecret || sent !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const resendKey = getRequiredSecret("RESEND_API_KEY");
    const resend = new Resend(resendKey);

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const result = await processMaintenanceReminders(supabase, resend);

    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    console.error("daily-maintenance-reminders", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});
