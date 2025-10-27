-- Add email and phone to home_task_people table
ALTER TABLE home_task_people
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS phone text;