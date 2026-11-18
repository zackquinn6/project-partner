-- ===========================================================================
-- Linkage report after PP phase 6 + Toolio phase 6 (variant shared-key coverage).
-- Run in each app's SQL editor; each returns one payload JSON cell.
-- ===========================================================================

-- Project Partner
SELECT jsonb_build_object(
  'live_cores', (SELECT count(*) FROM public.vocab_keys WHERE entity IN ('tool', 'material') AND removed_at IS NULL),
  'live_variations', (SELECT count(*) FROM public.vocab_keys WHERE entity IN ('tool_variation', 'material_variation') AND removed_at IS NULL),
  'tool_variations_keyed', (SELECT count(*) FROM public.tool_variations WHERE public_key IS NOT NULL),
  'tool_variations_unkeyed', (SELECT count(*) FROM public.tool_variations WHERE public_key IS NULL),
  'materials_variants_keyed', (SELECT count(*) FROM public.materials_variants WHERE public_key IS NOT NULL),
  'materials_variants_unkeyed', (SELECT count(*) FROM public.materials_variants WHERE public_key IS NULL),
  'drum_fan', EXISTS (SELECT 1 FROM public.vocab_keys WHERE public_key = 'drum-fan' AND removed_at IS NULL),
  'status', CASE
    WHEN (SELECT count(*) FROM public.tool_variations WHERE public_key IS NULL) = 0
     AND (SELECT count(*) FROM public.materials_variants WHERE public_key IS NULL) = 0
    THEN 'OK'
    ELSE 'FAIL'
  END
) AS payload;

-- Toolio (run separately there):
-- SELECT jsonb_build_object(
--   'linked_cores', (SELECT count(*) FROM public.inventory_items WHERE parent_inventory_item_id IS NULL AND pp_vocab_key IS NOT NULL),
--   'pending_cores', (SELECT count(*) FROM public.inventory_items WHERE parent_inventory_item_id IS NULL AND pp_vocab_pending),
--   'linked_variants', (SELECT count(*) FROM public.inventory_items WHERE parent_inventory_item_id IS NOT NULL AND pp_vocab_key IS NOT NULL),
--   'pending_variants', (SELECT count(*) FROM public.inventory_items WHERE parent_inventory_item_id IS NOT NULL AND pp_vocab_pending),
--   'variant_bad_entity', (
--     SELECT count(*) FROM public.inventory_items i
--     JOIN public.pp_vocab_terms t ON t.public_key = i.pp_vocab_key
--     WHERE i.parent_inventory_item_id IS NOT NULL
--       AND t.entity NOT IN ('tool_variation', 'material_variation')
--   ),
--   'status', CASE
--     WHEN (SELECT count(*) FROM public.inventory_items
--           WHERE parent_inventory_item_id IS NOT NULL
--             AND pp_vocab_key IS NULL AND coalesce(pp_vocab_pending, false) = false) = 0
--      AND (SELECT count(*) FROM public.inventory_items i
--           JOIN public.pp_vocab_terms t ON t.public_key = i.pp_vocab_key
--           WHERE i.parent_inventory_item_id IS NOT NULL
--             AND t.entity NOT IN ('tool_variation', 'material_variation')) = 0
--     THEN 'OK' ELSE 'FAIL' END
-- ) AS payload;
