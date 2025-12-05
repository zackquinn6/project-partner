-- Migration: Add step instructions for Tile Flooring Installation project
-- Project ID: 9c04c190-9409-4eeb-98db-36426aacb39f
-- Adds beginner, intermediate, and advanced level instructions for all steps

-- Ensure step_instructions table exists
CREATE TABLE IF NOT EXISTS public.step_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_step_id UUID NOT NULL REFERENCES public.operation_steps(id) ON DELETE CASCADE,
  instruction_level TEXT NOT NULL CHECK (instruction_level IN ('beginner', 'intermediate', 'advanced')),
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_step_id, instruction_level)
);

CREATE INDEX IF NOT EXISTS idx_step_instructions_template_step_id ON public.step_instructions(template_step_id);
CREATE INDEX IF NOT EXISTS idx_step_instructions_level ON public.step_instructions(instruction_level);

-- Insert instructions directly for all steps
DO $$
DECLARE
  step_record RECORD;
  beginner_content JSONB;
  intermediate_content JSONB;
  advanced_content JSONB;
BEGIN
  FOR step_record IN
    SELECT os.id, os.step_title
    FROM operation_steps os
    JOIN phase_operations po ON os.operation_id = po.id
    JOIN project_phases pp ON po.phase_id = pp.id
    WHERE pp.project_id = '9c04c190-9409-4eeb-98db-36426aacb39f'
    ORDER BY pp.display_order, po.display_order, os.display_order
  LOOP
    -- Initialize content arrays
    beginner_content := '[]'::jsonb;
    intermediate_content := '[]'::jsonb;
    advanced_content := '[]'::jsonb;
    
    -- Clean and Prepare Surface
    IF step_record.step_title ILIKE '%clean%' OR step_record.step_title ILIKE '%prepare%surface%' THEN
      beginner_content := jsonb_build_array(
        jsonb_build_object('id', '1', 'type', 'text', 'title', 'Why This Matters', 'content', 'A clean, dry surface is essential for tile installation. Any dust, debris, grease, or moisture will prevent the tile adhesive from bonding properly, causing tiles to crack, shift, or come loose over time. Taking time to properly prepare the surface now will save you from costly repairs later.'),
        jsonb_build_object('id', '2', 'type', 'text', 'title', 'Step-by-Step Instructions', 'content', '1. Remove all furniture, rugs, and any items from the room' || E'\n' || '2. Use a broom to sweep the entire floor, removing all visible debris' || E'\n' || '3. Vacuum thoroughly with a shop vacuum or strong household vacuum to remove fine dust particles' || E'\n' || '4. Inspect the floor for any loose or damaged areas - these must be repaired before tiling' || E'\n' || '5. Check for any paint, sealers, or old adhesives on the surface - these must be removed' || E'\n' || '6. If you find grease or oil stains, clean with a degreasing cleaner and allow to dry completely' || E'\n' || '7. Fill any cracks or holes with appropriate filler (ask at your hardware store for subfloor filler)' || E'\n' || '8. Allow the surface to dry completely - this may take 24-48 hours if you used any wet cleaning' || E'\n' || '9. Do a final vacuum to ensure the surface is completely clean and dry before proceeding'),
        jsonb_build_object('id', '3', 'type', 'safety-warning', 'title', 'Critical Warning', 'content', 'Never install tile over a damp or contaminated surface. If you can feel moisture or see any stains, the surface is not ready. Installing tile on a damp surface will cause the adhesive to fail and tiles will move or crack. Always wait until the surface is completely dry.', 'severity', 'critical')
      );
      intermediate_content := jsonb_build_array(
        jsonb_build_object('id', '1', 'type', 'text', 'title', 'Surface Preparation', 'content', 'Remove all contaminants and ensure the subfloor is clean, dry, and structurally sound. Test for moisture if needed (moisture content should be less than 3% for concrete, less than 12% for wood). Remove paint, sealers, and old adhesives. Fill cracks and holes with appropriate filler.'),
        jsonb_build_object('id', '2', 'type', 'text', 'title', 'Process', 'content', '1. Remove furniture and fixtures' || E'\n' || '2. Sweep and vacuum thoroughly' || E'\n' || '3. Check moisture levels if available' || E'\n' || '4. Remove paint, sealers, or old adhesives' || E'\n' || '5. Fill cracks and holes' || E'\n' || '6. Allow to dry completely (24-48 hours if wet cleaning used)'),
        jsonb_build_object('id', '3', 'type', 'safety-warning', 'title', 'Important', 'content', 'Surface must be completely dry and free of contaminants. Damp or contaminated surfaces will cause adhesive failure.', 'severity', 'high')
      );
      advanced_content := jsonb_build_array(
        jsonb_build_object('id', '1', 'type', 'text', 'title', 'Surface Preparation', 'content', 'Remove all contaminants. Test moisture (concrete less than 3%, wood less than 12%). Remove paint/sealers/adhesives. Fill and level defects. Verify dry and flat (1/8 inch over 10 feet).')
      );
    
    -- Measure and Layout
    ELSIF step_record.step_title ILIKE '%measure%' OR step_record.step_title ILIKE '%layout%' OR step_record.step_title ILIKE '%mark%' THEN
      beginner_content := jsonb_build_array(
        jsonb_build_object('id', '1', 'type', 'text', 'title', 'Why This Matters', 'content', 'Proper layout ensures your tiles look balanced and professional. Starting from the center of the room creates even cuts on all sides and makes the installation look intentional rather than haphazard. Taking time to plan the layout now will save you from awkward cuts and wasted tiles later.'),
        jsonb_build_object('id', '2', 'type', 'text', 'title', 'Step-by-Step Instructions', 'content', '1. Measure the length of the room from wall to wall - write this number down' || E'\n' || '2. Measure the width of the room from wall to wall - write this number down' || E'\n' || '3. Divide the length by 2 to find the center point along the length' || E'\n' || '4. Divide the width by 2 to find the center point along the width' || E'\n' || '5. Mark these center points on the floor with a pencil or chalk' || E'\n' || '6. Use a chalk line (available at hardware stores) to snap a line through the length center point, parallel to the long walls' || E'\n' || '7. Snap another chalk line through the width center point, parallel to the short walls' || E'\n' || '8. These two lines should cross at the center of the room - this is where you will start laying tiles' || E'\n' || '9. Before you start, lay a few tiles along these lines (without adhesive) to see how the layout will look' || E'\n' || '10. If you notice you will have very small cuts (less than 2 inches) at the edges, adjust your starting point slightly to create larger, more manageable cuts'),
        jsonb_build_object('id', '3', 'type', 'text', 'title', 'Tips', 'content', 'Remember to account for the space between tiles (grout lines) when planning. Most tiles use 1/8 inch or 1/16 inch spacing. If your room has a focal point like a fireplace, you may want to center the layout on that instead of the room center.')
      );
      intermediate_content := jsonb_build_array(
        jsonb_build_object('id', '1', 'type', 'text', 'title', 'Layout Planning', 'content', 'Measure room dimensions and establish center point. Create perpendicular reference lines. Dry-lay tiles to verify layout and adjust if needed to avoid small cuts (less than 2 inches). Account for grout joint width in calculations.'),
        jsonb_build_object('id', '2', 'type', 'text', 'title', 'Process', 'content', '1. Measure room dimensions (length, width, irregularities)' || E'\n' || '2. Calculate center point for both dimensions' || E'\n' || '3. Snap perpendicular chalk lines from center' || E'\n' || '4. Dry-lay tiles along reference lines to verify' || E'\n' || '5. Adjust starting point if cuts are less than 2 inches or greater than 80% of full tile' || E'\n' || '6. Mark final layout lines')
      );
      advanced_content := jsonb_build_array(
        jsonb_build_object('id', '1', 'type', 'text', 'title', 'Layout', 'content', 'Measure dimensions, calculate center, snap perpendicular reference lines (3-4-5 method). Dry-lay to verify. Adjust if cuts less than 2 inches or greater than 80% full tile. Account for expansion joints if area greater than 25 feet.')
      );
    
    -- Mortar/Thinset Application
    ELSIF step_record.step_title ILIKE '%mortar%' OR step_record.step_title ILIKE '%thinset%' OR step_record.step_title ILIKE '%apply%adhesive%' THEN
      beginner_content := jsonb_build_array(
        jsonb_build_object('id', '1', 'type', 'text', 'title', 'Why This Matters', 'content', 'Thinset mortar is the adhesive that holds your tiles in place. If it is not mixed correctly or applied properly, tiles can come loose, crack, or create an uneven surface. The notched trowel creates ridges that allow air to escape when you press the tile down, ensuring a strong bond.'),
        jsonb_build_object('id', '2', 'type', 'text', 'title', 'Step-by-Step Instructions', 'content', '1. Read the thinset package directions carefully - different brands may have slightly different mixing ratios' || E'\n' || '2. Pour the recommended amount of water into a clean bucket first' || E'\n' || '3. Slowly add the thinset powder while mixing with a drill and mixing paddle (or by hand if you do not have a drill)' || E'\n' || '4. Mix until there are no lumps - the consistency should be like thick peanut butter, not soupy' || E'\n' || '5. Let the mixture rest (slake) for 10 minutes - this allows the powder to fully absorb the water' || E'\n' || '6. Remix for 1-2 minutes until smooth' || E'\n' || '7. Use the flat side of your notched trowel to spread a thin layer of thinset over a small area (about 3x3 feet)' || E'\n' || '8. Flip the trowel to the notched side and drag it through the thinset at a 45-degree angle to create ridges' || E'\n' || '9. The ridges should be uniform - if they collapse, the thinset is too wet; if they are too sharp, it is too dry' || E'\n' || '10. Work in small sections - only spread enough thinset for 3-4 tiles at a time so it does not dry before you place the tiles'),
        jsonb_build_object('id', '3', 'type', 'safety-warning', 'title', 'Critical Warning', 'content', 'Thinset starts to harden within 1-2 hours after mixing. Never add water to thinset that has started to set - this weakens it. If it starts to get thick, discard it and mix a fresh batch. Work in small sections to avoid wasting material.', 'severity', 'critical')
      );
      intermediate_content := jsonb_build_array(
        jsonb_build_object('id', '1', 'type', 'text', 'title', 'Thinset Application', 'content', 'Mix to proper consistency (peanut butter-like). Let slake 10 minutes, then remix. Spread with flat side of trowel, then create uniform ridges with notched side at 45-degree angle. Work in 10-15 sq ft sections. Verify 80-100% coverage by lifting a test tile.'),
        jsonb_build_object('id', '2', 'type', 'text', 'title', 'Process', 'content', '1. Mix to proper consistency' || E'\n' || '2. Slake 10 minutes, remix' || E'\n' || '3. Spread with flat side for full coverage' || E'\n' || '4. Create ridges with notched trowel (1/4 inch x 3/8 inch for 12 inch and larger tiles)' || E'\n' || '5. Hold trowel at 45-degree angle' || E'\n' || '6. Work in manageable sections' || E'\n' || '7. Check coverage (80-100%)'),
        jsonb_build_object('id', '3', 'type', 'safety-warning', 'title', 'Important', 'content', 'Use within working time (1-2 hours). Never add water to setting thinset.', 'severity', 'high')
      );
      advanced_content := jsonb_build_array(
        jsonb_build_object('id', '1', 'type', 'text', 'title', 'Thinset Application', 'content', 'Mix to spec. Slake 10-15 min, remix. Spread flat side, notch at 45-60 degree angle. Trowel size: 1/4 inch x 1/4 inch for tiles less than 8 inches, 1/4 inch x 3/8 inch for 8-16 inches, 1/2 inch x 1/2 inch for greater than 16 inches. Verify 80-100% coverage. Back-butter large format greater than 15 inches. Monitor pot life.')
      );
    
    -- Tile Setting/Placement
    ELSIF step_record.step_title ILIKE '%set%tile%' OR step_record.step_title ILIKE '%place%tile%' OR step_record.step_title ILIKE '%install%tile%' THEN
      beginner_content := jsonb_build_array(
        jsonb_build_object('id', '1', 'type', 'text', 'title', 'Why This Matters', 'content', 'Proper tile placement ensures your tiles are level, evenly spaced, and securely bonded. Pressing and twisting the tile helps push out air bubbles and ensures the thinset makes full contact with the tile back. Using spacers keeps your grout lines consistent, which makes the finished floor look professional.'),
        jsonb_build_object('id', '2', 'type', 'text', 'title', 'Step-by-Step Instructions', 'content', '1. Start at the center point where your layout lines cross - this is your starting point' || E'\n' || '2. Place the first tile firmly into the thinset, pressing down with your hands' || E'\n' || '3. Give it a slight back-and-forth twisting motion - this helps the tile settle and pushes out air bubbles' || E'\n' || '4. Insert tile spacers at all four corners of the tile (spacers are small plastic crosses that keep tiles evenly spaced)' || E'\n' || '5. Place the next tile adjacent to the first, pressing down firmly and twisting slightly' || E'\n' || '6. Insert spacers between the tiles as you go' || E'\n' || '7. Use a level to check that the tiles are at the same height - if one is higher, press it down; if one is lower, you may need to lift it and add more thinset' || E'\n' || '8. Continue placing tiles, working outward from the center' || E'\n' || '9. As you work, remove any excess thinset that squeezes up into the grout lines using a small tool or your finger' || E'\n' || '10. Check alignment frequently - tiles should form straight rows and columns' || E'\n' || '11. Work in small sections (3-4 tiles at a time) so the thinset does not dry before you place the tiles'),
        jsonb_build_object('id', '3', 'type', 'text', 'title', 'Tips', 'content', 'If a tile is not level with its neighbors, you have about 15 minutes to adjust it before the thinset starts to set. After that, it becomes very difficult to move. Keep a damp sponge nearby to clean your hands and tools as you work.')
      );
      intermediate_content := jsonb_build_array(
        jsonb_build_object('id', '1', 'type', 'text', 'title', 'Tile Setting', 'content', 'Set tiles with firm pressure and slight twisting motion for proper embedment. Insert spacers at all corners. Check for lippage (height differences) using level. Maintain consistent spacing and alignment. Adjust within 15 minutes if needed.'),
        jsonb_build_object('id', '2', 'type', 'text', 'title', 'Process', 'content', '1. Start at center intersection' || E'\n' || '2. Apply thinset to 3-4 tile area' || E'\n' || '3. Place tile, press firmly, twist slightly' || E'\n' || '4. Insert spacers at corners' || E'\n' || '5. Set adjacent tiles, check alignment' || E'\n' || '6. Check for lippage with level' || E'\n' || '7. Remove excess thinset from joints' || E'\n' || '8. Adjust within 15 minutes if needed')
      );
      advanced_content := jsonb_build_array(
        jsonb_build_object('id', '1', 'type', 'text', 'title', 'Tile Setting', 'content', 'Set with firm pressure, back-and-forth motion for embedment. Use consistent spacers. Check lippage with straightedge (less than 1/32 inch standard, less than 1/16 inch large format). Use leveling system for greater than 15 inch tiles. Remove excess thinset immediately. Adjust within working time.')
      );
    
    -- Tile Cutting
    ELSIF step_record.step_title ILIKE '%cut%' OR step_record.step_title ILIKE '%trim%' THEN
      beginner_content := jsonb_build_array(
        jsonb_build_object('id', '1', 'type', 'text', 'title', 'Why This Matters', 'content', 'Most tile installations require cutting tiles to fit around edges, corners, and obstacles like pipes or cabinets. Clean, accurate cuts ensure a professional appearance and proper fit. Taking time to measure carefully and cut accurately will save you from wasted tiles and unsightly gaps.'),
        jsonb_build_object('id', '2', 'type', 'text', 'title', 'Step-by-Step Instructions', 'content', '1. Measure the space where the tile needs to fit - measure twice to be sure' || E'\n' || '2. Transfer the measurement to the tile, marking the cut line with a pencil or marker on the tile face (the decorative side)' || E'\n' || '3. For straight cuts: Use a manual tile cutter (score and snap tool)' || E'\n' || '   - Place tile in cutter, align the cutting wheel with your mark' || E'\n' || '   - Press down and drag the wheel across the tile to score it' || E'\n' || '   - Use the handle to snap the tile along the scored line' || E'\n' || '4. For curved cuts or notches: Use a wet saw (rent from hardware store if needed)' || E'\n' || '   - Make sure the water reservoir is full before starting' || E'\n' || '   - Turn on the saw and slowly feed the tile into the blade' || E'\n' || '   - Follow your marked line carefully' || E'\n' || '5. For small cuts or adjustments: Use tile nippers (like pliers for tile)' || E'\n' || '   - Nip away small pieces gradually' || E'\n' || '6. Always cut the tile slightly larger than needed - you can always trim more, but you cannot add material back' || E'\n' || '7. Test fit the cut tile in place before applying thinset' || E'\n' || '8. If the fit is not perfect, make small adjustments with the wet saw or nippers' || E'\n' || '9. Smooth any rough edges with a rubbing stone or sandpaper'),
        jsonb_build_object('id', '3', 'type', 'safety-warning', 'title', 'Critical Safety Warning', 'content', 'ALWAYS wear safety glasses when cutting tiles - flying fragments can cause serious eye injury. When using a wet saw, also wear hearing protection and keep your hands at least 6 inches away from the blade at all times. Never reach over or behind the blade. Ensure the water reservoir is full - a dry blade can overheat and shatter.', 'severity', 'critical')
      );
      intermediate_content := jsonb_build_array(
        jsonb_build_object('id', '1', 'type', 'text', 'title', 'Tile Cutting', 'content', 'Measure accurately (measure twice, cut once). Mark cut line clearly. Use manual cutter for straight cuts, wet saw for curves/notches, nippers for small cuts. Cut slightly oversized, then fine-tune. Test fit before installation. Smooth rough edges.'),
        jsonb_build_object('id', '2', 'type', 'text', 'title', 'Process', 'content', '1. Measure cut dimensions accurately' || E'\n' || '2. Mark cut line on tile face' || E'\n' || '3. Select tool: manual cutter (straight), wet saw (curves/notches), nippers (small)' || E'\n' || '4. Cut slightly larger than needed' || E'\n' || '5. Fine-tune for perfect fit' || E'\n' || '6. Test fit' || E'\n' || '7. Smooth edges if needed'),
        jsonb_build_object('id', '3', 'type', 'safety-warning', 'title', 'Safety', 'content', 'Wear safety glasses and hearing protection. Keep hands 6 inches from blade. Ensure water reservoir full on wet saw.', 'severity', 'critical')
      );
      advanced_content := jsonb_build_array(
        jsonb_build_object('id', '1', 'type', 'text', 'title', 'Tile Cutting', 'content', 'Measure accurately. Mark clearly. Tool selection: manual cutter (straight, less than 18 inches), wet saw (complex/curves), nippers (small), grinder (quick adjustments). Use appropriate blade for tile type. Cut oversized, fine-tune. Smooth edges. Test fit.')
      );
    
    -- Leveling and Alignment
    ELSIF step_record.step_title ILIKE '%level%' OR step_record.step_title ILIKE '%align%' OR step_record.step_title ILIKE '%spacer%' THEN
      beginner_content := jsonb_build_array(
        jsonb_build_object('id', '1', 'type', 'text', 'title', 'Why This Matters', 'content', 'Level tiles create a smooth, professional-looking floor that is safe to walk on. Tiles that are at different heights (called lippage) can be a tripping hazard and look unprofessional. Checking and adjusting tiles while the thinset is still wet ensures you get a perfect result.'),
        jsonb_build_object('id', '2', 'type', 'text', 'title', 'Step-by-Step Instructions', 'content', '1. As you place each tile, place a level across it and the adjacent tiles' || E'\n' || '2. Check the bubble in the level - it should be centered, indicating the tiles are level' || E'\n' || '3. Look for lippage - this is when one tile edge is higher than its neighbor, creating a lip you can feel' || E'\n' || '4. If a tile is too high: Gently tap it down with a rubber mallet or the handle of your trowel' || E'\n' || '5. If a tile is too low: Carefully lift it, add a bit more thinset underneath, and press it back down' || E'\n' || '6. Check alignment - tiles should form straight rows and columns' || E'\n' || '7. Verify spacing - use your spacers consistently and check that grout lines are even' || E'\n' || '8. You have about 15 minutes after placing a tile to make adjustments - after that, the thinset starts to set and tiles become difficult to move' || E'\n' || '9. Work systematically, checking each tile as you place it rather than trying to fix everything at the end'),
        jsonb_build_object('id', '3', 'type', 'text', 'title', 'Tips', 'content', 'A small amount of height difference (less than 1/32 of an inch) is acceptable, but try to keep tiles as level as possible. If you notice a tile is significantly off, fix it immediately while the thinset is still workable.')
      );
      intermediate_content := jsonb_build_array(
        jsonb_build_object('id', '1', 'type', 'text', 'title', 'Leveling and Alignment', 'content', 'Check tile height with level across multiple tiles. Check for lippage (height differences). Adjust within 15 minutes: tap high tiles down, add thinset under low tiles. Verify alignment with straightedge. Check spacer placement for consistent joint width.'),
        jsonb_build_object('id', '2', 'type', 'text', 'title', 'Process', 'content', '1. Check tile height with level' || E'\n' || '2. Check for lippage' || E'\n' || '3. Adjust within 15 minutes' || E'\n' || '4. Tap high tiles down' || E'\n' || '5. Add thinset under low tiles if needed' || E'\n' || '6. Verify alignment' || E'\n' || '7. Check spacer placement')
      );
      advanced_content := jsonb_build_array(
        jsonb_build_object('id', '1', 'type', 'text', 'title', 'Leveling and Alignment', 'content', 'Check plane with long level (4-6 ft). Check lippage with straightedge (less than 1/32 inch standard, less than 1/16 inch large format). Use leveling system for greater than 15 inch tiles. Adjust within working time. Tap high tiles, add thinset under low. Verify alignment and spacing.')
      );
    
    -- Grouting
    ELSIF step_record.step_title ILIKE '%grout%' OR step_record.step_title ILIKE '%fill%joint%' THEN
      beginner_content := jsonb_build_array(
        jsonb_build_object('id', '1', 'type', 'text', 'title', 'Why This Matters', 'content', 'Grout fills the spaces between tiles, protecting the edges from chipping and creating a finished, professional appearance. Properly applied grout also helps prevent water from getting under the tiles. Taking time to apply grout correctly ensures a beautiful, long-lasting finish.'),
        jsonb_build_object('id', '2', 'type', 'text', 'title', 'Step-by-Step Instructions', 'content', '1. Wait at least 24 hours after installing tiles for the thinset to cure - this is very important' || E'\n' || '2. Remove all tile spacers before you start grouting' || E'\n' || '3. Mix the grout according to package directions - usually you add water to the powder and mix until smooth' || E'\n' || '4. The consistency should be like thick peanut butter - not too runny, not too dry' || E'\n' || '5. Let the mixed grout rest (slake) for 10 minutes, then remix it' || E'\n' || '6. Work in small sections (about 10-15 square feet at a time)' || E'\n' || '7. Use a grout float (a rubber tool with a handle) to spread grout over the tiles' || E'\n' || '8. Hold the float at a 45-degree angle and push the grout diagonally across the tiles, forcing it into the joints' || E'\n' || '9. Continue until all joints in your section are completely filled' || E'\n' || '10. Scrape off excess grout with the float held at 45 degrees, pulling it diagonally across the tiles' || E'\n' || '11. Wait 10-15 minutes for the grout to set slightly (it should feel firm but not hard)' || E'\n' || '12. Use a damp (not wet) sponge to wipe the tiles in a circular motion' || E'\n' || '13. Rinse your sponge frequently in clean water - change the water when it gets cloudy' || E'\n' || '14. Make a final pass with a clean, damp sponge to remove any remaining grout haze' || E'\n' || '15. Allow the grout to cure according to package directions (usually 24-48 hours) before walking on it'),
        jsonb_build_object('id', '3', 'type', 'text', 'title', 'Tips', 'content', 'If grout starts to dry on the tiles before you can wipe it, you can use a grout haze remover (available at hardware stores) after it is fully cured. Work in small sections so the grout does not dry before you can clean it.')
      );
      intermediate_content := jsonb_build_array(
        jsonb_build_object('id', '1', 'type', 'text', 'title', 'Grouting', 'content', 'Wait 24-48 hours for thinset cure. Remove spacers. Mix grout to proper consistency (peanut butter-like). Slake 10 minutes, remix. Apply with float at 45 degree angle, force into joints. Remove excess. Wait 10-15 min, wipe with damp sponge. Rinse frequently. Final pass with clean sponge.'),
        jsonb_build_object('id', '2', 'type', 'text', 'title', 'Process', 'content', '1. Wait 24-48 hours' || E'\n' || '2. Remove spacers' || E'\n' || '3. Mix to proper consistency' || E'\n' || '4. Slake 10 min, remix' || E'\n' || '5. Apply with float at 45 degrees' || E'\n' || '6. Force into joints' || E'\n' || '7. Remove excess' || E'\n' || '8. Wait 10-15 min' || E'\n' || '9. Wipe with damp sponge' || E'\n' || '10. Rinse frequently' || E'\n' || '11. Final pass')
      );
      advanced_content := jsonb_build_array(
        jsonb_build_object('id', '1', 'type', 'text', 'title', 'Grouting', 'content', 'Verify thinset cured (24-48 hours). Remove spacers, clean joints. Select grout type (sanded/unsanded by joint width). Mix to spec, slake 10-15 min, remix. Apply with float at 45 degrees, force into joints. Remove excess. Wait 10-20 min, wipe with damp sponge. Rinse frequently. Second pass, final polish. Tool joints if needed.')
      );
    
    -- Sealing
    ELSIF step_record.step_title ILIKE '%seal%' THEN
      beginner_content := jsonb_build_array(
        jsonb_build_object('id', '1', 'type', 'text', 'title', 'Why This Matters', 'content', 'Sealer protects your grout and porous tiles from stains, moisture, and wear. This is especially important in areas like kitchens and bathrooms where spills are common. Sealing makes cleaning easier and helps your tile installation last longer.'),
        jsonb_build_object('id', '2', 'type', 'text', 'title', 'Step-by-Step Instructions', 'content', '1. Wait at least 72 hours (3 days) after grouting for the grout to fully cure - this is essential' || E'\n' || '2. Clean the tile and grout thoroughly - remove any dirt, dust, or residue' || E'\n' || '3. Make sure the surface is completely dry before applying sealer' || E'\n' || '4. Read the sealer product directions carefully - different sealers have different application methods' || E'\n' || '5. Test the sealer on a small, inconspicuous area first to make sure you like how it looks' || E'\n' || '6. Apply the sealer according to product directions:' || E'\n' || '   - Some sealers are applied with a brush' || E'\n' || '   - Some use a roller or spray applicator' || E'\n' || '   - Some are applied with a special applicator bottle' || E'\n' || '7. Work in small sections, applying sealer evenly' || E'\n' || '8. Remove any excess sealer before it dries - sealer that dries on the tile surface can create a hazy appearance' || E'\n' || '9. Allow the sealer to dry completely according to package directions (usually 24-48 hours)' || E'\n' || '10. Some sealers may require a second coat - check the product directions' || E'\n' || '11. Do not walk on or use the floor until the sealer is fully cured'),
        jsonb_build_object('id', '3', 'type', 'text', 'title', 'Tips', 'content', 'Not all tiles need sealing - glazed ceramic tiles typically do not need it, but natural stone and unglazed tiles usually do. Check with your tile supplier if you are unsure. Sealer should be reapplied periodically (usually every 1-3 years depending on use).')
      );
      intermediate_content := jsonb_build_array(
        jsonb_build_object('id', '1', 'type', 'text', 'title', 'Sealing', 'content', 'Wait 72 hours minimum after grouting. Clean tile and grout thoroughly. Ensure surface is dry. Select appropriate sealer type for tile/grout. Apply according to manufacturer instructions. Remove excess before drying. Allow proper cure time. Apply second coat if recommended.'),
        jsonb_build_object('id', '2', 'type', 'text', 'title', 'Process', 'content', '1. Wait 72 hours' || E'\n' || '2. Clean thoroughly' || E'\n' || '3. Ensure dry' || E'\n' || '4. Select sealer type' || E'\n' || '5. Test on small area' || E'\n' || '6. Apply evenly' || E'\n' || '7. Remove excess' || E'\n' || '8. Allow cure time' || E'\n' || '9. Second coat if needed')
      );
      advanced_content := jsonb_build_array(
        jsonb_build_object('id', '1', 'type', 'text', 'title', 'Sealing', 'content', 'Verify grout cured (72 hours minimum, longer in high humidity). Clean thoroughly, remove residue. Test sealer. Select type: penetrating (porous tiles), surface (glazed), grout sealer. Apply to spec. Remove excess. Cure 24-48 hours. Second coat if recommended. Verify with water drop test.')
      );
    
    -- Default content for any other steps
    ELSE
      beginner_content := jsonb_build_array(
        jsonb_build_object('id', '1', 'type', 'text', 'title', 'Why This Matters', 'content', 'Each step in the tile installation process builds on the previous one. Taking time to complete this step correctly ensures the quality and longevity of your tile installation.'),
        jsonb_build_object('id', '2', 'type', 'text', 'title', 'Step-by-Step Instructions', 'content', '1. Read all instructions for this step before starting' || E'\n' || '2. Gather all necessary tools and materials listed' || E'\n' || '3. Prepare your work area - make sure you have enough space and good lighting' || E'\n' || '4. Follow the steps in order, taking your time with each one' || E'\n' || '5. Check your work frequently as you go' || E'\n' || '6. If something does not look right, stop and fix it before continuing' || E'\n' || '7. Allow proper cure or dry time if specified before moving to the next step' || E'\n' || '8. Clean up your work area when finished')
      );
      intermediate_content := jsonb_build_array(
        jsonb_build_object('id', '1', 'type', 'text', 'title', 'Instructions', 'content', 'Review requirements and specifications. Prepare work area and gather materials. Follow proper sequence and technique. Verify quality at each stage. Allow appropriate cure/dry time.'),
        jsonb_build_object('id', '2', 'type', 'text', 'title', 'Process', 'content', '1. Review requirements' || E'\n' || '2. Prepare work area' || E'\n' || '3. Gather materials' || E'\n' || '4. Follow sequence' || E'\n' || '5. Verify quality' || E'\n' || '6. Allow cure/dry time')
      );
      advanced_content := jsonb_build_array(
        jsonb_build_object('id', '1', 'type', 'text', 'title', 'Execution', 'content', 'Review specs. Verify materials/tools. Prepare work area. Execute with proper technique. Maintain quality control. Verify compliance. Allow proper cure/dry time.')
      );
    END IF;
    
    -- Insert beginner level instruction
    INSERT INTO step_instructions (template_step_id, instruction_level, content)
    VALUES (step_record.id, 'beginner', beginner_content)
    ON CONFLICT (template_step_id, instruction_level)
    DO UPDATE SET content = EXCLUDED.content, updated_at = NOW();
    
    -- Insert intermediate level instruction
    INSERT INTO step_instructions (template_step_id, instruction_level, content)
    VALUES (step_record.id, 'intermediate', intermediate_content)
    ON CONFLICT (template_step_id, instruction_level)
    DO UPDATE SET content = EXCLUDED.content, updated_at = NOW();
    
    -- Insert advanced level instruction
    INSERT INTO step_instructions (template_step_id, instruction_level, content)
    VALUES (step_record.id, 'advanced', advanced_content)
    ON CONFLICT (template_step_id, instruction_level)
    DO UPDATE SET content = EXCLUDED.content, updated_at = NOW();
  END LOOP;
  
  RAISE NOTICE 'Step instructions added for Tile Flooring Installation project';
END $$;
