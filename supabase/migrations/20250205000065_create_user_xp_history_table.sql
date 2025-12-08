-- =====================================================
-- CREATE USER_XP_HISTORY TABLE
-- Stores XP (experience points) history for users
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_xp_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_run_id UUID REFERENCES public.project_runs(id) ON DELETE SET NULL,
  phase_name TEXT,
  xp_amount NUMERIC NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.user_xp_history IS 'Stores history of XP (experience points) earned by users for completing project steps, phases, and achievements.';
COMMENT ON COLUMN public.user_xp_history.user_id IS 'Foreign key to the user who earned the XP.';
COMMENT ON COLUMN public.user_xp_history.project_run_id IS 'Optional reference to the project run where XP was earned.';
COMMENT ON COLUMN public.user_xp_history.phase_name IS 'Optional name of the phase where XP was earned.';
COMMENT ON COLUMN public.user_xp_history.xp_amount IS 'Amount of XP earned (can be positive or negative).';
COMMENT ON COLUMN public.user_xp_history.reason IS 'Description of why the XP was awarded (e.g., "Completed step", "Finished phase").';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_xp_history_user_id ON public.user_xp_history (user_id);
CREATE INDEX IF NOT EXISTS idx_user_xp_history_project_run_id ON public.user_xp_history (project_run_id);
CREATE INDEX IF NOT EXISTS idx_user_xp_history_created_at ON public.user_xp_history (created_at DESC);

-- Enable RLS
ALTER TABLE public.user_xp_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only read their own XP history
CREATE POLICY "Users can read their own XP history"
  ON public.user_xp_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own XP history (system will insert on their behalf)
CREATE POLICY "Users can insert their own XP history"
  ON public.user_xp_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all XP history
CREATE POLICY "Admins can read all XP history"
  ON public.user_xp_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Created user_xp_history table with RLS policies';
END $$;

