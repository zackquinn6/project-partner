-- Fix existing projects with null categories
UPDATE projects 
SET category = '{}' 
WHERE category IS NULL;

-- Ensure default value for future inserts
ALTER TABLE projects 
ALTER COLUMN category SET DEFAULT '{}';