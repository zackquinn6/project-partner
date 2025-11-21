-- Add skill_level column to template_steps table
-- Skill levels: Beginner, Intermediate, Advanced, Professional
-- Defaults to NULL (will be set from project skill level when creating project runs)

ALTER TABLE public.template_steps
  ADD COLUMN IF NOT EXISTS skill_level TEXT CHECK (skill_level IN ('Beginner', 'Intermediate', 'Advanced', 'Professional'));

-- Add comment for documentation
COMMENT ON COLUMN public.template_steps.skill_level IS 'Skill level required for this step: Beginner, Intermediate, Advanced, or Professional. Defaults to project skill level when creating project runs.';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_template_steps_skill_level ON public.template_steps(skill_level)
  WHERE skill_level IS NOT NULL;

