import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { verifyAuth } from "../_shared/auth.ts";
import {
  fetchStateFromUsZip,
  ianaFromStateAbbrev,
} from "../_shared/workflowDigest.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const bodySchema = z.object({
  zip: z.string().min(3).max(20),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await verifyAuth(req);
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid zip" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const state = await fetchStateFromUsZip(parsed.data.zip);
    if (!state) {
      return new Response(
        JSON.stringify({
          error: "Could not resolve ZIP code",
          time_zone: null,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const time_zone = ianaFromStateAbbrev(state);
    if (!time_zone) {
      return new Response(
        JSON.stringify({
          error: "Unsupported region for this ZIP",
          time_zone: null,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    return new Response(
      JSON.stringify({ time_zone, state }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("token") || msg.includes("authorization")
      ? 401
      : 500;
    return new Response(
      JSON.stringify({ error: status === 401 ? "Unauthorized" : msg }),
      {
        status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});
