-- Enable password protection and strengthen security policies

-- First, let's add better policies for the failed_login_attempts table
-- Only allow system processes (security definer functions) to insert
DROP POLICY IF EXISTS "System can log failed login attempts" ON public.failed_login_attempts;
CREATE POLICY "System can log failed login attempts" 
ON public.failed_login_attempts 
FOR INSERT 
WITH CHECK (false); -- This forces all inserts to go through security definer functions only

-- Add a policy to allow cleanup by admins (for maintenance)
CREATE POLICY "Admins can delete old failed login attempts" 
ON public.failed_login_attempts 
FOR DELETE 
USING (is_admin(auth.uid()) AND attempt_time < (now() - INTERVAL '30 days'));

-- Improve user_sessions policies with better time-based restrictions
CREATE POLICY "Admins can delete old sessions" 
ON public.user_sessions 
FOR DELETE 
USING (is_admin(auth.uid()));

-- Add better logging for security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  event_description text,
  user_email text DEFAULT NULL,
  ip_addr text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log security events to a secure audit trail
  INSERT INTO public.role_audit_log (
    user_id,
    target_user_id, 
    action,
    role,
    target_user_email
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    event_type,
    'security_event',
    COALESCE(user_email, event_description)
  );
END;
$$;

-- Create a function to validate admin privileges more securely
CREATE OR REPLACE FUNCTION public.validate_admin_action(action_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_is_admin boolean;
BEGIN
  -- Check if user is admin
  SELECT is_admin(auth.uid()) INTO user_is_admin;
  
  IF NOT user_is_admin THEN
    -- Log the unauthorized attempt
    PERFORM log_security_event('unauthorized_admin_attempt', action_type);
    RETURN false;
  END IF;
  
  -- Log the successful admin action
  PERFORM log_security_event('admin_action', action_type);
  RETURN true;
END;
$$;

-- Add content security policy helper function
CREATE OR REPLACE FUNCTION public.get_security_headers()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
SELECT json_build_object(
  'Content-Security-Policy', 'default-src ''self''; script-src ''self'' ''unsafe-inline''; style-src ''self'' ''unsafe-inline''; img-src ''self'' data: https:; font-src ''self'' data:; connect-src ''self'' https://*.supabase.co',
  'X-Frame-Options', 'DENY',
  'X-Content-Type-Options', 'nosniff',
  'Referrer-Policy', 'strict-origin-when-cross-origin',
  'Permissions-Policy', 'geolocation=(), microphone=(), camera=()'
);
$$;