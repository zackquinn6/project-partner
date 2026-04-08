-- Step 2 — step_instructions only (AI_PROJECT_DEVELOPMENT_REFERENCE.md §B).
-- Template: Caulking Application. Prereq: operation_steps from step 1 (same ids as 2026_04_01 migration).
-- Idempotent: ON CONFLICT (step_id, instruction_level).

DO $$
DECLARE
  v_project_id CONSTANT uuid := 'dbd4d8b4-da79-4fc0-b53a-c8caa1768db1'::uuid;
  v_step_rows integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = v_project_id) THEN
    RAISE EXCEPTION 'Project not found for Caulking Application step 2: %', v_project_id;
  END IF;

  SELECT count(*)::integer
  INTO v_step_rows
  FROM public.operation_steps os
  INNER JOIN public.phase_operations po ON po.id = os.operation_id
  INNER JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND os.id IN (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df201'::uuid,
      '9d9ebf39-3844-4e5c-9b0f-52336a8df202'::uuid,
      '9d9ebf39-3844-4e5c-9b0f-52336a8df203'::uuid,
      '9d9ebf39-3844-4e5c-9b0f-52336a8df204'::uuid
    );

  IF v_step_rows <> 4 THEN
    RAISE EXCEPTION
      'Caulking Application step 2 prereq failed: expected 4 operation_steps linked to project_id=%, found %. Apply step 1 structure first.',
      v_project_id,
      v_step_rows;
  END IF;

  INSERT INTO public.step_instructions (step_id, instruction_level, content)
  VALUES
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df201'::uuid,
      'beginner',
      jsonb_build_array(
        jsonb_build_object('title','Removal path','content','Score both bead edges before lifting material out of the joint. Pull loose sections first, then slice tight sections in short passes.','type','standard'),
        jsonb_build_object('title','Control damage','content','Keep blade pressure on the old caulk, not on the finish surface.','type','warning'),
        jsonb_build_object('title','Output check','content','No loose or detached caulk remains in the target zone.','type','tip')
      )
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df201'::uuid,
      'intermediate',
      jsonb_build_array(
        jsonb_build_object('title','Edge release','content','Break adhesion at both substrate faces before pulling. Avoid stretching old bead across clean surfaces.','type','standard'),
        jsonb_build_object('title','Joint preservation','content','Stop and rescore if the bead resists; do not pry hard enough to chip tile, trim, or drywall paper.','type','warning')
      )
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df201'::uuid,
      'advanced',
      jsonb_build_array(
        jsonb_build_object('title','Failure prevention','content','Any remnant left proud in the joint will telegraph through the new bead and reduce adhesion continuity.','type','warning'),
        jsonb_build_object('title','Acceptance criteria','content','Joint faces are exposed and free of loose sealant bridges.','type','standard')
      )
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df202'::uuid,
      'beginner',
      jsonb_build_array(
        jsonb_build_object('title','Surface prep','content','Wipe out dust and residue from the opened joint, then let the area dry fully before applying new caulk.','type','standard'),
        jsonb_build_object('title','Why it matters','content','Fresh caulk will not bond well to soap film, sanding dust, or damp residue.','type','warning'),
        jsonb_build_object('title','Output check','content','Surface is visibly clean, dry, and ready for bead placement.','type','tip')
      )
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df202'::uuid,
      'intermediate',
      jsonb_build_array(
        jsonb_build_object('title','Joint conditioning','content','Remove residual particles at corners and profile changes before final wipe-down.','type','standard'),
        jsonb_build_object('title','Stop condition','content','If the joint is still damp, wait. Do not trap moisture under a new bead.','type','warning')
      )
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df202'::uuid,
      'advanced',
      jsonb_build_array(
        jsonb_build_object('title','Adhesion gate','content','Substrate cleanliness is a hard gate; incomplete prep creates bond failure even when bead shape looks acceptable.','type','warning'),
        jsonb_build_object('title','Acceptance criteria','content','Joint faces present clean, dry, contamination-free contact surfaces.','type','standard')
      )
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df203'::uuid,
      'beginner',
      jsonb_build_array(
        jsonb_build_object('title','Tip setup','content','Cut the silicon tube tip on an angle with a small opening first. You can enlarge the opening later, but you cannot make it smaller.','type','standard'),
        jsonb_build_object('title','Bead placement','content','Pull a steady bead through the full wet-area joint so the sealant touches both sides of the gap continuously.','type','standard'),
        jsonb_build_object('title','Output checks','content','Bead stays continuous and does not exceed 1/4 inch width.','type','tip')
      )
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df203'::uuid,
      'intermediate',
      jsonb_build_array(
        jsonb_build_object('title','Wet-area focus','content','Prioritize complete waterproof joint contact at corners, fixture transitions, and splash zones.','type','standard'),
        jsonb_build_object('title','Control bead size','content','If the bead starts bulking beyond the target profile, stop and correct feed speed or tip size before continuing.','type','warning')
      )
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df203'::uuid,
      'advanced',
      jsonb_build_array(
        jsonb_build_object('title','Root cause control','content','Oversized tip diameter increases material discharge fast and makes quarter-inch bead control difficult, especially at short joints and corners.','type','warning'),
        jsonb_build_object('title','Acceptance criteria','content','Continuous silicon bead covers the intended wet-area zone with controlled width.','type','standard')
      )
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df204'::uuid,
      'beginner',
      jsonb_build_array(
        jsonb_build_object('title','Tip setup','content','Cut the painters caulk tube tip on an angle with a small opening matched to the finish joint.','type','standard'),
        jsonb_build_object('title','Bead placement','content','Run a steady bead along the trim or drywall joint, then smooth it to an even finish-ready profile.','type','standard'),
        jsonb_build_object('title','Output checks','content','Finished bead is smooth, continuous, and no wider than 1/4 inch.','type','tip')
      )
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df204'::uuid,
      'intermediate',
      jsonb_build_array(
        jsonb_build_object('title','Finish-joint focus','content','Keep the bead narrow and consistent so it disappears into the paint line instead of reading as a heavy filler strip.','type','standard'),
        jsonb_build_object('title','Profile control','content','If the joint starts crowning or smearing past the target line, reduce output and retool immediately.','type','warning')
      )
    ),
    (
      '9d9ebf39-3844-4e5c-9b0f-52336a8df204'::uuid,
      'advanced',
      jsonb_build_array(
        jsonb_build_object('title','Aesthetic gate','content','Painters caulk is judged heavily by profile smoothness and width discipline; oversized bead shape creates visible finish defects even when coverage is complete.','type','warning'),
        jsonb_build_object('title','Acceptance criteria','content','Bead reads as a smooth, narrow finish joint with full coverage.','type','standard')
      )
    )
  ON CONFLICT (step_id, instruction_level) DO UPDATE
  SET content = EXCLUDED.content;

  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(v_project_id)
  WHERE id = v_project_id;
END $$;
