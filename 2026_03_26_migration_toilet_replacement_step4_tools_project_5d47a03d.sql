-- Step 4 of project development: Tools list (must match tools library + variants)
-- Project: Toilet Replacement
-- Project ID: 5d47a03d-df6e-4341-b61d-98090225c15d
--
-- Rules:
-- - Must use tools from public.tools (and tool_variations when a specific variant is required)
-- - If a required tool or variant is missing, FAIL with a message listing what to add.
-- - Do not create placeholders or default tools.
--
-- Storage on steps: public.operation_steps.tools (JSONB)
-- Expected JSON shape aligns with MultiSelectLibraryDialog SelectedItem:
-- [{ coreItemId, variationId?, item, category?, quantity, description?, attributes, isPrime }]

DO $$
DECLARE
  v_project_id CONSTANT uuid := '5d47a03d-df6e-4341-b61d-98090225c15d'::uuid;
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
  WHERE id = '2f9fbb53-357f-49f3-9f09-7b4a7d6a92f4'::uuid;

  -- Step: Drain the toilet
  UPDATE public.operation_steps
  SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_bucket, 'item', 'Bucket', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_sponge, 'item', 'Sponge', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  )
  WHERE id = 'a5c0d9f9-6c7b-4d8c-9d5b-7b2342b6c6aa'::uuid;

  -- Step: Disconnect the water supply line
  UPDATE public.operation_steps
  SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_adjustable_wrench, 'item', 'Adjustable Wrench', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_channel_lock_pliers, 'item', 'Tongue-and-Groove Pliers', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false),
    jsonb_build_object('coreItemId', t_bucket, 'item', 'Bucket', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_paper_towels, 'item', 'Paper Towels', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  )
  WHERE id = 'c1b7bff0-30c8-4d3f-8e0e-70f8a8f7e5aa'::uuid;

  -- Step: Unbolt and lift the toilet
  UPDATE public.operation_steps
  SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_adjustable_wrench, 'item', 'Adjustable Wrench', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_utility_knife, 'item', 'Utility Knife', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false),
    jsonb_build_object('coreItemId', t_paper_towels, 'item', 'Paper Towels', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  )
  WHERE id = 'fba2316a-0110-4b9c-8a35-1e6a8c2f8c5b'::uuid;

  -- Step: Remove old wax and block the drain opening
  UPDATE public.operation_steps
  SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_putty_knife, 'item', 'Putty Knife', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_paper_towels, 'item', 'Paper Towels', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  )
  WHERE id = '6e6f2d2a-5b8d-4a76-a61a-0e7d4f5a2f31'::uuid;

  -- Step: Inspect the flange and subfloor
  UPDATE public.operation_steps
  SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_flashlight, 'item', 'Flashlight', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_putty_knife, 'item', 'Putty Knife', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false),
    jsonb_build_object('coreItemId', t_paper_towels, 'item', 'Paper Towels', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false)
  )
  WHERE id = '0b5b4b30-6bd8-45c8-90e0-21de7bb01c2a'::uuid;

  -- Step: Install closet bolts and the new seal
  UPDATE public.operation_steps
  SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_paper_towels, 'item', 'Paper Towels', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false)
  )
  WHERE id = 'd1db0a9d-61e2-46f2-9021-8b25ce1166a4'::uuid;

  -- Step: Set the toilet and secure it
  UPDATE public.operation_steps
  SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_level_small, 'item', 'Level', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false),
    jsonb_build_object('coreItemId', t_adjustable_wrench, 'item', 'Adjustable Wrench', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_paper_towels, 'item', 'Paper Towels', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  )
  WHERE id = '0b4bf2b3-3e63-4d88-b07f-186f8a20e9f4'::uuid;

  -- Step: Reconnect the water supply and refill
  UPDATE public.operation_steps
  SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_adjustable_wrench, 'item', 'Adjustable Wrench', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_channel_lock_pliers, 'item', 'Tongue-and-Groove Pliers', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false),
    jsonb_build_object('coreItemId', t_paper_towels, 'item', 'Paper Towels', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true)
  )
  WHERE id = '1f3460c3-6b7f-4e33-8c0b-6e4b70a5b1d3'::uuid;

  -- Step: Flush test and final checks
  UPDATE public.operation_steps
  SET tools = jsonb_build_array(
    jsonb_build_object('coreItemId', t_paper_towels, 'item', 'Paper Towels', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', true),
    jsonb_build_object('coreItemId', t_flashlight, 'item', 'Flashlight', 'quantity', 1, 'attributes', '{}'::jsonb, 'isPrime', false)
  )
  WHERE id = 'c92bfe8f-2104-49ad-b4a4-0d4d927b3a72'::uuid;

  -- Refresh project cached phases JSON
  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(v_project_id)
  WHERE id = v_project_id;
END $$;

