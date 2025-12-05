-- =====================================================
-- INITIALIZE STANDARD PROJECT FOUNDATION
-- ONE-TIME SETUP - Creates the foundational project structure
-- that all other projects will incorporate
-- =====================================================
--
-- This migration creates:
-- - Standard Foundation Project
-- - 4 Standard Phases: Kickoff, Plan, Ordering, Close
-- - All operations and steps as specified
--
-- NOTE: This should only run once. The create_standard_project()
-- function exists only for disaster recovery, not regular use.
-- =====================================================

DO $$
DECLARE
  v_standard_project_id UUID;
  v_kickoff_phase_id UUID;
  v_plan_phase_id UUID;
  v_ordering_phase_id UUID;
  v_close_phase_id UUID;
  v_operation_id UUID;
  v_exists BOOLEAN;
BEGIN
  -- Check if standard project already exists
  SELECT EXISTS(SELECT 1 FROM projects WHERE is_standard = true) INTO v_exists;
  
  IF v_exists THEN
    RAISE NOTICE 'Standard project already exists. Skipping creation.';
    RAISE NOTICE 'If you need to rebuild, manually delete the existing standard project first.';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Creating standard project foundation...';
  
  -- =====================================================
  -- 1. CREATE STANDARD PROJECT
  -- =====================================================
  
  INSERT INTO projects (
    user_id,
    name,
    description,
    icon,
    visibility,
    is_template,
    is_standard,
    category,
    difficulty_level,
    created_at,
    updated_at
  ) VALUES (
    (SELECT id FROM auth.users WHERE email = 'zackquinn6@gmail.com'), -- Admin user
    'Standard Foundation',
    'Core phases that appear in all project runs',
    'foundation',
    'public',
    true,
    true,
    'foundation',
    'beginner',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_standard_project_id;
  
  RAISE NOTICE '✅ Created standard project: %', v_standard_project_id;
  
  -- =====================================================
  -- 2. CREATE KICKOFF PHASE (position: first)
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
    v_standard_project_id,
    'Kickoff',
    'Project initiation and setup',
    1,
    'first',
    NULL,
    true,
    false,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_kickoff_phase_id;
  
  -- Kickoff has ONE operation with 3 steps
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
    v_kickoff_phase_id,
    'Project Setup',
    'Initial project configuration and profiling',
    1,
    '30 minutes',
    'prime',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_operation_id;
  
  -- Step 1: Project Overview
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
    v_operation_id,
    'Project Overview',
    'Review project scope, goals, and requirements',
    'text',
    'Understand what the project entails and set clear expectations.',
    1,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    NOW(),
    NOW()
  );
  
  -- Step 2: User Profile
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
    v_operation_id,
    'User Profile',
    'Set up user information and preferences',
    'text',
    'Configure your profile, skill level, and project preferences.',
    2,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    NOW(),
    NOW()
  );
  
  -- Step 3: Project Profile
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
    v_operation_id,
    'Project Profile',
    'Define project-specific details and constraints',
    'text',
    'Set project timeline, budget, and specific requirements.',
    3,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    NOW(),
    NOW()
  );
  
  RAISE NOTICE '✅ Created Kickoff phase with 3 steps';
  
  -- =====================================================
  -- 3. CREATE PLAN PHASE (position: 2nd)
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
    v_standard_project_id,
    'Plan',
    'Project planning and assessment',
    2,
    'nth',
    2,
    true,
    false,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_plan_phase_id;
  
  -- Operation 1: Initial Plan
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
    v_plan_phase_id,
    'Initial Plan',
    'Create preliminary project plan',
    1,
    '1 hour',
    'prime',
    NOW(),
    NOW()
  );
  
  -- Operation 2: Measure & Assess
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
    v_plan_phase_id,
    'Measure & Assess',
    'Take measurements and assess site conditions',
    2,
    '2 hours',
    'prime',
    NOW(),
    NOW()
  );
  
  -- Operation 3: Final Plan
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
    v_plan_phase_id,
    'Final Plan',
    'Finalize project plan with all details',
    3,
    '1 hour',
    'prime',
    NOW(),
    NOW()
  );
  
  -- Operation 4: Scheduling
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
    v_plan_phase_id,
    'Scheduling',
    'Create project timeline and resource schedule',
    4,
    '30 minutes',
    'prime',
    NOW(),
    NOW()
  );
  
  RAISE NOTICE '✅ Created Plan phase with 4 operations';
  
  -- =====================================================
  -- 4. CREATE ORDERING PHASE (position: 2nd to last)
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
    v_standard_project_id,
    'Ordering',
    'Material and tool procurement',
    3,
    'last_minus_n',
    1,
    true,
    false,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_ordering_phase_id;
  
  -- Ordering has ONE operation with 1 step
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
    v_ordering_phase_id,
    'Procurement',
    'Order tools and materials',
    1,
    '1 hour',
    'prime',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_operation_id;
  
  -- Step: Tool & Material Ordering
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
    v_operation_id,
    'Tool & Material Ordering',
    'Order all required tools and materials',
    'text',
    'Review shopping list and place orders for all necessary items.',
    1,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    NOW(),
    NOW()
  );
  
  RAISE NOTICE '✅ Created Ordering phase with 1 step';
  
  -- =====================================================
  -- 5. CREATE CLOSE PHASE (position: last)
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
    v_standard_project_id,
    'Close',
    'Project completion and wrap-up',
    4,
    'last',
    NULL,
    true,
    false,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_close_phase_id;
  
  -- Operation 1: Tool & Material Closeout
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
    v_close_phase_id,
    'Tool & Material Closeout',
    'Return rentals and organize remaining materials',
    1,
    '30 minutes',
    'prime',
    NOW(),
    NOW()
  );
  
  -- Operation 2: Project Closure (with 2 steps)
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
    v_close_phase_id,
    'Project Closure',
    'Final project review and celebration',
    2,
    '30 minutes',
    'prime',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_operation_id;
  
  -- Step 1: Reflect
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
    v_operation_id,
    'Reflect',
    'Review what went well and lessons learned',
    'text',
    'Take time to reflect on the project journey, challenges overcome, and skills developed.',
    1,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    NOW(),
    NOW()
  );
  
  -- Step 2: Celebrate
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
    v_operation_id,
    'Celebrate',
    'Acknowledge accomplishment and enjoy the results',
    'text',
    'Take pride in your completed project! Share with friends and family.',
    2,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    NOW(),
    NOW()
  );
  
  RAISE NOTICE '✅ Created Close phase with 2 operations (including Reflect and Celebrate)';
  
  -- =====================================================
  -- SUMMARY
  -- =====================================================
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ STANDARD PROJECT FOUNDATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Project ID: %', v_standard_project_id;
  RAISE NOTICE '';
  RAISE NOTICE 'Structure:';
  RAISE NOTICE '  1. Kickoff (first) - 3 steps';
  RAISE NOTICE '  2. Plan (2nd) - 4 operations';
  RAISE NOTICE '  3. Ordering (2nd to last) - 1 step';
  RAISE NOTICE '  4. Close (last) - 2 operations, 2 steps';
  RAISE NOTICE '';
  RAISE NOTICE 'This foundation will be incorporated into all new project runs.';
  RAISE NOTICE '========================================';
  
END $$;

