import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RateLimitRequest {
  email: string;
  action: 'check' | 'record_failure';
  ip_address?: string;
  user_agent?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, action, ip_address, user_agent }: RateLimitRequest = await req.json();

    if (!email || !action) {
      return new Response(
        JSON.stringify({ error: 'Email and action are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'check') {
      // Check if rate limit is exceeded
      const { data: isAllowed, error } = await supabase.rpc('check_rate_limit', {
        identifier: email,
        max_attempts: 5,
        window_minutes: 15
      });

      if (error) {
        console.error('Rate limit check error:', error);
        // Gracefully degrade - if rate limit check fails (e.g., function doesn't exist),
        // allow the login attempt and let client-side rate limiting handle it
        console.log('Allowing login - client-side rate limiting will be used as fallback');
        return new Response(
          JSON.stringify({ allowed: true, fallback: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ allowed: isAllowed }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'record_failure') {
      // Record failed login attempt
      const { error } = await supabase.rpc('log_failed_login', {
        user_email: email,
        ip_addr: ip_address || null,
        user_agent_string: user_agent || null
      });

      if (error) {
        console.error('Failed to log login attempt:', error);
        // Gracefully degrade - if logging fails, don't block the user
        // The client-side will handle rate limiting as fallback
        console.log('Failed to log attempt server-side, continuing anyway');
        return new Response(
          JSON.stringify({ success: true, fallback: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auth rate limit error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);