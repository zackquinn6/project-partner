-- Drop the incorrect function that queries non-existent tables
DROP FUNCTION IF EXISTS public.build_phases_json_with_dynamic_standard(uuid);

-- Create the correct function that works with the JSONB phases column
CREATE OR REPLACE FUNCTION public.build_phases_json_with_dynamic_standard(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result_phases jsonb;
  standard_phases jsonb;
  custom_phases jsonb;
  standard_project_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Get phases from Standard Project Foundation
  SELECT phases INTO standard_phases
  FROM public.projects
  WHERE id = standard_project_id;
  
  -- Get phases from the template project
  SELECT phases INTO custom_phases
  FROM public.projects
  WHERE id = p_project_id;
  
  -- If no standard phases, just return custom phases
  IF standard_phases IS NULL THEN
    RETURN COALESCE(custom_phases, '[]'::jsonb);
  END IF;
  
  -- If no custom phases, just return standard phases
  IF custom_phases IS NULL THEN
    RETURN standard_phases;
  END IF;
  
  -- Merge standard phases with custom phases
  -- Standard phases come first, then custom phases
  result_phases := standard_phases || custom_phases;
  
  RETURN result_phases;
END;
$$;

-- Update create_project_run_snapshot to handle errors better
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
AS $$
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
    RAISE EXCEPTION 'Template project not found: %', p_template_id;
  END IF;
  
  -- Build complete phases JSON dynamically at snapshot time
  -- This merges standard phases from foundation with custom phases from template
  complete_phases := build_phases_json_with_dynamic_standard(p_template_id);
  
  -- Validate we have phases
  IF complete_phases IS NULL OR jsonb_array_length(complete_phases) = 0 THEN
    RAISE EXCEPTION 'No phases found for project template: %', p_template_id;
  END IF;
  
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
    complete_phases,
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
    'Created project run snapshot: ' || p_run_name,
    p_user_id,
    NULL, NULL, NULL,
    jsonb_build_object(
      'run_id', new_run_id,
      'template_id', p_template_id,
      'run_name', p_run_name,
      'phases_count', jsonb_array_length(complete_phases)
    )
  );
  
  RETURN new_run_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error
    PERFORM log_comprehensive_security_event(
      'project_run_creation_failed',
      'medium',
      'Failed to create project run: ' || SQLERRM,
      p_user_id,
      NULL, NULL, NULL,
      jsonb_build_object(
        'template_id', p_template_id,
        'run_name', p_run_name,
        'error', SQLERRM
      )
    );
    RAISE;
END;
$$;

-- Rebuild existing project runs with complete workflow data
UPDATE public.project_runs
SET phases = build_phases_json_with_dynamic_standard(template_id)
WHERE phases IS NOT NULL;