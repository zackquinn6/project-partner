-- Add missing time_tracking column to project_runs table
ALTER TABLE public.project_runs 
ADD COLUMN IF NOT EXISTS time_tracking JSONB DEFAULT NULL;

COMMENT ON COLUMN public.project_runs.time_tracking IS 'Tracks time spent on phases, operations, and steps';
