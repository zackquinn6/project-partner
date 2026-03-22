-- Per–project-template skill tier for each user (separate from user_profiles.skill_level).
-- Absence of a row means the application should treat the user as "beginner" for that project type.

CREATE TABLE IF NOT EXISTS public.user_project_skill_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  skill_level text NOT NULL DEFAULT 'beginner',
  CONSTRAINT user_project_skill_levels_skill_level_check CHECK (
    skill_level IN ('beginner', 'intermediate', 'advanced')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_project_skill_levels_user_project_unique UNIQUE (user_id, project_id)
);

CREATE INDEX IF NOT EXISTS user_project_skill_levels_user_id_idx
  ON public.user_project_skill_levels (user_id);

CREATE INDEX IF NOT EXISTS user_project_skill_levels_project_id_idx
  ON public.user_project_skill_levels (project_id);

CREATE OR REPLACE FUNCTION public.user_project_skill_levels_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_project_skill_levels_set_updated_at ON public.user_project_skill_levels;
CREATE TRIGGER user_project_skill_levels_set_updated_at
  BEFORE UPDATE ON public.user_project_skill_levels
  FOR EACH ROW
  EXECUTE PROCEDURE public.user_project_skill_levels_set_updated_at();

ALTER TABLE public.user_project_skill_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_project_skill_levels_select_own"
  ON public.user_project_skill_levels
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_project_skill_levels_insert_own"
  ON public.user_project_skill_levels
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_project_skill_levels_update_own"
  ON public.user_project_skill_levels
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_project_skill_levels_delete_own"
  ON public.user_project_skill_levels
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.user_project_skill_levels IS
  'User-declared skill tier (beginner/intermediate/advanced) per catalog project template; optional row per (user, project). Missing row = beginner in app logic.';
