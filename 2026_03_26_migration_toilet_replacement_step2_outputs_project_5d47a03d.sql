-- Step 2 of project development: Outputs for each step
-- Project: Toilet Replacement
-- Project ID: 5d47a03d-df6e-4341-b61d-98090225c15d
--
-- Constraint: output name <= 50 chars (prefer < 30)
-- Storage: public.operation_steps.outputs (JSONB)

DO $$
DECLARE
  v_project_id CONSTANT uuid := '5d47a03d-df6e-4341-b61d-98090225c15d'::uuid;
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
      'name', 'Shutoff verified',
      'description', 'Floor is protected and the shutoff valve reliably stops tank refilling.',
      'type', 'safety',
      'qualityChecks', 'After closing the shutoff, the tank does not refill while you wait 2 minutes.'
    )
  )
  WHERE id = '2f9fbb53-357f-49f3-9f09-7b4a7d6a92f4'::uuid;

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
  WHERE id = 'a5c0d9f9-6c7b-4d8c-9d5b-7b2342b6c6aa'::uuid;

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
  WHERE id = 'c1b7bff0-30c8-4d3f-8e0e-70f8a8f7e5aa'::uuid;

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
  WHERE id = 'fba2316a-0110-4b9c-8a35-1e6a8c2f8c5b'::uuid;

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
  WHERE id = '6e6f2d2a-5b8d-4a76-a61a-0e7d4f5a2f31'::uuid;

  UPDATE public.operation_steps
  SET outputs = jsonb_build_array(
    jsonb_build_object(
      'id', 'out-flange-inspected',
      'name', 'Flange condition confirmed',
      'description', 'Flange is inspected and you know whether repairs are needed before install.',
      'type', 'performance-durability',
      'qualityChecks', 'Flange is solid, bolt slots are intact, and floor is stable with no rocking risk.'
    )
  )
  WHERE id = '0b5b4b30-6bd8-45c8-90e0-21de7bb01c2a'::uuid;

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
  WHERE id = 'd1db0a9d-61e2-46f2-9021-8b25ce1166a4'::uuid;

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
  WHERE id = '0b4bf2b3-3e63-4d88-b07f-186f8a20e9f4'::uuid;

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
  WHERE id = '1f3460c3-6b7f-4e33-8c0b-6e4b70a5b1d3'::uuid;

  UPDATE public.operation_steps
  SET outputs = jsonb_build_array(
    jsonb_build_object(
      'id', 'out-leak-free-verified',
      'name', 'Leak-free verified',
      'description', 'Toilet flushes normally and remains leak-free at base and supply connections.',
      'type', 'performance-durability',
      'qualityChecks', 'No moisture at base perimeter after 3 flushes; no seepage at supply joints.'
    )
  )
  WHERE id = 'c92bfe8f-2104-49ad-b4a4-0d4d927b3a72'::uuid;

  -- Refresh project cached phases JSON
  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(v_project_id)
  WHERE id = v_project_id;
END $$;

