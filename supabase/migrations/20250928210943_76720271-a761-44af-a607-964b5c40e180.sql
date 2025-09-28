-- Fix the Kickoff phase name that's missing
UPDATE public.projects 
SET phases = jsonb_set(
  phases, 
  '{0,name}', 
  '"Kickoff"'::jsonb
)
WHERE name = 'Tile Flooring Installation' 
AND (phases->0->>'name') IS NULL;