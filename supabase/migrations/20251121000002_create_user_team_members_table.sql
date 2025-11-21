-- Create user-level team members table
-- Team members are stored at user level for reuse across projects
-- Includes skill level (project skill levels) and effort level

CREATE TABLE IF NOT EXISTS public.user_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('owner', 'helper')) DEFAULT 'helper',
  skill_level TEXT NOT NULL CHECK (skill_level IN ('Beginner', 'Intermediate', 'Advanced', 'Professional')) DEFAULT 'Intermediate',
  effort_level TEXT NOT NULL CHECK (effort_level IN ('Low', 'Medium', 'High')) DEFAULT 'Medium',
  max_total_hours NUMERIC NOT NULL DEFAULT 80,
  weekends_only BOOLEAN NOT NULL DEFAULT false,
  weekdays_after_five_pm BOOLEAN NOT NULL DEFAULT false,
  working_hours_start TIME NOT NULL DEFAULT '09:00',
  working_hours_end TIME NOT NULL DEFAULT '17:00',
  cost_per_hour NUMERIC DEFAULT 0,
  email TEXT,
  phone TEXT,
  availability_mode TEXT NOT NULL CHECK (availability_mode IN ('general', 'specific')) DEFAULT 'general',
  availability_dates JSONB DEFAULT '{}'::jsonb, -- Specific date availability
  notification_preferences JSONB DEFAULT '{"email": false, "sms": false}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_team_members_user_id ON public.user_team_members(user_id);

-- Enable RLS
ALTER TABLE public.user_team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own team members"
  ON public.user_team_members FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own team members"
  ON public.user_team_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own team members"
  ON public.user_team_members FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own team members"
  ON public.user_team_members FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_user_team_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_team_members_updated_at
  BEFORE UPDATE ON public.user_team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_team_members_updated_at();

COMMENT ON TABLE public.user_team_members IS 'User-level team members that can be reused across projects. Includes skill level (project skill levels) and effort level settings.';

