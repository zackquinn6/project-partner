-- Recreate revision 1 with proper phases copied from the original (revision 0)
INSERT INTO public.projects (
  name,
  description,
  image,
  status,
  publish_status,
  category,
  difficulty,
  effort_level,
  estimated_time,
  scaling_unit,
  phases,
  estimated_time_per_unit,
  parent_project_id,
  revision_number,
  revision_notes,
  created_by,
  created_from_revision,
  is_current_version
)
SELECT 
  name,
  description,
  image,
  'not-started'::text,
  'draft'::text,
  category,
  difficulty,
  effort_level,
  estimated_time,
  scaling_unit,
  phases, -- Copy phases exactly from the original
  estimated_time_per_unit,
  id as parent_project_id, -- Use original project as parent
  1 as revision_number, -- This will be revision 1
  'Recreated with proper phases copied from original'::text,
  created_by, -- Use same creator as original
  0 as created_from_revision,
  false as is_current_version
FROM public.projects
WHERE id = 'caa74687-63fc-4bd1-865b-032a043fdcdc';