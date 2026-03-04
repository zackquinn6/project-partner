-- Add 4th kickoff step (Workflow Setup) and rename all kickoff steps for the standard project.
-- Step names: 1. Project Match, 2. Build Style, 3. Scope & Specs, 4. Workflow Setup

DO $$
DECLARE
  v_standard_project_id UUID;
  v_kickoff_operation_id UUID;
BEGIN
  SELECT id INTO v_standard_project_id FROM public.projects WHERE is_standard = true LIMIT 1;
  IF v_standard_project_id IS NULL THEN
    RAISE NOTICE 'Standard project not found; skipping kickoff step updates.';
    RETURN;
  END IF;

  SELECT po.id INTO v_kickoff_operation_id
  FROM public.phase_operations po
  JOIN public.project_phases pp ON po.phase_id = pp.id
  WHERE pp.project_id = v_standard_project_id AND pp.name = 'Kickoff'
  LIMIT 1;

  IF v_kickoff_operation_id IS NULL THEN
    RAISE NOTICE 'Kickoff operation not found; skipping.';
    RETURN;
  END IF;

  -- Rename existing steps 1–3
  UPDATE public.operation_steps
  SET step_title = 'Project Match',
      description = 'Review project scope, goals, and requirements'
  WHERE operation_id = v_kickoff_operation_id AND display_order = 1;

  UPDATE public.operation_steps
  SET step_title = 'Build Style',
      description = 'Set up user information and preferences'
  WHERE operation_id = v_kickoff_operation_id AND display_order = 2;

  UPDATE public.operation_steps
  SET step_title = 'Scope & Specs',
      description = 'Define project-specific details and constraints'
  WHERE operation_id = v_kickoff_operation_id AND display_order = 3;

  -- Insert 4th step if not present
  IF NOT EXISTS (SELECT 1 FROM public.operation_steps WHERE operation_id = v_kickoff_operation_id AND display_order = 4) THEN
    INSERT INTO public.operation_steps (
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
      v_kickoff_operation_id,
      'Workflow Setup',
      'Choose which planning tools to use for this project',
      'text',
      'Select the tools you want to use: Scope, Schedule, Risk/Uncertainty, Budget, Detailed Instructions, Quality Control, Expert Support. Tools can be added later.',
      4,
      '[]'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      NOW(),
      NOW()
    );
    RAISE NOTICE 'Inserted 4th kickoff step: Workflow Setup';
  ELSE
    UPDATE public.operation_steps
    SET step_title = 'Workflow Setup',
        description = 'Choose which planning tools to use for this project'
    WHERE operation_id = v_kickoff_operation_id AND display_order = 4;
  END IF;

  -- Rebuild standard project phases JSONB so new runs get 4 steps
  PERFORM public.rebuild_phases_json_from_project_phases(v_standard_project_id);
  RAISE NOTICE 'Kickoff steps updated: Project Match, Build Style, Scope & Specs, Workflow Setup';
END $$;
