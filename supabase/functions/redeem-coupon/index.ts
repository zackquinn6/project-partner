import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      return new Response(JSON.stringify({ error: "Coupon code required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: coupon, error: couponError } = await supabaseClient
      .from('coupon_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('active', true)
      .single();

    if (couponError || !coupon) {
      return new Response(JSON.stringify({ error: "Invalid or expired coupon code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existing } = await supabaseClient
      .from('coupon_redemptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('coupon_id', coupon.id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "You have already redeemed this coupon" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "This coupon has expired" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: membershipData } = await supabaseClient
      .from('membership_status')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membershipData || membershipData.trial_end_date == null) {
      return new Response(JSON.stringify({ error: "No trial found for user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: incremented, error: incrementError } = await supabaseClient.rpc(
      'redeem_coupon_increment',
      { p_coupon_id: coupon.id },
    );

    if (incrementError || incremented !== true) {
      return new Response(
        JSON.stringify({ error: "This coupon has reached its maximum redemptions" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const currentEndDate = new Date(membershipData.trial_end_date);
    const extendedDays =
      (membershipData.trial_extended_by ?? 0) + coupon.trial_extension_days;
    const newEndDate = new Date(
      currentEndDate.getTime() + coupon.trial_extension_days * 24 * 60 * 60 * 1000,
    );

    await supabaseClient
      .from('membership_status')
      .update({
        trial_end_date: newEndDate.toISOString(),
        trial_extended_by: extendedDays,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    const { error: redemptionError } = await supabaseClient
      .from('coupon_redemptions')
      .insert({
        user_id: user.id,
        coupon_id: coupon.id,
      });

    if (redemptionError) {
      console.error('coupon redemption insert failed', redemptionError.message);
      return new Response(JSON.stringify({ error: "Unable to redeem coupon" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        daysExtended: coupon.trial_extension_days,
        newEndDate: newEndDate.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error('redeem-coupon error', error instanceof Error ? error.message : String(error));
    return new Response(
      JSON.stringify({ error: "Unable to redeem coupon" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
