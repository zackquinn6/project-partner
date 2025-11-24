-- Migration: Ensure dynamic linkage from Standard Project Foundation to all project templates
-- Uses is_standard flag instead of hardcoded phase names or standard_phases table joins
-- This ensures newly added standard phases are automatically linked to all project templates

-- ============================================
-- Fix 1: Update create_project_with_standard_foundation_v2
-- Copy ALL phases where is_standard = true, not just those in standard_phases table
-- ============================================
CREATE OR REPLACE FUNCTION public.create_project_with_standard_foundation_v2(
  p_project_name TEXT,
  p_project_description TEXT,
  p_category TEXT DEFAULT 'general',
  p_created_by UUID DEFAULT auth.uid()
) RETURNS UUID AS $$
DECLARE
  new_project_id UUID;
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  std_phase RECORD;
  new_phase_id UUID;
  std_operation RECORD;
BEGIN
  INSERT INTO public.projects (
    name,
    description,
    category,
    publish_status,
    created_by,
    is_current_version
  ) VALUES (
    p_project_name,
    p_project_description,
    COALESCE(p_category, 'general'),
    'draft',
    p_created_by,
    true
  ) RETURNING id INTO new_project_id;

  -- CRITICAL: Copy ALL phases where is_standard = true from Standard Project Foundation
  -- This includes any newly added standard phases, not just those in standard_phases table
  FOR std_phase IN
    SELECT 
      pp.id,
      pp.project_id,
      pp.name,
      pp.description,
      pp.display_order,
      pp.is_standard,
      pp.standard_phase_id
    FROM public.project_phases pp
    WHERE pp.project_id = standard_project_id
      AND pp.is_standard = true  -- CRITICAL: Use is_standard flag, not standard_phases table join
    ORDER BY pp.display_order
  LOOP
    INSERT INTO public.project_phases (
      project_id,
      name,
      description,
      display_order,
      is_standard,
      standard_phase_id
    ) VALUES (
      new_project_id,
      std_phase.name,
      std_phase.description,
      std_phase.display_order,
      true,
      std_phase.standard_phase_id
    ) RETURNING id INTO new_phase_id;

    -- Copy operations for this phase
    FOR std_operation IN
      SELECT 
        id,
        project_id,
        phase_id,
        name,
        description,
        flow_type,
        user_prompt,
        alternate_group,
        display_order,
        is_standard_phase,
        source_operation_id,
        is_reference,
        created_at,
        updated_at
      FROM public.template_operations
      WHERE project_id = standard_project_id
        AND phase_id = std_phase.id
      ORDER BY display_order
    LOOP
      INSERT INTO public.template_operations (
        project_id,
        phase_id,
        name,
        description,
        flow_type,
        user_prompt,
        alternate_group,
        display_order,
        is_standard_phase,
        source_operation_id,
        is_reference
      ) VALUES (
        new_project_id,
        new_phase_id,
        std_operation.name,
        std_operation.description,
        std_operation.flow_type,
        std_operation.user_prompt,
        std_operation.alternate_group,
        std_operation.display_order,
        true,
        std_operation.id,
        true
      );

      -- Copy steps for this operation
      INSERT INTO public.template_steps (
        operation_id,
        step_number,
        step_title,
        description,
        content_sections,
        materials,
        tools,
        outputs,
        apps,
        estimated_time_minutes,
        flow_type,
        step_type,
        display_order,
        skill_level,
        workers_needed
      )
      SELECT 
        (SELECT id FROM public.template_operations 
         WHERE project_id = new_project_id 
           AND phase_id = new_phase_id 
           AND name = std_operation.name 
           AND display_order = std_operation.display_order 
         LIMIT 1),
        step_number,
        step_title,
        description,
        content_sections,
        materials,
        tools,
        outputs,
        apps,
        estimated_time_minutes,
        flow_type,
        step_type,
        display_order,
        skill_level,
        workers_needed
      FROM public.template_steps
      WHERE operation_id = std_operation.id
      ORDER BY display_order;
    END LOOP;
  END LOOP;

  -- Rebuild phases JSON from relational data
  PERFORM rebuild_phases_json_from_project_phases(new_project_id);

  RETURN new_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Fix 2: Add comment documenting the dynamic linkage approach
-- ============================================
COMMENT ON FUNCTION public.create_project_with_standard_foundation_v2 IS 
'Creates a new project template by copying ALL standard phases (is_standard = true) from Standard Project Foundation. 
This ensures dynamic linkage - any newly added standard phases are automatically included, not just hardcoded ones.';

