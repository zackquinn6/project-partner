-- =====================================================
-- CREATE TOILET REPLACEMENT PROJECT
-- Complete project with Removal and Installation phases
-- Includes steps, outputs, time estimates (scaled by number of toilets), and risks
-- =====================================================

DO $$
DECLARE
  v_project_id UUID;
  v_user_id UUID;
  
  -- Phase IDs
  v_removal_phase_id UUID;
  v_installation_phase_id UUID;
  
  -- Operation IDs
  v_prep_removal_op_id UUID;
  v_remove_toilet_op_id UUID;
  v_cleanup_op_id UUID;
  v_prep_install_op_id UUID;
  v_install_toilet_op_id UUID;
  v_test_finish_op_id UUID;
BEGIN
  -- Get admin user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'zackquinn6@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Admin user not found';
  END IF;
  
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
    skill_level,
    effort_level,
    scaling_unit,
    publish_status,
    is_current_version,
    revision_number,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    'Toilet Replacement',
    'Complete toilet removal and installation including disconnection, removal, cleanup, new toilet installation, and testing.',
    'bath',
    'intermediate',
    '2-4 hours per toilet',
    '$150-400 per toilet',
    ARRAY['Bathroom', 'Plumbing'],
    'public',
    true,
    false,
    ARRAY['plumbing', 'bathroom', 'toilet', 'diy', 'replacement'],
    'Intermediate',
    'Medium',
    'number of toilets',
    'published',
    true,
    1,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_project_id;
  
  RAISE NOTICE 'Created Toilet Replacement project: %', v_project_id;
  
  -- =====================================================
  -- LINK STANDARD FOUNDATION PHASES
  -- =====================================================
  
  -- Link Kickoff, Planning, Ordering, Close from standard
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
    SELECT COUNT(*) FROM project_phases WHERE project_id = v_project_id AND is_linked = true
  );
  
  -- =====================================================
  -- PHASE 1: REMOVAL (position: 3rd, after Planning)
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
    'Removal',
    'Remove old toilet, disconnect plumbing, and prepare area for new installation',
    3,
    'nth',
    3,
    false,
    false,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_removal_phase_id;
  
  -- =====================================================
  -- REMOVAL - OPERATION 1: Preparation
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
    v_removal_phase_id,
    'Prepare for Removal',
    'Gather tools, shut off water, and drain toilet',
    1,
    '15-20 minutes per toilet',
    'prime',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_prep_removal_op_id;
  
  -- Step 1: Shut Off Water Supply
  INSERT INTO operation_steps (
    operation_id, step_title, description, content_type, content, display_order,
    materials, tools, outputs, step_type, flow_type,
    time_estimate_low, time_estimate_med, time_estimate_high, number_of_workers, skill_level,
    created_at, updated_at
  ) VALUES (
    v_prep_removal_op_id,
    'Shut Off Water Supply',
    'Locate and turn off water supply valve to toilet',
    'text',
    'Locate the water supply valve behind or beside the toilet. Turn the valve clockwise (right) to shut off the water. If the valve is stuck, use a wrench carefully. Once closed, flush the toilet to drain the tank and bowl. Soak up remaining water with a sponge or towel.',
    1,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('name', 'Adjustable Wrench', 'quantity', 1),
      jsonb_build_object('name', 'Sponge', 'quantity', 1),
      jsonb_build_object('name', 'Towels', 'quantity', 2)
    ),
    jsonb_build_array(
      jsonb_build_object('name', 'Water supply shut off', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'Tank and bowl drained', 'type', 'condition', 'required', true)
    ),
    'scaled', -- Scales by number of toilets
    'prime',
    5, -- 5 minutes per toilet (low)
    8, -- 8 minutes per toilet (medium)
    12, -- 12 minutes per toilet (high)
    1,
    'beginner',
    NOW(),
    NOW()
  );
  
  -- Step 2: Disconnect Water Supply Line
  INSERT INTO operation_steps (
    operation_id, step_title, description, content_type, content, display_order,
    materials, tools, outputs, step_type, flow_type,
    time_estimate_low, time_estimate_med, time_estimate_high, number_of_workers, skill_level,
    created_at, updated_at
  ) VALUES (
    v_prep_removal_op_id,
    'Disconnect Water Supply Line',
    'Remove the water supply line from the toilet tank',
    'text',
    'Use an adjustable wrench to loosen the nut connecting the water supply line to the bottom of the toilet tank. Turn counterclockwise. Have a bucket or towel ready to catch any remaining water. Once disconnected, move the supply line out of the way.',
    2,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('name', 'Adjustable Wrench', 'quantity', 1),
      jsonb_build_object('name', 'Bucket', 'quantity', 1)
    ),
    jsonb_build_array(
      jsonb_build_object('name', 'Supply line disconnected', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'No water leaks', 'type', 'condition', 'required', true)
    ),
    'scaled',
    'prime',
    3, -- 3 minutes per toilet
    5, -- 5 minutes per toilet
    8, -- 8 minutes per toilet
    1,
    'beginner',
    NOW(),
    NOW()
  );
  
  -- =====================================================
  -- REMOVAL - OPERATION 2: Remove Toilet
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
    v_removal_phase_id,
    'Remove Old Toilet',
    'Unbolt and remove the old toilet from floor',
    2,
    '20-30 minutes per toilet',
    'prime',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_remove_toilet_op_id;
  
  -- Step 1: Remove Toilet Bolts
  INSERT INTO operation_steps (
    operation_id, step_title, description, content_type, content, display_order,
    materials, tools, outputs, step_type, flow_type,
    time_estimate_low, time_estimate_med, time_estimate_high, number_of_workers, skill_level,
    created_at, updated_at
  ) VALUES (
    v_remove_toilet_op_id,
    'Remove Toilet Bolts',
    'Remove the bolts securing the toilet to the floor',
    'text',
    'Remove the bolt caps covering the toilet bolts at the base. Use a wrench or socket to loosen and remove the nuts. If bolts are rusted or stuck, apply penetrating oil and wait 10-15 minutes. You may need to cut them with a hacksaw if they won''t budge. Once nuts are removed, the toilet should be free from the floor.',
    1,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('name', 'Adjustable Wrench', 'quantity', 1),
      jsonb_build_object('name', 'Socket Set', 'quantity', 1),
      jsonb_build_object('name', 'Penetrating Oil', 'quantity', 1),
      jsonb_build_object('name', 'Hacksaw', 'quantity', 1)
    ),
    jsonb_build_array(
      jsonb_build_object('name', 'Bolt caps removed', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'Nuts removed', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'Toilet free from floor', 'type', 'condition', 'required', true)
    ),
    'scaled',
    'prime',
    5, -- 5 minutes per toilet
    8, -- 8 minutes per toilet
    15, -- 15 minutes per toilet (if rusted)
    1,
    'intermediate',
    NOW(),
    NOW()
  );
  
  -- Step 2: Lift and Remove Toilet
  INSERT INTO operation_steps (
    operation_id, step_title, description, content_type, content, display_order,
    materials, tools, outputs, step_type, flow_type,
    time_estimate_low, time_estimate_med, time_estimate_high, number_of_workers, skill_level,
    created_at, updated_at
  ) VALUES (
    v_remove_toilet_op_id,
    'Lift and Remove Toilet',
    'Carefully lift the toilet and move it out of the way',
    'text',
    'Toilets are heavy (60-120 lbs). Rock the toilet gently side to side to break the wax ring seal. Once loose, lift straight up - do not tilt. Have a helper if needed. Place the old toilet on a tarp or cardboard to protect the floor. Be careful - toilets can break if dropped. The wax ring will remain on the floor flange.',
    2,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('name', 'Tarp or Cardboard', 'quantity', 1),
      jsonb_build_object('name', 'Work Gloves', 'quantity', 1)
    ),
    jsonb_build_array(
      jsonb_build_object('name', 'Toilet removed from floor', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'Wax ring visible on flange', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'No damage to floor or toilet', 'type', 'quality', 'required', true)
    ),
    'scaled',
    'prime',
    3, -- 3 minutes per toilet
    5, -- 5 minutes per toilet
    8, -- 8 minutes per toilet (if stuck)
    2, -- 2 workers recommended for heavy toilets
    'beginner',
    NOW(),
    NOW()
  );
  
  -- =====================================================
  -- REMOVAL - OPERATION 3: Cleanup
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
    v_removal_phase_id,
    'Clean and Prepare Area',
    'Remove old wax ring, clean flange, and prepare for new installation',
    3,
    '10-15 minutes per toilet',
    'prime',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_cleanup_op_id;
  
  -- Step 1: Remove Old Wax Ring
  INSERT INTO operation_steps (
    operation_id, step_title, description, content_type, content, display_order,
    materials, tools, outputs, step_type, flow_type,
    time_estimate_low, time_estimate_med, time_estimate_high, number_of_workers, skill_level,
    created_at, updated_at
  ) VALUES (
    v_cleanup_op_id,
    'Remove Old Wax Ring',
    'Scrape off old wax ring from floor flange',
    'text',
    'Use a putty knife or scraper to remove the old wax ring from the floor flange. Remove all wax residue - the flange should be clean and smooth. Check that the flange is level and not damaged. If the flange is cracked or broken, it will need to be repaired before installing the new toilet.',
    1,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('name', 'Putty Knife', 'quantity', 1),
      jsonb_build_object('name', 'Scraper', 'quantity', 1),
      jsonb_build_object('name', 'Paper Towels', 'quantity', 1)
    ),
    jsonb_build_array(
      jsonb_build_object('name', 'Wax ring completely removed', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'Flange clean and smooth', 'type', 'quality', 'required', true),
      jsonb_build_object('name', 'Flange level and undamaged', 'type', 'condition', 'required', true)
    ),
    'scaled',
    'prime',
    3, -- 3 minutes per toilet
    5, -- 5 minutes per toilet
    8, -- 8 minutes per toilet
    1,
    'beginner',
    NOW(),
    NOW()
  );
  
  -- Step 2: Clean Floor Area
  INSERT INTO operation_steps (
    operation_id, step_title, description, content_type, content, display_order,
    materials, tools, outputs, step_type, flow_type,
    time_estimate_low, time_estimate_med, time_estimate_high, number_of_workers, skill_level,
    created_at, updated_at
  ) VALUES (
    v_cleanup_op_id,
    'Clean Floor Area',
    'Clean the floor around the flange area',
    'text',
    'Clean the floor area around the flange with a disinfectant cleaner. Remove any debris, old caulk, or adhesive. The area should be clean and dry before installing the new toilet. Check that the floor is level - if not, you may need to shim the new toilet.',
    2,
    jsonb_build_array(
      jsonb_build_object('name', 'Disinfectant Cleaner', 'quantity', 1)
    ),
    jsonb_build_array(
      jsonb_build_object('name', 'Sponge', 'quantity', 1),
      jsonb_build_object('name', 'Paper Towels', 'quantity', 1)
    ),
    jsonb_build_array(
      jsonb_build_object('name', 'Floor area clean and dry', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'Old caulk removed', 'type', 'condition', 'required', true)
    ),
    'scaled',
    'prime',
    2, -- 2 minutes per toilet
    4, -- 4 minutes per toilet
    6, -- 6 minutes per toilet
    1,
    'beginner',
    NOW(),
    NOW()
  );
  
  -- =====================================================
  -- PHASE 2: INSTALLATION (position: 4th, after Removal)
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
    'Installation',
    'Install new toilet, connect plumbing, and test for leaks',
    4,
    'nth',
    4,
    false,
    false,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_installation_phase_id;
  
  -- =====================================================
  -- INSTALLATION - OPERATION 1: Preparation
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
    v_installation_phase_id,
    'Prepare for Installation',
    'Inspect new toilet, prepare wax ring, and position bolts',
    1,
    '10-15 minutes per toilet',
    'prime',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_prep_install_op_id;
  
  -- Step 1: Inspect New Toilet
  INSERT INTO operation_steps (
    operation_id, step_title, description, content_type, content, display_order,
    materials, tools, outputs, step_type, flow_type,
    time_estimate_low, time_estimate_med, time_estimate_high, number_of_workers, skill_level,
    created_at, updated_at
  ) VALUES (
    v_prep_install_op_id,
    'Inspect New Toilet',
    'Check new toilet for damage and verify all parts are included',
    'text',
    'Unbox the new toilet and inspect for any cracks, chips, or damage. Check that all parts are included: toilet bowl, tank (if two-piece), bolts, wax ring, and any hardware. Verify the rough-in measurement matches your existing plumbing (typically 12 inches from wall to center of drain). Test fit the toilet over the flange to ensure it will fit properly.',
    1,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('name', 'Toilet inspected and undamaged', 'type', 'quality', 'required', true),
      jsonb_build_object('name', 'All parts present', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'Rough-in measurement verified', 'type', 'measurement', 'required', true)
    ),
    'scaled',
    'prime',
    3, -- 3 minutes per toilet
    5, -- 5 minutes per toilet
    8, -- 8 minutes per toilet
    1,
    'beginner',
    NOW(),
    NOW()
  );
  
  -- Step 2: Install Floor Bolts
  INSERT INTO operation_steps (
    operation_id, step_title, description, content_type, content, display_order,
    materials, tools, outputs, step_type, flow_type,
    time_estimate_low, time_estimate_med, time_estimate_high, number_of_workers, skill_level,
    created_at, updated_at
  ) VALUES (
    v_prep_install_op_id,
    'Install Floor Bolts',
    'Position and secure toilet bolts in floor flange',
    'text',
    'Insert the new toilet bolts into the slots on the floor flange. Position them so they point straight up. The bolts should be evenly spaced and at the correct distance for your toilet. Some flanges have slots that hold the bolts; others may require you to thread the bolts through. Make sure bolts are secure and won''t move when you set the toilet.',
    2,
    jsonb_build_array(
      jsonb_build_object('name', 'Toilet Bolts', 'quantity', 2)
    ),
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('name', 'Bolts installed in flange', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'Bolts positioned correctly', 'type', 'measurement', 'required', true),
      jsonb_build_object('name', 'Bolts secure and won''t move', 'type', 'condition', 'required', true)
    ),
    'scaled',
    'prime',
    2, -- 2 minutes per toilet
    4, -- 4 minutes per toilet
    6, -- 6 minutes per toilet
    1,
    'beginner',
    NOW(),
    NOW()
  );
  
  -- =====================================================
  -- INSTALLATION - OPERATION 2: Install Toilet
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
    v_installation_phase_id,
    'Install New Toilet',
    'Set toilet on wax ring, secure to floor, and attach tank',
    2,
    '25-35 minutes per toilet',
    'prime',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_install_toilet_op_id;
  
  -- Step 1: Install Wax Ring
  INSERT INTO operation_steps (
    operation_id, step_title, description, content_type, content, display_order,
    materials, tools, outputs, step_type, flow_type,
    time_estimate_low, time_estimate_med, time_estimate_high, number_of_workers, skill_level,
    created_at, updated_at
  ) VALUES (
    v_install_toilet_op_id,
    'Install Wax Ring',
    'Place wax ring on floor flange',
    'text',
    'Place the new wax ring on the floor flange, centered over the drain opening. The wax ring should be at room temperature (not cold) for best seal. Some prefer to place the wax ring on the bottom of the toilet instead of on the flange - either method works. Make sure the wax ring is the correct size for your flange (standard is 4 inches).',
    1,
    jsonb_build_array(
      jsonb_build_object('name', 'Wax Ring', 'quantity', 1)
    ),
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('name', 'Wax ring positioned on flange', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'Wax ring centered over drain', 'type', 'measurement', 'required', true)
    ),
    'scaled',
    'prime',
    2, -- 2 minutes per toilet
    3, -- 3 minutes per toilet
    5, -- 5 minutes per toilet
    1,
    'beginner',
    NOW(),
    NOW()
  );
  
  -- Step 2: Set Toilet on Flange
  INSERT INTO operation_steps (
    operation_id, step_title, description, content_type, content, display_order,
    materials, tools, outputs, step_type, flow_type,
    time_estimate_low, time_estimate_med, time_estimate_high, number_of_workers, skill_level,
    created_at, updated_at
  ) VALUES (
    v_install_toilet_op_id,
    'Set Toilet on Flange',
    'Carefully lower toilet onto wax ring and align with bolts',
    'text',
    'Lift the toilet and carefully lower it straight down onto the wax ring. Align the bolt holes in the toilet base with the floor bolts. Do not rock or slide the toilet - set it down in one motion to avoid breaking the wax seal. The toilet should sit flush on the floor. Press down firmly to compress the wax ring and create a good seal.',
    2,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('name', 'Toilet set on flange', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'Bolt holes aligned', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'Toilet sitting flush on floor', 'type', 'quality', 'required', true),
      jsonb_build_object('name', 'Wax ring compressed', 'type', 'condition', 'required', true)
    ),
    'scaled',
    'prime',
    3, -- 3 minutes per toilet
    5, -- 5 minutes per toilet
    8, -- 8 minutes per toilet
    2, -- 2 workers recommended
    'intermediate',
    NOW(),
    NOW()
  );
  
  -- Step 3: Secure Toilet to Floor
  INSERT INTO operation_steps (
    operation_id, step_title, description, content_type, content, display_order,
    materials, tools, outputs, step_type, flow_type,
    time_estimate_low, time_estimate_med, time_estimate_high, number_of_workers, skill_level,
    created_at, updated_at
  ) VALUES (
    v_install_toilet_op_id,
    'Secure Toilet to Floor',
    'Tighten bolts to secure toilet, being careful not to overtighten',
    'text',
    'Place washers and nuts on the bolts. Tighten the nuts evenly, alternating between sides. Tighten until the toilet is secure but do not overtighten - this can crack the toilet base. The toilet should not rock when you test it. Cut off excess bolt length with a hacksaw if needed, leaving about 1/4 inch above the nut.',
    3,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('name', 'Adjustable Wrench', 'quantity', 1),
      jsonb_build_object('name', 'Hacksaw', 'quantity', 1)
    ),
    jsonb_build_array(
      jsonb_build_object('name', 'Toilet secured to floor', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'No rocking or movement', 'type', 'quality', 'required', true),
      jsonb_build_object('name', 'Bolts not overtightened', 'type', 'quality', 'required', true)
    ),
    'scaled',
    'prime',
    5, -- 5 minutes per toilet
    8, -- 8 minutes per toilet
    12, -- 12 minutes per toilet
    1,
    'intermediate',
    NOW(),
    NOW()
  );
  
  -- Step 4: Attach Tank (if two-piece)
  INSERT INTO operation_steps (
    operation_id, step_title, description, content_type, content, display_order,
    materials, tools, outputs, step_type, flow_type,
    time_estimate_low, time_estimate_med, time_estimate_high, number_of_workers, skill_level,
    created_at, updated_at
  ) VALUES (
    v_install_toilet_op_id,
    'Attach Tank to Bowl',
    'Secure tank to bowl if installing a two-piece toilet',
    'text',
    'If installing a two-piece toilet, place the tank gasket on the bowl. Lower the tank onto the bowl, aligning the bolt holes. Insert and tighten the tank bolts evenly, alternating sides. Do not overtighten - this can crack the tank. Connect the flush valve and fill valve according to manufacturer instructions.',
    4,
    jsonb_build_array(
      jsonb_build_object('name', 'Tank Gasket', 'quantity', 1),
      jsonb_build_object('name', 'Tank Bolts', 'quantity', 2)
    ),
    jsonb_build_array(
      jsonb_build_object('name', 'Screwdriver', 'quantity', 1)
    ),
    jsonb_build_array(
      jsonb_build_object('name', 'Tank attached to bowl', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'Tank bolts tightened evenly', 'type', 'quality', 'required', true),
      jsonb_build_object('name', 'No leaks at tank-bowl connection', 'type', 'condition', 'required', true)
    ),
    'scaled',
    'prime',
    5, -- 5 minutes per toilet
    8, -- 8 minutes per toilet
    12, -- 12 minutes per toilet
    1,
    'intermediate',
    NOW(),
    NOW()
  );
  
  -- =====================================================
  -- INSTALLATION - OPERATION 3: Connect and Test
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
    v_installation_phase_id,
    'Connect Plumbing and Test',
    'Reconnect water supply, test flush, and check for leaks',
    3,
    '15-20 minutes per toilet',
    'prime',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_test_finish_op_id;
  
  -- Step 1: Connect Water Supply
  INSERT INTO operation_steps (
    operation_id, step_title, description, content_type, content, display_order,
    materials, tools, outputs, step_type, flow_type,
    time_estimate_low, time_estimate_med, time_estimate_high, number_of_workers, skill_level,
    created_at, updated_at
  ) VALUES (
    v_test_finish_op_id,
    'Connect Water Supply Line',
    'Reconnect water supply line to toilet tank',
    'text',
    'Connect the water supply line to the fill valve on the bottom of the tank. Hand-tighten first, then use a wrench to give it a quarter turn. Do not overtighten. Turn on the water supply valve slowly and let the tank fill. Watch for leaks at the connection.',
    1,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('name', 'Adjustable Wrench', 'quantity', 1)
    ),
    jsonb_build_array(
      jsonb_build_object('name', 'Water supply connected', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'No leaks at connection', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'Tank filling with water', 'type', 'condition', 'required', true)
    ),
    'scaled',
    'prime',
    3, -- 3 minutes per toilet
    5, -- 5 minutes per toilet
    8, -- 8 minutes per toilet
    1,
    'beginner',
    NOW(),
    NOW()
  );
  
  -- Step 2: Test Flush and Check for Leaks
  INSERT INTO operation_steps (
    operation_id, step_title, description, content_type, content, display_order,
    materials, tools, outputs, step_type, flow_type,
    time_estimate_low, time_estimate_med, time_estimate_high, number_of_workers, skill_level,
    created_at, updated_at
  ) VALUES (
    v_test_finish_op_id,
    'Test Flush and Check for Leaks',
    'Flush toilet multiple times and inspect for leaks',
    'text',
    'Once the tank is full, flush the toilet several times. Check for leaks at: the base of the toilet (wax ring seal), the tank-bowl connection, the water supply connection, and around the bolts. If you see any leaks, turn off the water and address the issue. The toilet should flush properly and refill without issues.',
    2,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('name', 'Toilet flushes properly', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'No leaks at base', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'No leaks at connections', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'Tank refills correctly', 'type', 'condition', 'required', true)
    ),
    'scaled',
    'prime',
    5, -- 5 minutes per toilet
    8, -- 8 minutes per toilet
    12, -- 12 minutes per toilet (if troubleshooting)
    1,
    'beginner',
    NOW(),
    NOW()
  );
  
  -- Step 3: Install Toilet Seat
  INSERT INTO operation_steps (
    operation_id, step_title, description, content_type, content, display_order,
    materials, tools, outputs, step_type, flow_type,
    time_estimate_low, time_estimate_med, time_estimate_high, number_of_workers, skill_level,
    created_at, updated_at
  ) VALUES (
    v_test_finish_op_id,
    'Install Toilet Seat',
    'Attach the toilet seat to the bowl',
    'text',
    'Position the toilet seat on the bowl, aligning the holes. Insert the bolts through the holes from the top. Under the bowl, place washers and nuts, then tighten. The seat should be secure but not too tight. Test that the seat opens and closes smoothly.',
    3,
    jsonb_build_array(
      jsonb_build_object('name', 'Toilet Seat', 'quantity', 1),
      jsonb_build_object('name', 'Seat Bolts', 'quantity', 2)
    ),
    jsonb_build_array(
      jsonb_build_object('name', 'Screwdriver', 'quantity', 1)
    ),
    jsonb_build_array(
      jsonb_build_object('name', 'Toilet seat installed', 'type', 'condition', 'required', true),
      jsonb_build_object('name', 'Seat secure and functional', 'type', 'quality', 'required', true)
    ),
    'scaled',
    'prime',
    3, -- 3 minutes per toilet
    5, -- 5 minutes per toilet
    8, -- 8 minutes per toilet
    1,
    'beginner',
    NOW(),
    NOW()
  );
  
  -- Step 4: Caulk Base (Optional)
  INSERT INTO operation_steps (
    operation_id, step_title, description, content_type, content, display_order,
    materials, tools, outputs, step_type, flow_type,
    time_estimate_low, time_estimate_med, time_estimate_high, number_of_workers, skill_level,
    created_at, updated_at
  ) VALUES (
    v_test_finish_op_id,
    'Caulk Base (Optional)',
    'Apply caulk around base of toilet for finished look',
    'text',
    'Apply a bead of caulk around the base of the toilet where it meets the floor. Leave the back open (don''t caulk all the way around) so any leaks can be detected. Smooth the caulk with a wet finger or caulk tool. This step is optional but gives a finished, professional look.',
    4,
    jsonb_build_array(
      jsonb_build_object('name', 'Bathroom Caulk', 'quantity', 1)
    ),
    jsonb_build_array(
      jsonb_build_object('name', 'Caulk Gun', 'quantity', 1)
    ),
    jsonb_build_array(
      jsonb_build_object('name', 'Caulk applied around base', 'type', 'condition', 'required', false),
      jsonb_build_object('name', 'Back left open for leak detection', 'type', 'quality', 'required', true)
    ),
    'scaled',
    'prime',
    5, -- 5 minutes per toilet
    8, -- 8 minutes per toilet
    12, -- 12 minutes per toilet
    1,
    'intermediate',
    NOW(),
    NOW()
  );
  
  -- =====================================================
  -- ADD PROJECT RISKS
  -- =====================================================
  
  INSERT INTO public.project_template_risks (
    project_id,
    risk_title,
    risk_description,
    likelihood,
    impact,
    budget_impact_low,
    budget_impact_high,
    schedule_impact_low_days,
    schedule_impact_high_days,
    mitigation_strategy,
    display_order,
    created_at,
    updated_at
  ) VALUES
  (
    v_project_id,
    'Damaged Floor Flange',
    'Existing floor flange may be cracked, broken, or corroded, requiring repair or replacement before new toilet can be installed.',
    'medium',
    'high',
    50.00, -- $50-200 for repair parts
    200.00,
    0, -- Same day if caught early
    1, -- 1 day delay if replacement needed
    'Inspect flange during removal phase. Have repair kit or replacement flange on hand. Budget extra time for flange repair if needed.',
    1,
    NOW(),
    NOW()
  ),
  (
    v_project_id,
    'Rusted or Stuck Bolts',
    'Old toilet bolts may be rusted or corroded, making removal difficult and time-consuming.',
    'high',
    'medium',
    10.00, -- Penetrating oil, new bolts
    25.00,
    0, -- Usually resolved same day
    0,
    'Apply penetrating oil before attempting removal. Allow 15-30 minutes for oil to work. Have hacksaw ready to cut bolts if necessary. Keep replacement bolts on hand.',
    2,
    NOW(),
    NOW()
  ),
  (
    v_project_id,
    'Wax Ring Leak',
    'Improper wax ring installation can cause leaks at the base of the toilet, leading to water damage.',
    'medium',
    'high',
    100.00, -- Water damage cleanup
    500.00, -- Significant water damage
    0,
    1, -- 1 day to fix leak and dry area
    'Ensure wax ring is at room temperature before installation. Set toilet straight down without rocking. Test thoroughly for leaks before finishing. Consider using wax-free seal for easier installation.',
    3,
    NOW(),
    NOW()
  ),
  (
    v_project_id,
    'Rough-In Measurement Mismatch',
    'New toilet may not match existing rough-in measurement (distance from wall to drain center), requiring adjustment or different toilet model.',
    'low',
    'high',
    0.00, -- If caught before purchase
    300.00, -- If need to return and buy different model
    0,
    1, -- 1 day delay if need to exchange toilet
    'Measure rough-in before purchasing toilet. Standard is 12 inches, but older homes may be 10 or 14 inches. Verify measurement matches new toilet specifications.',
    4,
    NOW(),
    NOW()
  ),
  (
    v_project_id,
    'Cracked Toilet During Installation',
    'Toilet can crack if dropped, overtightened, or set down improperly, requiring replacement.',
    'low',
    'high',
    150.00, -- Replacement toilet cost
    400.00, -- Higher-end replacement
    0,
    1, -- 1 day delay for replacement
    'Handle toilet carefully - they are heavy and fragile. Use two people to lift. Do not overtighten bolts. Set toilet down straight without rocking. Inspect for cracks before final installation.',
    5,
    NOW(),
    NOW()
  ),
  (
    v_project_id,
    'Water Supply Valve Failure',
    'Old water supply valve may leak or fail to shut off completely, requiring replacement.',
    'medium',
    'medium',
    15.00, -- New valve cost
    50.00, -- Professional installation if needed
    0,
    0, -- Usually fixed same day
    'Test valve before starting. If valve is old or doesn''t shut off completely, replace it before installation. Keep replacement valve on hand. Shut off main water supply if valve fails.',
    6,
    NOW(),
    NOW()
  ),
  (
    v_project_id,
    'Uneven Floor',
    'Floor may not be level, causing toilet to rock or not sit properly, requiring shimming.',
    'medium',
    'low',
    5.00, -- Shims cost
    20.00, -- If need to level floor
    0,
    0, -- Usually resolved same day
    'Check floor level before installation. Use plastic shims if needed to level toilet. Do not use wood shims as they can rot. Ensure toilet sits flush and doesn''t rock.',
    7,
    NOW(),
    NOW()
  );
  
  RAISE NOTICE 'Added 7 project risks';
  
  -- =====================================================
  -- REBUILD PHASES JSONB
  -- =====================================================
  
  PERFORM public.rebuild_phases_json_from_project_phases(v_project_id);
  
  RAISE NOTICE '✅ Toilet Replacement project created successfully';
  RAISE NOTICE '   Project ID: %', v_project_id;
  RAISE NOTICE '   Phases: Kickoff (linked), Planning (linked), Removal, Installation, Ordering (linked), Close Project (linked)';
  RAISE NOTICE '   Total custom phases: 2';
  RAISE NOTICE '   Total operations: 6';
  RAISE NOTICE '   Total steps: 15';
  RAISE NOTICE '   Risks: 7';
  
END $$;

