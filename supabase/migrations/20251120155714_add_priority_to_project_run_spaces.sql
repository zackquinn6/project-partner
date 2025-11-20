-- Add priority column to project_run_spaces table
-- Priority is unique to each project run and determines the order spaces should be completed
-- Lower numbers = higher priority (1 is highest priority)

ALTER TABLE public.project_run_spaces
ADD COLUMN IF NOT EXISTS priority INTEGER;

-- Create index for efficient sorting by priority
CREATE INDEX IF NOT EXISTS idx_project_run_spaces_priority 
ON public.project_run_spaces(project_run_id, priority);

-- Set default priority for existing spaces based on creation order
-- This ensures existing projects have a valid priority order
DO $$
DECLARE
  run_record RECORD;
  space_record RECORD;
  priority_counter INTEGER;
BEGIN
  -- Loop through each project run
  FOR run_record IN SELECT DISTINCT project_run_id FROM public.project_run_spaces WHERE priority IS NULL
  LOOP
    priority_counter := 1;
    
    -- Set priority for each space in creation order
    FOR space_record IN 
      SELECT id 
      FROM public.project_run_spaces 
      WHERE project_run_id = run_record.project_run_id 
        AND priority IS NULL
      ORDER BY created_at ASC
    LOOP
      UPDATE public.project_run_spaces
      SET priority = priority_counter
      WHERE id = space_record.id;
      
      priority_counter := priority_counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- Add comment to explain the column
COMMENT ON COLUMN public.project_run_spaces.priority IS 
'Priority order for spaces within a project run. Lower numbers indicate higher priority. Priority 1 spaces are completed first. This is unique to the project run and does not affect home spaces.';

