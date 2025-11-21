-- Create project_run_phase_assignments table for assigning phases to team members
CREATE TABLE IF NOT EXISTS public.project_run_phase_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_run_id UUID NOT NULL REFERENCES public.project_runs(id) ON DELETE CASCADE,
  phase_id TEXT NOT NULL,
  person_id TEXT NOT NULL, -- References team member ID (stored as text for flexibility)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_date DATE,
  scheduled_hours NUMERIC(10, 2) DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_run_id, phase_id, person_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_run_phase_assignments_run ON public.project_run_phase_assignments(project_run_id);
CREATE INDEX IF NOT EXISTS idx_project_run_phase_assignments_user ON public.project_run_phase_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_project_run_phase_assignments_person ON public.project_run_phase_assignments(person_id);

-- Enable RLS
ALTER TABLE public.project_run_phase_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own phase assignments"
  ON public.project_run_phase_assignments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own phase assignments"
  ON public.project_run_phase_assignments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own phase assignments"
  ON public.project_run_phase_assignments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own phase assignments"
  ON public.project_run_phase_assignments FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE public.project_run_phase_assignments IS 'Stores assignments of project phases to team members for project runs';

