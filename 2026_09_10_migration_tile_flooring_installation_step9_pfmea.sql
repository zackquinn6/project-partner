-- Step 9: PFMEA — Tile Flooring Installation (core steps only)
-- One anti-requirement failure mode per core step (primary output id from existing Step 3 JSON).

DO $$
DECLARE
  v_project_id CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-b135c8ddbfd0'::uuid;
  v_step_count integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = v_project_id) THEN
    RAISE EXCEPTION 'Project not found: %', v_project_id;
  END IF;

  SELECT COUNT(*) INTO v_step_count
  FROM public.operation_steps os
  JOIN public.phase_operations po ON os.operation_id = po.id
  JOIN public.project_phases pp ON po.phase_id = pp.id
  WHERE pp.project_id = v_project_id
    AND pp.source_project_id IS NULL;

  IF v_step_count = 0 THEN
    RAISE EXCEPTION 'No core operation_steps for project_id=% — run structure before step 9.', v_project_id;
  END IF;

  INSERT INTO public.pfmea_failure_modes (
    id, project_id, operation_step_id, requirement_output_id, failure_mode, severity_score
  ) VALUES
    ('373adcbf-0a8c-42e9-9bcb-a9b900000001'::uuid, v_project_id, '17c7f59c-5920-4dfd-89ee-4394d87bb6d0'::uuid, 'out-m1b', 'Flatness and plane not documented', 8),
    ('373adcbf-0a8c-42e9-9bcb-a9b900000002'::uuid, v_project_id, 'd6b793a9-f226-458b-ad2e-51e9ac73e875'::uuid, 'out-m2b', 'Combbed mortar not ready for sheet', 7),
    ('373adcbf-0a8c-42e9-9bcb-a9b900000003'::uuid, v_project_id, '1fa3c0bd-cf6f-4712-9bc8-121edebe676d'::uuid, 'out-m3a', 'Membrane not fully embedded', 8),
    ('373adcbf-0a8c-42e9-9bcb-a9b900000004'::uuid, v_project_id, '90428c0f-db43-4efe-9906-3e1469f9b7ba'::uuid, 'out-b1b', 'Edge and field gaps not set', 6),
    ('373adcbf-0a8c-42e9-9bcb-a9b900000005'::uuid, v_project_id, '5068e3a2-862e-4aff-a649-f1422bd55a04'::uuid, 'out-b2b', 'Plane not suitable for tile', 8),
    ('373adcbf-0a8c-42e9-9bcb-a9b900000006'::uuid, v_project_id, '5c1f80b0-1f80-4bd9-bcab-1c5d4d82f5b0'::uuid, 'out-b3a', 'Seams not reinforced', 7),
    ('373adcbf-0a8c-42e9-9bcb-a9b900000007'::uuid, v_project_id, '3e6029b2-5bcc-4e4a-80dc-ba8d4cb7d620'::uuid, 'out-i1b', 'Reference lines not established', 6),
    ('373adcbf-0a8c-42e9-9bcb-a9b900000008'::uuid, v_project_id, '1adef138-8919-4d07-aeaa-ea957ce3504f'::uuid, 'out-i2b', 'Cut quality not acceptable', 7),
    ('373adcbf-0a8c-42e9-9bcb-a9b900000009'::uuid, v_project_id, '4738a5a5-8caf-4185-afa6-b8e6711e005b'::uuid, 'out-i3b', 'Coverage not spot-checked', 9),
    ('373adcbf-0a8c-42e9-9bcb-a9b90000000a'::uuid, v_project_id, '876a00bb-c501-473d-8d47-e88c57fe3b71'::uuid, 'out-i4b', 'Lippage not within tolerance', 8),
    ('373adcbf-0a8c-42e9-9bcb-a9b90000000b'::uuid, v_project_id, '2e6fb34e-4d8e-4e8d-b503-dd8a6589263f'::uuid, 'out-g1b', 'Mortar cure not verified', 8),
    ('373adcbf-0a8c-42e9-9bcb-a9b90000000c'::uuid, v_project_id, '52a7055b-0031-4056-9d1c-ac137deb184a'::uuid, 'out-g2a', 'Joints not filled full', 7),
    ('373adcbf-0a8c-42e9-9bcb-a9b90000000d'::uuid, v_project_id, '6c1baa26-0fbc-405e-bcf2-e393d7224d7e'::uuid, 'out-g3a', 'Face not clean and joints not uniform', 6)
  ON CONFLICT (id) DO UPDATE SET
    failure_mode = EXCLUDED.failure_mode,
    severity_score = EXCLUDED.severity_score,
    project_id = EXCLUDED.project_id,
    operation_step_id = EXCLUDED.operation_step_id,
    requirement_output_id = EXCLUDED.requirement_output_id;

  INSERT INTO public.pfmea_potential_effects (id, failure_mode_id, effect_description, severity_score)
  VALUES
    ('373adcbf-0a8c-42e9-9bcb-a9b901000001'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000001'::uuid, 'Lippage and hollow spots after set; tear-out of finished floor', 8),
    ('373adcbf-0a8c-42e9-9bcb-a9b901000002'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000002'::uuid, 'Membrane voids and bond failure under tile', 8),
    ('373adcbf-0a8c-42e9-9bcb-a9b901000003'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000003'::uuid, 'Debonding membrane; cracked tile and warranty loss', 9),
    ('373adcbf-0a8c-42e9-9bcb-a9b901000004'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000004'::uuid, 'Buckling panels or weak seams that telegraph through tile', 7),
    ('373adcbf-0a8c-42e9-9bcb-a9b901000005'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000005'::uuid, 'Movement and cracked grout/tile over wood floors', 8),
    ('373adcbf-0a8c-42e9-9bcb-a9b901000006'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000006'::uuid, 'Seam cracks and moisture paths at panel joints', 7),
    ('373adcbf-0a8c-42e9-9bcb-a9b901000007'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000007'::uuid, 'Sliver cuts at walls and misaligned pattern', 6),
    ('373adcbf-0a8c-42e9-9bcb-a9b901000008'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000008'::uuid, 'Visible chips in show areas; wasted tile', 7),
    ('373adcbf-0a8c-42e9-9bcb-a9b901000009'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000009'::uuid, 'Hollow tile, bond failure, and multi-day reset', 9),
    ('373adcbf-0a8c-42e9-9bcb-a9b90100000a'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b90000000a'::uuid, 'Trip hazard and rejected finish appearance', 8),
    ('373adcbf-0a8c-42e9-9bcb-a9b90100000b'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b90000000b'::uuid, 'Shifted tiles and weak joints requiring rework', 8),
    ('373adcbf-0a8c-42e9-9bcb-a9b90100000c'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b90000000c'::uuid, 'Pinholes and stain paths through incomplete joints', 7),
    ('373adcbf-0a8c-42e9-9bcb-a9b90100000d'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b90000000d'::uuid, 'Permanent haze and uneven joint profile', 6)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.pfmea_potential_causes (id, failure_mode_id, cause_description, occurrence_score)
  VALUES
    ('373adcbf-0a8c-42e9-9bcb-a9b902000001'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000001'::uuid, 'Straightedge check skipped or limits not compared to product data', 5),
    ('373adcbf-0a8c-42e9-9bcb-a9b902000002'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000002'::uuid, 'Wrong notch or mortar skinned before embed', 5),
    ('373adcbf-0a8c-42e9-9bcb-a9b902000003'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000003'::uuid, 'Insufficient float pressure; dry spots under fleece', 5),
    ('373adcbf-0a8c-42e9-9bcb-a9b902000004'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000004'::uuid, 'Panels butted tight to walls or each other', 4),
    ('373adcbf-0a8c-42e9-9bcb-a9b902000005'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000005'::uuid, 'Fastener pattern incomplete or heads proud', 5),
    ('373adcbf-0a8c-42e9-9bcb-a9b902000006'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000006'::uuid, 'Tape off-center or mortar not worked through mesh', 4),
    ('373adcbf-0a8c-42e9-9bcb-a9b902000007'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000007'::uuid, 'Dry layout skipped; chalk lines snapped from wrong wall', 4),
    ('373adcbf-0a8c-42e9-9bcb-a9b902000008'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000008'::uuid, 'Wet saw feed too fast on exit; no dry-fit of critical cuts', 5),
    ('373adcbf-0a8c-42e9-9bcb-a9b902000009'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000009'::uuid, 'Large field spread beyond open time; no lift checks', 6),
    ('373adcbf-0a8c-42e9-9bcb-a9b90200000a'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b90000000a'::uuid, 'No straightedge during set; leveling system omitted on large format', 5),
    ('373adcbf-0a8c-42e9-9bcb-a9b90200000b'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b90000000b'::uuid, 'Cure clock ignored to keep schedule', 5),
    ('373adcbf-0a8c-42e9-9bcb-a9b90200000c'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b90000000c'::uuid, 'Grout too dry or float passes only on face', 5),
    ('373adcbf-0a8c-42e9-9bcb-a9b90200000d'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b90000000d'::uuid, 'Haze wiped too early or with dirty water', 5)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.pfmea_controls (
    id, failure_mode_id, cause_id, control_type, control_description, detection_score
  ) VALUES
    ('373adcbf-0a8c-42e9-9bcb-a9b903000001'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000001'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b902000001'::uuid, 'prevention', 'Document flatness vs manufacturer limit before underlayment; route out-of-tolerance floors to linked Self-Leveler', NULL),
    ('373adcbf-0a8c-42e9-9bcb-a9b903000002'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000002'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b902000002'::uuid, 'prevention', 'Use specified notch; limit comb area to open time', NULL),
    ('373adcbf-0a8c-42e9-9bcb-a9b903000003'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000003'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b902000003'::uuid, 'prevention', 'Float embed until fleece transfer is continuous; lift corner check', NULL),
    ('373adcbf-0a8c-42e9-9bcb-a9b903000004'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000004'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b902000004'::uuid, 'prevention', 'Set gaps with spacers per board print before fastening', NULL),
    ('373adcbf-0a8c-42e9-9bcb-a9b903000005'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000005'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b902000005'::uuid, 'prevention', 'Follow printed fastener grid; sink heads flush, not proud', NULL),
    ('373adcbf-0a8c-42e9-9bcb-a9b903000006'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000006'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b902000006'::uuid, 'prevention', 'Center tape on joint and force mortar through mesh', NULL),
    ('373adcbf-0a8c-42e9-9bcb-a9b903000007'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000007'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b902000007'::uuid, 'prevention', 'Dry-lay and balance cuts before snapping permanent lines', NULL),
    ('373adcbf-0a8c-42e9-9bcb-a9b903000008'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000008'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b902000008'::uuid, 'prevention', 'Slow exit on saw; dry-fit show cuts before setting', NULL),
    ('373adcbf-0a8c-42e9-9bcb-a9b903000009'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000009'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b902000009'::uuid, 'prevention', 'Work small fields; lift sample tiles each session for coverage', NULL),
    ('373adcbf-0a8c-42e9-9bcb-a9b90300000a'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b90000000a'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b90200000a'::uuid, 'prevention', 'Straightedge every few tiles; use leveling clips when specified', NULL),
    ('373adcbf-0a8c-42e9-9bcb-a9b90300000b'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b90000000b'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b90200000b'::uuid, 'prevention', 'Record set completion time; gate grout on manufacturer hours', NULL),
    ('373adcbf-0a8c-42e9-9bcb-a9b90300000c'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b90000000c'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b90200000c'::uuid, 'prevention', 'Diagonal pack with float; refill low joints before wash', NULL),
    ('373adcbf-0a8c-42e9-9bcb-a9b90300000d'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b90000000d'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b90200000d'::uuid, 'prevention', 'Wait haze window; rinse sponges frequently', NULL),
    ('373adcbf-0a8c-42e9-9bcb-a9b904000001'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000001'::uuid, NULL, 'detection', 'Photo log of straightedge gaps vs written limit', 7),
    ('373adcbf-0a8c-42e9-9bcb-a9b904000002'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000002'::uuid, NULL, 'detection', 'Visual ridge height check before sheet placement', 7),
    ('373adcbf-0a8c-42e9-9bcb-a9b904000003'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000003'::uuid, NULL, 'detection', 'Lift corner for continuous mortar transfer on fleece', 6),
    ('373adcbf-0a8c-42e9-9bcb-a9b904000004'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000004'::uuid, NULL, 'detection', 'Measure gaps with tape before fastening', 7),
    ('373adcbf-0a8c-42e9-9bcb-a9b904000005'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000005'::uuid, NULL, 'detection', 'Straightedge across fastened panels; count fasteners vs print', 7),
    ('373adcbf-0a8c-42e9-9bcb-a9b904000006'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000006'::uuid, NULL, 'detection', 'Visual mesh full of mortar; no dry tape edges', 7),
    ('373adcbf-0a8c-42e9-9bcb-a9b904000007'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000007'::uuid, NULL, 'detection', 'Verify square with 3-4-5 or laser before setting first row', 7),
    ('373adcbf-0a8c-42e9-9bcb-a9b904000008'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000008'::uuid, NULL, 'detection', 'Dry-fit show cuts under lighting before mortar', 7),
    ('373adcbf-0a8c-42e9-9bcb-a9b904000009'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b900000009'::uuid, NULL, 'detection', 'Lift sample tile each field; reject below coverage %', 6),
    ('373adcbf-0a8c-42e9-9bcb-a9b90400000a'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b90000000a'::uuid, NULL, 'detection', 'Straightedge and feel across joints every few tiles', 6),
    ('373adcbf-0a8c-42e9-9bcb-a9b90400000b'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b90000000b'::uuid, NULL, 'detection', 'Compare elapsed hours to mortar data sheet before joint prep', 7),
    ('373adcbf-0a8c-42e9-9bcb-a9b90400000c'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b90000000c'::uuid, NULL, 'detection', 'Probe joints for voids before haze stage', 7),
    ('373adcbf-0a8c-42e9-9bcb-a9b90400000d'::uuid, '373adcbf-0a8c-42e9-9bcb-a9b90000000d'::uuid, NULL, 'detection', 'Side-light inspection for haze after final wipe', 7)
  ON CONFLICT (id) DO UPDATE SET
    control_description = EXCLUDED.control_description,
    detection_score = EXCLUDED.detection_score;

  RAISE NOTICE 'Tile Flooring Installation step 9 PFMEA applied for %', v_project_id;
END $$;
