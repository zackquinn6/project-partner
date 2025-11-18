-- Create project_notes table for storing user project notes
CREATE TABLE IF NOT EXISTS public.project_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_run_id UUID NOT NULL REFERENCES public.project_runs(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  step_id TEXT NOT NULL, -- Step ID from the workflow
  step_name TEXT, -- Step name (denormalized for display)
  phase_id TEXT, -- Phase ID
  phase_name TEXT, -- Phase name (denormalized for display)
  operation_id TEXT, -- Operation ID
  operation_name TEXT, -- Operation name (denormalized for display)
  note_text TEXT NOT NULL, -- The note content
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_notes_user_id ON public.project_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_project_notes_project_run_id ON public.project_notes(project_run_id);
CREATE INDEX IF NOT EXISTS idx_project_notes_template_id ON public.project_notes(template_id);
CREATE INDEX IF NOT EXISTS idx_project_notes_step_id ON public.project_notes(step_id);
CREATE INDEX IF NOT EXISTS idx_project_notes_phase_id ON public.project_notes(phase_id);
CREATE INDEX IF NOT EXISTS idx_project_notes_operation_id ON public.project_notes(operation_id);
CREATE INDEX IF NOT EXISTS idx_project_notes_created_at ON public.project_notes(created_at DESC);

-- Enable RLS
ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own notes
CREATE POLICY "Users can view their own notes" 
  ON public.project_notes 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy 2: Users can create notes for their own projects
CREATE POLICY "Users can create their own notes" 
  ON public.project_notes 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own notes
CREATE POLICY "Users can update their own notes" 
  ON public.project_notes 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own notes
CREATE POLICY "Users can delete their own notes" 
  ON public.project_notes 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_project_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_notes_updated_at
  BEFORE UPDATE ON public.project_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_project_notes_updated_at();

COMMENT ON TABLE public.project_notes IS 'Stores user notes for project workflow steps';
COMMENT ON COLUMN public.project_notes.step_id IS 'ID of the step where the note was created';
COMMENT ON COLUMN public.project_notes.note_text IS 'The note content text';

