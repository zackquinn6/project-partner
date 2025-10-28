-- Create achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'foundational', 'frequency', 'scale', 'overlapping', 'skill', 'legacy'
  icon TEXT, -- lucide icon name
  points INTEGER DEFAULT 0,
  
  -- Criteria for unlocking
  criteria JSONB NOT NULL DEFAULT '{}',
  -- Example: {"project_count": 1, "category": "flooring"}
  
  CONSTRAINT achievements_name_unique UNIQUE (name)
);

-- Create user achievements table (tracks which achievements users have earned)
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  progress JSONB DEFAULT '{}', -- Track partial progress
  
  CONSTRAINT user_achievements_unique UNIQUE (user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for achievements
CREATE POLICY "Anyone can view achievements"
  ON public.achievements FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage achievements"
  ON public.achievements FOR ALL
  USING (is_admin(auth.uid()));

-- RLS Policies for user_achievements
CREATE POLICY "Users can view their own achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievement progress"
  ON public.user_achievements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement_id ON public.user_achievements(achievement_id);
CREATE INDEX idx_achievements_category ON public.achievements(category);

-- Insert foundational achievements
INSERT INTO public.achievements (name, description, category, icon, points, criteria) VALUES
  ('First Finish', 'Complete your very first project', 'foundational', 'Trophy', 10, '{"project_count": 1}'),
  ('Category Pioneer - Flooring', 'Complete your first flooring project', 'foundational', 'Home', 15, '{"category": "Flooring", "project_count": 1}'),
  ('Category Pioneer - Painting', 'Complete your first painting project', 'foundational', 'Paintbrush', 15, '{"category": "Painting", "project_count": 1}'),
  ('Category Pioneer - Plumbing', 'Complete your first plumbing project', 'foundational', 'Droplet', 15, '{"category": "Plumbing", "project_count": 1}'),
  ('Tool Break-In', 'Use a new tool for the first time in a project', 'foundational', 'Wrench', 5, '{"tool_usage": 1}'),
  
  ('Weekend Warrior', 'Complete 2 projects in one month', 'frequency', 'Zap', 20, '{"projects_in_month": 2}'),
  ('Steady Builder', 'Complete 4 projects in one year', 'frequency', 'Calendar', 30, '{"projects_in_year": 4}'),
  ('Momentum Maker', 'Complete projects in back-to-back weeks', 'frequency', 'TrendingUp', 25, '{"consecutive_weeks": 2}'),
  
  ('Small Wins', 'Complete a small project', 'scale', 'Star', 5, '{"difficulty": "Beginner"}'),
  ('Medium Moves', 'Complete a medium project', 'scale', 'Award', 15, '{"difficulty": "Intermediate"}'),
  ('Big Build', 'Complete a large project', 'scale', 'Medal', 30, '{"difficulty": "Advanced"}'),
  
  ('Workflow Weaver', 'Complete a large project with multiple sub-projects', 'overlapping', 'Network', 40, '{"nested_projects": 3}'),
  ('System Builder', 'Complete 3 interrelated projects in a single space', 'overlapping', 'Grid3x3', 35, '{"same_space_projects": 3}'),
  
  ('Repeat Performer', 'Complete the same type of project twice', 'skill', 'Repeat', 20, '{"category_repeat": 2}'),
  ('Category Climber', 'Complete 3 projects in the same category', 'skill', 'TrendingUp', 30, '{"category_depth": 3}'),
  ('Jack of All Trades', 'Complete projects in 5 different categories', 'skill', 'Layers', 50, '{"category_breadth": 5}'),
  
  ('Year of DIY', 'Complete 12 projects in a calendar year', 'legacy', 'Calendar', 100, '{"projects_in_year": 12}'),
  ('Home Transformer', 'Complete projects in every major room/area', 'legacy', 'Home', 75, '{"all_rooms": true}');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for achievements table
CREATE TRIGGER update_achievements_updated_at
  BEFORE UPDATE ON public.achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();