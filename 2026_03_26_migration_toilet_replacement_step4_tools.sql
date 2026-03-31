-- Step 4 of project development: Tools list (must match tools library + variants)
-- Project: Toilet Replacement
-- Project ID: f46b9b02-de31-42e0-ab04-5409ed1f21ee
--
-- Rules:
-- - Ensure each required tool row exists (INSERT by name when missing), then attach to steps.
-- - If a required tool_variations row is needed later, extend this migration to assert variants.
--
-- Storage on steps: public.operation_steps.tools (JSONB)
-- Expected JSON shape aligns with MultiSelectLibraryDialog SelectedItem:
-- [{ coreItemId, variationId?, item, category?, quantity, description?, attributes, isPrime }]

DO $$
DECLARE
  v_project_id CONSTANT uuid := 'f46b9b02-de31-42e0-ab04-5409ed1f21ee'::uuid;
  v_missing text[] := ARRAY[]::text[];

  -- Tool core IDs
  t_adjustable_wrench uuid;
  t_channel_lock_pliers uuid;
  t_putty_knife uuid;
  t_utility_knife uuid;
  t_bucket uuid;
  t_sponge uuid;
  t_flashlight uuid;
  t_level_small uuid;
  t_paper_towels uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = v_project_id) THEN
    RAISE EXCEPTION 'Project not found: %', v_project_id;
  END IF;

  -- ============================
  -- Ensure tools library rows (idempotent: only insert when name absent)
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
  -- Resolve required tools (core items)
  -- ============================
  SELECT id INTO t_adjustable_wrench FROM public.tools WHERE name = 'Adjustable Wrench' LIMIT 1;
  IF t_adjustable_wrench IS NULL THEN v_missing := array_append(v_missing, 'Tool: Adjustable Wrench'); END IF;

  SELECT id INTO t_channel_lock_pliers FROM public.tools WHERE name = 'Tongue-and-Groove Pliers' LIMIT 1;
  IF t_channel_lock_pliers IS NULL THEN v_missing := array_append(v_missing, 'Tool: Tongue-and-Groove Pliers'); END IF;

  SELECT id INTO t_putty_knife FROM public.tools WHERE name = 'Putty Knife' LIMIT 1;
  IF t_putty_knife IS NULL THEN v_missing := array_append(v_missing, 'Tool: Putty Knife'); END IF;

  SELECT id INTO t_utility_knife FROM public.tools WHERE name = 'Utility Knife' LIMIT 1;
  IF t_utility_knife IS NULL THEN v_missing := array_append(v_missing, 'Tool: Utility Knife'); END IF;

  SELECT id INTO t_bucket FROM public.tools WHERE name = 'Bucket' LIMIT 1;
  IF t_bucket IS NULL THEN v_missing := array_append(v_missing, 'Tool: Bucket'); END IF;

  SELECT id INTO t_sponge FROM public.tools WHERE name = 'Sponge' LIMIT 1;
  IF t_sponge IS NULL THEN v_missing := array_append(v_missing, 'Tool: Sponge'); END IF;

  SELECT id INTO t_flashlight FROM public.tools WHERE name = 'Flashlight' LIMIT 1;
  IF t_flashlight IS NULL THEN v_missing := array_append(v_missing, 'Tool: Flashlight'); END IF;

  SELECT id INTO t_level_small FROM public.tools WHERE name = 'Level' LIMIT 1;
  IF t_level_small IS NULL THEN v_missing := array_append(v_missing, 'Tool: Level'); END IF;

  SELECT id INTO t_paper_towels FROM public.tools WHERE name = 'Paper Towels' LIMIT 1;
  IF t_paper_towels IS NULL THEN v_missing := array_append(v_missing, 'Tool: Paper Towels'); END IF;

  IF array_length(v_missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Missing required tool library items for Toilet Replacement: %', array_to_string(v_missing, '; ');
  END IF;

  -- ============================
  -- Apply step-level tool lists
  -- ============================

  -- Step: Prep the area and verify the shutoff
  UPDATE public.operation_steps
  SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_bucket, 'item', 'Bucket', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_paper_towels, 'item', 'Paper Towels', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  )
  WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e1'::uuid;

  -- Step: Drain the toilet
  UPDATE public.operation_steps
  SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_bucket, 'item', 'Bucket', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_sponge, 'item', 'Sponge', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  )
  WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e2'::uuid;

  -- Step: Disconnect the water supply line
  UPDATE public.operation_steps
  SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_adjustable_wrench, 'item', 'Adjustable Wrench', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_channel_lock_pliers, 'item', 'Tongue-and-Groove Pliers', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false),
    jsonb_build_object('coreItemId', t_bucket, 'item', 'Bucket', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_paper_towels, 'item', 'Paper Towels', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  )
  WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e3'::uuid;

  -- Step: Unbolt and lift the toilet
  UPDATE public.operation_steps
  SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_adjustable_wrench, 'item', 'Adjustable Wrench', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_utility_knife, 'item', 'Utility Knife', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false),
    jsonb_build_object('coreItemId', t_paper_towels, 'item', 'Paper Towels', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  )
  WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e4'::uuid;

  -- Step: Remove old wax and block the drain opening
  UPDATE public.operation_steps
  SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_putty_knife, 'item', 'Putty Knife', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_paper_towels, 'item', 'Paper Towels', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  )
  WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e5'::uuid;

  -- Step: Inspect the flange and subfloor
  UPDATE public.operation_steps
  SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_flashlight, 'item', 'Flashlight', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_putty_knife, 'item', 'Putty Knife', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false),
    jsonb_build_object('coreItemId', t_paper_towels, 'item', 'Paper Towels', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false)
  )
  WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e6'::uuid;

  -- Step: Install closet bolts and the new seal
  UPDATE public.operation_steps
  SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_paper_towels, 'item', 'Paper Towels', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false)
  )
  WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e7'::uuid;

  -- Step: Set the toilet and secure it
  UPDATE public.operation_steps
  SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_level_small, 'item', 'Level', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false),
    jsonb_build_object('coreItemId', t_adjustable_wrench, 'item', 'Adjustable Wrench', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_paper_towels, 'item', 'Paper Towels', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  )
  WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e8'::uuid;

  -- Step: Reconnect the water supply and refill
  UPDATE public.operation_steps
  SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_adjustable_wrench, 'item', 'Adjustable Wrench', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_channel_lock_pliers, 'item', 'Tongue-and-Groove Pliers', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false),
    jsonb_build_object('coreItemId', t_paper_towels, 'item', 'Paper Towels', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  )
  WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21e9'::uuid;

  -- Step: Flush test and final checks
  UPDATE public.operation_steps
  SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_paper_towels, 'item', 'Paper Towels', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_flashlight, 'item', 'Flashlight', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false)
  )
  WHERE id = 'f46b9b02-de31-42e0-ab04-5409ed1f21ea'::uuid;

  -- Refresh project cached phases JSON
  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(v_project_id)
  WHERE id = v_project_id;
END $$;

