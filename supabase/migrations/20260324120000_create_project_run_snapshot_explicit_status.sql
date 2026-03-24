-- Hardening: INSERT must set app-valid project_runs.status and schedule_optimization_method
-- explicitly so rows never rely on wrong DEFAULTs or column-order bugs.
-- Matches client expectations (ProjectActionsContext, ProjectRun types).

CREATE OR REPLACE FUNCTION public.create_project_run_snapshot_v2(
  p_template_id UUID,
  p_user_id UUID,
  p_run_name TEXT,
  p_home_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NOW(),
  p_plan_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_run_id UUID;
  workflow_json JSONB;
  default_home_id UUID;
  default_space_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_template_id) THEN
    RAISE EXCEPTION 'Template project not found: %', p_template_id;
  END IF;

  IF p_home_id IS NOT NULL THEN
    default_home_id := p_home_id;
  ELSE
    SELECT id INTO default_home_id
    FROM public.homes
    WHERE user_id = p_user_id
    ORDER BY created_at ASC
    LIMIT 1;

    IF default_home_id IS NULL THEN
      INSERT INTO public.homes (user_id, name, address)
      VALUES (p_user_id, 'My Home', '')
      RETURNING id INTO default_home_id;
    END IF;
  END IF;

  SELECT public.get_project_workflow_with_standards(p_template_id)
  INTO workflow_json;

  IF workflow_json IS NULL OR jsonb_array_length(workflow_json) = 0 THEN
    RAISE EXCEPTION 'Template has no phases. Cannot create project run without phases.';
  END IF;

  INSERT INTO public.project_runs (
    template_id,
    user_id,
    name,
    home_id,
    start_date,
    plan_end_date,
    phases,
    status,
    schedule_optimization_method,
    created_at,
    updated_at
  ) VALUES (
    p_template_id,
    p_user_id,
    p_run_name,
    default_home_id,
    p_start_date,
    p_plan_end_date,
    workflow_json,
    'not-started',
    'single-piece-flow',
    NOW(),
    NOW()
  )
  RETURNING id INTO new_run_id;

  INSERT INTO public.project_run_spaces (
    project_run_id,
    space_name,
    space_type,
    created_at
  ) VALUES (
    new_run_id,
    'Room 1',
    'room',
    NOW()
  )
  RETURNING id INTO default_space_id;

  RETURN new_run_id;

EXCEPTION
  WHEN OTHERS THEN
    IF new_run_id IS NOT NULL THEN
      DELETE FROM public.project_runs WHERE id = new_run_id;
    END IF;
    RAISE;
END;
$$;

-- Keep v1 in sync for any callers still using create_project_run_snapshot
CREATE OR REPLACE FUNCTION public.create_project_run_snapshot(
  p_template_id UUID,
  p_user_id UUID,
  p_run_name TEXT,
  p_home_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NOW(),
  p_plan_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_run_id UUID;
  workflow_json JSONB;
  default_home_id UUID;
  default_space_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_template_id) THEN
    RAISE EXCEPTION 'Template project not found: %', p_template_id;
  END IF;

  IF p_home_id IS NOT NULL THEN
    default_home_id := p_home_id;
  ELSE
    SELECT id INTO default_home_id
    FROM public.homes
    WHERE user_id = p_user_id
    ORDER BY created_at ASC
    LIMIT 1;

    IF default_home_id IS NULL THEN
      INSERT INTO public.homes (user_id, name, address)
      VALUES (p_user_id, 'My Home', '')
      RETURNING id INTO default_home_id;
    END IF;
  END IF;

  SELECT public.get_project_workflow_with_standards(p_template_id)
  INTO workflow_json;

  IF workflow_json IS NULL OR jsonb_array_length(workflow_json) = 0 THEN
    RAISE EXCEPTION 'Template has no phases. Cannot create project run without phases.';
  END IF;

  INSERT INTO public.project_runs (
    template_id,
    user_id,
    name,
    home_id,
    start_date,
    plan_end_date,
    phases,
    status,
    schedule_optimization_method,
    created_at,
    updated_at
  ) VALUES (
    p_template_id,
    p_user_id,
    p_run_name,
    default_home_id,
    p_start_date,
    p_plan_end_date,
    workflow_json,
    'not-started',
    'single-piece-flow',
    NOW(),
    NOW()
  )
  RETURNING id INTO new_run_id;

  INSERT INTO public.project_run_spaces (
    project_run_id,
    space_name,
    space_type,
    created_at
  ) VALUES (
    new_run_id,
    'Room 1',
    'room',
    NOW()
  )
  RETURNING id INTO default_space_id;

  RETURN new_run_id;

EXCEPTION
  WHEN OTHERS THEN
    IF new_run_id IS NOT NULL THEN
      DELETE FROM public.project_runs WHERE id = new_run_id;
    END IF;
    RAISE;
END;
$$;
