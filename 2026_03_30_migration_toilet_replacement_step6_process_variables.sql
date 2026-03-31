-- Step 6 of project development: Process variables ONLY (no tools/materials library inserts)
-- Project: Toilet Replacement
-- Project ID: f46b9b02-de31-42e0-ab04-5409ed1f21ee
--
-- Prerequisites: run steps 1–5 first (workflow, outputs, risks, tools on steps, materials on steps).
-- Tools and materials CATALOG belong in step 4 and step 5 migrations — not here.
--
-- Storage: public.operation_steps.process_variables (JSONB array)
-- At least one `type` = `process` per step below; `upstream` optional (see AI_PROJECT_DEVELOPMENT_REFERENCE.md).
-- Shape: src/utils/processVariablesUtils.ts (serialize/parse).

DO $$
DECLARE
  v_project_id CONSTANT uuid := 'f46b9b02-de31-42e0-ab04-5409ed1f21ee'::uuid;
  v_step_count integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = v_project_id) THEN
    RAISE EXCEPTION 'Project not found: %', v_project_id;
  END IF;

  SELECT COUNT(*)
  INTO v_step_count
  FROM public.operation_steps os
  JOIN public.phase_operations po ON os.operation_id = po.id
  JOIN public.project_phases pp ON po.phase_id = pp.id
  WHERE pp.project_id = v_project_id;

  IF v_step_count = 0 THEN
    RAISE EXCEPTION 'No operation_steps for project_id=% — run step 1 (and prior steps) before step 6.', v_project_id;
  END IF;

  -- ============================
  -- Process variables per step
  -- ============================

  UPDATE public.operation_steps SET process_variables = jsonb_build_array(
    jsonb_build_object(
      'id', 'toilet-pv-e1-shutoff-dwell',
      'name', 'Shutoff verification dwell',
      'type', 'process',
      'description', 'Time the closed angle stop is observed before disconnection. Too low: miss slow seep; too high: unnecessary delay. Target range: about 2 minutes with no tank refill.',
      'required', true,
      'unit', 'minutes'
    )
  ) WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e1'::uuid;

  UPDATE public.operation_steps SET process_variables = jsonb_build_array(
    jsonb_build_object(
      'id', 'toilet-pv-e2-residual-water',
      'name', 'Residual water removed before lift',
      'type', 'process',
      'description', 'How completely tank and bowl are emptied. Too low: slosh and contamination on lift; overkill is rare but wastes time. Target: no audible slosh when bowl is rocked gently.',
      'required', true
    )
  ) WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e2'::uuid;

  UPDATE public.operation_steps SET process_variables = jsonb_build_array(
    jsonb_build_object(
      'id', 'toilet-pv-e3-wrench-load',
      'name', 'Wrench torque on chrome and threads',
      'type', 'process',
      'description', 'Force applied to supply coupling and nuts. Too low: joint leaks; too high: crushed ferrule, galling, or cracked fill valve shank. Target: hand-firm plus small wrench increment until joint separates without deformation.',
      'required', true
    )
  ) WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e3'::uuid;

  UPDATE public.operation_steps SET process_variables = jsonb_build_array(
    jsonb_build_object(
      'id', 'toilet-pv-e4-lift-verticality',
      'name', 'Lift path verticality',
      'type', 'process',
      'description', 'Deviation from straight vertical lift after seal break. Too lateral: flange lip damage, bolt shear, floor gouging. Target: plumb lift with minimal side load.',
      'required', true
    )
  ) WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e4'::uuid;

  UPDATE public.operation_steps SET process_variables = jsonb_build_array(
    jsonb_build_object(
      'id', 'toilet-pv-e5-sealing-plane-clean',
      'name', 'Flange sealing plane cleanliness',
      'type', 'process',
      'description', 'Wax residue left on flange bearing surface. Too much residue: leak path; aggressive scraping: flange damage. Target: visually clean, continuous bearing ring with no loose chunks.',
      'required', true
    )
  ) WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e5'::uuid;

  UPDATE public.operation_steps SET process_variables = jsonb_build_array(
    jsonb_build_object(
      'id', 'toilet-pv-e6-flange-rigidity',
      'name', 'Flange rigid-body movement under hand check',
      'type', 'process',
      'description', 'Observable movement when flange is pressed side-to-side. Any meaningful flex means subfloor or attachment failure risk before setting bowl. Target: no perceptible translation relative to floor plane.',
      'required', true
    )
  ) WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e6'::uuid;

  UPDATE public.operation_steps SET process_variables = jsonb_build_array(
    jsonb_build_object(
      'id', 'toilet-pv-e7-wax-compression-cycles',
      'name', 'Wax ring compression cycles before final set',
      'type', 'process',
      'description', 'Number of full lift-off cycles on the same wax ring. More than one seating attempt typically ruins the ring; plan alignment before lowering. Target: one controlled compression to final position.',
      'required', true,
      'unit', 'cycles'
    )
  ) WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e7'::uuid;

  UPDATE public.operation_steps SET process_variables = jsonb_build_array(
    jsonb_build_object(
      'id', 'toilet-pv-e8-nut-alternation-symmetry',
      'name', 'Closet nut turn symmetry',
      'type', 'process',
      'description', 'Balance of tightening between left and right nuts per pass. One-sided tightening tilts bowl and stresses porcelain. Target: equal small turns alternating sides until snug with no rock.',
      'required', true
    )
  ) WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e8'::uuid;

  UPDATE public.operation_steps SET process_variables = jsonb_build_array(
    jsonb_build_object(
      'id', 'toilet-pv-e9-shutoff-reopen-rate',
      'name', 'Supply re-pressurization rate',
      'type', 'process',
      'description', 'How fast the angle stop is reopened after connection. Too fast: water hammer and joint surge leaks. Target: slow sweep to full open while watching every threaded joint.',
      'required', true
    )
  ) WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e9'::uuid;

  UPDATE public.operation_steps SET process_variables = jsonb_build_array(
    jsonb_build_object(
      'id', 'toilet-pv-e10-leak-soak-time',
      'name', 'Post-flush leak observation dwell',
      'type', 'process',
      'description', 'Quiet time after flush tests before declaring dry. Too short: miss slow weeps at base or supply. Target: several minutes dry towel / visual check after last flush.',
      'required', true,
      'unit', 'minutes'
    )
  ) WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21ea'::uuid;

  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(v_project_id)
  WHERE id = v_project_id;
END $$;
