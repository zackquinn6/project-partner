-- Step 1 — structure only (AI_PROJECT_DEVELOPMENT_REFERENCE.md):
-- phases: INSERT only when count = 0. If phases already exist, map new operations by phase sort order.
-- phase_operations + operation_steps (title + one-line description). No step_instructions.
--
-- Templates:
--   1) Door & Trim Trimming
--   2) Electric Radiant Floor Installation
--   3) Manage Dust Control

-- =============================================================================
-- 1) Door & Trim Trimming
-- =============================================================================
DO $$
DECLARE
  v_project_id uuid;
  v_nroots integer;
  v_phase_count integer;
  v_prep uuid;
  v_work uuid;
  v_finish uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.phase_operations po WHERE po.id = 'f00d7001-1a7e-4c1d-9f02-f00d70010101'::uuid) THEN
    RAISE NOTICE 'Door & Trim Trimming: step 1 structure already present (operation f00d7001-1a7e-4c1d-9f02-f00d70010101); skipping';
    RETURN;
  END IF;

  WITH RECURSIVE matched AS (
    SELECT p.id
    FROM public.projects p
    WHERE (p.is_standard IS DISTINCT FROM true)
      AND (
        lower(btrim(p.name)) IN (
          'door & trim trimming',
          'door and trim trimming',
          'door + trim trimming'
        )
        OR (
          lower(btrim(p.name)) LIKE '%door%'
          AND lower(btrim(p.name)) LIKE '%trim%'
          AND lower(btrim(p.name)) LIKE '%trimming%'
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
      'No project found for Door & Trim Trimming (tried exact titles with &/and/+, and names containing door, trim, and trimming). '
      'Query: SELECT id, name, parent_project_id FROM projects WHERE lower(name) LIKE ''%%door%%'' AND lower(name) LIKE ''%%trim%%'' ORDER BY name;';
  END IF;

  IF v_nroots > 1 THEN
    RAISE EXCEPTION
      'Multiple (%) distinct Door & Trim Trimming template roots matched. Resolve duplicates before running.',
      v_nroots;
  END IF;

  SELECT count(*)::integer INTO v_phase_count FROM public.project_phases pp WHERE pp.project_id = v_project_id;

  IF v_phase_count = 0 THEN
    INSERT INTO public.project_phases (id, project_id, name, description, position_rule, position_value, is_standard, is_linked)
    VALUES
      (
        'f00d7001-1a7e-4c1d-9f01-f00d70010001'::uuid,
        v_project_id,
        'Preparation',
        'Measure clearances, mark cuts, and stage door and trim before cutting.',
        'nth',
        1,
        false,
        false
      ),
      (
        'f00d7001-1a7e-4c1d-9f01-f00d70010002'::uuid,
        v_project_id,
        'Cutting and fitting',
        'Trim door edges and cut trim stock to planned lengths and joints.',
        'nth',
        2,
        false,
        false
      ),
      (
        'f00d7001-1a7e-4c1d-9f01-f00d70010003'::uuid,
        v_project_id,
        'Installation and finish',
        'Rehang door, fasten trim, and complete fill, seal, and touch-up.',
        'nth',
        3,
        false,
        false
      );
    v_prep := 'f00d7001-1a7e-4c1d-9f01-f00d70010001'::uuid;
    v_work := 'f00d7001-1a7e-4c1d-9f01-f00d70010002'::uuid;
    v_finish := 'f00d7001-1a7e-4c1d-9f01-f00d70010003'::uuid;
  ELSE
    WITH sorted AS (
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
    )
    SELECT
      (SELECT s.id FROM sorted s WHERE s.rn = 1 LIMIT 1),
      (SELECT s.id FROM sorted s WHERE s.rn = LEAST(2, v_phase_count) LIMIT 1),
      (SELECT s.id FROM sorted s WHERE s.rn = LEAST(3, v_phase_count) LIMIT 1)
    INTO v_prep, v_work, v_finish;

    IF v_prep IS NULL THEN
      RAISE EXCEPTION 'Door & Trim Trimming: project_id=% has phases but sort yielded no phase id', v_project_id;
    END IF;

    RAISE NOTICE
      'Door & Trim Trimming: attaching new operations to % existing phase(s) by order. prep_phase=%, work_phase=%, finish_phase=%',
      v_phase_count,
      v_prep,
      v_work,
      v_finish;
  END IF;

  INSERT INTO public.phase_operations (id, phase_id, operation_name, operation_description, display_order, estimated_time, flow_type)
  VALUES
    (
      'f00d7001-1a7e-4c1d-9f02-f00d70010101'::uuid,
      v_prep,
      'Plan clearances and mark cuts',
      'Confirm swing, floor, and jamb margins; transfer cut lines for door and trim.',
      1,
      '30–60 min',
      'prime'
    ),
    (
      'f00d7001-1a7e-4c1d-9f02-f00d70010102'::uuid,
      v_work,
      'Trim door for clearance',
      'Remove door if needed; plane or saw to planned height and edge margins.',
      1,
      '45–90 min',
      'prime'
    ),
    (
      'f00d7001-1a7e-4c1d-9f02-f00d70010103'::uuid,
      v_work,
      'Cut and fit trim stock',
      'Miter, cope, or butt joints cut to length and test-fit at jambs and heads.',
      2,
      '1–2 hr',
      'prime'
    ),
    (
      'f00d7001-1a7e-4c1d-9f02-f00d70010104'::uuid,
      v_finish,
      'Install, adjust, and finish',
      'Rehang door, fasten trim, then fill, caulk, and match finish.',
      1,
      '1–2 hr',
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
      'f00d7001-1a7e-4c1d-9f03-f00d70010301'::uuid,
      'f00d7001-1a7e-4c1d-9f02-f00d70010101'::uuid,
      'Measure swing and floor clearances',
      'Door checked against finish floor and casing plan without binding.',
      1,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'f00d7001-1a7e-4c1d-9f03-f00d70010302'::uuid,
      'f00d7001-1a7e-4c1d-9f02-f00d70010101'::uuid,
      'Mark cut lines on door and trim pieces',
      'Visible reference lines for bottom, hinge, or jamb cuts before removal.',
      2,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'f00d7001-1a7e-4c1d-9f03-f00d70010303'::uuid,
      'f00d7001-1a7e-4c1d-9f02-f00d70010102'::uuid,
      'Cut door bottom or strike edge to line',
      'Material removed in controlled passes to margin without splitting veneer.',
      1,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'f00d7001-1a7e-4c1d-9f03-f00d70010304'::uuid,
      'f00d7001-1a7e-4c1d-9f02-f00d70010102'::uuid,
      'Dry-fit door in opening',
      'Swing, latch, and reveal verified before final hang.',
      2,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'f00d7001-1a7e-4c1d-9f03-f00d70010305'::uuid,
      'f00d7001-1a7e-4c1d-9f02-f00d70010103'::uuid,
      'Cut trim lengths and corner joints',
      'Pieces sized to jambs with joints meeting the planned detail.',
      1,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'f00d7001-1a7e-4c1d-9f03-f00d70010306'::uuid,
      'f00d7001-1a7e-4c1d-9f02-f00d70010103'::uuid,
      'Test-fit trim at openings',
      'Gaps and reveals checked before fastening.',
      2,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'f00d7001-1a7e-4c1d-9f03-f00d70010307'::uuid,
      'f00d7001-1a7e-4c1d-9f02-f00d70010104'::uuid,
      'Hang door and fasten trim',
      'Hinges set to margin; trim nailed or screwed to framing on layout.',
      1,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'f00d7001-1a7e-4c1d-9f03-f00d70010308'::uuid,
      'f00d7001-1a7e-4c1d-9f02-f00d70010104'::uuid,
      'Fill, caulk, and touch up finish',
      'Fasteners sunk and filled; seal paint-grade joints; finish matched.',
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

  RAISE NOTICE 'Door & Trim Trimming: step 1 structure applied for project_id=%', v_project_id;
END $$;

-- =============================================================================
-- 2) Electric Radiant Floor Installation
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
  IF EXISTS (SELECT 1 FROM public.phase_operations po WHERE po.id = 'e1ec0001-1a7e-4c1d-9f02-e1ec00010101'::uuid) THEN
    RAISE NOTICE 'Electric Radiant Floor Installation: step 1 structure already present (operation e1ec0001-1a7e-4c1d-9f02-e1ec00010101); skipping';
    RETURN;
  END IF;

  WITH RECURSIVE matched AS (
    SELECT p.id
    FROM public.projects p
    WHERE (p.is_standard IS DISTINCT FROM true)
      AND (
        lower(btrim(p.name)) IN (
          'electric radiant floor installation',
          'electric radiant floor install',
          'electric radiant floor heating installation'
        )
        OR (
          lower(btrim(p.name)) LIKE '%electric%'
          AND lower(btrim(p.name)) LIKE '%radiant%'
          AND lower(btrim(p.name)) LIKE '%floor%'
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
      'No project found for Electric Radiant Floor Installation. '
      'Query: SELECT id, name, parent_project_id FROM projects WHERE lower(name) LIKE ''%%radiant%%'' ORDER BY name;';
  END IF;

  IF v_nroots > 1 THEN
    RAISE EXCEPTION
      'Multiple (%) distinct Electric Radiant Floor Installation template roots matched. Resolve duplicates before running.',
      v_nroots;
  END IF;

  SELECT count(*)::integer INTO v_phase_count FROM public.project_phases pp WHERE pp.project_id = v_project_id;

  IF v_phase_count = 0 THEN
    INSERT INTO public.project_phases (id, project_id, name, description, position_rule, position_value, is_standard, is_linked)
    VALUES
      (
        'e1ec0001-1a7e-4c1d-9f01-e1ec00010001'::uuid,
        v_project_id,
        'Preparation',
        'Subfloor readiness, layout, and manufacturer clearances before laying heat.',
        'nth',
        1,
        false,
        false
      ),
      (
        'e1ec0001-1a7e-4c1d-9f01-e1ec00010002'::uuid,
        v_project_id,
        'Heating element install',
        'Mat, cable, or panel secured per spacing and radius rules.',
        'nth',
        2,
        false,
        false
      ),
      (
        'e1ec0001-1a7e-4c1d-9f01-e1ec00010003'::uuid,
        v_project_id,
        'Test and embed',
        'Electrical verification then approved cover or embedment.',
        'nth',
        3,
        false,
        false
      );
    v_prep := 'e1ec0001-1a7e-4c1d-9f01-e1ec00010001'::uuid;
    v_install := 'e1ec0001-1a7e-4c1d-9f01-e1ec00010002'::uuid;
    v_finish := 'e1ec0001-1a7e-4c1d-9f01-e1ec00010003'::uuid;
  ELSE
    WITH sorted AS (
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
    )
    SELECT
      (SELECT s.id FROM sorted s WHERE s.rn = 1 LIMIT 1),
      (SELECT s.id FROM sorted s WHERE s.rn = LEAST(2, v_phase_count) LIMIT 1),
      (SELECT s.id FROM sorted s WHERE s.rn = LEAST(3, v_phase_count) LIMIT 1)
    INTO v_prep, v_install, v_finish;

    IF v_prep IS NULL THEN
      RAISE EXCEPTION 'Electric Radiant Floor: project_id=% has phases but sort yielded no phase id', v_project_id;
    END IF;

    RAISE NOTICE
      'Electric Radiant Floor: attaching new operations to % existing phase(s) by order. prep_phase=%, install_phase=%, finish_phase=%',
      v_phase_count,
      v_prep,
      v_install,
      v_finish;
  END IF;

  INSERT INTO public.phase_operations (id, phase_id, operation_name, operation_description, display_order, estimated_time, flow_type)
  VALUES
    (
      'e1ec0001-1a7e-4c1d-9f02-e1ec00010101'::uuid,
      v_prep,
      'Layout and substrate prep',
      'Flatness and fasteners verified; heating zones and thermostat location marked.',
      1,
      '1–2 hr',
      'prime'
    ),
    (
      'e1ec0001-1a7e-4c1d-9f02-e1ec00010102'::uuid,
      v_install,
      'Install radiant element',
      'Cable or mat fixed per spacing with cold lead routed to electrical plan.',
      1,
      '2–4 hr',
      'prime'
    ),
    (
      'e1ec0001-1a7e-4c1d-9f02-e1ec00010103'::uuid,
      v_install,
      'Sensors and controls rough-in',
      'Floor sensor or control wiring placed per manufacturer and code.',
      2,
      '30–90 min',
      'prime'
    ),
    (
      'e1ec0001-1a7e-4c1d-9f02-e1ec00010104'::uuid,
      v_finish,
      'Test, protect, and embed',
      'Resistance and GFCI checks recorded; approved cover or mortar bed installed.',
      1,
      '1–3 hr',
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
      'e1ec0001-1a7e-4c1d-9f03-e1ec00010301'::uuid,
      'e1ec0001-1a7e-4c1d-9f02-e1ec00010101'::uuid,
      'Verify subfloor flatness and fastener schedule',
      'Surface within tolerance for embedment and finish flooring type.',
      1,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'e1ec0001-1a7e-4c1d-9f03-e1ec00010302'::uuid,
      'e1ec0001-1a7e-4c1d-9f02-e1ec00010101'::uuid,
      'Mark heating zones and keep-out strips',
      'Layout matches plan including walls, fixtures, and expansion per spec.',
      2,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'e1ec0001-1a7e-4c1d-9f03-e1ec00010303'::uuid,
      'e1ec0001-1a7e-4c1d-9f02-e1ec00010102'::uuid,
      'Secure mat or cable to substrate',
      'Fasteners or tape per manufacturer; no sharp bends below minimum radius.',
      1,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'e1ec0001-1a7e-4c1d-9f03-e1ec00010304'::uuid,
      'e1ec0001-1a7e-4c1d-9f02-e1ec00010102'::uuid,
      'Route cold lead to electrical box',
      'Strain relief and bend radius preserved to junction or thermostat location.',
      2,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'e1ec0001-1a7e-4c1d-9f03-e1ec00010305'::uuid,
      'e1ec0001-1a7e-4c1d-9f02-e1ec00010103'::uuid,
      'Place floor temperature sensor',
      'Sensor position and conduit per wiring diagram and even sensing goal.',
      1,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'e1ec0001-1a7e-4c1d-9f03-e1ec00010306'::uuid,
      'e1ec0001-1a7e-4c1d-9f02-e1ec00010103'::uuid,
      'Complete low-voltage and line-voltage rough per plan',
      'Conductors identified and secured for inspection before cover.',
      2,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'e1ec0001-1a7e-4c1d-9f03-e1ec00010307'::uuid,
      'e1ec0001-1a7e-4c1d-9f02-e1ec00010104'::uuid,
      'Perform megger or resistance test per manufacturer',
      'Readings logged before any mortar or self-leveler covers the element.',
      1,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'e1ec0001-1a7e-4c1d-9f03-e1ec00010308'::uuid,
      'e1ec0001-1a7e-4c1d-9f02-e1ec00010104'::uuid,
      'Install approved cover or embedment without damaging element',
      'Thickness and cure aligned with finish floor system requirements.',
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

  RAISE NOTICE 'Electric Radiant Floor Installation: step 1 structure applied for project_id=%', v_project_id;
END $$;

-- =============================================================================
-- 3) Manage Dust Control
-- =============================================================================
DO $$
DECLARE
  v_project_id uuid;
  v_nroots integer;
  v_phase_count integer;
  v_contain uuid;
  v_capture uuid;
  v_verify uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.phase_operations po WHERE po.id = 'd057c001-1a7e-4c1d-9f02-d057c0010101'::uuid) THEN
    RAISE NOTICE 'Manage Dust Control: step 1 structure already present (operation d057c001-1a7e-4c1d-9f02-d057c0010101); skipping';
    RETURN;
  END IF;

  WITH RECURSIVE matched AS (
    SELECT p.id
    FROM public.projects p
    WHERE (p.is_standard IS DISTINCT FROM true)
      AND (
        lower(btrim(p.name)) IN (
          'manage dust control',
          'dust control',
          'dust control management',
          'managing dust control'
        )
        OR (
          lower(btrim(p.name)) LIKE '%dust%'
          AND lower(btrim(p.name)) LIKE '%control%'
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
      'No project found for Manage Dust Control. '
      'Query: SELECT id, name, parent_project_id FROM projects WHERE lower(name) LIKE ''%%dust%%'' ORDER BY name;';
  END IF;

  IF v_nroots > 1 THEN
    RAISE EXCEPTION
      'Multiple (%) distinct Manage Dust Control template roots matched. Resolve duplicates before running.',
      v_nroots;
  END IF;

  SELECT count(*)::integer INTO v_phase_count FROM public.project_phases pp WHERE pp.project_id = v_project_id;

  IF v_phase_count = 0 THEN
    INSERT INTO public.project_phases (id, project_id, name, description, position_rule, position_value, is_standard, is_linked)
    VALUES
      (
        'd057c001-1a7e-4c1d-9f01-d057c0010001'::uuid,
        v_project_id,
        'Containment',
        'Isolate work area and protect adjacent spaces from dust migration.',
        'nth',
        1,
        false,
        false
      ),
      (
        'd057c001-1a7e-4c1d-9f01-d057c0010002'::uuid,
        v_project_id,
        'Capture at source',
        'Tools and methods that pull or suppress dust where it is created.',
        'nth',
        2,
        false,
        false
      ),
      (
        'd057c001-1a7e-4c1d-9f01-d057c0010003'::uuid,
        v_project_id,
        'Verify and maintain',
        'Checks, cleaning cadence, and filter or media upkeep through the job.',
        'nth',
        3,
        false,
        false
      );
    v_contain := 'd057c001-1a7e-4c1d-9f01-d057c0010001'::uuid;
    v_capture := 'd057c001-1a7e-4c1d-9f01-d057c0010002'::uuid;
    v_verify := 'd057c001-1a7e-4c1d-9f01-d057c0010003'::uuid;
  ELSE
    WITH sorted AS (
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
    )
    SELECT
      (SELECT s.id FROM sorted s WHERE s.rn = 1 LIMIT 1),
      (SELECT s.id FROM sorted s WHERE s.rn = LEAST(2, v_phase_count) LIMIT 1),
      (SELECT s.id FROM sorted s WHERE s.rn = LEAST(3, v_phase_count) LIMIT 1)
    INTO v_contain, v_capture, v_verify;

    IF v_contain IS NULL THEN
      RAISE EXCEPTION 'Manage Dust Control: project_id=% has phases but sort yielded no phase id', v_project_id;
    END IF;

    RAISE NOTICE
      'Manage Dust Control: attaching new operations to % existing phase(s) by order. contain_phase=%, capture_phase=%, verify_phase=%',
      v_phase_count,
      v_contain,
      v_capture,
      v_verify;
  END IF;

  INSERT INTO public.phase_operations (id, phase_id, operation_name, operation_description, display_order, estimated_time, flow_type)
  VALUES
    (
      'd057c001-1a7e-4c1d-9f02-d057c0010101'::uuid,
      v_contain,
      'Seal work zone and protect pathways',
      'Poly, zipper doors, or barriers plus walk-off at exits per job scope.',
      1,
      '30–90 min',
      'prime'
    ),
    (
      'd057c001-1a7e-4c1d-9f02-d057c0010102'::uuid,
      v_capture,
      'Connect tools to extraction',
      'Vacuum ports sealed; CFM adequate for each tool in use.',
      1,
      '30–60 min',
      'prime'
    ),
    (
      'd057c001-1a7e-4c1d-9f02-d057c0010103'::uuid,
      v_capture,
      'Protect surfaces and HVAC openings',
      'Registers sealed or filtered; horizontal surfaces covered where needed.',
      2,
      '30–60 min',
      'prime'
    ),
    (
      'd057c001-1a7e-4c1d-9f02-d057c0010104'::uuid,
      v_verify,
      'Inspect containment and adjust',
      'Visual check of barrier integrity and negative pressure or airflow plan.',
      1,
      '15–30 min',
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
      'd057c001-1a7e-4c1d-9f03-d057c0010301'::uuid,
      'd057c001-1a7e-4c1d-9f02-d057c0010101'::uuid,
      'Install barriers and sealed entry',
      'Work area defined with minimal gaps at ceiling and walls.',
      1,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'd057c001-1a7e-4c1d-9f03-d057c0010302'::uuid,
      'd057c001-1a7e-4c1d-9f02-d057c0010101'::uuid,
      'Lay walk-off and protect adjacent finishes',
      'Mats or paper at transitions; shoe removal or cover protocol agreed.',
      2,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'd057c001-1a7e-4c1d-9f03-d057c0010303'::uuid,
      'd057c001-1a7e-4c1d-9f02-d057c0010102'::uuid,
      'Verify vacuum hose and adapter fit per tool',
      'Leaks at couplings eliminated before cutting or sanding.',
      1,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'd057c001-1a7e-4c1d-9f03-d057c0010304'::uuid,
      'd057c001-1a7e-4c1d-9f02-d057c0010102'::uuid,
      'Use wet cutting or mist where specified',
      'Airborne dust reduced for masonry or tile cuts per safety plan.',
      2,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'd057c001-1a7e-4c1d-9f03-d057c0010305'::uuid,
      'd057c001-1a7e-4c1d-9f02-d057c0010103'::uuid,
      'Seal or filter supply and return in work zone',
      'HVAC not used to spread dust during dirty phases.',
      1,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'd057c001-1a7e-4c1d-9f03-d057c0010306'::uuid,
      'd057c001-1a7e-4c1d-9f02-d057c0010103'::uuid,
      'Cover cabinets, fixtures, and horizontal ledges',
      'Surfaces that collect dust protected or easy to wipe.',
      2,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'd057c001-1a7e-4c1d-9f03-d057c0010307'::uuid,
      'd057c001-1a7e-4c1d-9f02-d057c0010104'::uuid,
      'Walk perimeter and fix barrier gaps',
      'Tape lifted or zipper failed spots repaired before high-dust tasks.',
      1,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, true
    ),
    (
      'd057c001-1a7e-4c1d-9f03-d057c0010308'::uuid,
      'd057c001-1a7e-4c1d-9f02-d057c0010104'::uuid,
      'Empty or change vac bags and filters on schedule',
      'Suction maintained; disposal follows local rules for silica or lead if applicable.',
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

  RAISE NOTICE 'Manage Dust Control: step 1 structure applied for project_id=%', v_project_id;
END $$;
