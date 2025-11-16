-- Create app_overrides table to store dynamic app name/config overrides
-- This allows App Manager to update app names that propagate to all project templates

CREATE TABLE IF NOT EXISTS public.app_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id TEXT NOT NULL UNIQUE, -- e.g., "app-project-customizer" or actionKey like "project-customizer"
  app_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  display_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.app_overrides ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage app overrides"
  ON public.app_overrides FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Everyone can view app overrides"
  ON public.app_overrides FOR SELECT
  USING (true);

-- Index for fast lookups by app_id
CREATE INDEX IF NOT EXISTS idx_app_overrides_app_id ON public.app_overrides(app_id);

-- Trigger for updated_at
CREATE TRIGGER update_app_overrides_updated_at
  BEFORE UPDATE ON public.app_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.app_overrides IS 'Stores app name/config overrides that dynamically update all project templates';
COMMENT ON COLUMN public.app_overrides.app_id IS 'Matches app.id in template_steps.apps JSON or actionKey from appsRegistry';

