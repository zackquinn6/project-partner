-- Variations UI reads/writes canonical attribute schema on tools; PostgREST returns 42703 if missing.
ALTER TABLE public.tools
  ADD COLUMN IF NOT EXISTS attribute_definitions jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.tools.attribute_definitions IS
  'JSON array of variation attribute definitions (id, name, display_name, attribute_type, values[]) for tool_variations.';
