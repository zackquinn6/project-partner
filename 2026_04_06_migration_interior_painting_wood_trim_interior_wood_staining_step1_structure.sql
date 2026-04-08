-- Step 1 — structure only (AI_PROJECT_DEVELOPMENT_REFERENCE.md):
-- phase_operations + operation_steps (title + one-line description).
-- No step_instructions, outputs, tools, or materials enrichment (later steps).
--
-- Templates:
--   1) Interior Painting — only phase "Wood Trim Interior Painting" (name variants); additive display_order on that phase.
--   2) Interior Wood Staining — full process map (phases if count = 0; else map ops to ordered existing phases).

-- =============================================================================
-- 1) Interior Painting — Wood Trim Interior Painting phase only
-- =============================================================================
DO $$
DECLARE
  v_project_id uuid;
  v_nroots integer;
  v_trim_phase_id uuid;
  v_phase_match_count integer;
  v_max_op_order integer;
  v_op1_order integer;
  v_op2_order integer;
  v_op3_order integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.phase_operations po
    WHERE po.id = 'a11c7001-1a7e-4c1d-9f02-a11c70010101'::uuid
  ) THEN
    RAISE NOTICE
      'Interior Painting (wood trim phase): step 1 structure already present (operation a11c7001-1a7e-4c1d-9f02-a11c70010101); skipping';
  ELSE
    WITH RECURSIVE matched AS (
      SELECT p.id
      FROM public.projects p
      WHERE (p.is_standard IS DISTINCT FROM true)
        AND (
          lower(btrim(p.name)) IN (
            'interior painting',
            'interior paint',
            'interior painting — living spaces',
            'interior painting - living spaces'
          )
          OR lower(btrim(p.name)) LIKE 'interior painting%'
          OR lower(btrim(p.name)) LIKE 'interior paint%'
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
        'No Interior Painting template root found (tried exact titles and names starting with interior painting / interior paint). '
        'Query: SELECT id, name, parent_project_id FROM projects WHERE lower(btrim(name)) LIKE ''interior paint%%'' ORDER BY name;';
    END IF;

    IF v_nroots > 1 THEN
      RAISE EXCEPTION
        'Multiple (%) distinct Interior Painting template roots matched. Resolve duplicates before running.',
        v_nroots;
    END IF;

    SELECT count(*)::integer
    INTO v_phase_match_count
    FROM public.project_phases pp
    WHERE pp.project_id = v_project_id
      AND (
        lower(btrim(pp.name)) IN (
          'wood trim interior painting',
          'wood trim interior paint',
          'interior wood trim painting',
          'interior wood trim paint',
          'interior painting — wood trim',
          'interior painting - wood trim',
          'interior painting: wood trim',
          'interior painting – wood trim'
        )
        OR (
          strpos(lower(btrim(pp.name)), 'wood trim') > 0
          AND strpos(lower(btrim(pp.name)), 'interior') > 0
          AND strpos(lower(btrim(pp.name)), 'paint') > 0
        )
      );

    IF v_phase_match_count = 0 THEN
      RAISE EXCEPTION
        'Interior Painting project_id=% has no phase matching "Wood Trim Interior Painting" (checked common spellings and wood trim + interior + paint). '
        'Query: SELECT id, name FROM project_phases WHERE project_id = % ORDER BY created_at;',
        v_project_id,
        v_project_id;
    END IF;

    IF v_phase_match_count > 1 THEN
      RAISE EXCEPTION
        'Interior Painting project_id=% has % phases matching wood trim interior paint naming; disambiguate before running.',
        v_project_id,
        v_phase_match_count;
    END IF;

    SELECT pp.id
    INTO v_trim_phase_id
    FROM public.project_phases pp
    WHERE pp.project_id = v_project_id
      AND (
        lower(btrim(pp.name)) IN (
          'wood trim interior painting',
          'wood trim interior paint',
          'interior wood trim painting',
          'interior wood trim paint',
          'interior painting — wood trim',
          'interior painting - wood trim',
          'interior painting: wood trim',
          'interior painting – wood trim'
        )
        OR (
          strpos(lower(btrim(pp.name)), 'wood trim') > 0
          AND strpos(lower(btrim(pp.name)), 'interior') > 0
          AND strpos(lower(btrim(pp.name)), 'paint') > 0
        )
      )
    ORDER BY pp.created_at ASC, pp.id ASC
    LIMIT 1;

    IF v_trim_phase_id IS NULL THEN
      RAISE EXCEPTION 'Interior Painting: phase resolution returned NULL for project_id=%', v_project_id;
    END IF;

    SELECT coalesce(max(po.display_order), 0)
    INTO v_max_op_order
    FROM public.phase_operations po
    WHERE po.phase_id = v_trim_phase_id;

    v_op1_order := v_max_op_order + 1;
    v_op2_order := v_max_op_order + 2;
    v_op3_order := v_max_op_order + 3;

    RAISE NOTICE
      'Interior Painting: attaching wood-trim operations to phase_id=% (display_order %, %, %)',
      v_trim_phase_id,
      v_op1_order,
      v_op2_order,
      v_op3_order;

    INSERT INTO public.phase_operations (id, phase_id, operation_name, operation_description, display_order, estimated_time, flow_type)
    VALUES
      (
        'a11c7001-1a7e-4c1d-9f02-a11c70010101'::uuid,
        v_trim_phase_id,
        'Prepare trim for paint',
        'Clean, scuff or degloss, fill minor defects, and mask adjacent surfaces before coatings.',
        v_op1_order,
        '45–90 min',
        'prime'
      ),
      (
        'a11c7001-1a7e-4c1d-9f02-a11c70010102'::uuid,
        v_trim_phase_id,
        'Prime bare wood and repairs',
        'Seal raw wood and patches so the finish coat dries and adheres uniformly.',
        v_op2_order,
        '30–60 min',
        'prime'
      ),
      (
        'a11c7001-1a7e-4c1d-9f02-a11c70010103'::uuid,
        v_trim_phase_id,
        'Apply finish paint to trim',
        'Build brush-and-roll coats on casing, base, and doors to planned sheen and coverage.',
        v_op3_order,
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
        'a11c7001-1a7e-4c1d-9f03-a11c70010101'::uuid,
        'a11c7001-1a7e-4c1d-9f02-a11c70010101'::uuid,
        'Mask and protect adjacent surfaces',
        'Floors, walls, and hardware covered or removed per the trim paint plan.',
        1,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'a11c7001-1a7e-4c1d-9f03-a11c70010102'::uuid,
        'a11c7001-1a7e-4c1d-9f02-a11c70010101'::uuid,
        'Scuff, clean, and spot-fill trim',
        'Gloss broken for adhesion, grease removed, and small defects filled flush.',
        2,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'a11c7001-1a7e-4c1d-9f03-a11c70010103'::uuid,
        'a11c7001-1a7e-4c1d-9f02-a11c70010102'::uuid,
        'Prime bare wood and filler',
        'Spot-prime repairs and raw wood so porosity matches the surrounding trim.',
        1,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'a11c7001-1a7e-4c1d-9f03-a11c70010104'::uuid,
        'a11c7001-1a7e-4c1d-9f02-a11c70010102'::uuid,
        'Sand primer smooth',
        'Feathered primer ready for finish without scratches telegraphing.',
        2,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'a11c7001-1a7e-4c1d-9f03-a11c70010105'::uuid,
        'a11c7001-1a7e-4c1d-9f02-a11c70010103'::uuid,
        'Apply first finish coat to trim',
        'Even wet film on planned faces without heavy buildup in corners.',
        1,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'a11c7001-1a7e-4c1d-9f03-a11c70010106'::uuid,
        'a11c7001-1a7e-4c1d-9f02-a11c70010103'::uuid,
        'Apply second coat and remove masking',
        'Recoat after appropriate dry; tape pulled on schedule to avoid tearing fresh paint.',
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

    RAISE NOTICE 'Interior Painting (wood trim phase): step 1 structure applied for project_id=%', v_project_id;
  END IF;
END $$;

-- =============================================================================
-- 2) Interior Wood Staining
-- =============================================================================
DO $$
DECLARE
  v_project_id uuid;
  v_nroots integer;
  v_phase_count integer;
  v_prep uuid;
  v_stain uuid;
  v_finish uuid;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.phase_operations po
    WHERE po.id = 'a11c8001-1a7e-4c1d-9f02-a11c80010101'::uuid
  ) THEN
    RAISE NOTICE
      'Interior Wood Staining: step 1 structure already present (operation a11c8001-1a7e-4c1d-9f02-a11c80010101); skipping';
  ELSE
    WITH RECURSIVE matched AS (
      SELECT p.id
      FROM public.projects p
      WHERE (p.is_standard IS DISTINCT FROM true)
        AND (
          lower(btrim(p.name)) IN (
            'interior wood staining',
            'interior wood stain',
            'interior wood stain project'
          )
          OR lower(btrim(p.name)) LIKE 'interior wood staining%'
          OR lower(btrim(p.name)) LIKE 'interior wood stain%'
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
        'No Interior Wood Staining template root found (tried exact titles and names starting with interior wood stain / staining). '
        'Query: SELECT id, name, parent_project_id FROM projects WHERE lower(btrim(name)) LIKE ''%%wood%%stain%%'' ORDER BY name;';
    END IF;

    IF v_nroots > 1 THEN
      RAISE EXCEPTION
        'Multiple (%) distinct Interior Wood Staining template roots matched. Resolve duplicates before running.',
        v_nroots;
    END IF;

    SELECT count(*)::integer INTO v_phase_count FROM public.project_phases pp WHERE pp.project_id = v_project_id;

    IF v_phase_count = 0 THEN
      INSERT INTO public.project_phases (id, project_id, name, description, position_rule, position_value, is_standard, is_linked)
      VALUES
        (
          'a11c8001-1a7e-4c1d-9f01-a11c80010001'::uuid,
          v_project_id,
          'Preparation',
          'Sand sequence, cleaning, and grain opened before stain touches the wood.',
          'nth',
          1,
          false,
          false
        ),
        (
          'a11c8001-1a7e-4c1d-9f01-a11c80010002'::uuid,
          v_project_id,
          'Staining',
          'Stain applied and wiped to an even color before clear coats.',
          'nth',
          2,
          false,
          false
        ),
        (
          'a11c8001-1a7e-4c1d-9f01-a11c80010003'::uuid,
          v_project_id,
          'Finishing',
          'Clear finish builds protection and final sheen over stained wood.',
          'nth',
          3,
          false,
          false
        );
      v_prep := 'a11c8001-1a7e-4c1d-9f01-a11c80010001'::uuid;
      v_stain := 'a11c8001-1a7e-4c1d-9f01-a11c80010002'::uuid;
      v_finish := 'a11c8001-1a7e-4c1d-9f01-a11c80010003'::uuid;
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
      INTO v_prep, v_stain, v_finish;

      IF v_prep IS NULL THEN
        RAISE EXCEPTION 'Interior Wood Staining: project_id=% has phases but sort yielded no phase id', v_project_id;
      END IF;

      RAISE NOTICE
        'Interior Wood Staining: attaching new operations to % existing phase(s) by order. prep_phase=%, stain_phase=%, finish_phase=%',
        v_phase_count,
        v_prep,
        v_stain,
        v_finish;
    END IF;

    INSERT INTO public.phase_operations (id, phase_id, operation_name, operation_description, display_order, estimated_time, flow_type)
    VALUES
      (
        'a11c8001-1a7e-4c1d-9f02-a11c80010101'::uuid,
        v_prep,
        'Sand and clean for stain',
        'Grit progression and dust removal so stain absorbs predictably.',
        1,
        '1–2 hr',
        'prime'
      ),
      (
        'a11c8001-1a7e-4c1d-9f02-a11c80010102'::uuid,
        v_stain,
        'Apply and wipe stain',
        'Wet surface evenly and wipe before the film sets unevenly.',
        1,
        '45–90 min',
        'prime'
      ),
      (
        'a11c8001-1a7e-4c1d-9f02-a11c80010103'::uuid,
        v_finish,
        'Apply clear finish',
        'Topcoat system builds wear resistance and sheen over stained wood.',
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
        'a11c8001-1a7e-4c1d-9f03-a11c80010101'::uuid,
        'a11c8001-1a7e-4c1d-9f02-a11c80010101'::uuid,
        'Sand through planned grit sequence',
        'Scratches from prior grit removed before moving to the next until the target smoothness.',
        1,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'a11c8001-1a7e-4c1d-9f03-a11c80010102'::uuid,
        'a11c8001-1a7e-4c1d-9f02-a11c80010101'::uuid,
        'Vacuum and tack-rag bare wood',
        'Dust lifted from pores and corners so stain does not stick to debris.',
        2,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'a11c8001-1a7e-4c1d-9f03-a11c80010103'::uuid,
        'a11c8001-1a7e-4c1d-9f02-a11c80010102'::uuid,
        'Apply stain with the grain in sections',
        'Wet area stays workable while the next section is brought to the same look.',
        1,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'a11c8001-1a7e-4c1d-9f03-a11c80010104'::uuid,
        'a11c8001-1a7e-4c1d-9f02-a11c80010102'::uuid,
        'Wipe excess and blend lap lines',
        'Rags follow grain until tone is even and no heavy edges remain.',
        2,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'a11c8001-1a7e-4c1d-9f03-a11c80010105'::uuid,
        'a11c8001-1a7e-4c1d-9f02-a11c80010103'::uuid,
        'Apply first sealer or finish coat',
        'Thin, even film per product limits without drips on vertical work.',
        1,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        NULL, NULL, NULL, NULL, NULL, true
      ),
      (
        'a11c8001-1a7e-4c1d-9f03-a11c80010106'::uuid,
        'a11c8001-1a7e-4c1d-9f02-a11c80010103'::uuid,
        'Sand lightly and apply final coat',
        'Intercoat prep and last layer match the planned sheen and thickness.',
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

    RAISE NOTICE 'Interior Wood Staining: step 1 structure applied for project_id=%', v_project_id;
  END IF;
END $$;
