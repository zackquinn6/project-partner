-- ===========================================================================
-- After Toolio phase 6 + a mirror sync/reload: list unmatched children that are
-- waiting (pp_vocab_pending) so the Toolio edge can call propose_term for each.
-- Run in Toolio SQL editor; returns one JSON payload.
-- ===========================================================================

SELECT jsonb_build_object(
  'waiting_variants', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'toolio_item_id', c.id,
      'entity', CASE WHEN t.entity = 'tool' THEN 'tool_variation' ELSE 'material_variation' END,
      'key', CASE
        WHEN c.sku ~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN c.sku
        ELSE lower(regexp_replace(coalesce(c.sku, c.name), '[^a-zA-Z0-9]+', '-', 'g'))
      END,
      'name', c.name,
      'description', c.description,
      'parent_key', p.pp_vocab_key,
      'toolio_item_kind', 'inventory_variant'
    ) ORDER BY c.name), '[]'::jsonb)
    FROM public.inventory_items c
    JOIN public.inventory_items p ON p.id = c.parent_inventory_item_id
    JOIN public.pp_vocab_terms t ON t.public_key = p.pp_vocab_key
    WHERE c.pp_vocab_pending IS TRUE AND c.pp_vocab_key IS NULL
  ),
  'waiting_cores', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'toolio_item_id', i.id,
      'name', i.name,
      'sku', i.sku,
      'pp_vocab_pending', i.pp_vocab_pending
    ) ORDER BY i.name), '[]'::jsonb)
    FROM public.inventory_items i
    WHERE i.parent_inventory_item_id IS NULL AND i.pp_vocab_pending IS TRUE AND i.pp_vocab_key IS NULL
  ),
  'linked_variants', (
    SELECT count(*) FROM public.inventory_items
    WHERE parent_inventory_item_id IS NOT NULL AND pp_vocab_key IS NOT NULL
  ),
  'pending_variants', (
    SELECT count(*) FROM public.inventory_items
    WHERE parent_inventory_item_id IS NOT NULL AND pp_vocab_pending IS TRUE
  ),
  'unlinked_cores', (
    SELECT count(*) FROM public.inventory_items
    WHERE parent_inventory_item_id IS NULL AND pp_vocab_key IS NULL AND coalesce(pp_vocab_pending, false) = false
  )
) AS payload;