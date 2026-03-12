-- Create project_plans table for Rapid Costing / Save Budget feature.
-- Fixes 404 "Could not find the table 'public.project_plans'".

CREATE TABLE IF NOT EXISTS public.project_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id uuid NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  contingency_percent numeric NOT NULL DEFAULT 10,
  sales_tax_percent numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_plans_user_id ON public.project_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_project_plans_task_id ON public.project_plans(task_id);
CREATE INDEX IF NOT EXISTS idx_project_plans_updated_at ON public.project_plans(updated_at DESC);

ALTER TABLE public.project_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own project_plans" ON public.project_plans;
CREATE POLICY "Users can read own project_plans"
  ON public.project_plans FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own project_plans" ON public.project_plans;
CREATE POLICY "Users can insert own project_plans"
  ON public.project_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own project_plans" ON public.project_plans;
CREATE POLICY "Users can update own project_plans"
  ON public.project_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own project_plans" ON public.project_plans;
CREATE POLICY "Users can delete own project_plans"
  ON public.project_plans FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_project_plans_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_project_plans_updated_at ON public.project_plans;
CREATE TRIGGER set_project_plans_updated_at
  BEFORE UPDATE ON public.project_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_project_plans_updated_at();
