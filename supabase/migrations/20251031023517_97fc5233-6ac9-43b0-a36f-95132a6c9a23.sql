-- Fix sync_custom_phases_on_update to handle edge cases safely

CREATE OR REPLACE FUNCTION sync_custom_phases_on_update()
RETURNS TRIGGER AS $$
DECLARE
  phase jsonb;
  operation jsonb;
  step jsonb;
  phase_order int := 100;
  new_operation_id uuid;
BEGIN
  -- Only process if phases changed and it's not the standard template
  IF NEW.phases IS DISTINCT FROM OLD.phases 
     AND (NEW.is_standard_template IS NULL OR NEW.is_standard_template = false) THEN
    
    -- Safety check: Ensure phases is a valid array
    IF NEW.phases IS NULL OR jsonb_typeof(NEW.phases) != 'array' THEN
      RAISE NOTICE 'Phases is not a valid array for project %, skipping sync', NEW.id;
      RETURN NEW;
    END IF;
    
    RAISE NOTICE 'Syncing custom phases for project %: %', NEW.id, NEW.name;
    
    -- Delete all existing custom phase operations for this project
    DELETE FROM template_operations 
    WHERE project_id = NEW.id AND is_custom_phase = true;
    
    -- Insert custom phases from JSON
    FOR phase IN SELECT * FROM jsonb_array_elements(NEW.phases)
    LOOP
      -- Only process non-standard, non-linked phases
      IF COALESCE((phase->>'isStandard')::boolean, false) = false 
         AND COALESCE((phase->>'isLinked')::boolean, false) = false THEN
        
        RAISE NOTICE 'Processing custom phase: %', phase->>'name';
        
        -- Safety check: Ensure operations exists and is an array
        IF phase->'operations' IS NULL OR jsonb_typeof(phase->'operations') != 'array' THEN
          RAISE NOTICE 'Operations field is null or not an array for phase %, skipping', phase->>'name';
          CONTINUE;
        END IF;
        
        -- Insert each operation and its steps
        FOR operation IN SELECT * FROM jsonb_array_elements(phase->'operations')
        LOOP
          -- Insert operation with custom phase metadata
          INSERT INTO template_operations (
            project_id, 
            name, 
            description, 
            custom_phase_name, 
            custom_phase_description,
            custom_phase_display_order, 
            display_order,
            standard_phase_id,
            flow_type,
            user_prompt,
            alternate_group,
            dependent_on
          ) VALUES (
            NEW.id,
            operation->>'name',
            operation->>'description',
            phase->>'name',
            phase->>'description',
            phase_order,
            COALESCE((operation->>'displayOrder')::int, 0),
            NULL,
            operation->>'flowType',
            operation->>'userPrompt',
            operation->>'alternateGroup',
            (operation->>'dependentOn')::uuid
          ) RETURNING id INTO new_operation_id;
          
          RAISE NOTICE 'Created operation % for custom phase %', operation->>'name', phase->>'name';
          
          -- Safety check: Ensure steps exists and is an array
          IF operation->'steps' IS NOT NULL AND jsonb_typeof(operation->'steps') = 'array' THEN
            -- Insert steps for this operation
            FOR step IN SELECT * FROM jsonb_array_elements(operation->'steps')
            LOOP
              INSERT INTO template_steps (
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
                flow_type,
                step_type
              ) VALUES (
                new_operation_id,
                COALESCE((step->>'stepNumber')::int, 1),
                COALESCE(step->>'step', 'Untitled Step'),
                step->>'description',
                COALESCE(step->'content_sections', step->'content', '[]'::jsonb),
                COALESCE(step->'materials', '[]'::jsonb),
                COALESCE(step->'tools', '[]'::jsonb),
                COALESCE(step->'outputs', '[]'::jsonb),
                COALESCE(step->'apps', '[]'::jsonb),
                COALESCE((step->>'estimatedTimeMinutes')::int, 0),
                COALESCE((step->>'stepNumber')::int, 1),
                COALESCE(step->>'flowType', 'prime'),
                COALESCE(step->>'stepType', 'prime')
              );
            END LOOP;
          ELSE
            RAISE NOTICE 'No steps found for operation %', operation->>'name';
          END IF;
        END LOOP;
        
        phase_order := phase_order + 10;
      END IF;
    END LOOP;
    
    RAISE NOTICE 'Custom phase sync complete for project %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;