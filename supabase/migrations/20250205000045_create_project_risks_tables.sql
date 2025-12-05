-- Migration: Create project risks tables
-- Risks exist at project_run level (user-specific) and can be copied from template risks
-- Note: project_template_risks table is created in migration 20250205000044

-- ============================================
-- PART 1: Ensure project_template_risks table exists (created in earlier migration)
-- ============================================

-- Table creation moved to 20250205000044 to ensure it exists before inserting risks
-- This migration focuses on RLS policies and project_run_risks table

-- ============================================
-- PART 2: Create project_run_risks table
-- Stores risks at the project_run level (user-specific, can be customized)
-- ============================================

CREATE TABLE IF NOT EXISTS public.project_run_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_run_id UUID NOT NULL REFERENCES public.project_runs(id) ON DELETE CASCADE,
  template_risk_id UUID REFERENCES public.project_template_risks(id) ON DELETE SET NULL,
  risk_title TEXT NOT NULL,
  risk_description TEXT,
  likelihood TEXT CHECK (likelihood IN ('low', 'medium', 'high')),
  impact TEXT CHECK (impact IN ('low', 'medium', 'high')),
  budget_impact_low NUMERIC(10, 2),
  budget_impact_high NUMERIC(10, 2),
  schedule_impact_low_days INTEGER,
  schedule_impact_high_days INTEGER,
  mitigation_strategy TEXT,
  mitigation_cost NUMERIC(10, 2),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'monitoring', 'mitigated', 'closed')),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_project_run_risks_project_run_id ON public.project_run_risks(project_run_id);
CREATE INDEX IF NOT EXISTS idx_project_run_risks_status ON public.project_run_risks(project_run_id, status);
CREATE INDEX IF NOT EXISTS idx_project_run_risks_display_order ON public.project_run_risks(project_run_id, display_order);

-- ============================================
-- PART 3: Enable RLS
-- ============================================

ALTER TABLE public.project_template_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_run_risks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_template_risks (admins can manage, users can read)
CREATE POLICY "Admins can manage template risks"
  ON public.project_template_risks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view template risks"
  ON public.project_template_risks
  FOR SELECT
  USING (true);

-- RLS Policies for project_run_risks (users can manage their own project runs)
CREATE POLICY "Users can manage their own project run risks"
  ON public.project_run_risks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.project_runs
      WHERE project_runs.id = project_run_risks.project_run_id
        AND project_runs.user_id = auth.uid()
    )
  );

-- ============================================
-- PART 4: Create function to copy template risks to project run
-- ============================================

CREATE OR REPLACE FUNCTION public.copy_template_risks_to_project_run(
  p_project_run_id UUID,
  p_template_project_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  risk_record RECORD;
  copied_count INTEGER := 0;
BEGIN
  -- Copy all template risks to the project run
  FOR risk_record IN
    SELECT *
    FROM public.project_template_risks
    WHERE project_id = p_template_project_id
    ORDER BY display_order
  LOOP
    INSERT INTO public.project_run_risks (
      project_run_id,
      template_risk_id,
      risk_title,
      risk_description,
      likelihood,
      impact,
      budget_impact_low,
      budget_impact_high,
      schedule_impact_low_days,
      schedule_impact_high_days,
      mitigation_strategy,
      mitigation_cost,
      display_order,
      status
    ) VALUES (
      p_project_run_id,
      risk_record.id,
      risk_record.risk_title,
      risk_record.risk_description,
      risk_record.likelihood,
      risk_record.impact,
      risk_record.budget_impact_low,
      risk_record.budget_impact_high,
      risk_record.schedule_impact_low_days,
      risk_record.schedule_impact_high_days,
      risk_record.mitigation_strategy,
      risk_record.mitigation_cost,
      risk_record.display_order,
      'open'
    );
    
    copied_count := copied_count + 1;
  END LOOP;
  
  RETURN copied_count;
END;
$$;

-- ============================================
-- PART 5: Add trigger to update updated_at
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_template_risks_updated_at
  BEFORE UPDATE ON public.project_template_risks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_run_risks_updated_at
  BEFORE UPDATE ON public.project_run_risks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

