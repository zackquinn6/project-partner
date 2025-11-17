-- FINAL FIX: Remove ALL standard_phase_id references from template_operations
-- This script is more aggressive - it disables problematic triggers during project creation

-- ============================================
-- STEP 1: Drop ALL triggers on template_operations
-- ============================================
DROP TRIGGER IF EXISTS cascade_standard_changes_trigger ON template_operations;
DROP TRIGGER IF EXISTS cascade_standard_deletions_trigger ON template_operations;
DROP TRIGGER IF EXISTS cascade_standard_phase_updates_on_operations ON template_operations;
DROP TRIGGER IF EXISTS sync_operation_is_standard_on_insert_update_trigger ON template_operations;
DROP TRIGGER IF EXISTS trigger_rebuild_phases_after_operation_insert ON template_operations;
DROP TRIGGER IF EXISTS trigger_rebuild_phases_after_operation_update ON template_operations;
DROP TRIGGER IF EXISTS trigger_rebuild_phases_after_operation_delete ON template_operations;

-- ============================================
-- STEP 2: Fix create_project_with_standard_foundation_v2 function
-- This version temporarily disables triggers during INSERT
-- ============================================
CREATE OR REPLACE FUNCTION public.create_project_with_standard_foundation_v2(
  p_project_name TEXT,
  p_project_description TEXT,
  p_category TEXT DEFAULT 'general',
  p_created_by UUID DEFAULT auth.uid()
) RETURNS UUID AS $$
DECLARE
  new_project_id UUID;
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  std_phase RECORD;
  new_phase_id UUID;
  std_operation RECORD;
BEGIN
  INSERT INTO public.projects (
    name,
    description,
    category,
    publish_status,
    created_by,
    is_current_version
  ) VALUES (
    p_project_name,
    p_project_description,
    p_category,
    'draft',
    p_created_by,
    true
  ) RETURNING id INTO new_project_id;

  FOR std_phase IN
    SELECT pp.*, sp.id AS standard_phase_lookup
    FROM public.project_phases pp
    JOIN public.standard_phases sp ON pp.standard_phase_id = sp.id
    WHERE pp.project_id = standard_project_id
    ORDER BY pp.display_order
  LOOP
    INSERT INTO public.project_phases (
      project_id,
      name,
      description,
      display_order,
      is_standard,
      standard_phase_id
    ) VALUES (
      new_project_id,
      std_phase.name,
      std_phase.description,
      std_phase.display_order,
      true,
      std_phase.standard_phase_id
    ) RETURNING id INTO new_phase_id;

    -- Use explicit column list and disable triggers during bulk insert
    -- This prevents triggers from firing and trying to access standard_phase_id
    PERFORM set_config('session_replication_role', 'replica', true);
    
    FOR std_operation IN
      SELECT 
        id,
        project_id,
        phase_id,
        name,
        description,
        flow_type,
        user_prompt,
        alternate_group,
        display_order,
        is_standard_phase,
        source_operation_id,
        is_reference,
        created_at,
        updated_at
      FROM public.template_operations
      WHERE project_id = standard_project_id
        AND phase_id = std_phase.id
      ORDER BY display_order
    LOOP
      INSERT INTO public.template_operations (
        project_id,
        phase_id,
        name,
        description,
        flow_type,
        user_prompt,
        alternate_group,
        display_order,
        is_standard_phase,
        source_operation_id,
        is_reference
      ) VALUES (
        new_project_id,
        new_phase_id,
        std_operation.name,
        std_operation.description,
        std_operation.flow_type,
        std_operation.user_prompt,
        std_operation.alternate_group,
        std_operation.display_order,
        true,
        std_operation.id,
        true
      );
    END LOOP;
    
    -- Re-enable triggers
    PERFORM set_config('session_replication_role', 'origin', true);
  END LOOP;

  -- Rebuild phases JSON
  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(new_project_id)
  WHERE id = new_project_id;

  RETURN new_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 3: Fix cascade_standard_phase_changes trigger function
-- ============================================
CREATE OR REPLACE FUNCTION public.cascade_standard_phase_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected_standard_phase_id uuid;
BEGIN
  -- If an operation is inserted/updated in the Standard Project
  IF NEW.project_id = '00000000-0000-0000-0000-000000000001' THEN
    -- Get standard_phase_id from project_phases via phase_id (NOT from template_operations)
    SELECT pp.standard_phase_id
    INTO affected_standard_phase_id
    FROM project_phases pp
    WHERE pp.id = NEW.phase_id;
    
    -- Only proceed if we found a standard_phase_id
    IF affected_standard_phase_id IS NOT NULL THEN
      -- Update matching operations in project TEMPLATES only (not project_runs)
      -- Match by name and phase_id (via project_phases.standard_phase_id)
      UPDATE template_operations toper
      SET description = NEW.description,
          user_prompt = NEW.user_prompt,
          flow_type = NEW.flow_type,
          updated_at = now()
      FROM project_phases pp
      WHERE toper.name = NEW.name
        AND toper.phase_id = pp.id
        AND pp.standard_phase_id = affected_standard_phase_id
        AND toper.project_id != '00000000-0000-0000-0000-000000000001'
        AND toper.project_id IN (SELECT id FROM projects WHERE is_standard_template = false);
      
      -- Rebuild phases JSON ONLY for project templates (not project_runs)
      UPDATE projects
      SET phases = rebuild_phases_json_from_templates(id),
          updated_at = now()
      WHERE publish_status != 'archived'
        AND is_standard_template = false
        AND id != '00000000-0000-0000-0000-000000000001';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- STEP 4: Fix cascade_standard_phase_deletions trigger function
-- ============================================
CREATE OR REPLACE FUNCTION public.cascade_standard_phase_deletions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected_standard_phase_id uuid;
BEGIN
  -- If an operation is deleted from the Standard Project
  IF OLD.project_id = '00000000-0000-0000-0000-000000000001' THEN
    -- Get standard_phase_id from project_phases via phase_id (NOT from template_operations)
    SELECT pp.standard_phase_id
    INTO affected_standard_phase_id
    FROM project_phases pp
    WHERE pp.id = OLD.phase_id;
    
    -- Only proceed if we found a standard_phase_id
    IF affected_standard_phase_id IS NOT NULL THEN
      -- Delete matching operations from project TEMPLATES only (not project_runs)
      -- Match by name and phase_id (via project_phases.standard_phase_id)
      DELETE FROM template_operations toper
      USING project_phases pp
      WHERE toper.name = OLD.name
        AND toper.phase_id = pp.id
        AND pp.standard_phase_id = affected_standard_phase_id
        AND toper.project_id != '00000000-0000-0000-0000-000000000001'
        AND toper.project_id IN (SELECT id FROM projects WHERE is_standard_template = false);
      
      -- Rebuild phases JSON ONLY for project templates (not project_runs)
      UPDATE projects
      SET phases = rebuild_phases_json_from_templates(id),
          updated_at = now()
      WHERE publish_status != 'archived'
        AND is_standard_template = false
        AND id != '00000000-0000-0000-0000-000000000001';
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$;

-- ============================================
-- STEP 5: Fix cascade_standard_phase_updates function
-- Make sure it doesn't try to access standard_phase_id from template_operations
-- ============================================
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

  -- Find the standard_phase_id via project_phases (NOT from template_operations)
  -- This is the key fix - we get standard_phase_id from project_phases, not template_operations
  SELECT tp.standard_phase_id
  INTO affected_standard_phase_id
  FROM template_operations toper
  JOIN project_phases tp ON tp.id = toper.phase_id
  WHERE toper.id = affected_operation_id;

  -- Rebuild Standard Project phases using dynamic rebuild function
  rebuilt_phases := rebuild_phases_json_from_project_phases(standard_project_id);
  UPDATE projects
  SET phases = rebuilt_phases,
      updated_at = now()
  WHERE id = standard_project_id;

  -- Update all project templates linked to this standard phase
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
    rebuilt_phases := rebuild_phases_json_from_project_phases(project_template.id);
    UPDATE projects
    SET phases = rebuilt_phases,
        updated_at = now()
    WHERE id = project_template.id;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================
-- STEP 6: Recreate only the necessary triggers
-- We'll skip cascade_standard_phase_updates_on_operations for now to avoid issues
-- ============================================
-- Note: cascade_standard_phase_updates_on_operations is intentionally NOT recreated
-- as it can cause issues during project creation. The other triggers handle the necessary cascading.

CREATE TRIGGER cascade_standard_changes_trigger
  AFTER INSERT OR UPDATE ON template_operations
  FOR EACH ROW
  EXECUTE FUNCTION cascade_standard_phase_changes();

CREATE TRIGGER cascade_standard_deletions_trigger
  AFTER DELETE ON template_operations
  FOR EACH ROW
  EXECUTE FUNCTION cascade_standard_phase_deletions();

-- Recreate cascade_standard_phase_updates_on_operations but only for template_steps
-- This avoids the issue with template_operations inserts
DROP TRIGGER IF EXISTS cascade_standard_phase_updates_on_steps ON template_steps;
CREATE TRIGGER cascade_standard_phase_updates_on_steps
AFTER INSERT OR UPDATE OR DELETE ON template_steps
FOR EACH ROW
EXECUTE FUNCTION public.cascade_standard_phase_updates();

