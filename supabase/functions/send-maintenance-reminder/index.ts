import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { verifyAuth, getRequiredSecret } from "../_shared/auth.ts";
import { escapeHtml } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const taskSchema = z.object({
  title: z.string().max(200),
  dueDate: z.string().datetime(),
  category: z.string().max(100)
});

const requestSchema = z.object({
  type: z.enum(['test', 'monthly', 'weekly', 'daily']),
  email: z.string().email().max(255),
  userName: z.string().max(100),
  tasks: z.array(taskSchema).max(100).optional()
});

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const user = await verifyAuth(req);
    
    // Get API key with proper error handling
    const RESEND_API_KEY = getRequiredSecret('RESEND_API_KEY');
    const resend = new Resend(RESEND_API_KEY);
    
    // Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    const parseResult = requestSchema.safeParse(body);
    if (!parseResult.success) {
      const first = parseResult.error.flatten().fieldErrors;
      const msg = Object.values(first).flat().find(Boolean) as string | undefined;
      return new Response(
        JSON.stringify({ error: msg ?? 'Invalid request' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    const validatedData = parseResult.data;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization') ?? '' },
      },
    });

    const { data: settings, error: settingsError } = await supabaseClient
      .from('maintenance_notification_settings')
      .select('email_address')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settingsError) throw settingsError;

    const requestedEmail = validatedData.email.trim().toLowerCase();
    const allowedEmail = (settings?.email_address ?? '').trim().toLowerCase();
    const authEmail = (user.email ?? '').trim().toLowerCase();

    if (allowedEmail) {
      if (requestedEmail !== allowedEmail) {
        throw new Error('Email mismatch with saved notification settings');
      }
    } else {
      if (!authEmail) {
        throw new Error('No notification email is saved for this account');
      }
      if (requestedEmail !== authEmail) {
        throw new Error('Email mismatch with saved notification settings');
      }
    }

    console.log("[MaintenanceReminder] Step 1: Validated request", {
      type: validatedData.type,
      email: validatedData.email,
      userName: validatedData.userName,
    });

    let subject = "";
    let htmlContent = "";

    if (validatedData.type === 'test') {
      subject = "Test Maintenance Reminder";
      htmlContent = `
        <div style="max-width: 640px; margin: 0 auto; padding: 24px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; background-color: #000000;">
          <div style="text-align: left; margin-bottom: 24px;">
            <img 
              src="https://ff4d4ef6-43cd-4980-95c7-b7dcb84d3bbf.lovableproject.com/lovable-uploads/1a837ddc-50ca-40f7-b975-0ad92fdf9882.png" 
              alt="Project Partner" 
              style="max-width: 220px; height: auto;"
            />
          </div>
          <div style="background-color: #111827; border-radius: 12px; padding: 24px 20px; border: 1px solid #4B5563;">
            <h2 style="margin: 0 0 16px; font-size: 22px; line-height: 1.3; color: #F97316;">
              Test Maintenance Reminder
            </h2>
            <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.6; color: #F9FAFB;">
              Hey ${escapeHtml(validatedData.userName)},
            </p>
            <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #E5E7EB;">
              Just checking in to make sure your maintenance reminders are alive, well, and officially landing in your inbox.
            </p>
            <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #FBBF24;">
              ✨ Good news — your email notifications are working perfectly.
            </p>
            <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6; color: #E5E7EB;">
              You’ll now get heads‑ups for:
            </p>
            <ul style="margin: 0 0 16px 18px; padding: 0; color: #F9FAFB; font-size: 14px; line-height: 1.6;">
              <li>Tasks coming up this month</li>
              <li>Tasks sneaking up this week</li>
              <li>Tasks that need love today</li>
            </ul>
            <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #D1D5DB;">
              Think of it as your home’s way of saying “thanks for keeping me in shape.”
            </p>
            <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #E5E7EB;">
              You’re all set.
            </p>
            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #9CA3AF;">
              — The Project Partner Team
            </p>
          </div>
        </div>
      `;
    } else {
      const taskCount = validatedData.tasks?.length || 0;
      
      if (validatedData.type === 'monthly') {
        subject = `Monthly Home Maintenance Reminder - ${taskCount} tasks coming up`;
      } else if (validatedData.type === 'weekly') {
        subject = `Weekly Home Maintenance Reminder - ${taskCount} tasks this week`;
      } else if (validatedData.type === 'daily') {
        subject = `Daily Home Maintenance Reminder - ${taskCount} tasks due today`;
      }

      const timeFrame = validatedData.type === 'monthly' ? 'this month' : 
                      validatedData.type === 'weekly' ? 'this week' : 'today';

      htmlContent = `
        <h2>Home Maintenance Reminder</h2>
        <p>Hello ${escapeHtml(validatedData.userName)},</p>
        
        <p>You have ${taskCount} maintenance task${taskCount !== 1 ? 's' : ''} due ${timeFrame}:</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          ${validatedData.tasks?.map(task => `
            <div style="border-left: 4px solid #007bff; padding-left: 15px; margin: 15px 0;">
              <h4 style="margin: 0; color: #333;">${escapeHtml(task.title)}</h4>
              <p style="margin: 5px 0; color: #666;">
                Category: ${escapeHtml(task.category)} | Due: ${new Date(task.dueDate).toLocaleDateString()}
              </p>
            </div>
          `).join('') || ''}
        </div>
        
        <p>Regular maintenance helps prevent costly repairs and keeps your home in excellent condition.</p>
        
        <p>Log into your Project Partner to mark tasks as complete and track your progress.</p>
        
        <p>Best regards,<br>
        <strong>Project Partner Team</strong></p>
      `;
    }

    console.log("[MaintenanceReminder] Step 2: Calling Resend API", {
      from: "Project Partner <onboarding@resend.dev>",
      to: validatedData.email,
      subject,
    });
    // Note: Resend sandbox (onboarding@resend.dev) only delivers to the email that signed up for Resend. Add/verify your domain for other recipients.
    const emailResponse = await resend.emails.send({
      from: "Project Partner <onboarding@resend.dev>",
      to: [validatedData.email],
      subject: subject,
      html: htmlContent,
    });

    console.log("[MaintenanceReminder] Step 3: Resend response", {
      hasError: !!emailResponse.error,
      error: emailResponse.error ? JSON.stringify(emailResponse.error) : null,
      dataId: (emailResponse as { data?: { id?: string } }).data?.id ?? null,
    });

    if (emailResponse.error) {
      console.error("Resend API error:", emailResponse.error);
      throw new Error((emailResponse.error as { message?: string }).message || "Email service failed to send");
    }

    console.log("[MaintenanceReminder] Step 4: Email sent successfully", {
      id: (emailResponse as { data?: { id?: string } }).data?.id,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Maintenance reminder sent successfully!" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Error in send-maintenance-reminder function:", err);

    const msg = err.message;
    const statusCode =
      msg.includes('authorization') || msg.includes('token') || msg.includes('Authentication') ? 401
      : msg.includes('Email mismatch') || msg.includes('notification email') ? 403
      : 500;
    const message =
      statusCode === 401 ? 'Authentication required'
      : statusCode === 403 ? msg
      : 'Failed to send reminder';

    return new Response(
      JSON.stringify({ error: message }),
      {
        status: statusCode,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);