-- user_tools: allow authenticated users to manage their own library rows.
-- Fixes 403 on POST .../user_tools when RLS is enabled without INSERT policy.

ALTER TABLE public.user_tools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_tools_select_own" ON public.user_tools;
DROP POLICY IF EXISTS "user_tools_insert_own" ON public.user_tools;
DROP POLICY IF EXISTS "user_tools_update_own" ON public.user_tools;
DROP POLICY IF EXISTS "user_tools_delete_own" ON public.user_tools;

CREATE POLICY "user_tools_select_own"
  ON public.user_tools
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_tools_insert_own"
  ON public.user_tools
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_tools_update_own"
  ON public.user_tools
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_tools_delete_own"
  ON public.user_tools
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_tools TO authenticated;
