-- Merge user_roles into user_profiles: add roles array and migrate data, then drop user_roles.

-- 1. Add roles column to user_profiles (array of role strings; default includes 'user')
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS roles text[] NOT NULL DEFAULT ARRAY['user']::text[];

-- 2. Migrate: set roles from user_roles for each user (aggregate all roles per user), if user_roles still exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_roles'
  ) THEN
    UPDATE user_profiles up
    SET roles = sub.roles
    FROM (
      SELECT user_id, array_agg(DISTINCT role ORDER BY role) AS roles
      FROM user_roles
      GROUP BY user_id
    ) sub
    WHERE up.user_id = sub.user_id;
  END IF;
END $$;

-- 3. Ensure every user has at least 'user' in roles (no empty array)
UPDATE user_profiles
SET roles = array_append(roles, 'user')
WHERE NOT ('user' = ANY(roles));

-- 4. Drop all RLS policies that depend on user_roles or on is_admin(uuid) (must run before dropping functions or table)
DROP POLICY IF EXISTS "Admins can read all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can modify app settings" ON app_settings;
DROP POLICY IF EXISTS "Admins can view audit logs" ON role_audit_log;
DROP POLICY IF EXISTS "Admins can view security events" ON security_events;
DROP POLICY IF EXISTS "Admins can insert roadmap items" ON feature_roadmap;
DROP POLICY IF EXISTS "Admins can update roadmap items" ON feature_roadmap;
DROP POLICY IF EXISTS "Admins can delete roadmap items" ON feature_roadmap;
DROP POLICY IF EXISTS "Admins can update feature requests" ON feature_requests;
DROP POLICY IF EXISTS "Admins can delete feature requests" ON feature_requests;
DROP POLICY IF EXISTS "Admins can update feedback" ON feedback;
DROP POLICY IF EXISTS "Admins can delete feedback" ON feedback;
DROP POLICY IF EXISTS "Admins can modify home risks" ON home_risks;
DROP POLICY IF EXISTS "Admins can modify standard project phases" ON project_phases;
DROP POLICY IF EXISTS "Admins can modify standard phase operations" ON phase_operations;
DROP POLICY IF EXISTS "Admins can modify standard operation steps" ON operation_steps;
DROP POLICY IF EXISTS "Admins can manage template risks" ON project_template_risks;
DROP POLICY IF EXISTS "Allow admins to manage app overrides" ON app_overrides;
DROP POLICY IF EXISTS "Admins can manage template risk mitigation actions" ON project_template_risk_mitigation_actions;
DROP POLICY IF EXISTS "Admins can modify tools" ON tools;

-- 5. Drop all overloads of is_admin() (no policies depend on them now)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'is_admin'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.is_admin(%s)', r.args);
  END LOOP;
END $$;

-- 6. Create single is_admin() using user_profiles.roles
CREATE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() AND 'admin' = ANY(roles)
  );
$$;

-- 7. Drop the user_roles table
DROP TABLE IF EXISTS user_roles;

-- 8. Recreate admin policies using is_admin() (now backed by user_profiles.roles; no policies on user_roles—table is dropped)
CREATE POLICY "Admins can modify app settings" ON app_settings FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can view audit logs" ON role_audit_log FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admins can view security events" ON security_events FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admins can insert roadmap items" ON feature_roadmap FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update roadmap items" ON feature_roadmap FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can delete roadmap items" ON feature_roadmap FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admins can update feature requests" ON feature_requests FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can delete feature requests" ON feature_requests FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admins can update feedback" ON feedback FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can delete feedback" ON feedback FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admins can modify home risks" ON home_risks FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can modify standard project phases" ON project_phases FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can modify standard phase operations" ON phase_operations FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can modify standard operation steps" ON operation_steps FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can manage template risks" ON project_template_risks FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Allow admins to manage app overrides" ON app_overrides FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can manage template risk mitigation actions" ON project_template_risk_mitigation_actions FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can modify tools" ON tools FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
