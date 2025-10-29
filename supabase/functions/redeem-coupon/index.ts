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
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const { code } = await req.json();
    if (!code) throw new Error("Coupon code required");

    // Find coupon
    const { data: coupon, error: couponError } = await supabaseClient
      .from('coupon_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('active', true)
      .single();

    if (couponError || !coupon) {
      throw new Error("Invalid or expired coupon code");
    }

    // Check if already redeemed
    const { data: existing } = await supabaseClient
      .from('coupon_redemptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('coupon_id', coupon.id)
      .single();

    if (existing) {
      throw new Error("You have already redeemed this coupon");
    }

    // Check max uses
    if (coupon.max_uses && coupon.times_used >= coupon.max_uses) {
      throw new Error("This coupon has reached its maximum redemptions");
    }

    // Check expiry
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      throw new Error("This coupon has expired");
    }

    // Get current trial data
    const { data: trialData } = await supabaseClient
      .from('trial_tracking')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!trialData) {
      throw new Error("No trial found for user");
    }

    // Extend trial
    const currentEndDate = new Date(trialData.trial_end_date);
    const newEndDate = new Date(currentEndDate.getTime() + coupon.trial_extension_days * 24 * 60 * 60 * 1000);

    await supabaseClient
      .from('trial_tracking')
      .update({
        trial_end_date: newEndDate.toISOString(),
        trial_extended_days: trialData.trial_extended_days + coupon.trial_extension_days,
      })
      .eq('user_id', user.id);

    // Record redemption
    await supabaseClient
      .from('coupon_redemptions')
      .insert({
        user_id: user.id,
        coupon_id: coupon.id,
      });

    // Increment times_used
    await supabaseClient
      .from('coupon_codes')
      .update({ times_used: coupon.times_used + 1 })
      .eq('id', coupon.id);

    return new Response(
      JSON.stringify({
        success: true,
        daysExtended: coupon.trial_extension_days,
        newEndDate: newEndDate.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
