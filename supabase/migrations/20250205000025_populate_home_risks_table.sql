-- =====================================================
-- CREATE AND POPULATE HOME RISKS TABLE
-- Comprehensive list of hazardous building materials
-- organized by era and risk level
-- =====================================================

-- Create home_risks table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.home_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_name TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'very_high')),
  start_year INTEGER NOT NULL,
  end_year INTEGER,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.home_risks ENABLE ROW LEVEL SECURITY;

-- Anyone can view home risks
DROP POLICY IF EXISTS "Anyone can view home risks" ON public.home_risks;
CREATE POLICY "Anyone can view home risks"
  ON public.home_risks FOR SELECT
  USING (true);

-- Only admins can modify home risks
DROP POLICY IF EXISTS "Admins can modify home risks" ON public.home_risks;
CREATE POLICY "Admins can modify home risks"
  ON public.home_risks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Clear any existing data (in case of re-run)
TRUNCATE TABLE public.home_risks CASCADE;

-- =====================================================
-- ASBESTOS-CONTAINING MATERIALS
-- =====================================================

INSERT INTO public.home_risks (material_name, risk_level, start_year, end_year, description, created_at, updated_at) VALUES
('Asbestos Insulation', 'very_high', 1930, 1980, 'Asbestos was widely used for pipe and duct insulation. When disturbed, it releases carcinogenic fibers. Most dangerous when friable (crumbly). Found in attics, basements, and around heating systems.', NOW(), NOW()),
('Asbestos Floor Tiles', 'high', 1920, 1986, 'Vinyl asbestos tiles (VAT) were common in kitchens, bathrooms, and basements. Risk is low if undisturbed, but becomes hazardous during removal or when tiles crack and deteriorate.', NOW(), NOW()),
('Asbestos Ceiling Tiles', 'high', 1950, 1980, 'Acoustic ceiling tiles often contained asbestos for fire resistance and soundproofing. Popcorn ceilings from this era frequently contain asbestos.', NOW(), NOW()),
('Asbestos Siding', 'medium', 1930, 1973, 'Cement asbestos siding was durable and fire-resistant. Risk is low when intact, but cutting, drilling, or power washing can release fibers.', NOW(), NOW()),
('Asbestos Roofing Shingles', 'medium', 1920, 1986, 'Asbestos cement roofing shingles were popular for durability. Hazardous when broken or during removal.', NOW(), NOW()),
('Asbestos Pipe Wrap', 'very_high', 1920, 1975, 'White or gray corrugated paper wrap around pipes and ducts. Highly friable and dangerous when disturbed.', NOW(), NOW());

-- =====================================================
-- LEAD-BASED MATERIALS
-- =====================================================

INSERT INTO public.home_risks (material_name, risk_level, start_year, end_year, description, created_at, updated_at) VALUES
('Lead Paint (Interior)', 'very_high', 1900, 1978, 'Lead paint was banned for residential use in 1978. Particularly dangerous in homes built before 1950 where lead content was highest. Creates toxic dust when deteriorating or during renovation.', NOW(), NOW()),
('Lead Paint (Exterior)', 'very_high', 1900, 1978, 'Exterior lead paint deteriorates from weather exposure, creating contaminated soil around the home. Particularly hazardous for children and pets.', NOW(), NOW()),
('Lead Pipes', 'high', 1900, 1986, 'Lead service lines and interior plumbing can leach lead into drinking water, especially in acidic water conditions. Most common in homes built before 1930.', NOW(), NOW()),
('Lead Solder in Plumbing', 'high', 1900, 1986, 'Lead solder was used to join copper pipes until banned in 1986. Can contaminate drinking water over time.', NOW(), NOW());

-- =====================================================
-- ELECTRICAL HAZARDS
-- =====================================================

INSERT INTO public.home_risks (material_name, risk_level, start_year, end_year, description, created_at, updated_at) VALUES
('Aluminum Wiring', 'very_high', 1965, 1973, 'Aluminum wiring was used during a copper shortage. Creates fire hazards due to thermal expansion/contraction and oxidation at connections. Estimated 450,000+ fires attributed to aluminum wiring.', NOW(), NOW()),
('Knob-and-Tube Wiring', 'very_high', 1880, 1940, 'Early electrical wiring system with exposed conductors. Fire hazard due to age, insulation breakdown, and incompatibility with modern loads. Often overloaded in older homes.', NOW(), NOW()),
('Federal Pacific Electric Panels', 'very_high', 1950, 1980, 'FPE Stab-Lok panels have high failure rates and may not trip during overloads, creating severe fire hazards. Recalled but many still in use.', NOW(), NOW()),
('Zinsco/GTE-Sylvania Panels', 'high', 1950, 1980, 'These electrical panels are known for breaker failures and overheating. Can fail to trip during shorts or overloads.', NOW(), NOW());

-- =====================================================
-- PLUMBING HAZARDS
-- =====================================================

INSERT INTO public.home_risks (material_name, risk_level, start_year, end_year, description, created_at, updated_at) VALUES
('Polybutylene Pipes (Quest/Qest)', 'very_high', 1978, 1995, 'Gray or blue plastic pipes prone to sudden failure and leaks. Degrades from chlorine in water. Subject to class-action lawsuit. Replacement strongly recommended.', NOW(), NOW()),
('Galvanized Steel Pipes', 'high', 1900, 1960, 'Interior zinc coating corrodes over time, restricting water flow and contaminating water with rust and lead. Typical lifespan 40-50 years.', NOW(), NOW()),
('Cast Iron Drain Pipes', 'medium', 1900, 1975, 'Corrode from inside out, leading to leaks and sewage problems. Typical lifespan 50-70 years.', NOW(), NOW()),
('Orangeburg Sewer Pipe', 'high', 1945, 1972, 'Bituminous fiber pipe that deteriorates and collapses. Particularly vulnerable to tree roots. Common in post-WWII developments.', NOW(), NOW());

-- =====================================================
-- INSULATION & BUILDING MATERIALS
-- =====================================================

INSERT INTO public.home_risks (material_name, risk_level, start_year, end_year, description, created_at, updated_at) VALUES
('UFFI (Urea Formaldehyde Foam Insulation)', 'very_high', 1970, 1982, 'Releases formaldehyde gas causing respiratory issues, headaches, and potential cancer risk. Banned in 1982. Often found in wall cavities.', NOW(), NOW()),
('Vermiculite Insulation (Zonolite)', 'very_high', 1920, 1990, 'Often contaminated with asbestos from Libby, Montana mine. Found in attics as loose-fill insulation. DO NOT DISTURB - professional removal required.', NOW(), NOW()),
('Formaldehyde in Pressed Wood', 'medium', 1970, 1985, 'Particleboard, MDF, and plywood made with formaldehyde-based adhesives. Off-gasses formaldehyde, especially when new or humid.', NOW(), NOW());

-- =====================================================
-- ROOFING & STRUCTURAL
-- =====================================================

INSERT INTO public.home_risks (material_name, risk_level, start_year, end_year, description, created_at, updated_at) VALUES
('Transite Asbestos Cement', 'high', 1929, 1980, 'Used for roofing, siding, and pipes. Contains 12-50% asbestos. Brittle and releases fibers when broken. Common brand name: Transite.', NOW(), NOW()),
('Coal Tar Roofing', 'medium', 1900, 1970, 'Contains polycyclic aromatic hydrocarbons (PAHs) which are carcinogenic. Used for flat roofs and waterproofing.', NOW(), NOW());

-- =====================================================
-- FLOORING HAZARDS
-- =====================================================

INSERT INTO public.home_risks (material_name, risk_level, start_year, end_year, description, created_at, updated_at) VALUES
('Vinyl Asbestos Flooring', 'high', 1920, 1986, '9x9 inch tiles and sheet flooring often contained asbestos. Black mastic adhesive underneath also typically contains asbestos. Safe if intact.', NOW(), NOW()),
('Tar Paper Underlayment', 'low', 1900, 1990, 'Black felt paper under flooring may contain asbestos or coal tar. Low risk unless disturbed during demolition.', NOW(), NOW());

-- =====================================================
-- HVAC & MECHANICAL
-- =====================================================

INSERT INTO public.home_risks (material_name, risk_level, start_year, end_year, description, created_at, updated_at) VALUES
('Asbestos Duct Wrap', 'very_high', 1930, 1975, 'White or gray corrugated paper wrapped around heating/cooling ducts. Highly friable and dangerous when disturbed. Often found in basements and crawlspaces.', NOW(), NOW()),
('Asbestos Furnace Components', 'high', 1920, 1980, 'Furnace door gaskets, cement panels, and insulation often contained asbestos. Risk during furnace replacement or repair.', NOW(), NOW()),
('Mercury Thermostats', 'medium', 1950, 2006, 'Contain mercury switches. If broken, release toxic mercury vapor. Require special disposal.', NOW(), NOW());

-- =====================================================
-- WINDOW & DOOR MATERIALS
-- =====================================================

INSERT INTO public.home_risks (material_name, risk_level, start_year, end_year, description, created_at, updated_at) VALUES
('Lead-Painted Windows', 'very_high', 1900, 1978, 'Window frames painted with lead paint create toxic dust when opened/closed. Friction from window operation releases lead particles. Particularly dangerous for children.', NOW(), NOW()),
('Asbestos Window Caulk', 'medium', 1940, 1973, 'Putty and caulking around windows may contain asbestos. Risk when removing old windows.', NOW(), NOW());

-- =====================================================
-- ADDITIONAL HAZARDS
-- =====================================================

INSERT INTO public.home_risks (material_name, risk_level, start_year, end_year, description, created_at, updated_at) VALUES
('PCBs in Caulk and Sealants', 'high', 1950, 1979, 'Polychlorinated biphenyls (PCBs) were used in caulk and sealants. Carcinogenic and persistent environmental contaminant. Found in window glazing and expansion joints.', NOW(), NOW()),
('Radon from Concrete/Stone', 'high', 1900, NULL, 'Radon gas seeps from ground through foundation cracks. Carcinogenic. Not era-specific but more common in certain geology. Second leading cause of lung cancer. Test all homes.', NOW(), NOW()),
('Chinese Drywall', 'high', 2001, 2009, 'Defective drywall imported from China (2001-2009) releases sulfur gases, corroding metals and causing health issues. Distinct sulfur smell. Primarily in homes built/renovated 2004-2007.', NOW(), NOW()),
('Lead in Ceramic Tile Glaze', 'low', 1900, 1980, 'Decorative ceramic tiles may have lead-based glazes. Low risk unless damaged or in areas where children can access.', NOW(), NOW()),
('Chromated Copper Arsenate (CCA) Treated Wood', 'medium', 1940, 2003, 'Pressure-treated lumber containing arsenic. Used for decks, playsets, and outdoor structures. Banned for residential use in 2003. Arsenic can leach into soil.', NOW(), NOW());

-- =====================================================
-- SUMMARY & SUCCESS MESSAGE
-- =====================================================

DO $$
DECLARE
  v_risk_count INTEGER;
  v_very_high_count INTEGER;
  v_high_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_risk_count FROM public.home_risks;
  SELECT COUNT(*) INTO v_very_high_count FROM public.home_risks WHERE risk_level = 'very_high';
  SELECT COUNT(*) INTO v_high_count FROM public.home_risks WHERE risk_level = 'high';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ HOME RISKS DATABASE POPULATED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total risks: %', v_risk_count;
  RAISE NOTICE 'Very High risk: %', v_very_high_count;
  RAISE NOTICE 'High risk: %', v_high_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Categories covered:';
  RAISE NOTICE '  • Asbestos materials (9 types)';
  RAISE NOTICE '  • Lead-based materials (4 types)';
  RAISE NOTICE '  • Electrical hazards (4 types)';
  RAISE NOTICE '  • Plumbing hazards (4 types)';
  RAISE NOTICE '  • Insulation hazards (3 types)';
  RAISE NOTICE '  • Other building hazards (7 types)';
  RAISE NOTICE '';
  RAISE NOTICE 'Users can now identify risks based on their home''s build year.';
  RAISE NOTICE '========================================';
END $$;

