-- Phase 1: Create Standard Phase Framework
CREATE TABLE IF NOT EXISTS public.standard_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert the 4 standard phases
INSERT INTO public.standard_phases (name, display_order, description) VALUES
  ('Kickoff', 1, 'Project initialization, profile setup, and service agreement'),
  ('Planning', 2, 'Project planning, measurement, assessment, and scheduling'),
  ('Ordering', 3, 'Shopping checklist and ordering tools & materials'),
  ('Close Project', 4, 'Project closeout, tool/material return, and celebration')
ON CONFLICT (name) DO NOTHING;

-- Phase 2: Create Template Content Storage
CREATE TABLE IF NOT EXISTS public.template_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  standard_phase_id UUID NOT NULL REFERENCES public.standard_phases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.template_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES public.template_operations(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_title TEXT NOT NULL,
  description TEXT,
  content_sections JSONB DEFAULT '[]'::jsonb,
  materials JSONB DEFAULT '[]'::jsonb,
  tools JSONB DEFAULT '[]'::jsonb,
  outputs JSONB DEFAULT '[]'::jsonb,
  estimated_time_minutes INTEGER,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Phase 3: Create Project Run Assembly
CREATE TABLE IF NOT EXISTS public.project_run_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_run_id UUID NOT NULL REFERENCES public.project_runs(id) ON DELETE CASCADE,
  template_step_id UUID NOT NULL REFERENCES public.template_steps(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT false,
  completion_percentage INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  user_notes TEXT,
  custom_materials JSONB DEFAULT '[]'::jsonb,
  custom_tools JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_run_id, template_step_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_template_operations_project ON public.template_operations(project_id);
CREATE INDEX IF NOT EXISTS idx_template_operations_phase ON public.template_operations(standard_phase_id);
CREATE INDEX IF NOT EXISTS idx_template_steps_operation ON public.template_steps(operation_id);
CREATE INDEX IF NOT EXISTS idx_project_run_steps_run ON public.project_run_steps(project_run_id);
CREATE INDEX IF NOT EXISTS idx_project_run_steps_template ON public.project_run_steps(template_step_id);

-- Add RLS policies
ALTER TABLE public.standard_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_run_steps ENABLE ROW LEVEL SECURITY;

-- Standard phases are viewable by everyone
CREATE POLICY "Everyone can view standard phases"
  ON public.standard_phases FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage standard phases"
  ON public.standard_phases FOR ALL
  USING (is_admin(auth.uid()));

-- Template operations/steps are viewable by everyone, manageable by admins
CREATE POLICY "Everyone can view template operations"
  ON public.template_operations FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage template operations"
  ON public.template_operations FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Everyone can view template steps"
  ON public.template_steps FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage template steps"
  ON public.template_steps FOR ALL
  USING (is_admin(auth.uid()));

-- Project run steps are user-specific
CREATE POLICY "Users can view their own project run steps"
  ON public.project_run_steps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.project_runs pr 
    WHERE pr.id = project_run_id AND pr.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their own project run steps"
  ON public.project_run_steps FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.project_runs pr 
    WHERE pr.id = project_run_id AND pr.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all project run steps"
  ON public.project_run_steps FOR SELECT
  USING (is_admin(auth.uid()));

-- Add triggers for updated_at
CREATE TRIGGER update_standard_phases_updated_at
  BEFORE UPDATE ON public.standard_phases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_template_operations_updated_at
  BEFORE UPDATE ON public.template_operations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_template_steps_updated_at
  BEFORE UPDATE ON public.template_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_run_steps_updated_at
  BEFORE UPDATE ON public.project_run_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();