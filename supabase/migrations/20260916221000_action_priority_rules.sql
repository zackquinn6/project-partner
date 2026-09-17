-- Prioritization moves from a hardcoded switch in src/utils/pfmeaRiskMetrics.ts into data,
-- and the table is retuned so detection cannot substitute for prevention.
--
-- Retuning rules:
--   1. Detection only influences priority when occurrence is low (1-3). Above that,
--      priority is set by severity and occurrence alone.
--   2. Severity >= 7 with occurrence >= 4 is High regardless of detection.
--   3. Detection can never improve priority by more than one level.
--   4. Severity >= 9 with occurrence >= 2 is at least Medium.

CREATE TABLE public.risk_action_priority_labels (
  action_priority text PRIMARY KEY CHECK (action_priority IN ('H', 'M', 'L')),
  -- Consumer-facing wording. Lives in data so it can change without a deploy.
  consumer_label text NOT NULL,
  consumer_description text NOT NULL,
  -- Ascending urgency, for ordering without hardcoding the H/M/L sequence.
  urgency_rank integer NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.risk_action_priority_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "risk_action_priority_labels_select_authenticated"
  ON public.risk_action_priority_labels
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "risk_action_priority_labels_write_admin"
  ON public.risk_action_priority_labels
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) IS TRUE)
  WITH CHECK (public.is_admin(auth.uid()) IS TRUE);

INSERT INTO public.risk_action_priority_labels
  (action_priority, consumer_label, consumer_description, urgency_rank)
VALUES
  ('H', 'Act before this step', 'Change how you do this step, or the result is likely to disappoint.', 3),
  ('M', 'Have a safeguard ready', 'Set up your check or backup before you start, not after.', 2),
  ('L', 'Nothing needed', 'Covered by the normal instructions.', 1);

-- ---------------------------------------------------------------------------
-- The lookup table.
-- ---------------------------------------------------------------------------
CREATE TABLE public.pfmea_action_priority_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Per component so safety can be tuned stricter than budget without code changes.
  dimension text NOT NULL CHECK (dimension IN ('quality', 'safety', 'schedule', 'budget')),
  severity_min integer NOT NULL CHECK (severity_min BETWEEN 1 AND 10),
  severity_max integer NOT NULL CHECK (severity_max BETWEEN 1 AND 10),
  occurrence_min integer NOT NULL CHECK (occurrence_min BETWEEN 1 AND 10),
  occurrence_max integer NOT NULL CHECK (occurrence_max BETWEEN 1 AND 10),
  detection_min integer NOT NULL CHECK (detection_min BETWEEN 1 AND 10),
  detection_max integer NOT NULL CHECK (detection_max BETWEEN 1 AND 10),
  action_priority text NOT NULL REFERENCES public.risk_action_priority_labels(action_priority),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pfmea_action_priority_rules_severity_range CHECK (severity_min <= severity_max),
  CONSTRAINT pfmea_action_priority_rules_occurrence_range CHECK (occurrence_min <= occurrence_max),
  CONSTRAINT pfmea_action_priority_rules_detection_range CHECK (detection_min <= detection_max)
);

CREATE INDEX pfmea_action_priority_rules_lookup_idx
  ON public.pfmea_action_priority_rules (dimension, severity_min, severity_max);

ALTER TABLE public.pfmea_action_priority_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pfmea_action_priority_rules_select_authenticated"
  ON public.pfmea_action_priority_rules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "pfmea_action_priority_rules_write_admin"
  ON public.pfmea_action_priority_rules
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) IS TRUE)
  WITH CHECK (public.is_admin(auth.uid()) IS TRUE);

-- ---------------------------------------------------------------------------
-- Seed. Identical for all four components today; the dimension column exists so a
-- component can be retuned independently as a data edit.
-- ---------------------------------------------------------------------------
INSERT INTO public.pfmea_action_priority_rules
  (dimension, severity_min, severity_max, occurrence_min, occurrence_max, detection_min, detection_max, action_priority)
SELECT d.dimension, r.s_min, r.s_max, r.o_min, r.o_max, r.d_min, r.d_max, r.ap
FROM (VALUES ('quality'), ('safety'), ('schedule'), ('budget')) AS d(dimension)
CROSS JOIN (VALUES
  -- Severity 9-10. Catastrophic: injury, code violation, structural compromise.
  -- Occurrence >= 4 is High regardless of detection (rule 2).
  (9, 10, 4, 10, 1, 10, 'H'),
  -- Occurrence 2-3: detection may improve one level, no further (rules 1 and 3).
  (9, 10, 2,  3, 1,  4, 'M'),
  (9, 10, 2,  3, 5, 10, 'H'),
  -- Occurrence 1 is the only place a severity 9-10 row may reach Low (rule 4).
  (9, 10, 1,  1, 1,  4, 'L'),
  (9, 10, 1,  1, 5, 10, 'M'),

  -- Severity 7-8. Major: performance or durability loss, significant rework.
  (7,  8, 4, 10, 1, 10, 'H'),
  (7,  8, 2,  3, 1,  4, 'M'),
  (7,  8, 2,  3, 5, 10, 'H'),
  (7,  8, 1,  1, 1,  4, 'L'),
  (7,  8, 1,  1, 5, 10, 'M'),

  -- Severity 4-6. Moderate: visible defect, moderate cost or delay.
  -- Very frequent occurrence still escalates to High: repeated moderate failures
  -- are what actually derail a DIY project.
  (4,  6, 8, 10, 1, 10, 'H'),
  (4,  6, 4,  7, 1, 10, 'M'),
  (4,  6, 2,  3, 1,  4, 'L'),
  (4,  6, 2,  3, 5, 10, 'M'),
  (4,  6, 1,  1, 1, 10, 'L'),

  -- Severity 2-3. Minor: cosmetic, easily absorbed.
  (2,  3, 6, 10, 1, 10, 'M'),
  (2,  3, 1,  5, 1, 10, 'L'),

  -- Severity 1. No discernible effect.
  (1,  1, 1, 10, 1, 10, 'L')
) AS r(s_min, s_max, o_min, o_max, d_min, d_max, ap);

-- ---------------------------------------------------------------------------
-- Completeness and uniqueness check.
--
-- Every (severity, occurrence, detection) triple in 1..10 must resolve to exactly one
-- row for every component. Without this guarantee a lookup could return nothing and
-- the calling code would need an invented default, which is precisely what this work
-- removes from the scoring path.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_bad integer;
  v_detail text;
BEGIN
  CREATE TEMP TABLE ap_rule_coverage_check AS
  WITH grid AS (
    SELECT d.dimension, s.v AS severity, o.v AS occurrence, dt.v AS detection
    FROM (VALUES ('quality'), ('safety'), ('schedule'), ('budget')) AS d(dimension)
    CROSS JOIN generate_series(1, 10) AS s(v)
    CROSS JOIN generate_series(1, 10) AS o(v)
    CROSS JOIN generate_series(1, 10) AS dt(v)
  )
  SELECT
    g.dimension, g.severity, g.occurrence, g.detection,
    count(r.id) AS match_count
  FROM grid g
  LEFT JOIN public.pfmea_action_priority_rules r
    ON r.dimension = g.dimension
   AND g.severity BETWEEN r.severity_min AND r.severity_max
   AND g.occurrence BETWEEN r.occurrence_min AND r.occurrence_max
   AND g.detection BETWEEN r.detection_min AND r.detection_max
  GROUP BY g.dimension, g.severity, g.occurrence, g.detection
  HAVING count(r.id) <> 1;

  SELECT count(*) INTO v_bad FROM ap_rule_coverage_check;

  IF v_bad > 0 THEN
    SELECT string_agg(
             format('%s s=%s o=%s d=%s matches=%s', dimension, severity, occurrence, detection, match_count),
             '; '
           )
    INTO v_detail
    FROM (SELECT * FROM ap_rule_coverage_check LIMIT 20) AS sample;

    RAISE EXCEPTION
      'pfmea_action_priority_rules is not a total function over 1..10. % offending cell(s). Sample: %',
      v_bad, v_detail;
  END IF;

  DROP TABLE ap_rule_coverage_check;
END $$;
