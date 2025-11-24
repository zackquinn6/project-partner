-- Fix create_project_run_snapshot to properly copy phases to project run
-- This ensures project runs are unique copies, not references to templates

CREATE OR REPLACE FUNCTION public.create_project_run_snapshot(
  p_template_id UUID,
  p_user_id UUID,
  p_run_name TEXT,
  p_home_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NOW(),
  p_plan_end_date TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  new_run_id UUID;
  default_space_id UUID;
  template_phases_json JSONB;
BEGIN
  -- Create project run
  INSERT INTO public.project_runs (
    template_id,
    user_id,
    name,
    custom_project_name,
    home_id,
    start_date,
    plan_end_date,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_template_id,
    p_user_id,
    p_run_name,
    p_run_name,
    p_home_id,
    p_start_date,
    p_plan_end_date,
    'in_progress',
    NOW(),
    NOW()
  ) RETURNING id INTO new_run_id;

  -- Create default space "Room 1"
  INSERT INTO public.project_run_spaces (
    project_run_id,
    space_name,
    space_type,
    is_from_home,
    priority,
    created_at,
    updated_at
  ) VALUES (
    new_run_id,
    'Room 1',
    'general',
    false,
    1,
    NOW(),
    NOW()
  ) RETURNING id INTO default_space_id;

  -- CRITICAL FIX: Copy phases from template to project run (not just rebuild template)
  -- Get the phases JSON from the template project
  SELECT phases INTO template_phases_json
  FROM public.projects
  WHERE id = p_template_id;
  
  -- If template has phases, copy them to the project run
  -- This ensures the project run has its own copy of phases, not a reference
  IF template_phases_json IS NOT NULL THEN
    UPDATE public.project_runs
    SET phases = template_phases_json
    WHERE id = new_run_id;
  ELSE
    -- If template doesn't have phases, rebuild them from project_phases table
    -- This uses the RPC function to build phases from the database structure
    PERFORM public.rebuild_phases_json_from_project_phases(p_template_id);
    
    -- Then copy the rebuilt phases to the project run
    SELECT phases INTO template_phases_json
    FROM public.projects
    WHERE id = p_template_id;
    
    IF template_phases_json IS NOT NULL THEN
      UPDATE public.project_runs
      SET phases = template_phases_json
      WHERE id = new_run_id;
    END IF;
  END IF;

  RETURN new_run_id;
END;
$$ LANGUAGE plpgsql;

