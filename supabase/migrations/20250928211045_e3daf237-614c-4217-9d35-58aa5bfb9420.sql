-- Fix the nested phase structure - extract phases from nested arrays
-- The original phases are nested inside sub-arrays, need to flatten them

UPDATE public.projects 
SET phases = (
  SELECT jsonb_build_array(
    (phases->0->0), -- Extract Kickoff from nested array
    (phases->1->0), -- Extract Planning from nested array  
    (phases->2),    -- Ordering is already correct
    (phases->3->0), -- Extract Prep from nested array
    (phases->4->0), -- Extract Install from nested array
    (phases->5->0)  -- Extract Close Project from nested array
  )
)
WHERE name = 'Tile Flooring Installation';