-- Replace mismatched project catalog cover photos.
--
-- Context:
--   An earlier placeholder backfill set cover_image to Picsum seeds
--   (https://picsum.photos/seed/{id}/800/600). Those URLs resolve to
--   unrelated stock photos (leaves, landscapes, sports) that do not show
--   the project work. Curated catalog assets live in the app at
--   /public/project-catalog/ and are served as /project-catalog/*.jpg.
--
-- Scope:
--   1) Set fitting covers for the known mismatched coming-soon templates
--      (and any revision/draft rows whose names match).
--   2) Clear any remaining Picsum placeholder covers so the catalog falls
--      back to the intentional empty-state UI instead of wrong photos.
--
-- Leaves alone projects that already have non-Picsum covers (e.g. Interior
-- Painting spray photo, baseboard carpentry, ceiling fan, dishwasher).
--
-- Apply in Supabase SQL Editor after the frontend deploy that includes
-- public/project-catalog/* (or apply together; images 404 until that deploy).

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
  -- Drywall Repair + Finishing
  v_url := '/project-catalog/drywall-repair-finishing.jpg';
  UPDATE public.projects p
  SET
    cover_image = v_url,
    images = ARRAY[v_url]::text[],
    updated_at = now()
  WHERE p.id <> ALL (v_excl)
    AND (p.is_standard IS DISTINCT FROM true)
    AND lower(btrim(p.name)) LIKE 'drywall repair%';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE 'Catalog cover: Drywall Repair rows updated: %', v_n;

  -- Framing & Building a Non-Load-Bearing Wall
  -- (name may use ASCII hyphen or Unicode non-breaking hyphen)
  v_url := '/project-catalog/framing-non-load-bearing-wall.jpg';
  UPDATE public.projects p
  SET
    cover_image = v_url,
    images = ARRAY[v_url]::text[],
    updated_at = now()
  WHERE p.id <> ALL (v_excl)
    AND (p.is_standard IS DISTINCT FROM true)
    AND lower(btrim(p.name)) LIKE 'framing%non%load%bearing%wall%';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE 'Catalog cover: Framing Non-Load-Bearing Wall rows updated: %', v_n;

  -- Garbage Disposal Installation
  v_url := '/project-catalog/garbage-disposal-installation.jpg';
  UPDATE public.projects p
  SET
    cover_image = v_url,
    images = ARRAY[v_url]::text[],
    updated_at = now()
  WHERE p.id <> ALL (v_excl)
    AND (p.is_standard IS DISTINCT FROM true)
    AND lower(btrim(p.name)) LIKE 'garbage disposal%';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE 'Catalog cover: Garbage Disposal rows updated: %', v_n;

  -- Interior Door Replacement
  v_url := '/project-catalog/interior-door-replacement.jpg';
  UPDATE public.projects p
  SET
    cover_image = v_url,
    images = ARRAY[v_url]::text[],
    updated_at = now()
  WHERE p.id <> ALL (v_excl)
    AND (p.is_standard IS DISTINCT FROM true)
    AND lower(btrim(p.name)) LIKE 'interior door replacement%';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE 'Catalog cover: Interior Door Replacement rows updated: %', v_n;

  -- Interior Stair Refacing
  v_url := '/project-catalog/interior-stair-refacing.jpg';
  UPDATE public.projects p
  SET
    cover_image = v_url,
    images = ARRAY[v_url]::text[],
    updated_at = now()
  WHERE p.id <> ALL (v_excl)
    AND (p.is_standard IS DISTINCT FROM true)
    AND lower(btrim(p.name)) LIKE 'interior stair refacing%';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE 'Catalog cover: Interior Stair Refacing rows updated: %', v_n;

  -- Clear leftover Picsum placeholders (wrong random stock photos).
  -- Only null cover_image when it itself is Picsum; never wipe a real cover.
  UPDATE public.projects p
  SET
    cover_image = CASE
      WHEN p.cover_image ILIKE '%picsum.photos%' THEN NULL
      ELSE p.cover_image
    END,
    images = CASE
      WHEN p.images IS NULL THEN NULL
      ELSE (
        SELECT CASE
          WHEN array_length(filtered.arr, 1) IS NULL THEN NULL
          ELSE filtered.arr
        END
        FROM (
          SELECT array_agg(img) FILTER (
            WHERE img IS NOT NULL
              AND img !~* 'picsum\.photos'
          ) AS arr
          FROM unnest(p.images) AS img
        ) AS filtered
      )
    END,
    updated_at = now()
  WHERE p.id <> ALL (v_excl)
    AND (
      p.cover_image ILIKE '%picsum.photos%'
      OR EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.images, ARRAY[]::text[])) AS img
        WHERE img ILIKE '%picsum.photos%'
      )
    );
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE 'Catalog cover: Picsum placeholder rows cleared: %', v_n;
END;
$$;
