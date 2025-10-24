-- Update create_project_revision function to copy ALL content including decision tree and apps
CREATE OR REPLACE FUNCTION public.create_project_revision(source_project_id uuid, revision_notes_text text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
  
  -- Don't allow revisions of the Standard Project Foundation
  IF source_project.is_standard_template THEN
    RAISE EXCEPTION 'Cannot create revisions of the Standard Project Foundation';
  END IF;
  
  -- Determine parent project ID
  IF source_project.parent_project_id IS NOT NULL THEN
    parent_id := source_project.parent_project_id;
  ELSE
    parent_id := source_project_id;
  END IF;
  
  -- Get max revision number
  SELECT COALESCE(MAX(revision_number), -1) + 1 INTO max_revision_number
  FROM public.projects 
  WHERE parent_project_id = parent_id OR id = parent_id;
  
  -- Create the new revision
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
    phases,
    estimated_time_per_unit,
    parent_project_id,
    revision_number,
    revision_notes,
    created_by,
    created_from_revision,
    is_current_version,
    is_standard_template
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
    '[]'::jsonb,
    source_project.estimated_time_per_unit,
    parent_id,
    max_revision_number,
    revision_notes_text,
    auth.uid(),
    source_project.revision_number,
    false,
    false -- Revisions are never standard templates
  ) RETURNING id INTO new_project_id;
  
  -- Copy ALL template_operations WITH ALL FIELDS including decision tree metadata
  FOR old_operation_id IN 
    SELECT id FROM public.template_operations 
    WHERE project_id = source_project_id 
    ORDER BY display_order
  LOOP
    INSERT INTO public.template_operations (
      project_id,
      standard_phase_id,
      name,
      description,
      display_order,
      flow_type,
      user_prompt,
      alternate_group,
      dependent_on
    )
    SELECT 
      new_project_id,
      standard_phase_id,
      name,
      description,
      display_order,
      flow_type,
      user_prompt,
      alternate_group,
      dependent_on
    FROM public.template_operations
    WHERE id = old_operation_id
    RETURNING id INTO new_operation_id;
    
    -- Copy ALL step fields including apps and flow_type
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
      flow_type
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
      flow_type
    FROM public.template_steps
    WHERE operation_id = old_operation_id
    ORDER BY display_order;
  END LOOP;
  
  -- Rebuild phases JSON (which now includes all metadata)
  rebuilt_phases := rebuild_phases_json_from_templates(new_project_id);
  
  UPDATE public.projects
  SET phases = rebuilt_phases
  WHERE id = new_project_id;
  
  -- Log the revision
  PERFORM log_comprehensive_security_event(
    'project_revision_created',
    'medium',
    'Created project revision with complete content',
    auth.uid(),
    NULL, NULL, NULL,
    jsonb_build_object(
      'new_project_id', new_project_id,
      'source_project_id', source_project_id,
      'revision_number', max_revision_number
    )
  );
  
  RETURN new_project_id;
END;
$function$;