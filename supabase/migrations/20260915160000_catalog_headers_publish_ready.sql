-- Catalog header fill for production publish validation + DIY materials budget/timeline hints.
-- Scope: root projects only (parent_project_id IS NULL). Does not change publish_status / visibility.
-- Assumptions: budgets are DIY materials (tile/setting/underlayment or fixture + consumables), not pro labor.
-- Tile priority set uses researched mid DIY ranges (2025-2026 material guides).

DO $$
DECLARE
  v_id uuid;
  v_cnt int;
BEGIN
  -- ---------- Tile Flooring Installation (accuracy priority) ----------
  -- Materials DIY ~$12-18/sq ft mid ceramic/porcelain + thinset/grout/membrane; typical main bath ~75 sq ft.
  -- ~0.25 hr/sq ft DIY all-in set work => ~19 hr productive; ~3 calendar days with cures.
  SELECT COUNT(DISTINCT id) INTO v_cnt
  FROM public.projects
  WHERE parent_project_id IS NULL
    AND lower(btrim(name)) IN ('tile flooring installation', 'tile flooring');
  IF v_cnt <> 1 THEN
    RAISE EXCEPTION 'Tile Flooring Installation root: expected 1, found %. Check: SELECT id, name FROM projects WHERE parent_project_id IS NULL AND lower(name) LIKE ''%%tile flooring%%'';', v_cnt;
  END IF;
  SELECT id INTO v_id
  FROM public.projects
  WHERE parent_project_id IS NULL
    AND lower(btrim(name)) IN ('tile flooring installation', 'tile flooring')
  LIMIT 1;
  UPDATE public.projects SET
    description = 'Prep, set, and grout ceramic or porcelain floor tile over a flat, stable substrate for a durable kitchen or bath floor.',
    project_challenges = 'Heavy lifting and long periods on knees, multi-step substrate prep, and controlling lippage across large tiles. Flatness and layout mistakes are hard to hide once set.',
    category = ARRAY['Tile','Flooring','Bathroom','Kitchen']::text[],
    effort_level = 'High',
    skill_level = 'Intermediate',
    scaling_unit = 'per square feet',
    typical_project_size = 75,
    estimated_time = '0.25 hours',
    estimated_total_time = '19 hours (about 3 calendar days with cure waits)',
    budget_per_unit = '15',
    budget_per_typical_size = '1125',
    estimated_cost = '$900-1500 materials DIY for a typical 75 sq ft bath/kitchen floor',
    item_type = NULL,
    updated_at = now()
  WHERE id = v_id;

  -- ---------- Tile Backsplash Installation (accuracy priority) ----------
  -- Wall work with more cuts; typical kitchen run ~30 sq ft; materials ~$12-25/sq ft DIY decorative.
  SELECT COUNT(DISTINCT id) INTO v_cnt
  FROM public.projects
  WHERE parent_project_id IS NULL
    AND lower(btrim(name)) IN ('tile backsplash installation', 'tile backsplash');
  IF v_cnt <> 1 THEN
    RAISE EXCEPTION 'Tile Backsplash Installation root: expected 1, found %', v_cnt;
  END IF;
  SELECT id INTO v_id
  FROM public.projects
  WHERE parent_project_id IS NULL
    AND lower(btrim(name)) IN ('tile backsplash installation', 'tile backsplash')
  LIMIT 1;
  UPDATE public.projects SET
    description = 'Lay out, set with thinset, and grout a kitchen backsplash with clean cuts at outlets and caulked changes of plane.',
    project_challenges = 'Outlet and cabinet cuts stay visible at eye level; layout balance and thinset coverage decide voids and lippage. Change-of-plane caulk fails if tiles are forced tight into corners.',
    category = ARRAY['Tile','Kitchen']::text[],
    effort_level = 'Medium',
    skill_level = 'Intermediate',
    scaling_unit = 'per square feet',
    typical_project_size = 30,
    estimated_time = '0.45 hours',
    estimated_total_time = '14 hours (about 2 days with grout cure)',
    budget_per_unit = '18',
    budget_per_typical_size = '540',
    estimated_cost = '$450-750 materials DIY for a typical 30 sq ft kitchen backsplash',
    item_type = NULL,
    cover_image = COALESCE(NULLIF(btrim(cover_image), ''), '/project-catalog/tile-backsplash-installation.jpg'),
    updated_at = now()
  WHERE id = v_id;

  -- ---------- Tile Shower/Bath Installation (accuracy priority; create separately if missing) ----------
  -- Wet area: waterproofing + tile; typical tub surround ~60 sq ft; materials ~$20-35/sq ft DIY.
  SELECT COUNT(DISTINCT id) INTO v_cnt
  FROM public.projects
  WHERE parent_project_id IS NULL
    AND lower(btrim(name)) IN (
      'tile shower/bath installation',
      'tile shower/bath',
      'tile shower bath installation'
    );
  IF v_cnt = 0 THEN
    RAISE EXCEPTION 'Tile Shower/Bath Installation root not found. Create via create_project_with_standard_foundation first.';
  ELSIF v_cnt > 1 THEN
    RAISE EXCEPTION 'Tile Shower/Bath Installation root: expected 1, found %', v_cnt;
  END IF;
  SELECT id INTO v_id
  FROM public.projects
  WHERE parent_project_id IS NULL
    AND lower(btrim(name)) IN (
      'tile shower/bath installation',
      'tile shower/bath',
      'tile shower bath installation'
    )
  LIMIT 1;
  UPDATE public.projects SET
    description = 'Waterproof, set, and grout tile in a tub or shower surround with continuous wet-area detailing for a durable bath enclosure.',
    project_challenges = 'Waterproofing continuity at niches, corners, and the curb decides leak risk behind the wall. Slopes to drain and coverage over membrane leave little room for redo.',
    category = ARRAY['Tile','Bathroom']::text[],
    effort_level = 'High',
    skill_level = 'Advanced',
    scaling_unit = 'per square feet',
    typical_project_size = 60,
    estimated_time = '0.5 hours',
    estimated_total_time = '30 hours (about 5 calendar days with waterproofing and cure waits)',
    budget_per_unit = '25',
    budget_per_typical_size = '1500',
    estimated_cost = '$1200-2100 materials DIY for a typical 60 sq ft tub/shower surround',
    item_type = NULL,
    cover_image = COALESCE(NULLIF(btrim(cover_image), ''), '/project-catalog/tile-shower-bath.jpg'),
    updated_at = now()
  WHERE id = v_id;

END $$;

-- Remaining catalog roots: fill publish-required gaps + DIY materials budget.
DO $$
DECLARE
  r record;
  v_updated int;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      (
        'caulking application',
        'per linear feet', 50::numeric, '1 minute', '50 minutes',
        '0.40', '20', '$15-40 materials for a typical 50 lf wet-area caulk pass',
        NULL::text, NULL::text, NULL::text, NULL::text[], NULL::text, NULL::text
      ),
      (
        'ceiling fan replacement',
        'per item', 1, '2 hours', '2 hours',
        '180', '180', '$120-350 fan + mounting hardware DIY',
        'ceiling fan', NULL, NULL, NULL, NULL, NULL
      ),
      (
        'door & trim trimming',
        'per linear feet', 40, '0.25 hours', '10 hours',
        '2', '80', '$40-150 blades/consumables for typical undercut/trim pass',
        NULL, 'Medium', 'Intermediate', ARRAY['Doors & Windows','Flooring']::text[],
        'Undercutting doors and casing for new floor height without chip-out; cumulative height errors show as binding or light gaps.',
        'Trim door bottoms, casing, and toe-kicks so new flooring clears openings with clean reveals.'
      ),
      (
        'drywall repair + finishing',
        'per item', 1, '4 hours', '4 hours (plus dry times across coats)',
        '45', '45', '$25-80 materials for a typical single-patch repair',
        'repair', NULL, NULL, NULL, NULL, NULL
      ),
      (
        'electric radiant floor heat installation',
        'per square feet', 40, '0.35 hours', '14 hours (plus thinset cure before tile)',
        '18', '720', '$500-900 mats/cable + thinset materials for a typical 40 sq ft bath',
        NULL, 'Medium', 'Advanced', ARRAY['Flooring','Bathroom']::text[],
        'Ohm readings before and after embedment decide whether a nick killed the circuit under tile. Thinset voids over mats cause hot spots and cold spots.',
        'Install electric floor-heat mats or cable under tile in baths, then verify continuity before covering.'
      ),
      (
        'garbage disposal installation',
        'per item', 1, '2 hours', '2 hours',
        '160', '160', '$100-280 disposal + plumbing fittings DIY',
        'disposal', NULL, NULL, NULL, NULL, NULL
      ),
      (
        'interior door replacement',
        'per item', 1, '3 hours', '3 hours',
        '220', '220', '$120-400 slab/prehung + hardware DIY',
        'door', NULL, NULL, NULL, NULL, NULL
      ),
      (
        'interior stair refacing',
        'per item', 1, '16 hours', '16 hours (about 2-3 days with finish dry)',
        '900', '900', '$500-1800 tread/riser materials for a typical flight',
        'stair flight', NULL, NULL, NULL, NULL, NULL
      ),
      (
        'kitchen cabinet installation',
        'per item', 12, '1.5 hours', '18 hours',
        '350', '4200', 'Cabinets priced separately; $200-600 install materials/hardware for a 12-box run',
        'cabinet', NULL, NULL, NULL, NULL, NULL
      ),
      (
        'kitchen sink replacement',
        'per item', 1, '4 hours', '4 hours',
        '350', '350', '$200-700 sink + faucet fittings DIY (fixture varies widely)',
        'sink', NULL, NULL, NULL, NULL, NULL
      ),
      (
        'laminate or engineered flooring installation',
        'per square feet', 200, '0.08 hours', '16 hours',
        '4.50', '900', '$700-1400 materials DIY for a typical 200 sq ft room',
        NULL, NULL, NULL, ARRAY['Flooring']::text[], NULL,
        'Prepare a flat subfloor, rack and lock or glue laminate or engineered plank, and finish transitions.'
      ),
      (
        'light fixture replacement',
        'per item', 1, '1 hour', '1 hour',
        '80', '80', '$30-200 fixture + box hardware DIY',
        'light fixture', NULL, NULL, NULL, NULL, NULL
      ),
      (
        'outlet/switch replacement',
        'per item', 1, '0.5 hours', '0.5 hours',
        '15', '15', '$8-40 device + plate DIY',
        'device', NULL, NULL, NULL, NULL, NULL
      ),
      (
        'shiplap or accent wall installation',
        'per item', 1, '8 hours', '8 hours',
        '280', '280', '$150-500 boards/fasteners for a typical accent wall',
        'wall', NULL, NULL, NULL, NULL, NULL
      ),
      (
        'shower fixture replacement',
        'per item', 1, '2.5 hours', '2.5 hours',
        '220', '220', '$80-450 trim/cartridge kit DIY',
        'fixture', NULL, NULL, NULL, NULL, NULL
      ),
      (
        'storm door installation',
        'per item', 1, '3 hours', '3 hours',
        '320', '320', '$200-550 storm door + hardware DIY',
        'storm door', NULL, NULL, NULL, NULL, NULL
      ),
      (
        'subfloor replacement',
        'per square feet', 75, '0.2 hours', '15 hours',
        '4', '300', '$200-500 plywood/fasteners for a typical 75 sq ft bath',
        NULL, 'High', 'Advanced', ARRAY['Flooring']::text[],
        'Matching thickness and fastening schedule to joists decides bounce and tile failures later. Cutting out bad panels without damaging wiring or plumbing below is slow, exacting work.',
        'Remove damaged subfloor, sister or prep joists as needed, and install new panels flat for finish flooring.'
      ),
      (
        'toilet replacement',
        'per item', 1, '2.5 hours', '2.5 hours',
        '280', '280', '$150-450 toilet + wax/seal kit DIY',
        'toilet', NULL, NULL, NULL, NULL, NULL
      ),
      (
        'vanity replacement',
        'per item', 1, '5 hours', '5 hours',
        '450', '450', '$250-900 vanity/top + fittings DIY',
        'vanity', NULL, NULL, NULL, NULL, NULL
      ),
      (
        'wallpaper installation or removal',
        'per item', 1, '8 hours', '8 hours',
        '180', '180', '$80-350 paper/paste or stripper materials for a typical room accent',
        'room', NULL, NULL, NULL, NULL, NULL
      ),
      (
        'window installation',
        'per item', 1, '5 hours', '5 hours',
        '550', '550', 'Window unit priced separately; $80-250 flashing/seal materials DIY',
        'window', NULL, NULL, NULL, NULL, NULL
      ),
      (
        'standard foundation',
        'per item', 1, '1 hour', '1 hour',
        NULL, NULL, NULL,
        'foundation template', 'Medium', 'Intermediate', ARRAY['System','Foundation']::text[], NULL, NULL
      ),
      (
        'dishwasher replacement',
        'per item', 1, '2 hours', '2 hours',
        '450', '450', '$300-900 dishwasher + fittings DIY',
        'dishwasher', NULL, NULL, NULL, NULL, NULL
      ),
      (
        'toilet flange repair',
        'per item', 1, '2 hours', '2 hours',
        '45', '45', '$20-80 flange repair parts DIY',
        'flange', NULL, NULL, NULL, NULL, NULL
      ),
      (
        'tile flooring demolition',
        'per square feet', 75, '0.07 hours', '5 hours',
        '2', '150', '$75-250 disposal/consumables for a typical 75 sq ft demo',
        NULL, NULL, NULL, NULL, NULL, NULL
      ),
      (
        'baseboard & trim installation',
        'per linear feet', 100, '0.1 hours', '10 hours',
        '3.50', '350', '$200-500 materials for a typical 100 lf trim run',
        NULL, NULL, NULL, NULL, NULL, NULL
      ),
      (
        'interior painting',
        'per square feet', 400, '0.03 hours', '12 hours',
        '0.55', '220', '$120-350 paint/prep for a typical 400 sq ft room set',
        NULL, NULL, NULL, NULL, NULL, NULL
      ),
      (
        'interior wood staining',
        'per linear feet', 80, '0.08 hours', '6.5 hours',
        '1.25', '100', '$50-180 stain/finish for a typical 80 lf trim run',
        NULL, NULL, NULL, NULL, NULL, NULL
      ),
      (
        'self-leveler application',
        'per square feet', 75, '0.05 hours', '4 hours (plus cure before flooring)',
        '2.50', '188', '$120-280 self-leveler materials for a typical 75 sq ft pour',
        NULL, NULL, NULL, ARRAY['Flooring']::text[], NULL, NULL
      ),
      (
        'manage dust control',
        'per 10x10 room', 1, '1 hour', '1 hour',
        '35', '35', '$20-60 plastic/tape/filter materials per room setup',
        NULL, NULL, NULL, NULL, NULL, NULL
      )
    ) AS t(
      name_key, scaling_unit, typical_project_size, estimated_time, estimated_total_time,
      budget_per_unit, budget_per_typical_size, estimated_cost,
      item_type, effort_level, skill_level, category, project_challenges, description
    )
  LOOP
    UPDATE public.projects p SET
      scaling_unit = COALESCE(r.scaling_unit, p.scaling_unit),
      typical_project_size = COALESCE(r.typical_project_size, p.typical_project_size),
      estimated_time = COALESCE(r.estimated_time, p.estimated_time),
      estimated_total_time = COALESCE(r.estimated_total_time, p.estimated_total_time),
      budget_per_unit = CASE WHEN r.budget_per_unit IS NULL THEN p.budget_per_unit ELSE r.budget_per_unit END,
      budget_per_typical_size = CASE WHEN r.budget_per_typical_size IS NULL THEN p.budget_per_typical_size ELSE r.budget_per_typical_size END,
      estimated_cost = CASE WHEN r.estimated_cost IS NULL THEN p.estimated_cost ELSE r.estimated_cost END,
      item_type = CASE
        WHEN COALESCE(r.scaling_unit, p.scaling_unit) = 'per item'
          THEN COALESCE(r.item_type, p.item_type, 'item')
        ELSE NULL
      END,
      effort_level = COALESCE(r.effort_level, p.effort_level),
      skill_level = COALESCE(r.skill_level, p.skill_level),
      category = COALESCE(r.category, p.category),
      project_challenges = COALESCE(r.project_challenges, p.project_challenges),
      description = COALESCE(r.description, p.description),
      updated_at = now()
    WHERE p.parent_project_id IS NULL
      AND lower(btrim(p.name)) = r.name_key;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated = 0 AND r.name_key NOT LIKE 'framing%' THEN
      RAISE NOTICE 'No root project matched name_key=%', r.name_key;
    END IF;
  END LOOP;

  -- Framing name may use unicode hyphens
  UPDATE public.projects p SET
    scaling_unit = 'per item',
    typical_project_size = 1,
    estimated_time = '6 hours',
    estimated_total_time = '6 hours',
    budget_per_unit = '220',
    budget_per_typical_size = '220',
    estimated_cost = '$150-400 lumber/fasteners for a typical interior partition',
    item_type = COALESCE(NULLIF(btrim(p.item_type), ''), 'wall'),
    updated_at = now()
  WHERE p.parent_project_id IS NULL
    AND lower(btrim(p.name)) LIKE 'framing a non%load%bearing wall';

  -- Trim Step 10 project_challenges to <=200 chars (no em-dashes)
  UPDATE public.projects p SET project_challenges = v.chal, updated_at = now()
  FROM (VALUES
    ('baseboard & trim installation', 'Coping inside corners and scribing wavy walls decide fit; miters that open after nail-set show every rushed cut. Paint-grade stock still punishes gaps at eye level.'),
    ('ceiling fan replacement', 'Working overhead while confirming a fan-rated box (not a light box) stacks risk before blades spin. Post-install wobble erodes confidence until balance and hardware are dialed in.'),
    ('drywall repair + finishing', 'Feather width and flatness under raking light separate invisible patches from halos. Matching existing texture on the first pass is easy to get wrong.'),
    ('garbage disposal installation', 'Twist-locking a heavy motor in a blind cabinet is awkward; flange seating must stay dry before the first run. Vibration and weeps at slip joints show up minutes later.'),
    ('interior door replacement', 'Shimming out-of-square jambs decides whether the latch hits center. Strike-plate alignment after the door looked fine dry is where most frustration lands.'),
    ('interior stair refacing', 'Cumulative tread error and returning squeaks drive rework; finish coats show every sanding scratch. The first three treads are where errors compound down the run.'),
    ('kitchen cabinet installation', 'Long runs across wavy walls force shim and scribe choices before the first screw. Door and drawer gaps expose tiny layout mistakes across the whole elevation.'),
    ('kitchen sink replacement', 'Freeing the old sink without chipping the counter and rebuilding trap geometry in limited depth frustrate most swaps. Disturbed stops often weep on first pressure.'),
    ('laminate or engineered flooring installation', 'Flatness and manufacturer tolerances decide click joints and noise; stagger mistakes cannot be unseen. Last-row rips and door undercuts show tearout first.'),
    ('light fixture replacement', 'Sorting switched-leg vs hot in older boxes while holding weight overhead is tense; mistakes are not cosmetic. Canopies that will not seat usually mean pinched conductors.'),
    ('outlet/switch replacement', 'Legacy colors, multi-ways, and shared neutrals defeat assumptions; a tester still hot on the wrong breaker stalls progress. Thick tile fights device ears until extenders are planned.'),
    ('self-leveler application', 'Pour volume, priming, and working time decide ridges and voids; cold floors slow set unpredictably. Perimeter dams and spike-shoe marks show every rushed pass.'),
    ('shower fixture replacement', 'Wall-stack depth versus trim-kit stack surprises mid-job; cartridge orientation is easy to mis-seat with water off. Finish scratches from last turns are permanent.'),
    ('standard foundation', 'Wrong merge order or duplicated foundation phases break author expectations and user runs. Tracing process-map order against database IDs is the slow, exacting part.'),
    ('storm door installation', 'Brick and wood jambs rarely present a single plane; shimming the Z-bar until plumb takes patience. Sweep and strike tuning against the primary door is iterative.'),
    ('vanity replacement', 'New cabinet depth changes trap geometry behind a fixed chase; walls after demo are rarely flat. Disturbed stops weep on first pressurization even when the swap felt simple.'),
    ('window installation', 'Shim strategy on twisted openings and correct flashing order carry leak risk that shows later. Foam and screw sequence can bind operation before trim locks mistakes in.')
  ) AS v(name_key, chal)
  WHERE p.parent_project_id IS NULL AND lower(btrim(p.name)) = v.name_key;

  UPDATE public.projects SET
    project_challenges = 'Transferring plumb and square from a wavy floor to a crowned ceiling makes door openings the choke point. Small errors read as binding doors after drywall.',
    updated_at = now()
  WHERE parent_project_id IS NULL
    AND lower(btrim(name)) LIKE 'framing a non%load%bearing wall';
END $$;
