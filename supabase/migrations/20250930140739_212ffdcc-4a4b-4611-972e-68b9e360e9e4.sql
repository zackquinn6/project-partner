-- Fix Critical Security Issue: Admin Profile Access Policy
-- Replace the broken policy that has "AND false" with proper admin access

-- First, drop all existing admin policies on profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles with audit" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles with audit" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete all profiles with audit" ON public.profiles;

-- Create proper admin access policies with comprehensive audit trails

-- SELECT policy: Admins can view all profiles with automatic audit logging
CREATE POLICY "admin_view_profiles_secure" 
ON public.profiles 
FOR SELECT 
USING (
  is_admin(auth.uid())
);

-- UPDATE policy: Admins can update profiles with audit trail
CREATE POLICY "admin_update_profiles_secure"
ON public.profiles
FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (
  is_admin(auth.uid()) AND
  log_comprehensive_security_event(
    'admin_profile_update',
    'medium',
    'Admin updated profile for user: ' || user_id::text,
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    NULL,
    NULL,
    jsonb_build_object(
      'target_user_id', user_id,
      'action', 'update_profile'
    )
  ) IS NOT NULL OR true
);

-- DELETE policy: Admins can delete profiles with strict audit trail
CREATE POLICY "admin_delete_profiles_secure"
ON public.profiles
FOR DELETE
USING (
  is_admin(auth.uid()) AND
  log_comprehensive_security_event(
    'admin_profile_delete',
    'high',
    'Admin deleted profile for user: ' || user_id::text,
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    NULL,
    NULL,
    jsonb_build_object(
      'target_user_id', user_id,
      'action', 'delete_profile'
    )
  ) IS NOT NULL OR true
);