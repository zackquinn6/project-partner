-- Delete Tile Flooring revisions 2, 3, 4, and 5 and all associated content

-- Delete template_steps for these project revisions
DELETE FROM template_steps 
WHERE operation_id IN (
  SELECT id FROM template_operations 
  WHERE project_id IN (
    '8b3d7d71-bc6c-4e8d-ac52-958cd852eeec',
    '65931794-27fc-4a37-b4c8-f4a0514c3537',
    '818c962a-4670-49b7-8b78-5d000378c288',
    '82ad2d43-5413-4b09-a6b7-be35e6f107f6'
  )
);

-- Delete template_operations for these project revisions
DELETE FROM template_operations 
WHERE project_id IN (
  '8b3d7d71-bc6c-4e8d-ac52-958cd852eeec',
  '65931794-27fc-4a37-b4c8-f4a0514c3537',
  '818c962a-4670-49b7-8b78-5d000378c288',
  '82ad2d43-5413-4b09-a6b7-be35e6f107f6'
);

-- Delete the project revisions themselves
DELETE FROM projects 
WHERE id IN (
  '8b3d7d71-bc6c-4e8d-ac52-958cd852eeec',
  '65931794-27fc-4a37-b4c8-f4a0514c3537',
  '818c962a-4670-49b7-8b78-5d000378c288',
  '82ad2d43-5413-4b09-a6b7-be35e6f107f6'
);