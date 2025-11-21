-- Add CHECK constraints to ensure proper separation of skill levels
-- 1. User skill level (profiles.skill_level): 3 options from DIY profile
-- 2. Project skill level (projects.skill_level): 4 options
-- 3. Step skill level (template_steps.skill_level): 4 options (already has constraint)

-- 1. Add constraint to profiles.skill_level (User skill level - 3 options)
-- Values: 'newbie', 'confident', 'hero' (from DIY survey)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_skill_level_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_skill_level_check 
  CHECK (skill_level IS NULL OR skill_level IN ('newbie', 'confident', 'hero'));

COMMENT ON COLUMN public.profiles.skill_level IS 'User skill level from DIY profile: newbie (Beginner), confident (Intermediate), hero (Advanced). This is separate from project and step skill levels.';

-- 2. Add constraint to projects.skill_level (Project skill level - 4 options)
-- Values: 'Beginner', 'Intermediate', 'Advanced', 'Professional'
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_skill_level_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_skill_level_check 
  CHECK (skill_level IS NULL OR skill_level IN ('Beginner', 'Intermediate', 'Advanced', 'Professional'));

COMMENT ON COLUMN public.projects.skill_level IS 'Project overall skill level required: Beginner, Intermediate, Advanced, or Professional. This is separate from user skill level and step skill levels. Defaults to step skill levels when creating project runs.';

-- 3. Ensure template_steps.skill_level constraint is correct (Step skill level - 4 options)
-- This should already exist from previous migration, but ensure it's correct
ALTER TABLE public.template_steps
  DROP CONSTRAINT IF EXISTS template_steps_skill_level_check;

ALTER TABLE public.template_steps
  ADD CONSTRAINT template_steps_skill_level_check 
  CHECK (skill_level IS NULL OR skill_level IN ('Beginner', 'Intermediate', 'Advanced', 'Professional'));

COMMENT ON COLUMN public.template_steps.skill_level IS 'Skill level required for this specific step: Beginner, Intermediate, Advanced, or Professional. Defaults to project skill level when creating project runs if not set. This is separate from user skill level and project skill level.';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_skill_level ON public.profiles(skill_level)
  WHERE skill_level IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_skill_level ON public.projects(skill_level)
  WHERE skill_level IS NOT NULL;

