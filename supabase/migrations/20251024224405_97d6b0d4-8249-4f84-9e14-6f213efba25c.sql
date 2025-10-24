-- Add hourly_rate column to home_task_people table
ALTER TABLE public.home_task_people 
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC DEFAULT 0;