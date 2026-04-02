-- Remove measured-weight column; catalog uses estimated_weight_lbs only.
ALTER TABLE public.tool_variations
  DROP COLUMN IF EXISTS weight_lbs;
