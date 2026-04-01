import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

/**
 * Verify JWT token and return authenticated user
 * This prevents unauthorized access to edge functions
 */
export async function verifyAuth(req: Request) {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    throw new Error('Missing authorization header');
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Create Supabase client for auth verification
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  
  const supabaseClient = createClient(supabaseUrl, supabaseKey);
  
  const { data: { user }, error } = await supabaseClient.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Invalid or expired token');
  }
  
  return user;
}

export async function verifyAdmin(req: Request) {
  const user = await verifyAuth(req);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('roles')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    throw new Error('Failed to verify admin access');
  }

  const roles = Array.isArray(profile?.roles) ? profile.roles : [];
  if (!roles.includes('admin')) {
    throw new Error('Admin access required');
  }

  return user;
}

export function verifyCronSecret(req: Request, envName = 'CRON_SECRET') {
  const expected = Deno.env.get(envName);
  const received = req.headers.get('x-cron-secret');

  if (!expected) {
    console.error(`Missing required secret: ${envName}`);
    throw new Error('Service configuration error');
  }

  if (!received || received !== expected) {
    throw new Error('Invalid cron secret');
  }
}

/**
 * Get required secret from environment with proper error handling
 * Prevents exposing configuration details in error messages
 */
export function getRequiredSecret(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    console.error(`Missing required secret: ${name}`);
    throw new Error('Service configuration error');
  }
  return value;
}