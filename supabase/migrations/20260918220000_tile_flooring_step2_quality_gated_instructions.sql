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
