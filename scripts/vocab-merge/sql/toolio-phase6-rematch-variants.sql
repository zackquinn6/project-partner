-- ===========================================================================
-- After PP variations are keyed: reload the Project Partner snapshot into
-- Toolio, then run this to soft-match pending children before propose_term.
-- Run in Toolio SQL editor.
-- ===========================================================================

-- Stronger match under the same parent: exact SKU/public_key, then normalized name.
WITH child AS (
  SELECT
    c.id,
    c.sku,
    public.inventory_item_name_comparison_key(c.name) AS name_key,
    public.inventory_item_name_comparison_key(
      replace(replace(replace(c.name, '·', ' '), '"', ' in'), '″', ' in')
    ) AS name_key_alt,
    p.pp_vocab_key AS parent_key
  FROM public.inventory_items c
  JOIN public.inventory_items p ON p.id = c.parent_inventory_item_id
  WHERE c.pp_vocab_key IS NULL
    AND coalesce(c.pp_vocab_pending, false) = true
    AND p.pp_vocab_key IS NOT NULL
),
by_sku AS (
  SELECT DISTINCT ON (child.id)
    child.id AS child_id,
    t.public_key
  FROM child
  JOIN public.pp_vocab_terms t
    ON t.parent_public_key = child.parent_key
   AND t.entity IN ('tool_variation', 'material_variation')
   AND (
     (child.sku IS NOT NULL AND t.public_key = child.sku)
     OR (child.sku IS NOT NULL AND public.inventory_item_name_comparison_key(t.name) = public.inventory_item_name_comparison_key(child.sku))
   )
  ORDER BY child.id, t.public_key
),
by_name AS (
  SELECT DISTINCT ON (child.id)
    child.id AS child_id,
    t.public_key
  FROM child
  JOIN public.pp_vocab_terms t
    ON t.parent_public_key = child.parent_key
   AND t.entity IN ('tool_variation', 'material_variation')
   AND (
     public.inventory_item_name_comparison_key(t.name) = child.name_key
     OR public.inventory_item_name_comparison_key(
          replace(replace(replace(t.name, '·', ' '), '"', ' in'), '″', ' in')
        ) = child.name_key_alt
   )
  WHERE NOT EXISTS (SELECT 1 FROM by_sku s WHERE s.child_id = child.id)
  ORDER BY child.id, t.public_key
),
matched AS (
  SELECT * FROM by_sku
  UNION ALL
  SELECT * FROM by_name
)
UPDATE public.inventory_items i
SET pp_vocab_key = m.public_key, pp_vocab_pending = false
FROM matched m
WHERE i.id = m.child_id;

SELECT jsonb_build_object(
  'linked_variants', (
    SELECT count(*) FROM public.inventory_items
    WHERE parent_inventory_item_id IS NOT NULL AND pp_vocab_key IS NOT NULL
  ),
  'pending_variants', (
    SELECT count(*) FROM public.inventory_items
    WHERE parent_inventory_item_id IS NOT NULL AND pp_vocab_pending IS TRUE
  ),
  'mirrored_variations', (
    SELECT count(*) FROM public.pp_vocab_terms
    WHERE entity IN ('tool_variation', 'material_variation')
  ),
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
  'status', CASE
    WHEN (SELECT count(*) FROM public.pp_vocab_terms WHERE entity IN ('tool_variation', 'material_variation')) = 0
      THEN 'FAIL_NO_MIRROR'
    WHEN (SELECT count(*) FROM public.inventory_items
          WHERE parent_inventory_item_id IS NOT NULL AND pp_vocab_pending IS TRUE) = 0
      THEN 'OK'
    ELSE 'NEEDS_PROPOSE'
  END
) AS payload;