import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { verifyAuth } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Assignment {
  taskTitle: string;
  subtaskTitle: string | null;
}

interface Notification {
  personName: string;
  email?: string;
  phone?: string;
  assignments: Assignment[];
}

interface RequestBody {
  notifications: Notification[];
  userEmail?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication
    const user = await verifyAuth(req);
    
    // Parse request body
    const { notifications, userEmail }: RequestBody = await req.json();

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No notifications provided' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get Resend API key
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured - notifications disabled');
      // Don't fail - just log and return success
      return new Response(
        JSON.stringify({ 
          message: 'Assignments saved (email notifications not configured)',
          emailsSent: 0
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let emailsSent = 0;
    const errors: string[] = [];

    // Send email notifications
    for (const notification of notifications) {
      if (!notification.email) continue;

      const assignmentsList = notification.assignments
        .map(a => {
          if (a.subtaskTitle) {
            return `<li><strong>${a.taskTitle}</strong>: ${a.subtaskTitle}</li>`;
          }
          return `<li>${a.taskTitle}</li>`;
        })
        .join('');

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Task Assignments</h2>
          <p>Hi ${notification.personName},</p>
          <p>You have been assigned the following tasks:</p>
          <ul style="line-height: 1.8;">
            ${assignmentsList}
          </ul>
          <p style="margin-top: 20px; color: #666; font-size: 14px;">
            This notification was sent by ${userEmail || 'your project manager'}
          </p>
        </div>
      `;

      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'Task Manager <noreply@resend.dev>',
            to: [notification.email],
            subject: 'New Task Assignments',
            html: htmlContent,
          }),
        });

        if (emailResponse.ok) {
          emailsSent++;
        } else {
          const errorData = await emailResponse.text();
          errors.push(`Failed to send email to ${notification.email}: ${errorData}`);
        }
      } catch (error) {
        errors.push(`Error sending email to ${notification.email}: ${error.message}`);
      }
    }

    // SMS notifications would go here when Twilio is configured
    // For now, we'll just log that SMS would be sent
    const smsCount = notifications.filter(n => n.phone && !n.email).length;
    if (smsCount > 0) {
      console.log(`${smsCount} SMS notifications would be sent (not yet configured)`);
    }

    return new Response(
      JSON.stringify({ 
        message: 'Notifications processed',
        emailsSent,
        smsNotConfigured: smsCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in send-assignment-notification:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error'
      }),
      { 
        status: error.message === 'Missing authorization header' || error.message === 'Invalid or expired token' ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})
