
-- Content Migration: Move workflow content from phases JSON to normalized template_steps
-- This migration extracts all step content, materials, tools, and outputs from the phases JSON
-- and populates the template_steps table for the Tile Flooring Installation project

DO $$
DECLARE
  tile_project_id UUID;
  project_phases JSONB;
  phase_record JSONB;
  operation_record JSONB;
  step_record JSONB;
  found_operation_id UUID;
  found_step_id UUID;
  new_content_sections JSONB;
BEGIN
  -- Get the latest Tile Flooring Installation project
  SELECT p.id, p.phases INTO tile_project_id, project_phases
  FROM public.projects p
  WHERE p.name = 'Tile Flooring Installation'
  ORDER BY p.revision_number DESC
  LIMIT 1;
  
  RAISE NOTICE 'Migrating content for project: %', tile_project_id;
  
  -- Loop through phases in JSON
  FOR phase_record IN SELECT * FROM jsonb_array_elements(project_phases)
  LOOP
    RAISE NOTICE 'Processing phase: %', phase_record->>'name';
    
    -- Loop through operations in this phase
    FOR operation_record IN SELECT * FROM jsonb_array_elements(phase_record->'operations')
    LOOP
      RAISE NOTICE 'Processing operation: %', operation_record->>'name';
      
      -- Find the matching template_operation by name
      SELECT t.id INTO found_operation_id
      FROM public.template_operations t
      WHERE t.project_id = tile_project_id
        AND t.name = operation_record->>'name'
      LIMIT 1;
      
      IF found_operation_id IS NULL THEN
        RAISE NOTICE 'Warning: Could not find operation: %', operation_record->>'name';
        CONTINUE;
      END IF;
      
      -- Loop through steps in this operation
      FOR step_record IN SELECT * FROM jsonb_array_elements(operation_record->'steps')
      LOOP
        RAISE NOTICE 'Processing step: %', step_record->>'step';
        
        -- Build content_sections from the step content
        new_content_sections := '[]'::jsonb;
        
        IF step_record->>'content' IS NOT NULL AND step_record->>'content' != '' THEN
          new_content_sections := jsonb_build_array(
            jsonb_build_object(
              'type', COALESCE(step_record->>'contentType', 'text'),
              'content', step_record->>'content'
            )
          );
        END IF;
        
        -- Find the matching template_step by step title
        SELECT s.id INTO found_step_id
        FROM public.template_steps s
        WHERE s.operation_id = found_operation_id
          AND s.step_title = step_record->>'step'
        LIMIT 1;
        
        IF found_step_id IS NULL THEN
          RAISE NOTICE 'Warning: Could not find step: %', step_record->>'step';
          CONTINUE;
        END IF;
        
        -- Update the template_step with content from JSON
        UPDATE public.template_steps st
        SET 
          content_sections = new_content_sections,
          materials = COALESCE(step_record->'materials', '[]'::jsonb),
          tools = COALESCE(step_record->'tools', '[]'::jsonb),
          outputs = COALESCE(step_record->'outputs', '[]'::jsonb),
          description = step_record->>'description',
          updated_at = now()
        WHERE st.id = found_step_id;
        
        RAISE NOTICE 'Updated step: % with content sections', step_record->>'step';
      END LOOP;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Content migration completed successfully';
END $$;
