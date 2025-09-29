import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { Resend } from 'https://esm.sh/resend@4.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Task {
  title: string;
  startTime: string;
  endTime: string;
  targetCompletion: string;
  latestCompletion: string;
  estimatedHours: number;
}

interface NotificationRequest {
  recipientEmail: string;
  recipientName: string;
  projectName: string;
  tasks: Task[];
  targetDate: string;
  dropDeadDate: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipientEmail, recipientName, projectName, tasks, targetDate, dropDeadDate }: NotificationRequest = 
      await req.json();

    console.log(`Sending schedule notification to ${recipientEmail} for project ${projectName}`);

    // Format email content
    const tasksHtml = tasks.map(task => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <strong>${task.title}</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${task.startTime}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${task.endTime}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #059669;">
          ${task.targetCompletion}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #dc2626;">
          ${task.latestCompletion}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${task.estimatedHours.toFixed(1)}h
        </td>
      </tr>
    `).join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Project Schedule Assignment</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 800px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Project Schedule Assignment</h1>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${recipientName},</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              You have been assigned tasks for the <strong>${projectName}</strong> project. Below is your schedule with both target and latest completion dates.
            </p>
            
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="margin: 0 0 10px 0; color: #1f2937;">Project Timeline</h3>
              <p style="margin: 5px 0;">
                <strong>Target Completion:</strong> 
                <span style="color: #059669;">${new Date(targetDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </p>
              <p style="margin: 5px 0;">
                <strong>Drop-Dead Date (NLT):</strong> 
                <span style="color: #dc2626;">${new Date(dropDeadDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </p>
            </div>

            <h3 style="color: #1f2937; margin-bottom: 15px;">Your Assigned Tasks (${tasks.length})</h3>
            
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; background: white;">
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #d1d5db;">Task</th>
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #d1d5db;">Start</th>
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #d1d5db;">End</th>
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #059669; border-bottom: 2px solid #d1d5db;">Target Complete</th>
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #dc2626; border-bottom: 2px solid #d1d5db;">Latest Complete</th>
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #d1d5db;">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  ${tasksHtml}
                </tbody>
              </table>
            </div>

            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 25px; border-radius: 4px;">
              <p style="margin: 0; color: #92400e;">
                <strong>About the Dates:</strong> Target dates are your goals, while latest completion dates represent the absolute deadline based on critical path analysis. Completing tasks by their target dates helps ensure the entire project stays on track.
              </p>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
              <p style="margin: 5px 0;">This is an automated notification from your project scheduling system.</p>
              <p style="margin: 5px 0;">Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: 'Project Partner <onboarding@resend.dev>',
      to: [recipientEmail],
      subject: `Project Schedule: ${projectName}`,
      html: emailHtml
    });

    if (error) {
      console.error('Error sending email:', error);
      throw error;
    }

    console.log('Schedule notification sent successfully:', data);

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('Error in send-schedule-notification function:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Failed to send notification' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
