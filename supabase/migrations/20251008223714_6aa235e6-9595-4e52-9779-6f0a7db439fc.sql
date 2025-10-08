-- Fix create_project_with_standard_foundation to properly copy apps from Standard Project Foundation
CREATE OR REPLACE FUNCTION public.create_project_with_standard_foundation(
  p_user_id UUID,
  p_project_name TEXT,
  p_project_type TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_project_id UUID;
  v_standard_phases JSONB;
  v_processed_phases JSONB;
  v_phase JSONB;
  v_operation JSONB;
  v_step JSONB;
  v_new_phase JSONB;
  v_new_operation JSONB;
  v_new_step JSONB;
  v_new_phases JSONB := '[]'::JSONB;
  v_new_operations JSONB;
  v_new_steps JSONB;
BEGIN
  -- Get phases from Standard Project Foundation
  SELECT phases INTO v_standard_phases
  FROM public.projects
  WHERE id = '00000000-0000-0000-0000-000000000001';

  IF v_standard_phases IS NULL THEN
    RAISE EXCEPTION 'Standard Project Foundation not found';
  END IF;

  -- Process each phase and assign new UUIDs while preserving ALL data including apps
  FOR v_phase IN SELECT * FROM jsonb_array_elements(v_standard_phases)
  LOOP
    v_new_operations := '[]'::JSONB;
    
    -- Process operations
    FOR v_operation IN SELECT * FROM jsonb_array_elements(v_phase->'operations')
    LOOP
      v_new_steps := '[]'::JSONB;
      
      -- Process steps and preserve apps
      FOR v_step IN SELECT * FROM jsonb_array_elements(v_operation->'steps')
      LOOP
        v_new_step := jsonb_build_object(
          'id', gen_random_uuid()::text,
          'step', v_step->>'step',
          'description', COALESCE(v_step->>'description', ''),
          'contentType', COALESCE(v_step->>'contentType', 'multi'),
          'content', COALESCE(v_step->'content', '[]'::jsonb),
          'materials', COALESCE(v_step->'materials', '[]'::jsonb),
          'tools', COALESCE(v_step->'tools', '[]'::jsonb),
          'outputs', COALESCE(v_step->'outputs', '[]'::jsonb),
          'apps', COALESCE(v_step->'apps', '[]'::jsonb),
          'estimatedTime', COALESCE((v_step->>'estimatedTime')::int, 0)
        );
        
        v_new_steps := v_new_steps || v_new_step;
      END LOOP;
      
      v_new_operation := jsonb_build_object(
        'id', gen_random_uuid()::text,
        'name', v_operation->>'name',
        'description', COALESCE(v_operation->>'description', ''),
        'steps', v_new_steps
      );
      
      v_new_operations := v_new_operations || v_new_operation;
    END LOOP;
    
    v_new_phase := jsonb_build_object(
      'id', gen_random_uuid()::text,
      'name', v_phase->>'name',
      'description', COALESCE(v_phase->>'description', ''),
      'operations', v_new_operations,
      'isStandard', true
    );
    
    v_new_phases := v_new_phases || v_new_phase;
  END LOOP;

  -- Create the new project
  INSERT INTO public.projects (
    user_id,
    name,
    project_type,
    description,
    phases,
    is_template,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_project_name,
    p_project_type,
    p_description,
    v_new_phases,
    false,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_new_project_id;

  RETURN v_new_project_id;
END;
$$;