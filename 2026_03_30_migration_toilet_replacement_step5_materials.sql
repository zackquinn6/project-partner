-- Step 5 of project development: Materials list (must match materials library)
-- Project: Toilet Replacement
-- Project ID: f46b9b02-de31-42e0-ab04-5409ed1f21ee
--
-- Rules:
-- - Ensure tools and materials for this template exist (INSERT when missing by name).
-- - Then resolve IDs and attach materials to steps. IF still NULL after ensure, RAISE.
--
-- Storage: public.operation_steps.materials (JSONB)
-- Shape aligns with MultiSelectLibraryDialog SelectedItem (same as tools step):
-- [{ coreItemId, variationId?, item, category?, quantity, description?, attributes, isPrime }]

DO $$
DECLARE
  v_project_id CONSTANT uuid := 'f46b9b02-de31-42e0-ab04-5409ed1f21ee'::uuid;
  v_missing text[] := ARRAY[]::text[];

  m_wax_ring uuid;
  m_ptfe_tape uuid;
  m_toilet_supply_line uuid;
  m_trash_bags uuid;
  m_silicone_caulk uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = v_project_id) THEN
    RAISE EXCEPTION 'Project not found: %', v_project_id;
  END IF;

  -- ============================
  -- Ensure tools library rows (idempotent; same set as step 4)
  -- ============================
  INSERT INTO public.tools (name, description, specialty_scale, category)
  SELECT v.n, v.d, 1, v.c
  FROM (VALUES
    ('Adjustable Wrench', 'Compression nuts on supply line and closet bolts.', 'Hand Tool'),
    ('Tongue-and-Groove Pliers', 'Grip round fittings and stubborn hardware.', 'Hand Tool'),
    ('Putty Knife', 'Scrape old wax from flange and finished floor.', 'Hand Tool'),
    ('Utility Knife', 'Cut caulk or scored caps when removing the bowl.', 'Hand Tool'),
    ('Bucket', 'Catch water when disconnecting supply and bailing tank.', 'Other'),
    ('Sponge', 'Remove residual tank and bowl water before lift.', 'Other'),
    ('Flashlight', 'Inspect flange, bolt slots, and subfloor.', 'Other'),
    ('Level', 'Check toilet base for rock before final tighten.', 'Hand Tool'),
    ('Paper Towels', 'Dry joints during leak checks and keep work area tidy.', 'Other')
  ) AS v(n, d, c)
  WHERE NOT EXISTS (SELECT 1 FROM public.tools t WHERE t.name = v.n);

  -- ============================
  -- Ensure materials library rows (idempotent)
  -- ============================
  INSERT INTO public.materials (name, description, category, unit)
  SELECT v.n, v.d, v.c, v.u
  FROM (VALUES
    ('Wax Ring', 'Seals bowl outlet to closet flange when compressed once.', 'Plumbing', 'each'),
    ('PTFE Tape', 'Thread seal on supply connections per manufacturer practice.', 'Plumbing', 'roll'),
    ('Toilet Supply Line', 'Flexible connector from angle stop to tank fill valve.', 'Plumbing', 'each'),
    ('Trash Bags', 'Contain old wax, wipes, and job scrap.', 'Job site', 'each'),
    ('Silicone Caulk', 'Optional floor bead after verification; not a structural fix for rock.', 'Plumbing', 'tube')
  ) AS v(n, d, c, u)
  WHERE NOT EXISTS (SELECT 1 FROM public.materials m WHERE m.name = v.n);

  -- ============================
  -- Resolve required materials (core rows)
  -- ============================
  SELECT id INTO m_wax_ring FROM public.materials WHERE name = 'Wax Ring' LIMIT 1;
  IF m_wax_ring IS NULL THEN v_missing := array_append(v_missing, 'Material: Wax Ring'); END IF;

  SELECT id INTO m_ptfe_tape FROM public.materials WHERE name = 'PTFE Tape' LIMIT 1;
  IF m_ptfe_tape IS NULL THEN v_missing := array_append(v_missing, 'Material: PTFE Tape'); END IF;

  SELECT id INTO m_toilet_supply_line FROM public.materials WHERE name = 'Toilet Supply Line' LIMIT 1;
  IF m_toilet_supply_line IS NULL THEN v_missing := array_append(v_missing, 'Material: Toilet Supply Line'); END IF;

  SELECT id INTO m_trash_bags FROM public.materials WHERE name = 'Trash Bags' LIMIT 1;
  IF m_trash_bags IS NULL THEN v_missing := array_append(v_missing, 'Material: Trash Bags'); END IF;

  SELECT id INTO m_silicone_caulk FROM public.materials WHERE name = 'Silicone Caulk' LIMIT 1;
  IF m_silicone_caulk IS NULL THEN v_missing := array_append(v_missing, 'Material: Silicone Caulk'); END IF;

  IF array_length(v_missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Missing required material library items for Toilet Replacement step 5: %', array_to_string(v_missing, '; ');
  END IF;

  -- ============================
  -- Apply step-level material lists
  -- (Steps without consumables keep [] from step 1.)
  -- ============================

  -- Step: Disconnect the water supply line
  UPDATE public.operation_steps
  SET materials = jsonb_build_array(
    jsonb_build_object('coreItemId', m_ptfe_tape, 'item', 'PTFE Tape', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  )
  WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e3'::uuid;

  -- Step: Unbolt and lift the toilet
  UPDATE public.operation_steps
  SET materials = jsonb_build_array(
    jsonb_build_object('coreItemId', m_trash_bags, 'item', 'Trash Bags', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  )
  WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e4'::uuid;

  -- Step: Remove old wax and block the drain opening
  UPDATE public.operation_steps
  SET materials = jsonb_build_array(
    jsonb_build_object('coreItemId', m_trash_bags, 'item', 'Trash Bags', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  )
  WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e5'::uuid;

  -- Step: Install closet bolts and the new seal
  UPDATE public.operation_steps
  SET materials = jsonb_build_array(
    jsonb_build_object('coreItemId', m_wax_ring, 'item', 'Wax Ring', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  )
  WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e7'::uuid;

  -- Step: Reconnect the water supply and refill
  UPDATE public.operation_steps
  SET materials = jsonb_build_array(
    jsonb_build_object('coreItemId', m_toilet_supply_line, 'item', 'Toilet Supply Line', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', m_ptfe_tape, 'item', 'PTFE Tape', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false)
  )
  WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e9'::uuid;

  -- Step: Flush test and final checks
  UPDATE public.operation_steps
  SET materials = jsonb_build_array(
    jsonb_build_object('coreItemId', m_silicone_caulk, 'item', 'Silicone Caulk', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  )
  WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21ea'::uuid;

  -- Refresh project cached phases JSON
  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(v_project_id)
  WHERE id = v_project_id;
END $$;
