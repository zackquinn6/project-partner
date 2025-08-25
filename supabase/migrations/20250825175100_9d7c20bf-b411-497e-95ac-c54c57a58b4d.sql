-- Fix function security by setting search_path
CREATE OR REPLACE FUNCTION increment_project_revision()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- If this is a new revision of an existing project
  IF NEW.parent_project_id IS NOT NULL THEN
    -- Get the max revision number for this project family
    SELECT COALESCE(MAX(revision_number), 0) + 1
    INTO NEW.revision_number
    FROM public.projects 
    WHERE parent_project_id = NEW.parent_project_id 
       OR id = NEW.parent_project_id;
  END IF;
  
  RETURN NEW;
END;
$$;