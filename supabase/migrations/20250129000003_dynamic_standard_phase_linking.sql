-- Dynamic Standard Phase Linking - NO COPYING
-- Migration: 20250129000003_dynamic_standard_phase_linking.sql
--
-- This migration implements true dynamic linking where:
-- 1. Standard phases ONLY exist in Standard Project Foundation
-- 2. Project templates have NO standard phases copied
-- 3. When viewing a template, standard phases are dynamically merged from foundation
-- 4. When creating new projects, standard phases are NOT copied

-- ============================================
-- STEP 1: Update get_project_workflow_with_standards to dynamically merge standard phases
-- ============================================
CREATE OR REPLACE FUNCTION public.get_project_workflow_with_standards(
  p_project_id UUID
)
RETURNS JSONB AS $$
DECLARE
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  workflow_json JSONB := '[]'::jsonb;
  custom_phases_json JSONB;
  standard_phases_json JSONB;
  merged_phases_json JSONB;
  phase_record RECORD;
  operations_json JSONB;
  operation_record RECORD;
  effective_operation_id UUID;
  steps_json JSONB;
  std_phase RECORD;
BEGIN
  -- If this IS the standard project, just return its phases normally
  IF p_project_id = standard_project_id THEN
    SELECT public.rebuild_phases_json_from_project_phases(p_project_id)
    INTO workflow_json;
    RETURN COALESCE(workflow_json, '[]'::jsonb);
  END IF;

  -- For regular project templates:
  -- 1. Get custom phases from this project (phases that are NOT standard)
  custom_phases_json := '[]'::jsonb;
  
  FOR phase_record IN
    SELECT 
      id,
      project_id,
      name,
      description,
      display_order,
      is_standard,
      standard_phase_id
    FROM public.project_phases
    WHERE project_id = p_project_id
      AND (is_standard = false OR is_standard IS NULL)  -- Only custom phases
    ORDER BY display_order
  LOOP
    operations_json := '[]'::jsonb;

    FOR operation_record IN
      SELECT DISTINCT
        op.id,
        op.project_id,
        op.phase_id,
        op.name,
        op.description,
        op.flow_type,
        op.user_prompt,
        op.alternate_group,
        op.display_order,
        op.is_standard_phase,
        op.source_operation_id,
        op.is_reference
      FROM public.template_operations op
      WHERE op.project_id = p_project_id
        AND op.phase_id = phase_record.id
      ORDER BY op.display_order
    LOOP
      effective_operation_id := COALESCE(operation_record.source_operation_id, operation_record.id);

      steps_json := public.get_operation_steps_json(
        effective_operation_id,
        COALESCE(operation_record.is_reference, false)
      );

      operations_json := operations_json || jsonb_build_array(
        jsonb_build_object(
          'id', operation_record.id,
          'name', operation_record.name,
          'description', operation_record.description,
          'flowType', COALESCE(operation_record.flow_type, 'prime'),
          'userPrompt', operation_record.user_prompt,
          'alternateGroup', operation_record.alternate_group,
          'steps', COALESCE(steps_json, '[]'::jsonb),
          'isStandard', false,
          'sourceOperationId', operation_record.source_operation_id
        )
      );
    END LOOP;

    custom_phases_json := custom_phases_json || jsonb_build_array(
      jsonb_build_object(
        'id', phase_record.id,
        'name', phase_record.name,
        'description', phase_record.description,
        'operations', COALESCE(operations_json, '[]'::jsonb),
        'isStandard', false
      )
    );
  END LOOP;

  -- 2. Get standard phases from Standard Project Foundation
  standard_phases_json := '[]'::jsonb;
  
  FOR std_phase IN
    SELECT 
      pp.id,
      pp.name,
      pp.description,
      pp.display_order,
      pp.standard_phase_id,
      sp.position_rule,
      sp.position_value
    FROM public.project_phases pp
    JOIN public.standard_phases sp ON pp.standard_phase_id = sp.id
    WHERE pp.project_id = standard_project_id
      AND pp.is_standard = true
    ORDER BY sp.display_order
  LOOP
    operations_json := '[]'::jsonb;

    -- Get operations for this standard phase from foundation
    FOR operation_record IN
      SELECT DISTINCT
        op.id,
        op.name,
        op.description,
        op.flow_type,
        op.user_prompt,
        op.alternate_group,
        op.display_order
      FROM public.template_operations op
      WHERE op.project_id = standard_project_id
        AND op.phase_id = std_phase.id
      ORDER BY op.display_order
    LOOP
      steps_json := public.get_operation_steps_json(
        operation_record.id,
        false
      );

      operations_json := operations_json || jsonb_build_array(
        jsonb_build_object(
          'id', operation_record.id,
          'name', operation_record.name,
          'description', operation_record.description,
          'flowType', COALESCE(operation_record.flow_type, 'prime'),
          'userPrompt', operation_record.user_prompt,
          'alternateGroup', operation_record.alternate_group,
          'steps', COALESCE(steps_json, '[]'::jsonb),
          'isStandard', true,
          'sourceOperationId', operation_record.id
        )
      );
    END LOOP;

    standard_phases_json := standard_phases_json || jsonb_build_array(
      jsonb_build_object(
        'id', std_phase.id,
        'name', std_phase.name,
        'description', std_phase.description,
        'operations', COALESCE(operations_json, '[]'::jsonb),
        'isStandard', true,
        'standardPhaseId', std_phase.standard_phase_id,
        'phaseOrderNumber', std_phase.position_rule,
        'phaseOrderValue', std_phase.position_value
      )
    );
  END LOOP;

  -- 3. Merge standard and custom phases
  -- The UI will handle proper ordering via enforceStandardPhaseOrdering
  -- For now, return standard phases first, then custom phases
  -- The phaseOrderNumber and phaseOrderValue fields will guide the UI ordering
  merged_phases_json := standard_phases_json || custom_phases_json;

  RETURN COALESCE(merged_phases_json, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 2: Update create_project_with_standard_foundation_v2 to NOT copy standard phases
-- ============================================
CREATE OR REPLACE FUNCTION public.create_project_with_standard_foundation_v2(
  p_project_name TEXT,
  p_project_description TEXT,
  p_category TEXT DEFAULT 'general',
  p_created_by UUID DEFAULT auth.uid()
) RETURNS UUID AS $$
DECLARE
  new_project_id UUID;
  category_array TEXT[];
BEGIN
  -- Convert single category text to array
  category_array := ARRAY[COALESCE(p_category, 'general')];
  
  -- Create project - NO standard phases copied!
  -- Standard phases will be dynamically merged when viewing the project
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
    category_array,
    'draft',
    p_created_by,
    true
  ) RETURNING id INTO new_project_id;

  -- Initialize empty phases JSON
  -- Standard phases will be added dynamically by get_project_workflow_with_standards
  UPDATE public.projects
  SET phases = '[]'::jsonb
  WHERE id = new_project_id;

  RETURN new_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 3: Add comment documenting the new architecture
-- ============================================
COMMENT ON FUNCTION public.get_project_workflow_with_standards IS 
'Returns the complete workflow for a project template by DYNAMICALLY merging:
- Standard phases from Standard Project Foundation (always included)
- Custom phases from the project template (if any)

NO COPYING: Standard phases are never copied into templates. They are always pulled
dynamically from the Standard Project Foundation, ensuring templates always have
the latest standard phase content.

Used by the UI to display project workflows in StructureManager, EditWorkflowView, etc.';

COMMENT ON FUNCTION public.create_project_with_standard_foundation_v2 IS 
'Creates a new project template WITHOUT copying standard phases.

Standard phases are NOT stored in the template. Instead, they are dynamically
merged from Standard Project Foundation when viewing the project via
get_project_workflow_with_standards().

This ensures:
- Single source of truth for standard phases
- Templates always get latest standard phase content
- No duplication of standard phase data';

