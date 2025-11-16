-- Update ALL project runs to regenerate phases with operations
-- SECURITY DEFINER to bypass RLS if needed
-- This ensures all runs have the correct structure with operations and steps

DO $$
DECLARE
  run_record RECORD;
  new_phases JSONB;
  updated_count INTEGER := 0;
BEGIN
  -- Loop through all project runs with template_id
  FOR run_record IN 
    SELECT id, template_id, name
    FROM public.project_runs
    WHERE template_id IS NOT NULL
  LOOP
    -- Regenerate phases using the fixed function
    BEGIN
      SELECT public.rebuild_phases_json_from_project_phases(run_record.template_id) INTO new_phases;
      
      -- Only update if we got phases back
      IF new_phases IS NOT NULL AND jsonb_array_length(new_phases) > 0 THEN
        UPDATE public.project_runs
        SET phases = new_phases,
            updated_at = now()
        WHERE id = run_record.id;
        
        updated_count := updated_count + 1;
        RAISE NOTICE 'Fixed project run: % (%), phases count: %', 
          run_record.name, 
          run_record.id, 
          jsonb_array_length(new_phases);
      ELSE
        RAISE NOTICE 'Skipped project run: % (%) - no phases generated', 
          run_record.name, 
          run_record.id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error fixing project run % (%): %', 
        run_record.name, 
        run_record.id, 
        SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Updated % project runs total', updated_count;
END $$;

