-- Content audit: Tile Flooring Installation owned steps after quality-goal build-out.
-- Asserts completeness per owned step and quality goal rows. Linked/standard phases are
-- reported with RAISE NOTICE only.

DO $migration$
DECLARE
  v_project_id uuid;
  v_gaps text[] := ARRAY[]::text[];
  v_row record;
  v_quality_n integer;
  v_owned_n integer;
  v_linked record;
BEGIN
  SELECT p.id INTO v_project_id
  FROM public.projects p
  WHERE lower(btrim(p.name)) = 'tile flooring installation'
    AND p.parent_project_id IS NULL
  ORDER BY p.is_current_version DESC NULLS LAST, p.updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Tile Flooring Installation root project not found.';
  END IF;

  SELECT count(*)::integer INTO v_quality_n
  FROM public.project_quality_levels
  WHERE project_id = v_project_id
    AND quality_level IN ('good', 'great', 'professional');

  IF v_quality_n <> 3 THEN
    v_gaps := array_append(v_gaps, format('project_quality_levels: expected 3 rows, found %s', v_quality_n));
  END IF;

  SELECT count(*)::integer INTO v_owned_n
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL AND pp.source_project_id IS NULL;

  IF v_owned_n < 19 THEN
    v_gaps := array_append(v_gaps, format('owned steps: expected at least 19 after quality gating, found %s', v_owned_n));
  END IF;

  -- Gate checks on known quality-gated step titles.
  FOR v_row IN
    SELECT os.step_title, os.min_quality_goal
    FROM public.operation_steps os
    JOIN public.phase_operations po ON po.id = os.operation_id
    JOIN public.project_phases pp ON pp.id = po.phase_id
    WHERE pp.project_id = v_project_id
      AND pp.is_standard IS NOT TRUE AND pp.is_linked IS NOT TRUE
      AND pp.source_phase_id IS NULL AND pp.source_project_id IS NULL
      AND lower(btrim(os.step_title)) IN (
        'inspect set tile before cure',
        'install leveling clips and verify plane',
        'apply grout sealer',
        'final finish inspection'
      )
  LOOP
    IF lower(btrim(v_row.step_title)) = 'inspect set tile before cure'
       AND v_row.min_quality_goal IS DISTINCT FROM 'great' THEN
      v_gaps := array_append(v_gaps, 'Inspect set tile before cure: min_quality_goal should be great');
    END IF;
    IF lower(btrim(v_row.step_title)) IN (
         'install leveling clips and verify plane',
         'apply grout sealer',
         'final finish inspection'
       )
       AND v_row.min_quality_goal IS DISTINCT FROM 'professional' THEN
      v_gaps := array_append(
        v_gaps,
        format('%s: min_quality_goal should be professional', v_row.step_title)
      );
    END IF;
  END LOOP;

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

  FOR v_row IN
    SELECT os.step_title, req.output_id
    FROM public.pfmea_requirements req
    JOIN public.operation_steps os ON os.id = req.operation_step_id
    JOIN public.phase_operations po ON po.id = os.operation_id
    JOIN public.project_phases pp ON pp.id = po.phase_id
    WHERE req.project_id = v_project_id
      AND pp.project_id = v_project_id
      AND pp.is_standard IS NOT TRUE AND pp.is_linked IS NOT TRUE
      AND pp.source_phase_id IS NULL AND pp.source_project_id IS NULL
      AND req.output_id IS NOT NULL
      AND jsonb_typeof(os.outputs::jsonb) = 'array'
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(os.outputs::jsonb) AS o
        WHERE o->>'id' = req.output_id
      )
  LOOP
    v_gaps := array_append(
      v_gaps,
      format('%s: PFMEA requirement points at missing output %s', v_row.step_title, v_row.output_id)
    );
  END LOOP;

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
      RAISE NOTICE
        'Register risk "%" is unclassified and is not tied to an owned step, so it is reported rather than enforced here.',
        v_row.risk_title;
    END IF;
  END LOOP;

  -- Linked sources without quality levels: notice only.
  FOR v_linked IN
    SELECT DISTINCT sp.name AS source_name, pp.source_project_id
    FROM public.project_phases pp
    LEFT JOIN public.projects sp ON sp.id = pp.source_project_id
    WHERE pp.project_id = v_project_id
      AND pp.source_project_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.project_quality_levels pql
        WHERE pql.project_id = pp.source_project_id
      )
  LOOP
    RAISE NOTICE
      'Linked source "%" still missing project_quality_levels (author on that template).',
      coalesce(v_linked.source_name, v_linked.source_project_id::text);
  END LOOP;

  IF array_length(v_gaps, 1) IS NOT NULL THEN
    RAISE EXCEPTION E'Tile Flooring Installation is not content-complete:\n  %', array_to_string(v_gaps, E'\n  ');
  END IF;

  RAISE NOTICE
    'Tile Flooring Installation content audit passed for project % (% owned steps).',
    v_project_id, v_owned_n;
END
$migration$;
