-- =====================================================
-- CREATE APP_OVERRIDES TABLE
-- Stores custom app name, description, and icon overrides
-- =====================================================

CREATE TABLE IF NOT EXISTS public.app_overrides (
  app_id TEXT PRIMARY KEY,
  app_name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'Sparkles',
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.app_overrides IS 'Stores custom overrides for app names, descriptions, and icons that can be customized by admins.';
COMMENT ON COLUMN public.app_overrides.app_id IS 'Unique identifier for the app (e.g., "task-manager", "project-catalog").';
COMMENT ON COLUMN public.app_overrides.app_name IS 'Custom display name for the app.';
COMMENT ON COLUMN public.app_overrides.description IS 'Custom description for the app.';
COMMENT ON COLUMN public.app_overrides.icon IS 'Icon name for the app (e.g., "Sparkles", "ListChecks").';
COMMENT ON COLUMN public.app_overrides.display_order IS 'Order in which the app should be displayed.';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_overrides_display_order ON public.app_overrides (display_order);

-- Enable RLS
ALTER TABLE public.app_overrides ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow all authenticated users to read app overrides
CREATE POLICY "Allow authenticated users to read app overrides"
  ON public.app_overrides
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to insert/update/delete app overrides
CREATE POLICY "Allow admins to manage app overrides"
  ON public.app_overrides
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_app_overrides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_app_overrides_updated_at
  BEFORE UPDATE ON public.app_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_app_overrides_updated_at();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Created app_overrides table with RLS policies';
END $$;

