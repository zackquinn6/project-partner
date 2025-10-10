-- Fix RLS policy confusion on profiles, homes, and maintenance_notification_settings tables
-- These tables have confusing "Deny anonymous access" policies with USING (false)
-- which creates confusion and doesn't provide clear deny-by-default behavior

-- Drop confusing deny policies
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Deny anonymous access to homes" ON public.homes;
DROP POLICY IF EXISTS "Deny anonymous access to notification settings" ON public.maintenance_notification_settings;

-- Verify existing policies properly restrict access
-- No changes needed to other policies as they correctly implement:
-- 1. Users can only access their own data (auth.uid() = user_id)
-- 2. Admins can access all data with proper server-side validation

-- Log security improvement
SELECT log_comprehensive_security_event(
  'rls_policy_cleanup',
  'medium',
  'Removed confusing deny-all RLS policies with USING (false) conditions',
  auth.uid(),
  NULL, NULL, NULL,
  jsonb_build_object(
    'tables', ARRAY['profiles', 'homes', 'maintenance_notification_settings'],
    'action', 'removed_confusing_deny_policies',
    'rationale', 'Existing user-specific and admin policies already provide proper access control'
  )
);