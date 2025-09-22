-- Fix skill_level data for existing projects by setting appropriate defaults
UPDATE projects 
SET skill_level = 'Intermediate' 
WHERE skill_level IS NULL AND effort_level = 'High';

UPDATE projects 
SET skill_level = 'Beginner' 
WHERE skill_level IS NULL AND effort_level = 'Low';

UPDATE projects 
SET skill_level = 'Intermediate' 
WHERE skill_level IS NULL AND effort_level = 'Medium';

UPDATE projects 
SET skill_level = 'Beginner' 
WHERE skill_level IS NULL;