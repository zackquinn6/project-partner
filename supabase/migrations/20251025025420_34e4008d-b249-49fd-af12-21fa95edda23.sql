-- Fix home_task_subtasks diy_level constraint and default
-- The default was 'medium' but constraint only allowed 'beginner', 'intermediate', 'pro'

-- Drop the existing check constraint
ALTER TABLE home_task_subtasks 
DROP CONSTRAINT IF EXISTS home_task_subtasks_diy_level_check;

-- Add the correct check constraint
ALTER TABLE home_task_subtasks 
ADD CONSTRAINT home_task_subtasks_diy_level_check 
CHECK (diy_level = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'pro'::text]));

-- Update the default value to match the constraint
ALTER TABLE home_task_subtasks 
ALTER COLUMN diy_level SET DEFAULT 'intermediate'::text;

-- Update any existing rows with invalid diy_level values
UPDATE home_task_subtasks 
SET diy_level = 'intermediate' 
WHERE diy_level NOT IN ('beginner', 'intermediate', 'pro');

-- Also fix home_task_people table if it has the same issue
ALTER TABLE home_task_people 
DROP CONSTRAINT IF EXISTS home_task_people_diy_level_check;

ALTER TABLE home_task_people 
ADD CONSTRAINT home_task_people_diy_level_check 
CHECK (diy_level = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'pro'::text]));

ALTER TABLE home_task_people 
ALTER COLUMN diy_level SET DEFAULT 'intermediate'::text;

UPDATE home_task_people 
SET diy_level = 'intermediate' 
WHERE diy_level NOT IN ('beginner', 'intermediate', 'pro');