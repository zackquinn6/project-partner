-- Create relational table for space sizing values
-- This replaces the JSONB sizing_values column in project_run_spaces
-- Each row represents one sizing value for one space with one scaling unit

CREATE TABLE IF NOT EXISTS public.project_run_space_sizing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.project_run_spaces(id) ON DELETE CASCADE,
  scaling_unit TEXT NOT NULL, -- e.g., 'per square foot', 'per linear foot', 'per 10x10 room', etc.
  size_value NUMERIC NOT NULL CHECK (size_value >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(space_id, scaling_unit)
);

-- Add comment for documentation
COMMENT ON TABLE public.project_run_space_sizing IS 'Relational table storing sizing values for spaces. Each row represents one sizing value for one space with one scaling unit. Replaces JSONB sizing_values column.';
COMMENT ON COLUMN public.project_run_space_sizing.scaling_unit IS 'The scaling unit (e.g., "per square foot", "per linear foot"). Must match project scaling units.';
COMMENT ON COLUMN public.project_run_space_sizing.size_value IS 'The numeric size value for this space and scaling unit.';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_space_sizing_space_id ON public.project_run_space_sizing(space_id);
CREATE INDEX IF NOT EXISTS idx_space_sizing_scaling_unit ON public.project_run_space_sizing(scaling_unit);
CREATE INDEX IF NOT EXISTS idx_space_sizing_space_unit ON public.project_run_space_sizing(space_id, scaling_unit);

-- Migrate existing data from sizing_values JSONB to relational table
INSERT INTO public.project_run_space_sizing (space_id, scaling_unit, size_value)
SELECT 
  prs.id as space_id,
  key as scaling_unit,
  (value::text)::NUMERIC as size_value
FROM public.project_run_spaces prs,
  jsonb_each_text(prs.sizing_values)
WHERE prs.sizing_values IS NOT NULL 
  AND prs.sizing_values != '{}'::jsonb
  AND (value::text)::NUMERIC > 0
ON CONFLICT (space_id, scaling_unit) DO NOTHING;

-- Also migrate from legacy scale_value/scale_unit columns if sizing_values is empty
INSERT INTO public.project_run_space_sizing (space_id, scaling_unit, size_value)
SELECT 
  prs.id as space_id,
  COALESCE(prs.scale_unit, 'square foot') as scaling_unit,
  COALESCE(prs.scale_value, 0) as size_value
FROM public.project_run_spaces prs
WHERE prs.scale_value IS NOT NULL 
  AND prs.scale_value > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.project_run_space_sizing prss 
    WHERE prss.space_id = prs.id 
    AND prss.scaling_unit = COALESCE(prs.scale_unit, 'square foot')
  )
ON CONFLICT (space_id, scaling_unit) DO NOTHING;

-- Enable RLS
ALTER TABLE public.project_run_space_sizing ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_run_space_sizing
CREATE POLICY "Users can view their own space sizing"
  ON public.project_run_space_sizing FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_run_spaces prs
      JOIN public.project_runs pr ON pr.id = prs.project_run_id
      WHERE prs.id = project_run_space_sizing.space_id
      AND pr.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own space sizing"
  ON public.project_run_space_sizing FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_run_spaces prs
      JOIN public.project_runs pr ON pr.id = prs.project_run_id
      WHERE prs.id = project_run_space_sizing.space_id
      AND pr.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own space sizing"
  ON public.project_run_space_sizing FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_run_spaces prs
      JOIN public.project_runs pr ON pr.id = prs.project_run_id
      WHERE prs.id = project_run_space_sizing.space_id
      AND pr.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own space sizing"
  ON public.project_run_space_sizing FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_run_spaces prs
      JOIN public.project_runs pr ON pr.id = prs.project_run_id
      WHERE prs.id = project_run_space_sizing.space_id
      AND pr.user_id = auth.uid()
    )
  );

-- Admins can manage all records
CREATE POLICY "Admins can manage all space sizing"
  ON public.project_run_space_sizing FOR ALL
  USING (is_admin(auth.uid()));

-- Update trigger for updated_at
CREATE TRIGGER update_space_sizing_updated_at
  BEFORE UPDATE ON public.project_run_space_sizing
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

