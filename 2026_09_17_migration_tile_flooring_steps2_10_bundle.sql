-- Tile Flooring Installation: steps 2 through 10 plus the content audit, in one file.
--
-- Source files, applied in guide step order. Each block below is the migration of the same
-- name and is unchanged apart from its banner:
--   Step 2 - instructions            supabase/migrations/20260917110100_tile_flooring_step2_instructions.sql
--   Step 3 - step outputs            supabase/migrations/20260917110200_tile_flooring_step3_outputs.sql
--   Step 4 - project risk register   supabase/migrations/20260917110800_tile_flooring_step4_project_risks.sql
--   Step 5 - tools                   supabase/migrations/20260917110300_tile_flooring_step5_tools.sql
--   Step 6 - materials               supabase/migrations/20260917110400_tile_flooring_step6_materials.sql
--   Step 7 - process variables       supabase/migrations/20260917110500_tile_flooring_step7_process_variables.sql
--   Step 8 - time estimates          supabase/migrations/20260917110600_tile_flooring_step8_time_estimates.sql
--   Step 9 - PFMEA                   supabase/migrations/20260917110700_tile_flooring_step9_pfmea.sql
--   Step 10 - catalog copy           supabase/migrations/20260917110900_tile_flooring_step10_catalog_copy.sql
--   Content audit                    supabase/migrations/20260917111000_tile_flooring_content_audit.sql
--
-- Step 1 (structure) must already be applied. The preflight block stops the run with a named
-- error if the structure or the risk-engine schema this content targets is missing, so a
-- failure tells you what to apply first rather than aborting halfway through.
--
-- Run the whole file in one transaction. Every block re-resolves the project and verifies its
-- own row counts, so a mid-file failure rolls the entire run back to the pre-run state.

-- ===========================================================================================
-- Preflight
-- ===========================================================================================
DO $migration$
DECLARE
  v_project_id uuid;
  v_nroots integer;
  v_owned_n integer;
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

  SELECT count(*)::integer INTO v_owned_n
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL AND pp.source_project_id IS NULL;

  IF v_owned_n <> 17 THEN
    RAISE EXCEPTION 'Step 1 is not applied: expected 17 owned steps, found %.', v_owned_n;
  END IF;

  IF to_regclass('public.pfmea_requirements') IS NULL THEN
    RAISE EXCEPTION 'Table public.pfmea_requirements is missing. Apply the risk-engine schema migration before this file.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pfmea_failure_modes' AND column_name = 'requirement_id'
  ) THEN
    RAISE EXCEPTION 'pfmea_failure_modes.requirement_id is missing. Apply the risk-engine schema migration before this file.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pfmea_potential_causes' AND column_name = 'occurrence_driver'
  ) THEN
    RAISE EXCEPTION 'pfmea_potential_causes.occurrence_driver is missing. Apply the Key Characteristic classification migration before this file.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_risks' AND column_name = 'prevention_strength'
  ) THEN
    RAISE EXCEPTION 'project_risks.prevention_strength is missing. Apply the Key Characteristic classification migration before this file.';
  END IF;

  RAISE NOTICE 'Preflight passed for project % with % owned steps.', v_project_id, v_owned_n;
END
$migration$;


-- ===========================================================================================
-- Step 2 - instructions
-- Source: supabase/migrations/20260917110100_tile_flooring_step2_instructions.sql
-- ===========================================================================================
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


-- ===========================================================================================
-- Step 3 - step outputs
-- Source: supabase/migrations/20260917110200_tile_flooring_step3_outputs.sql
-- ===========================================================================================
-- Step 3 (outputs): Tile Flooring Installation - owned steps only.
--
-- The existing outputs carried a name and a one-line description, type 'none' on every row,
-- and no requirement, quality check, key inputs, effects, allowance, or reference. That left
-- three things broken downstream: Key Characteristics had no classification to read, PFMEA
-- requirements were named after the output instead of stating the requirement, and the
-- detection reality check in the risk engine flags any detection score whose output defines
-- nothing to catch the failure against.
--
-- Output ids are preserved so pfmea_requirements rows keep resolving. Names are restated as
-- the achieved physical state rather than an inspection verb, except on the step that is an
-- inspection.
--
-- Limits quoted here: ANSI A108.02 sections 4.2 (substrate), 4.3.7 and 4.4 (lippage), 4.3.8
-- (grout joint width and offset), ANSI A108.5 section 3.3.2 with the TCNA Handbook mortar
-- coverage guidance, ANSI A108.11 and panel prints for backer board, ANSI A118.12 and the
-- membrane print for uncoupling sheet.

DO $migration$
DECLARE
  v_project_id uuid;
  v_nroots integer;
  v_owned_n integer;
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

  -- ---------------------------------------------------------------------------
  -- Owned steps, scoped by the phase columns that define ownership rather than by operation
  -- name. The two Prepare subfloor operations were renamed to carry product names, so a name
  -- match there resolves nothing.
  -- ---------------------------------------------------------------------------
  DROP TABLE IF EXISTS owned_steps;
  CREATE TEMP TABLE owned_steps ON COMMIT DROP AS
  SELECT os.id AS step_id, lower(btrim(os.step_title)) AS step_key
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL AND pp.source_project_id IS NULL;

  SELECT count(*)::integer INTO v_owned_n FROM owned_steps;
  IF v_owned_n <> 17 THEN
    RAISE EXCEPTION 'Expected 17 owned steps, found %. Run the step 1 structure migration first.', v_owned_n;
  END IF;

  UPDATE public.operation_steps os
  SET outputs = v.outputs::jsonb, updated_at = now()
  FROM (VALUES

  -- ------------------------------------------------------------------ Prepare subfloor
  ('Clean and inspect subfloor', '[
    {"id":"out-m1a","name":"Subfloor clean and bondable","description":"Loose material, old adhesive, curing compound, paint, and sealer that block bond are gone across the full area that will receive mortar.","type":"performance-durability",
     "requirement":"The full area to be tiled is sound and free of bond breakers before any mortar is spread.",
     "qualityChecks":"Drag a putty knife across the field and find nothing that lifts. Wipe a hand over the floor and find no dust film. Flick water on concrete and watch it darken the surface rather than bead.",
     "keyInputs":["Existing floor finish and adhesive type","Scraping and vacuum method","Substrate material"],
     "potentialEffects":"Mortar bonds to the contaminant instead of the floor, so the tile releases later as hollow, cracking areas that can only be fixed by removing the finished floor.",
     "mustGetRight":"Any area that beads water or lifts under a blade is not ready for mortar.",
     "allowances":"Sound, well-bonded residue may remain where the mortar data sheet permits it.",
     "referenceSpecification":"ANSI A108.02 section 4.2 substrate preparation."},
    {"id":"out-m1b","name":"Flatness measured and documented","description":"The largest deviation under a straightedge is measured and written down against the limit for the tile size being installed.","type":"performance-durability",
     "requirement":"Substrate variation is no more than 1/4 in in 10 ft and 1/16 in in 1 ft for tile with all edges under 15 in, or 1/8 in in 10 ft and 1/16 in in 2 ft when any tile edge is 15 in or longer.",
     "qualityChecks":"Sweep a 10 ft straightedge over the field and both diagonals, then measure the largest gap with a tape or feeler gauge and record it by location.",
     "keyInputs":["Longest tile edge","Straightedge length","Subfloor construction and span"],
     "potentialEffects":"An out-of-plane substrate turns into lippage you feel through a sock and hollow spots that crack under furniture, neither of which can be corrected after the mortar cures.",
     "mustGetRight":"Large format tile is held to the tighter 1/8 in in 10 ft limit, so measure before the tile is ordered.",
     "allowances":"Low areas can be filled with an approved patch or self-leveler, which is a separate linked project rather than work in this one.",
     "referenceSpecification":"ANSI A108.02 sections 4.2.1 and 4.2.2."},
    {"id":"out-m1c","name":"Substrate type and moisture recorded","description":"Substrate category and any moisture test the mortar or membrane data sheet requires are captured with date and reading.","type":"none",
     "requirement":"Substrate category and the moisture result required by the product data are recorded before underlayment work starts.",
     "qualityChecks":"Write down substrate type and the test result the data sheet asks for, including reading and date, and keep it with the project record.",
     "keyInputs":["Substrate material","Product data sheet requirements","Age of slab or panel"],
     "potentialEffects":"Without a reading there is no way to tell whether a later bond failure came from moisture, and no warranty claim to make.",
     "mustGetRight":"Concrete that has never been tested is an unknown, not a pass.",
     "allowances":"Wood subfloors with no moisture requirement in the data sheet need only the substrate type recorded.",
     "referenceSpecification":"Mortar and membrane product data sheets for moisture limits."}
  ]'),

  ('Spread mortar for membrane', '[
    {"id":"out-m2a","name":"Mortar mixed to data sheet ratio","description":"Liquid to powder ratio, mixing time, and slake are as printed, with no dry clumps and no water added after slaking.","type":"performance-durability",
     "requirement":"Mortar is mixed at the published ratio, slaked for the published time, and remixed without added liquid before use.",
     "qualityChecks":"Pull the paddle out and watch the mortar hold a ridge that relaxes slowly rather than slumping. A ridge that collapses means too much liquid and one that crumbles means too little.",
     "keyInputs":["Liquid to powder ratio","Mix time and slake time","Water temperature","Mortar class named by the membrane"],
     "potentialEffects":"An over-wet mix loses strength and shrinks away from the fleece, and an under-wet mix will not transfer into it, which is a bond failure under the whole floor.",
     "mustGetRight":"Only the mortar class the membrane maker names belongs under the sheet.",
     "allowances":"Batch size may be reduced to stay inside open time in hot or dry conditions.",
     "referenceSpecification":"Membrane product data sheet and the ANSI A118 mortar class it specifies."},
    {"id":"out-m2b","name":"Combed mortar wet and ready","description":"Ridge pattern is at the specified notch, full height, and still wet when the sheet goes down.","type":"performance-durability",
     "requirement":"Mortar is combed at the notch size the membrane print specifies over no more area than can be embedded inside the published open time.",
     "qualityChecks":"Touch the ridges before laying the sheet. A fingertip should come away wet and the ridge should hold its shape. Dull or crusted mortar is past its open time.",
     "keyInputs":["Trowel notch size","Area combed per batch","Room temperature and airflow"],
     "potentialEffects":"Mortar that skins before embedding leaves the fleece dry in patches, which reads as a drummy floor and tile that lifts in sheets.",
     "mustGetRight":"Comb only what can be covered in a few minutes at the current room temperature.",
     "allowances":"Ridge direction may follow either axis unless the print names one.",
     "referenceSpecification":"Membrane print notch and open time, ANSI A118.12 system requirements."}
  ]'),

  ('Embed membrane and detail seams', '[
    {"id":"out-m3a","name":"Membrane fully embedded","description":"Mortar transfer into the fleece is continuous with no hollow pockets anywhere in the field.","type":"performance-durability",
     "requirement":"The sheet is embedded so mortar transfer into the fleece is continuous across the field with no voids.",
     "qualityChecks":"Lift a corner in a test area and look for mortar carried into the fleece rather than smooth fleece. Tap across the field and listen for a change to a hollow sound.",
     "keyInputs":["Float or roller pressure","Mortar open time","Substrate flatness","Sheet handling and relaxation"],
     "potentialEffects":"Unembedded areas leave the tile above them unsupported, so tiles crack under load and the repair means removing finished floor.",
     "mustGetRight":"Any area that sounds hollow gets pulled and re-embedded before tile, not patched from the top.",
     "allowances":"Partially collapsed ridges under 0.25 in are not voids.",
     "referenceSpecification":"ANSI A118.12 and the membrane installation print."},
    {"id":"out-m3b","name":"Seams and details finished","description":"Overlaps, seam bands, corners, and penetrations match the printed detail for the system.","type":"performance-durability",
     "requirement":"Seam overlap or band width and all corner and penetration details match the membrane print.",
     "qualityChecks":"Measure overlap width at several seams against the print and confirm corners use the preformed or two-piece detail rather than a forced fold.",
     "keyInputs":["Overlap or band width","Corner and penetration detail parts","Sheet orientation and stagger"],
     "potentialEffects":"An open seam becomes a crack path and, in a wet area, a moisture path into the subfloor.",
     "mustGetRight":"Inside corners use the detail the print shows, because a folded sheet will not stay embedded.",
     "allowances":"End joints may be staggered in either direction as long as overlap width holds.",
     "referenceSpecification":"Membrane installation print, ANSI A118.12."}
  ]'),

  ('Cut and fit backer panels', '[
    {"id":"out-b1a","name":"Panels cut and dry-laid to plan","description":"Panels are cut and staged so the layout avoids slivers at the entry and staggers joints away from subfloor joints.","type":"none",
     "requirement":"Panels are dry-laid full sheets first, with cut pieces filling the remainder and no panel strip narrower than about 2 in at a doorway.",
     "qualityChecks":"Walk the dry-laid floor before fastening and confirm panel joints do not stack over subfloor joints and no narrow strip lands at the entry.",
     "keyInputs":["Room dimensions","Subfloor joint locations","Panel size"],
     "potentialEffects":"Narrow strips and stacked joints crack and telegraph through tile, which shows as a straight crack line across finished floor.",
     "mustGetRight":"Panel joints must not line up with subfloor sheet joints.",
     "allowances":"Cut pieces may be used anywhere the strip is wide enough to carry two rows of fasteners.",
     "referenceSpecification":"Backer panel installation print, ANSI A108.11."},
    {"id":"out-b1b","name":"Edge and field gaps set","description":"Gaps between panels and at walls, cabinets, and fixtures are at the spacing the panel print requires.","type":"performance-durability",
     "requirement":"Panel to panel and panel to wall gaps match the panel print, commonly about 1/8 in unless the print states otherwise.",
     "qualityChecks":"Run a spacer of the required thickness along the joints and perimeter before fastening and confirm it slides without forcing.",
     "keyInputs":["Panel print gap requirement","Perimeter obstructions","Panel expansion behavior"],
     "potentialEffects":"Panels butted tight buckle at the joints as the building moves, which lifts and cracks the tile above them.",
     "mustGetRight":"Tight panel joints cannot be corrected once the panels are fastened and taped.",
     "allowances":"Gap may run to the wider end of the printed range at the perimeter where trim will cover it.",
     "referenceSpecification":"Backer panel installation print, ANSI A108.11."}
  ]'),

  ('Fasten backer to subfloor', '[
    {"id":"out-b2a","name":"Fastener grid complete","description":"Corrosion-resistant fasteners are driven on the printed grid with correct edge distance and heads set flush.","type":"performance-durability",
     "requirement":"Fastener type, spacing, and edge distance match the panel print, with heads flush to the panel face and not broken through the mesh.",
     "qualityChecks":"Count fasteners in one panel against the print, then run a hand across the panel and feel for any proud head.",
     "keyInputs":["Fastener type and length","Printed spacing and edge distance","Bond coat under the panel where required","Driver torque setting"],
     "potentialEffects":"A short fastener count leaves the panel free to move, which cracks grout and tile along the loose area.",
     "mustGetRight":"Heads that sit proud telegraph through thin tile and heads driven through the mesh hold nothing.",
     "allowances":"Extra fasteners may be added beside a stripped hole.",
     "referenceSpecification":"Backer panel installation print, ANSI A108.11."},
    {"id":"out-b2b","name":"Panel plane ready for tile","description":"The fastened field is flat within the tile flatness limit with no shoulders at panel joints.","type":"performance-durability",
     "requirement":"The fastened panel surface meets the same flatness limit as the substrate for the tile size being installed.",
     "qualityChecks":"Straightedge across panel joints and the field and confirm no gap exceeds the limit for this tile size.",
     "keyInputs":["Subfloor flatness","Bond coat thickness","Fastener seating"],
     "potentialEffects":"A shoulder at a panel joint prints straight through thin tile as a line of lippage that cannot be corrected later.",
     "mustGetRight":"Fix shoulders with a rasp or mortar now, because tile will not bridge them.",
     "allowances":"Minor divots may be filled with the same mortar used to embed seams.",
     "referenceSpecification":"ANSI A108.02 sections 4.2.1 and 4.2.2 applied to the finished underlayment."}
  ]'),

  ('Tape or mesh seams and embed', '[
    {"id":"out-b3a","name":"Seams reinforced and embedded","description":"Alkali-resistant tape is centered on every panel joint and fully embedded in mortar with no blisters.","type":"performance-durability",
     "requirement":"Every panel joint carries alkali-resistant tape centered on the joint and fully embedded in polymer-modified mortar.",
     "qualityChecks":"Look for mortar worked through the mesh with no dry tape edges, and press along each seam to confirm nothing lifts.",
     "keyInputs":["Tape type","Mortar class","Embedment technique","Joint width"],
     "potentialEffects":"An unreinforced or blistered seam reflects movement straight into the tile and grout as a crack that follows the panel joint.",
     "mustGetRight":"Drywall paper tape is not a substitute for alkali-resistant tape.",
     "allowances":"Mesh may be used in place of tape where the panel print allows it.",
     "referenceSpecification":"Backer panel print, ANSI A108.11."},
    {"id":"out-b3b","name":"Seam plane flush with panel face","description":"Embedded seams are skimmed flat so no shoulder stands above the panel face.","type":"performance-durability",
     "requirement":"Embedded seams are feathered flush, with no shoulder that would show as lippage under thin tile.",
     "qualityChecks":"Straightedge across each seam and confirm the blade contacts the panel on both sides without rocking.",
     "keyInputs":["Skim thickness","Feather width","Mortar consistency"],
     "potentialEffects":"A proud seam becomes a visible ridge in the finished floor and a high line of lippage through every tile that crosses it.",
     "mustGetRight":"Feather wide rather than building a hump over the joint.",
     "allowances":"Slight texture is acceptable as long as the plane holds.",
     "referenceSpecification":"Backer panel print, ANSI A108.02 flatness limits."}
  ]'),

  -- ------------------------------------------------------------------ Install
  ('Layout and reference lines', '[
    {"id":"out-i1a","name":"Layout plan recorded","description":"Start line, joint width, pattern offset, and the cut sizes at each wall are decided and written down.","type":"none",
     "requirement":"Cut tiles at the walls that are seen first are as wide as the layout allows, joint width is chosen, and any running bond offset for tile over 15 in is held to 33 percent or less.",
     "qualityChecks":"Dry-lay a full row with spacers along the longest sightline and measure the cut at both ends before committing to a start line.",
     "keyInputs":["Room dimensions and squareness","Tile size and pattern","Chosen joint width","Door and cabinet locations"],
     "potentialEffects":"A start line chosen by habit puts a sliver at the doorway, which is the first thing anyone sees and cannot be fixed without lifting the floor.",
     "mustGetRight":"Offsets above 33 percent on tile longer than 15 in invite lippage from tile crown, so the pattern decision belongs here.",
     "allowances":"Cuts may be unbalanced toward a wall that will be hidden by a vanity or an appliance.",
     "referenceSpecification":"ANSI A108.02 sections 4.3.8.1 and 4.3.8.2."},
    {"id":"out-i1b","name":"Square reference lines snapped","description":"Baselines are square to each other and parallel to the primary sightline, marked so they stay readable while mortar is open.","type":"major-aesthetics",
     "requirement":"Reference lines are square within 1/8 in over 10 ft and parallel to the wall the room is read from.",
     "qualityChecks":"Verify with a 3-4-5 triangle or a laser square, then measure both diagonals of the gridded area and compare them.",
     "keyInputs":["Wall straightness","Measurement method","Chalk or laser reference"],
     "potentialEffects":"An out-of-square baseline grows a taper across the room, so joints widen row by row and the far wall needs wedge-shaped cuts.",
     "mustGetRight":"Check square before the first tile, because the error compounds with every row.",
     "allowances":"Taper may be shifted into a low-visibility area when a wall is out of square.",
     "referenceSpecification":"ANSI A108.02 workmanship requirements for alignment."}
  ]'),

  ('Cut tiles to layout', '[
    {"id":"out-i2a","name":"Cuts dry-fit to their locations","description":"Border, jamb, and penetration pieces are fitted in place before any mortar is spread.","type":"none",
     "requirement":"Every cut piece sits in its location at the planned joint width without being forced.",
     "qualityChecks":"Place each cut piece dry with spacers in position and confirm the joint width matches the field before mortar goes down.",
     "keyInputs":["Measurement transfer from the floor","Cut sequence","Tile hardness and body"],
     "potentialEffects":"Discovering a short cut with mortar already combed means either a forced joint or mortar that skins over while you recut.",
     "mustGetRight":"Cut slightly shy on inside corners and pare to fit rather than cutting to the exact measurement.",
     "allowances":"Pieces hidden under trim or a base may vary from the field joint width.",
     "referenceSpecification":"ANSI A108.02 workmanship requirements for cut tile fit."},
    {"id":"out-i2b","name":"Cut edges clean in show areas","description":"Exposed cut edges are free of chips larger than the grout joint covers and free of cracks through the tile body.","type":"major-aesthetics",
     "requirement":"Chips on exposed cut edges are smaller than the grout joint will cover and no cut piece carries a crack through the body.",
     "qualityChecks":"Run a finger along each cut edge and inspect under raking light. Compare chip size to the joint width you are using.",
     "keyInputs":["Blade condition and type","Feed rate at the exit of the cut","Water flow at the blade","Tile support during the cut"],
     "potentialEffects":"Chipped show edges read as amateur work from standing height and cannot be hidden once grout is in.",
     "mustGetRight":"Slow the feed for the last inch of a cut, which is where exit chipping happens.",
     "allowances":"Chips under 1/16 in on edges that will be covered by base, trim, or a fixture flange are acceptable.",
     "referenceSpecification":"ANSI A108.02 workmanship, tile manufacturer cutting guidance."}
  ]'),

  ('Spread mortar and verify coverage', '[
    {"id":"out-i3a","name":"Mortar mixed and slaked to spec","description":"Mortar is mixed at the published ratio, slaked, and remixed with no added liquid, and used inside its pot life.","type":"performance-durability",
     "requirement":"Mortar is mixed at the data sheet ratio and used within the published pot life with no liquid added after slaking.",
     "qualityChecks":"Ridges combed from the batch stand up and hold shape. Note the mix time and stop using the batch at the end of its pot life rather than retempering it.",
     "keyInputs":["Liquid to powder ratio","Slake and remix time","Batch size against working speed","Room temperature"],
     "potentialEffects":"Retempered or over-wet mortar loses compressive strength and shrinks, which produces hollow tile and cracked grout months later.",
     "mustGetRight":"Water added to loosen a stiffening batch destroys the mix, so discard it instead.",
     "allowances":"Batch size may be cut to match a slower working pace.",
     "referenceSpecification":"Mortar data sheet, ANSI A118.4 or A118.15 class as specified for the tile size."},
    {"id":"out-i3b","name":"Mortar contact area proven","description":"Lifted sample tiles show contact area at or above the limit for the room type with supported corners and edges.","type":"performance-durability",
     "requirement":"Average mortar contact is at least 80 percent on interior dry floors and at least 95 percent in wet areas, at least 85 percent within any single square foot, with no void larger than 2 square inches and full support at corners and edges.",
     "qualityChecks":"Lift one tile per 50 to 100 sq ft, including one at a perimeter, photograph the back, and judge contact against the limit for this room.",
     "keyInputs":["Trowel notch size for the tile size","Trowel angle","Mortar consistency","Substrate flatness","Back-buttering on large tile"],
     "potentialEffects":"Voids under tile become hollow, squeaky areas that crack under point loads, and in wet areas they hold water that pushes grout out and debonds tile.",
     "mustGetRight":"Coverage is only knowable by lifting tile, so the first tiles of every session get checked.",
     "allowances":"Partially collapsed ridges with length and width under 0.25 in are not counted as voids.",
     "referenceSpecification":"ANSI A108.5 section 3.3.2 and TCNA Handbook mortar coverage guidance."}
  ]'),

  ('Set tile, beat-in, and check plane', '[
    {"id":"out-i4a","name":"Tile set to layout and joint width","description":"Tiles follow the reference lines at a uniform joint width, with pattern and directional grain honored.","type":"major-aesthetics",
     "requirement":"Joint width is uniform at the planned size and never below 1/16 in, and for running bond with any side over 15 in it averages at least 1/8 in for rectified tile or 3/16 in for calibrated tile, increased by the measured edge warpage.",
     "qualityChecks":"Measure several joints at the start line, mid-field, and the far wall with a tape, and sight down the joint lines from a low angle for waver.",
     "keyInputs":["Spacer or clip size","Tile facial size variation","Reference line accuracy","Pattern and offset"],
     "potentialEffects":"Joints that drift wider across the room draw the eye to every row, and joints below the minimum leave no room for tile size variation or movement.",
     "mustGetRight":"Joint width has to absorb the actual variation in the tile lot, so measure tiles from several boxes before locking the spacer size.",
     "allowances":"Joint width may be increased over the minimum by the measured edge warpage of the lot.",
     "referenceSpecification":"ANSI A108.02 sections 4.3.8, 4.3.8.1, and 4.3.8.2."},
    {"id":"out-i4b","name":"Lippage within tolerance","description":"Height differences between adjacent tile edges are inside the allowance for the joint width in use.","type":"major-aesthetics",
     "requirement":"Lippage is no more than 1/32 in plus the actual tile warpage for joints from 1/16 in up to 1/4 in, or 1/16 in plus actual warpage for joints 1/4 in and wider. Gauged porcelain panels are held to 1/32 in with no warpage allowance.",
     "qualityChecks":"Lay a 4 ft straightedge across every few tiles and rock it for gaps, then run a bare hand over the joints and feel for an edge that catches a fingertip.",
     "keyInputs":["Substrate flatness","Mortar consistency and thickness","Beating technique","Tile warpage","Leveling clip use on large format"],
     "potentialEffects":"Lippage is felt through socks, catches a mop, and on a large format floor is the defect that most often leads to tearing out finished work.",
     "mustGetRight":"Correct a high or low tile while the mortar is still plastic, because after cure the fix is replacement.",
     "allowances":"Actual measured warpage of the tile lot is added to the table limit.",
     "referenceSpecification":"ANSI A108.02 sections 4.3.7 and 4.4 lippage tables."}
  ]'),

  ('Inspect set tile before cure', '[
    {"id":"out-qc1a","name":"Field inside flatness and lippage limits","description":"Straightedge and hand checks across the set field find nothing outside the lippage and flatness limits for this tile and joint width.","type":"major-aesthetics",
     "requirement":"The set field meets the lippage limit for the joint width in use and shows no deviation beyond the flatness limit for the tile size.",
     "qualityChecks":"Straightedge both diagonals and each wall line, then hand-check tile edges for a catch. Mark every failure by location rather than from memory.",
     "keyInputs":["Straightedge length","Joint width","Tile warpage","Remaining mortar open time"],
     "potentialEffects":"A defect found after cure costs tile, mortar, and a day of demolition, and often cannot be made invisible even after replacement.",
     "mustGetRight":"This check only has value while the mortar is still workable, so it happens before the cure wait starts, not after.",
     "allowances":"Measured tile warpage is added to the table lippage limit.",
     "referenceSpecification":"ANSI A108.02 sections 4.2, 4.3.7, and 4.4."},
    {"id":"out-qc1b","name":"Coverage evidence captured","description":"Photographs of lifted sample tiles and the coverage judgment are recorded for the project file.","type":"none",
     "requirement":"Coverage sampling is documented with photographs and locations for the areas checked.",
     "qualityChecks":"Confirm the file holds at least one lifted-tile photo per sampled area, including one perimeter tile.",
     "keyInputs":["Sampling frequency","Photo quality and lighting","Area map"],
     "potentialEffects":"Without evidence there is no way to support a warranty claim or to learn which session produced a bond problem.",
     "mustGetRight":"Photograph the tile back before resetting it, because the evidence disappears the moment it goes back down.",
     "allowances":"One photo per sampled area is enough when it shows the full tile back.",
     "referenceSpecification":"ANSI A108.5 section 3.3.2 sampling method."},
    {"id":"out-qc1c","name":"Corrections completed while plastic","description":"Every tile that failed the checks was lifted, re-bedded, and re-checked before the mortar set.","type":"performance-durability",
     "requirement":"All failures found in this inspection are corrected and re-verified inside the mortar open window.",
     "qualityChecks":"Re-run the straightedge and hand check over each corrected area and confirm the corrected tiles now match their neighbors.",
     "keyInputs":["Mortar open time","Room temperature","Number of failures found"],
     "potentialEffects":"A failure left for later becomes a permanent defect, because moving a tile after initial set breaks the bond without fixing the plane.",
     "mustGetRight":"Correct the doorway and perimeter tiles first, since those are the ones people see and feel.",
     "allowances":"A failure that cannot be reached inside the window is marked for replacement rather than forced.",
     "referenceSpecification":"Mortar data sheet open time and adjustment window."}
  ]'),

  -- ------------------------------------------------------------------ Grout & Finish
  ('Cure thinset before grouting', '[
    {"id":"out-ct1a","name":"Mortar at grout-ready strength","description":"Elapsed cure meets the mortar data sheet minimum and the floor shows no tile movement or hollow sound.","type":"performance-durability",
     "requirement":"Elapsed time since the last tile was set is at or above the cure-before-grout figure on the mortar data sheet for the conditions in the room, commonly 24 hours at 70 F.",
     "qualityChecks":"Compare logged elapsed hours to the data sheet figure, tap across the field for hollow spots, and press each perimeter tile by hand to confirm nothing moves.",
     "keyInputs":["Set completion time","Mortar class","Room temperature and humidity","Tile and substrate porosity"],
     "potentialEffects":"Grouting on soft mortar drags tiles out of plane and locks the movement in place, which shows up as lippage and cracked joints after everything has hardened.",
     "mustGetRight":"Cool or damp rooms and impervious tile extend the wait, so the clock starts from conditions rather than from the calendar.",
     "allowances":"Rapid-setting mortars carry their own shorter window and may allow grout in a few hours when the data sheet says so.",
     "referenceSpecification":"Mortar product data sheet cure-before-grout requirement."}
  ]'),

  ('Prepare joints for grout', '[
    {"id":"out-g1a","name":"Joints clear to full depth","description":"Spacers are out and hardened mortar is cut back so grout can fill the joint to depth.","type":"performance-durability",
     "requirement":"Joints are clear of mortar to at least two thirds of the tile thickness unless the grout data sheet states another depth, with all interfering spacers removed.",
     "qualityChecks":"Probe several joints with a joint tool and confirm nothing stops the tool short, then vacuum and re-check under light.",
     "keyInputs":["Mortar squeeze-out during setting","Spacer type","Joint width","Tile body hardness"],
     "potentialEffects":"Grout over a mortar ridge is only a thin skin, so it cracks out in traffic and leaves a dark line where the bed shows through.",
     "mustGetRight":"Cut mortar back with a tool the tile body can survive, since a carbide blade will scratch some glazes.",
     "allowances":"Leave-in-place spacers may stay where the manufacturer designed them to be grouted over.",
     "referenceSpecification":"Grout data sheet joint depth requirement, ANSI A108.10."},
    {"id":"out-g1b","name":"Joint surfaces dry and dust free","description":"Joints are vacuumed and free of standing water or dust film before grout goes in.","type":"performance-durability",
     "requirement":"Joints are free of dust and standing water when grout is packed.",
     "qualityChecks":"Wipe a finger along a joint and find no dust transfer, and confirm no puddles remain in the joints or at the perimeter.",
     "keyInputs":["Vacuum coverage","Cutting dust from joint prep","Water used during cleanup"],
     "potentialEffects":"Dust acts as a bond breaker under grout and standing water dilutes the mix at the joint surface, producing pale, crumbling lines.",
     "mustGetRight":"Vacuum after cutting mortar back, not before.",
     "allowances":"Damp joints are acceptable where the grout data sheet calls for a pre-wet joint.",
     "referenceSpecification":"Grout data sheet surface preparation, ANSI A108.10."}
  ]'),

  ('Pack grout and initial clean', '[
    {"id":"out-g2a","name":"Joints filled full with no voids","description":"Grout is packed to full depth along every joint with no continuous voids at the joint bottom and no pinholes.","type":"performance-durability",
     "requirement":"Every joint is filled to the depth the grout data sheet requires with no continuous voids and no pinholes at the surface.",
     "qualityChecks":"Probe a sample of joints before the wash and look along each joint under low-angle light for pinholes or sunken sections.",
     "keyInputs":["Grout type for the joint width","Mix consistency","Float angle and pass direction","Joint depth from prep"],
     "potentialEffects":"A partly filled joint cracks and crumbles under traffic, and in a wet area it becomes a direct water path to the substrate.",
     "mustGetRight":"Pack diagonally across the joints so the float fills rather than plows them.",
     "allowances":"Joints may be refilled while the batch is still workable.",
     "referenceSpecification":"Grout data sheet, ANSI A108.10 installation of grout."},
    {"id":"out-g2b","name":"Bulk residue off the faces","description":"The heavy grout residue is removed in the same pass while joints are still tooled.","type":"major-aesthetics",
     "requirement":"Bulk residue is struck off and the first sponge pass is done inside the grout data sheet cleanup window.",
     "qualityChecks":"Check that faces carry only a light film and joints still read as uniform depth after the first pass.",
     "keyInputs":["Time since packing","Sponge wetness","Rinse water cleanliness","Room temperature"],
     "potentialEffects":"Grout left to harden on the face becomes a scrubbing and chemical job that can etch grout and dull some tile.",
     "mustGetRight":"Keep the sponge nearly dry, because excess water washes cement out of the joints and leaves them pale.",
     "allowances":"A light haze may remain for the dry buff in the next step.",
     "referenceSpecification":"Grout data sheet cleanup window."}
  ]'),

  ('Wash haze and tool joints', '[
    {"id":"out-g3a","name":"Faces clean and joints uniform","description":"Tile faces are free of haze and every joint has the same depth and profile across the floor.","type":"major-aesthetics",
     "requirement":"No grout film remains on the tile faces under raking light and joints read as one consistent profile and depth.",
     "qualityChecks":"Inspect under a low-angle light from two directions, then wipe a dry microfiber across the faces and check it for pickup.",
     "keyInputs":["Time since packing","Water volume at the wash","Rinse water changes","Tooling pass consistency"],
     "potentialEffects":"Haze reads as a dull cast over the whole floor and uneven joint depth makes a good tile job look unfinished.",
     "mustGetRight":"Color uniformity comes from consistent water use, so change rinse water on a schedule rather than when it looks dirty.",
     "allowances":"Slight texture variation is acceptable as long as depth and profile match.",
     "referenceSpecification":"Grout data sheet cleaning procedure, ANSI A108.10."}
  ]'),

  ('Cure grout before sealing', '[
    {"id":"out-cg1a","name":"Grout dry through joint depth","description":"Grout has cured for the published window and shows no residual moisture at the joints.","type":"performance-durability",
     "requirement":"Elapsed time since the wash meets the grout data sheet cure-before-sealer window, commonly 48 to 72 hours for cement grout, and the joints test dry.",
     "qualityChecks":"Tape a clear plastic square to the floor for several hours and look for condensation or darkening, and compare logged hours to the data sheet.",
     "keyInputs":["Wash completion time","Grout chemistry","Room temperature and humidity","Wet service in the room"],
     "potentialEffects":"Sealer on damp grout sits on the surface instead of soaking in, which traps moisture and leaves a patchy finish that has to be stripped.",
     "mustGetRight":"Keep the floor dry for the whole window, including no mopping and no shower use in the room.",
     "allowances":"Light foot traffic is allowed earlier when the grout data sheet permits it.",
     "referenceSpecification":"Grout data sheet cure-before-sealer requirement."}
  ]'),

  ('Apply grout sealer', '[
    {"id":"out-sl1a","name":"Grout joints repel water","description":"Sealer is absorbed into the joints at the published rate so water beads rather than darkening the grout.","type":"performance-durability",
     "requirement":"Sealer is applied only where the grout data sheet calls for it, at the published coverage rate and coat count, and cured for the stated time.",
     "qualityChecks":"After the stated cure, place a few drops of water on several joints and confirm they bead rather than soaking in and darkening.",
     "keyInputs":["Grout chemistry and whether sealer is specified","Joint dryness","Coverage rate","Dwell and wipe interval","Coat count"],
     "potentialEffects":"An unsealed or poorly absorbed cement joint stains from the first spill and cleaning it aggressively erodes the grout.",
     "mustGetRight":"Epoxy and urethane grouts generally need no sealer, so confirm the product before buying one.",
     "allowances":"Additional coats only where absorption testing shows the joint takes them.",
     "referenceSpecification":"Sealer product data sheet and grout data sheet sealer requirement."},
    {"id":"out-sl1b","name":"Tile faces free of sealer film","description":"Sealer is wiped from the tile faces inside the dwell window so no cloudy film dries on the surface.","type":"major-aesthetics",
     "requirement":"Tile faces carry no dried sealer residue and the finish and slip character of the tile is unchanged.",
     "qualityChecks":"Inspect faces under raking light after cure for streaks or cloudiness, and check a discreet area for a change in sheen.",
     "keyInputs":["Dwell time before wiping","Section size per application","Cloth cleanliness","Sealer type"],
     "potentialEffects":"Dried sealer film is cloudy, uneven, and can only be removed with the manufacturer stripper, which risks the grout you just sealed.",
     "mustGetRight":"Work in sections small enough to wipe inside the dwell time printed on the bottle.",
     "allowances":"Full-surface application is acceptable only where the tile data sheet allows it.",
     "referenceSpecification":"Sealer product data sheet dwell and removal instructions."}
  ]')

  ) AS v(step_title, outputs)
  WHERE os.id IN (SELECT step_id FROM owned_steps)
    AND lower(btrim(os.step_title)) = lower(btrim(v.step_title));

  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases_internal(v_project_id),
      updated_at = now()
  WHERE id = v_project_id;

  RAISE NOTICE 'Tile Flooring Installation step 3 outputs applied for project %', v_project_id;
END
$migration$;


-- ===========================================================================================
-- Step 4 - project risk register
-- Source: supabase/migrations/20260917110800_tile_flooring_step4_project_risks.sql
-- ===========================================================================================
-- Step 4 (project risks): Tile Flooring Installation register - safety, schedule, and budget.
--
-- Two gaps. The five existing register risks predate the shared risk model, so they carry no
-- component, no scores, and none of the Key Characteristic classifications, which leaves them
-- unscored in the Risk Radar rather than prioritized. And the register had no safety component
-- at all, on a project whose real hazards are silica dust, a wet saw, caustic cement, and a full
-- day at floor level.
--
-- Quality stays in the PFMEA (see cross-cutting risks-vs-pfmea). Nothing here duplicates a
-- failure mode; the schedule and budget rows are about the consequences that land on the
-- calendar and the receipt, not on the floor.
--
-- Existing rows are updated by their authored ids rather than deleted, so foundation-copied or
-- user-added rows in this register are untouched.

DO $migration$
DECLARE
  v_project_id uuid;
  v_nroots integer;
  v_step_clean uuid;
  v_step_cut uuid;
  v_step_spread uuid;
  v_step_set uuid;
  v_step_layout uuid;
  v_step_cure uuid;
  v_step_grout uuid;
  v_count integer;
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

  -- Owned steps the register rows point at.
  DROP TABLE IF EXISTS owned_steps;
  CREATE TEMP TABLE owned_steps ON COMMIT DROP AS
  SELECT os.id AS step_id, lower(btrim(os.step_title)) AS step_key
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL AND pp.source_project_id IS NULL;

  SELECT step_id INTO v_step_clean FROM owned_steps WHERE step_key = 'clean and inspect subfloor';
  SELECT step_id INTO v_step_cut FROM owned_steps WHERE step_key = 'cut tiles to layout';
  SELECT step_id INTO v_step_spread FROM owned_steps WHERE step_key = 'spread mortar and verify coverage';
  SELECT step_id INTO v_step_set FROM owned_steps WHERE step_key = 'set tile, beat-in, and check plane';
  SELECT step_id INTO v_step_layout FROM owned_steps WHERE step_key = 'layout and reference lines';
  SELECT step_id INTO v_step_cure FROM owned_steps WHERE step_key = 'cure thinset before grouting';
  SELECT step_id INTO v_step_grout FROM owned_steps WHERE step_key = 'pack grout and initial clean';

  IF v_step_clean IS NULL OR v_step_cut IS NULL OR v_step_spread IS NULL OR v_step_set IS NULL
     OR v_step_layout IS NULL OR v_step_cure IS NULL OR v_step_grout IS NULL THEN
    RAISE EXCEPTION 'Register risks could not resolve every step they point at.';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Classify the five existing rows. Scores are on the shared 1-10 scales, detection inverted.
  -- ---------------------------------------------------------------------------
  UPDATE public.project_risks r
  SET
    risk_dimension = v.dimension,
    severity_score = v.severity_score,
    occurrence_score = v.occurrence_score,
    detection_score = v.detection_score,
    occurrence_driver = v.driver,
    prevention_strength = v.prevention,
    operation_step_id = v.step_id,
    implicated_item_kind = v.item_kind::public.risk_item_kind,
    implicated_item_id = v.item_id,
    mitigation_effort_level = v.effort,
    updated_at = now()
  FROM (VALUES
    -- Discovering the substrate needs work is a calendar event: it inserts a linked project.
    ('373adcbf-0a8c-42e9-9bcb-a4b400000001'::uuid, 'schedule', 7, 6, 3,
     'environment', 'procedural', v_step_clean, 'process_variable', 'pv-m1-flat', 'medium'),
    -- Buying the wrong underlayment is money, and it is decided by what was recorded in step 1.
    ('373adcbf-0a8c-42e9-9bcb-a4b400000002'::uuid, 'budget', 5, 4, 4,
     'experience', 'procedural', v_step_clean, 'output', 'out-m1c', 'low'),
    -- Resetting fresh tile is lost hours and lost mortar, driven by how big an area gets combed.
    ('373adcbf-0a8c-42e9-9bcb-a4b400000003'::uuid, 'schedule', 6, 5, 3,
     'process_design', 'procedural', v_step_spread, 'process_variable', 'pv-i3-open', 'low'),
    ('373adcbf-0a8c-42e9-9bcb-a4b400000004'::uuid, 'schedule', 6, 5, 4,
     'experience', 'procedural', v_step_cure, 'process_variable', 'pv-ct-hours', 'low'),
    -- Linked work that was assumed in scope. Project-wide, so it names no step or item.
    ('373adcbf-0a8c-42e9-9bcb-a4b400000005'::uuid, 'schedule', 6, 7, 5,
     'process_design', 'procedural', NULL::uuid, NULL, NULL, 'medium')
  ) AS v(id, dimension, severity_score, occurrence_score, detection_score,
         driver, prevention, step_id, item_kind, item_id, effort)
  WHERE r.id = v.id AND r.project_id = v_project_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 5 THEN
    RAISE EXCEPTION 'Expected to classify 5 existing register risks, updated %.', v_count;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Safety, plus the schedule and budget exposure the register was missing.
  --
  -- Safety rows carry no schedule or budget number. An injury is not a line item, and putting a
  -- dollar figure on it would be inventing data to fill a column.
  -- ---------------------------------------------------------------------------
  INSERT INTO public.project_risks (
    id, project_id, display_order,
    risk_title, risk_description,
    likelihood, severity,
    risk_dimension, severity_score, occurrence_score, detection_score,
    occurrence_driver, prevention_strength,
    operation_step_id, implicated_item_kind, implicated_item_id,
    schedule_impact_low_days, schedule_impact_high_days,
    budget_impact_low, budget_impact_high,
    mitigation_strategy, mitigation_actions, mitigation_effort_level,
    recommendation, benefit
  ) VALUES
  (
    '373adcbf-0a8c-42e9-9bcb-a4b400000006'::uuid, v_project_id, 6,
    'Silica dust from dry cutting tile and cement board',
    'Dry cutting porcelain, stone, or cement panel releases respirable crystalline silica. The exposure is invisible, causes no symptoms on the day, and is cumulative.',
    'medium', 'high',
    'safety', 8, 5, 6,
    'process_design', 'procedural',
    v_step_cut, 'tool', 'tl-i2-resp',
    NULL, NULL, NULL, NULL,
    'Cut wet wherever the cut allows it, score and snap cement panel rather than grinding it, and wear P100 protection for any dry cut or grind.',
    jsonb_build_array(
      jsonb_build_object('action','Plan cuts so the wet saw handles them and the grinder is the exception','benefit','Removes the exposure instead of filtering it','completed',false),
      jsonb_build_object('action','Score and snap cement board rather than cutting it with a blade','benefit','Produces almost no airborne dust','completed',false),
      jsonb_build_object('action','Set the saw outside or at a window and keep the vacuum at the cut for dry work','benefit','Keeps dust out of the rest of the house','completed',false)
    ),
    'low',
    'Treat any dry cut as a respirator job, and keep dry cutting to the few cuts the wet saw cannot make.',
    'Silica exposure does not announce itself. The damage is permanent and shows up years later, which is why the control has to be the method rather than a reminder.'
  ),
  (
    '373adcbf-0a8c-42e9-9bcb-a4b400000007'::uuid, v_project_id, 7,
    'Wet saw blade contact and kickback',
    'A tile saw has an exposed diamond blade, wet hands, and small offcuts that pull fingers toward the blade at the end of a cut.',
    'low', 'high',
    'safety', 7, 3, 4,
    'skill', 'procedural',
    v_step_cut, 'tool', 'tl-i2-saw',
    NULL, NULL, NULL, NULL,
    'Feed with the guide and a push stick on narrow cuts, keep hands behind the blade line, and never reach across a spinning blade to clear an offcut.',
    jsonb_build_array(
      jsonb_build_object('action','Use the rip guide rather than freehanding narrow strips','benefit','Keeps fingers out of the blade path','completed',false),
      jsonb_build_object('action','Let the blade stop before clearing offcuts from the tray','benefit','Removes the moment most injuries happen','completed',false)
    ),
    'low',
    'Narrow strips are the dangerous cut. Use a guide or a push stick, or cut them oversized and nibble the rest.',
    'A blade injury ends the project and needs stitches or surgery, and it happens in the last inch of an otherwise routine cut.'
  ),
  (
    '373adcbf-0a8c-42e9-9bcb-a4b400000008'::uuid, v_project_id, 8,
    'Cement burns from prolonged mortar and grout contact',
    'Wet mortar and grout are strongly alkaline. Bare hands in it for hours produce burns that appear late, and kneeling in it burns through wet trouser knees.',
    'medium', 'medium',
    'safety', 6, 5, 3,
    'attention', 'mistake_proof',
    v_step_grout, 'tool', 'tl-g2-gloves',
    NULL, NULL, NULL, NULL,
    'Wear chemical-resistant gloves for every mortar and grout session, keep knees out of wet slurry, and rinse skin immediately rather than at the end of the day.',
    jsonb_build_array(
      jsonb_build_object('action','Keep a box of nitrile gloves at the mixing bucket','benefit','Removes the skin contact entirely rather than limiting it','completed',false),
      jsonb_build_object('action','Change wet knee pads or trousers rather than working through it','benefit','Cement burns come from prolonged contact, not a splash','completed',false)
    ),
    'low',
    'Gloves are the control here, not washing up afterward. Alkaline burns develop hours after the contact that caused them.',
    'A cement burn needs weeks to heal and can need medical treatment, and nothing hurts at the time to warn you.'
  ),
  (
    '373adcbf-0a8c-42e9-9bcb-a4b400000009'::uuid, v_project_id, 9,
    'Knee, back, and wrist strain from a full day at floor level',
    'Setting tile is hours of kneeling, reaching, and lifting from the floor. The injury comes from duration rather than from a single moment.',
    'high', 'medium',
    'safety', 5, 7, 3,
    'process_design', 'procedural',
    v_step_set, 'step', NULL,
    NULL, NULL, NULL, NULL,
    'Split tile setting across sessions rather than pushing one long day, use knee pads and a kneeling board, and lift tile cartons with legs rather than back.',
    jsonb_build_array(
      jsonb_build_object('action','Plan the field in sessions that end at a cut line rather than at exhaustion','benefit','Fatigue is also what produces lippage and coverage misses','completed',false),
      jsonb_build_object('action','Break tile cartons down before carrying them into the room','benefit','A full carton of porcelain is heavier than it looks','completed',false)
    ),
    'medium',
    'Plan the job in sessions. The last hour of a long day is where both the injuries and the defects come from.',
    'A strained back stops the project for days and turns a weekend job into a month of waiting.'
  ),
  (
    '373adcbf-0a8c-42e9-9bcb-a4b400000010'::uuid, v_project_id, 10,
    'Slip hazard from saw water and mortar slurry',
    'Wet saw water, rinse buckets, and mortar slurry make a smooth substrate slick, in a room where you are carrying heavy tile.',
    'medium', 'medium',
    'safety', 5, 5, 2,
    'environment', 'procedural',
    v_step_cut, 'step', NULL,
    NULL, NULL, NULL, NULL,
    'Keep the saw on a drop cloth away from the traffic path, wipe up slurry as it happens, and keep the carry route to the tile stack dry.',
    jsonb_build_array(
      jsonb_build_object('action','Set the saw so the carry path never crosses the wet area','benefit','Removes the slip instead of walking carefully through it','completed',false)
    ),
    'low',
    'Decide where the water lives before the first cut, not after the floor is wet.',
    'A fall while carrying tile puts you and the tile on the floor, and broken tile mid-job means a reorder.'
  ),
  (
    '373adcbf-0a8c-42e9-9bcb-a4b400000011'::uuid, v_project_id, 11,
    'Tile waste higher than the order allowed',
    'Diagonal and herringbone layouts, small rooms with jogs, and a start line at a wall all push cut waste past the ten percent most orders carry.',
    'medium', 'medium',
    'budget', 5, 6, 3,
    'experience', 'procedural',
    v_step_layout, 'process_variable', 'pv-i1-pattern',
    0, 3,
    60, 500,
    'Set the pattern and start line before ordering, and buy waste to the pattern rather than to a flat percentage.',
    jsonb_build_array(
      jsonb_build_object('action','Order 15 percent extra for diagonal and herringbone rather than 10','benefit','A second order costs a delivery and risks a different dye lot','completed',false),
      jsonb_build_object('action','Dry-lay the first course before ordering on a room with jogs or niches','benefit','Shows the real cut count rather than an area estimate','completed',false)
    ),
    'low',
    'Decide the pattern before the order, because the pattern is what sets the waste factor.',
    'Running out with two rows left means paying for delivery twice and waiting on stock that may not match.'
  ),
  (
    '373adcbf-0a8c-42e9-9bcb-a4b400000012'::uuid, v_project_id, 12,
    'Dye lot mismatch on a second tile order',
    'Tile is manufactured in batches with real color and size variation between them. A top-up order is rarely from the same lot.',
    'low', 'high',
    'budget', 6, 4, 6,
    'material_variation', 'procedural',
    v_step_set, 'material', 'mt-i4-tile',
    1, 7,
    100, 800,
    'Buy the full quantity including waste in one order, keep the lot number, and place any top-up order against that lot before the stock moves.',
    jsonb_build_array(
      jsonb_build_object('action','Record the lot number from the cartons on delivery','benefit','A top-up order can be matched rather than guessed','completed',false),
      jsonb_build_object('action','Keep the leftover full tiles rather than returning them','benefit','Covers a future repair with tile that actually matches','completed',false)
    ),
    'low',
    'Buy the whole floor at once. A mismatch is not fixable by blending, because the eye finds the boundary.',
    'A mismatched lot shows as a visible band across the floor, and the only remedy is replacing the whole area.'
  ),
  (
    '373adcbf-0a8c-42e9-9bcb-a4b400000013'::uuid, v_project_id, 13,
    'Cure windows stretch the job across more days than planned',
    'Two mandatory waits sit in this project: the mortar before grouting and the grout before sealing. Neither is labor, and both extend the calendar.',
    'high', 'medium',
    'schedule', 5, 6, 2,
    'process_design', 'procedural',
    v_step_cure, 'step', NULL,
    1, 4,
    NULL, NULL,
    'Put both cure windows on the calendar as their own days when the project is scheduled, and pick the mortar and grout with those windows in mind.',
    jsonb_build_array(
      jsonb_build_object('action','Schedule the cure days rather than hoping to grout the same evening','benefit','Keeps the wait from turning into a rushed early grout','completed',false),
      jsonb_build_object('action','Choose a rapid-set mortar only if the data sheet window actually fits the plan','benefit','Faster products cost more and have shorter pot life','completed',false)
    ),
    'low',
    'The cure days are part of the schedule, not slack in it.',
    'Discovering the wait after the tile is set is what pushes a bathroom out of service through a work week.'
  ),
  (
    '373adcbf-0a8c-42e9-9bcb-a4b400000014'::uuid, v_project_id, 14,
    'Room out of service longer than the household planned',
    'Between prep, setting, two cure windows, and sealing, the room cannot be used for several days, and a bathroom or kitchen floor takes the fixtures with it.',
    'high', 'medium',
    'schedule', 4, 6, 2,
    'process_design', 'procedural',
    NULL, NULL, NULL,
    2, 7,
    NULL, NULL,
    'Count the cure windows into the out-of-service estimate before starting, and sequence around the one bathroom or the kitchen sink rather than discovering the conflict mid-job.',
    jsonb_build_array(
      jsonb_build_object('action','Total the working days plus cure days before the start date is promised','benefit','The household plans around a real number','completed',false)
    ),
    'low',
    'Tell the household the number with the cure days in it, not the number of days you will be working.',
    'A single-bathroom house with a floor curing for three days is the most common reason this project becomes a problem.'
  ),
  (
    '373adcbf-0a8c-42e9-9bcb-a4b400000015'::uuid, v_project_id, 15,
    'Tool rental runs past the reserved window',
    'A wet saw is usually rented by the day. Cure windows and slow cut work push the return date without adding any tile to the floor.',
    'medium', 'low',
    'budget', 3, 5, 3,
    'process_design', 'procedural',
    v_step_cut, 'tool', 'tl-i2-saw',
    0, 2,
    40, 250,
    'Group all cutting into the rental window rather than spreading it across the project, and cut the border tile before the rental clock starts on setting day.',
    jsonb_build_array(
      jsonb_build_object('action','Cut every border and penetration tile in one session while the saw is on site','benefit','One rental day instead of two','completed',false),
      jsonb_build_object('action','Check weekend rental rates, which often cover two days for one','benefit','Cheaper than a weekday extension','completed',false)
    ),
    'low',
    'Cutting is what the rental is for. Do all of it while the saw is here.',
    'A second rental day on a saw costs more than the leveling clips that would have prevented a reset.'
  )
  ON CONFLICT (id) DO UPDATE SET
    project_id = EXCLUDED.project_id,
    display_order = EXCLUDED.display_order,
    risk_title = EXCLUDED.risk_title,
    risk_description = EXCLUDED.risk_description,
    likelihood = EXCLUDED.likelihood,
    severity = EXCLUDED.severity,
    risk_dimension = EXCLUDED.risk_dimension,
    severity_score = EXCLUDED.severity_score,
    occurrence_score = EXCLUDED.occurrence_score,
    detection_score = EXCLUDED.detection_score,
    occurrence_driver = EXCLUDED.occurrence_driver,
    prevention_strength = EXCLUDED.prevention_strength,
    operation_step_id = EXCLUDED.operation_step_id,
    implicated_item_kind = EXCLUDED.implicated_item_kind,
    implicated_item_id = EXCLUDED.implicated_item_id,
    schedule_impact_low_days = EXCLUDED.schedule_impact_low_days,
    schedule_impact_high_days = EXCLUDED.schedule_impact_high_days,
    budget_impact_low = EXCLUDED.budget_impact_low,
    budget_impact_high = EXCLUDED.budget_impact_high,
    mitigation_strategy = EXCLUDED.mitigation_strategy,
    mitigation_actions = EXCLUDED.mitigation_actions,
    mitigation_effort_level = EXCLUDED.mitigation_effort_level,
    recommendation = EXCLUDED.recommendation,
    benefit = EXCLUDED.benefit,
    updated_at = now();

  RAISE NOTICE 'Tile Flooring Installation step 4 register risks applied for project %', v_project_id;
END
$migration$;


-- ===========================================================================================
-- Step 5 - tools
-- Source: supabase/migrations/20260917110300_tile_flooring_step5_tools.sql
-- ===========================================================================================
-- Step 5 (tools): Tile Flooring Installation - owned steps only.
--
-- Two problems this fixes.
--
-- First, the step tool JSON was written in a shape the app does not read. Rows carried
-- coreItemId and item, while the step editor and the compact tool table read id, name,
-- description, category, alternates, quantity, and parentId (src/interfaces/Project.ts Tool,
-- CompactToolsTable). Tool names rendered empty in the workflow as a result.
--
-- Second, no step had alternates. Substitutes are modeled the way the editor models them: a
-- child row carrying parentId pointing at the primary row it can replace. Library rows carry
-- the alternates text so the substitute reasoning survives outside this project.
--
-- Library additions here are shared catalog rows, written generically so any tile, stone, or
-- masonry project can use them.

DO $migration$
DECLARE
  v_project_id uuid;
  v_nroots integer;
  v_owned_n integer;
  v_missing text[] := ARRAY[]::text[];
  v_name text;
  v_updated integer;
  v_required_tools text[] := ARRAY[
    'Safety Glasses', 'Knee Pads', 'Work Gloves', 'Dust Mask / Respirator', 'Hearing Protection',
    'Chemical-Resistant Gloves', 'Shop Vacuum', 'Broom', 'Straightedge', 'Tape Measure',
    'Chalk Line', 'Level', 'Laser Level', 'Margin Trowel', 'Notched Trowel', 'Mixing Paddle',
    'Drill / Driver', 'Bucket', 'Utility Knife', 'Backer Board Scoring Knife',
    'Carbide Tile Cutter', 'Wet Tile Saw', 'Angle Grinder', 'Diamond Hole Saw', 'Tile Nippers',
    'Rubber Mallet', 'Beating Block', 'Tile Spacers', 'Tile Leveling Clip Tool', 'Grout Float',
    'Grout Saw', 'Grouting Sponges', 'Microfiber Cloths', 'Screw Gun', 'Knee Board',
    'Moisture Meter', 'Sealer Applicator Bottle'
  ];
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

  -- ---------------------------------------------------------------------------
  -- Shared tools library: insert what is missing, then fill alternates on the rows this
  -- project depends on. Category values are constrained to PPE, Hand Tool, Power Tool, Other.
  -- ---------------------------------------------------------------------------
  INSERT INTO public.tools (name, description, category, specialty_scale, alternates)
  SELECT v.name, v.description, v.category, v.specialty_scale, v.alternates
  FROM (VALUES
    ('Safety Glasses', 'Impact-rated eye protection for cutting, scraping, and overhead work.', 'PPE', 1,
     'Safety goggles where dust or splash comes from the side'),
    ('Knee Pads', 'Padding for extended floor-level work.', 'PPE', 1,
     'Kneeling pad, though it has to be moved constantly'),
    ('Work Gloves', 'General hand protection for handling panels, tile, and debris.', 'PPE', 1,
     'Cut-resistant gloves when handling broken tile'),
    ('Dust Mask / Respirator', 'Respiratory protection for dust from cutting or grinding.', 'PPE', 1,
     'Half-face respirator with P100 filters for dry cutting or grinding cementitious material'),
    ('Hearing Protection', 'Muffs or plugs for extended work beside a wet saw or grinder.', 'PPE', 1,
     'Foam plugs rated NRR 25 or higher, or muffs over plugs for a full day of cutting'),
    ('Chemical-Resistant Gloves', 'Nitrile or rubber gloves for mortar, grout, and sealer handling.', 'PPE', 1,
     'Nitrile disposables doubled up for short sealer work'),
    ('Shop Vacuum', 'Removes fine dust from substrates and joints.', 'Power Tool', 1,
     'Vacuum with a HEPA filter, which is required when collecting silica dust'),
    ('Broom', 'Clears bulk debris ahead of vacuuming.', 'Other', 1,
     'Push broom for large open floors'),
    ('Straightedge', 'Checks substrate and finished floor flatness across a span.', 'Hand Tool', 1,
     'A factory edge of a 10 ft aluminum level, or a jointed 10 ft screed'),
    ('Tape Measure', 'General layout and dimension measurement.', 'Hand Tool', 1,
     'Folding rule for short interior measurements'),
    ('Chalk Line', 'Snaps long straight reference lines for layout.', 'Hand Tool', 1,
     'Laser level, or a long straightedge with a framing square'),
    ('Level', 'Verifies plane and intended slope.', 'Hand Tool', 1,
     'Digital level where a numeric slope reading is needed'),
    ('Laser Level', 'Projects square reference lines for tile layout on floors and walls.', 'Power Tool', 3,
     'Chalk line plus a 3-4-5 triangle check, which is slower but equally accurate'),
    ('Margin Trowel', 'Small flat trowel for scooping, back-buttering, and detail work.', 'Hand Tool', 1,
     'Pointing trowel for tight corners'),
    ('Notched Trowel', 'Combs mortar to a controlled thickness for bonded assemblies.', 'Hand Tool', 2,
     'Notch size follows the tile size and mortar data sheet rather than preference, so a second trowel is often needed'),
    ('Mixing Paddle', 'Mixes mortar and grout to a uniform consistency.', 'Hand Tool', 1,
     'Hand mixing with a margin trowel for batches under a gallon'),
    ('Drill / Driver', 'Drives mixing paddles and fasteners.', 'Power Tool', 1,
     'Corded 1/2 in drill for repeated mortar mixing'),
    ('Bucket', 'Holds mix water, mortar batches, and rinse water.', 'Other', 1,
     'Any clean 5 gallon pail, though rinse and mix buckets must stay separate'),
    ('Utility Knife', 'Cuts membranes, tape, and packaging.', 'Hand Tool', 1,
     'Hook blade knife for sheet goods'),
    ('Backer Board Scoring Knife', 'Scores cement board for snap cuts with minimal dust.', 'Hand Tool', 1,
     'Utility knife with a carbide blade, or an angle grinder with a diamond blade and dust control'),
    ('Carbide Tile Cutter', 'Score-and-snap cutter for straight cuts in ceramic tile.', 'Hand Tool', 2,
     'Wet tile saw, which is required for most porcelain and all stone'),
    ('Wet Tile Saw', 'Water-cooled diamond saw for tile and stone cuts.', 'Power Tool', 3,
     'Carbide tile cutter for straight cuts in ceramic, angle grinder with a diamond blade for notches'),
    ('Angle Grinder', 'Cuts notches, curves, and plunge cuts in tile with a diamond blade.', 'Power Tool', 3,
     'Wet saw plunge cuts for straight notches, tile nippers for rough cuts behind a flange'),
    ('Diamond Hole Saw', 'Cuts clean round openings in tile for supply lines and flanges.', 'Other', 3,
     'Carbide tile nippers where the opening will be covered by an escutcheon'),
    ('Tile Nippers', 'Breaks small bites out of tile for rough or hidden cuts.', 'Hand Tool', 2,
     'Diamond hole saw for clean round openings'),
    ('Rubber Mallet', 'Seats tile into mortar without cracking the glaze.', 'Hand Tool', 1,
     'Dead-blow mallet, used with a beating block on large tile'),
    ('Tile Spacers', 'Holds a consistent joint width between tiles.', 'Other', 1,
     'Tile leveling clips and wedges, which also control lippage on large format tile'),
    ('Grout Float', 'Packs grout into joints and strikes off the excess.', 'Hand Tool', 1,
     'Epoxy grout float where the grout is epoxy or urethane'),
    ('Grouting Sponges', 'Washes grout haze and shapes joints.', 'Other', 1,
     'Hydrophilic tile sponges, which hold less water and pull less cement out of the joint'),
    ('Microfiber Cloths', 'Dry buff for the final haze pass.', 'Other', 1,
     'Cheesecloth for the final haze buff'),
    ('Screw Gun', 'Drives fasteners to a consistent flush depth.', 'Power Tool', 2,
     'Drill driver with a depth-setting clutch'),
    ('Beating Block', 'Spreads mallet force across a tile face while seating it in mortar.', 'Hand Tool', 2,
     'A scrap of 3/4 in plywood with carpet stapled to one face'),
    ('Tile Leveling Clip Tool', 'Pliers that set and tension tile leveling clips and wedges.', 'Hand Tool', 3,
     'Hand pressure with wedge clips works on tile under 15 in, but not on large format'),
    ('Grout Saw', 'Rakes hardened mortar and grout out of joints without chipping glaze.', 'Hand Tool', 2,
     'Carbide joint rake, or an oscillating multi-tool with a grout blade for long runs'),
    ('Knee Board', 'Spreads body weight across several tiles when a cured floor must be crossed.', 'Other', 1,
     'A 2 ft square of 3/4 in plywood'),
    ('Moisture Meter', 'Reads moisture in wood and concrete substrates before bonding.', 'Other', 3,
     'Taped plastic sheet left overnight, which shows condensation on a slab that is still wet'),
    ('Sealer Applicator Bottle', 'Applies grout sealer along joints without flooding tile faces.', 'Other', 1,
     'Small foam brush, or an artist brush for joints under 1/8 in')
  ) AS v(name, description, category, specialty_scale, alternates)
  WHERE NOT EXISTS (SELECT 1 FROM public.tools t WHERE lower(btrim(t.name)) = lower(btrim(v.name)));

  UPDATE public.tools t
  SET alternates = v.alternates, updated_at = now()
  FROM (VALUES
    ('Wet Tile Saw', 'Carbide tile cutter for straight cuts in ceramic, angle grinder with a diamond blade for notches'),
    ('Carbide Tile Cutter', 'Wet tile saw, which is required for most porcelain and all stone'),
    ('Backer Board Scoring Knife', 'Utility knife with a carbide blade, or an angle grinder with a diamond blade and dust control'),
    ('Screw Gun', 'Drill driver with a depth-setting clutch'),
    ('Chalk Line', 'Laser level, or a long straightedge with a framing square'),
    ('Tile Spacers', 'Tile leveling clips and wedges, which also control lippage on large format tile'),
    ('Notched Trowel', 'Notch size follows the tile size and mortar data sheet rather than preference, so a second trowel is often needed'),
    ('Straightedge', 'A factory edge of a 10 ft aluminum level, or a jointed 10 ft screed'),
    ('Grouting Sponges', 'Hydrophilic tile sponges, which hold less water and pull less cement out of the joint'),
    ('Microfiber Cloths', 'Cheesecloth for the final haze buff'),
    ('Dust Mask / Respirator', 'Half-face respirator with P100 filters for dry cutting or grinding cementitious material'),
    ('Rubber Mallet', 'Dead-blow mallet, used with a beating block on large tile')
  ) AS v(name, alternates)
  WHERE lower(btrim(t.name)) = lower(btrim(v.name));

  FOREACH v_name IN ARRAY v_required_tools LOOP
    IF NOT EXISTS (SELECT 1 FROM public.tools t WHERE lower(btrim(t.name)) = lower(btrim(v_name))) THEN
      v_missing := array_append(v_missing, v_name);
    END IF;
  END LOOP;

  IF array_length(v_missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Tools library is missing rows required by Tile Flooring Installation: %', array_to_string(v_missing, ' | ');
  END IF;

  -- ---------------------------------------------------------------------------
  -- Owned steps, scoped by the phase columns that define ownership rather than by operation
  -- name. The two Prepare subfloor operations were renamed to carry product names, so a name
  -- match there resolves nothing.
  -- ---------------------------------------------------------------------------
  DROP TABLE IF EXISTS owned_steps;
  CREATE TEMP TABLE owned_steps ON COMMIT DROP AS
  SELECT os.id AS step_id, lower(btrim(os.step_title)) AS step_key
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL AND pp.source_project_id IS NULL;

  SELECT count(*)::integer INTO v_owned_n FROM owned_steps;
  IF v_owned_n <> 17 THEN
    RAISE EXCEPTION 'Expected 17 owned steps, found %. Run the step 1 structure migration first.', v_owned_n;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Step tool lists. Rows with parentId are substitutes for the row they name.
  -- ---------------------------------------------------------------------------
  UPDATE public.operation_steps os
  SET tools = v.tools::jsonb, updated_at = now()
  FROM (VALUES

  ('Clean and inspect subfloor', '[
    {"id":"tl-m1-glasses","name":"Safety Glasses","description":"Worn for any scraping or grinding of the old floor.","category":"PPE","alternates":[],"quantity":1},
    {"id":"tl-m1-resp","name":"Dust Mask / Respirator","description":"Required while sweeping or grinding cementitious material, which releases silica.","category":"PPE","alternates":[],"quantity":1},
    {"id":"tl-m1-knees","name":"Knee Pads","description":"The whole step is on hands and knees.","category":"PPE","alternates":[],"quantity":1},
    {"id":"tl-m1-broom","name":"Broom","description":"First pass on bulk debris.","category":"Other","alternates":[],"quantity":1},
    {"id":"tl-m1-vac","name":"Shop Vacuum","description":"Final dust removal, which is what decides whether mortar bonds.","category":"Power Tool","alternates":[],"quantity":1},
    {"id":"tl-m1-straight","name":"Straightedge","description":"10 ft length needed to measure flatness against the limit for your tile size.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-m1-tape","name":"Tape Measure","description":"Measures gap depth under the straightedge and room dimensions.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-m1-meter","name":"Moisture Meter","description":"Reads substrate moisture when the mortar or membrane data sheet requires it.","category":"Other","alternates":[],"quantity":1},
    {"id":"tl-m1-knife","name":"Utility Knife","description":"Cuts back old adhesive edges and trims residue.","category":"Hand Tool","alternates":[],"quantity":1}
  ]'),

  ('Spread mortar for membrane', '[
    {"id":"tl-m2-bucket","name":"Bucket","description":"Clean 5 gallon bucket for mixing the membrane mortar.","category":"Other","alternates":[],"quantity":1},
    {"id":"tl-m2-drill","name":"Drill / Driver","description":"Drives the paddle at low speed so the mix does not entrain air.","category":"Power Tool","alternates":[],"quantity":1},
    {"id":"tl-m2-paddle","name":"Mixing Paddle","description":"Mortar paddle sized for a 5 gallon bucket.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-m2-notch","name":"Notched Trowel","description":"Notch size comes from the membrane print, often 1/4 in by 3/16 in for sheet systems.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-m2-margin","name":"Margin Trowel","description":"Scoops mortar and cleans bucket edges between batches.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-m2-gloves","name":"Chemical-Resistant Gloves","description":"Wet mortar is caustic and burns skin over a long session.","category":"PPE","alternates":[],"quantity":1},
    {"id":"tl-m2-knees","name":"Knee Pads","description":"Floor work for the length of the step.","category":"PPE","alternates":[],"quantity":1}
  ]'),

  ('Embed membrane and detail seams', '[
    {"id":"tl-m3-knife","name":"Utility Knife","description":"Cuts the sheet and the seam bands.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-m3-margin","name":"Margin Trowel","description":"Flat side works the sheet into the mortar and pushes air to the edges.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-m3-block","name":"Beating Block","description":"Presses the fleece into mortar evenly instead of in fingertip spots.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-m3-notch","name":"Notched Trowel","description":"Spreads fresh mortar for the next sheet.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-m3-tape","name":"Tape Measure","description":"Confirms overlap width at each seam.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-m3-gloves","name":"Chemical-Resistant Gloves","description":"Continuous contact with wet mortar.","category":"PPE","alternates":[],"quantity":1},
    {"id":"tl-m3-knees","name":"Knee Pads","description":"Floor work for the length of the step.","category":"PPE","alternates":[],"quantity":1}
  ]'),

  ('Cut and fit backer panels', '[
    {"id":"tl-b1-glasses","name":"Safety Glasses","description":"Cement board fractures in chips when scored and snapped.","category":"PPE","alternates":[],"quantity":1},
    {"id":"tl-b1-resp","name":"Dust Mask / Respirator","description":"Cutting cement board releases crystalline silica.","category":"PPE","alternates":[],"quantity":1},
    {"id":"tl-b1-gloves","name":"Work Gloves","description":"Panel edges are abrasive enough to sand skin.","category":"PPE","alternates":[],"quantity":1},
    {"id":"tl-b1-tape","name":"Tape Measure","description":"Panel layout and cut dimensions.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-b1-score","name":"Backer Board Scoring Knife","description":"Score-and-snap cuts, which produce far less dust than a blade.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-b1-grinder","name":"Angle Grinder","description":"Substitute for cuts a score-and-snap cannot make, such as notches and openings. Use dust control.","category":"Power Tool","alternates":[],"quantity":1,"parentId":"tl-b1-score"},
    {"id":"tl-b1-straight","name":"Straightedge","description":"Guides the scoring knife and checks panel plane after dry-laying.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-b1-vac","name":"Shop Vacuum","description":"Captures cutting dust at the source.","category":"Power Tool","alternates":[],"quantity":1}
  ]'),

  ('Fasten backer to subfloor', '[
    {"id":"tl-b2-gun","name":"Screw Gun","description":"Sets fastener heads flush without breaking the panel mesh.","category":"Power Tool","alternates":[],"quantity":1},
    {"id":"tl-b2-drill","name":"Drill / Driver","description":"Substitute for the screw gun when the clutch can be set to stop at flush.","category":"Power Tool","alternates":[],"quantity":1,"parentId":"tl-b2-gun"},
    {"id":"tl-b2-notch","name":"Notched Trowel","description":"Combs the bond coat under the panel where the assembly calls for one.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-b2-margin","name":"Margin Trowel","description":"Works mortar into corners and around obstructions.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-b2-straight","name":"Straightedge","description":"Checks the fastened panel plane before tile.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-b2-knees","name":"Knee Pads","description":"Fastening a floor is a full session on your knees.","category":"PPE","alternates":[],"quantity":1}
  ]'),

  ('Tape or mesh seams and embed', '[
    {"id":"tl-b3-margin","name":"Margin Trowel","description":"Beds and skims the tape at each panel joint.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-b3-notch","name":"Notched Trowel","description":"Spreads the mortar bed the tape is embedded into.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-b3-knife","name":"Utility Knife","description":"Cuts tape to length.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-b3-straight","name":"Straightedge","description":"Confirms the skimmed seam is flush with the panel face.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-b3-gloves","name":"Chemical-Resistant Gloves","description":"Hands stay in wet mortar for this step.","category":"PPE","alternates":[],"quantity":1}
  ]'),

  ('Layout and reference lines', '[
    {"id":"tl-i1-tape","name":"Tape Measure","description":"Room dimensions, cut widths, and joint math.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-i1-chalk","name":"Chalk Line","description":"Snaps the start line and grid references.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-i1-laser","name":"Laser Level","description":"Substitute for the chalk line that also holds square on a long run.","category":"Power Tool","alternates":[],"quantity":1,"parentId":"tl-i1-chalk"},
    {"id":"tl-i1-straight","name":"Straightedge","description":"Aligns the dry-laid row and verifies the snapped line.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-i1-level","name":"Level","description":"Checks plane and any slope you need to work around.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-i1-spacers","name":"Tile Spacers","description":"Used in the dry-lay so the planned joint width is in the measurement.","category":"Other","alternates":[],"quantity":1}
  ]'),

  ('Cut tiles to layout', '[
    {"id":"tl-i2-glasses","name":"Safety Glasses","description":"Chips leave a saw at speed.","category":"PPE","alternates":[],"quantity":1},
    {"id":"tl-i2-hearing","name":"Hearing Protection","description":"A wet saw runs above 85 dB for as long as you are cutting.","category":"PPE","alternates":[],"quantity":1},
    {"id":"tl-i2-resp","name":"Dust Mask / Respirator","description":"Needed for any dry cutting or grinding.","category":"PPE","alternates":[],"quantity":1},
    {"id":"tl-i2-saw","name":"Wet Tile Saw","description":"Straight and plunge cuts with water cooling, which is required for most porcelain.","category":"Power Tool","alternates":[],"quantity":1},
    {"id":"tl-i2-cutter","name":"Carbide Tile Cutter","description":"Substitute for straight cuts in ceramic when no saw is available.","category":"Hand Tool","alternates":[],"quantity":1,"parentId":"tl-i2-saw"},
    {"id":"tl-i2-grinder","name":"Angle Grinder","description":"Substitute for notches and curves the saw cannot reach.","category":"Power Tool","alternates":[],"quantity":1,"parentId":"tl-i2-saw"},
    {"id":"tl-i2-hole","name":"Diamond Hole Saw","description":"Round openings for supply lines and closet flanges.","category":"Other","alternates":[],"quantity":1},
    {"id":"tl-i2-nippers","name":"Tile Nippers","description":"Substitute for a hole saw where the opening will be hidden by an escutcheon.","category":"Hand Tool","alternates":[],"quantity":1,"parentId":"tl-i2-hole"},
    {"id":"tl-i2-tape","name":"Tape Measure","description":"Transfers measurements from the floor to the tile.","category":"Hand Tool","alternates":[],"quantity":1}
  ]'),

  ('Spread mortar and verify coverage', '[
    {"id":"tl-i3-bucket","name":"Bucket","description":"Clean bucket per batch, since cured residue shortens the next batch pot life.","category":"Other","alternates":[],"quantity":2},
    {"id":"tl-i3-drill","name":"Drill / Driver","description":"Mixes at low speed for the full published time.","category":"Power Tool","alternates":[],"quantity":1},
    {"id":"tl-i3-paddle","name":"Mixing Paddle","description":"Mortar paddle, not a paint paddle.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-i3-notch","name":"Notched Trowel","description":"Notch size follows the tile size and mortar data sheet, commonly 1/4 in by 3/8 in up to 12 in tile and larger for big formats.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-i3-margin","name":"Margin Trowel","description":"Back-butters tile and cleans joints as you go.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-i3-gloves","name":"Chemical-Resistant Gloves","description":"Extended wet mortar contact.","category":"PPE","alternates":[],"quantity":1},
    {"id":"tl-i3-knees","name":"Knee Pads","description":"Setting a floor is hours on your knees.","category":"PPE","alternates":[],"quantity":1}
  ]'),

  ('Set tile, beat-in, and check plane', '[
    {"id":"tl-i4-mallet","name":"Rubber Mallet","description":"Seats tile without cracking glaze.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-i4-block","name":"Beating Block","description":"Spreads mallet force across the tile face, which matters on tile over 12 in.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-i4-spacers","name":"Tile Spacers","description":"Holds the planned joint width on all four sides of each tile.","category":"Other","alternates":[],"quantity":1},
    {"id":"tl-i4-cliptool","name":"Tile Leveling Clip Tool","description":"Substitute spacing system that also pulls adjacent tile faces into plane on large format.","category":"Hand Tool","alternates":[],"quantity":1,"parentId":"tl-i4-spacers"},
    {"id":"tl-i4-straight","name":"Straightedge","description":"4 ft length across every few tiles to catch lippage while it is still fixable.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-i4-level","name":"Level","description":"Confirms plane and any intended slope.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-i4-knees","name":"Knee Pads","description":"Continuous floor work.","category":"PPE","alternates":[],"quantity":1}
  ]'),

  ('Inspect set tile before cure', '[
    {"id":"tl-qc-straight","name":"Straightedge","description":"4 ft for lippage between tiles and 10 ft for field flatness.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-qc-tape","name":"Tape Measure","description":"Measures joint width at the start line, mid-field, and far wall.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-qc-margin","name":"Margin Trowel","description":"Lifts a sample tile and re-beds anything that failed.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-qc-mallet","name":"Rubber Mallet","description":"Re-seats corrected tiles to the plane of their neighbors.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-qc-knees","name":"Knee Pads","description":"The inspection is done at floor level, by hand.","category":"PPE","alternates":[],"quantity":1}
  ]'),

  ('Cure thinset before grouting', '[
    {"id":"tl-ct-board","name":"Knee Board","description":"Only if the floor has to be crossed during the wait, so load spreads across several tiles.","category":"Other","alternates":[],"quantity":1}
  ]'),

  ('Prepare joints for grout', '[
    {"id":"tl-g1-saw","name":"Grout Saw","description":"Rakes hardened mortar out of joints to full depth without chipping glaze.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-g1-knife","name":"Utility Knife","description":"Substitute for the grout saw on narrow joints and short runs.","category":"Hand Tool","alternates":[],"quantity":1,"parentId":"tl-g1-saw"},
    {"id":"tl-g1-vac","name":"Shop Vacuum","description":"Clears joint dust, which would otherwise act as a bond breaker under grout.","category":"Power Tool","alternates":[],"quantity":1},
    {"id":"tl-g1-glasses","name":"Safety Glasses","description":"Raking joints throws hardened mortar chips.","category":"PPE","alternates":[],"quantity":1},
    {"id":"tl-g1-knees","name":"Knee Pads","description":"Joint prep is done at floor level.","category":"PPE","alternates":[],"quantity":1}
  ]'),

  ('Pack grout and initial clean', '[
    {"id":"tl-g2-bucket","name":"Bucket","description":"One for mixing and one for rinse water, kept separate.","category":"Other","alternates":[],"quantity":2},
    {"id":"tl-g2-drill","name":"Drill / Driver","description":"Mixes grout at low speed so it does not whip in air.","category":"Power Tool","alternates":[],"quantity":1},
    {"id":"tl-g2-paddle","name":"Mixing Paddle","description":"Mixes to a packable consistency without adding water past the ratio.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-g2-float","name":"Grout Float","description":"Packs joints on the diagonal and strikes off the excess.","category":"Hand Tool","alternates":[],"quantity":1},
    {"id":"tl-g2-sponge","name":"Grouting Sponges","description":"Two or more, so one is always clean and nearly dry.","category":"Other","alternates":[],"quantity":2},
    {"id":"tl-g2-gloves","name":"Chemical-Resistant Gloves","description":"Grout is caustic and this step is a long hand-contact session.","category":"PPE","alternates":[],"quantity":1},
    {"id":"tl-g2-knees","name":"Knee Pads","description":"Continuous floor work.","category":"PPE","alternates":[],"quantity":1}
  ]'),

  ('Wash haze and tool joints', '[
    {"id":"tl-g3-sponge","name":"Grouting Sponges","description":"Nearly dry sponge for the shaping pass.","category":"Other","alternates":[],"quantity":2},
    {"id":"tl-g3-cloth","name":"Microfiber Cloths","description":"Dry buff for the haze once the film has dulled.","category":"Other","alternates":[],"quantity":1},
    {"id":"tl-g3-bucket","name":"Bucket","description":"Clean water bucket, changed as soon as it clouds.","category":"Other","alternates":[],"quantity":2},
    {"id":"tl-g3-gloves","name":"Chemical-Resistant Gloves","description":"Repeated contact with grout slurry.","category":"PPE","alternates":[],"quantity":1},
    {"id":"tl-g3-knees","name":"Knee Pads","description":"Floor level work for the full wash.","category":"PPE","alternates":[],"quantity":1}
  ]'),

  ('Cure grout before sealing', '[
    {"id":"tl-cg-board","name":"Knee Board","description":"Only if the floor must be crossed before the cure window closes.","category":"Other","alternates":[],"quantity":1}
  ]'),

  ('Apply grout sealer', '[
    {"id":"tl-sl-bottle","name":"Sealer Applicator Bottle","description":"Runs sealer along the joint without flooding the tile faces.","category":"Other","alternates":[],"quantity":1},
    {"id":"tl-sl-cloth","name":"Microfiber Cloths","description":"Wipes sealer off tile faces inside the dwell window.","category":"Other","alternates":[],"quantity":1},
    {"id":"tl-sl-gloves","name":"Chemical-Resistant Gloves","description":"Solvent and water based sealers both irritate skin.","category":"PPE","alternates":[],"quantity":1},
    {"id":"tl-sl-glasses","name":"Safety Glasses","description":"Worn while working at floor level with a squeeze applicator.","category":"PPE","alternates":[],"quantity":1},
    {"id":"tl-sl-knees","name":"Knee Pads","description":"Application is done joint by joint at floor level.","category":"PPE","alternates":[],"quantity":1}
  ]')

  ) AS v(step_title, tools)
  WHERE os.id IN (SELECT step_id FROM owned_steps)
    AND lower(btrim(os.step_title)) = lower(btrim(v.step_title));

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 17 THEN
    RAISE EXCEPTION 'Expected 17 owned steps to receive tools, updated %.', v_updated;
  END IF;

  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases_internal(v_project_id),
      updated_at = now()
  WHERE id = v_project_id;

  RAISE NOTICE 'Tile Flooring Installation step 5 tools applied for project %', v_project_id;
END
$migration$;


-- ===========================================================================================
-- Step 6 - materials
-- Source: supabase/migrations/20260917110400_tile_flooring_step6_materials.sql
-- ===========================================================================================
-- Step 6 (materials): Tile Flooring Installation - owned steps only.
--
-- Same two problems as the tools pass. The step material JSON used a coreItemId shape the app
-- does not read, and nothing carried scope math. Rows are rewritten to the shape the step editor
-- and compact material table read: id, name, description, category, unit, quantity, purpose,
-- alternates, parentId, plus coveragePerUnit, wasteFactor, and packSize which shoppingUtils uses
-- to turn project scope into a purchase quantity.
--
-- Coverage numbers are per package at the notch or joint size named in the row purpose, because
-- mortar yield changes with trowel notch and grout yield changes with tile size and joint width.
-- A row without coverage is one that does not scale with floor area, so it is left for the user
-- to size rather than given a made-up rate.
--
-- Library additions are generic catalog rows usable by any tile, stone, or masonry project.

DO $migration$
DECLARE
  v_project_id uuid;
  v_nroots integer;
  v_owned_n integer;
  v_missing text[] := ARRAY[]::text[];
  v_name text;
  v_updated integer;
  v_required_materials text[] := ARRAY[
    'Uncoupling Membrane', 'Membrane Thinset', 'Cement Backer Board', 'Backer Board Screws',
    'Alkali-Resistant Seam Tape', 'Tile Thinset Mortar', 'Floor Tile', 'Tile Spacer Pack',
    'Tile Leveling Clips', 'Floor Grout', 'Movement Joint Sealant', 'Grout Haze Remover',
    'Penetrating Grout Sealer', 'Trash Bags', 'Plastic Sheeting', 'Marking Chalk',
    'Diamond Saw Blade'
  ];
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

  -- ---------------------------------------------------------------------------
  -- Shared materials library. Category is limited to Consumables, Components, and PPE
  -- (src/utils/materialCatalogCategory.ts).
  -- ---------------------------------------------------------------------------
  INSERT INTO public.materials (name, description, category, unit, unit_size, alternates)
  SELECT v.name, v.description, v.category, v.unit, v.unit_size, v.alternates
  FROM (VALUES
    ('Uncoupling Membrane', 'Sheet membrane that isolates tile from substrate movement and carries a crack isolation rating.', 'Components', 'sq ft', '150 sq ft roll',
     'Cement backer board assembly, where the substrate and the required ANSI A118.12 rating allow it'),
    ('Membrane Thinset', 'Mortar specified for bonding an uncoupling or crack isolation membrane to the substrate.', 'Consumables', 'bag', '50 lb bag',
     'Unmodified thinset where the membrane data sheet requires it, which is common under sheet membranes'),
    ('Cement Backer Board', 'Cementitious panel underlayment for tile over wood subfloors.', 'Components', 'sheet', '3 ft x 5 ft x 1/4 in sheet',
     'Uncoupling membrane, or 1/2 in panel where the assembly calls for the added thickness'),
    ('Backer Board Screws', 'Corrosion-resistant screws with a wafer head sized for cement panels.', 'Consumables', 'box', '1 lb box, approx 200 screws',
     'Hot-dipped galvanized roofing nails where the panel data sheet allows them'),
    ('Alkali-Resistant Seam Tape', 'Mesh tape for cement panel joints that resists alkali attack from mortar.', 'Consumables', 'roll', '50 ft roll',
     'Alkali-resistant fiberglass mesh sold by the panel manufacturer'),
    ('Tile Thinset Mortar', 'Polymer-modified mortar for bonding tile to a prepared substrate.', 'Consumables', 'bag', '50 lb bag',
     'Medium-bed mortar meeting ANSI A118.15 is required when any tile edge is 15 in or longer'),
    ('Floor Tile', 'Ceramic, porcelain, or stone floor tile.', 'Components', 'sq ft', 'by the box, coverage printed on the carton',
     'None - substitution changes layout, mortar, and joint width, so it is a scope change'),
    ('Tile Spacer Pack', 'Reusable spacers that hold a set joint width.', 'Consumables', 'pack', '200 count pack',
     'Tile leveling clips, which also pull adjacent tile faces into plane'),
    ('Tile Leveling Clips', 'Clip and wedge system that sets joint width and holds adjacent tile faces in plane while mortar cures.', 'Consumables', 'pack', '100 count pack',
     'Tile spacers plus a straightedge check, which controls joint width but not lippage'),
    ('Floor Grout', 'Cementitious joint filler for floor tile.', 'Consumables', 'bag', '10 lb bag',
     'Unsanded grout for joints under 1/8 in, or high performance and epoxy grout in wet and stained areas'),
    ('Movement Joint Sealant', 'Flexible sealant for perimeter and movement joints in tile assemblies.', 'Consumables', 'tube', '10.1 oz tube',
     '100 percent silicone matched to the grout color, which most grout manufacturers sell'),
    ('Grout Haze Remover', 'Acidic or buffered cleaner that removes cement haze grout washing leaves behind.', 'Consumables', 'bottle', '32 oz bottle',
     'A second clean water wash within the wash window, which avoids the need for a chemical'),
    ('Penetrating Grout Sealer', 'Impregnating sealer that slows staining in cementitious grout joints.', 'Consumables', 'bottle', '24 oz bottle',
     'Not required for epoxy or urethane grout, which is already dense'),
    ('Trash Bags', 'Heavy duty bags for tile offcuts and demolition debris.', 'Consumables', 'each', 'contractor grade 3 mil',
     'Debris box or bucket for sharp offcuts, which cut through bags'),
    ('Plastic Sheeting', 'Poly sheeting for dust containment, floor protection, and substrate moisture testing.', 'Consumables', 'roll', '10 ft x 25 ft roll, 6 mil',
     'Rosin paper for protection only, which does not work for a moisture test'),
    ('Marking Chalk', 'Chalk refill for snapping layout lines.', 'Consumables', 'bottle', '8 oz bottle',
     'Permanent chalk holds up on damp substrates but stains porous tile, so keep it off finished surfaces'),
    ('Diamond Saw Blade', 'Continuous rim diamond blade for wet cutting tile and stone.', 'Components', 'each', '7 in or 10 in to match the saw',
     'Turbo rim blade cuts faster and chips more, so it suits cuts that will be hidden under trim')
  ) AS v(name, description, category, unit, unit_size, alternates)
  WHERE NOT EXISTS (SELECT 1 FROM public.materials m WHERE lower(btrim(m.name)) = lower(btrim(v.name)));

  -- Authored unit, package size, and alternates for library rows that already existed.
  UPDATE public.materials m
  SET alternates = v.alternates,
      unit = v.unit,
      unit_size = v.unit_size,
      updated_at = now()
  FROM (VALUES
    ('Uncoupling Membrane', 'sq ft', '150 sq ft roll', 'Cement backer board assembly, where the substrate and the required ANSI A118.12 rating allow it'),
    ('Membrane Thinset', 'bag', '50 lb bag', 'Unmodified thinset where the membrane data sheet requires it'),
    ('Cement Backer Board', 'sheet', '3 ft x 5 ft x 1/4 in sheet', 'Uncoupling membrane, or 1/2 in panel where the assembly calls for the added thickness'),
    ('Backer Board Screws', 'box', '1 lb box, approx 200 screws', 'Hot-dipped galvanized roofing nails where the panel data sheet allows them'),
    ('Alkali-Resistant Seam Tape', 'roll', '50 ft roll', 'Alkali-resistant fiberglass mesh sold by the panel manufacturer'),
    ('Tile Thinset Mortar', 'bag', '50 lb bag', 'Medium-bed mortar meeting ANSI A118.15 is required when any tile edge is 15 in or longer'),
    ('Floor Tile', 'sq ft', 'by the box, coverage printed on the carton', 'None - substitution changes layout, mortar, and joint width, so it is a scope change'),
    ('Tile Spacer Pack', 'pack', '200 count pack', 'Tile leveling clips, which also pull adjacent tile faces into plane'),
    ('Floor Grout', 'bag', '10 lb bag', 'Unsanded grout for joints under 1/8 in, or high performance and epoxy grout in wet and stained areas'),
    ('Penetrating Grout Sealer', 'bottle', '24 oz bottle', 'Not required for epoxy or urethane grout, which is already dense'),
    ('Trash Bags', 'each', 'contractor grade 3 mil', 'Debris box or bucket for sharp offcuts, which cut through bags')
  ) AS v(name, unit, unit_size, alternates)
  WHERE lower(btrim(m.name)) = lower(btrim(v.name));

  FOREACH v_name IN ARRAY v_required_materials LOOP
    IF NOT EXISTS (SELECT 1 FROM public.materials m WHERE lower(btrim(m.name)) = lower(btrim(v_name))) THEN
      v_missing := array_append(v_missing, v_name);
    END IF;
  END LOOP;

  IF array_length(v_missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Materials library is missing rows required by Tile Flooring Installation: %', array_to_string(v_missing, ' | ');
  END IF;

  -- ---------------------------------------------------------------------------
  -- Owned steps, scoped by the phase columns that define ownership rather than by operation
  -- name. The two Prepare subfloor operations were renamed to carry product names, so a name
  -- match there resolves nothing.
  -- ---------------------------------------------------------------------------
  DROP TABLE IF EXISTS owned_steps;
  CREATE TEMP TABLE owned_steps ON COMMIT DROP AS
  SELECT os.id AS step_id, lower(btrim(os.step_title)) AS step_key
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL AND pp.source_project_id IS NULL;

  SELECT count(*)::integer INTO v_owned_n FROM owned_steps;
  IF v_owned_n <> 17 THEN
    RAISE EXCEPTION 'Expected 17 owned steps, found %. Run the step 1 structure migration first.', v_owned_n;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Step material lists. Rows with parentId are substitutes for the row they name. Inspection and
  -- cure steps consume nothing, so they carry an empty list rather than a padded one.
  -- ---------------------------------------------------------------------------
  UPDATE public.operation_steps os
  SET materials = v.materials::jsonb, updated_at = now()
  FROM (VALUES

  ('Clean and inspect subfloor', '[
    {"id":"mt-m1-bags","name":"Trash Bags","description":"Holds scraped adhesive, old underlayment scraps, and debris.","category":"Consumables","unit":"each","quantity":5,"purpose":"Debris removal","alternates":[]},
    {"id":"mt-m1-poly","name":"Plastic Sheeting","description":"Taped down over a slab overnight, condensation underneath means the substrate is still releasing moisture.","category":"Consumables","unit":"roll","quantity":1,"purpose":"Moisture check and dust containment","alternates":["Rosin paper protects the floor but will not show a moisture problem"],"packSize":1}
  ]'),

  ('Spread mortar for membrane', '[
    {"id":"mt-m2-mortar","name":"Membrane Thinset","description":"Bonds the membrane to the substrate. Mix to the ratio on the bag, not to feel.","category":"Consumables","unit":"bag","quantity":1,"purpose":"Bond coat under membrane","alternates":["Unmodified thinset where the membrane data sheet requires it"],"coveragePerUnit":100,"wasteFactor":0.1,"packSize":1}
  ]'),

  ('Embed membrane and detail seams', '[
    {"id":"mt-m3-membrane","name":"Uncoupling Membrane","description":"Sheet goes fleece side down into the wet mortar, with seams lapped the width the print calls for.","category":"Components","unit":"sq ft","quantity":1,"purpose":"Crack isolation and uncoupling layer","alternates":["Cement backer board assembly, which is a different operation in this project"],"coveragePerUnit":1,"wasteFactor":0.1,"packSize":150}
  ]'),

  ('Cut and fit backer panels', '[
    {"id":"mt-b1-board","name":"Cement Backer Board","description":"1/4 in panel is standard over a sound wood subfloor. A 3 ft by 5 ft sheet covers 15 sq ft.","category":"Components","unit":"sheet","quantity":1,"purpose":"Tile underlayment","alternates":["Uncoupling membrane, which is the other assembly in this project"],"coveragePerUnit":15,"wasteFactor":0.1,"packSize":1},
    {"id":"mt-b1-bags","name":"Trash Bags","description":"Panel offcuts are heavy and abrasive, so double bag them.","category":"Consumables","unit":"each","quantity":3,"purpose":"Offcut disposal","alternates":["Debris box for sharp offcuts"]}
  ]'),

  ('Fasten backer to subfloor', '[
    {"id":"mt-b2-mortar","name":"Tile Thinset Mortar","description":"Bond coat under the panel fills voids so the panel cannot flex between fasteners.","category":"Consumables","unit":"bag","quantity":1,"purpose":"Bond coat under panels","alternates":[],"coveragePerUnit":95,"wasteFactor":0.1,"packSize":1},
    {"id":"mt-b2-screws","name":"Backer Board Screws","description":"Spacing follows the panel data sheet, typically 8 in on center across the field and edges.","category":"Consumables","unit":"box","quantity":1,"purpose":"Panel fastening","alternates":["Hot-dipped galvanized roofing nails where the panel data sheet allows them"],"coveragePerUnit":85,"wasteFactor":0.1,"packSize":200}
  ]'),

  ('Tape or mesh seams and embed', '[
    {"id":"mt-b3-tape","name":"Alkali-Resistant Seam Tape","description":"Mesh tape bedded in mortar at every panel joint. A 50 ft roll covers roughly 80 sq ft of 3 ft by 5 ft panel layout.","category":"Consumables","unit":"roll","quantity":1,"purpose":"Panel joint reinforcement","alternates":["Alkali-resistant fiberglass mesh sold by the panel manufacturer"],"coveragePerUnit":80,"wasteFactor":0.1,"packSize":1},
    {"id":"mt-b3-mortar","name":"Tile Thinset Mortar","description":"Small amount from the same bag used for the bond coat, to bed and skim the tape.","category":"Consumables","unit":"bag","quantity":1,"purpose":"Embedding and skimming tape","alternates":[]}
  ]'),

  ('Layout and reference lines', '[
    {"id":"mt-i1-chalk","name":"Marking Chalk","description":"Standard chalk only. Permanent chalk stains porous tile and grout.","category":"Consumables","unit":"bottle","quantity":1,"purpose":"Snapping layout lines","alternates":["Pencil lines on a small floor, which will not read across a long snap"]}
  ]'),

  ('Cut tiles to layout', '[
    {"id":"mt-i2-blade","name":"Diamond Saw Blade","description":"Continuous rim blade matched to the saw arbor. A worn blade burns edges and chips glaze.","category":"Components","unit":"each","quantity":1,"purpose":"Tile cutting","alternates":["Turbo rim blade cuts faster and chips more, so it suits cuts hidden under trim"]},
    {"id":"mt-i2-bags","name":"Trash Bags","description":"Cut tile shards cut through single bags, so double them.","category":"Consumables","unit":"each","quantity":3,"purpose":"Offcut disposal","alternates":["Bucket or debris box"]}
  ]'),

  ('Spread mortar and verify coverage', '[
    {"id":"mt-i3-mortar","name":"Tile Thinset Mortar","description":"Coverage assumes a 1/4 in by 3/8 in notch, which yields roughly 75 sq ft per 50 lb bag. A larger notch for big tile drops that yield sharply.","category":"Consumables","unit":"bag","quantity":1,"purpose":"Tile bond coat","alternates":["Medium-bed mortar meeting ANSI A118.15 when any tile edge is 15 in or longer"],"coveragePerUnit":75,"wasteFactor":0.1,"packSize":1}
  ]'),

  ('Set tile, beat-in, and check plane', '[
    {"id":"mt-i4-tile","name":"Floor Tile","description":"Order by carton coverage. Straight layouts need about 10 percent extra, diagonal and herringbone closer to 15 percent.","category":"Components","unit":"sq ft","quantity":1,"purpose":"Finished floor surface","alternates":[],"coveragePerUnit":1,"wasteFactor":0.1},
    {"id":"mt-i4-spacers","name":"Tile Spacer Pack","description":"Sized to the joint width the layout was set for.","category":"Consumables","unit":"pack","quantity":1,"purpose":"Joint width control","alternates":[],"coveragePerUnit":50,"wasteFactor":0.1,"packSize":200},
    {"id":"mt-i4-clips","name":"Tile Leveling Clips","description":"Substitute spacing system that also holds adjacent tile faces in plane while the mortar cures, which is how lippage is controlled on large format tile.","category":"Consumables","unit":"pack","quantity":1,"purpose":"Joint width and lippage control","alternates":[],"parentId":"mt-i4-spacers","coveragePerUnit":25,"wasteFactor":0.1,"packSize":100}
  ]'),

  ('Inspect set tile before cure', '[]'),

  ('Cure thinset before grouting', '[]'),

  ('Prepare joints for grout', '[
    {"id":"mt-g1-bags","name":"Trash Bags","description":"Collects raked mortar crumbs and spacer waste.","category":"Consumables","unit":"each","quantity":2,"purpose":"Joint debris removal","alternates":[]}
  ]'),

  ('Pack grout and initial clean', '[
    {"id":"mt-g2-grout","name":"Floor Grout","description":"Coverage assumes 12 in tile with a 1/8 in joint, roughly 40 sq ft per 10 lb bag. Larger tile stretches it, smaller tile and wider joints consume more.","category":"Consumables","unit":"bag","quantity":1,"purpose":"Joint fill","alternates":["Unsanded grout for joints under 1/8 in, high performance or epoxy grout in wet areas"],"coveragePerUnit":40,"wasteFactor":0.1,"packSize":1},
    {"id":"mt-g2-sealant","name":"Movement Joint Sealant","description":"Perimeter and movement joints get flexible sealant, not grout. Grout in a movement joint is what cracks a tile floor along the walls.","category":"Consumables","unit":"tube","quantity":1,"purpose":"Perimeter and movement joints","alternates":["100 percent silicone matched to the grout color"]}
  ]'),

  ('Wash haze and tool joints', '[
    {"id":"mt-g3-haze","name":"Grout Haze Remover","description":"Only needed where a clean water wash left film behind. Follow the dilution on the label and keep it out of fresh joints.","category":"Consumables","unit":"bottle","quantity":1,"purpose":"Cement haze removal","alternates":["A second clean water wash inside the wash window, which avoids the chemical entirely"],"coveragePerUnit":200,"wasteFactor":0.1,"packSize":1}
  ]'),

  ('Cure grout before sealing', '[]'),

  ('Apply grout sealer', '[
    {"id":"mt-sl-sealer","name":"Penetrating Grout Sealer","description":"Joint-only application. A 24 oz bottle covers roughly 300 sq ft of floor when applied to joints rather than flooded over the tile.","category":"Consumables","unit":"bottle","quantity":1,"purpose":"Grout stain resistance","alternates":["Not required for epoxy or urethane grout, which is already dense"],"coveragePerUnit":300,"wasteFactor":0.1,"packSize":1}
  ]')

  ) AS v(step_title, materials)
  WHERE os.id IN (SELECT step_id FROM owned_steps)
    AND lower(btrim(os.step_title)) = lower(btrim(v.step_title));

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 17 THEN
    RAISE EXCEPTION 'Expected 17 owned steps to receive materials, updated %.', v_updated;
  END IF;

  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases_internal(v_project_id),
      updated_at = now()
  WHERE id = v_project_id;

  RAISE NOTICE 'Tile Flooring Installation step 6 materials applied for project %', v_project_id;
END
$migration$;


-- ===========================================================================================
-- Step 7 - process variables
-- Source: supabase/migrations/20260917110500_tile_flooring_step7_process_variables.sql
-- ===========================================================================================
-- Step 7 (process variables): Tile Flooring Installation - owned steps only.
--
-- Process variables are the measurable parameters that decide whether a step's outputs land.
-- They are what PFMEA causes and Key Characteristics point at, so a step with no variables
-- cannot carry a cause that implicates anything but the step as a whole.
--
-- Shape matches serializeProcessVariablesForDb: id, name, type ('process' or 'upstream'),
-- description, unit, options, required, sourceStepName, targetValue. Upstream rows carry
-- sourceStepName and the target they have to satisfy, which is how a downstream step states a
-- limit it inherited rather than one it sets.
--
-- Numbers are the ones the governing standard states: ANSI A108.02 for substrate flatness and
-- lippage, ANSI A108.5 for mortar coverage, TCNA EJ171 for movement joints. Where the number is
-- product specific (water ratio, open time, cure time) the variable carries the unit and the
-- data sheet as the target rather than a number invented here.

DO $migration$
DECLARE
  v_project_id uuid;
  v_nroots integer;
  v_owned_n integer;
  v_updated integer;
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

  -- ---------------------------------------------------------------------------
  -- Owned steps, scoped by the phase columns that define ownership rather than by operation
  -- name. The two Prepare subfloor operations were renamed to carry product names, so a name
  -- match there resolves nothing.
  -- ---------------------------------------------------------------------------
  DROP TABLE IF EXISTS owned_steps;
  CREATE TEMP TABLE owned_steps ON COMMIT DROP AS
  SELECT os.id AS step_id, lower(btrim(os.step_title)) AS step_key
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL AND pp.source_project_id IS NULL;

  SELECT count(*)::integer INTO v_owned_n FROM owned_steps;
  IF v_owned_n <> 17 THEN
    RAISE EXCEPTION 'Expected 17 owned steps, found %. Run the step 1 structure migration first.', v_owned_n;
  END IF;

  UPDATE public.operation_steps os
  SET process_variables = v.process_variables::jsonb, updated_at = now()
  FROM (VALUES

  ('Clean and inspect subfloor', '[
    {"id":"pv-m1-area","name":"Floor area to be tiled","type":"process","unit":"sq ft","required":true,"description":"Drives every material quantity in the project and the number of mortar batches."},
    {"id":"pv-m1-flat","name":"Substrate flatness deviation","type":"process","unit":"in per 10 ft","required":true,"targetValue":"1/4 in in 10 ft for tile under 15 in, 1/8 in in 10 ft when any edge is 15 in or longer","description":"Largest gap measured under a 10 ft straightedge. This is the number that decides whether the floor needs patching before tile."},
    {"id":"pv-m1-tileedge","name":"Longest tile edge","type":"process","unit":"in","required":true,"description":"Sets which flatness limit applies, which mortar class is required, and the trowel notch downstream."},
    {"id":"pv-m1-moisture","name":"Substrate moisture reading","type":"process","unit":"percent RH or lb per 1000 sq ft per 24 hr","targetValue":"Within the limit printed in the mortar or membrane data sheet","description":"Only meaningful against the product limit, so record the reading, the method, and the date."},
    {"id":"pv-m1-deflect","name":"Subfloor deflection ratio","type":"process","unit":"L over span","targetValue":"L/360 for ceramic and porcelain, L/720 for natural stone","description":"A floor that bounces cracks grout and tile no matter how well the tile is set."},
    {"id":"pv-m1-joist","name":"Joist spacing","type":"process","unit":"in on center","description":"Feeds the deflection check and the panel thickness decision."}
  ]'),

  ('Spread mortar for membrane', '[
    {"id":"pv-m2-notch","name":"Trowel notch size","type":"process","unit":"in","required":true,"options":["1/4 x 3/16 V-notch","1/4 x 1/4 square","3/16 x 5/32 U-notch"],"targetValue":"The notch printed in the membrane data sheet","description":"The membrane print, not the tile size, sets this notch."},
    {"id":"pv-m2-water","name":"Mix water ratio","type":"process","unit":"qt per bag","required":true,"targetValue":"As printed on the bag","description":"Extra water raises shrinkage and drops bond strength, and it cannot be corrected later."},
    {"id":"pv-m2-slake","name":"Slake time","type":"process","unit":"minutes","targetValue":"As printed on the bag, commonly 5 to 10 minutes","description":"Rest between mixes that lets the polymers wet out. Skipping it makes the mortar behave stiff and get thinned with water."},
    {"id":"pv-m2-open","name":"Open time before skinning","type":"process","unit":"minutes","required":true,"targetValue":"As printed on the bag, shortened by heat, sun, and low humidity","description":"Controls how much area can be combed before the membrane has to be in place."},
    {"id":"pv-m2-temp","name":"Ambient temperature","type":"process","unit":"deg F","targetValue":"50 to 100 deg F unless the data sheet says otherwise","description":"Below the low end the mortar does not gain strength on schedule, above it the open time collapses."},
    {"id":"pv-m2-batch","name":"Area combed per batch","type":"process","unit":"sq ft","description":"Set it so the sheet lands inside the open time, not so the batch runs out."},
    {"id":"pv-m1flat-up","name":"Substrate flatness deviation","type":"upstream","unit":"in per 10 ft","sourceStepName":"Clean and inspect subfloor","targetValue":"Within the limit for the tile size before any mortar is spread","description":"Mortar for the membrane is not a leveling layer, so the inherited flatness has to already pass."}
  ]'),

  ('Embed membrane and detail seams', '[
    {"id":"pv-m3-overlap","name":"Seam overlap width","type":"process","unit":"in","required":true,"targetValue":"The overlap or seam band printed in the membrane instructions","description":"Seams are where water and mortar movement travel, so the overlap is not adjustable."},
    {"id":"pv-m3-contact","name":"Fleece contact with mortar","type":"process","unit":"percent","required":true,"targetValue":"100 percent, verified by lifting a sheet corner","description":"Any area without mortar in the fleece is a place the membrane is not anchored."},
    {"id":"pv-m3-window","name":"Time from combing to embedding","type":"process","unit":"minutes","required":true,"targetValue":"Inside the mortar open time","description":"Mortar that has skinned will not grip the fleece even though it still feels wet."},
    {"id":"pv-m3-perimeter","name":"Perimeter and penetration detail","type":"process","options":["Sheet held back at the wall","Sealed with the manufacturer band","Bonded flange collar"],"description":"Which printed detail was used, so the assembly can be judged later against the warranty."}
  ]'),

  ('Cut and fit backer panels', '[
    {"id":"pv-b1-thick","name":"Panel thickness","type":"process","unit":"in","required":true,"options":["1/4","1/2"],"targetValue":"Per the panel data sheet for the joist spacing and finished height","description":"1/4 in is the common floor thickness. 1/2 in is used where finished height or the panel print calls for it."},
    {"id":"pv-b1-gapwall","name":"Gap at walls and fixed objects","type":"process","unit":"in","required":true,"targetValue":"1/4 in per TCNA EJ171, held clear of grout","description":"The perimeter gap is what absorbs building movement. Filling it is what cracks tile along walls."},
    {"id":"pv-b1-gappanel","name":"Gap between panels","type":"process","unit":"in","required":true,"targetValue":"1/8 in, or as printed on the panel","description":"Panels butted tight have nowhere to move and telegraph a ridge through the tile."},
    {"id":"pv-b1-offset","name":"Offset from subfloor seams","type":"process","unit":"in","targetValue":"Panel joints staggered off subfloor joints, never stacked on them","description":"Stacked joints turn subfloor movement into a straight crack line in the tile."},
    {"id":"pv-b1-sliver","name":"Narrowest panel piece","type":"process","unit":"in","targetValue":"No piece narrower than 8 in at a doorway or high traffic line","description":"Slivers break loose under traffic before anything else in the assembly does."}
  ]'),

  ('Fasten backer to subfloor', '[
    {"id":"pv-b2-spacing","name":"Fastener spacing","type":"process","unit":"in on center","required":true,"targetValue":"As printed on the panel, commonly 8 in on center across field and edges","description":"Spacing is what stops the panel from flexing between fasteners."},
    {"id":"pv-b2-edge","name":"Fastener distance from panel edge","type":"process","unit":"in","required":true,"targetValue":"Not closer than 2 in to a corner or 3/8 in to an edge, per the panel print","description":"Too close blows out the edge, too far leaves the edge free to lift."},
    {"id":"pv-b2-depth","name":"Fastener head depth","type":"process","required":true,"options":["Flush with panel face","Countersunk below face","Proud of face"],"targetValue":"Flush with the panel face","description":"A proud head telegraphs through thin tile, a sunk head tears the mesh and loses hold."},
    {"id":"pv-b2-notch","name":"Bond coat notch size","type":"process","unit":"in","targetValue":"1/4 x 1/4 square notch unless the panel print says otherwise","description":"The bond coat fills voids under the panel so it cannot drum between fasteners."},
    {"id":"pv-b2-length","name":"Fastener length","type":"process","unit":"in","required":true,"targetValue":"Long enough to penetrate the subfloor at least 5/8 in past the panel","description":"Short screws hold the panel to the plywood face rather than into it."}
  ]'),

  ('Tape or mesh seams and embed', '[
    {"id":"pv-b3-width","name":"Tape width","type":"process","unit":"in","required":true,"targetValue":"2 in alkali-resistant mesh, or the width printed on the panel","description":"Narrow tape leaves the joint edge unreinforced, which is where the crack starts."},
    {"id":"pv-b3-skim","name":"Skim thickness over tape","type":"process","unit":"in","required":true,"targetValue":"Thin enough that the joint is flush with the panel face","description":"A proud seam becomes lippage in the finished floor, since tile sits on whatever the seam leaves."},
    {"id":"pv-b3-flat","name":"Joint flatness after skim","type":"process","unit":"in per 2 ft","required":true,"targetValue":"1/16 in in 2 ft across the joint","description":"Measured across the seam, not along it."},
    {"id":"pv-b3-coverage","name":"Mesh fully covered by mortar","type":"process","options":["Fully covered","Mesh pattern visible"],"targetValue":"Fully covered","description":"Exposed mesh under tile mortar is a bond breaker the tile will find."}
  ]'),

  ('Layout and reference lines', '[
    {"id":"pv-i1-joint","name":"Joint width","type":"process","unit":"in","required":true,"targetValue":"At least three times the tile edge variation, and 1/8 in minimum for rectified tile per ANSI A108.02","description":"Joint width absorbs tile size variation. Too tight and the tile edges, not the joints, set the pattern."},
    {"id":"pv-i1-cut","name":"Narrowest perimeter cut","type":"process","unit":"in","required":true,"targetValue":"No less than half a tile wherever the layout allows","description":"Sliver cuts at the most visible wall are the single most common layout regret."},
    {"id":"pv-i1-square","name":"Layout square tolerance","type":"process","unit":"in per 10 ft","required":true,"targetValue":"Within 1/8 in over a 10 ft diagonal check","description":"Out-of-square layout grows across the floor and cannot be recovered at the far wall."},
    {"id":"pv-i1-pattern","name":"Tile pattern","type":"process","required":true,"options":["Straight set","Running bond or offset","Diagonal","Herringbone"],"description":"Pattern changes waste factor, cut count, and how much lippage the offset can show."},
    {"id":"pv-i1-offsetlimit","name":"Running bond offset","type":"process","unit":"percent of tile length","targetValue":"33 percent maximum for tile with any edge 15 in or longer, per ANSI A108.02","description":"A half-offset on large format tile stacks the crown of one tile against the edge of the next and forces lippage."},
    {"id":"pv-i1-start","name":"Start line position","type":"process","unit":"in from reference wall","required":true,"description":"Where the first full course lands, which is what balances cuts at both ends."}
  ]'),

  ('Cut tiles to layout', '[
    {"id":"pv-i2-water","name":"Blade water supply","type":"process","required":true,"options":["Continuous flow","Reservoir only","Dry"],"targetValue":"Continuous flow","description":"A dry pass on a wet saw blade glazes the diamonds and chips the tile edge."},
    {"id":"pv-i2-chip","name":"Maximum edge chip","type":"process","unit":"in","required":true,"targetValue":"No visible chip on an exposed edge, since the grout joint hides nothing on the face","description":"Chipped edges are rejected on exposed cuts and acceptable only where trim will cover them."},
    {"id":"pv-i2-hole","name":"Penetration opening clearance","type":"process","unit":"in","targetValue":"1/8 to 1/4 in clearance around a pipe, always under the escutcheon","description":"Tile cut tight to a pipe cracks when the pipe moves or the floor shifts."},
    {"id":"pv-i2-count","name":"Cut tile count","type":"process","unit":"count","description":"Drives how much time this step takes and how much waste the tile order needs."},
    {"id":"pv-i1joint-up","name":"Joint width","type":"upstream","unit":"in","sourceStepName":"Layout and reference lines","targetValue":"Cuts sized to the joint width the layout was set for","description":"Every cut is measured to the joint the layout fixed, not to the wall."}
  ]'),

  ('Spread mortar and verify coverage', '[
    {"id":"pv-i3-notch","name":"Trowel notch size","type":"process","required":true,"options":["1/4 x 1/4 square","1/4 x 3/8 square","1/2 x 1/2 square","3/4 x 5/8 U-notch"],"targetValue":"Sized to the tile so coverage is met, larger notch for larger tile","description":"Notch size is the main control on coverage and is the most common thing left wrong."},
    {"id":"pv-i3-coverage","name":"Mortar coverage under tile","type":"process","unit":"percent","required":true,"targetValue":"80 percent minimum in dry areas and 95 percent in wet or exterior areas, per ANSI A108.5","description":"Checked by lifting a set tile. It is the single number that predicts whether the floor holds."},
    {"id":"pv-i3-water","name":"Mix water ratio","type":"process","unit":"qt per bag","required":true,"targetValue":"As printed on the bag","description":"Soupy mortar spreads easily and fails the coverage and strength it was mixed for."},
    {"id":"pv-i3-open","name":"Open time before skinning","type":"process","unit":"minutes","required":true,"targetValue":"As printed on the bag, shortened by heat and airflow","description":"Sets how much area can be combed before tile has to be in it."},
    {"id":"pv-i3-skin","name":"Skin test result","type":"process","options":["Mortar transfers to a finger","Mortar is dry to the touch"],"required":true,"targetValue":"Mortar transfers to a finger","description":"Touch the ridges. If nothing transfers, the mortar is scraped off and recombed, not tiled over."},
    {"id":"pv-i3-backbutter","name":"Back-butter coat","type":"process","options":["None","Skim coat on tile back","Full notched coat"],"targetValue":"Skim coat on tile back for tile with any edge 15 in or longer","description":"Back-buttering is how coverage is reached on large or textured tile backs."},
    {"id":"pv-i3-temp","name":"Ambient temperature","type":"process","unit":"deg F","targetValue":"50 to 100 deg F unless the data sheet says otherwise","description":"Drives open time at the top end and strength gain at the bottom."}
  ]'),

  ('Set tile, beat-in, and check plane', '[
    {"id":"pv-i4-lippage","name":"Lippage between adjacent tiles","type":"process","unit":"in","required":true,"targetValue":"1/32 in plus inherent tile warpage for joints under 1/4 in, per ANSI A108.02","description":"Measured tile to tile with a straightedge. Correctable while the mortar is plastic and permanent after."},
    {"id":"pv-i4-joint","name":"Joint width held","type":"upstream","unit":"in","sourceStepName":"Layout and reference lines","required":true,"targetValue":"The joint width the layout was set for, held on all four sides","description":"Joint width that drifts mid-field cannot be pulled back without resetting tile."},
    {"id":"pv-i4-warp","name":"Tile warpage","type":"process","unit":"in","description":"Crown measured across a single tile face. High warpage forces a wider joint and limits the offset pattern."},
    {"id":"pv-i4-beat","name":"Beat-in method","type":"process","required":true,"options":["Mallet on tile face","Mallet with beating block","Vibrating leveling tool"],"targetValue":"Beating block or vibrating tool for tile with any edge 15 in or longer","description":"Hitting a large tile directly puts force in one spot and tilts the tile instead of seating it."},
    {"id":"pv-i4-plane","name":"Field flatness while setting","type":"process","unit":"in per 10 ft","required":true,"targetValue":"Within the substrate flatness limit for the tile size","description":"Checked as you go, because a plane error found later means lifting cured tile."},
    {"id":"pv-i3cov-up","name":"Mortar coverage under tile","type":"upstream","unit":"percent","sourceStepName":"Spread mortar and verify coverage","targetValue":"80 percent dry areas, 95 percent wet areas","description":"The coverage proved in the previous step is what this step has to preserve while seating tile."}
  ]'),

  ('Inspect set tile before cure', '[
    {"id":"pv-qc-flat","name":"Finished field flatness","type":"process","unit":"in per 10 ft","required":true,"targetValue":"Within the limit for the tile size installed","description":"Measured with a 10 ft straightedge in both directions and on the diagonals."},
    {"id":"pv-qc-lippage","name":"Maximum lippage found","type":"process","unit":"in","required":true,"targetValue":"1/32 in plus tile warpage for joints under 1/4 in, per ANSI A108.02","description":"The worst case across the floor, not the average."},
    {"id":"pv-qc-joint","name":"Joint width variance","type":"process","unit":"in","required":true,"targetValue":"Consistent within 1/32 in across the field","description":"Compared at the start line, mid-field, and the far wall."},
    {"id":"pv-qc-lift","name":"Tiles lifted to verify coverage","type":"process","unit":"count","required":true,"targetValue":"At least one per 100 sq ft and one at the worst looking area","description":"The only way to see coverage. The tile goes back into fresh mortar afterward."},
    {"id":"pv-qc-coverage","name":"Coverage measured on lifted tile","type":"process","unit":"percent","required":true,"targetValue":"80 percent dry areas, 95 percent wet areas, per ANSI A108.5","description":"Estimated from the mortar pattern on the tile back and the substrate."},
    {"id":"pv-qc-window","name":"Time since tile was set","type":"process","unit":"minutes","required":true,"targetValue":"Inside the mortar adjustment window, before initial set","description":"This step only has value while corrections are still possible."}
  ]'),

  ('Cure thinset before grouting', '[
    {"id":"pv-ct-hours","name":"Cure time before grouting","type":"process","unit":"hours","required":true,"targetValue":"As printed on the mortar bag, commonly 24 hours and longer over a membrane or in cold conditions","description":"Grouting early traps water under the tile and drags tile out of plane."},
    {"id":"pv-ct-temp","name":"Ambient temperature during cure","type":"process","unit":"deg F","required":true,"targetValue":"Above the minimum on the bag for the full window","description":"Cold slows strength gain, so the published time assumes the published temperature."},
    {"id":"pv-ct-traffic","name":"Traffic during cure","type":"process","required":true,"options":["None","Knee board only","Normal foot traffic"],"targetValue":"None","description":"Weight on a tile before the mortar sets breaks the bond that was just achieved."}
  ]'),

  ('Prepare joints for grout', '[
    {"id":"pv-g1-depth","name":"Joint depth cleared","type":"process","unit":"percent of tile thickness","required":true,"targetValue":"At least two thirds of the tile thickness","description":"Grout needs depth to hold. A joint half full of hardened mortar cracks out in months."},
    {"id":"pv-g1-spacers","name":"Spacers removed","type":"process","required":true,"options":["All removed","Wedges removed, clips snapped off at grade","Left in place"],"targetValue":"All removed, or clips snapped off below the grout line","description":"A spacer left inside the joint reads as a shadow through the cured grout."},
    {"id":"pv-g1-debris","name":"Joint left clean and dry","type":"process","required":true,"options":["Vacuumed and dry","Damp","Dust remaining"],"targetValue":"Vacuumed and dry","description":"Dust in the joint is a bond breaker between grout and tile edge."}
  ]'),

  ('Pack grout and initial clean', '[
    {"id":"pv-g2-water","name":"Mix water ratio","type":"process","unit":"qt per bag","required":true,"targetValue":"As printed on the bag","description":"Extra water is why grout cures light, powdery, and inconsistent in color."},
    {"id":"pv-g2-slake","name":"Slake time","type":"process","unit":"minutes","required":true,"targetValue":"As printed on the bag, commonly 5 to 10 minutes","description":"Rest and remix. Adding water instead of slaking is the usual cause of color variation."},
    {"id":"pv-g2-fill","name":"Joint fill depth","type":"process","unit":"percent of joint depth","required":true,"targetValue":"100 percent, packed not skimmed","description":"A joint filled at the surface only will crumble at the first mop."},
    {"id":"pv-g2-perimeter","name":"Perimeter and movement joints","type":"process","required":true,"options":["Left open for sealant","Filled with grout"],"targetValue":"Left open for sealant, per TCNA EJ171","description":"Grout bridging the perimeter is what cracks tile along walls when the building moves."},
    {"id":"pv-g2-window","name":"Working time before washing","type":"process","unit":"minutes","required":true,"targetValue":"As printed on the bag, commonly 15 to 30 minutes","description":"Wash too early and grout pulls out of the joint, too late and the haze sets hard."},
    {"id":"pv-g2-section","name":"Area grouted per section","type":"process","unit":"sq ft","required":true,"targetValue":"Small enough to pack and wash inside the working time","description":"Section size is the control that keeps you inside the wash window."},
    {"id":"pv-i1joint2-up","name":"Joint width","type":"upstream","unit":"in","sourceStepName":"Layout and reference lines","required":true,"targetValue":"Sanded grout for joints 1/8 in and wider, unsanded below that","description":"The joint width set at layout decides which grout type is allowed here."}
  ]'),

  ('Wash haze and tool joints', '[
    {"id":"pv-g3-timing","name":"Time from packing to wash","type":"process","unit":"minutes","required":true,"targetValue":"Inside the window printed on the bag","description":"The wash window is short and closes faster in heat and low humidity."},
    {"id":"pv-g3-sponge","name":"Sponge water condition","type":"process","required":true,"options":["Nearly dry","Damp","Dripping"],"targetValue":"Nearly dry","description":"A wet sponge floats cement out of the joint and leaves the color blotchy."},
    {"id":"pv-g3-profile","name":"Joint profile below tile face","type":"process","unit":"in","required":true,"targetValue":"Uniform slight concave, consistent across the floor","description":"Uniformity matters more than depth, since the eye reads the variation, not the profile."},
    {"id":"pv-g3-changes","name":"Rinse water changes","type":"process","unit":"count","required":true,"targetValue":"Changed as soon as the water clouds","description":"Washing with grout water is how haze gets spread instead of removed."},
    {"id":"pv-g3-haze","name":"Haze remaining after buff","type":"process","required":true,"options":["None","Light film","Heavy film"],"targetValue":"None","description":"Light film comes off with a dry buff. Heavy film needs a haze remover and gets harder to remove every day."}
  ]'),

  ('Cure grout before sealing', '[
    {"id":"pv-cg-hours","name":"Cure time before sealing","type":"process","unit":"hours","required":true,"targetValue":"As printed on the grout bag, commonly 48 to 72 hours for cement grout","description":"Sealing damp grout traps moisture and leaves a hazy film that will not wipe off."},
    {"id":"pv-cg-moisture","name":"Water exposure during cure","type":"process","required":true,"options":["None","Damp mop only","Full wet service"],"targetValue":"None","description":"Water during cure washes cement out of the joint surface and lightens the color unevenly."},
    {"id":"pv-cg-temp","name":"Ambient temperature during cure","type":"process","unit":"deg F","required":true,"targetValue":"Above the minimum on the bag for the full window","description":"Cold extends the wait, and sealing on schedule rather than on condition is the mistake."}
  ]'),

  ('Apply grout sealer', '[
    {"id":"pv-sl-dwell","name":"Dwell time before wipe","type":"process","unit":"minutes","required":true,"targetValue":"As printed on the bottle, commonly 5 to 15 minutes","description":"Too short and it has not penetrated, too long and it dries as a film on the tile."},
    {"id":"pv-sl-coats","name":"Coats applied","type":"process","unit":"count","required":true,"targetValue":"As printed on the bottle, commonly one or two with the stated wait between","description":"A second coat on saturated grout sits on the surface and cures cloudy."},
    {"id":"pv-sl-overspill","name":"Sealer left on tile faces","type":"process","required":true,"options":["Wiped clean inside the dwell window","Residue left to dry"],"targetValue":"Wiped clean inside the dwell window","description":"Dried sealer on a glazed face needs a stripper, which is a far worse job than wiping."},
    {"id":"pv-sl-temp","name":"Ambient temperature","type":"process","unit":"deg F","targetValue":"Within the range printed on the bottle","description":"Heat shortens the dwell time and drives film formation."},
    {"id":"pv-sl-return","name":"Time before water exposure","type":"process","unit":"hours","required":true,"targetValue":"As printed on the bottle, commonly 24 to 72 hours","description":"Washing the floor before the sealer sets removes what was just applied."},
    {"id":"pv-cg-up","name":"Grout cure completed","type":"upstream","unit":"hours","sourceStepName":"Cure grout before sealing","required":true,"targetValue":"Full cure window elapsed and the joints dry to the touch","description":"The wait this step depends on is the previous step, not a guess at the calendar."}
  ]')

  ) AS v(step_title, process_variables)
  WHERE os.id IN (SELECT step_id FROM owned_steps)
    AND lower(btrim(os.step_title)) = lower(btrim(v.step_title));

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 17 THEN
    RAISE EXCEPTION 'Expected 17 owned steps to receive process variables, updated %.', v_updated;
  END IF;

  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases_internal(v_project_id),
      updated_at = now()
  WHERE id = v_project_id;

  RAISE NOTICE 'Tile Flooring Installation step 7 process variables applied for project %', v_project_id;
END
$migration$;


-- ===========================================================================================
-- Step 8 - time estimates
-- Source: supabase/migrations/20260917110600_tile_flooring_step8_time_estimates.sql
-- ===========================================================================================
-- Step 8 (time estimates): Tile Flooring Installation - owned steps only.
--
-- Scaled and quality_control_scaled steps store HOURS PER SCALING UNIT. This project scales by
-- square foot, so the numbers are hours per sq ft and the spread between low and high is the
-- difference between an open rectangular room and a small room full of cuts.
--
-- Prime (non-scaled) steps store total hours. The two cure steps are prime with zero workers
-- (see cross-cutting waiting-steps): the hours are elapsed wait, not labor, which is why they
-- belong in the schedule but not in the effort total.
--
-- Reference points used for the field rates: a practiced installer sets roughly 8 to 12 sq ft
-- per hour of 12 in tile including mortar and spacing, and a first timer runs about half that.
-- The rates below are split across the separate mortar, setting, and inspection steps rather
-- than lumped, so they add up to that range rather than each carrying it.

DO $migration$
DECLARE
  v_project_id uuid;
  v_nroots integer;
  v_owned_n integer;
  v_updated integer;
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

  -- ---------------------------------------------------------------------------
  -- Owned steps, scoped by the phase columns that define ownership rather than by operation
  -- name. The two Prepare subfloor operations were renamed to carry product names, so a name
  -- match there resolves nothing.
  -- ---------------------------------------------------------------------------
  DROP TABLE IF EXISTS owned_steps;
  CREATE TEMP TABLE owned_steps ON COMMIT DROP AS
  SELECT os.id AS step_id, lower(btrim(os.step_title)) AS step_key
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL AND pp.source_project_id IS NULL;

  SELECT count(*)::integer INTO v_owned_n FROM owned_steps;
  IF v_owned_n <> 17 THEN
    RAISE EXCEPTION 'Expected 17 owned steps, found %. Run the step 1 structure migration first.', v_owned_n;
  END IF;

  UPDATE public.operation_steps os
  SET
    time_estimate_low = v.low,
    time_estimate_med = v.med,
    time_estimate_high = v.high,
    updated_at = now()
  FROM (VALUES
    -- Hours per sq ft. Scraping old adhesive is the variable, not sweeping.
    ('Clean and inspect subfloor',          0.010, 0.020, 0.045),
    ('Spread mortar for membrane',          0.012, 0.018, 0.030),
    ('Embed membrane and detail seams',     0.014, 0.022, 0.035),
    ('Cut and fit backer panels',           0.020, 0.032, 0.055),
    ('Fasten backer to subfloor',           0.018, 0.028, 0.045),
    ('Tape or mesh seams and embed',        0.010, 0.016, 0.026),
    -- Layout is mostly fixed cost per room, so it reads high per sq ft on small floors.
    ('Layout and reference lines',          0.008, 0.015, 0.030),
    -- Cut count per sq ft is what moves this, so a small room with jogs sits at the top.
    ('Cut tiles to layout',                 0.020, 0.040, 0.080),
    ('Spread mortar and verify coverage',   0.020, 0.032, 0.050),
    ('Set tile, beat-in, and check plane',  0.035, 0.060, 0.110),
    ('Inspect set tile before cure',        0.004, 0.008, 0.015),
    ('Prepare joints for grout',            0.006, 0.012, 0.022),
    ('Pack grout and initial clean',        0.020, 0.032, 0.050),
    ('Wash haze and tool joints',           0.012, 0.020, 0.035),
    ('Apply grout sealer',                  0.008, 0.014, 0.024)
  ) AS v(step_title, low, med, high)
  WHERE os.id IN (SELECT step_id FROM owned_steps)
    AND lower(btrim(os.step_title)) = lower(btrim(v.step_title));

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 15 THEN
    RAISE EXCEPTION 'Expected 15 scaled owned steps to receive time estimates, updated %.', v_updated;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Cure steps: total elapsed hours, not labor. Zero workers, so nothing is added to effort.
  -- Low is the fast case named on a fast-setting product, med is the common 24 and 72 hour
  -- published wait, high is what cold or a membrane assembly turns it into.
  -- ---------------------------------------------------------------------------
  UPDATE public.operation_steps os
  SET
    time_estimate_low = v.low,
    time_estimate_med = v.med,
    time_estimate_high = v.high,
    updated_at = now()
  FROM (VALUES
    ('Cure thinset before grouting', 12.0, 24.0, 48.0),
    ('Cure grout before sealing',    48.0, 72.0, 96.0)
  ) AS v(step_title, low, med, high)
  WHERE os.id IN (SELECT step_id FROM owned_steps)
    AND lower(btrim(os.step_title)) = lower(btrim(v.step_title));

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 2 THEN
    RAISE EXCEPTION 'Expected 2 cure steps to receive elapsed time, updated %.', v_updated;
  END IF;

  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases_internal(v_project_id),
      updated_at = now()
  WHERE id = v_project_id;

  RAISE NOTICE 'Tile Flooring Installation step 8 time estimates applied for project %', v_project_id;
END
$migration$;


-- ===========================================================================================
-- Step 9 - PFMEA
-- Source: supabase/migrations/20260917110700_tile_flooring_step9_pfmea.sql
-- ===========================================================================================
-- Step 9 (PFMEA): Tile Flooring Installation - owned steps only.
--
-- The quality layer is re-authored against the current risk model rather than patched. What
-- existed predates pfmea_requirements, so failure modes hung off an output id column that no
-- longer exists, and nothing carried the classifications the Key Characteristic test reads.
-- Authored PFMEA content for the owned steps is deleted and rewritten here as one set, which
-- is also what makes the migration idempotent: rerunning it produces the same rows.
--
-- Structure: one requirement per output that carries real quality risk (performance-durability
-- or major-aesthetics from step 3), failure modes as the anti-requirement, then effects, causes,
-- and controls under each. Outputs typed 'none' are records, not requirements, so they carry no
-- failure mode.
--
-- Classifications follow docs/RISK_ENGINE.md:
--   occurrence_driver names what actually drives the frequency. Only skill, experience, and
--   attention are human-variable, which is what a Key Characteristic can rest on. A cause driven
--   by process_design or tool_condition is a method problem and is not made better by telling
--   the user to concentrate.
--   control_strength separates a prevention control that removes the opportunity for the error
--   (mistake_proof: a shim at the wall, tape over a movement joint, leveling clips) from one
--   that only asks for care (procedural).
--   implicated_item_kind and implicated_item_id point at the step 3 output, step 7 process
--   variable, or step 5 and 6 tool or material id the risk actually lives on.
--
-- Scores are on the 1-10 scales anchored in pfmea_scoring. Detection is inverted: high is bad.

DO $migration$
DECLARE
  v_project_id uuid;
  v_nroots integer;
  v_owned_n integer;
  v_count integer;
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

  -- ---------------------------------------------------------------------------
  -- Owned steps, scoped by the phase columns that define ownership rather than by operation
  -- name. The two Prepare subfloor operations were renamed to carry product names, so a name
  -- match there resolves nothing.
  -- ---------------------------------------------------------------------------
  DROP TABLE IF EXISTS owned_steps;
  CREATE TEMP TABLE owned_steps ON COMMIT DROP AS
  SELECT os.id AS step_id, lower(btrim(os.step_title)) AS step_key
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL AND pp.source_project_id IS NULL;

  SELECT count(*)::integer INTO v_owned_n FROM owned_steps;
  IF v_owned_n <> 17 THEN
    RAISE EXCEPTION 'Expected 17 owned steps, found %. Run the step 1 structure migration first.', v_owned_n;
  END IF;


  -- ---------------------------------------------------------------------------
  -- Clear the existing authored quality layer for these steps, children first.
  -- ---------------------------------------------------------------------------
  DELETE FROM public.pfmea_action_items
  WHERE failure_mode_id IN (
    SELECT fm.id FROM public.pfmea_failure_modes fm
    WHERE fm.operation_step_id IN (SELECT step_id FROM owned_steps)
  );

  DELETE FROM public.pfmea_controls
  WHERE failure_mode_id IN (
    SELECT fm.id FROM public.pfmea_failure_modes fm
    WHERE fm.operation_step_id IN (SELECT step_id FROM owned_steps)
  )
  OR cause_id IN (
    SELECT c.id FROM public.pfmea_potential_causes c
    JOIN public.pfmea_failure_modes fm ON fm.id = c.failure_mode_id
    WHERE fm.operation_step_id IN (SELECT step_id FROM owned_steps)
  );

  DELETE FROM public.pfmea_potential_causes
  WHERE failure_mode_id IN (
    SELECT fm.id FROM public.pfmea_failure_modes fm
    WHERE fm.operation_step_id IN (SELECT step_id FROM owned_steps)
  );

  DELETE FROM public.pfmea_potential_effects
  WHERE failure_mode_id IN (
    SELECT fm.id FROM public.pfmea_failure_modes fm
    WHERE fm.operation_step_id IN (SELECT step_id FROM owned_steps)
  );

  DELETE FROM public.pfmea_failure_modes
  WHERE operation_step_id IN (SELECT step_id FROM owned_steps);

  DELETE FROM public.pfmea_requirements
  WHERE operation_step_id IN (SELECT step_id FROM owned_steps);

  -- ---------------------------------------------------------------------------
  -- Requirements: what the step has to deliver, stated as a limit that can be failed.
  -- ---------------------------------------------------------------------------
  CREATE TEMP TABLE req_src (step_key text, output_id text, requirement_text text, display_order integer) ON COMMIT DROP;
  INSERT INTO req_src VALUES
  ('clean and inspect subfloor', 'out-m1a', 'The full area to be tiled is sound and free of bond breakers before any mortar is spread.', 1),
  ('clean and inspect subfloor', 'out-m1b', 'Substrate variation is no more than 1/4 in in 10 ft, or 1/8 in in 10 ft when any tile edge is 15 in or longer.', 2),
  ('spread mortar for membrane', 'out-m2a', 'Mortar is mixed at the printed water ratio, slaked, and remixed without added water.', 1),
  ('spread mortar for membrane', 'out-m2b', 'Combed mortar still transfers to a finger at the moment the membrane lands in it.', 2),
  ('embed membrane and detail seams', 'out-m3a', 'The membrane fleece is in contact with mortar across the entire sheet.', 1),
  ('embed membrane and detail seams', 'out-m3b', 'Seams, corners, and penetrations are lapped and detailed to the printed dimension.', 2),
  ('cut and fit backer panels', 'out-b1b', 'Panels hold 1/4 in at walls and fixed objects and 1/8 in between sheets, with joints staggered off subfloor joints.', 1),
  ('fasten backer to subfloor', 'out-b2a', 'The fastener grid printed on the panel is complete, with every head flush to the panel face.', 1),
  ('fasten backer to subfloor', 'out-b2b', 'The fastened panel plane is within the flatness limit for the tile size and no panel rocks.', 2),
  ('tape or mesh seams and embed', 'out-b3a', 'Every panel joint is reinforced with alkali-resistant mesh fully covered by mortar.', 1),
  ('tape or mesh seams and embed', 'out-b3b', 'The finished seam is flush with the panel face within 1/16 in in 2 ft measured across the joint.', 2),
  ('layout and reference lines', 'out-i1b', 'Reference lines are square within 1/8 in over a 10 ft diagonal and placed so no perimeter cut is less than half a tile where the layout allows.', 1),
  ('cut tiles to layout', 'out-i2b', 'Cut edges that stay visible in the finished floor are free of chips.', 1),
  ('spread mortar and verify coverage', 'out-i3a', 'Mortar is mixed at the printed ratio, slaked, and used inside its pot life with no retempering.', 1),
  ('spread mortar and verify coverage', 'out-i3b', 'Mortar contact under the tile is at least 80 percent in dry areas and 95 percent in wet areas, proven by lifting tile.', 2),
  ('set tile, beat-in, and check plane', 'out-i4a', 'Tile follows the reference lines at the planned joint width on all four sides.', 1),
  ('set tile, beat-in, and check plane', 'out-i4b', 'Lippage between adjacent tiles stays within 1/32 in plus inherent tile warpage.', 2),
  ('inspect set tile before cure', 'out-qc1a', 'The finished field is inside the flatness and lippage limits for the tile installed, measured before the mortar sets.', 1),
  ('inspect set tile before cure', 'out-qc1c', 'Every correction the inspection finds is completed while the mortar is still plastic.', 2),
  ('cure thinset before grouting', 'out-ct1a', 'The setting mortar reaches the strength its data sheet requires, at the stated temperature, before joints are packed.', 1),
  ('prepare joints for grout', 'out-g1a', 'Joints are clear to at least two thirds of the tile thickness along their full length.', 1),
  ('prepare joints for grout', 'out-g1b', 'Joint surfaces are dry and free of dust when grout goes in.', 2),
  ('pack grout and initial clean', 'out-g2a', 'Joints are filled to full depth with no voids, and perimeter and movement joints are left open for sealant.', 1),
  ('pack grout and initial clean', 'out-g2b', 'Bulk grout residue comes off the tile faces in the same pass that packed the joints.', 2),
  ('wash haze and tool joints', 'out-g3a', 'Tile faces are clean and joint profile and color are uniform across the floor.', 1),
  ('cure grout before sealing', 'out-cg1a', 'Grout is dry through the full joint depth before any sealer is applied.', 1),
  ('apply grout sealer', 'out-sl1a', 'Grout joints repel water after the sealer has cured.', 1),
  ('apply grout sealer', 'out-sl1b', 'Tile faces are free of dried sealer film.', 2);

  INSERT INTO public.pfmea_requirements (project_id, operation_step_id, output_id, requirement_text, display_order)
  SELECT v_project_id, os.step_id, r.output_id, r.requirement_text, r.display_order
  FROM req_src r
  JOIN owned_steps os ON os.step_key = r.step_key;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> (SELECT count(*) FROM req_src) THEN
    RAISE EXCEPTION 'Requirement step titles did not all resolve (% of % inserted).', v_count, (SELECT count(*) FROM req_src);
  END IF;

  -- ---------------------------------------------------------------------------
  -- Failure modes: the requirement stated as the thing that goes wrong.
  -- ---------------------------------------------------------------------------
  CREATE TEMP TABLE fm_src (step_key text, output_id text, failure_mode text, severity integer) ON COMMIT DROP;
  INSERT INTO fm_src VALUES
  ('clean and inspect subfloor', 'out-m1a', 'Mortar is spread over dust, old adhesive, or sealer that later releases from the substrate.', 8),
  ('clean and inspect subfloor', 'out-m1b', 'Tile is set over a substrate whose flatness was never measured.', 7),
  ('spread mortar for membrane', 'out-m2a', 'Mortar is thinned past the printed water ratio to make it spread more easily.', 7),
  ('spread mortar for membrane', 'out-m2b', 'The membrane is placed into mortar that has already skinned over.', 8),
  ('embed membrane and detail seams', 'out-m3a', 'Air pockets and dry spots leave the membrane unanchored in places.', 8),
  ('embed membrane and detail seams', 'out-m3b', 'Seams are lapped short or butted, leaving the joint unbridged.', 6),
  ('cut and fit backer panels', 'out-b1b', 'Panels are butted tight to each other and to the walls with no gap left.', 7),
  ('fasten backer to subfloor', 'out-b2a', 'Fasteners sit proud of the panel face or are spaced wider than the panel print allows.', 6),
  ('fasten backer to subfloor', 'out-b2b', 'High spots and rocking panels are left in the plane the tile has to follow.', 6),
  ('tape or mesh seams and embed', 'out-b3a', 'Panel joints are taped without full mortar embedment, or left untaped.', 6),
  ('tape or mesh seams and embed', 'out-b3b', 'The skim coat leaves a ridge running along every seam.', 5),
  ('layout and reference lines', 'out-i1b', 'Layout is started off a wall that is neither straight nor square.', 7),
  ('layout and reference lines', 'out-i1b', 'The layout lands a sliver cut at the doorway or the most visible wall.', 5),
  ('cut tiles to layout', 'out-i2b', 'Cut edges chip along the glaze line on cuts that stay visible.', 5),
  ('spread mortar and verify coverage', 'out-i3a', 'Mortar is used past its pot life or retempered with water to keep it workable.', 7),
  ('spread mortar and verify coverage', 'out-i3b', 'Tile is set onto mortar ridges that never collapse into full contact.', 9),
  ('set tile, beat-in, and check plane', 'out-i4a', 'Joint width drifts across the field and the run loses the reference line.', 6),
  ('set tile, beat-in, and check plane', 'out-i4b', 'Adjacent tile edges sit proud of each other beyond the lippage tolerance.', 7),
  ('inspect set tile before cure', 'out-qc1a', 'The inspection happens after the mortar has set, so nothing it finds can be acted on.', 7),
  ('inspect set tile before cure', 'out-qc1c', 'A tile found low or hollow is left in place rather than lifted and re-bedded.', 8),
  ('cure thinset before grouting', 'out-ct1a', 'Grout goes into the joints before the setting mortar has cured.', 7),
  ('prepare joints for grout', 'out-g1a', 'Joints are grouted over hardened mortar squeeze-up left in the bottom.', 6),
  ('prepare joints for grout', 'out-g1b', 'Grout is packed into joints that still hold cutting and raking dust.', 5),
  ('pack grout and initial clean', 'out-g2a', 'Grout bridges the perimeter and movement joints.', 8),
  ('pack grout and initial clean', 'out-g2a', 'Joints are filled at the surface with voids left underneath.', 6),
  ('pack grout and initial clean', 'out-g2b', 'Grout is left to harden on the tile faces before it is washed.', 4),
  ('wash haze and tool joints', 'out-g3a', 'Washing pulls cement out of the joints and leaves the color blotchy.', 5),
  ('cure grout before sealing', 'out-cg1a', 'Sealer is applied over grout that is still damp in the joint.', 5),
  ('apply grout sealer', 'out-sl1a', 'Sealer is spread thin across tile and joints rather than run into the joint.', 4),
  ('apply grout sealer', 'out-sl1b', 'Sealer dries as a film on the tile faces.', 5);

  INSERT INTO public.pfmea_failure_modes (project_id, operation_step_id, requirement_id, failure_mode, severity_score)
  SELECT v_project_id, os.step_id, req.id, f.failure_mode, f.severity
  FROM fm_src f
  JOIN owned_steps os ON os.step_key = f.step_key
  JOIN public.pfmea_requirements req
    ON req.operation_step_id = os.step_id AND req.output_id = f.output_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> (SELECT count(*) FROM fm_src) THEN
    RAISE EXCEPTION 'Failure modes did not all resolve a requirement (% of % inserted).', v_count, (SELECT count(*) FROM fm_src);
  END IF;

  -- ---------------------------------------------------------------------------
  -- Effects: what the user lives with, written as consequence rather than restatement.
  -- ---------------------------------------------------------------------------
  CREATE TEMP TABLE eff_src (failure_mode text, effect_description text, severity integer) ON COMMIT DROP;
  INSERT INTO eff_src VALUES
  ('Mortar is spread over dust, old adhesive, or sealer that later releases from the substrate.', 'Tile debonds in patches that sound hollow and crack under load, and the repair is removing the finished floor.', 8),
  ('Tile is set over a substrate whose flatness was never measured.', 'Lippage across the whole floor that you feel through a sock and see in raking light, with no fix short of resetting tile.', 7),
  ('Mortar is thinned past the printed water ratio to make it spread more easily.', 'Cured mortar is weak and shrinks, so membrane and tile lose bond under traffic with nothing visible on the surface.', 7),
  ('The membrane is placed into mortar that has already skinned over.', 'The fleece never anchors, leaving a floating sheet under the tile that drums and debonds.', 8),
  ('Air pockets and dry spots leave the membrane unanchored in places.', 'Hollow drumming areas that crack grout and tile once furniture and traffic load them.', 8),
  ('Seams are lapped short or butted, leaving the joint unbridged.', 'Movement and moisture travel straight through the seam line, which cracks along the joint.', 6),
  ('Panels are butted tight to each other and to the walls with no gap left.', 'Building movement has nowhere to go, so the tile cracks in a line along the wall or panel joint.', 7),
  ('Fasteners sit proud of the panel face or are spaced wider than the panel print allows.', 'Panels flex between fasteners and heads telegraph through thin tile, cracking grout lines first.', 6),
  ('High spots and rocking panels are left in the plane the tile has to follow.', 'Lippage and hollow tiles that cannot be corrected once the tile is set.', 6),
  ('Panel joints are taped without full mortar embedment, or left untaped.', 'The panel joint moves independently and cracks the grout line directly above it.', 6),
  ('The skim coat leaves a ridge running along every seam.', 'The ridge reads through as a line of lippage in every tile run that crosses it.', 5),
  ('Layout is started off a wall that is neither straight nor square.', 'Joints drift visibly across the floor and the far wall ends in a taper that cannot be hidden.', 7),
  ('The layout lands a sliver cut at the doorway or the most visible wall.', 'A thin strip of tile in the spot the eye goes first, which also breaks loose under traffic.', 5),
  ('Cut edges chip along the glaze line on cuts that stay visible.', 'A ragged line of chipped edges along the most visible cut run.', 5),
  ('Mortar is used past its pot life or retempered with water to keep it workable.', 'Bond strength drops well below the rating on the bag with nothing on the surface to show it.', 7),
  ('Tile is set onto mortar ridges that never collapse into full contact.', 'Hollow tile that cracks under a point load, and a floor that has to come up to fix it.', 9),
  ('Joint width drifts across the field and the run loses the reference line.', 'Joints that visibly taper and a pattern that no longer lines up at the far wall.', 6),
  ('Adjacent tile edges sit proud of each other beyond the lippage tolerance.', 'Edges you catch with a toe and see in raking light, permanent once the mortar cures.', 7),
  ('The inspection happens after the mortar has set, so nothing it finds can be acted on.', 'A documented defect with no remedy short of breaking out tile.', 7),
  ('A tile found low or hollow is left in place rather than lifted and re-bedded.', 'A known weak spot that fails later and takes the surrounding grout and tile with it.', 8),
  ('Grout goes into the joints before the setting mortar has cured.', 'Tile shifts under grout pressure and trapped water leaves the mortar weak and the grout blotchy.', 7),
  ('Joints are grouted over hardened mortar squeeze-up left in the bottom.', 'Shallow grout that cracks and falls out of the joint within a season.', 6),
  ('Grout is packed into joints that still hold cutting and raking dust.', 'Grout releases from the tile edge and the joint line crumbles at the first cleaning.', 5),
  ('Grout bridges the perimeter and movement joints.', 'The floor has nowhere to expand, so tile cracks or tents along the walls.', 8),
  ('Joints are filled at the surface with voids left underneath.', 'Grout that cracks and drops out of the joint under normal cleaning.', 6),
  ('Grout is left to harden on the tile faces before it is washed.', 'Haze that needs an acid cleaner, which can etch stone and dull glaze.', 4),
  ('Washing pulls cement out of the joints and leaves the color blotchy.', 'Joint color that varies tile to tile and cannot be corrected without regrouting.', 5),
  ('Sealer is applied over grout that is still damp in the joint.', 'Moisture trapped under the sealer leaves a cloudy film and a joint that never repels water.', 5),
  ('Sealer is spread thin across tile and joints rather than run into the joint.', 'Joints stain at the first spill even though the floor was sealed.', 4),
  ('Sealer dries as a film on the tile faces.', 'A streaked film that needs a stripper to remove, which attacks the grout that was just sealed.', 5);

  INSERT INTO public.pfmea_potential_effects (failure_mode_id, effect_description, severity_score)
  SELECT fm.id, e.effect_description, e.severity
  FROM eff_src e
  JOIN public.pfmea_failure_modes fm ON fm.failure_mode = e.failure_mode
  WHERE fm.operation_step_id IN (SELECT step_id FROM owned_steps);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> (SELECT count(*) FROM eff_src) THEN
    RAISE EXCEPTION 'Effects did not all resolve a failure mode (% of % inserted).', v_count, (SELECT count(*) FROM eff_src);
  END IF;

  -- ---------------------------------------------------------------------------
  -- Causes: why it happens, what drives the frequency, and which workflow item it lives on.
  -- ---------------------------------------------------------------------------
  CREATE TEMP TABLE cause_src (
    failure_mode text, cause_description text, occurrence integer,
    driver text, item_kind text, item_id text
  ) ON COMMIT DROP;
  INSERT INTO cause_src VALUES
  ('Mortar is spread over dust, old adhesive, or sealer that later releases from the substrate.',
   'The floor is swept but never vacuumed, so the coarse debris goes and the fine dust that actually breaks bond stays.', 6,
   'attention', 'output', 'out-m1a'),
  ('Mortar is spread over dust, old adhesive, or sealer that later releases from the substrate.',
   'Old adhesive or curing compound is judged sound by eye instead of tested with a blade and a water bead.', 5,
   'experience', 'output', 'out-m1a'),
  ('Tile is set over a substrate whose flatness was never measured.',
   'Flatness is assumed from how the floor looks because no 10 ft straightedge is on hand.', 7,
   'tool_condition', 'process_variable', 'pv-m1-flat'),
  ('Mortar is thinned past the printed water ratio to make it spread more easily.',
   'Stiff mortar is read as needing water rather than the slake time the bag calls for.', 6,
   'experience', 'process_variable', 'pv-m2-water'),
  ('The membrane is placed into mortar that has already skinned over.',
   'More area is combed than the sheet can cover inside the mortar open time.', 6,
   'process_design', 'process_variable', 'pv-m2-batch'),
  ('Air pockets and dry spots leave the membrane unanchored in places.',
   'The sheet is pressed down by hand and knee instead of worked flat from the center out with a trowel or block.', 6,
   'skill', 'process_variable', 'pv-m3-contact'),
  ('Seams are lapped short or butted, leaving the joint unbridged.',
   'Overlap is eyeballed rather than measured against the printed dimension.', 5,
   'attention', 'process_variable', 'pv-m3-overlap'),
  ('Panels are butted tight to each other and to the walls with no gap left.',
   'Gaps are left out because a tight fit looks like better work than a deliberate gap.', 6,
   'experience', 'process_variable', 'pv-b1-gapwall'),
  ('Fasteners sit proud of the panel face or are spaced wider than the panel print allows.',
   'The driver clutch is never set, so head depth ends up wherever the operator stops.', 6,
   'tool_condition', 'tool', 'tl-b2-gun'),
  ('High spots and rocking panels are left in the plane the tile has to follow.',
   'The bond coat under the panel is skipped, so voids let the panel rock between fasteners.', 5,
   'process_design', 'material', 'mt-b2-mortar'),
  ('Panel joints are taped without full mortar embedment, or left untaped.',
   'Tape is laid on the panel and skimmed too thin to cover the mesh.', 5,
   'skill', 'process_variable', 'pv-b3-coverage'),
  ('The skim coat leaves a ridge running along every seam.',
   'The skim is feathered along the seam instead of across it, so the ridge is never measured out.', 5,
   'skill', 'process_variable', 'pv-b3-flat'),
  ('Layout is started off a wall that is neither straight nor square.',
   'The wall is assumed square because the room reads square by eye.', 7,
   'experience', 'process_variable', 'pv-i1-square'),
  ('The layout lands a sliver cut at the doorway or the most visible wall.',
   'The start line is set at a wall instead of balanced from the center of the field.', 6,
   'experience', 'process_variable', 'pv-i1-cut'),
  ('Cut edges chip along the glaze line on cuts that stay visible.',
   'A dry or worn blade, or a feed rate faster than the blade can cut.', 6,
   'tool_condition', 'tool', 'tl-i2-saw'),
  ('Mortar is used past its pot life or retempered with water to keep it workable.',
   'The batch is mixed larger than the area that can be set inside the pot life.', 6,
   'process_design', 'process_variable', 'pv-i3-open'),
  ('Tile is set onto mortar ridges that never collapse into full contact.',
   'The trowel notch is too small for the tile size, so the ridges cannot fill the tile back.', 6,
   'process_design', 'process_variable', 'pv-i3-notch'),
  ('Tile is set onto mortar ridges that never collapse into full contact.',
   'No tile is lifted to look, so coverage is assumed from how the mortar looked before the tile went down.', 7,
   'attention', 'process_variable', 'pv-i3-coverage'),
  ('Joint width drifts across the field and the run loses the reference line.',
   'Spacers are used on some edges and skipped on others, so tile creeps along the run.', 5,
   'attention', 'process_variable', 'pv-i4-joint'),
  ('Adjacent tile edges sit proud of each other beyond the lippage tolerance.',
   'Large tile is struck directly with a mallet, which tips it rather than seating it flat.', 6,
   'skill', 'process_variable', 'pv-i4-beat'),
  ('Adjacent tile edges sit proud of each other beyond the lippage tolerance.',
   'Plane is checked at the end of a run instead of every few tiles, when it is too late to adjust.', 6,
   'attention', 'process_variable', 'pv-i4-plane'),
  ('The inspection happens after the mortar has set, so nothing it finds can be acted on.',
   'The check is treated as an end-of-day sign-off rather than part of setting tile.', 6,
   'process_design', 'process_variable', 'pv-qc-window'),
  ('A tile found low or hollow is left in place rather than lifted and re-bedded.',
   'Lifting a set tile looks like undoing finished work, so a known defect is accepted instead.', 5,
   'experience', 'output', 'out-qc1c'),
  ('Grout goes into the joints before the setting mortar has cured.',
   'The published cure time is read as a target to beat rather than a minimum at the stated temperature.', 6,
   'experience', 'process_variable', 'pv-ct-hours'),
  ('Joints are grouted over hardened mortar squeeze-up left in the bottom.',
   'Squeeze-up is left because it sits below the tile face and is out of sight.', 6,
   'attention', 'process_variable', 'pv-g1-depth'),
  ('Grout is packed into joints that still hold cutting and raking dust.',
   'The vacuum pass after raking is skipped because the floor looks clean.', 5,
   'attention', 'process_variable', 'pv-g1-debris'),
  ('Grout bridges the perimeter and movement joints.',
   'The perimeter joint is filled because an open gap at the wall looks unfinished.', 6,
   'experience', 'process_variable', 'pv-g2-perimeter'),
  ('Joints are filled at the surface with voids left underneath.',
   'The float is passed flat along the joint instead of packing across it on the diagonal.', 6,
   'skill', 'process_variable', 'pv-g2-fill'),
  ('Grout is left to harden on the tile faces before it is washed.',
   'The section grouted is larger than can be washed inside the working time on the bag.', 6,
   'process_design', 'process_variable', 'pv-g2-section'),
  ('Washing pulls cement out of the joints and leaves the color blotchy.',
   'The sponge is too wet and the rinse water is reused after it clouds.', 7,
   'attention', 'process_variable', 'pv-g3-sponge'),
  ('Sealer is applied over grout that is still damp in the joint.',
   'Cure is judged by how the joint surface feels rather than the published window.', 6,
   'experience', 'process_variable', 'pv-cg-hours'),
  ('Sealer is spread thin across tile and joints rather than run into the joint.',
   'A cloth over the whole floor covers faster than running an applicator down each joint.', 6,
   'process_design', 'tool', 'tl-sl-bottle'),
  ('Sealer dries as a film on the tile faces.',
   'The dwell window passes while a large area is still being worked.', 6,
   'attention', 'process_variable', 'pv-sl-overspill');

  INSERT INTO public.pfmea_potential_causes (
    failure_mode_id, cause_description, occurrence_score,
    occurrence_driver, implicated_item_kind, implicated_item_id
  )
  SELECT fm.id, c.cause_description, c.occurrence,
         c.driver, c.item_kind::public.risk_item_kind, c.item_id
  FROM cause_src c
  JOIN public.pfmea_failure_modes fm ON fm.failure_mode = c.failure_mode
  WHERE fm.operation_step_id IN (SELECT step_id FROM owned_steps);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> (SELECT count(*) FROM cause_src) THEN
    RAISE EXCEPTION 'Causes did not all resolve a failure mode (% of % inserted).', v_count, (SELECT count(*) FROM cause_src);
  END IF;

  -- ---------------------------------------------------------------------------
  -- Controls. Prevention controls carry strength, detection controls carry a detection score.
  -- mistake_proof is reserved for controls that remove the opportunity for the error, which is
  -- also what disqualifies the item from being a Key Characteristic.
  -- ---------------------------------------------------------------------------
  CREATE TEMP TABLE ctrl_src (
    failure_mode text, control_description text, control_type text,
    detection integer, strength text
  ) ON COMMIT DROP;
  INSERT INTO ctrl_src VALUES
  ('Mortar is spread over dust, old adhesive, or sealer that later releases from the substrate.',
   'Vacuum pass required after scraping, with a water bead test on concrete before mortar is mixed.', 'prevention', NULL, 'procedural'),
  ('Mortar is spread over dust, old adhesive, or sealer that later releases from the substrate.',
   'Drag a putty knife across the field and a hand over the surface: anything that lifts or leaves a dust film fails.', 'detection', 4, NULL),
  ('Tile is set over a substrate whose flatness was never measured.',
   'Recorded straightedge measurement required before any underlayment work starts.', 'prevention', NULL, 'procedural'),
  ('Tile is set over a substrate whose flatness was never measured.',
   '10 ft straightedge swept across the field and both diagonals with the largest gap written down by location.', 'detection', 3, NULL),
  ('Mortar is thinned past the printed water ratio to make it spread more easily.',
   'Water measured into the bucket to the bag ratio before powder goes in, with the level marked on the bucket.', 'prevention', NULL, 'mistake_proof'),
  ('Mortar is thinned past the printed water ratio to make it spread more easily.',
   'Ridge test: combed ridges stand without slumping. Slumping ridges mean the mix is wet.', 'detection', 4, NULL),
  ('The membrane is placed into mortar that has already skinned over.',
   'Comb only the area one sheet can cover, working one sheet width at a time.', 'prevention', NULL, 'procedural'),
  ('The membrane is placed into mortar that has already skinned over.',
   'Touch the ridges before each sheet lands: mortar has to transfer to a finger.', 'detection', 3, NULL),
  ('Air pockets and dry spots leave the membrane unanchored in places.',
   'Work the sheet from the center out with the flat side of a trowel or a beating block, not by hand.', 'prevention', NULL, 'procedural'),
  ('Air pockets and dry spots leave the membrane unanchored in places.',
   'Lift a sheet corner in the first area and read the mortar transfer on the fleece.', 'detection', 4, NULL),
  ('Seams are lapped short or butted, leaving the joint unbridged.',
   'Tape measure check on the overlap at every seam before the next sheet goes down.', 'detection', 4, NULL),
  ('Panels are butted tight to each other and to the walls with no gap left.',
   'A 1/4 in shim held against the wall while the panel is placed, so the gap cannot close.', 'prevention', NULL, 'mistake_proof'),
  ('Panels are butted tight to each other and to the walls with no gap left.',
   'Walk the perimeter and confirm the gap at every wall before any fastener goes in.', 'detection', 3, NULL),
  ('Fasteners sit proud of the panel face or are spaced wider than the panel print allows.',
   'Depth-setting clutch set on a scrap panel first, so the gun stops at flush on its own.', 'prevention', NULL, 'mistake_proof'),
  ('Fasteners sit proud of the panel face or are spaced wider than the panel print allows.',
   'Run a bare hand and a straightedge over the fastened panel to find proud heads.', 'detection', 3, NULL),
  ('High spots and rocking panels are left in the plane the tile has to follow.',
   'Bond coat combed under every panel as the assembly requires, not only at the edges.', 'prevention', NULL, 'procedural'),
  ('High spots and rocking panels are left in the plane the tile has to follow.',
   '10 ft straightedge over the fastened field, plus a knee press at each panel corner to find rock.', 'detection', 3, NULL),
  ('Panel joints are taped without full mortar embedment, or left untaped.',
   'Look for the mesh pattern showing through the skim: visible mesh means it is not embedded.', 'detection', 3, NULL),
  ('The skim coat leaves a ridge running along every seam.',
   'Straightedge laid across the seam rather than along it, at several points per joint.', 'detection', 4, NULL),
  ('Layout is started off a wall that is neither straight nor square.',
   '3-4-5 triangle or laser square check off the snapped line before any tile is set.', 'prevention', NULL, 'procedural'),
  ('Layout is started off a wall that is neither straight nor square.',
   'Dry-lay the first course wall to wall and measure the cut at each end.', 'detection', 3, NULL),
  ('The layout lands a sliver cut at the doorway or the most visible wall.',
   'Dry-lay from the center out with spacers in place and read the cut width at both ends before snapping.', 'prevention', NULL, 'procedural'),
  ('Cut edges chip along the glaze line on cuts that stay visible.',
   'Water flowing at the blade and a steady feed rate, with a fresh blade for show cuts.', 'prevention', NULL, 'procedural'),
  ('Cut edges chip along the glaze line on cuts that stay visible.',
   'Inspect each cut edge before the tile goes into the layout, and reserve chipped cuts for hidden runs.', 'detection', 3, NULL),
  ('Mortar is used past its pot life or retempered with water to keep it workable.',
   'Batch sized to the area reachable inside the pot life printed on the bag.', 'prevention', NULL, 'procedural'),
  ('Mortar is used past its pot life or retempered with water to keep it workable.',
   'Mortar that has stiffened in the bucket is discarded rather than rewet.', 'detection', 5, NULL),
  ('Tile is set onto mortar ridges that never collapse into full contact.',
   'Notch size named on the step for the tile size in use, with back-buttering required on tile 15 in or longer.', 'prevention', NULL, 'procedural'),
  ('Tile is set onto mortar ridges that never collapse into full contact.',
   'Lift one tile per 100 sq ft and read the mortar pattern on the tile back and the substrate.', 'detection', 3, NULL),
  ('Joint width drifts across the field and the run loses the reference line.',
   'Spacers on all four sides of every tile, not only where the run feels tight.', 'prevention', NULL, 'procedural'),
  ('Joint width drifts across the field and the run loses the reference line.',
   'Check the run against the snapped line every few courses and measure the joint at both ends.', 'detection', 3, NULL),
  ('Adjacent tile edges sit proud of each other beyond the lippage tolerance.',
   'Leveling clips hold adjacent faces in plane while the mortar cures, so the tile cannot settle out of plane.', 'prevention', NULL, 'mistake_proof'),
  ('Adjacent tile edges sit proud of each other beyond the lippage tolerance.',
   '4 ft straightedge across every few tiles while the mortar is still plastic.', 'detection', 3, NULL),
  ('The inspection happens after the mortar has set, so nothing it finds can be acted on.',
   'The inspection is scheduled inside the mortar adjustment window rather than at the end of the day.', 'prevention', NULL, 'procedural'),
  ('The inspection happens after the mortar has set, so nothing it finds can be acted on.',
   'Press a tile corner: if it still moves under hand pressure, the correction window is open.', 'detection', 4, NULL),
  ('A tile found low or hollow is left in place rather than lifted and re-bedded.',
   'Fresh mortar kept mixed through the inspection so re-bedding is a two minute job, not a restart.', 'prevention', NULL, 'procedural'),
  ('Grout goes into the joints before the setting mortar has cured.',
   'Cure end time written down when the last tile is set, read off the mortar data sheet for the actual temperature.', 'prevention', NULL, 'procedural'),
  ('Grout goes into the joints before the setting mortar has cured.',
   'Set a spare tile on a scrap with the same mortar and break it loose at the cure time to check hardness.', 'detection', 5, NULL),
  ('Joints are grouted over hardened mortar squeeze-up left in the bottom.',
   'Drag a grout saw the full length of every joint and feel for the resistance that means mortar is still in there.', 'detection', 4, NULL),
  ('Grout is packed into joints that still hold cutting and raking dust.',
   'Vacuum pass required after raking and before grout is mixed.', 'prevention', NULL, 'procedural'),
  ('Grout bridges the perimeter and movement joints.',
   'Perimeter and movement joints taped off before grouting starts, so the float cannot fill them.', 'prevention', NULL, 'mistake_proof'),
  ('Grout bridges the perimeter and movement joints.',
   'Check the perimeter and every movement joint before the grout reaches initial set.', 'detection', 4, NULL),
  ('Joints are filled at the surface with voids left underneath.',
   'Pack across the joint on the diagonal in two directions before striking off.', 'prevention', NULL, 'procedural'),
  ('Joints are filled at the surface with voids left underneath.',
   'Press a joint with a fingertip before washing: a void gives way under light pressure.', 'detection', 5, NULL),
  ('Grout is left to harden on the tile faces before it is washed.',
   'Section size set so packing and washing both finish inside the working time on the bag.', 'prevention', NULL, 'procedural'),
  ('Washing pulls cement out of the joints and leaves the color blotchy.',
   'Two buckets, one rinse and one clean, both changed at the first sign of clouding, with the sponge wrung nearly dry.', 'prevention', NULL, 'procedural'),
  ('Washing pulls cement out of the joints and leaves the color blotchy.',
   'Look down the joint line in raking light before moving to the next section.', 'detection', 4, NULL),
  ('Sealer is applied over grout that is still damp in the joint.',
   'Sealing date set from the grout data sheet at the moment grouting finishes.', 'prevention', NULL, 'procedural'),
  ('Sealer is applied over grout that is still damp in the joint.',
   'Tape a plastic square over a joint overnight and look for condensation underneath.', 'detection', 4, NULL),
  ('Sealer is spread thin across tile and joints rather than run into the joint.',
   'Applicator bottle run down each joint rather than a cloth over the field.', 'prevention', NULL, 'procedural'),
  ('Sealer is spread thin across tile and joints rather than run into the joint.',
   'Drop water on a joint after the cure and watch whether it beads or soaks in.', 'detection', 3, NULL),
  ('Sealer dries as a film on the tile faces.',
   'Work in sections small enough to wipe the faces inside the dwell time on the bottle.', 'prevention', NULL, 'procedural'),
  ('Sealer dries as a film on the tile faces.',
   'Look across the tile at a low angle after wiping: film shows as streaks in reflected light.', 'detection', 3, NULL);

  -- Controls attach to the failure mode. Where the step has exactly one cause, the control is
  -- also linked to that cause so the Key Characteristic test can read prevention strength
  -- against the cause it applies to.
  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT
    fm.id,
    (
      SELECT c.id FROM public.pfmea_potential_causes c
      WHERE c.failure_mode_id = fm.id
        AND (
          SELECT count(*) FROM public.pfmea_potential_causes c2
          WHERE c2.failure_mode_id = fm.id
        ) = 1
    ),
    t.control_description, t.control_type, t.detection, t.strength
  FROM ctrl_src t
  JOIN public.pfmea_failure_modes fm ON fm.failure_mode = t.failure_mode
  WHERE fm.operation_step_id IN (SELECT step_id FROM owned_steps);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> (SELECT count(*) FROM ctrl_src) THEN
    RAISE EXCEPTION 'Controls did not all resolve a failure mode (% of % inserted).', v_count, (SELECT count(*) FROM ctrl_src);
  END IF;

  -- ---------------------------------------------------------------------------
  -- Action items for the lines that land High on the seeded Action Priority table (severity 7
  -- or higher with occurrence 4 or higher). The table is deliberately built so another
  -- inspection does not move a High, so each action changes the method or removes the chance to
  -- get it wrong rather than adding a check.
  -- ---------------------------------------------------------------------------
  CREATE TEMP TABLE action_src (failure_mode text, recommended_action text) ON COMMIT DROP;
  INSERT INTO action_src VALUES
  ('Mortar is spread over dust, old adhesive, or sealer that later releases from the substrate.',
   'Make the vacuum and water bead test a gate in the step instructions: no mortar is mixed until both are done and the result is recorded.'),
  ('Tile is set over a substrate whose flatness was never measured.',
   'Put the straightedge and the recorded measurement in the tool and output list for the first step, so the measurement exists before tile is ordered for a given size.'),
  ('Mortar is thinned past the printed water ratio to make it spread more easily.',
   'Instruct measuring water first and marking the bucket, which removes the judgment call that produces a wet mix.'),
  ('The membrane is placed into mortar that has already skinned over.',
   'Change the method to comb one sheet width at a time rather than an open area, so open time cannot be outrun.'),
  ('Air pockets and dry spots leave the membrane unanchored in places.',
   'Require a beating block or trowel face for embedment and a first-sheet corner lift, so contact is produced by the method rather than by feel.'),
  ('Panels are butted tight to each other and to the walls with no gap left.',
   'Call out a 1/4 in shim at the wall as a required item, which makes closing the perimeter gap impossible rather than discouraged.'),
  ('Layout is started off a wall that is neither straight nor square.',
   'Change the sequence so the square check and a full dry-laid first course happen before any line is snapped.'),
  ('Mortar is used past its pot life or retempered with water to keep it workable.',
   'Set batch size from the pot life and the area rate in the step instructions instead of leaving batch size to the mixer.'),
  ('Tile is set onto mortar ridges that never collapse into full contact.',
   'Name the notch size for the tile size and require a lifted tile at the first 10 sq ft, before the pattern of the whole floor is set by a wrong trowel.'),
  ('Adjacent tile edges sit proud of each other beyond the lippage tolerance.',
   'Make leveling clips the default spacing system for tile 15 in or longer, since they hold the plane through cure instead of relying on a check.'),
  ('The inspection happens after the mortar has set, so nothing it finds can be acted on.',
   'Move the inspection into the setting operation with its own step and time budget, which is what makes the window real rather than optional.'),
  ('A tile found low or hollow is left in place rather than lifted and re-bedded.',
   'Instruct keeping mortar mixed through the inspection and state that re-bedding is expected, so lifting a tile is part of the job rather than a setback.'),
  ('Grout goes into the joints before the setting mortar has cured.',
   'Keep the cure as its own zero-worker step with the end time recorded, so grouting cannot start on a schedule the mortar did not agree to.'),
  ('Grout bridges the perimeter and movement joints.',
   'Require taping off the perimeter and movement joints before grout is mixed, which removes the chance to fill them.');

  INSERT INTO public.pfmea_action_items (failure_mode_id, recommended_action, status)
  SELECT fm.id, a.recommended_action, 'not_started'
  FROM action_src a
  JOIN public.pfmea_failure_modes fm ON fm.failure_mode = a.failure_mode
  WHERE fm.operation_step_id IN (SELECT step_id FROM owned_steps);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> (SELECT count(*) FROM action_src) THEN
    RAISE EXCEPTION 'Action items did not all resolve a failure mode (% of % inserted).', v_count, (SELECT count(*) FROM action_src);
  END IF;

  RAISE NOTICE 'Tile Flooring Installation step 9 PFMEA applied for project %', v_project_id;
END
$migration$;


-- ===========================================================================================
-- Step 10 - catalog copy
-- Source: supabase/migrations/20260917110900_tile_flooring_step10_catalog_copy.sql
-- ===========================================================================================
-- Step 10 (catalog copy): Tile Flooring Installation description and project challenges.
--
-- description says what the work is and what it achieves. project_challenges is a decision tool:
-- a neutral read on the hardest parts so someone can judge fit before starting. It names the two
-- things that cannot be fixed after the fact and the wait that takes the room out of service,
-- without selling the project or talking anyone out of it.
--
-- Both fields are held to 200 characters, checked here rather than assumed.

DO $migration$
DECLARE
  v_project_id uuid;
  v_nroots integer;
  v_description CONSTANT text :=
    'Install ceramic, porcelain, or stone floor tile over a prepared subfloor: underlayment, layout, setting to a flat plane inside lippage limits, then grout, cure, and seal.';
  v_challenges CONSTANT text :=
    'Flatness and mortar coverage are decided before the tile is down and cannot be corrected after cure. Two cure waits keep the room out of service for days, and cuts are slow, wet work.';
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

  IF length(v_description) > 200 OR length(v_challenges) > 200 THEN
    RAISE EXCEPTION 'Catalog copy exceeds 200 characters (description %, challenges %).',
      length(v_description), length(v_challenges);
  END IF;

  UPDATE public.projects
  SET description = v_description,
      project_challenges = v_challenges,
      updated_at = now()
  WHERE id = v_project_id;

  RAISE NOTICE 'Tile Flooring Installation step 10 catalog copy applied for project %', v_project_id;
END
$migration$;


-- ===========================================================================================
-- Content audit
-- Source: supabase/migrations/20260917111000_tile_flooring_content_audit.sql
-- ===========================================================================================
-- Content audit: Tile Flooring Installation owned steps.
--
-- The build-out migrations each verify their own row counts, but nothing proved the result is
-- content-complete as the shared standard defines it (see cross-cutting content-completeness).
-- This runs the check and raises with the full gap list rather than leaving a project that looks
-- finished in the admin UI and is not.
--
-- It asserts, per owned step: three instruction levels, at least one output, at least one
-- process variable, at least one tool, all three time estimates, and an authored materials array.
-- Materials may be empty because a cure step consumes nothing, but the array has to exist rather
-- than be null, which is the difference between "nothing needed" and "never authored".
--
-- Project level: every owned step's PFMEA requirements resolve to an output that still exists,
-- and the register carries a component and three scores on every row.

DO $migration$
DECLARE
  v_project_id uuid;
  v_nroots integer;
  v_gaps text[] := ARRAY[]::text[];
  v_row record;
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
    ORDER BY pp.display_order, po.display_order, os.display_order
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

  -- A requirement that points at a removed output would render as an unresolvable risk item.
  FOR v_row IN
    SELECT os.step_title, req.output_id
    FROM public.pfmea_requirements req
    JOIN public.operation_steps os ON os.id = req.operation_step_id
    WHERE req.project_id = v_project_id
      AND req.output_id IS NOT NULL
      AND jsonb_typeof(os.outputs::jsonb) = 'array'
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(os.outputs::jsonb) AS o
        WHERE o->>'id' = req.output_id
      )
  LOOP
    v_gaps := array_append(v_gaps, format('%s: PFMEA requirement points at missing output %s', v_row.step_title, v_row.output_id));
  END LOOP;

  -- Register rows with no component or an incomplete score set are reported as unscored in the
  -- Risk Radar, which is the same as not being authored. Only rows tied to an owned step are
  -- enforced here; anything else in the register may have come from a source this project must
  -- not edit, so it is reported as a notice instead of failing the deploy.
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
      RAISE NOTICE 'Register risk "%" is unclassified and is not tied to an owned step, so it is reported rather than enforced here.', v_row.risk_title;
    END IF;
  END LOOP;

  IF array_length(v_gaps, 1) IS NOT NULL THEN
    RAISE EXCEPTION E'Tile Flooring Installation is not content-complete:\n  %', array_to_string(v_gaps, E'\n  ');
  END IF;

  RAISE NOTICE 'Tile Flooring Installation content audit passed for project %', v_project_id;
END
$migration$;
