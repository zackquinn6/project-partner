-- FORCE UPDATE: Regenerate phases for ALL project runs
-- Uses DO block to bypass any potential RLS issues

DO $$
DECLARE
  run_record RECORD;
  new_phases JSONB;
  updated_count INTEGER := 0;
  total_checked INTEGER := 0;
BEGIN
  -- Loop through all project runs with template_id
  FOR run_record IN 
    SELECT id, template_id, name
    FROM public.project_runs
    WHERE template_id IS NOT NULL
  LOOP
    total_checked := total_checked + 1;
    
    BEGIN
      -- Regenerate phases using the fixed function
      SELECT public.rebuild_phases_json_from_project_phases(run_record.template_id) INTO new_phases;
      
      -- Update regardless of what we got (the function should return valid phases)
      UPDATE public.project_runs
      SET phases = COALESCE(new_phases, '[]'::jsonb),
          updated_at = now()
      WHERE id = run_record.id;
      
      updated_count := updated_count + 1;
      RAISE NOTICE 'Updated project run: % (%), phases count: %', 
        run_record.name, 
        run_record.id, 
        CASE WHEN new_phases IS NOT NULL THEN jsonb_array_length(new_phases) ELSE 0 END;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error updating project run % (%): %', 
        run_record.name, 
        run_record.id, 
        SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Checked % project runs, updated %', total_checked, updated_count;
END $$;

