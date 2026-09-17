-- Content audit: Tile Flooring Installation owned steps.
--
-- The build-out migrations each verify their own row counts, but nothing proved the result is
-- content-complete as the shared standard defines it (see cross-cutting content-completeness).
-- This runs the check and raises with the full gap list rather than leaving a project that looks
-- finished in the admin UI and is not.
--
-- It asserts, per owned step: three instruction levels, at least one output, at least one
-- process variable, at least one tool, all three time estimates, and an authored materials array.
-- Materials may be empty because a cure step consumes nothing, but the array has to exist rather
-- than be null, which is the difference between "nothing needed" and "never authored".
--
-- Project level: every owned step's PFMEA requirements resolve to an output that still exists,
-- and the register carries a component and three scores on every row.

DO $migration$
DECLARE
  v_project_id uuid;
  v_nroots integer;
  v_gaps text[] := ARRAY[]::text[];
  v_row record;
BEGIN
  WITH RECURSIVE matched AS (
    SELECT p.id
    FROM public.projects p
    WHERE (p.is_standard IS DISTINCT FROM true)
      AND (
        lower(btrim(p.name)) IN ('tile flooring installation', 'tile floor installation', 'tile flooring')
        OR lower(btrim(p.name)) LIKE 'tile flooring installation%'
      )
  ),
  up AS (
    SELECT pr.id, pr.parent_project_id FROM public.projects pr WHERE pr.id IN (SELECT id FROM matched)
    UNION ALL
    SELECT par.id, par.parent_project_id FROM public.projects par INNER JOIN up ON par.id = up.parent_project_id
  ),
  roots AS (SELECT DISTINCT id AS root_id FROM up WHERE parent_project_id IS NULL)
  SELECT (SELECT count(*)::integer FROM roots), (SELECT root_id FROM roots LIMIT 1)
  INTO v_nroots, v_project_id;

  IF v_nroots <> 1 THEN
    RAISE EXCEPTION 'Tile Flooring Installation root did not resolve to exactly one row (found %).', v_nroots;
  END IF;

  FOR v_row IN
    SELECT
      os.step_title,
      os.step_type,
      os.number_of_workers,
      os.skill_level,
      os.description,
      os.time_estimate_low, os.time_estimate_med, os.time_estimate_high,
      jsonb_typeof(os.outputs::jsonb) AS outputs_type,
      jsonb_typeof(os.tools::jsonb) AS tools_type,
      jsonb_typeof(os.materials::jsonb) AS materials_type,
      jsonb_typeof(os.process_variables::jsonb) AS pv_type,
      coalesce(CASE WHEN jsonb_typeof(os.outputs::jsonb) = 'array'
                    THEN jsonb_array_length(os.outputs::jsonb) END, 0) AS outputs_n,
      coalesce(CASE WHEN jsonb_typeof(os.tools::jsonb) = 'array'
                    THEN jsonb_array_length(os.tools::jsonb) END, 0) AS tools_n,
      coalesce(CASE WHEN jsonb_typeof(os.process_variables::jsonb) = 'array'
                    THEN jsonb_array_length(os.process_variables::jsonb) END, 0) AS pv_n,
      (
        SELECT count(DISTINCT si.instruction_level)
        FROM public.step_instructions si
        WHERE si.step_id = os.id
          AND si.instruction_level IN ('beginner', 'intermediate', 'advanced')
      ) AS levels_n
    FROM public.operation_steps os
    JOIN public.phase_operations po ON po.id = os.operation_id
    JOIN public.project_phases pp ON pp.id = po.phase_id
    WHERE pp.project_id = v_project_id
      AND pp.is_standard IS NOT TRUE AND pp.is_linked IS NOT TRUE
      AND pp.source_phase_id IS NULL AND pp.source_project_id IS NULL
    ORDER BY
      CASE WHEN pp.position_rule = 'last' THEN 1 ELSE 0 END,
      pp.position_value NULLS LAST,
      pp.created_at,
      po.display_order,
      os.display_order
  LOOP
    IF v_row.levels_n <> 3 THEN
      v_gaps := array_append(v_gaps, format('%s: %s of 3 instruction levels', v_row.step_title, v_row.levels_n));
    END IF;
    IF v_row.outputs_type IS DISTINCT FROM 'array' OR v_row.outputs_n = 0 THEN
      v_gaps := array_append(v_gaps, format('%s: no outputs', v_row.step_title));
    END IF;
    IF v_row.tools_type IS DISTINCT FROM 'array' OR v_row.tools_n = 0 THEN
      v_gaps := array_append(v_gaps, format('%s: no tools', v_row.step_title));
    END IF;
    IF v_row.materials_type IS DISTINCT FROM 'array' THEN
      v_gaps := array_append(v_gaps, format('%s: materials never authored', v_row.step_title));
    END IF;
    IF v_row.pv_type IS DISTINCT FROM 'array' OR v_row.pv_n = 0 THEN
      v_gaps := array_append(v_gaps, format('%s: no process variables', v_row.step_title));
    END IF;
    IF v_row.time_estimate_low IS NULL OR v_row.time_estimate_med IS NULL OR v_row.time_estimate_high IS NULL THEN
      v_gaps := array_append(v_gaps, format('%s: incomplete time estimates', v_row.step_title));
    END IF;
    IF v_row.step_type IS NULL OR v_row.number_of_workers IS NULL OR v_row.skill_level IS NULL
       OR v_row.description IS NULL OR btrim(v_row.description) = '' THEN
      v_gaps := array_append(v_gaps, format('%s: incomplete structure metadata', v_row.step_title));
    END IF;
  END LOOP;

  -- A requirement that points at a removed output would render as an unresolvable risk item.
  FOR v_row IN
    SELECT os.step_title, req.output_id
    FROM public.pfmea_requirements req
    JOIN public.operation_steps os ON os.id = req.operation_step_id
    WHERE req.project_id = v_project_id
      AND req.output_id IS NOT NULL
      AND jsonb_typeof(os.outputs::jsonb) = 'array'
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(os.outputs::jsonb) AS o
        WHERE o->>'id' = req.output_id
      )
  LOOP
    v_gaps := array_append(v_gaps, format('%s: PFMEA requirement points at missing output %s', v_row.step_title, v_row.output_id));
  END LOOP;

  -- Register rows with no component or an incomplete score set are reported as unscored in the
  -- Risk Radar, which is the same as not being authored. Only rows tied to an owned step are
  -- enforced here; anything else in the register may have come from a source this project must
  -- not edit, so it is reported as a notice instead of failing the deploy.
  FOR v_row IN
    SELECT r.risk_title, (pp.id IS NOT NULL) AS owned
    FROM public.project_risks r
    LEFT JOIN public.operation_steps os ON os.id = r.operation_step_id
    LEFT JOIN public.phase_operations po ON po.id = os.operation_id
    LEFT JOIN public.project_phases pp
      ON pp.id = po.phase_id
     AND pp.project_id = v_project_id
     AND pp.is_standard IS NOT TRUE AND pp.is_linked IS NOT TRUE
     AND pp.source_phase_id IS NULL AND pp.source_project_id IS NULL
    WHERE r.project_id = v_project_id
      AND (
        r.risk_dimension IS NULL
        OR r.severity_score IS NULL
        OR r.occurrence_score IS NULL
        OR r.detection_score IS NULL
      )
  LOOP
    IF v_row.owned THEN
      v_gaps := array_append(v_gaps, format('register risk "%s": missing component or scores', v_row.risk_title));
    ELSE
      RAISE NOTICE 'Register risk "%" is unclassified and is not tied to an owned step, so it is reported rather than enforced here.', v_row.risk_title;
    END IF;
  END LOOP;

  IF array_length(v_gaps, 1) IS NOT NULL THEN
    RAISE EXCEPTION E'Tile Flooring Installation is not content-complete:\n  %', array_to_string(v_gaps, E'\n  ');
  END IF;

  RAISE NOTICE 'Tile Flooring Installation content audit passed for project %', v_project_id;
END
$migration$;
