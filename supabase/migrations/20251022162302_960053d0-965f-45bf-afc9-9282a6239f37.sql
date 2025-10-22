-- Add skill_level to home_tasks
ALTER TABLE home_tasks 
ADD COLUMN skill_level text CHECK (skill_level IN ('low', 'medium', 'high')) DEFAULT 'medium';

-- Create home_task_subtasks table
CREATE TABLE home_task_subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES home_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  estimated_hours numeric NOT NULL DEFAULT 1,
  skill_level text NOT NULL CHECK (skill_level IN ('low', 'medium', 'high')) DEFAULT 'medium',
  order_index integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create home_task_people table
CREATE TABLE home_task_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  home_id uuid REFERENCES homes(id) ON DELETE CASCADE,
  name text NOT NULL,
  available_hours numeric NOT NULL DEFAULT 8,
  available_days text[] NOT NULL DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  consecutive_days integer NOT NULL DEFAULT 1,
  skill_level text NOT NULL CHECK (skill_level IN ('low', 'medium', 'high')) DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create home_task_assignments table
CREATE TABLE home_task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES home_tasks(id) ON DELETE CASCADE,
  subtask_id uuid REFERENCES home_task_subtasks(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES home_task_people(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  scheduled_date date NOT NULL,
  scheduled_hours numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE home_task_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_task_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_task_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for home_task_subtasks
CREATE POLICY "Users can manage their own subtasks"
  ON home_task_subtasks
  FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for home_task_people
CREATE POLICY "Users can manage their own people"
  ON home_task_people
  FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for home_task_assignments
CREATE POLICY "Users can manage their own assignments"
  ON home_task_assignments
  FOR ALL
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_subtasks_task_id ON home_task_subtasks(task_id);
CREATE INDEX idx_subtasks_user_id ON home_task_subtasks(user_id);
CREATE INDEX idx_people_user_id ON home_task_people(user_id);
CREATE INDEX idx_people_home_id ON home_task_people(home_id);
CREATE INDEX idx_assignments_task_id ON home_task_assignments(task_id);
CREATE INDEX idx_assignments_person_id ON home_task_assignments(person_id);
CREATE INDEX idx_assignments_scheduled_date ON home_task_assignments(scheduled_date);