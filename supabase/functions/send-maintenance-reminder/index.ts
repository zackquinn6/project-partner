import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const body = await req.json();
    const validatedData = requestSchema.parse(body);
    
    // Verify the email matches the authenticated user
    if (validatedData.email !== user.email) {
      throw new Error('Email mismatch with authenticated user');
    }

    console.log("[MaintenanceReminder] Step 1: Validated request", {
      type: validatedData.type,
      email: validatedData.email,
      userName: validatedData.userName,
    });

    let subject = "";
    let htmlContent = "";

    if (validatedData.type === 'test') {
      subject = "Test - Home Maintenance Reminder";
      htmlContent = `
        <h2>Test Maintenance Reminder</h2>
        <p>Hello ${escapeHtml(validatedData.userName)},</p>
        
        <p>This is a test email to confirm your maintenance notification settings are working correctly.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>✅ Email notifications are set up and working!</h3>
          <p>You will receive reminders for:</p>
          <ul>
            <li>Tasks due in the upcoming month</li>
            <li>Tasks due in the upcoming week</li>
            <li>Tasks due today</li>
          </ul>
        </div>
        
        <p>Keep your home in great condition!</p>
        
        <p>Best regards,<br>
        <strong>Project Partner Team</strong></p>
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
      throw new Error(emailResponse.error.message || "Email service failed to send");
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
      : msg.includes('Email mismatch') ? 403
      : 500;
    const message =
      statusCode === 401 ? 'Authentication required'
      : statusCode === 403 ? msg
      : msg.includes('configuration') ? 'Email service is not configured. Please try again later.'
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