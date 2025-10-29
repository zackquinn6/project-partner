-- Create table for app settings including beta mode
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read settings (needed for beta banner)
CREATE POLICY "Anyone can read app settings"
ON public.app_settings
FOR SELECT
TO authenticated, anon
USING (true);

-- Only admins can update settings
CREATE POLICY "Only admins can update app settings"
ON public.app_settings
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Insert default beta mode setting
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES ('beta_mode', '{"enabled": false}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Helper function to check if beta mode is active
CREATE OR REPLACE FUNCTION public.is_beta_mode_active()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT (setting_value->>'enabled')::boolean 
     FROM public.app_settings 
     WHERE setting_key = 'beta_mode'),
    false
  );
$$;

COMMENT ON FUNCTION public.is_beta_mode_active() IS 
'Returns true if beta mode is currently enabled, false otherwise.';