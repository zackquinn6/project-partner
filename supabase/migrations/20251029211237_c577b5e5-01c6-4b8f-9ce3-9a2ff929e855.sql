-- Phase 1: Clean up duplicate kickoff step IDs with safe type handling
-- First, ensure all completed_steps are proper arrays
UPDATE project_runs
SET completed_steps = '[]'::jsonb
WHERE completed_steps IS NULL 
   OR jsonb_typeof(completed_steps) != 'array';

-- Now remove old kickoff-step-* IDs
UPDATE project_runs
SET 
  completed_steps = (
    SELECT COALESCE(jsonb_agg(step_id), '[]'::jsonb)
    FROM jsonb_array_elements_text(completed_steps) AS step_id
    WHERE step_id NOT LIKE 'kickoff-step-%'
  ),
  updated_at = now()
WHERE jsonb_typeof(completed_steps) = 'array'
  AND completed_steps::text LIKE '%kickoff-step-%';

-- Recalculate progress
UPDATE project_runs pr
SET 
  progress = CASE
    WHEN jsonb_typeof(pr.phases) = 'array' 
         AND jsonb_array_length(pr.phases) > 0 
         AND jsonb_typeof(pr.completed_steps) = 'array' 
         AND jsonb_array_length(pr.completed_steps) > 0 
    THEN
      LEAST(100, (
        jsonb_array_length(pr.completed_steps)::float / GREATEST(1,
          (SELECT COUNT(*)
           FROM jsonb_array_elements(pr.phases) AS phase
           CROSS JOIN jsonb_array_elements(phase->'operations') AS operation  
           CROSS JOIN jsonb_array_elements(operation->'steps') AS step
           WHERE phase->>'name' NOT IN ('Kickoff', 'Planning', 'Ordering', 'Close Project'))
        )
      ) * 100)
    ELSE 0
  END,
  updated_at = now();

-- Phase 2: Create refresh function
CREATE OR REPLACE FUNCTION public.refresh_project_run_from_template(p_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_template_id uuid;
  v_user_id uuid;
  v_template_data record;
BEGIN
  SELECT template_id, user_id INTO v_template_id, v_user_id
  FROM project_runs WHERE id = p_run_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project run not found';
  END IF;
  
  IF v_user_id != auth.uid() AND NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  SELECT phases, category, difficulty, estimated_time, effort_level, skill_level, diy_length_challenges
  INTO v_template_data
  FROM projects WHERE id = v_template_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;
  
  UPDATE project_runs
  SET 
    phases = v_template_data.phases,
    category = v_template_data.category,
    difficulty = v_template_data.difficulty,
    estimated_time = v_template_data.estimated_time,
    effort_level = v_template_data.effort_level,
    skill_level = v_template_data.skill_level,
    diy_length_challenges = v_template_data.diy_length_challenges,
    updated_at = now()
  WHERE id = p_run_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Project refreshed');
END;
$$;