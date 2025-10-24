import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Assignment {
  taskTitle: string;
  subtaskTitle: string;
  personName: string;
  scheduledDate: string;
  scheduledHours: number;
}

interface ScheduleNotificationRequest {
  schedule: Assignment[];
  startDate: string;
  userEmail: string;
  people: Array<{ name: string; id: string }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { schedule, startDate, userEmail, people }: ScheduleNotificationRequest = await req.json();

    // Group assignments by date
    const assignmentsByDate = schedule.reduce((acc: Record<string, Assignment[]>, assignment) => {
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

    // Generate HTML email
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
            <p style="margin: 10px 0 0 0;">Starting from ${new Date(startDate).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}</p>
          </div>
          <div class="content">
            <p><strong>Total Assignments:</strong> ${schedule.length}</p>
            <p><strong>Team Members:</strong> ${people.map(p => p.name).join(', ')}</p>
            
            ${sortedDates.map(date => `
              <div class="date-section">
                <div class="date-header">${date}</div>
                ${assignmentsByDate[date].map(assignment => `
                  <div class="assignment">
                    <div class="assignment-title">${assignment.subtaskTitle}</div>
                    <div class="assignment-details">
                      Task: ${assignment.taskTitle}
                    </div>
                    <div style="margin-top: 8px;">
                      <span class="badge badge-person">${assignment.personName}</span>
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
      to: [userEmail],
      subject: `Your Work Schedule - Starting ${new Date(startDate).toLocaleDateString()}`,
      html: htmlContent,
    });

    console.log("Schedule email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-schedule-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
