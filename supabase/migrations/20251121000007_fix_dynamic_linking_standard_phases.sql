-- Fix project creation functions to use dynamic linking instead of copying standard phases
-- Standard phases should NOT be inserted into project_phases for new projects
-- They should be dynamically included via rebuild_phases_json_from_project_phases

-- 1. Update create_project_with_standard_foundation_v2 to NOT copy standard phases
-- Instead, rely on rebuild_phases_json_from_project_phases to dynamically include them
CREATE OR REPLACE FUNCTION public.create_project_with_standard_foundation_v2(
  p_project_name TEXT,
  p_project_description TEXT,
  p_category TEXT DEFAULT 'general',
  p_created_by UUID DEFAULT auth.uid()
) RETURNS UUID AS $$
DECLARE
  new_project_id UUID;
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Create new project
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

  -- CRITICAL CHANGE: Do NOT copy standard phases into project_phases
  -- Standard phases will be dynamically included via rebuild_phases_json_from_project_phases
  -- This ensures automatic updates when Standard Project Foundation changes
  -- Only custom phases should be inserted into project_phases

  -- Rebuild phases JSON (this will dynamically include standard phases from Standard Project Foundation)
  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(new_project_id, NULL)
  WHERE id = new_project_id;

  RETURN new_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_project_with_standard_foundation_v2(TEXT, TEXT, TEXT, UUID) IS 
'Creates a new project template. Standard phases are dynamically linked from Standard Project Foundation via rebuild_phases_json_from_project_phases - they are NOT copied into project_phases. This ensures automatic updates when Standard Project Foundation changes.';

-- 2. Update create_project_revision_v2 to only copy CUSTOM phases, not standard phases
-- Standard phases should remain dynamically linked
CREATE OR REPLACE FUNCTION public.create_project_revision_v2(
  source_project_id UUID,
  revision_notes_text TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_project_id UUID;
  source_project RECORD;
  phase_record RECORD;
  new_phase_id UUID;
  operation_record RECORD;
  new_operation_id UUID;
  step_record RECORD;
  parent_project_id_val UUID;
  max_revision_number INTEGER;
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Prevent revisions of Standard Project
  IF source_project_id = standard_project_id THEN
    RAISE EXCEPTION 'Cannot create revision of Standard Project Foundation';
  END IF;
  
  -- Get source project
  SELECT * INTO source_project FROM projects WHERE id = source_project_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source project not found';
  END IF;
  
  -- Determine parent project ID
  parent_project_id_val := COALESCE(source_project.parent_project_id, source_project_id);
  
  -- Calculate revision number: MAX across all revisions of the same parent + 1
  SELECT COALESCE(MAX(revision_number), 0) + 1
  INTO max_revision_number
  FROM projects
  WHERE parent_project_id = parent_project_id_val OR id = parent_project_id_val;
  
  RAISE NOTICE 'Creating revision % for parent project %', max_revision_number, parent_project_id_val;
  
  -- Create new project (revision)
  INSERT INTO projects (
    name,
    description,
    category,
    difficulty,
    effort_level,
    skill_level,
    estimated_time,
    estimated_time_per_unit,
    scaling_unit,
    diy_length_challenges,
    publish_status,
    created_by,
    parent_project_id,
    revision_number,
    revision_notes,
    is_standard_template,
    is_current_version,
    estimated_total_time,
    typical_project_size
  ) VALUES (
    source_project.name,
    source_project.description,
    source_project.category,
    source_project.difficulty,
    source_project.effort_level,
    source_project.skill_level,
    source_project.estimated_time,
    source_project.estimated_time_per_unit,
    source_project.scaling_unit,
    source_project.diy_length_challenges,
    'draft',
    auth.uid(),
    parent_project_id_val,
    max_revision_number,
    revision_notes_text,
    false,
    true
  ) RETURNING id INTO new_project_id;
  
  -- Archive source project (but keep it, don't delete)
  UPDATE projects
  SET publish_status = 'archived',
      is_current_version = false
  WHERE id = source_project_id;
  
  -- CRITICAL CHANGE: Only copy CUSTOM phases (is_standard = false)
  -- Standard phases will be dynamically included via rebuild_phases_json_from_project_phases
  FOR phase_record IN
    SELECT * FROM project_phases
    WHERE project_id = source_project_id
      AND is_standard = false  -- Only copy custom phases
    ORDER BY display_order
  LOOP
    INSERT INTO project_phases (
      project_id,
      name,
      description,
      display_order,
      is_standard,
      standard_phase_id
    ) VALUES (
      new_project_id,
      phase_record.name,
      phase_record.description,
      phase_record.display_order,
      false,  -- Always false for copied custom phases
      NULL    -- Custom phases don't have standard_phase_id
    ) RETURNING id INTO new_phase_id;
    
    -- Copy all operations for this custom phase
    FOR operation_record IN
      SELECT * FROM template_operations
      WHERE project_id = source_project_id
        AND phase_id = phase_record.id
      ORDER BY display_order
    LOOP
      INSERT INTO template_operations (
        project_id,
        phase_id,
        name,
        description,
        flow_type,
        user_prompt,
        alternate_group,
        display_order,
        dependent_on,
        is_standard_phase,
        source_operation_id,
        is_reference,
        custom_phase_name,
        custom_phase_description,
        custom_phase_display_order
      ) VALUES (
        new_project_id,
        new_phase_id,
        operation_record.name,
        operation_record.description,
        operation_record.flow_type,
        operation_record.user_prompt,
        operation_record.alternate_group,
        operation_record.display_order,
        operation_record.dependent_on,
        false,  -- Custom phase operations are never standard
        operation_record.source_operation_id,
        operation_record.is_reference,
        phase_record.name,  -- Set custom phase metadata
        phase_record.description,
        phase_record.display_order
      ) RETURNING id INTO new_operation_id;
      
      -- Copy all steps for this operation
      FOR step_record IN
        SELECT * FROM template_steps
        WHERE operation_id = operation_record.id
        ORDER BY display_order, step_number
      LOOP
        INSERT INTO template_steps (
          operation_id,
          step_number,
          step_title,
          description,
          flow_type,
          step_type,
          content_sections,
          materials,
          tools,
          outputs,
          apps,
          estimated_time_minutes,
          display_order,
          skill_level,
          workers_needed
        ) VALUES (
          new_operation_id,
          step_record.step_number,
          step_record.step_title,
          step_record.description,
          step_record.flow_type,
          step_record.step_type,
          step_record.content_sections,
          step_record.materials,
          step_record.tools,
          step_record.outputs,
          step_record.apps,
          step_record.estimated_time_minutes,
          step_record.display_order,
          step_record.skill_level,
          step_record.workers_needed
        );
      END LOOP;
    END LOOP;
  END LOOP;
  
  -- Rebuild phases JSON for new revision
  -- This will dynamically include standard phases from Standard Project Foundation
  UPDATE projects
  SET phases = rebuild_phases_json_from_project_phases(new_project_id, NULL)
  WHERE id = new_project_id;
  
  RAISE NOTICE 'Successfully created revision % (id: %) - only custom phases copied, standard phases dynamically linked', max_revision_number, new_project_id;
  
  RETURN new_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_project_revision_v2(UUID, TEXT) IS 
'Creates a new revision of a project. Only copies CUSTOM phases (is_standard = false) into project_phases. Standard phases remain dynamically linked from Standard Project Foundation via rebuild_phases_json_from_project_phases. This ensures automatic updates when Standard Project Foundation changes.';

-- 3. Migration script to clean up existing duplicate standard phases
-- Remove standard phases from all projects except Standard Project Foundation
-- They will be dynamically included via rebuild_phases_json_from_project_phases
DO $$
DECLARE
  v_project_record RECORD;
  v_deleted_count INTEGER;
  v_total_deleted INTEGER := 0;
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  RAISE NOTICE 'Starting cleanup of duplicate standard phases...';
  
  -- First, delete operations linked to standard phases
  -- This must happen before deleting the phases themselves
  DELETE FROM public.template_operations
  WHERE project_id != standard_project_id
    AND phase_id IN (
      SELECT id FROM public.project_phases
      WHERE project_id != standard_project_id
        AND is_standard = true
    );
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % operations linked to standard phases', v_deleted_count;
  
  -- For each project (except Standard Project Foundation)
  FOR v_project_record IN
    SELECT DISTINCT project_id
    FROM public.project_phases
    WHERE project_id != standard_project_id
      AND is_standard = true
  LOOP
    -- Delete standard phases from this project
    -- Keep custom phases (is_standard = false)
    DELETE FROM public.project_phases
    WHERE project_id = v_project_record.project_id
      AND is_standard = true;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_total_deleted := v_total_deleted + v_deleted_count;
    
    RAISE NOTICE 'Cleaned up % standard phases from project %', v_deleted_count, v_project_record.project_id;
  END LOOP;
  
  RAISE NOTICE 'Cleanup complete. Deleted % total standard phase copies. Standard phases are now dynamically linked.', v_total_deleted;
  RAISE NOTICE 'Note: Phases JSON will be rebuilt automatically when projects are accessed.';
END $$;

