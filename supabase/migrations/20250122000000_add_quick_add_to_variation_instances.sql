-- Add quick_add column to variation_instances table
-- This allows admins to mark specific tool/material variants for quick-add in Build Your Profile

ALTER TABLE public.variation_instances 
ADD COLUMN IF NOT EXISTS quick_add BOOLEAN DEFAULT false;

-- Add index for performance when querying quick_add tools
CREATE INDEX IF NOT EXISTS idx_variation_instances_quick_add 
ON public.variation_instances(item_type, quick_add) 
WHERE quick_add = true;

-- Add comment to document the column
COMMENT ON COLUMN public.variation_instances.quick_add IS 'If true, this variant will appear in the Build Your Profile quick-add tools list';

