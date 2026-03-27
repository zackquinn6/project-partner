-- PFMEA: requirements reference projects directly (no projects_pfmea bridge).
-- project_runs: template_id -> project_id (FK to projects).
-- user_maintenance_tasks: template_id -> maintenance_template_id (FK to maintenance_templates; not a project row).
-- create_project_run_snapshot + sync_pfmea_requirements_for_project updated accordingly.

-- ---------------------------------------------------------------------------
-- 1) PFMEA: repoint FK and drop projects_pfmea
-- ---------------------------------------------------------------------------
ALTER TABLE public.pfmea_requirements
  DROP CONSTRAINT IF EXISTS pfmea_requirements_project_id_fkey;

ALTER TABLE public.pfmea_requirements
  ADD CONSTRAINT pfmea_requirements_project_id_fkey
  FOREIGN KEY (project_id)
  REFERENCES public.projects (id)
  ON DELETE CASCADE;

DROP TABLE IF EXISTS public.projects_pfmea;

-- ---------------------------------------------------------------------------
-- 2) project_runs: rename template_id -> project_id
-- ---------------------------------------------------------------------------
ALTER TABLE public.project_runs
  RENAME COLUMN template_id TO project_id;

ALTER TABLE public.project_runs
  DROP CONSTRAINT IF EXISTS project_runs_template_id_fkey;

ALTER TABLE public.project_runs
  ADD CONSTRAINT project_runs_project_id_fkey
  FOREIGN KEY (project_id)
  REFERENCES public.projects (id);

-- ---------------------------------------------------------------------------
-- 3) user_maintenance_tasks: disambiguate from project runs
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_maintenance_tasks
  RENAME COLUMN template_id TO maintenance_template_id;

ALTER TABLE public.user_maintenance_tasks
  DROP CONSTRAINT IF EXISTS user_maintenance_tasks_template_id_fkey;

ALTER TABLE public.user_maintenance_tasks
  ADD CONSTRAINT user_maintenance_tasks_maintenance_template_id_fkey
  FOREIGN KEY (maintenance_template_id)
  REFERENCES public.maintenance_templates (id);

-- ---------------------------------------------------------------------------
-- 4) create_project_run_snapshot (p_project_id)
-- ---------------------------------------------------------------------------
-- Parameter names are part of the function identity for CREATE OR REPLACE in PG:
-- renaming p_template_id -> p_project_id requires DROP first (same arg types).
DROP FUNCTION IF EXISTS public.create_project_run_snapshot(uuid, uuid, text, uuid, timestamp with time zone, timestamp with time zone);

CREATE OR REPLACE FUNCTION public.create_project_run_snapshot(
  p_project_id UUID,
  p_user_id UUID,
  p_run_name TEXT,
  p_home_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NOW(),
  p_plan_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_run_id UUID;
  workflow_json JSONB;
  default_home_id UUID;
  default_space_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id) THEN
    RAISE EXCEPTION 'Project not found: %', p_project_id;
  END IF;

  IF p_home_id IS NOT NULL THEN
    default_home_id := p_home_id;
  ELSE
    SELECT id INTO default_home_id
    FROM public.homes
    WHERE user_id = p_user_id
    ORDER BY created_at ASC
    LIMIT 1;

    IF default_home_id IS NULL THEN
      INSERT INTO public.homes (user_id, name, address)
      VALUES (p_user_id, 'My Home', '')
      RETURNING id INTO default_home_id;
    END IF;
  END IF;

  SELECT COALESCE(
    to_jsonb(public.get_project_workflow_with_standards(p_project_id)),
    '[]'::jsonb
  )
  INTO workflow_json;

  IF workflow_json IS NULL OR jsonb_array_length(workflow_json) = 0 THEN
    RAISE EXCEPTION 'Project has no phases. Cannot create project run without phases.';
  END IF;

  INSERT INTO public.project_runs (
    project_id,
    user_id,
    name,
    home_id,
    start_date,
    plan_end_date,
    phases,
    created_at,
    updated_at
  ) VALUES (
    p_project_id,
    p_user_id,
    p_run_name,
    default_home_id,
    p_start_date,
    p_plan_end_date,
    workflow_json,
    NOW(),
    NOW()
  ) RETURNING id INTO new_run_id;

  INSERT INTO public.project_run_spaces (
    project_run_id,
    space_name,
    space_type,
    created_at
  ) VALUES (
    new_run_id,
    'Room 1',
    'room',
    NOW()
  ) RETURNING id INTO default_space_id;

  RETURN new_run_id;

EXCEPTION
  WHEN OTHERS THEN
    IF new_run_id IS NOT NULL THEN
      DELETE FROM public.project_runs WHERE id = new_run_id;
    END IF;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 5) sync_pfmea_requirements_for_project — derive rows from workflow outputs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_pfmea_requirements_for_project(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  step_rec RECORD;
  out_elem jsonb;
  ord int;
  out_name text;
  req_text text;
  out_ref jsonb;
  phase_name text;
  op_name text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id) THEN
    RAISE EXCEPTION 'Project not found: %', p_project_id;
  END IF;

  FOR step_rec IN
    SELECT
      pp.id AS project_phase_id,
      po.id AS phase_operation_id,
      os.id AS operation_step_id,
      os.outputs,
      os.step_title AS step_title
    FROM public.project_phases pp
    INNER JOIN public.phase_operations po ON po.phase_id = pp.id
    INNER JOIN public.operation_steps os ON os.operation_id = po.id
    WHERE pp.project_id = p_project_id
  LOOP
    SELECT name INTO phase_name FROM public.project_phases WHERE id = step_rec.project_phase_id;
    SELECT operation_name INTO op_name FROM public.phase_operations WHERE id = step_rec.phase_operation_id;

    IF step_rec.outputs IS NULL THEN
      CONTINUE;
    END IF;

    IF jsonb_typeof(step_rec.outputs::jsonb) <> 'array' THEN
      CONTINUE;
    END IF;

    ord := 0;
    FOR out_elem IN SELECT * FROM jsonb_array_elements(step_rec.outputs::jsonb)
    LOOP
      ord := ord + 1;
      out_name := COALESCE(NULLIF(TRIM(COALESCE(out_elem->>'name', '')), ''), NULL);
      req_text := out_name;
      IF req_text IS NULL THEN
        req_text := COALESCE(NULLIF(TRIM(step_rec.step_title), ''), 'Requirement');
      END IF;

      out_ref := jsonb_build_object(
        'output_id', COALESCE(out_elem->>'id', ''),
        'phase_name', phase_name,
        'operation_name', op_name,
        'step_name', step_rec.step_title
      );

      IF NOT EXISTS (
        SELECT 1
        FROM public.pfmea_requirements pr
        WHERE pr.project_id = p_project_id
          AND pr.operation_step_id = step_rec.operation_step_id
          AND pr.display_order = ord
      ) THEN
        INSERT INTO public.pfmea_requirements (
          project_id,
          project_phase_id,
          phase_operation_id,
          operation_step_id,
          requirement_text,
          output_reference,
          display_order
        ) VALUES (
          p_project_id,
          step_rec.project_phase_id,
          step_rec.phase_operation_id,
          step_rec.operation_step_id,
          req_text,
          out_ref,
          ord
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6) Admin photo aggregation: return project_id (catalog project) per run
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_photos_by_project_type()
RETURNS TABLE (
  project_id uuid,
  template_name text,
  photo_count bigint,
  public_count bigint,
  project_partner_count bigint,
  personal_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    pr.project_id,
    COALESCE(proj.name, 'Unknown project') AS template_name,
    COUNT(ph.id)::bigint AS photo_count,
    COUNT(ph.id) FILTER (WHERE ph.photo_type = 'public')::bigint AS public_count,
    COUNT(ph.id) FILTER (WHERE ph.photo_type = 'project_partner' OR ph.photo_type IS NULL)::bigint AS project_partner_count,
    COUNT(ph.id) FILTER (WHERE ph.photo_type = 'personal')::bigint AS personal_count
  FROM public.project_run_photos ph
  INNER JOIN public.project_runs pr ON pr.id = ph.project_run_id
  LEFT JOIN public.projects proj ON proj.id = pr.project_id
  WHERE pr.project_id IS NOT NULL
  GROUP BY pr.project_id, proj.name;
$$;
