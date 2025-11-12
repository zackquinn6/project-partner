-- Update create_project_run_snapshot to build complete immutable snapshot
-- This ensures project runs contain BOTH standard (from foundation) and custom operations
-- at the time of creation, creating a true immutable snapshot
CREATE OR REPLACE FUNCTION public.create_project_run_snapshot(
  p_template_id uuid,
  p_user_id uuid,
  p_run_name text,
  p_home_id uuid DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT now(),
  p_plan_end_date timestamp with time zone DEFAULT (now() + interval '30 days')
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_run_id uuid;
  template_project record;
  complete_phases jsonb;
BEGIN
  -- Verify user can create runs
  IF auth.uid() != p_user_id AND NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot create project runs for other users';
  END IF;
  
  -- Get template project
  SELECT * INTO template_project
  FROM public.projects
  WHERE id = p_template_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template project not found';
  END IF;
  
  -- Build complete phases JSON dynamically at snapshot time
  -- This merges standard operations from foundation with custom operations from template
  -- Creating a TRUE IMMUTABLE SNAPSHOT
  complete_phases := build_phases_json_with_dynamic_standard(p_template_id);
  
  -- Create immutable snapshot with complete phases
  INSERT INTO public.project_runs (
    template_id,
    user_id,
    name,
    description,
    home_id,
    status,
    start_date,
    plan_end_date,
    phases,
    category,
    difficulty,
    estimated_time,
    effort_level,
    skill_level,
    diy_length_challenges,
    completed_steps,
    progress
  ) VALUES (
    p_template_id,
    p_user_id,
    p_run_name,
    template_project.description,
    p_home_id,
    'not-started',
    p_start_date,
    p_plan_end_date,
    complete_phases, -- Complete snapshot with standard + custom operations
    template_project.category,
    template_project.difficulty,
    template_project.estimated_time,
    template_project.effort_level,
    template_project.skill_level,
    template_project.diy_length_challenges,
    '[]'::jsonb,
    0
  ) RETURNING id INTO new_run_id;
  
  -- Log the creation
  PERFORM log_comprehensive_security_event(
    'project_run_created',
    'low',
    'Created project run snapshot with complete workflow: ' || p_run_name,
    p_user_id,
    NULL, NULL, NULL,
    jsonb_build_object(
      'run_id', new_run_id,
      'template_id', p_template_id,
      'run_name', p_run_name,
      'phases_count', jsonb_array_length(complete_phases),
      'snapshot_type', 'immutable_with_standards'
    )
  );
  
  RETURN new_run_id;
END;
$function$;