-- Clean up old kickoff step IDs from all project runs
-- This removes the duplicate/stale IDs causing progress calculation issues

DO $$
DECLARE
  run_record RECORD;
  cleaned_steps JSONB := '[]'::jsonb;
  step_text TEXT;
BEGIN
  -- Process each project run
  FOR run_record IN 
    SELECT id, completed_steps 
    FROM public.project_runs 
    WHERE completed_steps IS NOT NULL
      AND jsonb_typeof(completed_steps) = 'array'
  LOOP
    cleaned_steps := '[]'::jsonb;
    
    -- Iterate through each step and keep only non-old-kickoff IDs
    FOR step_text IN 
      SELECT jsonb_array_elements_text(run_record.completed_steps)
    LOOP
      IF step_text NOT IN ('kickoff-step-1', 'kickoff-step-2', 'kickoff-step-3') THEN
        cleaned_steps := cleaned_steps || jsonb_build_array(step_text);
      END IF;
    END LOOP;
    
    -- Update the project run with cleaned steps
    UPDATE public.project_runs
    SET 
      completed_steps = cleaned_steps,
      updated_at = now()
    WHERE id = run_record.id;
  END LOOP;
  
  RAISE NOTICE 'Cleaned up old kickoff step IDs from all project runs';
END $$;

-- Create function to refresh a project run from its template
CREATE OR REPLACE FUNCTION public.refresh_project_run_from_template(p_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  run_record public.project_runs%ROWTYPE;
  template_phases jsonb;
  old_completed_steps jsonb;
  new_phases jsonb;
  result jsonb;
BEGIN
  -- Get the project run
  SELECT * INTO run_record
  FROM public.project_runs
  WHERE id = p_run_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project run not found';
  END IF;
  
  -- Verify user authorization
  IF auth.uid() != run_record.user_id AND NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: You can only refresh your own project runs';
  END IF;
  
  -- Get current template phases
  SELECT phases INTO template_phases
  FROM public.projects
  WHERE id = run_record.template_id;
  
  IF template_phases IS NULL THEN
    RAISE EXCEPTION 'Template not found or has no phases';
  END IF;
  
  -- Store old completed steps for reference
  old_completed_steps := run_record.completed_steps;
  
  -- Update the project run with fresh phases from template
  UPDATE public.project_runs
  SET 
    phases = template_phases,
    updated_at = now()
  WHERE id = p_run_id
  RETURNING phases INTO new_phases;
  
  -- Log the refresh
  PERFORM log_comprehensive_security_event(
    'project_run_refreshed',
    'medium',
    'User refreshed project run from updated template',
    auth.uid(),
    NULL, NULL, NULL,
    jsonb_build_object(
      'run_id', p_run_id,
      'template_id', run_record.template_id,
      'old_steps_count', CASE WHEN old_completed_steps IS NOT NULL THEN jsonb_array_length(old_completed_steps) ELSE 0 END,
      'new_phases_count', CASE WHEN new_phases IS NOT NULL THEN jsonb_array_length(new_phases) ELSE 0 END
    )
  );
  
  result := jsonb_build_object(
    'success', true,
    'message', 'Project run refreshed successfully',
    'phases_updated', true,
    'completed_steps_preserved', true
  );
  
  RETURN result;
END;
$function$;