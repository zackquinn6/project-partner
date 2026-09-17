-- Stage 3, the applied risk list. project_run_risks becomes the single per-run list for all
-- four components rather than gaining a parallel sibling table: it already carries
-- mitigation_actions, hidden_from_register, template_risk_id, from_standard_foundation,
-- and the whole RiskManagementWindow UI.
--
-- Quality items arrive here already translated into plain language, so no consumer ever
-- joins to a pfmea_* table.

ALTER TABLE public.project_run_risks
  ADD COLUMN risk_dimension text,
  ADD COLUMN source text,
  -- The Stage 1 row this was derived from: a pfmea_failure_modes id or a project_risks id.
  -- Polymorphic by source, so no foreign key. template_risk_id already covers the register
  -- case for the existing sync path.
  ADD COLUMN source_template_id uuid,
  ADD COLUMN operation_step_id uuid,
  ADD COLUMN severity_score integer,
  ADD COLUMN occurrence_score integer,
  ADD COLUMN detection_score integer,
  ADD COLUMN action_priority text,
  -- Ordering within an action priority class only. Never a priority driver.
  ADD COLUMN rpn integer,
  ADD COLUMN is_spiked boolean NOT NULL DEFAULT false,
  ADD COLUMN applied_rule_audit jsonb,
  ADD COLUMN excluded_by_customization boolean NOT NULL DEFAULT false;

ALTER TABLE public.project_run_risks
  ADD CONSTRAINT project_run_risks_risk_dimension_check
  CHECK (risk_dimension IS NULL OR risk_dimension IN ('quality', 'safety', 'schedule', 'budget'));

ALTER TABLE public.project_run_risks
  ADD CONSTRAINT project_run_risks_source_check
  CHECK (source IS NULL OR source IN ('pfmea', 'register'));

ALTER TABLE public.project_run_risks
  ADD CONSTRAINT project_run_risks_severity_score_range
  CHECK (severity_score IS NULL OR severity_score BETWEEN 1 AND 10);
ALTER TABLE public.project_run_risks
  ADD CONSTRAINT project_run_risks_occurrence_score_range
  CHECK (occurrence_score IS NULL OR occurrence_score BETWEEN 1 AND 10);
ALTER TABLE public.project_run_risks
  ADD CONSTRAINT project_run_risks_detection_score_range
  CHECK (detection_score IS NULL OR detection_score BETWEEN 1 AND 10);
ALTER TABLE public.project_run_risks
  ADD CONSTRAINT project_run_risks_rpn_range
  CHECK (rpn IS NULL OR rpn BETWEEN 1 AND 1000);

ALTER TABLE public.project_run_risks
  ADD CONSTRAINT project_run_risks_action_priority_fkey
  FOREIGN KEY (action_priority) REFERENCES public.risk_action_priority_labels(action_priority);

ALTER TABLE public.project_run_risks
  ADD CONSTRAINT project_run_risks_operation_step_id_fkey
  FOREIGN KEY (operation_step_id) REFERENCES public.operation_steps(id) ON DELETE SET NULL;

-- A quality item must name the failure mode it came from, otherwise it cannot be
-- re-derived on the next evaluation.
ALTER TABLE public.project_run_risks
  ADD CONSTRAINT project_run_risks_pfmea_source_identified
  CHECK (source IS DISTINCT FROM 'pfmea' OR source_template_id IS NOT NULL);

CREATE INDEX project_run_risks_dimension_idx
  ON public.project_run_risks (project_run_id, risk_dimension);
CREATE INDEX project_run_risks_operation_step_id_idx
  ON public.project_run_risks (project_run_id, operation_step_id)
  WHERE operation_step_id IS NOT NULL;

-- One applied row per Stage 1 source per run, so re-evaluation updates in place instead of
-- appending duplicates.
CREATE UNIQUE INDEX project_run_risks_run_source_key
  ON public.project_run_risks (project_run_id, source, source_template_id)
  WHERE source IS NOT NULL AND source_template_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Per-component rollup for the run.
-- Counts rather than one number, matching the product's existing "0 Highs" framing.
-- ---------------------------------------------------------------------------
CREATE TABLE public.project_run_risk_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_run_id uuid NOT NULL REFERENCES public.project_runs(id) ON DELETE CASCADE,
  dimension text NOT NULL CHECK (dimension IN ('quality', 'safety', 'schedule', 'budget')),
  -- Null when the component has no scored items at all.
  worst_action_priority text REFERENCES public.risk_action_priority_labels(action_priority),
  high_count integer NOT NULL DEFAULT 0,
  medium_count integer NOT NULL DEFAULT 0,
  low_count integer NOT NULL DEFAULT 0,
  -- Items that exist but cannot be scored. Reported, never counted as Low.
  unscored_count integer NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_run_risk_profile_run_dimension_key UNIQUE (project_run_id, dimension)
);

CREATE INDEX project_run_risk_profile_run_idx
  ON public.project_run_risk_profile (project_run_id);

ALTER TABLE public.project_run_risk_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_run_risk_profile_select_owner" ON public.project_run_risk_profile
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.project_runs r
    WHERE r.id = project_run_id AND r.user_id = auth.uid()
  ));
CREATE POLICY "project_run_risk_profile_insert_owner" ON public.project_run_risk_profile
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.project_runs r
    WHERE r.id = project_run_id AND r.user_id = auth.uid()
  ));
CREATE POLICY "project_run_risk_profile_update_owner" ON public.project_run_risk_profile
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.project_runs r
    WHERE r.id = project_run_id AND r.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.project_runs r
    WHERE r.id = project_run_id AND r.user_id = auth.uid()
  ));
CREATE POLICY "project_run_risk_profile_delete_owner" ON public.project_run_risk_profile
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.project_runs r
    WHERE r.id = project_run_id AND r.user_id = auth.uid()
  ));
