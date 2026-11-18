-- Tile Flooring Installation: quality goals + Professional gated-step content + audit.
-- Ship bundle (guide H.5): authored as separate step files during development, concatenated
-- here in guide order for a single apply. Idempotent. Owned phases only.
--
-- Blocks in order:
--   1. Quality goals (project_quality_levels + min_quality_goal + new Professional steps)
--   2. Step 2 instructions
--   3. Step 3 outputs
--   4. Step 5 tools
--   5. Step 6 materials
--   6. Step 7 process variables
--   7. Step 8 time estimates
--   8. Step 9 PFMEA
--   9. Content audit


-- ==== BEGIN 20260918210000_tile_flooring_quality_goals.sql ====
-- Tile Flooring Installation: quality goal levels + min_quality_goal gating.
-- Owned phases only. Linked source projects keep their own quality rows (gap-reported).

DO $migration$
DECLARE
  v_project_id uuid;
  v_phase_prep uuid;
  v_phase_install uuid;
  v_phase_grout uuid;
  v_op_install uuid;
  v_op_grout uuid;
  v_op_count integer;
  v_updated int;
  v_linked record;
  v_missing_sources text[] := ARRAY[]::text[];
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
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(pp.name)) = 'prepare subfloor';

  SELECT pp.id INTO v_phase_install
  FROM public.project_phases pp
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(pp.name)) = 'install';

  SELECT pp.id INTO v_phase_grout
  FROM public.project_phases pp
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(pp.name)) IN ('grout & finish', 'grout and finish');

  IF v_phase_prep IS NULL OR v_phase_install IS NULL OR v_phase_grout IS NULL THEN
    RAISE EXCEPTION
      'Tile owned phases did not resolve (prep=%, install=%, grout=%).',
      v_phase_prep, v_phase_install, v_phase_grout;
  END IF;

  -- Prepare subfloor ops were renamed to product names; do not match by operation_name.
  -- Quality gating only touches Install and Grout & Finish (one op each).
  SELECT count(*)::integer INTO v_op_count
  FROM public.phase_operations WHERE phase_id = v_phase_install;
  IF v_op_count <> 1 THEN
    RAISE EXCEPTION 'Install phase holds % operations, expected exactly 1.', v_op_count;
  END IF;
  SELECT id INTO v_op_install FROM public.phase_operations WHERE phase_id = v_phase_install;

  SELECT count(*)::integer INTO v_op_count
  FROM public.phase_operations WHERE phase_id = v_phase_grout;
  IF v_op_count <> 1 THEN
    RAISE EXCEPTION 'Grout & Finish phase holds % operations, expected exactly 1.', v_op_count;
  END IF;
  SELECT id INTO v_op_grout FROM public.phase_operations WHERE phase_id = v_phase_grout;

  -- ---------------------------------------------------------------------------
  -- Three quality level rows (descriptions first; placeholder images for UI test)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.project_quality_levels (
    project_id,
    quality_level,
    outcome_summary,
    process_summary,
    vs_lower_summary,
    example_image_urls
  ) VALUES
  (
    v_project_id,
    'good',
    'Floor is covered and serviceable. Minor lippage, uneven joint widths, or light grout haze can remain within loose DIY tolerances. Edges and transitions look finished enough for daily use, not for close inspection.',
    'Core set and grout path only: prepare the chosen underlayment, layout, cut, set, cure, pack grout, and wash. Skip premium flatness work, leveling-clip systems, formal pre-cure QC, and sealing.',
    NULL,
    '["https://placehold.co/640x400/e8e4df/444?text=Good+tile+finish"]'::jsonb
  ),
  (
    v_project_id,
    'great',
    'Field reads as a deliberate DIY install: lippage and joint width stay inside stated DIY targets, mortar coverage looks intentional on lift checks, and grout joints are tooled clean without heavy haze.',
    'Core path plus standard best-practice checks: verify coverage while setting and walk the field for flatness, lippage, and joint width before the thinset cures.',
    'Choosing Great instead of Good adds the pre-cure inspection and coverage discipline that catch lippage and hollow spots while they are still correctable. Good leaves those defects more likely to stay in the finished floor.',
    '["https://placehold.co/640x400/dce8f5/334?text=Great+tile+finish"]'::jsonb
  ),
  (
    v_project_id,
    'professional',
    'Near-trade plane and joint uniformity under raking light. Edges and transitions look intentional. Grout is sealed where the product calls for it, and the floor holds up to close inspection.',
    'Great path plus extra prep and finish: install a leveling system while setting, hold a stricter final finish inspection, and apply grout sealer as a required step rather than optional.',
    'Choosing Professional instead of Great adds leveling clips, a final finish inspection against tighter tolerances, and mandatory sealing. Great can still look strong day-to-day without that extra labor.',
    '["https://placehold.co/640x400/e6f0e4/345?text=Professional+tile+finish"]'::jsonb
  )
  ON CONFLICT (project_id, quality_level) DO UPDATE SET
    outcome_summary = EXCLUDED.outcome_summary,
    process_summary = EXCLUDED.process_summary,
    vs_lower_summary = EXCLUDED.vs_lower_summary,
    example_image_urls = EXCLUDED.example_image_urls,
    updated_at = now();

  -- ---------------------------------------------------------------------------
  -- Gate existing steps
  -- ---------------------------------------------------------------------------
  UPDATE public.operation_steps
  SET min_quality_goal = 'great', updated_at = now()
  WHERE id = '373adcbf-0a8c-42e9-9bcb-a5c100000001'::uuid
    AND operation_id = v_op_install
    AND lower(btrim(step_title)) = 'inspect set tile before cure';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'Expected to gate Inspect set tile before cure (updated=%).', v_updated;
  END IF;

  UPDATE public.operation_steps
  SET
    min_quality_goal = 'professional',
    flow_type = 'prime',
    updated_at = now()
  WHERE id = '373adcbf-0a8c-42e9-9bcb-a5c100000004'::uuid
    AND operation_id = v_op_grout
    AND lower(btrim(step_title)) = 'apply grout sealer';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'Expected to gate Apply grout sealer as professional (updated=%).', v_updated;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Professional-only process steps
  -- ---------------------------------------------------------------------------
  INSERT INTO public.operation_steps (
    id, operation_id, step_title, description, display_order,
    flow_type, step_type, number_of_workers, skill_level, allow_content_edit,
    min_quality_goal
  ) VALUES
  (
    '373adcbf-0a8c-42e9-9bcb-a5c100000005'::uuid,
    v_op_install,
    'Install leveling clips and verify plane',
    'Seat manufacturer leveling clips or wedges as each tile is set and confirm the field stays inside the professional lippage limit before the mortar skins over.',
    5,
    'prime',
    'scaled',
    2,
    'Advanced',
    true,
    'professional'
  ),
  (
    '373adcbf-0a8c-42e9-9bcb-a5c100000006'::uuid,
    v_op_grout,
    'Final finish inspection',
    'Inspect the cured floor for lippage, joint uniformity, haze, and edge transitions against professional tolerances before calling the work complete.',
    7,
    'prime',
    'quality_control_scaled',
    1,
    'Intermediate',
    true,
    'professional'
  )
  ON CONFLICT (id) DO UPDATE SET
    operation_id = EXCLUDED.operation_id,
    step_title = EXCLUDED.step_title,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    flow_type = EXCLUDED.flow_type,
    step_type = EXCLUDED.step_type,
    number_of_workers = EXCLUDED.number_of_workers,
    skill_level = EXCLUDED.skill_level,
    min_quality_goal = EXCLUDED.min_quality_goal,
    updated_at = now();

  -- Order: set tile, then leveling clips (pro), then inspect (great+).
  UPDATE public.operation_steps
  SET display_order = 5, updated_at = now()
  WHERE id = '373adcbf-0a8c-42e9-9bcb-a5c100000005'::uuid;

  UPDATE public.operation_steps
  SET display_order = 6, updated_at = now()
  WHERE id = '373adcbf-0a8c-42e9-9bcb-a5c100000001'::uuid;

  -- ---------------------------------------------------------------------------
  -- Gap-report linked sources without quality levels (do not author on their behalf)
  -- ---------------------------------------------------------------------------
  FOR v_linked IN
    SELECT DISTINCT pp.source_project_id AS source_id, sp.name AS source_name
    FROM public.project_phases pp
    LEFT JOIN public.projects sp ON sp.id = pp.source_project_id
    WHERE pp.project_id = v_project_id
      AND pp.source_project_id IS NOT NULL
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.project_quality_levels pql
      WHERE pql.project_id = v_linked.source_id
    ) THEN
      v_missing_sources := array_append(
        v_missing_sources,
        coalesce(v_linked.source_name, v_linked.source_id::text)
      );
    END IF;
  END LOOP;

  IF array_length(v_missing_sources, 1) IS NOT NULL THEN
    RAISE NOTICE
      'Tile quality seed: linked source projects still missing project_quality_levels (author on those templates): %',
      array_to_string(v_missing_sources, ' | ');
  END IF;

  UPDATE public.projects
  SET
    phases = public.rebuild_phases_json_from_project_phases_internal(v_project_id),
    updated_at = now()
  WHERE id = v_project_id;

  RAISE NOTICE 'Tile Flooring Installation quality goals seeded for project %', v_project_id;
END
$migration$;

-- ==== END 20260918210000_tile_flooring_quality_goals.sql ====

-- ==== BEGIN 20260918220000_tile_flooring_step2_quality_gated_instructions.sql ====
-- Step 2: instructions for Professional-only Tile Flooring steps added in quality goals.
-- Covers: Install leveling clips and verify plane, Final finish inspection.
-- Tolerances: ANSI A108.02 lippage; manufacturer clip spacing; TCNA EJ171 edge / movement joints.

DO $migration$
DECLARE
  v_project_id uuid;
  v_step_clips CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000005'::uuid;
  v_step_final CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000006'::uuid;
  v_updated int;
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
    RAISE EXCEPTION
      'Quality-gated steps missing. Apply 20260918210000_tile_flooring_quality_goals.sql first.';
  END IF;

  DELETE FROM public.step_instructions
  WHERE step_id IN (v_step_clips, v_step_final);

  INSERT INTO public.step_instructions (step_id, instruction_level, content) VALUES
  (v_step_clips, 'beginner', '[
    {"id":"cl-b-bg","type":"text","title":"Background/Need-to-Know","content":"Leveling clips pull neighboring tile faces into the same plane while the mortar is still soft. That is how Professional installs hold lippage under raking light on large-format tile. Clips go in as each tile is set, not after a whole row hardens. Follow the clip maker spacing and tension instructions printed on the pack.","width":"full","alignment":"left"},
    {"id":"cl-b-safe","type":"safety-warning","title":"Clip and wedge safety","content":"Wear safety glasses when tensioning and when breaking clips after cure. Broken clip stems can snap and fly. Keep fingers clear of the pliers jaws.","severity":"medium","width":"full","alignment":"left"},
    {"id":"cl-b-ins","type":"text","title":"Instructions","content":"1. Confirm the clip system matches your tile thickness and joint width on the pack label before opening bags.\n2. As each tile is set, seat clips under every edge that shares a joint with a neighbor, at the spacing the manufacturer prints (often every 12 in along an edge for large format).\n3. Insert the matching wedge or screw cap and tension until the two tile faces meet flush under a straightedge across the joint.\n4. Check the joint width still matches your spacer plan after tension. If the joint pinched closed, back the tension off one click and reseat the spacer.\n5. Walk a 4 ft straightedge across every newly clipped area before the mortar skins. Reset any tile that still catches a fingertip at the edge.\n6. Leave clips in place until the thinset cure window on the bag is complete. Do not walk the field in a way that kicks wedges loose.","width":"full","alignment":"left"},
    {"id":"cl-b-er","type":"text","title":"Error-Recovery","content":"If a clip will not seat under the tile, lift the tile, clear squeeze-out from the joint, and reset with fresh mortar rather than forcing the clip. If tension cracks a tile edge, stop, replace that tile, and use a gentler tension setting or a different clip size for that thickness. If the field still shows lippage with clips installed, the substrate flatness is outside what clips can pull - stop and correct the plane before continuing.","width":"full","alignment":"left"}
  ]'::jsonb),
  (v_step_clips, 'intermediate', '[
    {"id":"cl-i-bg","type":"text","title":"Background/Need-to-Know","content":"Clips are a lippage control system, not a substitute for substrate flatness. Professional target: adjacent faces inside 1/32 in plus measured tile warpage for joints under 1/4 in (ANSI A108.02). Tension only while mortar is plastic. Breaking clips too early lets faces rebound.","width":"full","alignment":"left"},
    {"id":"cl-i-safe","type":"safety-warning","title":"Eye protection","content":"Clip stems break under load. Glasses stay on for install and removal.","severity":"medium","width":"full","alignment":"left"},
    {"id":"cl-i-ins","type":"text","title":"Instructions","content":"1. Stage clips and wedges by tile edge length so every joint gets the manufacturer spacing without hunting mid-row.\n2. Set the tile, then immediately place clips on all shared edges before the next tile goes down.\n3. Tension to flush faces. Verify with a straightedge across the joint and diagonally across the four-tile intersection.\n4. Confirm joint width with a spacer or tape after tension. Correct pinch or flare before the mortar skins.\n5. Every 20-30 sq ft, re-check the last clipped zone for wedges that backed out and for faces that opened as neighboring tiles were set.\n6. After the thinset cure time on the bag, remove caps/wedges and snap stems per the system instructions. Vacuum stem debris from joints before grout.","width":"full","alignment":"left"},
    {"id":"cl-i-er","type":"text","title":"Error-Recovery","content":"If a wedge backs out while the next tile is set, re-tension that joint before continuing the row. If two faces still show a catch after full tension, lift the high tile, adjust mortar, and reseat rather than over-tightening into a cracked edge. If stems break below the joint line during removal, rake the stub out with a grout saw before packing grout.","width":"full","alignment":"left"}
  ]'::jsonb),
  (v_step_clips, 'advanced', '[
    {"id":"cl-a-bg","type":"text","title":"Background/Need-to-Know","content":"Treat clip spacing as a process variable tied to tile edge length and warpage. On tile with any edge 15 in or longer, clips are the primary plane control. Beat-in seats the tile. Clips lock the faces. Sequence: bed, beat-in, clip, verify, move on. Do not chase plane with clips after the mortar skins.","width":"full","alignment":"left"},
    {"id":"cl-a-safe","type":"safety-warning","title":"Breakaway debris","content":"Snap stems away from your face. Wear glasses for removal passes.","severity":"medium","width":"full","alignment":"left"},
    {"id":"cl-a-ins","type":"text","title":"Instructions","content":"1. Match clip family to tile thickness and joint width. Reject mixed systems in one field.\n2. Seat clips at manufacturer spacing on every shared edge as the tile is set. Prioritize four-way intersections and doorway sight lines.\n3. Tension to flush. Cross-check with a 4 ft straightedge and a fingertip pass on every clipped joint in the open-time window.\n4. Hold joint width to the layout plan after tension. Adjust before skin-over.\n5. Sample-lift one perimeter tile per session after clipping neighbors to confirm coverage was not starved by clip pressure. Re-bed if coverage dropped.\n6. After cure, remove hardware, clear stem stubs from joints, and vacuum before grout prep.","width":"full","alignment":"left"},
    {"id":"cl-a-er","type":"text","title":"Error-Recovery","content":"If clip pressure pushed mortar out and left a hollow corner, lift, re-butter, and re-clip inside open time. If a run shows systematic crown despite clips, stop and remeasure substrate flatness over 10 ft. Clips will not fix a plane error larger than the system rating.","width":"full","alignment":"left"}
  ]'::jsonb),
  (v_step_final, 'beginner', '[
    {"id":"ff-b-bg","type":"text","title":"Background/Need-to-Know","content":"This is the Professional close-out check after grout has cured and sealer (when required) is done. You are judging the finished floor the way a critical eye will: raking light for lippage, joint uniformity, haze, and edge transitions. Fix what is still correctable (haze, sealer film, loose debris). Permanent plane defects get documented rather than ignored.","width":"full","alignment":"left"},
    {"id":"ff-b-ins","type":"text","title":"Instructions","content":"1. Turn off overhead glare and walk the floor with a flashlight held low so light rakes across the surface.\n2. Mark any lippage that catches a fingernail or shows a shadow line wider than your Professional target.\n3. Measure joint width at the start wall, mid-field, and far wall on at least two runs. Note any taper.\n4. Check perimeter and movement joints for continuous sealant or the planned gap, not grout bridges.\n5. Wipe a white cloth across several tiles. If haze transfers, wash again with the haze remover on the product sheet before calling the floor done.\n6. Photograph marked defects and the overall field for the project record, then decide which items are acceptable, cleanable, or need a repair plan.","width":"full","alignment":"left"},
    {"id":"ff-b-er","type":"text","title":"Error-Recovery","content":"If haze remains after one wash, follow the haze remover dwell time on the label rather than scrubbing harder with a dry abrasive pad that dulls glaze. If a high tile is only visible in raking light and the mortar is fully cured, do not try to grind the face - document it and plan a replacement of that tile if it fails the Professional standard you set. If a movement joint was grouted solid, cut the grout out and install the sealant specified for that joint.","width":"full","alignment":"left"}
  ]'::jsonb),
  (v_step_final, 'intermediate', '[
    {"id":"ff-i-bg","type":"text","title":"Background/Need-to-Know","content":"Professional finish criteria: lippage inside 1/32 in plus warpage for joints under 1/4 in, joint width held to the layout plan, no heavy haze, edges and transitions intentional, movement joints open and sealed per TCNA EJ171. This inspection is scaled to the floor area.","width":"full","alignment":"left"},
    {"id":"ff-i-ins","type":"text","title":"Instructions","content":"1. Rake light across the field in both directions. Mark lippage and plane defects with tape, not memory.\n2. Spot-check joint width every 5-8 ft along two long runs and at every doorway.\n3. Inspect cut edges at walls and transitions for chipping and for consistent reveal at thresholds.\n4. Confirm sealer was applied where the grout product requires it, and that no film remains on tile faces.\n5. Check that furniture pads and first traffic will not load a still-soft perimeter sealant. Note the sealant cure time from the tube.\n6. Record pass/fail by zone. Clean remaining haze. Open a repair note for any tile that fails plane after cure.","width":"full","alignment":"left"},
    {"id":"ff-i-er","type":"text","title":"Error-Recovery","content":"If joint width tapered across the room, the repair is localized reset of the worst run, not more sealer. If sealer left a film, strip only with a product approved for that sealer and grout chemistry. If a hollow tile sounds off under a knuckle tap, mark it for replacement before furniture goes in.","width":"full","alignment":"left"}
  ]'::jsonb),
  (v_step_final, 'advanced', '[
    {"id":"ff-a-bg","type":"text","title":"Background/Need-to-Know","content":"Close the Professional path with evidence. Sample lippage at intersections, photograph raking-light views, and confirm EJ171 joints are sealant, not grout. Anything outside tolerance after cure is a replacement decision, not a polish-out.","width":"full","alignment":"left"},
    {"id":"ff-a-ins","type":"text","title":"Instructions","content":"1. Map the floor into zones. Inspect each zone under raking light and with a straightedge on suspect lines.\n2. Quantify lippage and joint taper at marked locations. Compare to the Professional limits you set for this tile and joint width.\n3. Verify movement joints, transitions, and appliance cutouts meet the planned detail.\n4. Confirm grout color uniformity and absence of washout. Re-wash or spot-treat haze per the data sheet.\n5. Confirm sealer coverage in joints only, with faces clean.\n6. File photos and a short pass/fail log. Schedule tile replacement for any zone that fails plane or bond checks.","width":"full","alignment":"left"},
    {"id":"ff-a-er","type":"text","title":"Error-Recovery","content":"If multiple zones fail lippage in the same direction, treat it as a systemic plane issue from setting, not random tiles - plan a larger reset rather than single-tile swaps that will still read as a wave. If only one intersection fails, replace the proud tile and matching neighbors needed to re-establish plane.","width":"full","alignment":"left"}
  ]'::jsonb);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 6 THEN
    RAISE EXCEPTION 'Expected 6 instruction rows (2 steps x 3 levels), inserted %.', v_updated;
  END IF;

  RAISE NOTICE 'Tile quality-gated step instructions authored for project %', v_project_id;
END
$migration$;

-- ==== END 20260918220000_tile_flooring_step2_quality_gated_instructions.sql ====

-- ==== BEGIN 20260918220100_tile_flooring_step3_quality_gated_outputs.sql ====
-- Step 3: outputs for Professional-only Tile Flooring steps.

DO $migration$
DECLARE
  v_project_id uuid;
  v_step_clips CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000005'::uuid;
  v_step_final CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000006'::uuid;
  v_updated int;
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

  UPDATE public.operation_steps os
  SET outputs = v.outputs::jsonb, updated_at = now()
  FROM (VALUES
    (v_step_clips, '[
      {"id":"out-cl1a","name":"Clips seated on shared edges","description":"Manufacturer clips sit under every shared edge at the printed spacing while mortar is still plastic.","type":"performance-durability","requirement":"Every shared edge in the Professional field carries clips at the spacing printed on the clip pack for this tile size.","qualityChecks":"Count clips along a 4 ft edge sample. Confirm spacing matches the pack diagram before the mortar skins.","keyInputs":["Tile edge length","Clip system rating","Mortar open time"],"potentialEffects":"Missing clips on large format leave lippage that cures in permanently.","mustGetRight":"Clips go in as each tile is set, not after a row hardens.","allowances":"Edges against walls that will receive cove or base may omit clips where the manufacturer allows.","referenceSpecification":"Clip manufacturer spacing chart and ANSI A108.02 lippage limits."},
      {"id":"out-cl1b","name":"Adjacent faces flush under tension","description":"Tensioned clips hold neighboring faces inside the Professional lippage limit under a straightedge.","type":"major-aesthetics","requirement":"Lippage between clipped neighbors stays within 1/32 in plus measured tile warpage for joints under 1/4 in.","qualityChecks":"Straightedge across each newly clipped joint and a fingertip pass along the edge. Mark any catch.","keyInputs":["Tension setting","Tile warpage","Substrate flatness"],"potentialEffects":"Faces that stay proud become permanent shadow lines under raking light.","mustGetRight":"Verify flush before skin-over. Over-tension that cracks an edge is a failed tile, not a win.","allowances":"Inherent tile warpage is added to the table limit.","referenceSpecification":"ANSI A108.02 sections 4.3.7 and 4.4."},
      {"id":"out-cl1c","name":"Joint width held after tension","description":"After clips are tensioned, joint width still matches the layout spacer plan on all four sides.","type":"major-aesthetics","requirement":"Post-tension joint width equals the planned spacer size within the tolerance stated in the layout step.","qualityChecks":"Measure joints at mid-edge and at intersections after tension. Correct pinch or flare before continuing.","keyInputs":["Spacer size","Clip tension","Tile dimensional tolerance"],"potentialEffects":"Pinched joints telegraph as a tight line and starve grout depth.","mustGetRight":"Joint width is checked after tension, not only before.","allowances":"One joint may be adjusted within the layout tolerance when a bowed wall forces a make-up.","referenceSpecification":"Layout plan joint width and clip manufacturer notes on joint pinch."}
    ]'),
    (v_step_final, '[
      {"id":"out-ff1a","name":"Field passes raking-light plane check","description":"Under low-angle light the cured field shows no lippage beyond the Professional limit.","type":"major-aesthetics","requirement":"Finished lippage stays within 1/32 in plus warpage for joints under 1/4 in across inspected zones.","qualityChecks":"Walk with a flashlight held low in both directions. Straightedge on any shadow line. Mark failures.","keyInputs":["Lighting angle","Straightedge length","Prior clip and set quality"],"potentialEffects":"Plane defects after cure require tile replacement, not polish.","mustGetRight":"Inspect after grout cure and sealer so haze does not hide edges.","allowances":"Documented warpage within the tile grade is not counted as install lippage.","referenceSpecification":"ANSI A108.02 lippage table."},
      {"id":"out-ff1b","name":"Joints and edges look intentional","description":"Joint width is uniform to the plan, cut edges are clean, and transitions read as designed.","type":"major-aesthetics","requirement":"Joint taper stays inside the layout tolerance. Visible cuts are free of glaze chips that catch a fingernail.","qualityChecks":"Measure joint width at start, mid, and far wall on two runs. Inspect doorway and threshold reveals.","keyInputs":["Layout accuracy","Cut quality","Transition details"],"potentialEffects":"Tapered joints and chipped cuts are the defects visitors notice first.","mustGetRight":"Check the sight-line runs at doorways and the main entry wall.","allowances":"Hidden cuts under toe-kicks may show tool marks that never face the room.","referenceSpecification":"Layout plan and transition detail drawings."},
      {"id":"out-ff1c","name":"Movement joints open and sealed","description":"Perimeter and field movement joints are sealant, not grout, per the plan.","type":"performance-durability","requirement":"Every joint designated for movement is clear of grout and filled with the specified sealant after cure.","qualityChecks":"Probe perimeter lines and EJ171 locations. Confirm sealant continuity and no grout bridges.","keyInputs":["EJ171 layout","Sealant product","Grout packing discipline"],"potentialEffects":"Grouted movement joints crack tile or tent the floor when the building moves.","mustGetRight":"Cut out any grout bridge before furniture load-in.","allowances":"Sealant skin time must pass before traffic per the tube.","referenceSpecification":"TCNA EJ171 and sealant data sheet."},
      {"id":"out-ff1d","name":"Haze and sealer film cleared","description":"Tile faces are free of cement haze and sealer film that transfers to a white cloth.","type":"none","requirement":"A white cloth wipe across sampled tiles shows no cement or sealer transfer.","qualityChecks":"Wipe at least three zones per room after final wash. Re-treat any zone that transfers.","keyInputs":["Wash timing","Haze remover chemistry","Sealer application method"],"potentialEffects":"Haze and film read as a failed finish even when the plane is correct.","mustGetRight":"Use the haze remover dwell time on the label. Do not dry-sand glaze.","allowances":"Stone may need a stone-safe haze product rather than a cement haze remover meant for porcelain.","referenceSpecification":"Grout and sealer data sheets."}
    ]')
  ) AS v(step_id, outputs)
  WHERE os.id = v.step_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 2 THEN
    RAISE EXCEPTION 'Expected outputs on 2 quality-gated steps, updated %.', v_updated;
  END IF;

  RAISE NOTICE 'Tile quality-gated outputs authored for project %', v_project_id;
END
$migration$;

-- ==== END 20260918220100_tile_flooring_step3_quality_gated_outputs.sql ====

-- ==== BEGIN 20260918220200_tile_flooring_step5_quality_gated_tools.sql ====
-- Step 5: tools for Professional-only Tile Flooring steps.
-- Bootstrap shared library rows by name when absent. Step JSON uses CompactToolsTable shape
-- (id, name, category, quantity, parentId substitutes).

DO $migration$
DECLARE
  v_project_id uuid;
  v_step_clips CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000005'::uuid;
  v_step_final CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000006'::uuid;
  v_updated int;
  v_tool text;
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

  INSERT INTO public.tools (name, description, category, alternates)
  SELECT v.name, v.description, v.category, v.alternates
  FROM (VALUES
    ('Tile Leveling Clip Tool',
     'Pliers that set and tension tile leveling clips and wedges.',
     'Hand Tool',
     'Hand pressure with wedge clips works on tile under 15 in, but not on large format'),
    ('Straightedge',
     'Straight metal edge for checking lippage and field flatness.',
     'Hand Tool',
     'A factory edge of a 10 ft aluminum level, or a jointed 10 ft screed'),
    ('Rubber Mallet',
     'Seats tile without cracking glaze.',
     'Hand Tool',
     'Dead-blow mallet with a soft face for large format'),
    ('Beating Block',
     'Spreads mallet force across the tile face.',
     'Hand Tool',
     'Manufacturer beating block sized to the tile'),
    ('Tape Measure',
     'Measures joint width and clip spacing.',
     'Hand Tool',
     NULL),
    ('Level',
     'Checks plane and any intended slope.',
     'Hand Tool',
     'Laser level for long runs'),
    ('Flashlight',
     'Low-angle light for raking inspection of finished floors.',
     'Other',
     'Work light aimed across the floor'),
    ('Margin Trowel',
     'Lifts and re-beds tile during corrections.',
     'Hand Tool',
     NULL),
    ('Knee Pads',
     'Protects knees during continuous floor work.',
     'PPE',
     'Gel knee pads for long sessions'),
    ('Safety Glasses',
     'Eye protection for clip tensioning and breakaway.',
     'PPE',
     'Wraparound glasses when breaking stems')
  ) AS v(name, description, category, alternates)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tools t WHERE lower(btrim(t.name)) = lower(btrim(v.name))
  );

  FOREACH v_tool IN ARRAY ARRAY[
    'Tile Leveling Clip Tool','Straightedge','Rubber Mallet','Beating Block',
    'Tape Measure','Level','Flashlight','Margin Trowel','Knee Pads','Safety Glasses'
  ]
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.tools t WHERE lower(btrim(t.name)) = lower(btrim(v_tool))) THEN
      v_missing := array_append(v_missing, v_tool);
    END IF;
  END LOOP;

  IF array_length(v_missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Tool library bootstrap failed for: %', array_to_string(v_missing, ', ');
  END IF;

  UPDATE public.operation_steps os
  SET tools = v.tools::jsonb, updated_at = now()
  FROM (VALUES
    (v_step_clips, '[
      {"id":"tl-cl-glasses","name":"Safety Glasses","description":"Protects eyes when tensioning clips and when stems snap.","category":"PPE","alternates":[],"quantity":1},
      {"id":"tl-cl-cliptool","name":"Tile Leveling Clip Tool","description":"Tensions clips and wedges to pull adjacent faces flush.","category":"Hand Tool","alternates":[],"quantity":1},
      {"id":"tl-cl-mallet","name":"Rubber Mallet","description":"Seats the tile before clips are tensioned.","category":"Hand Tool","alternates":[],"quantity":1},
      {"id":"tl-cl-block","name":"Beating Block","description":"Spreads mallet force on tile 12 in and larger.","category":"Hand Tool","alternates":[],"quantity":1,"parentId":"tl-cl-mallet"},
      {"id":"tl-cl-straight","name":"Straightedge","description":"4 ft check across clipped joints while mortar is plastic.","category":"Hand Tool","alternates":[],"quantity":1},
      {"id":"tl-cl-tape","name":"Tape Measure","description":"Confirms clip spacing and joint width after tension.","category":"Hand Tool","alternates":[],"quantity":1},
      {"id":"tl-cl-level","name":"Level","description":"Confirms plane on clipped runs.","category":"Hand Tool","alternates":[],"quantity":1},
      {"id":"tl-cl-knees","name":"Knee Pads","description":"Continuous floor work while clipping.","category":"PPE","alternates":[],"quantity":1}
    ]'),
    (v_step_final, '[
      {"id":"tl-ff-light","name":"Flashlight","description":"Held low to rake light across the finished field.","category":"Other","alternates":[],"quantity":1},
      {"id":"tl-ff-straight","name":"Straightedge","description":"Checks marked lippage lines after cure.","category":"Hand Tool","alternates":[],"quantity":1},
      {"id":"tl-ff-tape","name":"Tape Measure","description":"Measures joint width at start, mid-field, and far wall.","category":"Hand Tool","alternates":[],"quantity":1},
      {"id":"tl-ff-level","name":"Level","description":"Confirms plane on suspect runs.","category":"Hand Tool","alternates":[],"quantity":1},
      {"id":"tl-ff-margin","name":"Margin Trowel","description":"Probes soft sealant and helps lift a marked tile if replacement is required.","category":"Hand Tool","alternates":[],"quantity":1},
      {"id":"tl-ff-knees","name":"Knee Pads","description":"Floor-level inspection passes.","category":"PPE","alternates":[],"quantity":1}
    ]')
  ) AS v(step_id, tools)
  WHERE os.id = v.step_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 2 THEN
    RAISE EXCEPTION 'Expected tools on 2 quality-gated steps, updated %.', v_updated;
  END IF;

  RAISE NOTICE 'Tile quality-gated tools authored for project %', v_project_id;
END
$migration$;

-- ==== END 20260918220200_tile_flooring_step5_quality_gated_tools.sql ====

-- ==== BEGIN 20260918220300_tile_flooring_step6_quality_gated_materials.sql ====
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

-- ==== END 20260918220300_tile_flooring_step6_quality_gated_materials.sql ====

-- ==== BEGIN 20260918220400_tile_flooring_step7_quality_gated_process_variables.sql ====
-- Step 7: process variables for Professional-only Tile Flooring steps.
-- No tool/material catalog inserts in this file.

DO $migration$
DECLARE
  v_project_id uuid;
  v_step_clips CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000005'::uuid;
  v_step_final CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000006'::uuid;
  v_updated int;
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

  UPDATE public.operation_steps os
  SET process_variables = v.pvars::jsonb, updated_at = now()
  FROM (VALUES
    (v_step_clips, '[
      {"id":"pv-cl-spacing","name":"Clip spacing along shared edges","type":"process","unit":"in","required":true,"description":"Distance between clips along each shared edge.","targetValue":"The spacing printed on the clip pack for this tile size"},
      {"id":"pv-cl-lippage","name":"Lippage after clip tension","type":"process","unit":"in","required":true,"description":"Face-to-face difference across a clipped joint under a straightedge.","targetValue":"1/32 in plus measured tile warpage for joints under 1/4 in (ANSI A108.02)"},
      {"id":"pv-cl-joint","name":"Joint width after tension","type":"process","unit":"in","required":true,"description":"Joint width measured after clips are tensioned.","targetValue":"The spacer size set in the layout plan"},
      {"id":"pv-cl-open","name":"Mortar open time remaining","type":"process","unit":"min","required":true,"description":"Time left to tension and correct before the mortar skins.","targetValue":"Inside the adjustment window on the mortar data sheet"},
      {"id":"pv-i4-lippage-up","name":"Lippage target from set step","type":"upstream","unit":"in","description":"The lippage limit this step must hold with clips.","targetValue":"1/32 in plus inherent tile warpage for joints under 1/4 in","sourceStepName":"Set tile, beat-in, and check plane"}
    ]'),
    (v_step_final, '[
      {"id":"pv-ff-lippage","name":"Finished lippage under raking light","type":"process","unit":"in","required":true,"description":"Lippage measured on the cured floor in zones inspected under low-angle light.","targetValue":"1/32 in plus warpage for joints under 1/4 in"},
      {"id":"pv-ff-joint","name":"Finished joint width uniformity","type":"process","unit":"in","required":true,"description":"Joint width at start, mid-field, and far wall on sampled runs.","targetValue":"Within the layout plan tolerance across the run"},
      {"id":"pv-ff-haze","name":"Haze wipe-test result","type":"process","options":["Pass - no transfer","Fail - haze present","Fail - sealer film present"],"required":true,"description":"White cloth wipe across sampled tile faces.","targetValue":"Pass - no transfer"},
      {"id":"pv-ff-ej171","name":"Movement joints status","type":"process","options":["Open and sealed","Grout bridge present","Sealant incomplete"],"required":true,"description":"Perimeter and field movement joints per TCNA EJ171.","targetValue":"Open and sealed"},
      {"id":"pv-cl-lippage-up","name":"Clip-held lippage from install","type":"upstream","unit":"in","description":"Plane quality locked in during Professional clipping.","targetValue":"1/32 in plus warpage for joints under 1/4 in","sourceStepName":"Install leveling clips and verify plane"}
    ]')
  ) AS v(step_id, pvars)
  WHERE os.id = v.step_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 2 THEN
    RAISE EXCEPTION 'Expected process variables on 2 quality-gated steps, updated %.', v_updated;
  END IF;

  RAISE NOTICE 'Tile quality-gated process variables authored for project %', v_project_id;
END
$migration$;

-- ==== END 20260918220400_tile_flooring_step7_quality_gated_process_variables.sql ====

-- ==== BEGIN 20260918220500_tile_flooring_step8_quality_gated_time_estimates.sql ====
-- Step 8: time estimates for Professional-only Tile Flooring steps.
-- Both steps are scaled (hours per scaling unit / sq ft).

DO $migration$
DECLARE
  v_project_id uuid;
  v_step_clips CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000005'::uuid;
  v_step_final CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000006'::uuid;
  v_updated int;
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

  -- Clips: incremental time on top of set-tile for seating and tensioning.
  -- Evidence band from trade DIY rates on large format with clip systems.
  UPDATE public.operation_steps
  SET
    time_estimate_low = 0.025,
    time_estimate_med = 0.04,
    time_estimate_high = 0.065,
    updated_at = now()
  WHERE id = v_step_clips
    AND step_type = 'scaled'
    AND number_of_workers = 2;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'Clip step time estimates did not update (updated=%).', v_updated;
  END IF;

  -- Final finish inspection: quality_control_scaled, hours per sq ft.
  UPDATE public.operation_steps
  SET
    time_estimate_low = 0.008,
    time_estimate_med = 0.012,
    time_estimate_high = 0.02,
    updated_at = now()
  WHERE id = v_step_final
    AND step_type = 'quality_control_scaled'
    AND number_of_workers = 1;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'Final finish inspection time estimates did not update (updated=%).', v_updated;
  END IF;

  RAISE NOTICE 'Tile quality-gated time estimates authored for project %', v_project_id;
END
$migration$;

-- ==== END 20260918220500_tile_flooring_step8_quality_gated_time_estimates.sql ====

-- ==== BEGIN 20260918220600_tile_flooring_step9_quality_gated_pfmea.sql ====
-- Step 9: PFMEA for Professional-only Tile Flooring steps.
-- Requirements hang off Step 3 output ids. Outputs typed none get no failure mode.

DO $migration$
DECLARE
  v_project_id uuid;
  v_step_clips CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000005'::uuid;
  v_step_final CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000006'::uuid;
  v_count integer;
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

  IF NOT EXISTS (
    SELECT 1 FROM public.operation_steps
    WHERE id = v_step_clips AND outputs IS NOT NULL AND jsonb_typeof(outputs) = 'array'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.operation_steps
    WHERE id = v_step_final AND outputs IS NOT NULL AND jsonb_typeof(outputs) = 'array'
  ) THEN
    RAISE EXCEPTION 'Quality-gated outputs missing. Apply step 3 outputs migration first.';
  END IF;

  -- Clear prior authored PFMEA for these two steps (children first).
  DELETE FROM public.pfmea_action_items
  WHERE failure_mode_id IN (
    SELECT fm.id FROM public.pfmea_failure_modes fm
    WHERE fm.operation_step_id IN (v_step_clips, v_step_final)
  );

  DELETE FROM public.pfmea_controls
  WHERE failure_mode_id IN (
    SELECT fm.id FROM public.pfmea_failure_modes fm
    WHERE fm.operation_step_id IN (v_step_clips, v_step_final)
  )
  OR cause_id IN (
    SELECT c.id FROM public.pfmea_potential_causes c
    JOIN public.pfmea_failure_modes fm ON fm.id = c.failure_mode_id
    WHERE fm.operation_step_id IN (v_step_clips, v_step_final)
  );

  DELETE FROM public.pfmea_potential_causes
  WHERE failure_mode_id IN (
    SELECT fm.id FROM public.pfmea_failure_modes fm
    WHERE fm.operation_step_id IN (v_step_clips, v_step_final)
  );

  DELETE FROM public.pfmea_potential_effects
  WHERE failure_mode_id IN (
    SELECT fm.id FROM public.pfmea_failure_modes fm
    WHERE fm.operation_step_id IN (v_step_clips, v_step_final)
  );

  DELETE FROM public.pfmea_failure_modes
  WHERE operation_step_id IN (v_step_clips, v_step_final);

  DELETE FROM public.pfmea_requirements
  WHERE operation_step_id IN (v_step_clips, v_step_final);

  INSERT INTO public.pfmea_requirements (
    id, project_id, operation_step_id, output_id, requirement_text, display_order
  ) VALUES
  (v_req_clips_a, v_project_id, v_step_clips, 'out-cl1a',
   'Every shared edge in the Professional field carries clips at the manufacturer spacing while mortar is plastic.', 1),
  (v_req_clips_b, v_project_id, v_step_clips, 'out-cl1b',
   'Lippage between clipped neighbors stays within 1/32 in plus measured tile warpage for joints under 1/4 in.', 2),
  (v_req_clips_c, v_project_id, v_step_clips, 'out-cl1c',
   'After tension, joint width still matches the layout spacer plan.', 3),
  (v_req_final_a, v_project_id, v_step_final, 'out-ff1a',
   'Finished lippage under raking light stays within 1/32 in plus warpage for joints under 1/4 in.', 1),
  (v_req_final_b, v_project_id, v_step_final, 'out-ff1b',
   'Joint width and visible cut edges meet the layout and transition plan.', 2),
  (v_req_final_c, v_project_id, v_step_final, 'out-ff1c',
   'Movement joints are sealant, not grout, at every EJ171 location.', 3);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 6 THEN
    RAISE EXCEPTION 'Expected 6 PFMEA requirements, inserted %.', v_count;
  END IF;

  INSERT INTO public.pfmea_failure_modes (
    id, project_id, operation_step_id, requirement_id, failure_mode, severity_score
  ) VALUES
  (v_fm_clips_a, v_project_id, v_step_clips, v_req_clips_a,
   'Shared edges are left without clips on large-format runs.', 7),
  (v_fm_clips_b, v_project_id, v_step_clips, v_req_clips_b,
   'Clips are tensioned after the mortar skins, so faces never pull flush.', 8),
  (v_fm_clips_c, v_project_id, v_step_clips, v_req_clips_c,
   'Clip tension pinches joints closed below the layout spacer size.', 6),
  (v_fm_final_a, v_project_id, v_step_final, v_req_final_a,
   'Raking-light lippage is accepted after cure instead of marked for replacement.', 7),
  (v_fm_final_b, v_project_id, v_step_final, v_req_final_b,
   'Joint taper and chipped sight-line cuts are left undocumented.', 5),
  (v_fm_final_c, v_project_id, v_step_final, v_req_final_c,
   'Perimeter or field movement joints remain bridged with grout.', 8);

  INSERT INTO public.pfmea_potential_effects (failure_mode_id, effect_description, severity_score) VALUES
  (v_fm_clips_a, 'Lippage cures into the field on the most visible large-format runs and can only be fixed by breaking out tile.', 7),
  (v_fm_clips_b, 'Proud edges become permanent shadow lines under raking light with no plastic window left to correct them.', 8),
  (v_fm_clips_c, 'Pinched joints starve grout depth and read as a tight dark line across the pattern.', 6),
  (v_fm_final_a, 'A Professional close-out that still fails a critical-eye plane check, forcing late tile replacement after furniture planning.', 7),
  (v_fm_final_b, 'Doorway and entry sight lines show taper or chipped glaze that visitors notice first.', 5),
  (v_fm_final_c, 'Building movement cracks tile or tents the floor along the bridged joint.', 8);

  INSERT INTO public.pfmea_potential_causes (
    failure_mode_id, cause_description, occurrence_score,
    occurrence_driver, implicated_item_kind, implicated_item_id
  ) VALUES
  (v_fm_clips_a,
   'The crew sets a full row before placing clips, then runs out of open time on the early tiles.', 6,
   'process_design', 'process_variable', 'pv-cl-open'),
  (v_fm_clips_a,
   'Clip packs are staged far from the work face, so edges are skipped to keep pace.', 5,
   'attention', 'material', 'mt-cl-clips'),
  (v_fm_clips_b,
   'Tension is deferred until a whole section is set, past the mortar adjustment window.', 7,
   'process_design', 'process_variable', 'pv-cl-open'),
  (v_fm_clips_b,
   'Straightedge checks are skipped, so soft-mortar lippage is never seen while clips can still pull it down.', 6,
   'attention', 'tool', 'tl-cl-straight'),
  (v_fm_clips_c,
   'Wedges are driven to maximum tension without re-measuring joint width after pull.', 6,
   'skill', 'process_variable', 'pv-cl-joint'),
  (v_fm_final_a,
   'Inspection is done under diffuse overhead light that hides edge shadows.', 6,
   'process_design', 'tool', 'tl-ff-light'),
  (v_fm_final_a,
   'Known proud tiles are left because replacement would delay furniture delivery.', 5,
   'attention', 'output', 'out-ff1a'),
  (v_fm_final_b,
   'Joint width is measured only at the start wall, missing taper at the far wall.', 5,
   'attention', 'process_variable', 'pv-ff-joint'),
  (v_fm_final_c,
   'Grout was packed through the perimeter during the grout step and never cut out.', 6,
   'process_design', 'output', 'out-ff1c');

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_clips_a, c.id,
    'Place clips on each shared edge immediately after the tile is beat in, before the next tile is set.',
    'prevention', NULL, 'mistake_proof'
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_clips_a
    AND c.implicated_item_id = 'pv-cl-open';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_clips_a, c.id,
    'Stage opened clip bags on the floor beside the working edge so every joint is clipped without a walk-back.',
    'prevention', NULL, 'procedural'
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_clips_a
    AND c.implicated_item_id = 'mt-cl-clips';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_clips_b, c.id,
    'Tension clips inside the mortar adjustment window printed on the bag. Do not leave tension for a later pass.',
    'prevention', NULL, 'mistake_proof'
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_clips_b
    AND c.implicated_item_id = 'pv-cl-open';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_clips_b, c.id,
    'Straightedge every newly clipped joint before skin-over. Mark any catch for re-tension or lift.',
    'detection', 4, NULL
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_clips_b
    AND c.implicated_item_id = 'tl-cl-straight';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_clips_c, c.id,
    'After tension, measure the joint with the same spacer used in layout. Back off one click if the joint pinched.',
    'prevention', NULL, 'procedural'
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_clips_c;

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_final_a, c.id,
    'Inspect with a flashlight held low so light rakes across the surface in both directions.',
    'detection', 3, NULL
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_final_a
    AND c.implicated_item_id = 'tl-ff-light';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_final_a, c.id,
    'Mark every failed tile with tape and open a replacement note before furniture planning continues.',
    'prevention', NULL, 'procedural'
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_final_a
    AND c.implicated_item_id = 'out-ff1a';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_final_b, c.id,
    'Measure joint width at start, mid-field, and far wall on at least two long runs.',
    'detection', 4, NULL
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_final_b;

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_final_c, c.id,
    'Cut grout bridges out of movement joints and install the specified sealant before close-out sign-off.',
    'prevention', NULL, 'mistake_proof'
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_final_c;

  -- Action items on High lines (severity 7+ with weak detection / high occurrence paths).
  INSERT INTO public.pfmea_action_items (failure_mode_id, recommended_action, status) VALUES
  (v_fm_clips_a,
   'Change the set sequence so clips are placed on each tile before the next tile is laid. Do not batch-clip a finished row.',
   'not_started'),
  (v_fm_clips_b,
   'Add a timed open-window check: after each 20 sq ft, confirm every clip in that zone is already tensioned.',
   'not_started'),
  (v_fm_final_a,
   'Require a raking-light photo set per room before Professional close-out is marked complete.',
   'not_started'),
  (v_fm_final_c,
   'Add a movement-joint probe to the final checklist and block close-out while any grout bridge remains.',
   'not_started');

  RAISE NOTICE 'Tile quality-gated PFMEA authored for project %', v_project_id;
END
$migration$;

-- ==== END 20260918220600_tile_flooring_step9_quality_gated_pfmea.sql ====

-- ==== BEGIN 20260918220700_tile_flooring_content_audit.sql ====
-- Content audit: Tile Flooring Installation owned steps after quality-goal build-out.
-- Asserts completeness per owned step and quality goal rows. Linked/standard phases are
-- reported with RAISE NOTICE only.

DO $migration$
DECLARE
  v_project_id uuid;
  v_gaps text[] := ARRAY[]::text[];
  v_row record;
  v_quality_n integer;
  v_owned_n integer;
  v_linked record;
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

  SELECT count(*)::integer INTO v_quality_n
  FROM public.project_quality_levels
  WHERE project_id = v_project_id
    AND quality_level IN ('good', 'great', 'professional');

  IF v_quality_n <> 3 THEN
    v_gaps := array_append(v_gaps, format('project_quality_levels: expected 3 rows, found %s', v_quality_n));
  END IF;

  SELECT count(*)::integer INTO v_owned_n
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL AND pp.source_project_id IS NULL;

  IF v_owned_n < 19 THEN
    v_gaps := array_append(v_gaps, format('owned steps: expected at least 19 after quality gating, found %s', v_owned_n));
  END IF;

  -- Gate checks on known quality-gated step titles.
  FOR v_row IN
    SELECT os.step_title, os.min_quality_goal
    FROM public.operation_steps os
    JOIN public.phase_operations po ON po.id = os.operation_id
    JOIN public.project_phases pp ON pp.id = po.phase_id
    WHERE pp.project_id = v_project_id
      AND pp.is_standard IS NOT TRUE AND pp.is_linked IS NOT TRUE
      AND pp.source_phase_id IS NULL AND pp.source_project_id IS NULL
      AND lower(btrim(os.step_title)) IN (
        'inspect set tile before cure',
        'install leveling clips and verify plane',
        'apply grout sealer',
        'final finish inspection'
      )
  LOOP
    IF lower(btrim(v_row.step_title)) = 'inspect set tile before cure'
       AND v_row.min_quality_goal IS DISTINCT FROM 'great' THEN
      v_gaps := array_append(v_gaps, 'Inspect set tile before cure: min_quality_goal should be great');
    END IF;
    IF lower(btrim(v_row.step_title)) IN (
         'install leveling clips and verify plane',
         'apply grout sealer',
         'final finish inspection'
       )
       AND v_row.min_quality_goal IS DISTINCT FROM 'professional' THEN
      v_gaps := array_append(
        v_gaps,
        format('%s: min_quality_goal should be professional', v_row.step_title)
      );
    END IF;
  END LOOP;

  FOR v_row IN
    SELECT
      os.step_title,
      os.step_type,
      os.number_of_workers,
      os.skill_level,
      os.description,
      os.time_estimate_low, os.time_estimate_med, os.time_estimate_high,
      jsonb_typeof(os.outputs::jsonb) AS outputs_type,
      jsonb_typeof(os.tools::jsonb) AS tools_type,
      jsonb_typeof(os.materials::jsonb) AS materials_type,
      jsonb_typeof(os.process_variables::jsonb) AS pv_type,
      coalesce(CASE WHEN jsonb_typeof(os.outputs::jsonb) = 'array'
                    THEN jsonb_array_length(os.outputs::jsonb) END, 0) AS outputs_n,
      coalesce(CASE WHEN jsonb_typeof(os.tools::jsonb) = 'array'
                    THEN jsonb_array_length(os.tools::jsonb) END, 0) AS tools_n,
      coalesce(CASE WHEN jsonb_typeof(os.process_variables::jsonb) = 'array'
                    THEN jsonb_array_length(os.process_variables::jsonb) END, 0) AS pv_n,
      (
        SELECT count(DISTINCT si.instruction_level)
        FROM public.step_instructions si
        WHERE si.step_id = os.id
          AND si.instruction_level IN ('beginner', 'intermediate', 'advanced')
      ) AS levels_n
    FROM public.operation_steps os
    JOIN public.phase_operations po ON po.id = os.operation_id
    JOIN public.project_phases pp ON pp.id = po.phase_id
    WHERE pp.project_id = v_project_id
      AND pp.is_standard IS NOT TRUE AND pp.is_linked IS NOT TRUE
      AND pp.source_phase_id IS NULL AND pp.source_project_id IS NULL
    ORDER BY
      CASE WHEN pp.position_rule = 'last' THEN 1 ELSE 0 END,
      pp.position_value NULLS LAST,
      pp.created_at,
      po.display_order,
      os.display_order
  LOOP
    IF v_row.levels_n <> 3 THEN
      v_gaps := array_append(v_gaps, format('%s: %s of 3 instruction levels', v_row.step_title, v_row.levels_n));
    END IF;
    IF v_row.outputs_type IS DISTINCT FROM 'array' OR v_row.outputs_n = 0 THEN
      v_gaps := array_append(v_gaps, format('%s: no outputs', v_row.step_title));
    END IF;
    IF v_row.tools_type IS DISTINCT FROM 'array' OR v_row.tools_n = 0 THEN
      v_gaps := array_append(v_gaps, format('%s: no tools', v_row.step_title));
    END IF;
    IF v_row.materials_type IS DISTINCT FROM 'array' THEN
      v_gaps := array_append(v_gaps, format('%s: materials never authored', v_row.step_title));
    END IF;
    IF v_row.pv_type IS DISTINCT FROM 'array' OR v_row.pv_n = 0 THEN
      v_gaps := array_append(v_gaps, format('%s: no process variables', v_row.step_title));
    END IF;
    IF v_row.time_estimate_low IS NULL OR v_row.time_estimate_med IS NULL OR v_row.time_estimate_high IS NULL THEN
      v_gaps := array_append(v_gaps, format('%s: incomplete time estimates', v_row.step_title));
    END IF;
    IF v_row.step_type IS NULL OR v_row.number_of_workers IS NULL OR v_row.skill_level IS NULL
       OR v_row.description IS NULL OR btrim(v_row.description) = '' THEN
      v_gaps := array_append(v_gaps, format('%s: incomplete structure metadata', v_row.step_title));
    END IF;
  END LOOP;

  FOR v_row IN
    SELECT os.step_title, req.output_id
    FROM public.pfmea_requirements req
    JOIN public.operation_steps os ON os.id = req.operation_step_id
    JOIN public.phase_operations po ON po.id = os.operation_id
    JOIN public.project_phases pp ON pp.id = po.phase_id
    WHERE req.project_id = v_project_id
      AND pp.project_id = v_project_id
      AND pp.is_standard IS NOT TRUE AND pp.is_linked IS NOT TRUE
      AND pp.source_phase_id IS NULL AND pp.source_project_id IS NULL
      AND req.output_id IS NOT NULL
      AND jsonb_typeof(os.outputs::jsonb) = 'array'
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(os.outputs::jsonb) AS o
        WHERE o->>'id' = req.output_id
      )
  LOOP
    v_gaps := array_append(
      v_gaps,
      format('%s: PFMEA requirement points at missing output %s', v_row.step_title, v_row.output_id)
    );
  END LOOP;

  FOR v_row IN
    SELECT r.risk_title, (pp.id IS NOT NULL) AS owned
    FROM public.project_risks r
    LEFT JOIN public.operation_steps os ON os.id = r.operation_step_id
    LEFT JOIN public.phase_operations po ON po.id = os.operation_id
    LEFT JOIN public.project_phases pp
      ON pp.id = po.phase_id
     AND pp.project_id = v_project_id
     AND pp.is_standard IS NOT TRUE AND pp.is_linked IS NOT TRUE
     AND pp.source_phase_id IS NULL AND pp.source_project_id IS NULL
    WHERE r.project_id = v_project_id
      AND (
        r.risk_dimension IS NULL
        OR r.severity_score IS NULL
        OR r.occurrence_score IS NULL
        OR r.detection_score IS NULL
      )
  LOOP
    IF v_row.owned THEN
      v_gaps := array_append(v_gaps, format('register risk "%s": missing component or scores', v_row.risk_title));
    ELSE
      RAISE NOTICE
        'Register risk "%" is unclassified and is not tied to an owned step, so it is reported rather than enforced here.',
        v_row.risk_title;
    END IF;
  END LOOP;

  -- Linked sources without quality levels: notice only.
  FOR v_linked IN
    SELECT DISTINCT sp.name AS source_name, pp.source_project_id
    FROM public.project_phases pp
    LEFT JOIN public.projects sp ON sp.id = pp.source_project_id
    WHERE pp.project_id = v_project_id
      AND pp.source_project_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.project_quality_levels pql
        WHERE pql.project_id = pp.source_project_id
      )
  LOOP
    RAISE NOTICE
      'Linked source "%" still missing project_quality_levels (author on that template).',
      coalesce(v_linked.source_name, v_linked.source_project_id::text);
  END LOOP;

  IF array_length(v_gaps, 1) IS NOT NULL THEN
    RAISE EXCEPTION E'Tile Flooring Installation is not content-complete:\n  %', array_to_string(v_gaps, E'\n  ');
  END IF;

  RAISE NOTICE
    'Tile Flooring Installation content audit passed for project % (% owned steps).',
    v_project_id, v_owned_n;
END
$migration$;

-- ==== END 20260918220700_tile_flooring_content_audit.sql ====
