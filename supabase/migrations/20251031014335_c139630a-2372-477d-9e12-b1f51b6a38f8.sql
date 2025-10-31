-- ============================================================================
-- CUSTOM PHASE SYNCHRONIZATION TRIGGER
-- Automatically syncs custom phases from projects.phases JSON to template_operations/template_steps
-- This ensures custom phases always persist through revisions
-- ============================================================================

-- Function to sync custom phases on project update
CREATE OR REPLACE FUNCTION sync_custom_phases_on_update()
RETURNS TRIGGER AS $$
DECLARE
  phase jsonb;
  operation jsonb;
  step jsonb;
  phase_order int := 100;
  new_operation_id uuid;
BEGIN
  -- Only process if phases changed and it's not the standard template
  IF NEW.phases IS DISTINCT FROM OLD.phases 
     AND (NEW.is_standard_template IS NULL OR NEW.is_standard_template = false) THEN
    
    RAISE NOTICE 'Syncing custom phases for project %: %', NEW.id, NEW.name;
    
    -- Delete all existing custom phase operations for this project
    DELETE FROM template_operations 
    WHERE project_id = NEW.id AND is_custom_phase = true;
    
    -- Insert custom phases from JSON
    FOR phase IN SELECT * FROM jsonb_array_elements(NEW.phases)
    LOOP
      -- Only process non-standard, non-linked phases
      IF COALESCE((phase->>'isStandard')::boolean, false) = false 
         AND COALESCE((phase->>'isLinked')::boolean, false) = false THEN
        
        RAISE NOTICE 'Processing custom phase: %', phase->>'name';
        
        -- Insert each operation and its steps
        FOR operation IN SELECT * FROM jsonb_array_elements(phase->'operations')
        LOOP
          -- Insert operation with custom phase metadata
          INSERT INTO template_operations (
            project_id, 
            name, 
            description, 
            is_custom_phase,
            custom_phase_name, 
            custom_phase_description,
            custom_phase_display_order, 
            display_order,
            standard_phase_id
          ) VALUES (
            NEW.id,
            operation->>'name',
            operation->>'description',
            true,
            phase->>'name',
            phase->>'description',
            phase_order,
            0,
            NULL
          ) RETURNING id INTO new_operation_id;
          
          RAISE NOTICE 'Created operation % for custom phase %', operation->>'name', phase->>'name';
          
          -- Insert steps for this operation
          FOR step IN SELECT * FROM jsonb_array_elements(operation->'steps')
          LOOP
            INSERT INTO template_steps (
              operation_id, 
              step_number, 
              step_title, 
              description,
              content_sections, 
              materials, 
              tools, 
              outputs, 
              apps,
              estimated_time_minutes, 
              display_order,
              flow_type,
              step_type
            ) VALUES (
              new_operation_id,
              COALESCE((step->>'stepNumber')::int, 1),
              COALESCE(step->>'step', 'Untitled Step'),
              step->>'description',
              COALESCE(step->'content_sections', step->'content', '[]'::jsonb),
              COALESCE(step->'materials', '[]'::jsonb),
              COALESCE(step->'tools', '[]'::jsonb),
              COALESCE(step->'outputs', '[]'::jsonb),
              COALESCE(step->'apps', '[]'::jsonb),
              COALESCE((step->>'estimatedTimeMinutes')::int, 0),
              COALESCE((step->>'stepNumber')::int, 1),
              COALESCE(step->>'flowType', 'prime'),
              COALESCE(step->>'stepType', 'prime')
            );
          END LOOP;
        END LOOP;
        
        phase_order := phase_order + 10;
      END IF;
    END LOOP;
    
    RAISE NOTICE 'Custom phase sync complete for project %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS sync_custom_phases_trigger ON projects;
CREATE TRIGGER sync_custom_phases_trigger
  AFTER UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_custom_phases_on_update();

-- ============================================================================
-- ENHANCED create_project_revision WITH VERIFICATION
-- ============================================================================

CREATE OR REPLACE FUNCTION create_project_revision(
  source_project_id uuid,
  revision_notes_text text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_revision_id uuid;
  source_project record;
  operation_record record;
  new_operation_id uuid;
  rebuilt_phases jsonb;
  custom_phase_count int;
  json_phase_count int;
BEGIN
  -- Verify user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can create project revisions';
  END IF;
  
  -- Prevent creating revisions of the Standard Project Foundation
  IF source_project_id = '00000000-0000-0000-0000-000000000001' THEN
    RAISE EXCEPTION 'Cannot create revisions of the Standard Project Foundation';
  END IF;
  
  -- Get source project
  SELECT * INTO source_project
  FROM public.projects
  WHERE id = source_project_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source project not found';
  END IF;
  
  -- VERIFICATION: Count custom phases in template_operations vs JSON
  SELECT COUNT(DISTINCT custom_phase_name)
  INTO custom_phase_count
  FROM template_operations
  WHERE project_id = source_project_id AND is_custom_phase = true;
  
  SELECT COUNT(*) 
  INTO json_phase_count
  FROM jsonb_array_elements(source_project.phases) phase
  WHERE COALESCE((phase->>'isStandard')::boolean, false) = false
    AND COALESCE((phase->>'isLinked')::boolean, false) = false;
  
  RAISE NOTICE 'Revision verification: % custom phases in JSON, % in template_operations', 
    json_phase_count, custom_phase_count;
  
  IF json_phase_count > 0 AND custom_phase_count = 0 THEN
    RAISE WARNING 'Custom phases exist in JSON but not in template_operations. This revision may be incomplete. Consider re-syncing the source project.';
  END IF;
  
  -- Create new revision project
  INSERT INTO public.projects (
    name,
    description,
    category,
    difficulty,
    effort_level,
    skill_level,
    estimated_time,
    scaling_unit,
    diy_length_challenges,
    image,
    images,
    cover_image,
    status,
    publish_status,
    phases,
    parent_project_id,
    revision_number,
    revision_notes,
    created_by
  ) VALUES (
    source_project.name || ' (Revision)',
    source_project.description,
    source_project.category,
    source_project.difficulty,
    source_project.effort_level,
    source_project.skill_level,
    source_project.estimated_time,
    source_project.scaling_unit,
    source_project.diy_length_challenges,
    source_project.image,
    source_project.images,
    source_project.cover_image,
    'not-started',
    'draft',
    '[]'::jsonb,
    COALESCE(source_project.parent_project_id, source_project_id),
    COALESCE(source_project.revision_number, 0) + 1,
    revision_notes_text,
    auth.uid()
  ) RETURNING id INTO new_revision_id;
  
  -- Copy ALL operations (standard + custom) with FULL step data
  FOR operation_record IN
    SELECT * FROM public.template_operations
    WHERE project_id = source_project_id
    ORDER BY 
      CASE 
        WHEN standard_phase_id IS NOT NULL THEN 0
        ELSE 1
      END,
      display_order
  LOOP
    -- Copy operation preserving all metadata
    INSERT INTO public.template_operations (
      project_id,
      standard_phase_id,
      is_custom_phase,
      custom_phase_name,
      custom_phase_description,
      custom_phase_display_order,
      name,
      description,
      display_order,
      flow_type,
      user_prompt,
      alternate_group,
      dependent_on
    ) VALUES (
      new_revision_id,
      operation_record.standard_phase_id,
      operation_record.is_custom_phase,
      operation_record.custom_phase_name,
      operation_record.custom_phase_description,
      operation_record.custom_phase_display_order,
      operation_record.name,
      operation_record.description,
      operation_record.display_order,
      operation_record.flow_type,
      operation_record.user_prompt,
      operation_record.alternate_group,
      NULL
    ) RETURNING id INTO new_operation_id;
    
    -- Copy all steps for this operation with FULL data
    INSERT INTO public.template_steps (
      operation_id,
      step_number,
      step_title,
      description,
      content_sections,
      materials,
      tools,
      outputs,
      apps,
      estimated_time_minutes,
      display_order,
      flow_type,
      step_type
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
      apps,
      estimated_time_minutes,
      display_order,
      flow_type,
      step_type
    FROM public.template_steps
    WHERE operation_id = operation_record.id
    ORDER BY display_order;
  END LOOP;
  
  -- Rebuild phases JSON from copied template data
  rebuilt_phases := rebuild_phases_json_from_templates(new_revision_id);
  
  -- Mark standard phases
  rebuilt_phases := (
    SELECT jsonb_agg(
      CASE 
        WHEN phase->>'name' IN ('Kickoff', 'Planning', 'Ordering', 'Close Project')
        THEN jsonb_set(phase, '{isStandard}', 'true'::jsonb)
        ELSE phase
      END
    )
    FROM jsonb_array_elements(rebuilt_phases) AS phase
  );
  
  -- Update revision with rebuilt phases
  UPDATE public.projects
  SET phases = rebuilt_phases
  WHERE id = new_revision_id;
  
  -- Log the revision creation
  PERFORM log_comprehensive_security_event(
    'project_revision_created',
    'medium',
    'Created revision of project: ' || source_project.name,
    auth.uid(),
    NULL, NULL, NULL,
    jsonb_build_object(
      'source_project_id', source_project_id,
      'new_revision_id', new_revision_id,
      'revision_number', COALESCE(source_project.revision_number, 0) + 1,
      'custom_phases_copied', custom_phase_count,
      'verification_passed', (json_phase_count = 0 OR custom_phase_count > 0)
    )
  );
  
  RAISE NOTICE 'Created revision % with % custom phases', new_revision_id, custom_phase_count;
  
  RETURN new_revision_id;
END;
$$;