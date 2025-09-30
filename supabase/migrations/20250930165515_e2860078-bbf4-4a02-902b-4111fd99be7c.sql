-- Continue inserting template steps - Cut operation and beyond

-- Cut (operation_id: bef5546a-ca34-4a9a-a0bd-fa9641b4d0b0)
INSERT INTO public.template_steps (operation_id, step_number, step_title, description, outputs, display_order) VALUES
('bef5546a-ca34-4a9a-a0bd-fa9641b4d0b0', 1, 'Wet saw cut', 'Use a water-cooled tile saw for straight, precise cuts on ceramic, porcelain, or natural stone.', '[{"name": "Cut according to size - +/-1/16\""}, {"name": "Round cut according to profile - +/-1/4\""}, {"name": "No cracking of tile in-plane"}]'::jsonb, 1),
('bef5546a-ca34-4a9a-a0bd-fa9641b4d0b0', 2, 'Snap & score cut', 'For thinner tiles, use a handheld snap cutter: score the glaze, snap the tile along the line, and smooth edges with a rubbing stone.', '[{"name": "Straight cut according to size - +/-1/16\""}, {"name": "No cracking of tile in-plane"}]'::jsonb, 2),
('bef5546a-ca34-4a9a-a0bd-fa9641b4d0b0', 3, 'Grinder cut', 'Use an angle grinder with a diamond blade for curved or notched cuts', '[{"name": "Round cut according to size - +/-1/4\""}, {"name": "Straight cut according to size - +/-1/8\""}, {"name": "No cracking of tile in-plane"}]'::jsonb, 3),
('bef5546a-ca34-4a9a-a0bd-fa9641b4d0b0', 4, 'Cut trim', 'For metal edge profiles, cut to size', '[{"name": "Cut within +/-1/32\""}]'::jsonb, 4),
('bef5546a-ca34-4a9a-a0bd-fa9641b4d0b0', 5, 'Drill', 'Fit tiles to pipes or other fixtures by drilling pilot holes first, then widen with a diamond-tipped bit under water spray.', '[{"name": "No cracking of tile in-plane"}, {"name": "Hole diameter outside of 1/4\" from plan"}, {"name": "Hole true position within 1/8\""}]'::jsonb, 5),
('bef5546a-ca34-4a9a-a0bd-fa9641b4d0b0', 6, 'Polish', 'Smooth cut edges and chamfers with a fine-grit diamond grinder or hand scraper for a professional finish.', '[{"name": "No cracking of tile in-plane"}, {"name": "No visible chips on edge (no magnification, 4\" distance)"}, {"name": "Inner corner radius maintained per layout"}, {"name": "<1/64\" matl removal"}]'::jsonb, 6);

-- Mix (operation_id: f907acaf-8b62-4d62-bda3-f7592e0cf12f)
INSERT INTO public.template_steps (operation_id, step_number, step_title, description, outputs, display_order) VALUES
('f907acaf-8b62-4d62-bda3-f7592e0cf12f', 1, 'Mix thinset', 'Combine mortar and water to a lump-free, peanut-butter consistency; slake (rest) then remix before use.', '[{"name": "Peanut-butter consistency and no unmixed contents"}, {"name": "End time of mix logged"}]'::jsonb, 1);

-- Set operation (operation_id: c92da9be-bf99-4aaf-9ab0-38e7f85fa007)
INSERT INTO public.template_steps (operation_id, step_number, step_title, description, outputs, display_order) VALUES
('c92da9be-bf99-4aaf-9ab0-38e7f85fa007', 1, 'Clean floor', 'Clean floor', '[{"name": "No contamination"}]'::jsonb, 1),
('c92da9be-bf99-4aaf-9ab0-38e7f85fa007', 2, 'Apply thinset', 'Spread mortar with a notched trowel at the correct angle and depth to achieve complete coverage and target bed thickness.', '[{"name": "95% thinset coverage"}, {"name": "Thinset thickness <1/8\""}, {"name": "Tiles undamaged"}]'::jsonb, 2),
('c92da9be-bf99-4aaf-9ab0-38e7f85fa007', 3, 'Set tile', 'Press and wiggle each tile into the mortar bed, maintaining consistent spacing with wedges or spacers and periodic level checks.', '[{"name": "Lippage <1/32\""}, {"name": "Thinset coverage 95% in wet zones, 80% in dry zones"}, {"name": "Grout line size per spec (+/- <1/64\")"}, {"name": "Layout per plan (+/- 1/4\")"}, {"name": "Grout nominal centerline must be straight"}, {"name": "Thinset lower than 1/8\" from tile suface"}, {"name": "Thinset time from mix within mfg spec - 1hr max duration"}, {"name": "No visible sheet lines"}]'::jsonb, 3),
('c92da9be-bf99-4aaf-9ab0-38e7f85fa007', 4, 'Verify tile coverage', 'Remove tile and check coverage according to plan, re-install', '[{"name": "Coverage >80% in floor, 95% in bath"}]'::jsonb, 4),
('c92da9be-bf99-4aaf-9ab0-38e7f85fa007', 5, 'Correct layout', 'Inspect grout lines and make ongoing corrections to align layout', '[{"name": "Grout line size per plan"}]'::jsonb, 5),
('c92da9be-bf99-4aaf-9ab0-38e7f85fa007', 6, 'Clean thinset from tile', 'Using sponge and toothbrush, clean thinset from tile tops and in grout lines', '[{"name": "Thinset >1/8\" from surface in grout line"}, {"name": "Thinset coverage removed from tile"}]'::jsonb, 6);

-- Install tile trim and baseboard (operation_id: d5672318-876f-4e60-b04d-f7874386e389)
INSERT INTO public.template_steps (operation_id, step_number, step_title, description, outputs, display_order) VALUES
('d5672318-876f-4e60-b04d-f7874386e389', 1, 'Install tile trim and baseboard', 'Fit bullnose profiles or baseboards at tile edges for a clean termination and edge protection.', '[{"name": "Lippage <1/32\""}, {"name": "Thinset coverage 95% in wet zones, 80% in dry zones"}, {"name": "Grout line size per spec (+/- <1/64\")"}, {"name": "Layout per plan (+/- 1/4\")"}, {"name": "Grout nominal centerline must be straight"}, {"name": "Thinset time from mix within mfg spec - 1hr max duration"}, {"name": "Seated to wall"}]'::jsonb, 1);

-- Pausing mid-project (operation_id: dcd46d76-a286-4a4d-b97d-850100fa2075)
INSERT INTO public.template_steps (operation_id, step_number, step_title, description, outputs, display_order) VALUES
('dcd46d76-a286-4a4d-b97d-850100fa2075', 1, 'Prepare stop point', 'Cut space for leveling spacers and remove loose thinset', '[{"name": "Thinset removed from flooring not covered by tile"}, {"name": "Leveling clip added where next layer will be"}, {"name": "Tile set tight to leveling clip"}]'::jsonb, 1);

-- Thinset curing (operation_id: 42ff3b61-f8eb-48ef-b767-f63e128c67ca)
INSERT INTO public.template_steps (operation_id, step_number, step_title, description, outputs, display_order) VALUES
('42ff3b61-f8eb-48ef-b767-f63e128c67ca', 1, 'Cure thinset', 'Permanently set thinset', '[{"name": "Tile lippage <1/32\""}, {"name": "Thinset 100% cured"}]'::jsonb, 1);

-- Leveling system removal (operation_id: 303b80db-318b-4b81-a68b-832339a60ca4)
INSERT INTO public.template_steps (operation_id, step_number, step_title, description, outputs, display_order) VALUES
('303b80db-318b-4b81-a68b-832339a60ca4', 1, 'Remove leveling clips', 'Snap off and remove leveling clips from tile surface', '[{"name": "Level clips 100% removed"}, {"name": "Breaklines >1/8\" below surface"}]'::jsonb, 1);