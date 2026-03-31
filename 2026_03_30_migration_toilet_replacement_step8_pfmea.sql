-- Step 8 of project development: PFMEA (failure modes, effects, causes, controls) per step output
-- Project: Toilet Replacement
-- Project ID: f46b9b02-de31-42e0-ab04-5409ed1f21ee
--
-- Prerequisite: steps 1–7 applied (outputs exist with stable `id` keys from step 2; those ids are
-- `requirement_output_id` in `pfmea_failure_modes`, matching requirementOutputKey() in PFMEAManagement.tsx).
--
-- Failure modes: anti-requirements — concise negation of each Step 2 output name (see
-- AI_PROJECT_DEVELOPMENT_REFERENCE.md Step 8). Effects/causes/controls carry the detailed analysis.
--
-- Tables: public.pfmea_failure_modes, pfmea_potential_effects, pfmea_potential_causes, pfmea_controls
-- Scores: severity / occurrence / detection on 1–10 scale per app UI and public.pfmea_scoring.
--
-- Detection controls: scores must align with the Detection tab in PFMEA Scoring criteria (pfmea_scoring).
-- Manual / subjective / operator-dependent checks use higher numeric scores (worse detection) than
-- automated or gage-based methods—see AI_PROJECT_DEVELOPMENT_REFERENCE.md Step 8.

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
    RAISE EXCEPTION 'No operation_steps for project_id=% — run step 1 before step 8.', v_project_id;
  END IF;

  -- One failure mode per primary output; stable UUIDs. ON CONFLICT refreshes failure_mode text (anti-requirement wording).

  INSERT INTO public.pfmea_failure_modes (
    id, project_id, operation_step_id, requirement_output_id, failure_mode, severity_score
  ) VALUES
    (
      'f46b9b02-de31-42e0-ab04-5409ed1f0001'::uuid,
      v_project_id,
      'f46b9b02-de31-42e0-ab04-5409ed1f21e1'::uuid,
      'out-prep-verified-shutoff',
      'Shutoff not verified',
      7
    ),
    (
      'f46b9b02-de31-42e0-ab04-5409ed1f0002'::uuid,
      v_project_id,
      'f46b9b02-de31-42e0-ab04-5409ed1f21e2'::uuid,
      'out-toilet-drained',
      'Toilet not drained',
      6
    ),
    (
      'f46b9b02-de31-42e0-ab04-5409ed1f0003'::uuid,
      v_project_id,
      'f46b9b02-de31-42e0-ab04-5409ed1f21e3'::uuid,
      'out-supply-disconnected',
      'Supply not safely disconnected',
      8
    ),
    (
      'f46b9b02-de31-42e0-ab04-5409ed1f0004'::uuid,
      v_project_id,
      'f46b9b02-de31-42e0-ab04-5409ed1f21e4'::uuid,
      'out-toilet-removed',
      'Toilet not removed safely',
      8
    ),
    (
      'f46b9b02-de31-42e0-ab04-5409ed1f0005'::uuid,
      v_project_id,
      'f46b9b02-de31-42e0-ab04-5409ed1f21e5'::uuid,
      'out-wax-removed-drain-blocked',
      'Drain opening not protected',
      7
    ),
    (
      'f46b9b02-de31-42e0-ab04-5409ed1f0006'::uuid,
      v_project_id,
      'f46b9b02-de31-42e0-ab04-5409ed1f21e6'::uuid,
      'out-flange-inspected',
      'Flange soundness not confirmed',
      8
    ),
    (
      'f46b9b02-de31-42e0-ab04-5409ed1f0007'::uuid,
      v_project_id,
      'f46b9b02-de31-42e0-ab04-5409ed1f21e7'::uuid,
      'out-bolts-seal-ready',
      'Bolts/seal not ready for bowl set',
      8
    ),
    (
      'f46b9b02-de31-42e0-ab04-5409ed1f0008'::uuid,
      v_project_id,
      'f46b9b02-de31-42e0-ab04-5409ed1f21e8'::uuid,
      'out-toilet-set-stable',
      'Toilet not set stable',
      8
    ),
    (
      'f46b9b02-de31-42e0-ab04-5409ed1f0009'::uuid,
      v_project_id,
      'f46b9b02-de31-42e0-ab04-5409ed1f21e9'::uuid,
      'out-water-restored',
      'Water not restored leak-free',
      7
    ),
    (
      'f46b9b02-de31-42e0-ab04-5409ed1f000a'::uuid,
      v_project_id,
      'f46b9b02-de31-42e0-ab04-5409ed1f21ea'::uuid,
      'out-leak-free-verified',
      'Leak-free not verified',
      7
    )
  ON CONFLICT (id) DO UPDATE SET
    failure_mode = EXCLUDED.failure_mode,
    severity_score = EXCLUDED.severity_score,
    project_id = EXCLUDED.project_id,
    operation_step_id = EXCLUDED.operation_step_id,
    requirement_output_id = EXCLUDED.requirement_output_id;

  INSERT INTO public.pfmea_potential_effects (id, failure_mode_id, effect_description, severity_score)
  VALUES
    ('f46b9b02-de31-42e0-ab04-5409ed1f0101'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0001'::uuid, 'Uncontrolled water spray or flooding during later steps', 8),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0102'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0002'::uuid, 'Greywater spill and slip hazard during removal', 7),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0103'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0003'::uuid, 'Spray onto finish surfaces and electrical hazard risk', 9),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0104'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0004'::uuid, 'Injury or fixture loss; flange damage', 8),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0105'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0005'::uuid, 'Sewer gas exposure; object dropped into drain', 7),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0106'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0006'::uuid, 'Chronic leak or rock after install; repeat rework', 8),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0107'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0007'::uuid, 'Wax/seal leak at floor or drain', 9),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0108'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0008'::uuid, 'Seal creep leak and fastener overload cracking porcelain', 8),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0109'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0009'::uuid, 'Hidden drip damaging cabinet/floor over time', 7),
    ('f46b9b02-de31-42e0-ab04-5409ed1f010a'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f000a'::uuid, 'Floor damage and mold from undetected base leak', 8)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.pfmea_potential_causes (id, failure_mode_id, cause_description, occurrence_score)
  VALUES
    ('f46b9b02-de31-42e0-ab04-5409ed1f0201'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0001'::uuid, 'Worn or debris-bound angle stop seat; slow seep not observed', 5),
    ('f46b9b02-de31-42e0-ab04-5409ed1f02b1'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0001'::uuid, 'Stop not fully closed (partial turn); assumed off from handle position only', 5),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0202'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0002'::uuid, 'Insufficient sponge/bail time; siphon water returns', 5),
    ('f46b9b02-de31-42e0-ab04-5409ed1f02b2'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0002'::uuid, 'Residual water trapped in trap or rim channel not emptied', 4),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0203'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0003'::uuid, 'Shutoff bypasses or packing leak; line opened too early', 4),
    ('f46b9b02-de31-42e0-ab04-5409ed1f02b3'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0003'::uuid, 'Upstream pressure restored elsewhere while line is open', 3),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0204'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0004'::uuid, 'One-sided lift, twisting to break wax, or poor handholds', 5),
    ('f46b9b02-de31-42e0-ab04-5409ed1f02b4'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0004'::uuid, 'Footing slip or overreach; bowl strikes tub or vanity edge', 4),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0205'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0005'::uuid, 'Rag dislodged or left out during scrape/clean', 4),
    ('f46b9b02-de31-42e0-ab04-5409ed1f02b5'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0005'::uuid, 'Cover removed to discard wax and opening left open between tasks', 4),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0206'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0006'::uuid, 'Visual-only check; no load test on flange or floor', 5),
    ('f46b9b02-de31-42e0-ab04-5409ed1f02b6'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0006'::uuid, 'Corrosion or hairline crack dismissed as cosmetic', 4),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0207'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0007'::uuid, 'Dry-fit or double compression on same wax ring', 4),
    ('f46b9b02-de31-42e0-ab04-5409ed1f02b7'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0007'::uuid, 'Bolt slots not parallel; seal offset before bowl weight applied', 4),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0208'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0008'::uuid, 'Full torque on one side before opposite side is snug', 5),
    ('f46b9b02-de31-42e0-ab04-5409ed1f02b8'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0008'::uuid, 'Floor uneven; shims omitted or uneven', 4),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0209'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0009'::uuid, 'Cross-thread or under-tightened compression nut', 5),
    ('f46b9b02-de31-42e0-ab04-5409ed1f02b9'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0009'::uuid, 'Deformed ferrule or supply line kink at nut', 4),
    ('f46b9b02-de31-42e0-ab04-5409ed1f020a'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f000a'::uuid, 'Single flush check; no dwell or mirror/towel at base', 5),
    ('f46b9b02-de31-42e0-ab04-5409ed1f02ba'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f000a'::uuid, 'Slow seep hidden by caulk skirt or grout line', 4)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.pfmea_controls (
    id, failure_mode_id, cause_id, control_type, control_description, detection_score
  ) VALUES
    ('f46b9b02-de31-42e0-ab04-5409ed1f0301'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0001'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0201'::uuid, 'prevention', 'Close angle stop fully; dwell with no tank refill per step instructions', NULL),
    ('f46b9b02-de31-42e0-ab04-5409ed1f03b1'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0001'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f02b1'::uuid, 'prevention', 'Back off then re-seat stop to firm stop; listen for refill after full close', NULL),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0302'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0002'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0202'::uuid, 'prevention', 'Sponge/bail until bowl water is minimal; bucket residual', NULL),
    ('f46b9b02-de31-42e0-ab04-5409ed1f03b2'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0002'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f02b2'::uuid, 'prevention', 'Vacuum remaining bowl water where appropriate per instructions', NULL),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0303'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0003'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0203'::uuid, 'prevention', 'Confirm shutoff holds with line intact before opening tank connection', NULL),
    ('f46b9b02-de31-42e0-ab04-5409ed1f03b3'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0003'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f02b3'::uuid, 'prevention', 'Tag or communicate when other fixtures are being tested on same branch', NULL),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0304'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0004'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0204'::uuid, 'prevention', 'Straight vertical lift; two-person when needed; break wax before lifting', NULL),
    ('f46b9b02-de31-42e0-ab04-5409ed1f03b4'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0004'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f02b4'::uuid, 'prevention', 'Clear swing path; use lift points per manufacturer guidance', NULL),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0305'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0005'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0205'::uuid, 'prevention', 'Keep drain covered whenever not actively working in the opening', NULL),
    ('f46b9b02-de31-42e0-ab04-5409ed1f03b5'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0005'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f02b5'::uuid, 'prevention', 'Re-seat plug/rag before leaving the area for breaks', NULL),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0306'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0006'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0206'::uuid, 'prevention', 'Wiggle/load-check flange; probe floor for soft spots before seal', NULL),
    ('f46b9b02-de31-42e0-ab04-5409ed1f03b6'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0006'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f02b6'::uuid, 'prevention', 'Replace questionable flange hardware; document damage before proceeding', NULL),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0307'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0007'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0207'::uuid, 'prevention', 'One clean set; new ring if bowl is lifted after contact', NULL),
    ('f46b9b02-de31-42e0-ab04-5409ed1f03b7'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0007'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f02b7'::uuid, 'prevention', 'Dry-fit bowl height and bolt clearance before final wax contact', NULL),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0308'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0008'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0208'::uuid, 'prevention', 'Alternate nut tightening; press-down before snugging evenly', NULL),
    ('f46b9b02-de31-42e0-ab04-5409ed1f03b8'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0008'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f02b8'::uuid, 'prevention', 'Shim to stable bearing before final torque sequence', NULL),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0309'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0009'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0209'::uuid, 'prevention', 'Hand-start threads; tighten per manufacturer; slow pressurization', NULL),
    ('f46b9b02-de31-42e0-ab04-5409ed1f03b9'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0009'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f02b9'::uuid, 'prevention', 'Inspect supply line for kinks; replace damaged ferrule or line', NULL),
    ('f46b9b02-de31-42e0-ab04-5409ed1f030a'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f000a'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f020a'::uuid, 'prevention', 'Multiple flushes; dry perimeter check after idle period', NULL),
    ('f46b9b02-de31-42e0-ab04-5409ed1f03ba'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f000a'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f02ba'::uuid, 'prevention', 'Inspect caulk line and base perimeter with good lighting', NULL)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.pfmea_controls (
    id, failure_mode_id, cause_id, control_type, control_description, detection_score
  ) VALUES
    ('f46b9b02-de31-42e0-ab04-5409ed1f0401'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0001'::uuid, NULL, 'detection', 'Observe tank refill behavior and dry towel at stop after close', 7),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0402'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0002'::uuid, NULL, 'detection', 'Tilt check: no audible slosh before disconnect/lift', 7),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0403'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0003'::uuid, NULL, 'detection', 'Dry paper towel at coupling and shutoff immediately after opening', 8),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0404'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0004'::uuid, NULL, 'detection', 'Inspect flange and floor for new cracks after set-down', 6),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0405'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0005'::uuid, NULL, 'detection', 'Confirm rag seated; no sewer odor at nose level before leaving opening', 8),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0406'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0006'::uuid, NULL, 'detection', 'Flashlight on bolt slots and flange ring; confirm no movement', 7),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0407'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0007'::uuid, NULL, 'detection', 'Visual symmetry of bolts and ring before lowering bowl', 8),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0408'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0008'::uuid, NULL, 'detection', 'Rock test at rim; feel for uniform seat before final snug', 7),
    ('f46b9b02-de31-42e0-ab04-5409ed1f0409'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f0009'::uuid, NULL, 'detection', 'Wipe joints dry; re-check after full refill and first flush', 8),
    ('f46b9b02-de31-42e0-ab04-5409ed1f040a'::uuid, 'f46b9b02-de31-42e0-ab04-5409ed1f000a'::uuid, NULL, 'detection', 'Paper towel around base after 3 flushes and after 10-minute idle', 7)
  ON CONFLICT (id) DO UPDATE SET
    control_description = EXCLUDED.control_description,
    detection_score = EXCLUDED.detection_score;
END $$;
