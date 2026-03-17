-- Persist recurrence anchor date for maintenance planning/calendar
ALTER TABLE public.user_maintenance_tasks
ADD COLUMN IF NOT EXISTS recurrence_start_date DATE;

