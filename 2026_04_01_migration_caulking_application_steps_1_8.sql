-- Complete steps 1-8 for project development: Caulking Application
-- Project ID: dbd4d8b4-da79-4fc0-b53a-c8caa1768db1
-- One-file exception per user request due to unusually small workflow.
-- Phases expected to already exist: Removal, Application

DO $$
DECLARE
  v_project_id CONSTANT uuid := 'dbd4d8b4-da79-4fc0-b53a-c8caa1768db1'::uuid;
  v_phase_removal_id uuid;
  v_phase_application_id uuid;
  v_step_count integer;
  v_missing text[] := ARRAY[]::text[];

  t_utility_knife uuid;
  t_putty_knife uuid;
  t_caulk_gun uuid;
  t_painter_multi_tool uuid;

  m_nitrile_gloves uuid;
  m_silicon_caulk uuid;
  m_painters_caulk uuid;
  m_painter_tape uuid;
  m_spackle uuid;
  m_sandpaper uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = v_project_id) THEN
    RAISE EXCEPTION 'Project not found: %', v_project_id;
  END IF;

  SELECT pp.id
  INTO v_phase_removal_id
  FROM public.project_phases pp
  WHERE pp.project_id = v_project_id
    AND pp.name = 'Removal'
  LIMIT 1;

  IF v_phase_removal_id IS NULL THEN
    RAISE EXCEPTION 'Missing phase "%" for project_id=%', 'Removal', v_project_id;
  END IF;

  SELECT pp.id
  INTO v_phase_application_id
  FROM public.project_phases pp
  WHERE pp.project_id = v_project_id
    AND pp.name = 'Application'
  LIMIT 1;

  IF v_phase_application_id IS NULL THEN
    RAISE EXCEPTION 'Missing phase "%" for project_id=%', 'Application', v_project_id;
  END IF;

  -- =========================================================
  -- Step 1: Operations, steps, and 3-level instructions
  -- =========================================================

  INSERT INTO public.phase_operations (
    id,
    phase_id,
    operation_name,
    operation_description,
    display_order,
    estimated_time,
    flow_type
  ) VALUES
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df101'::uuid,
      v_phase_removal_id,
      'Remove failed caulk',
      'Old bead removal and substrate exposure for new sealant.',
      1,
      '10-25 min',
      'prime'
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df102'::uuid,
      v_phase_removal_id,
      'Clean and prep joint',
      'Surface cleaning and joint conditioning before new bead application.',
      2,
      '10-20 min',
      'prime'
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df103'::uuid,
      v_phase_application_id,
      'Apply silicon caulk',
      'Waterproof bead placement for wet-area joints.',
      1,
      '10-20 min',
      'prime'
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df104'::uuid,
      v_phase_application_id,
      'Apply painters caulk',
      'Paintable gap filling for dry finish joints.',
      2,
      '10-20 min',
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
    id,
    operation_id,
    step_title,
    description,
    display_order,
    materials,
    tools,
    outputs,
    process_variables,
    time_estimate_low,
    time_estimate_med,
    time_estimate_high,
    number_of_workers,
    skill_level,
    allow_content_edit
  ) VALUES
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df201'::uuid,
      '9d9ebf39-3844-4e5c-9b0f-52336a8df101'::uuid,
      'Remove loose and failed caulk',
      'Existing bead removal and joint opening.',
      1,
      '[]'::jsonb,
      '[]'::jsonb,
      jsonb_build_array(
        jsonb_build_object(
          'id', 'out-old-caulk-removed',
          'name', 'Old caulk removed',
          'description', 'Loose and failed caulk is cleared from intended joint zones.',
          'type', 'none',
          'qualityChecks', 'No remaining loose strips or surface bridges remain in the joint.'
        )
      ),
      '[]'::jsonb,
      0.08,
      0.18,
      0.35,
      1,
      'Beginner',
      true
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df202'::uuid,
      '9d9ebf39-3844-4e5c-9b0f-52336a8df102'::uuid,
      'Clean and dry the joint',
      'Contaminant removal and dry-surface preparation.',
      1,
      '[]'::jsonb,
      '[]'::jsonb,
      jsonb_build_array(
        jsonb_build_object(
          'id', 'out-contaminant-free-surface',
          'name', 'Contaminent-free surface',
          'description', 'Application zone is free of dust, soap film, oils, and loose debris before new bead placement.',
          'type', 'performance-durability',
          'qualityChecks', 'Surface wipes clean and dry with no visible dust, residue, or loose fragments.'
        )
      ),
      '[]'::jsonb,
      0.08,
      0.15,
      0.30,
      1,
      'Beginner',
      true
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df203'::uuid,
      '9d9ebf39-3844-4e5c-9b0f-52336a8df103'::uuid,
      'Cut tip and apply silicon bead',
      'Wet-area sealant bead placement.',
      1,
      '[]'::jsonb,
      '[]'::jsonb,
      jsonb_build_array(
        jsonb_build_object(
          'id', 'out-silicon-coverage',
          'name', '100% coverage on intended zones',
          'description', 'Silicon caulk fully covers the targeted wet-area joint path without skips.',
          'type', 'performance-durability',
          'qualityChecks', 'Bead remains continuous from end to end with no voids at corners, transitions, or stop points.'
        ),
        jsonb_build_object(
          'id', 'out-no-bead-over-quarter-inch',
          'name', 'No bead >1/4"',
          'description', 'Finished silicon bead stays at or below one-quarter inch maximum width.',
          'type', 'major-aesthetics',
          'qualityChecks', 'No section visually exceeds 1/4 inch width after tooling.'
        )
      ),
      '[]'::jsonb,
      0.10,
      0.18,
      0.32,
      1,
      'Intermediate',
      true
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df204'::uuid,
      '9d9ebf39-3844-4e5c-9b0f-52336a8df104'::uuid,
      'Cut tip and apply painters bead',
      'Paintable finish-joint bead placement.',
      1,
      '[]'::jsonb,
      '[]'::jsonb,
      jsonb_build_array(
        jsonb_build_object(
          'id', 'out-smooth-caulk-shape',
          'name', 'Smooth caulk shape',
          'description', 'Finished painters caulk bead has a consistent, smooth profile along the joint.',
          'type', 'major-aesthetics',
          'qualityChecks', 'Tooled bead has no chatter lines, ridges, or obvious pulls.'
        ),
        jsonb_build_object(
          'id', 'out-painters-coverage',
          'name', '100% coverage on intended zones',
          'description', 'Painters caulk fully covers the targeted finish joint path without skips.',
          'type', 'performance-durability',
          'qualityChecks', 'Joint line is continuous from end to end with no open gaps or misses.'
        ),
        jsonb_build_object(
          'id', 'out-painters-no-bead-over-quarter-inch',
          'name', 'No bead >1/4"',
          'description', 'Finished painters caulk bead stays at or below one-quarter inch maximum width.',
          'type', 'major-aesthetics',
          'qualityChecks', 'No tooled section exceeds 1/4 inch width.'
        )
      ),
      '[]'::jsonb,
      0.10,
      0.18,
      0.32,
      1,
      'Intermediate',
      true
    )
  ON CONFLICT (id) DO UPDATE SET
    operation_id = EXCLUDED.operation_id,
    step_title = EXCLUDED.step_title,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    outputs = EXCLUDED.outputs,
    time_estimate_low = EXCLUDED.time_estimate_low,
    time_estimate_med = EXCLUDED.time_estimate_med,
    time_estimate_high = EXCLUDED.time_estimate_high,
    number_of_workers = EXCLUDED.number_of_workers,
    skill_level = EXCLUDED.skill_level,
    allow_content_edit = EXCLUDED.allow_content_edit;

  INSERT INTO public.step_instructions (step_id, instruction_level, content)
  VALUES
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df201'::uuid,
      'beginner',
      jsonb_build_array(
        jsonb_build_object('title','Removal path','content','Score both bead edges before lifting material out of the joint. Pull loose sections first, then slice tight sections in short passes.','type','standard'),
        jsonb_build_object('title','Control damage','content','Keep blade pressure on the old caulk, not on the finish surface.','type','warning'),
        jsonb_build_object('title','Output check','content','No loose or detached caulk remains in the target zone.','type','tip')
      )
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df201'::uuid,
      'intermediate',
      jsonb_build_array(
        jsonb_build_object('title','Edge release','content','Break adhesion at both substrate faces before pulling. Avoid stretching old bead across clean surfaces.','type','standard'),
        jsonb_build_object('title','Joint preservation','content','Stop and rescore if the bead resists; do not pry hard enough to chip tile, trim, or drywall paper.','type','warning')
      )
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df201'::uuid,
      'advanced',
      jsonb_build_array(
        jsonb_build_object('title','Failure prevention','content','Any remnant left proud in the joint will telegraph through the new bead and reduce adhesion continuity.','type','warning'),
        jsonb_build_object('title','Acceptance criteria','content','Joint faces are exposed and free of loose sealant bridges.','type','standard')
      )
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df202'::uuid,
      'beginner',
      jsonb_build_array(
        jsonb_build_object('title','Surface prep','content','Wipe out dust and residue from the opened joint, then let the area dry fully before applying new caulk.','type','standard'),
        jsonb_build_object('title','Why it matters','content','Fresh caulk will not bond well to soap film, sanding dust, or damp residue.','type','warning'),
        jsonb_build_object('title','Output check','content','Surface is visibly clean, dry, and ready for bead placement.','type','tip')
      )
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df202'::uuid,
      'intermediate',
      jsonb_build_array(
        jsonb_build_object('title','Joint conditioning','content','Remove residual particles at corners and profile changes before final wipe-down.','type','standard'),
        jsonb_build_object('title','Stop condition','content','If the joint is still damp, wait. Do not trap moisture under a new bead.','type','warning')
      )
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df202'::uuid,
      'advanced',
      jsonb_build_array(
        jsonb_build_object('title','Adhesion gate','content','Substrate cleanliness is a hard gate; incomplete prep creates bond failure even when bead shape looks acceptable.','type','warning'),
        jsonb_build_object('title','Acceptance criteria','content','Joint faces present clean, dry, contamination-free contact surfaces.','type','standard')
      )
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df203'::uuid,
      'beginner',
      jsonb_build_array(
        jsonb_build_object('title','Tip setup','content','Cut the silicon tube tip on an angle with a small opening first. You can enlarge the opening later, but you cannot make it smaller.','type','standard'),
        jsonb_build_object('title','Bead placement','content','Pull a steady bead through the full wet-area joint so the sealant touches both sides of the gap continuously.','type','standard'),
        jsonb_build_object('title','Output checks','content','Bead stays continuous and does not exceed 1/4 inch width.','type','tip')
      )
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df203'::uuid,
      'intermediate',
      jsonb_build_array(
        jsonb_build_object('title','Wet-area focus','content','Prioritize complete waterproof joint contact at corners, fixture transitions, and splash zones.','type','standard'),
        jsonb_build_object('title','Control bead size','content','If the bead starts bulking beyond the target profile, stop and correct feed speed or tip size before continuing.','type','warning')
      )
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df203'::uuid,
      'advanced',
      jsonb_build_array(
        jsonb_build_object('title','Root cause control','content','Oversized tip diameter increases material discharge fast and makes quarter-inch bead control difficult, especially at short joints and corners.','type','warning'),
        jsonb_build_object('title','Acceptance criteria','content','Continuous silicon bead covers the intended wet-area zone with controlled width.','type','standard')
      )
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df204'::uuid,
      'beginner',
      jsonb_build_array(
        jsonb_build_object('title','Tip setup','content','Cut the painters caulk tube tip on an angle with a small opening matched to the finish joint.','type','standard'),
        jsonb_build_object('title','Bead placement','content','Run a steady bead along the trim or drywall joint, then smooth it to an even finish-ready profile.','type','standard'),
        jsonb_build_object('title','Output checks','content','Finished bead is smooth, continuous, and no wider than 1/4 inch.','type','tip')
      )
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df204'::uuid,
      'intermediate',
      jsonb_build_array(
        jsonb_build_object('title','Finish-joint focus','content','Keep the bead narrow and consistent so it disappears into the paint line instead of reading as a heavy filler strip.','type','standard'),
        jsonb_build_object('title','Profile control','content','If the joint starts crowning or smearing past the target line, reduce output and retool immediately.','type','warning')
      )
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df204'::uuid,
      'advanced',
      jsonb_build_array(
        jsonb_build_object('title','Aesthetic gate','content','Painters caulk is judged heavily by profile smoothness and width discipline; oversized bead shape creates visible finish defects even when coverage is complete.','type','warning'),
        jsonb_build_object('title','Acceptance criteria','content','Bead reads as a smooth, narrow finish joint with full coverage.','type','standard')
      )
    )
  ON CONFLICT (step_id, instruction_level) DO UPDATE
  SET content = EXCLUDED.content;

  -- =========================================================
  -- Step 3: Project risks (timeline/budget only)
  -- =========================================================

  INSERT INTO public.project_risks (
    id, project_id, display_order, risk_title, risk_description,
    likelihood, severity,
    schedule_impact_low_days, schedule_impact_high_days,
    budget_impact_low, budget_impact_high,
    mitigation_strategy, mitigation_actions, recommendation, benefit
  ) VALUES
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df301'::uuid,
      v_project_id,
      1,
      'Hidden substrate cleanup expands scope',
      'Old caulk removal exposes more residue, patching, or sanding than expected, extending prep time before application can start.',
      'medium',
      'medium',
      0,
      1,
      0,
      40,
      'Treat cleanup as a hard gate before bead placement and stage patch/prep materials in advance.',
      jsonb_build_array(
        jsonb_build_object('action','Inspect the full joint length after first removal pass','benefit','Reveals expanded prep scope early','completed',false),
        jsonb_build_object('action','Keep light patch and finish-prep materials on hand','benefit','Avoids a mid-job store run','completed',false)
      ),
      'Do not schedule application assuming removal will be instant.',
      'If this occurs, prep work becomes the critical path for the project.'
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df302'::uuid,
      v_project_id,
      2,
      'Wrong caulk type or missing tube',
      'The required silicon or painters caulk is missing or mismatched to the joint type, delaying application and creating a replacement purchase.',
      'medium',
      'medium',
      0,
      1,
      8,
      35,
      'Separate wet-area and paintable-joint materials before work starts and confirm tube type per joint.',
      jsonb_build_array(
        jsonb_build_object('action','Stage silicon caulk only for wet-area joints and painters caulk only for finish joints','benefit','Prevents wrong-material rework and delay','completed',false),
        jsonb_build_object('action','Check tube labels before cutting tips','benefit','Avoids wasting the wrong product','completed',false)
      ),
      'Make material type verification part of setup, not an afterthought.',
      'If this occurs, the project pauses while the correct sealant is sourced.'
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df303'::uuid,
      v_project_id,
      3,
      'Dry time blocks same-day turnover',
      'Surface drying or cure-sensitive occupancy constraints prevent immediate return to service or painting.',
      'medium',
      'medium',
      0,
      2,
      0,
      25,
      'Match work timing to substrate dryness and downstream use so the bead is not rushed into service.',
      jsonb_build_array(
        jsonb_build_object('action','Verify joints are dry before application','benefit','Reduces cure disruption and rework','completed',false),
        jsonb_build_object('action','Schedule work around shower use or paint sequencing','benefit','Avoids accidental disturbance during cure','completed',false)
      ),
      'Treat dry-time and cure windows as a schedule constraint.',
      'If this occurs, closeout or downstream finishing shifts into a later work window.'
    )
  ON CONFLICT (id) DO UPDATE SET
    project_id = EXCLUDED.project_id,
    display_order = EXCLUDED.display_order,
    risk_title = EXCLUDED.risk_title,
    risk_description = EXCLUDED.risk_description,
    likelihood = EXCLUDED.likelihood,
    severity = EXCLUDED.severity,
    schedule_impact_low_days = EXCLUDED.schedule_impact_low_days,
    schedule_impact_high_days = EXCLUDED.schedule_impact_high_days,
    budget_impact_low = EXCLUDED.budget_impact_low,
    budget_impact_high = EXCLUDED.budget_impact_high,
    mitigation_strategy = EXCLUDED.mitigation_strategy,
    mitigation_actions = EXCLUDED.mitigation_actions,
    recommendation = EXCLUDED.recommendation,
    benefit = EXCLUDED.benefit;

  -- =========================================================
  -- Steps 4-5: Tools and materials libraries + step attachments
  -- =========================================================

  INSERT INTO public.tools (name, description, specialty_scale, category)
  SELECT v.n, v.d, 1, v.c
  FROM (VALUES
    ('Utility Knife', 'Cut and release old caulk and trim tube tips.', 'Hand Tool'),
    ('Putty Knife', 'Lift old caulk and scrape remaining residue from the joint.', 'Hand Tool'),
    ('Caulk Gun', 'Dispense controlled bead output from caulk tubes.', 'Hand Tool'),
    ('Painter''s Multi-Tool', 'Clean edges and help finish narrow trim joints.', 'Hand Tool')
  ) AS v(n, d, c)
  WHERE NOT EXISTS (SELECT 1 FROM public.tools t WHERE t.name = v.n);

  -- Accept either legacy or current caulk names, but fail if neither exists after bootstrap.
  INSERT INTO public.materials (name, description, category, unit, unit_size, avg_cost_per_unit, is_rental_available)
  SELECT v.n, v.d, v.c, v.u, v.us, v.cost, false
  FROM (VALUES
    ('Nitrile gloves', 'Disposable hand protection for removal, cleaning, and caulk application.', 'PPE', 'box', '100-count', 21.87),
    ('Painters Tape', 'Temporary masking tape for clean bead edges on finish joints.', 'Consumable', 'roll', '1.88 in x 60 yd', 5.99),
    ('Spackle', 'Minor patch material for small finish defects exposed during bead removal.', 'Consumable', 'tub', '32 fl oz', 8.99),
    ('Sandpaper', 'Finish-prep abrasive for smoothing small patched areas before painters caulk.', 'Consumable', 'pack', '5 sheets', 15.42)
  ) AS v(n, d, c, u, us, cost)
  WHERE NOT EXISTS (SELECT 1 FROM public.materials m WHERE m.name = v.n);

  SELECT id INTO t_utility_knife FROM public.tools WHERE name = 'Utility Knife' LIMIT 1;
  IF t_utility_knife IS NULL THEN v_missing := array_append(v_missing, 'Tool: Utility Knife'); END IF;

  SELECT id INTO t_putty_knife FROM public.tools WHERE name = 'Putty Knife' LIMIT 1;
  IF t_putty_knife IS NULL THEN v_missing := array_append(v_missing, 'Tool: Putty Knife'); END IF;

  SELECT id INTO t_caulk_gun FROM public.tools WHERE name = 'Caulk Gun' LIMIT 1;
  IF t_caulk_gun IS NULL THEN v_missing := array_append(v_missing, 'Tool: Caulk Gun'); END IF;

  SELECT id INTO t_painter_multi_tool FROM public.tools WHERE name = 'Painter''s Multi-Tool' LIMIT 1;
  IF t_painter_multi_tool IS NULL THEN v_missing := array_append(v_missing, 'Tool: Painter''s Multi-Tool'); END IF;

  SELECT id
  INTO m_nitrile_gloves
  FROM public.materials
  WHERE lower(name) = 'nitrile gloves'
  LIMIT 1;
  IF m_nitrile_gloves IS NULL THEN v_missing := array_append(v_missing, 'Material: Nitrile gloves'); END IF;

  SELECT id
  INTO m_silicon_caulk
  FROM public.materials
  WHERE lower(name) IN ('silicon caulk', 'silicone caulk')
  ORDER BY CASE WHEN lower(name) = 'silicon caulk' THEN 0 ELSE 1 END
  LIMIT 1;
  IF m_silicon_caulk IS NULL THEN v_missing := array_append(v_missing, 'Material: Silicon caulk'); END IF;

  SELECT id
  INTO m_painters_caulk
  FROM public.materials
  WHERE lower(name) IN ('painters caulk', 'painter''s caulk')
  ORDER BY CASE WHEN lower(name) = 'painters caulk' THEN 0 ELSE 1 END
  LIMIT 1;
  IF m_painters_caulk IS NULL THEN v_missing := array_append(v_missing, 'Material: Painters caulk'); END IF;

  SELECT id INTO m_painter_tape FROM public.materials WHERE name = 'Painters Tape' LIMIT 1;
  IF m_painter_tape IS NULL THEN v_missing := array_append(v_missing, 'Material: Painters Tape'); END IF;

  SELECT id INTO m_spackle FROM public.materials WHERE name = 'Spackle' LIMIT 1;
  IF m_spackle IS NULL THEN v_missing := array_append(v_missing, 'Material: Spackle'); END IF;

  SELECT id INTO m_sandpaper FROM public.materials WHERE name = 'Sandpaper' LIMIT 1;
  IF m_sandpaper IS NULL THEN v_missing := array_append(v_missing, 'Material: Sandpaper'); END IF;

  IF array_length(v_missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Missing required library items for Caulking Application: %', array_to_string(v_missing, '; ');
  END IF;

  UPDATE public.operation_steps
  SET tools = jsonb_build_array(
        jsonb_build_object('coreItemId', t_utility_knife, 'item', 'Utility Knife', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
        jsonb_build_object('coreItemId', t_putty_knife, 'item', 'Putty Knife', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false)
      ),
      materials = jsonb_build_array(
        jsonb_build_object('coreItemId', m_nitrile_gloves, 'item', 'Nitrile gloves', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
      )
  WHERE id = '9d9ebf39-3844-4e5c-9b0f-52336a8df201'::uuid;

  UPDATE public.operation_steps
  SET tools = jsonb_build_array(
        jsonb_build_object('coreItemId', t_putty_knife, 'item', 'Putty Knife', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false)
      ),
      materials = jsonb_build_array(
        jsonb_build_object('coreItemId', m_nitrile_gloves, 'item', 'Nitrile gloves', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
        jsonb_build_object('coreItemId', m_spackle, 'item', 'Spackle', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false),
        jsonb_build_object('coreItemId', m_sandpaper, 'item', 'Sandpaper', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false)
      )
  WHERE id = '9d9ebf39-3844-4e5c-9b0f-52336a8df202'::uuid;

  UPDATE public.operation_steps
  SET tools = jsonb_build_array(
        jsonb_build_object('coreItemId', t_utility_knife, 'item', 'Utility Knife', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false),
        jsonb_build_object('coreItemId', t_caulk_gun, 'item', 'Caulk Gun', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
      ),
      materials = jsonb_build_array(
        jsonb_build_object('coreItemId', m_nitrile_gloves, 'item', 'Nitrile gloves', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false),
        jsonb_build_object('coreItemId', m_silicon_caulk, 'item', 'Silicon caulk', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
      )
  WHERE id = '9d9ebf39-3844-4e5c-9b0f-52336a8df203'::uuid;

  UPDATE public.operation_steps
  SET tools = jsonb_build_array(
        jsonb_build_object('coreItemId', t_utility_knife, 'item', 'Utility Knife', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false),
        jsonb_build_object('coreItemId', t_caulk_gun, 'item', 'Caulk Gun', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
        jsonb_build_object('coreItemId', t_painter_multi_tool, 'item', 'Painter''s Multi-Tool', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false)
      ),
      materials = jsonb_build_array(
        jsonb_build_object('coreItemId', m_nitrile_gloves, 'item', 'Nitrile gloves', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false),
        jsonb_build_object('coreItemId', m_painters_caulk, 'item', 'Painters caulk', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
        jsonb_build_object('coreItemId', m_painter_tape, 'item', 'Painters Tape', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false)
      )
  WHERE id = '9d9ebf39-3844-4e5c-9b0f-52336a8df204'::uuid;

  -- =========================================================
  -- Step 6: Process variables
  -- =========================================================

  UPDATE public.operation_steps
  SET process_variables = jsonb_build_array(
    jsonb_build_object(
      'id', 'caulk-pv-old-bead-release',
      'name', 'Old bead release completeness',
      'type', 'process',
      'description', 'Extent of separation before lifting old caulk. Too low: torn remnants stay bonded; too aggressive: finish damage. Target: bead edges fully released before pull-out.',
      'required', true
    )
  )
  WHERE id = '9d9ebf39-3844-4e5c-9b0f-52336a8df201'::uuid;

  UPDATE public.operation_steps
  SET process_variables = jsonb_build_array(
    jsonb_build_object(
      'id', 'caulk-pv-surface-dryness',
      'name', 'Surface dryness before application',
      'type', 'process',
      'description', 'Residual moisture present at the joint before new bead placement. Too wet: weak adhesion and cure issues; excessive waiting: schedule drag. Target: visibly dry contact surfaces before application.',
      'required', true
    )
  )
  WHERE id = '9d9ebf39-3844-4e5c-9b0f-52336a8df202'::uuid;

  UPDATE public.operation_steps
  SET process_variables = jsonb_build_array(
    jsonb_build_object(
      'id', 'caulk-pv-silicon-tip-angle',
      'name', 'Tip cut angle',
      'type', 'process',
      'description', 'Angle of the tube tip relative to the joint path. Too blunt: poor corner entry and control; too sharp: unstable feed edge. Target: approximately 30-45 degrees for controlled wet-area placement.',
      'required', true,
      'unit', 'degrees'
    ),
    jsonb_build_object(
      'id', 'caulk-pv-silicon-tip-diameter',
      'name', 'Tip diameter',
      'type', 'process',
      'description', 'Opening size at the cut tip. Too small: skips and poor contact; too large: excessive discharge and bead width growth beyond target. Target: opening sized to maintain bead at or below 1/4 inch.',
      'required', true,
      'unit', 'inches'
    )
  )
  WHERE id = '9d9ebf39-3844-4e5c-9b0f-52336a8df203'::uuid;

  UPDATE public.operation_steps
  SET process_variables = jsonb_build_array(
    jsonb_build_object(
      'id', 'caulk-pv-painters-tip-angle',
      'name', 'Tip cut angle',
      'type', 'process',
      'description', 'Angle of the tube tip relative to the finish joint path. Too blunt: poor steering; too sharp: uneven edge tracking. Target: approximately 30-45 degrees for narrow finish-joint control.',
      'required', true,
      'unit', 'degrees'
    ),
    jsonb_build_object(
      'id', 'caulk-pv-painters-tip-diameter',
      'name', 'Tip diameter',
      'type', 'process',
      'description', 'Opening size at the cut tip. Too small: broken coverage; too large: oversized profile and difficult finish smoothing. Target: opening sized to keep the bead smooth and at or below 1/4 inch.',
      'required', true,
      'unit', 'inches'
    )
  )
  WHERE id = '9d9ebf39-3844-4e5c-9b0f-52336a8df204'::uuid;

  -- =========================================================
  -- Step 8: PFMEA
  -- =========================================================

  SELECT COUNT(*)
  INTO v_step_count
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id;

  IF v_step_count = 0 THEN
    RAISE EXCEPTION 'No operation_steps for project_id=%', v_project_id;
  END IF;

  INSERT INTO public.pfmea_failure_modes (
    id, project_id, operation_step_id, requirement_output_id, failure_mode, severity_score
  ) VALUES
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df801'::uuid,
      v_project_id,
      '9d9ebf39-3844-4e5c-9b0f-52336a8df202'::uuid,
      'out-contaminant-free-surface',
      'Surface contamination present',
      7
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df802'::uuid,
      v_project_id,
      '9d9ebf39-3844-4e5c-9b0f-52336a8df203'::uuid,
      'out-silicon-coverage',
      '<100% coverage',
      8
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df803'::uuid,
      v_project_id,
      '9d9ebf39-3844-4e5c-9b0f-52336a8df203'::uuid,
      'out-no-bead-over-quarter-inch',
      'Bead >1/4"',
      6
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df804'::uuid,
      v_project_id,
      '9d9ebf39-3844-4e5c-9b0f-52336a8df204'::uuid,
      'out-smooth-caulk-shape',
      'Irregular caulk shape',
      5
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df805'::uuid,
      v_project_id,
      '9d9ebf39-3844-4e5c-9b0f-52336a8df204'::uuid,
      'out-painters-coverage',
      '<100% coverage',
      7
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df806'::uuid,
      v_project_id,
      '9d9ebf39-3844-4e5c-9b0f-52336a8df204'::uuid,
      'out-painters-no-bead-over-quarter-inch',
      'Bead >1/4"',
      5
    )
  ON CONFLICT (id) DO UPDATE SET
    project_id = EXCLUDED.project_id,
    operation_step_id = EXCLUDED.operation_step_id,
    requirement_output_id = EXCLUDED.requirement_output_id,
    failure_mode = EXCLUDED.failure_mode,
    severity_score = EXCLUDED.severity_score;

  INSERT INTO public.pfmea_potential_effects (id, failure_mode_id, effect_description, severity_score)
  VALUES
    ('9d9ebf39-3844-4e5c-9b0f-52336a8dfe01'::uuid, '9d9ebf39-3844-4e5c-9b0f-52336a8df801'::uuid, 'Bond failure or early caulk separation from the substrate', 7),
    ('9d9ebf39-3844-4e5c-9b0f-52336a8dfe02'::uuid, '9d9ebf39-3844-4e5c-9b0f-52336a8df802'::uuid, 'Wet-area gaps allow water entry behind finish surfaces', 8),
    ('9d9ebf39-3844-4e5c-9b0f-52336a8dfe03'::uuid, '9d9ebf39-3844-4e5c-9b0f-52336a8df803'::uuid, 'Oversized wet-area bead traps dirt and looks visibly heavy', 6),
    ('9d9ebf39-3844-4e5c-9b0f-52336a8dfe04'::uuid, '9d9ebf39-3844-4e5c-9b0f-52336a8df804'::uuid, 'Finish joint remains visibly rough after paint or close viewing', 5),
    ('9d9ebf39-3844-4e5c-9b0f-52336a8dfe05'::uuid, '9d9ebf39-3844-4e5c-9b0f-52336a8df805'::uuid, 'Open finish-joint sections remain unsealed and visible', 7),
    ('9d9ebf39-3844-4e5c-9b0f-52336a8dfe06'::uuid, '9d9ebf39-3844-4e5c-9b0f-52336a8df806'::uuid, 'Oversized finish bead requires rework and additional cleanup', 5)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.pfmea_potential_causes (id, failure_mode_id, cause_description, occurrence_score)
  VALUES
    ('9d9ebf39-3844-4e5c-9b0f-52336a8dfc01'::uuid, '9d9ebf39-3844-4e5c-9b0f-52336a8df801'::uuid, 'Dust, soap film, or sanding residue left in the joint before bead placement', 5),
    ('9d9ebf39-3844-4e5c-9b0f-52336a8dfc02'::uuid, '9d9ebf39-3844-4e5c-9b0f-52336a8df802'::uuid, 'Feed path breaks at corners or transitions, leaving skips in the wet-area joint', 4),
    ('9d9ebf39-3844-4e5c-9b0f-52336a8dfc03'::uuid, '9d9ebf39-3844-4e5c-9b0f-52336a8df803'::uuid, 'Tip cut too large causes excessive silicon discharge', 6),
    ('9d9ebf39-3844-4e5c-9b0f-52336a8dfc04'::uuid, '9d9ebf39-3844-4e5c-9b0f-52336a8df804'::uuid, 'Tooling pressure or pass speed varies and leaves chatter or ridges', 5),
    ('9d9ebf39-3844-4e5c-9b0f-52336a8dfc05'::uuid, '9d9ebf39-3844-4e5c-9b0f-52336a8df805'::uuid, 'Painters bead is interrupted before the joint is fully covered', 4),
    ('9d9ebf39-3844-4e5c-9b0f-52336a8dfc06'::uuid, '9d9ebf39-3844-4e5c-9b0f-52336a8df806'::uuid, 'Tip cut too large causes oversized painters bead profile', 6)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.pfmea_controls (
    id, failure_mode_id, cause_id, control_type, control_description, detection_score
  ) VALUES
    ('9d9ebf39-3844-4e5c-9b0f-52336a8df701'::uuid, '9d9ebf39-3844-4e5c-9b0f-52336a8df801'::uuid, NULL, 'detection', 'Visual and wipe check confirms the joint is clean and dry before application', 7),
    ('9d9ebf39-3844-4e5c-9b0f-52336a8df702'::uuid, '9d9ebf39-3844-4e5c-9b0f-52336a8df802'::uuid, NULL, 'detection', 'Continuous visual trace confirms the bead touches the full intended wet-area path', 7),
    ('9d9ebf39-3844-4e5c-9b0f-52336a8df703'::uuid, '9d9ebf39-3844-4e5c-9b0f-52336a8df803'::uuid, NULL, 'detection', 'Visual width check confirms no silicon section exceeds a quarter inch', 8),
    ('9d9ebf39-3844-4e5c-9b0f-52336a8df704'::uuid, '9d9ebf39-3844-4e5c-9b0f-52336a8df804'::uuid, NULL, 'detection', 'Finish-profile inspection catches ridges, chatter, or dragged edges', 7),
    ('9d9ebf39-3844-4e5c-9b0f-52336a8df705'::uuid, '9d9ebf39-3844-4e5c-9b0f-52336a8df805'::uuid, NULL, 'detection', 'Line-of-sight inspection confirms painters bead covers the full intended joint', 7),
    ('9d9ebf39-3844-4e5c-9b0f-52336a8df706'::uuid, '9d9ebf39-3844-4e5c-9b0f-52336a8df806'::uuid, NULL, 'detection', 'Visual profile check confirms no painters bead section exceeds a quarter inch', 8)
  ON CONFLICT (id) DO UPDATE SET
    control_description = EXCLUDED.control_description,
    detection_score = EXCLUDED.detection_score;

  -- Refresh template cache for app rendering
  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(v_project_id)
  WHERE id = v_project_id;
END $$;
