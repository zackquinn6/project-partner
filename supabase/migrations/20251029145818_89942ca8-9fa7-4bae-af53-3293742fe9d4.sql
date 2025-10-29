-- First, add the missing estimated_time_minutes column to template_steps
ALTER TABLE template_steps 
ADD COLUMN IF NOT EXISTS estimated_time_minutes INTEGER DEFAULT 0;

-- Now remove Service Terms operation from Kickoff phase
DELETE FROM template_operations 
WHERE name = 'Service Terms' 
AND project_id = '00000000-0000-0000-0000-000000000001';