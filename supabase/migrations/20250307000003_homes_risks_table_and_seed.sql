-- Create homes_risks table (admin panel and home details use this name).
CREATE TABLE IF NOT EXISTS public.homes_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_name text NOT NULL,
  description text,
  start_year integer NOT NULL,
  end_year integer,
  risk_level text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_homes_risks_start_year ON public.homes_risks(start_year);
CREATE INDEX IF NOT EXISTS idx_homes_risks_end_year ON public.homes_risks(end_year);
CREATE INDEX IF NOT EXISTS idx_homes_risks_risk_level ON public.homes_risks(risk_level);

ALTER TABLE public.homes_risks ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (public risk catalog); only service role / admin can modify (handled by app as admin-only UI).
CREATE POLICY "Allow read homes_risks"
  ON public.homes_risks FOR SELECT
  USING (true);

CREATE POLICY "Allow insert for authenticated"
  ON public.homes_risks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update for authenticated"
  ON public.homes_risks FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete for authenticated"
  ON public.homes_risks FOR DELETE
  TO authenticated
  USING (true);

-- Seed home risks (by build year) for admin panel and user home risk display. Only if table is empty.
INSERT INTO public.homes_risks (material_name, description, start_year, end_year, risk_level)
SELECT v.material_name, v.description, v.start_year, v.end_year, v.risk_level
FROM (VALUES
  ('Lead paint (interior)'::text, 'Lead-based paint used on interior walls, trim, and surfaces. Health hazard especially for children.'::text, 1900, 1978, 'critical'::text),
  ('Lead paint (exterior)', 'Lead-based paint on exterior siding, trim, and windows.', 1900, 1978, 'critical'),
  ('Lead pipes', 'Lead water supply pipes. Can leach lead into drinking water.', 1900, 1986, 'high'),
  ('Lead solder in plumbing', 'Lead solder used in copper pipe joints.', 1900, 1986, 'high'),
  ('Asbestos insulation', 'Asbestos-containing insulation (e.g. vermiculite, pipe wrap). Do not disturb without professional abatement.', 1930, 1980, 'critical'),
  ('Asbestos floor tiles', 'Vinyl or asphalt tiles containing asbestos, especially 9x9 inch tiles.', 1920, 1986, 'high'),
  ('Asbestos ceiling tiles', 'Ceiling tiles containing asbestos.', 1950, 1980, 'high'),
  ('Asbestos siding', 'Asbestos-cement siding (e.g. transite).', 1930, 1973, 'medium'),
  ('Asbestos pipe wrap', 'Asbestos insulation on heating pipes and ducts.', 1920, 1975, 'critical'),
  ('Knob-and-tube wiring', 'Uninsulated, ungrounded wiring. Fire and shock risk; often undersized for modern loads.', 1880, 1940, 'critical'),
  ('Aluminum branch wiring', 'Aluminum branch circuit wiring; can overheat at connections and cause fire.', 1965, 1975, 'critical'),
  ('Federal Pacific panels', 'Federal Pacific Electric (FPE) panels may not trip on overload. Fire risk.', 1950, 1980, 'critical'),
  ('Zinsco / GTE-Sylvania panels', 'Zinsco or GTE-Sylvania panels with known failure and fire risks.', 1950, 1980, 'high'),
  ('Polybutylene pipes', 'Grey plastic plumbing pipes; prone to sudden failure and leaks.', 1978, 1995, 'critical'),
  ('Galvanized steel pipes', 'Galvanized steel water pipes; corrode over time, reducing pressure and water quality.', 1900, 1960, 'high'),
  ('Cast iron drain pipes', 'Cast iron drain pipes; can rust through and cause sewer issues.', 1900, 1975, 'medium'),
  ('Orangeburg sewer pipe', 'Bituminous fiber sewer pipe; collapses and fails over time.', 1945, 1972, 'high'),
  ('Vermiculite insulation (Zonolite)', 'Vermiculite insulation that may contain asbestos. Do not disturb.', 1920, 1990, 'critical'),
  ('UFFI (urea formaldehyde foam)', 'Urea formaldehyde foam insulation; off-gassing and health concerns.', 1970, 1982, 'critical'),
  ('Chinese drywall', 'Drywall imported 2001–2009; can emit sulfur compounds and corrode metals.', 2001, 2009, 'high'),
  ('Mercury thermostats', 'Thermostats containing mercury; handle as hazardous waste when replacing.', 1950, 2006, 'medium'),
  ('PCBs in caulk', 'Caulk containing PCBs in some buildings.', 1950, 1979, 'high'),
  ('Radon', 'Naturally occurring gas; test and mitigate if elevated.', 1900, NULL, 'high')
) AS v(material_name, description, start_year, end_year, risk_level)
WHERE NOT EXISTS (SELECT 1 FROM public.homes_risks LIMIT 1);

COMMENT ON TABLE public.homes_risks IS 'Catalog of home risks by build year; used in admin Home Risk Management and user home details.';
