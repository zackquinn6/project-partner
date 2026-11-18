-- ===========================================================================
-- Fix: key any remaining tool_variations without public_key (after phase 6).
-- Run in Project Partner Supabase SQL editor. Returns a status payload.
-- ===========================================================================

DO $$
DECLARE
  r record;
  v_key text;
  v_ok integer := 0;
  v_failed integer := 0;
  v_orphans integer := 0;
BEGIN
  SELECT count(*) INTO v_orphans
  FROM public.tool_variations v
  WHERE v.public_key IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.tools t WHERE t.id = v.core_item_id AND t.public_key IS NOT NULL);

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
      RAISE NOTICE 'FAILED % (%) parent=%: %', r.id, r.name, r.parent_key, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'keyed=% failed=% orphans_or_unkeyed_parent=%', v_ok, v_failed, v_orphans;
END $$;

SELECT jsonb_build_object(
  'tool_variations_keyed', (SELECT count(*) FROM public.tool_variations WHERE public_key IS NOT NULL),
  'tool_variations_unkeyed', (SELECT count(*) FROM public.tool_variations WHERE public_key IS NULL),
  'unkeyed_detail', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', v.id,
      'name', v.name,
      'sku', v.sku,
      'core_item_id', v.core_item_id,
      'parent_name', t.name,
      'parent_public_key', t.public_key
    ) ORDER BY v.name), '[]'::jsonb)
    FROM public.tool_variations v
    LEFT JOIN public.tools t ON t.id = v.core_item_id
    WHERE v.public_key IS NULL
  ),
  'status', CASE
    WHEN (SELECT count(*) FROM public.tool_variations WHERE public_key IS NULL) = 0 THEN 'OK'
    ELSE 'FAIL'
  END
) AS payload;
