-- Fix RLS policies on user_roles table
-- Ensure check-subscription function can read admin status

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Service role full access" ON public.user_roles;
DROP POLICY IF EXISTS "Allow authenticated users to read roles" ON public.user_roles;

-- Create policy: Users can read their own roles
CREATE POLICY "Users can read own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Service role has full access (for edge functions)
CREATE POLICY "Service role full access"
  ON public.user_roles
  FOR ALL
  USING (auth.role() = 'service_role');

-- Verify RLS is enabled
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'RLS policies fixed for user_roles table';
  RAISE NOTICE 'Users can now read their own roles';
  RAISE NOTICE 'Service role (edge functions) has full access';
END $$;

