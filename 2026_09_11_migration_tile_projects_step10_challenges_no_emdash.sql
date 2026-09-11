-- Re-apply tile project_challenges without em-dashes (fixes flooring copy if the
-- earlier 2026_09_11 step10 challenges migration was already run with an em-dash).
-- Scope: tile flooring and backsplash only (shower/bath template not in catalog yet).
-- Idempotent; same match rules as 2026_09_11_migration_tile_projects_step10_challenges.sql.

DO $$
DECLARE
  v_excl CONSTANT uuid[] := ARRAY[
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'd82dff80-e8ac-4511-be46-3d0e64bb5fc5'::uuid
  ];
  v_n integer;
  v_text text;
BEGIN
  v_text := 'Heavy lifting and long periods on knees or back, plus multi-step surface prep, especially if subfloor replacement is needed. Messy work; lippage is the key challenge.';
  IF char_length(v_text) > 200 THEN
    RAISE EXCEPTION 'Tile Flooring project_challenges exceeds 200 chars (%)', char_length(v_text);
  END IF;
  UPDATE public.projects p
  SET
    project_challenges = v_text,
    updated_at = now()
  WHERE p.id <> ALL (v_excl)
    AND (p.is_standard IS DISTINCT FROM true)
    AND (
      lower(btrim(p.name)) LIKE 'tile%floor%'
      OR lower(btrim(p.name)) IN (
        'tile flooring installation',
        'tile flooring'
      )
    );
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'No Tile Flooring projects matched for project_challenges update. Check: SELECT id, name, parent_project_id FROM public.projects WHERE lower(btrim(name)) LIKE ''tile%%floor%%'';';
  END IF;
  RAISE NOTICE 'project_challenges (no em-dash): Tile Flooring rows updated: %', v_n;

  v_text := 'The hardest part is tight attention to detail: every grout line stays visible when you cook or use the bathroom.';
  UPDATE public.projects p
  SET
    project_challenges = v_text,
    updated_at = now()
  WHERE p.id <> ALL (v_excl)
    AND (p.is_standard IS DISTINCT FROM true)
    AND lower(btrim(p.name)) LIKE 'tile%backsplash%';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'No Tile Backsplash projects matched for project_challenges update.';
  END IF;
  RAISE NOTICE 'project_challenges (no em-dash): Tile Backsplash rows updated: %', v_n;
END;
$$;
