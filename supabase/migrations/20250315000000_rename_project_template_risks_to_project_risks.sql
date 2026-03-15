-- Rename project_template_risks to project_risks and merge project_template_risk_mitigation_actions into project_risks.

-- 1. Add mitigation_actions JSONB to project_template_risks (before rename) to hold merged rows
ALTER TABLE public.project_template_risks
  ADD COLUMN IF NOT EXISTS mitigation_actions jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.project_template_risks.mitigation_actions IS 'Array of { action_description, cost, display_order } merged from project_template_risk_mitigation_actions.';

-- 2. Migrate data: aggregate project_template_risk_mitigation_actions per risk into mitigation_actions
UPDATE public.project_template_risks r
SET mitigation_actions = sub.actions
FROM (
  SELECT a.template_risk_id AS risk_id,
    jsonb_agg(
      jsonb_build_object(
        'action_description', a.action_description,
        'cost', a.cost,
        'display_order', a.display_order
      ) ORDER BY a.display_order NULLS LAST, a.created_at
    ) AS actions
  FROM public.project_template_risk_mitigation_actions a
  GROUP BY a.template_risk_id
) sub
WHERE r.id = sub.risk_id;

-- 3. Drop FK from project_run_risks so we can rename the referenced table
ALTER TABLE public.project_run_risks
  DROP CONSTRAINT IF EXISTS project_run_risks_template_risk_id_fkey;

-- 4. Drop the mitigation actions table
DROP TABLE IF EXISTS public.project_template_risk_mitigation_actions;

-- 5. Rename table to project_risks
ALTER TABLE public.project_template_risks RENAME TO project_risks;

-- 6. Re-add FK: project_run_risks.template_risk_id -> project_risks(id)
ALTER TABLE public.project_run_risks
  ADD CONSTRAINT project_run_risks_template_risk_id_fkey
  FOREIGN KEY (template_risk_id) REFERENCES public.project_risks(id);

-- 7. Rename project_id FK constraint to match new table name
ALTER TABLE public.project_risks
  DROP CONSTRAINT IF EXISTS project_template_risks_project_id_fkey;

ALTER TABLE public.project_risks
  ADD CONSTRAINT project_risks_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id);
