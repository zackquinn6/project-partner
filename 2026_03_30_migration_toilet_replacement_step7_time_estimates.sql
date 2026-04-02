-- Step 7 of project development: Time estimates (low / med / high) per step
-- Project: Toilet Replacement
-- Project ID: 8267c526-036d-4f5c-9f17-2ee1b3d87886
--
-- Units: hours per step for ONE residential toilet replacement (not scaled per sq ft).
-- Semantics (AI_PROJECT_DEVELOPMENT_REFERENCE.md): low = ~10th percentile, med = mean/typical,
-- high = ~90th percentile for that step in isolation (experience, access, stuck hardware, rework).
--
-- Evidence basis: typical DIY plumbing guides and contractor ranges for toilet R&R split by task
-- (e.g. total job often ~1–4 hr all-in; per-step splits allocate more time to lift, set, inspect
-- when flange or bolts are problematic). Values are explicit DB fields — not COALESCE fallbacks.
--
-- Storage: public.operation_steps.time_estimate_low | time_estimate_med | time_estimate_high

DO $$
DECLARE
  v_project_id CONSTANT uuid := '8267c526-036d-4f5c-9f17-2ee1b3d87886'::uuid;
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
    RAISE EXCEPTION 'No operation_steps for project_id=% — run step 1 before step 7.', v_project_id;
  END IF;

  -- e1 Prep + verify shutoff
  UPDATE public.operation_steps
  SET
    time_estimate_low = 0.08,
    time_estimate_med = 0.17,
    time_estimate_high = 0.40
  WHERE id = '8267c526-036d-4f5c-9f17-5409ed1f21e1'::uuid;

  -- e2 Drain tank and bowl
  UPDATE public.operation_steps
  SET
    time_estimate_low = 0.08,
    time_estimate_med = 0.18,
    time_estimate_high = 0.40
  WHERE id = '8267c526-036d-4f5c-9f17-5409ed1f21e2'::uuid;

  -- e3 Disconnect supply
  UPDATE public.operation_steps
  SET
    time_estimate_low = 0.07,
    time_estimate_med = 0.15,
    time_estimate_high = 0.35
  WHERE id = '8267c526-036d-4f5c-9f17-5409ed1f21e3'::uuid;

  -- e4 Unbolt and lift
  UPDATE public.operation_steps
  SET
    time_estimate_low = 0.12,
    time_estimate_med = 0.28,
    time_estimate_high = 0.65
  WHERE id = '8267c526-036d-4f5c-9f17-5409ed1f21e4'::uuid;

  -- e5 Remove wax + block drain
  UPDATE public.operation_steps
  SET
    time_estimate_low = 0.08,
    time_estimate_med = 0.18,
    time_estimate_high = 0.40
  WHERE id = '8267c526-036d-4f5c-9f17-5409ed1f21e5'::uuid;

  -- e6 Inspect flange / floor
  UPDATE public.operation_steps
  SET
    time_estimate_low = 0.12,
    time_estimate_med = 0.28,
    time_estimate_high = 0.65
  WHERE id = '8267c526-036d-4f5c-9f17-5409ed1f21e6'::uuid;

  -- e7 Bolts + seal
  UPDATE public.operation_steps
  SET
    time_estimate_low = 0.12,
    time_estimate_med = 0.22,
    time_estimate_high = 0.50
  WHERE id = '8267c526-036d-4f5c-9f17-5409ed1f21e7'::uuid;

  -- e8 Set and secure toilet
  UPDATE public.operation_steps
  SET
    time_estimate_low = 0.17,
    time_estimate_med = 0.40,
    time_estimate_high = 0.85
  WHERE id = '8267c526-036d-4f5c-9f17-5409ed1f21e8'::uuid;

  -- e9 Reconnect supply + refill
  UPDATE public.operation_steps
  SET
    time_estimate_low = 0.08,
    time_estimate_med = 0.18,
    time_estimate_high = 0.40
  WHERE id = '8267c526-036d-4f5c-9f17-5409ed1f21e9'::uuid;

  -- e10 Flush test + final checks
  UPDATE public.operation_steps
  SET
    time_estimate_low = 0.12,
    time_estimate_med = 0.28,
    time_estimate_high = 0.55
  WHERE id = '8267c526-036d-4f5c-9f17-5409ed1f21ea'::uuid;

  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(v_project_id)
  WHERE id = v_project_id;
END $$;
