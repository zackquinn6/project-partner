-- =====================================================
-- FIX CREATE PROJECT FUNCTION COLUMN NAMES
-- Update function to use correct column names: time_estimate_med and number_of_workers
-- Also add missing columns: apps, content_sections, flow_type, step_type
-- =====================================================

-- Drop and recreate the function with correct column names
DROP FUNCTION IF EXISTS public.create_project_with_standard_foundation_v2(TEXT, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.create_project_with_standard_foundation_v2(
  p_project_name TEXT,
  p_project_description TEXT,
  p_category TEXT DEFAULT 'general',
  p_created_by UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_id UUID;
  v_standard_project_id UUID;
  v_phase RECORD;
  v_operation RECORD;
  v_step RECORD;
  v_new_phase_id UUID;
  v_new_operation_id UUID;
  category_array TEXT[];
BEGIN
  -- Convert single category text to array (category column is text[])
  category_array := ARRAY[COALESCE(p_category, 'general')];
  
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
    category,
    publish_status,
    is_template,
    is_current_version,
    created_at,
    updated_at
  ) VALUES (
    p_created_by,
    p_project_name,
    p_project_description,
    category_array,
    'draft',
    true,
    true,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_project_id;
  
  -- If standard project exists, copy its phases, operations, and steps
  IF v_standard_project_id IS NOT NULL THEN
    -- Copy phases from standard project
    FOR v_phase IN 
      SELECT 
        id,
        name,
        description,
        display_order,
        position_rule,
        position_value,
        is_standard,
        is_linked,
        source_project_id,
        source_project_name
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
        is_linked,
        source_project_id,
        source_project_name,
        created_at,
        updated_at
      ) VALUES (
        v_project_id,
        v_phase.name,
        v_phase.description,
        v_phase.display_order,
        v_phase.position_rule,
        v_phase.position_value,
        v_phase.is_standard,
        false, -- Not linked, this is a copy
        v_standard_project_id,
        v_phase.source_project_name,
        NOW(),
        NOW()
      )
      RETURNING id INTO v_new_phase_id;
      
      -- Copy operations for this phase
      FOR v_operation IN
        SELECT 
          id,
          operation_name,
          operation_description,
          display_order,
          estimated_time,
          flow_type
        FROM phase_operations
        WHERE phase_id = v_phase.id
        ORDER BY display_order
      LOOP
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
          v_new_phase_id,
          v_operation.operation_name,
          v_operation.operation_description,
          v_operation.display_order,
          v_operation.estimated_time,
          v_operation.flow_type,
          NOW(),
          NOW()
        )
        RETURNING id INTO v_new_operation_id;
        
        -- Copy steps for this operation
        FOR v_step IN
          SELECT 
            id,
            step_title,
            description,
            content_type,
            content,
            content_sections,
            display_order,
            materials,
            tools,
            outputs,
            apps,
            flow_type,
            step_type,
            time_estimate_low,
            time_estimate_med,
            time_estimate_high,
            number_of_workers,
            skill_level
          FROM operation_steps
          WHERE operation_id = v_operation.id
          ORDER BY display_order
        LOOP
          INSERT INTO operation_steps (
            operation_id,
            step_title,
            description,
            content_type,
            content,
            content_sections,
            display_order,
            materials,
            tools,
            outputs,
            apps,
            flow_type,
            step_type,
            time_estimate_low,
            time_estimate_med,
            time_estimate_high,
            number_of_workers,
            skill_level,
            created_at,
            updated_at
          ) VALUES (
            v_new_operation_id,
            v_step.step_title,
            v_step.description,
            v_step.content_type,
            v_step.content,
            COALESCE(v_step.content_sections, '[]'::jsonb),
            v_step.display_order,
            COALESCE(v_step.materials, '[]'::jsonb),
            COALESCE(v_step.tools, '[]'::jsonb),
            COALESCE(v_step.outputs, '[]'::jsonb),
            COALESCE(v_step.apps, '[]'::jsonb),
            COALESCE(v_step.flow_type, 'prime'),
            COALESCE(v_step.step_type, 'scaled'),
            COALESCE(v_step.time_estimate_low, 0),
            COALESCE(v_step.time_estimate_med, 0),
            COALESCE(v_step.time_estimate_high, 0),
            COALESCE(v_step.number_of_workers, 1),
            COALESCE(v_step.skill_level, 'intermediate'),
            NOW(),
            NOW()
          );
        END LOOP;
      END LOOP;
    END LOOP;
    
    -- Rebuild phases JSONB for the new project
    PERFORM public.rebuild_phases_json_from_project_phases(v_project_id);
    
    RAISE NOTICE 'Created project % with % phases copied from standard foundation', 
      v_project_id,
      (SELECT COUNT(*) FROM project_phases WHERE project_id = v_project_id);
  ELSE
    RAISE WARNING 'No standard project found - creating project without standard foundation';
  END IF;
  
  RETURN v_project_id;
END;
$$;

COMMENT ON FUNCTION public.create_project_with_standard_foundation_v2 IS 
'Creates a new project template and automatically copies standard foundation phases, operations, and steps. Standard phases are copied (not linked) so they can be customized independently.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_project_with_standard_foundation_v2(TEXT, TEXT, TEXT, UUID) 
TO authenticated, service_role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ create_project_with_standard_foundation_v2 function updated with correct column names';
  RAISE NOTICE '✅ Using time_estimate_med and number_of_workers';
  RAISE NOTICE '✅ Including apps, content_sections, flow_type, step_type';
END $$;

