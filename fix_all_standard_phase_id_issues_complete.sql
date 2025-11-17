-- COMPLETE FIX: Remove ALL standard_phase_id references from template_operations
-- This script drops and recreates all functions and triggers that might reference it
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Drop all triggers that might interfere
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

    -- Use explicit column list to avoid selecting standard_phase_id
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
-- STEP 5: Recreate triggers (only the ones we want active)
-- ============================================
CREATE TRIGGER cascade_standard_changes_trigger
  AFTER INSERT OR UPDATE ON template_operations
  FOR EACH ROW
  EXECUTE FUNCTION cascade_standard_phase_changes();

CREATE TRIGGER cascade_standard_deletions_trigger
  AFTER DELETE ON template_operations
  FOR EACH ROW
  EXECUTE FUNCTION cascade_standard_phase_deletions();

-- ============================================
-- STEP 6: Verify the fix - check if standard_phase_id column exists
-- ============================================
DO $$
BEGIN
  -- This will raise an error if the column still exists (which is what we want to check)
  -- But we'll catch it and just log a message
  BEGIN
    PERFORM standard_phase_id FROM template_operations LIMIT 1;
    RAISE NOTICE 'WARNING: standard_phase_id column still exists in template_operations!';
  EXCEPTION
    WHEN undefined_column THEN
      RAISE NOTICE 'SUCCESS: standard_phase_id column does not exist (as expected)';
  END;
END;
$$;

