-- Update projects table to support enhanced revision control
ALTER TYPE public.publish_status_enum RENAME TO publish_status_enum_old;

-- Create new enum with all 4 status levels
CREATE TYPE public.publish_status_enum AS ENUM ('draft', 'beta', 'published', 'archived');

-- Update the projects table to use the new enum
ALTER TABLE public.projects 
ALTER COLUMN publish_status TYPE public.publish_status_enum 
USING publish_status::text::public.publish_status_enum;

-- Drop the old enum
DROP TYPE public.publish_status_enum_old;

-- Add new fields for enhanced revision control
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS published_at timestamp with time zone;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS beta_released_at timestamp with time zone;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS release_notes text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_current_version boolean DEFAULT false;

-- Create index for better performance when querying current versions
CREATE INDEX IF NOT EXISTS idx_projects_current_version ON public.projects(parent_project_id, is_current_version) WHERE is_current_version = true;

-- Function to archive previous versions when a new version is promoted
CREATE OR REPLACE FUNCTION public.archive_previous_versions()
RETURNS TRIGGER AS $$
BEGIN
  -- If this project is being set to beta or published, archive previous versions
  IF (NEW.publish_status IN ('beta', 'published') AND 
      (OLD.publish_status IS NULL OR OLD.publish_status NOT IN ('beta', 'published'))) THEN
    
    -- Mark this as the current version
    NEW.is_current_version = true;
    
    -- Set appropriate timestamp
    IF NEW.publish_status = 'beta' THEN
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

-- Create trigger for automatic archiving
DROP TRIGGER IF EXISTS trigger_archive_previous_versions ON public.projects;
CREATE TRIGGER trigger_archive_previous_versions
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_previous_versions();

-- Function to create a new draft revision
CREATE OR REPLACE FUNCTION public.create_project_revision(
  source_project_id uuid,
  revision_notes_text text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_project public.projects%ROWTYPE;
  new_project_id uuid;
  max_revision_number integer;
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
  
  -- Determine parent project ID and get max revision number
  IF source_project.parent_project_id IS NOT NULL THEN
    -- This is already a revision, use its parent
    SELECT COALESCE(MAX(revision_number), 0) + 1 INTO max_revision_number
    FROM public.projects 
    WHERE parent_project_id = source_project.parent_project_id OR id = source_project.parent_project_id;
  ELSE
    -- This is the original project, it becomes the parent
    SELECT COALESCE(MAX(revision_number), 0) + 1 INTO max_revision_number
    FROM public.projects 
    WHERE parent_project_id = source_project_id OR id = source_project_id;
  END IF;
  
  -- Create the new revision
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
  ) VALUES (
    source_project.name || ' (Rev ' || max_revision_number || ')',
    source_project.description,
    source_project.image,
    'not-started',
    'draft', -- Always start as draft
    source_project.category,
    source_project.difficulty,
    source_project.effort_level,
    source_project.estimated_time,
    source_project.scaling_unit,
    source_project.phases,
    source_project.estimated_time_per_unit,
    COALESCE(source_project.parent_project_id, source_project_id),
    max_revision_number,
    revision_notes_text,
    auth.uid(),
    source_project.revision_number,
    false -- Not current version until promoted
  ) RETURNING id INTO new_project_id;
  
  RETURN new_project_id;
END;
$$;

-- Update RLS policies to handle archived projects
-- Users should only see published projects, admins see all
DROP POLICY IF EXISTS "Published projects are viewable by everyone" ON public.projects;
CREATE POLICY "Active projects are viewable by everyone" 
ON public.projects 
FOR SELECT 
USING (publish_status IN ('published', 'beta'));

-- Add policy for admins to see drafts and archived projects
CREATE POLICY "Admins can view draft and archived projects" 
ON public.projects 
FOR SELECT 
USING (is_admin(auth.uid()) AND publish_status IN ('draft', 'archived'));