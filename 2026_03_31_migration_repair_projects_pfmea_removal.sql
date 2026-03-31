-- =============================================================================
-- Repair incomplete removal of public.projects_pfmea
--
-- Symptoms: REST inserts into public.projects fail (e.g. 23502 on name), or
-- failing rows look wrong (e.g. publish_status default), because triggers /
-- functions still reference projects_pfmea or a broken view replaced the table.
--
-- This migration:
-- 1) Drops non-internal triggers on public.projects whose function body mentions
--    projects_pfmea (legacy hooks that break after the table was dropped).
-- 2) Provides an empty compatibility VIEW public.projects_pfmea so any remaining
--    SQL that still references that relation can resolve (returns no rows).
--
-- Run in Supabase SQL Editor for the same project as your app.
-- If projects is a VIEW with a broken INSTEAD OF INSERT, that must be fixed
-- separately (see NOTICE output from the diagnostic block at the end).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Drop triggers on public.projects that call functions referencing projects_pfmea
-- ---------------------------------------------------------------------------
DO $drop_pfmea_triggers$
DECLARE
  r RECORD;
  fn_src text;
BEGIN
  FOR r IN
    SELECT t.oid AS tgoid, t.tgname, p.oid AS fn_oid
    FROM pg_trigger t
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE t.tgrelid = 'public.projects'::regclass
      AND NOT t.tgisinternal
  LOOP
    fn_src := pg_get_functiondef(r.fn_oid);
    IF fn_src ILIKE '%projects_pfmea%' THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.projects', r.tgname);
      RAISE NOTICE 'Dropped trigger % on public.projects (function referenced projects_pfmea)', r.tgname;
    END IF;
  END LOOP;
END;
$drop_pfmea_triggers$;

-- ---------------------------------------------------------------------------
-- 2) Empty compat VIEW public.projects_pfmea (only if the name is unused)
--    so legacy SQL that still references that relation can resolve (no rows).
--    If a leftover TABLE named projects_pfmea still exists, drop it in the
--    dashboard after backup, then re-run this section, or rename it first.
-- ---------------------------------------------------------------------------
DO $compat_pfmea$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'projects_pfmea'
  ) THEN
    CREATE VIEW public.projects_pfmea AS
    SELECT
      gen_random_uuid() AS id,
      NULL::uuid AS project_id
    WHERE false;
    COMMENT ON VIEW public.projects_pfmea IS
      'Compatibility empty view after projects_pfmea table removal; no rows.';
    GRANT SELECT ON public.projects_pfmea TO authenticated;
    GRANT SELECT ON public.projects_pfmea TO service_role;
    RAISE NOTICE 'Created empty compat view public.projects_pfmea.';
  ELSE
    RAISE NOTICE 'public.projects_pfmea already exists — skip compat view. If it is a broken leftover table, back up and drop it, then create the compat view manually.';
  END IF;
END;
$compat_pfmea$;

-- ---------------------------------------------------------------------------
-- 3) Diagnostic (read the Messages tab after running)
-- ---------------------------------------------------------------------------
DO $diag$
DECLARE
  v_kind "char";
BEGIN
  SELECT c.relkind INTO v_kind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'projects';

  IF v_kind = 'v' THEN
    RAISE WARNING 'public.projects is a VIEW (relkind=v). REST inserts use INSTEAD OF rules; if name is NULL, fix the view/trigger mapping — not fixed by this script alone.';
  ELSIF v_kind = 'r' THEN
    RAISE NOTICE 'public.projects is a base table (relkind=r).';
  ELSE
    RAISE NOTICE 'public.projects relkind=%', v_kind;
  END IF;
END;
$diag$;

NOTIFY pgrst, 'reload schema';
