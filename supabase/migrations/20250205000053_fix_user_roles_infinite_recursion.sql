-- =====================================================
-- FIX INFINITE RECURSION IN USER_ROLES RLS POLICIES
-- =====================================================
-- The issue: RLS policies on user_roles query user_roles itself,
-- causing infinite recursion. Solution: Use a security definer function
-- that bypasses RLS to check admin status.

-- Create or replace is_admin() function
-- This function bypasses RLS to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = check_user_id 
    AND role = 'admin'
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Recreate policies using the is_admin() function (no recursion)
-- Policy: Users can read their own roles
CREATE POLICY "Users can read own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can read all roles
CREATE POLICY "Admins can read all roles"
  ON public.user_roles
  FOR SELECT
  USING (public.is_admin());

-- Policy: Admins can insert roles
CREATE POLICY "Admins can insert roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (public.is_admin());

-- Policy: Admins can delete roles
CREATE POLICY "Admins can delete roles"
  ON public.user_roles
  FOR DELETE
  USING (public.is_admin());

-- Service role policy (already exists, but ensure it's there)
DROP POLICY IF EXISTS "Service role full access" ON public.user_roles;
CREATE POLICY "Service role full access"
  ON public.user_roles
  FOR ALL
  USING (auth.role() = 'service_role');

-- Verify RLS is enabled
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Created is_admin() security definer function';
  RAISE NOTICE '✅ Fixed RLS policies to use is_admin() function (no recursion)';
  RAISE NOTICE '✅ Users can read own roles, admins can read/insert/delete all roles';
END $$;

