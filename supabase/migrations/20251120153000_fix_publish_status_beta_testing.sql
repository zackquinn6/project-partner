-- Fix publish_status constraint to allow 'beta-testing' instead of 'beta'
-- The codebase consistently uses 'beta-testing' but the constraint was changed to 'beta'

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_publish_status_check;

ALTER TABLE public.projects 
ADD CONSTRAINT projects_publish_status_check 
CHECK (publish_status IN ('draft', 'beta-testing', 'published', 'archived'));

-- Also update the archive_previous_versions function to handle 'beta-testing'
CREATE OR REPLACE FUNCTION public.archive_previous_versions()
RETURNS TRIGGER AS $$
BEGIN
  -- If this project is being set to beta-testing or published, archive previous versions
  IF (NEW.publish_status IN ('beta-testing', 'published') AND 
      (OLD.publish_status IS NULL OR OLD.publish_status NOT IN ('beta-testing', 'published'))) THEN
    
    -- Mark this as the current version
    NEW.is_current_version = true;
    
    -- Set appropriate timestamp
    IF NEW.publish_status = 'beta-testing' THEN
      NEW.beta_released_at = now();
    ELSIF NEW.publish_status = 'published' THEN
      NEW.published_at = now();
    END IF;
    
    -- Archive all other versions of this project (same parent_project_id or same id if this is the parent)
    UPDATE public.projects 
    SET 
      publish_status = 'archived',
      archived_at = now(),
      is_current_version = false
    WHERE 
      id != NEW.id 
      AND (
        (NEW.parent_project_id IS NOT NULL AND (parent_project_id = NEW.parent_project_id OR id = NEW.parent_project_id))
        OR 
        (NEW.parent_project_id IS NULL AND (parent_project_id = NEW.id OR id = NEW.id))
      )
      AND publish_status != 'archived';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update RLS policy to handle 'beta-testing'
DROP POLICY IF EXISTS "Active projects are viewable by everyone" ON public.projects;
CREATE POLICY "Active projects are viewable by everyone" 
ON public.projects 
FOR SELECT 
USING (publish_status IN ('published', 'beta-testing'));

