-- Add beta-testing status to projects publish_status
DO $$
BEGIN
  -- Check if the constraint exists and drop it if it does
  IF EXISTS (SELECT 1 FROM information_schema.check_constraints 
             WHERE constraint_name = 'projects_publish_status_check') THEN
    ALTER TABLE public.projects DROP CONSTRAINT projects_publish_status_check;
  END IF;
  
  -- Add the new constraint with beta-testing option
  ALTER TABLE public.projects 
  ADD CONSTRAINT projects_publish_status_check 
  CHECK (publish_status IN ('draft', 'published', 'beta-testing'));
END $$;