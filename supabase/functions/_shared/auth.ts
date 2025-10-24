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