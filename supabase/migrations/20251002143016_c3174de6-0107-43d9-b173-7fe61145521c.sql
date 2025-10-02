
-- Convert template_steps descriptions to content_sections format
-- This properly migrates the existing step content into the structured format

DO $$
DECLARE
  step_record RECORD;
  new_content_sections JSONB;
BEGIN
  RAISE NOTICE 'Converting step descriptions to content_sections format';
  
  -- Loop through all steps that have descriptions but empty content_sections
  FOR step_record IN 
    SELECT ts.id, ts.step_title, ts.description
    FROM template_steps ts
    JOIN template_operations to2 ON ts.operation_id = to2.id
    JOIN projects p ON to2.project_id = p.id
    WHERE p.name = 'Tile Flooring Installation'
      AND ts.description IS NOT NULL 
      AND ts.description != ''
      AND (ts.content_sections IS NULL 
           OR ts.content_sections = '[]'::jsonb 
           OR jsonb_array_length(ts.content_sections) = 0)
  LOOP
    RAISE NOTICE 'Converting step: %', step_record.step_title;
    
    -- Create content_sections from description
    new_content_sections := jsonb_build_array(
      jsonb_build_object(
        'type', 'text',
        'content', step_record.description
      )
    );
    
    -- Update the step
    UPDATE template_steps
    SET 
      content_sections = new_content_sections,
      updated_at = now()
    WHERE id = step_record.id;
  END LOOP;
  
  RAISE NOTICE 'Description to content_sections conversion completed';
END $$;
