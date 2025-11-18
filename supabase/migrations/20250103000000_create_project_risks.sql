-- Create project_risks table for template-level risks
CREATE TABLE IF NOT EXISTS public.project_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  risk TEXT NOT NULL,
  likelihood TEXT NOT NULL CHECK (likelihood IN ('low', 'medium', 'high', 'critical')),
  impact TEXT NOT NULL CHECK (impact IN ('low', 'medium', 'high', 'critical')),
  mitigation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- Create project_run_risks table for run-level risks (status and additional risks)
CREATE TABLE IF NOT EXISTS public.project_run_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_run_id UUID NOT NULL REFERENCES public.project_runs(id) ON DELETE CASCADE,
  template_risk_id UUID REFERENCES public.project_risks(id) ON DELETE SET NULL,
  risk TEXT NOT NULL,
  likelihood TEXT NOT NULL CHECK (likelihood IN ('low', 'medium', 'high', 'critical')),
  impact TEXT NOT NULL CHECK (impact IN ('low', 'medium', 'high', 'critical')),
  mitigation TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'mitigated', 'closed', 'monitoring')),
  is_template_risk BOOLEAN NOT NULL DEFAULT false, -- True if this came from template, false if user-added
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_risks_project_id ON public.project_risks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_risks_display_order ON public.project_risks(project_id, display_order);
CREATE INDEX IF NOT EXISTS idx_project_run_risks_project_run_id ON public.project_run_risks(project_run_id);
CREATE INDEX IF NOT EXISTS idx_project_run_risks_template_risk_id ON public.project_run_risks(template_risk_id);
CREATE INDEX IF NOT EXISTS idx_project_run_risks_status ON public.project_run_risks(project_run_id, status);
CREATE INDEX IF NOT EXISTS idx_project_run_risks_display_order ON public.project_run_risks(project_run_id, display_order);

-- Enable RLS
ALTER TABLE public.project_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_run_risks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_risks (template level - admins only)
CREATE POLICY "Admins can view all project risks"
  ON public.project_risks FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert project risks"
  ON public.project_risks FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update project risks"
  ON public.project_risks FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete project risks"
  ON public.project_risks FOR DELETE
  USING (is_admin(auth.uid()));

-- RLS Policies for project_run_risks (users can manage their own project runs)
CREATE POLICY "Users can view risks for their project runs"
  ON public.project_run_risks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_runs
      WHERE project_runs.id = project_run_risks.project_run_id
      AND project_runs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert risks for their project runs"
  ON public.project_run_risks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_runs
      WHERE project_runs.id = project_run_risks.project_run_id
      AND project_runs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update risks for their project runs"
  ON public.project_run_risks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_runs
      WHERE project_runs.id = project_run_risks.project_run_id
      AND project_runs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_runs
      WHERE project_runs.id = project_run_risks.project_run_id
      AND project_runs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete user-added risks from their project runs"
  ON public.project_run_risks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_runs
      WHERE project_runs.id = project_run_risks.project_run_id
      AND project_runs.user_id = auth.uid()
    )
    AND is_template_risk = false -- Users can only delete risks they added, not template risks
  );

-- Add updated_at trigger for project_risks
CREATE OR REPLACE FUNCTION update_project_risks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_risks_updated_at
  BEFORE UPDATE ON public.project_risks
  FOR EACH ROW
  EXECUTE FUNCTION update_project_risks_updated_at();

-- Add updated_at trigger for project_run_risks
CREATE OR REPLACE FUNCTION update_project_run_risks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_run_risks_updated_at
  BEFORE UPDATE ON public.project_run_risks
  FOR EACH ROW
  EXECUTE FUNCTION update_project_run_risks_updated_at();

COMMENT ON TABLE public.project_risks IS 'Template-level risks defined by admins for project templates';
COMMENT ON TABLE public.project_run_risks IS 'Project run-level risks with status tracking and user-added risks';
COMMENT ON COLUMN public.project_run_risks.is_template_risk IS 'True if risk came from template (cannot be deleted by users), false if user-added';
COMMENT ON COLUMN public.project_run_risks.status IS 'Risk status: open, mitigated, closed, or monitoring';

