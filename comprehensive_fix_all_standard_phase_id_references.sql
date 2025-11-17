-- COMPREHENSIVE FIX: Remove ALL references to standard_phase_id from template_operations
-- This script fixes the function, all triggers, and ensures no views or other objects reference it

-- ============================================
-- STEP 1: Diagnostic - Check what's referencing standard_phase_id
-- ============================================
DO $$
DECLARE
  trigger_count INTEGER;
  view_count INTEGER;
BEGIN
  -- Count triggers on template_operations
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE event_object_table = 'template_operations'
    AND event_object_schema = 'public';
  
  -- Count views that might reference template_operations
  SELECT COUNT(*) INTO view_count
  FROM information_schema.views
  WHERE table_schema = 'public'
    AND view_definition LIKE '%template_operations%'
    AND view_definition LIKE '%standard_phase_id%';
  
  RAISE NOTICE 'Diagnostic: triggers=%, views=%', trigger_count, view_count;
END;
$$;

-- ============================================
-- STEP 2: Drop ALL triggers on template_operations
-- ============================================
DROP TRIGGER IF EXISTS cascade_standard_changes_trigger ON template_operations;
DROP TRIGGER IF EXISTS cascade_standard_deletions_trigger ON template_operations;
DROP TRIGGER IF EXISTS cascade_standard_phase_updates_on_operations ON template_operations;
DROP TRIGGER IF EXISTS sync_operation_is_standard_on_insert_update_trigger ON template_operations;
DROP TRIGGER IF EXISTS trigger_rebuild_phases_after_operation_insert ON template_operations;
DROP TRIGGER IF EXISTS trigger_rebuild_phases_after_operation_update ON template_operations;
DROP TRIGGER IF EXISTS trigger_rebuild_phases_after_operation_delete ON template_operations;
DROP TRIGGER IF EXISTS update_template_operations_updated_at ON template_operations;

-- ============================================
-- STEP 3: Fix create_project_with_standard_foundation_v2
-- Use EXPLICIT column list - NO SELECT *
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

    -- CRITICAL: Use EXPLICIT column list - NO SELECT * or op.*
    -- This prevents accessing the non-existent standard_phase_id column
    FOR std_operation IN
      SELECT 
        op.id,
        op.project_id,
        op.phase_id,
        op.name,
        op.description,
        op.flow_type,
        op.user_prompt,
        op.alternate_group,
        op.display_order,
        op.is_standard_phase,
        op.source_operation_id,
        op.is_reference,
        op.created_at,
        op.updated_at
      FROM public.template_operations op
      WHERE op.project_id = standard_project_id
        AND op.phase_id = std_phase.id
      ORDER BY op.display_order
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
-- STEP 4: Fix rebuild_phases_json_from_project_phases
-- Ensure NO references to op.standard_phase_id or op.*
-- ============================================
CREATE OR REPLACE FUNCTION public.rebuild_phases_json_from_project_phases(p_project_id UUID)
RETURNS JSONB AS $$
DECLARE
  phases_json JSONB := '[]'::jsonb;
  phase_record RECORD;
  operations_json JSONB;
  operation_record RECORD;
  effective_operation_id UUID;
  steps_json JSONB;
  phase_count INTEGER := 0;
  total_operations INTEGER := 0;
BEGIN
  SELECT COUNT(*) INTO phase_count
  FROM public.project_phases
  WHERE project_id = p_project_id;

  FOR phase_record IN
    SELECT *
    FROM public.project_phases
    WHERE project_id = p_project_id
    ORDER BY display_order
  LOOP
    operations_json := '[]'::jsonb;

    -- CRITICAL: Use EXPLICIT column list - NO op.* or references to standard_phase_id
    FOR operation_record IN
      SELECT DISTINCT
        op.id,
        op.project_id,
        op.phase_id,
        op.name,
        op.description,
        op.flow_type,
        op.user_prompt,
        op.alternate_group,
        op.display_order,
        op.is_standard_phase,
        op.source_operation_id,
        op.is_reference,
        src.name AS source_name,
        src.description AS source_description,
        src.flow_type AS source_flow_type,
        src.user_prompt AS source_user_prompt,
        src.alternate_group AS source_alternate_group
      FROM public.template_operations op
      LEFT JOIN public.template_operations src ON op.source_operation_id = src.id
      WHERE op.project_id = p_project_id
        AND op.phase_id = phase_record.id
      ORDER BY op.display_order
    LOOP
      total_operations := total_operations + 1;

      effective_operation_id := COALESCE(operation_record.source_operation_id, operation_record.id);

      steps_json := public.get_operation_steps_json(
        effective_operation_id,
        COALESCE(operation_record.is_reference, false)
      );

      operations_json := operations_json || jsonb_build_array(
        jsonb_build_object(
          'id', operation_record.id,
          'name', COALESCE(operation_record.name, operation_record.source_name),
          'description', COALESCE(operation_record.description, operation_record.source_description),
          'flowType', COALESCE(operation_record.flow_type, operation_record.source_flow_type, 'prime'),
          'userPrompt', COALESCE(operation_record.user_prompt, operation_record.source_user_prompt),
          'alternateGroup', COALESCE(operation_record.alternate_group, operation_record.source_alternate_group),
          'steps', COALESCE(steps_json, '[]'::jsonb),
          'isStandard', COALESCE(operation_record.is_reference, false) OR phase_record.is_standard,
          'sourceOperationId', operation_record.source_operation_id
        )
      );
    END LOOP;

    phases_json := phases_json || jsonb_build_array(
      jsonb_build_object(
        'id', phase_record.id,
        'name', phase_record.name,
        'description', phase_record.description,
        'operations', COALESCE(operations_json, '[]'::jsonb),
        'isStandard', phase_record.is_standard
      )
    );
  END LOOP;

  RETURN phases_json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- STEP 5: Recreate safe triggers
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
  IF NEW.project_id = '00000000-0000-0000-0000-000000000001' THEN
    SELECT pp.standard_phase_id
    INTO affected_standard_phase_id
    FROM project_phases pp
    WHERE pp.id = NEW.phase_id;
    
    IF affected_standard_phase_id IS NOT NULL THEN
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

CREATE OR REPLACE FUNCTION public.cascade_standard_phase_deletions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected_standard_phase_id uuid;
BEGIN
  IF OLD.project_id = '00000000-0000-0000-0000-000000000001' THEN
    SELECT pp.standard_phase_id
    INTO affected_standard_phase_id
    FROM project_phases pp
    WHERE pp.id = OLD.phase_id;
    
    IF affected_standard_phase_id IS NOT NULL THEN
      DELETE FROM template_operations toper
      USING project_phases pp
      WHERE toper.name = OLD.name
        AND toper.phase_id = pp.id
        AND pp.standard_phase_id = affected_standard_phase_id
        AND toper.project_id != '00000000-0000-0000-0000-000000000001'
        AND toper.project_id IN (SELECT id FROM projects WHERE is_standard_template = false);
      
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

CREATE OR REPLACE FUNCTION public.sync_operation_is_standard_on_insert_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phase_id IS NOT NULL THEN
    SELECT COALESCE(is_standard, false) INTO NEW.is_standard_phase
    FROM public.project_phases
    WHERE id = NEW.phase_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cascade_standard_changes_trigger
  AFTER INSERT OR UPDATE ON template_operations
  FOR EACH ROW
  EXECUTE FUNCTION cascade_standard_phase_changes();

CREATE TRIGGER cascade_standard_deletions_trigger
  AFTER DELETE ON template_operations
  FOR EACH ROW
  EXECUTE FUNCTION cascade_standard_phase_deletions();

CREATE TRIGGER sync_operation_is_standard_on_insert_update_trigger
  BEFORE INSERT OR UPDATE OF phase_id ON template_operations
  FOR EACH ROW
  EXECUTE FUNCTION sync_operation_is_standard_on_insert_update();

CREATE TRIGGER update_template_operations_updated_at
  BEFORE UPDATE ON template_operations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 6: Final verification
-- ============================================
DO $$
DECLARE
  problematic_trigger_count INTEGER;
  column_exists BOOLEAN;
BEGIN
  -- Check for problematic trigger
  SELECT COUNT(*) INTO problematic_trigger_count
  FROM information_schema.triggers
  WHERE event_object_table = 'template_operations'
    AND trigger_name = 'cascade_standard_phase_updates_on_operations';
  
  -- Check if column still exists (it shouldn't)
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'template_operations'
      AND column_name = 'standard_phase_id'
  ) INTO column_exists;
  
  IF problematic_trigger_count > 0 THEN
    RAISE EXCEPTION 'ERROR: cascade_standard_phase_updates_on_operations trigger still exists!';
  ELSIF column_exists THEN
    RAISE EXCEPTION 'ERROR: standard_phase_id column still exists in template_operations!';
  ELSE
    RAISE NOTICE 'SUCCESS: All fixes applied. Function uses explicit column lists. No problematic triggers. Column does not exist.';
  END IF;
END;
$$;

