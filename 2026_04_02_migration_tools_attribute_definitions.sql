-- Canonical attribute schema (types + allowed values) for a catalog tool.
-- Previously duplicated only on tool_variations rows, so updates affected 0 rows when no variants existed.

ALTER TABLE public.tools
  ADD COLUMN IF NOT EXISTS attribute_definitions jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.tools.attribute_definitions IS
  'Canonical JSON array of attribute definitions (id, name, display_name, attribute_type, values[]). Copied to tool_variations.attribute_definitions when variants exist.';

-- One-time backfill from existing variation rows (latest updated_at per core tool).
UPDATE public.tools t
SET attribute_definitions = COALESCE(v.attribute_definitions::jsonb, '[]'::jsonb)
FROM (
  SELECT DISTINCT ON (core_item_id)
    core_item_id,
    attribute_definitions
  FROM public.tool_variations
  WHERE attribute_definitions IS NOT NULL
  ORDER BY core_item_id, updated_at DESC NULLS LAST
) v
WHERE t.id = v.core_item_id;
