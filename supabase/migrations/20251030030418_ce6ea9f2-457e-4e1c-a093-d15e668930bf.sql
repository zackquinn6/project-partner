-- Create project_run_spaces table
CREATE TABLE IF NOT EXISTS public.project_run_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_run_id UUID NOT NULL,
  home_space_id UUID REFERENCES public.home_spaces(id) ON DELETE SET NULL,
  space_name TEXT NOT NULL,
  space_type TEXT NOT NULL DEFAULT 'custom',
  scale_value NUMERIC,
  scale_unit TEXT DEFAULT 'square foot',
  is_from_home BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add square_footage to home_spaces if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'home_spaces' 
    AND column_name = 'square_footage'
  ) THEN
    ALTER TABLE public.home_spaces ADD COLUMN square_footage NUMERIC;
  END IF;
END $$;

-- Create scaled_step_progress table
CREATE TABLE IF NOT EXISTS public.scaled_step_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_run_id UUID NOT NULL,
  step_id TEXT NOT NULL,
  space_id UUID NOT NULL REFERENCES public.project_run_spaces(id) ON DELETE CASCADE,
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_run_id, step_id, space_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_project_run_spaces_project_run_id ON public.project_run_spaces(project_run_id);
CREATE INDEX IF NOT EXISTS idx_project_run_spaces_home_space_id ON public.project_run_spaces(home_space_id);
CREATE INDEX IF NOT EXISTS idx_scaled_step_progress_project_run_id ON public.scaled_step_progress(project_run_id);
CREATE INDEX IF NOT EXISTS idx_scaled_step_progress_step_id ON public.scaled_step_progress(step_id);
CREATE INDEX IF NOT EXISTS idx_scaled_step_progress_space_id ON public.scaled_step_progress(space_id);

-- Enable RLS
ALTER TABLE public.project_run_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scaled_step_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_run_spaces
CREATE POLICY "Users can view their own project spaces"
  ON public.project_run_spaces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_runs pr
      WHERE pr.id = project_run_spaces.project_run_id
      AND pr.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own project spaces"
  ON public.project_run_spaces FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_runs pr
      WHERE pr.id = project_run_spaces.project_run_id
      AND pr.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own project spaces"
  ON public.project_run_spaces FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_runs pr
      WHERE pr.id = project_run_spaces.project_run_id
      AND pr.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own project spaces"
  ON public.project_run_spaces FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_runs pr
      WHERE pr.id = project_run_spaces.project_run_id
      AND pr.user_id = auth.uid()
    )
  );

-- RLS Policies for scaled_step_progress
CREATE POLICY "Users can view their own step progress"
  ON public.scaled_step_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_runs pr
      WHERE pr.id = scaled_step_progress.project_run_id
      AND pr.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own step progress"
  ON public.scaled_step_progress FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_runs pr
      WHERE pr.id = scaled_step_progress.project_run_id
      AND pr.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own step progress"
  ON public.scaled_step_progress FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_runs pr
      WHERE pr.id = scaled_step_progress.project_run_id
      AND pr.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own step progress"
  ON public.scaled_step_progress FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_runs pr
      WHERE pr.id = scaled_step_progress.project_run_id
      AND pr.user_id = auth.uid()
    )
  );

-- Admins can manage all records
CREATE POLICY "Admins can manage all project spaces"
  ON public.project_run_spaces FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage all step progress"
  ON public.scaled_step_progress FOR ALL
  USING (is_admin(auth.uid()));

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_run_spaces_updated_at
  BEFORE UPDATE ON public.project_run_spaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scaled_step_progress_updated_at
  BEFORE UPDATE ON public.scaled_step_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();