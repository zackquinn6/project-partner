
-- Fix: Sync apps from Standard Project Foundation phases JSON to template_steps
-- The phases column is JSONB containing a string, so extract string first then parse

DO $$
DECLARE
  step_record RECORD;
  phases_string text;
  phases_array jsonb;
BEGIN
  -- Extract the JSON string from the JSONB column
  SELECT phases#>>'{}' INTO phases_string
  FROM projects
  WHERE id = '00000000-0000-0000-0000-000000000001';
  
  -- Parse the string to proper JSONB
  phases_array := phases_string::jsonb;
  
  -- Now loop through the parsed structure
  FOR step_record IN
    SELECT 
      step_data->>'id' as step_id,
      step_data->>'step' as step_name,
      COALESCE(step_data->'apps', '[]'::jsonb) as apps
    FROM jsonb_array_elements(phases_array) as phase
    CROSS JOIN LATERAL jsonb_array_elements(phase->'operations') as operation  
    CROSS JOIN LATERAL jsonb_array_elements(operation->'steps') as step_data
    WHERE jsonb_array_length(COALESCE(step_data->'apps', '[]'::jsonb)) > 0
  LOOP
    -- Update the corresponding template_steps row
    UPDATE template_steps
    SET apps = step_record.apps,
        updated_at = now()
    WHERE id = step_record.step_id::uuid;
    
    RAISE NOTICE 'Synced % apps to step: %', 
      jsonb_array_length(step_record.apps), 
      step_record.step_name;
  END LOOP;
  
  RAISE NOTICE 'Apps sync complete!';
END $$;

-- Verify the sync
SELECT 
  ts.step_title,
  jsonb_array_length(COALESCE(ts.apps, '[]'::jsonb)) as apps_count,
  ts.apps->0->>'appName' as first_app_name
FROM template_steps ts
JOIN template_operations top ON top.id = ts.operation_id
WHERE top.project_id = '00000000-0000-0000-0000-000000000001'
  AND jsonb_array_length(COALESCE(ts.apps, '[]'::jsonb)) > 0
ORDER BY ts.display_order;
