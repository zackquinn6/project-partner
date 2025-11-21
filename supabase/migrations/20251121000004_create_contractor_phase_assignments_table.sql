-- Create contractor phase assignments table
-- Links contractors to specific phases in project runs
-- Only phases with skill level = Professional should be assignable

CREATE TABLE IF NOT EXISTS public.contractor_phase_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_run_id UUID NOT NULL REFERENCES public.project_runs(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.user_contractors(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL, -- Name of the phase from project phases
  phase_id UUID, -- Optional: link to project_phases.id if available
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_run_id, contractor_id, phase_name) -- One contractor per phase per project run
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contractor_phase_assignments_project_run_id ON public.contractor_phase_assignments(project_run_id);
CREATE INDEX IF NOT EXISTS idx_contractor_phase_assignments_contractor_id ON public.contractor_phase_assignments(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_phase_assignments_phase_name ON public.contractor_phase_assignments(phase_name);

-- Enable RLS
ALTER TABLE public.contractor_phase_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view contractor assignments for their project runs"
  ON public.contractor_phase_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_runs
      WHERE project_runs.id = contractor_phase_assignments.project_run_id
        AND project_runs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert contractor assignments for their project runs"
  ON public.contractor_phase_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_runs
      WHERE project_runs.id = contractor_phase_assignments.project_run_id
        AND project_runs.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_contractors
      WHERE user_contractors.id = contractor_phase_assignments.contractor_id
        AND user_contractors.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update contractor assignments for their project runs"
  ON public.contractor_phase_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_runs
      WHERE project_runs.id = contractor_phase_assignments.project_run_id
        AND project_runs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_runs
      WHERE project_runs.id = contractor_phase_assignments.project_run_id
        AND project_runs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete contractor assignments for their project runs"
  ON public.contractor_phase_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_runs
      WHERE project_runs.id = contractor_phase_assignments.project_run_id
        AND project_runs.user_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_contractor_phase_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_contractor_phase_assignments_updated_at
  BEFORE UPDATE ON public.contractor_phase_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_contractor_phase_assignments_updated_at();

COMMENT ON TABLE public.contractor_phase_assignments IS 'Assigns contractors to specific phases in project runs. Only phases requiring Professional skill level should be assignable.';

