-- Step 1 — structure only (AI_PROJECT_DEVELOPMENT_REFERENCE.md):
-- phases: INSERT only when count = 0; if phases exist, map new operations by stable sort order.
-- phase_operations + operation_steps (title + one-line description). No step_instructions.
--
-- Templates:
--   1) Self-Leveler Application
--   2) Subfloor Replacement
--   3) Toilet Flange Repair
--   4) Tile Flooring Demolition

-- =============================================================================
-- 1) Self-Leveler Application
-- =============================================================================
DO $$
DECLARE
  v_project_id uuid;
  v_nroots integer;
  v_phase_count integer;
  v_prep uuid;
  v_pour uuid;
  v_finish uuid;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.phase_operations po
    WHERE po.id = 'e1e1e101-1a7e-4c1d-9f02-e1e1e1010101'::uuid
  ) THEN
    RAISE NOTICE
      'Self-Leveler Application: step 1 structure already present (operation e1e1e101-1a7e-4c1d-9f02-e1e1e1010101); skipping';
  ELSE
    WITH RECURSIVE matched AS (
      SELECT p.id
      FROM public.projects p
      WHERE (p.is_standard IS DISTINCT FROM true)
        AND (
          lower(btrim(p.name)) IN (
            'self-leveler application',
            'self leveler application',
            'self-leveling compound application',
            'self leveling compound application',
            'application of self-leveler',
            'application of self leveler'
          )
          OR lower(btrim(p.name)) LIKE 'self-leveler application%'
          OR lower(btrim(p.name)) LIKE 'self leveler application%'
          OR (
            strpos(lower(btrim(p.name)), 'self') > 0
            AND strpos(lower(btrim(p.name)), 'level') > 0
            AND strpos(lower(btrim(p.name)), 'applicat') > 0
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
        'No Self-Leveler Application template root found. '
        'Query: SELECT id, name, parent_project_id FROM projects WHERE lower(btrim(name)) LIKE ''%%self%%level%%'' ORDER BY name;';
    END IF;

    IF v_nroots > 1 THEN
      RAISE EXCEPTION
        'Multiple (%) distinct Self-Leveler Application template roots matched. Resolve duplicates before running.',
        v_nroots;
    END IF;

    SELECT count(*)::integer INTO v_phase_count FROM public.project_phases pp WHERE pp.project_id = v_project_id;

    IF v_phase_count = 0 THEN
      INSERT INTO public.project_phases (id, project_id, name, description, position_rule, position_value, is_standard, is_linked)
      VALUES
        (
          'e1e1e101-1a7e-4c1d-9f01-e1e1e1010001'::uuid,
          v_project_id,
          'Preparation',
          'Substrate cleaning, priming, and containment before the pour.',
          'nth',
          1,
          false,
          false
        ),
        (
          'e1e1e101-1a7e-4c1d-9f01-e1e1e1010002'::uuid,
          v_project_id,
          'Pour and spread',
          'Mixed self-leveler placed and worked within product working time.',
          'nth',
          2,
          false,
          false
        ),
        (
          'e1e1e101-1a7e-4c1d-9f01-e1e1e1010003'::uuid,
          v_project_id,
          'Cure and verify',
          'Protected cure then flatness and readiness checks for the next trade.',
          'nth',
          3,
          false,
          false
        );
      v_prep := 'e1e1e101-1a7e-4c1d-9f01-e1e1e1010001'::uuid;
      v_pour := 'e1e1e101-1a7e-4c1d-9f01-e1e1e1010002'::uuid;
      v_finish := 'e1e1e101-1a7e-4c1d-9f01-e1e1e1010003'::uuid;
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
      INTO v_prep, v_pour, v_finish;

      IF v_prep IS NULL THEN
        RAISE EXCEPTION 'Self-Leveler Application: project_id=% has phases but sort yielded no phase id', v_project_id;
      END IF;

      RAISE NOTICE
        'Self-Leveler Application: attaching new operations to % existing phase(s) by order. prep_phase=%, pour_phase=%, finish_phase=%',
        v_phase_count,
        v_prep,
        v_pour,
        v_finish;
    END IF;

    INSERT INTO public.phase_operations (id, phase_id, operation_name, operation_description, display_order, estimated_time, flow_type)
    VALUES
      (
        'e1e1e101-1a7e-4c1d-9f02-e1e1e1010101'::uuid,
        v_prep,
        'Prep substrate and prime',
        'Clean, mechanically prep if required, and apply manufacturer primer and dams.',
        1,
        '45–90 min',
        'prime'
      ),
      (
        'e1e1e101-1a7e-4c1d-9f02-e1e1e1010102'::uuid,
        v_pour,
        'Mix, pour, and work self-leveler',
        'Batching, pour, gauge rake, and spike roller within stated working time.',
        1,
        '30–90 min',
        'prime'
      ),
      (
        'e1e1e101-1a7e-4c1d-9f02-e1e1e1010103'::uuid,
        v_finish,
        'Cure and confirm flatness',
        'Traffic control through minimum cure; verify flatness before overlays.',
        1,
        'varies',
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
        'e1e1e101-1a7e-4c1d-9f03-e1e1e1010101'::uuid,
        'e1e1e101-1a7e-4c1d-9f02-e1e1e1010101'::uuid,
        'Clean and inspect substrate',
        'Contaminants, coatings, and laitance addressed per product data sheet.',
        1,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'e1e1e101-1a7e-4c1d-9f03-e1e1e1010102'::uuid,
        'e1e1e101-1a7e-4c1d-9f02-e1e1e1010101'::uuid,
        'Apply primer and install pour dams',
        'Primer film even at edges; dams contain flow at openings and transitions.',
        2,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'e1e1e101-1a7e-4c1d-9f03-e1e1e1010103'::uuid,
        'e1e1e101-1a7e-4c1d-9f02-e1e1e1010102'::uuid,
        'Mix and pour within working time',
        'Water and powder ratio held; pours chained before skin forms.',
        1,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'e1e1e101-1a7e-4c1d-9f03-e1e1e1010104'::uuid,
        'e1e1e101-1a7e-4c1d-9f02-e1e1e1010102'::uuid,
        'Spread with gauge rake and spike roller',
        'Thickness and air release match manufacturer guidance across the field.',
        2,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'e1e1e101-1a7e-4c1d-9f03-e1e1e1010105'::uuid,
        'e1e1e101-1a7e-4c1d-9f02-e1e1e1010103'::uuid,
        'Protect cure from traffic and drafts',
        'Loads and HVAC managed so the slab cures without cracking or dust film issues.',
        1,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'e1e1e101-1a7e-4c1d-9f03-e1e1e1010106'::uuid,
        'e1e1e101-1a7e-4c1d-9f02-e1e1e1010103'::uuid,
        'Verify flatness and moisture readiness',
        'Straightedge or spec method logged before bond-breaking layers go down.',
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

    RAISE NOTICE 'Self-Leveler Application: step 1 structure applied for project_id=%', v_project_id;
  END IF;
END $$;

-- =============================================================================
-- 2) Subfloor Replacement
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
  IF EXISTS (
    SELECT 1 FROM public.phase_operations po
    WHERE po.id = 'e2e2e102-1a7e-4c1d-9f02-e2e2e1020101'::uuid
  ) THEN
    RAISE NOTICE
      'Subfloor Replacement: step 1 structure already present (operation e2e2e102-1a7e-4c1d-9f02-e2e2e1020101); skipping';
  ELSE
    WITH RECURSIVE matched AS (
      SELECT p.id
      FROM public.projects p
      WHERE (p.is_standard IS DISTINCT FROM true)
        AND (
          lower(btrim(p.name)) IN (
            'subfloor replacement',
            'sub-floor replacement',
            'sub floor replacement',
            'replace subfloor',
            'subfloor panel replacement'
          )
          OR lower(btrim(p.name)) LIKE 'subfloor replacement%'
          OR lower(btrim(p.name)) LIKE 'sub-floor replacement%'
          OR (
            strpos(lower(btrim(p.name)), 'subfloor') > 0
            AND strpos(lower(btrim(p.name)), 'replacement') > 0
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
        'No Subfloor Replacement template root found. '
        'Query: SELECT id, name, parent_project_id FROM projects WHERE lower(btrim(name)) LIKE ''%%subfloor%%'' ORDER BY name;';
    END IF;

    IF v_nroots > 1 THEN
      RAISE EXCEPTION
        'Multiple (%) distinct Subfloor Replacement template roots matched. Resolve duplicates before running.',
        v_nroots;
    END IF;

    SELECT count(*)::integer INTO v_phase_count FROM public.project_phases pp WHERE pp.project_id = v_project_id;

    IF v_phase_count = 0 THEN
      INSERT INTO public.project_phases (id, project_id, name, description, position_rule, position_value, is_standard, is_linked)
      VALUES
        (
          'e2e2e102-1a7e-4c1d-9f01-e2e2e1020001'::uuid,
          v_project_id,
          'Removal',
          'Remove damaged decking, expose joists, and correct structural issues found.',
          'nth',
          1,
          false,
          false
        ),
        (
          'e2e2e102-1a7e-4c1d-9f01-e2e2e1020002'::uuid,
          v_project_id,
          'Installation',
          'New panels laid to span and fastener pattern for a stiff, continuous deck.',
          'nth',
          2,
          false,
          false
        ),
        (
          'e2e2e102-1a7e-4c1d-9f01-e2e2e1020003'::uuid,
          v_project_id,
          'Finishing',
          'Seams and edges prepared for underlayment or finish flooring.',
          'nth',
          3,
          false,
          false
        );
      v_prep := 'e2e2e102-1a7e-4c1d-9f01-e2e2e1020001'::uuid;
      v_install := 'e2e2e102-1a7e-4c1d-9f01-e2e2e1020002'::uuid;
      v_finish := 'e2e2e102-1a7e-4c1d-9f01-e2e2e1020003'::uuid;
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
        RAISE EXCEPTION 'Subfloor Replacement: project_id=% has phases but sort yielded no phase id', v_project_id;
      END IF;

      RAISE NOTICE
        'Subfloor Replacement: attaching new operations to % existing phase(s) by order. removal_phase=%, install_phase=%, finish_phase=%',
        v_phase_count,
        v_prep,
        v_install,
        v_finish;
    END IF;

    INSERT INTO public.phase_operations (id, phase_id, operation_name, operation_description, display_order, estimated_time, flow_type)
    VALUES
      (
        'e2e2e102-1a7e-4c1d-9f02-e2e2e1020101'::uuid,
        v_prep,
        'Remove damaged subfloor and inspect joists',
        'Cut back to sound structure; verify joist plane and repair rot or splits.',
        1,
        '1–3 hr',
        'prime'
      ),
      (
        'e2e2e102-1a7e-4c1d-9f02-e2e2e1020102'::uuid,
        v_install,
        'Install new subfloor panels',
        'Layout, gaps, adhesive, and screw pattern meet span tables and manufacturer specs.',
        1,
        '2–4 hr',
        'prime'
      ),
      (
        'e2e2e102-1a7e-4c1d-9f02-e2e2e1020103'::uuid,
        v_finish,
        'Plane, sand seams, and verify stiffness',
        'Transitions flush; deck feels solid with no soft spots before next layer.',
        1,
        '30–90 min',
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
        'e2e2e102-1a7e-4c1d-9f03-e2e2e1020101'::uuid,
        'e2e2e102-1a7e-4c1d-9f02-e2e2e1020101'::uuid,
        'Cut out failed decking to joist centers',
        'Saw lines land on framing so new panels have solid bearing.',
        1,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'e2e2e102-1a7e-4c1d-9f03-e2e2e1020102'::uuid,
        'e2e2e102-1a7e-4c1d-9f02-e2e2e1020101'::uuid,
        'Inspect and repair joists as needed',
        'Sister, block, or replace members before new panels bear on compromised wood.',
        2,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'e2e2e102-1a7e-4c1d-9f03-e2e2e1020103'::uuid,
        'e2e2e102-1a7e-4c1d-9f02-e2e2e1020102'::uuid,
        'Dry-lay panels on layout marks',
        'Stagger joints, maintain gaps, and confirm thickness stack with finish floor plan.',
        1,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'e2e2e102-1a7e-4c1d-9f03-e2e2e1020104'::uuid,
        'e2e2e102-1a7e-4c1d-9f02-e2e2e1020102'::uuid,
        'Glue and screw panels to joists',
        'Adhesive ribbons and fastener spacing per spec along every support.',
        2,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'e2e2e102-1a7e-4c1d-9f03-e2e2e1020105'::uuid,
        'e2e2e102-1a7e-4c1d-9f02-e2e2e1020103'::uuid,
        'Sand or plane high seams',
        'Proud edges reduced without gouging face veneers.',
        1,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'e2e2e102-1a7e-4c1d-9f03-e2e2e1020106'::uuid,
        'e2e2e102-1a7e-4c1d-9f02-e2e2e1020103'::uuid,
        'Walk and probe for movement or noise',
        'Deck checked before underlayment; loose spots re-fastened.',
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

    RAISE NOTICE 'Subfloor Replacement: step 1 structure applied for project_id=%', v_project_id;
  END IF;
END $$;

-- =============================================================================
-- 3) Toilet Flange Repair
-- =============================================================================
DO $$
DECLARE
  v_project_id uuid;
  v_nroots integer;
  v_phase_count integer;
  v_prep uuid;
  v_repair uuid;
  v_verify uuid;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.phase_operations po
    WHERE po.id = 'e3e3e103-1a7e-4c1d-9f02-e3e3e1030101'::uuid
  ) THEN
    RAISE NOTICE
      'Toilet Flange Repair: step 1 structure already present (operation e3e3e103-1a7e-4c1d-9f02-e3e3e1030101); skipping';
  ELSE
    WITH RECURSIVE matched AS (
      SELECT p.id
      FROM public.projects p
      WHERE (p.is_standard IS DISTINCT FROM true)
        AND (
          lower(btrim(p.name)) IN (
            'toilet flange repair',
            'toilet flange replacement',
            'repair toilet flange',
            'wc flange repair',
            'closet flange repair'
          )
          OR lower(btrim(p.name)) LIKE 'toilet flange repair%'
          OR lower(btrim(p.name)) LIKE 'toilet flange replacement%'
          OR (
            strpos(lower(btrim(p.name)), 'toilet') > 0
            AND strpos(lower(btrim(p.name)), 'flange') > 0
            AND (
              strpos(lower(btrim(p.name)), 'repair') > 0
              OR strpos(lower(btrim(p.name)), 'replac') > 0
            )
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
        'No Toilet Flange Repair template root found. '
        'Query: SELECT id, name, parent_project_id FROM projects WHERE lower(btrim(name)) LIKE ''%%toilet%%flange%%'' ORDER BY name;';
    END IF;

    IF v_nroots > 1 THEN
      RAISE EXCEPTION
        'Multiple (%) distinct Toilet Flange Repair template roots matched. Resolve duplicates before running.',
        v_nroots;
    END IF;

    SELECT count(*)::integer INTO v_phase_count FROM public.project_phases pp WHERE pp.project_id = v_project_id;

    IF v_phase_count = 0 THEN
      INSERT INTO public.project_phases (id, project_id, name, description, position_rule, position_value, is_standard, is_linked)
      VALUES
        (
          'e3e3e103-1a7e-4c1d-9f01-e3e3e1030001'::uuid,
          v_project_id,
          'Assessment',
          'Expose the flange, confirm damage, and document subfloor and bolt condition.',
          'nth',
          1,
          false,
          false
        ),
        (
          'e3e3e103-1a7e-4c1d-9f01-e3e3e1030002'::uuid,
          v_project_id,
          'Repair or replace',
          'Install repair ring, spacer system, or full flange replacement per plan.',
          'nth',
          2,
          false,
          false
        ),
        (
          'e3e3e103-1a7e-4c1d-9f01-e3e3e1030003'::uuid,
          v_project_id,
          'Verification',
          'Bolt spacing, height, and stability checked before bowl setting.',
          'nth',
          3,
          false,
          false
        );
      v_prep := 'e3e3e103-1a7e-4c1d-9f01-e3e3e1030001'::uuid;
      v_repair := 'e3e3e103-1a7e-4c1d-9f01-e3e3e1030002'::uuid;
      v_verify := 'e3e3e103-1a7e-4c1d-9f01-e3e3e1030003'::uuid;
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
      INTO v_prep, v_repair, v_verify;

      IF v_prep IS NULL THEN
        RAISE EXCEPTION 'Toilet Flange Repair: project_id=% has phases but sort yielded no phase id', v_project_id;
      END IF;

      RAISE NOTICE
        'Toilet Flange Repair: attaching new operations to % existing phase(s) by order. assess_phase=%, repair_phase=%, verify_phase=%',
        v_phase_count,
        v_prep,
        v_repair,
        v_verify;
    END IF;

    INSERT INTO public.phase_operations (id, phase_id, operation_name, operation_description, display_order, estimated_time, flow_type)
    VALUES
      (
        'e3e3e103-1a7e-4c1d-9f02-e3e3e1030101'::uuid,
        v_prep,
        'Expose and inspect flange and subfloor',
        'Old wax and bolts cleared; cracks, movement, and wood integrity documented.',
        1,
        '30–60 min',
        'prime'
      ),
      (
        'e3e3e103-1a7e-4c1d-9f02-e3e3e1030102'::uuid,
        v_repair,
        'Install repair or replacement flange',
        'Hardware anchored to sound structure; outlet height and bolt slots aligned to bowl plan.',
        1,
        '45–90 min',
        'prime'
      ),
      (
        'e3e3e103-1a7e-4c1d-9f02-e3e3e1030103'::uuid,
        v_verify,
        'Verify bolt layout and stability for bowl set',
        'Dry fit confirms wax compression zone without rocking before final install.',
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
        'e3e3e103-1a7e-4c1d-9f03-e3e3e1030101'::uuid,
        'e3e3e103-1a7e-4c1d-9f02-e3e3e1030101'::uuid,
        'Remove old wax seal and closet bolts',
        'Drain path protected; flange top and bolt slots fully visible.',
        1,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'e3e3e103-1a7e-4c1d-9f03-e3e3e1030102'::uuid,
        'e3e3e103-1a7e-4c1d-9f02-e3e3e1030101'::uuid,
        'Probe flange and subfloor for movement or rot',
        'Decision recorded: repair ring, spacer, or full replacement.',
        2,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'e3e3e103-1a7e-4c1d-9f03-e3e3e1030103'::uuid,
        'e3e3e103-1a7e-4c1d-9f02-e3e3e1030102'::uuid,
        'Anchor repair hardware or new flange to structure',
        'Screws into framing or approved anchors; no reliance on rotted wood.',
        1,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'e3e3e103-1a7e-4c1d-9f03-e3e3e1030104'::uuid,
        'e3e3e103-1a7e-4c1d-9f02-e3e3e1030102'::uuid,
        'Set bolt spacing and height to bowl spec',
        'Parallel bolts at correct gauge above finished floor for wax compression.',
        2,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'e3e3e103-1a7e-4c1d-9f03-e3e3e1030105'::uuid,
        'e3e3e103-1a7e-4c1d-9f02-e3e3e1030103'::uuid,
        'Dry-fit bowl on bolts without wax',
        'Rocking and reveal checked; shims planned if needed.',
        1,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'e3e3e103-1a7e-4c1d-9f03-e3e3e1030106'::uuid,
        'e3e3e103-1a7e-4c1d-9f02-e3e3e1030103'::uuid,
        'Confirm no flex when load is applied',
        'Flange and subfloor stable under bowl weight before final wax set.',
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

    RAISE NOTICE 'Toilet Flange Repair: step 1 structure applied for project_id=%', v_project_id;
  END IF;
END $$;

-- =============================================================================
-- 4) Tile Flooring Demolition
-- =============================================================================
DO $$
DECLARE
  v_project_id uuid;
  v_nroots integer;
  v_phase_count integer;
  v_setup uuid;
  v_remove uuid;
  v_cleanup uuid;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.phase_operations po
    WHERE po.id = 'e4e4e104-1a7e-4c1d-9f02-e4e4e1040101'::uuid
  ) THEN
    RAISE NOTICE
      'Tile Flooring Demolition: step 1 structure already present (operation e4e4e104-1a7e-4c1d-9f02-e4e4e1040101); skipping';
  ELSE
    WITH RECURSIVE matched AS (
      SELECT p.id
      FROM public.projects p
      WHERE (p.is_standard IS DISTINCT FROM true)
        AND (
          lower(btrim(p.name)) IN (
            'tile flooring demolition',
            'tile floor demolition',
            'tile flooring demo',
            'tile floor demo',
            'demolition of tile flooring',
            'remove tile flooring'
          )
          OR lower(btrim(p.name)) LIKE 'tile flooring demolition%'
          OR lower(btrim(p.name)) LIKE 'tile floor demolition%'
          OR (
            strpos(lower(btrim(p.name)), 'tile') > 0
            AND strpos(lower(btrim(p.name)), 'floor') > 0
            AND (
              strpos(lower(btrim(p.name)), 'demolition') > 0
              OR strpos(lower(btrim(p.name)), ' demo') > 0
              OR lower(btrim(p.name)) LIKE '%demo %'
              OR lower(btrim(p.name)) LIKE '%remove%'
            )
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
        'No Tile Flooring Demolition template root found. '
        'Query: SELECT id, name, parent_project_id FROM projects WHERE lower(btrim(name)) LIKE ''%%tile%%floor%%'' ORDER BY name;';
    END IF;

    IF v_nroots > 1 THEN
      RAISE EXCEPTION
        'Multiple (%) distinct Tile Flooring Demolition template roots matched. Resolve duplicates before running.',
        v_nroots;
    END IF;

    SELECT count(*)::integer INTO v_phase_count FROM public.project_phases pp WHERE pp.project_id = v_project_id;

    IF v_phase_count = 0 THEN
      INSERT INTO public.project_phases (id, project_id, name, description, position_rule, position_value, is_standard, is_linked)
      VALUES
        (
          'e4e4e104-1a7e-4c1d-9f01-e4e4e1040001'::uuid,
          v_project_id,
          'Setup',
          'Protect adjacent finishes, contain dust, and stage removal tools and haul-off.',
          'nth',
          1,
          false,
          false
        ),
        (
          'e4e4e104-1a7e-4c1d-9f01-e4e4e1040002'::uuid,
          v_project_id,
          'Removal',
          'Tile and setting bed removed to expose sound substrate.',
          'nth',
          2,
          false,
          false
        ),
        (
          'e4e4e104-1a7e-4c1d-9f01-e4e4e1040003'::uuid,
          v_project_id,
          'Cleanup',
          'Debris out, substrate swept, and inspection before prep or install trades.',
          'nth',
          3,
          false,
          false
        );
      v_setup := 'e4e4e104-1a7e-4c1d-9f01-e4e4e1040001'::uuid;
      v_remove := 'e4e4e104-1a7e-4c1d-9f01-e4e4e1040002'::uuid;
      v_cleanup := 'e4e4e104-1a7e-4c1d-9f01-e4e4e1040003'::uuid;
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
      INTO v_setup, v_remove, v_cleanup;

      IF v_setup IS NULL THEN
        RAISE EXCEPTION 'Tile Flooring Demolition: project_id=% has phases but sort yielded no phase id', v_project_id;
      END IF;

      RAISE NOTICE
        'Tile Flooring Demolition: attaching new operations to % existing phase(s) by order. setup_phase=%, removal_phase=%, cleanup_phase=%',
        v_phase_count,
        v_setup,
        v_remove,
        v_cleanup;
    END IF;

    INSERT INTO public.phase_operations (id, phase_id, operation_name, operation_description, display_order, estimated_time, flow_type)
    VALUES
      (
        'e4e4e104-1a7e-4c1d-9f02-e4e4e1040101'::uuid,
        v_setup,
        'Protect finishes and contain dust',
        'Adjacent rooms, cabinets, and HVAC protected before aggressive demo starts.',
        1,
        '30–60 min',
        'prime'
      ),
      (
        'e4e4e104-1a7e-4c1d-9f02-e4e4e1040102'::uuid,
        v_remove,
        'Remove tile and mortar or thinset',
        'Field cleared to substrate without undermining walls or adjacent assemblies.',
        1,
        '2–8 hr',
        'prime'
      ),
      (
        'e4e4e104-1a7e-4c1d-9f02-e4e4e1040103'::uuid,
        v_cleanup,
        'Haul debris and inspect substrate',
        'Bags or bins out; slab or plywood checked for damage and moisture.',
        1,
        '30–90 min',
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
        'e4e4e104-1a7e-4c1d-9f03-e4e4e1040101'::uuid,
        'e4e4e104-1a7e-4c1d-9f02-e4e4e1040101'::uuid,
        'Mask openings and seal HVAC registers',
        'Dust migration limited to the work zone.',
        1,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'e4e4e104-1a7e-4c1d-9f03-e4e4e1040102'::uuid,
        'e4e4e104-1a7e-4c1d-9f02-e4e4e1040101'::uuid,
        'Lay hard protection at transitions',
        'Adjacent flooring and thresholds shielded from impact and grit.',
        2,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'e4e4e104-1a7e-4c1d-9f03-e4e4e1040103'::uuid,
        'e4e4e104-1a7e-4c1d-9f02-e4e4e1040102'::uuid,
        'Break and strip field tile',
        'Pieces lifted without levering against finished walls or cabinets.',
        1,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'e4e4e104-1a7e-4c1d-9f03-e4e4e1040104'::uuid,
        'e4e4e104-1a7e-4c1d-9f02-e4e4e1040102'::uuid,
        'Remove thinset or mortar to exposed substrate',
        'Mechanical or power prep stops at sound slab or ply without gouging.',
        2,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'e4e4e104-1a7e-4c1d-9f03-e4e4e1040105'::uuid,
        'e4e4e104-1a7e-4c1d-9f02-e4e4e1040103'::uuid,
        'Bag, bin, or wheel debris out',
        'Weight limits and disposal rules for the site followed.',
        1,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'e4e4e104-1a7e-4c1d-9f03-e4e4e1040106'::uuid,
        'e4e4e104-1a7e-4c1d-9f02-e4e4e1040103'::uuid,
        'Sweep, vacuum, and substrate inspection',
        'Cracks, moisture, and plane documented for the next trade.',
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

    RAISE NOTICE 'Tile Flooring Demolition: step 1 structure applied for project_id=%', v_project_id;
  END IF;
END $$;
