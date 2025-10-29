import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
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
    logStep("Function started");

    const stripeKey = Deno.env.get("Stripe");
    if (!stripeKey) throw new Error("Stripe secret is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user is admin
    const { data: adminRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (adminRole) {
      logStep("User is admin, no subscription needed");
      return new Response(JSON.stringify({ 
        subscribed: true, 
        isAdmin: true,
        subscriptionEnd: null 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, checking trial status");
      
      // Check trial status
      const { data: trialData } = await supabaseClient
        .from('trial_tracking')
        .select('trial_end_date')
        .eq('user_id', user.id)
        .single();

      const inTrial = trialData && new Date(trialData.trial_end_date) > new Date();
      
      // Update role to non_member if trial expired
      if (!inTrial) {
        await supabaseClient
          .from('user_roles')
          .delete()
          .eq('user_id', user.id)
          .eq('role', 'member');
        
        await supabaseClient
          .from('user_roles')
          .upsert({ user_id: user.id, role: 'non_member' }, { onConflict: 'user_id,role' });
      }

      return new Response(JSON.stringify({ 
        subscribed: false, 
        inTrial,
        trialEndDate: trialData?.trial_end_date 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });

      // Update Stripe subscription record
      await supabaseClient
        .from('stripe_subscriptions')
        .upsert({
          user_id: user.id,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
          status: subscription.status,
          price_id: subscription.items.data[0].price.id,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: subscriptionEnd,
          cancel_at_period_end: subscription.cancel_at_period_end || false,
        }, { onConflict: 'stripe_subscription_id' });

      // Update user role to member
      await supabaseClient
        .from('user_roles')
        .delete()
        .eq('user_id', user.id)
        .eq('role', 'non_member');

      await supabaseClient
        .from('user_roles')
        .upsert({ user_id: user.id, role: 'member' }, { onConflict: 'user_id,role' });

      logStep("Updated user role to member");
    } else {
      logStep("No active subscription found");
      
      // Update role to non_member
      await supabaseClient
        .from('user_roles')
        .delete()
        .eq('user_id', user.id)
        .eq('role', 'member');

      await supabaseClient
        .from('user_roles')
        .upsert({ user_id: user.id, role: 'non_member' }, { onConflict: 'user_id,role' });
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      subscriptionEnd,
      isAdmin: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
