-- Tile companion projects: TCNA handoff content (owned phases on each source).
-- Research basis: TCNA Handbook flatness / EJ171, ASTM C920 sealant practice,
-- APA-style panel subfloor fastening, pourable underlayment manufacturer prep.
--
-- In scope (source templates only; Tile host only adopts Subfloor Replacement):
-- 1) Self-Leveler Application: remove New Step/New Operation placeholders;
--    primer/dam/pour/cure/verify; flatness pass/fail vs 1/8 in in 10 ft (LFT);
--    handoff back to Tile Assess substrate.
-- 2) Subfloor Replacement: joist repair + glue/screw + bounce check; handoff;
--    adopt Removal/Installation/Finishing on Tile before Self-Leveler.
-- 3) Caulking Application: EJ171 soft-joint / change-of-plane (backer rod +
--    ASTM C920 silicone); painters caulk stays finish-joint only.
-- 4) Baseboard & Trim Installation: real removal step; paint- vs stain-grade
--    finish path; defer wet/EJ171 beads to Caulking (no how-to duplication).
-- Out of scope: Toilet Replacement / dust / demo how-to on Tile owned steps.
-- ASCII only. No em dashes.

DO $migration$
DECLARE
  v_tile_id uuid;
  v_sl_id uuid;
  v_sf_id uuid;
  v_ck_id uuid;
  v_bb_id uuid;

  -- Self-Leveler existing owned IDs
  v_sl_op_placeholder_prep uuid := '48e1b87f-919a-4bb3-bd87-d7aa11a0e526'::uuid;
  v_sl_op_placeholder_apply uuid := 'f81a4afd-8ef3-478e-b3a4-6eb7833f5cec'::uuid;
  v_sl_step_placeholder_prep uuid := '9d211f1c-fe32-45dc-ae36-96869c2dec00'::uuid;
  v_sl_step_placeholder_apply uuid := 'b4309a7e-6479-4da7-8dd1-8df638f04552'::uuid;
  v_sl_step_clean uuid := 'e1e1e101-1a7e-4c1d-9f03-e1e1e1010101'::uuid;
  v_sl_step_prime uuid := 'e1e1e101-1a7e-4c1d-9f03-e1e1e1010102'::uuid;
  v_sl_step_mix uuid := 'e1e1e101-1a7e-4c1d-9f03-e1e1e1010103'::uuid;
  v_sl_step_spread uuid := 'e1e1e101-1a7e-4c1d-9f03-e1e1e1010104'::uuid;
  v_sl_step_cure uuid := 'e1e1e101-1a7e-4c1d-9f03-e1e1e1010105'::uuid;
  v_sl_step_verify uuid := 'e1e1e101-1a7e-4c1d-9f03-e1e1e1010106'::uuid;
  v_sl_phase_prep uuid := 'd8e1d539-bc9b-4f8b-a9fe-3e1a6a801988'::uuid;
  v_sl_phase_apply uuid := 'e76bd5ff-f717-41e1-8cdf-63677410e327'::uuid;

  -- Subfloor existing owned IDs
  v_sf_phase_removal uuid := 'e2e2e102-1a7e-4c1d-9f01-e2e2e1020001'::uuid;
  v_sf_phase_install uuid := 'e2e2e102-1a7e-4c1d-9f01-e2e2e1020002'::uuid;
  v_sf_phase_finish uuid := 'e2e2e102-1a7e-4c1d-9f01-e2e2e1020003'::uuid;
  v_sf_step_cut uuid := 'e2e2e102-1a7e-4c1d-9f03-e2e2e1020101'::uuid;
  v_sf_step_joist uuid := 'e2e2e102-1a7e-4c1d-9f03-e2e2e1020102'::uuid;
  v_sf_step_drylay uuid := 'e2e2e102-1a7e-4c1d-9f03-e2e2e1020103'::uuid;
  v_sf_step_glue uuid := 'e2e2e102-1a7e-4c1d-9f03-e2e2e1020104'::uuid;
  v_sf_step_sand uuid := 'e2e2e102-1a7e-4c1d-9f03-e2e2e1020105'::uuid;
  v_sf_step_bounce uuid := 'e2e2e102-1a7e-4c1d-9f03-e2e2e1020106'::uuid;
  -- Tile linked adopt rows for Subfloor
  v_tile_sf_removal uuid := '373adcbf-0a8c-42e9-9bcb-a5c300000301'::uuid;
  v_tile_sf_install uuid := '373adcbf-0a8c-42e9-9bcb-a5c300000302'::uuid;
  v_tile_sf_finish uuid := '373adcbf-0a8c-42e9-9bcb-a5c300000303'::uuid;

  -- Caulking
  v_ck_step_silicon uuid := '9d9ebf39-3844-4e5c-9b0f-52336a8df203'::uuid;
  v_ck_step_painters uuid := '9d9ebf39-3844-4e5c-9b0f-52336a8df204'::uuid;
  v_ck_req_ej171 uuid := '9d9ebf39-3844-4e5c-9b0f-52336a8df301'::uuid;
  v_ck_fm_ej171 uuid := '9d9ebf39-3844-4e5c-9b0f-52336a8df401'::uuid;

  -- Baseboard
  v_bb_step_removal uuid := '2b5a9d0d-9963-4b33-9b10-6cf83a2e9cf4'::uuid;
  v_bb_step_mark uuid := 'b45eb00d-1a7e-4c1d-9f03-b45e00000001'::uuid;
  v_bb_step_acclimate uuid := 'b45eb00d-1a7e-4c1d-9f03-b45e00000002'::uuid;
  v_bb_step_cut uuid := 'b45eb00d-1a7e-4c1d-9f03-b45e00000003'::uuid;
  v_bb_step_fasten uuid := 'b45eb00d-1a7e-4c1d-9f03-b45e00000004'::uuid;
  v_bb_step_fill uuid := 'b45eb00d-1a7e-4c1d-9f03-b45e00000007'::uuid;
  v_bb_step_caulk uuid := 'b45eb00d-1a7e-4c1d-9f03-b45e00000008'::uuid;

  -- Self-Leveler PFMEA
  v_sl_req_flat uuid := 'e1e1e101-1a7e-4c1d-9f04-e1e1e1010201'::uuid;
  v_sl_fm_flat uuid := 'e1e1e101-1a7e-4c1d-9f04-e1e1e1010301'::uuid;
  v_sl_req_ratio uuid := 'e1e1e101-1a7e-4c1d-9f04-e1e1e1010202'::uuid;
  v_sl_fm_ratio uuid := 'e1e1e101-1a7e-4c1d-9f04-e1e1e1010302'::uuid;

  -- Subfloor PFMEA
  v_sf_req_joist uuid := 'e2e2e102-1a7e-4c1d-9f04-e2e2e1020201'::uuid;
  v_sf_fm_joist uuid := 'e2e2e102-1a7e-4c1d-9f04-e2e2e1020301'::uuid;
  v_sf_req_bounce uuid := 'e2e2e102-1a7e-4c1d-9f04-e2e2e1020202'::uuid;
  v_sf_fm_bounce uuid := 'e2e2e102-1a7e-4c1d-9f04-e2e2e1020302'::uuid;

  v_tile_step_inspect uuid := '17c7f59c-5920-4dfd-89ee-4394d87bb6d0'::uuid;
  v_count integer;
BEGIN
  SELECT p.id INTO v_tile_id
  FROM public.projects p
  WHERE lower(btrim(p.name)) = 'tile flooring installation'
    AND p.parent_project_id IS NULL
  ORDER BY p.is_current_version DESC NULLS LAST, p.updated_at DESC NULLS LAST
  LIMIT 1;
  IF v_tile_id IS NULL THEN
    RAISE EXCEPTION 'Tile Flooring Installation root project not found.';
  END IF;

  SELECT p.id INTO v_sl_id
  FROM public.projects p
  WHERE lower(btrim(p.name)) = 'self-leveler application'
    AND p.parent_project_id IS NULL
  ORDER BY p.is_current_version DESC NULLS LAST, p.updated_at DESC NULLS LAST
  LIMIT 1;
  IF v_sl_id IS NULL THEN
    RAISE EXCEPTION 'Self-Leveler Application root project not found.';
  END IF;

  SELECT p.id INTO v_sf_id
  FROM public.projects p
  WHERE lower(btrim(p.name)) = 'subfloor replacement'
    AND p.parent_project_id IS NULL
  ORDER BY p.is_current_version DESC NULLS LAST, p.updated_at DESC NULLS LAST
  LIMIT 1;
  IF v_sf_id IS NULL THEN
    RAISE EXCEPTION 'Subfloor Replacement root project not found.';
  END IF;

  SELECT p.id INTO v_ck_id
  FROM public.projects p
  WHERE lower(btrim(p.name)) = 'caulking application'
    AND p.parent_project_id IS NULL
  ORDER BY p.is_current_version DESC NULLS LAST, p.updated_at DESC NULLS LAST
  LIMIT 1;
  IF v_ck_id IS NULL THEN
    RAISE EXCEPTION 'Caulking Application root project not found.';
  END IF;

  SELECT p.id INTO v_bb_id
  FROM public.projects p
  WHERE lower(btrim(p.name)) = 'baseboard & trim installation'
    AND p.parent_project_id IS NULL
  ORDER BY p.is_current_version DESC NULLS LAST, p.updated_at DESC NULLS LAST
  LIMIT 1;
  IF v_bb_id IS NULL THEN
    RAISE EXCEPTION 'Baseboard & Trim Installation root project not found.';
  END IF;

  -- =========================================================================
  -- A) Self-Leveler Application
  -- =========================================================================
  UPDATE public.project_phases
  SET
    description =
      'Clean, profile, and prime the substrate; install pour dams so self-leveler stays in the intended field.',
    updated_at = now()
  WHERE id = v_sl_phase_prep AND project_id = v_sl_id;

  UPDATE public.project_phases
  SET
    description =
      'Mix, pour, and work pourable underlayment, then cure and prove flatness before returning to the tile assembly.',
    updated_at = now()
  WHERE id = v_sl_phase_apply AND project_id = v_sl_id;

  -- Re-point risks off placeholder steps before delete
  UPDATE public.project_risks
  SET operation_step_id = v_sl_step_clean, updated_at = now()
  WHERE project_id = v_sl_id
    AND operation_step_id = v_sl_step_placeholder_prep
    AND lower(btrim(risk_title)) = 'grinding high spots dry without dust capture';

  UPDATE public.project_risks
  SET operation_step_id = v_sl_step_mix, updated_at = now()
  WHERE project_id = v_sl_id
    AND operation_step_id = v_sl_step_placeholder_prep
    AND lower(btrim(risk_title)) = 'extra self-leveler bags after pour thickness grows';

  UPDATE public.project_risks
  SET operation_step_id = v_sl_step_clean, updated_at = now()
  WHERE project_id = v_sl_id
    AND operation_step_id IN (v_sl_step_placeholder_prep, v_sl_step_placeholder_apply);

  DELETE FROM public.operation_steps
  WHERE id IN (v_sl_step_placeholder_prep, v_sl_step_placeholder_apply);

  DELETE FROM public.phase_operations
  WHERE id IN (v_sl_op_placeholder_prep, v_sl_op_placeholder_apply);

  -- Normalize remaining op order
  UPDATE public.phase_operations po
  SET display_order = 1, updated_at = now()
  WHERE po.id = 'e1e1e101-1a7e-4c1d-9f02-e1e1e1010101'::uuid;

  UPDATE public.phase_operations po
  SET display_order = 1, updated_at = now()
  WHERE po.id = 'e1e1e101-1a7e-4c1d-9f02-e1e1e1010102'::uuid;

  UPDATE public.phase_operations po
  SET display_order = 2, updated_at = now()
  WHERE po.id = 'e1e1e101-1a7e-4c1d-9f02-e1e1e1010103'::uuid;

  UPDATE public.operation_steps SET
    description =
      'Remove contaminants, laitance, and bond breakers; confirm the deck is sound enough to receive pourable underlayment per the product data sheet.',
    skill_level = 'Beginner',
    step_type = 'prime',
    flow_type = 'prime',
    time_estimate_low = 0.5, time_estimate_med = 1.0, time_estimate_high = 2.0,
    outputs = jsonb_build_array(
      jsonb_build_object(
        'id', 'out-sl-clean',
        'name', 'Bondable substrate',
        'type', 'performance-durability',
        'description', 'Field is free of dust, oil, curing compounds, and loose laitance in the pour area.',
        'qualityChecks', 'Wipe or vacuum check shows no transferable film; soft spots marked for repair before primer.'
      )
    ),
    updated_at = now()
  WHERE id = v_sl_step_clean;

  UPDATE public.operation_steps SET
    description =
      'Apply primer to the specified film and install dams so the pour cannot run into openings, drains, or adjoining rooms.',
    skill_level = 'Beginner',
    step_type = 'prime',
    flow_type = 'prime',
    time_estimate_low = 0.4, time_estimate_med = 0.8, time_estimate_high = 1.5,
    outputs = jsonb_build_array(
      jsonb_build_object(
        'id', 'out-sl-primer',
        'name', 'Primed field with contained perimeter',
        'type', 'performance-durability',
        'description', 'Primer covers the pour area evenly; dams seal edges and penetrations.',
        'qualityChecks', 'No bare dry spots in the field; test water or mock bead does not escape at openings.'
      )
    ),
    updated_at = now()
  WHERE id = v_sl_step_prime;

  UPDATE public.operation_steps SET
    description =
      'Hold the manufacturer water-to-powder ratio and chain mixes so the field is poured before a skin forms.',
    skill_level = 'Intermediate',
    step_type = 'prime',
    flow_type = 'prime',
    time_estimate_low = 0.5, time_estimate_med = 1.0, time_estimate_high = 2.0,
    outputs = jsonb_build_array(
      jsonb_build_object(
        'id', 'out-sl-mix',
        'name', 'In-ratio continuous pour',
        'type', 'performance-durability',
        'description', 'Batches match the data sheet ratio and wet edges join before skinning.',
        'qualityChecks', 'No dry-powder lumps; pour fronts knit without cold joints.'
      )
    ),
    updated_at = now()
  WHERE id = v_sl_step_mix;

  UPDATE public.operation_steps SET
    description =
      'Gauge-rake to target thickness and spike-roll to release air so the slab sets as one plane.',
    skill_level = 'Intermediate',
    step_type = 'prime',
    flow_type = 'prime',
    time_estimate_low = 0.4, time_estimate_med = 0.9, time_estimate_high = 1.8,
    outputs = jsonb_build_array(
      jsonb_build_object(
        'id', 'out-sl-spread',
        'name', 'Uniform thickness field',
        'type', 'performance-durability',
        'description', 'Depth matches the mapped lows; entrapped air is released across the pour.',
        'qualityChecks', 'Gauge marks and roller passes cover the field without unworked islands.'
      )
    ),
    updated_at = now()
  WHERE id = v_sl_step_spread;

  UPDATE public.operation_steps SET
    description =
      'Keep traffic, drafts, and point loads off the pour for the manufacturer cure window.',
    skill_level = 'Beginner',
    step_type = 'prime',
    flow_type = 'prime',
    time_estimate_low = 0.2, time_estimate_med = 0.3, time_estimate_high = 0.5,
    outputs = jsonb_build_array(
      jsonb_build_object(
        'id', 'out-sl-cure',
        'name', 'Undisturbed cure',
        'type', 'performance-durability',
        'description', 'No footprints, fan blast, or early loads during the stated cure period.',
        'qualityChecks', 'Surface shows no traffic marks or dusting from early disturbance.'
      )
    ),
    updated_at = now()
  WHERE id = v_sl_step_cure;

  UPDATE public.operation_steps SET
    description =
      'Prove flatness for the planned tile size (typically 1/8 in in 10 ft when any tile edge exceeds 15 in) and moisture readiness, then return to Tile Flooring Assess substrate - do not start membrane or backer here.',
    skill_level = 'Intermediate',
    step_type = 'prime',
    flow_type = 'prime',
    time_estimate_low = 0.3, time_estimate_med = 0.6, time_estimate_high = 1.0,
    outputs = jsonb_build_array(
      jsonb_build_object(
        'id', 'out-sl-flat',
        'name', 'Flatness within tile limit',
        'type', 'performance-durability',
        'description', 'Straightedge variation is inside the limit for the tile size that will be set next.',
        'qualityChecks', 'For large-format tile (any edge over 15 in), gap under a 10 ft straightedge is at most 1/8 in; smaller tile uses the project or TCNA limit recorded at assess.'
      ),
      jsonb_build_object(
        'id', 'out-sl-handoff',
        'name', 'Ready to resume Tile Assess substrate',
        'type', 'none',
        'description', 'Cure and flatness checks pass so the Tile Flooring run can resume Assess substrate / underlayment selection.',
        'qualityChecks', 'No pourable underlayment work remains; Tile Prepare subfloor is the next assembly step.'
      )
    ),
    updated_at = now()
  WHERE id = v_sl_step_verify;

  -- Instructions (upsert by step + level)
  INSERT INTO public.step_instructions (step_id, instruction_level, content) VALUES
  (v_sl_step_clean, 'beginner',
   '[{"type":"standard","title":"Clear the field","content":"Sweep and vacuum the pour area. Scrape or grind only the spots the product data sheet calls out as bond breakers."},{"type":"warning","title":"Dust capture","content":"If you grind, use shroud capture and a respirator rated for silica - do not dry-grind open to the room."},{"type":"tip","title":"Soft spots","content":"Mark soft, rotten, or bouncing panels. Those belong in Subfloor Replacement before primer."}]'::jsonb),
  (v_sl_step_clean, 'intermediate',
   '[{"type":"standard","title":"Profile check","content":"Confirm mechanical profile or primer acceptance matches the underlayment data sheet, including coating removal limits."},{"type":"warning","title":"Skip over failure","content":"Do not primer over active movement cracks or failed framing - stop for Subfloor Replacement."}]'::jsonb),
  (v_sl_step_clean, 'advanced',
   '[{"type":"standard","title":"Acceptance","content":"Bondable area equals the planned pour footprint with contaminants removed to the data-sheet standard."},{"type":"warning","title":"Root cause","content":"Pouring over laitance or oil is a common bond failure that shows up after tile is set."}]'::jsonb),
  (v_sl_step_prime, 'beginner',
   '[{"type":"standard","title":"Prime","content":"Apply primer with the roller or brush the manufacturer specifies. Keep a wet, even film - no puddles and no dry holidays."},{"type":"standard","title":"Dams","content":"Foam, board, or tape dams at doorways, vents, and slab edges so liquid cannot leave the field."},{"type":"tip","title":"Openings","content":"Plug or dam floor penetrations before any mix leaves the bucket."}]'::jsonb),
  (v_sl_step_prime, 'intermediate',
   '[{"type":"standard","title":"Re-prime windows","content":"If the data sheet requires a second coat or a recoat window, follow it before mixing powder."},{"type":"warning","title":"Dam height","content":"Dams must stand taller than the deepest planned pour depth at that edge."}]'::jsonb),
  (v_sl_step_prime, 'advanced',
   '[{"type":"standard","title":"Acceptance","content":"Primer film is continuous at edges; a containment test shows no escape path for liquid."}]'::jsonb),
  (v_sl_step_mix, 'beginner',
   '[{"type":"standard","title":"Measure water","content":"Measure mix water for each bag. Do not add free water to chase flow."},{"type":"standard","title":"Chain mixes","content":"Have the next bag staged so pours meet while both are still fluid."},{"type":"tip","title":"Bag count","content":"Size bags from the deepest mapped lows, not the room average, and stage a spare."}]'::jsonb),
  (v_sl_step_mix, 'intermediate',
   '[{"type":"standard","title":"Working time","content":"Stop placing when the mix skins or the data-sheet working time ends - remixing stale material is not a fix."},{"type":"warning","title":"Cold joints","content":"A delayed second mix that cannot knit to the first creates a ridge the tile assembly will telegraph."}]'::jsonb),
  (v_sl_step_mix, 'advanced',
   '[{"type":"standard","title":"Acceptance","content":"Every batch is in ratio; wet edges join without a cold joint across the field."}]'::jsonb),
  (v_sl_step_spread, 'beginner',
   '[{"type":"standard","title":"Gauge rake","content":"Pull the gage rake to the thickness needed over the mapped lows."},{"type":"standard","title":"Spike roller","content":"Roll to release bubbles while the material is still fluid."}]'::jsonb),
  (v_sl_step_spread, 'intermediate',
   '[{"type":"standard","title":"Transitions","content":"Feather to adjoining elevations so you do not leave a step the tile underlayment cannot absorb."},{"type":"warning","title":"Overwork","content":"Stop rolling once air is released - overworking can pull fines and weaken the surface."}]'::jsonb),
  (v_sl_step_spread, 'advanced',
   '[{"type":"standard","title":"Acceptance","content":"Thickness and de-aeration match the manufacturer method across the pour footprint."}]'::jsonb),
  (v_sl_step_cure, 'beginner',
   '[{"type":"standard","title":"Protect","content":"Block the doorway and keep people and pets off until the data sheet allows light traffic."},{"type":"tip","title":"HVAC","content":"Avoid aiming a fan or HVAC blast across a fresh pour."}]'::jsonb),
  (v_sl_step_cure, 'intermediate',
   '[{"type":"standard","title":"Loads","content":"No staging of tile pallets or tools on the pour during cure."}]'::jsonb),
  (v_sl_step_cure, 'advanced',
   '[{"type":"standard","title":"Acceptance","content":"Cure window completed without traffic marks, washout, or forced drying."}]'::jsonb),
  (v_sl_step_verify, 'beginner',
   '[{"type":"standard","title":"Straightedge","content":"Check highs and lows with a straightedge. For tile with any edge over 15 in, the gap under a 10 ft straightedge must be at most 1/8 in unless the Tile assess notes a tighter project limit."},{"type":"standard","title":"Handoff","content":"When flatness and cure pass, stop this project and return to Tile Flooring Assess substrate (Prepare subfloor). Do not install membrane or backer inside Self-Leveler Application."},{"type":"warning","title":"Fail path","content":"If the floor still fails the tile flatness limit, plan another approved correction pass - do not hand off a failing plane."}]'::jsonb),
  (v_sl_step_verify, 'intermediate',
   '[{"type":"standard","title":"Moisture","content":"Confirm any moisture or recoat readiness the underlayment and next-layer manufacturers require before Tile underlayment."},{"type":"tip","title":"Log the check","content":"Note the straightedge length, max gap, and tile size limit used so Tile assess does not re-argue the pass."}]'::jsonb),
  (v_sl_step_verify, 'advanced',
   '[{"type":"standard","title":"Acceptance","content":"Plane is inside the recorded tile flatness limit; Tile Assess substrate is the next assembly step."},{"type":"warning","title":"Root cause","content":"Handing off an out-of-flat pour is the same failure Tile inspect gates - it only moves the crack risk downstream."}]'::jsonb)
  ON CONFLICT (step_id, instruction_level) DO UPDATE SET
    content = EXCLUDED.content,
    updated_at = now();

  -- PFMEA: flatness verify + mix ratio
  DELETE FROM public.pfmea_action_items WHERE failure_mode_id IN (v_sl_fm_flat, v_sl_fm_ratio);
  DELETE FROM public.pfmea_controls WHERE failure_mode_id IN (v_sl_fm_flat, v_sl_fm_ratio);
  DELETE FROM public.pfmea_potential_causes WHERE failure_mode_id IN (v_sl_fm_flat, v_sl_fm_ratio);
  DELETE FROM public.pfmea_potential_effects WHERE failure_mode_id IN (v_sl_fm_flat, v_sl_fm_ratio);
  DELETE FROM public.pfmea_failure_modes WHERE id IN (v_sl_fm_flat, v_sl_fm_ratio);
  DELETE FROM public.pfmea_requirements WHERE id IN (v_sl_req_flat, v_sl_req_ratio);

  INSERT INTO public.pfmea_requirements (
    id, project_id, operation_step_id, output_id, requirement_text, display_order
  ) VALUES
  (v_sl_req_flat, v_sl_id, v_sl_step_verify, 'out-sl-flat',
   'For tile with any edge over 15 in, variation under a 10 ft straightedge is at most 1/8 in (or the tighter Tile assess limit).', 1),
  (v_sl_req_ratio, v_sl_id, v_sl_step_mix, 'out-sl-mix',
   'Each batch uses the manufacturer water-to-powder ratio with no free water added for flow.', 1);

  INSERT INTO public.pfmea_failure_modes (
    id, project_id, operation_step_id, requirement_id, failure_mode, severity_score
  ) VALUES
  (v_sl_fm_flat, v_sl_id, v_sl_step_verify, v_sl_req_flat,
   'Variation under a 10 ft straightedge exceeds 1/8 in for large-format tile (or exceeds the Tile assess limit).', 8),
  (v_sl_fm_ratio, v_sl_id, v_sl_step_mix, v_sl_req_ratio,
   'Batches are wetter than the data-sheet ratio or free water is added after mixing.', 7);

  INSERT INTO public.pfmea_potential_effects (failure_mode_id, effect_description, severity_score) VALUES
  (v_sl_fm_flat, 'Tile lippage and cracked grout appear after set because the underlayment plane was never inside limit.', 8),
  (v_sl_fm_ratio, 'Weak, dusty, or segregated surface that rejects primer and tile mortar.', 7);

  INSERT INTO public.pfmea_potential_causes (
    failure_mode_id, cause_description, occurrence_score, occurrence_driver, implicated_item_kind, implicated_item_id
  ) VALUES
  (v_sl_fm_flat, 'Straightedge check is skipped and the pour is handed to Tile on appearance alone.', 6, 'attention', 'output', 'out-sl-flat'),
  (v_sl_fm_ratio, 'Water is added at the pour to chase flow after the mix starts to stiffen.', 6, 'skill', 'output', 'out-sl-mix');

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_sl_fm_flat, c.id,
    'Require a logged straightedge pass against the Tile size limit before marking the handoff complete.',
    'detection', 2, NULL
  FROM public.pfmea_potential_causes c WHERE c.failure_mode_id = v_sl_fm_flat;

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_sl_fm_ratio, c.id,
    'Measure mix water per bag before powder goes in; discard batches that need free water to move.',
    'prevention', NULL, 'procedural'
  FROM public.pfmea_potential_causes c WHERE c.failure_mode_id = v_sl_fm_ratio;

  -- =========================================================================
  -- B) Subfloor Replacement
  -- =========================================================================
  UPDATE public.project_phases SET
    description = 'Remove failed decking to solid bearing and repair joists before new panels go down.',
    updated_at = now()
  WHERE id = v_sf_phase_removal AND project_id = v_sf_id;

  UPDATE public.project_phases SET
    description = 'Dry-lay, then glue and screw new subfloor panels to framing with staggered joints.',
    updated_at = now()
  WHERE id = v_sf_phase_install AND project_id = v_sf_id;

  UPDATE public.project_phases SET
    description = 'Plane seams and prove the deck is quiet and stiff before returning to Tile Assess substrate.',
    updated_at = now()
  WHERE id = v_sf_phase_finish AND project_id = v_sf_id;

  UPDATE public.operation_steps SET
    description = 'Cut failed panels back to joist centers so replacement sheets bear on solid framing.',
    skill_level = 'Intermediate', step_type = 'prime', flow_type = 'prime',
    time_estimate_low = 1.0, time_estimate_med = 2.0, time_estimate_high = 4.0,
    outputs = jsonb_build_array(jsonb_build_object(
      'id', 'out-sf-cut', 'name', 'Opening to joist centers',
      'type', 'performance-durability',
      'description', 'Saw lines land on framing; unsupported panel edges are gone.',
      'qualityChecks', 'New panel edges will land on joist faces, not mid-span.'
    )),
    updated_at = now()
  WHERE id = v_sf_step_cut;

  UPDATE public.operation_steps SET
    description = 'Inspect joists for rot, split, or crush; sister, block, or replace before new panels bear on compromised wood.',
    skill_level = 'Intermediate', step_type = 'prime', flow_type = 'prime',
    time_estimate_low = 1.0, time_estimate_med = 2.5, time_estimate_high = 5.0,
    outputs = jsonb_build_array(jsonb_build_object(
      'id', 'out-sf-joist', 'name', 'Sound joist bearing',
      'type', 'performance-durability',
      'description', 'Framing under the repair is solid, sistered, or replaced as needed.',
      'qualityChecks', 'No soft wood, missing bearing, or unrepaired splits under the new panel footprint.'
    )),
    updated_at = now()
  WHERE id = v_sf_step_joist;

  UPDATE public.operation_steps SET
    description = 'Dry-lay panels with staggered joints, required gaps, and thickness that matches the finished floor stack.',
    skill_level = 'Beginner', step_type = 'prime', flow_type = 'prime',
    time_estimate_low = 0.5, time_estimate_med = 1.0, time_estimate_high = 2.0,
    outputs = jsonb_build_array(jsonb_build_object(
      'id', 'out-sf-drylay', 'name', 'Staggered dry layout',
      'type', 'none',
      'description', 'Panel joints are offset; gaps and thickness are confirmed before adhesive.',
      'qualityChecks', 'No four-corner intersections; gaps match the panel manufacturer.'
    )),
    updated_at = now()
  WHERE id = v_sf_step_drylay;

  UPDATE public.operation_steps SET
    description = 'Run construction adhesive on joists and fasten panels with screws at the specified spacing on every support.',
    skill_level = 'Intermediate', step_type = 'prime', flow_type = 'prime',
    time_estimate_low = 1.0, time_estimate_med = 2.0, time_estimate_high = 3.5,
    outputs = jsonb_build_array(jsonb_build_object(
      'id', 'out-sf-glue', 'name', 'Glued and screwed deck',
      'type', 'performance-durability',
      'description', 'Adhesive ribbons and fastener schedule follow the panel/APA-style spec on each joist.',
      'qualityChecks', 'No hollow corners; fasteners hit framing on the layout marks.'
    )),
    updated_at = now()
  WHERE id = v_sf_step_glue;

  UPDATE public.operation_steps SET
    description = 'Sand or plane proud seams without cutting through face veneers.',
    skill_level = 'Beginner', step_type = 'prime', flow_type = 'prime',
    time_estimate_low = 0.5, time_estimate_med = 1.0, time_estimate_high = 2.0,
    outputs = jsonb_build_array(jsonb_build_object(
      'id', 'out-sf-sand', 'name', 'Flush seams',
      'type', 'major-aesthetics',
      'description', 'High edges are brought flush for underlayment.',
      'qualityChecks', 'Straightedge across seams shows no proud lip that will telegraph.'
    )),
    updated_at = now()
  WHERE id = v_sf_step_sand;

  UPDATE public.operation_steps SET
    description =
      'Walk and probe the repair for bounce, squeak, or soft spots; re-fasten as needed, then return to Tile Flooring Assess substrate - do not start membrane, backer, or self-leveler here.',
    skill_level = 'Intermediate', step_type = 'prime', flow_type = 'prime',
    time_estimate_low = 0.3, time_estimate_med = 0.6, time_estimate_high = 1.0,
    outputs = jsonb_build_array(
      jsonb_build_object(
        'id', 'out-sf-bounce',
        'name', 'Stiff quiet deck',
        'type', 'performance-durability',
        'description', 'Repair area does not bounce, squeak, or feel soft under a walking load.',
        'qualityChecks', 'Heel-drop and walk check pass; loose fasteners are re-driven before handoff.'
      ),
      jsonb_build_object(
        'id', 'out-sf-handoff',
        'name', 'Ready to resume Tile Assess substrate',
        'type', 'none',
        'description', 'Structure and panel work are complete so Tile Prepare subfloor / Assess substrate can continue.',
        'qualityChecks', 'No open joist repair remains; Tile assess is the next assembly step.'
      )
    ),
    updated_at = now()
  WHERE id = v_sf_step_bounce;

  INSERT INTO public.step_instructions (step_id, instruction_level, content) VALUES
  (v_sf_step_cut, 'beginner',
   '[{"type":"standard","title":"Find bearing","content":"Snap or mark cut lines over joist centers. Cut only what failed - leave sound panels that already bear correctly."},{"type":"warning","title":"Utilities","content":"Check for wiring and plumbing under the cut before the saw enters the bay."}]'::jsonb),
  (v_sf_step_cut, 'intermediate',
   '[{"type":"standard","title":"Clean edge","content":"Square the opening so the replacement panel has full bearing on framing at every edge that needs support."}]'::jsonb),
  (v_sf_step_cut, 'advanced',
   '[{"type":"standard","title":"Acceptance","content":"All cut edges land on joist faces sized for the new panel thickness."}]'::jsonb),
  (v_sf_step_joist, 'beginner',
   '[{"type":"standard","title":"Probe framing","content":"Probe joists for soft wood, crush at bearings, and splits. Do not set new panels on compromised members."},{"type":"standard","title":"Repair","content":"Sister, block, or replace per the damage before decking returns."}]'::jsonb),
  (v_sf_step_joist, 'intermediate',
   '[{"type":"warning","title":"Load path","content":"Sisters need adequate fastener schedule and bearing length - a short scab is not a joist repair."}]'::jsonb),
  (v_sf_step_joist, 'advanced',
   '[{"type":"standard","title":"Acceptance","content":"Every joist under the repair can take panel fasteners without crushing or rotating."}]'::jsonb),
  (v_sf_step_drylay, 'beginner',
   '[{"type":"standard","title":"Stagger","content":"Offset end joints. Keep manufacturer edge gaps. Confirm thickness matches the finished floor height plan."}]'::jsonb),
  (v_sf_step_drylay, 'intermediate',
   '[{"type":"tip","title":"Handoff thickness","content":"If Tile will add membrane or backer, leave room in the stack - do not build a finished height surprise."}]'::jsonb),
  (v_sf_step_drylay, 'advanced',
   '[{"type":"standard","title":"Acceptance","content":"Dry layout shows staggered joints, correct gaps, and thickness before adhesive."}]'::jsonb),
  (v_sf_step_glue, 'beginner',
   '[{"type":"standard","title":"Adhesive","content":"Apply construction adhesive ribbons on joists per the panel instructions."},{"type":"standard","title":"Screws","content":"Drive screws on the spacing pattern into every joist. Do not rely on nails alone for a tile substrate."}]'::jsonb),
  (v_sf_step_glue, 'intermediate',
   '[{"type":"warning","title":"Missed joists","content":"If a screw spins or misses framing, relocate to solid wood - hollow corners fail Tile bounce checks later."}]'::jsonb),
  (v_sf_step_glue, 'advanced',
   '[{"type":"standard","title":"Acceptance","content":"Glue and screw schedule is complete on every support under the repair."}]'::jsonb),
  (v_sf_step_sand, 'beginner',
   '[{"type":"standard","title":"Proud edges","content":"Plane or sand high seams flush. Stop before you cut through the face veneer."}]'::jsonb),
  (v_sf_step_sand, 'intermediate',
   '[{"type":"tip","title":"Dust","content":"Vacuum before the bounce check so grit does not fake a soft spot."}]'::jsonb),
  (v_sf_step_sand, 'advanced',
   '[{"type":"standard","title":"Acceptance","content":"Seams are flush enough for the next underlayment without a telegraphing lip."}]'::jsonb),
  (v_sf_step_bounce, 'beginner',
   '[{"type":"standard","title":"Walk check","content":"Walk the repair and heel-drop at seams. Re-screw anything that moves or squeaks."},{"type":"standard","title":"Handoff","content":"When the deck is quiet and stiff, return to Tile Flooring Assess substrate. Do not pour self-leveler or set membrane inside this project."},{"type":"warning","title":"Still soft","content":"If bounce remains, open the bay again - do not hand a flexible deck to Tile."}]'::jsonb),
  (v_sf_step_bounce, 'intermediate',
   '[{"type":"standard","title":"Flatness next","content":"Structure pass does not waive Tile flatness. Out-of-plane after repair still gates Self-Leveler Application from Tile assess."}]'::jsonb),
  (v_sf_step_bounce, 'advanced',
   '[{"type":"standard","title":"Acceptance","content":"Repair area passes bounce/squeak check; Tile Assess substrate is next."}]'::jsonb)
  ON CONFLICT (step_id, instruction_level) DO UPDATE SET
    content = EXCLUDED.content,
    updated_at = now();

  DELETE FROM public.pfmea_action_items WHERE failure_mode_id IN (v_sf_fm_joist, v_sf_fm_bounce);
  DELETE FROM public.pfmea_controls WHERE failure_mode_id IN (v_sf_fm_joist, v_sf_fm_bounce);
  DELETE FROM public.pfmea_potential_causes WHERE failure_mode_id IN (v_sf_fm_joist, v_sf_fm_bounce);
  DELETE FROM public.pfmea_potential_effects WHERE failure_mode_id IN (v_sf_fm_joist, v_sf_fm_bounce);
  DELETE FROM public.pfmea_failure_modes WHERE id IN (v_sf_fm_joist, v_sf_fm_bounce);
  DELETE FROM public.pfmea_requirements WHERE id IN (v_sf_req_joist, v_sf_req_bounce);

  INSERT INTO public.pfmea_requirements (
    id, project_id, operation_step_id, output_id, requirement_text, display_order
  ) VALUES
  (v_sf_req_joist, v_sf_id, v_sf_step_joist, 'out-sf-joist',
   'Joists under the repair are sound or sistered/replaced before new panels bear on them.', 1),
  (v_sf_req_bounce, v_sf_id, v_sf_step_bounce, 'out-sf-bounce',
   'The repaired deck does not bounce, squeak, or feel soft under a walking heel-drop check.', 1);

  INSERT INTO public.pfmea_failure_modes (
    id, project_id, operation_step_id, requirement_id, failure_mode, severity_score
  ) VALUES
  (v_sf_fm_joist, v_sf_id, v_sf_step_joist, v_sf_req_joist,
   'New panels are fastened onto soft, split, or crushed joists without repair.', 9),
  (v_sf_fm_bounce, v_sf_id, v_sf_step_bounce, v_sf_req_bounce,
   'The repaired area still bounces, squeaks, or feels soft under a walking heel-drop check.', 8);

  INSERT INTO public.pfmea_potential_effects (failure_mode_id, effect_description, severity_score) VALUES
  (v_sf_fm_joist, 'Tile and grout crack when the framing continues to move under the new deck.', 9),
  (v_sf_fm_bounce, 'Movement telegraphing shows up after Tile underlayment and set are already spent.', 8);

  INSERT INTO public.pfmea_potential_causes (
    failure_mode_id, cause_description, occurrence_score, occurrence_driver, implicated_item_kind, implicated_item_id
  ) VALUES
  (v_sf_fm_joist, 'Panel install starts as soon as the old deck is cut out, skipping a joist probe.', 5, 'process_design', 'output', 'out-sf-joist'),
  (v_sf_fm_bounce, 'Walk check is skipped because seams look flush.', 6, 'attention', 'output', 'out-sf-bounce');

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_sf_fm_joist, c.id,
    'Require a documented joist probe and repair decision before adhesive is opened.',
    'prevention', NULL, 'mistake_proof'
  FROM public.pfmea_potential_causes c WHERE c.failure_mode_id = v_sf_fm_joist;

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_sf_fm_bounce, c.id,
    'Heel-drop and walk the full repair; re-screw any movement before marking handoff complete.',
    'detection', 2, NULL
  FROM public.pfmea_potential_causes c WHERE c.failure_mode_id = v_sf_fm_bounce;

  -- Adopt Subfloor phases on Tile (before Self-Leveler), idempotent
  IF NOT EXISTS (
    SELECT 1 FROM public.project_phases pp
    WHERE pp.project_id = v_tile_id AND pp.source_phase_id = v_sf_phase_removal
  ) THEN
    UPDATE public.project_phases
    SET position_value = position_value + 3, updated_at = now()
    WHERE project_id = v_tile_id
      AND position_rule = 'nth'
      AND position_value >= 8;

    INSERT INTO public.project_phases (
      id, project_id, name, description, position_rule, position_value,
      is_standard, is_linked, source_project_id, source_phase_id
    ) VALUES
    (v_tile_sf_removal, v_tile_id, 'Subfloor Removal',
     'Linked from Subfloor Replacement - cut out failed decking and repair joists when Tile assess finds soft or bouncing structure.',
     'nth', 8, false, true, v_sf_id, v_sf_phase_removal),
    (v_tile_sf_install, v_tile_id, 'Subfloor Installation',
     'Linked from Subfloor Replacement - glue and screw new panels after structural repair.',
     'nth', 9, false, true, v_sf_id, v_sf_phase_install),
    (v_tile_sf_finish, v_tile_id, 'Subfloor Finishing',
     'Linked from Subfloor Replacement - flush seams and bounce-check, then return to Tile Assess substrate.',
     'nth', 10, false, true, v_sf_id, v_sf_phase_finish);
  END IF;

  -- Point Tile inspect Error-Recovery at adopted Subfloor phase names (segment ids from 20260923010000).
  UPDATE public.step_instructions
  SET
    content = (
      SELECT jsonb_agg(seg ORDER BY ordinality)
      FROM (
        SELECT
          CASE
            WHEN elem->>'id' IN ('m1-b-er', 'm1-cs-er', 'm1-a-er') THEN
              jsonb_set(
                elem,
                '{content}',
                to_jsonb(
                  'If the floor is out of flat for your tile size, stop and complete the adopted Self-Leveler Application phases (Prepare Floor & Seal / Apply Self-Leveler) - do not invent a pour here. If boards are soft, rotten, or joists bounce badly, stop and complete the adopted Subfloor Replacement phases (Subfloor Removal / Installation / Finishing) before underlayment. Fix protruding nails and oily spots before underlayment.'::text
                )
              )
            ELSE elem
          END AS seg,
          ordinality
        FROM jsonb_array_elements(content) WITH ORDINALITY AS t(elem, ordinality)
      ) rewritten
    ),
    updated_at = now()
  WHERE step_id = v_tile_step_inspect
    AND jsonb_typeof(content) = 'array'
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(content) e
      WHERE e->>'id' IN ('m1-b-er', 'm1-cs-er', 'm1-a-er')
    );

  -- =========================================================================
  -- C) Caulking Application - EJ171 soft joints
  -- =========================================================================
  UPDATE public.phase_operations
  SET
    operation_name = 'Apply silicone soft-joint sealant',
    operation_description =
      'ASTM C920 silicone at EJ171 movement joints, change-of-plane, and wet-area perimeters - with backer rod where joint depth requires it.',
    updated_at = now()
  WHERE id = '9d9ebf39-3844-4e5c-9b0f-52336a8df103'::uuid;

  UPDATE public.phase_operations
  SET
    operation_description =
      'Paintable finish-joint beads at trim and similar static gaps. Not for EJ171 movement joints or wet change-of-plane soft joints.',
    updated_at = now()
  WHERE id = '9d9ebf39-3844-4e5c-9b0f-52336a8df104'::uuid;

  UPDATE public.operation_steps SET
    step_title = 'Apply silicone soft-joint bead',
    description =
      'Install backer rod where depth requires it, then tool an ASTM C920 silicone bead at EJ171 movement joints, change-of-plane, and wet-area perimeters left open through tile set and grout.',
    skill_level = 'Intermediate',
    outputs = jsonb_build_array(
      jsonb_build_object(
        'id', 'out-silicon-coverage',
        'name', '100% coverage on intended zones',
        'type', 'performance-durability',
        'description', 'Silicone fully covers the targeted soft-joint path without skips.',
        'qualityChecks', 'Bead remains continuous from end to end with no voids at corners, transitions, or stop points.'
      ),
      jsonb_build_object(
        'id', 'out-no-bead-over-quarter-inch',
        'name', 'No bead >1/4"',
        'type', 'major-aesthetics',
        'description', 'Finished silicone bead stays at or below one-quarter inch maximum width unless the joint design calls wider.',
        'qualityChecks', 'No section visually exceeds the planned profile after tooling.'
      ),
      jsonb_build_object(
        'id', 'out-ej171-soft-joint',
        'name', 'EJ171 soft joint sealed',
        'type', 'performance-durability',
        'description', 'Movement joints and change-of-plane lines receive backer rod (when depth requires) plus ASTM C920 silicone - not grout or painters caulk.',
        'qualityChecks', 'Backer rod is compressed in deep joints; silicone bonds to both flanks and remains free to flex; no grout bridges the soft joint.'
      )
    ),
    process_variables = jsonb_build_array(
      jsonb_build_object(
        'id', 'caulk-pv-silicon-surface-dryness',
        'name', 'Surface dryness',
        'type', 'upstream',
        'required', true,
        'description', 'Joint flanks are dry before silicone. Too wet: weak adhesion and cure disruption.'
      ),
      jsonb_build_object(
        'id', 'caulk-pv-backer-rod',
        'name', 'Backer rod depth',
        'type', 'process',
        'required', true,
        'description', 'Closed-cell backer rod sets sealant depth so the bead can hourglass; missing rod in a deep joint makes a thick bead that tears.'
      ),
      jsonb_build_object(
        'id', 'caulk-pv-astm-c920',
        'name', 'Sealant class',
        'type', 'process',
        'required', true,
        'description', 'Product is an ASTM C920 silicone (or manufacturer-equivalent movement joint sealant) rated for the joint movement - not acrylic painters caulk.'
      )
    ),
    updated_at = now()
  WHERE id = v_ck_step_silicon;

  UPDATE public.operation_steps SET
    description =
      'Paintable finish-joint bead at trim and similar static gaps. Do not use painters caulk for EJ171 movement joints or wet change-of-plane soft joints - those stay on the silicone soft-joint step.',
    updated_at = now()
  WHERE id = v_ck_step_painters;

  INSERT INTO public.step_instructions (step_id, instruction_level, content) VALUES
  (v_ck_step_silicon, 'beginner',
   '[{"type":"standard","title":"Backer rod","content":"For deep EJ171 or change-of-plane joints, push closed-cell backer rod to the depth the sealant manufacturer specifies so the bead can flex."},{"type":"standard","title":"ASTM C920 silicone","content":"Load an ASTM C920 silicone (or listed equivalent). Do not fill movement joints with grout or painters caulk."},{"type":"standard","title":"Bead","content":"Pull a continuous bead that wets both flanks, then tool for contact. Keep the soft joint free of thinset and grout bridges."},{"type":"tip","title":"Where this applies","content":"Use this step for perimeters, changes of plane, and field movement joints marked during Tile layout - not for paint-grade trim gaps."}]'::jsonb),
  (v_ck_step_silicon, 'intermediate',
   '[{"type":"standard","title":"Joint geometry","content":"Match width-to-depth guidance from the sealant data sheet. Over-deep beads without backer rod tear under movement."},{"type":"warning","title":"Three-sided adhesion","content":"Prevent bonding to the joint bottom (backer rod or bond breaker) so the sealant can stretch with the assembly."},{"type":"warning","title":"Control bead size","content":"If the bead bulks beyond the planned profile, stop and correct tip size or feed before continuing."}]'::jsonb),
  (v_ck_step_silicon, 'advanced',
   '[{"type":"standard","title":"Acceptance criteria","content":"EJ171 and change-of-plane soft joints have backer rod where required and a continuous ASTM C920 silicone bead with two-sided adhesion only."},{"type":"warning","title":"Root cause control","content":"Filling a movement joint with grout or acrylic caulk is a design noncompliance - expect cracked perimeter lines after seasonal movement."}]'::jsonb)
  ON CONFLICT (step_id, instruction_level) DO UPDATE SET
    content = EXCLUDED.content,
    updated_at = now();

  INSERT INTO public.step_instructions (step_id, instruction_level, content) VALUES
  (v_ck_step_painters, 'beginner',
   '[{"type":"standard","title":"Finish joints only","content":"Use painters caulk on static paint-grade trim gaps. Soft joints from Tile layout stay on the silicone soft-joint step."},{"type":"standard","title":"Bead","content":"Pull a steady bead and tool smooth for paint."},{"type":"warning","title":"Wrong joint","content":"Do not run painters caulk into EJ171 movement joints or wet change-of-plane lines."}]'::jsonb),
  (v_ck_step_painters, 'intermediate',
   '[{"type":"standard","title":"Paint window","content":"Follow the caulk cure window before priming or topcoat."}]'::jsonb),
  (v_ck_step_painters, 'advanced',
   '[{"type":"standard","title":"Acceptance","content":"Paint-grade static joints only; movement/wet soft joints remain on silicone."}]'::jsonb)
  ON CONFLICT (step_id, instruction_level) DO UPDATE SET
    content = EXCLUDED.content,
    updated_at = now();

  DELETE FROM public.pfmea_action_items WHERE failure_mode_id = v_ck_fm_ej171;
  DELETE FROM public.pfmea_controls WHERE failure_mode_id = v_ck_fm_ej171;
  DELETE FROM public.pfmea_potential_causes WHERE failure_mode_id = v_ck_fm_ej171;
  DELETE FROM public.pfmea_potential_effects WHERE failure_mode_id = v_ck_fm_ej171;
  DELETE FROM public.pfmea_failure_modes WHERE id = v_ck_fm_ej171;
  DELETE FROM public.pfmea_requirements WHERE id = v_ck_req_ej171;

  INSERT INTO public.pfmea_requirements (
    id, project_id, operation_step_id, output_id, requirement_text, display_order
  ) VALUES
  (v_ck_req_ej171, v_ck_id, v_ck_step_silicon, 'out-ej171-soft-joint',
   'EJ171 movement joints and change-of-plane soft joints receive backer rod when depth requires it and ASTM C920 silicone - not grout or painters caulk.', 3);

  INSERT INTO public.pfmea_failure_modes (
    id, project_id, operation_step_id, requirement_id, failure_mode, severity_score
  ) VALUES
  (v_ck_fm_ej171, v_ck_id, v_ck_step_silicon, v_ck_req_ej171,
   'EJ171 or change-of-plane soft joints are filled with grout or painters caulk, or deep joints omit backer rod.', 8);

  INSERT INTO public.pfmea_potential_effects (failure_mode_id, effect_description, severity_score) VALUES
  (v_ck_fm_ej171, 'Perimeter and field movement lines crack and open after seasonal expansion.', 8);

  INSERT INTO public.pfmea_potential_causes (
    failure_mode_id, cause_description, occurrence_score, occurrence_driver, implicated_item_kind, implicated_item_id
  ) VALUES
  (v_ck_fm_ej171, 'Installer treats the open joint like a grout joint or uses leftover acrylic trim caulk.', 6, 'process_design', 'output', 'out-ej171-soft-joint');

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_ck_fm_ej171, c.id,
    'Stage ASTM C920 silicone and backer rod with the Tile layout marks; refuse grout in marked soft joints.',
    'prevention', NULL, 'mistake_proof'
  FROM public.pfmea_potential_causes c WHERE c.failure_mode_id = v_ck_fm_ej171;

  -- =========================================================================
  -- D) Baseboard & Trim Installation
  -- =========================================================================
  UPDATE public.operation_steps SET
    step_title = 'Protect finishes and pry baseboard free',
    description =
      'Score paint lines, protect the finished floor, and pry baseboard free with minimal wall damage so reinstall length can be reused or replaced cleanly.',
    skill_level = 'Beginner',
    step_type = 'prime',
    flow_type = 'prime',
    time_estimate_low = 0.5, time_estimate_med = 1.0, time_estimate_high = 2.0,
    outputs = jsonb_build_array(jsonb_build_object(
      'id', 'out-bb-removed',
      'name', 'Baseboard removed',
      'type', 'none',
      'description', 'Baseboard is free of the wall with floor and plaster damage minimized.',
      'qualityChecks', 'No uncontrolled tear-out of drywall paper; fasteners pulled or cut flush as needed.'
    )),
    updated_at = now()
  WHERE id = v_bb_step_removal;

  UPDATE public.operation_steps SET
    description =
      'Transfer stud positions and decide butt versus miter corners; note paint-grade vs stain-grade finish path for later fill/caulk choices.',
    skill_level = 'Beginner', step_type = 'prime', flow_type = 'prime',
    time_estimate_low = 0.3, time_estimate_med = 0.6, time_estimate_high = 1.0,
    outputs = jsonb_build_array(jsonb_build_object(
      'id', 'out-bb-layout', 'name', 'Stud and joint plan',
      'type', 'none',
      'description', 'Stud marks and corner joint style are decided before cutting stock.',
      'qualityChecks', 'Each run has a documented joint style and stud hits.'
    )),
    updated_at = now()
  WHERE id = v_bb_step_mark;

  UPDATE public.operation_steps SET
    description = 'Lay trim flat in the install space until moisture content stabilizes before final length cuts.',
    skill_level = 'Beginner', step_type = 'prime', flow_type = 'prime',
    time_estimate_low = 0.2, time_estimate_med = 0.3, time_estimate_high = 0.5,
    outputs = jsonb_build_array(jsonb_build_object(
      'id', 'out-bb-acclimate', 'name', 'Acclimated stock',
      'type', 'none',
      'description', 'Stock has rested in the room conditions before finish cuts.',
      'qualityChecks', 'Pieces stored flat; no immediate cut-from-truck installs.'
    )),
    updated_at = now()
  WHERE id = v_bb_step_acclimate;

  UPDATE public.operation_steps SET
    description = 'Cut and cope or miter pieces to wall length so corners close on the planned joint style.',
    skill_level = 'Intermediate', step_type = 'prime', flow_type = 'prime',
    time_estimate_low = 1.0, time_estimate_med = 2.0, time_estimate_high = 3.5,
    outputs = jsonb_build_array(jsonb_build_object(
      'id', 'out-bb-fit', 'name', 'Fitted lengths',
      'type', 'major-aesthetics',
      'description', 'Pieces fit wall length with corners matching the chosen joint.',
      'qualityChecks', 'Dry-fit shows tight corners without forcing bows into the wall.'
    )),
    updated_at = now()
  WHERE id = v_bb_step_cut;

  UPDATE public.operation_steps SET
    description = 'Fasten into studs on a consistent line without splitting faces or missing framing.',
    skill_level = 'Beginner', step_type = 'prime', flow_type = 'prime',
    time_estimate_low = 0.8, time_estimate_med = 1.5, time_estimate_high = 2.5,
    outputs = jsonb_build_array(jsonb_build_object(
      'id', 'out-bb-fasten', 'name', 'Fastened to studs',
      'type', 'performance-durability',
      'description', 'Nails or screws hit framing; faces are not split.',
      'qualityChecks', 'No hollow hits along the run; reveal line stays consistent.'
    )),
    updated_at = now()
  WHERE id = v_bb_step_fasten;

  UPDATE public.operation_steps SET
    description =
      'Fill fastener holes for the chosen finish path: putty/filler for paint-grade; stain-matched filler or plugs for stain-grade.',
    skill_level = 'Beginner', step_type = 'prime', flow_type = 'prime',
    time_estimate_low = 0.5, time_estimate_med = 1.0, time_estimate_high = 1.5,
    outputs = jsonb_build_array(jsonb_build_object(
      'id', 'out-bb-fill', 'name', 'Filled fastener holes',
      'type', 'major-aesthetics',
      'description', 'Holes filled level with a product compatible with paint-grade or stain-grade finish.',
      'qualityChecks', 'Filler is flush; stain-grade filler matches species intent.'
    )),
    updated_at = now()
  WHERE id = v_bb_step_fill;

  UPDATE public.operation_steps SET
    step_title = 'Seal paint-grade joints; defer soft joints to Caulking',
    description =
      'On paint-grade runs, use painters caulk only at static trim-to-wall gaps. On stain-grade runs, skip face caulk that would bury the grain. EJ171 and wet change-of-plane soft joints stay in Caulking Application - do not duplicate that bead here.',
    skill_level = 'Beginner', step_type = 'prime', flow_type = 'prime',
    time_estimate_low = 0.4, time_estimate_med = 0.8, time_estimate_high = 1.2,
    outputs = jsonb_build_array(
      jsonb_build_object(
        'id', 'out-bb-paint-seal',
        'name', 'Paint-grade static gaps sealed',
        'type', 'major-aesthetics',
        'description', 'Paint-grade trim-to-wall static gaps receive painters caulk where the finish path requires it.',
        'qualityChecks', 'No painters caulk on stain-grade faces; no attempt to seal Tile EJ171 soft joints in this step.'
      ),
      jsonb_build_object(
        'id', 'out-bb-soft-joint-deferred',
        'name', 'Soft joints deferred to Caulking',
        'type', 'none',
        'description', 'Movement and wet soft joints remain assigned to Caulking Application.',
        'qualityChecks', 'No acrylic bead in marked EJ171 or change-of-plane joints.'
      )
    ),
    updated_at = now()
  WHERE id = v_bb_step_caulk;

  INSERT INTO public.step_instructions (step_id, instruction_level, content) VALUES
  (v_bb_step_removal, 'beginner',
   '[{"type":"standard","title":"Protect the floor","content":"Pad the finished floor. Score the top paint line so pry force does not peel wall paper."},{"type":"standard","title":"Pry","content":"Work a stiff putty knife then a bar behind the board, moving along the run instead of one big pull."}]'::jsonb),
  (v_bb_step_removal, 'intermediate',
   '[{"type":"tip","title":"Reuse","content":"Label pieces if they will return. Pull nails through the back to avoid face blowout."}]'::jsonb),
  (v_bb_step_removal, 'advanced',
   '[{"type":"standard","title":"Acceptance","content":"Boards are free with localized wall damage only; floor finish is intact."}]'::jsonb),
  (v_bb_step_mark, 'beginner',
   '[{"type":"standard","title":"Studs and corners","content":"Mark studs and pick butt vs miter/cope per corner. Note whether this run is paint-grade or stain-grade."}]'::jsonb),
  (v_bb_step_mark, 'intermediate',
   '[{"type":"tip","title":"Finish path","content":"Paint-grade allows later trim caulk. Stain-grade needs tight joinery and matched filler instead of face caulk."}]'::jsonb),
  (v_bb_step_mark, 'advanced',
   '[{"type":"standard","title":"Acceptance","content":"Each run has stud hits and a finish-path note before cutting."}]'::jsonb),
  (v_bb_step_acclimate, 'beginner',
   '[{"type":"standard","title":"Stage flat","content":"Stickers or flat stack in the room. Do not cut final lengths off a cold truck load."}]'::jsonb),
  (v_bb_step_acclimate, 'intermediate',
   '[{"type":"standard","title":"Time","content":"Follow the mill or finish schedule for acclimation before finish cuts."}]'::jsonb),
  (v_bb_step_acclimate, 'advanced',
   '[{"type":"standard","title":"Acceptance","content":"Stock has rested in room conditions before final length cuts."}]'::jsonb),
  (v_bb_step_cut, 'beginner',
   '[{"type":"standard","title":"Dry-fit","content":"Cut long, dry-fit, then sneak up on the line. Inside corners usually cope for paint-grade; stain-grade needs the cleaner joint you planned."}]'::jsonb),
  (v_bb_step_cut, 'intermediate',
   '[{"type":"warning","title":"Force fit","content":"Do not bow a tight piece into place - it will open later and telegraph at the floor."}]'::jsonb),
  (v_bb_step_cut, 'advanced',
   '[{"type":"standard","title":"Acceptance","content":"Dry-fit corners close without springing the board off the wall."}]'::jsonb),
  (v_bb_step_fasten, 'beginner',
   '[{"type":"standard","title":"Hit studs","content":"Shoot into stud marks. Keep a consistent reveal above the finished floor."}]'::jsonb),
  (v_bb_step_fasten, 'intermediate',
   '[{"type":"tip","title":"Split control","content":"Predrill near ends on hardwood stain-grade stock."}]'::jsonb),
  (v_bb_step_fasten, 'advanced',
   '[{"type":"standard","title":"Acceptance","content":"Fasteners hit framing; face remains unsplit."}]'::jsonb),
  (v_bb_step_fill, 'beginner',
   '[{"type":"standard","title":"Paint-grade","content":"Fill holes with paintable filler and sand flush."},{"type":"standard","title":"Stain-grade","content":"Use stain-matched filler or plugs - do not smear paint filler on a stain face."}]'::jsonb),
  (v_bb_step_fill, 'intermediate',
   '[{"type":"tip","title":"Sequence","content":"Fill before the finish coat path you already chose on the linked Tile phase name (paint-grade vs stain-grade)."}]'::jsonb),
  (v_bb_step_fill, 'advanced',
   '[{"type":"standard","title":"Acceptance","content":"Filler is flush and compatible with the finish path."}]'::jsonb),
  (v_bb_step_caulk, 'beginner',
   '[{"type":"standard","title":"Paint-grade only","content":"Caulk static trim-to-wall gaps on paint-grade runs with painters caulk."},{"type":"standard","title":"Stain-grade","content":"Do not bury stain-grade faces in caulk. Rely on fit and matched filler."},{"type":"warning","title":"Soft joints","content":"Tile EJ171 and wet change-of-plane beads belong in Caulking Application - stop and use that project instead of inventing a bead here."}]'::jsonb),
  (v_bb_step_caulk, 'intermediate',
   '[{"type":"standard","title":"Scope limit","content":"This step finishes trim gaps. Soft-joint geometry, backer rod, and ASTM C920 live on Caulking Application."}]'::jsonb),
  (v_bb_step_caulk, 'advanced',
   '[{"type":"standard","title":"Acceptance","content":"Paint-grade static gaps sealed when required; stain-grade faces clean; EJ171 soft joints deferred to Caulking."}]'::jsonb)
  ON CONFLICT (step_id, instruction_level) DO UPDATE SET
    content = EXCLUDED.content,
    updated_at = now();

  UPDATE public.phase_operations
  SET
    operation_name = 'Remove baseboard',
    operation_description = 'Protect finishes and free existing baseboard for reuse or replacement.',
    updated_at = now()
  WHERE id = '61a2217d-afb3-44ce-af37-2f98624c8117'::uuid;

  UPDATE public.phase_operations
  SET
    operation_description =
      'Fill fastener holes for the finish path. Paint-grade may use trim caulk at static gaps; stain-grade does not get face caulk. EJ171 soft joints stay in Caulking Application.',
    updated_at = now()
  WHERE id = 'b45eb00d-1a7e-4c1d-9f02-b45e00000004'::uuid;

  -- =========================================================================
  -- E) Rebuild phases JSON on touched catalog roots
  -- =========================================================================
  PERFORM public.rebuild_phases_json_from_project_phases_internal(v_sl_id);
  PERFORM public.rebuild_phases_json_from_project_phases_internal(v_sf_id);
  PERFORM public.rebuild_phases_json_from_project_phases_internal(v_ck_id);
  PERFORM public.rebuild_phases_json_from_project_phases_internal(v_bb_id);
  PERFORM public.rebuild_phases_json_from_project_phases_internal(v_tile_id);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Tile companion TCNA handoff bundle applied (tile=%, sl=%, sf=%, ck=%, bb=%).',
    v_tile_id, v_sl_id, v_sf_id, v_ck_id, v_bb_id;
END
$migration$;
