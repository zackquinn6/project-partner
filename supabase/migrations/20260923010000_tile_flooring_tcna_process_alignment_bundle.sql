-- Tile Flooring Installation: TCNA/ANSI process-flow alignment (owned phases only).
-- Research basis: TCNA Handbook Field & Installation Requirements / EJ171, ANSI A108,
-- NTCA/TileLetter movement-joint guidance, Ceramic Tile Foundation underlayment guidance.
--
-- In scope (owned Prepare subfloor / Install / Grout & Finish):
-- 1) Substrate assessment must run before either underlayment path (was membrane-only).
-- 2) Uncoupling membrane + cement backer remain alternate methods after assessment.
-- 3) Inspect gates flatness/structure failures to companion projects (no how-to duplication).
-- 4) Layout: dye-lot shuffle + EJ171 movement-joint planning (tile-exclusive).
-- 5) Spread mortar (set): mix/slake for beginner + intermediate.
-- 6) Set tile: keep EJ171 joints free of thinset.
-- 7) PFMEA for Cut tiles / Cut and fit backer (anti-requirement FMs).
--
-- Out of scope (report only; do not author on this host): Self-Leveler Application,
-- Subfloor Replacement, Baseboard & Trim Installation, Caulking Application, etc.
-- ASCII only. No em dashes.

DO $migration$
DECLARE
  v_project_id uuid;
  v_phase_prep uuid;
  v_op_assess CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c300000001'::uuid;
  v_op_membrane uuid;
  v_op_backer uuid;
  v_step_inspect CONSTANT uuid := '17c7f59c-5920-4dfd-89ee-4394d87bb6d0'::uuid;
  v_step_layout CONSTANT uuid := '3e6029b2-5bcc-4e4a-80dc-ba8d4cb7d620'::uuid;
  v_step_spread CONSTANT uuid := '4738a5a5-8caf-4185-afa6-b8e6711e005b'::uuid;
  v_step_set CONSTANT uuid := '876a00bb-c501-473d-8d47-e88c57fe3b71'::uuid;
  v_step_cut_tile CONSTANT uuid := '1adef138-8919-4d07-aeaa-ea957ce3504f'::uuid;
  v_step_cut_backer CONSTANT uuid := '90428c0f-db43-4efe-9906-3e1469f9b7ba'::uuid;
  v_count integer;
  v_req_cut_a uuid := '373adcbf-0a8c-42e9-9bcb-a5c300000101'::uuid;
  v_req_cut_b uuid := '373adcbf-0a8c-42e9-9bcb-a5c300000102'::uuid;
  v_fm_cut_a uuid := '373adcbf-0a8c-42e9-9bcb-a5c300000201'::uuid;
  v_fm_cut_b uuid := '373adcbf-0a8c-42e9-9bcb-a5c300000202'::uuid;
  v_req_bk_a uuid := '373adcbf-0a8c-42e9-9bcb-a5c300000103'::uuid;
  v_fm_bk_a uuid := '373adcbf-0a8c-42e9-9bcb-a5c300000203'::uuid;
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

  SELECT pp.id INTO v_phase_prep
  FROM public.project_phases pp
  WHERE pp.project_id = v_project_id
    AND coalesce(pp.is_standard, false) IS NOT TRUE
    AND coalesce(pp.is_linked, false) IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(pp.name)) = 'prepare subfloor';

  IF v_phase_prep IS NULL THEN
    RAISE EXCEPTION 'Owned Prepare subfloor phase not found.';
  END IF;

  SELECT po.id INTO v_op_membrane
  FROM public.phase_operations po
  WHERE po.phase_id = v_phase_prep
    AND lower(btrim(po.operation_name)) LIKE 'uncoupling membrane%'
  LIMIT 1;

  SELECT po.id INTO v_op_backer
  FROM public.phase_operations po
  WHERE po.phase_id = v_phase_prep
    AND lower(btrim(po.operation_name)) LIKE 'cement backer%'
  LIMIT 1;

  IF v_op_membrane IS NULL OR v_op_backer IS NULL THEN
    RAISE EXCEPTION 'Prepare subfloor underlayment ops missing (membrane=%, backer=%).',
      v_op_membrane, v_op_backer;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.operation_steps WHERE id = v_step_inspect) THEN
    RAISE EXCEPTION 'Clean and inspect subfloor step % missing.', v_step_inspect;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Structure: Assess substrate (prime) before alternate underlayment methods.
  -- ---------------------------------------------------------------------------
  INSERT INTO public.phase_operations (
    id, phase_id, operation_name, operation_description, display_order, flow_type
  ) VALUES (
    v_op_assess,
    v_phase_prep,
    'Assess substrate for tile',
    'Verify cleanliness, deflection readiness, flatness, and moisture/condition gates before choosing an underlayment method.',
    1,
    'prime'
  )
  ON CONFLICT (id) DO UPDATE SET
    phase_id = EXCLUDED.phase_id,
    operation_name = EXCLUDED.operation_name,
    operation_description = EXCLUDED.operation_description,
    display_order = EXCLUDED.display_order,
    flow_type = EXCLUDED.flow_type,
    updated_at = now();

  UPDATE public.phase_operations
  SET display_order = 2, flow_type = 'alternate', updated_at = now()
  WHERE id = v_op_membrane;

  UPDATE public.phase_operations
  SET display_order = 3, flow_type = 'alternate', updated_at = now()
  WHERE id = v_op_backer;

  UPDATE public.operation_steps
  SET
    operation_id = v_op_assess,
    display_order = 1,
    description =
      'Confirm the substrate is clean, firm enough for the chosen TCNA-style assembly, and inside flatness limits for the tile size before any underlayment path starts.',
    updated_at = now()
  WHERE id = v_step_inspect;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Failed to move Clean and inspect onto Assess substrate (updated=%).', v_count;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Instructions: Clean and inspect (gate companions; shared before both paths)
  -- ---------------------------------------------------------------------------
  UPDATE public.step_instructions
  SET content = '[
    {"id":"m1-b-bg","type":"text","title":"Background/Need-to-Know","content":"A clean, solid, flat-enough floor is required before either underlayment path. You are checking dirt, bounce, soft spots, and big bumps - not pouring leveler or rebuilding the deck.","width":"full","alignment":"left"},
    {"id":"m1-b-ins","type":"text","title":"Instructions","content":"Sweep and vacuum. Walk slowly and mark squeaks or soft spots. Lay a long straightedge and look for gaps. Write down wood vs concrete. If the bag or membrane sheet asks for a moisture test, plan that before bonding.","width":"full","alignment":"left"},
    {"id":"m1-b-er","type":"text","title":"Error-Recovery","content":"If the floor is out of flat for your tile size, stop and use the Self-Leveler Application project (Prepare Floor & Seal / Apply Self-Leveler) already linked on this run - do not invent a pour here. If boards are soft, rotten, or joists bounce badly, stop and use Subfloor Replacement. Fix protruding nails and oily spots before underlayment.","width":"full","alignment":"left"}
  ]'::jsonb,
  updated_at = now()
  WHERE step_id = v_step_inspect AND instruction_level = 'beginner';

  UPDATE public.step_instructions
  SET content = '[
    {"id":"m1-cs-bg","type":"text","title":"Background/Need-to-Know","content":"Tile failures often trace to a dirty, overly flexible, or out-of-flat subfloor. Follow deflection and preparation requirements from the TCNA method that matches your assembly, plus the membrane or backer manufacturer and mortar data sheet. Flatness limits typically tighten to 1/8 in in 10 ft when any tile edge is over 15 in.","width":"full","alignment":"left","display_order":1},
    {"id":"m1-cs-ins","type":"text","title":"Instructions","content":"Clear the room, remove protrusions, scrape old adhesives, and vacuum. Walk the floor and mark soft spots, squeaks, and cracks. Check flatness with a straightedge over the field and near changes in plane. Document substrate type and any moisture testing required before bonding. Choose either the uncoupling membrane path or the cement backer path only after this assessment passes.","width":"full","alignment":"left","display_order":2},
    {"id":"m1-cs-er","type":"text","title":"Error-Recovery","content":"If flatness exceeds the limit for your tile size, stop. Complete the adopted Self-Leveler Application work (Prepare Floor & Seal / Apply Self-Leveler) before underlayment - do not teach a pour inside this step. If panels are soft, rotten, or joists fail a bounce check, stop and complete Subfloor Replacement first. Do not spot-bond membrane or backer over contaminants.","width":"full","alignment":"left","display_order":3},
    {"id":"m1-cs-safe","type":"safety-warning","title":"Safety","content":"Wear a properly fitted respirator when creating silica dust from grinding or cutting cementitious materials.","severity":"high","width":"full","alignment":"left","display_order":4}
  ]'::jsonb,
  updated_at = now()
  WHERE step_id = v_step_inspect AND instruction_level = 'intermediate';

  UPDATE public.step_instructions
  SET content = '[
    {"id":"m1-a-bg","type":"text","title":"Background/Need-to-Know","content":"Relate substrate prep to the TCNA assembly method you are following and to mortar / membrane / backer Product Data Sheets. Document deflection, RH or MVER tests when wood or concrete moisture is a risk, and photograph anomalies for the project record.","width":"full","alignment":"left"},
    {"id":"m1-a-ins","type":"text","title":"Instructions","content":"Mechanically remove bond breakers. Verify panel thickness and fastener schedule expectations for wood systems. For concrete, confirm curing compounds are compatible or removed. Map flatness with a straightedge; note 1/8 in in 10 ft (and 1/16 in in 24 in) for large-format tile unless the data sheet differs. Record pass/fail before selecting an underlayment alternate.","width":"full","alignment":"left"},
    {"id":"m1-a-er","type":"text","title":"Error-Recovery","content":"Cracks with vertical movement or failed framing need Subfloor Replacement (or engineered repair) before underlayment - do not membrane over them. Out-of-tolerance plane that needs pourable or trowelable underlayment belongs in Self-Leveler Application, not in this step. Do not membrane over known bond breakers hoping to compensate.","width":"full","alignment":"left"},
    {"id":"m1-a-safe","type":"safety-warning","title":"Safety","content":"Silica exposures from grinding concrete or cement board require engineering controls and PPE per OSHA guidance.","severity":"high","width":"full","alignment":"left"}
  ]'::jsonb,
  updated_at = now()
  WHERE step_id = v_step_inspect AND instruction_level = 'advanced';

  -- ---------------------------------------------------------------------------
  -- Layout: dye-lot shuffle + EJ171 planning (TCNA FAQ / EJ171)
  -- ---------------------------------------------------------------------------
  UPDATE public.step_instructions
  SET content = '[
    {"id":"i1-b-bg","type":"text","title":"Background/Need-to-Know","content":"A little planning keeps narrow strips out of the doorway. Mixing boxes (shuffling) hides shade differences. Leave a small gap at walls for movement - that gap is usually covered later by base or sealant, not by this step.","width":"full","alignment":"left"},
    {"id":"i1-b-ins","type":"text","title":"Instructions","content":"Open several boxes and mix tiles from different cartons. Dry-lay a row with spacers. Shift the starting line so cuts at both sides look reasonable and stay at least about half a tile wide when you can. Snap chalk lines you can follow. Mark the perimeter gap and any planned soft joints so you do not fill them with thinset later.","width":"full","alignment":"left"},
    {"id":"i1-b-er","type":"text","title":"Error-Recovery","content":"If lines are crooked, wipe chalk and snap again before you spread mud. If one box is a different shade, keep shuffling or return the outlier lot before setting.","width":"full","alignment":"left"}
  ]'::jsonb,
  updated_at = now()
  WHERE step_id = v_step_layout AND instruction_level = 'beginner';

  UPDATE public.step_instructions
  SET content = '[
    {"id":"i1-cs-bg","type":"text","title":"Background/Need-to-Know","content":"Balanced cuts at visible walls read better than full tiles hidden behind a door and slivers at the entry. TCNA guidance treats movement joints (EJ171) as required: perimeter gaps at restraining surfaces, and field joints on larger floors (commonly within about 20-25 ft indoors, closer with sun or moisture). Confirm cabinet, appliance, and swing-clear dimensions before locking a start line.","width":"full","alignment":"left","display_order":1},
    {"id":"i1-cs-ins","type":"text","title":"Instructions","content":"Shuffle tiles from every carton into mixed stacks. Measure the room, account for grout joint width, and dry-lay a row along the longest sightline. Mark a start line parallel to the primary wall you see first. Transfer 90-degree references and mark grid lines for large formats. Mark EJ171 perimeter gaps and any field soft-joint lines on the layout so setting and grouting leave them open for later sealant (Caulking Application), not thinset or grout.","width":"full","alignment":"left","display_order":2},
    {"id":"i1-cs-er","type":"text","title":"Error-Recovery","content":"If diagonals disagree with square, find which wall is out and shift the start line to hide taper in low-visibility zones without violating minimum cut width (prefer half tile; avoid slivers). If shade lots diverge, reshuffle or quarantine the odd lot before mortar.","width":"full","alignment":"left","display_order":3}
  ]'::jsonb,
  updated_at = now()
  WHERE step_id = v_step_layout AND instruction_level = 'intermediate';

  UPDATE public.step_instructions
  SET content = '[
    {"id":"i1-a-bg","type":"text","title":"Background/Need-to-Know","content":"ANSI A108.02 references joint aesthetics and lippage relative to grout width and tile warpage. Large-format layout must account for caliper variation and arrow direction if directional. EJ171 requires perimeter and (when the field is large enough) intermediate movement joints filled with elastomeric sealant, not cement grout.","width":"full","alignment":"left"},
    {"id":"i1-a-ins","type":"text","title":"Instructions","content":"Establish primary and secondary baselines with laser or Pythagorean checks. Balance cuts at focal walls. Blend shade lots across the field. Mark movement joint locations that continue through tile per TCNA EJ171 (perimeter at restraining surfaces; field spacing per interior exposure). Keep those joints clear through set and grout; sealant installation stays in the adopted Caulking Application phase.","width":"full","alignment":"left"},
    {"id":"i1-a-er","type":"text","title":"Error-Recovery","content":"If stone or porcelain shows shade lots, blend boxes now and update the start line to hide batch shifts. If a planned soft joint conflicts with a pattern, relocate it along a continuous joint line that still satisfies EJ171 spacing - do not omit it.","width":"full","alignment":"left"}
  ]'::jsonb,
  updated_at = now()
  WHERE step_id = v_step_layout AND instruction_level = 'advanced';

  -- ---------------------------------------------------------------------------
  -- Spread mortar (set path): mix / slake for beginner + intermediate
  -- ---------------------------------------------------------------------------
  UPDATE public.step_instructions
  SET content = '[
    {"id":"i3-b-bg","type":"text","title":"Background/Need-to-Know","content":"Tile needs mortar touching almost all of the back on floors. Mix first to a peanut-butter feel, let it rest if the bag says to slake, then comb. Big tiles need bigger notches and sometimes butter on the tile.","width":"full","alignment":"left"},
    {"id":"i3-b-ins","type":"text","title":"Instructions","content":"Add powder to clean water per the bag. Mix until smooth, rest (slake) if required, then remix. Comb mortar with the notch size on the bag. Lift a tile now and then to see ridges squashed on the back. Add mortar if you see empty spots.","width":"full","alignment":"left"},
    {"id":"i3-b-er","type":"text","title":"Error-Recovery","content":"Scrape off stiff or skinned mortar and spread a fresh batch. Do not thin a dying mix with extra water.","width":"full","alignment":"left"}
  ]'::jsonb,
  updated_at = now()
  WHERE step_id = v_step_spread AND instruction_level = 'beginner';

  UPDATE public.step_instructions
  SET content = '[
    {"id":"i3-cs-bg","type":"text","title":"Background/Need-to-Know","content":"ANSI installation methods reference mortar contact area by application (dry areas, wet areas, exteriors). Mix quality and open time control coverage as much as trowel size. Large tiles often need back-buttering in addition to trowel ridges on the floor.","width":"full","alignment":"left","display_order":1},
    {"id":"i3-cs-ins","type":"text","title":"Instructions","content":"Mix polymer-modified mortar to the bag ratio, mix thoroughly, slake if required, and remix before use. Key the substrate, then apply mortar with a notched trowel. Comb in one direction for large formats. Lift the first few tiles and corners to verify transfer; increase notch depth or back-butter if coverage is light. Stay inside pot life and open time.","width":"full","alignment":"left","display_order":2},
    {"id":"i3-cs-er","type":"text","title":"Error-Recovery","content":"If skinning occurs, scrape and relay fresh mortar. Do not add water to extend life beyond manufacturer limits. Discard batches that collapse ridges because they were over-watered.","width":"full","alignment":"left","display_order":3}
  ]'::jsonb,
  updated_at = now()
  WHERE step_id = v_step_spread AND instruction_level = 'intermediate';

  -- ---------------------------------------------------------------------------
  -- Set tile: keep EJ171 locations free of thinset
  -- ---------------------------------------------------------------------------
  UPDATE public.step_instructions
  SET content = '[
    {"id":"i4-b-bg","type":"text","title":"Background/Need-to-Know","content":"Spacers keep grout lines even. A rubber mallet taps tile down without cracking glaze. Leave the wall gap and any marked soft joints empty of thinset - those get flexible sealant later.","width":"full","alignment":"left"},
    {"id":"i4-b-ins","type":"text","title":"Instructions","content":"Press and twist each tile into the ridges. Tap evenly. Keep the perimeter gap and marked movement joints clear of mortar. Lay a straightedge across several tiles and look for corners sticking up. Fix lows while the mud is soft.","width":"full","alignment":"left"},
    {"id":"i4-b-er","type":"text","title":"Error-Recovery","content":"Pry up a high corner gently and press it down, or add mud under a low corner before the mud skins. If you filled a soft joint with mud by mistake, clear it while soft.","width":"full","alignment":"left"}
  ]'::jsonb,
  updated_at = now()
  WHERE step_id = v_step_set AND instruction_level = 'beginner';

  UPDATE public.step_instructions
  SET content = '[
    {"id":"i4-cs-bg","type":"text","title":"Background/Need-to-Know","content":"Lippage limits depend on tile type, grout joint width, and whether edges are cushioned. Use leveling clips where the manufacturer allows for your tile thickness. EJ171 movement joints must stay free of setting materials.","width":"full","alignment":"left","display_order":1},
    {"id":"i4-cs-ins","type":"text","title":"Instructions","content":"Work to lines; maintain joint width with spacers or systems. Beat in with a rubber mallet and beating block. Do not comb thinset through marked perimeter or field movement joints. Step back for plane and adjust while mortar is plastic. Protect finished edges from impact.","width":"full","alignment":"left","display_order":2},
    {"id":"i4-cs-er","type":"text","title":"Error-Recovery","content":"If a tile is low after initial set, lift and add mortar; if high, compress before flash time expires. After cure, replacement is the remedy. Cut dried thinset out of any bridged movement joint before grout.","width":"full","alignment":"left","display_order":3}
  ]'::jsonb,
  updated_at = now()
  WHERE step_id = v_step_set AND instruction_level = 'intermediate';

  UPDATE public.step_instructions
  SET content = '[
    {"id":"i4-a-bg","type":"text","title":"Background/Need-to-Know","content":"Warpage interaction with narrow joints drives lippage perception. Clip systems can reduce capillary voids if used per manufacturer for your tile thickness. Bridging EJ171 joints with thinset is a predictable crack path.","width":"full","alignment":"left"},
    {"id":"i4-a-ins","type":"text","title":"Instructions","content":"Maintain bond coat flash time guidance. Beat parallel to the short side of large panels to collapse air. Keep setting materials out of EJ171 locations marked in layout. Check with a straightedge. Protect edges from point loads during cure.","width":"full","alignment":"left"},
    {"id":"i4-a-er","type":"text","title":"Error-Recovery","content":"After cure, lippage remediation is replace, not grind glaze, for most porcelains. Bridged movement joints must be cleared to sealant depth before close-out.","width":"full","alignment":"left"}
  ]'::jsonb,
  updated_at = now()
  WHERE step_id = v_step_set AND instruction_level = 'advanced';

  -- ---------------------------------------------------------------------------
  -- Ensure cut-step outputs for PFMEA hang points
  -- ---------------------------------------------------------------------------
  UPDATE public.operation_steps os
  SET outputs = (
    SELECT CASE
      WHEN EXISTS (
        SELECT 1 FROM jsonb_array_elements(coalesce(os.outputs, '[]'::jsonb)) e
        WHERE e->>'id' = 'out-i2-chip'
      ) THEN coalesce(os.outputs, '[]'::jsonb)
      ELSE coalesce(os.outputs, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'id', 'out-i2-chip',
        'name', 'Cut edges within joint-hide tolerance',
        'description', 'Cut edges are smooth enough that chips stay smaller than the planned grout joint.',
        'type', 'major-aesthetics',
        'requirement', 'Visible cut-edge chips are smaller than the planned grout joint width.',
        'qualityChecks', 'Finger and eye check each cut before dry-fit. Recut pieces with chips that exceed joint width.',
        'keyInputs', jsonb_build_array('Blade condition', 'Feed rate', 'Tile hardness'),
        'potentialEffects', 'Oversize chips show as dark voids after grout.',
        'mustGetRight', 'Recut rather than hoping grout hides a large chip.',
        'allowances', 'Cuts hidden fully under trim may tolerate more edge roughness.',
        'referenceSpecification', 'TCNA finished tilework / ANSI workmanship expectations for cut edges.'
      ))
    END
  ),
  updated_at = now()
  WHERE id = v_step_cut_tile;

  UPDATE public.operation_steps os
  SET outputs = (
    SELECT CASE
      WHEN EXISTS (
        SELECT 1 FROM jsonb_array_elements(coalesce(os.outputs, '[]'::jsonb)) e
        WHERE e->>'id' = 'out-i2-fit'
      ) THEN coalesce(os.outputs, '[]'::jsonb)
      ELSE coalesce(os.outputs, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'id', 'out-i2-fit',
        'name', 'Cut piece matches layout dimension',
        'description', 'Each cut piece dry-fits at the planned joint width without forcing.',
        'type', 'major-aesthetics',
        'requirement', 'Cut length/width is within 1/32 in of the layout mark for the piece.',
        'qualityChecks', 'Measure the cut and dry-fit before mortar.',
        'keyInputs', jsonb_build_array('Measurement transfer', 'Saw fence', 'Layout mark'),
        'potentialEffects', 'Forced pieces open joints or leave gaps that cascade across the run.',
        'mustGetRight', 'Dry-fit before any mortar for that piece.',
        'allowances', 'Pieces fully under base may vary slightly from field joint width.',
        'referenceSpecification', 'Layout plan joint width.'
      ))
    END
  ),
  updated_at = now()
  WHERE id = v_step_cut_tile;

  UPDATE public.operation_steps os
  SET outputs = (
    SELECT CASE
      WHEN EXISTS (
        SELECT 1 FROM jsonb_array_elements(coalesce(os.outputs, '[]'::jsonb)) e
        WHERE e->>'id' = 'out-b1-stag'
      ) THEN coalesce(os.outputs, '[]'::jsonb)
      ELSE coalesce(os.outputs, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'id', 'out-b1-stag',
        'name', 'Backer joints staggered off subfloor joints',
        'description', 'Panel end and edge joints are offset from subfloor joints per manufacturer / APA-style practice.',
        'type', 'performance-durability',
        'requirement', 'Backer end joints are offset from subfloor end joints and fasteners avoid filling only into joist lines where the method requires offset.',
        'qualityChecks', 'Dry-lay check: no continuous seam stacked on a subfloor seam.',
        'keyInputs', jsonb_build_array('Subfloor joint map', 'Panel size', 'Manufacturer layout notes'),
        'potentialEffects', 'Aligned seams telegraph movement into the tile field.',
        'mustGetRight', 'Dry-lay full sheets before fastening.',
        'allowances', 'Maker gap and fastener schedules govern over generic spacing.',
        'referenceSpecification', 'Backer manufacturer instructions; wood-floor tile assembly notes.'
      ))
    END
  ),
  updated_at = now()
  WHERE id = v_step_cut_backer;

  -- ---------------------------------------------------------------------------
  -- PFMEA: Cut tiles + Cut and fit backer (anti-requirement FMs)
  -- ---------------------------------------------------------------------------
  DELETE FROM public.pfmea_action_items
  WHERE failure_mode_id IN (v_fm_cut_a, v_fm_cut_b, v_fm_bk_a);
  DELETE FROM public.pfmea_controls
  WHERE failure_mode_id IN (v_fm_cut_a, v_fm_cut_b, v_fm_bk_a);
  DELETE FROM public.pfmea_potential_causes
  WHERE failure_mode_id IN (v_fm_cut_a, v_fm_cut_b, v_fm_bk_a);
  DELETE FROM public.pfmea_potential_effects
  WHERE failure_mode_id IN (v_fm_cut_a, v_fm_cut_b, v_fm_bk_a);
  DELETE FROM public.pfmea_failure_modes
  WHERE id IN (v_fm_cut_a, v_fm_cut_b, v_fm_bk_a);
  DELETE FROM public.pfmea_requirements
  WHERE id IN (v_req_cut_a, v_req_cut_b, v_req_bk_a);

  INSERT INTO public.pfmea_requirements (
    id, project_id, operation_step_id, output_id, requirement_text, display_order
  ) VALUES
  (v_req_cut_a, v_project_id, v_step_cut_tile, 'out-i2-chip',
   'Visible cut-edge chips are smaller than the planned grout joint width.', 1),
  (v_req_cut_b, v_project_id, v_step_cut_tile, 'out-i2-fit',
   'Cut length/width is within 1/32 in of the layout mark for the piece.', 2),
  (v_req_bk_a, v_project_id, v_step_cut_backer, 'out-b1-stag',
   'Backer end/edge joints are offset from subfloor joints per the panel layout rules for this assembly.', 1);

  INSERT INTO public.pfmea_failure_modes (
    id, project_id, operation_step_id, requirement_id, failure_mode, severity_score
  ) VALUES
  (v_fm_cut_a, v_project_id, v_step_cut_tile, v_req_cut_a,
   'Visible cut-edge chips are larger than the planned grout joint width.', 6),
  (v_fm_cut_b, v_project_id, v_step_cut_tile, v_req_cut_b,
   'Cut piece dimension is more than 1/32 in off the layout mark.', 5),
  (v_fm_bk_a, v_project_id, v_step_cut_backer, v_req_bk_a,
   'Backer joints line up over subfloor joints instead of being staggered off them.', 7);

  INSERT INTO public.pfmea_potential_effects (failure_mode_id, effect_description, severity_score) VALUES
  (v_fm_cut_a, 'Grout cannot hide the chip; the edge reads as a dark void on the finished sight line.', 6),
  (v_fm_cut_b, 'Forced fits open neighboring joints or leave gaps that cascade down the run.', 5),
  (v_fm_bk_a, 'Stacked seams concentrate movement and crack grout or tile along the joint line.', 7);

  INSERT INTO public.pfmea_potential_causes (
    failure_mode_id, cause_description, occurrence_score,
    occurrence_driver, implicated_item_kind, implicated_item_id
  ) VALUES
  (v_fm_cut_a, 'Dull blade or forced feed rate chips the exit edge.', 6, 'skill', 'tool', 'tl-wet-saw'),
  (v_fm_cut_b, 'Layout mark is transferred once and not re-measured after the cut.', 5, 'attention', 'output', 'out-i2-fit'),
  (v_fm_bk_a, 'Sheets are fastened in the order they come off the stack without a dry-lay stagger check.', 6, 'process_design', 'output', 'out-b1-stag');

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_cut_a, c.id,
    'Replace or dress the blade when chips grow; slow the last inch of each cut.',
    'prevention', NULL, 'procedural'
  FROM public.pfmea_potential_causes c WHERE c.failure_mode_id = v_fm_cut_a;

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_cut_b, c.id,
    'Measure the cut piece and dry-fit at the planned joint before any mortar for that location.',
    'detection', 3, NULL
  FROM public.pfmea_potential_causes c WHERE c.failure_mode_id = v_fm_cut_b;

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_bk_a, c.id,
    'Dry-lay full sheets first and confirm seams are offset from subfloor seams before fastening.',
    'prevention', NULL, 'mistake_proof'
  FROM public.pfmea_potential_causes c WHERE c.failure_mode_id = v_fm_bk_a;

  INSERT INTO public.pfmea_action_items (failure_mode_id, recommended_action, status) VALUES
  (v_fm_bk_a,
   'Change the cut/fit sequence so a full-sheet dry-lay stagger check is required before the first fastener.',
   'not_started');

  -- ---------------------------------------------------------------------------
  -- Catalog challenges: point at companion gates without teaching them
  -- ---------------------------------------------------------------------------
  UPDATE public.projects
  SET
    project_challenges =
      'Hard parts are substrate readiness (flatness and structure), mortar coverage on large tile, and leaving EJ171 movement joints open through set and grout. Out-of-flat or failed decks need Self-Leveler Application or Subfloor Replacement before underlayment - those are separate projects linked or available in the catalog, not steps inside this one.',
    updated_at = now()
  WHERE id = v_project_id;

  PERFORM public.rebuild_phases_json_from_project_phases_internal(v_project_id);

  RAISE NOTICE 'Tile TCNA process alignment applied for project % (assess op %, membrane %, backer %).',
    v_project_id, v_op_assess, v_op_membrane, v_op_backer;
END
$migration$;
