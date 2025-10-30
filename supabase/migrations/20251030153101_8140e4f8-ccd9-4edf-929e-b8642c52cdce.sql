-- Phase 1: Clean Slate - Delete all project and run data except standard template
-- Delete all project runs (cascades will handle related data)
DELETE FROM project_runs WHERE id IS NOT NULL;

-- Delete template steps for non-standard projects
DELETE FROM template_steps 
WHERE operation_id IN (
  SELECT id FROM template_operations 
  WHERE project_id != '00000000-0000-0000-0000-000000000001'
);

-- Delete template operations for non-standard projects
DELETE FROM template_operations 
WHERE project_id != '00000000-0000-0000-0000-000000000001';

-- Delete all non-standard projects
DELETE FROM projects 
WHERE id != '00000000-0000-0000-0000-000000000001';