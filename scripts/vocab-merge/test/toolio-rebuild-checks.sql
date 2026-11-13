-- Checks for Toolio's 20261112240000_project_identity_follows_project_partner.sql on the local
-- stand-in after phase 5. Run `setup` before the migration and `checks` after it. `guard` (after
-- `setup`) stores a link and a function naming slugs about to change; the migration must stop and name both.
\if :{?part}
\else
  \echo 'pass -v part=setup, -v part=guard, or -v part=checks'
  \quit
\endif

SELECT :'part' = 'setup' AS is_setup, :'part' = 'guard' AS is_guard \gset
\if :is_guard
CREATE TABLE public.rebuild_guard_probe (id serial PRIMARY KEY, body text);
INSERT INTO public.rebuild_guard_probe (body) VALUES ('Start with our [tile order](/projects/tile-flooring/order).');
CREATE FUNCTION public.rebuild_guard_probe_fn() RETURNS uuid LANGUAGE sql AS
  $$ SELECT id FROM public.projects WHERE slug = 'tile-shower' $$;
SELECT 'guard link and function stored' AS result;
\elif :is_setup
DROP TABLE IF EXISTS public.rebuild_guard_probe;
DROP FUNCTION IF EXISTS public.rebuild_guard_probe_fn();
-- Back to the pre-rebuild identity so the run can repeat.
DROP TRIGGER IF EXISTS projects_slug_change_cascade ON public.projects;
DROP TRIGGER IF EXISTS pp_vocab_project_identity_follow ON public.pp_vocab_projects;
UPDATE public.projects SET slug = pp_vocab_key, name = pp_vocab_key WHERE pp_vocab_key IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.missing_item_feedback_requests (id serial PRIMARY KEY, project_slug text);
CREATE TABLE IF NOT EXISTS public.profiles (id serial PRIMARY KEY, checkout_cart jsonb);
CREATE TABLE IF NOT EXISTS public.pending_checkouts (id serial PRIMARY KEY, payload jsonb NOT NULL);
-- Projects the phase 5 checks insert on each run.
DELETE FROM public.projects WHERE slug IN ('auto-link-project', 'brand-new-project');
CREATE UNIQUE INDEX IF NOT EXISTS projects_slug_unique_check ON public.projects (slug);
DELETE FROM public.missing_item_feedback_requests;
DELETE FROM public.profiles;
DELETE FROM public.pending_checkouts;
DELETE FROM public.orders WHERE order_number = 999001;
INSERT INTO public.orders (id, order_number, project_slug) VALUES (gen_random_uuid(), 999001, 'tile-flooring');
INSERT INTO public.missing_item_feedback_requests (project_slug) VALUES ('tile-flooring');
INSERT INTO public.profiles (checkout_cart) VALUES
  ('{"v":2,"guided":[{"projectSlug":"tile-flooring","lines":[{"sku":"wet-saw","designGuaranteeProjectSlug":"tile-flooring"}]}],"note":"tile-flooring"}');
INSERT INTO public.pending_checkouts (payload) VALUES ('{"project_slug":"tile-flooring","items":[{"designGuaranteeProjectSlug":"tile-flooring"}]}');
SELECT 'setup done' AS result;
\else
CREATE TEMP TABLE _check (n serial, result text);
DO $$
DECLARE
  v_project public.projects;
BEGIN
  SELECT * INTO v_project FROM public.projects WHERE pp_vocab_key = 'tile-flooring';
  INSERT INTO _check (result) VALUES (CASE
    WHEN v_project.name = 'Tile Flooring Installation' AND v_project.slug = 'tile-flooring-installation'
    THEN 'PASS project takes its Project Partner name and slug' ELSE 'FAIL rename: ' || v_project.name || ' / ' || v_project.slug END);

  INSERT INTO _check (result) SELECT CASE WHEN count(*) = 0 THEN 'PASS every linked project carries its Project Partner name'
    ELSE 'FAIL names differ: ' || string_agg(p.slug, ', ') END
    FROM public.projects p JOIN public.pp_vocab_projects v ON v.public_key = p.pp_vocab_key
    WHERE p.name <> v.name OR p.slug <> public.project_slug_from_name(v.name);

  INSERT INTO _check (result) SELECT CASE WHEN project_slug = 'tile-flooring-installation'
    THEN 'PASS past order follows the new slug' ELSE 'FAIL order slug ' || project_slug END
    FROM public.orders WHERE order_number = 999001;
  INSERT INTO _check (result) SELECT CASE WHEN bool_and(project_slug = 'tile-flooring-installation')
    THEN 'PASS missing-item feedback follows the new slug' ELSE 'FAIL feedback slug' END
    FROM public.missing_item_feedback_requests;
  INSERT INTO _check (result) SELECT CASE
    WHEN checkout_cart #>> '{guided,0,projectSlug}' = 'tile-flooring-installation'
     AND checkout_cart #>> '{guided,0,lines,0,designGuaranteeProjectSlug}' = 'tile-flooring-installation'
     AND checkout_cart ->> 'note' = 'tile-flooring'
    THEN 'PASS saved cart slugs follow; unrelated text untouched' ELSE 'FAIL cart ' || checkout_cart::text END
    FROM public.profiles;
  INSERT INTO _check (result) SELECT CASE
    WHEN payload ->> 'project_slug' = 'tile-flooring-installation'
     AND payload #>> '{items,0,designGuaranteeProjectSlug}' = 'tile-flooring-installation'
    THEN 'PASS pending checkout slugs follow' ELSE 'FAIL pending ' || payload::text END
    FROM public.pending_checkouts;

  UPDATE public.pp_vocab_projects SET name = 'Tile Floor Install' WHERE public_key = 'tile-flooring';
  SELECT * INTO v_project FROM public.projects WHERE pp_vocab_key = 'tile-flooring';
  INSERT INTO _check (result) SELECT CASE
    WHEN v_project.name = 'Tile Floor Install' AND v_project.slug = 'tile-floor-install'
     AND (SELECT project_slug FROM public.orders WHERE order_number = 999001) = 'tile-floor-install'
    THEN 'PASS a later Project Partner rename follows through to name, slug, and orders' ELSE 'FAIL follow: ' || v_project.slug END;
  UPDATE public.pp_vocab_projects SET name = 'Tile Flooring Installation' WHERE public_key = 'tile-flooring';
END $$;
SELECT result FROM _check ORDER BY n;
SELECT p.pp_vocab_key || ' -> ' || p.name || ' (' || p.slug || ')' AS identity FROM public.projects p
  WHERE p.pp_vocab_key IS NOT NULL ORDER BY p.slug;
\endif
