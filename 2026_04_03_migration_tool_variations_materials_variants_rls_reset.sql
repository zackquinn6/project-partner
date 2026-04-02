-- =============================================================================
-- ONE FILE: reset RLS on tool_variations + materials_variants (Supabase SQL Editor)
-- Fixes 403 / 42501 on POST .../tool_variations when old or RESTRICTIVE policies block inserts.
--
-- What it does:
--   1) Drops EVERY existing policy on both tables (names you do not control).
--   2) Ensures RLS stays enabled.
--   3) Recreates: public SELECT; INSERT/UPDATE/DELETE for role authenticated when auth.uid() is set.
--
-- Security: any logged-in user can write catalog variants. Tighten later (e.g. admin-only)
-- by replacing the IUD policies with checks tied to your roles / is_admin().
-- =============================================================================

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tool_variations'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tool_variations', r.policyname);
  END LOOP;

  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'materials_variants'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.materials_variants', r.policyname);
  END LOOP;
END
$$;

ALTER TABLE public.tool_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials_variants ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.tool_variations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tool_variations TO authenticated;

GRANT SELECT ON public.materials_variants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.materials_variants TO authenticated;

-- tool_variations
CREATE POLICY "tool_variations_select_public"
  ON public.tool_variations
  AS PERMISSIVE
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "tool_variations_insert_authenticated"
  ON public.tool_variations
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "tool_variations_update_authenticated"
  ON public.tool_variations
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "tool_variations_delete_authenticated"
  ON public.tool_variations
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- materials_variants
CREATE POLICY "materials_variants_select_public"
  ON public.materials_variants
  AS PERMISSIVE
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "materials_variants_insert_authenticated"
  ON public.materials_variants
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "materials_variants_update_authenticated"
  ON public.materials_variants
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "materials_variants_delete_authenticated"
  ON public.materials_variants
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
