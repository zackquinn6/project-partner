-- Automatic Space Creation Feature
-- Upon creating a new project run, automatically create one default space
-- This default space will inherit the kickoff project size when initial_sizing is set

CREATE OR REPLACE FUNCTION public.create_project_run_snapshot(
  p_template_id UUID,
  p_user_id UUID,
  p_run_name TEXT,
  p_home_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT now(),
  p_plan_end_date TIMESTAMPTZ DEFAULT (now() + interval '30 days')
) RETURNS UUID AS $$
DECLARE
  new_run_id UUID;
  template_project RECORD;
  complete_phases JSONB;
  default_space_id UUID;
  project_scaling_unit TEXT;
BEGIN
  IF auth.uid() <> p_user_id AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot create project runs for other users';
  END IF;

  SELECT * INTO template_project
  FROM public.projects
  WHERE id = p_template_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template project not found';
  END IF;

  -- Build phases JSON with project skill_level as default for steps
  complete_phases := public.rebuild_phases_json_from_project_phases(p_template_id, template_project.skill_level);

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
    project_challenges,
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
    template_project.project_challenges,
    '[]'::jsonb,
    0
  )
  RETURNING id INTO new_run_id;

  -- Automatically create a default space for the new project run
  -- Get the scaling unit from the template project (default to 'square foot' if not set)
  project_scaling_unit := COALESCE(template_project.scaling_unit, 'square foot');
  
  -- If scaling_unit is 'per square foot', use 'square foot' as the unit
  -- If scaling_unit is 'per 10x10 room', use 'room' as the unit
  -- If scaling_unit is 'per linear foot', use 'linear foot' as the unit
  -- If scaling_unit is 'per cubic yard', use 'cubic yard' as the unit
  -- If scaling_unit is 'per item', use 'item' as the unit
  -- Otherwise default to 'square foot'
  CASE 
    WHEN project_scaling_unit = 'per square foot' THEN project_scaling_unit := 'square foot';
    WHEN project_scaling_unit = 'per 10x10 room' THEN project_scaling_unit := 'room';
    WHEN project_scaling_unit = 'per linear foot' THEN project_scaling_unit := 'linear foot';
    WHEN project_scaling_unit = 'per cubic yard' THEN project_scaling_unit := 'cubic yard';
    WHEN project_scaling_unit = 'per item' THEN project_scaling_unit := 'item';
    ELSE project_scaling_unit := 'square foot';
  END CASE;

  -- Create default space with priority 1 (highest priority)
  -- The scale_value will be NULL initially and will be updated when initial_sizing is set during kickoff
  INSERT INTO public.project_run_spaces (
    project_run_id,
    space_name,
    space_type,
    scale_value,
    scale_unit,
    is_from_home,
    priority
  ) VALUES (
    new_run_id,
    'Default Space',
    'custom',
    NULL, -- Will be updated when initial_sizing is set during kickoff
    project_scaling_unit,
    false,
    1 -- Highest priority (lowest number)
  )
  RETURNING id INTO default_space_id;

  RETURN new_run_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger function to update the default space when initial_sizing is set
CREATE OR REPLACE FUNCTION public.update_default_space_on_initial_sizing()
RETURNS TRIGGER AS $$
DECLARE
  default_space RECORD;
  project_scaling_unit TEXT;
  parsed_size NUMERIC;
  default_space_id UUID;
BEGIN
  -- Only proceed if initial_sizing is being set (not NULL) and it's different from the old value
  IF NEW.initial_sizing IS NOT NULL AND (OLD.initial_sizing IS NULL OR NEW.initial_sizing <> OLD.initial_sizing) THEN
    -- Get the default space for this project run (priority = 1, name = 'Default Space')
    SELECT * INTO default_space
    FROM public.project_run_spaces
    WHERE project_run_id = NEW.id
      AND priority = 1
      AND space_name = 'Default Space'
    LIMIT 1;

    -- Try to parse the initial_sizing as a number
    BEGIN
      parsed_size := NULLIF(REGEXP_REPLACE(NEW.initial_sizing, '[^0-9.]', '', 'g'), '')::NUMERIC;
    EXCEPTION
      WHEN OTHERS THEN
        parsed_size := NULL;
    END;

    -- Get scaling unit from the project template
    SELECT COALESCE(scaling_unit, 'square foot') INTO project_scaling_unit
    FROM public.projects
    WHERE id = NEW.template_id;

    -- Normalize scaling unit for space
    CASE 
      WHEN project_scaling_unit = 'per square foot' THEN project_scaling_unit := 'square foot';
      WHEN project_scaling_unit = 'per 10x10 room' THEN project_scaling_unit := 'room';
      WHEN project_scaling_unit = 'per linear foot' THEN project_scaling_unit := 'linear foot';
      WHEN project_scaling_unit = 'per cubic yard' THEN project_scaling_unit := 'cubic yard';
      WHEN project_scaling_unit = 'per item' THEN project_scaling_unit := 'item';
      ELSE project_scaling_unit := 'square foot';
    END CASE;

    -- If default space exists, update it with the initial_sizing value
    -- Otherwise, create it (for older project runs created before this migration)
    IF FOUND THEN
      -- Update the existing default space
      -- Also update sizing_values JSONB column for multiple sizing units support
      UPDATE public.project_run_spaces
      SET scale_value = parsed_size,
          scale_unit = project_scaling_unit,
          sizing_values = COALESCE(sizing_values, '{}'::jsonb) || jsonb_build_object(project_scaling_unit, parsed_size),
          updated_at = now()
      WHERE id = default_space.id;
    ELSE
      -- Create the default space if it doesn't exist (for backward compatibility)
      INSERT INTO public.project_run_spaces (
        project_run_id,
        space_name,
        space_type,
        scale_value,
        scale_unit,
        sizing_values,
        is_from_home,
        priority
      ) VALUES (
        NEW.id,
        'Default Space',
        'custom',
        parsed_size,
        project_scaling_unit,
        jsonb_build_object(project_scaling_unit, parsed_size),
        false,
        1
      )
      RETURNING id INTO default_space_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update default space when initial_sizing is set
DROP TRIGGER IF EXISTS trigger_update_default_space_on_initial_sizing ON public.project_runs;
CREATE TRIGGER trigger_update_default_space_on_initial_sizing
  AFTER UPDATE OF initial_sizing ON public.project_runs
  FOR EACH ROW
  WHEN (NEW.initial_sizing IS NOT NULL)
  EXECUTE FUNCTION public.update_default_space_on_initial_sizing();

COMMENT ON FUNCTION public.create_project_run_snapshot IS 'Creates a new project run snapshot and automatically creates a default space with priority 1';
COMMENT ON FUNCTION public.update_default_space_on_initial_sizing IS 'Automatically updates the default space scale_value when initial_sizing is set on a project run';

