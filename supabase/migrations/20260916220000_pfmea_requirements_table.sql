-- Stage 1 quality risk: make PFMEA requirements durable rows instead of an in-memory
-- projection of operation_steps.outputs keyed by array position.
--
-- Before this migration a failure mode pointed at its requirement through
-- pfmea_failure_modes.requirement_output_id, a text column with no foreign key that
-- fell back to 'index:N' when an output had no id. Reordering outputs silently
-- re-pointed failure modes at a different requirement.

-- ---------------------------------------------------------------------------
-- 1. Give every authorable output a stable id.
--    The app treats an output as authorable when name is a non-empty string
--    (parseStepOutputs in src/components/PFMEAManagement.tsx), so the ordinal used
--    for 'index:N' keys counts only those elements. The rewrite below preserves
--    array order and leaves non-authorable elements untouched.
-- ---------------------------------------------------------------------------
UPDATE public.operation_steps AS s
SET outputs = rewritten.outputs
FROM (
  SELECT
    s2.id AS step_id,
    jsonb_agg(
      CASE
        WHEN jsonb_typeof(elem.value) = 'object'
          AND btrim(COALESCE(elem.value ->> 'name', '')) <> ''
          AND btrim(COALESCE(elem.value ->> 'id', '')) = ''
        THEN elem.value || jsonb_build_object('id', gen_random_uuid()::text)
        ELSE elem.value
      END
      ORDER BY elem.ordinality
    ) AS outputs
  FROM public.operation_steps s2
  CROSS JOIN LATERAL jsonb_array_elements(s2.outputs) WITH ORDINALITY AS elem(value, ordinality)
  WHERE jsonb_typeof(s2.outputs) = 'array'
  GROUP BY s2.id
) AS rewritten
WHERE s.id = rewritten.step_id
  AND s.outputs IS DISTINCT FROM rewritten.outputs;

-- ---------------------------------------------------------------------------
-- 2. The requirements table.
-- ---------------------------------------------------------------------------
CREATE TABLE public.pfmea_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  operation_step_id uuid NOT NULL REFERENCES public.operation_steps(id) ON DELETE CASCADE,
  -- Null only for a requirement authored directly against the step rather than an output.
  output_id text,
  requirement_text text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pfmea_requirements_project_id_idx ON public.pfmea_requirements (project_id);
CREATE INDEX pfmea_requirements_operation_step_id_idx ON public.pfmea_requirements (operation_step_id);

-- One requirement per output per step. This is the constraint whose absence allowed
-- positional keys to collide.
CREATE UNIQUE INDEX pfmea_requirements_step_output_key
  ON public.pfmea_requirements (operation_step_id, output_id)
  WHERE output_id IS NOT NULL;

ALTER TABLE public.pfmea_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pfmea_requirements_select_editors" ON public.pfmea_requirements
  FOR SELECT TO authenticated
  USING (public.can_caller_edit_project(project_id) IS TRUE);
CREATE POLICY "pfmea_requirements_insert_editors" ON public.pfmea_requirements
  FOR INSERT TO authenticated
  WITH CHECK (public.can_caller_edit_project(project_id) IS TRUE);
CREATE POLICY "pfmea_requirements_update_editors" ON public.pfmea_requirements
  FOR UPDATE TO authenticated
  USING (public.can_caller_edit_project(project_id) IS TRUE)
  WITH CHECK (public.can_caller_edit_project(project_id) IS TRUE);
CREATE POLICY "pfmea_requirements_delete_editors" ON public.pfmea_requirements
  FOR DELETE TO authenticated
  USING (public.can_caller_edit_project(project_id) IS TRUE);

-- ---------------------------------------------------------------------------
-- 3. Seed one requirement per authorable output, preserving the ordinal the app
--    used so existing 'index:N' keys can still be resolved in step 4.
-- ---------------------------------------------------------------------------
INSERT INTO public.pfmea_requirements (project_id, operation_step_id, output_id, requirement_text, display_order)
SELECT
  ph.project_id,
  s.id,
  btrim(elem.value ->> 'id'),
  btrim(elem.value ->> 'name'),
  (ROW_NUMBER() OVER (PARTITION BY s.id ORDER BY elem.ordinality) - 1)::int
FROM public.operation_steps s
JOIN public.phase_operations op ON op.id = s.operation_id
JOIN public.project_phases ph ON ph.id = op.phase_id
CROSS JOIN LATERAL jsonb_array_elements(s.outputs) WITH ORDINALITY AS elem(value, ordinality)
WHERE jsonb_typeof(s.outputs) = 'array'
  AND jsonb_typeof(elem.value) = 'object'
  AND btrim(COALESCE(elem.value ->> 'name', '')) <> ''
  AND btrim(COALESCE(elem.value ->> 'id', '')) <> '';

-- ---------------------------------------------------------------------------
-- 4. Re-point failure modes at requirement rows.
-- ---------------------------------------------------------------------------
ALTER TABLE public.pfmea_failure_modes
  ADD COLUMN requirement_id uuid;

-- 4a. Keys that carry a real output id.
UPDATE public.pfmea_failure_modes AS fm
SET requirement_id = r.id
FROM public.pfmea_requirements r
WHERE r.operation_step_id = fm.operation_step_id
  AND r.output_id = fm.requirement_output_id
  AND fm.requirement_id IS NULL;

-- 4b. Legacy positional keys, resolved against the ordinal seeded above.
UPDATE public.pfmea_failure_modes AS fm
SET requirement_id = r.id
FROM public.pfmea_requirements r
WHERE r.operation_step_id = fm.operation_step_id
  AND fm.requirement_output_id LIKE 'index:%'
  AND r.display_order = NULLIF(regexp_replace(fm.requirement_output_id, '^index:', ''), '')::int
  AND fm.requirement_id IS NULL;

-- 4c. Anything still unmapped is a real data problem. Fail rather than guess:
--     silently dropping or re-pointing a failure mode would lose authored risk analysis.
DO $$
DECLARE
  v_orphans integer;
  v_detail text;
BEGIN
  SELECT count(*) INTO v_orphans
  FROM public.pfmea_failure_modes
  WHERE requirement_id IS NULL;

  IF v_orphans > 0 THEN
    SELECT string_agg(
             format('failure_mode=%s step=%s key=%s', id, operation_step_id, requirement_output_id),
             '; '
           )
    INTO v_detail
    FROM (
      SELECT id, operation_step_id, requirement_output_id
      FROM public.pfmea_failure_modes
      WHERE requirement_id IS NULL
      LIMIT 20
    ) AS sample;

    RAISE EXCEPTION
      'pfmea_failure_modes: % row(s) could not be matched to a requirement. Sample: %',
      v_orphans, v_detail;
  END IF;
END $$;

ALTER TABLE public.pfmea_failure_modes
  ALTER COLUMN requirement_id SET NOT NULL;

ALTER TABLE public.pfmea_failure_modes
  ADD CONSTRAINT pfmea_failure_modes_requirement_id_fkey
  FOREIGN KEY (requirement_id) REFERENCES public.pfmea_requirements(id) ON DELETE CASCADE;

CREATE INDEX pfmea_failure_modes_requirement_id_idx
  ON public.pfmea_failure_modes (requirement_id);

ALTER TABLE public.pfmea_failure_modes
  DROP COLUMN requirement_output_id;
