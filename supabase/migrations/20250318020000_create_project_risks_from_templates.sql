-- Create unified project_risks table from legacy template risk tables, if needed.

-- 1. Create project_risks table if it doesn't exist, matching supabase types.
CREATE TABLE IF NOT EXISTS public.project_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  risk_title TEXT NOT NULL,
  risk_description TEXT NULL,
  likelihood TEXT NULL,
  impact TEXT NULL,
  recommendation TEXT NULL,
  benefit TEXT NULL,
  budget_impact_low NUMERIC NULL,
  budget_impact_high NUMERIC NULL,
  schedule_impact_low_days INTEGER NULL,
  schedule_impact_high_days INTEGER NULL,
  mitigation_strategy TEXT NULL,
  mitigation_actions JSONB NULL,
  mitigation_cost NUMERIC NULL,
  display_order INTEGER NULL,
  created_at TIMESTAMPTZ NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NULL DEFAULT NOW()
);

-- 2. If legacy template table exists and project_risks is empty, migrate basic fields.
DO $$
BEGIN
  IF to_regclass('public.project_template_risks') IS NOT NULL
     AND (SELECT COUNT(*) FROM public.project_risks) = 0 THEN
    INSERT INTO public.project_risks (
      project_id,
      risk_title,
      risk_description,
      likelihood,
      impact,
      recommendation,
      benefit,
      budget_impact_low,
      budget_impact_high,
      schedule_impact_low_days,
      schedule_impact_high_days,
      display_order,
      created_at,
      updated_at
    )
    SELECT
      project_id,
      risk_title,
      risk_description,
      likelihood,
      impact,
      recommendation,
      benefit,
      budget_impact_low,
      budget_impact_high,
      schedule_impact_low_days,
      schedule_impact_high_days,
      display_order,
      created_at,
      updated_at
    FROM public.project_template_risks;
  END IF;
END
$$;

