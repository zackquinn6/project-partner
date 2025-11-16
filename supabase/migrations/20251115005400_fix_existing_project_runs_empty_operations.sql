-- ONE-TIME FIX: Fix existing project runs that have phases with empty operations arrays
-- This regenerates phases from the template using the now-fixed function
-- This is a DATA FIX, not ongoing regeneration logic

UPDATE public.project_runs pr
SET phases = public.rebuild_phases_json_from_project_phases(pr.template_id)
WHERE 
  -- Only update runs that have phases with empty operations arrays
  EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(pr.phases) AS phase
    WHERE 
      phase->>'operations' = '[]'::text
      OR jsonb_array_length(COALESCE(phase->'operations', '[]'::jsonb)) = 0
  )
  AND pr.template_id IS NOT NULL
  -- Only update if template still exists
  AND EXISTS (
    SELECT 1 FROM public.projects WHERE id = pr.template_id
  );

