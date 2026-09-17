-- Step 1 (structure): Tile Flooring Installation - owned phases only.
--
-- Owned phases are Prepare subfloor, Install, and Grout & Finish. Standard foundation phases
-- and phases linked from other templates (demo, self-leveler, fixtures, baseboard, caulk) are
-- read-only here and are not touched.
--
-- This migration does not create, rename, reorder, or delete phases. It completes step-level
-- structure metadata that was never authored (number_of_workers, skill_level, step_type) and
-- adds the four missing steps the standard requires:
--   - a cure wait before grouting and a cure wait before sealing, engineered as their own
--     steps with zero workers per the shared waiting-steps rule
--   - a quality control inspection at the end of tile setting, which is the last point where
--     lippage and coverage can still be corrected
--   - grout sealing as its own if-necessary step, because sealer applies only when the grout
--     data sheet calls for it
--
-- Sources for the wait durations and the inspection gates: ANSI A108.02 (flatness, lippage,
-- grout joint minimums), ANSI A108.5 and TCNA Handbook (mortar contact area), and mortar and
-- grout manufacturer cure schedules.

DO $migration$
DECLARE
  v_project_id uuid;
  v_nroots integer;
  v_owned_phase_count integer;
  v_phase_prep uuid;
  v_phase_install uuid;
  v_phase_grout uuid;
  v_op_count integer;
  v_op_install uuid;
  v_op_grout uuid;
  v_step_wash uuid;
  v_missing text[] := ARRAY[]::text[];
  v_title text;
  v_expected_titles text[] := ARRAY[
    'Clean and inspect subfloor',
    'Spread mortar for membrane',
    'Embed membrane and detail seams',
    'Cut and fit backer panels',
    'Fasten backer to subfloor',
    'Tape or mesh seams and embed',
    'Layout and reference lines',
    'Cut tiles to layout',
    'Spread mortar and verify coverage',
    'Set tile, beat-in, and check plane',
    'Prepare joints for grout',
    'Pack grout and initial clean'
  ];
BEGIN
  -- ---------------------------------------------------------------------------
  -- Resolve the template root by name. Catalog titles vary, so match a normalized list.
  -- ---------------------------------------------------------------------------
  WITH RECURSIVE matched AS (
    SELECT p.id
    FROM public.projects p
    WHERE (p.is_standard IS DISTINCT FROM true)
      AND (
        lower(btrim(p.name)) IN (
          'tile flooring installation',
          'tile floor installation',
          'tile flooring'
        )
        OR lower(btrim(p.name)) LIKE 'tile flooring installation%'
      )
  ),
  up AS (
    SELECT pr.id, pr.parent_project_id
    FROM public.projects pr
    WHERE pr.id IN (SELECT id FROM matched)
    UNION ALL
    SELECT par.id, par.parent_project_id
    FROM public.projects par
    INNER JOIN up ON par.id = up.parent_project_id
  ),
  roots AS (
    SELECT DISTINCT id AS root_id
    FROM up
    WHERE parent_project_id IS NULL
  )
  SELECT
    (SELECT count(*)::integer FROM roots),
    (SELECT root_id FROM roots LIMIT 1)
  INTO v_nroots, v_project_id;

  IF v_nroots = 0 THEN
    RAISE EXCEPTION
      'No Tile Flooring Installation template root found. Diagnostic: SELECT id, name, parent_project_id FROM projects WHERE lower(btrim(name)) LIKE ''%%tile flooring%%'' ORDER BY name';
  END IF;

  IF v_nroots > 1 THEN
    RAISE EXCEPTION 'Multiple (%) Tile Flooring Installation roots matched. Resolve duplicates before running.', v_nroots;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Owned phases: not standard, not linked, no source. Detected by column, not by name.
  -- ---------------------------------------------------------------------------
  SELECT count(*)::integer
  INTO v_owned_phase_count
  FROM public.project_phases pp
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL;

  IF v_owned_phase_count <> 3 THEN
    RAISE EXCEPTION
      'Tile Flooring Installation: expected 3 owned phases, found %. Owned phases carry the tile content and must exist before step content is authored.',
      v_owned_phase_count;
  END IF;

  SELECT pp.id INTO v_phase_prep
  FROM public.project_phases pp
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(pp.name)) = 'prepare subfloor';

  SELECT pp.id INTO v_phase_install
  FROM public.project_phases pp
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(pp.name)) = 'install';

  SELECT pp.id INTO v_phase_grout
  FROM public.project_phases pp
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(pp.name)) IN ('grout & finish', 'grout and finish');

  IF v_phase_prep IS NULL OR v_phase_install IS NULL OR v_phase_grout IS NULL THEN
    RAISE EXCEPTION
      'Tile Flooring Installation owned phases did not resolve (prep=%, install=%, grout=%) on project %.',
      v_phase_prep, v_phase_install, v_phase_grout, v_project_id;
  END IF;

  -- Operations are resolved through their phase, not by name. The two Prepare subfloor
  -- alternates were renamed to carry product names, and Install and Grout & Finish each hold a
  -- single operation, which is where the new steps land.
  SELECT count(*)::integer INTO v_op_count FROM public.phase_operations WHERE phase_id = v_phase_install;
  IF v_op_count <> 1 THEN
    RAISE EXCEPTION 'Install phase holds % operations, expected exactly 1.', v_op_count;
  END IF;
  SELECT id INTO v_op_install FROM public.phase_operations WHERE phase_id = v_phase_install;

  SELECT count(*)::integer INTO v_op_count FROM public.phase_operations WHERE phase_id = v_phase_grout;
  IF v_op_count <> 1 THEN
    RAISE EXCEPTION 'Grout & Finish phase holds % operations, expected exactly 1.', v_op_count;
  END IF;
  SELECT id INTO v_op_grout FROM public.phase_operations WHERE phase_id = v_phase_grout;

  -- ---------------------------------------------------------------------------
  -- Every step authored in Step 1 must still be present before enrichment.
  -- ---------------------------------------------------------------------------
  FOREACH v_title IN ARRAY v_expected_titles LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.operation_steps os
      WHERE os.operation_id IN (
        SELECT po.id FROM public.phase_operations po
        WHERE po.phase_id IN (v_phase_prep, v_phase_install, v_phase_grout)
      )
        AND lower(btrim(os.step_title)) = lower(btrim(v_title))
    ) THEN
      v_missing := array_append(v_missing, v_title);
    END IF;
  END LOOP;

  IF array_length(v_missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Tile Flooring Installation is missing owned steps: %', array_to_string(v_missing, ' | ');
  END IF;

  -- ---------------------------------------------------------------------------
  -- Step metadata. Workers and skill level were never authored, so effort and staffing
  -- estimates had nothing to read.
  -- ---------------------------------------------------------------------------
  UPDATE public.operation_steps os
  SET
    step_type = v.step_type,
    number_of_workers = v.workers,
    skill_level = v.skill_level,
    updated_at = now()
  FROM (VALUES
    ('Clean and inspect subfloor', 'scaled', 1, 'Beginner'),
    ('Spread mortar for membrane', 'scaled', 1, 'Intermediate'),
    ('Embed membrane and detail seams', 'scaled', 1, 'Intermediate'),
    ('Cut and fit backer panels', 'scaled', 2, 'Beginner'),
    ('Fasten backer to subfloor', 'scaled', 1, 'Beginner'),
    ('Tape or mesh seams and embed', 'scaled', 1, 'Intermediate'),
    ('Layout and reference lines', 'scaled', 1, 'Intermediate'),
    ('Cut tiles to layout', 'scaled', 1, 'Intermediate'),
    ('Spread mortar and verify coverage', 'scaled', 1, 'Intermediate'),
    ('Set tile, beat-in, and check plane', 'scaled', 2, 'Advanced'),
    ('Prepare joints for grout', 'scaled', 1, 'Beginner'),
    ('Pack grout and initial clean', 'scaled', 1, 'Intermediate')
  ) AS v(step_title, step_type, workers, skill_level)
  WHERE os.operation_id IN (
    SELECT po.id FROM public.phase_operations po
    WHERE po.phase_id IN (v_phase_prep, v_phase_install, v_phase_grout)
  )
    AND lower(btrim(os.step_title)) = lower(btrim(v.step_title));

  -- ---------------------------------------------------------------------------
  -- Process map descriptions: one line of what and scope per step, no procedure.
  -- ---------------------------------------------------------------------------
  UPDATE public.operation_steps os
  SET description = v.description, updated_at = now()
  FROM (VALUES
    ('Clean and inspect subfloor',
     'Strip the floor to a bondable surface and record deflection, moisture, and flatness against the limits in the tile, mortar, and underlayment data sheets.'),
    ('Spread mortar for membrane',
     'Mix the mortar the membrane manufacturer names and comb it at the specified notch over an area that can be covered inside the open time.'),
    ('Embed membrane and detail seams',
     'Set the sheet into fresh mortar with continuous fleece contact and finish overlaps, corners, and penetrations to the printed detail.'),
    ('Cut and fit backer panels',
     'Cut panels to a dry-laid plan that avoids slivers at the entry and holds the gaps the panel print requires at walls and between sheets.'),
    ('Fasten backer to subfloor',
     'Bed panels in mortar where the assembly calls for it and complete the printed fastener grid with heads set flush.'),
    ('Tape or mesh seams and embed',
     'Reinforce panel joints with alkali-resistant tape in mortar and skim them flat so joints do not telegraph through thin tile.'),
    ('Layout and reference lines',
     'Fix the start line and square references that decide cut balance at the walls anyone sees first.'),
    ('Cut tiles to layout',
     'Produce the border, jamb, and penetration cuts the layout needs, dry-fit before any mortar goes down.'),
    ('Spread mortar and verify coverage',
     'Key and comb mortar at the notch the tile size needs and prove contact area by lifting sample tiles.'),
    ('Set tile, beat-in, and check plane',
     'Place tile to the reference lines at the planned joint width and beat it to a plane inside the lippage limit.'),
    ('Prepare joints for grout',
     'Clear spacers and hardened mortar out of the joints to full depth and vacuum before grout goes in.'),
    ('Pack grout and initial clean',
     'Fill joints to full depth with the grout type the joint width calls for and take off the bulk of the residue in the same pass.')
  ) AS v(step_title, description)
  WHERE os.operation_id IN (
    SELECT po.id FROM public.phase_operations po
    WHERE po.phase_id IN (v_phase_prep, v_phase_install, v_phase_grout)
  )
    AND lower(btrim(os.step_title)) = lower(btrim(v.step_title));

  -- ---------------------------------------------------------------------------
  -- Quality control step at the end of tile setting. Lippage and coverage are correctable
  -- while mortar is plastic and permanent after cure, so the check belongs before the wait.
  -- ---------------------------------------------------------------------------
  INSERT INTO public.operation_steps (
    id, operation_id, step_title, description, display_order,
    flow_type, step_type, number_of_workers, skill_level, allow_content_edit
  ) VALUES (
    '373adcbf-0a8c-42e9-9bcb-a5c100000001'::uuid,
    v_op_install,
    'Inspect set tile before cure',
    'Walk the finished field against flatness, lippage, joint width, and coverage limits while mortar is still workable enough to correct.',
    5, 'prime', 'quality_control_scaled', 1, 'Intermediate', true
  )
  ON CONFLICT (id) DO UPDATE SET
    operation_id = EXCLUDED.operation_id,
    step_title = EXCLUDED.step_title,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    flow_type = EXCLUDED.flow_type,
    step_type = EXCLUDED.step_type,
    number_of_workers = EXCLUDED.number_of_workers,
    skill_level = EXCLUDED.skill_level,
    updated_at = now();

  -- ---------------------------------------------------------------------------
  -- Grout and cure operation. Target order: 1 cure thinset, 2 prepare joints, 3 pack grout,
  -- 4 wash haze, 5 cure grout, 6 apply sealer. Existing rows move from the back first so the
  -- sequence never holds two steps at the same display_order.
  -- ---------------------------------------------------------------------------
  SELECT id INTO v_step_wash
  FROM public.operation_steps
  WHERE operation_id = v_op_grout
    AND lower(btrim(step_title)) IN (
      'final wash, cure, and seal if required',
      'wash haze and tool joints'
    );

  IF v_step_wash IS NULL THEN
    RAISE EXCEPTION 'Tile Flooring Installation: the final wash step did not resolve in the grout operation.';
  END IF;

  -- Sealing moves out to its own if-necessary step, so this step stops covering a wash, a
  -- three-day cure, and a chemical application in one place.
  UPDATE public.operation_steps
  SET
    step_title = 'Wash haze and tool joints',
    description = 'Remove grout haze inside the manufacturer window and tool joints to a uniform profile before the grout hardens.',
    display_order = 4,
    step_type = 'scaled',
    number_of_workers = 1,
    skill_level = 'Beginner',
    updated_at = now()
  WHERE id = v_step_wash;

  UPDATE public.operation_steps
  SET display_order = 3, updated_at = now()
  WHERE operation_id = v_op_grout AND lower(btrim(step_title)) = 'pack grout and initial clean';

  UPDATE public.operation_steps
  SET display_order = 2, updated_at = now()
  WHERE operation_id = v_op_grout AND lower(btrim(step_title)) = 'prepare joints for grout';

  INSERT INTO public.operation_steps (
    id, operation_id, step_title, description, display_order,
    flow_type, step_type, number_of_workers, skill_level, allow_content_edit
  ) VALUES
  (
    '373adcbf-0a8c-42e9-9bcb-a5c100000002'::uuid,
    v_op_grout,
    'Cure thinset before grouting',
    'Hold the floor out of service while the setting mortar reaches the strength its data sheet requires before joints are packed.',
    1, 'prime', 'prime', 0, 'Beginner', true
  ),
  (
    '373adcbf-0a8c-42e9-9bcb-a5c100000003'::uuid,
    v_op_grout,
    'Cure grout before sealing',
    'Hold the floor out of wet service while cement grout finishes curing, which is what lets a penetrating sealer soak in rather than sit on top.',
    5, 'prime', 'prime', 0, 'Beginner', true
  ),
  (
    '373adcbf-0a8c-42e9-9bcb-a5c100000004'::uuid,
    v_op_grout,
    'Apply grout sealer',
    'Flood cured grout joints with the sealer the grout data sheet calls for and wipe the tile faces before the sealer dries on them.',
    6, 'if-necessary', 'scaled', 1, 'Beginner', true
  )
  ON CONFLICT (id) DO UPDATE SET
    operation_id = EXCLUDED.operation_id,
    step_title = EXCLUDED.step_title,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    flow_type = EXCLUDED.flow_type,
    step_type = EXCLUDED.step_type,
    number_of_workers = EXCLUDED.number_of_workers,
    skill_level = EXCLUDED.skill_level,
    updated_at = now();

  -- ---------------------------------------------------------------------------
  -- Rebuild the phases cache from the normalized tables.
  -- ---------------------------------------------------------------------------
  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases_internal(v_project_id),
      updated_at = now()
  WHERE id = v_project_id;

  RAISE NOTICE 'Tile Flooring Installation step 1 structure applied for project %', v_project_id;
END
$migration$;
