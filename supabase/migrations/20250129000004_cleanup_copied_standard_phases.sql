-- Cleanup Copied Standard Phases from Existing Templates
-- Migration: 20250129000004_cleanup_copied_standard_phases.sql
--
-- This migration removes standard phases that were copied into project templates.
-- After this migration, standard phases will only exist in Standard Project Foundation
-- and will be dynamically merged when viewing templates.

-- ============================================
-- STEP 1: Remove standard phases from project_phases table
-- ============================================
DO $$
DECLARE
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  deleted_phases_count INTEGER := 0;
  deleted_operations_count INTEGER := 0;
BEGIN
  -- Delete standard phases from all templates (not from Standard Project Foundation)
  WITH deleted_phases AS (
    DELETE FROM public.project_phases
    WHERE project_id != standard_project_id
      AND is_standard = true
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_phases_count FROM deleted_phases;

  -- Delete operations that belonged to those standard phases
  -- (Operations are automatically deleted via CASCADE, but we'll count them)
  -- Actually, let's delete them explicitly to be safe
  DELETE FROM public.template_operations op
  WHERE op.project_id != standard_project_id
    AND EXISTS (
      SELECT 1 FROM public.project_phases pp
      WHERE pp.id = op.phase_id
        AND pp.project_id != standard_project_id
        AND pp.is_standard = true
    );
  
  GET DIAGNOSTICS deleted_operations_count = ROW_COUNT;

  RAISE NOTICE 'Deleted % standard phases from templates', deleted_phases_count;
  RAISE NOTICE 'Deleted % operations from standard phases', deleted_operations_count;
END;
$$;

-- ============================================
-- STEP 2: Update projects.phases JSON to remove standard phases
-- ============================================
DO $$
DECLARE
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  updated_count INTEGER := 0;
  project_record RECORD;
  updated_phases JSONB;
BEGIN
  -- For each template project, remove standard phases from phases JSON
  FOR project_record IN
    SELECT id, name, phases
    FROM public.projects
    WHERE id != standard_project_id
      AND is_standard_template = false
      AND is_current_version = true
  LOOP
    -- Filter out standard phases from the JSON
    IF project_record.phases IS NOT NULL AND jsonb_typeof(project_record.phases) = 'array' THEN
      SELECT jsonb_agg(phase)
      INTO updated_phases
      FROM jsonb_array_elements(project_record.phases) phase
      WHERE (phase->>'isStandard')::boolean IS NOT TRUE;

      -- Update the project
      UPDATE public.projects
      SET phases = COALESCE(updated_phases, '[]'::jsonb)
      WHERE id = project_record.id;

      updated_count := updated_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Updated phases JSON for % projects', updated_count;
END;
$$;

-- ============================================
-- STEP 3: Verify cleanup
-- ============================================
DO $$
DECLARE
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  remaining_standard_phases INTEGER;
  remaining_standard_operations INTEGER;
BEGIN
  -- Count remaining standard phases in templates
  SELECT COUNT(*) INTO remaining_standard_phases
  FROM public.project_phases
  WHERE project_id != standard_project_id
    AND is_standard = true;

  -- Count remaining standard operations in templates
  SELECT COUNT(*) INTO remaining_standard_operations
  FROM public.template_operations op
  JOIN public.project_phases pp ON op.phase_id = pp.id
  WHERE pp.project_id != standard_project_id
    AND pp.is_standard = true;

  RAISE NOTICE '=== Cleanup Verification ===';
  RAISE NOTICE 'Remaining standard phases in templates: %', remaining_standard_phases;
  RAISE NOTICE 'Remaining standard operations in templates: %', remaining_standard_operations;

  IF remaining_standard_phases > 0 OR remaining_standard_operations > 0 THEN
    RAISE WARNING 'WARNING: Some standard phases/operations still exist in templates!';
  ELSE
    RAISE NOTICE 'SUCCESS: All standard phases removed from templates';
  END IF;
END;
$$;

