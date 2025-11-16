-- FORCE FIX: Regenerate phases for ALL project runs from their templates
-- This ensures all runs have complete phase/operation/step structure

-- First, update runs that have empty operations
UPDATE public.project_runs pr
SET phases = public.rebuild_phases_json_from_project_phases(pr.template_id),
    updated_at = now()
WHERE 
  pr.template_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.projects WHERE id = pr.template_id
  )
  AND (
    -- Check if any phase has empty operations array
    EXISTS (
      SELECT 1 
      FROM jsonb_array_elements(pr.phases) AS phase_elem
      WHERE 
        (phase_elem ? 'operations' AND jsonb_array_length(phase_elem->'operations') = 0)
        OR NOT (phase_elem ? 'operations')
        OR phase_elem->>'operations' = '[]'
    )
    OR pr.phases IS NULL
    OR pr.phases = '[]'::jsonb
  );

-- Log how many rows were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Get the count from the last UPDATE statement
  SELECT COUNT(*) INTO updated_count
  FROM public.project_runs pr
  WHERE 
    pr.template_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.projects WHERE id = pr.template_id
    )
    AND (
      EXISTS (
        SELECT 1 
        FROM jsonb_array_elements(pr.phases) AS phase_elem
        WHERE 
          (phase_elem ? 'operations' AND jsonb_array_length(phase_elem->'operations') = 0)
          OR NOT (phase_elem ? 'operations')
          OR phase_elem->>'operations' = '[]'
      )
      OR pr.phases IS NULL
      OR pr.phases = '[]'::jsonb
    );
  
  RAISE NOTICE 'Found % project runs with empty operations to fix', updated_count;
END $$;

