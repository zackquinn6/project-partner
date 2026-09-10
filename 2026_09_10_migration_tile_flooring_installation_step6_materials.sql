-- Step 6: Materials — Tile Flooring Installation (core steps only)
-- Repeats Step 5 tool bootstrap; attaches materials JSON. RAISE if unresolved.

DO $$
DECLARE
  v_project_id CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-b135c8ddbfd0'::uuid;
  v_missing text[] := ARRAY[]::text[];

  m_membrane uuid;
  m_thinset_membrane uuid;
  m_backer uuid;
  m_backer_screws uuid;
  m_alkali_tape uuid;
  m_thinset_tile uuid;
  m_tile uuid;
  m_spacers uuid;
  m_grout uuid;
  m_grout_sealer uuid;
  m_trash_bags uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = v_project_id) THEN
    RAISE EXCEPTION 'Project not found: %', v_project_id;
  END IF;

  -- Same tools bootstrap as step 5
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

  INSERT INTO public.materials (name, description, category, unit)
  SELECT v.n, v.d, v.c, v.u
  FROM (VALUES
    ('Uncoupling Membrane', 'Sheet membrane system bonded with manufacturer mortar.', 'Components', 'sq ft'),
    ('Membrane Thinset', 'Mortar specified by membrane manufacturer for embedment.', 'Consumables', 'bag'),
    ('Cement Backer Board', 'Cementitious underlayment panels for tile over wood.', 'Components', 'sheet'),
    ('Backer Board Screws', 'Corrosion-resistant fasteners for cement board.', 'Components', 'box'),
    ('Alkali-Resistant Seam Tape', 'Tape or mesh for backer board seams.', 'Consumables', 'roll'),
    ('Tile Thinset Mortar', 'Modified thinset matched to tile and substrate.', 'Consumables', 'bag'),
    ('Floor Tile', 'Floor tile for the planned layout (type per design).', 'Components', 'sq ft'),
    ('Tile Spacer Pack', 'Disposable spacers for joint width control.', 'Consumables', 'pack'),
    ('Floor Grout', 'Sanded or unsanded grout per joint width.', 'Consumables', 'bag'),
    ('Penetrating Grout Sealer', 'Sealer when grout manufacturer requires it.', 'Consumables', 'bottle'),
    ('Trash Bags', 'Contain cutoffs, empty bags, and job scrap.', 'Consumables', 'each')
  ) AS v(n, d, c, u)
  WHERE NOT EXISTS (SELECT 1 FROM public.materials m WHERE m.name = v.n);

  SELECT id INTO m_membrane FROM public.materials WHERE name = 'Uncoupling Membrane' LIMIT 1;
  SELECT id INTO m_thinset_membrane FROM public.materials WHERE name = 'Membrane Thinset' LIMIT 1;
  SELECT id INTO m_backer FROM public.materials WHERE name = 'Cement Backer Board' LIMIT 1;
  SELECT id INTO m_backer_screws FROM public.materials WHERE name = 'Backer Board Screws' LIMIT 1;
  SELECT id INTO m_alkali_tape FROM public.materials WHERE name = 'Alkali-Resistant Seam Tape' LIMIT 1;
  SELECT id INTO m_thinset_tile FROM public.materials WHERE name = 'Tile Thinset Mortar' LIMIT 1;
  SELECT id INTO m_tile FROM public.materials WHERE name = 'Floor Tile' LIMIT 1;
  SELECT id INTO m_spacers FROM public.materials WHERE name = 'Tile Spacer Pack' LIMIT 1;
  SELECT id INTO m_grout FROM public.materials WHERE name = 'Floor Grout' LIMIT 1;
  SELECT id INTO m_grout_sealer FROM public.materials WHERE name = 'Penetrating Grout Sealer' LIMIT 1;
  SELECT id INTO m_trash_bags FROM public.materials WHERE name = 'Trash Bags' LIMIT 1;

  IF m_membrane IS NULL THEN v_missing := array_append(v_missing, 'Uncoupling Membrane'); END IF;
  IF m_thinset_membrane IS NULL THEN v_missing := array_append(v_missing, 'Membrane Thinset'); END IF;
  IF m_backer IS NULL THEN v_missing := array_append(v_missing, 'Cement Backer Board'); END IF;
  IF m_backer_screws IS NULL THEN v_missing := array_append(v_missing, 'Backer Board Screws'); END IF;
  IF m_alkali_tape IS NULL THEN v_missing := array_append(v_missing, 'Alkali-Resistant Seam Tape'); END IF;
  IF m_thinset_tile IS NULL THEN v_missing := array_append(v_missing, 'Tile Thinset Mortar'); END IF;
  IF m_tile IS NULL THEN v_missing := array_append(v_missing, 'Floor Tile'); END IF;
  IF m_spacers IS NULL THEN v_missing := array_append(v_missing, 'Tile Spacer Pack'); END IF;
  IF m_grout IS NULL THEN v_missing := array_append(v_missing, 'Floor Grout'); END IF;
  IF m_grout_sealer IS NULL THEN v_missing := array_append(v_missing, 'Penetrating Grout Sealer'); END IF;
  IF m_trash_bags IS NULL THEN v_missing := array_append(v_missing, 'Trash Bags'); END IF;

  IF array_length(v_missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Missing materials for Tile Flooring Installation step 6: %', array_to_string(v_missing, '; ');
  END IF;

  UPDATE public.operation_steps SET materials = jsonb_build_array(
    jsonb_build_object('coreItemId', m_trash_bags, 'item', 'Trash Bags', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  ) WHERE id = '17c7f59c-5920-4dfd-89ee-4394d87bb6d0'::uuid;

  UPDATE public.operation_steps SET materials = jsonb_build_array(
    jsonb_build_object('coreItemId', m_thinset_membrane, 'item', 'Membrane Thinset', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  ) WHERE id = 'd6b793a9-f226-458b-ad2e-51e9ac73e875'::uuid;

  UPDATE public.operation_steps SET materials = jsonb_build_array(
    jsonb_build_object('coreItemId', m_membrane, 'item', 'Uncoupling Membrane', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', m_thinset_membrane, 'item', 'Membrane Thinset', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  ) WHERE id = '1fa3c0bd-cf6f-4712-9bc8-121edebe676d'::uuid;

  UPDATE public.operation_steps SET materials = jsonb_build_array(
    jsonb_build_object('coreItemId', m_backer, 'item', 'Cement Backer Board', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  ) WHERE id = '90428c0f-db43-4efe-9906-3e1469f9b7ba'::uuid;

  UPDATE public.operation_steps SET materials = jsonb_build_array(
    jsonb_build_object('coreItemId', m_backer, 'item', 'Cement Backer Board', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', m_backer_screws, 'item', 'Backer Board Screws', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', m_thinset_tile, 'item', 'Tile Thinset Mortar', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false)
  ) WHERE id = '5068e3a2-862e-4aff-a649-f1422bd55a04'::uuid;

  UPDATE public.operation_steps SET materials = jsonb_build_array(
    jsonb_build_object('coreItemId', m_alkali_tape, 'item', 'Alkali-Resistant Seam Tape', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', m_thinset_tile, 'item', 'Tile Thinset Mortar', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  ) WHERE id = '5c1f80b0-1f80-4bd9-bcab-1c5d4d82f5b0'::uuid;

  UPDATE public.operation_steps SET materials = jsonb_build_array(
    jsonb_build_object('coreItemId', m_tile, 'item', 'Floor Tile', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  ) WHERE id = '3e6029b2-5bcc-4e4a-80dc-ba8d4cb7d620'::uuid;

  UPDATE public.operation_steps SET materials = jsonb_build_array(
    jsonb_build_object('coreItemId', m_tile, 'item', 'Floor Tile', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', m_trash_bags, 'item', 'Trash Bags', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  ) WHERE id = '1adef138-8919-4d07-aeaa-ea957ce3504f'::uuid;

  UPDATE public.operation_steps SET materials = jsonb_build_array(
    jsonb_build_object('coreItemId', m_thinset_tile, 'item', 'Tile Thinset Mortar', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  ) WHERE id = '4738a5a5-8caf-4185-afa6-b8e6711e005b'::uuid;

  UPDATE public.operation_steps SET materials = jsonb_build_array(
    jsonb_build_object('coreItemId', m_tile, 'item', 'Floor Tile', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', m_thinset_tile, 'item', 'Tile Thinset Mortar', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', m_spacers, 'item', 'Tile Spacer Pack', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  ) WHERE id = '876a00bb-c501-473d-8d47-e88c57fe3b71'::uuid;

  UPDATE public.operation_steps SET materials = jsonb_build_array(
    jsonb_build_object('coreItemId', m_trash_bags, 'item', 'Trash Bags', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false)
  ) WHERE id = '2e6fb34e-4d8e-4e8d-b503-dd8a6589263f'::uuid;

  UPDATE public.operation_steps SET materials = jsonb_build_array(
    jsonb_build_object('coreItemId', m_grout, 'item', 'Floor Grout', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  ) WHERE id = '52a7055b-0031-4056-9d1c-ac137deb184a'::uuid;

  UPDATE public.operation_steps SET materials = jsonb_build_array(
    jsonb_build_object('coreItemId', m_grout, 'item', 'Floor Grout', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false),
    jsonb_build_object('coreItemId', m_grout_sealer, 'item', 'Penetrating Grout Sealer', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  ) WHERE id = '6c1baa26-0fbc-405e-bcf2-e393d7224d7e'::uuid;

  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(v_project_id)
  WHERE id = v_project_id;

  RAISE NOTICE 'Tile Flooring Installation step 6 materials applied for %', v_project_id;
END $$;
