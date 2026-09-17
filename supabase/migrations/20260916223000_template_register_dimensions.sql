-- Stage 1 for safety, schedule, and budget: the template register gains a component and
-- the same three scores the PFMEA uses, so register risks and quality failure modes are
-- prioritized by one Action Priority table.
--
-- Columns are nullable because existing rows predate the component and the scores, and
-- there is no honest way to derive either from a severity string. An unclassified or
-- unscored risk is reported as such rather than defaulted into a component.

ALTER TABLE public.project_risks
  ADD COLUMN risk_dimension text,
  ADD COLUMN severity_score integer,
  ADD COLUMN occurrence_score integer,
  ADD COLUMN detection_score integer,
  ADD COLUMN operation_step_id uuid;

ALTER TABLE public.project_risks
  ADD CONSTRAINT project_risks_risk_dimension_check
  CHECK (risk_dimension IS NULL OR risk_dimension IN ('safety', 'schedule', 'budget'));

ALTER TABLE public.project_risks
  ADD CONSTRAINT project_risks_severity_score_range
  CHECK (severity_score IS NULL OR severity_score BETWEEN 1 AND 10);
ALTER TABLE public.project_risks
  ADD CONSTRAINT project_risks_occurrence_score_range
  CHECK (occurrence_score IS NULL OR occurrence_score BETWEEN 1 AND 10);
ALTER TABLE public.project_risks
  ADD CONSTRAINT project_risks_detection_score_range
  CHECK (detection_score IS NULL OR detection_score BETWEEN 1 AND 10);

ALTER TABLE public.project_risks
  ADD CONSTRAINT project_risks_operation_step_id_fkey
  FOREIGN KEY (operation_step_id) REFERENCES public.operation_steps(id) ON DELETE SET NULL;

CREATE INDEX project_risks_operation_step_id_idx
  ON public.project_risks (operation_step_id)
  WHERE operation_step_id IS NOT NULL;

CREATE INDEX project_risks_risk_dimension_idx
  ON public.project_risks (project_id, risk_dimension);
