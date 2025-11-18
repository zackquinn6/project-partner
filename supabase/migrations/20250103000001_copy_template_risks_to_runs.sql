-- Function to copy template risks to project run when a run is created
-- This should be called from create_project_run_snapshot or similar functions

CREATE OR REPLACE FUNCTION public.copy_template_risks_to_project_run(
  p_template_id uuid,
  p_project_run_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  template_risk record;
  risk_order integer := 0;
BEGIN
  -- Copy all template risks to the project run
  FOR template_risk IN
    SELECT * FROM public.project_risks
    WHERE project_id = p_template_id
    ORDER BY display_order ASC
  LOOP
    INSERT INTO public.project_run_risks (
      project_run_id,
      template_risk_id,
      risk,
      likelihood,
      impact,
      mitigation,
      status,
      is_template_risk,
      display_order
    ) VALUES (
      p_project_run_id,
      template_risk.id,
      template_risk.risk,
      template_risk.likelihood,
      template_risk.impact,
      template_risk.mitigation,
      'open', -- Default status for new risks
      true, -- Mark as template risk
      risk_order
    );
    
    risk_order := risk_order + 1;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.copy_template_risks_to_project_run IS 'Copies all template risks to a new project run when the run is created';

-- Update create_project_run_snapshot to copy risks
CREATE OR REPLACE FUNCTION public.create_project_run_snapshot(
  p_template_id uuid, 
  p_user_id uuid, 
  p_run_name text, 
  p_home_id uuid DEFAULT NULL::uuid, 
  p_start_date timestamp with time zone DEFAULT now(), 
  p_plan_end_date timestamp with time zone DEFAULT (now() + '30 days'::interval)
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_run_id uuid;
  template_project record;
  complete_phases jsonb;
BEGIN
  -- Verify user can create runs
  IF auth.uid() != p_user_id AND NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot create project runs for other users';
  END IF;
  
  -- Get template project
  SELECT * INTO template_project
  FROM public.projects
  WHERE id = p_template_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template project not found: %', p_template_id;
  END IF;
  
  -- Build complete phases JSON dynamically at snapshot time
  -- This merges standard phases from foundation with custom phases from template
  complete_phases := build_phases_json_with_dynamic_standard(p_template_id);
  
  -- Validate we have phases
  IF complete_phases IS NULL OR jsonb_array_length(complete_phases) = 0 THEN
    RAISE EXCEPTION 'No phases found for project template: %', p_template_id;
  END IF;
  
  -- Create immutable snapshot with complete phases
  INSERT INTO public.project_runs (
    template_id,
    user_id,
    name,
    description,
    home_id,
    status,
    start_date,
    plan_end_date,
    phases,
    category,
    difficulty,
    estimated_time,
    effort_level,
    skill_level,
    diy_length_challenges,
    completed_steps,
    progress
  ) VALUES (
    p_template_id,
    p_user_id,
    p_run_name,
    template_project.description,
    p_home_id,
    'not-started',
    p_start_date,
    p_plan_end_date,
    complete_phases,
    template_project.category,
    template_project.difficulty,
    template_project.estimated_time,
    template_project.effort_level,
    template_project.skill_level,
    template_project.diy_length_challenges,
    '[]'::jsonb,
    0
  ) RETURNING id INTO new_run_id;
  
  -- Copy template risks to the new project run
  PERFORM copy_template_risks_to_project_run(p_template_id, new_run_id);
  
  -- Log the creation
  PERFORM log_comprehensive_security_event(
    'project_run_created',
    'low',
    'Created project run snapshot: ' || p_run_name,
    p_user_id,
    NULL, NULL, NULL,
    jsonb_build_object(
      'run_id', new_run_id,
      'template_id', p_template_id,
      'run_name', p_run_name,
      'phases_count', jsonb_array_length(complete_phases)
    )
  );
  
  RETURN new_run_id;
END;
$$;

COMMENT ON FUNCTION public.create_project_run_snapshot IS 'Creates a new project run from a template, including copying template risks';

