-- Step 10: refresh project_challenges for tile flooring and backsplash.
--
-- Purpose: short, neutral hardest-parts summary (decision-making info, not a sales
-- pitch or scare tactic). ≤200 chars; 1–2 sentences. No em-dashes in user-facing copy.
--
-- Scope: match template (and revision/draft) rows by name for:
--   - Tile Flooring Installation (and name variants)
--   - Tile Backsplash Installation (and name variants)
--
-- Apply in Supabase SQL Editor (or via migration runner). Idempotent UPDATEs.

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
  -- Tile Flooring Installation
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
  RAISE NOTICE 'project_challenges: Tile Flooring rows updated: %', v_n;

  -- Tile Backsplash Installation
  v_text := 'The hardest part is tight attention to detail: every grout line stays visible when you cook or use the bathroom.';
  IF char_length(v_text) > 200 THEN
    RAISE EXCEPTION 'Tile Backsplash project_challenges exceeds 200 chars (%)', char_length(v_text);
  END IF;
  UPDATE public.projects p
  SET
    project_challenges = v_text,
    updated_at = now()
  WHERE p.id <> ALL (v_excl)
    AND (p.is_standard IS DISTINCT FROM true)
    AND lower(btrim(p.name)) LIKE 'tile%backsplash%';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'No Tile Backsplash projects matched for project_challenges update. Check: SELECT id, name, parent_project_id FROM public.projects WHERE lower(btrim(name)) LIKE ''tile%%backsplash%%'';';
  END IF;
  RAISE NOTICE 'project_challenges: Tile Backsplash rows updated: %', v_n;
END;
$$;
