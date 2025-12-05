-- =====================================================
-- CREATE PROJECT WITH STANDARD FOUNDATION FUNCTION
-- Creates a new project template and automatically
-- incorporates standard foundation phases
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_project_with_standard_foundation_v2(
  p_user_id UUID,
  p_project_name TEXT,
  p_project_description TEXT,
  p_icon TEXT DEFAULT NULL,
  p_difficulty_level TEXT DEFAULT 'intermediate',
  p_estimated_time TEXT DEFAULT NULL,
  p_estimated_cost TEXT DEFAULT NULL,
  p_category TEXT DEFAULT 'other',
  p_tags TEXT[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_id UUID;
  v_standard_project_id UUID;
  v_phase RECORD;
BEGIN
  -- Get standard project ID
  SELECT id INTO v_standard_project_id
  FROM projects
  WHERE is_standard = true
  LIMIT 1;
  
  -- Create new project
  INSERT INTO projects (
    user_id,
    name,
    description,
    icon,
    difficulty_level,
    estimated_time,
    estimated_cost,
    category,
    tags,
    visibility,
    is_template,
    is_standard,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_project_name,
    p_project_description,
    p_icon,
    p_difficulty_level,
    p_estimated_time,
    p_estimated_cost,
    p_category,
    p_tags,
    'private', -- New projects are private by default
    true, -- This is a template
    false, -- Not a standard project
    NOW(),
    NOW()
  )
  RETURNING id INTO v_project_id;
  
  -- If standard project exists, create LINKS to its phases (not copies)
  IF v_standard_project_id IS NOT NULL THEN
    -- Create lightweight references to standard phases
    -- These are just links - the actual phase data lives in the standard project
    FOR v_phase IN 
      SELECT id, name, display_order, position_rule, position_value, is_standard
      FROM project_phases 
      WHERE project_id = v_standard_project_id
      ORDER BY display_order
    LOOP
      INSERT INTO project_phases (
        project_id,
        name,
        description,
        display_order,
        position_rule,
        position_value,
        is_standard,
        is_linked, -- TRUE = this is a dynamic link, not a copy
        source_project_id, -- Points to standard project
        source_project_name,
        created_at,
        updated_at
      ) VALUES (
        v_project_id,
        v_phase.name,
        '[LINKED] This phase is dynamically linked from the Standard Foundation',
        v_phase.display_order,
        v_phase.position_rule,
        v_phase.position_value,
        v_phase.is_standard,
        true, -- Dynamic link - data comes from source_project_id
        v_standard_project_id, -- Reference to actual phase data
        'Standard Foundation',
        NOW(),
        NOW()
      );
    END LOOP;
    
    RAISE NOTICE 'Created % dynamic links to standard phases for project %', 
      (SELECT COUNT(*) FROM project_phases WHERE project_id = v_standard_project_id),
      v_project_id;
    RAISE NOTICE 'Standard phases are LINKED, not copied - they will update when standard project changes';
  ELSE
    RAISE WARNING 'No standard project found - creating project without standard foundation';
  END IF;
  
  RETURN v_project_id;
END;
$$;

COMMENT ON FUNCTION public.create_project_with_standard_foundation_v2 IS 
'Creates a new project template and automatically creates DYNAMIC LINKS to standard foundation phases. Standard phases are NOT copied - they are linked (isLinked: true) and reference source_project_id. When standard project is updated, all linked projects see the changes automatically.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_project_with_standard_foundation_v2(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[]) 
TO authenticated, service_role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ create_project_with_standard_foundation_v2 function created';
  RAISE NOTICE '✅ New projects will automatically incorporate standard foundation phases';
  RAISE NOTICE '✅ Standard phases marked with isLinked: true';
END $$;

