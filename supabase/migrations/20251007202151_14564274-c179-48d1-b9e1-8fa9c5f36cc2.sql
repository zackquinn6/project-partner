
-- Copy phases from Tile Flooring Installation (revision 0) to Standard Project Foundation
UPDATE public.projects
SET phases = (
  SELECT phases 
  FROM public.projects 
  WHERE name = 'Tile Flooring Installation' AND revision_number = 0
  LIMIT 1
),
updated_at = now()
WHERE id = '00000000-0000-0000-0000-000000000001';
