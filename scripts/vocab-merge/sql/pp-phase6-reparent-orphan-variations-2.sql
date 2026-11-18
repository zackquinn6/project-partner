-- ===========================================================================
-- Fix remaining orphan tool_variations (C-Clamp, Cordless Drill*, etc.).
-- Uses normalized name matching; creates a missing parent tool only when no
-- live keyed tool matches. Run in Project Partner.
-- ===========================================================================

CREATE OR REPLACE FUNCTION pg_temp.vocab_norm_name(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both ' ' FROM regexp_replace(lower(coalesce(p, '')), '[^a-z0-9]+', ' ', 'g'))
$$;

-- Ensure parent cores exist for the two remaining orphan families when absent.
DO $$
DECLARE
  v_key text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.tools
    WHERE public_key IS NOT NULL
      AND pg_temp.vocab_norm_name(name) IN ('c clamp', 'cclamp')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.vocab_keys WHERE public_key = 'c-clamp' AND removed_at IS NULL
  ) THEN
    INSERT INTO public.vocab_keys (public_key, entity) VALUES ('c-clamp', 'tool');
    INSERT INTO public.tools (name, description, category, specialty_scale, public_key)
      VALUES ('C-Clamp', NULL, 'Hand Tool', 1, 'c-clamp');
    PERFORM public.vocab_emit('c-clamp', 'upsert');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tools
    WHERE public_key IS NOT NULL
      AND (
        pg_temp.vocab_norm_name(name) = 'cordless drill'
        OR public_key = 'cordless-drill'
      )
  ) AND NOT EXISTS (
    SELECT 1 FROM public.vocab_keys WHERE public_key = 'cordless-drill' AND removed_at IS NULL
  ) THEN
    -- Prefer an existing close tool name if the merge kept a synonym.
    SELECT public_key INTO v_key FROM public.tools
    WHERE public_key IS NOT NULL
      AND pg_temp.vocab_norm_name(name) LIKE 'cordless drill%'
    ORDER BY length(name) ASC
    LIMIT 1;
    IF v_key IS NULL THEN
      INSERT INTO public.vocab_keys (public_key, entity) VALUES ('cordless-drill', 'tool');
      INSERT INTO public.tools (name, description, category, specialty_scale, public_key)
        VALUES ('Cordless Drill', NULL, 'Power Tool', 1, 'cordless-drill');
      PERFORM public.vocab_emit('cordless-drill', 'upsert');
    END IF;
  END IF;
END $$;

CREATE TEMP TABLE _orphan_reparent AS
SELECT DISTINCT ON (v.id)
  v.id AS variation_id,
  v.name AS variation_name,
  v.core_item_id AS old_core_item_id,
  t.id AS new_core_item_id,
  t.name AS new_parent_name,
  t.public_key AS new_parent_key
FROM public.tool_variations v
JOIN public.tools t
  ON t.public_key IS NOT NULL
 AND (
   pg_temp.vocab_norm_name(v.name) = pg_temp.vocab_norm_name(t.name)
   OR pg_temp.vocab_norm_name(v.name) LIKE pg_temp.vocab_norm_name(t.name) || ' %'
 )
WHERE v.public_key IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.tools x WHERE x.id = v.core_item_id)
ORDER BY v.id, length(pg_temp.vocab_norm_name(t.name)) DESC, t.public_key;

UPDATE public.tool_variations v
SET core_item_id = r.new_core_item_id
FROM _orphan_reparent r
WHERE v.id = r.variation_id
  AND v.core_item_id IS DISTINCT FROM r.new_core_item_id;

DO $$
DECLARE
  r record;
  v_key text;
  v_ok integer := 0;
  v_failed integer := 0;
BEGIN
  FOR r IN
    SELECT v.id, v.name, v.sku, t.public_key AS parent_key
    FROM public.tool_variations v
    JOIN public.tools t ON t.id = v.core_item_id
    WHERE v.public_key IS NULL AND t.public_key IS NOT NULL
    ORDER BY v.name
  LOOP
    BEGIN
      v_key := public.vocab_variation_key(r.parent_key, r.sku, r.name);
      UPDATE public.tool_variations
      SET public_key = v_key
      WHERE id = r.id AND public_key IS NULL;
      v_ok := v_ok + 1;
    EXCEPTION WHEN others THEN
      v_failed := v_failed + 1;
      RAISE NOTICE 'FAILED % (%): %', r.id, r.name, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE 'keyed=% failed=%', v_ok, v_failed;
END $$;

SELECT jsonb_build_object(
  'reparented', (SELECT count(*) FROM _orphan_reparent),
  'reparent_map', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'variation', variation_name,
      'new_parent', new_parent_name,
      'new_parent_key', new_parent_key
    ) ORDER BY variation_name), '[]'::jsonb)
    FROM _orphan_reparent
  ),
  'tool_variations_keyed', (SELECT count(*) FROM public.tool_variations WHERE public_key IS NOT NULL),
  'tool_variations_unkeyed', (SELECT count(*) FROM public.tool_variations WHERE public_key IS NULL),
  'still_unkeyed', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', v.id,
      'name', v.name,
      'core_item_id', v.core_item_id,
      'parent_exists', EXISTS (SELECT 1 FROM public.tools t WHERE t.id = v.core_item_id),
      'clamp_candidates', (
        SELECT coalesce(jsonb_agg(jsonb_build_object('name', t.name, 'public_key', t.public_key)), '[]'::jsonb)
        FROM public.tools t
        WHERE t.public_key IS NOT NULL AND pg_temp.vocab_norm_name(t.name) LIKE '%clamp%'
      ),
      'drill_candidates', (
        SELECT coalesce(jsonb_agg(jsonb_build_object('name', t.name, 'public_key', t.public_key)), '[]'::jsonb)
        FROM public.tools t
        WHERE t.public_key IS NOT NULL AND pg_temp.vocab_norm_name(t.name) LIKE '%drill%'
      )
    ) ORDER BY v.name), '[]'::jsonb)
    FROM public.tool_variations v
    WHERE v.public_key IS NULL
  ),
  'status', CASE
    WHEN (SELECT count(*) FROM public.tool_variations WHERE public_key IS NULL) = 0 THEN 'OK'
    ELSE 'FAIL'
  END
) AS payload;
