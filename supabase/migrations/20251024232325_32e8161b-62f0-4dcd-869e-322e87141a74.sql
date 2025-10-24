-- Rename skill_level to diy_level and update values in home task tables

-- Update home_task_subtasks
ALTER TABLE home_task_subtasks 
DROP CONSTRAINT IF EXISTS home_task_subtasks_skill_level_check;

-- Update existing data
UPDATE home_task_subtasks SET skill_level = 'beginner' WHERE skill_level = 'low';
UPDATE home_task_subtasks SET skill_level = 'intermediate' WHERE skill_level = 'medium';
UPDATE home_task_subtasks SET skill_level = 'pro' WHERE skill_level = 'high';

-- Rename column and add new constraint
ALTER TABLE home_task_subtasks RENAME COLUMN skill_level TO diy_level;
ALTER TABLE home_task_subtasks ADD CONSTRAINT home_task_subtasks_diy_level_check 
  CHECK (diy_level IN ('beginner', 'intermediate', 'pro'));

-- Update home_task_people
ALTER TABLE home_task_people 
DROP CONSTRAINT IF EXISTS home_task_people_skill_level_check;

-- Update existing data
UPDATE home_task_people SET skill_level = 'beginner' WHERE skill_level = 'low';
UPDATE home_task_people SET skill_level = 'intermediate' WHERE skill_level = 'medium';
UPDATE home_task_people SET skill_level = 'pro' WHERE skill_level = 'high';

-- Rename column and add new constraint
ALTER TABLE home_task_people RENAME COLUMN skill_level TO diy_level;
ALTER TABLE home_task_people ADD CONSTRAINT home_task_people_diy_level_check 
  CHECK (diy_level IN ('beginner', 'intermediate', 'pro'));

-- Update home_tasks table as well
ALTER TABLE home_tasks 
DROP CONSTRAINT IF EXISTS home_tasks_skill_level_check;

-- Update existing data
UPDATE home_tasks SET skill_level = 'beginner' WHERE skill_level = 'low';
UPDATE home_tasks SET skill_level = 'intermediate' WHERE skill_level = 'medium';
UPDATE home_tasks SET skill_level = 'pro' WHERE skill_level = 'high';

-- Rename column and add new constraint
ALTER TABLE home_tasks RENAME COLUMN skill_level TO diy_level;
ALTER TABLE home_tasks ADD CONSTRAINT home_tasks_diy_level_check 
  CHECK (diy_level IN ('beginner', 'intermediate', 'pro'));