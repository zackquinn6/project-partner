-- Step 5: Tools — Tile Flooring Installation (core steps only)
-- Project: 373adcbf-0a8c-42e9-9bcb-b135c8ddbfd0
-- Bootstrap tools by name; attach JSON to core operation_steps. RAISE if unresolved.

DO $$
DECLARE
  v_project_id CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-b135c8ddbfd0'::uuid;
  v_missing text[] := ARRAY[]::text[];

  t_safety_glasses uuid;
  t_knee_pads uuid;
  t_gloves uuid;
  t_dust_mask uuid;
  t_shop_vac uuid;
  t_broom uuid;
  t_straightedge uuid;
  t_tape uuid;
  t_chalk_line uuid;
  t_level uuid;
  t_margin_trowel uuid;
  t_notched_trowel uuid;
  t_mixing_paddle uuid;
  t_drill uuid;
  t_bucket uuid;
  t_utility_knife uuid;
  t_scoring_knife uuid;
  t_carbide_cutter uuid;
  t_wet_saw uuid;
  t_nippers uuid;
  t_rubber_mallet uuid;
  t_tile_spacers uuid;
  t_grout_float uuid;
  t_sponges uuid;
  t_microfiber uuid;
  t_screw_gun uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = v_project_id) THEN
    RAISE EXCEPTION 'Project not found: %', v_project_id;
  END IF;

  INSERT INTO public.tools (name, description, specialty_scale, category)
  SELECT v.n, v.d, 1, v.c
  FROM (VALUES
    ('Safety Glasses', 'Eye protection for cutting and mixing.', 'PPE'),
    ('Knee Pads', 'Protect knees during floor work.', 'PPE'),
    ('Work Gloves', 'Cut and mortar handling protection.', 'PPE'),
    ('Dust Mask / Respirator', 'Dust control for cutting and sweeping.', 'PPE'),
    ('Shop Vacuum', 'Clean subfloor and capture cut dust.', 'Power Tool'),
    ('Broom', 'Initial debris removal before vacuum.', 'Other'),
    ('Straightedge', 'Check flatness and lippage.', 'Hand Tool'),
    ('Tape Measure', 'Layout and cut measurements.', 'Hand Tool'),
    ('Chalk Line', 'Snap layout reference lines.', 'Hand Tool'),
    ('Level', 'Check plane and slopes.', 'Hand Tool'),
    ('Margin Trowel', 'Mix edges and detail mortar.', 'Hand Tool'),
    ('Notched Trowel', 'Comb thinset for membrane and tile (size per product data).', 'Hand Tool'),
    ('Mixing Paddle', 'Mix thinset and grout in a bucket.', 'Hand Tool'),
    ('Drill / Driver', 'Drive mixing paddle and backer fasteners.', 'Power Tool'),
    ('Bucket', 'Mix mortar and grout; carry water.', 'Other'),
    ('Utility Knife', 'Cut membrane and packaging.', 'Hand Tool'),
    ('Backer Board Scoring Knife', 'Score cement board for snap cuts.', 'Hand Tool'),
    ('Carbide Tile Cutter', 'Score-and-snap straight cuts on ceramic.', 'Hand Tool'),
    ('Wet Tile Saw', 'Straight and plunge cuts; dust-suppressed cutting.', 'Power Tool'),
    ('Tile Nippers', 'Nibble curves and small adjustments.', 'Hand Tool'),
    ('Rubber Mallet', 'Beat tile into mortar without glaze damage.', 'Hand Tool'),
    ('Tile Spacers', 'Hold consistent joint width.', 'Other'),
    ('Grout Float', 'Pack grout into joints.', 'Hand Tool'),
    ('Grouting Sponges', 'Clean joints and haze.', 'Other'),
    ('Microfiber Cloths', 'Final haze wipe.', 'Other'),
    ('Screw Gun', 'Drive backer board fasteners on pattern.', 'Power Tool')
  ) AS v(n, d, c)
  WHERE NOT EXISTS (SELECT 1 FROM public.tools t WHERE t.name = v.n);

  SELECT id INTO t_safety_glasses FROM public.tools WHERE name = 'Safety Glasses' LIMIT 1;
  SELECT id INTO t_knee_pads FROM public.tools WHERE name = 'Knee Pads' LIMIT 1;
  SELECT id INTO t_gloves FROM public.tools WHERE name = 'Work Gloves' LIMIT 1;
  SELECT id INTO t_dust_mask FROM public.tools WHERE name = 'Dust Mask / Respirator' LIMIT 1;
  SELECT id INTO t_shop_vac FROM public.tools WHERE name = 'Shop Vacuum' LIMIT 1;
  SELECT id INTO t_broom FROM public.tools WHERE name = 'Broom' LIMIT 1;
  SELECT id INTO t_straightedge FROM public.tools WHERE name = 'Straightedge' LIMIT 1;
  SELECT id INTO t_tape FROM public.tools WHERE name = 'Tape Measure' LIMIT 1;
  SELECT id INTO t_chalk_line FROM public.tools WHERE name = 'Chalk Line' LIMIT 1;
  SELECT id INTO t_level FROM public.tools WHERE name = 'Level' LIMIT 1;
  SELECT id INTO t_margin_trowel FROM public.tools WHERE name = 'Margin Trowel' LIMIT 1;
  SELECT id INTO t_notched_trowel FROM public.tools WHERE name = 'Notched Trowel' LIMIT 1;
  SELECT id INTO t_mixing_paddle FROM public.tools WHERE name = 'Mixing Paddle' LIMIT 1;
  SELECT id INTO t_drill FROM public.tools WHERE name = 'Drill / Driver' LIMIT 1;
  SELECT id INTO t_bucket FROM public.tools WHERE name = 'Bucket' LIMIT 1;
  SELECT id INTO t_utility_knife FROM public.tools WHERE name = 'Utility Knife' LIMIT 1;
  SELECT id INTO t_scoring_knife FROM public.tools WHERE name = 'Backer Board Scoring Knife' LIMIT 1;
  SELECT id INTO t_carbide_cutter FROM public.tools WHERE name = 'Carbide Tile Cutter' LIMIT 1;
  SELECT id INTO t_wet_saw FROM public.tools WHERE name = 'Wet Tile Saw' LIMIT 1;
  SELECT id INTO t_nippers FROM public.tools WHERE name = 'Tile Nippers' LIMIT 1;
  SELECT id INTO t_rubber_mallet FROM public.tools WHERE name = 'Rubber Mallet' LIMIT 1;
  SELECT id INTO t_tile_spacers FROM public.tools WHERE name = 'Tile Spacers' LIMIT 1;
  SELECT id INTO t_grout_float FROM public.tools WHERE name = 'Grout Float' LIMIT 1;
  SELECT id INTO t_sponges FROM public.tools WHERE name = 'Grouting Sponges' LIMIT 1;
  SELECT id INTO t_microfiber FROM public.tools WHERE name = 'Microfiber Cloths' LIMIT 1;
  SELECT id INTO t_screw_gun FROM public.tools WHERE name = 'Screw Gun' LIMIT 1;

  IF t_safety_glasses IS NULL THEN v_missing := array_append(v_missing, 'Safety Glasses'); END IF;
  IF t_knee_pads IS NULL THEN v_missing := array_append(v_missing, 'Knee Pads'); END IF;
  IF t_gloves IS NULL THEN v_missing := array_append(v_missing, 'Work Gloves'); END IF;
  IF t_dust_mask IS NULL THEN v_missing := array_append(v_missing, 'Dust Mask / Respirator'); END IF;
  IF t_shop_vac IS NULL THEN v_missing := array_append(v_missing, 'Shop Vacuum'); END IF;
  IF t_broom IS NULL THEN v_missing := array_append(v_missing, 'Broom'); END IF;
  IF t_straightedge IS NULL THEN v_missing := array_append(v_missing, 'Straightedge'); END IF;
  IF t_tape IS NULL THEN v_missing := array_append(v_missing, 'Tape Measure'); END IF;
  IF t_chalk_line IS NULL THEN v_missing := array_append(v_missing, 'Chalk Line'); END IF;
  IF t_level IS NULL THEN v_missing := array_append(v_missing, 'Level'); END IF;
  IF t_margin_trowel IS NULL THEN v_missing := array_append(v_missing, 'Margin Trowel'); END IF;
  IF t_notched_trowel IS NULL THEN v_missing := array_append(v_missing, 'Notched Trowel'); END IF;
  IF t_mixing_paddle IS NULL THEN v_missing := array_append(v_missing, 'Mixing Paddle'); END IF;
  IF t_drill IS NULL THEN v_missing := array_append(v_missing, 'Drill / Driver'); END IF;
  IF t_bucket IS NULL THEN v_missing := array_append(v_missing, 'Bucket'); END IF;
  IF t_utility_knife IS NULL THEN v_missing := array_append(v_missing, 'Utility Knife'); END IF;
  IF t_scoring_knife IS NULL THEN v_missing := array_append(v_missing, 'Backer Board Scoring Knife'); END IF;
  IF t_carbide_cutter IS NULL THEN v_missing := array_append(v_missing, 'Carbide Tile Cutter'); END IF;
  IF t_wet_saw IS NULL THEN v_missing := array_append(v_missing, 'Wet Tile Saw'); END IF;
  IF t_nippers IS NULL THEN v_missing := array_append(v_missing, 'Tile Nippers'); END IF;
  IF t_rubber_mallet IS NULL THEN v_missing := array_append(v_missing, 'Rubber Mallet'); END IF;
  IF t_tile_spacers IS NULL THEN v_missing := array_append(v_missing, 'Tile Spacers'); END IF;
  IF t_grout_float IS NULL THEN v_missing := array_append(v_missing, 'Grout Float'); END IF;
  IF t_sponges IS NULL THEN v_missing := array_append(v_missing, 'Grouting Sponges'); END IF;
  IF t_microfiber IS NULL THEN v_missing := array_append(v_missing, 'Microfiber Cloths'); END IF;
  IF t_screw_gun IS NULL THEN v_missing := array_append(v_missing, 'Screw Gun'); END IF;

  IF array_length(v_missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Missing tools for Tile Flooring Installation step 5: %', array_to_string(v_missing, '; ');
  END IF;

  -- Clean and inspect subfloor
  UPDATE public.operation_steps SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_safety_glasses, 'item', 'Safety Glasses', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_dust_mask, 'item', 'Dust Mask / Respirator', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_broom, 'item', 'Broom', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_shop_vac, 'item', 'Shop Vacuum', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_straightedge, 'item', 'Straightedge', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_tape, 'item', 'Tape Measure', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  ) WHERE id = '17c7f59c-5920-4dfd-89ee-4394d87bb6d0'::uuid;

  -- Spread mortar for membrane
  UPDATE public.operation_steps SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_bucket, 'item', 'Bucket', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_drill, 'item', 'Drill / Driver', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_mixing_paddle, 'item', 'Mixing Paddle', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_notched_trowel, 'item', 'Notched Trowel', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_margin_trowel, 'item', 'Margin Trowel', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_knee_pads, 'item', 'Knee Pads', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  ) WHERE id = 'd6b793a9-f226-458b-ad2e-51e9ac73e875'::uuid;

  -- Embed membrane
  UPDATE public.operation_steps SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_utility_knife, 'item', 'Utility Knife', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_margin_trowel, 'item', 'Margin Trowel', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_notched_trowel, 'item', 'Notched Trowel', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_knee_pads, 'item', 'Knee Pads', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_gloves, 'item', 'Work Gloves', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  ) WHERE id = '1fa3c0bd-cf6f-4712-9bc8-121edebe676d'::uuid;

  -- Cut and fit backer
  UPDATE public.operation_steps SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_safety_glasses, 'item', 'Safety Glasses', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_dust_mask, 'item', 'Dust Mask / Respirator', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_tape, 'item', 'Tape Measure', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_scoring_knife, 'item', 'Backer Board Scoring Knife', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_utility_knife, 'item', 'Utility Knife', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false)
  ) WHERE id = '90428c0f-db43-4efe-9906-3e1469f9b7ba'::uuid;

  -- Fasten backer
  UPDATE public.operation_steps SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_screw_gun, 'item', 'Screw Gun', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_drill, 'item', 'Drill / Driver', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false),
    jsonb_build_object('coreItemId', t_notched_trowel, 'item', 'Notched Trowel', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_straightedge, 'item', 'Straightedge', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_knee_pads, 'item', 'Knee Pads', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  ) WHERE id = '5068e3a2-862e-4aff-a649-f1422bd55a04'::uuid;

  -- Tape seams
  UPDATE public.operation_steps SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_margin_trowel, 'item', 'Margin Trowel', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_notched_trowel, 'item', 'Notched Trowel', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false),
    jsonb_build_object('coreItemId', t_utility_knife, 'item', 'Utility Knife', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_gloves, 'item', 'Work Gloves', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  ) WHERE id = '5c1f80b0-1f80-4bd9-bcab-1c5d4d82f5b0'::uuid;

  -- Layout
  UPDATE public.operation_steps SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_tape, 'item', 'Tape Measure', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_chalk_line, 'item', 'Chalk Line', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_straightedge, 'item', 'Straightedge', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_level, 'item', 'Level', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  ) WHERE id = '3e6029b2-5bcc-4e4a-80dc-ba8d4cb7d620'::uuid;

  -- Cut tiles
  UPDATE public.operation_steps SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_safety_glasses, 'item', 'Safety Glasses', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_dust_mask, 'item', 'Dust Mask / Respirator', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_wet_saw, 'item', 'Wet Tile Saw', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_carbide_cutter, 'item', 'Carbide Tile Cutter', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false),
    jsonb_build_object('coreItemId', t_nippers, 'item', 'Tile Nippers', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_tape, 'item', 'Tape Measure', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  ) WHERE id = '1adef138-8919-4d07-aeaa-ea957ce3504f'::uuid;

  -- Spread mortar / coverage
  UPDATE public.operation_steps SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_bucket, 'item', 'Bucket', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_drill, 'item', 'Drill / Driver', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_mixing_paddle, 'item', 'Mixing Paddle', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_notched_trowel, 'item', 'Notched Trowel', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_margin_trowel, 'item', 'Margin Trowel', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_knee_pads, 'item', 'Knee Pads', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  ) WHERE id = '4738a5a5-8caf-4185-afa6-b8e6711e005b'::uuid;

  -- Set tile
  UPDATE public.operation_steps SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_rubber_mallet, 'item', 'Rubber Mallet', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_tile_spacers, 'item', 'Tile Spacers', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_straightedge, 'item', 'Straightedge', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_level, 'item', 'Level', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_knee_pads, 'item', 'Knee Pads', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  ) WHERE id = '876a00bb-c501-473d-8d47-e88c57fe3b71'::uuid;

  -- Prepare joints
  UPDATE public.operation_steps SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_utility_knife, 'item', 'Utility Knife', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_shop_vac, 'item', 'Shop Vacuum', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_sponges, 'item', 'Grouting Sponges', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false)
  ) WHERE id = '2e6fb34e-4d8e-4e8d-b503-dd8a6589263f'::uuid;

  -- Pack grout
  UPDATE public.operation_steps SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_bucket, 'item', 'Bucket', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_mixing_paddle, 'item', 'Mixing Paddle', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_drill, 'item', 'Drill / Driver', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_grout_float, 'item', 'Grout Float', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_sponges, 'item', 'Grouting Sponges', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_knee_pads, 'item', 'Knee Pads', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  ) WHERE id = '52a7055b-0031-4056-9d1c-ac137deb184a'::uuid;

  -- Final wash / seal
  UPDATE public.operation_steps SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_sponges, 'item', 'Grouting Sponges', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_microfiber, 'item', 'Microfiber Cloths', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_bucket, 'item', 'Bucket', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  ) WHERE id = '6c1baa26-0fbc-405e-bcf2-e393d7224d7e'::uuid;

  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(v_project_id)
  WHERE id = v_project_id;

  RAISE NOTICE 'Tile Flooring Installation step 5 tools applied for %', v_project_id;
END $$;
