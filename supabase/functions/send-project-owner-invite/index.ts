import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { verifyAuth } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  invitation_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestingUser = await verifyAuth(req)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const authHeader = req.headers.get('Authorization')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} }
    })

    const { invitation_id }: RequestBody = await req.json()
    if (!invitation_id) {
      return new Response(
        JSON.stringify({ error: 'invitation_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: invitation, error: invError } = await supabase
      .from('project_owner_invitations')
      .select('id, project_id, invited_email, invited_user_id, invitation_token, status, expires_at')
      .eq('id', invitation_id)
      .single()

    if (invError || !invitation || invitation.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Invitation not found or not pending' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', invitation.project_id)
      .single()

    const projectName = (project as { name?: string } | null)?.name ?? 'Project'
    const origin = req.headers.get('origin') || Deno.env.get('PUBLIC_APP_URL') || 'https://app.toolio.com'
    const acceptUrl = `${origin}/accept-project-owner?token=${encodeURIComponent(invitation.invitation_token)}`

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (RESEND_API_KEY) {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Project Owner invitation</h2>
          <p>You have been invited to become a Project Owner for <strong>${projectName}</strong>.</p>
          <p>Accept the Project Owner agreement to get access to project management and analytics for this project.</p>
          <p style="margin-top: 24px;">
            <a href="${acceptUrl}" style="background: #333; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept invitation</a>
          </p>
          <p style="margin-top: 24px; color: #666; font-size: 14px;">This link expires in 7 days. If you did not expect this email, you can ignore it.</p>
        </div>
      `
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Project Partner <noreply@resend.dev>',
          to: [invitation.invited_email],
          subject: `Project Owner invitation: ${projectName}`,
          html: htmlContent,
        }),
      })
    }

    if (invitation.invited_user_id) {
      await supabase.from('notifications').insert({
        user_id: invitation.invited_user_id,
        type: 'project_owner_invite',
        title: `Project Owner invitation: ${projectName}`,
        body: `Accept the agreement to become a Project Owner for ${projectName}.`,
        metadata: { invitation_token: invitation.invitation_token, accept_url: acceptUrl }
      })
    }

    return new Response(
      JSON.stringify({ ok: true, email_sent: !!RESEND_API_KEY }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('send-project-owner-invite:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: error.message === 'Missing authorization header' || error.message === 'Invalid or expired token' ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
