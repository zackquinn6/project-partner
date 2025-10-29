import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find trials expiring in 1 day (not notified yet)
    const { data: trialsDayBefore } = await supabaseClient
      .from('trial_tracking')
      .select('*, profiles!inner(email)')
      .lte('trial_end_date', tomorrow.toISOString())
      .gte('trial_end_date', now.toISOString())
      .eq('email_sent_1day_before', false);

    // Send 1-day warning emails
    if (trialsDayBefore) {
      for (const trial of trialsDayBefore) {
        const email = trial.profiles?.email;
        if (!email) continue;

        await resend.emails.send({
          from: "Toolio <onboarding@resend.dev>",
          to: [email],
          subject: "Your Toolio Trial Ends Tomorrow",
          html: `
            <h1>Your Free Trial Ends Tomorrow</h1>
            <p>Hi there!</p>
            <p>Your 7-day free trial of Toolio's premium features will end tomorrow.</p>
            <p>After your trial ends, you'll still have access to our free features including:</p>
            <ul>
              <li>Home Maintenance Tracking</li>
              <li>Task Manager</li>
              <li>My Tools</li>
              <li>Profile Management</li>
            </ul>
            <p>To continue enjoying full access to the Project Catalog and Project Workflows, subscribe for just $25/year.</p>
            <p><a href="${Deno.env.get("SUPABASE_URL")}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Subscribe Now</a></p>
            <p>Thanks for trying Toolio!</p>
          `,
        });

        await supabaseClient
          .from('trial_tracking')
          .update({ email_sent_1day_before: true })
          .eq('id', trial.id);
      }
    }

    // Find expired trials (not notified yet)
    const { data: expiredTrials } = await supabaseClient
      .from('trial_tracking')
      .select('*, profiles!inner(email)')
      .lte('trial_end_date', now.toISOString())
      .eq('email_sent_on_expiry', false);

    // Send expiry emails
    if (expiredTrials) {
      for (const trial of expiredTrials) {
        const email = trial.profiles?.email;
        if (!email) continue;

        await resend.emails.send({
          from: "Toolio <onboarding@resend.dev>",
          to: [email],
          subject: "Your Toolio Trial Has Ended",
          html: `
            <h1>Your Free Trial Has Ended</h1>
            <p>Hi there!</p>
            <p>Your 7-day free trial of Toolio's premium features has ended.</p>
            <p>You now have access to our free features:</p>
            <ul>
              <li>Home Maintenance Tracking</li>
              <li>Task Manager</li>
              <li>My Tools</li>
              <li>Profile Management</li>
            </ul>
            <p>Ready to unlock the Project Catalog and Project Workflows? Subscribe for just $25/year.</p>
            <p><a href="${Deno.env.get("SUPABASE_URL")}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Subscribe Now</a></p>
            <p>Thank you for using Toolio!</p>
          `,
        });

        await supabaseClient
          .from('trial_tracking')
          .update({ email_sent_on_expiry: true })
          .eq('id', trial.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        dayBeforeCount: trialsDayBefore?.length || 0,
        expiredCount: expiredTrials?.length || 0
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
