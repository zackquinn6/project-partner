import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MaintenanceReminderRequest {
  type: 'test' | 'monthly' | 'weekly' | 'daily';
  email: string;
  userName: string;
  tasks?: Array<{
    title: string;
    dueDate: string;
    category: string;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing maintenance reminder request...");
    
    const { type, email, userName, tasks }: MaintenanceReminderRequest = await req.json();

    if (!email || !userName) {
      return new Response(
        JSON.stringify({ error: "Email and userName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending ${type} maintenance reminder to ${email}`);

    let subject = "";
    let htmlContent = "";

    if (type === 'test') {
      subject = "Test - Home Maintenance Reminder";
      htmlContent = `
        <h2>Test Maintenance Reminder</h2>
        <p>Hello ${userName},</p>
        
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
        <strong>DIY Project Assistant Team</strong></p>
      `;
    } else {
      // Real maintenance reminders
      const taskCount = tasks?.length || 0;
      
      if (type === 'monthly') {
        subject = `Monthly Home Maintenance Reminder - ${taskCount} tasks coming up`;
      } else if (type === 'weekly') {
        subject = `Weekly Home Maintenance Reminder - ${taskCount} tasks this week`;
      } else if (type === 'daily') {
        subject = `Daily Home Maintenance Reminder - ${taskCount} tasks due today`;
      }

      const timeFrame = type === 'monthly' ? 'this month' : 
                      type === 'weekly' ? 'this week' : 'today';

      htmlContent = `
        <h2>Home Maintenance Reminder</h2>
        <p>Hello ${userName},</p>
        
        <p>You have ${taskCount} maintenance task${taskCount !== 1 ? 's' : ''} due ${timeFrame}:</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          ${tasks?.map(task => `
            <div style="border-left: 4px solid #007bff; padding-left: 15px; margin: 15px 0;">
              <h4 style="margin: 0; color: #333;">${task.title}</h4>
              <p style="margin: 5px 0; color: #666;">
                Category: ${task.category} | Due: ${new Date(task.dueDate).toLocaleDateString()}
              </p>
            </div>
          `).join('') || ''}
        </div>
        
        <p>Regular maintenance helps prevent costly repairs and keeps your home in excellent condition.</p>
        
        <p>Log into your DIY Project Assistant to mark tasks as complete and track your progress.</p>
        
        <p>Best regards,<br>
        <strong>DIY Project Assistant Team</strong></p>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "DIY Project Assistant <onboarding@resend.dev>",
      to: [email],
      subject: subject,
      html: htmlContent,
    });

    console.log("Maintenance reminder email sent successfully:", emailResponse);

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
  } catch (error: any) {
    console.error("Error in send-maintenance-reminder function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to send maintenance reminder. Please try again later.",
        details: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);