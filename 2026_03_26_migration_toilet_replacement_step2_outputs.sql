-- Step 2 of project development: Outputs for each step
-- Project: Toilet Replacement
-- Project ID: f46b9b02-de31-42e0-ab04-5409ed1f21ee
--
-- Constraint: output name <= 50 chars (prefer < 30)
-- Storage: public.operation_steps.outputs (JSONB)

DO $$
DECLARE
  v_project_id CONSTANT uuid := 'f46b9b02-de31-42e0-ab04-5409ed1f21ee'::uuid;
  v_step_count integer;
BEGIN
  -- Verify steps exist for this project (fail loud, no silent defaults)
  SELECT COUNT(*)
  INTO v_step_count
  FROM public.operation_steps os
  JOIN public.phase_operations po ON os.operation_id = po.id
  JOIN public.project_phases pp ON po.phase_id = pp.id
  WHERE pp.project_id = v_project_id;

  IF v_step_count = 0 THEN
    RAISE EXCEPTION 'No operation_steps found for project_id=% (expected Toilet Replacement steps).', v_project_id;
  END IF;

  -- ============================
  -- Removal → Shut off & disconnect
  -- ============================

  UPDATE public.operation_steps
  SET outputs = jsonb_build_array(
    jsonb_build_object(
      'id', 'out-prep-verified-shutoff',
      'name', 'Water isolated',
      'description', 'Work area is protected and the toilet water supply is isolated so the tank does not refill.',
      'type', 'safety',
      'qualityChecks', 'After closing the shutoff, the tank does not refill while you wait 2 minutes.'
    )
  )
  WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e1'::uuid;

  UPDATE public.operation_steps
  SET outputs = jsonb_build_array(
    jsonb_build_object(
      'id', 'out-toilet-drained',
      'name', 'Toilet drained',
      'description', 'Tank is empty and bowl water level is minimized for a cleaner lift.',
      'type', 'safety',
      'qualityChecks', 'Tank is empty; bowl water is low enough that lifting will not slosh out.'
    )
  )
  WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e2'::uuid;

  UPDATE public.operation_steps
  SET outputs = jsonb_build_array(
    jsonb_build_object(
      'id', 'out-supply-disconnected',
      'name', 'Supply disconnected',
      'description', 'Water line is safely disconnected with no uncontrolled leaks.',
      'type', 'safety',
      'qualityChecks', 'No dripping from the shutoff; line is free and bucket/towel caught residual water.'
    )
  )
  WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e3'::uuid;

  -- ============================
  -- Removal → Remove toilet & prep flange
  -- ============================

  UPDATE public.operation_steps
  SET outputs = jsonb_build_array(
    jsonb_build_object(
      'id', 'out-toilet-removed',
      'name', 'Toilet removed',
      'description', 'Toilet is off the flange and set down on a protected surface.',
      'type', 'safety',
      'qualityChecks', 'Toilet is stable on the floor protection; no residual water spills.'
    )
  )
  WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e4'::uuid;

  UPDATE public.operation_steps
  SET outputs = jsonb_build_array(
    jsonb_build_object(
      'id', 'out-wax-removed-drain-blocked',
      'name', 'Drain blocked',
      'description', 'Old wax removed and drain opening temporarily blocked to prevent odors/debris.',
      'type', 'safety',
      'qualityChecks', 'No loose wax remains on the flange sealing surface; drain opening is covered.'
    )
  )
  WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e5'::uuid;

  UPDATE public.operation_steps
  SET outputs = jsonb_build_array(
    jsonb_build_object(
      'id', 'out-flange-inspected',
      'name', 'Flange and floor sound',
      'description', 'Flange is solid, bolt support is intact, and the surrounding floor is stable for installation.',
      'type', 'performance-durability',
      'qualityChecks', 'Flange is solid, bolt slots are intact, and floor is stable with no rocking risk.'
    )
  )
  WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e6'::uuid;

  -- ============================
  -- Installation → Set the toilet
  -- ============================

  UPDATE public.operation_steps
  SET outputs = jsonb_build_array(
    jsonb_build_object(
      'id', 'out-bolts-seal-ready',
      'name', 'Bolts + seal ready',
      'description', 'Closet bolts are positioned and the new seal is placed correctly for setting the toilet.',
      'type', 'performance-durability',
      'qualityChecks', 'Bolts are aligned symmetrically; seal is centered and not deformed before setting.'
    )
  )
  WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e7'::uuid;

  UPDATE public.operation_steps
  SET outputs = jsonb_build_array(
    jsonb_build_object(
      'id', 'out-toilet-set-stable',
      'name', 'Toilet set stable',
      'description', 'Toilet is seated, aligned, and secured with no rocking.',
      'type', 'performance-durability',
      'qualityChecks', 'Toilet does not rock when pressed at rim; nuts are evenly tightened.'
    )
  )
  WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e8'::uuid;

  -- ============================
  -- Installation → Reconnect & verify
  -- ============================

  UPDATE public.operation_steps
  SET outputs = jsonb_build_array(
    jsonb_build_object(
      'id', 'out-water-restored',
      'name', 'Water restored',
      'description', 'Supply is connected and tank refills normally without leaks.',
      'type', 'safety',
      'qualityChecks', 'No leaks at shutoff, supply connection, or tank connection during refill.'
    )
  )
  WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e9'::uuid;

  UPDATE public.operation_steps
  SET outputs = jsonb_build_array(
    jsonb_build_object(
      'id', 'out-leak-free-verified',
      'name', 'Leak-free installation',
      'description', 'Toilet flushes normally and remains leak-free at the base and supply connections.',
      'type', 'performance-durability',
      'qualityChecks', 'No moisture at base perimeter after 3 flushes; no seepage at supply joints.'
    )
  )
  WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21ea'::uuid;

  -- Refresh project cached phases JSON
  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(v_project_id)
  WHERE id = v_project_id;
END $$;

