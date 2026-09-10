-- Step 4: Project risks (timeline/budget) — Tile Flooring Installation
-- Root id: 373adcbf-0a8c-42e9-9bcb-b135c8ddbfd0
-- Quality risks → Step 9 PFMEA. Out-of-scope work (demo, self-leveler, fixtures, trim) is linked,
-- not owned here — risks below are about the tile core path and coordination delays only.

DO $$
DECLARE
  v_project_id CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-b135c8ddbfd0'::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = v_project_id AND p.parent_project_id IS NULL) THEN
    RAISE EXCEPTION 'Tile Flooring Installation root not found: %', v_project_id;
  END IF;

  INSERT INTO public.project_risks (
    id, project_id, display_order,
    risk_title, risk_description,
    likelihood, severity,
    schedule_impact_low_days, schedule_impact_high_days,
    budget_impact_low, budget_impact_high,
    mitigation_strategy, mitigation_actions,
    recommendation, benefit
  ) VALUES
  (
    '373adcbf-0a8c-42e9-9bcb-a4b400000001'::uuid,
    v_project_id, 1,
    'Substrate not flat enough for chosen tile',
    'Flatness or deflection fails manufacturer limits after inspection, forcing self-leveler or subfloor work before setting.',
    'high', 'high',
    1, 4,
    150, 1200,
    'Measure flatness early; if out of tolerance, schedule linked Self-Leveler / Subfloor projects before membrane or backer.',
    jsonb_build_array(
      jsonb_build_object('action','Straightedge and document highs/lows against tile + membrane data sheets before buying thinset volume','benefit','Avoids mid-install stop and wasted mortar','completed',false),
      jsonb_build_object('action','If out of tolerance, incorporate Self-Leveler Application rather than improvising in this template','benefit','Keeps scope clear and uses the dedicated leveling playbook','completed',false)
    ),
    'Gate layout/mortar until the plane meets product limits.',
    'If ignored, tile bond and lippage fail and rework eats days and materials.'
  ),
  (
    '373adcbf-0a8c-42e9-9bcb-a4b400000002'::uuid,
    v_project_id, 2,
    'Wrong underlayment path chosen mid-job',
    'Switching between uncoupling membrane and cement backer after materials are on site adds trips and idle labor.',
    'medium', 'medium',
    0, 2,
    50, 400,
    'Decide membrane vs backer from substrate type and manufacturer before Prep starts; treat the other path as alternate only.',
    jsonb_build_array(
      jsonb_build_object('action','Confirm substrate category and deflection before ordering membrane or backer','benefit','Prevents double material spend','completed',false)
    ),
    'Lock the underlayment path in planning; do not invent a third hybrid system on site.',
    'Path changes mid-Prep burn schedule and inventory.'
  ),
  (
    '373adcbf-0a8c-42e9-9bcb-a4b400000003'::uuid,
    v_project_id, 3,
    'Mortar open time / coverage failure forces reset',
    'Thinset skins over or coverage fails spot-checks, requiring lift-and-reset of freshly set tile.',
    'medium', 'high',
    0, 2,
    75, 600,
    'Work in small fields sized to open time; lift sample tiles early and adjust trowel/mix before continuing.',
    jsonb_build_array(
      jsonb_build_object('action','Limit spread area to open-time windows for temperature and humidity','benefit','Reduces skin-over resets','completed',false),
      jsonb_build_object('action','Spot-check coverage after first few tiles each session','benefit','Catches trowel/mix errors before a whole row fails','completed',false)
    ),
    'Treat coverage checks as a hard gate, not optional.',
    'Resetting bonded tile costs time, tiles, and mortar.'
  ),
  (
    '373adcbf-0a8c-42e9-9bcb-a4b400000004'::uuid,
    v_project_id, 4,
    'Grout started before mortar cure',
    'Grouting too early shifts tiles or weakens joints, forcing tear-out of fresh grout and possible tile reset.',
    'medium', 'high',
    1, 3,
    40, 500,
    'Follow mortar cure minimums and protect traffic; do not start grout prep until cure is verified.',
    jsonb_build_array(
      jsonb_build_object('action','Record set completion time and manufacturer cure hours before joint prep','benefit','Prevents premature grout and lippage creep','completed',false)
    ),
    'Cure clock is a schedule gate — plan idle days explicitly.',
    'Early grout can force multi-day rework.'
  ),
  (
    '373adcbf-0a8c-42e9-9bcb-a4b400000005'::uuid,
    v_project_id, 5,
    'Related demo / fixture / trim work not sequenced',
    'Needed demo, dishwasher, toilet, or baseboard work was assumed “in this project” but lives in linked templates, causing idle waits or double booking.',
    'high', 'medium',
    1, 5,
    0, 300,
    'Treat linked phases (demo, self-leveler, fixtures, baseboard, caulk) as separate projects on the schedule; do not invent duplicate steps here.',
    jsonb_build_array(
      jsonb_build_object('action','List which linked projects are in-scope for this house before ordering tile','benefit','Honest schedule and material buys','completed',false),
      jsonb_build_object('action','Schedule Tile Flooring Demolition and Self-Leveler before Prepare subfloor when required','benefit','Avoids starting Prep on an unready substrate','completed',false)
    ),
    'Keep related work linked — never copy those playbooks into this template.',
    'Unplanned related work is the most common multi-day slip on tile floors.'
  )
  ON CONFLICT (id) DO UPDATE SET
    project_id = EXCLUDED.project_id,
    display_order = EXCLUDED.display_order,
    risk_title = EXCLUDED.risk_title,
    risk_description = EXCLUDED.risk_description,
    likelihood = EXCLUDED.likelihood,
    severity = EXCLUDED.severity,
    schedule_impact_low_days = EXCLUDED.schedule_impact_low_days,
    schedule_impact_high_days = EXCLUDED.schedule_impact_high_days,
    budget_impact_low = EXCLUDED.budget_impact_low,
    budget_impact_high = EXCLUDED.budget_impact_high,
    mitigation_strategy = EXCLUDED.mitigation_strategy,
    mitigation_actions = EXCLUDED.mitigation_actions,
    recommendation = EXCLUDED.recommendation,
    benefit = EXCLUDED.benefit;

  RAISE NOTICE 'Tile Flooring Installation step 4 risks applied for %', v_project_id;
END $$;
