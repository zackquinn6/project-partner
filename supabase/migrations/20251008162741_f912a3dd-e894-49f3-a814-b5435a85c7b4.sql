
-- Delete all steps associated with the Shopping Checklist operation
DELETE FROM template_steps 
WHERE operation_id = 'c309c8b3-efa3-42a3-afa6-832a006596b9';

-- Delete the Shopping Checklist operation from the Ordering phase
DELETE FROM template_operations 
WHERE id = 'c309c8b3-efa3-42a3-afa6-832a006596b9'
  AND name = 'Shopping Checklist'
  AND project_id = '00000000-0000-0000-0000-000000000001';
