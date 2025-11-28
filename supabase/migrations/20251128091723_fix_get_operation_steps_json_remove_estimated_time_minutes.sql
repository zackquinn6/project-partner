-- Migration: Fix get_operation_steps_json to remove estimated_time_minutes reference
-- This function is used by rebuild_phases_json_from_project_phases and get_project_workflow_with_standards

-- Drop and recreate the function without estimated_time_minutes
DROP FUNCTION IF EXISTS public.get_operation_steps_json(UUID, BOOLEAN) CASCADE;

CREATE OR REPLACE FUNCTION public.get_operation_steps_json(
  p_operation_id UUID,
  p_is_reference BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  steps_json JSONB := '[]'::jsonb;
BEGIN
  -- Build steps JSON array
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ts.id,
      'step', ts.step_title,
      'step_title', ts.step_title,
      'description', ts.description,
      'step_number', ts.step_number,
      'content_sections', COALESCE(ts.content_sections, '[]'::jsonb),
      'materials', COALESCE(ts.materials, '[]'::jsonb),
      'tools', COALESCE(ts.tools, '[]'::jsonb),
      'outputs', COALESCE(ts.outputs, '[]'::jsonb),
      'apps', COALESCE(ts.apps, '[]'::jsonb),
      'flow_type', ts.flow_type,
      'step_type', ts.step_type,
      'time_estimate_low', ts.time_estimate_low,
      'time_estimate_medium', ts.time_estimate_medium,
      'time_estimate_high', ts.time_estimate_high,
      'workers_needed', ts.workers_needed,
      'skill_level', ts.skill_level,
      'isStandard', p_is_reference
    ) ORDER BY ts.step_number
  )
  INTO steps_json
  FROM public.template_steps ts
  WHERE ts.operation_id = p_operation_id;
  
  RETURN COALESCE(steps_json, '[]'::jsonb);
END;
$$;

COMMENT ON FUNCTION public.get_operation_steps_json IS 
'Returns JSONB array of steps for an operation. Removed estimated_time_minutes - use time_estimate_low/medium/high instead.';

-- Verify the function was created
DO $$
DECLARE
  func_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_operation_steps_json'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) INTO func_exists;

  IF NOT func_exists THEN
    RAISE EXCEPTION '❌ Function get_operation_steps_json was not created';
  END IF;

  RAISE NOTICE '✅ Function get_operation_steps_json recreated successfully';
  RAISE NOTICE '✅ Removed estimated_time_minutes reference';
END $$;

