-- Step 1 — structure only (AI_PROJECT_DEVELOPMENT_REFERENCE.md):
-- phases: INSERT only when count = 0. If phases already exist, do not INSERT/UPDATE/rename them;
--   map new operations to existing phase rows by sort order (position_rule/value, created_at, id).
-- phase_operations + operation_steps (title + one-line description).
-- No step_instructions, no outputs/time/tools/materials enrichment (later steps).
--
-- Templates:
--   1) Baseboard & trim installation
--   2) Dishwasher Replacement
--   3) Caulking Application — no-op if structure from 2026_04_01_migration_caulking_application_steps_1_8.sql is present

-- =============================================================================
-- 1) Baseboard & trim installation
-- =============================================================================
DO $$
DECLARE
  v_project_id uuid;
  v_nroots integer;
  v_phase_count integer;
  v_prep uuid;
  v_install uuid;
  v_finish uuid;
BEGIN
  -- Match common catalog spellings and walk up to family root (covers draft/revision rows).
  -- RECURSIVE required: CTE "up" self-references in UNION ALL (PostgreSQL).
  WITH RECURSIVE matched AS (
    SELECT p.id
    FROM public.projects p
    WHERE (p.is_standard IS DISTINCT FROM true)
      AND (
        lower(btrim(p.name)) IN (
          'baseboard & trim installation',
          'baseboard & trim replacement',
          'baseboard and trim installation',
          'baseboard and trim replacement',
          'baseboard + trim installation',
          'baseboard + trim replacement'
        )
        OR (
          lower(btrim(p.name)) LIKE '%baseboard%'
          AND lower(btrim(p.name)) LIKE '%trim%'
        )
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
      'No project found for baseboard+trim (tried exact titles with &/and, and names containing both ''baseboard'' and ''trim''). '
      'Query: SELECT id, name, parent_project_id FROM projects WHERE lower(name) LIKE ''%%baseboard%%'' ORDER BY name;';
  END IF;

  IF v_nroots > 1 THEN
    RAISE EXCEPTION
      'Multiple (%) distinct baseboard+trim template roots matched. List them with: '
      'WITH RECURSIVE matched AS (SELECT id FROM projects p WHERE (p.is_standard IS DISTINCT FROM true) AND (lower(btrim(name)) LIKE ''%%baseboard%%'' AND lower(btrim(name)) LIKE ''%%trim%%'')), '
      'up AS (SELECT id, parent_project_id FROM projects WHERE id IN (SELECT id FROM matched) UNION ALL SELECT par.id, par.parent_project_id FROM projects par INNER JOIN up ON par.id = up.parent_project_id) '
      'SELECT id, name FROM projects WHERE id IN (SELECT DISTINCT id FROM up WHERE parent_project_id IS NULL);',
      v_nroots;
  END IF;

  SELECT count(*)::integer INTO v_phase_count FROM public.project_phases pp WHERE pp.project_id = v_project_id;

  IF v_phase_count = 0 THEN
    INSERT INTO public.project_phases (id, project_id, name, description, position_rule, position_value, is_standard, is_linked)
    VALUES
      (
        'b45eb00d-1a7e-4c1d-9f01-b45e00000001'::uuid,
        v_project_id,
        'Preparation',
        'Layout, stock acclimation, and wall/floor readiness before cutting trim.',
        'nth',
        1,
        false,
        false
      ),
      (
        'b45eb00d-1a7e-4c1d-9f01-b45e00000002'::uuid,
        v_project_id,
        'Installation',
        'Cut, fit, and fasten baseboard and casing to planned lines.',
        'nth',
        2,
        false,
        false
      ),
      (
        'b45eb00d-1a7e-4c1d-9f01-b45e00000003'::uuid,
        v_project_id,
        'Finishing',
        'Fastener set, fill, joint seal, and paint or stain touch-up.',
        'nth',
        3,
        false,
        false
      );
    v_prep := 'b45eb00d-1a7e-4c1d-9f01-b45e00000001'::uuid;
    v_install := 'b45eb00d-1a7e-4c1d-9f01-b45e00000002'::uuid;
    v_finish := 'b45eb00d-1a7e-4c1d-9f01-b45e00000003'::uuid;
  ELSE
    -- Phases already exist: do not INSERT, UPDATE, or rename them. Map the three operation groups
    -- to existing rows by stable sort (same idea as process map ordering)—not by display name.
    SELECT
      max(s.id) FILTER (WHERE s.rn = 1),
      max(s.id) FILTER (WHERE s.rn = LEAST(2, v_phase_count)),
      max(s.id) FILTER (WHERE s.rn = LEAST(3, v_phase_count))
    INTO v_prep, v_install, v_finish
    FROM (
      SELECT
        pp.id,
        row_number() OVER (
          ORDER BY
            CASE WHEN pp.position_rule = 'last' THEN 1 ELSE 0 END,
            pp.position_value NULLS LAST,
            pp.created_at ASC,
            pp.id ASC
        ) AS rn
      FROM public.project_phases pp
      WHERE pp.project_id = v_project_id
    ) s;

    IF v_prep IS NULL THEN
      RAISE EXCEPTION 'Baseboard+trim: project_id=% has phases but sort yielded no phase id', v_project_id;
    END IF;

    RAISE NOTICE
      'Baseboard+trim: attaching new operations to % existing phase(s) by order (not by name). prep_phase=%, install_phase=%, finish_phase=%',
      v_phase_count,
      v_prep,
      v_install,
      v_finish;
  END IF;

  INSERT INTO public.phase_operations (id, phase_id, operation_name, operation_description, display_order, estimated_time, flow_type)
  VALUES
    (
      'b45eb00d-1a7e-4c1d-9f02-b45e00000001'::uuid,
      v_prep,
      'Plan layout and acclimate stock',
      'Measure runs, plan joints, and allow trim stock to match room conditions.',
      1,
      '30–60 min',
      'prime'
    ),
    (
      'b45eb00d-1a7e-4c1d-9f02-b45e00000002'::uuid,
      v_install,
      'Install baseboard',
      'Cut and attach wall base along straight runs and inside corners.',
      1,
      '1–3 hr',
      'prime'
    ),
    (
      'b45eb00d-1a7e-4c1d-9f02-b45e00000003'::uuid,
      v_install,
      'Install door and window casing',
      'Fit side and head casings with clean miters or copes as planned.',
      2,
      '1–3 hr',
      'prime'
    ),
    (
      'b45eb00d-1a7e-4c1d-9f02-b45e00000004'::uuid,
      v_finish,
      'Fill, seal, and touch up',
      'Set fasteners, fill holes, seal paint-grade joints, and match finish.',
      1,
      '45–90 min',
      'prime'
    )
  ON CONFLICT (id) DO UPDATE SET
    phase_id = EXCLUDED.phase_id,
    operation_name = EXCLUDED.operation_name,
    operation_description = EXCLUDED.operation_description,
    display_order = EXCLUDED.display_order,
    estimated_time = EXCLUDED.estimated_time,
    flow_type = EXCLUDED.flow_type;

  INSERT INTO public.operation_steps (
    id, operation_id, step_title, description, display_order,
    materials, tools, outputs, process_variables,
    time_estimate_low, time_estimate_med, time_estimate_high,
    number_of_workers, skill_level, allow_content_edit
  ) VALUES
    (
      'b45eb00d-1a7e-4c1d-9f03-b45e00000001'::uuid,
      'b45eb00d-1a7e-4c1d-9f02-b45e00000001'::uuid,
      'Mark stud locations and plan joints',
      'Transfer stud positions and decide butt versus miter corners for each run.',
      1,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'b45eb00d-1a7e-4c1d-9f03-b45e00000002'::uuid,
      'b45eb00d-1a7e-4c1d-9f02-b45e00000001'::uuid,
      'Stage and acclimate trim stock',
      'Stock laid flat in the space until stable before cutting to final length.',
      2,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'b45eb00d-1a7e-4c1d-9f03-b45e00000003'::uuid,
      'b45eb00d-1a7e-4c1d-9f02-b45e00000002'::uuid,
      'Cut and fit baseboard lengths',
      'Pieces cut to wall length with corners fitting the chosen joint style.',
      1,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'b45eb00d-1a7e-4c1d-9f03-b45e00000004'::uuid,
      'b45eb00d-1a7e-4c1d-9f02-b45e00000002'::uuid,
      'Fasten baseboard to studs',
      'Nails or screws driven into framing on a consistent line without splitting faces.',
      2,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'b45eb00d-1a7e-4c1d-9f03-b45e00000005'::uuid,
      'b45eb00d-1a7e-4c1d-9f02-b45e00000003'::uuid,
      'Cut and install casing legs and head',
      'Sides plumb and head level with miters or copes meeting cleanly.',
      1,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'b45eb00d-1a7e-4c1d-9f03-b45e00000006'::uuid,
      'b45eb00d-1a7e-4c1d-9f02-b45e00000003'::uuid,
      'Fasten casing to framing',
      'Fasteners into studs with flush or set heads for fill and paint.',
      2,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'b45eb00d-1a7e-4c1d-9f03-b45e00000007'::uuid,
      'b45eb00d-1a7e-4c1d-9f02-b45e00000004'::uuid,
      'Fill fastener holes and sand smooth',
      'Holes filled level with surface and feathered for coating.',
      1,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'b45eb00d-1a7e-4c1d-9f03-b45e00000008'::uuid,
      'b45eb00d-1a7e-4c1d-9f02-b45e00000004'::uuid,
      'Caulk paint-grade joints and touch up finish',
      'Continuous seal at planned joints and finish matched to adjacent work.',
      2,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    )
  ON CONFLICT (id) DO UPDATE SET
    operation_id = EXCLUDED.operation_id,
    step_title = EXCLUDED.step_title,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order;

  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(v_project_id)
  WHERE id = v_project_id;

  RAISE NOTICE 'Baseboard & trim installation: step 1 structure applied for project_id=%', v_project_id;
END $$;

-- =============================================================================
-- 2) Dishwasher Replacement
-- =============================================================================
DO $$
DECLARE
  v_project_id uuid;
  v_nroots integer;
  v_phase_count integer;
  v_disc uuid;
  v_inst uuid;
  v_test uuid;
BEGIN
  SELECT count(*)::integer
  INTO v_nroots
  FROM public.projects p
  WHERE (p.is_standard IS DISTINCT FROM true)
    AND (p.parent_project_id IS NULL)
    AND lower(btrim(p.name)) = 'dishwasher replacement';

  IF v_nroots = 0 THEN
    RAISE EXCEPTION 'No root template found named exactly "Dishwasher Replacement" (case-insensitive)';
  END IF;
  IF v_nroots > 1 THEN
    RAISE EXCEPTION 'Multiple root templates match "Dishwasher Replacement"; resolve duplicates before running';
  END IF;

  SELECT p.id
  INTO v_project_id
  FROM public.projects p
  WHERE (p.is_standard IS DISTINCT FROM true)
    AND (p.parent_project_id IS NULL)
    AND lower(btrim(p.name)) = 'dishwasher replacement'
  LIMIT 1;

  SELECT count(*)::integer INTO v_phase_count FROM public.project_phases pp WHERE pp.project_id = v_project_id;

  IF v_phase_count = 0 THEN
    INSERT INTO public.project_phases (id, project_id, name, description, position_rule, position_value, is_standard, is_linked)
    VALUES
      (
        'd15a0001-1a7e-4c1d-9f01-d15a00000001'::uuid,
        v_project_id,
        'Disconnect',
        'Power, water, and drain isolation with old unit pulled from opening.',
        'nth',
        1,
        false,
        false
      ),
      (
        'd15a0001-1a7e-4c1d-9f01-d15a00000002'::uuid,
        v_project_id,
        'Installation',
        'New unit positioned, leveled, and supply, drain, and electrical reconnected.',
        'nth',
        2,
        false,
        false
      ),
      (
        'd15a0001-1a7e-4c1d-9f01-d15a00000003'::uuid,
        v_project_id,
        'Verification',
        'Leak check, anchor, and operational test under normal use.',
        'nth',
        3,
        false,
        false
      );
    v_disc := 'd15a0001-1a7e-4c1d-9f01-d15a00000001'::uuid;
    v_inst := 'd15a0001-1a7e-4c1d-9f01-d15a00000002'::uuid;
    v_test := 'd15a0001-1a7e-4c1d-9f01-d15a00000003'::uuid;
  ELSE
    SELECT
      max(s.id) FILTER (WHERE s.rn = 1),
      max(s.id) FILTER (WHERE s.rn = LEAST(2, v_phase_count)),
      max(s.id) FILTER (WHERE s.rn = LEAST(3, v_phase_count))
    INTO v_disc, v_inst, v_test
    FROM (
      SELECT
        pp.id,
        row_number() OVER (
          ORDER BY
            CASE WHEN pp.position_rule = 'last' THEN 1 ELSE 0 END,
            pp.position_value NULLS LAST,
            pp.created_at ASC,
            pp.id ASC
        ) AS rn
      FROM public.project_phases pp
      WHERE pp.project_id = v_project_id
    ) s;

    IF v_disc IS NULL THEN
      RAISE EXCEPTION 'Dishwasher Replacement: project_id=% has phases but sort yielded no phase id', v_project_id;
    END IF;

    RAISE NOTICE
      'Dishwasher Replacement: attaching new operations to % existing phase(s) by order. disconnect=%, install=%, verify=%',
      v_phase_count,
      v_disc,
      v_inst,
      v_test;
  END IF;

  INSERT INTO public.phase_operations (id, phase_id, operation_name, operation_description, display_order, estimated_time, flow_type)
  VALUES
    (
      'd15a0001-1a7e-4c1d-9f02-d15a00000001'::uuid,
      v_disc,
      'Shut off supplies and disconnect old unit',
      'Electrical lockout, water off, drain separated, and lines cleared for removal.',
      1,
      '20–40 min',
      'prime'
    ),
    (
      'd15a0001-1a7e-4c1d-9f02-d15a00000002'::uuid,
      v_disc,
      'Remove dishwasher from cabinet',
      'Unit slid out without kinking lines or damaging adjacent cabinets or floor.',
      2,
      '15–30 min',
      'prime'
    ),
    (
      'd15a0001-1a7e-4c1d-9f02-d15a00000003'::uuid,
      v_inst,
      'Position and level new dishwasher',
      'Unit aligned to opening with feet adjusted for plumb door and rack clearance.',
      1,
      '20–45 min',
      'prime'
    ),
    (
      'd15a0001-1a7e-4c1d-9f02-d15a00000004'::uuid,
      v_inst,
      'Reconnect water, drain, and power',
      'Supply, drain loop, and electrical terminations completed to code and manufacturer spec.',
      2,
      '30–60 min',
      'prime'
    ),
    (
      'd15a0001-1a7e-4c1d-9f02-d15a00000005'::uuid,
      v_test,
      'Leak test and secure unit',
      'Static and running checks dry; unit anchored or clipped per instructions.',
      1,
      '20–40 min',
      'prime'
    ),
    (
      'd15a0001-1a7e-4c1d-9f02-d15a00000006'::uuid,
      v_test,
      'Run cleaning cycle and confirm operation',
      'Initial cycle completes with normal fill, wash, and drain behavior.',
      2,
      '30–60 min',
      'prime'
    )
  ON CONFLICT (id) DO UPDATE SET
    phase_id = EXCLUDED.phase_id,
    operation_name = EXCLUDED.operation_name,
    operation_description = EXCLUDED.operation_description,
    display_order = EXCLUDED.display_order,
    estimated_time = EXCLUDED.estimated_time,
    flow_type = EXCLUDED.flow_type;

  INSERT INTO public.operation_steps (
    id, operation_id, step_title, description, display_order,
    materials, tools, outputs, process_variables,
    time_estimate_low, time_estimate_med, time_estimate_high,
    number_of_workers, skill_level, allow_content_edit
  ) VALUES
    (
      'd15a0001-1a7e-4c1d-9f03-d15a00000001'::uuid,
      'd15a0001-1a7e-4c1d-9f02-d15a00000001'::uuid,
      'Turn off power and water',
      'Breaker or cord disconnected and angle stop closed before touching connections.',
      1,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'd15a0001-1a7e-4c1d-9f03-d15a00000002'::uuid,
      'd15a0001-1a7e-4c1d-9f02-d15a00000001'::uuid,
      'Disconnect supply, drain, and electrical from old unit',
      'Connections broken with minimal water release and parts labeled if reused.',
      2,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'd15a0001-1a7e-4c1d-9f03-d15a00000003'::uuid,
      'd15a0001-1a7e-4c1d-9f02-d15a00000002'::uuid,
      'Lower legs and slide unit out',
      'Clearance checked so tub clears countertop and lines feed through without snagging.',
      1,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'd15a0001-1a7e-4c1d-9f03-d15a00000004'::uuid,
      'd15a0001-1a7e-4c1d-9f02-d15a00000002'::uuid,
      'Protect floor and opening',
      'Floor and cabinet edges protected before new unit moves into place.',
      2,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'd15a0001-1a7e-4c1d-9f03-d15a00000005'::uuid,
      'd15a0001-1a7e-4c1d-9f02-d15a00000003'::uuid,
      'Feed lines through cabinet and set unit in opening',
      'Hoses and cord routed on planned path with strain relief clearance.',
      1,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'd15a0001-1a7e-4c1d-9f03-d15a00000006'::uuid,
      'd15a0001-1a7e-4c1d-9f02-d15a00000003'::uuid,
      'Level front and side',
      'Door plane and rack operation checked against cabinet opening.',
      2,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'd15a0001-1a7e-4c1d-9f03-d15a00000007'::uuid,
      'd15a0001-1a7e-4c1d-9f02-d15a00000004'::uuid,
      'Connect supply and drain per manufacturer',
      'Fittings tightened to spec with high loop or air gap as required.',
      1,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'd15a0001-1a7e-4c1d-9f03-d15a00000008'::uuid,
      'd15a0001-1a7e-4c1d-9f02-d15a00000004'::uuid,
      'Restore electrical connection',
      'Cord or junction completed for grounding and strain relief.',
      2,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'd15a0001-1a7e-4c1d-9f03-d15a00000009'::uuid,
      'd15a0001-1a7e-4c1d-9f02-d15a00000005'::uuid,
      'Open water and check static joints',
      'Dry paper towel pass on fittings before first powered fill.',
      1,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'd15a0001-1a7e-4c1d-9f03-d15a0000000a'::uuid,
      'd15a0001-1a7e-4c1d-9f02-d15a00000005'::uuid,
      'Anchor or clip unit to cabinet',
      'Anti-tip or bracketing installed so unit cannot tip forward when loaded.',
      2,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'd15a0001-1a7e-4c1d-9f03-d15a0000000b'::uuid,
      'd15a0001-1a7e-4c1d-9f02-d15a00000006'::uuid,
      'Run test cycle and inspect for leaks',
      'Full cycle observed with dry connections at tub and under sink.',
      1,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'd15a0001-1a7e-4c1d-9f03-d15a0000000c'::uuid,
      'd15a0001-1a7e-4c1d-9f02-d15a00000006'::uuid,
      'Confirm fill, wash, and drain behavior',
      'Normal sounds, draining to standpipe or disposal, and no standing water in tub.',
      2,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    )
  ON CONFLICT (id) DO UPDATE SET
    operation_id = EXCLUDED.operation_id,
    step_title = EXCLUDED.step_title,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order;

  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(v_project_id)
  WHERE id = v_project_id;

  RAISE NOTICE 'Dishwasher Replacement: step 1 structure applied for project_id=%', v_project_id;
END $$;

-- =============================================================================
-- 3) Caulking Application (canonical id + name); skip if prior migration applied
-- =============================================================================
DO $$
DECLARE
  v_project_id uuid := 'dbd4d8b4-da79-4fc0-b53a-c8caa1768db1'::uuid;
  v_has_structure boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = v_project_id) THEN
    RAISE EXCEPTION 'Caulking Application project row not found for id=%', v_project_id;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.phase_operations po
    WHERE po.id = '9d9ebf39-3844-4e5c-9b0f-52336a8df101'::uuid
  )
  INTO v_has_structure;

  IF v_has_structure THEN
    RAISE NOTICE 'Caulking Application: step 1 structure already present (operation 9d9ebf39-3844-4e5c-9b0f-52336a8df101); skipping inserts';
    RETURN;
  END IF;

  RAISE EXCEPTION
    'Caulking Application (id=%) is missing expected step-1 operations; run or reconcile 2026_04_01_migration_caulking_application_steps_1_8.sql instead of this stub',
    v_project_id;
END $$;
