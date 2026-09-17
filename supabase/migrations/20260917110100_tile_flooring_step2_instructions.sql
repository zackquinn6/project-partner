-- Step 2 (instructions): Tile Flooring Installation - three levels for the steps added or
-- rescoped in step 1.
--
-- Covers: Inspect set tile before cure, Cure thinset before grouting, Wash haze and tool
-- joints, Cure grout before sealing, Apply grout sealer. The twelve pre-existing owned steps
-- already carry beginner, intermediate, and advanced rows and are left alone.
--
-- Section intent per the shared standard: Background carries domain context, Instructions are
-- numbered actions only, Error-Recovery diagnoses in full sentences.
--
-- Tolerances quoted below: ANSI A108.02 section 4.3.7 and 4.4 (lippage), section 4.3.8 (grout
-- joint minimums), ANSI A108.5 section 3.3.2 and TCNA Handbook (mortar contact area). Cure and
-- sealer windows are stated as the data sheet value to read, not a single invented number.

DO $migration$
DECLARE
  v_project_id uuid;
  v_nroots integer;
  v_step_inspect CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000001'::uuid;
  v_step_cure_thinset CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000002'::uuid;
  v_step_cure_grout CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000003'::uuid;
  v_step_sealer CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000004'::uuid;
  v_step_wash uuid;
BEGIN
  WITH RECURSIVE matched AS (
    SELECT p.id
    FROM public.projects p
    WHERE (p.is_standard IS DISTINCT FROM true)
      AND (
        lower(btrim(p.name)) IN ('tile flooring installation', 'tile floor installation', 'tile flooring')
        OR lower(btrim(p.name)) LIKE 'tile flooring installation%'
      )
  ),
  up AS (
    SELECT pr.id, pr.parent_project_id FROM public.projects pr WHERE pr.id IN (SELECT id FROM matched)
    UNION ALL
    SELECT par.id, par.parent_project_id FROM public.projects par INNER JOIN up ON par.id = up.parent_project_id
  ),
  roots AS (SELECT DISTINCT id AS root_id FROM up WHERE parent_project_id IS NULL)
  SELECT (SELECT count(*)::integer FROM roots), (SELECT root_id FROM roots LIMIT 1)
  INTO v_nroots, v_project_id;

  IF v_nroots <> 1 THEN
    RAISE EXCEPTION 'Tile Flooring Installation root did not resolve to exactly one row (found %).', v_nroots;
  END IF;

  SELECT os.id INTO v_step_wash
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(os.step_title)) = 'wash haze and tool joints';

  IF v_step_wash IS NULL THEN
    RAISE EXCEPTION 'Wash haze and tool joints step not found. Run the step 1 structure migration first.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.operation_steps WHERE id = v_step_inspect)
     OR NOT EXISTS (SELECT 1 FROM public.operation_steps WHERE id = v_step_cure_thinset)
     OR NOT EXISTS (SELECT 1 FROM public.operation_steps WHERE id = v_step_cure_grout)
     OR NOT EXISTS (SELECT 1 FROM public.operation_steps WHERE id = v_step_sealer) THEN
    RAISE EXCEPTION 'Steps added in the step 1 structure migration are missing. Run it before authoring instructions.';
  END IF;

  DELETE FROM public.step_instructions
  WHERE step_id IN (v_step_inspect, v_step_cure_thinset, v_step_cure_grout, v_step_sealer, v_step_wash);

  -- ---------------------------------------------------------------------------
  -- Inspect set tile before cure
  -- ---------------------------------------------------------------------------
  INSERT INTO public.step_instructions (step_id, instruction_level, content) VALUES
  (v_step_inspect, 'beginner', '[
    {"id":"qc-b-bg","type":"text","title":"Background/Need-to-Know","content":"This is the last hour where mistakes are still cheap. While mortar is soft you can lift a tile, add mortar, and reset it. Once it cures, the only fix for a high tile or a wandering joint is breaking it out. Ten minutes with a straightedge now is worth more than any amount of care later.","width":"full","alignment":"left"},
    {"id":"qc-b-ins","type":"text","title":"Instructions","content":"1. Lay a 4 ft straightedge across the field in several directions and look for daylight under it.\n2. Run your bare hand across tile edges and feel for any edge that catches your fingertip. That catch is about 1/32 in, which is the limit for joints narrower than 1/4 in.\n3. Measure 5 or 6 grout joints with a tape and confirm they match the spacer size you planned.\n4. Lift one tile from the last area you set and look at the back. Mortar should cover most of the back with the corners supported.\n5. Reset anything that fails while the mortar is still soft, then set the tile back into fresh mortar.\n6. Photograph the lifted tile and the straightedge checks for your records.","width":"full","alignment":"left"},
    {"id":"qc-b-er","type":"text","title":"Error-Recovery","content":"If a tile sits high, lift it, scrape some mortar off the back and the floor, and press it back to the plane of its neighbors. If a tile sits low, lift it and add mortar rather than trying to push the neighbors down. If joints have drifted wider in one direction, stop and reset that row now, because every row after it inherits the drift.","width":"full","alignment":"left"}
  ]'::jsonb),
  (v_step_inspect, 'intermediate', '[
    {"id":"qc-i-bg","type":"text","title":"Background/Need-to-Know","content":"ANSI A108.02 allows 1/32 in of lippage plus the tile actual warpage for grout joints from 1/16 in up to 1/4 in, and 1/16 in plus warpage for joints 1/4 in and wider. Mortar contact averages at least 80 percent for interior dry floors and 95 percent in wet areas, with at least 85 percent in any single square foot and no void larger than 2 square inches. Those numbers are the pass and fail line for this inspection.","width":"full","alignment":"left"},
    {"id":"qc-i-ins","type":"text","title":"Instructions","content":"1. Straightedge the field on both diagonals and along each wall, marking any gap you can slip a business card under.\n2. Check lippage at tile corners, which is where warpage shows first, and compare what you feel against the 1/32 in or 1/16 in limit for your joint width.\n3. Verify joint width at the start line, mid-field, and the far wall to confirm the pattern has not crept.\n4. Lift one tile per 50 to 100 sq ft, including one at a perimeter, and judge contact area against 80 percent or 95 percent for a wet area.\n5. Correct every failure inside the mortar open window, then re-check the corrected area.\n6. Record the coverage photos and the joint width measurements before the cure step starts.","width":"full","alignment":"left"},
    {"id":"qc-i-er","type":"text","title":"Error-Recovery","content":"If coverage is short of the limit, increase trowel notch size or back-butter the remaining tile rather than pressing harder on what is already set. If lippage repeats in one area, the substrate under it is out of plane and the fix is mortar thickness on the next tiles, not more beating. If you find a failure you cannot reach inside the open window, mark it and plan a replacement rather than grouting over a hollow tile.","width":"full","alignment":"left"}
  ]'::jsonb),
  (v_step_inspect, 'advanced', '[
    {"id":"qc-a-bg","type":"text","title":"Background/Need-to-Know","content":"Warpage is additive to the allowable lippage, so measure actual edge warpage on the longest edge of the lot before judging a field with narrow joints. Gauged porcelain panels get 1/32 in with no warpage allowance. Partially collapsed ridges under 0.25 in are not counted as voids, which matters when you photograph a lifted tile for a warranty file.","width":"full","alignment":"left"},
    {"id":"qc-a-ins","type":"text","title":"Instructions","content":"1. Record the ambient and substrate temperature, because they set how long the correction window actually lasts.\n2. Straightedge on a grid and log gaps by location rather than by impression.\n3. Measure lot warpage on a dry tile, add it to the table limit, and judge corner lippage against that sum.\n4. Sample coverage at the field, the perimeter, and any area spread near the end of a batch, where skin-over shows up.\n5. Correct in the order the mortar allows: perimeter and doorway tiles first, then field.\n6. Log lot numbers, mortar batch, notch size, and coverage photos with the inspection result.","width":"full","alignment":"left"},
    {"id":"qc-a-er","type":"text","title":"Error-Recovery","content":"If sampled coverage fails on tiles spread late in a batch, the mix exceeded its open time and the remedy is smaller fields rather than a wetter mix. If lippage clusters along one line, check whether a panel seam or a membrane overlap telegraphs there and address the substrate before setting more tile. After cure, remediation for most porcelain is replacement rather than grinding the glaze.","width":"full","alignment":"left"}
  ]'::jsonb);

  -- ---------------------------------------------------------------------------
  -- Cure thinset before grouting (wait step, zero workers)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.step_instructions (step_id, instruction_level, content) VALUES
  (v_step_cure_thinset, 'beginner', '[
    {"id":"ct-b-bg","type":"text","title":"Background/Need-to-Know","content":"Nothing gets built during this step and that is the point. Most setting mortars want about 24 hours at room temperature before anyone walks on the floor or packs grout. Grouting early drags tiles out of line and the movement does not show until the grout has hardened around it. Cool rooms, damp weather, and non-porous tile all stretch the wait, so read the bag rather than the calendar.","width":"full","alignment":"left"},
    {"id":"ct-b-ins","type":"text","title":"Instructions","content":"1. Write down the time you set the last tile.\n2. Read the cure time before grouting off the mortar bag and add it to that time.\n3. Set a reminder for the end of the wait.\n4. Block the doorway so nobody walks on the floor, including pets.\n5. Keep the room above the minimum temperature on the bag, usually 50 F, and leave it ventilated.","width":"full","alignment":"left"},
    {"id":"ct-b-er","type":"text","title":"Error-Recovery","content":"If someone walks on the floor early, check those tiles with a straightedge and by tapping for a hollow sound before you grout. If the room ran cold or the air stayed damp, give the floor another day rather than starting grout on soft mortar.","width":"full","alignment":"left"}
  ]'::jsonb),
  (v_step_cure_thinset, 'intermediate', '[
    {"id":"ct-i-bg","type":"text","title":"Background/Need-to-Know","content":"Cure is the schedule item people forget when they plan a weekend. A 24 hour wait between setting and grouting turns a two day job into a three day one, and that gap belongs on the calendar, not in the slack. Cement mortar gains strength through hydration, so temperature and humidity change the rate: expect the long end of the range below 60 F and with impervious porcelain over a membrane.","width":"full","alignment":"left"},
    {"id":"ct-i-ins","type":"text","title":"Instructions","content":"1. Log the finish time of the last tile set and the room temperature.\n2. Take the cure-before-grout figure from the mortar data sheet, not from a general rule.\n3. Add margin when the room is below 60 F, humidity is high, or the tile and substrate are both non-porous.\n4. Protect the field with a blocked doorway and, if a walk path is unavoidable, kneeling boards spanning several tiles.\n5. Verify before grouting: tap for hollow spots and confirm no tile shifts under hand pressure.","width":"full","alignment":"left"},
    {"id":"ct-i-er","type":"text","title":"Error-Recovery","content":"If a tile moves under hand pressure at the end of the wait, the mortar under it has not gained strength and grouting will lock in a defect, so extend the cure and re-check. If traffic happened mid-cure, inspect and reset affected tiles before grout rather than after.","width":"full","alignment":"left"}
  ]'::jsonb),
  (v_step_cure_thinset, 'advanced', '[
    {"id":"ct-a-bg","type":"text","title":"Background/Need-to-Know","content":"Cure requirements differ between mortar classes. Rapid-setting mortars can allow grout in 2 to 4 hours, while standard modified mortars typically want 24 hours and can want longer under impervious tile with narrow joints, where water leaves only through the joints. Build the wait from the product data sheet and the conditions you actually have.","width":"full","alignment":"left"},
    {"id":"ct-a-ins","type":"text","title":"Instructions","content":"1. Record mortar class, batch, set completion time, ambient temperature, and relative humidity.\n2. Apply the data sheet cure window for the class you used, extending it for low temperature or impervious assemblies.\n3. Keep the floor loaded only by kneeling boards that distribute across multiple tiles if access is required.\n4. Confirm readiness with a tap test across the field and a spot check that joints are dry to the depth grout will occupy.\n5. Note the actual elapsed hours in the project record so the next run inherits a real number.","width":"full","alignment":"left"},
    {"id":"ct-a-er","type":"text","title":"Error-Recovery","content":"If the tap test finds drummy areas, the issue is bond rather than cure time, so plan removal and reset instead of waiting longer. If a rapid mortar was used on part of the floor and a standard mortar elsewhere, gate grout on the slower product for the whole area.","width":"full","alignment":"left"}
  ]'::jsonb);

  -- ---------------------------------------------------------------------------
  -- Wash haze and tool joints (rescoped: sealing moved to its own step)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.step_instructions (step_id, instruction_level, content) VALUES
  (v_step_wash, 'beginner', '[
    {"id":"wh-b-bg","type":"text","title":"Background/Need-to-Know","content":"Grout leaves a thin film on the tile that looks like dust and hides the color you picked. It comes off easily in the first few hours and becomes a scrubbing job after that. Too much water is the real danger here: a soaked sponge pulls cement out of the joints and leaves pale, crumbly lines.","width":"full","alignment":"left"},
    {"id":"wh-b-ins","type":"text","title":"Instructions","content":"1. Wait until the grout firms up enough that a fingertip leaves no dent, usually 20 to 30 minutes after packing.\n2. Wring a clean sponge nearly dry, then wipe in circles to lift the film without digging into the joints.\n3. Rinse the sponge in clean water often and change the water as soon as it turns cloudy.\n4. Shape each joint with one light pass so the depth looks the same everywhere.\n5. Come back 1 to 3 hours later and buff the remaining haze off with a dry microfiber cloth.","width":"full","alignment":"left"},
    {"id":"wh-b-er","type":"text","title":"Error-Recovery","content":"If a joint washes out and looks low or pitted, press fresh grout in while the batch is still workable. If haze has already dried hard, use the cleaner the grout maker names for their product rather than vinegar or acid, which can etch grout and some stone.","width":"full","alignment":"left"}
  ]'::jsonb),
  (v_step_wash, 'intermediate', '[
    {"id":"wh-i-bg","type":"text","title":"Background/Need-to-Know","content":"The wash sets the color you live with. Excess water raises the water to cement ratio at the joint surface and produces blotchy, chalky lines, while a late wash leaves a film that reads as a dull cast across the whole floor. Two passes handle it: a damp pass that shapes joints, then a dry buff once the surface film has dried to powder.","width":"full","alignment":"left"},
    {"id":"wh-i-ins","type":"text","title":"Instructions","content":"1. Test firmness at the edge of the last packed area before touching the field.\n2. Work in 10 to 20 sq ft sections with a nearly dry sponge, wiping diagonally to the joints so you do not plow them.\n3. Keep two buckets, one to rinse and one with clean water, and change the clean bucket before it clouds.\n4. Tool joints to one consistent depth and profile, without exposing the mortar bed below.\n5. Buff residual haze with dry microfiber after the film dulls, typically 1 to 3 hours in.\n6. Inspect under low-angle light and note any area that still reads hazy.","width":"full","alignment":"left"}
    ,
    {"id":"wh-i-er","type":"text","title":"Error-Recovery","content":"If joints dry lighter in the areas you washed first, the sponge was too wet there and the fix is repacking those joints rather than sealing over them. If pinholes appear along a joint, refill while the batch is workable. If haze resists dry buffing, move to the manufacturer approved cleaner at the dilution they publish.","width":"full","alignment":"left"}
  ]'::jsonb),
  (v_step_wash, 'advanced', '[
    {"id":"wh-a-bg","type":"text","title":"Background/Need-to-Know","content":"Cement grout color uniformity is a function of water contact and cure conditions, not pigment. Efflorescence risk rises with cold, damp conditions and with hard water, so the final wipe water source is worth controlling on a floor you care about. Epoxy and urethane grouts follow a different cleanup chemistry and time window than cement grout, and mixing the two procedures is what leaves permanent residue.","width":"full","alignment":"left"},
    {"id":"wh-a-ins","type":"text","title":"Instructions","content":"1. Confirm the grout family and pull its cleanup sequence and window before starting.\n2. Stage the wash so no area exceeds its window while another is still being packed.\n3. Wash with minimum water at a controlled dilution, replacing rinse water on a schedule rather than by appearance.\n4. Tool joints to a single profile and verify depth relative to tile thickness.\n5. Dry buff, then inspect under raking light for film and for color variation between the first and last areas washed.\n6. Log water source, ambient conditions, and any cleaner used for the warranty file.","width":"full","alignment":"left"},
    {"id":"wh-a-er","type":"text","title":"Error-Recovery","content":"If efflorescence appears as a white bloom after drying, address it with the product the grout maker specifies and correct the moisture condition before sealing, because sealing over bloom locks it in. If color variation tracks the wash sequence, plan a grout colorant or targeted repack rather than a sealer, which will not even out color.","width":"full","alignment":"left"}
  ]'::jsonb);

  -- ---------------------------------------------------------------------------
  -- Cure grout before sealing (wait step, zero workers)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.step_instructions (step_id, instruction_level, content) VALUES
  (v_step_cure_grout, 'beginner', '[
    {"id":"cg-b-bg","type":"text","title":"Background/Need-to-Know","content":"Sealer only works on grout that has finished curing. Most cement grouts want 48 to 72 hours before a penetrating sealer, and the bag states the number. Seal too early and the sealer sits on damp grout instead of soaking in, which can trap moisture and leave a patchy look you cannot wipe off. Light foot traffic is usually fine well before sealing, and the bag says when.","width":"full","alignment":"left"},
    {"id":"cg-b-ins","type":"text","title":"Instructions","content":"1. Note the time you finished washing the grout.\n2. Read the cure-before-sealer time on the grout bag and add it to that time.\n3. Keep the floor dry for the whole wait. No mopping, no wet mats, no shower use in the room.\n4. Follow the bag for when light foot traffic is allowed and keep heavy loads off until then.\n5. Set a reminder for the end of the wait so sealing does not slip a week.","width":"full","alignment":"left"},
    {"id":"cg-b-er","type":"text","title":"Error-Recovery","content":"If the floor got wet during the wait, let it dry fully and restart the clock before sealing. If joints still look darker than the rest, they are holding moisture and are not ready for sealer.","width":"full","alignment":"left"}
  ]'::jsonb),
  (v_step_cure_grout, 'intermediate', '[
    {"id":"cg-i-bg","type":"text","title":"Background/Need-to-Know","content":"This wait is a schedule item rather than work, and it is usually 2 to 3 days. Plan it against when the room has to go back into service, especially in a bathroom where the shower cannot be used. A moisture reading or a plastic sheet taped down overnight tells you more than the calendar: condensation under the sheet means the joints are still releasing water.","width":"full","alignment":"left"},
    {"id":"cg-i-ins","type":"text","title":"Instructions","content":"1. Record the wash completion time and the grout product and family.\n2. Apply the cure-before-sealer window from the data sheet, extending it in cool or humid rooms.\n3. Keep the surface dry and ventilated for the duration and stage the sealer application after it.\n4. Check readiness by taping a clear plastic square to the floor for several hours and looking for condensation or darkening.\n5. Confirm the sealer you have is compatible with the grout and the tile before the wait ends.","width":"full","alignment":"left"},
    {"id":"cg-i-er","type":"text","title":"Error-Recovery","content":"If the plastic test shows moisture, extend the wait rather than sealing a damp joint. If the room must return to service before cure ends, keep water off the floor with a mat that does not trap moisture against the grout, and delay sealing rather than skipping it.","width":"full","alignment":"left"}
  ]'::jsonb),
  (v_step_cure_grout, 'advanced', '[
    {"id":"cg-a-bg","type":"text","title":"Background/Need-to-Know","content":"Cure windows vary by grout chemistry. High performance cement grouts often state 3 days before sealing, while epoxy and urethane grouts generally need no sealer at all, which makes this step and the one after it skippable for those systems. Sealing a joint that is still hydrating is also what produces blotching and, in wet areas, trapped efflorescence.","width":"full","alignment":"left"},
    {"id":"cg-a-ins","type":"text","title":"Instructions","content":"1. Confirm from the grout data sheet whether a sealer is specified at all for this product.\n2. If it is, apply the published cure duration and adjust for ambient conditions rather than averaging.\n3. Hold the floor dry, and in wet areas keep the fixture out of service for the full window.\n4. Verify dryness with a plastic-sheet or moisture-meter check rather than appearance alone.\n5. Record product, batch, cure hours, and conditions before releasing the floor to sealing.","width":"full","alignment":"left"},
    {"id":"cg-a-er","type":"text","title":"Error-Recovery","content":"If the grout is epoxy or urethane, stop here and mark the sealer step as not applicable rather than applying a sealer the system does not want. If efflorescence appears during cure, remove it per the manufacturer method and re-verify dryness before sealing.","width":"full","alignment":"left"}
  ]'::jsonb);

  -- ---------------------------------------------------------------------------
  -- Apply grout sealer (if-necessary flow)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.step_instructions (step_id, instruction_level, content) VALUES
  (v_step_sealer, 'beginner', '[
    {"id":"sl-b-bg","type":"text","title":"Background/Need-to-Know","content":"Sealer makes cement grout harder to stain. It does not waterproof the floor and it does not fix color. Skip this step entirely if your grout is epoxy or urethane, or if the bag says no sealer is needed. The mistake to avoid is letting sealer dry on the tile face, where it leaves a cloudy film.","width":"full","alignment":"left"},
    {"id":"sl-b-ins","type":"text","title":"Instructions","content":"1. Confirm the grout bag calls for a sealer before you buy one.\n2. Open windows or run a fan, and put on gloves.\n3. Apply sealer along the joints with the applicator bottle or a small brush, working a few square feet at a time.\n4. Wipe any sealer off the tile faces within a couple of minutes, before it dries.\n5. Let the first coat set for the time on the bottle, then add a second coat if the bottle calls for one.\n6. Keep off the floor for the dry time the bottle states.","width":"full","alignment":"left"},
    {"id":"sl-b-er","type":"text","title":"Error-Recovery","content":"If sealer dries cloudy on the tile, use the remover the sealer maker names for their product rather than scraping. If a joint still darkens when water sits on it after sealing, that joint got missed and can take another pass.","width":"full","alignment":"left"}
  ]'::jsonb),
  (v_step_sealer, 'intermediate', '[
    {"id":"sl-i-bg","type":"text","title":"Background/Need-to-Know","content":"A penetrating sealer soaks into the cement matrix and repels water and oil from inside the joint. Coverage is usually in the range of 250 to 500 sq ft per quart when you apply to joints only, so a bathroom floor takes far less product than the bottle suggests. Applying to the whole floor is faster but can dull polished tile, so check the tile data before flooding a face.","width":"full","alignment":"left"},
    {"id":"sl-i-ins","type":"text","title":"Instructions","content":"1. Verify sealer compatibility with both the grout and the tile, including whether the tile face tolerates it.\n2. Ventilate the room and wear gloves and eye protection for the whole application.\n3. Apply to joints in sections you can wipe within the dwell time on the label, typically a few minutes.\n4. Remove excess from tile faces with a clean cloth before it flashes off.\n5. Apply the second coat at the interval the label states, only if it calls for one.\n6. Test with a few drops of water on a joint after the cure time and confirm it beads rather than darkens.","width":"full","alignment":"left"},
    {"id":"sl-i-er","type":"text","title":"Error-Recovery","content":"If water still soaks in at the test, the joint did not take sealer, usually because it was damp or the product flashed off too fast, so clean and reapply on a dry joint. If the tile face shows streaks, strip with the manufacturer remover and reapply with a tighter wipe interval.","width":"full","alignment":"left"}
  ]'::jsonb),
  (v_step_sealer, 'advanced', '[
    {"id":"sl-a-bg","type":"text","title":"Background/Need-to-Know","content":"Penetrating silane and siloxane sealers are stain resistance, not a moisture barrier, and they do nothing for movement accommodation at perimeters. Color enhancing sealers on stone are a different specification from a cement grout sealer, and film forming products can change slip resistance, which matters on a bathroom floor. None of them substitute for a waterproofing membrane in a wet area.","width":"full","alignment":"left"},
    {"id":"sl-a-ins","type":"text","title":"Instructions","content":"1. Confirm the specification: product family, whether joints only or full surface, and the slip rating implication for the room.\n2. Verify substrate dryness and ambient temperature against the label window before opening the bottle.\n3. Apply at the published rate, holding to the dwell and wipe intervals section by section.\n4. Apply additional coats only per label, and only where absorption testing shows it is taken up.\n5. Validate with a water bead test on several joints after the stated cure.\n6. File the product data, batch numbers, and safety data sheet with the project record.","width":"full","alignment":"left"},
    {"id":"sl-a-er","type":"text","title":"Error-Recovery","content":"If absorption is inconsistent across the floor, the joints cured unevenly and the correct response is to re-dry and re-test rather than to add coats. If a film formed on the tile surface, strip per the chemical guide, neutralize if the guide calls for it, and reapply inside the temperature window.","width":"full","alignment":"left"}
  ]'::jsonb);

  RAISE NOTICE 'Tile Flooring Installation step 2 instructions applied for project %', v_project_id;
END
$migration$;
