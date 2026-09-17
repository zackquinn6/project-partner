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
  v_op_membrane uuid;
  v_op_backer uuid;
  v_op_install uuid;
  v_op_grout uuid;
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
  -- Owned operations
  -- ---------------------------------------------------------------------------
  SELECT po.id INTO v_op_membrane FROM public.phase_operations po
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id AND pp.is_standard IS NOT TRUE AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL AND pp.source_project_id IS NULL
    AND lower(btrim(po.operation_name)) = 'install uncoupling membrane';

  SELECT po.id INTO v_op_backer FROM public.phase_operations po
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id AND pp.is_standard IS NOT TRUE AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL AND pp.source_project_id IS NULL
    AND lower(btrim(po.operation_name)) = 'install cement backer board';

  SELECT po.id INTO v_op_install FROM public.phase_operations po
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id AND pp.is_standard IS NOT TRUE AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL AND pp.source_project_id IS NULL
    AND lower(btrim(po.operation_name)) = 'install floor tile';

  SELECT po.id INTO v_op_grout FROM public.phase_operations po
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id AND pp.is_standard IS NOT TRUE AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL AND pp.source_project_id IS NULL
    AND lower(btrim(po.operation_name)) = 'grout and cure';

  IF v_op_membrane IS NULL OR v_op_backer IS NULL OR v_op_install IS NULL OR v_op_grout IS NULL THEN
    RAISE EXCEPTION 'Owned operations did not resolve (membrane=%, backer=%, install=%, grout=%).',
      v_op_membrane, v_op_backer, v_op_install, v_op_grout;
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
  WHERE os.operation_id IN (v_op_membrane, v_op_backer, v_op_install, v_op_grout)
    AND lower(btrim(os.step_title)) = lower(btrim(v.step_title));

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 17 THEN
    RAISE EXCEPTION 'Expected 17 owned steps to receive tools, updated %.', v_updated;
  END IF;

  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(v_project_id),
      updated_at = now()
  WHERE id = v_project_id;

  RAISE NOTICE 'Tile Flooring Installation step 5 tools applied for project %', v_project_id;
END
$migration$;
