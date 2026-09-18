-- Step 9: PFMEA for Professional-only Tile Flooring steps.
-- Requirements hang off Step 3 output ids. Outputs typed none get no failure mode.

DO $migration$
DECLARE
  v_project_id uuid;
  v_step_clips CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000005'::uuid;
  v_step_final CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000006'::uuid;
  v_count integer;
  v_req_clips_a uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000101'::uuid;
  v_req_clips_b uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000102'::uuid;
  v_req_clips_c uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000103'::uuid;
  v_req_final_a uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000104'::uuid;
  v_req_final_b uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000105'::uuid;
  v_req_final_c uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000106'::uuid;
  v_fm_clips_a uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000201'::uuid;
  v_fm_clips_b uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000202'::uuid;
  v_fm_clips_c uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000203'::uuid;
  v_fm_final_a uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000204'::uuid;
  v_fm_final_b uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000205'::uuid;
  v_fm_final_c uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000206'::uuid;
BEGIN
  SELECT p.id INTO v_project_id
  FROM public.projects p
  WHERE lower(btrim(p.name)) = 'tile flooring installation'
    AND p.parent_project_id IS NULL
  ORDER BY p.is_current_version DESC NULLS LAST, p.updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Tile Flooring Installation root project not found.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.operation_steps
    WHERE id = v_step_clips AND outputs IS NOT NULL AND jsonb_typeof(outputs) = 'array'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.operation_steps
    WHERE id = v_step_final AND outputs IS NOT NULL AND jsonb_typeof(outputs) = 'array'
  ) THEN
    RAISE EXCEPTION 'Quality-gated outputs missing. Apply step 3 outputs migration first.';
  END IF;

  -- Clear prior authored PFMEA for these two steps (children first).
  DELETE FROM public.pfmea_action_items
  WHERE failure_mode_id IN (
    SELECT fm.id FROM public.pfmea_failure_modes fm
    WHERE fm.operation_step_id IN (v_step_clips, v_step_final)
  );

  DELETE FROM public.pfmea_controls
  WHERE failure_mode_id IN (
    SELECT fm.id FROM public.pfmea_failure_modes fm
    WHERE fm.operation_step_id IN (v_step_clips, v_step_final)
  )
  OR cause_id IN (
    SELECT c.id FROM public.pfmea_potential_causes c
    JOIN public.pfmea_failure_modes fm ON fm.id = c.failure_mode_id
    WHERE fm.operation_step_id IN (v_step_clips, v_step_final)
  );

  DELETE FROM public.pfmea_potential_causes
  WHERE failure_mode_id IN (
    SELECT fm.id FROM public.pfmea_failure_modes fm
    WHERE fm.operation_step_id IN (v_step_clips, v_step_final)
  );

  DELETE FROM public.pfmea_potential_effects
  WHERE failure_mode_id IN (
    SELECT fm.id FROM public.pfmea_failure_modes fm
    WHERE fm.operation_step_id IN (v_step_clips, v_step_final)
  );

  DELETE FROM public.pfmea_failure_modes
  WHERE operation_step_id IN (v_step_clips, v_step_final);

  DELETE FROM public.pfmea_requirements
  WHERE operation_step_id IN (v_step_clips, v_step_final);

  INSERT INTO public.pfmea_requirements (
    id, project_id, operation_step_id, output_id, requirement_text, display_order
  ) VALUES
  (v_req_clips_a, v_project_id, v_step_clips, 'out-cl1a',
   'Every shared edge in the Professional field carries clips at the manufacturer spacing while mortar is plastic.', 1),
  (v_req_clips_b, v_project_id, v_step_clips, 'out-cl1b',
   'Lippage between clipped neighbors stays within 1/32 in plus measured tile warpage for joints under 1/4 in.', 2),
  (v_req_clips_c, v_project_id, v_step_clips, 'out-cl1c',
   'After tension, joint width still matches the layout spacer plan.', 3),
  (v_req_final_a, v_project_id, v_step_final, 'out-ff1a',
   'Finished lippage under raking light stays within 1/32 in plus warpage for joints under 1/4 in.', 1),
  (v_req_final_b, v_project_id, v_step_final, 'out-ff1b',
   'Joint width and visible cut edges meet the layout and transition plan.', 2),
  (v_req_final_c, v_project_id, v_step_final, 'out-ff1c',
   'Movement joints are sealant, not grout, at every EJ171 location.', 3);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 6 THEN
    RAISE EXCEPTION 'Expected 6 PFMEA requirements, inserted %.', v_count;
  END IF;

  INSERT INTO public.pfmea_failure_modes (
    id, project_id, operation_step_id, requirement_id, failure_mode, severity_score
  ) VALUES
  (v_fm_clips_a, v_project_id, v_step_clips, v_req_clips_a,
   'Shared edges are left without clips on large-format runs.', 7),
  (v_fm_clips_b, v_project_id, v_step_clips, v_req_clips_b,
   'Clips are tensioned after the mortar skins, so faces never pull flush.', 8),
  (v_fm_clips_c, v_project_id, v_step_clips, v_req_clips_c,
   'Clip tension pinches joints closed below the layout spacer size.', 6),
  (v_fm_final_a, v_project_id, v_step_final, v_req_final_a,
   'Raking-light lippage is accepted after cure instead of marked for replacement.', 7),
  (v_fm_final_b, v_project_id, v_step_final, v_req_final_b,
   'Joint taper and chipped sight-line cuts are left undocumented.', 5),
  (v_fm_final_c, v_project_id, v_step_final, v_req_final_c,
   'Perimeter or field movement joints remain bridged with grout.', 8);

  INSERT INTO public.pfmea_potential_effects (failure_mode_id, effect_description, severity_score) VALUES
  (v_fm_clips_a, 'Lippage cures into the field on the most visible large-format runs and can only be fixed by breaking out tile.', 7),
  (v_fm_clips_b, 'Proud edges become permanent shadow lines under raking light with no plastic window left to correct them.', 8),
  (v_fm_clips_c, 'Pinched joints starve grout depth and read as a tight dark line across the pattern.', 6),
  (v_fm_final_a, 'A Professional close-out that still fails a critical-eye plane check, forcing late tile replacement after furniture planning.', 7),
  (v_fm_final_b, 'Doorway and entry sight lines show taper or chipped glaze that visitors notice first.', 5),
  (v_fm_final_c, 'Building movement cracks tile or tents the floor along the bridged joint.', 8);

  INSERT INTO public.pfmea_potential_causes (
    failure_mode_id, cause_description, occurrence_score,
    occurrence_driver, implicated_item_kind, implicated_item_id
  ) VALUES
  (v_fm_clips_a,
   'The crew sets a full row before placing clips, then runs out of open time on the early tiles.', 6,
   'process_design', 'process_variable', 'pv-cl-open'),
  (v_fm_clips_a,
   'Clip packs are staged far from the work face, so edges are skipped to keep pace.', 5,
   'attention', 'material', 'mt-cl-clips'),
  (v_fm_clips_b,
   'Tension is deferred until a whole section is set, past the mortar adjustment window.', 7,
   'process_design', 'process_variable', 'pv-cl-open'),
  (v_fm_clips_b,
   'Straightedge checks are skipped, so soft-mortar lippage is never seen while clips can still pull it down.', 6,
   'attention', 'tool', 'tl-cl-straight'),
  (v_fm_clips_c,
   'Wedges are driven to maximum tension without re-measuring joint width after pull.', 6,
   'skill', 'process_variable', 'pv-cl-joint'),
  (v_fm_final_a,
   'Inspection is done under diffuse overhead light that hides edge shadows.', 6,
   'process_design', 'tool', 'tl-ff-light'),
  (v_fm_final_a,
   'Known proud tiles are left because replacement would delay furniture delivery.', 5,
   'attention', 'output', 'out-ff1a'),
  (v_fm_final_b,
   'Joint width is measured only at the start wall, missing taper at the far wall.', 5,
   'attention', 'process_variable', 'pv-ff-joint'),
  (v_fm_final_c,
   'Grout was packed through the perimeter during the grout step and never cut out.', 6,
   'process_design', 'output', 'out-ff1c');

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_clips_a, c.id,
    'Place clips on each shared edge immediately after the tile is beat in, before the next tile is set.',
    'prevention', NULL, 'mistake_proof'
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_clips_a
    AND c.implicated_item_id = 'pv-cl-open';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_clips_a, c.id,
    'Stage opened clip bags on the floor beside the working edge so every joint is clipped without a walk-back.',
    'prevention', NULL, 'procedural'
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_clips_a
    AND c.implicated_item_id = 'mt-cl-clips';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_clips_b, c.id,
    'Tension clips inside the mortar adjustment window printed on the bag. Do not leave tension for a later pass.',
    'prevention', NULL, 'mistake_proof'
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_clips_b
    AND c.implicated_item_id = 'pv-cl-open';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_clips_b, c.id,
    'Straightedge every newly clipped joint before skin-over. Mark any catch for re-tension or lift.',
    'detection', 4, NULL
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_clips_b
    AND c.implicated_item_id = 'tl-cl-straight';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_clips_c, c.id,
    'After tension, measure the joint with the same spacer used in layout. Back off one click if the joint pinched.',
    'prevention', NULL, 'procedural'
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_clips_c;

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_final_a, c.id,
    'Inspect with a flashlight held low so light rakes across the surface in both directions.',
    'detection', 3, NULL
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_final_a
    AND c.implicated_item_id = 'tl-ff-light';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_final_a, c.id,
    'Mark every failed tile with tape and open a replacement note before furniture planning continues.',
    'prevention', NULL, 'procedural'
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_final_a
    AND c.implicated_item_id = 'out-ff1a';

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_final_b, c.id,
    'Measure joint width at start, mid-field, and far wall on at least two long runs.',
    'detection', 4, NULL
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_final_b;

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_description, control_type, detection_score, control_strength
  )
  SELECT v_fm_final_c, c.id,
    'Cut grout bridges out of movement joints and install the specified sealant before close-out sign-off.',
    'prevention', NULL, 'mistake_proof'
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_final_c;

  -- Action items on High lines (severity 7+ with weak detection / high occurrence paths).
  INSERT INTO public.pfmea_action_items (failure_mode_id, recommended_action, status) VALUES
  (v_fm_clips_a,
   'Change the set sequence so clips are placed on each tile before the next tile is laid. Do not batch-clip a finished row.',
   'not_started'),
  (v_fm_clips_b,
   'Add a timed open-window check: after each 20 sq ft, confirm every clip in that zone is already tensioned.',
   'not_started'),
  (v_fm_final_a,
   'Require a raking-light photo set per room before Professional close-out is marked complete.',
   'not_started'),
  (v_fm_final_c,
   'Add a movement-joint probe to the final checklist and block close-out while any grout bridge remains.',
   'not_started');

  RAISE NOTICE 'Tile quality-gated PFMEA authored for project %', v_project_id;
END
$migration$;
