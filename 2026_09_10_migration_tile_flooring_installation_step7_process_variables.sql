-- Step 7: Process variables — Tile Flooring Installation (core steps only)
-- No tools/materials catalog inserts.

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
    RAISE EXCEPTION 'No core operation_steps for project_id=% — run structure before step 7.', v_project_id;
  END IF;

  UPDATE public.operation_steps SET process_variables = jsonb_build_array(
    jsonb_build_object(
      'id', 'tile-pv-m1-flatness',
      'name', 'Subfloor flatness deviation',
      'type', 'process',
      'description', 'Maximum gap under straightedge vs tile/membrane manufacturer limit. Too high: bond and lippage risk; requires linked self-leveler/subfloor work.',
      'required', true,
      'unit', 'in / 10 ft'
    ),
    jsonb_build_object(
      'id', 'tile-pv-m1-moisture',
      'name', 'Substrate moisture condition',
      'type', 'process',
      'description', 'Moisture reading or test result required by product data before underlayment.',
      'required', true
    )
  ) WHERE id = '17c7f59c-5920-4dfd-89ee-4394d87bb6d0'::uuid;

  UPDATE public.operation_steps SET process_variables = jsonb_build_array(
    jsonb_build_object(
      'id', 'tile-pv-m2-mix-ratio',
      'name', 'Membrane mortar liquid ratio',
      'type', 'process',
      'description', 'Water or liquid admix vs powder per membrane data. Too wet: slip and weak bond; too dry: poor fleece transfer.',
      'required', true,
      'unit', 'per bag'
    ),
    jsonb_build_object(
      'id', 'tile-pv-m2-notch',
      'name', 'Trowel notch size',
      'type', 'process',
      'description', 'Notch specified by membrane manufacturer for the sheet system.',
      'required', true,
      'unit', 'in'
    )
  ) WHERE id = 'd6b793a9-f226-458b-ad2e-51e9ac73e875'::uuid;

  UPDATE public.operation_steps SET process_variables = jsonb_build_array(
    jsonb_build_object(
      'id', 'tile-pv-m3-seam-overlap',
      'name', 'Seam overlap / banding width',
      'type', 'process',
      'description', 'Overlap or band width at sheet joints per manufacturer drawings.',
      'required', true,
      'unit', 'in'
    )
  ) WHERE id = '1fa3c0bd-cf6f-4712-9bc8-121edebe676d'::uuid;

  UPDATE public.operation_steps SET process_variables = jsonb_build_array(
    jsonb_build_object(
      'id', 'tile-pv-b1-gap',
      'name', 'Panel and perimeter gap',
      'type', 'process',
      'description', 'Gap between panels and at walls per backer board print. Too tight: buckling; too wide: weak seams.',
      'required', true,
      'unit', 'in'
    )
  ) WHERE id = '90428c0f-db43-4efe-9906-3e1469f9b7ba'::uuid;

  UPDATE public.operation_steps SET process_variables = jsonb_build_array(
    jsonb_build_object(
      'id', 'tile-pv-b2-fastener-spacing',
      'name', 'Fastener spacing',
      'type', 'process',
      'description', 'Screw spacing and edge distance per board manufacturer.',
      'required', true,
      'unit', 'in'
    )
  ) WHERE id = '5068e3a2-862e-4aff-a649-f1422bd55a04'::uuid;

  UPDATE public.operation_steps SET process_variables = jsonb_build_array(
    jsonb_build_object(
      'id', 'tile-pv-b3-embed-thickness',
      'name', 'Seam mortar embed thickness',
      'type', 'process',
      'description', 'Mortar thickness over tape/mesh so seams are reinforced without proud ridges.',
      'required', true,
      'unit', 'in'
    )
  ) WHERE id = '5c1f80b0-1f80-4bd9-bcab-1c5d4d82f5b0'::uuid;

  UPDATE public.operation_steps SET process_variables = jsonb_build_array(
    jsonb_build_object(
      'id', 'tile-pv-i1-joint-width',
      'name', 'Planned grout joint width',
      'type', 'process',
      'description', 'Target joint width for layout and spacer selection.',
      'required', true,
      'unit', 'in'
    )
  ) WHERE id = '3e6029b2-5bcc-4e4a-80dc-ba8d4cb7d620'::uuid;

  UPDATE public.operation_steps SET process_variables = jsonb_build_array(
    jsonb_build_object(
      'id', 'tile-pv-i2-feed-rate',
      'name', 'Wet saw feed rate',
      'type', 'process',
      'description', 'Feed speed that avoids glaze chip-out on exit. Too fast: chips; too slow: burn marks.',
      'required', true
    )
  ) WHERE id = '1adef138-8919-4d07-aeaa-ea957ce3504f'::uuid;

  UPDATE public.operation_steps SET process_variables = jsonb_build_array(
    jsonb_build_object(
      'id', 'tile-pv-i3-coverage',
      'name', 'Thinset coverage after beat-in',
      'type', 'process',
      'description', 'Percent contact on lifted sample tile vs manufacturer minimum for the tile size.',
      'required', true,
      'unit', '%'
    ),
    jsonb_build_object(
      'id', 'tile-pv-i3-open-time',
      'name', 'Mortar open-time window',
      'type', 'process',
      'description', 'Minutes from comb to set before skin-over at current temperature/humidity.',
      'required', true,
      'unit', 'min'
    )
  ) WHERE id = '4738a5a5-8caf-4185-afa6-b8e6711e005b'::uuid;

  UPDATE public.operation_steps SET process_variables = jsonb_build_array(
    jsonb_build_object(
      'id', 'tile-pv-i4-lippage',
      'name', 'Lippage between adjacent tiles',
      'type', 'process',
      'description', 'Edge offset under straightedge vs project/manufacturer limit.',
      'required', true,
      'unit', 'in'
    )
  ) WHERE id = '876a00bb-c501-473d-8d47-e88c57fe3b71'::uuid;

  UPDATE public.operation_steps SET process_variables = jsonb_build_array(
    jsonb_build_object(
      'id', 'tile-pv-g1-cure-hours',
      'name', 'Mortar cure before grout',
      'type', 'process',
      'description', 'Hours since set completion vs manufacturer minimum before joint prep.',
      'required', true,
      'unit', 'h'
    )
  ) WHERE id = '2e6fb34e-4d8e-4e8d-b503-dd8a6589263f'::uuid;

  UPDATE public.operation_steps SET process_variables = jsonb_build_array(
    jsonb_build_object(
      'id', 'tile-pv-g2-grout-water',
      'name', 'Grout mix water content',
      'type', 'process',
      'description', 'Water vs powder for packable consistency without washout.',
      'required', true,
      'unit', 'per bag'
    )
  ) WHERE id = '52a7055b-0031-4056-9d1c-ac137deb184a'::uuid;

  UPDATE public.operation_steps SET process_variables = jsonb_build_array(
    jsonb_build_object(
      'id', 'tile-pv-g3-haze-window',
      'name', 'Haze clean timing',
      'type', 'process',
      'description', 'Wait after packing before final haze removal so joints do not wash out.',
      'required', true,
      'unit', 'min'
    ),
    jsonb_build_object(
      'id', 'tile-pv-g3-sealer-cure',
      'name', 'Grout cure before sealer',
      'type', 'upstream',
      'description', 'Grout manufacturer cure requirement before penetrating sealer, when sealer is specified.',
      'required', false,
      'unit', 'h'
    )
  ) WHERE id = '6c1baa26-0fbc-405e-bcf2-e393d7224d7e'::uuid;

  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(v_project_id)
  WHERE id = v_project_id;

  RAISE NOTICE 'Tile Flooring Installation step 7 process variables applied for %', v_project_id;
END $$;
