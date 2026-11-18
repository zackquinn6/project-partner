-- Tile Flooring reliability content bundle.
-- Consolidates Phase 1-5: core PFMEA (anti-requirement FMs), register risks,
-- key skills, personalization rules, and branch/companion packs.
-- ASCII only. Apply after skill_definitions and prior tile quality/PFMEA migrations.
-- Live owned step titles (Prepare subfloor / Install / Grout & Finish) - not the older docs names:
-- Spread mortar for membrane, Embed membrane and detail seams, Cut and fit backer panels,
-- Fasten backer to subfloor, Tape or mesh seams and embed, Layout and reference lines,
-- Cut tiles to layout, Spread mortar and verify coverage, Set tile beat-in and check plane,
-- Cure thinset before grouting, Pack grout and initial clean.

-- ==== BEGIN 20260920100000_tile_reliability_core_pfmea.sql ====
-- Tile reliability Phase 1: core Prep/Install/Finish PFMEA (anti-requirement FMs).
-- Appends stable output ids on core steps, clears prior PFMEA for those steps only,
-- authors new requirements/FMs, and rewrites Professional clip/final FM text to
-- anti-requirement form (requirement_ids unchanged).
--
-- Cut backer and measure/cut are resolved for existence but carry no new PFMEA.
-- No em dashes.

DO $migration$
DECLARE
  v_project_id uuid;
  v_count integer;
  v_outputs jsonb;
  v_out jsonb;

  v_step_inspect uuid;
  v_step_thinset_mem uuid;
  v_step_membrane uuid;
  v_step_cut_backer uuid;
  v_step_fasten_backer uuid;
  v_step_tape_backer uuid;
  v_step_layout uuid;
  v_step_cut_tile uuid;
  v_step_thinset_set uuid;
  v_step_place uuid;
  v_step_prep_grout uuid;
  v_step_apply_grout uuid;

  v_step_clips CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000005'::uuid;
  v_step_final CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000006'::uuid;

  v_req_ci_flat uuid := '373adcbf-0a8c-42e9-9bcb-a5c200000101'::uuid;
  v_req_ci_moist uuid := '373adcbf-0a8c-42e9-9bcb-a5c200000102'::uuid;
  v_fm_ci_flat uuid := '373adcbf-0a8c-42e9-9bcb-a5c200000201'::uuid;
  v_fm_ci_moist uuid := '373adcbf-0a8c-42e9-9bcb-a5c200000202'::uuid;

  v_req_tm_cov uuid := '373adcbf-0a8c-42e9-9bcb-a5c200000103'::uuid;
  v_fm_tm_cov uuid := '373adcbf-0a8c-42e9-9bcb-a5c200000203'::uuid;

  v_req_mem_bond uuid := '373adcbf-0a8c-42e9-9bcb-a5c200000104'::uuid;
  v_fm_mem_bond uuid := '373adcbf-0a8c-42e9-9bcb-a5c200000204'::uuid;

  v_req_fb_plane uuid := '373adcbf-0a8c-42e9-9bcb-a5c200000105'::uuid;
  v_fm_fb_plane uuid := '373adcbf-0a8c-42e9-9bcb-a5c200000205'::uuid;
  v_req_tb_seal uuid := '373adcbf-0a8c-42e9-9bcb-a5c200000106'::uuid;
  v_fm_tb_seal uuid := '373adcbf-0a8c-42e9-9bcb-a5c200000206'::uuid;

  v_req_lay_cut uuid := '373adcbf-0a8c-42e9-9bcb-a5c200000107'::uuid;
  v_fm_lay_cut uuid := '373adcbf-0a8c-42e9-9bcb-a5c200000207'::uuid;

  v_req_ts_cov uuid := '373adcbf-0a8c-42e9-9bcb-a5c200000108'::uuid;
  v_req_ts_class uuid := '373adcbf-0a8c-42e9-9bcb-a5c200000109'::uuid;
  v_fm_ts_cov uuid := '373adcbf-0a8c-42e9-9bcb-a5c200000208'::uuid;
  v_fm_ts_class uuid := '373adcbf-0a8c-42e9-9bcb-a5c200000209'::uuid;

  v_req_pl_lip uuid := '373adcbf-0a8c-42e9-9bcb-a5c20000010a'::uuid;
  v_req_pl_ej uuid := '373adcbf-0a8c-42e9-9bcb-a5c20000010b'::uuid;
  v_fm_pl_lip uuid := '373adcbf-0a8c-42e9-9bcb-a5c20000020a'::uuid;
  v_fm_pl_ej uuid := '373adcbf-0a8c-42e9-9bcb-a5c20000020b'::uuid;

  v_req_pg_cure uuid := '373adcbf-0a8c-42e9-9bcb-a5c20000010c'::uuid;
  v_fm_pg_cure uuid := '373adcbf-0a8c-42e9-9bcb-a5c20000020c'::uuid;
  v_req_ag_pack uuid := '373adcbf-0a8c-42e9-9bcb-a5c20000010d'::uuid;
  v_req_ag_ej uuid := '373adcbf-0a8c-42e9-9bcb-a5c20000010e'::uuid;
  v_fm_ag_pack uuid := '373adcbf-0a8c-42e9-9bcb-a5c20000020d'::uuid;
  v_fm_ag_ej uuid := '373adcbf-0a8c-42e9-9bcb-a5c20000020e'::uuid;

  v_req_clips_a uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000101'::uuid;
  v_req_clips_b uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000102'::uuid;
  v_req_clips_c uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000103'::uuid;
  v_req_final_a uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000104'::uuid;
  v_req_final_b uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000105'::uuid;
  v_req_final_c uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000106'::uuid;
  v_fm_clips_a uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000201'::uuid;
  v_fm_clips_b uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000202'::uuid;
  v_fm_clips_c uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000203'::uuid;
  v_fm_final_a uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000204'::uuid;
  v_fm_final_b uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000205'::uuid;
  v_fm_final_c uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000206'::uuid;

  v_core_steps uuid[];
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

  SELECT os.id INTO v_step_inspect
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'clean and inspect subfloor'
  LIMIT 1;

  SELECT os.id INTO v_step_thinset_mem
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'spread mortar for membrane'
  LIMIT 1;

  SELECT os.id INTO v_step_membrane
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'embed membrane and detail seams'
  LIMIT 1;

  SELECT os.id INTO v_step_cut_backer
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'cut and fit backer panels'
  LIMIT 1;

  SELECT os.id INTO v_step_fasten_backer
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'fasten backer to subfloor'
  LIMIT 1;

  SELECT os.id INTO v_step_tape_backer
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'tape or mesh seams and embed'
  LIMIT 1;

  SELECT os.id INTO v_step_layout
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'layout and reference lines'
  LIMIT 1;

  SELECT os.id INTO v_step_cut_tile
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'cut tiles to layout'
  LIMIT 1;

  SELECT os.id INTO v_step_thinset_set
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'spread mortar and verify coverage'
  LIMIT 1;

  SELECT os.id INTO v_step_place
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'set tile, beat-in, and check plane'
  LIMIT 1;

  SELECT os.id INTO v_step_prep_grout
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'cure thinset before grouting'
  LIMIT 1;

  SELECT os.id INTO v_step_apply_grout
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'pack grout and initial clean'
  LIMIT 1;

  IF v_step_inspect IS NULL
     OR v_step_thinset_mem IS NULL
     OR v_step_membrane IS NULL
     OR v_step_cut_backer IS NULL
     OR v_step_fasten_backer IS NULL
     OR v_step_tape_backer IS NULL
     OR v_step_layout IS NULL
     OR v_step_cut_tile IS NULL
     OR v_step_thinset_set IS NULL
     OR v_step_place IS NULL
     OR v_step_prep_grout IS NULL
     OR v_step_apply_grout IS NULL THEN
    RAISE EXCEPTION
      'Tile core steps missing (inspect=%, thinset_mem=%, membrane=%, cut_backer=%, fasten=%, tape=%, layout=%, cut_tile=%, thinset_set=%, place=%, cure_or_prep_grout=%, apply_grout=%).',
      v_step_inspect, v_step_thinset_mem, v_step_membrane, v_step_cut_backer, v_step_fasten_backer,
      v_step_tape_backer, v_step_layout, v_step_cut_tile, v_step_thinset_set, v_step_place,
      v_step_prep_grout, v_step_apply_grout;
  END IF;

  v_core_steps := ARRAY[
    v_step_inspect, v_step_thinset_mem, v_step_membrane, v_step_cut_backer,
    v_step_fasten_backer, v_step_tape_backer, v_step_layout, v_step_cut_tile,
    v_step_thinset_set, v_step_place, v_step_prep_grout, v_step_apply_grout
  ];

  -- ---------------------------------------------------------------------------
  -- Ensure PFMEA hang-point outputs exist (append by stable id if missing).
  -- ---------------------------------------------------------------------------

  -- Clean and inspect: out-ci-flat
  SELECT coalesce(outputs, '[]'::jsonb) INTO v_outputs
  FROM public.operation_steps WHERE id = v_step_inspect;
  IF jsonb_typeof(v_outputs) IS DISTINCT FROM 'array' THEN
    v_outputs := '[]'::jsonb;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_outputs) e WHERE e->>'id' = 'out-ci-flat'
  ) THEN
    v_out := jsonb_build_object(
      'id', 'out-ci-flat',
      'name', 'Substrate flatness within tile limit',
      'description', 'Straightedge check confirms substrate variation is inside the flatness limit for the tile size before cover.',
      'type', 'performance-durability',
      'requirement', 'Substrate flatness is <=1/8 in in 10 ft (and <=1/16 in in 24 in) when any tile edge is >15 in; otherwise <=1/4 in in 10 ft.',
      'qualityChecks', 'Walk a 10 ft straightedge in both directions. Record high and low readings. For edges >15 in also check 24 in spans.',
      'keyInputs', jsonb_build_array('Tile edge length', 'Straightedge length', 'Existing floor plane'),
      'potentialEffects', 'Out-of-flat substrate locks lippage and hollow spots into the finished field.',
      'mustGetRight', 'Measure before mortar. Eye alone is not a flatness check.',
      'allowances', 'Local patches may be corrected with the approved underlayment method before cover.',
      'referenceSpecification', 'TCNA / ANSI A108.02 substrate flatness for the tile size.'
    );
    UPDATE public.operation_steps
    SET outputs = v_outputs || jsonb_build_array(v_out), updated_at = now()
    WHERE id = v_step_inspect;
  END IF;

  -- Clean and inspect: out-ci-moist
  SELECT coalesce(outputs, '[]'::jsonb) INTO v_outputs
  FROM public.operation_steps WHERE id = v_step_inspect;
  IF jsonb_typeof(v_outputs) IS DISTINCT FROM 'array' THEN
    v_outputs := '[]'::jsonb;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_outputs) e WHERE e->>'id' = 'out-ci-moist'
  ) THEN
    v_out := jsonb_build_object(
      'id', 'out-ci-moist',
      'name', 'Substrate sound and dry enough to cover',
      'description', 'Soft, rotten, or moisture-positive areas are identified and cleared before any finish plane cover.',
      'type', 'performance-durability',
      'requirement', 'No soft, rotten, or elevated-moisture substrate remains under the finish plane before cover.',
      'qualityChecks', 'Probe suspect spots. Meter or plastic-sheet check where moisture is a concern. Mark and remediate before cover.',
      'keyInputs', jsonb_build_array('Prior water events', 'Substrate material', 'Moisture meter or sheet test'),
      'potentialEffects', 'Covered soft or wet spots rot or release, taking the tile with them.',
      'mustGetRight', 'Do not cover soft or moisture-positive areas.',
      'allowances', 'Remediation method follows the substrate and membrane manufacturer.',
      'referenceSpecification', 'Substrate manufacturer and membrane data sheet moisture limits.'
    );
    UPDATE public.operation_steps
    SET outputs = v_outputs || jsonb_build_array(v_out), updated_at = now()
    WHERE id = v_step_inspect;
  END IF;

  -- Apply thinset for membrane: out-tm-cov
  SELECT coalesce(outputs, '[]'::jsonb) INTO v_outputs
  FROM public.operation_steps WHERE id = v_step_thinset_mem;
  IF jsonb_typeof(v_outputs) IS DISTINCT FROM 'array' THEN
    v_outputs := '[]'::jsonb;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_outputs) e WHERE e->>'id' = 'out-tm-cov'
  ) THEN
    v_out := jsonb_build_object(
      'id', 'out-tm-cov',
      'name', 'Membrane thinset coverage and ridge collapse',
      'description', 'Combed mortar under the membrane reaches coverage with ridges collapsed at embed.',
      'type', 'performance-durability',
      'requirement', 'Membrane thinset coverage is >=80% dry with ridges collapsed before the sheet is accepted.',
      'qualityChecks', 'Lift a corner or use a sacrificial strip to read transfer. Confirm ridges collapsed under the sheet.',
      'keyInputs', jsonb_build_array('Notch size', 'Open time', 'Membrane fleece type'),
      'potentialEffects', 'Low coverage or standing ridges leave unbonded membrane that drums and fails.',
      'mustGetRight', 'Coverage is proven at embed, not assumed from the comb pattern alone.',
      'allowances', 'Wet-area products may require higher coverage per the membrane maker.',
      'referenceSpecification', 'Membrane manufacturer embed and coverage instructions.'
    );
    UPDATE public.operation_steps
    SET outputs = v_outputs || jsonb_build_array(v_out), updated_at = now()
    WHERE id = v_step_thinset_mem;
  END IF;

  -- Install uncoupling membrane: out-mem-bond
  SELECT coalesce(outputs, '[]'::jsonb) INTO v_outputs
  FROM public.operation_steps WHERE id = v_step_membrane;
  IF jsonb_typeof(v_outputs) IS DISTINCT FROM 'array' THEN
    v_outputs := '[]'::jsonb;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_outputs) e WHERE e->>'id' = 'out-mem-bond'
  ) THEN
    v_out := jsonb_build_object(
      'id', 'out-mem-bond',
      'name', 'Membrane fully bonded with detailed seams',
      'description', 'Membrane is fully embedded with seams overlapped per the maker and no voids under the sheet.',
      'type', 'performance-durability',
      'requirement', 'Membrane is fully embedded, seams overlapped per manufacturer, with no voids under the sheet.',
      'qualityChecks', 'Work from the center out. Sound for hollows. Measure seam overlaps against the printed dimension.',
      'keyInputs', jsonb_build_array('Embed tool', 'Seam detail', 'Open time remaining'),
      'potentialEffects', 'Voids and unbonded seams telegraph as hollow spots and crack lines.',
      'mustGetRight', 'No dry spots or short laps under the finished membrane.',
      'allowances', 'Maker-specific seam tapes or bands replace simple overlap where specified.',
      'referenceSpecification', 'Uncoupling membrane installation guide.'
    );
    UPDATE public.operation_steps
    SET outputs = v_outputs || jsonb_build_array(v_out), updated_at = now()
    WHERE id = v_step_membrane;
  END IF;

  -- Fasten backer: out-fb-plane
  SELECT coalesce(outputs, '[]'::jsonb) INTO v_outputs
  FROM public.operation_steps WHERE id = v_step_fasten_backer;
  IF jsonb_typeof(v_outputs) IS DISTINCT FROM 'array' THEN
    v_outputs := '[]'::jsonb;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_outputs) e WHERE e->>'id' = 'out-fb-plane'
  ) THEN
    v_out := jsonb_build_object(
      'id', 'out-fb-plane',
      'name', 'Backer plane and fastener schedule',
      'description', 'Fastened backer is flat, fasteners follow the printed schedule, and gaps match the maker.',
      'type', 'performance-durability',
      'requirement', 'Backer board is flat, the fastener schedule is met, and gaps match the manufacturer.',
      'qualityChecks', 'Count fasteners against the panel print. Straightedge the field. Confirm wall and sheet gaps.',
      'keyInputs', jsonb_build_array('Fastener type', 'Panel print schedule', 'Subfloor condition'),
      'potentialEffects', 'Proud heads, wide spacing, or rocking panels become lippage and cracked grout.',
      'mustGetRight', 'The tile plane starts at the fastened backer plane.',
      'allowances', 'Maker gap dimensions govern over generic 1/8 in rules when they differ.',
      'referenceSpecification', 'Backer board fastening and gap chart.'
    );
    UPDATE public.operation_steps
    SET outputs = v_outputs || jsonb_build_array(v_out), updated_at = now()
    WHERE id = v_step_fasten_backer;
  END IF;

  -- Tape and seal: out-tb-seal
  SELECT coalesce(outputs, '[]'::jsonb) INTO v_outputs
  FROM public.operation_steps WHERE id = v_step_tape_backer;
  IF jsonb_typeof(v_outputs) IS DISTINCT FROM 'array' THEN
    v_outputs := '[]'::jsonb;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_outputs) e WHERE e->>'id' = 'out-tb-seal'
  ) THEN
    v_out := jsonb_build_object(
      'id', 'out-tb-seal',
      'name', 'Backer seams taped and sealed continuous',
      'description', 'Every backer seam is taped and sealed continuous across the field.',
      'type', 'performance-durability',
      'requirement', 'Backer seams are taped and sealed continuous across the field.',
      'qualityChecks', 'Walk every seam. Confirm tape and embed with no open gaps at intersections.',
      'keyInputs', jsonb_build_array('Alkali-resistant tape or mesh', 'Embed mortar', 'Seam layout'),
      'potentialEffects', 'Open seams move independently and crack the grout line above them.',
      'mustGetRight', 'No open or untaped seams remain in the backer field.',
      'allowances', 'Maker-approved seam bands may replace mesh where specified.',
      'referenceSpecification', 'Backer board seam treatment instructions.'
    );
    UPDATE public.operation_steps
    SET outputs = v_outputs || jsonb_build_array(v_out), updated_at = now()
    WHERE id = v_step_tape_backer;
  END IF;

  -- Plan layout: out-lay-cut
  SELECT coalesce(outputs, '[]'::jsonb) INTO v_outputs
  FROM public.operation_steps WHERE id = v_step_layout;
  IF jsonb_typeof(v_outputs) IS DISTINCT FROM 'array' THEN
    v_outputs := '[]'::jsonb;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_outputs) e WHERE e->>'id' = 'out-lay-cut'
  ) THEN
    v_out := jsonb_build_object(
      'id', 'out-lay-cut',
      'name', 'Perimeter cuts meet half-tile / plan minimum',
      'description', 'Layout places perimeter cuts at or above half tile, or the written layout plan minimum.',
      'type', 'major-aesthetics',
      'requirement', 'Perimeter cuts are >= half a tile, or meet the layout plan minimum where that plan is stricter.',
      'qualityChecks', 'Dry-lay or measure both ends of primary runs. Move the start line until cuts clear the minimum.',
      'keyInputs', jsonb_build_array('Room width', 'Tile module', 'Doorway sight lines'),
      'potentialEffects', 'Sliver perimeter cuts chip, loosen, and dominate the first sight line.',
      'mustGetRight', 'Balance the layout before the first tile is set.',
      'allowances', 'A documented plan may accept a smaller cut in a hidden run only.',
      'referenceSpecification', 'Layout plan and TCNA practice for balanced cuts.'
    );
    UPDATE public.operation_steps
    SET outputs = v_outputs || jsonb_build_array(v_out), updated_at = now()
    WHERE id = v_step_layout;
  END IF;

  -- Apply thinset mortar: out-ts-cov
  SELECT coalesce(outputs, '[]'::jsonb) INTO v_outputs
  FROM public.operation_steps WHERE id = v_step_thinset_set;
  IF jsonb_typeof(v_outputs) IS DISTINCT FROM 'array' THEN
    v_outputs := '[]'::jsonb;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_outputs) e WHERE e->>'id' = 'out-ts-cov'
  ) THEN
    v_out := jsonb_build_object(
      'id', 'out-ts-cov',
      'name', 'Setting mortar coverage and corner support',
      'description', 'Mortar contact under tile meets ANSI A108.5 coverage with full corner support.',
      'type', 'performance-durability',
      'requirement', 'Mortar coverage is >=80% dry (>=95% if wet noted) with full corner support per ANSI A108.5.',
      'qualityChecks', 'Lift sample tiles. Read transfer on the back and the substrate. Confirm corners are supported.',
      'keyInputs', jsonb_build_array('Notch size', 'Back-butter practice', 'Area dryness'),
      'potentialEffects', 'Low coverage and unsupported corners crack under point load and must be broken out.',
      'mustGetRight', 'Coverage is proven by lift checks, not by comb appearance alone.',
      'allowances', 'Wet zones use the higher coverage threshold when the area is noted wet.',
      'referenceSpecification', 'ANSI A108.5 coverage requirements.'
    );
    UPDATE public.operation_steps
    SET outputs = v_outputs || jsonb_build_array(v_out), updated_at = now()
    WHERE id = v_step_thinset_set;
  END IF;

  -- Apply thinset mortar: out-ts-class
  SELECT coalesce(outputs, '[]'::jsonb) INTO v_outputs
  FROM public.operation_steps WHERE id = v_step_thinset_set;
  IF jsonb_typeof(v_outputs) IS DISTINCT FROM 'array' THEN
    v_outputs := '[]'::jsonb;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_outputs) e WHERE e->>'id' = 'out-ts-class'
  ) THEN
    v_out := jsonb_build_object(
      'id', 'out-ts-class',
      'name', 'Mortar class matched to tile',
      'description', 'The mortar class on the bag matches the tile size and type, including LHT / A118.15 when required.',
      'type', 'performance-durability',
      'requirement', 'Mortar class matches the tile (LHT / ANSI A118.15 when any edge is >15 in).',
      'qualityChecks', 'Read the bag class against the tile edge length before the first batch is mixed.',
      'keyInputs', jsonb_build_array('Tile edge length', 'Mortar bag class', 'Manufacturer tile notes'),
      'potentialEffects', 'Wrong class under large-format tile yields sag, hollows, and bond failure.',
      'mustGetRight', 'Do not substitute standard thinset under LHT-required tile.',
      'allowances', 'Maker-approved medium-bed products that meet the required class are acceptable.',
      'referenceSpecification', 'ANSI A118.15 / LHT rating and tile manufacturer setting notes.'
    );
    UPDATE public.operation_steps
    SET outputs = v_outputs || jsonb_build_array(v_out), updated_at = now()
    WHERE id = v_step_thinset_set;
  END IF;

  -- Place and level: out-pl-lip
  SELECT coalesce(outputs, '[]'::jsonb) INTO v_outputs
  FROM public.operation_steps WHERE id = v_step_place;
  IF jsonb_typeof(v_outputs) IS DISTINCT FROM 'array' THEN
    v_outputs := '[]'::jsonb;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_outputs) e WHERE e->>'id' = 'out-pl-lip'
  ) THEN
    v_out := jsonb_build_object(
      'id', 'out-pl-lip',
      'name', 'Lippage inside limit while mortar is plastic',
      'description', 'Adjacent faces stay inside 1/32 in plus measured warpage for joints under 1/4 in.',
      'type', 'major-aesthetics',
      'requirement', 'Lippage is <=1/32 in plus measured warpage for joints under 1/4 in.',
      'qualityChecks', 'Straightedge and fingertip across shared edges while mortar is plastic. Mark and correct proud faces.',
      'keyInputs', jsonb_build_array('Tile warpage', 'Joint width', 'Beat-in method'),
      'potentialEffects', 'Proud edges cure into permanent shadow lines under raking light.',
      'mustGetRight', 'Correct lippage before skin-over.',
      'allowances', 'Inherent tile warpage is added to the table limit, not ignored.',
      'referenceSpecification', 'ANSI A108.02 lippage table.'
    );
    UPDATE public.operation_steps
    SET outputs = v_outputs || jsonb_build_array(v_out), updated_at = now()
    WHERE id = v_step_place;
  END IF;

  -- Place and level: out-pl-ej
  SELECT coalesce(outputs, '[]'::jsonb) INTO v_outputs
  FROM public.operation_steps WHERE id = v_step_place;
  IF jsonb_typeof(v_outputs) IS DISTINCT FROM 'array' THEN
    v_outputs := '[]'::jsonb;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_outputs) e WHERE e->>'id' = 'out-pl-ej'
  ) THEN
    v_out := jsonb_build_object(
      'id', 'out-pl-ej',
      'name', 'EJ171 joints left open in the setting bed',
      'description', 'Perimeter and field movement joints stay clear of thinset so sealant can fill them later.',
      'type', 'performance-durability',
      'requirement', 'EJ171 perimeter and field movement joints are left open for sealant (not thinset-bridged).',
      'qualityChecks', 'Verify movement joint locations against the plan before setting through them. Keep mortar out of those gaps.',
      'keyInputs', jsonb_build_array('EJ171 layout', 'Perimeter details', 'Setting sequence'),
      'potentialEffects', 'Thinset-bridged movement joints crack tile when the building moves.',
      'mustGetRight', 'Movement joints are gaps in the setting bed, not mortar lines.',
      'allowances', 'Joint width follows the EJ171 plan for the span and substrate.',
      'referenceSpecification', 'TCNA EJ171.'
    );
    UPDATE public.operation_steps
    SET outputs = v_outputs || jsonb_build_array(v_out), updated_at = now()
    WHERE id = v_step_place;
  END IF;

  -- Cure thinset before grouting: out-pg-cure
  SELECT coalesce(outputs, '[]'::jsonb) INTO v_outputs
  FROM public.operation_steps WHERE id = v_step_prep_grout;
  IF jsonb_typeof(v_outputs) IS DISTINCT FROM 'array' THEN
    v_outputs := '[]'::jsonb;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_outputs) e WHERE e->>'id' = 'out-pg-cure'
  ) THEN
    v_out := jsonb_build_object(
      'id', 'out-pg-cure',
      'name', 'Thinset cure window complete before grout prep',
      'description', 'Joints are opened for grout only after the thinset cure window on the bag is complete.',
      'type', 'performance-durability',
      'requirement', 'Thinset is cured per the bag before joints are opened for grout.',
      'qualityChecks', 'Record set time and ambient temperature. Compare to the bag cure window before raking joints.',
      'keyInputs', jsonb_build_array('Bag cure hours', 'Temperature', 'Set completion time'),
      'potentialEffects', 'Early grout shifts tile and traps moisture that weakens the bed.',
      'mustGetRight', 'Do not open joints for grout inside the cure window.',
      'allowances', 'Cooler temperatures extend the printed window; follow the bag, not a fixed calendar day.',
      'referenceSpecification', 'Setting mortar data sheet cure-before-grout statement.'
    );
    UPDATE public.operation_steps
    SET outputs = v_outputs || jsonb_build_array(v_out), updated_at = now()
    WHERE id = v_step_prep_grout;
  END IF;

  -- Apply grout: out-ag-pack
  SELECT coalesce(outputs, '[]'::jsonb) INTO v_outputs
  FROM public.operation_steps WHERE id = v_step_apply_grout;
  IF jsonb_typeof(v_outputs) IS DISTINCT FROM 'array' THEN
    v_outputs := '[]'::jsonb;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_outputs) e WHERE e->>'id' = 'out-ag-pack'
  ) THEN
    v_out := jsonb_build_object(
      'id', 'out-ag-pack',
      'name', 'Joints packed full depth',
      'description', 'Grout packs to full joint depth with no sand bridges or voids.',
      'type', 'performance-durability',
      'requirement', 'Joints are packed full depth with no voids.',
      'qualityChecks', 'Work diagonally across joints. Probe depth at sample joints. Re-pack any voided line.',
      'keyInputs', jsonb_build_array('Grout consistency', 'Float angle', 'Joint depth'),
      'potentialEffects', 'Underfilled joints crack and drop out under cleaning.',
      'mustGetRight', 'Surface fill is not full-depth pack.',
      'allowances', 'Sanded vs unsanded follows joint width on the bag.',
      'referenceSpecification', 'Grout data sheet packing instructions.'
    );
    UPDATE public.operation_steps
    SET outputs = v_outputs || jsonb_build_array(v_out), updated_at = now()
    WHERE id = v_step_apply_grout;
  END IF;

  -- Apply grout: out-ag-ej
  SELECT coalesce(outputs, '[]'::jsonb) INTO v_outputs
  FROM public.operation_steps WHERE id = v_step_apply_grout;
  IF jsonb_typeof(v_outputs) IS DISTINCT FROM 'array' THEN
    v_outputs := '[]'::jsonb;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_outputs) e WHERE e->>'id' = 'out-ag-ej'
  ) THEN
    v_out := jsonb_build_object(
      'id', 'out-ag-ej',
      'name', 'EJ171 joints kept free of grout',
      'description', 'Movement joints stay clear of grout so sealant can fill them after cure.',
      'type', 'performance-durability',
      'requirement', 'EJ171 movement joints are kept free of grout.',
      'qualityChecks', 'Mask or skip movement joints during pack. Probe perimeter and field EJ locations after wash.',
      'keyInputs', jsonb_build_array('EJ171 layout', 'Masking', 'Grout sequence'),
      'potentialEffects', 'Grout-bridged movement joints crack or tent the floor.',
      'mustGetRight', 'Cut out any accidental grout bridge before sealant.',
      'allowances', 'Sealant product and joint width follow the EJ171 plan.',
      'referenceSpecification', 'TCNA EJ171 and sealant data sheet.'
    );
    UPDATE public.operation_steps
    SET outputs = v_outputs || jsonb_build_array(v_out), updated_at = now()
    WHERE id = v_step_apply_grout;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Clear prior authored PFMEA for core steps only (children first).
  -- Professional clip/final rows are left intact for text UPDATE below.
  -- ---------------------------------------------------------------------------
  DELETE FROM public.pfmea_action_items
  WHERE failure_mode_id IN (
    SELECT fm.id FROM public.pfmea_failure_modes fm
    WHERE fm.operation_step_id = ANY (v_core_steps)
  );

  DELETE FROM public.pfmea_controls
  WHERE failure_mode_id IN (
    SELECT fm.id FROM public.pfmea_failure_modes fm
    WHERE fm.operation_step_id = ANY (v_core_steps)
  )
  OR cause_id IN (
    SELECT c.id FROM public.pfmea_potential_causes c
    JOIN public.pfmea_failure_modes fm ON fm.id = c.failure_mode_id
    WHERE fm.operation_step_id = ANY (v_core_steps)
  );

  DELETE FROM public.pfmea_potential_causes
  WHERE failure_mode_id IN (
    SELECT fm.id FROM public.pfmea_failure_modes fm
    WHERE fm.operation_step_id = ANY (v_core_steps)
  );

  DELETE FROM public.pfmea_potential_effects
  WHERE failure_mode_id IN (
    SELECT fm.id FROM public.pfmea_failure_modes fm
    WHERE fm.operation_step_id = ANY (v_core_steps)
  );

  DELETE FROM public.pfmea_failure_modes
  WHERE operation_step_id = ANY (v_core_steps);

  DELETE FROM public.pfmea_requirements
  WHERE operation_step_id = ANY (v_core_steps);

  -- ---------------------------------------------------------------------------
  -- Requirements (measurable limits).
  -- ---------------------------------------------------------------------------
  INSERT INTO public.pfmea_requirements (
    id, project_id, operation_step_id, output_id, requirement_text, display_order
  ) VALUES
  (v_req_ci_flat, v_project_id, v_step_inspect, 'out-ci-flat',
   'Substrate flatness is <=1/8 in in 10 ft (and <=1/16 in in 24 in) when any tile edge is >15 in; otherwise <=1/4 in in 10 ft.', 1),
  (v_req_ci_moist, v_project_id, v_step_inspect, 'out-ci-moist',
   'No soft, rotten, or elevated-moisture substrate remains under the finish plane before cover.', 2),
  (v_req_tm_cov, v_project_id, v_step_thinset_mem, 'out-tm-cov',
   'Membrane thinset coverage is >=80% dry with ridges collapsed before the sheet is accepted.', 1),
  (v_req_mem_bond, v_project_id, v_step_membrane, 'out-mem-bond',
   'Membrane is fully embedded, seams overlapped per manufacturer, with no voids under the sheet.', 1),
  (v_req_fb_plane, v_project_id, v_step_fasten_backer, 'out-fb-plane',
   'Backer board is flat, the fastener schedule is met, and gaps match the manufacturer.', 1),
  (v_req_tb_seal, v_project_id, v_step_tape_backer, 'out-tb-seal',
   'Backer seams are taped and sealed continuous across the field.', 1),
  (v_req_lay_cut, v_project_id, v_step_layout, 'out-lay-cut',
   'Perimeter cuts are >= half a tile, or meet the layout plan minimum where that plan is stricter.', 1),
  (v_req_ts_cov, v_project_id, v_step_thinset_set, 'out-ts-cov',
   'Mortar coverage is >=80% dry (>=95% if wet noted) with full corner support per ANSI A108.5.', 1),
  (v_req_ts_class, v_project_id, v_step_thinset_set, 'out-ts-class',
   'Mortar class matches the tile (LHT / ANSI A118.15 when any edge is >15 in).', 2),
  (v_req_pl_lip, v_project_id, v_step_place, 'out-pl-lip',
   'Lippage is <=1/32 in plus measured warpage for joints under 1/4 in.', 1),
  (v_req_pl_ej, v_project_id, v_step_place, 'out-pl-ej',
   'EJ171 perimeter and field movement joints are left open for sealant (not thinset-bridged).', 2),
  (v_req_pg_cure, v_project_id, v_step_prep_grout, 'out-pg-cure',
   'Thinset is cured per the bag before joints are opened for grout.', 1),
  (v_req_ag_pack, v_project_id, v_step_apply_grout, 'out-ag-pack',
   'Joints are packed full depth with no voids.', 1),
  (v_req_ag_ej, v_project_id, v_step_apply_grout, 'out-ag-ej',
   'EJ171 movement joints are kept free of grout.', 2);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 14 THEN
    RAISE EXCEPTION 'Expected 14 core PFMEA requirements, inserted %.', v_count;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Failure modes: anti-requirement narratives.
  -- ---------------------------------------------------------------------------
  INSERT INTO public.pfmea_failure_modes (
    id, project_id, operation_step_id, requirement_id, failure_mode, severity_score
  ) VALUES
  (v_fm_ci_flat, v_project_id, v_step_inspect, v_req_ci_flat,
   'Substrate variation exceeds 1/8 in in 10 ft (or 1/16 in in 24 in) under a straightedge for tile with any edge >15 in, or exceeds 1/4 in in 10 ft for smaller tile.', 7),
  (v_fm_ci_moist, v_project_id, v_step_inspect, v_req_ci_moist,
   'Soft or moisture-positive areas are left under the finish plane.', 8),
  (v_fm_tm_cov, v_project_id, v_step_thinset_mem, v_req_tm_cov,
   'Coverage under the membrane is below 80%, or uncollapsed ridges remain under the membrane.', 8),
  (v_fm_mem_bond, v_project_id, v_step_membrane, v_req_mem_bond,
   'Voids or unbonded seams remain under the membrane.', 8),
  (v_fm_fb_plane, v_project_id, v_step_fasten_backer, v_req_fb_plane,
   'Board plane or fastening is outside the manufacturer schedule or flatness limit.', 6),
  (v_fm_tb_seal, v_project_id, v_step_tape_backer, v_req_tb_seal,
   'Open or untaped seams remain in the backer field.', 6),
  (v_fm_lay_cut, v_project_id, v_step_layout, v_req_lay_cut,
   'Perimeter cuts are smaller than half a tile / the layout plan minimum.', 5),
  (v_fm_ts_cov, v_project_id, v_step_thinset_set, v_req_ts_cov,
   'Coverage is below ANSI A108.5 thresholds, or corners are unsupported.', 9),
  (v_fm_ts_class, v_project_id, v_step_thinset_set, v_req_ts_class,
   'Standard thinset is used under large-format / LHT-required tile.', 8),
  (v_fm_pl_lip, v_project_id, v_step_place, v_req_pl_lip,
   'Lippage exceeds 1/32 in plus warpage for joints under 1/4 in.', 7),
  (v_fm_pl_ej, v_project_id, v_step_place, v_req_pl_ej,
   'Movement joint locations are filled with thinset / setting bed.', 8),
  (v_fm_pg_cure, v_project_id, v_step_prep_grout, v_req_pg_cure,
   'Joints are opened for grout before the thinset cure window is complete.', 7),
  (v_fm_ag_pack, v_project_id, v_step_apply_grout, v_req_ag_pack,
   'Joints are underfilled / sand-bridged, leaving voids.', 6),
  (v_fm_ag_ej, v_project_id, v_step_apply_grout, v_req_ag_ej,
   'Movement joints are bridged with grout.', 8);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 14 THEN
    RAISE EXCEPTION 'Expected 14 core failure modes, inserted %.', v_count;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Effects
  -- ---------------------------------------------------------------------------
  INSERT INTO public.pfmea_potential_effects (failure_mode_id, effect_description, severity_score) VALUES
  (v_fm_ci_flat, 'Lippage and hollow spots lock into the finished field with no fix short of resetting tile.', 7),
  (v_fm_ci_moist, 'Covered soft or wet spots release later, taking membrane and tile with them.', 8),
  (v_fm_tm_cov, 'Unbonded membrane drums under traffic and fails at hollow zones.', 8),
  (v_fm_mem_bond, 'Hollow areas crack grout and tile once furniture and traffic load them.', 8),
  (v_fm_fb_plane, 'Rocking panels and proud fasteners telegraph through tile as cracked grout and lippage.', 6),
  (v_fm_tb_seal, 'Panel joints move independently and crack the grout line directly above the seam.', 6),
  (v_fm_lay_cut, 'A thin strip at a doorway or main wall chips, loosens, and dominates the first sight line.', 5),
  (v_fm_ts_cov, 'Hollow tile cracks under point load and forces a break-out repair.', 9),
  (v_fm_ts_class, 'Large-format tile sags or debonds because the bed never met the required class.', 8),
  (v_fm_pl_lip, 'Proud edges become permanent shadow lines under raking light after cure.', 7),
  (v_fm_pl_ej, 'Building movement cracks tile or tents the floor along the bridged joint.', 8),
  (v_fm_pg_cure, 'Early grout pressure shifts tile and leaves the setting bed weak and blotchy.', 7),
  (v_fm_ag_pack, 'Grout cracks and drops out of the joint under normal cleaning.', 6),
  (v_fm_ag_ej, 'Grout-bridged movement joints crack tile or tent the floor when the building moves.', 8);

  -- ---------------------------------------------------------------------------
  -- Causes (occurrence_driver in skill / attention / process_design)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.pfmea_potential_causes (
    failure_mode_id, cause_description, occurrence_score,
    occurrence_driver, implicated_item_kind, implicated_item_id
  ) VALUES
  (v_fm_ci_flat,
   'Flatness is judged by eye because no 10 ft straightedge pass is scheduled before cover.', 7,
   'process_design', 'output', 'out-ci-flat'),
  (v_fm_ci_flat,
   'High and low spots are noted but left uncorrected to keep the schedule.', 5,
   'attention', 'output', 'out-ci-flat'),
  (v_fm_ci_moist,
   'Suspect soft spots are skipped during a fast walk-through of the field.', 6,
   'attention', 'output', 'out-ci-moist'),
  (v_fm_ci_moist,
   'Moisture checks are omitted on concrete or prior wet areas before cover.', 5,
   'process_design', 'output', 'out-ci-moist'),
  (v_fm_tm_cov,
   'More area is combed than can be covered inside open time, so ridges skin before embed.', 6,
   'process_design', 'output', 'out-tm-cov'),
  (v_fm_tm_cov,
   'Embed pressure is light, so transfer is never verified under the sheet.', 5,
   'skill', 'output', 'out-tm-cov'),
  (v_fm_mem_bond,
   'The sheet is pressed by hand instead of worked flat from the center out.', 6,
   'skill', 'output', 'out-mem-bond'),
  (v_fm_mem_bond,
   'Seam overlap is eyeballed rather than measured to the printed dimension.', 5,
   'attention', 'output', 'out-mem-bond'),
  (v_fm_fb_plane,
   'Fastener spacing is stretched past the panel print to finish faster.', 6,
   'attention', 'output', 'out-fb-plane'),
  (v_fm_fb_plane,
   'No straightedge check is done after fastening, so rocking panels stay in place.', 5,
   'process_design', 'output', 'out-fb-plane'),
  (v_fm_tb_seal,
   'Seams at intersections are skipped when tape runs short near the end of a roll.', 5,
   'attention', 'output', 'out-tb-seal'),
  (v_fm_tb_seal,
   'Tape is laid without full mortar embed, leaving the mesh dry at the joint.', 5,
   'skill', 'output', 'out-tb-seal'),
  (v_fm_lay_cut,
   'The start line is set at a wall instead of balanced from the field center.', 6,
   'process_design', 'output', 'out-lay-cut'),
  (v_fm_lay_cut,
   'End cuts are not measured on a dry-lay before the first tile is set.', 5,
   'attention', 'output', 'out-lay-cut'),
  (v_fm_ts_cov,
   'Notch size is too small for the tile, so ridges never collapse into full contact.', 7,
   'skill', 'output', 'out-ts-cov'),
  (v_fm_ts_cov,
   'Lift checks are skipped, so unsupported corners go unseen until after cure.', 6,
   'process_design', 'output', 'out-ts-cov'),
  (v_fm_ts_class,
   'A leftover bag of standard thinset is used because the LHT bag is still sealed.', 6,
   'attention', 'output', 'out-ts-class'),
  (v_fm_ts_class,
   'Tile edge length is never checked against the mortar class before mixing.', 5,
   'process_design', 'output', 'out-ts-class'),
  (v_fm_pl_lip,
   'Beat-in stops when the tile looks seated, without a straightedge across shared edges.', 6,
   'skill', 'output', 'out-pl-lip'),
  (v_fm_pl_lip,
   'Proud edges are left because correction would slow the row.', 5,
   'attention', 'output', 'out-pl-lip'),
  (v_fm_pl_ej,
   'The EJ171 layout is not marked on the floor before setting through those lines.', 6,
   'process_design', 'output', 'out-pl-ej'),
  (v_fm_pl_ej,
   'Mortar is combed continuously across a perimeter gap that should stay open.', 5,
   'attention', 'output', 'out-pl-ej'),
  (v_fm_pg_cure,
   'Grout prep starts on a calendar day rather than against the bag cure window and temperature.', 6,
   'process_design', 'output', 'out-pg-cure'),
  (v_fm_pg_cure,
   'Set completion time is not recorded, so the cure window cannot be verified.', 5,
   'attention', 'output', 'out-pg-cure'),
  (v_fm_ag_pack,
   'The float is pulled along the joint instead of diagonally, leaving sand bridges.', 6,
   'skill', 'output', 'out-ag-pack'),
  (v_fm_ag_pack,
   'Surface fill is accepted without probing joint depth.', 5,
   'attention', 'output', 'out-ag-pack'),
  (v_fm_ag_ej,
   'Movement joints are not masked, so grout is packed straight through them.', 6,
   'process_design', 'output', 'out-ag-ej'),
  (v_fm_ag_ej,
   'Accidental grout bridges are left because cutting them out feels like rework.', 5,
   'attention', 'output', 'out-ag-ej');

  -- ---------------------------------------------------------------------------
  -- Controls
  -- ---------------------------------------------------------------------------
  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_ci_flat, c.id,
    'Schedule a 10 ft straightedge pass in both directions before any cover material is placed.',
    'prevention', NULL, 'procedural'
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_ci_flat
    AND c.occurrence_driver = 'process_design';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_ci_flat, c.id,
    'Mark highs and lows on the floor and block cover until measured corrections are done.',
    'detection', 3, NULL
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_ci_flat
    AND c.occurrence_driver = 'attention';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_ci_moist, c.id,
    'Probe every soft-looking zone and refuse cover until soft material is removed or replaced.',
    'prevention', NULL, 'mistake_proof'
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_ci_moist
    AND c.occurrence_driver = 'attention';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_ci_moist, c.id,
    'Run a moisture meter or plastic-sheet check on concrete / prior wet areas before cover.',
    'detection', 4, NULL
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_ci_moist
    AND c.occurrence_driver = 'process_design';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_tm_cov, c.id,
    'Comb only the area one sheet can cover inside open time; remix rather than stretch a skinned bed.',
    'prevention', NULL, 'procedural'
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_tm_cov
    AND c.occurrence_driver = 'process_design';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_tm_cov, c.id,
    'Lift a corner or sacrificial strip after embed and confirm >=80% transfer with collapsed ridges.',
    'detection', 3, NULL
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_tm_cov
    AND c.occurrence_driver = 'skill';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_mem_bond, c.id,
    'Work the sheet from the center out with a trowel or float until the fleece shows continuous contact.',
    'prevention', NULL, 'procedural'
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_mem_bond
    AND c.occurrence_driver = 'skill';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_mem_bond, c.id,
    'Measure seam overlaps against the printed dimension before accepting the joint.',
    'detection', 3, NULL
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_mem_bond
    AND c.occurrence_driver = 'attention';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_fb_plane, c.id,
    'Follow the panel print fastener grid; do not stretch spacing to finish a sheet faster.',
    'prevention', NULL, 'procedural'
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_fb_plane
    AND c.occurrence_driver = 'attention';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_fb_plane, c.id,
    'Straightedge each fastened panel and re-fasten or shim any rock before the next sheet.',
    'detection', 4, NULL
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_fb_plane
    AND c.occurrence_driver = 'process_design';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_tb_seal, c.id,
    'Stage enough tape for the full seam map before starting so intersections are not skipped.',
    'prevention', NULL, 'procedural'
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_tb_seal
    AND c.occurrence_driver = 'attention';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_tb_seal, c.id,
    'Confirm mesh pattern is fully covered by mortar; visible dry mesh means re-embed.',
    'detection', 3, NULL
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_tb_seal
    AND c.occurrence_driver = 'skill';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_lay_cut, c.id,
    'Balance the start line from the field center so both ends clear half tile or the plan minimum.',
    'prevention', NULL, 'procedural'
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_lay_cut
    AND c.occurrence_driver = 'process_design';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_lay_cut, c.id,
    'Dry-lay or measure both ends of primary runs and record cut widths before setting.',
    'detection', 3, NULL
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_lay_cut
    AND c.occurrence_driver = 'attention';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_ts_cov, c.id,
    'Use the notch size named for the tile size, with back-buttering required when any edge is >15 in.',
    'prevention', NULL, 'procedural'
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_ts_cov
    AND c.occurrence_driver = 'skill';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_ts_cov, c.id,
    'Lift one tile per 100 sq ft and confirm >=80% dry (>=95% wet) transfer with supported corners.',
    'detection', 3, NULL
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_ts_cov
    AND c.occurrence_driver = 'process_design';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_ts_class, c.id,
    'Match the open bag class to tile edge length before mixing; discard mismatched standard thinset for LFT.',
    'prevention', NULL, 'mistake_proof'
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_ts_class
    AND c.occurrence_driver = 'attention';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_ts_class, c.id,
    'Write the required mortar class on the layout card when any edge is >15 in, before the first batch.',
    'prevention', NULL, 'procedural'
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_ts_class
    AND c.occurrence_driver = 'process_design';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_pl_lip, c.id,
    'Straightedge every newly set shared edge while mortar is plastic and beat down proud faces.',
    'prevention', NULL, 'procedural'
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_pl_lip
    AND c.occurrence_driver = 'skill';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_pl_lip, c.id,
    'Mark any catch with tape and correct before the next tile is set.',
    'detection', 3, NULL
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_pl_lip
    AND c.occurrence_driver = 'attention';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_pl_ej, c.id,
    'Snap or mark EJ171 lines on the floor before setting; keep mortar out of those gaps.',
    'prevention', NULL, 'mistake_proof'
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_pl_ej
    AND c.occurrence_driver = 'process_design';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_pl_ej, c.id,
    'Probe perimeter and field movement gaps after each set pass; rake out any thinset bridge.',
    'detection', 3, NULL
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_pl_ej
    AND c.occurrence_driver = 'attention';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_pg_cure, c.id,
    'Grout prep starts only after recorded set time plus bag cure hours at the measured temperature.',
    'prevention', NULL, 'mistake_proof'
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_pg_cure
    AND c.occurrence_driver = 'process_design';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_pg_cure, c.id,
    'Write set-complete time on the layout card so the cure window can be checked before raking.',
    'prevention', NULL, 'procedural'
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_pg_cure
    AND c.occurrence_driver = 'attention';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_ag_pack, c.id,
    'Pack diagonally across joints and re-work any line that shows sand bridging at the surface.',
    'prevention', NULL, 'procedural'
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_ag_pack
    AND c.occurrence_driver = 'skill';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_ag_pack, c.id,
    'Probe sample joints for full depth before wash; re-pack any voided line.',
    'detection', 4, NULL
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_ag_pack
    AND c.occurrence_driver = 'attention';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_ag_ej, c.id,
    'Mask EJ171 joints before packing so grout cannot bridge them.',
    'prevention', NULL, 'mistake_proof'
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_ag_ej
    AND c.occurrence_driver = 'process_design';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_ag_ej, c.id,
    'Probe movement joints after wash and cut out any grout bridge before sealant.',
    'detection', 3, NULL
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_ag_ej
    AND c.occurrence_driver = 'attention';

  -- ---------------------------------------------------------------------------
  -- Action items on High severity (>=7) lines
  -- ---------------------------------------------------------------------------
  INSERT INTO public.pfmea_action_items (failure_mode_id, recommended_action, status) VALUES
  (v_fm_ci_flat,
   'Make a measured straightedge pass a hard gate before any membrane or backer cover starts.',
   'not_started'),
  (v_fm_ci_moist,
   'Add a moisture / soft-spot probe checklist item that blocks cover until clear.',
   'not_started'),
  (v_fm_tm_cov,
   'Limit comb area to one sheet at a time and require a transfer lift check at first embed.',
   'not_started'),
  (v_fm_mem_bond,
   'Require center-out float embed plus measured seam overlaps before the next sheet lands.',
   'not_started'),
  (v_fm_ts_cov,
   'Require a lift-check log (>=80% dry / >=95% wet with corner support) every 100 sq ft while setting.',
   'not_started'),
  (v_fm_ts_class,
   'Stage only the mortar class matching tile edge length; quarantine standard thinset on LFT jobs.',
   'not_started'),
  (v_fm_pl_lip,
   'Add a plastic-window straightedge check on every newly set shared edge before the next tile.',
   'not_started'),
  (v_fm_pl_ej,
   'Mark EJ171 lines on the floor before setting and block thinset across those gaps.',
   'not_started'),
  (v_fm_pg_cure,
   'Record set-complete time and enforce bag cure hours at temperature before joint prep.',
   'not_started'),
  (v_fm_ag_ej,
   'Mask movement joints before grout and block close-out while any grout bridge remains.',
   'not_started');

  -- ---------------------------------------------------------------------------
  -- Rewrite Professional clip/final requirements + FMs to anti-requirement form.
  -- Keep existing requirement_ids / failure_mode ids.
  -- ---------------------------------------------------------------------------
  UPDATE public.pfmea_requirements SET requirement_text =
    'Every shared edge carries clips at manufacturer spacing while mortar is plastic.',
    updated_at = now()
  WHERE id = v_req_clips_a;

  UPDATE public.pfmea_requirements SET requirement_text =
    'Adjacent faces stay within 1/32 in plus measured warpage after clip tension for joints under 1/4 in.',
    updated_at = now()
  WHERE id = v_req_clips_b;

  UPDATE public.pfmea_requirements SET requirement_text =
    'After tension, joint width matches the layout spacer plan.',
    updated_at = now()
  WHERE id = v_req_clips_c;

  UPDATE public.pfmea_requirements SET requirement_text =
    'Finished lippage under raking light stays within 1/32 in plus warpage for joints under 1/4 in.',
    updated_at = now()
  WHERE id = v_req_final_a;

  UPDATE public.pfmea_requirements SET requirement_text =
    'Joint taper and visible cut edges stay inside the layout and transition plan.',
    updated_at = now()
  WHERE id = v_req_final_b;

  UPDATE public.pfmea_requirements SET requirement_text =
    'Every EJ171 location is sealant, not grout.',
    updated_at = now()
  WHERE id = v_req_final_c;

  UPDATE public.pfmea_failure_modes SET failure_mode =
    'Shared edges lack clips at manufacturer spacing while mortar is plastic.',
    updated_at = now()
  WHERE id = v_fm_clips_a;

  UPDATE public.pfmea_failure_modes SET failure_mode =
    'Adjacent faces exceed 1/32 in plus measured warpage after clip tension (joints under 1/4 in).',
    updated_at = now()
  WHERE id = v_fm_clips_b;

  UPDATE public.pfmea_failure_modes SET failure_mode =
    'Post-tension joint width is outside the layout spacer plan.',
    updated_at = now()
  WHERE id = v_fm_clips_c;

  UPDATE public.pfmea_failure_modes SET failure_mode =
    'Finished lippage exceeds 1/32 in plus warpage under raking light.',
    updated_at = now()
  WHERE id = v_fm_final_a;

  UPDATE public.pfmea_failure_modes SET failure_mode =
    'Joint taper or visible cut edges fall outside the layout and transition plan.',
    updated_at = now()
  WHERE id = v_fm_final_b;

  UPDATE public.pfmea_failure_modes SET failure_mode =
    'EJ171 movement joints remain grout instead of sealant.',
    updated_at = now()
  WHERE id = v_fm_final_c;

  RAISE NOTICE
    'Tile reliability core PFMEA authored for project % (14 requirements/FMs; Professional clip/final FMs rewritten).',
    v_project_id;
END
$migration$;


-- ==== END 20260920100000_tile_reliability_core_pfmea.sql ====

-- ==== BEGIN 20260920101000_tile_reliability_register_and_skills.sql ====
-- Tile reliability Phase 2+3: safety/schedule/budget register risks + key skills.
-- Resolves Tile Flooring Installation root and steps by title under owned phases
-- (same titles as 20260920100000). Idempotent on risk_title and skill unique keys.
-- No em dashes. ASCII only.

DO $migration$
DECLARE
  v_project_id uuid;
  v_count integer;
  v_display_order integer;
  v_inserted integer := 0;
  v_skill_links integer := 0;

  v_step_inspect uuid;
  v_step_thinset_mem uuid;
  v_step_membrane uuid;
  v_step_fasten_backer uuid;
  v_step_tape_backer uuid;
  v_step_layout uuid;
  v_step_cut_tile uuid;
  v_step_thinset_set uuid;
  v_step_place uuid;
  v_step_prep_grout uuid;
  v_step_cure uuid;
  v_step_apply_grout uuid;
  v_step_heavy uuid;

  v_risk_10a1 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c2000010a1'::uuid;
  v_risk_10a2 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c2000010a2'::uuid;
  v_risk_10a3 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c2000010a3'::uuid;
  v_risk_10b1 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c2000010b1'::uuid;
  v_risk_10b2 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c2000010b2'::uuid;
  v_risk_10b3 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c2000010b3'::uuid;
  v_risk_10b4 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c2000010b4'::uuid;
  v_risk_10c1 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c2000010c1'::uuid;
  v_risk_10c2 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c2000010c2'::uuid;
  v_risk_10c3 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c2000010c3'::uuid;
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

  SELECT os.id INTO v_step_inspect
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'clean and inspect subfloor'
  LIMIT 1;

  SELECT os.id INTO v_step_thinset_mem
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'spread mortar for membrane'
  LIMIT 1;

  SELECT os.id INTO v_step_membrane
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'embed membrane and detail seams'
  LIMIT 1;

  SELECT os.id INTO v_step_fasten_backer
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'fasten backer to subfloor'
  LIMIT 1;

  SELECT os.id INTO v_step_tape_backer
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'tape or mesh seams and embed'
  LIMIT 1;

  SELECT os.id INTO v_step_layout
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'layout and reference lines'
  LIMIT 1;

  SELECT os.id INTO v_step_cut_tile
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'cut tiles to layout'
  LIMIT 1;

  SELECT os.id INTO v_step_thinset_set
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'spread mortar and verify coverage'
  LIMIT 1;

  SELECT os.id INTO v_step_place
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'set tile, beat-in, and check plane'
  LIMIT 1;

  SELECT os.id INTO v_step_prep_grout
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'prepare joints for grout'
  LIMIT 1;

  SELECT os.id INTO v_step_cure
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'cure thinset before grouting'
  LIMIT 1;

  SELECT os.id INTO v_step_apply_grout
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'pack grout and initial clean'
  LIMIT 1;

  IF v_step_inspect IS NULL
     OR v_step_thinset_mem IS NULL
     OR v_step_membrane IS NULL
     OR v_step_fasten_backer IS NULL
     OR v_step_tape_backer IS NULL
     OR v_step_layout IS NULL
     OR v_step_cut_tile IS NULL
     OR v_step_thinset_set IS NULL
     OR v_step_place IS NULL
     OR v_step_prep_grout IS NULL
     OR v_step_cure IS NULL
     OR v_step_apply_grout IS NULL THEN
    RAISE EXCEPTION
      'Tile register steps missing (inspect=%, thinset_mem=%, membrane=%, fasten=%, tape=%, layout=%, cut_tile=%, thinset_set=%, place=%, prep_grout=%, cure=%, apply_grout=%).',
      v_step_inspect, v_step_thinset_mem, v_step_membrane, v_step_fasten_backer,
      v_step_tape_backer, v_step_layout, v_step_cut_tile, v_step_thinset_set, v_step_place,
      v_step_prep_grout, v_step_cure, v_step_apply_grout;
  END IF;

  v_step_heavy := v_step_fasten_backer;

  SELECT coalesce(max(r.display_order), 0) INTO v_display_order
  FROM public.project_risks r
  WHERE r.project_id = v_project_id;

  -- -------------------------------------------------------------------------
  -- 10a1 silica dust (safety)
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM public.project_risks r
    WHERE r.project_id = v_project_id
      AND (
        r.id = v_risk_10a1
        OR lower(btrim(r.risk_title)) = 'dry or inadequately wetted tile cutting releasing silica dust'
      )
  ) THEN
    v_display_order := v_display_order + 1;
    INSERT INTO public.project_risks (
      id, project_id, operation_step_id, risk_title, risk_description, risk_dimension,
      severity_score, occurrence_score, detection_score, likelihood, severity,
      schedule_impact_low_days, schedule_impact_high_days,
      budget_impact_low, budget_impact_high, mitigation_effort_level,
      occurrence_driver, prevention_strength, mitigation_strategy, mitigation_actions,
      recommendation, benefit, display_order
    ) VALUES (
      v_risk_10a1, v_project_id, v_step_cut_tile,
      'Dry or inadequately wetted tile cutting releasing silica dust',
      'Dry cutting ceramic or porcelain releases respirable crystalline silica. Wet the cut or capture dust before the blade spins dry.',
      'safety', 8, 5, 4, 'medium', 'high',
      1, 5, 50, 400, 'low',
      'process_design', 'procedural',
      'Stage a wet saw or continuous water feed for every tile cut, and keep a fitted respirator ready when any dry cut cannot be avoided.',
      jsonb_build_array(
        jsonb_build_object(
          'action', 'Confirm the wet saw tank is filled and the blade is wet before the first cut of the day',
          'benefit', 'Stops the primary silica release path at the blade',
          'completed', false
        ),
        jsonb_build_object(
          'action', 'Ban dry score-and-snap on porcelain larger than a hand tool can break without grinding',
          'benefit', 'Keeps dusty grind passes off the schedule',
          'completed', false
        ),
        jsonb_build_object(
          'action', 'If a dry cut is unavoidable, fit a P100 respirator and local exhaust before the cut starts',
          'benefit', 'Limits inhalation when wet cutting is not possible',
          'completed', false
        )
      ),
      'Do not dry-cut tile. Wet the blade or stop until water and PPE are ready.',
      'Silica exposure can force multi-day work stoppage plus $50-$400 in PPE and cleanup when cuts run dry indoors.',
      v_display_order
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'Tile risk 10a1 insert expected 1 row, got %.', v_count;
    END IF;
    v_inserted := v_inserted + 1;
  END IF;

  -- -------------------------------------------------------------------------
  -- 10a2 indoor cutting without PPE / exhaust
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM public.project_risks r
    WHERE r.project_id = v_project_id
      AND (
        r.id = v_risk_10a2
        OR lower(btrim(r.risk_title)) = 'indoor cutting without ppe or exhaust ventilation'
      )
  ) THEN
    v_display_order := v_display_order + 1;
    INSERT INTO public.project_risks (
      id, project_id, operation_step_id, risk_title, risk_description, risk_dimension,
      severity_score, occurrence_score, detection_score, likelihood, severity,
      schedule_impact_low_days, schedule_impact_high_days,
      budget_impact_low, budget_impact_high, mitigation_effort_level,
      occurrence_driver, prevention_strength, mitigation_strategy, mitigation_actions,
      recommendation, benefit, display_order
    ) VALUES (
      v_risk_10a2, v_project_id, v_step_cut_tile,
      'Indoor cutting without PPE or exhaust ventilation',
      'Cutting indoors without a respirator and exhaust path spreads dust into occupied rooms and lungs.',
      'safety', 7, 5, 3, 'medium', 'high',
      1, 4, 40, 350, 'low',
      'attention', 'procedural',
      'Move cutting outdoors or into a contained exhaust zone, and do not start the saw until respirator and exhaust are on.',
      jsonb_build_array(
        jsonb_build_object(
          'action', 'Set up plastic containment and a window/door exhaust fan on the cut station before power tools run',
          'benefit', 'Keeps dust out of living spaces',
          'completed', false
        ),
        jsonb_build_object(
          'action', 'Put on a fitted respirator rated for silica before the first indoor cut',
          'benefit', 'Protects the cutter when containment is imperfect',
          'completed', false
        ),
        jsonb_build_object(
          'action', 'Prefer outdoor wet cutting when weather and haul path allow',
          'benefit', 'Removes the indoor exposure path entirely',
          'completed', false
        )
      ),
      'Do not cut tile indoors until PPE and exhaust are confirmed ready.',
      'Indoor dust events commonly cost 1-4 days of cleanup delay plus $40-$350 in containment and PPE.',
      v_display_order
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'Tile risk 10a2 insert expected 1 row, got %.', v_count;
    END IF;
    v_inserted := v_inserted + 1;
  END IF;

  -- -------------------------------------------------------------------------
  -- 10a3 solo heavy handling
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM public.project_risks r
    WHERE r.project_id = v_project_id
      AND (
        r.id = v_risk_10a3
        OR lower(btrim(r.risk_title)) = 'solo handling of heavy tile boxes or backer sheets'
      )
  ) THEN
    v_display_order := v_display_order + 1;
    INSERT INTO public.project_risks (
      id, project_id, operation_step_id, risk_title, risk_description, risk_dimension,
      severity_score, occurrence_score, detection_score, likelihood, severity,
      schedule_impact_low_days, schedule_impact_high_days,
      budget_impact_low, budget_impact_high, mitigation_effort_level,
      occurrence_driver, prevention_strength, mitigation_strategy, mitigation_actions,
      recommendation, benefit, display_order
    ) VALUES (
      v_risk_10a3, v_project_id, v_step_heavy,
      'Solo handling of heavy tile boxes or backer sheets',
      'Lifting full tile boxes or backer sheets alone strains backs and drops material that cracks on impact.',
      'safety', 6, 5, 4, 'medium', 'medium',
      1, 7, 75, 600, 'medium',
      'skill', 'procedural',
      'Stage a helper or mechanical aid for every sheet and full box move, and break packs before climbing stairs.',
      jsonb_build_array(
        jsonb_build_object(
          'action', 'Schedule a helper for backer and tile delivery into the room before fasten or set day',
          'benefit', 'Removes solo lifts of full packs and sheets',
          'completed', false
        ),
        jsonb_build_object(
          'action', 'Split tile boxes into half-packs at the truck before stair climbs',
          'benefit', 'Cuts lift weight without changing the order',
          'completed', false
        ),
        jsonb_build_object(
          'action', 'Use a panel carrier or furniture dolly for backer sheets longer than arm span',
          'benefit', 'Keeps sheets controllable and off the body',
          'completed', false
        )
      ),
      'Do not carry full tile boxes or full backer sheets alone. Split the load or get help first.',
      'Solo handling injuries and dropped material commonly cost 1-7 days plus $75-$600 in replacements and care.',
      v_display_order
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'Tile risk 10a3 insert expected 1 row, got %.', v_count;
    END IF;
    v_inserted := v_inserted + 1;
  END IF;

  -- -------------------------------------------------------------------------
  -- 10b1 grout before thinset cure
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM public.project_risks r
    WHERE r.project_id = v_project_id
      AND (
        r.id = v_risk_10b1
        OR lower(btrim(r.risk_title)) = 'grouting started before thinset cure window'
      )
  ) THEN
    v_display_order := v_display_order + 1;
    INSERT INTO public.project_risks (
      id, project_id, operation_step_id, risk_title, risk_description, risk_dimension,
      severity_score, occurrence_score, detection_score, likelihood, severity,
      schedule_impact_low_days, schedule_impact_high_days,
      budget_impact_low, budget_impact_high, mitigation_effort_level,
      occurrence_driver, prevention_strength, mitigation_strategy, mitigation_actions,
      recommendation, benefit, display_order
    ) VALUES (
      v_risk_10b1, v_project_id, v_step_cure,
      'Grouting started before thinset cure window',
      'Opening joints and packing grout inside the bag cure window shifts tile and weakens the bed.',
      'schedule', 6, 5, 3, 'medium', 'medium',
      1, 3, 100, 900, 'low',
      'process_design', 'procedural',
      'Record set-complete time and ambient temperature, then open joints only after bag cure hours at that temperature.',
      jsonb_build_array(
        jsonb_build_object(
          'action', 'Write set-complete time and room temperature on the layout card when the last tile is beat in',
          'benefit', 'Makes the cure window checkable before grout prep',
          'completed', false
        ),
        jsonb_build_object(
          'action', 'Block Cure thinset before grouting until bag cure hours elapse at the measured temperature',
          'benefit', 'Stops calendar-day guessing from starting grout early',
          'completed', false
        ),
        jsonb_build_object(
          'action', 'If the window is still open, slip the grout day rather than rake joints early',
          'benefit', 'Trades one idle day for avoiding a reset',
          'completed', false
        )
      ),
      'Do not prepare joints for grout until the thinset cure window on the bag is complete.',
      'Early grout commonly costs 1-3 days of slip plus $100-$900 when tile shifts and must be reset.',
      v_display_order
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'Tile risk 10b1 insert expected 1 row, got %.', v_count;
    END IF;
    v_inserted := v_inserted + 1;
  END IF;

  -- -------------------------------------------------------------------------
  -- 10b2 wet saw / leveling system missing
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM public.project_risks r
    WHERE r.project_id = v_project_id
      AND (
        r.id = v_risk_10b2
        OR lower(btrim(r.risk_title)) = 'wet saw or leveling system missing at set time'
      )
  ) THEN
    v_display_order := v_display_order + 1;
    INSERT INTO public.project_risks (
      id, project_id, operation_step_id, risk_title, risk_description, risk_dimension,
      severity_score, occurrence_score, detection_score, likelihood, severity,
      schedule_impact_low_days, schedule_impact_high_days,
      budget_impact_low, budget_impact_high, mitigation_effort_level,
      occurrence_driver, prevention_strength, mitigation_strategy, mitigation_actions,
      recommendation, benefit, display_order
    ) VALUES (
      v_risk_10b2, v_project_id, v_step_place,
      'Wet saw or leveling system missing at set time',
      'Set day stalls when the wet saw or clip/wedge leveling system is still at the store or rental counter.',
      'schedule', 5, 4, 2, 'medium', 'medium',
      1, 4, 40, 250, 'low',
      'process_design', 'procedural',
      'Stage the wet saw and leveling clips the day before Place and Level, and confirm ownership or rental pickup hours.',
      jsonb_build_array(
        jsonb_build_object(
          'action', 'Checklist wet saw, blade, and water tank as on-site the evening before set day',
          'benefit', 'Surfaces a missing saw before thinset is mixed',
          'completed', false
        ),
        jsonb_build_object(
          'action', 'Count leveling clips and wedges against the tile count plus 10 percent spare before set',
          'benefit', 'Avoids mid-row store runs',
          'completed', false
        ),
        jsonb_build_object(
          'action', 'Book rental pickup for the morning before set if the saw is not owned',
          'benefit', 'Aligns tool availability with the set window',
          'completed', false
        )
      ),
      'Do not mix setting mortar until the wet saw and leveling system are confirmed on site.',
      'Missing cut or leveling tools commonly idle the crew 1-4 days and add $40-$250 in rush rentals.',
      v_display_order
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'Tile risk 10b2 insert expected 1 row, got %.', v_count;
    END IF;
    v_inserted := v_inserted + 1;
  END IF;

  -- -------------------------------------------------------------------------
  -- 10b3 open tile / layout decisions
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM public.project_risks r
    WHERE r.project_id = v_project_id
      AND (
        r.id = v_risk_10b3
        OR lower(btrim(r.risk_title)) = 'tile or layout decisions still open when cutting starts'
      )
  ) THEN
    v_display_order := v_display_order + 1;
    INSERT INTO public.project_risks (
      id, project_id, operation_step_id, risk_title, risk_description, risk_dimension,
      severity_score, occurrence_score, detection_score, likelihood, severity,
      schedule_impact_low_days, schedule_impact_high_days,
      budget_impact_low, budget_impact_high, mitigation_effort_level,
      occurrence_driver, prevention_strength, mitigation_strategy, mitigation_actions,
      recommendation, benefit, display_order
    ) VALUES (
      v_risk_10b3, v_project_id, v_step_layout,
      'Tile or layout decisions still open when cutting starts',
      'Unresolved pattern, direction, or border choices force re-cuts and idle time once the saw is hot.',
      'schedule', 5, 5, 3, 'medium', 'medium',
      1, 5, 50, 400, 'low',
      'attention', 'procedural',
      'Close pattern, direction, and border decisions on the layout card before Measure and Cut starts.',
      jsonb_build_array(
        jsonb_build_object(
          'action', 'Dry-lay or mark the start line and record cut widths before any power cut',
          'benefit', 'Locks the layout before material is committed',
          'completed', false
        ),
        jsonb_build_object(
          'action', 'Resolve tile direction and accent borders in writing the day before cut day',
          'benefit', 'Removes mid-cut debate from the critical path',
          'completed', false
        ),
        jsonb_build_object(
          'action', 'If two options remain open, stop cutting and choose one before the next piece',
          'benefit', 'Prevents a pile of wrong-size cuts',
          'completed', false
        )
      ),
      'Do not start Measure and Cut while pattern, direction, or border decisions are still open.',
      'Open layout decisions commonly add 1-5 days of slip plus $50-$400 in wasted cuts.',
      v_display_order
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'Tile risk 10b3 insert expected 1 row, got %.', v_count;
    END IF;
    v_inserted := v_inserted + 1;
  END IF;

  -- -------------------------------------------------------------------------
  -- 10b4 permit / inspection lag
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM public.project_risks r
    WHERE r.project_id = v_project_id
      AND (
        r.id = v_risk_10b4
        OR lower(btrim(r.risk_title)) = 'permit or inspection lag after work that needed approval'
      )
  ) THEN
    v_display_order := v_display_order + 1;
    INSERT INTO public.project_risks (
      id, project_id, operation_step_id, risk_title, risk_description, risk_dimension,
      severity_score, occurrence_score, detection_score, likelihood, severity,
      schedule_impact_low_days, schedule_impact_high_days,
      budget_impact_low, budget_impact_high, mitigation_effort_level,
      occurrence_driver, prevention_strength, mitigation_strategy, mitigation_actions,
      recommendation, benefit, display_order
    ) VALUES (
      v_risk_10b4, v_project_id, v_step_inspect,
      'Permit or inspection lag after work that needed approval',
      'Cover work that required a permit or inspection waits on the AHJ calendar and stalls the finish plane.',
      'schedule', 5, 3, 4, 'low', 'medium',
      2, 14, 0, 200, 'medium',
      'process_design', 'procedural',
      'Confirm whether substrate, membrane, or electrical/plumbing adjacency needs a permit before Clean and Inspect closes, and book the inspection on the schedule.',
      jsonb_build_array(
        jsonb_build_object(
          'action', 'Ask the AHJ whether this floor path needs a permit before any cover material is ordered',
          'benefit', 'Surfaces lag before the crew is mobilized',
          'completed', false
        ),
        jsonb_build_object(
          'action', 'Book the inspection date as soon as the inspectable work is complete',
          'benefit', 'Starts the lag clock instead of waiting until set day',
          'completed', false
        ),
        jsonb_build_object(
          'action', 'Hold membrane or backer cover until the inspection clears when the AHJ requires it',
          'benefit', 'Avoids tear-out of covered work',
          'completed', false
        )
      ),
      'Do not cover work that still needs a permit or inspection clearance.',
      'Inspection lag commonly adds 2-14 calendar days when approval was required and not booked early.',
      v_display_order
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'Tile risk 10b4 insert expected 1 row, got %.', v_count;
    END IF;
    v_inserted := v_inserted + 1;
  END IF;

  -- -------------------------------------------------------------------------
  -- 10c1 moisture / soft subfloor discovery
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM public.project_risks r
    WHERE r.project_id = v_project_id
      AND (
        r.id = v_risk_10c1
        OR lower(btrim(r.risk_title)) = 'moisture or soft subfloor discovered after cover-up start'
      )
  ) THEN
    v_display_order := v_display_order + 1;
    INSERT INTO public.project_risks (
      id, project_id, operation_step_id, risk_title, risk_description, risk_dimension,
      severity_score, occurrence_score, detection_score, likelihood, severity,
      schedule_impact_low_days, schedule_impact_high_days,
      budget_impact_low, budget_impact_high, mitigation_effort_level,
      occurrence_driver, prevention_strength, mitigation_strategy, mitigation_actions,
      recommendation, benefit, display_order
    ) VALUES (
      v_risk_10c1, v_project_id, v_step_inspect,
      'Moisture or soft subfloor discovered after cover-up start',
      'Soft or moisture-positive substrate found after membrane or backer starts forces tear-out and remobilization.',
      'budget', 8, 5, 4, 'medium', 'high',
      2, 10, 200, 2500, 'medium',
      'attention', 'procedural',
      'Probe soft spots and meter or sheet-test moisture before any cover material is placed, and stop cover when readings fail.',
      jsonb_build_array(
        jsonb_build_object(
          'action', 'Walk the field with a probe and moisture meter before ordering membrane or backer',
          'benefit', 'Finds soft or wet zones while they are still cheap to fix',
          'completed', false
        ),
        jsonb_build_object(
          'action', 'Mark and remediate every failed spot before Clean and Inspect is closed',
          'benefit', 'Keeps discovery cost off the cover path',
          'completed', false
        ),
        jsonb_build_object(
          'action', 'If moisture concern is flagged on the run, re-check the field the morning cover starts',
          'benefit', 'Catches overnight or missed wet spots',
          'completed', false
        )
      ),
      'Do not start cover while soft or moisture-positive substrate remains under the finish plane.',
      'Late moisture discovery commonly costs $200-$2500 and 2-10 days when cover must be torn out.',
      v_display_order
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'Tile risk 10c1 insert expected 1 row, got %.', v_count;
    END IF;
    v_inserted := v_inserted + 1;
  END IF;

  -- -------------------------------------------------------------------------
  -- 10c2 self-leveler added after flatness fail
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM public.project_risks r
    WHERE r.project_id = v_project_id
      AND (
        r.id = v_risk_10c2
        OR lower(btrim(r.risk_title)) = 'self-leveler or leveling compound added after flatness fail'
      )
  ) THEN
    v_display_order := v_display_order + 1;
    INSERT INTO public.project_risks (
      id, project_id, operation_step_id, risk_title, risk_description, risk_dimension,
      severity_score, occurrence_score, detection_score, likelihood, severity,
      schedule_impact_low_days, schedule_impact_high_days,
      budget_impact_low, budget_impact_high, mitigation_effort_level,
      occurrence_driver, prevention_strength, mitigation_strategy, mitigation_actions,
      recommendation, benefit, display_order
    ) VALUES (
      v_risk_10c2, v_project_id, v_step_inspect,
      'Self-leveler or leveling compound added after flatness fail',
      'A failed straightedge check after the crew is mobilized adds unplanned self-leveler bags, primer, and cure days.',
      'budget', 6, 5, 3, 'medium', 'medium',
      1, 5, 150, 1800, 'medium',
      'process_design', 'procedural',
      'Run the flatness check before material orders close, and start the Self-Leveler Application catalog project when highs and lows exceed the tile limit.',
      jsonb_build_array(
        jsonb_build_object(
          'action', 'Straightedge the field in both directions before buying membrane or backer',
          'benefit', 'Prices leveler into the plan instead of as a surprise',
          'completed', false
        ),
        jsonb_build_object(
          'action', 'If variation exceeds the tile flatness limit, start the Self-Leveler Application catalog project before cover',
          'benefit', 'Uses the companion template instead of improvising bags mid-job',
          'completed', false
        ),
        jsonb_build_object(
          'action', 'Hold a contingency line for primer and leveler when the substrate is unknown',
          'benefit', 'Absorbs bag count growth without stopping the job',
          'completed', false
        )
      ),
      'Do not proceed to cover after a flatness fail. Start Self-Leveler Application and cure before setting.',
      'Unplanned leveler after a flatness fail commonly costs $150-$1800 plus 1-5 cure days.',
      v_display_order
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'Tile risk 10c2 insert expected 1 row, got %.', v_count;
    END IF;
    v_inserted := v_inserted + 1;
  END IF;

  -- -------------------------------------------------------------------------
  -- 10c3 cut waste / dye-lot repurchase (do not duplicate Expired thinset)
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM public.project_risks r
    WHERE r.project_id = v_project_id
      AND (
        r.id = v_risk_10c3
        OR lower(btrim(r.risk_title)) = 'cut waste and dye-lot repurchase from undersized order'
      )
  ) THEN
    v_display_order := v_display_order + 1;
    INSERT INTO public.project_risks (
      id, project_id, operation_step_id, risk_title, risk_description, risk_dimension,
      severity_score, occurrence_score, detection_score, likelihood, severity,
      schedule_impact_low_days, schedule_impact_high_days,
      budget_impact_low, budget_impact_high, mitigation_effort_level,
      occurrence_driver, prevention_strength, mitigation_strategy, mitigation_actions,
      recommendation, benefit, display_order
    ) VALUES (
      v_risk_10c3, v_project_id, v_step_layout,
      'Cut waste and dye-lot repurchase from undersized order',
      'Ordering only net area leaves no waste factor, so short boxes force a second buy that may not match dye lot.',
      'budget', 5, 5, 4, 'medium', 'medium',
      1, 7, 75, 900, 'low',
      'skill', 'procedural',
      'Order tile with the waste factor for the layout complexity, and buy all boxes from one dye lot before cutting starts.',
      jsonb_build_array(
        jsonb_build_object(
          'action', 'Calculate area plus waste (typically 10-15 percent, more for diagonals) before the PO is placed',
          'benefit', 'Funds cut waste instead of a second trip',
          'completed', false
        ),
        jsonb_build_object(
          'action', 'Verify every box shares the same dye-lot code at pickup',
          'benefit', 'Prevents shade mismatch on a restock',
          'completed', false
        ),
        jsonb_build_object(
          'action', 'Hold one unopened spare box until grout is complete before returning extras',
          'benefit', 'Covers late breaks without a dye-lot gamble',
          'completed', false
        )
      ),
      'Do not start Measure and Cut on an order sized to net area only. Add waste and confirm dye lot.',
      'Undersized orders commonly force $75-$900 in restock and shade mismatch when dye lots diverge.',
      v_display_order
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'Tile risk 10c3 insert expected 1 row, got %.', v_count;
    END IF;
    v_inserted := v_inserted + 1;
  END IF;

  IF v_inserted < 1 THEN
    RAISE NOTICE 'Tile register risks: no new rows (titles or ids already present).';
  ELSE
    RAISE NOTICE 'Tile register risks inserted: %.', v_inserted;
  END IF;

  -- Assert expected stable ids exist after this migration (new or prior).
  SELECT count(*)::integer INTO v_count
  FROM public.project_risks r
  WHERE r.project_id = v_project_id
    AND r.id IN (
      v_risk_10a1, v_risk_10a2, v_risk_10a3,
      v_risk_10b1, v_risk_10b2, v_risk_10b3, v_risk_10b4,
      v_risk_10c1, v_risk_10c2, v_risk_10c3
    );
  IF v_count <> 10 THEN
    RAISE EXCEPTION
      'Expected 10 Tile reliability register risks by stable id after Phase 2/3, found %.',
      v_count;
  END IF;

  -- -------------------------------------------------------------------------
  -- project_key_skills (ON CONFLICT DO NOTHING on project_id, skill_id)
  -- -------------------------------------------------------------------------
  INSERT INTO public.project_key_skills (project_id, skill_id, display_order, required_for_kickoff)
  SELECT v_project_id, sd.id, v.display_order, v.required_for_kickoff
  FROM (VALUES
    ('substrate-flatness', 10, true),
    ('mixing-materials', 20, true),
    ('cutting-tile-lumber-drywall', 30, true),
    ('layout-measuring', 40, true),
    ('finish-grout-caulk-paint', 50, true),
    ('waterproofing-wet-areas', 60, false),
    ('heavy-lifting-handling', 70, false),
    ('inspection-qc-checks', 80, false),
    ('site-prep-protection', 90, false)
  ) AS v(slug, display_order, required_for_kickoff)
  JOIN public.skill_definitions sd ON sd.slug = v.slug
  ON CONFLICT (project_id, skill_id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Tile project_key_skills rows inserted this run: %.', v_count;

  SELECT count(*)::integer INTO v_count
  FROM public.project_key_skills pks
  JOIN public.skill_definitions sd ON sd.id = pks.skill_id
  WHERE pks.project_id = v_project_id
    AND sd.slug IN (
      'substrate-flatness', 'mixing-materials', 'cutting-tile-lumber-drywall',
      'layout-measuring', 'finish-grout-caulk-paint', 'waterproofing-wet-areas',
      'heavy-lifting-handling', 'inspection-qc-checks', 'site-prep-protection'
    );
  IF v_count <> 9 THEN
    RAISE EXCEPTION 'Expected 9 Tile project_key_skills after seed, found %.', v_count;
  END IF;

  -- -------------------------------------------------------------------------
  -- operation_step_skills primary links (INSERT...SELECT WHERE NOT EXISTS)
  -- -------------------------------------------------------------------------
  INSERT INTO public.operation_step_skills (operation_step_id, skill_id, importance)
  SELECT v_step_inspect, sd.id, 'primary'
  FROM public.skill_definitions sd
  WHERE sd.slug = 'substrate-flatness'
    AND NOT EXISTS (
      SELECT 1 FROM public.operation_step_skills oss
      WHERE oss.operation_step_id = v_step_inspect AND oss.skill_id = sd.id
    );
  GET DIAGNOSTICS v_count = ROW_COUNT; v_skill_links := v_skill_links + v_count;

  INSERT INTO public.operation_step_skills (operation_step_id, skill_id, importance)
  SELECT v_step_inspect, sd.id, 'primary'
  FROM public.skill_definitions sd
  WHERE sd.slug = 'inspection-qc-checks'
    AND NOT EXISTS (
      SELECT 1 FROM public.operation_step_skills oss
      WHERE oss.operation_step_id = v_step_inspect AND oss.skill_id = sd.id
    );
  GET DIAGNOSTICS v_count = ROW_COUNT; v_skill_links := v_skill_links + v_count;

  INSERT INTO public.operation_step_skills (operation_step_id, skill_id, importance)
  SELECT v_step_thinset_mem, sd.id, 'primary'
  FROM public.skill_definitions sd
  WHERE sd.slug = 'mixing-materials'
    AND NOT EXISTS (
      SELECT 1 FROM public.operation_step_skills oss
      WHERE oss.operation_step_id = v_step_thinset_mem AND oss.skill_id = sd.id
    );
  GET DIAGNOSTICS v_count = ROW_COUNT; v_skill_links := v_skill_links + v_count;

  INSERT INTO public.operation_step_skills (operation_step_id, skill_id, importance)
  SELECT v_step_thinset_set, sd.id, 'primary'
  FROM public.skill_definitions sd
  WHERE sd.slug = 'mixing-materials'
    AND NOT EXISTS (
      SELECT 1 FROM public.operation_step_skills oss
      WHERE oss.operation_step_id = v_step_thinset_set AND oss.skill_id = sd.id
    );
  GET DIAGNOSTICS v_count = ROW_COUNT; v_skill_links := v_skill_links + v_count;

  INSERT INTO public.operation_step_skills (operation_step_id, skill_id, importance)
  SELECT v_step_membrane, sd.id, 'primary'
  FROM public.skill_definitions sd
  WHERE sd.slug = 'mixing-materials'
    AND NOT EXISTS (
      SELECT 1 FROM public.operation_step_skills oss
      WHERE oss.operation_step_id = v_step_membrane AND oss.skill_id = sd.id
    );
  GET DIAGNOSTICS v_count = ROW_COUNT; v_skill_links := v_skill_links + v_count;

  INSERT INTO public.operation_step_skills (operation_step_id, skill_id, importance)
  SELECT v_step_tape_backer, sd.id, 'primary'
  FROM public.skill_definitions sd
  WHERE sd.slug = 'waterproofing-wet-areas'
    AND NOT EXISTS (
      SELECT 1 FROM public.operation_step_skills oss
      WHERE oss.operation_step_id = v_step_tape_backer AND oss.skill_id = sd.id
    );
  GET DIAGNOSTICS v_count = ROW_COUNT; v_skill_links := v_skill_links + v_count;

  INSERT INTO public.operation_step_skills (operation_step_id, skill_id, importance)
  SELECT v_step_layout, sd.id, 'primary'
  FROM public.skill_definitions sd
  WHERE sd.slug = 'layout-measuring'
    AND NOT EXISTS (
      SELECT 1 FROM public.operation_step_skills oss
      WHERE oss.operation_step_id = v_step_layout AND oss.skill_id = sd.id
    );
  GET DIAGNOSTICS v_count = ROW_COUNT; v_skill_links := v_skill_links + v_count;

  INSERT INTO public.operation_step_skills (operation_step_id, skill_id, importance)
  SELECT v_step_cut_tile, sd.id, 'primary'
  FROM public.skill_definitions sd
  WHERE sd.slug = 'cutting-tile-lumber-drywall'
    AND NOT EXISTS (
      SELECT 1 FROM public.operation_step_skills oss
      WHERE oss.operation_step_id = v_step_cut_tile AND oss.skill_id = sd.id
    );
  GET DIAGNOSTICS v_count = ROW_COUNT; v_skill_links := v_skill_links + v_count;

  INSERT INTO public.operation_step_skills (operation_step_id, skill_id, importance)
  SELECT v_step_cut_tile, sd.id, 'primary'
  FROM public.skill_definitions sd
  WHERE sd.slug = 'site-prep-protection'
    AND NOT EXISTS (
      SELECT 1 FROM public.operation_step_skills oss
      WHERE oss.operation_step_id = v_step_cut_tile AND oss.skill_id = sd.id
    );
  GET DIAGNOSTICS v_count = ROW_COUNT; v_skill_links := v_skill_links + v_count;

  INSERT INTO public.operation_step_skills (operation_step_id, skill_id, importance)
  SELECT v_step_place, sd.id, 'primary'
  FROM public.skill_definitions sd
  WHERE sd.slug = 'layout-measuring'
    AND NOT EXISTS (
      SELECT 1 FROM public.operation_step_skills oss
      WHERE oss.operation_step_id = v_step_place AND oss.skill_id = sd.id
    );
  GET DIAGNOSTICS v_count = ROW_COUNT; v_skill_links := v_skill_links + v_count;

  INSERT INTO public.operation_step_skills (operation_step_id, skill_id, importance)
  SELECT v_step_prep_grout, sd.id, 'primary'
  FROM public.skill_definitions sd
  WHERE sd.slug = 'finish-grout-caulk-paint'
    AND NOT EXISTS (
      SELECT 1 FROM public.operation_step_skills oss
      WHERE oss.operation_step_id = v_step_prep_grout AND oss.skill_id = sd.id
    );
  GET DIAGNOSTICS v_count = ROW_COUNT; v_skill_links := v_skill_links + v_count;

  INSERT INTO public.operation_step_skills (operation_step_id, skill_id, importance)
  SELECT v_step_apply_grout, sd.id, 'primary'
  FROM public.skill_definitions sd
  WHERE sd.slug = 'finish-grout-caulk-paint'
    AND NOT EXISTS (
      SELECT 1 FROM public.operation_step_skills oss
      WHERE oss.operation_step_id = v_step_apply_grout AND oss.skill_id = sd.id
    );
  GET DIAGNOSTICS v_count = ROW_COUNT; v_skill_links := v_skill_links + v_count;

  INSERT INTO public.operation_step_skills (operation_step_id, skill_id, importance)
  SELECT v_step_fasten_backer, sd.id, 'primary'
  FROM public.skill_definitions sd
  WHERE sd.slug = 'heavy-lifting-handling'
    AND NOT EXISTS (
      SELECT 1 FROM public.operation_step_skills oss
      WHERE oss.operation_step_id = v_step_fasten_backer AND oss.skill_id = sd.id
    );
  GET DIAGNOSTICS v_count = ROW_COUNT; v_skill_links := v_skill_links + v_count;

  INSERT INTO public.operation_step_skills (operation_step_id, skill_id, importance)
  SELECT v_step_fasten_backer, sd.id, 'primary'
  FROM public.skill_definitions sd
  WHERE sd.slug = 'fastening-assembly'
    AND NOT EXISTS (
      SELECT 1 FROM public.operation_step_skills oss
      WHERE oss.operation_step_id = v_step_fasten_backer AND oss.skill_id = sd.id
    );
  GET DIAGNOSTICS v_count = ROW_COUNT; v_skill_links := v_skill_links + v_count;

  RAISE NOTICE
    'Tile reliability Phase 2+3 complete for project % (register inserts this run=%, step skill links this run=%).',
    v_project_id, v_inserted, v_skill_links;
END
$migration$;


-- ==== END 20260920101000_tile_reliability_register_and_skills.sql ====

-- ==== BEGIN 20260920102000_tile_reliability_rules.sql ====
-- Tile reliability Phase 4: project_risk_rules for new PFMEA FMs and register risks.
-- Targets failure modes from 20260920100000 and template risks from 20260920101000.
-- Deletes stable rule ids first for idempotency. Boolean signals are 0/1 numbers.
-- No em dashes. ASCII only.

DO $migration$
DECLARE
  v_project_id uuid;
  v_count integer;

  v_fm_ci_flat CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c200000201'::uuid;
  v_fm_mem_bond CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c200000204'::uuid;
  v_fm_tb_seal CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c200000206'::uuid;
  v_fm_ts_cov CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c200000208'::uuid;
  v_fm_pl_lip CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c20000020a'::uuid;
  v_fm_ag_pack CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c20000020d'::uuid;
  v_fm_ag_ej CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c20000020e'::uuid;

  v_risk_10a1 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c2000010a1'::uuid;
  v_risk_10a2 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c2000010a2'::uuid;
  v_risk_10a3 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c2000010a3'::uuid;
  v_risk_10b2 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c2000010b2'::uuid;
  v_risk_10b3 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c2000010b3'::uuid;
  v_risk_10c1 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c2000010c1'::uuid;
  v_risk_10c2 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c2000010c2'::uuid;

  v_rule_01 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c200002001'::uuid;
  v_rule_02 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c200002002'::uuid;
  v_rule_03 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c200002003'::uuid;
  v_rule_04 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c200002004'::uuid;
  v_rule_05 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c200002005'::uuid;
  v_rule_06 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c200002006'::uuid;
  v_rule_07 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c200002007'::uuid;
  v_rule_08 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c200002008'::uuid;
  v_rule_09 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c200002009'::uuid;
  v_rule_10 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c20000200a'::uuid;
  v_rule_11 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c20000200b'::uuid;
  v_rule_12 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c20000200c'::uuid;
  v_rule_13 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c20000200d'::uuid;
  v_rule_14 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c20000200e'::uuid;
  v_rule_15 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c20000200f'::uuid;
  v_rule_16 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c200002010'::uuid;
  v_rule_17 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c200002011'::uuid;
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

  -- Require PFMEA targets from Phase 1.
  IF NOT EXISTS (SELECT 1 FROM public.pfmea_failure_modes WHERE id = v_fm_ts_cov) THEN
    RAISE EXCEPTION 'Missing PFMEA failure mode thinset coverage (a5c200000208).';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.pfmea_failure_modes WHERE id = v_fm_pl_lip) THEN
    RAISE EXCEPTION 'Missing PFMEA failure mode lippage (a5c20000020a).';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.pfmea_failure_modes WHERE id = v_fm_ci_flat) THEN
    RAISE EXCEPTION 'Missing PFMEA failure mode flatness (a5c200000201).';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.pfmea_failure_modes WHERE id = v_fm_ag_pack) THEN
    RAISE EXCEPTION 'Missing PFMEA failure mode grout pack (a5c20000020d).';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.pfmea_failure_modes WHERE id = v_fm_ag_ej) THEN
    RAISE EXCEPTION 'Missing PFMEA failure mode EJ171 grout (a5c20000020e).';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.pfmea_failure_modes WHERE id = v_fm_mem_bond) THEN
    RAISE EXCEPTION 'Missing PFMEA failure mode membrane voids (a5c200000204).';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.pfmea_failure_modes WHERE id = v_fm_tb_seal) THEN
    RAISE EXCEPTION 'Missing PFMEA failure mode backer seams (a5c200000206).';
  END IF;

  -- Require register targets from Phase 2/3.
  IF NOT EXISTS (SELECT 1 FROM public.project_risks WHERE id = v_risk_10a1) THEN
    RAISE EXCEPTION 'Missing template risk silica dust (a5c2000010a1).';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.project_risks WHERE id = v_risk_10a2) THEN
    RAISE EXCEPTION 'Missing template risk indoor cutting PPE (a5c2000010a2).';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.project_risks WHERE id = v_risk_10a3) THEN
    RAISE EXCEPTION 'Missing template risk heavy handling (a5c2000010a3).';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.project_risks WHERE id = v_risk_10b2) THEN
    RAISE EXCEPTION 'Missing template risk wet saw missing (a5c2000010b2).';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.project_risks WHERE id = v_risk_10b3) THEN
    RAISE EXCEPTION 'Missing template risk open layout decisions (a5c2000010b3).';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.project_risks WHERE id = v_risk_10c1) THEN
    RAISE EXCEPTION 'Missing template risk moisture discovery (a5c2000010c1).';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.project_risks WHERE id = v_risk_10c2) THEN
    RAISE EXCEPTION 'Missing template risk self-leveler budget (a5c2000010c2).';
  END IF;

  DELETE FROM public.project_risk_rules
  WHERE id IN (
    v_rule_01, v_rule_02, v_rule_03, v_rule_04, v_rule_05, v_rule_06, v_rule_07,
    v_rule_08, v_rule_09, v_rule_10, v_rule_11, v_rule_12, v_rule_13, v_rule_14,
    v_rule_15, v_rule_16, v_rule_17
  );

  INSERT INTO public.project_risk_rules (
    id, project_id, target_kind, target_id, conditions, effect, delta, rationale, display_order
  ) VALUES
  -- 1 low step skill -> thinset coverage FM
  (
    v_rule_01, v_project_id, 'pfmea_failure_mode', v_fm_ts_cov,
    jsonb_build_array(
      jsonb_build_object(
        'signal', 'profile.key_skill_proficiency_for_step',
        'operator', 'at_most',
        'values', jsonb_build_array(35)
      )
    ),
    'adjust_occurrence', 2,
    'Your key-skill rating for this setting step is at or below 35, so incomplete mortar coverage is more likely.',
    10
  ),
  -- 2 low step skill -> lippage FM
  (
    v_rule_02, v_project_id, 'pfmea_failure_mode', v_fm_pl_lip,
    jsonb_build_array(
      jsonb_build_object(
        'signal', 'profile.key_skill_proficiency_for_step',
        'operator', 'at_most',
        'values', jsonb_build_array(35)
      )
    ),
    'adjust_occurrence', 2,
    'Your key-skill rating for place-and-level is at or below 35, so lippage above the limit is more likely.',
    20
  ),
  -- 3 low step skill -> flatness FM
  (
    v_rule_03, v_project_id, 'pfmea_failure_mode', v_fm_ci_flat,
    jsonb_build_array(
      jsonb_build_object(
        'signal', 'profile.key_skill_proficiency_for_step',
        'operator', 'at_most',
        'values', jsonb_build_array(35)
      )
    ),
    'adjust_occurrence', 2,
    'Your key-skill rating for substrate checks is at or below 35, so out-of-flat substrate is more likely to be missed.',
    30
  ),
  -- 4 low step skill -> grout pack FM
  (
    v_rule_04, v_project_id, 'pfmea_failure_mode', v_fm_ag_pack,
    jsonb_build_array(
      jsonb_build_object(
        'signal', 'profile.key_skill_proficiency_for_step',
        'operator', 'at_most',
        'values', jsonb_build_array(35)
      )
    ),
    'adjust_occurrence', 1,
    'Your key-skill rating for finish grout is at or below 35, so underfilled joints are more likely.',
    40
  ),
  -- 5 moisture concern -> budget discovery 10c1
  (
    v_rule_05, v_project_id, 'template_risk', v_risk_10c1,
    jsonb_build_array(
      jsonb_build_object(
        'signal', 'environment.moisture_substrate_concern',
        'operator', 'is_any_of',
        'values', jsonb_build_array(1)
      )
    ),
    'adjust_occurrence', 2,
    'You flagged moisture or substrate concern, so soft or wet spots found after cover starts are more likely.',
    50
  ),
  -- 6 concealed conditions high -> 10c1
  (
    v_rule_06, v_project_id, 'template_risk', v_risk_10c1,
    jsonb_build_array(
      jsonb_build_object(
        'signal', 'environment.concealed_conditions_likelihood',
        'operator', 'at_least',
        'values', jsonb_build_array(7)
      )
    ),
    'adjust_occurrence', 1,
    'Concealed-conditions likelihood is at least 7, so late moisture or soft-subfloor discovery is more likely.',
    60
  ),
  -- 7a moisture -> self-leveler budget 10c2
  (
    v_rule_07, v_project_id, 'template_risk', v_risk_10c2,
    jsonb_build_array(
      jsonb_build_object(
        'signal', 'environment.moisture_substrate_concern',
        'operator', 'is_any_of',
        'values', jsonb_build_array(1)
      )
    ),
    'adjust_occurrence', 2,
    'Moisture or substrate concern raises the chance you will add self-leveler after a flatness fail.',
    70
  ),
  -- 7b concealed high -> 10c2
  (
    v_rule_08, v_project_id, 'template_risk', v_risk_10c2,
    jsonb_build_array(
      jsonb_build_object(
        'signal', 'environment.concealed_conditions_likelihood',
        'operator', 'at_least',
        'values', jsonb_build_array(7)
      )
    ),
    'adjust_occurrence', 2,
    'High concealed-conditions likelihood raises the chance unplanned leveling compound shows up after inspect.',
    80
  ),
  -- 8 PPE/ventilation not ready -> silica 10a1
  (
    v_rule_09, v_project_id, 'template_risk', v_risk_10a1,
    jsonb_build_array(
      jsonb_build_object(
        'signal', 'environment.ppe_ventilation_ready',
        'operator', 'is_any_of',
        'values', jsonb_build_array(0)
      )
    ),
    'adjust_occurrence', 2,
    'PPE and ventilation are not ready, so dry silica-releasing cuts are more likely.',
    90
  ),
  -- 9 dust not planned AND live-in -> indoor cutting 10a2 (AND in one rule)
  (
    v_rule_10, v_project_id, 'template_risk', v_risk_10a2,
    jsonb_build_array(
      jsonb_build_object(
        'signal', 'environment.dust_containment_planned',
        'operator', 'is_any_of',
        'values', jsonb_build_array(0)
      ),
      jsonb_build_object(
        'signal', 'environment.live_in_during_project',
        'operator', 'is_any_of',
        'values', jsonb_build_array(1)
      )
    ),
    'adjust_occurrence', 2,
    'You are living in the home without dust containment planned, so indoor cutting without PPE or exhaust is more likely.',
    100
  ),
  -- 10 work solo -> heavy handling 10a3
  (
    v_rule_11, v_project_id, 'template_risk', v_risk_10a3,
    jsonb_build_array(
      jsonb_build_object(
        'signal', 'environment.work_solo',
        'operator', 'is_any_of',
        'values', jsonb_build_array(1)
      )
    ),
    'adjust_occurrence', 2,
    'You are working solo, so solo handling of heavy tile boxes or backer sheets is more likely.',
    110
  ),
  -- 11 missing step tools -> wet saw schedule 10b2
  (
    v_rule_12, v_project_id, 'template_risk', v_risk_10b2,
    jsonb_build_array(
      jsonb_build_object(
        'signal', 'tools.step_tools_missing_count',
        'operator', 'at_least',
        'values', jsonb_build_array(1)
      )
    ),
    'adjust_occurrence', 2,
    'At least one tool this step calls for is missing, so a wet saw or leveling system gap at set time is more likely.',
    120
  ),
  -- 12 open decisions -> layout schedule 10b3
  (
    v_rule_13, v_project_id, 'template_risk', v_risk_10b3,
    jsonb_build_array(
      jsonb_build_object(
        'signal', 'environment.open_decision_count',
        'operator', 'at_least',
        'values', jsonb_build_array(2)
      )
    ),
    'adjust_occurrence', 2,
    'Two or more project decisions are still open, so cutting may start before layout choices are closed.',
    130
  ),
  -- 13 low contingency -> self-leveler budget 10c2
  (
    v_rule_14, v_project_id, 'template_risk', v_risk_10c2,
    jsonb_build_array(
      jsonb_build_object(
        'signal', 'environment.contingency_percent',
        'operator', 'at_most',
        'values', jsonb_build_array(5)
      )
    ),
    'adjust_occurrence', 1,
    'Budget contingency is at most 5 percent, so an unplanned self-leveler buy hits harder and is more likely to stall the job.',
    140
  ),
  -- 14 weak key-skill min -> EJ171 grout FM
  (
    v_rule_15, v_project_id, 'pfmea_failure_mode', v_fm_ag_ej,
    jsonb_build_array(
      jsonb_build_object(
        'signal', 'profile.key_skill_proficiency_min',
        'operator', 'at_most',
        'values', jsonb_build_array(35)
      )
    ),
    'adjust_occurrence', 2,
    'Your weakest key-skill rating for this project is at or below 35, so grout bridging movement joints is more likely.',
    150
  ),
  -- 15 low step skill -> membrane void FM
  (
    v_rule_16, v_project_id, 'pfmea_failure_mode', v_fm_mem_bond,
    jsonb_build_array(
      jsonb_build_object(
        'signal', 'profile.key_skill_proficiency_for_step',
        'operator', 'at_most',
        'values', jsonb_build_array(35)
      )
    ),
    'adjust_occurrence', 2,
    'Your key-skill rating for membrane install is at or below 35, so embed voids under the sheet are more likely.',
    160
  ),
  -- 16 low step skill -> backer seam FM
  (
    v_rule_17, v_project_id, 'pfmea_failure_mode', v_fm_tb_seal,
    jsonb_build_array(
      jsonb_build_object(
        'signal', 'profile.key_skill_proficiency_for_step',
        'operator', 'at_most',
        'values', jsonb_build_array(35)
      )
    ),
    'adjust_occurrence', 2,
    'Your key-skill rating for seam taping is at or below 35, so open or untaped backer seams are more likely.',
    170
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 17 THEN
    RAISE EXCEPTION 'Expected 17 Tile reliability risk rules, inserted %.', v_count;
  END IF;

  RAISE NOTICE
    'Tile reliability Phase 4 rules seeded for project % (% rules).',
    v_project_id, v_count;
END
$migration$;


-- ==== END 20260920102000_tile_reliability_rules.sql ====

-- ==== BEGIN 20260920103000_tile_reliability_branches.sql ====
-- Tile reliability Phase 5: path notice, companion template risks, branch-trigger
-- register risks on Tile Flooring, and include/adjust rules for those branches.
-- Companion projects missing from the catalog are skipped with NOTICE (not EXCEPTION).
-- No em dashes. ASCII only.

DO $migration$
DECLARE
  v_project_id uuid;
  v_count integer;
  v_display_order integer;
  v_inserted integer := 0;
  v_rules_inserted integer := 0;

  v_step_inspect uuid;
  v_step_membrane uuid;
  v_step_layout uuid;
  v_step_place uuid;
  v_step_apply_grout uuid;
  v_step_branch_ej uuid;

  v_risk_10d1 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c2000010d1'::uuid;
  v_risk_10d2 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c2000010d2'::uuid;
  v_risk_10d3 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c2000010d3'::uuid;
  v_risk_10e1 CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c2000010e1'::uuid;

  v_rule_d1_m CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c200002021'::uuid;
  v_rule_d1_c CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c200002022'::uuid;
  v_rule_d2_t CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c200002023'::uuid;
  v_rule_d2_l CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c200002024'::uuid;
  v_rule_d3_o CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c200002025'::uuid;

  v_comp_id uuid;
  v_comp_step uuid;
  v_comp_inserted integer;
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

  SELECT os.id INTO v_step_inspect
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'clean and inspect subfloor'
  LIMIT 1;

  SELECT os.id INTO v_step_membrane
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'embed membrane and detail seams'
  LIMIT 1;

  SELECT os.id INTO v_step_layout
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'layout and reference lines'
  LIMIT 1;

  SELECT os.id INTO v_step_place
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'set tile, beat-in, and check plane'
  LIMIT 1;

  SELECT os.id INTO v_step_apply_grout
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'pack grout and initial clean'
  LIMIT 1;

  IF v_step_inspect IS NULL OR v_step_membrane IS NULL OR v_step_layout IS NULL
     OR v_step_place IS NULL OR v_step_apply_grout IS NULL THEN
    RAISE EXCEPTION
      'Tile branch steps missing (inspect=%, membrane=%, layout=%, place=%, apply_grout=%).',
      v_step_inspect, v_step_membrane, v_step_layout, v_step_place, v_step_apply_grout;
  END IF;

  v_step_branch_ej := coalesce(v_step_apply_grout, v_step_place);

  -- -------------------------------------------------------------------------
  -- A) Membrane vs backer path notice + optional membrane schedule register risk.
  -- Backer seam quality stays on PFMEA only (no extra register).
  -- -------------------------------------------------------------------------
  RAISE NOTICE
    'Tile membrane and backer PFMEA both remain visible until a run path signal selects one install path.';

  IF NOT EXISTS (
    SELECT 1 FROM public.project_risks r
    WHERE r.project_id = v_project_id
      AND (
        r.id = v_risk_10e1
        OR lower(btrim(r.risk_title)) = 'membrane path redo from embed voids'
      )
  ) THEN
    SELECT coalesce(max(r.display_order), 0) + 1 INTO v_display_order
    FROM public.project_risks r
    WHERE r.project_id = v_project_id;

    INSERT INTO public.project_risks (
      id, project_id, operation_step_id, risk_title, risk_description, risk_dimension,
      severity_score, occurrence_score, detection_score, likelihood, severity,
      schedule_impact_low_days, schedule_impact_high_days,
      budget_impact_low, budget_impact_high, mitigation_effort_level,
      occurrence_driver, prevention_strength, mitigation_strategy, mitigation_actions,
      recommendation, benefit, display_order
    ) VALUES (
      v_risk_10e1, v_project_id, v_step_membrane,
      'Membrane path redo from embed voids',
      'On the uncoupling-membrane path, voids left under the sheet force peel-back and reset before tile can proceed.',
      'schedule', 6, 4, 3, 'medium', 'medium',
      2, 7, 150, 1200, 'medium',
      'skill', 'procedural',
      'Work the sheet from the center out, sound for hollows, and lift a corner to confirm transfer before accepting the embed.',
      jsonb_build_array(
        jsonb_build_object(
          'action', 'Float the membrane from the center out until the fleece shows continuous contact',
          'benefit', 'Collapses ridges and closes dry spots under the sheet',
          'completed', false
        ),
        jsonb_build_object(
          'action', 'Sound the field and mark hollows for re-embed before the next sheet lands',
          'benefit', 'Catches voids while mortar is still plastic',
          'completed', false
        ),
        jsonb_build_object(
          'action', 'Lift a corner or sacrificial strip and confirm coverage before walking away',
          'benefit', 'Proves bond instead of assuming it from the comb pattern',
          'completed', false
        )
      ),
      'Do not accept an uncoupling membrane sheet with hollows or uncollapsed ridges under it.',
      'Embed voids on the membrane path commonly cost 2-7 days of redo plus $150-$1200 in materials and labor.',
      v_display_order
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'Tile membrane path schedule risk insert expected 1 row, got %.', v_count;
    END IF;
    v_inserted := v_inserted + 1;
  END IF;

  -- -------------------------------------------------------------------------
  -- B) Companion templates: 1-2 concrete register risks each when found.
  -- -------------------------------------------------------------------------

  -- Self-Leveler Application
  v_comp_id := NULL;
  SELECT p.id INTO v_comp_id
  FROM public.projects p
  WHERE lower(btrim(p.name)) = 'self-leveler application'
    AND p.parent_project_id IS NULL
  ORDER BY p.is_current_version DESC NULLS LAST, p.updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_comp_id IS NULL THEN
    RAISE NOTICE 'Companion project Self-Leveler Application not found; skipping companion risks.';
  ELSE
    v_comp_inserted := 0;
    SELECT coalesce(max(r.display_order), 0) INTO v_display_order
    FROM public.project_risks r WHERE r.project_id = v_comp_id;

    SELECT os.id INTO v_comp_step
    FROM public.operation_steps os
    JOIN public.phase_operations po ON po.id = os.operation_id
    JOIN public.project_phases pp ON pp.id = po.phase_id
    WHERE pp.project_id = v_comp_id
    ORDER BY os.display_order NULLS LAST
    LIMIT 1;

    IF NOT EXISTS (
      SELECT 1 FROM public.project_risks r
      WHERE r.project_id = v_comp_id
        AND lower(btrim(r.risk_title)) = 'grinding high spots dry without dust capture'
    ) THEN
      v_display_order := v_display_order + 1;
      INSERT INTO public.project_risks (
        project_id, operation_step_id, risk_title, risk_description, risk_dimension,
        severity_score, occurrence_score, detection_score, likelihood, severity,
        schedule_impact_low_days, schedule_impact_high_days,
        budget_impact_low, budget_impact_high, mitigation_effort_level,
        occurrence_driver, prevention_strength, mitigation_strategy, mitigation_actions,
        recommendation, benefit, display_order
      ) VALUES (
        v_comp_id, v_comp_step,
        'Grinding high spots dry without dust capture',
        'Dry grinding to prep for self-leveler releases silica dust into the room when capture is missing.',
        'safety', 7, 5, 3, 'medium', 'high',
        1, 3, 40, 300, 'low',
        'process_design', 'procedural',
        'Use a shrouded grinder with vacuum capture, or wet methods allowed by the product, before primer.',
        jsonb_build_array(
          jsonb_build_object(
            'action', 'Attach HEPA vacuum capture to the grinder before any high-spot pass',
            'benefit', 'Keeps silica out of the breathing zone',
            'completed', false
          ),
          jsonb_build_object(
            'action', 'Wear a fitted respirator rated for silica during grind and sweep-up',
            'benefit', 'Protects when capture leaks',
            'completed', false
          )
        ),
        'Do not dry-grind high spots without dust capture and a respirator.',
        'Uncaptured grind dust commonly forces 1-3 days of cleanup stoppage plus $40-$300 in PPE and containment.',
        v_display_order
      );
      v_comp_inserted := v_comp_inserted + 1;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.project_risks r
      WHERE r.project_id = v_comp_id
        AND lower(btrim(r.risk_title)) = 'extra self-leveler bags after pour thickness grows'
    ) THEN
      v_display_order := v_display_order + 1;
      INSERT INTO public.project_risks (
        project_id, operation_step_id, risk_title, risk_description, risk_dimension,
        severity_score, occurrence_score, detection_score, likelihood, severity,
        schedule_impact_low_days, schedule_impact_high_days,
        budget_impact_low, budget_impact_high, mitigation_effort_level,
        occurrence_driver, prevention_strength, mitigation_strategy, mitigation_actions,
        recommendation, benefit, display_order
      ) VALUES (
        v_comp_id, v_comp_step,
        'Extra self-leveler bags after pour thickness grows',
        'Under-measured lows force a mid-pour store run when bag count was sized to a thinner average depth.',
        'budget', 5, 5, 3, 'medium', 'medium',
        1, 3, 75, 600, 'low',
        'skill', 'procedural',
        'Map depth at a grid, size bags to the deepest lows plus waste, and stage spare bags before mixing.',
        jsonb_build_array(
          jsonb_build_object(
            'action', 'Grid-measure depth and calculate bags from the deepest zones, not the average',
            'benefit', 'Funds the real pour volume before mixing starts',
            'completed', false
          ),
          jsonb_build_object(
            'action', 'Stage at least one spare bag and matching primer on site before the pour',
            'benefit', 'Avoids a mid-pour store run',
            'completed', false
          )
        ),
        'Do not mix the pour until bag count covers measured deep lows plus waste.',
        'Short bag counts commonly add $75-$600 and 1-3 days when the pour stops mid-slab.',
        v_display_order
      );
      v_comp_inserted := v_comp_inserted + 1;
    END IF;

    INSERT INTO public.project_key_skills (project_id, skill_id, display_order, required_for_kickoff)
    SELECT v_comp_id, sd.id, 10, true
    FROM public.skill_definitions sd
    WHERE sd.slug = 'substrate-flatness'
    ON CONFLICT (project_id, skill_id) DO NOTHING;

    INSERT INTO public.project_key_skills (project_id, skill_id, display_order, required_for_kickoff)
    SELECT v_comp_id, sd.id, 20, true
    FROM public.skill_definitions sd
    WHERE sd.slug = 'mixing-materials'
    ON CONFLICT (project_id, skill_id) DO NOTHING;

    RAISE NOTICE 'Self-Leveler Application companion risks inserted this run: %.', v_comp_inserted;
  END IF;

  -- Toilet Replacement
  v_comp_id := NULL;
  SELECT p.id INTO v_comp_id
  FROM public.projects p
  WHERE lower(btrim(p.name)) = 'toilet replacement'
    AND p.parent_project_id IS NULL
  ORDER BY p.is_current_version DESC NULLS LAST, p.updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_comp_id IS NULL THEN
    RAISE NOTICE 'Companion project Toilet Replacement not found; skipping companion risks.';
  ELSE
    v_comp_inserted := 0;
    SELECT coalesce(max(r.display_order), 0) INTO v_display_order
    FROM public.project_risks r WHERE r.project_id = v_comp_id;

    SELECT os.id INTO v_comp_step
    FROM public.operation_steps os
    JOIN public.phase_operations po ON po.id = os.operation_id
    JOIN public.project_phases pp ON pp.id = po.phase_id
    WHERE pp.project_id = v_comp_id
    ORDER BY os.display_order NULLS LAST
    LIMIT 1;

    IF NOT EXISTS (
      SELECT 1 FROM public.project_risks r
      WHERE r.project_id = v_comp_id
        AND lower(btrim(r.risk_title)) = 'closet flange height wrong after new finished floor'
    ) THEN
      v_display_order := v_display_order + 1;
      INSERT INTO public.project_risks (
        project_id, operation_step_id, risk_title, risk_description, risk_dimension,
        severity_score, occurrence_score, detection_score, likelihood, severity,
        schedule_impact_low_days, schedule_impact_high_days,
        budget_impact_low, budget_impact_high, mitigation_effort_level,
        occurrence_driver, prevention_strength, mitigation_strategy, mitigation_actions,
        recommendation, benefit, display_order
      ) VALUES (
        v_comp_id, v_comp_step,
        'Closet flange height wrong after new finished floor',
        'A flange left low or high relative to the new tile plane leaks at the wax ring or rocks the bowl.',
        'schedule', 6, 5, 3, 'medium', 'medium',
        1, 5, 40, 350, 'medium',
        'process_design', 'procedural',
        'Measure flange height against the finished tile plane before set, and plan a flange extender or cut before the toilet returns.',
        jsonb_build_array(
          jsonb_build_object(
            'action', 'Measure flange lip to finished floor height before ordering the wax ring or seal',
            'benefit', 'Chooses extender vs standard ring before install day',
            'completed', false
          ),
          jsonb_build_object(
            'action', 'Stage a flange extender kit when tile thickness raises the finished plane',
            'benefit', 'Avoids a mid-install plumbing store run',
            'completed', false
          )
        ),
        'Do not set the toilet until flange height matches the new finished floor plane.',
        'Wrong flange height commonly costs 1-5 days plus $40-$350 when the bowl must come back off.',
        v_display_order
      );
      v_comp_inserted := v_comp_inserted + 1;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.project_risks r
      WHERE r.project_id = v_comp_id
        AND lower(btrim(r.risk_title)) = 'rotten flange or subfloor discovered at toilet pull'
    ) THEN
      v_display_order := v_display_order + 1;
      INSERT INTO public.project_risks (
        project_id, operation_step_id, risk_title, risk_description, risk_dimension,
        severity_score, occurrence_score, detection_score, likelihood, severity,
        schedule_impact_low_days, schedule_impact_high_days,
        budget_impact_low, budget_impact_high, mitigation_effort_level,
        occurrence_driver, prevention_strength, mitigation_strategy, mitigation_actions,
        recommendation, benefit, display_order
      ) VALUES (
        v_comp_id, v_comp_step,
        'Rotten flange or subfloor discovered at toilet pull',
        'Pulling the toilet for tile adjacency reveals soft subfloor or a broken flange that blocks reset.',
        'budget', 7, 4, 4, 'medium', 'high',
        2, 7, 150, 1200, 'medium',
        'attention', 'procedural',
        'Probe around the flange before tile layout locks, and budget flange repair materials when prior leaks are known.',
        jsonb_build_array(
          jsonb_build_object(
            'action', 'Probe subfloor around the flange before the layout is finalized',
            'benefit', 'Surfaces repair scope while tile is still adjustable',
            'completed', false
          ),
          jsonb_build_object(
            'action', 'Stage flange repair parts when any prior leak stain is visible',
            'benefit', 'Keeps the toilet path from stalling mid-job',
            'completed', false
          )
        ),
        'Do not ignore stain rings or soft spots at the flange before tile adjacency work.',
        'Flange or subfloor discovery commonly costs $150-$1200 and 2-7 days when repair was not staged.',
        v_display_order
      );
      v_comp_inserted := v_comp_inserted + 1;
    END IF;

    INSERT INTO public.project_key_skills (project_id, skill_id, display_order, required_for_kickoff)
    SELECT v_comp_id, sd.id, 10, true
    FROM public.skill_definitions sd
    WHERE sd.slug = 'plumbing-basics-diy'
    ON CONFLICT (project_id, skill_id) DO NOTHING;

    RAISE NOTICE 'Toilet Replacement companion risks inserted this run: %.', v_comp_inserted;
  END IF;

  -- Baseboard & Trim Replacement (either naming)
  v_comp_id := NULL;
  SELECT p.id INTO v_comp_id
  FROM public.projects p
  WHERE lower(btrim(p.name)) IN (
      'baseboard & trim replacement',
      'baseboard and trim replacement'
    )
    AND p.parent_project_id IS NULL
  ORDER BY p.is_current_version DESC NULLS LAST, p.updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_comp_id IS NULL THEN
    RAISE NOTICE 'Companion project Baseboard & Trim Replacement not found; skipping companion risks.';
  ELSE
    v_comp_inserted := 0;
    SELECT coalesce(max(r.display_order), 0) INTO v_display_order
    FROM public.project_risks r WHERE r.project_id = v_comp_id;

    SELECT os.id INTO v_comp_step
    FROM public.operation_steps os
    JOIN public.phase_operations po ON po.id = os.operation_id
    JOIN public.project_phases pp ON pp.id = po.phase_id
    WHERE pp.project_id = v_comp_id
    ORDER BY os.display_order NULLS LAST
    LIMIT 1;

    IF NOT EXISTS (
      SELECT 1 FROM public.project_risks r
      WHERE r.project_id = v_comp_id
        AND lower(btrim(r.risk_title)) = 'paint or stain cure blocking room return'
    ) THEN
      v_display_order := v_display_order + 1;
      INSERT INTO public.project_risks (
        project_id, operation_step_id, risk_title, risk_description, risk_dimension,
        severity_score, occurrence_score, detection_score, likelihood, severity,
        schedule_impact_low_days, schedule_impact_high_days,
        budget_impact_low, budget_impact_high, mitigation_effort_level,
        occurrence_driver, prevention_strength, mitigation_strategy, mitigation_actions,
        recommendation, benefit, display_order
      ) VALUES (
        v_comp_id, v_comp_step,
        'Paint or stain cure blocking room return',
        'Trim finish still curing keeps the room offline after tile is otherwise usable.',
        'schedule', 4, 5, 2, 'medium', 'medium',
        1, 4, 0, 100, 'low',
        'process_design', 'procedural',
        'Prime and paint trim off the critical path when possible, and schedule cure hours before room return.',
        jsonb_build_array(
          jsonb_build_object(
            'action', 'Pre-finish baseboard lengths before nail-up when the room must reopen quickly',
            'benefit', 'Moves cure time off the occupied schedule',
            'completed', false
          ),
          jsonb_build_object(
            'action', 'Read label recoat and cure times into the schedule before the final coat',
            'benefit', 'Avoids walking soft finish',
            'completed', false
          )
        ),
        'Do not promise room return on the same day as the final trim coat.',
        'Finish cure commonly adds 1-4 days before the room can return to normal use.',
        v_display_order
      );
      v_comp_inserted := v_comp_inserted + 1;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.project_risks r
      WHERE r.project_id = v_comp_id
        AND lower(btrim(r.risk_title)) = 'dye-lot mismatch on replacement baseboard stock'
    ) THEN
      v_display_order := v_display_order + 1;
      INSERT INTO public.project_risks (
        project_id, operation_step_id, risk_title, risk_description, risk_dimension,
        severity_score, occurrence_score, detection_score, likelihood, severity,
        schedule_impact_low_days, schedule_impact_high_days,
        budget_impact_low, budget_impact_high, mitigation_effort_level,
        occurrence_driver, prevention_strength, mitigation_strategy, mitigation_actions,
        recommendation, benefit, display_order
      ) VALUES (
        v_comp_id, v_comp_step,
        'Dye-lot mismatch on replacement baseboard stock',
        'Buying short lengths later from a different lot leaves visible shade breaks at splices.',
        'budget', 4, 4, 3, 'medium', 'medium',
        1, 5, 50, 400, 'low',
        'attention', 'procedural',
        'Buy all baseboard from one lot with waste included, and hold spare sticks until caulk is done.',
        jsonb_build_array(
          jsonb_build_object(
            'action', 'Purchase full run length plus waste from one dye lot at the first buy',
            'benefit', 'Keeps splices shade-matched',
            'completed', false
          ),
          jsonb_build_object(
            'action', 'Hold one spare stick until caulk and paint touch-up are complete',
            'benefit', 'Covers breaks without a second lot',
            'completed', false
          )
        ),
        'Do not start baseboard cuts on a short order that may need a second dye lot.',
        'Dye-lot mismatch commonly costs $50-$400 when replacement sticks do not match.',
        v_display_order
      );
      v_comp_inserted := v_comp_inserted + 1;
    END IF;

    INSERT INTO public.project_key_skills (project_id, skill_id, display_order, required_for_kickoff)
    SELECT v_comp_id, sd.id, 10, true
    FROM public.skill_definitions sd
    WHERE sd.slug = 'finish-grout-caulk-paint'
    ON CONFLICT (project_id, skill_id) DO NOTHING;

    RAISE NOTICE 'Baseboard & Trim Replacement companion risks inserted this run: %.', v_comp_inserted;
  END IF;

  -- Apply Caulking
  v_comp_id := NULL;
  SELECT p.id INTO v_comp_id
  FROM public.projects p
  WHERE lower(btrim(p.name)) = 'apply caulking'
    AND p.parent_project_id IS NULL
  ORDER BY p.is_current_version DESC NULLS LAST, p.updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_comp_id IS NULL THEN
    RAISE NOTICE 'Companion project Apply Caulking not found; skipping companion risks.';
  ELSE
    v_comp_inserted := 0;
    SELECT coalesce(max(r.display_order), 0) INTO v_display_order
    FROM public.project_risks r WHERE r.project_id = v_comp_id;

    SELECT os.id INTO v_comp_step
    FROM public.operation_steps os
    JOIN public.phase_operations po ON po.id = os.operation_id
    JOIN public.project_phases pp ON pp.id = po.phase_id
    WHERE pp.project_id = v_comp_id
    ORDER BY os.display_order NULLS LAST
    LIMIT 1;

    IF NOT EXISTS (
      SELECT 1 FROM public.project_risks r
      WHERE r.project_id = v_comp_id
        AND lower(btrim(r.risk_title)) = 'movement joints caulked before substrate is dry'
    ) THEN
      v_display_order := v_display_order + 1;
      INSERT INTO public.project_risks (
        project_id, operation_step_id, risk_title, risk_description, risk_dimension,
        severity_score, occurrence_score, detection_score, likelihood, severity,
        schedule_impact_low_days, schedule_impact_high_days,
        budget_impact_low, budget_impact_high, mitigation_effort_level,
        occurrence_driver, prevention_strength, mitigation_strategy, mitigation_actions,
        recommendation, benefit, display_order
      ) VALUES (
        v_comp_id, v_comp_step,
        'Movement joints caulked before substrate is dry',
        'Sealant over damp or dusty EJ171 joints loses bond and must be cut out and redone.',
        'schedule', 5, 4, 3, 'medium', 'medium',
        1, 4, 25, 200, 'low',
        'process_design', 'procedural',
        'Confirm joints are clean and dry per the sealant data sheet before tooling perimeter and field movement joints.',
        jsonb_build_array(
          jsonb_build_object(
            'action', 'Vacuum and wipe EJ171 joints and wait until they are dry to the touch before caulk',
            'benefit', 'Gives sealant a bondable surface',
            'completed', false
          ),
          jsonb_build_object(
            'action', 'Read the sealant data sheet for damp-surface limits and follow them',
            'benefit', 'Avoids a full cut-out redo',
            'completed', false
          )
        ),
        'Do not tool movement-joint sealant onto damp or dusty joints.',
        'Premature caulk commonly costs 1-4 days plus $25-$200 when joints must be cut out and redone.',
        v_display_order
      );
      v_comp_inserted := v_comp_inserted + 1;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.project_risks r
      WHERE r.project_id = v_comp_id
        AND lower(btrim(r.risk_title)) = 'solvent caulk fumes without ventilation in occupied rooms'
    ) THEN
      v_display_order := v_display_order + 1;
      INSERT INTO public.project_risks (
        project_id, operation_step_id, risk_title, risk_description, risk_dimension,
        severity_score, occurrence_score, detection_score, likelihood, severity,
        schedule_impact_low_days, schedule_impact_high_days,
        budget_impact_low, budget_impact_high, mitigation_effort_level,
        occurrence_driver, prevention_strength, mitigation_strategy, mitigation_actions,
        recommendation, benefit, display_order
      ) VALUES (
        v_comp_id, v_comp_step,
        'Solvent caulk fumes without ventilation in occupied rooms',
        'Solvent-cure sealant used in a closed live-in room exposes occupants to fumes during cure.',
        'safety', 5, 4, 3, 'medium', 'medium',
        1, 2, 20, 150, 'low',
        'attention', 'procedural',
        'Prefer low-VOC sealant rated for the joint, or ventilate and clear the room for the cure window on the tube.',
        jsonb_build_array(
          jsonb_build_object(
            'action', 'Choose a low-VOC sealant compatible with EJ171 when the home is occupied',
            'benefit', 'Reduces fume load during cure',
            'completed', false
          ),
          jsonb_build_object(
            'action', 'Open exhaust ventilation and keep occupants out until the label cure window passes',
            'benefit', 'Limits exposure when solvent products are required',
            'completed', false
          )
        ),
        'Do not run solvent caulk in a closed occupied room without ventilation and a clear cure window.',
        'Fume events commonly cost 1-2 days of room clearance plus $20-$150 in product swap and ventilation.',
        v_display_order
      );
      v_comp_inserted := v_comp_inserted + 1;
    END IF;

    INSERT INTO public.project_key_skills (project_id, skill_id, display_order, required_for_kickoff)
    SELECT v_comp_id, sd.id, 10, true
    FROM public.skill_definitions sd
    WHERE sd.slug = 'finish-grout-caulk-paint'
    ON CONFLICT (project_id, skill_id) DO NOTHING;

    RAISE NOTICE 'Apply Caulking companion risks inserted this run: %.', v_comp_inserted;
  END IF;

  -- -------------------------------------------------------------------------
  -- C) Tile Flooring branch-trigger register risks (opt-in via include rules)
  -- -------------------------------------------------------------------------
  SELECT coalesce(max(r.display_order), 0) INTO v_display_order
  FROM public.project_risks r
  WHERE r.project_id = v_project_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.project_risks r
    WHERE r.project_id = v_project_id
      AND (
        r.id = v_risk_10d1
        OR lower(btrim(r.risk_title)) = 'flatness fail without self-leveler branch before setting'
      )
  ) THEN
    v_display_order := v_display_order + 1;
    INSERT INTO public.project_risks (
      id, project_id, operation_step_id, risk_title, risk_description, risk_dimension,
      severity_score, occurrence_score, detection_score, likelihood, severity,
      schedule_impact_low_days, schedule_impact_high_days,
      budget_impact_low, budget_impact_high, mitigation_effort_level,
      occurrence_driver, prevention_strength, mitigation_strategy, mitigation_actions,
      recommendation, benefit, display_order
    ) VALUES (
      v_risk_10d1, v_project_id, v_step_inspect,
      'Flatness fail without self-leveler branch before setting',
      'Straightedge fail is ignored and setting proceeds without starting the Self-Leveler Application companion project.',
      'budget', 7, 4, 3, 'medium', 'high',
      2, 7, 150, 1800, 'medium',
      'process_design', 'procedural',
      'When flatness exceeds the tile limit, start the Self-Leveler Application catalog project and finish cure before any setting mortar is mixed.',
      jsonb_build_array(
        jsonb_build_object(
          'action', 'If the straightedge fails, start the Self-Leveler Application catalog project before cover or set',
          'benefit', 'Routes the work onto the companion template instead of improvising bags',
          'completed', false
        ),
        jsonb_build_object(
          'action', 'Block Apply Thinset Mortar until the leveler branch reports cure complete',
          'benefit', 'Keeps tile off an out-of-flat plane',
          'completed', false
        ),
        jsonb_build_object(
          'action', 'Re-straightedge after leveler cure and record readings on the layout card',
          'benefit', 'Confirms the branch actually closed the flatness gap',
          'completed', false
        )
      ),
      'Do not set tile after a flatness fail. Start Self-Leveler Application from the catalog first.',
      'Skipping the self-leveler branch commonly costs $150-$1800 plus 2-7 days when the floor must be corrected later.',
      v_display_order
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'Tile branch risk 10d1 insert expected 1 row, got %.', v_count;
    END IF;
    v_inserted := v_inserted + 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.project_risks r
    WHERE r.project_id = v_project_id
      AND (
        r.id = v_risk_10d2
        OR lower(btrim(r.risk_title)) = 'fixture flange or toilet work left out of tile adjacency plan'
      )
  ) THEN
    v_display_order := v_display_order + 1;
    INSERT INTO public.project_risks (
      id, project_id, operation_step_id, risk_title, risk_description, risk_dimension,
      severity_score, occurrence_score, detection_score, likelihood, severity,
      schedule_impact_low_days, schedule_impact_high_days,
      budget_impact_low, budget_impact_high, mitigation_effort_level,
      occurrence_driver, prevention_strength, mitigation_strategy, mitigation_actions,
      recommendation, benefit, display_order
    ) VALUES (
      v_risk_10d2, v_project_id, v_step_layout,
      'Fixture flange or toilet work left out of tile adjacency plan',
      'Layout locks without planning toilet pull, flange height, or supply shutoff for tile that runs to the fixture.',
      'schedule', 5, 4, 4, 'medium', 'medium',
      2, 7, 75, 500, 'medium',
      'attention', 'procedural',
      'When tile meets a toilet, start the Toilet Replacement catalog project and put flange height and shutoff on the layout card before cutting.',
      jsonb_build_array(
        jsonb_build_object(
          'action', 'Start the Toilet Replacement catalog project when tile runs to a toilet or flange',
          'benefit', 'Brings flange and reset steps onto the plan',
          'completed', false
        ),
        jsonb_build_object(
          'action', 'Measure finished floor to flange height during Plan Tile Layout',
          'benefit', 'Surfaces extender needs before set day',
          'completed', false
        ),
        jsonb_build_object(
          'action', 'Confirm supply shutoff and temporary bath plan before the toilet is pulled',
          'benefit', 'Keeps occupied homes from losing a working bath mid-job',
          'completed', false
        )
      ),
      'Do not finalize layout against a toilet without starting Toilet Replacement from the catalog.',
      'Missing toilet adjacency planning commonly costs 2-7 days plus $75-$500 when the flange blocks reset.',
      v_display_order
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'Tile branch risk 10d2 insert expected 1 row, got %.', v_count;
    END IF;
    v_inserted := v_inserted + 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.project_risks r
    WHERE r.project_id = v_project_id
      AND (
        r.id = v_risk_10d3
        OR lower(btrim(r.risk_title)) = 'perimeter baseboard/caulk branch omitted at ej171 edges'
      )
  ) THEN
    v_display_order := v_display_order + 1;
    INSERT INTO public.project_risks (
      id, project_id, operation_step_id, risk_title, risk_description, risk_dimension,
      severity_score, occurrence_score, detection_score, likelihood, severity,
      schedule_impact_low_days, schedule_impact_high_days,
      budget_impact_low, budget_impact_high, mitigation_effort_level,
      occurrence_driver, prevention_strength, mitigation_strategy, mitigation_actions,
      recommendation, benefit, display_order
    ) VALUES (
      v_risk_10d3, v_project_id, v_step_branch_ej,
      'Perimeter baseboard/caulk branch omitted at EJ171 edges',
      'EJ171 perimeter joints are left without a planned baseboard and sealant branch, so edges stay open or get grouted.',
      'schedule', 5, 4, 3, 'medium', 'medium',
      1, 5, 40, 350, 'low',
      'process_design', 'procedural',
      'Start the Baseboard & Trim Replacement and Apply Caulking catalog projects for EJ171 perimeter edges before calling the floor complete.',
      jsonb_build_array(
        jsonb_build_object(
          'action', 'Start the Baseboard & Trim Replacement catalog project for walls that lose base during tile',
          'benefit', 'Schedules trim return instead of leaving bare EJ edges',
          'completed', false
        ),
        jsonb_build_object(
          'action', 'Start the Apply Caulking catalog project for EJ171 perimeter and field movement joints',
          'benefit', 'Puts sealant on the plan instead of leaving grout bridges',
          'completed', false
        ),
        jsonb_build_object(
          'action', 'Keep movement joints free of grout and thinset until the caulk branch runs',
          'benefit', 'Preserves the joint the companion sealant must fill',
          'completed', false
        )
      ),
      'Do not close out perimeter EJ171 edges without Baseboard & Trim Replacement and Apply Caulking from the catalog.',
      'Omitting the baseboard/caulk branch commonly costs 1-5 days plus $40-$350 when edges must be reopened.',
      v_display_order
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'Tile branch risk 10d3 insert expected 1 row, got %.', v_count;
    END IF;
    v_inserted := v_inserted + 1;
  END IF;

  SELECT count(*)::integer INTO v_count
  FROM public.project_risks r
  WHERE r.project_id = v_project_id
    AND r.id IN (v_risk_10d1, v_risk_10d2, v_risk_10d3);
  IF v_count <> 3 THEN
    RAISE EXCEPTION
      'Expected 3 Tile branch-trigger risks by stable id after Phase 5, found %.',
      v_count;
  END IF;

  -- Branch rules: include when adverse (opt-in), adjust when signal raises occurrence.
  DELETE FROM public.project_risk_rules
  WHERE id IN (v_rule_d1_m, v_rule_d1_c, v_rule_d2_t, v_rule_d2_l, v_rule_d3_o);

  INSERT INTO public.project_risk_rules (
    id, project_id, target_kind, target_id, conditions, effect, delta, rationale, display_order
  ) VALUES
  (
    v_rule_d1_m, v_project_id, 'template_risk', v_risk_10d1,
    jsonb_build_array(
      jsonb_build_object(
        'signal', 'environment.moisture_substrate_concern',
        'operator', 'is_any_of',
        'values', jsonb_build_array(1)
      )
    ),
    'include', NULL,
    'Moisture or substrate concern is flagged, so a flatness fail without a Self-Leveler Application branch is in play for this run.',
    210
  ),
  (
    v_rule_d1_c, v_project_id, 'template_risk', v_risk_10d1,
    jsonb_build_array(
      jsonb_build_object(
        'signal', 'environment.concealed_conditions_likelihood',
        'operator', 'at_least',
        'values', jsonb_build_array(7)
      )
    ),
    'include', NULL,
    'Concealed-conditions likelihood is at least 7, so skipping the Self-Leveler Application branch after a flatness fail is in play.',
    220
  ),
  (
    v_rule_d2_t, v_project_id, 'template_risk', v_risk_10d2,
    jsonb_build_array(
      jsonb_build_object(
        'signal', 'environment.temporary_kitchen_bath',
        'operator', 'is_any_of',
        'values', jsonb_build_array(1)
      )
    ),
    'adjust_occurrence', 2,
    'You are relying on a temporary bath or kitchen, so leaving toilet or flange work out of the tile adjacency plan is more likely to hurt the schedule.',
    230
  ),
  (
    v_rule_d2_l, v_project_id, 'template_risk', v_risk_10d2,
    jsonb_build_array(
      jsonb_build_object(
        'signal', 'environment.live_in_during_project',
        'operator', 'is_any_of',
        'values', jsonb_build_array(1)
      )
    ),
    'adjust_occurrence', 2,
    'You are living in the home during the project, so fixture and toilet adjacency gaps are more likely to stall daily use.',
    240
  ),
  (
    v_rule_d3_o, v_project_id, 'template_risk', v_risk_10d3,
    jsonb_build_array(
      jsonb_build_object(
        'signal', 'environment.open_decision_count',
        'operator', 'at_least',
        'values', jsonb_build_array(1)
      )
    ),
    'adjust_occurrence', 2,
    'At least one project decision is still open, so omitting the baseboard and caulk branch at EJ171 edges is more likely.',
    250
  );

  GET DIAGNOSTICS v_rules_inserted = ROW_COUNT;
  IF v_rules_inserted <> 5 THEN
    RAISE EXCEPTION 'Expected 5 Tile branch risk rules, inserted %.', v_rules_inserted;
  END IF;

  RAISE NOTICE
    'Tile reliability Phase 5 complete for project % (tile register inserts this run=%, branch rules=%).',
    v_project_id, v_inserted, v_rules_inserted;
END
$migration$;


-- ==== END 20260920103000_tile_reliability_branches.sql ====

