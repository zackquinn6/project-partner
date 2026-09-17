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
  v_op_membrane uuid;
  v_op_backer uuid;
  v_op_install uuid;
  v_op_grout uuid;
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

  SELECT po.id INTO v_op_membrane
  FROM public.phase_operations po
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id AND pp.is_standard IS NOT TRUE AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL AND pp.source_project_id IS NULL
    AND lower(btrim(po.operation_name)) = 'install uncoupling membrane';

  SELECT po.id INTO v_op_backer
  FROM public.phase_operations po
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id AND pp.is_standard IS NOT TRUE AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL AND pp.source_project_id IS NULL
    AND lower(btrim(po.operation_name)) = 'install cement backer board';

  SELECT po.id INTO v_op_install
  FROM public.phase_operations po
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id AND pp.is_standard IS NOT TRUE AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL AND pp.source_project_id IS NULL
    AND lower(btrim(po.operation_name)) = 'install floor tile';

  SELECT po.id INTO v_op_grout
  FROM public.phase_operations po
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id AND pp.is_standard IS NOT TRUE AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL AND pp.source_project_id IS NULL
    AND lower(btrim(po.operation_name)) = 'grout and cure';

  IF v_op_membrane IS NULL OR v_op_backer IS NULL OR v_op_install IS NULL OR v_op_grout IS NULL THEN
    RAISE EXCEPTION 'Owned operations did not resolve (membrane=%, backer=%, install=%, grout=%).',
      v_op_membrane, v_op_backer, v_op_install, v_op_grout;
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
  WHERE os.operation_id IN (v_op_membrane, v_op_backer, v_op_install, v_op_grout)
    AND lower(btrim(os.step_title)) = lower(btrim(v.step_title));

  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(v_project_id),
      updated_at = now()
  WHERE id = v_project_id;

  RAISE NOTICE 'Tile Flooring Installation step 3 outputs applied for project %', v_project_id;
END
$migration$;
