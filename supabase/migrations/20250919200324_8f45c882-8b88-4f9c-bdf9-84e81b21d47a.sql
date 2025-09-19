-- Update existing home risks with more comprehensive data and add new risks
-- Based on research from NCHH, Medium article, and other reliable sources

-- First, let's add some important missing risks that weren't in the database
INSERT INTO home_risks (material_name, description, start_year, end_year, risk_level, created_by) VALUES
-- PBDEs (Flame Retardants)
('PBDE Flame Retardants', 'Polybrominated diphenyl ethers used in foam insulation and building materials. Associated with liver toxicity, thyroid issues, and developmental neurotoxicity. Found in house dust.', 1970, 2004, 'high', NULL),

-- Chromated Copper Arsenic Wood
('CCA Pressure-Treated Wood', 'Contains chromated copper arsenate - a known carcinogen. Used in decks, playsets, and outdoor structures. Arsenic can leach from surface and into surrounding soil.', 1970, 2003, 'high', NULL),

-- Chinese Drywall (Sulfur-emitting)
('Chinese Drywall (Sulfur)', 'Defective drywall from China containing sulfur compounds. Causes corrosion of electrical systems, HVAC components, and health issues. Strong sulfur odor.', 2001, 2009, 'critical', NULL),

-- Phthalates in Building Materials
('Phthalate Plasticizers', 'Chemical plasticizers in vinyl flooring, carpet backing, wall coverings. Suspected endocrine disruptors and reproductive toxins, especially harmful to children.', 1950, NULL, 'medium', NULL),

-- PFOA/PFAS compounds
('PFOA/PFAS Compounds', 'Perfluorinated compounds in stain-resistant materials, coatings, and sealants. Known carcinogen that does not break down in environment. 4+ year half-life in body.', 1950, NULL, 'high', NULL),

-- Clay Tile Roofing with Asbestos
('Asbestos Clay Roof Tiles', 'Clay roof tiles manufactured with asbestos fibers for durability. Hazardous when broken or disturbed during maintenance. Common in southwestern US homes.', 1930, 1980, 'high', NULL),

-- Transite Siding
('Transite Asbestos Siding', 'Cement siding containing asbestos fibers. Becomes hazardous when cut, drilled, or damaged. Popular for fire resistance and durability.', 1930, 1980, 'high', NULL),

-- Lead Soldered Copper Pipes
('Lead-Soldered Copper Pipes', 'Copper pipes joined with lead-based solder. Can leach lead into drinking water, especially with acidic water. Particularly dangerous for children and pregnant women.', 1900, 1986, 'high', NULL),

-- Orangeburg Pipes
('Orangeburg Fiber Pipes', 'Bituminous fiber pipes made from wood pulp and coal tar. Prone to collapse and deformation, causing sewer backups and foundation issues.', 1860, 1972, 'medium', NULL),

-- Mineral Wool Insulation (Early)
('Early Mineral Wool Insulation', 'Early mineral wool insulation that may contain asbestos or formaldehyde binders. Can cause respiratory irritation when disturbed.', 1920, 1970, 'medium', NULL);

-- Update existing records with more detailed information where appropriate
UPDATE home_risks 
SET description = 'Most dangerous building material ever used. Found in insulation, floor tiles, roof shingles, pipe wrap, and cement products. Causes mesothelioma, lung cancer, and asbestosis. Any disturbance releases deadly fibers into air.'
WHERE material_name = 'Asbestos';

UPDATE home_risks 
SET description = 'Added to paint for durability and moisture resistance. Extremely toxic, especially to children. Causes developmental delays, learning disabilities, kidney damage, and reproductive issues. Hazardous when peeling or generating dust.'
WHERE material_name = 'Lead Paint';

UPDATE home_risks 
SET description = 'Early electrical system without grounding. Cloth and rubber insulation deteriorates over time, creating serious fire hazards. Cannot handle modern electrical loads. Insurance companies often refuse coverage.'
WHERE material_name = 'Knob and Tube Wiring';

UPDATE home_risks 
SET description = 'Cheaper alternative to copper wiring used during copper shortage. Expands/contracts more than copper, creating loose connections and fire hazards. Oxidation increases resistance and overheating risk.'
WHERE material_name = 'Aluminum Wiring';

UPDATE home_risks 
SET description = 'Gray plastic pipes that deteriorate when exposed to chlorine and UV light. Class-action lawsuit material due to high failure rate. Causes extensive water damage when pipes burst or leak.'
WHERE material_name = 'Polybutylene Pipes (PB)';

UPDATE home_risks 
SET description = 'Urea-formaldehyde foam insulation that off-gases formaldehyde for years. Causes respiratory irritation, eye burning, headaches, and nausea. Banned in several countries due to health concerns.'
WHERE material_name = 'Formaldehyde Insulation (UFFI)';

-- Ensure proper sorting - this query will help verify the sorting is working correctly
-- The application already sorts by risk_level and start_year, so no changes needed to the component