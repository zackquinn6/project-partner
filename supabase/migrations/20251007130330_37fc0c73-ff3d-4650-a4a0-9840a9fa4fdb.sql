
-- =====================================================
-- COMPREHENSIVE REVISION CREATION ARCHITECTURE FIX
-- =====================================================
-- This migration fixes the revision creation system to properly copy all content
-- and ensures standard phases are maintained across revisions.
-- =====================================================

-- STEP 1: Create function to rebuild phases JSON from template_operations/template_steps
-- This ensures the phases JSON always reflects the actual data in the tables
CREATE OR REPLACE FUNCTION public.rebuild_phases_json_from_templates(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_phases jsonb := '[]'::jsonb;
  phase_record record;
  operation_record record;
  step_record record;
  phase_obj jsonb;
  operations_array jsonb;
  operation_obj jsonb;
  steps_array jsonb;
  step_obj jsonb;
BEGIN
  -- Get all unique phases (via standard_phase_id) for this project
  FOR phase_record IN
    SELECT DISTINCT 
      sp.id as phase_id,
      sp.name as phase_name,
      sp.description as phase_description,
      sp.display_order
    FROM template_operations toper
    JOIN standard_phases sp ON sp.id = toper.standard_phase_id
    WHERE toper.project_id = p_project_id
    ORDER BY sp.display_order
  LOOP
    -- Initialize operations array for this phase
    operations_array := '[]'::jsonb;
    
    -- Get all operations for this phase
    FOR operation_record IN
      SELECT 
        toper.id as operation_id,
        toper.name as operation_name,
        toper.description as operation_description,
        toper.display_order
      FROM template_operations toper
      WHERE toper.project_id = p_project_id
        AND toper.standard_phase_id = phase_record.phase_id
      ORDER BY toper.display_order
    LOOP
      -- Initialize steps array for this operation
      steps_array := '[]'::jsonb;
      
      -- Get all steps for this operation
      FOR step_record IN
        SELECT 
          ts.id,
          ts.step_number,
          ts.step_title,
          ts.description,
          ts.content_sections,
          ts.materials,
          ts.tools,
          ts.outputs,
          ts.estimated_time_minutes
        FROM template_steps ts
        WHERE ts.operation_id = operation_record.operation_id
        ORDER BY ts.display_order
      LOOP
        -- Build step object
        step_obj := jsonb_build_object(
          'id', step_record.id::text,
          'step', step_record.step_title,
          'description', COALESCE(step_record.description, ''),
          'content', step_record.content_sections,
          'contentType', 'multi',
          'materials', COALESCE(step_record.materials, '[]'::jsonb),
          'tools', COALESCE(step_record.tools, '[]'::jsonb),
          'outputs', COALESCE(step_record.outputs, '[]'::jsonb),
          'estimatedTime', COALESCE(step_record.estimated_time_minutes, 0)
        );
        
        -- Add step to steps array
        steps_array := steps_array || step_obj;
      END LOOP;
      
      -- Build operation object
      operation_obj := jsonb_build_object(
        'id', operation_record.operation_id::text,
        'name', operation_record.operation_name,
        'description', COALESCE(operation_record.operation_description, ''),
        'steps', steps_array
      );
      
      -- Add operation to operations array
      operations_array := operations_array || operation_obj;
    END LOOP;
    
    -- Build phase object
    phase_obj := jsonb_build_object(
      'id', phase_record.phase_id::text,
      'name', phase_record.phase_name,
      'description', COALESCE(phase_record.phase_description, ''),
      'operations', operations_array
    );
    
    -- Add phase to result
    result_phases := result_phases || phase_obj;
  END LOOP;
  
  RETURN result_phases;
END;
$$;

-- STEP 2: Update create_project_revision to rebuild phases JSON after copying
CREATE OR REPLACE FUNCTION public.create_project_revision(
  source_project_id uuid, 
  revision_notes_text text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_project public.projects%ROWTYPE;
  new_project_id uuid;
  max_revision_number integer;
  parent_id uuid;
  old_operation_id uuid;
  new_operation_id uuid;
  rebuilt_phases jsonb;
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Get the source project
  SELECT * INTO source_project FROM public.projects WHERE id = source_project_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source project not found';
  END IF;
  
  -- Determine parent project ID - use the original project's ID
  IF source_project.parent_project_id IS NOT NULL THEN
    parent_id := source_project.parent_project_id;
  ELSE
    parent_id := source_project_id;
  END IF;
  
  -- Get max revision number for this project family
  SELECT COALESCE(MAX(revision_number), -1) + 1 INTO max_revision_number
  FROM public.projects 
  WHERE parent_project_id = parent_id OR id = parent_id;
  
  -- Create the new revision (phases will be rebuilt after operations/steps are copied)
  INSERT INTO public.projects (
    name,
    description,
    image,
    status,
    publish_status,
    category,
    difficulty,
    effort_level,
    estimated_time,
    scaling_unit,
    phases,  -- Temporary placeholder, will be rebuilt
    estimated_time_per_unit,
    parent_project_id,
    revision_number,
    revision_notes,
    created_by,
    created_from_revision,
    is_current_version
  ) VALUES (
    source_project.name,
    source_project.description,
    source_project.image,
    'not-started',
    'draft',
    source_project.category,
    source_project.difficulty,
    source_project.effort_level,
    source_project.estimated_time,
    source_project.scaling_unit,
    '[]'::jsonb,  -- Temporary placeholder
    source_project.estimated_time_per_unit,
    parent_id,
    max_revision_number,
    revision_notes_text,
    auth.uid(),
    source_project.revision_number,
    false
  ) RETURNING id INTO new_project_id;
  
  -- Copy ALL template_operations with their exact structure
  FOR old_operation_id IN 
    SELECT id FROM public.template_operations 
    WHERE project_id = source_project_id 
    ORDER BY display_order
  LOOP
    -- Copy the operation with ALL fields
    INSERT INTO public.template_operations (
      project_id,
      standard_phase_id,
      name,
      description,
      display_order
    )
    SELECT 
      new_project_id,
      standard_phase_id,
      name,
      description,
      display_order
    FROM public.template_operations
    WHERE id = old_operation_id
    RETURNING id INTO new_operation_id;
    
    -- Copy ALL steps for this operation with ALL fields
    INSERT INTO public.template_steps (
      operation_id,
      step_number,
      step_title,
      description,
      content_sections,
      materials,
      tools,
      outputs,
      estimated_time_minutes,
      display_order
    )
    SELECT 
      new_operation_id,
      step_number,
      step_title,
      description,
      content_sections,
      materials,
      tools,
      outputs,
      estimated_time_minutes,
      display_order
    FROM public.template_steps
    WHERE operation_id = old_operation_id
    ORDER BY display_order;
  END LOOP;
  
  -- CRITICAL: Rebuild the phases JSON from the newly copied template_operations/template_steps
  rebuilt_phases := rebuild_phases_json_from_templates(new_project_id);
  
  -- Update the project with the rebuilt phases JSON
  UPDATE public.projects
  SET phases = rebuilt_phases
  WHERE id = new_project_id;
  
  -- Log the revision creation
  PERFORM log_comprehensive_security_event(
    'project_revision_created',
    'medium',
    'Created new project revision',
    auth.uid(),
    NULL, NULL, NULL,
    jsonb_build_object(
      'new_project_id', new_project_id,
      'source_project_id', source_project_id,
      'revision_number', max_revision_number,
      'phases_count', jsonb_array_length(rebuilt_phases),
      'revision_notes', revision_notes_text
    )
  );
  
  RETURN new_project_id;
END;
$$;

-- STEP 3: Create trigger to auto-rebuild phases JSON when template_operations/steps change
CREATE OR REPLACE FUNCTION public.trigger_rebuild_phases_json()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_project_id uuid;
  rebuilt_phases jsonb;
BEGIN
  -- Determine which project was affected
  IF TG_TABLE_NAME = 'template_operations' THEN
    IF TG_OP = 'DELETE' THEN
      affected_project_id := OLD.project_id;
    ELSE
      affected_project_id := NEW.project_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'template_steps' THEN
    IF TG_OP = 'DELETE' THEN
      SELECT project_id INTO affected_project_id 
      FROM template_operations 
      WHERE id = OLD.operation_id;
    ELSE
      SELECT project_id INTO affected_project_id 
      FROM template_operations 
      WHERE id = NEW.operation_id;
    END IF;
  END IF;
  
  -- Rebuild phases JSON for the affected project
  IF affected_project_id IS NOT NULL THEN
    rebuilt_phases := rebuild_phases_json_from_templates(affected_project_id);
    
    UPDATE public.projects
    SET phases = rebuilt_phases,
        updated_at = now()
    WHERE id = affected_project_id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create triggers for template_operations
DROP TRIGGER IF EXISTS trigger_rebuild_phases_after_operation_insert ON public.template_operations;
CREATE TRIGGER trigger_rebuild_phases_after_operation_insert
AFTER INSERT ON public.template_operations
FOR EACH ROW
EXECUTE FUNCTION trigger_rebuild_phases_json();

DROP TRIGGER IF EXISTS trigger_rebuild_phases_after_operation_update ON public.template_operations;
CREATE TRIGGER trigger_rebuild_phases_after_operation_update
AFTER UPDATE ON public.template_operations
FOR EACH ROW
EXECUTE FUNCTION trigger_rebuild_phases_json();

DROP TRIGGER IF EXISTS trigger_rebuild_phases_after_operation_delete ON public.template_operations;
CREATE TRIGGER trigger_rebuild_phases_after_operation_delete
AFTER DELETE ON public.template_operations
FOR EACH ROW
EXECUTE FUNCTION trigger_rebuild_phases_json();

-- Create triggers for template_steps
DROP TRIGGER IF EXISTS trigger_rebuild_phases_after_step_insert ON public.template_steps;
CREATE TRIGGER trigger_rebuild_phases_after_step_insert
AFTER INSERT ON public.template_steps
FOR EACH ROW
EXECUTE FUNCTION trigger_rebuild_phases_json();

DROP TRIGGER IF EXISTS trigger_rebuild_phases_after_step_update ON public.template_steps;
CREATE TRIGGER trigger_rebuild_phases_after_step_update
AFTER UPDATE ON public.template_steps
FOR EACH ROW
EXECUTE FUNCTION trigger_rebuild_phases_json();

DROP TRIGGER IF EXISTS trigger_rebuild_phases_after_step_delete ON public.template_steps;
CREATE TRIGGER trigger_rebuild_phases_after_step_delete
AFTER DELETE ON public.template_steps
FOR EACH ROW
EXECUTE FUNCTION trigger_rebuild_phases_json();

-- STEP 4: Fix existing revisions by rebuilding their phases JSON
DO $$
DECLARE
  project_record record;
  rebuilt_phases jsonb;
BEGIN
  -- Fix all Tile Flooring Installation revisions
  FOR project_record IN
    SELECT id, name, revision_number
    FROM public.projects
    WHERE name LIKE '%Tile Flooring%'
    ORDER BY revision_number
  LOOP
    -- Rebuild phases JSON from template_operations/template_steps
    rebuilt_phases := rebuild_phases_json_from_templates(project_record.id);
    
    -- Update the project
    UPDATE public.projects
    SET phases = rebuilt_phases,
        updated_at = now()
    WHERE id = project_record.id;
    
    RAISE NOTICE 'Rebuilt phases JSON for project % (revision %): % phases with % total steps',
      project_record.name,
      project_record.revision_number,
      jsonb_array_length(rebuilt_phases),
      (
        SELECT COUNT(*)
        FROM jsonb_array_elements(rebuilt_phases) as phase,
             jsonb_array_elements(phase->'operations') as operation,
             jsonb_array_elements(operation->'steps') as step
      );
  END LOOP;
END;
$$;

-- STEP 5: Verification query to confirm fix
DO $$
DECLARE
  verification_result record;
BEGIN
  RAISE NOTICE 'VERIFICATION RESULTS:';
  RAISE NOTICE '=====================';
  
  FOR verification_result IN
    WITH phase_steps AS (
      SELECT 
        p.id,
        p.revision_number,
        COUNT(*) as steps_in_phases_json
      FROM projects p,
           jsonb_array_elements(p.phases) as phase,
           jsonb_array_elements(phase->'operations') as operation,
           jsonb_array_elements(operation->'steps') as step
      WHERE p.name LIKE '%Tile Flooring%'
      GROUP BY p.id, p.revision_number
    ),
    template_steps_count AS (
      SELECT 
        p.id,
        COUNT(ts.id) as steps_in_templates
      FROM projects p
      LEFT JOIN template_operations toper ON toper.project_id = p.id
      LEFT JOIN template_steps ts ON ts.operation_id = toper.id
      WHERE p.name LIKE '%Tile Flooring%'
      GROUP BY p.id
    )
    SELECT 
      ps.revision_number,
      ps.steps_in_phases_json,
      tsc.steps_in_templates,
      CASE 
        WHEN ps.steps_in_phases_json = tsc.steps_in_templates THEN 'PASS ✓'
        ELSE 'FAIL ✗'
      END as status
    FROM phase_steps ps
    JOIN template_steps_count tsc ON tsc.id = ps.id
    ORDER BY ps.revision_number
  LOOP
    RAISE NOTICE 'Revision %: % steps in phases JSON, % steps in templates - %',
      verification_result.revision_number,
      verification_result.steps_in_phases_json,
      verification_result.steps_in_templates,
      verification_result.status;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.rebuild_phases_json_from_templates IS 
'Rebuilds the legacy phases JSON field from template_operations and template_steps tables. This ensures data consistency between the old and new data structures.';

COMMENT ON FUNCTION public.create_project_revision IS
'Creates a new revision of a project by copying all template_operations and template_steps, then rebuilding the phases JSON to ensure consistency. Standard phase ordering rules are maintained.';

COMMENT ON FUNCTION public.trigger_rebuild_phases_json IS
'Trigger function that automatically rebuilds the phases JSON whenever template_operations or template_steps are modified, ensuring data consistency.';
