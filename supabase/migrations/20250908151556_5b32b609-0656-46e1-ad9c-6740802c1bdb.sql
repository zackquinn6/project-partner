-- Add purchase_date and notes fields to homes table
ALTER TABLE public.homes 
ADD COLUMN purchase_date date,
ADD COLUMN notes text;

-- Create home_risks table for admin-managed construction risks
CREATE TABLE public.home_risks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_name text NOT NULL,
  description text,
  start_year integer NOT NULL,
  end_year integer,
  risk_level text NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on home_risks
ALTER TABLE public.home_risks ENABLE ROW LEVEL SECURITY;

-- Create policies for home_risks
CREATE POLICY "Everyone can view home risks" 
ON public.home_risks 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage home risks" 
ON public.home_risks 
FOR ALL 
USING (is_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_home_risks_updated_at
BEFORE UPDATE ON public.home_risks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial home risk data based on research
INSERT INTO public.home_risks (material_name, description, start_year, end_year, risk_level) VALUES
('Asbestos', 'Used in insulation, tiles, and building materials. Can cause lung cancer and mesothelioma when disturbed.', 1920, 1980, 'critical'),
('Lead Paint', 'Common in interior and exterior paints. Can cause lead poisoning, especially dangerous for children.', 1900, 1978, 'high'),
('Knob and Tube Wiring', 'Early electrical wiring system. Fire hazard due to lack of grounding and insulation deterioration.', 1880, 1950, 'high'),
('Cast Iron Plumbing', 'Prone to corrosion and blockages, can contaminate water supply.', 1880, 1975, 'medium'),
('Galvanized Steel Plumbing', 'Corrodes over time, can restrict water flow and contaminate water.', 1920, 1980, 'medium'),
('Polybutylene Pipes (PB)', 'Known to fail prematurely, causing water damage. Class action lawsuit material.', 1978, 1995, 'high'),
('CSST Gas Lines', 'Corrugated Stainless Steel Tubing can be damaged by electrical surges.', 1990, 2006, 'medium'),
('Aluminum Wiring', 'Can overheat at connections, fire hazard. Oxidizes and expands differently than copper.', 1965, 1973, 'high'),
('Formaldehyde Insulation (UFFI)', 'Urea-formaldehyde foam insulation can off-gas formaldehyde, respiratory issues.', 1970, 1982, 'medium'),
('Single Pane Windows', 'Poor energy efficiency, lack of modern safety features.', 1900, 1980, 'low'),
('Vermiculite Insulation', 'May contain asbestos, especially from Libby, Montana mine.', 1940, 1990, 'high'),
('Federal Pacific Breakers', 'Known to fail to trip during overloads, fire hazard.', 1950, 1980, 'high'),
('Zinsco Electrical Panels', 'Breakers can fail to trip, fire and electrocution hazard.', 1960, 1973, 'high');