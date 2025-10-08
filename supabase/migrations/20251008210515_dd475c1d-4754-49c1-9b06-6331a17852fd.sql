-- Fix create_project_with_standard_foundation to mark phases as isStandard and preserve apps
CREATE OR REPLACE FUNCTION public.create_project_with_standard_foundation(
  p_project_name text,
  p_description text DEFAULT NULL::text,
  p_category text DEFAULT NULL::text,
  p_difficulty text DEFAULT NULL::text,
  p_effort_level text DEFAULT NULL::text,
  p_estimated_time text DEFAULT NULL::text,
  p_image text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  new_project_id uuid;
  standard_project_id uuid;
  standard_operation record;
  new_operation_id uuid;
  rebuilt_phases jsonb;
BEGIN
  -- Verify user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can create project templates';
  END IF;
  
  -- Get standard project ID
  SELECT id INTO standard_project_id
  FROM public.projects
  WHERE is_standard_template = true
  LIMIT 1;
  
  IF standard_project_id IS NULL THEN
    RAISE EXCEPTION 'Standard Project Foundation not found';
  END IF;
  
  -- Create new project
  INSERT INTO public.projects (
    name,
    description,
    category,
    difficulty,
    effort_level,
    estimated_time,
    image,
    status,
    publish_status,
    phases,
    created_by
  ) VALUES (
    p_project_name,
    p_description,
    p_category,
    p_difficulty,
    p_effort_level,
    p_estimated_time,
    p_image,
    'not-started',
    'draft',
    '[]'::jsonb,
    auth.uid()
  ) RETURNING id INTO new_project_id;
  
  -- Copy all standard operations and steps (preserving apps)
  FOR standard_operation IN
    SELECT * FROM public.template_operations
    WHERE project_id = standard_project_id
    ORDER BY display_order
  LOOP
    -- Copy operation
    INSERT INTO public.template_operations (
      project_id,
      standard_phase_id,
      name,
      description,
      display_order
    ) VALUES (
      new_project_id,
      standard_operation.standard_phase_id,
      standard_operation.name,
      standard_operation.description,
      standard_operation.display_order
    ) RETURNING id INTO new_operation_id;
    
    -- Copy all steps for this operation (INCLUDING apps)
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
    WHERE operation_id = standard_operation.id
    ORDER BY display_order;
  END LOOP;
  
  -- Rebuild phases JSON from template_operations/template_steps
  rebuilt_phases := rebuild_phases_json_from_templates(new_project_id);
  
  -- Mark standard phases with isStandard: true
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
  
  -- Update project with rebuilt phases (now with isStandard flags)
  UPDATE public.projects
  SET phases = rebuilt_phases
  WHERE id = new_project_id;
  
  -- Log the creation
  PERFORM log_comprehensive_security_event(
    'project_created_with_standard_foundation',
    'medium',
    'Created new project with standard foundation: ' || p_project_name,
    auth.uid(),
    NULL, NULL, NULL,
    jsonb_build_object(
      'project_id', new_project_id,
      'project_name', p_project_name,
      'phases_marked_standard', rebuilt_phases
    )
  );
  
  RETURN new_project_id;
END;
$function$;