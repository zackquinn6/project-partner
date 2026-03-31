-- Step 3 of project development: Project Risks (timeline/budget focused)
-- Project: Toilet Replacement
-- Project ID: f46b9b02-de31-42e0-ab04-5409ed1f21ee
--
-- IMPORTANT (per planning rules):
-- - Focus on risks that affect timeline or budget.
-- - Do not focus on quality risks here (PFMEA covers quality).
-- - No silent fallbacks; fail if project not found.

DO $$
DECLARE
  v_project_id CONSTANT uuid := 'f46b9b02-de31-42e0-ab04-5409ed1f21ee'::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = v_project_id) THEN
    RAISE EXCEPTION 'Project not found: %', v_project_id;
  END IF;

  -- Risk 1: Shutoff valve doesn't fully close (requires replacement / main shutoff)
  INSERT INTO public.project_risks (
    id,
    project_id,
    display_order,
    risk_title,
    risk_description,
    likelihood,
    severity,
    schedule_impact_low_days,
    schedule_impact_high_days,
    budget_impact_low,
    budget_impact_high,
    mitigation_strategy,
    mitigation_actions,
    recommendation,
    benefit
  ) VALUES (
    'a2b9f7a2-3d2d-4a9d-9ad9-3d1f8c5f2b1a'::uuid,
    v_project_id,
    1,
    'Shutoff valve won’t close',
    'The toilet angle stop does not fully stop flow, forcing a same-day valve replacement or main water shutoff coordination.',
    'high',
    'high',
    0,
    1,
    15,
    120,
    'Verify shutoff performance before disconnecting; if it seeps, replace the angle stop before proceeding.',
    jsonb_build_array(
      jsonb_build_object('action','Close shutoff, flush, and confirm tank does not refill for 2 minutes','benefit','Prevents an uncontrolled leak during disconnection','completed',false),
      jsonb_build_object('action','If shutoff seeps, replace angle stop (or isolate at branch/main) before proceeding','benefit','Avoids emergency water control and schedule slip','completed',false)
    ),
    'Make shutoff verification a hard gate before disassembly.',
    'If this occurs, disconnection can’t proceed safely and the bathroom can be down longer than planned.'
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

  -- Risk 2: Corroded closet bolts/nuts require cutting (extra trip/tools)
  INSERT INTO public.project_risks (
    id, project_id, display_order,
    risk_title, risk_description,
    likelihood, severity,
    schedule_impact_low_days, schedule_impact_high_days,
    budget_impact_low, budget_impact_high,
    mitigation_strategy, mitigation_actions,
    recommendation, benefit
  ) VALUES (
    '4d6c1d5e-2c85-4a0b-8a4b-7a74f9b0b0b2'::uuid,
    v_project_id,
    2,
    'Seized closet hardware',
    'Old closet bolt nuts are seized/corroded and require cutting or specialty removal, adding time and possibly a store run.',
    'medium',
    'medium',
    0,
    1,
    0,
    60,
    'Plan for seized hardware: have a safe cutting option available and protect finished surfaces.',
    jsonb_build_array(
      jsonb_build_object('action','Have a non-destructive cutting approach available before attempting removal','benefit','Avoids stripping hardware and delays','completed',false),
      jsonb_build_object('action','Protect flooring around bolts before cutting/removal','benefit','Avoids accidental damage that adds cost/time','completed',false)
    ),
    'Treat “hardware won’t move” as expected, not exceptional; plan removal approach.',
    'If this occurs, removal can stall and the bathroom may remain unusable until hardware is resolved.'
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

  -- Risk 3: Flange is cracked/loose and requires repair
  INSERT INTO public.project_risks (
    id, project_id, display_order,
    risk_title, risk_description,
    likelihood, severity,
    schedule_impact_low_days, schedule_impact_high_days,
    budget_impact_low, budget_impact_high,
    mitigation_strategy, mitigation_actions,
    recommendation, benefit
  ) VALUES (
    'b2f1a4c9-9ad8-4f29-9c86-5e2c9f7f5d10'::uuid,
    v_project_id,
    3,
    'Damaged toilet flange',
    'The flange is cracked, loose, or at the wrong height and requires repair/replacement before the new toilet can be set.',
    'medium',
    'high',
    0,
    2,
    20,
    250,
    'Inspect flange condition immediately after removal; pause installation until the flange/support issue is corrected.',
    jsonb_build_array(
      jsonb_build_object('action','After wax removal, check flange rigidity and bolt-slot integrity','benefit','Detects repair need before setting new toilet','completed',false),
      jsonb_build_object('action','If flange is loose/cracked, repair/replace before proceeding','benefit','Prevents rework and avoids extended downtime','completed',false)
    ),
    'Do not proceed to “set toilet” until flange is structurally sound.',
    'If this occurs, installation cannot be completed same-session without repair parts/skills.'
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

  -- Risk 4: Subfloor is soft/rotted around flange (requires carpentry/patch)
  INSERT INTO public.project_risks (
    id, project_id, display_order,
    risk_title, risk_description,
    likelihood, severity,
    schedule_impact_low_days, schedule_impact_high_days,
    budget_impact_low, budget_impact_high,
    mitigation_strategy, mitigation_actions,
    recommendation, benefit
  ) VALUES (
    '8d7b2d3c-4c55-4c3f-8e8d-8b2d1f0c7a22'::uuid,
    v_project_id,
    4,
    'Soft subfloor at flange',
    'Water damage has softened the subfloor around the toilet, requiring reinforcement/patch before reinstall.',
    'low',
    'high',
    1,
    4,
    50,
    600,
    'Probe/assess floor stiffness after removal; if soft, plan a repair scope before reinstalling.',
    jsonb_build_array(
      jsonb_build_object('action','Press/probe the floor around flange for softness/deflection','benefit','Identifies hidden repair scope early','completed',false),
      jsonb_build_object('action','If soft, pause install and define repair plan + materials list','benefit','Prevents partial reinstall then teardown','completed',false)
    ),
    'Treat floor stability as a prerequisite to reinstall to avoid schedule blowups.',
    'If this occurs, the job expands beyond a swap and may require additional materials, tools, and drying time.'
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

  -- Risk 5: Supply line/connection mismatch causes extra trip
  INSERT INTO public.project_risks (
    id, project_id, display_order,
    risk_title, risk_description,
    likelihood, severity,
    schedule_impact_low_days, schedule_impact_high_days,
    budget_impact_low, budget_impact_high,
    mitigation_strategy, mitigation_actions,
    recommendation, benefit
  ) VALUES (
    '0c5a7b8d-6b3a-4f2f-9b31-1f3b8d2a4c90'::uuid,
    v_project_id,
    5,
    'Supply connection mismatch',
    'Existing supply line length or thread size doesn’t fit the new fill valve or shutoff, requiring a replacement line or adapter.',
    'medium',
    'medium',
    0,
    1,
    10,
    50,
    'Verify connection types/clearances before reinstall; have a compatible replacement supply line ready.',
    jsonb_build_array(
      jsonb_build_object('action','Before final set, confirm supply line reach + connection compatibility','benefit','Prevents “stuck without parts” downtime','completed',false),
      jsonb_build_object('action','Have a replacement supply line available if compatibility is uncertain','benefit','Avoids store run mid-install','completed',false)
    ),
    'Plan compatibility checks as part of reinstall prep.',
    'If this occurs, the toilet can’t be returned to service until the correct parts are on hand.'
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

  -- Risk 6: Toilet fails after reinstall due to leak discovery (rework window)
  INSERT INTO public.project_risks (
    id, project_id, display_order,
    risk_title, risk_description,
    likelihood, severity,
    schedule_impact_low_days, schedule_impact_high_days,
    budget_impact_low, budget_impact_high,
    mitigation_strategy, mitigation_actions,
    recommendation, benefit
  ) VALUES (
    '5b9d2f0a-8b3a-4b5d-9f7c-1c0a2b3d4e5f'::uuid,
    v_project_id,
    6,
    'Base leak found during testing',
    'A leak is discovered during flush testing, forcing reseat with a new seal and additional downtime.',
    'low',
    'high',
    0,
    1,
    10,
    80,
    'Treat leak testing as a required gate before declaring the bathroom back in service; keep a spare seal available.',
    jsonb_build_array(
      jsonb_build_object('action','Run multiple flush cycles and check base perimeter + joints','benefit','Catches leaks before they cause damage','completed',false),
      jsonb_build_object('action','If toilet must be lifted after setting, replace seal before reseat','benefit','Reduces repeat rework','completed',false)
    ),
    'Require a formal “leak-free verified” check before closing the job.',
    'If this occurs, the reinstall step repeats and can extend bathroom downtime into the next day.'
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

  -- Risk 7: Bathroom downtime constraints (shared bathroom / access scheduling)
  INSERT INTO public.project_risks (
    id, project_id, display_order,
    risk_title, risk_description,
    likelihood, severity,
    schedule_impact_low_days, schedule_impact_high_days,
    budget_impact_low, budget_impact_high,
    mitigation_strategy, mitigation_actions,
    recommendation, benefit
  ) VALUES (
    '9a1c2d3e-4f50-4a61-8b72-3c4d5e6f7a80'::uuid,
    v_project_id,
    7,
    'Bathroom downtime constraint',
    'Work window is constrained (shared bathroom / occupant schedule), increasing the chance the install is split across days.',
    'medium',
    'medium',
    0,
    2,
    0,
    200,
    'Plan a single-session cutover window and pre-stage parts to avoid mid-job interruptions.',
    jsonb_build_array(
      jsonb_build_object('action','Pre-stage all parts and tools before shutting off water','benefit','Minimizes time the toilet is out of service','completed',false),
      jsonb_build_object('action','Schedule a protected work block that covers removal through leak testing','benefit','Reduces split-day risk and additional labor','completed',false)
    ),
    'Treat “toilet out of service” as a critical path constraint.',
    'If this occurs, the project schedule may expand even if no technical issues arise.'
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

  -- Risk 8: Disposal/transport complication (stairs, heavy lift, haul)
  INSERT INTO public.project_risks (
    id, project_id, display_order,
    risk_title, risk_description,
    likelihood, severity,
    schedule_impact_low_days, schedule_impact_high_days,
    budget_impact_low, budget_impact_high,
    mitigation_strategy, mitigation_actions,
    recommendation, benefit
  ) VALUES (
    '2f3e4d5c-6b7a-4890-9c1d-2e3f4a5b6c7d'::uuid,
    v_project_id,
    8,
    'Disposal/haul delays',
    'Old toilet disposal or transport (stairs/vehicle/haul rules) adds time or requires a disposal fee.',
    'low',
    'low',
    0,
    1,
    0,
    75,
    'Plan disposal before removal (bagging, vehicle space, drop-off rules/fees).',
    jsonb_build_array(
      jsonb_build_object('action','Confirm disposal plan and fee rules before day-of work','benefit','Prevents end-of-day delay','completed',false),
      jsonb_build_object('action','Stage a protected path for carrying the toilet out','benefit','Reduces handling time and accidental mess','completed',false)
    ),
    'Include disposal in the plan to avoid last-step delays.',
    'If this occurs, closeout can extend and increase total labor time.'
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
END $$;

