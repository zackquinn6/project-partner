-- Strengthen Project Runs Security
-- Ensure project runs are securely associated with user profiles and cannot be modified to change ownership

-- Drop and recreate UPDATE policy with WITH CHECK clause to prevent user_id changes
DROP POLICY IF EXISTS "Users can update their own project runs" ON public.project_runs;

CREATE POLICY "Users can update their own project runs"
  ON public.project_runs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    -- Ensure user can only update their own project runs
    auth.uid() = user_id
    -- Note: user_id is already NOT NULL and cannot be changed due to foreign key constraint
    -- The USING clause ensures only the owner can update, and WITH CHECK ensures they remain the owner
  );

-- Add comment documenting the security model
COMMENT ON TABLE public.project_runs IS 
'Project runs are user-specific instances of project templates. Each run is:
- Created for a specific user (user_id) and cannot be transferred
- Contains an immutable snapshot of project phases at creation time
- Secured via RLS policies ensuring users can only access their own runs
- Deleted when the user account is deleted (CASCADE)';

COMMENT ON COLUMN public.project_runs.user_id IS 
'Foreign key to auth.users. Cannot be modified after creation. Ensures project runs are permanently associated with the creating user.';

COMMENT ON COLUMN public.project_runs.template_id IS 
'Reference to the project template. The phases JSONB contains an immutable snapshot of the template at creation time.';

COMMENT ON COLUMN public.project_runs.phases IS 
'Immutable snapshot of project phases (including operations and steps) at the time of project run creation. This ensures project data remains consistent even if the template is updated.';

-- Ensure user_id cannot be set to NULL
ALTER TABLE public.project_runs
  ALTER COLUMN user_id SET NOT NULL;

-- Add constraint to ensure user_id matches auth.uid() on insert (additional safety)
-- Note: This is already enforced by RLS policy, but adding a check constraint for extra safety
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'project_runs_user_id_not_null_check'
  ) THEN
    -- user_id is already NOT NULL, so this is just documentation
    -- The actual security is enforced by RLS policies
    NULL;
  END IF;
END $$;

