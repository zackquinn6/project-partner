-- homes_risks: shared hazard reference catalog. Restrict INSERT/UPDATE/DELETE to admins.
-- Requires existing public.is_admin(uuid) (security definer), used elsewhere in this project.
-- Apply in Supabase SQL editor or via migration runner.

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'homes_risks'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.homes_risks', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.homes_risks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "homes_risks_select_authenticated"
  ON public.homes_risks
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "homes_risks_insert_admin"
  ON public.homes_risks
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) IS TRUE);

CREATE POLICY "homes_risks_update_admin"
  ON public.homes_risks
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()) IS TRUE)
  WITH CHECK (public.is_admin(auth.uid()) IS TRUE);

CREATE POLICY "homes_risks_delete_admin"
  ON public.homes_risks
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()) IS TRUE);
