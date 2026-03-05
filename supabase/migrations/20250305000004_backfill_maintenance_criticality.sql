-- Backfill criticality for user_maintenance_tasks so filtering by high/low shows tasks.
-- Set any NULL criticality to 2 (Medium). New tasks from template/custom already set criticality in app.
UPDATE public.user_maintenance_tasks
SET criticality = 2
WHERE criticality IS NULL;
