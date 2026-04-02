-- Step 9 — Project description + project_challenges for catalog templates
-- Follows AI_PROJECT_DEVELOPMENT_REFERENCE.md (≤200 chars each field; narrative challenges; description = phases + areas + purpose).
--
-- Scope:
--   - Rows tied to canonical template IDs (root or revision via parent_project_id)
--   - Rows whose name matches known template prefixes (covers drafts / copies with suffixes)
-- Excludes: Manual Project Template, Standard Project Foundation (fixed UUIDs), and is_standard = true.
--
-- Extend this file with new UPDATE blocks when you add templates that are not covered by the patterns below.

DO $$
DECLARE
  v_excl CONSTANT uuid[] := ARRAY[
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    -- Standard editor / foundation row used in some environments (see EditWorkflowView / StructureManager)
    'd82dff80-e8ac-4511-be46-3d0e64bb5fc5'::uuid
  ];
  v_n integer;
BEGIN
  -- Toilet Replacement — phases: Removal, Installation — areas: bathrooms
  UPDATE public.projects p
  SET
    description = 'Remove the old bowl and install a new toilet in bathrooms for a watertight, steady fixture.',
    project_challenges = 'Cramped bath, scary shutoff, easy flange damage lifting the bowl—then a slow leak days later.',
    updated_at = now()
  WHERE p.id <> ALL(v_excl)
    AND (p.is_standard IS DISTINCT FROM true)
    AND (
      p.id = '8267c526-036d-4f5c-9f17-2ee1b3d87886'::uuid
      OR p.parent_project_id = '8267c526-036d-4f5c-9f17-2ee1b3d87886'::uuid
      OR lower(btrim(p.name)) LIKE 'toilet replacement%'
    );
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE 'Step 9 toilet replacement rows updated: %', v_n;

  -- Caulking Application — phases: Removal, Application — areas: baths, kitchens, trim
  UPDATE public.projects p
  SET
    description = 'Strip old sealant, prep, and apply new caulk in baths, kitchens, and trim for watertight, neat joints.',
    project_challenges = 'Wet corners betray rushed tooling and bead size; skin time ticks while you second-guess the wipe.',
    updated_at = now()
  WHERE p.id <> ALL(v_excl)
    AND (p.is_standard IS DISTINCT FROM true)
    AND (
      p.id = 'dbd4d8b4-da79-4fc0-b53a-c8caa1768db1'::uuid
      OR p.parent_project_id = 'dbd4d8b4-da79-4fc0-b53a-c8caa1768db1'::uuid
      OR lower(btrim(p.name)) LIKE 'caulking application%'
    );
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE 'Step 9 caulking application rows updated: %', v_n;

  -- Dishwasher Replacement — typical phases: disconnect / install / test — kitchens
  UPDATE public.projects p
  SET
    description = 'Disconnect, level, and connect a new dishwasher in kitchens for reliable, leak-free wash cycles.',
    project_challenges = 'Tight cabinet openings, leveling feet, and leak checks—kinked supply or drain gaps show after you push it home.',
    updated_at = now()
  WHERE p.id <> ALL(v_excl)
    AND (p.is_standard IS DISTINCT FROM true)
    AND lower(btrim(p.name)) LIKE 'dishwasher replacement%';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE 'Step 9 dishwasher replacement rows updated: %', v_n;

  -- Tile flooring — prep, set, grout — kitchens, baths
  UPDATE public.projects p
  SET
    description = 'Prep, set, and grout tile in kitchens and baths for a durable, lasting floor.',
    project_challenges = 'You second-guess flatness before you set; big tile and tight corners punish rushed grout timing.',
    updated_at = now()
  WHERE p.id <> ALL(v_excl)
    AND (p.is_standard IS DISTINCT FROM true)
    AND lower(btrim(p.name)) LIKE 'tile flooring%';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE 'Step 9 tile flooring rows updated: %', v_n;

  -- Interior painting — prep, prime, coat — living spaces
  UPDATE public.projects p
  SET
    description = 'Prep, prime, and coat walls and ceilings in living spaces for an even, long-wearing finish.',
    project_challenges = 'Ceiling lines and big walls show every waver; dust sneaking in before the last coat ruins the job.',
    updated_at = now()
  WHERE p.id <> ALL(v_excl)
    AND (p.is_standard IS DISTINCT FROM true)
    AND (
      lower(btrim(p.name)) LIKE 'interior painting%'
      OR lower(btrim(p.name)) LIKE 'interior paint%'
    );
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE 'Step 9 interior painting rows updated: %', v_n;
END $$;
