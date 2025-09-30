-- Insert template steps for Tile Flooring Installation
-- This migration contains all 168 workflow steps from the Excel template

-- Project Setup steps (operation_id: 727812d6-9a84-4c56-8951-85b337125f7f)
INSERT INTO public.template_steps (operation_id, step_number, step_title, description, outputs, display_order) VALUES
('727812d6-9a84-4c56-8951-85b337125f7f', 1, 'Furniture and belongings move', 'Remove furniture, fixtures, and personal items; protect adjacent surfaces', '[{"name": "No personal areas affected by dust"}]'::jsonb, 1),
('727812d6-9a84-4c56-8951-85b337125f7f', 2, 'Heavy appliance move', 'Remove large appliances such as refrigerators', '[{"name": "No personal areas affected by dust"}]'::jsonb, 2),
('727812d6-9a84-4c56-8951-85b337125f7f', 3, 'Work station setup', 'Position mixing tools, water supply, cutting tools, and waste bins within easy reach while keeping the main floor clear.', '[{"name": "No personal areas affected by dust"}, {"name": "Driveway / hard surfaces protected from dust"}, {"name": "Setup: Workbench, mixing area with water supply, cutting table, re-useable scraps, and final waste tile"}]'::jsonb, 3),
('727812d6-9a84-4c56-8951-85b337125f7f', 4, 'Materials staging', 'Lay out tile boxes in installation order; pre-open shrink wrap to acclimate tiles to room temperature and humidity.', '[{"name": "No personal areas affected by dust"}, {"name": "Acclimation time passed mfg minimum"}]'::jsonb, 4);

-- Hazardous materials removal (operation_id: 1693c945-72e2-4b0d-8755-f0f60e19b0cd)
INSERT INTO public.template_steps (operation_id, step_number, step_title, description, outputs, display_order) VALUES
('1693c945-72e2-4b0d-8755-f0f60e19b0cd', 1, 'Remove hazardous materials', 'If old adhesives or flooring contain asbestos or lead, hire a certified abatement contractor and follow containment protocols.', '[{"name": "Hazardous materials remove and disposed of in compliance with federal, state, and local building codes"}]'::jsonb, 1);

-- Demo steps (operation_id: b3085d23-4a1f-44b2-90dc-c03e75fc6abd)
INSERT INTO public.template_steps (operation_id, step_number, step_title, description, outputs, display_order) VALUES
('b3085d23-4a1f-44b2-90dc-c03e75fc6abd', 1, 'Remove non-hazardous materials', 'Strip carpet, vinyl, or existing tile down to the substrate; use scrapers and floor scrubbing tools to clear residue.', '[{"name": "Old materials removed from floor"}]'::jsonb, 1),
('b3085d23-4a1f-44b2-90dc-c03e75fc6abd', 2, 'Remove tile (>100sqft)', 'Strip tile using machine', '[{"name": "Tile removed from floor"}]'::jsonb, 2),
('b3085d23-4a1f-44b2-90dc-c03e75fc6abd', 3, 'Remove wall trim and prepare walls', 'Remove trim and loose materials from walls', '[{"name": "Old materials removed from wall"}, {"name": "No paint tears"}, {"name": "No dents to drywall above baseboard"}, {"name": "No cracking to baseboard materials"}]'::jsonb, 3),
('b3085d23-4a1f-44b2-90dc-c03e75fc6abd', 4, 'Remove toilet', 'Remove toilet from bathroom floor', '[{"name": "Toilet removed"}, {"name": "Wax residue removed"}, {"name": "Flange condition inspected and documented"}, {"name": "Toilet drain pipe plugged"}, {"name": "No water spilled in house"}]'::jsonb, 4);

-- Demo - wood floor (operation_id: 065f269d-bb2a-427f-847d-eb9c89fbcd46)
INSERT INTO public.template_steps (operation_id, step_number, step_title, description, outputs, display_order) VALUES
('065f269d-bb2a-427f-847d-eb9c89fbcd46', 1, 'Detailed finishing and prep', 'Fill cracks or low spots with patching compound; sand protrusions to achieve a uniform, flat surface.', '[{"name": "Nails removed"}, {"name": "No loose debris / contamination"}, {"name": "Loose boards screwed down"}]'::jsonb, 1);

-- Subfloor prep (operation_id: bb146ba5-56aa-4b0c-8ddb-48bafe477a85)
INSERT INTO public.template_steps (operation_id, step_number, step_title, description, outputs, display_order) VALUES
('bb146ba5-56aa-4b0c-8ddb-48bafe477a85', 1, 'Prep concrete', 'If concrete surface is not smooth, grind concrete slabs to remove laitance and improve thinset adhesion.', '[{"name": "Concrete surface roughness prepared for thinset - 100% coverage"}, {"name": "No high points >1/8\" in 10ft for natural stone, 1/4\" in 10ft for ceramic/porcelain"}]'::jsonb, 1),
('bb146ba5-56aa-4b0c-8ddb-48bafe477a85', 2, 'Install plywood subfloor', 'If subfloor thickness is <1-1/4\", screw down exterior-grade plywood over joists to create a stiff, screw-retention layer under tile.', '[{"name": "Subfloor total thickness >1-1/4\", no layer <3/8\""}, {"name": "Screws at least every 6\"; no closer than 1/2\" from edge"}, {"name": "Construction adhesive 95% applied to joists / underlying base"}]'::jsonb, 2),
('bb146ba5-56aa-4b0c-8ddb-48bafe477a85', 3, 'Apply self-leveler', 'If subfloor flatness is not 1/8\" in 10ft or not level, pour and spread self-leveling compound to smooth minor dips', '[{"name": "Smooth - 1/8\" in 10ft"}, {"name": "Adhesion of layer in mfg spec"}, {"name": "No drips to lower levels/outside project floor"}, {"name": "Max thickness per mfg spec"}]'::jsonb, 3),
('bb146ba5-56aa-4b0c-8ddb-48bafe477a85', 4, 'Cure self leveler', 'Allow leveler cure time before proceeding.', '[{"name": "Wait time passed in line with manufacturer recommendation"}]'::jsonb, 4);

-- Assess floor (operation_id: 499bc09f-3b5a-4a35-80f3-163fea9496e9)
INSERT INTO public.template_steps (operation_id, step_number, step_title, description, outputs, display_order) VALUES
('499bc09f-3b5a-4a35-80f3-163fea9496e9', 1, 'Measure', 'Re-verify dimensions after demo to account for any substrate changes; adjust layout plans as needed. Check moisture using moisture meter.', '[{"name": "Condition report"}, {"name": "Moisture level"}, {"name": "Level"}, {"name": "Subfloor thickness"}, {"name": "Subfloor material"}, {"name": "Transition zones"}, {"name": "Moulding heights"}]'::jsonb, 1);

-- Tile base install (operation_id: 34db2c36-9e0d-4d01-9e31-88393493c668)
INSERT INTO public.template_steps (operation_id, step_number, step_title, description, outputs, display_order) VALUES
('34db2c36-9e0d-4d01-9e31-88393493c668', 1, 'Install concrete board', 'If using concrete board, fasten cement board panels with corrosion-resistant screws; tape seams with fiber mesh to prevent movement cracks.', '[{"name": "Screws every 6\", not closer than 1\" from edge"}, {"name": "Thinset coverage and strength"}, {"name": "Seam staggering"}, {"name": "Seam 100% coverage with tape"}, {"name": "Floor gaps 1/4\"-1/2\""}]'::jsonb, 1),
('34db2c36-9e0d-4d01-9e31-88393493c668', 2, 'Install uncoupling membrane', 'If using uncoupling membrane, roll out and bond a membrane to isolate tile from substrate stresses and manage moisture.', '[{"name": "Thinset coverage and strength"}, {"name": "Seam 100% coverage with tape"}, {"name": "Floor gaps 1/4\"-1/2\""}]'::jsonb, 2);

-- Cleaning (operation_id: 6ea9466d-64a6-4898-9336-90de347ae8cb)
INSERT INTO public.template_steps (operation_id, step_number, step_title, description, outputs, display_order) VALUES
('6ea9466d-64a6-4898-9336-90de347ae8cb', 1, 'Clean tools', 'Remove thinset from tools', '[{"name": "Thinset completely removed from tools"}, {"name": "Thinset not settling in drains"}]'::jsonb, 1);

-- Layout (operation_id: 949cc206-98a0-47b1-ac49-6f2333c13fc0)
INSERT INTO public.template_steps (operation_id, step_number, step_title, description, outputs, display_order) VALUES
('949cc206-98a0-47b1-ac49-6f2333c13fc0', 1, 'Plan layout', 'Plan layout using digital tools', '[{"name": "reference walls defined"}, {"name": "starting line defined"}, {"name": "min 2\" or 1/3 width on all tiles"}, {"name": "balanced spacing"}, {"name": "setting order defined (planning for no-walk on tile)"}, {"name": "grout line per design; min 1/16\""}, {"name": "Movement joint every 25ft"}]'::jsonb, 1),
('949cc206-98a0-47b1-ac49-6f2333c13fc0', 2, 'Dry test layout', 'Test layout for critical zones', '[{"name": "Layout plan"}, {"name": "No broken tiles"}]'::jsonb, 2);