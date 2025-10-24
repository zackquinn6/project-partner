-- Add foreign key constraints with CASCADE delete for decision tree data integrity
-- This ensures that when a project revision is deleted, all associated decision tree data is automatically removed

-- Add foreign key from template_operations to projects with CASCADE delete
-- This ensures template_operations are deleted when their parent project is deleted
DO $$ 
BEGIN
    -- Check if constraint doesn't already exist before adding
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'template_operations_project_id_fkey'
    ) THEN
        ALTER TABLE public.template_operations
        ADD CONSTRAINT template_operations_project_id_fkey
        FOREIGN KEY (project_id) 
        REFERENCES public.projects(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key from template_steps to template_operations with CASCADE delete
-- This ensures template_steps are deleted when their parent operation is deleted
DO $$ 
BEGIN
    -- Check if constraint doesn't already exist before adding
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'template_steps_operation_id_fkey'
    ) THEN
        ALTER TABLE public.template_steps
        ADD CONSTRAINT template_steps_operation_id_fkey
        FOREIGN KEY (operation_id) 
        REFERENCES public.template_operations(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Verify the constraints were added
COMMENT ON CONSTRAINT template_operations_project_id_fkey ON public.template_operations 
IS 'Ensures decision tree data is CASCADE deleted when project revision is deleted';

COMMENT ON CONSTRAINT template_steps_operation_id_fkey ON public.template_steps 
IS 'Ensures step data is CASCADE deleted when operation is deleted';