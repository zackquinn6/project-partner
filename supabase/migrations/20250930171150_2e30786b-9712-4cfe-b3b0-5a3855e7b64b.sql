-- Update create_project_revision function to copy template operations and steps
CREATE OR REPLACE FUNCTION public.create_project_revision(source_project_id uuid, revision_notes_text text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  source_project public.projects%ROWTYPE;
  new_project_id uuid;
  max_revision_number integer;
  parent_id uuid;
  old_operation_id uuid;
  new_operation_id uuid;
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
  
  -- Create the new revision with EXACT copy of phases from source
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
    source_project.phases,
    source_project.estimated_time_per_unit,
    parent_id,
    max_revision_number,
    revision_notes_text,
    auth.uid(),
    source_project.revision_number,
    false
  ) RETURNING id INTO new_project_id;
  
  -- Copy template_operations and their steps
  FOR old_operation_id IN 
    SELECT id FROM public.template_operations 
    WHERE project_id = source_project_id 
    ORDER BY display_order
  LOOP
    -- Copy the operation
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
    
    -- Copy all steps for this operation
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
  
  RETURN new_project_id;
END;
$function$;