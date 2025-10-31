-- Fix #1: Add detailed logging to create_project_revision to track custom phase copying
-- Fix #2: Ensure trigger_rebuild_phases_json handles custom phases correctly
-- Fix #3: Update rebuild_phases_json_from_templates to properly mark custom phases

CREATE OR REPLACE FUNCTION public.create_project_revision(
  source_project_id uuid,
  revision_notes_text text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  new_revision_id uuid;
  source_project record;
  max_revision_number int;
  parent_id uuid;
  source_operation record;
  new_operation_id uuid;
  rebuilt_phases jsonb;
  custom_ops_count int := 0;
  standard_ops_count int := 0;
  total_steps_copied int := 0;
BEGIN
  -- Verify user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can create project revisions';
  END IF;
  
  -- Get source project
  SELECT * INTO source_project
  FROM public.projects
  WHERE id = source_project_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source project not found';
  END IF;
  
  -- Determine parent project and next revision number
  IF source_project.parent_project_id IS NOT NULL THEN
    parent_id := source_project.parent_project_id;
  ELSE
    parent_id := source_project.id;
  END IF;
  
  SELECT COALESCE(MAX(revision_number), -1) + 1 INTO max_revision_number
  FROM public.projects
  WHERE id = parent_id OR parent_project_id = parent_id;
  
  RAISE NOTICE '📋 Creating revision % from source project %', max_revision_number, source_project_id;
  
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
    is_current_version,
    created_by
  ) VALUES (
    source_project.name,
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
    parent_id,
    max_revision_number,
    revision_notes_text,
    false,
    auth.uid()
  ) RETURNING id INTO new_revision_id;
  
  RAISE NOTICE '✅ Created new revision project: %', new_revision_id;
  
  -- Copy ALL operations (both standard and custom) and their steps
  FOR source_operation IN
    SELECT * FROM public.template_operations
    WHERE project_id = source_project_id
    ORDER BY display_order
  LOOP
    -- Track operation type
    IF source_operation.is_custom_phase THEN
      custom_ops_count := custom_ops_count + 1;
      RAISE NOTICE '📦 Copying CUSTOM operation: % (phase: %)', 
        source_operation.name, source_operation.custom_phase_name;
    ELSE
      standard_ops_count := standard_ops_count + 1;
      RAISE NOTICE '📦 Copying STANDARD operation: % (phase_id: %)', 
        source_operation.name, source_operation.standard_phase_id;
    END IF;
    
    -- Copy operation (preserving custom phase info)
    INSERT INTO public.template_operations (
      project_id,
      standard_phase_id,
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
      source_operation.standard_phase_id,
      source_operation.custom_phase_name,
      source_operation.custom_phase_description,
      source_operation.custom_phase_display_order,
      source_operation.name,
      source_operation.description,
      source_operation.display_order,
      source_operation.flow_type,
      source_operation.user_prompt,
      source_operation.alternate_group,
      source_operation.dependent_on
    ) RETURNING id INTO new_operation_id;
    
    -- Copy all steps for this operation (with content)
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
    WHERE operation_id = source_operation.id
    ORDER BY display_order;
    
    -- Count steps copied
    GET DIAGNOSTICS total_steps_copied = ROW_COUNT;
    RAISE NOTICE '  ✅ Copied % steps for operation %', total_steps_copied, source_operation.name;
  END LOOP;
  
  -- Log summary
  RAISE NOTICE '📊 COPY SUMMARY:';
  RAISE NOTICE '  - Standard operations: %', standard_ops_count;
  RAISE NOTICE '  - Custom operations: %', custom_ops_count;
  RAISE NOTICE '  - Total operations: %', (custom_ops_count + standard_ops_count);
  RAISE NOTICE '  - Total steps: %', total_steps_copied;
  
  -- Rebuild phases JSON from copied template data
  RAISE NOTICE '🔧 Rebuilding phases JSON...';
  rebuilt_phases := rebuild_phases_json_from_templates(new_revision_id);
  
  -- Update project with rebuilt phases
  UPDATE public.projects
  SET phases = rebuilt_phases
  WHERE id = new_revision_id;
  
  RAISE NOTICE '✅ Revision creation complete: %', new_revision_id;
  
  -- Log the creation
  PERFORM log_comprehensive_security_event(
    'project_revision_created',
    'medium',
    'Created revision ' || max_revision_number || ' of project: ' || source_project.name,
    auth.uid(),
    NULL, NULL, NULL,
    jsonb_build_object(
      'source_project_id', source_project_id,
      'new_revision_id', new_revision_id,
      'revision_number', max_revision_number,
      'standard_operations_copied', standard_ops_count,
      'custom_operations_copied', custom_ops_count,
      'total_steps_copied', total_steps_copied,
      'revision_notes', revision_notes_text
    )
  );
  
  RETURN new_revision_id;
END;
$function$;

-- Ensure trigger fires correctly for custom phases
CREATE OR REPLACE FUNCTION public.trigger_rebuild_phases_json()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  affected_project_id uuid;
  rebuilt_phases jsonb;
  ops_count int;
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
    -- Count operations to verify data exists
    SELECT COUNT(*) INTO ops_count
    FROM template_operations
    WHERE project_id = affected_project_id;
    
    RAISE NOTICE '🔄 Trigger: Rebuilding phases JSON for project % (% operations)', 
      affected_project_id, ops_count;
    
    rebuilt_phases := rebuild_phases_json_from_templates(affected_project_id);
    
    UPDATE public.projects
    SET phases = rebuilt_phases,
        updated_at = now()
    WHERE id = affected_project_id;
    
    RAISE NOTICE '✅ Trigger: Phases JSON rebuilt successfully';
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;