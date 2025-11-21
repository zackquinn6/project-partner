-- Update trigger function to use relational table instead of JSONB
-- This replaces sizing_values JSONB updates with relational table inserts/updates

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

    -- Normalize scaling unit for space (remove 'per ' prefix if present)
    CASE 
      WHEN project_scaling_unit = 'per square foot' THEN project_scaling_unit := 'per square foot';
      WHEN project_scaling_unit = 'per 10x10 room' THEN project_scaling_unit := 'per 10x10 room';
      WHEN project_scaling_unit = 'per linear foot' THEN project_scaling_unit := 'per linear foot';
      WHEN project_scaling_unit = 'per cubic yard' THEN project_scaling_unit := 'per cubic yard';
      WHEN project_scaling_unit = 'per item' THEN project_scaling_unit := 'per item';
      ELSE project_scaling_unit := 'per square foot';
    END CASE;

    -- If default space exists, update it with the initial_sizing value
    -- Otherwise, create it (for older project runs created before this migration)
    IF FOUND THEN
      -- Update the existing default space (legacy columns for backward compatibility)
      UPDATE public.project_run_spaces
      SET scale_value = parsed_size,
          scale_unit = project_scaling_unit,
          updated_at = now()
      WHERE id = default_space.id;

      -- Insert or update sizing value in relational table
      INSERT INTO public.project_run_space_sizing (space_id, scaling_unit, size_value)
      VALUES (default_space.id, project_scaling_unit, parsed_size)
      ON CONFLICT (space_id, scaling_unit) 
      DO UPDATE SET size_value = parsed_size, updated_at = now();
    ELSE
      -- Create the default space if it doesn't exist (for backward compatibility)
      INSERT INTO public.project_run_spaces (
        project_run_id,
        space_name,
        space_type,
        scale_value,
        scale_unit,
        is_from_home,
        priority
      ) VALUES (
        NEW.id,
        'Default Space',
        'custom',
        parsed_size,
        project_scaling_unit,
        false,
        1
      )
      RETURNING id INTO default_space_id;

      -- Insert sizing value in relational table
      IF default_space_id IS NOT NULL AND parsed_size IS NOT NULL THEN
        INSERT INTO public.project_run_space_sizing (space_id, scaling_unit, size_value)
        VALUES (default_space_id, project_scaling_unit, parsed_size)
        ON CONFLICT (space_id, scaling_unit) 
        DO UPDATE SET size_value = parsed_size, updated_at = now();
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_default_space_on_initial_sizing IS 'Automatically updates the default space sizing when initial_sizing is set on a project run. Uses relational table project_run_space_sizing instead of JSONB.';

