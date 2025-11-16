-- DIRECT FIX: Update all project runs that have phases with empty operations
-- More aggressive - will update any run where at least one phase has empty operations array

DO $$
DECLARE
  run_record RECORD;
  fixed_count INTEGER := 0;
BEGIN
  -- Loop through all project runs with template_id
  FOR run_record IN 
    SELECT id, template_id, name, phases
    FROM public.project_runs
    WHERE template_id IS NOT NULL
  LOOP
    -- Check if this run has phases with empty operations
    IF EXISTS (
      SELECT 1 
      FROM jsonb_array_elements(run_record.phases) AS phase
      WHERE 
        (phase ? 'operations' AND jsonb_array_length(phase->'operations') = 0)
        OR phase->>'operations' = '[]'
    ) THEN
      -- Regenerate phases from template
      UPDATE public.project_runs
      SET phases = public.rebuild_phases_json_from_project_phases(run_record.template_id),
          updated_at = now()
      WHERE id = run_record.id;
      
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'Fixed project run: % (%)', run_record.name, run_record.id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Fixed % project runs total', fixed_count;
END $$;

