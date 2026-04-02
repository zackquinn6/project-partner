-- Step 1 of project development: Toilet Replacement - operations, steps, descriptions, 3-level instructions
-- Project ID: 8267c526-036d-4f5c-9f17-2ee1b3d87886
-- Phases required: Removal, Installation
--
-- Stable IDs: ops ...f21f1..f21f4 | steps ...f21e1..f21ea
--

DO $$
DECLARE
  v_project_id CONSTANT uuid := '8267c526-036d-4f5c-9f17-2ee1b3d87886'::uuid;
  v_phase_removal_id uuid;
  v_phase_install_id uuid;
BEGIN
  -- Resolve existing phase IDs (fail if not present; no silent fallbacks)
  SELECT pp.id
  INTO v_phase_removal_id
  FROM public.project_phases pp
  WHERE pp.project_id = v_project_id
    AND pp.name = 'Removal'
  LIMIT 1;

  IF v_phase_removal_id IS NULL THEN
    RAISE EXCEPTION 'Missing phase "%" for project_id=%', 'Removal', v_project_id;
  END IF;

  SELECT pp.id
  INTO v_phase_install_id
  FROM public.project_phases pp
  WHERE pp.project_id = v_project_id
    AND pp.name = 'Installation'
  LIMIT 1;

  IF v_phase_install_id IS NULL THEN
    RAISE EXCEPTION 'Missing phase "%" for project_id=%', 'Installation', v_project_id;
  END IF;

  -- =========================================================
  -- Phase: Removal
  -- =========================================================

  -- Operation 1: Shut off water & disconnect
  INSERT INTO public.phase_operations (
    id,
    phase_id,
    operation_name,
    operation_description,
    display_order,
    estimated_time,
    flow_type
  ) VALUES (
    '8267c526-036d-4f5c-9f17-5409ed1f21f1'::uuid,
    v_phase_removal_id,
    'Shut off water & disconnect',
    'Safely shut off the supply, drain the toilet, and disconnect the water line.',
    1,
    '15–30 min',
    'prime'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Step 1: Prep area & confirm shutoff works
  INSERT INTO public.operation_steps (
    id,
    operation_id,
    step_title,
    description,
    display_order,
    materials,
    tools,
    outputs,
    time_estimate_low,
    time_estimate_med,
    time_estimate_high,
    number_of_workers,
    skill_level,
    allow_content_edit
  ) VALUES (
    '8267c526-036d-4f5c-9f17-5409ed1f21e1'::uuid,
    '8267c526-036d-4f5c-9f17-5409ed1f21f1'::uuid,
    'Prep the area and verify the shutoff',
    'Protect the floor, stage cleanup items, and confirm the toilet shutoff valve stops water flow.',
    1,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'out-prep-verified-shutoff',
        'name', 'Work area protected and shutoff verified',
        'description', 'Floor is protected and the shutoff valve reliably stops tank refilling.',
        'type', 'safety',
        'qualityChecks', 'After closing the shutoff, the tank does not refill while you wait 2 minutes.'
      )
    ),
    0.10,
    0.20,
    0.35,
    1,
    'Beginner',
    true
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.step_instructions (step_id, instruction_level, content)
  VALUES
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21e1'::uuid,
      'beginner',
      jsonb_build_array(
        jsonb_build_object('title','Safety / PPE','content','Wear gloves and eye protection. Bathrooms get slippery fast—keep a towel down and wipe spills immediately.','type','warning'),
        jsonb_build_object('title','Setup','content','Put an old towel or cardboard where you’ll set the toilet. Place a bucket and rags nearby.','type','standard'),
        jsonb_build_object('title','Verify the shutoff','content','Turn the shutoff valve (behind/near the toilet) clockwise until it stops. Flush once. If the tank refills, the shutoff isn’t working—stop and fix/replace the valve before you disconnect anything.','type','standard'),
        jsonb_build_object('title','Output check','content','Tank stops refilling after shutoff is closed.','type','tip')
      )
    ),
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21e1'::uuid,
      'intermediate',
      jsonb_build_array(
        jsonb_build_object('title','Safety / PPE','content','Gloves + eye protection. Keep towels down; even small spills can cause slips.','type','warning'),
        jsonb_build_object('title','Verify shutoff integrity','content','Close the angle stop fully, flush, and watch for refill. If it seeps, plan on replacing the angle stop or shut off the house/main valve before proceeding.','type','standard'),
        jsonb_build_object('title','Stage the lift','content','Clear a direct path to set the toilet down. Have a bucket ready for residual tank/bowl water.','type','standard')
      )
    ),
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21e1'::uuid,
      'advanced',
      jsonb_build_array(
        jsonb_build_object('title','Risk control','content','Treat any unreliable angle stop as a leak risk during reconnection. If it won’t seal fully, isolate at the branch/main and replace the stop as part of the job.','type','warning'),
        jsonb_build_object('title','Floor protection strategy','content','Use cardboard + an absorbent towel layer to prevent point-load damage and capture drips.','type','standard'),
        jsonb_build_object('title','Go/no-go criteria','content','Proceed only if the shutoff holds (no refill) and the work zone is clear enough to lift without twisting.','type','tip')
      )
    )
  ON CONFLICT (step_id, instruction_level) DO UPDATE
  SET content = EXCLUDED.content;

  -- Step 2: Drain tank and bowl as much as practical
  INSERT INTO public.operation_steps (
    id,
    operation_id,
    step_title,
    description,
    display_order,
    materials,
    tools,
    outputs,
    time_estimate_low,
    time_estimate_med,
    time_estimate_high,
    number_of_workers,
    skill_level,
    allow_content_edit
  ) VALUES (
    '8267c526-036d-4f5c-9f17-5409ed1f21e2'::uuid,
    '8267c526-036d-4f5c-9f17-5409ed1f21f1'::uuid,
    'Drain the toilet',
    'Empty the tank and remove as much water from the bowl as possible to reduce spills during removal.',
    2,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'out-toilet-drained',
        'name', 'Toilet drained',
        'description', 'Tank is empty and bowl water level is minimized for a cleaner lift.',
        'type', 'safety',
        'qualityChecks', 'Tank is empty; bowl water is low enough that lifting will not slosh out.'
      )
    ),
    0.10,
    0.20,
    0.35,
    1,
    'Beginner',
    true
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.step_instructions (step_id, instruction_level, content)
  VALUES
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21e2'::uuid,
      'beginner',
      jsonb_build_array(
        jsonb_build_object('title','Instructions','content','With the shutoff closed, flush the toilet to empty the tank. Hold the handle down to drain more. Use a cup or sponge to bail out the remaining tank water into a bucket. Then sponge out as much bowl water as you can.','type','standard'),
        jsonb_build_object('title','Common mistakes','content','Skipping this step almost always causes spills when you lift the toilet.','type','warning'),
        jsonb_build_object('title','Output check','content','No standing water in tank; bowl water is very low.','type','tip')
      )
    ),
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21e2'::uuid,
      'intermediate',
      jsonb_build_array(
        jsonb_build_object('title','Drain strategy','content','Flush once, then bail/sponge the tank completely. Sponge the bowl down to minimize slosh.','type','standard'),
        jsonb_build_object('title','Quality check','content','When you rock the bowl slightly, no water sloshes over the rim.','type','tip')
      )
    ),
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21e2'::uuid,
      'advanced',
      jsonb_build_array(
        jsonb_build_object('title','Control contamination','content','Minimize splash/contamination: sponge/bail, don’t pour aggressively. Keep a dedicated bucket for wastewater.','type','warning'),
        jsonb_build_object('title','Output criteria','content','Tank dry; bowl water low enough for a clean lift and transport.','type','standard')
      )
    )
  ON CONFLICT (step_id, instruction_level) DO UPDATE
  SET content = EXCLUDED.content;

  -- Step 3: Disconnect the supply line
  INSERT INTO public.operation_steps (
    id,
    operation_id,
    step_title,
    description,
    display_order,
    materials,
    tools,
    outputs,
    time_estimate_low,
    time_estimate_med,
    time_estimate_high,
    number_of_workers,
    skill_level,
    allow_content_edit
  ) VALUES (
    '8267c526-036d-4f5c-9f17-5409ed1f21e3'::uuid,
    '8267c526-036d-4f5c-9f17-5409ed1f21f1'::uuid,
    'Disconnect the water supply line',
    'Remove the supply line from the toilet fill valve while controlling any residual water.',
    3,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'out-supply-disconnected',
        'name', 'Supply line disconnected',
        'description', 'Water line is safely disconnected with no uncontrolled leaks.',
        'type', 'safety',
        'qualityChecks', 'No dripping from the shutoff; line is free and bucket/towel caught residual water.'
      )
    ),
    0.10,
    0.20,
    0.30,
    1,
    'Beginner',
    true
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.step_instructions (step_id, instruction_level, content)
  VALUES
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21e3'::uuid,
      'beginner',
      jsonb_build_array(
        jsonb_build_object('title','Instructions','content','Place a towel and a small bucket under the shutoff. Unscrew the supply line from the bottom of the toilet tank (fill valve shank). Let any water drain into the bucket.','type','standard'),
        jsonb_build_object('title','Warning','content','If water keeps flowing, stop—your shutoff valve isn’t sealing. Do not continue until the water is fully controlled.','type','warning'),
        jsonb_build_object('title','Output check','content','Line is disconnected and water is contained.','type','tip')
      )
    ),
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21e3'::uuid,
      'intermediate',
      jsonb_build_array(
        jsonb_build_object('title','Disconnect cleanly','content','Back off the coupling nut at the fill valve. Keep the line end elevated after disconnect to limit drain-out.','type','standard'),
        jsonb_build_object('title','Quality check','content','Angle stop stays dry with valve closed; no weeping at packing nut.','type','tip')
      )
    ),
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21e3'::uuid,
      'advanced',
      jsonb_build_array(
        jsonb_build_object('title','Leak discipline','content','Any shutoff that weeps under “closed” is a failure mode—replace it before final hook-up. Keep control of residual water at both ends.','type','warning'),
        jsonb_build_object('title','Output criteria','content','Supply is isolated, disconnected, and staged so it cannot drip onto finished surfaces.','type','standard')
      )
    )
  ON CONFLICT (step_id, instruction_level) DO UPDATE
  SET content = EXCLUDED.content;

  -- Operation 2: Remove toilet & prep flange
  INSERT INTO public.phase_operations (
    id,
    phase_id,
    operation_name,
    operation_description,
    display_order,
    estimated_time,
    flow_type
  ) VALUES (
    '8267c526-036d-4f5c-9f17-5409ed1f21f2'::uuid,
    v_phase_removal_id,
    'Remove toilet & prep flange',
    'Remove the toilet from the floor, control odors, and prep the flange area for the new install.',
    2,
    '30–60 min',
    'prime'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Step 4: Remove caps/nuts and lift toilet
  INSERT INTO public.operation_steps (
    id,
    operation_id,
    step_title,
    description,
    display_order,
    materials,
    tools,
    outputs,
    time_estimate_low,
    time_estimate_med,
    time_estimate_high,
    number_of_workers,
    skill_level,
    allow_content_edit
  ) VALUES (
    '8267c526-036d-4f5c-9f17-5409ed1f21e4'::uuid,
    '8267c526-036d-4f5c-9f17-5409ed1f21f2'::uuid,
    'Unbolt and lift the toilet',
    'Remove closet bolt caps/nuts, break the seal, and lift the toilet off the flange.',
    1,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'out-toilet-removed',
        'name', 'Toilet removed',
        'description', 'Toilet is off the flange and set down on a protected surface.',
        'type', 'safety',
        'qualityChecks', 'Toilet is stable on the floor protection; no residual water spills.'
      )
    ),
    0.15,
    0.30,
    0.60,
    2,
    'Beginner',
    true
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.step_instructions (step_id, instruction_level, content)
  VALUES
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21e4'::uuid,
      'beginner',
      jsonb_build_array(
        jsonb_build_object('title','Safety','content','Toilets are heavier than they look. Use two people if possible. Lift with legs, not back.','type','warning'),
        jsonb_build_object('title','Instructions','content','Pop off the plastic caps at the base. Loosen and remove the nuts on both closet bolts. Rock the toilet gently side-to-side to break the wax seal. Lift straight up and set it on the protected area.','type','standard'),
        jsonb_build_object('title','Common mistakes','content','Twisting while lifting can crack the flange or tear flooring. Lift straight up once the seal breaks.','type','warning')
      )
    ),
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21e4'::uuid,
      'intermediate',
      jsonb_build_array(
        jsonb_build_object('title','Break the seal','content','After removing nuts, rock minimally to break wax; then lift vertical to avoid bolt binding.','type','standard'),
        jsonb_build_object('title','Quality check','content','No wax chunks fall into the drain opening during lift (catch/remove immediately).','type','tip')
      )
    ),
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21e4'::uuid,
      'advanced',
      jsonb_build_array(
        jsonb_build_object('title','Control failure modes','content','If nuts are seized, avoid aggressive prying against the flange. Cut hardware if needed to protect the flange/subfloor integrity.','type','warning'),
        jsonb_build_object('title','Output criteria','content','Toilet removed without flange damage; base area remains intact and cleanable.','type','standard')
      )
    )
  ON CONFLICT (step_id, instruction_level) DO UPDATE
  SET content = EXCLUDED.content;

  -- Step 5: Remove old wax and block the drain
  INSERT INTO public.operation_steps (
    id,
    operation_id,
    step_title,
    description,
    display_order,
    materials,
    tools,
    outputs,
    time_estimate_low,
    time_estimate_med,
    time_estimate_high,
    number_of_workers,
    skill_level,
    allow_content_edit
  ) VALUES (
    '8267c526-036d-4f5c-9f17-5409ed1f21e5'::uuid,
    '8267c526-036d-4f5c-9f17-5409ed1f21f2'::uuid,
    'Remove old wax and block the drain opening',
    'Scrape away the old wax ring and temporarily block the drain to control sewer gas and prevent debris from falling in.',
    2,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'out-wax-removed-drain-blocked',
        'name', 'Flange area cleaned and drain protected',
        'description', 'Old wax removed and drain opening temporarily blocked to prevent odors/debris.',
        'type', 'safety',
        'qualityChecks', 'No loose wax remains on the flange sealing surface; drain opening is covered.'
      )
    ),
    0.10,
    0.20,
    0.35,
    1,
    'Beginner',
    true
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.step_instructions (step_id, instruction_level, content)
  VALUES
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21e5'::uuid,
      'beginner',
      jsonb_build_array(
        jsonb_build_object('title','Safety','content','Sewer gas can be unpleasant and unhealthy. Keep the drain covered when you’re not actively working on it.','type','warning'),
        jsonb_build_object('title','Instructions','content','Scrape the old wax off the flange and surrounding area and put it into a trash bag. Then cover the drain opening with a rag (do not push it deep—just enough to block odor and catch debris).','type','standard'),
        jsonb_build_object('title','Output check','content','Flange sealing surface is clean and the drain opening is covered.','type','tip')
      )
    ),
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21e5'::uuid,
      'intermediate',
      jsonb_build_array(
        jsonb_build_object('title','Clean the sealing plane','content','Remove wax down to a clean sealing surface; keep debris out of the drain. Cover the opening between tasks.','type','standard'),
        jsonb_build_object('title','Common mistakes','content','Leaving wax ridges can prevent full contact and lead to leaks.','type','warning')
      )
    ),
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21e5'::uuid,
      'advanced',
      jsonb_build_array(
        jsonb_build_object('title','Quality requirement','content','The flange sealing plane must be clean and continuous; anything between the new seal and flange is a leak path.','type','warning'),
        jsonb_build_object('title','Output criteria','content','No wax residue on the sealing plane; drain protected from debris and odor.','type','standard')
      )
    )
  ON CONFLICT (step_id, instruction_level) DO UPDATE
  SET content = EXCLUDED.content;

  -- Step 6: Inspect flange, bolts, and floor condition
  INSERT INTO public.operation_steps (
    id,
    operation_id,
    step_title,
    description,
    display_order,
    materials,
    tools,
    outputs,
    time_estimate_low,
    time_estimate_med,
    time_estimate_high,
    number_of_workers,
    skill_level,
    allow_content_edit
  ) VALUES (
    '8267c526-036d-4f5c-9f17-5409ed1f21e6'::uuid,
    '8267c526-036d-4f5c-9f17-5409ed1f21f2'::uuid,
    'Inspect the flange and subfloor',
    'Check flange condition, bolt slots, and floor stability so the new toilet can be set solidly and sealed.',
    3,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'out-flange-inspected',
        'name', 'Flange and floor condition confirmed',
        'description', 'Flange is inspected and you know whether repairs are needed before install.',
        'type', 'performance-durability',
        'qualityChecks', 'Flange is solid, bolt slots are intact, and floor is stable with no rocking risk.'
      )
    ),
    0.15,
    0.30,
    0.60,
    1,
    'Intermediate',
    true
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.step_instructions (step_id, instruction_level, content)
  VALUES
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21e6'::uuid,
      'beginner',
      jsonb_build_array(
        jsonb_build_object('title','What to look for','content','Make sure the flange isn’t cracked and doesn’t move when you wiggle it. Check that the bolt slots are not broken. Press on the floor around the flange—if it feels soft, address it before installing the new toilet.','type','standard'),
        jsonb_build_object('title','Stop conditions','content','If the flange is cracked/loose or the floor is soft, don’t set the new toilet yet—fix the support first or the toilet will leak/rock.','type','warning')
      )
    ),
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21e6'::uuid,
      'intermediate',
      jsonb_build_array(
        jsonb_build_object('title','Inspection checklist','content','Confirm: flange is fastened solidly, sits at the correct height relative to finished floor, bolt channels hold bolts firmly, and surrounding floor is sound.','type','standard'),
        jsonb_build_object('title','Quality check','content','Flange does not rotate or lift; screw heads are tight; no floor deflection near flange.','type','tip')
      )
    ),
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21e6'::uuid,
      'advanced',
      jsonb_build_array(
        jsonb_build_object('title','Root-cause mindset','content','A rocking toilet is a support problem, not a caulk problem. Resolve flange/floor flatness and rigidity before installation.','type','warning'),
        jsonb_build_object('title','Acceptance criteria','content','Rigid flange attachment + stable finished floor plane adequate for a no-rock set.','type','standard')
      )
    )
  ON CONFLICT (step_id, instruction_level) DO UPDATE
  SET content = EXCLUDED.content;

  -- =========================================================
  -- Phase: Installation
  -- =========================================================

  -- Operation 3: Set the toilet
  INSERT INTO public.phase_operations (
    id,
    phase_id,
    operation_name,
    operation_description,
    display_order,
    estimated_time,
    flow_type
  ) VALUES (
    '8267c526-036d-4f5c-9f17-5409ed1f21f3'::uuid,
    v_phase_install_id,
    'Set the toilet',
    'Install new bolts/seal and set the toilet squarely onto the flange without rocking.',
    1,
    '30–60 min',
    'prime'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Step 7: Install closet bolts and new seal
  INSERT INTO public.operation_steps (
    id,
    operation_id,
    step_title,
    description,
    display_order,
    materials,
    tools,
    outputs,
    time_estimate_low,
    time_estimate_med,
    time_estimate_high,
    number_of_workers,
    skill_level,
    allow_content_edit
  ) VALUES (
    '8267c526-036d-4f5c-9f17-5409ed1f21e7'::uuid,
    '8267c526-036d-4f5c-9f17-5409ed1f21f3'::uuid,
    'Install closet bolts and the new seal',
    'Install new closet bolts and place the new wax ring (or approved seal) correctly.',
    1,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'out-bolts-seal-ready',
        'name', 'Bolts and seal installed',
        'description', 'Closet bolts are positioned and the new seal is placed correctly for setting the toilet.',
        'type', 'performance-durability',
        'qualityChecks', 'Bolts are aligned symmetrically; seal is centered and not deformed before setting.'
      )
    ),
    0.15,
    0.25,
    0.45,
    1,
    'Beginner',
    true
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.step_instructions (step_id, instruction_level, content)
  VALUES
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21e7'::uuid,
      'beginner',
      jsonb_build_array(
        jsonb_build_object('title','Instructions','content','Remove the rag covering the drain opening. Slide new closet bolts into the flange slots so they stand straight up. Place the new wax ring (or seal) as directed for your toilet—make sure it’s centered.','type','standard'),
        jsonb_build_object('title','Warning','content','Once the toilet is set, don’t lift and reset it on the same wax ring—use a new seal if you have to lift it back off.','type','warning')
      )
    ),
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21e7'::uuid,
      'intermediate',
      jsonb_build_array(
        jsonb_build_object('title','Bolt alignment','content','Align bolts to the toilet base holes before you lift the toilet into position. Confirm both bolts are equally spaced and upright.','type','standard'),
        jsonb_build_object('title','Quality check','content','Seal is centered and intact; bolts are stable and won’t rotate out of position during set.','type','tip')
      )
    ),
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21e7'::uuid,
      'advanced',
      jsonb_build_array(
        jsonb_build_object('title','Leak prevention','content','A distorted or misaligned seal is a primary leak path. Treat any reseat as “new seal required.”','type','warning'),
        jsonb_build_object('title','Acceptance criteria','content','Bolts fixed in position and seal centered, ready for one clean set.','type','standard')
      )
    )
  ON CONFLICT (step_id, instruction_level) DO UPDATE
  SET content = EXCLUDED.content;

  -- Step 8: Set toilet and tighten evenly (no rocking)
  INSERT INTO public.operation_steps (
    id,
    operation_id,
    step_title,
    description,
    display_order,
    materials,
    tools,
    outputs,
    time_estimate_low,
    time_estimate_med,
    time_estimate_high,
    number_of_workers,
    skill_level,
    allow_content_edit
  ) VALUES (
    '8267c526-036d-4f5c-9f17-5409ed1f21e8'::uuid,
    '8267c526-036d-4f5c-9f17-5409ed1f21f3'::uuid,
    'Set the toilet and secure it',
    'Lower the toilet onto the bolts, compress the seal, and tighten nuts evenly until stable (without cracking porcelain).',
    2,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'out-toilet-set-stable',
        'name', 'Toilet set and stable',
        'description', 'Toilet is seated, aligned, and secured with no rocking.',
        'type', 'performance-durability',
        'qualityChecks', 'Toilet does not rock when pressed at rim; nuts are evenly tightened.'
      )
    ),
    0.20,
    0.35,
    0.70,
    2,
    'Beginner',
    true
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.step_instructions (step_id, instruction_level, content)
  VALUES
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21e8'::uuid,
      'beginner',
      jsonb_build_array(
        jsonb_build_object('title','Safety','content','Porcelain can crack if overtightened. Tighten slowly and evenly.','type','warning'),
        jsonb_build_object('title','Instructions','content','With help, lower the toilet straight down so the bolts pass through the base holes. Press down to seat it. Add washers and nuts. Tighten each side a little at a time, alternating left/right, until the toilet is stable and does not rock.','type','standard'),
        jsonb_build_object('title','Common mistakes','content','Tightening one side all the way first can tilt the toilet and cause leaks or cracking.','type','warning')
      )
    ),
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21e8'::uuid,
      'intermediate',
      jsonb_build_array(
        jsonb_build_object('title','Set technique','content','Aim for one clean “drop” onto the seal. Micro-adjust only before compression. Alternate turns on nuts to keep the base parallel to the floor.','type','standard'),
        jsonb_build_object('title','Quality check','content','No rocking at rim; toilet is square to wall/vanity lines; nuts are snug, not torqued.','type','tip')
      )
    ),
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21e8'::uuid,
      'advanced',
      jsonb_build_array(
        jsonb_build_object('title','Root cause of rocking','content','If the toilet rocks, correct the support/plane. Do not rely on caulk to stabilize.','type','warning'),
        jsonb_build_object('title','Acceptance criteria','content','Stable set with even compression and no induced stress in porcelain.','type','standard')
      )
    )
  ON CONFLICT (step_id, instruction_level) DO UPDATE
  SET content = EXCLUDED.content;

  -- Operation 4: Reconnect and verify
  INSERT INTO public.phase_operations (
    id,
    phase_id,
    operation_name,
    operation_description,
    display_order,
    estimated_time,
    flow_type
  ) VALUES (
    '8267c526-036d-4f5c-9f17-5409ed1f21f4'::uuid,
    v_phase_install_id,
    'Reconnect water & verify performance',
    'Reconnect the supply, restore water, and verify leak-free operation and flush performance.',
    2,
    '20–40 min',
    'prime'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Step 9: Reconnect supply and turn water back on
  INSERT INTO public.operation_steps (
    id,
    operation_id,
    step_title,
    description,
    display_order,
    materials,
    tools,
    outputs,
    time_estimate_low,
    time_estimate_med,
    time_estimate_high,
    number_of_workers,
    skill_level,
    allow_content_edit
  ) VALUES (
    '8267c526-036d-4f5c-9f17-5409ed1f21e9'::uuid,
    '8267c526-036d-4f5c-9f17-5409ed1f21f4'::uuid,
    'Reconnect the water supply and refill',
    'Reconnect the supply line, slowly open the shutoff, and allow the tank to fill.',
    1,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'out-water-restored',
        'name', 'Water restored',
        'description', 'Supply is connected and tank refills normally without leaks.',
        'type', 'safety',
        'qualityChecks', 'No leaks at shutoff, supply connection, or tank connection during refill.'
      )
    ),
    0.10,
    0.20,
    0.35,
    1,
    'Beginner',
    true
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.step_instructions (step_id, instruction_level, content)
  VALUES
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21e9'::uuid,
      'beginner',
      jsonb_build_array(
        jsonb_build_object('title','Instructions','content','Reconnect the supply line to the bottom of the toilet tank. Hold a towel under the connection. Slowly open the shutoff valve counterclockwise and watch for leaks while the tank fills.','type','standard'),
        jsonb_build_object('title','Warning','content','Open the shutoff slowly. If you see any leak, close the valve right away and fix it before moving on.','type','warning')
      )
    ),
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21e9'::uuid,
      'intermediate',
      jsonb_build_array(
        jsonb_build_object('title','Leak check during refill','content','Bring the system up under controlled conditions: slow open, observe joints during fill and initial valve shutoff.','type','standard'),
        jsonb_build_object('title','Quality check','content','Dry towel test: wipe each joint and confirm no moisture.','type','tip')
      )
    ),
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21e9'::uuid,
      'advanced',
      jsonb_build_array(
        jsonb_build_object('title','Failure mode control','content','Any seep at the angle stop or compression/flex connection is a hard stop. Correct before pressurizing further or leaving unattended.','type','warning'),
        jsonb_build_object('title','Acceptance criteria','content','Dry connections throughout refill and post-fill idle period.','type','standard')
      )
    )
  ON CONFLICT (step_id, instruction_level) DO UPDATE
  SET content = EXCLUDED.content;

  -- Step 10: Flush test + final seal/cleanup checks
  INSERT INTO public.operation_steps (
    id,
    operation_id,
    step_title,
    description,
    display_order,
    materials,
    tools,
    outputs,
    time_estimate_low,
    time_estimate_med,
    time_estimate_high,
    number_of_workers,
    skill_level,
    allow_content_edit
  ) VALUES (
    '8267c526-036d-4f5c-9f17-5409ed1f21ea'::uuid,
    '8267c526-036d-4f5c-9f17-5409ed1f21f4'::uuid,
    'Flush test and final checks',
    'Run multiple flushes and inspect for leaks at the base and connections; complete cleanup.',
    2,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'out-leak-free-verified',
        'name', 'Leak-free installation verified',
        'description', 'Toilet flushes normally and remains leak-free at base and supply connections.',
        'type', 'performance-durability',
        'qualityChecks', 'No moisture at base perimeter after 3 flushes; no seepage at supply joints.'
      )
    ),
    0.15,
    0.25,
    0.45,
    1,
    'Beginner',
    true
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.step_instructions (step_id, instruction_level, content)
  VALUES
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21ea'::uuid,
      'beginner',
      jsonb_build_array(
        jsonb_build_object('title','Instructions','content','Flush the toilet 2–3 times. Look around the base for any water. Check the supply connection and shutoff for drips. Wipe the floor dry and recheck after a few minutes.','type','standard'),
        jsonb_build_object('title','Warning','content','If you see water at the base, stop using the toilet until the seal problem is corrected.','type','warning'),
        jsonb_build_object('title','Cleanup','content','Remove tools, dispose of wax safely, and wipe down surfaces.','type','standard')
      )
    ),
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21ea'::uuid,
      'intermediate',
      jsonb_build_array(
        jsonb_build_object('title','Test plan','content','Perform multiple flush cycles; inspect base perimeter and all supply joints. Confirm stability (no rocking) after test.','type','standard'),
        jsonb_build_object('title','Quality check','content','Dry paper towel around base perimeter after flushes; no wet spots.','type','tip')
      )
    ),
    (
      '8267c526-036d-4f5c-9f17-5409ed1f21ea'::uuid,
      'advanced',
      jsonb_build_array(
        jsonb_build_object('title','Acceptance criteria','content','Leak-free under repeated flush cycles, stable/no rock, joints dry after idle period.','type','standard'),
        jsonb_build_object('title','Failure response','content','Any base leak requires reseating with a new seal after correcting flange/support conditions.','type','warning')
      )
    )
  ON CONFLICT (step_id, instruction_level) DO UPDATE
  SET content = EXCLUDED.content;

  -- Refresh project cached phases JSON (required for template rendering in some views)
  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(v_project_id)
  WHERE id = v_project_id;
END $$;
