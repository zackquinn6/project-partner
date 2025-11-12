-- Create the dynamic phase builder function
-- This merges standard operations from foundation with custom operations
CREATE OR REPLACE FUNCTION public.build_phases_json_with_dynamic_standard(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result_phases jsonb;
  standard_project_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Build phases JSON by merging standard and custom operations
  WITH merged_operations AS (
    -- Get all operations from both standard foundation and custom project
    SELECT 
      phase_id,
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'operation', operation,
          'description', description,
          'order', "order",
          'isStandard', (project_id = standard_project_id),
          'steps', COALESCE(steps, '[]'::jsonb)
        ) ORDER BY "order"
      ) as operations
    FROM public.operations
    WHERE project_id IN (standard_project_id, p_project_id)
    GROUP BY phase_id
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'phase', p.phase,
      'description', p.description,
      'order', p."order",
      'isStandard', (p.project_id = standard_project_id),
      'operations', COALESCE(mo.operations, '[]'::jsonb)
    ) ORDER BY p."order"
  )
  INTO result_phases
  FROM public.phases p
  LEFT JOIN merged_operations mo ON mo.phase_id = p.id
  WHERE p.project_id IN (standard_project_id, p_project_id);
  
  RETURN COALESCE(result_phases, '[]'::jsonb);
END;
$$;

-- Update create_project_run_snapshot to use the builder function
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
    RAISE EXCEPTION 'Template project not found';
  END IF;
  
  -- Build complete phases JSON dynamically at snapshot time
  -- This merges standard operations from foundation with custom operations from template
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
$$;

-- Rebuild existing project runs with complete workflow data
UPDATE public.project_runs
SET phases = build_phases_json_with_dynamic_standard(template_id)
WHERE phases IS NOT NULL;