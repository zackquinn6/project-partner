-- An un-analyzed PFMEA line must be reportable as unscored rather than carrying an
-- invented score. Today severity, occurrence, and detection are NOT NULL with defaults,
-- so every row looks scored and the scoring functions substitute 10 for what is missing.
-- That combination reports maximum risk for analysis nobody has done yet.
--
-- Detection already allows null (pfmea_controls.detection_score), so only severity and
-- occurrence change here.
--
-- Rows that already hold a defaulted value keep it. There is no way to tell an authored
-- score from a defaulted one after the fact, and guessing would discard real analysis.

ALTER TABLE public.pfmea_failure_modes
  ALTER COLUMN severity_score DROP DEFAULT,
  ALTER COLUMN severity_score DROP NOT NULL;

ALTER TABLE public.pfmea_potential_effects
  ALTER COLUMN severity_score DROP DEFAULT,
  ALTER COLUMN severity_score DROP NOT NULL;

ALTER TABLE public.pfmea_potential_causes
  ALTER COLUMN occurrence_score DROP DEFAULT,
  ALTER COLUMN occurrence_score DROP NOT NULL;

ALTER TABLE public.pfmea_failure_modes
  ADD CONSTRAINT pfmea_failure_modes_severity_score_range
  CHECK (severity_score IS NULL OR severity_score BETWEEN 1 AND 10);

ALTER TABLE public.pfmea_potential_effects
  ADD CONSTRAINT pfmea_potential_effects_severity_score_range
  CHECK (severity_score IS NULL OR severity_score BETWEEN 1 AND 10);

ALTER TABLE public.pfmea_potential_causes
  ADD CONSTRAINT pfmea_potential_causes_occurrence_score_range
  CHECK (occurrence_score IS NULL OR occurrence_score BETWEEN 1 AND 10);

ALTER TABLE public.pfmea_controls
  ADD CONSTRAINT pfmea_controls_detection_score_range
  CHECK (detection_score IS NULL OR detection_score BETWEEN 1 AND 10);

ALTER TABLE public.pfmea_controls
  ADD CONSTRAINT pfmea_controls_control_type_check
  CHECK (control_type IN ('prevention', 'detection'));
