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
  v_op_membrane uuid;
  v_op_backer uuid;
  v_op_install uuid;
  v_op_grout uuid;
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
  WHERE os.operation_id IN (v_op_membrane, v_op_backer, v_op_install, v_op_grout)
    AND lower(btrim(os.step_title)) = lower(btrim(v.step_title));

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 17 THEN
    RAISE EXCEPTION 'Expected 17 owned steps to receive materials, updated %.', v_updated;
  END IF;

  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(v_project_id),
      updated_at = now()
  WHERE id = v_project_id;

  RAISE NOTICE 'Tile Flooring Installation step 6 materials applied for project %', v_project_id;
END
$migration$;
