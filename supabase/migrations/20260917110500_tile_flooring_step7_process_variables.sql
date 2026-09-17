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
