-- Add missing columns to materials table
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS unit_size TEXT;

-- Add missing columns to tools table  
ALTER TABLE public.tools
ADD COLUMN IF NOT EXISTS item TEXT;

-- Add comments for clarity
COMMENT ON COLUMN public.materials.unit_size IS 'Size specification for the material unit (e.g., "5 gallon", "50 lb bag")';
COMMENT ON COLUMN public.tools.item IS 'Specific item name or identifier for the tool';