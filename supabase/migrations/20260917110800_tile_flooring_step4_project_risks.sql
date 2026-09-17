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
