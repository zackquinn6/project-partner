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
