-- Stage 2, the personalization engine. Authored rules tailor a template risk or a PFMEA
-- requirement to one user and one project by adjusting occurrence and detection.
-- Severity is never a target: the consequence of a failure belongs to the requirement,
-- not to the person doing the work.
--
-- `conditions` is an AND-list of { signal, operator, values }, the same shape as
-- decisionApplicability in src/utils/microDecisionVisibility.ts. Comparison thresholds
-- live in the rule row so they are data, not code.

CREATE TABLE public.project_risk_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  target_kind text NOT NULL CHECK (target_kind IN ('pfmea_requirement', 'pfmea_failure_mode', 'template_risk')),
  target_id uuid NOT NULL,
  -- An empty list means the rule always applies. Any entry must resolve, or the rule
  -- does not fire and the skip is recorded in the run's audit trail.
  conditions jsonb NOT NULL,
  effect text NOT NULL CHECK (effect IN ('adjust_occurrence', 'adjust_detection', 'include', 'exclude')),
  -- Required for the adjust effects, meaningless for include and exclude.
  delta integer,
  -- Shown to the user to explain why this risk applies to them.
  rationale text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_risk_rules_conditions_is_array CHECK (jsonb_typeof(conditions) = 'array'),
  CONSTRAINT project_risk_rules_delta_presence CHECK (
    (effect IN ('adjust_occurrence', 'adjust_detection') AND delta IS NOT NULL AND delta <> 0)
    OR (effect IN ('include', 'exclude') AND delta IS NULL)
  ),
  CONSTRAINT project_risk_rules_rationale_not_blank CHECK (btrim(rationale) <> '')
);

CREATE INDEX project_risk_rules_project_id_idx ON public.project_risk_rules (project_id);
CREATE INDEX project_risk_rules_target_idx ON public.project_risk_rules (target_kind, target_id);

-- target_id is polymorphic so it cannot carry a foreign key. Validate it on write
-- instead, rather than letting a rule point at a row that does not exist.
CREATE OR REPLACE FUNCTION public.validate_project_risk_rule_target()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.target_kind = 'pfmea_requirement' THEN
    IF NOT EXISTS (SELECT 1 FROM public.pfmea_requirements WHERE id = NEW.target_id) THEN
      RAISE EXCEPTION 'project_risk_rules.target_id % is not a pfmea_requirements row', NEW.target_id;
    END IF;
  ELSIF NEW.target_kind = 'pfmea_failure_mode' THEN
    IF NOT EXISTS (SELECT 1 FROM public.pfmea_failure_modes WHERE id = NEW.target_id) THEN
      RAISE EXCEPTION 'project_risk_rules.target_id % is not a pfmea_failure_modes row', NEW.target_id;
    END IF;
  ELSIF NEW.target_kind = 'template_risk' THEN
    IF NOT EXISTS (SELECT 1 FROM public.project_risks WHERE id = NEW.target_id) THEN
      RAISE EXCEPTION 'project_risk_rules.target_id % is not a project_risks row', NEW.target_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER project_risk_rules_validate_target
  BEFORE INSERT OR UPDATE OF target_kind, target_id ON public.project_risk_rules
  FOR EACH ROW EXECUTE FUNCTION public.validate_project_risk_rule_target();

ALTER TABLE public.project_risk_rules ENABLE ROW LEVEL SECURITY;

-- Readable by anyone who can run the template, because the engine evaluates them for a
-- run. Writable only by project editors.
CREATE POLICY "project_risk_rules_select_authenticated" ON public.project_risk_rules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "project_risk_rules_insert_editors" ON public.project_risk_rules
  FOR INSERT TO authenticated
  WITH CHECK (public.can_caller_edit_project(project_id) IS TRUE);
CREATE POLICY "project_risk_rules_update_editors" ON public.project_risk_rules
  FOR UPDATE TO authenticated
  USING (public.can_caller_edit_project(project_id) IS TRUE)
  WITH CHECK (public.can_caller_edit_project(project_id) IS TRUE);
CREATE POLICY "project_risk_rules_delete_editors" ON public.project_risk_rules
  FOR DELETE TO authenticated
  USING (public.can_caller_edit_project(project_id) IS TRUE);
