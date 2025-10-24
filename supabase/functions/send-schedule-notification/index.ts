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
const assignmentSchema = z.object({
  taskTitle: z.string().max(200),
  subtaskTitle: z.string().max(200),
  personName: z.string().max(100),
  scheduledDate: z.string().datetime(),
  scheduledHours: z.number().min(0).max(24)
});

const personSchema = z.object({
  name: z.string().max(100),
  id: z.string().uuid()
});

const requestSchema = z.object({
  schedule: z.array(assignmentSchema).max(500),
  startDate: z.string().datetime(),
  userEmail: z.string().email().max(255),
  people: z.array(personSchema).max(50)
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
    if (validatedData.userEmail !== user.email) {
      throw new Error('Email mismatch with authenticated user');
    }

    // Group assignments by date
    const assignmentsByDate = validatedData.schedule.reduce((acc: Record<string, typeof validatedData.schedule>, assignment) => {
      const date = new Date(assignment.scheduledDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(assignment);
      return acc;
    }, {});

    const sortedDates = Object.keys(assignmentsByDate).sort();

    // Generate HTML email with escaped content to prevent XSS
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; }
          .date-section { margin: 20px 0; }
          .date-header { background: #e5e7eb; padding: 10px; font-weight: bold; border-radius: 4px; }
          .assignment { background: white; padding: 12px; margin: 8px 0; border-left: 4px solid #2563eb; }
          .assignment-title { font-weight: bold; color: #1f2937; }
          .assignment-details { font-size: 14px; color: #6b7280; margin-top: 4px; }
          .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 8px; }
          .badge-person { background: #dbeafe; color: #1e40af; }
          .badge-hours { background: #e0e7ff; color: #3730a3; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Your Work Schedule</h1>
            <p style="margin: 10px 0 0 0;">Starting from ${new Date(validatedData.startDate).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}</p>
          </div>
          <div class="content">
            <p><strong>Total Assignments:</strong> ${validatedData.schedule.length}</p>
            <p><strong>Team Members:</strong> ${validatedData.people.map(p => escapeHtml(p.name)).join(', ')}</p>
            
            ${sortedDates.map(date => `
              <div class="date-section">
                <div class="date-header">${escapeHtml(date)}</div>
                ${assignmentsByDate[date].map(assignment => `
                  <div class="assignment">
                    <div class="assignment-title">${escapeHtml(assignment.subtaskTitle)}</div>
                    <div class="assignment-details">
                      Task: ${escapeHtml(assignment.taskTitle)}
                    </div>
                    <div style="margin-top: 8px;">
                      <span class="badge badge-person">${escapeHtml(assignment.personName)}</span>
                      <span class="badge badge-hours">${assignment.scheduledHours.toFixed(1)} hours</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            `).join('')}
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Home Task Manager <onboarding@resend.dev>",
      to: [validatedData.userEmail],
      subject: `Your Work Schedule - Starting ${new Date(validatedData.startDate).toLocaleDateString()}`,
      html: htmlContent,
    });

    console.log("Schedule email sent successfully");

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-schedule-notification function:", error);
    
    // Don't expose internal errors to users
    const statusCode = error.message.includes('authorization') || error.message.includes('token') ? 401 : 500;
    const message = statusCode === 401 ? 'Authentication required' : 'Failed to send notification';
    
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