-- =====================================================
-- CREATE TILE FLOORING INSTALLATION PROJECT
-- Complete project with 3 phases, operations, and steps
-- Includes beginner/intermediate/advanced content
-- =====================================================

DO $$
DECLARE
  v_project_id UUID;
  v_user_id UUID;
  
  -- Phase IDs
  v_prep_phase_id UUID;
  v_install_phase_id UUID;
  v_finish_phase_id UUID;
  
  -- Operation IDs
  v_uncoupling_op_id UUID;
  v_concrete_board_op_id UUID;
  v_cutting_installing_op_id UUID;
  v_grout_op_id UUID;
BEGIN
  -- Get admin user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'zackquinn6@gmail.com';
  
  -- =====================================================
  -- CREATE PROJECT
  -- =====================================================
  
  INSERT INTO projects (
    user_id,
    name,
    description,
    icon,
    difficulty_level,
    estimated_time,
    estimated_cost,
    category,
    visibility,
    is_template,
    is_standard,
    tags,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    'Tile Flooring Installation',
    'Complete ceramic or porcelain tile flooring installation including subfloor preparation, cutting and setting tiles, and grouting.',
    'grid-3x3',
    'intermediate',
    '2-4 days',
    '$800-2500',
    'flooring',
    'public',
    true,
    false,
    ARRAY['flooring', 'tile', 'diy', 'bathroom', 'kitchen'],
    NOW(),
    NOW()
  )
  RETURNING id INTO v_project_id;
  
  RAISE NOTICE 'Created Tile Flooring project: %', v_project_id;
  
  -- =====================================================
  -- LINK STANDARD FOUNDATION PHASES
  -- =====================================================
  
  -- Link Kickoff, Plan, Ordering, Close from standard
  INSERT INTO project_phases (
    project_id, name, description, display_order, position_rule, position_value,
    is_standard, is_linked, source_project_id, source_project_name, created_at, updated_at
  )
  SELECT 
    v_project_id,
    name,
    '[LINKED] Incorporated from Standard Foundation',
    display_order,
    position_rule,
    position_value,
    is_standard,
    true, -- Dynamically linked
    (SELECT id FROM projects WHERE is_standard = true),
    'Standard Foundation',
    NOW(),
    NOW()
  FROM project_phases
  WHERE project_id = (SELECT id FROM projects WHERE is_standard = true);
  
  RAISE NOTICE 'Linked % standard phases', (
    SELECT COUNT(*) FROM project_phases WHERE is_standard = true AND project_id = (SELECT id FROM projects WHERE is_standard = true)
  );
  
  -- =====================================================
  -- PHASE 1: PREP (position: 3rd)
  -- =====================================================
  
  INSERT INTO project_phases (
    project_id,
    name,
    description,
    display_order,
    position_rule,
    position_value,
    is_standard,
    is_linked,
    created_at,
    updated_at
  ) VALUES (
    v_project_id,
    'Prep',
    'Subfloor preparation and underlayment installation',
    3,
    'nth',
    3,
    false,
    false,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_prep_phase_id;
  
  -- =====================================================
  -- PREP - OPERATION 1: Uncoupling Membrane
  -- =====================================================
  
  INSERT INTO phase_operations (
    phase_id,
    operation_name,
    operation_description,
    display_order,
    estimated_time,
    flow_type,
    created_at,
    updated_at
  ) VALUES (
    v_prep_phase_id,
    'Install Uncoupling Membrane',
    'Install crack isolation membrane to prevent tile damage from substrate movement',
    1,
    '4-6 hours',
    'prime',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_uncoupling_op_id;
  
  -- Step 1: Clean and Inspect Subfloor
  INSERT INTO operation_steps (
    operation_id,
    step_title,
    description,
    content_type,
    content,
    display_order,
    materials,
    tools,
    outputs,
    created_at,
    updated_at
  ) VALUES (
    v_uncoupling_op_id,
    'Clean and Inspect Subfloor',
    'Prepare subfloor surface for membrane installation',
    'text',
    E'**BEGINNER:** Sweep and vacuum the entire floor thoroughly. Remove all debris, dust, and old flooring materials. Check that the floor is level by placing a long straight edge in multiple directions. Look for any loose boards, squeaks, or damage. The subfloor must be clean, dry, flat (within 1/8" over 10 feet), and structurally sound before proceeding.\n\n**INTERMEDIATE:** Clean the subfloor completely using a shop vacuum. Inspect for deflection by walking across the floor - any movement indicates insufficient support. Use a 6-10ft straight edge to check for high and low spots. Mark areas that need attention. Ensure moisture content is below 12% using a moisture meter. Tighten any loose screws and add additional fasteners if needed to eliminate squeaks.\n\n**ADVANCED:** Perform comprehensive subfloor assessment including deflection testing (L/360 maximum for ceramic, L/720 for large format). Use precision leveling tools and laser level to map the floor plane. Identify and address joist spacing issues. Check for previous water damage, rot, or structural concerns. Document moisture readings and ensure substrate meets TCNA and ANSI standards. Address any substrate issues before membrane installation.',
    1,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('name', 'Clean subfloor ready for membrane', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'Flatness verified (1/8" over 10ft)', 'type', 'measurement', 'required', true),
      jsonb_build_object('name', 'Moisture level documented', 'type', 'data', 'required', false)
    ),
    NOW(),
    NOW()
  );
  
  -- Step 2: Apply Thinset for Membrane
  INSERT INTO operation_steps (
    operation_id, step_title, description, content_type, content, display_order,
    materials, tools, outputs, created_at, updated_at
  ) VALUES (
    v_uncoupling_op_id,
    'Apply Thinset for Membrane',
    'Spread modified thinset mortar for membrane adhesion',
    'text',
    E'**BEGINNER:** Mix modified thinset mortar according to package directions using a drill and paddle mixer. Let it slake (rest) for 10 minutes, then remix. Pour some thinset on the floor and spread it using a 1/4" x 3/16" square notch trowel. Hold the trowel at a 45-degree angle to create consistent ridges. Work in 3-4 foot sections so the thinset doesn\'t dry before you lay the membrane.\n\n**INTERMEDIATE:** Mix thinset to a peanut butter consistency - should stand in peaks but be spreadable. Apply thinset using proper troweling technique: flat side to spread, notched side at 45° to create ridges. Ensure 100% coverage with no bare spots. Ridge direction should be consistent (all same direction). Work systematically from one corner, maintaining a wet edge. Time your sections - you have about 15-20 minutes of open time before skinning occurs.\n\n**ADVANCED:** Select appropriate thinset for your membrane system (check manufacturer specs - some require unmodified). Mix to proper consistency (slump test: mound should hold shape but flatten slightly). Apply using manufacturer-specified notch size - critical for proper bonding. Maintain consistent ridge height and direction. Monitor ambient conditions (temperature 50-100°F, humidity considerations). Collapse ridges to achieve >95% coverage. Time application to substrate and membrane open times. Avoid over-troweling which can skin the thinset.',
    2,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('name', 'Thinset spread with proper coverage', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'Consistent ridge pattern achieved', 'type', 'quality', 'required', true)
    ),
    NOW(), NOW()
  );
  
  -- Step 3: Install Uncoupling Membrane
  INSERT INTO operation_steps (
    operation_id, step_title, description, content_type, content, display_order,
    materials, tools, outputs, created_at, updated_at
  ) VALUES (
    v_uncoupling_op_id,
    'Install Uncoupling Membrane',
    'Lay and embed membrane into thinset',
    'text',
    E'**BEGINNER:** Unroll the uncoupling membrane and cut it to size with a utility knife. Lay it carefully into the wet thinset, printed side up (waffle/grid pattern facing up). Use a grout float or roller to press it down firmly, working from the center outward to remove air bubbles. Make sure the entire membrane is embedded into the thinset with no voids underneath. Overlap seams by at least 2 inches. Let it cure for 24 hours before tiling.\n\n**INTERMEDIATE:** Plan membrane layout to minimize seams and avoid small pieces. Cut membrane with sharp utility knife, making clean straight cuts. Lay membrane immediately after thinset application while ridges are fresh. Use proper embedding technique: flat trowel or roller with firm, even pressure. Ensure complete contact - run hand over surface to detect any hollow spots. At seams, overlap per manufacturer specs (typically 2") and stagger seams from substrate joints. At walls, turn membrane up 2-3 inches. Use proper transitions at doorways. Verify anchor points are fully embedded.\n\n**ADVANCED:** Design membrane layout considering tile layout, seam placement away from high-stress areas, and movement joints. Cut membrane precisely for complex spaces including penetrations. Apply with attention to manufacturer\'s specific requirements (Schluter DITRA, Wedi, etc.). Achieve full mechanical bond through proper embedding - listen for consistent sound when tapping. At transitions, use manufacturer-approved methods (curb adapters, pipe seals). Ensure proper integration with waterproofing systems if applicable. Verify flatness after installation - membrane surface must maintain substrate tolerances. Document installation with photos for warranty.',
    3,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('name', 'Membrane fully embedded and bonded', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'No air voids or hollow spots', 'type', 'quality', 'required', true),
      jsonb_build_object('name', 'Seams properly overlapped', 'type', 'quality', 'required', true),
      jsonb_build_object('name', 'Installation photos for warranty', 'type', 'photo', 'required', false)
    ),
    NOW(), NOW()
  );
  
  -- =====================================================
  -- PREP - OPERATION 2: Concrete Backer Board
  -- =====================================================
  
  INSERT INTO phase_operations (
    phase_id,
    operation_name,
    operation_description,
    display_order,
    estimated_time,
    flow_type,
    created_at,
    updated_at
  ) VALUES (
    v_prep_phase_id,
    'Install Concrete Backer Board',
    'Install cement board underlayment for tile support (alternative to membrane)',
    2,
    '6-8 hours',
    'alternative',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_concrete_board_op_id;
  
  -- Step 1: Cut Backer Board
  INSERT INTO operation_steps (
    operation_id, step_title, description, content_type, content, display_order,
    materials, tools, outputs, created_at, updated_at
  ) VALUES (
    v_concrete_board_op_id,
    'Cut Backer Board to Size',
    'Measure and cut cement board panels',
    'text',
    E'**BEGINNER:** Measure each area carefully and mark cut lines on the cement board with a pencil. Score the board deeply along the cut line using a carbide scoring knife, applying firm pressure and making several passes. Snap the board along the scored line like drywall. For small cuts or curves, use a jigsaw with a carbide blade. Always wear a dust mask and eye protection - cement board creates a lot of dust.\n\n**INTERMEDIATE:** Plan layout to minimize cuts and avoid small pieces (<8" square). Offset seams from subfloor seams by at least 2". Score board using T-square or straight edge as guide. Make deep score (multiple passes) then snap by lifting one side. For cutouts (pipes, vents), drill corner holes then score and snap, or use jigsaw. Cut mesh on back side with utility knife. Work in ventilated area with proper PPE (N95 mask minimum - silica dust hazard).\n\n**ADVANCED:** Design optimal layout pattern considering tile layout, minimizing waste, and structural requirements (seams offset 2-3" from subfloor joints, perpendicular to joists). Use proper scoring technique achieving 70% depth penetration for clean snaps. For precision cuts, use angle grinder with diamond blade (wet cut to minimize dust). Create templates for complex cuts. Bevel cut edges for tight seams. Plan for movement joints per TCNA guidelines. Consider board thickness (1/2" vs 1/4") based on application and deflection requirements.',
    1,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('name', 'Backer boards cut to fit layout', 'type', 'material', 'required', true),
      jsonb_build_object('name', 'Clean cuts with minimal waste', 'type', 'quality', 'required', true)
    ),
    NOW(), NOW()
  );
  
  -- Step 2: Attach Backer Board
  INSERT INTO operation_steps (
    operation_id, step_title, description, content_type, content, display_order,
    materials, tools, outputs, created_at, updated_at
  ) VALUES (
    v_concrete_board_op_id,
    'Fasten Backer Board to Subfloor',
    'Secure cement board using appropriate fasteners',
    'text',
    E'**BEGINNER:** Apply thinset to the subfloor using the flat side of a trowel in a thin layer. Lay the backer board on top and press down firmly. Screw the board to the subfloor using special backer board screws every 8 inches along the edges and 6 inches in the field (middle area). Drive screws just flush with the surface - not countersunk. Leave a 1/8" gap between boards and 1/4" gap at walls for expansion.\n\n**INTERMEDIATE:** Apply appropriate thinset (modified for wood substrates, unmodified for concrete) in thin layer for full contact. Position boards with 1/8" gaps at seams, 1/4" at perimeter. Use 1-1/4" to 1-5/8" backer board screws (length based on substrate). Fasten in grid pattern: 8" on center at edges, 6" in field, minimum 3/8" from edges. Screws should be flush or slightly below surface. Ensure flat installation - no rocking or gaps under board. At seams, offset from subfloor joints. Support all edges - use shims if needed.\n\n**ADVANCED:** Select proper substrate preparation (thinset embedment vs mechanical fastening based on deflection and substrate type). Install per manufacturer and TCNA specifications. Achieve full mortar contact especially over wood substrates. Use corrosion-resistant fasteners appropriate for environment (wet areas require special fasteners). Install sealing strip or fiberglass tape at seams if required by system. Offset boards in running bond pattern. Create isolation/expansion joints at doorways and perimeter per TCNA EJ171. Verify final surface is within flatness tolerance (ANSI 1/8" in 10ft). Load-test for hollow sounds indicating voids.',
    2,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('name', 'Backer board securely fastened', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'Surface flat and level', 'type', 'quality', 'required', true),
      jsonb_build_object('name', 'Proper gaps maintained', 'type', 'measurement', 'required', true)
    ),
    NOW(), NOW()
  );
  
  -- Step 3: Tape and Seal Seams
  INSERT INTO operation_steps (
    operation_id, step_title, description, content_type, content, display_order,
    materials, tools, outputs, created_at, updated_at
  ) VALUES (
    v_concrete_board_op_id,
    'Tape and Seal Seams',
    'Reinforce joints with mesh tape and thinset',
    'text',
    E'**BEGINNER:** Apply fiberglass mesh tape over all seams between backer board panels. Mix a small batch of thinset and use a 4-6 inch taping knife to spread it over the tape, pressing firmly to embed the tape completely. Smooth it out and feather the edges. Also cover all screw heads with thinset. Let dry for 24 hours. The surface should be smooth and flat when done.\n\n**INTERMEDIATE:** Apply alkali-resistant fiberglass mesh tape centered over seams. Mix thinset to slightly looser consistency for taping. Apply first coat of thinset over tape using 6" knife, embedding tape fully. Remove excess leaving thin layer. Apply second coat after first dries (2-4 hours) to build flat surface. Feather edges 6-8" wide. Skim coat screw heads. Check for smoothness - sand any high spots after curing. Total cure time 24 hours minimum before tiling.\n\n**ADVANCED:** Use manufacturer-specified seam treatment (some systems use specific tapes or sealants). For Schluter systems, may require Kerdi band. Apply tape without wrinkles or bubbles. Thinset application: first pass embeds and fills, second pass (after initial set) creates smooth surface. Achieve flat transition across seams - critical for lippage control. For wet areas, integrate waterproofing system (Kerdi membrane, RedGard, etc.) per manufacturer specifications. Cure thinset completely (typically 24 hours, verify with humidity and temperature). Skim coat entire surface if needed for lippage prevention with large format tiles.',
    3,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('name', 'All seams taped and sealed', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'Smooth flat surface achieved', 'type', 'quality', 'required', true),
      jsonb_build_object('name', 'Waterproofing completed (if wet area)', 'type', 'condition', 'required', false)
    ),
    NOW(), NOW()
  );
  
  -- =====================================================
  -- PHASE 2: INSTALL (position: 4th)
  -- =====================================================
  
  INSERT INTO project_phases (
    project_id,
    name,
    description,
    display_order,
    position_rule,
    position_value,
    is_standard,
    is_linked,
    created_at,
    updated_at
  ) VALUES (
    v_project_id,
    'Install',
    'Cut and install tiles',
    4,
    'nth',
    4,
    false,
    false,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_install_phase_id;
  
  -- =====================================================
  -- INSTALL - OPERATION 1: Cutting and Installing
  -- =====================================================
  
  INSERT INTO phase_operations (
    phase_id,
    operation_name,
    operation_description,
    display_order,
    estimated_time,
    flow_type,
    created_at,
    updated_at
  ) VALUES (
    v_install_phase_id,
    'Cut and Set Tiles',
    'Measure, cut, and install tiles with proper spacing and alignment',
    1,
    '1-2 days',
    'prime',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_cutting_installing_op_id;
  
  -- Step 1: Plan Tile Layout
  INSERT INTO operation_steps (
    operation_id, step_title, description, content_type, content, display_order,
    materials, tools, outputs, created_at, updated_at
  ) VALUES (
    v_cutting_installing_op_id,
    'Plan Tile Layout',
    'Design tile pattern and locate reference lines',
    'text',
    E'**BEGINNER:** Find the center of the room by measuring and marking the middle point of each wall. Snap chalk lines connecting opposite center points to create a cross. Dry lay tiles along both lines to see how they\'ll look. Adjust the lines if needed to avoid small cuts (<half tile) at walls. You want the layout to look balanced with similar-sized cuts on opposite walls. Mark your final reference lines clearly.\n\n**INTERMEDIATE:** Measure room and calculate tile layout considering grout joint width. Determine if centering produces acceptable cuts (>1/2 tile preferred, >1/3 tile minimum). For rectangular tiles, determine orientation (parallel or diagonal to main wall). Establish perpendicular reference lines using 3-4-5 triangle method for accuracy. Dry lay to verify pattern, check transitions at doorways, and identify problem areas. Adjust reference lines to optimize layout. Consider sight lines and focal points. Plan cuts to hide at less visible areas (under cabinets, behind door swings).\n\n**ADVANCED:** Perform comprehensive layout design considering: tile size and format, grout joint width (minimum per tile size), room geometry and out-of-square conditions, visual balance and symmetry, transitions and thresholds, and focal points. Use laser level for reference lines. Account for tile warpage in layout (lippage management). Plan for movement joints per TCNA specifications (max 25ft spacing, at transitions, over control joints). Design pattern for large format tiles (>15") with offset limitations. Create CAD layout if complex. Calculate exact tile needs including overage for cuts and breakage.',
    1,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('name', 'Layout plan with reference lines', 'type', 'plan', 'required', true),
      jsonb_build_object('name', 'Cut sizes verified acceptable', 'type', 'measurement', 'required', true),
      jsonb_build_object('name', 'Tile quantity calculated', 'type', 'data', 'required', true)
    ),
    NOW(), NOW()
  );
  
  -- Step 2: Cut Tiles
  INSERT INTO operation_steps (
    operation_id, step_title, description, content_type, content, display_order,
    materials, tools, outputs, created_at, updated_at
  ) VALUES (
    v_cutting_installing_op_id,
    'Measure and Cut Tiles',
    'Cut tiles for edges, corners, and obstacles',
    'text',
    E'**BEGINNER:** Measure the gap where each cut tile will go. Mark the tile on the glazed side with a pencil or marker. For straight cuts, use a tile cutter (snap cutter): place tile in cutter, align cutting wheel on mark, press down and score firmly in one smooth motion, then press the handle to snap the tile. For curves or holes, use a wet saw. Always wear safety glasses. Cut tile should be smooth with no chips on the edge that will be visible.\n\n**INTERMEDIATE:** Measure cuts accounting for grout joint spacing. Mark tiles precisely on face. Use manual tile cutter for straight cuts: score once with firm even pressure (don\'t score multiple times). Listen for continuous grinding sound indicating good score. Snap decisively. For cuts near edge (<1"), use wet saw instead. Wet saw technique: fence for straight cuts, freehand for curves, multiple relief cuts for L-shapes. For holes: drill with tile bit, then cut from multiple angles. Smooth cut edges with rubbing stone. Test fit cuts before setting.\n\n**ADVANCED:** Execute precision cutting plan minimizing lippage and aesthetic issues. Tile cutter: score shallow V-groove in single pass, break using proper leverage technique (weak point at score). Wet saw: use continuous rim diamond blade, proper feed rate (no forcing), support large tiles. For notches and complex cuts: nibbling technique, relief cuts, or CNC wet saw. Polish cut edges that will be exposed. Back-butter cut tiles for improved bond on small pieces. For rectified tiles, maintain factory edges where possible. Create templates for repetitive complex cuts. Verify all cuts for size, square, and quality before setting.',
    2,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('name', 'All tiles cut to size', 'type', 'material', 'required', true),
      jsonb_build_object('name', 'Clean cuts without chips', 'type', 'quality', 'required', true),
      jsonb_build_object('name', 'Cuts test-fitted successfully', 'type', 'quality', 'required', false)
    ),
    NOW(), NOW()
  );
  
  -- Step 3: Mix and Apply Thinset
  INSERT INTO operation_steps (
    operation_id, step_title, description, content_type, content, display_order,
    materials, tools, outputs, created_at, updated_at
  ) VALUES (
    v_cutting_installing_op_id,
    'Apply Thinset Mortar',
    'Spread mortar for tile adhesion',
    'text',
    E'**BEGINNER:** Mix thinset mortar according to the package directions using a drill with mixing paddle. Mix until smooth like thick peanut butter with no lumps. Let it rest for 10 minutes (slaking), then mix again briefly. Spread thinset on a small area (3-4 square feet) using a notched trowel. Hold trowel at 45-degree angle and create ridges all going the same direction. Work in small sections - the thinset will start to dry after 15-20 minutes.\n\n**INTERMEDIATE:** Select appropriate thinset (modified for most applications, large-tile thinset for tiles >15", unmodified for special cases). Mix to proper consistency (slump test: stands in peaks but spreadable). Allow slaking period for polymer activation. Apply thinset using manufacturer-specified notch size (1/4x1/4" for most floor tiles, larger for big tiles). Spread with flat side, comb with notched side at 45°. Maintain consistent ridge height and direction. Spread only area you can tile in 15 minutes. Periodically check coverage by pulling up a tile - should have >85% contact.\n\n**ADVANCED:** Specify thinset based on tile type, size, substrate, and installation requirements (ANSI 118 classifications). Mix to optimal consistency for application method and environmental conditions. Monitor pot life and adjust batch sizes. Apply thinset using technique appropriate for tile: back-buttering large format tiles (>15"), directional troweling for optimal coverage, proper notch size per tile dimension and back-pattern. Achieve >95% coverage on dry areas, 100% on wet areas. Manage open time and working time based on conditions. Verify bond strength through periodic pull tests. Maintain flatness within ANSI A108.02 tolerances.',
    3,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('name', 'Thinset applied with proper ridge pattern', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'Coverage verified >85%', 'type', 'quality', 'required', true)
    ),
    NOW(), NOW()
  );
  
  -- Step 4: Set Tiles
  INSERT INTO operation_steps (
    operation_id, step_title, description, content_type, content, display_order,
    materials, tools, outputs, created_at, updated_at
  ) VALUES (
    v_cutting_installing_op_id,
    'Place and Level Tiles',
    'Install tiles with consistent spacing and alignment',
    'text',
    E'**BEGINNER:** Place the first tile at the intersection of your reference lines. Press down firmly with a slight twisting motion to collapse the thinset ridges. Place tile spacers (typically 1/16" or 1/8") at each corner to maintain even grout joints. Continue placing tiles working outward from your starting point. Use a level frequently to make sure tiles aren\'t tilting. If a tile is too high, press down more. If too low, pull it up and add more thinset. Keep the grout lines straight by using spacers and checking alignment with a straight edge.\n\n**INTERMEDIATE:** Begin at established reference point and work systematically. Place each tile using controlled pressure to embed in thinset (not sliding). Use spacers appropriate for tile type (1/16" rectified, 1/8-3/16" standard floor tile). Maintain running bond offset (typically 1/3 offset for rectangular, avoid >33% offset). Check lippage continuously - adjacent tiles should be flush within 1/32". Use leveling system (clips/wedges) for lippage control if needed. Verify alignment every 3-4 tiles using straight edge. Beat-in tiles with rubber mallet and beating block if needed. Clean squeeze-out from joints immediately. Work in sections, completing each before moving on.\n\n**ADVANCED:** Execute installation per layout plan maintaining ANSI lippage requirements (≤1/16" + tile warpage allowance). Use leveling system appropriate for tile type and size. Employ proper setting technique: adequate pressure to achieve full embedment and specified mortar bed thickness, beating-in for large format tiles to eliminate voids. Monitor thinset consistency and refresh as needed. Manage grout joint width per TCNA (minimum 1/16" for rectified, 1/8" for floor tiles, larger for handmade). Control lippage through technique, leveling systems, and proper mortar selection. Verify bonding through periodic spot checks. Photo-document pattern alignment at critical areas. Allow proper cure time before grouting (typically 24-48 hours).',
    4,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('name', 'All tiles installed and level', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'Lippage within tolerance (<1/16")', 'type', 'measurement', 'required', true),
      jsonb_build_object('name', 'Pattern alignment verified', 'type', 'quality', 'required', true),
      jsonb_build_object('name', 'Installation photos taken', 'type', 'photo', 'required', false)
    ),
    NOW(), NOW()
  );
  
  -- =====================================================
  -- PHASE 3: FINISH (position: 5th)
  -- =====================================================
  
  INSERT INTO project_phases (
    project_id,
    name,
    description,
    display_order,
    position_rule,
    position_value,
    is_standard,
    is_linked,
    created_at,
    updated_at
  ) VALUES (
    v_project_id,
    'Finish',
    'Grout installation and final cleanup',
    5,
    'nth',
    5,
    false,
    false,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_finish_phase_id;
  
  -- =====================================================
  -- FINISH - OPERATION 1: Grout Installation
  -- =====================================================
  
  INSERT INTO phase_operations (
    phase_id,
    operation_name,
    operation_description,
    display_order,
    estimated_time,
    flow_type,
    created_at,
    updated_at
  ) VALUES (
    v_finish_phase_id,
    'Grout Installation',
    'Mix and apply grout, clean tiles, and seal',
    1,
    '4-8 hours',
    'prime',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_grout_op_id;
  
  -- Step 1: Prepare for Grouting
  INSERT INTO operation_steps (
    operation_id, step_title, description, content_type, content, display_order,
    materials, tools, outputs, created_at, updated_at
  ) VALUES (
    v_grout_op_id,
    'Prepare Joints for Grout',
    'Clean joints and verify thinset cure',
    'text',
    E'**BEGINNER:** Wait at least 24 hours after installing tiles before grouting. Remove all tile spacers by pulling them straight out (don\'t pry sideways). Use a utility knife or grout removal tool to scrape out any dried thinset from the joints - the joints should be empty to at least 2/3 of the tile thickness. Vacuum all joints thoroughly to remove dust and debris. Wipe tiles with damp sponge to remove any dust or film.\n\n**INTERMEDIATE:** Verify thinset cure (typically 24-48 hours, check manufacturer specs and environmental conditions). Remove spacers and clean joints to proper depth (2/3 tile thickness minimum for floors). Use margin trowel or grout saw to remove thinset squeeze-out. Vacuum joints with brush attachment then blow out with compressed air. For porous tiles, test if sealing is needed before grouting (water drop test). If tile requires sealing, apply penetrating sealer and allow to dry completely. Dampen joints slightly with sponge if using cementitious grout (not for epoxy).\n\n**ADVANCED:** Confirm thinset cure through moisture testing and physical inspection. Clean joints to specification depth ensuring no voids or weak thinset. For rectified tiles with tight joints (1/16"), verify joints are uniform and free of obstruction. Pre-seal porous stone or unglazed tiles with appropriate penetrating sealer (allow complete drying per sealer specs before grouting). For wet areas, verify waterproofing integrity. Check that movement joints are clear and will not be grouted. Prep transition areas. Ensure ambient conditions are within grout manufacturer specs (typically 50-100°F). Have proper ventilation for epoxy grout applications.',
    1,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('name', 'All spacers removed', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'Joints clean and empty', 'type', 'quality', 'required', true),
      jsonb_build_object('name', 'Thinset fully cured (24-48hrs)', 'type', 'time', 'required', true)
    ),
    NOW(), NOW()
  );
  
  -- Step 2: Mix and Apply Grout
  INSERT INTO operation_steps (
    operation_id, step_title, description, content_type, content, display_order,
    materials, tools, outputs, created_at, updated_at
  ) VALUES (
    v_grout_op_id,
    'Apply Grout to Joints',
    'Spread and pack grout into tile joints',
    'text',
    E'**BEGINNER:** Mix grout according to package directions until it reaches a thick, smooth consistency like toothpaste. Let it slake for 10 minutes, then stir (don\'t remix). Pour grout onto tiles and use a rubber grout float held at 45-degree angle to spread it across the tiles, pushing down firmly to pack grout into joints. Work diagonally across tiles to avoid pulling grout out of joints. Spread grout over 3-4 square feet at a time. Pack joints completely full with no voids or gaps.\n\n**INTERMEDIATE:** Mix grout to manufacturer specifications (consistency should just hold a trowel mark). Slake per instructions (typically 10-15 minutes for cementitious, none for epoxy). Apply grout using hard rubber float at 45° angle diagonal to joints. Use firm pressure to pack joints completely. Make multiple passes in different directions ensuring full packing. Screed excess at 90° to joints. Work in manageable sections (25-50 sq ft depending on conditions and grout setup time). For epoxy grout, work in smaller sections (6-10 sq ft) due to fast setup. Maintain consistent joint depth and density.\n\n**ADVANCED:** Select and mix appropriate grout type (sanded for >1/8" joints, unsanded for smaller, epoxy for stain resistance/wet areas). Achieve optimal consistency for application - adjust water carefully (excess weakens grout). For rapid-setting grouts, adjust section size to working time. Application technique: multiple directional passes for complete filling, verify full compaction through resistance feel, maintain uniform joint depth. For large format tiles, consider grout joint depth and compaction method. Remove excess efficiently to minimize cleanup. For epoxy grout, follow specialized application procedures including proper mixing ratios, working time management, and residue removal techniques. Document color batch numbers for future touch-ups.',
    2,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('name', 'All joints completely filled', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'Grout packed firmly with no voids', 'type', 'quality', 'required', true),
      jsonb_build_object('name', 'Consistent joint depth achieved', 'type', 'quality', 'required', true)
    ),
    NOW(), NOW()
  );
  
  -- Step 3: Clean and Finish
  INSERT INTO operation_steps (
    operation_id, step_title, description, content_type, content, display_order,
    materials, tools, outputs, created_at, updated_at
  ) VALUES (
    v_grout_op_id,
    'Clean Tiles and Finish Grout',
    'Remove grout haze and achieve professional finish',
    'text',
    E'**BEGINNER:** Wait 15-20 minutes after grouting for grout to firm up slightly. Using a damp sponge and bucket of clean water, wipe tiles in circular motions to remove excess grout. Rinse sponge frequently and change water often. Wipe diagonally across tiles to avoid pulling grout from joints. Shape joints using the sponge edge to create smooth, slightly concave joints. Let dry 1-2 hours, then buff off hazy residue with clean dry cloth. Wait 48-72 hours, then apply grout sealer according to package directions.\n\n**INTERMEDIATE:** Monitor grout setup (typically 15-30 minutes depending on conditions - should be firm but still workable). Initial cleanup: use barely damp sponge in circular motion to remove bulk of excess, rinse frequently. Second pass after 10-15 minutes: use clean damp sponge in straight lines to shape joints and remove residue. Avoid over-wetting which weakens grout. Tool joints if needed for uniform appearance. Allow initial cure (2-3 hours), then remove haze with microfiber cloth. For stubborn haze, use dilute vinegar solution (only after 48 hour cure). Cure grout per manufacturer (usually 48-72 hours). Apply penetrating grout sealer using applicator bottle or brush, removing excess. Two coats recommended.\n\n**ADVANCED:** Time cleanup to grout setup phase (thumb-print test - should indent slightly but not smear). Three-pass cleaning system: 1) bulk removal with wrung sponge (minimal water), 2) shaping and smoothing joints (10-15 min later), 3) final haze removal (30 min later) with barely damp sponge/cloth. Maintain consistent joint profile throughout. For epoxy grout, use specialized cleaning procedure with specific solutions within limited timeframe. Cure grout properly considering ambient conditions (may need 7 days in cold weather). Seal grout with high-quality penetrating sealer (Miracle, Aqua Mix, etc.) - not needed for epoxy grout. Apply sealer carefully avoiding tile surface. For natural stone, seal tiles and joints. Allow full cure before exposing to moisture (72 hours minimum, 7-10 days for full cure).',
    3,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('name', 'Tiles clean with no grout haze', 'type', 'quality', 'required', true),
      jsonb_build_object('name', 'Joints smooth and uniform', 'type', 'quality', 'required', true),
      jsonb_build_object('name', 'Grout sealer applied', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'Final inspection passed', 'type', 'quality', 'required', true)
    ),
    NOW(), NOW()
  );
  
  -- =====================================================
  -- UPDATE PROJECT PHASES JSONB
  -- =====================================================
  
  -- Rebuild phases JSONB from relational data for this project
  UPDATE projects
  SET phases = (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', pp.id,
        'name', pp.name,
        'description', pp.description,
        'isStandard', pp.is_standard,
        'isLinked', pp.is_linked,
        'sourceProjectId', pp.source_project_id,
        'sourceProjectName', pp.source_project_name,
        'phaseOrderNumber', CASE
          WHEN pp.position_rule = 'first' THEN to_jsonb('first'::text)
          WHEN pp.position_rule = 'last' THEN to_jsonb('last'::text)
          WHEN pp.position_rule = 'nth' THEN to_jsonb(pp.position_value)
          ELSE to_jsonb(999)
        END,
        'operations', COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', po.id,
                'name', po.operation_name,
                'description', po.operation_description,
                'estimatedTime', po.estimated_time,
                'flowType', po.flow_type,
                'steps', COALESCE(
                  (
                    SELECT jsonb_agg(
                      jsonb_build_object(
                        'id', os.id,
                        'step', os.step_title,
                        'description', os.description,
                        'contentType', os.content_type,
                        'content', os.content,
                        'materials', os.materials,
                        'tools', os.tools,
                        'outputs', os.outputs
                      )
                      ORDER BY os.display_order
                    )
                    FROM operation_steps os
                    WHERE os.operation_id = po.id
                  ),
                  '[]'::jsonb
                )
              )
              ORDER BY po.display_order
            )
            FROM phase_operations po
            WHERE po.phase_id = pp.id
          ),
          '[]'::jsonb
        )
      )
      ORDER BY pp.display_order
    )
    FROM project_phases pp
    WHERE pp.project_id = v_project_id
      AND pp.is_linked = false  -- Only include custom phases in JSONB
  ),
  updated_at = NOW()
  WHERE id = v_project_id;
  
  -- =====================================================
  -- SUMMARY
  -- =====================================================
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ TILE FLOORING PROJECT CREATED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Project ID: %', v_project_id;
  RAISE NOTICE 'Project Name: Tile Flooring Installation';
  RAISE NOTICE '';
  RAISE NOTICE 'Structure:';
  RAISE NOTICE '  LINKED: Kickoff (from Standard)';
  RAISE NOTICE '  LINKED: Plan (from Standard)';
  RAISE NOTICE '  CUSTOM: Prep - 2 operations, 6 steps total';
  RAISE NOTICE '     • Uncoupling Membrane (3 steps)';
  RAISE NOTICE '     • Concrete Backer Board (3 steps)';
  RAISE NOTICE '  CUSTOM: Install - 1 operation, 4 steps';
  RAISE NOTICE '     • Cut and Set Tiles (4 steps)';
  RAISE NOTICE '  CUSTOM: Finish - 1 operation, 3 steps';
  RAISE NOTICE '     • Grout Installation (3 steps)';
  RAISE NOTICE '  LINKED: Ordering (from Standard)';
  RAISE NOTICE '  LINKED: Close (from Standard)';
  RAISE NOTICE '';
  RAISE NOTICE 'Content:';
  RAISE NOTICE '  • 3 skill levels (beginner/intermediate/advanced)';
  RAISE NOTICE '  • Detailed step-by-step instructions';
  RAISE NOTICE '  • Time estimates for each operation';
  RAISE NOTICE '  • Outputs defined for each step';
  RAISE NOTICE '';
  RAISE NOTICE 'Total: 10 custom steps + 4 linked standard phases';
  RAISE NOTICE '========================================';
  
END $$;

