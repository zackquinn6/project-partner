import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { verifyAuth } from '../_shared/auth.ts'
import { escapeHtml } from '../_shared/validation.ts'

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
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NOTIFICATIONS = 25;
const MAX_ASSIGNMENTS = 50;

const clamp = (value: unknown, max: number) => String(value ?? '').slice(0, max);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const user = await verifyAuth(req);

    const { notifications }: RequestBody = await req.json();

    if (!Array.isArray(notifications) || notifications.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No notifications provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (notifications.length > MAX_NOTIFICATIONS) {
      return new Response(
        JSON.stringify({ error: 'Too many notifications in one request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the set of recipients this caller is allowed to email:
    // their own address plus the people/contractors saved on their own account.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const allowedRecipients = new Set<string>();
    if (user.email) allowedRecipients.add(user.email.toLowerCase());

    const [{ data: people }, { data: contractors }] = await Promise.all([
      admin.from('home_task_people').select('email').eq('user_id', user.id),
      admin.from('user_contractors').select('email').eq('user_id', user.id),
    ]);

    for (const row of [...(people ?? []), ...(contractors ?? [])]) {
      const email = (row as { email?: string | null }).email;
      if (email) allowedRecipients.add(email.toLowerCase());
    }

    // Only the caller's own task/subtask titles may appear in an outbound email,
    // so the endpoint cannot be used to send arbitrary text to those contacts.
    const [{ data: ownTasks }, { data: ownSubtasks }] = await Promise.all([
      admin.from('home_tasks').select('title').eq('user_id', user.id),
      admin.from('home_task_subtasks').select('title').eq('user_id', user.id),
    ]);

    const allowedTaskTitles = new Set<string>();
    const allowedSubtaskTitles = new Set<string>();
    for (const row of ownTasks ?? []) {
      const title = (row as { title?: string | null }).title;
      if (title) allowedTaskTitles.add(title.trim().toLowerCase());
    }
    for (const row of ownSubtasks ?? []) {
      const title = (row as { title?: string | null }).title;
      if (title) allowedSubtaskTitles.add(title.trim().toLowerCase());
    }



    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured - notifications disabled');
      return new Response(
        JSON.stringify({
          message: 'Assignments saved (email notifications not configured)',
          emailsSent: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let emailsSent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const notification of notifications) {
      const email = typeof notification?.email === 'string' ? notification.email.trim().toLowerCase() : '';
      if (!email) continue;

      if (email.length > 254 || !EMAIL_RE.test(email) || !allowedRecipients.has(email)) {
        skipped++;
        console.warn('Blocked assignment notification to a recipient outside the caller\'s own contacts');
        continue;
      }

      const assignments = (Array.isArray(notification.assignments)
        ? notification.assignments.slice(0, MAX_ASSIGNMENTS)
        : []
      ).filter(a => {
        const task = String(a?.taskTitle ?? '').trim().toLowerCase();
        if (!task || !allowedTaskTitles.has(task)) return false;
        const sub = String(a?.subtaskTitle ?? '').trim().toLowerCase();
        return !sub || allowedSubtaskTitles.has(sub);
      });

      if (assignments.length === 0) {
        skipped++;
        console.warn('Blocked assignment notification with content outside the caller\'s own tasks');
        continue;
      }

      const assignmentsList = assignments
        .map(a => {
          const taskTitle = escapeHtml(clamp(a?.taskTitle, 200));
          const subtaskTitle = a?.subtaskTitle ? escapeHtml(clamp(a.subtaskTitle, 200)) : '';
          return subtaskTitle
            ? `<li><strong>${taskTitle}</strong>: ${subtaskTitle}</li>`
            : `<li>${taskTitle}</li>`;
        })
        .join('');


      const personName = escapeHtml(clamp(notification?.personName, 120)) || 'there';
      const senderEmail = escapeHtml(clamp(user.email ?? '', 254)) || 'your project manager';

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Task Assignments</h2>
          <p>Hi ${personName},</p>
          <p>You have been assigned the following tasks:</p>
          <ul style="line-height: 1.8;">
            ${assignmentsList}
          </ul>
          <p style="margin-top: 20px; color: #666; font-size: 14px;">
            This notification was sent by ${senderEmail}
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
            to: [email],
            subject: 'New Task Assignments',
            html: htmlContent,
          }),
        });

        if (emailResponse.ok) {
          emailsSent++;
        } else {
          console.error('Resend rejected an assignment notification', await emailResponse.text());
          errors.push('One notification could not be delivered');
        }
      } catch (error) {
        console.error('Error sending assignment notification:', error);
        errors.push('One notification could not be delivered');
      }
    }

    const smsCount = notifications.filter(n => n.phone && !n.email).length;
    if (smsCount > 0) {
      console.log(`${smsCount} SMS notifications would be sent (not yet configured)`);
    }

    return new Response(
      JSON.stringify({
        message: 'Notifications processed',
        emailsSent,
        skipped,
        smsNotConfigured: smsCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-assignment-notification:', error);
    const message = error instanceof Error ? error.message : '';
    const unauthorized = message === 'Missing authorization header' || message === 'Invalid or expired token';

    return new Response(
      JSON.stringify({ error: unauthorized ? 'Authentication required' : 'Request could not be processed' }),
      { status: unauthorized ? 401 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
