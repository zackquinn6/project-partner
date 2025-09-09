-- Fix security vulnerabilities in user data tables (handling existing policies)

-- 1. Fix the get_user_notification_settings function to include proper access controls
CREATE OR REPLACE FUNCTION public.get_user_notification_settings(user_uuid uuid)
 RETURNS TABLE(id uuid, user_id uuid, email_enabled boolean, sms_enabled boolean, email_address text, phone_number text, notify_monthly boolean, notify_weekly boolean, notify_due_date boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow users to access their own data or admins to access any data
  IF auth.uid() != user_uuid AND NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot access notification settings for other users';
  END IF;

  -- Log sensitive data access
  PERFORM log_sensitive_data_access('maintenance_notification_settings', user_uuid, 'read');

  RETURN QUERY
  SELECT * FROM maintenance_notification_settings 
  WHERE maintenance_notification_settings.user_id = user_uuid;
END;
$function$;

-- 2. Fix the upsert_notification_settings function to include proper access controls  
CREATE OR REPLACE FUNCTION public.upsert_notification_settings(user_uuid uuid, email_enabled boolean, sms_enabled boolean, email_address text, phone_number text, notify_monthly boolean, notify_weekly boolean, notify_due_date boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result_id UUID;
BEGIN
  -- Only allow users to modify their own data
  IF auth.uid() != user_uuid THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify notification settings for other users';
  END IF;

  -- Log sensitive data access
  PERFORM log_sensitive_data_access('maintenance_notification_settings', user_uuid, 'write');

  INSERT INTO maintenance_notification_settings (
    user_id,
    email_enabled,
    sms_enabled,
    email_address,
    phone_number,
    notify_monthly,
    notify_weekly,
    notify_due_date
  ) VALUES (
    user_uuid,
    email_enabled,
    sms_enabled,
    email_address,
    phone_number,
    notify_monthly,
    notify_weekly,
    notify_due_date
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email_enabled = EXCLUDED.email_enabled,
    sms_enabled = EXCLUDED.sms_enabled,
    email_address = EXCLUDED.email_address,
    phone_number = EXCLUDED.phone_number,
    notify_monthly = EXCLUDED.notify_monthly,
    notify_weekly = EXCLUDED.notify_weekly,
    notify_due_date = EXCLUDED.notify_due_date,
    updated_at = now()
  RETURNING id INTO result_id;
  
  RETURN result_id;
END;
$function$;

-- 3. Drop existing anonymous access denial policies and recreate them
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Deny anonymous access to notification settings" ON public.maintenance_notification_settings;
DROP POLICY IF EXISTS "Deny anonymous access to homes" ON public.homes;

-- Create new policies to explicitly deny anonymous access
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny anonymous access to notification settings"
ON public.maintenance_notification_settings
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny anonymous access to homes"
ON public.homes
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 4. Restrict failed_login_attempts to service role only for better security
DROP POLICY IF EXISTS "System can log failed login attempts" ON public.failed_login_attempts;
CREATE POLICY "Only service role can log failed login attempts"
ON public.failed_login_attempts
FOR INSERT
TO service_role
WITH CHECK (true);

-- 5. Create audit log table for sensitive data access monitoring
CREATE TABLE IF NOT EXISTS public.sensitive_data_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  accessed_table TEXT NOT NULL,
  accessed_user_id UUID NOT NULL,
  access_type TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.sensitive_data_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view the audit log
DROP POLICY IF EXISTS "Admins can view sensitive data access log" ON public.sensitive_data_access_log;
CREATE POLICY "Admins can view sensitive data access log"
ON public.sensitive_data_access_log
FOR SELECT
USING (is_admin(auth.uid()));

-- 6. Add logging function for sensitive data access (conditional creation)
CREATE OR REPLACE FUNCTION public.log_sensitive_data_access(
  accessed_table TEXT,
  accessed_user_id UUID,
  access_type TEXT DEFAULT 'read'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only log if we have a valid user context
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.sensitive_data_access_log (
      user_id,
      accessed_table,
      accessed_user_id,
      access_type
    ) VALUES (
      auth.uid(),
      accessed_table,
      accessed_user_id,
      access_type
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Silently fail logging to prevent breaking application functionality
    NULL;
END;
$function$;