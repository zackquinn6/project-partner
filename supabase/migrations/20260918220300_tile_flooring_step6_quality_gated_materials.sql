-- Step 6: materials for Professional-only Tile Flooring steps.
-- Repeats tool bootstrap from step 5. Materials include coverage math where scope scales.

DO $migration$
DECLARE
  v_project_id uuid;
  v_step_clips CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000005'::uuid;
  v_step_final CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000006'::uuid;
  v_updated int;
  v_name text;
  v_missing text[] := ARRAY[]::text[];
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

  IF NOT EXISTS (SELECT 1 FROM public.operation_steps WHERE id = v_step_clips)
     OR NOT EXISTS (SELECT 1 FROM public.operation_steps WHERE id = v_step_final) THEN
    RAISE EXCEPTION 'Quality-gated steps missing. Apply quality goals migration first.';
  END IF;

  -- Same tool list as step 5 (guide requirement).
  INSERT INTO public.tools (name, description, category, alternates)
  SELECT v.name, v.description, v.category, v.alternates
  FROM (VALUES
    ('Tile Leveling Clip Tool', 'Pliers that set and tension tile leveling clips and wedges.', 'Hand Tool',
     'Hand pressure with wedge clips works on tile under 15 in, but not on large format'),
    ('Straightedge', 'Straight metal edge for checking lippage and field flatness.', 'Hand Tool',
     'A factory edge of a 10 ft aluminum level, or a jointed 10 ft screed'),
    ('Rubber Mallet', 'Seats tile without cracking glaze.', 'Hand Tool',
     'Dead-blow mallet with a soft face for large format'),
    ('Beating Block', 'Spreads mallet force across the tile face.', 'Hand Tool',
     'Manufacturer beating block sized to the tile'),
    ('Tape Measure', 'Measures joint width and clip spacing.', 'Hand Tool', NULL),
    ('Level', 'Checks plane and any intended slope.', 'Hand Tool', 'Laser level for long runs'),
    ('Flashlight', 'Low-angle light for raking inspection of finished floors.', 'Other',
     'Work light aimed across the floor'),
    ('Margin Trowel', 'Lifts and re-beds tile during corrections.', 'Hand Tool', NULL),
    ('Knee Pads', 'Protects knees during continuous floor work.', 'PPE',
     'Gel knee pads for long sessions'),
    ('Safety Glasses', 'Eye protection for clip tensioning and breakaway.', 'PPE',
     'Wraparound glasses when breaking stems')
  ) AS v(name, description, category, alternates)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tools t WHERE lower(btrim(t.name)) = lower(btrim(v.name))
  );

  INSERT INTO public.materials (name, description, category, unit, unit_size, alternates)
  SELECT v.name, v.description, v.category, v.unit, v.unit_size, v.alternates
  FROM (VALUES
    ('Tile Leveling Clips',
     'Clips and wedges that hold adjacent tile faces in plane while mortar cures.',
     'Consumables', 'pack', '100 count pack',
     'Screw-cap leveling systems rated for the same tile thickness'),
    ('Tile Leveling Wedges',
     'Wedges that tension leveling clips. Often sold with clips or as refill packs.',
     'Consumables', 'pack', '100 count pack',
     'Caps for screw-style leveling systems'),
    ('Grout Haze Remover',
     'Removes cement haze from tile faces after grout wash.',
     'Consumables', 'bottle', '32 oz bottle',
     'Stone-safe haze remover for natural stone'),
    ('Microfiber Cloths',
     'Lint-light cloths for final wipe checks and haze inspection.',
     'Consumables', 'pack', '12 count pack',
     'White cotton rags reserved for wipe tests'),
    ('Movement Joint Sealant',
     'Flexible sealant for perimeter and field movement joints.',
     'Consumables', 'tube', '10.1 oz tube',
     'Color-matched silicone or urethane rated for floor joints')
  ) AS v(name, description, category, unit, unit_size, alternates)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.materials m WHERE lower(btrim(m.name)) = lower(btrim(v.name))
  );

  FOREACH v_name IN ARRAY ARRAY[
    'Tile Leveling Clips','Tile Leveling Wedges','Grout Haze Remover',
    'Microfiber Cloths','Movement Joint Sealant'
  ]
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.materials m WHERE lower(btrim(m.name)) = lower(btrim(v_name))) THEN
      v_missing := array_append(v_missing, v_name);
    END IF;
  END LOOP;

  IF array_length(v_missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Material library bootstrap failed for: %', array_to_string(v_missing, ', ');
  END IF;

  UPDATE public.operation_steps os
  SET materials = v.materials::jsonb, updated_at = now()
  FROM (VALUES
    (v_step_clips, '[
      {"id":"mt-cl-clips","name":"Tile Leveling Clips","unit":"pack","purpose":"Hold adjacent faces in plane while mortar cures","category":"Consumables","packSize":100,"quantity":1,"alternates":[],"description":"Coverage assumes about 1 clip per 0.4 sq ft on large format with clips on every shared edge. Adjust to the manufacturer spacing chart for your tile size.","wasteFactor":0.1,"coveragePerUnit":40},
      {"id":"mt-cl-wedges","name":"Tile Leveling Wedges","unit":"pack","purpose":"Tension the clips","category":"Consumables","packSize":100,"quantity":1,"alternates":[],"description":"One wedge per clip for most clip-and-wedge systems. Screw-cap systems use caps instead.","wasteFactor":0.1,"coveragePerUnit":40,"parentId":"mt-cl-clips"}
    ]'),
    (v_step_final, '[
      {"id":"mt-ff-haze","name":"Grout Haze Remover","unit":"bottle","purpose":"Clear remaining cement haze on a failed wipe test","category":"Consumables","quantity":1,"alternates":[],"description":"Used only on zones that still transfer haze to a white cloth. Follow dwell time on the label."},
      {"id":"mt-ff-cloth","name":"Microfiber Cloths","unit":"pack","purpose":"Wipe-test tile faces for haze and sealer film","category":"Consumables","packSize":12,"quantity":1,"alternates":[],"description":"White or light cloths so transfer is visible."},
      {"id":"mt-ff-sealant","name":"Movement Joint Sealant","unit":"tube","purpose":"Replace any grout bridge found in a movement joint","category":"Consumables","quantity":1,"alternates":[],"description":"Keep one tube on hand for Professional close-out if a perimeter joint was packed with grout by mistake. Coverage depends on joint width and depth, not floor area."}
    ]')
  ) AS v(step_id, materials)
  WHERE os.id = v.step_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 2 THEN
    RAISE EXCEPTION 'Expected materials on 2 quality-gated steps, updated %.', v_updated;
  END IF;

  RAISE NOTICE 'Tile quality-gated materials authored for project %', v_project_id;
END
$migration$;
