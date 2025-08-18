-- Delete all project runs first (in case there are any foreign key relationships)
DELETE FROM project_runs;

-- Delete all projects
DELETE FROM projects;

-- Reset any sequences if needed (this ensures clean ID generation for new projects)
-- Note: Since we're using UUIDs, no sequence reset is needed