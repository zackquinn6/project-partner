-- Add task_id to project_plans table to link assessments to tasks
ALTER TABLE project_plans 
ADD COLUMN task_id uuid REFERENCES home_tasks(id) ON DELETE CASCADE;