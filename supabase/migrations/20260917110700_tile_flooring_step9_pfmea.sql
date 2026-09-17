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
