-- Fix get_operation_steps_json to remove display_order references
-- Migration: 20251126000004_fix_get_operation_steps_json_display_order.sql
--
-- This migration fixes the get_operation_steps_json function to remove
-- references to the display_order column which has been dropped from template_steps.

-- ============================================
-- STEP 1: Drop existing function if it exists
-- ============================================
DROP FUNCTION IF EXISTS public.get_operation_steps_json(
  p_operation_id UUID,
  p_is_reference BOOLEAN
);

-- ============================================
-- STEP 2: Create fixed get_operation_steps_json function
-- ============================================
CREATE OR REPLACE FUNCTION public.get_operation_steps_json(
  p_operation_id UUID,
  p_is_reference BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
  steps_json JSONB := '[]'::jsonb;
  step_record RECORD;
BEGIN
  -- Get all steps for the operation, ordered by step_number (natural order)
  -- Since display_order has been removed, we order by step_number and created_at
  FOR step_record IN
    SELECT
      ts.id,
      ts.operation_id,
      ts.step_number,
      ts.step_title,
      ts.description,
      ts.content_sections,
      ts.materials,
      ts.tools,
      ts.outputs,
      ts.apps,
      ts.estimated_time_minutes,
      ts.flow_type,
      ts.step_type,
      ts.created_at
    FROM public.template_steps ts
    WHERE ts.operation_id = p_operation_id
    ORDER BY ts.step_number, ts.created_at
  LOOP
    steps_json := steps_json || jsonb_build_array(
      jsonb_build_object(
        'id', step_record.id,
        'operationId', step_record.operation_id,
        'stepNumber', step_record.step_number,
        'stepTitle', step_record.step_title,
        'description', step_record.description,
        'contentSections', COALESCE(step_record.content_sections, '[]'::jsonb),
        'materials', COALESCE(step_record.materials, '[]'::jsonb),
        'tools', COALESCE(step_record.tools, '[]'::jsonb),
        'outputs', COALESCE(step_record.outputs, '[]'::jsonb),
        'apps', COALESCE(step_record.apps, '[]'::jsonb),
        'estimatedTimeMinutes', COALESCE(step_record.estimated_time_minutes, 0),
        'flowType', COALESCE(step_record.flow_type, 'prime'),
        'stepType', COALESCE(step_record.step_type, 'prime'),
        'isStandard', p_is_reference
      )
    );
  END LOOP;

  RETURN steps_json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_operation_steps_json IS 
'Returns JSONB array of steps for an operation, ordered by step_number and created_at.
The display_order column has been removed, so ordering is based on step_number (natural order).';

-- ============================================
-- STEP 3: Ensure get_project_workflow_with_standards function exists
-- ============================================
CREATE OR REPLACE FUNCTION public.get_project_workflow_with_standards(
  p_project_id UUID
)
RETURNS JSONB AS $$
DECLARE
  workflow_json JSONB;
BEGIN
  -- Use rebuild_phases_json_from_project_phases to get the complete workflow
  -- This function already handles:
  -- 1. Getting all phases (standard and custom) from project_phases table
  -- 2. Getting all operations for each phase
  -- 3. For standard operations with source_operation_id, pulling steps from Standard Project Foundation
  -- 4. Building the complete phases JSON with all content
  
  SELECT public.rebuild_phases_json_from_project_phases(p_project_id)
  INTO workflow_json;
  
  -- Return the workflow JSON
  RETURN COALESCE(workflow_json, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_project_workflow_with_standards IS 
'Returns the complete workflow JSON for a project, including all phases, operations, and steps.
Uses rebuild_phases_json_from_project_phases which orders phases by position_rule/position_value.';

