-- Tile Flooring Installation: crisp Prepare-subfloor underlayment decision copy.
-- Updates phase_operations descriptions/names, decision-tree prompts, rebuilds
-- projects.phases via rebuild_phases_json_from_project_phases_internal, and patches
-- in-flight project_runs.phases snapshots.

DO $$
DECLARE
  v_project_id uuid;
  v_phase_id uuid;
  v_membrane_op_id uuid;
  v_backer_op_id uuid;
  v_prereqs jsonb;
  v_dtc jsonb;
  v_cfg jsonb;
  v_run record;
  v_phases jsonb;
  v_phase jsonb;
  v_ops jsonb;
  v_op jsonb;
  v_new_phases jsonb;
  v_new_ops jsonb;
  v_op_id text;
  v_name text;
  v_desc text;
  v_prompt text;
BEGIN
  SELECT p.id INTO v_project_id
  FROM public.projects p
  WHERE p.parent_project_id IS NULL
    AND (p.is_standard IS DISTINCT FROM true)
    AND (
      lower(btrim(p.name)) = 'tile flooring installation'
      OR lower(btrim(p.name)) = 'tile flooring'
      OR (
        lower(btrim(p.name)) LIKE 'tile%floor%'
        AND lower(btrim(p.name)) NOT LIKE '%demo%'
        AND lower(btrim(p.name)) NOT LIKE '%backsplash%'
        AND lower(btrim(p.name)) NOT LIKE '%shower%'
      )
    )
  ORDER BY
    CASE
      WHEN lower(btrim(p.name)) = 'tile flooring installation' THEN 0
      WHEN lower(btrim(p.name)) = 'tile flooring' THEN 1
      ELSE 2
    END,
    p.updated_at DESC
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Tile Flooring Installation root not found';
  END IF;

  SELECT pp.id INTO v_phase_id
  FROM public.project_phases pp
  WHERE pp.project_id = v_project_id
    AND (
      lower(btrim(pp.name)) = 'prepare subfloor'
      OR lower(btrim(pp.name)) LIKE '%prepare%subfloor%'
    )
  ORDER BY pp.position_value NULLS LAST, pp.created_at
  LIMIT 1;

  IF v_phase_id IS NULL THEN
    RAISE EXCEPTION 'Prepare subfloor phase not found for project %', v_project_id;
  END IF;

  SELECT po.id INTO v_membrane_op_id
  FROM public.phase_operations po
  WHERE po.phase_id = v_phase_id
    AND po.flow_type = 'alternate'
    AND (
      lower(po.operation_name) LIKE '%uncoupling%'
      OR lower(po.operation_name) LIKE '%membrane%'
      OR lower(po.operation_name) LIKE '%ditra%'
    )
  ORDER BY po.display_order NULLS LAST, po.created_at
  LIMIT 1;

  SELECT po.id INTO v_backer_op_id
  FROM public.phase_operations po
  WHERE po.phase_id = v_phase_id
    AND po.flow_type = 'alternate'
    AND (
      lower(po.operation_name) LIKE '%backer%'
      OR lower(po.operation_name) LIKE '%cement board%'
      OR lower(po.operation_name) LIKE '%hardie%'
      OR lower(po.operation_name) LIKE '%concrete board%'
    )
  ORDER BY po.display_order NULLS LAST, po.created_at
  LIMIT 1;

  IF v_membrane_op_id IS NULL OR v_backer_op_id IS NULL THEN
    RAISE EXCEPTION
      'Prepare subfloor alternate ops not found (membrane=%, backer=%) for phase %',
      v_membrane_op_id, v_backer_op_id, v_phase_id;
  END IF;

  UPDATE public.phase_operations
  SET
    operation_name = 'Uncoupling membrane (e.g. Ditra)',
    operation_description =
      'Thin and fast; flexes with wood floors. Costs more; seams must be taped clean.',
    updated_at = now()
  WHERE id = v_membrane_op_id;

  UPDATE public.phase_operations
  SET
    operation_name = 'Cement backer board (e.g. HardieBacker)',
    operation_description =
      'Rigid and cheap screw-down board. Adds height, cutting, screws, and dust.',
    updated_at = now()
  WHERE id = v_backer_op_id;

  SELECT COALESCE(p.scheduling_prerequisites, '{}'::jsonb)
  INTO v_prereqs
  FROM public.projects p
  WHERE p.id = v_project_id;

  v_dtc := COALESCE(v_prereqs->'__decision_tree_config__', '{}'::jsonb);

  -- Shared group prompt on both alternates (customizer uses first op's userPrompt).
  v_prompt := 'Membrane (Ditra) or cement board (HardieBacker)?';

  v_cfg := COALESCE(v_dtc->v_membrane_op_id::text, '{}'::jsonb);
  v_cfg := jsonb_set(v_cfg, '{type}', '"alternate"', true);
  v_cfg := jsonb_set(v_cfg, '{decisionPrompt}', to_jsonb(v_prompt), true);
  IF NOT (v_cfg ? 'alternateIds') OR jsonb_typeof(v_cfg->'alternateIds') <> 'array' THEN
    v_cfg := jsonb_set(
      v_cfg,
      '{alternateIds}',
      jsonb_build_array(v_backer_op_id::text),
      true
    );
  END IF;
  v_dtc := jsonb_set(v_dtc, ARRAY[v_membrane_op_id::text], v_cfg, true);

  v_cfg := COALESCE(v_dtc->v_backer_op_id::text, '{}'::jsonb);
  v_cfg := jsonb_set(v_cfg, '{type}', '"alternate"', true);
  v_cfg := jsonb_set(v_cfg, '{decisionPrompt}', to_jsonb(v_prompt), true);
  IF NOT (v_cfg ? 'alternateIds') OR jsonb_typeof(v_cfg->'alternateIds') <> 'array' THEN
    v_cfg := jsonb_set(
      v_cfg,
      '{alternateIds}',
      jsonb_build_array(v_membrane_op_id::text),
      true
    );
  END IF;
  v_dtc := jsonb_set(v_dtc, ARRAY[v_backer_op_id::text], v_cfg, true);

  v_prereqs := jsonb_set(v_prereqs, '{__decision_tree_config__}', v_dtc, true);

  UPDATE public.projects
  SET
    scheduling_prerequisites = v_prereqs,
    updated_at = now()
  WHERE id = v_project_id;

  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases_internal(v_project_id)
  WHERE id = v_project_id;

  -- Ensure template phases JSON carries userPrompt (rebuild may omit it).
  SELECT phases INTO v_phases FROM public.projects WHERE id = v_project_id;
  v_new_phases := '[]'::jsonb;
  FOR v_phase IN SELECT value FROM jsonb_array_elements(COALESCE(v_phases, '[]'::jsonb))
  LOOP
    v_new_ops := '[]'::jsonb;
    FOR v_op IN SELECT value FROM jsonb_array_elements(COALESCE(v_phase->'operations', '[]'::jsonb))
    LOOP
      v_op_id := v_op->>'id';
      IF v_op_id = v_membrane_op_id::text THEN
        v_name := 'Uncoupling membrane (e.g. Ditra)';
        v_desc := 'Thin and fast; flexes with wood floors. Costs more; seams must be taped clean.';
        v_op := v_op
          || jsonb_build_object(
            'name', v_name,
            'description', v_desc,
            'userPrompt', v_prompt,
            'flowType', 'alternate'
          );
      ELSIF v_op_id = v_backer_op_id::text THEN
        v_name := 'Cement backer board (e.g. HardieBacker)';
        v_desc := 'Rigid and cheap screw-down board. Adds height, cutting, screws, and dust.';
        v_op := v_op
          || jsonb_build_object(
            'name', v_name,
            'description', v_desc,
            'userPrompt', v_prompt,
            'flowType', 'alternate'
          );
      END IF;
      v_new_ops := v_new_ops || jsonb_build_array(v_op);
    END LOOP;
    v_new_phases := v_new_phases || jsonb_build_array(
      (v_phase - 'operations') || jsonb_build_object('operations', v_new_ops)
    );
  END LOOP;

  UPDATE public.projects
  SET phases = v_new_phases, updated_at = now()
  WHERE id = v_project_id;

  -- Patch active runs that still snapshot the old wasteful guidance.
  FOR v_run IN
    SELECT id, phases
    FROM public.project_runs
    WHERE project_id = v_project_id
      AND phases IS NOT NULL
      AND jsonb_typeof(phases) = 'array'
  LOOP
    v_new_phases := '[]'::jsonb;
    FOR v_phase IN SELECT value FROM jsonb_array_elements(COALESCE(v_run.phases, '[]'::jsonb))
    LOOP
      v_new_ops := '[]'::jsonb;
      FOR v_op IN SELECT value FROM jsonb_array_elements(COALESCE(v_phase->'operations', '[]'::jsonb))
      LOOP
        v_op_id := v_op->>'id';
        IF v_op_id = v_membrane_op_id::text THEN
          v_op := v_op || jsonb_build_object(
            'name', 'Uncoupling membrane (e.g. Ditra)',
            'description', 'Thin and fast; flexes with wood floors. Costs more; seams must be taped clean.',
            'userPrompt', v_prompt
          );
        ELSIF v_op_id = v_backer_op_id::text THEN
          v_op := v_op || jsonb_build_object(
            'name', 'Cement backer board (e.g. HardieBacker)',
            'description', 'Rigid and cheap screw-down board. Adds height, cutting, screws, and dust.',
            'userPrompt', v_prompt
          );
        END IF;
        v_new_ops := v_new_ops || jsonb_build_array(v_op);
      END LOOP;
      v_new_phases := v_new_phases || jsonb_build_array(
        (v_phase - 'operations') || jsonb_build_object('operations', v_new_ops)
      );
    END LOOP;

    UPDATE public.project_runs
    SET phases = v_new_phases, updated_at = now()
    WHERE id = v_run.id;
  END LOOP;
END $$;
