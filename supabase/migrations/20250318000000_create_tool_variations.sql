-- Create unified tool_variations table and migrate data from
-- variation_instances, variation_attributes, and variation_attribute_values.
-- This migration copies existing data FIRST, then drops old tables.

BEGIN;

-- 1) Create new unified table
CREATE TABLE IF NOT EXISTS public.tool_variations (
  id uuid PRIMARY KEY,
  core_item_id uuid NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('tools', 'materials')),
  name text NOT NULL,
  description text,
  sku text,
  photo_url text,
  -- Original attribute key -> value mapping (e.g. {"size": "large"})
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Denormalized attribute definitions and values for this core item
  -- Structure: [
  --   {
  --     "id": "attr-id",
  --     "name": "size",
  --     "display_name": "Size",
  --     "attribute_type": "text",
  --     "values": [
  --       { "id": "val-id", "value": "large", "display_value": "Large", "sort_order": 1, "core_item_id": "..." },
  --       ...
  --     ]
  --   },
  --   ...
  -- ]
  attribute_definitions jsonb NOT NULL DEFAULT '[]'::jsonb,
  estimated_weight_lbs numeric,
  weight_lbs numeric,
  estimated_rental_lifespan_days integer,
  warning_flags text[] DEFAULT '{}',
  quick_add boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) Copy data from existing tables into tool_variations
INSERT INTO public.tool_variations (
  id,
  core_item_id,
  item_type,
  name,
  description,
  sku,
  photo_url,
  attributes,
  attribute_definitions,
  estimated_weight_lbs,
  weight_lbs,
  estimated_rental_lifespan_days,
  warning_flags,
  quick_add,
  created_at,
  updated_at
)
SELECT
  vi.id,
  vi.core_item_id,
  vi.item_type,
  vi.name,
  vi.description,
  vi.sku,
  vi.photo_url,
  COALESCE(vi.attributes, '{}'::jsonb),
  COALESCE(attr_defs.attribute_definitions, '[]'::jsonb),
  vi.estimated_weight_lbs,
  vi.weight_lbs,
  vi.estimated_rental_lifespan_days,
  vi.warning_flags,
  vi.quick_add,
  vi.created_at,
  vi.updated_at
FROM public.variation_instances vi
LEFT JOIN LATERAL (
  SELECT jsonb_agg(
           jsonb_build_object(
             'id', a.id,
             'name', a.name,
             'display_name', a.display_name,
             'attribute_type', a.attribute_type,
             'values', (
               SELECT COALESCE(
                 jsonb_agg(
                   jsonb_build_object(
                     'id', v.id,
                     'value', v.value,
                     'display_value', v.display_value,
                     'sort_order', v.sort_order,
                     'core_item_id', v.core_item_id
                   )
                   ORDER BY v.sort_order
                 ),
                 '[]'::jsonb
               )
               FROM public.variation_attribute_values v
               WHERE v.attribute_id = a.id
                 AND (v.core_item_id = vi.core_item_id OR v.core_item_id IS NULL)
             )
           )
         ) AS attribute_definitions
  FROM public.variation_attributes a
  WHERE EXISTS (
    SELECT 1
    FROM public.variation_attribute_values v2
    WHERE v2.attribute_id = a.id
      AND (v2.core_item_id = vi.core_item_id OR v2.core_item_id IS NULL)
  )
) AS attr_defs ON TRUE;

-- 3) Drop old tables now that data is migrated
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'variation_attribute_values'
  ) THEN
    DROP TABLE public.variation_attribute_values CASCADE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'variation_attributes'
  ) THEN
    DROP TABLE public.variation_attributes CASCADE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'variation_instances'
  ) THEN
    DROP TABLE public.variation_instances CASCADE;
  END IF;
END;
$$;

COMMIT;

