-- =====================================================
-- CREATE STANDARD PROJECT TEMPLATE FUNCTIONS
-- Functions for managing standard/foundational projects
-- =====================================================

-- =====================================================
-- 1. GET_STANDARD_PROJECT_TEMPLATE
-- Retrieves the current standard project template
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_standard_project_template()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  description TEXT,
  icon TEXT,
  difficulty_level TEXT,
  estimated_time TEXT,
  estimated_cost TEXT,
  visibility TEXT,
  is_template BOOLEAN,
  is_standard BOOLEAN,
  category TEXT,
  tags TEXT[],
  phases JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.name,
    p.description,
    p.icon,
    p.difficulty_level,
    p.estimated_time,
    p.estimated_cost,
    p.visibility,
    p.is_template,
    p.is_standard,
    p.category,
    p.tags,
    p.phases,
    p.created_at,
    p.updated_at
  FROM projects p
  WHERE p.is_standard = true
  ORDER BY p.created_at DESC
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.get_standard_project_template IS 
'Retrieves the current standard/foundational project template. Returns the most recently created standard project.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_standard_project_template() TO authenticated, anon, service_role;

-- =====================================================
-- 2. GET_STANDARD_PROJECT_WITH_PHASES
-- Retrieves standard project with full phase hierarchy
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_standard_project_with_phases()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_id UUID;
  v_result JSONB;
BEGIN
  -- Get the standard project ID
  SELECT id INTO v_project_id
  FROM projects
  WHERE is_standard = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_project_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Build complete project JSON with phases
  SELECT jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'description', p.description,
    'icon', p.icon,
    'difficulty_level', p.difficulty_level,
    'estimated_time', p.estimated_time,
    'estimated_cost', p.estimated_cost,
    'visibility', p.visibility,
    'is_template', p.is_template,
    'is_standard', p.is_standard,
    'category', p.category,
    'tags', p.tags,
    'created_at', p.created_at,
    'updated_at', p.updated_at,
    'phases', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', pp.id,
            'name', pp.name,
            'description', pp.description,
            'display_order', pp.display_order,
            'position_rule', pp.position_rule,
            'position_value', pp.position_value,
            'is_standard', pp.is_standard,
            'is_linked', pp.is_linked,
            'source_project_id', pp.source_project_id,
            'source_project_name', pp.source_project_name,
            'operations', COALESCE(
              (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'id', po.id,
                    'operation_name', po.operation_name,
                    'operation_description', po.operation_description,
                    'display_order', po.display_order,
                    'estimated_time', po.estimated_time,
                    'flow_type', po.flow_type,
                    'steps', COALESCE(
                      (
                        SELECT jsonb_agg(
                          jsonb_build_object(
                            'id', os.id,
                            'step_title', os.step_title,
                            'description', os.description,
                            'content_type', os.content_type,
                            'content', os.content,
                            'display_order', os.display_order,
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
        WHERE pp.project_id = p.id
      ),
      '[]'::jsonb
    )
  ) INTO v_result
  FROM projects p
  WHERE p.id = v_project_id;
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_standard_project_with_phases IS 
'Retrieves the complete standard project template with all phases, operations, and steps in JSONB format.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_standard_project_with_phases() TO authenticated, anon, service_role;

-- =====================================================
-- 3. CREATE_STANDARD_PROJECT
-- Creates a new standard/foundational project template
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_standard_project(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_icon TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_id UUID;
BEGIN
  -- Only admins can create standard projects
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can create standard projects';
  END IF;
  
  -- Mark any existing standard project as non-standard
  UPDATE projects
  SET is_standard = false
  WHERE is_standard = true;
  
  -- Create new standard project
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
    p_user_id,
    p_name,
    p_description,
    p_icon,
    'public',
    true,
    true,
    'foundation',
    'beginner',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_project_id;
  
  RETURN v_project_id;
END;
$$;

COMMENT ON FUNCTION public.create_standard_project IS 
'Creates a new standard/foundational project template. Only admins can create standard projects. Marks previous standard project as non-standard.';

-- Grant execute to authenticated users (admin check is inside function)
GRANT EXECUTE ON FUNCTION public.create_standard_project(TEXT, TEXT, TEXT, UUID) TO authenticated, service_role;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ get_standard_project_template function created';
  RAISE NOTICE '✅ get_standard_project_with_phases function created';
  RAISE NOTICE '✅ create_standard_project function created';
  RAISE NOTICE '✅ Standard project management functions ready';
END $$;

