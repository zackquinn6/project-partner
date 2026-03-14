import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const baseUrl = () => Deno.env.get("PUBLIC_APP_URL") || Deno.env.get("SUPABASE_URL") || "";

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
    const todayStr = now.toISOString().slice(0, 10);

    // Only consider rows with trial_end_date set (trial was started; not in beta at signup)
    const msSelect = "id, user_id, trial_end_date, email_sent_1day_before, email_sent_on_expiry, last_trial_notification_date";

    // 1) 6th day: reminder email (1 day before trial ends) – positive
    const { data: dayBeforeRows } = await supabaseClient
      .from("membership_status")
      .select(msSelect)
      .not("trial_end_date", "is", null)
      .lte("trial_end_date", tomorrow.toISOString())
      .gte("trial_end_date", now.toISOString())
      .eq("email_sent_1day_before", false);

    let dayBeforeCount = 0;
    if (dayBeforeRows?.length) {
      for (const row of dayBeforeRows) {
        const { data: profile } = await supabaseClient
          .from("user_profiles")
          .select("email")
          .eq("user_id", row.user_id)
          .maybeSingle();
        const email = profile?.email;
        if (!email) continue;

        await resend.emails.send({
          from: "Toolio <onboarding@resend.dev>",
          to: [email],
          subject: "One more day of your free trial – we hope you're enjoying it",
          html: `
            <h1>You've got one more day of your free trial</h1>
            <p>Hi there!</p>
            <p>Your 7-day free trial of Toolio ends tomorrow. We really hope you've enjoyed using the app to move your project forward.</p>
            <p>If you'd like to keep full access to the Project Catalog and Project Workflows, you can subscribe for just $25/year. You'll also keep access to:</p>
            <ul>
              <li>Home Maintenance Tracking</li>
              <li>Task Manager</li>
              <li>My Tools</li>
              <li>Profile Management</li>
            </ul>
            <p>We'd love to have you continue. Subscribe when you're ready:</p>
            <p><a href="${baseUrl()}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Continue with Toolio</a></p>
            <p>Thanks for trying Toolio – we're here to help you get the project done.</p>
          `,
        });

        await supabaseClient
          .from("membership_status")
          .update({ email_sent_1day_before: true })
          .eq("id", row.id);
        dayBeforeCount++;
      }
    }

    // 2) Expired trials – positive tone
    const { data: expiredRows } = await supabaseClient
      .from("membership_status")
      .select(msSelect)
      .not("trial_end_date", "is", null)
      .lte("trial_end_date", now.toISOString())
      .eq("email_sent_on_expiry", false);

    let expiredCount = 0;
    if (expiredRows?.length) {
      for (const row of expiredRows) {
        const { data: profile } = await supabaseClient
          .from("user_profiles")
          .select("email")
          .eq("user_id", row.user_id)
          .maybeSingle();
        const email = profile?.email;
        if (!email) continue;

        await resend.emails.send({
          from: "Toolio <onboarding@resend.dev>",
          to: [email],
          subject: "Your trial has ended – we hope to see you back",
          html: `
            <h1>Your free trial has ended</h1>
            <p>Hi there!</p>
            <p>Your 7-day free trial of Toolio has ended. We hope it was useful for your project.</p>
            <p>You still have access to our free features: Home Maintenance, Task Manager, My Tools, and Profile Management. Whenever you're ready to unlock the full Project Catalog and Workflows, subscribe for $25/year.</p>
            <p><a href="${baseUrl()}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Return to Toolio</a></p>
            <p>Thank you for using Toolio – we're rooting for your project.</p>
          `,
        });

        await supabaseClient
          .from("membership_status")
          .update({ email_sent_on_expiry: true })
          .eq("id", row.id);
        expiredCount++;
      }
    }

    // 3) Daily in-app reminder email: users in trial who haven't been reminded today
    const { data: dailyRows } = await supabaseClient
      .from("membership_status")
      .select(msSelect)
      .not("trial_end_date", "is", null)
      .gt("trial_end_date", now.toISOString())
      .or("last_trial_notification_date.is.null,last_trial_notification_date.lt." + todayStr);

    let dailyCount = 0;
    if (dailyRows?.length) {
      for (const row of dailyRows) {
        const { data: profile } = await supabaseClient
          .from("user_profiles")
          .select("email")
          .eq("user_id", row.user_id)
          .maybeSingle();
        const email = profile?.email;
        if (!email) continue;

        const endDate = row.trial_end_date ? new Date(row.trial_end_date) : null;
        const daysLeft = endDate ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))) : 0;

        await resend.emails.send({
          from: "Toolio <onboarding@resend.dev>",
          to: [email],
          subject: `You have ${daysLeft} day${daysLeft !== 1 ? "s" : ""} left in your free trial`,
          html: `
            <h1>Your trial is going strong</h1>
            <p>Hi there!</p>
            <p>You have ${daysLeft} day${daysLeft !== 1 ? "s" : ""} left in your free trial. We hope you're finding Toolio helpful for your project.</p>
            <p>Use this time to explore the Project Catalog and workflows – we're here to help you get things done. If you have any questions, just reach out.</p>
            <p><a href="${baseUrl()}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Open Toolio</a></p>
            <p>We're glad you're here.</p>
          `,
        });

        await supabaseClient
          .from("membership_status")
          .update({ last_trial_notification_date: todayStr })
          .eq("id", row.id);
        dailyCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dayBeforeCount,
        expiredCount,
        dailyReminderCount: dailyCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
