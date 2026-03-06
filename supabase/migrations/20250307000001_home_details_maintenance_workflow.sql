-- Add columns to home_details for maintenance plan workflow.
-- heating_cooling_systems and appliances_systems are JSONB arrays of strings.
-- Other fields are single-value text for dropdown/free-text.

ALTER TABLE public.home_details
  ADD COLUMN IF NOT EXISTS heating_cooling_systems jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.home_details
  ADD COLUMN IF NOT EXISTS hot_water_system text;

ALTER TABLE public.home_details
  ADD COLUMN IF NOT EXISTS zip text;

ALTER TABLE public.home_details
  ADD COLUMN IF NOT EXISTS climate_region text;

ALTER TABLE public.home_details
  ADD COLUMN IF NOT EXISTS home_type text;

ALTER TABLE public.home_details
  ADD COLUMN IF NOT EXISTS home_age text;

ALTER TABLE public.home_details
  ADD COLUMN IF NOT EXISTS foundation_type text;

ALTER TABLE public.home_details
  ADD COLUMN IF NOT EXISTS exterior_type text;

ALTER TABLE public.home_details
  ADD COLUMN IF NOT EXISTS roof_type text;

ALTER TABLE public.home_details
  ADD COLUMN IF NOT EXISTS appliances_systems jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.home_details.heating_cooling_systems IS 'Array of selected heating/cooling system labels (e.g. oil furnace, heat pump).';
COMMENT ON COLUMN public.home_details.hot_water_system IS 'Selected hot water system (e.g. tank water heater, tankless).';
COMMENT ON COLUMN public.home_details.zip IS 'ZIP code for climate region.';
COMMENT ON COLUMN public.home_details.climate_region IS 'Derived climate region from ZIP.';
COMMENT ON COLUMN public.home_details.appliances_systems IS 'Array of selected appliances/systems (e.g. sump pump, septic).';
