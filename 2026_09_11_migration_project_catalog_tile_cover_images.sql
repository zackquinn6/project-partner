-- Set project catalog cover photos for tile backsplash and tile shower/bath.
--
-- Curated catalog assets live in the app at /public/project-catalog/ and are
-- served as /project-catalog/*.jpg.
--
-- Scope:
--   Match template (and revision/draft) rows by name for:
--     - Tile Backsplash Installation (and name variants)
--     - Tile Shower / Bath Installation (and name variants)
--
-- Apply in Supabase SQL Editor after the frontend deploy that includes
-- public/project-catalog/tile-*.jpg (or apply together; images 404 until that deploy).

DO $$
DECLARE
  v_excl CONSTANT uuid[] := ARRAY[
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'd82dff80-e8ac-4511-be46-3d0e64bb5fc5'::uuid
  ];
  v_n integer;
  v_url text;
BEGIN
  -- Tile Backsplash Installation
  v_url := '/project-catalog/tile-backsplash-installation.jpg';
  UPDATE public.projects p
  SET
    cover_image = v_url,
    images = ARRAY[v_url]::text[],
    updated_at = now()
  WHERE p.id <> ALL (v_excl)
    AND (p.is_standard IS DISTINCT FROM true)
    AND lower(btrim(p.name)) LIKE 'tile%backsplash%';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE 'Catalog cover: Tile Backsplash rows updated: %', v_n;

  -- Tile Shower / Bath (and close name variants)
  v_url := '/project-catalog/tile-shower-bath.jpg';
  UPDATE public.projects p
  SET
    cover_image = v_url,
    images = ARRAY[v_url]::text[],
    updated_at = now()
  WHERE p.id <> ALL (v_excl)
    AND (p.is_standard IS DISTINCT FROM true)
    AND (
      lower(btrim(p.name)) LIKE 'tile%shower%'
      OR lower(btrim(p.name)) LIKE 'tile%bath%'
      OR lower(btrim(p.name)) LIKE 'tile shower/bath%'
    );
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE 'Catalog cover: Tile Shower/Bath rows updated: %', v_n;
END;
$$;
