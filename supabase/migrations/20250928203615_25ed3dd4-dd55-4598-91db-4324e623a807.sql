-- Fix Tile Flooring Installation project structure
-- 1. Delete revision 2 which has incomplete phases
DELETE FROM public.projects 
WHERE id = 'a1a2b3bf-2c49-4134-83ef-805de7f04b87';

-- 2. Make current revision 1 become the original (revision 0)
UPDATE public.projects 
SET revision_number = 0,
    parent_project_id = NULL
WHERE id = 'caa74687-63fc-4bd1-865b-032a043fdcdc';

-- 3. Fix the create_project_revision function to just copy phases exactly
CREATE OR REPLACE FUNCTION public.create_project_revision(source_project_id uuid, revision_notes_text text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  source_project public.projects%ROWTYPE;
  new_project_id uuid;
  max_revision_number integer;
  parent_id uuid;
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Get the source project
  SELECT * INTO source_project FROM public.projects WHERE id = source_project_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source project not found';
  END IF;
  
  -- Determine parent project ID - use the original project's ID
  IF source_project.parent_project_id IS NOT NULL THEN
    parent_id := source_project.parent_project_id;
  ELSE
    parent_id := source_project_id;
  END IF;
  
  -- Get max revision number for this project family
  SELECT COALESCE(MAX(revision_number), -1) + 1 INTO max_revision_number
  FROM public.projects 
  WHERE parent_project_id = parent_id OR id = parent_id;
  
  -- Create the new revision with EXACT copy of phases from source
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
    phases, -- EXACT COPY - no modification
    estimated_time_per_unit,
    parent_project_id,
    revision_number,
    revision_notes,
    created_by,
    created_from_revision,
    is_current_version
  ) VALUES (
    source_project.name,
    source_project.description,
    source_project.image,
    'not-started',
    'draft',
    source_project.category,
    source_project.difficulty,
    source_project.effort_level,
    source_project.estimated_time,
    source_project.scaling_unit,
    source_project.phases, -- EXACT COPY - no standard phases added
    source_project.estimated_time_per_unit,
    parent_id,
    max_revision_number,
    revision_notes_text,
    auth.uid(),
    source_project.revision_number,
    false
  ) RETURNING id INTO new_project_id;
  
  RETURN new_project_id;
END;
$function$;