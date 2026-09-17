-- Step 10 (catalog copy): Tile Flooring Installation description and project challenges.
--
-- description says what the work is and what it achieves. project_challenges is a decision tool:
-- a neutral read on the hardest parts so someone can judge fit before starting. It names the two
-- things that cannot be fixed after the fact and the wait that takes the room out of service,
-- without selling the project or talking anyone out of it.
--
-- Both fields are held to 200 characters, checked here rather than assumed.

DO $migration$
DECLARE
  v_project_id uuid;
  v_nroots integer;
  v_description CONSTANT text :=
    'Install ceramic, porcelain, or stone floor tile over a prepared subfloor: underlayment, layout, setting to a flat plane inside lippage limits, then grout, cure, and seal.';
  v_challenges CONSTANT text :=
    'Flatness and mortar coverage are decided before the tile is down and cannot be corrected after cure. Two cure waits keep the room out of service for days, and cuts are slow, wet work.';
BEGIN
  WITH RECURSIVE matched AS (
    SELECT p.id
    FROM public.projects p
    WHERE (p.is_standard IS DISTINCT FROM true)
      AND (
        lower(btrim(p.name)) IN ('tile flooring installation', 'tile floor installation', 'tile flooring')
        OR lower(btrim(p.name)) LIKE 'tile flooring installation%'
      )
  ),
  up AS (
    SELECT pr.id, pr.parent_project_id FROM public.projects pr WHERE pr.id IN (SELECT id FROM matched)
    UNION ALL
    SELECT par.id, par.parent_project_id FROM public.projects par INNER JOIN up ON par.id = up.parent_project_id
  ),
  roots AS (SELECT DISTINCT id AS root_id FROM up WHERE parent_project_id IS NULL)
  SELECT (SELECT count(*)::integer FROM roots), (SELECT root_id FROM roots LIMIT 1)
  INTO v_nroots, v_project_id;

  IF v_nroots <> 1 THEN
    RAISE EXCEPTION 'Tile Flooring Installation root did not resolve to exactly one row (found %).', v_nroots;
  END IF;

  IF length(v_description) > 200 OR length(v_challenges) > 200 THEN
    RAISE EXCEPTION 'Catalog copy exceeds 200 characters (description %, challenges %).',
      length(v_description), length(v_challenges);
  END IF;

  UPDATE public.projects
  SET description = v_description,
      project_challenges = v_challenges,
      updated_at = now()
  WHERE id = v_project_id;

  RAISE NOTICE 'Tile Flooring Installation step 10 catalog copy applied for project %', v_project_id;
END
$migration$;
