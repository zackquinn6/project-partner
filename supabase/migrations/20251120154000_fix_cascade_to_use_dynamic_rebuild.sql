-- Fix cascade_standard_phase_updates to use rebuild_phases_json_from_project_phases
-- This ensures project templates dynamically pull from Standard Project Foundation via references
-- instead of using stale cached JSON

CREATE OR REPLACE FUNCTION public.cascade_standard_phase_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_operation_id uuid;
  affected_standard_phase_id uuid;
  standard_project_id constant uuid := '00000000-0000-0000-0000-000000000001';
  project_template RECORD;
  rebuilt_phases jsonb;
BEGIN
  -- Determine which operation was changed
  IF TG_TABLE_NAME = 'template_steps' THEN
    IF TG_OP = 'DELETE' THEN
      affected_operation_id := OLD.operation_id;
    ELSE
      affected_operation_id := NEW.operation_id;
    END IF;

    -- Only run for the Standard Project
    IF NOT EXISTS (
      SELECT 1 FROM template_operations
      WHERE id = affected_operation_id
        AND project_id = standard_project_id
    ) THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
  ELSE
    -- template_operations trigger
    IF TG_OP = 'DELETE' THEN
      IF OLD.project_id <> standard_project_id THEN
        RETURN OLD;
      END IF;
      affected_operation_id := OLD.id;
    ELSE
      IF NEW.project_id <> standard_project_id THEN
        RETURN NEW;
      END IF;
      affected_operation_id := NEW.id;
    END IF;
  END IF;

  -- Find the standard_phase_id via project_phases
  SELECT tp.standard_phase_id
  INTO affected_standard_phase_id
  FROM template_operations toper
  JOIN project_phases tp ON tp.id = toper.phase_id
  WHERE toper.id = affected_operation_id;

  -- Rebuild Standard Project phases using dynamic rebuild function
  -- This follows source_operation_id references to get latest steps
  rebuilt_phases := rebuild_phases_json_from_project_phases(standard_project_id);
  UPDATE projects
  SET phases = rebuilt_phases,
      updated_at = now()
  WHERE id = standard_project_id;

  -- Update all project templates linked to this standard phase
  -- Use rebuild_phases_json_from_project_phases to dynamically pull from Standard Project
  FOR project_template IN
    SELECT DISTINCT p.id
    FROM projects p
    JOIN template_operations tmo ON tmo.project_id = p.id
    JOIN project_phases tp ON tp.id = tmo.phase_id
    WHERE p.is_standard_template = false
      AND p.parent_project_id IS NULL
      AND p.id <> standard_project_id
      AND (
        affected_standard_phase_id IS NULL
        OR tp.standard_phase_id = affected_standard_phase_id
      )
  LOOP
    -- Use rebuild_phases_json_from_project_phases which follows source_operation_id references
    -- This ensures project templates dynamically pull latest steps from Standard Project Foundation
    rebuilt_phases := rebuild_phases_json_from_project_phases(project_template.id);
    UPDATE projects
    SET phases = rebuilt_phases,
        updated_at = now()
    WHERE id = project_template.id;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

