import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

async function resolveUserId(
  supabase: ReturnType<typeof createClient>,
  customerId: string,
  email: string | null | undefined,
): Promise<string | null> {
  const { data: byCustomer } = await supabase
    .from("stripe_subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (byCustomer?.user_id) return byCustomer.user_id;

  if (!email) return null;

  const { data: users, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (error) {
    logStep("Failed to list users for email lookup");
    return null;
  }
  const match = users.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  return match?.id ?? null;
}

async function setMemberRoles(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  isMember: boolean,
) {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("roles")
    .eq("user_id", userId)
    .maybeSingle();

  const current = Array.isArray(profile?.roles) ? profile.roles : [];
  const next = isMember
    ? [...current.filter((r: string) => r !== "non_member"), "member"]
    : [...current.filter((r: string) => r !== "member"), "non_member"];

  if (JSON.stringify([...next].sort()) !== JSON.stringify([...current].sort())) {
    await supabase.from("user_profiles").update({ roles: next }).eq("user_id", userId);
  }
}

async function applyActiveSubscription(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  subscription: Stripe.Subscription,
  customerId: string,
) {
  const periodStart = new Date(subscription.current_period_start * 1000);
  const periodEnd = new Date(subscription.current_period_end * 1000);
  const priceId = subscription.items.data[0]?.price?.id ?? "";

  await supabase.from("stripe_subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      status: subscription.status,
      price_id: priceId,
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );

  await supabase
    .from("membership_status")
    .upsert(
      {
        user_id: userId,
        member_status: true,
        membership_start_date: periodStart.toISOString().slice(0, 10),
        membership_end_date: periodEnd.toISOString().slice(0, 10),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  await setMemberRoles(supabase, userId, true);
}

async function applyCanceledSubscription(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  subscription: Stripe.Subscription,
  customerId: string,
) {
  await supabase.from("stripe_subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      status: subscription.status,
      price_id: subscription.items.data[0]?.price?.id ?? "",
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );

  await supabase
    .from("membership_status")
    .update({
      member_status: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  await setMemberRoles(supabase, userId, false);
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stripeKey = Deno.env.get("Stripe");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    logStep("Missing Stripe or STRIPE_WEBHOOK_SECRET");
    return new Response(JSON.stringify({ error: "Service configuration error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    logStep("Signature verification failed", {
      message: err instanceof Error ? err.message : String(err),
    });
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    logStep("Event received", { type: event.type, id: event.id });

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      let email: string | null = null;
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer.deleted) {
          email = customer.email ?? null;
        }
      } catch {
        logStep("Could not retrieve customer");
      }

      const userId = await resolveUserId(supabase, customerId, email);
      if (!userId) {
        logStep("No user mapped for subscription event", { customerId, type: event.type });
        return new Response(JSON.stringify({ received: true, mapped: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const active =
        event.type !== "customer.subscription.deleted" &&
        (subscription.status === "active" || subscription.status === "trialing");

      if (active) {
        await applyActiveSubscription(supabase, userId, subscription, customerId);
        logStep("Applied active subscription", { userId });
      } else {
        await applyCanceledSubscription(supabase, userId, subscription, customerId);
        logStep("Applied canceled/inactive subscription", { userId });
      }
    } else if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.subscription && session.customer) {
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer.id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = await resolveUserId(
          supabase,
          customerId,
          session.customer_email ?? session.customer_details?.email ?? null,
        );
        if (userId) {
          await applyActiveSubscription(supabase, userId, subscription, customerId);
          logStep("Checkout completed membership sync", { userId });
        } else {
          logStep("Checkout completed but no user mapped", { customerId });
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logStep("Handler error", {
      message: error instanceof Error ? error.message : String(error),
    });
    return new Response(JSON.stringify({ error: "Webhook handler failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
