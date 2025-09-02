-- Remove duplicate project using created_at timestamp
DELETE FROM public.projects 
WHERE name = 'Professional Tile Flooring Installation' 
AND created_at != (
  SELECT MAX(created_at) FROM public.projects 
  WHERE name = 'Professional Tile Flooring Installation'
);