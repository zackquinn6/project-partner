-- ONE-TIME FIX: Fix existing project runs that have phases with empty operations arrays
-- This regenerates phases from the template using the now-fixed function
-- This is a DATA FIX, not ongoing regeneration logic

-- Fix all project runs that have empty operations arrays
UPDATE public.project_runs pr
SET phases = public.rebuild_phases_json_from_project_phases(pr.template_id),
    updated_at = now()
WHERE 
  pr.template_id IS NOT NULL
  -- Only update if template still exists
  AND EXISTS (
    SELECT 1 FROM public.projects WHERE id = pr.template_id
  )
  -- Update runs that have at least one phase with empty operations
  AND (
    pr.phases IS NULL
    OR pr.phases = '[]'::jsonb
    OR EXISTS (
      SELECT 1 
      FROM jsonb_array_elements(pr.phases) AS phase
      WHERE 
        phase->>'operations' = '[]'::text
        OR (phase ? 'operations' AND jsonb_array_length(phase->'operations') = 0)
        OR NOT (phase ? 'operations')
    )
  );

