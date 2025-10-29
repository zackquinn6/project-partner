
-- RESTORE TILE FLOORING CONTENT - Fixed approach
-- Project ID: 0c3cecc0-bf7d-49e7-a94a-071f5d80fea3

-- Clean up existing
DELETE FROM template_steps WHERE operation_id IN (
  SELECT id FROM template_operations WHERE project_id = '0c3cecc0-bf7d-49e7-a94a-071f5d80fea3'
);
DELETE FROM template_operations WHERE project_id = '0c3cecc0-bf7d-49e7-a94a-071f5d80fea3';

-- Create all operations and get their IDs
WITH new_ops AS (
  INSERT INTO template_operations (project_id, standard_phase_id, name, description, display_order, flow_type)
  VALUES 
    -- Prep phase operations
    ('0c3cecc0-bf7d-49e7-a94a-071f5d80fea3', '840394b4-d7aa-4673-9251-270581da88fd', 'Surface Cleaning and Inspection', 'Clean and inspect the installation area', 1, 'prime'),
    ('0c3cecc0-bf7d-49e7-a94a-071f5d80fea3', '840394b4-d7aa-4673-9251-270581da88fd', 'Layout Planning', 'Plan and mark tile layout for optimal appearance', 2, 'prime'),
    -- Install phase operations
    ('0c3cecc0-bf7d-49e7-a94a-071f5d80fea3', '4c19552d-0f38-41f4-b059-93b925f53b76', 'Adhesive Application', 'Mix and apply tile adhesive properly', 1, 'prime'),
    ('0c3cecc0-bf7d-49e7-a94a-071f5d80fea3', '4c19552d-0f38-41f4-b059-93b925f53b76', 'Tile Setting', 'Set tiles systematically with proper spacing', 2, 'prime'),
    -- Finish phase operations
    ('0c3cecc0-bf7d-49e7-a94a-071f5d80fea3', '1c4d5069-ff4c-4645-8a82-2ff7269030b5', 'Grouting', 'Apply grout and finish tile installation', 1, 'prime'),
    ('0c3cecc0-bf7d-49e7-a94a-071f5d80fea3', '1c4d5069-ff4c-4645-8a82-2ff7269030b5', 'Sealing', 'Apply sealer and complete installation', 2, 'prime')
  RETURNING id, name
)
SELECT * FROM new_ops;

-- Now insert steps for Surface Cleaning operation
INSERT INTO template_steps (operation_id, step_number, step_title, description, display_order, flow_type, step_type, content_sections, materials, tools, outputs, estimated_time_minutes)
SELECT 
  ops.id,
  1,
  'Inspect and Clean Subfloor',
  'Thoroughly inspect subfloor for damage and clean completely',
  1, 'prime', 'prime',
  '[{"id": "inspect-1", "type": "text", "content": "Ensure your surface is clean, smooth, dry and free of wax, soap scum and grease. Any damaged, loose or uneven areas must be repaired, patched and leveled."}]'::jsonb,
  '[{"name": "Floor Cleaning Supplies", "description": "Degreaser, scraper, vacuum", "quantity": 1}]'::jsonb,
  '[{"name": "Putty Knife", "description": "For scraping", "quantity": 1}, {"name": "Shop Vacuum", "description": "For cleaning", "quantity": 1}]'::jsonb,
  '[{"id": "clean-subfloor", "name": "Clean Subfloor", "description": "Subfloor cleaned and ready", "type": "none"}]'::jsonb,
  60
FROM template_operations ops
WHERE ops.project_id = '0c3cecc0-bf7d-49e7-a94a-071f5d80fea3' AND ops.name = 'Surface Cleaning and Inspection';

INSERT INTO template_steps (operation_id, step_number, step_title, description, display_order, flow_type, step_type, content_sections, materials, tools, outputs, estimated_time_minutes)
SELECT 
  ops.id, 2, 'Install Underlayment', 'Install cement backer board or appropriate underlayment', 2, 'prime', 'prime',
  '[{"id": "under-1", "type": "text", "content": "Install cement backer board using appropriate screws every 8 inches. Stagger joints and leave 1/8 inch gaps between sheets."}]'::jsonb,
  '[{"name": "Floor Underlayment", "description": "Cement backer board", "quantity": 1}, {"name": "Backer Board Screws", "description": "1-1/4 inch cement board screws", "quantity": 1}]'::jsonb,
  '[{"name": "Power Drill", "description": "For installing screws", "quantity": 1}, {"name": "Utility Knife", "description": "For cutting backer board", "quantity": 1}]'::jsonb,
  '[{"id": "underlayment", "name": "Installed Underlayment", "description": "Underlayment installed and cured", "type": "none"}]'::jsonb,
  120
FROM template_operations ops
WHERE ops.project_id = '0c3cecc0-bf7d-49e7-a94a-071f5d80fea3' AND ops.name = 'Surface Cleaning and Inspection';

-- Layout Planning steps
INSERT INTO template_steps (operation_id, step_number, step_title, description, display_order, flow_type, step_type, content_sections, tools, outputs, estimated_time_minutes)
SELECT 
  ops.id, 1, 'Mark Center Lines', 'Find and mark the center point and create layout lines', 1, 'prime', 'prime',
  '[{"id": "center-1", "type": "text", "content": "Begin by marking the center point of all four walls. Snap chalk lines between the center points of opposite walls, which will intersect at the center of room."}]'::jsonb,
  '[{"name": "Chalk Line", "description": "For marking layout lines", "quantity": 1}, {"name": "Measuring Tape", "description": "25ft minimum", "quantity": 1}]'::jsonb,
  '[{"id": "center-lines", "name": "Layout Lines Marked", "description": "Center lines marked and verified square", "type": "none"}]'::jsonb,
  30
FROM template_operations ops
WHERE ops.project_id = '0c3cecc0-bf7d-49e7-a94a-071f5d80fea3' AND ops.name = 'Layout Planning';

INSERT INTO template_steps (operation_id, step_number, step_title, description, display_order, flow_type, step_type, content_sections, tools, outputs, estimated_time_minutes)
SELECT 
  ops.id, 2, 'Dry Lay Tiles', 'Lay out tiles without adhesive to plan cuts and spacing', 2, 'prime', 'prime',
  '[{"id": "dry-1", "type": "text", "content": "Lay out a row of loose tiles along the center lines in both directions, leaving spaces for uniform joints using tile spacers."}]'::jsonb,
  '[{"name": "Tile Spacers", "description": "Various sizes for testing", "quantity": 1}]'::jsonb,
  '[{"id": "dry-layout", "name": "Dry Layout Complete", "description": "Tile layout planned and marked", "type": "none"}]'::jsonb,
  45
FROM template_operations ops
WHERE ops.project_id = '0c3cecc0-bf7d-49e7-a94a-071f5d80fea3' AND ops.name = 'Layout Planning';

-- Adhesive Application steps
INSERT INTO template_steps (operation_id, step_number, step_title, description, display_order, flow_type, step_type, content_sections, materials, tools, outputs, estimated_time_minutes)
SELECT 
  ops.id, 1, 'Mix Tile Adhesive', 'Prepare tile adhesive according to manufacturer instructions', 1, 'prime', 'prime',
  '[{"id": "mix-1", "type": "text", "content": "Select the right adhesive for the substrate. Mix only enough to use within 30 minutes. Use a mixing paddle and drill for consistent texture."}]'::jsonb,
  '[{"name": "Tile Adhesive/Mortar", "description": "Premium grade mortar", "quantity": 1}]'::jsonb,
  '[{"name": "Mixing Paddle & Drill", "description": "For consistent mixing", "quantity": 1}]'::jsonb,
  '[{"id": "mixed", "name": "Mixed Adhesive", "description": "Properly mixed adhesive ready", "type": "none"}]'::jsonb,
  15
FROM template_operations ops
WHERE ops.project_id = '0c3cecc0-bf7d-49e7-a94a-071f5d80fea3' AND ops.name = 'Adhesive Application';

INSERT INTO template_steps (operation_id, step_number, step_title, description, display_order, flow_type, step_type, content_sections, tools, outputs, estimated_time_minutes)
SELECT 
  ops.id, 2, 'Apply Adhesive', 'Spread adhesive using proper troweling technique', 2, 'prime', 'prime',
  '[{"id": "apply-1", "type": "text", "content": "Spread a 1/4 inch coat on one grid area using flat side of trowel. Then use notched side at 45-degree angle to create ridges."}]'::jsonb,
  '[{"name": "Notched Trowel", "description": "1/4 x 3/8 inch notched trowel", "quantity": 1}]'::jsonb,
  '[{"id": "applied", "name": "Adhesive Applied", "description": "Adhesive properly applied to work area", "type": "none"}]'::jsonb,
  30
FROM template_operations ops
WHERE ops.project_id = '0c3cecc0-bf7d-49e7-a94a-071f5d80fea3' AND ops.name = 'Adhesive Application';

-- Tile Setting steps
INSERT INTO template_steps (operation_id, step_number, step_title, description, display_order, flow_type, step_type, content_sections, materials, tools, outputs, estimated_time_minutes)
SELECT 
  ops.id, 1, 'Set Tiles', 'Install tiles systematically using proper technique', 1, 'prime', 'prime',
  '[{"id": "set-1", "type": "text", "content": "Begin in center of room. Set tiles with slight twisting motion. Use spacers for consistent gaps. Leave 1/4 inch gap at walls."}]'::jsonb,
  '[{"name": "Floor Tiles", "description": "Main installation tiles", "quantity": 1}]'::jsonb,
  '[{"name": "Tile Spacers", "quantity": 1}, {"name": "Rubber Mallet", "quantity": 1}, {"name": "4-Foot Level", "quantity": 1}]'::jsonb,
  '[{"id": "tiles-set", "name": "Tiles Set", "description": "All tiles properly set and leveled", "type": "major-aesthetics"}]'::jsonb,
  240
FROM template_operations ops
WHERE ops.project_id = '0c3cecc0-bf7d-49e7-a94a-071f5d80fea3' AND ops.name = 'Tile Setting';

-- Grouting steps
INSERT INTO template_steps (operation_id, step_number, step_title, description, display_order, flow_type, step_type, content_sections, materials, tools, outputs, estimated_time_minutes)
SELECT 
  ops.id, 1, 'Apply Grout', 'Spread grout into joints using proper technique', 1, 'prime', 'prime',
  '[{"id": "grout-1", "type": "text", "content": "Wait 24 hours after setting tiles. Spread grout with rubber float at 45-degree angle. Remove excess immediately. Clean with damp sponge after 15-20 minutes."}]'::jsonb,
  '[{"name": "Sanded Grout", "description": "For joints 1/8 inch and larger", "quantity": 1}]'::jsonb,
  '[{"name": "Rubber Grout Float", "quantity": 1}, {"name": "Grout Sponges", "quantity": 2}]'::jsonb,
  '[{"id": "grout-done", "name": "Finished Grout", "description": "Grout cleaned and finished", "type": "major-aesthetics"}]'::jsonb,
  120
FROM template_operations ops
WHERE ops.project_id = '0c3cecc0-bf7d-49e7-a94a-071f5d80fea3' AND ops.name = 'Grouting';

-- Sealing steps
INSERT INTO template_steps (operation_id, step_number, step_title, description, display_order, flow_type, step_type, content_sections, materials, tools, outputs, estimated_time_minutes)
SELECT 
  ops.id, 1, 'Apply Grout Sealer', 'Seal grout lines to prevent staining', 1, 'prime', 'prime',
  '[{"id": "seal-1", "type": "text", "content": "Wait 48-72 hours after grouting. Apply penetrating sealer according to manufacturer instructions using a small brush or applicator."}]'::jsonb,
  '[{"name": "Grout Sealer", "description": "Penetrating sealer", "quantity": 1}]'::jsonb,
  '[{"name": "Small Brush or Applicator", "quantity": 1}]'::jsonb,
  '[{"id": "sealed", "name": "Sealed Grout Lines", "description": "Grout properly sealed and protected", "type": "performance-durability"}]'::jsonb,
  45
FROM template_operations ops
WHERE ops.project_id = '0c3cecc0-bf7d-49e7-a94a-071f5d80fea3' AND ops.name = 'Sealing';
