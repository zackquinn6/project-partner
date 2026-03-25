-- PFMEA extension: one row per project template, requirements linked to relational workflow (not JSON copy).
-- Custom phases only: excludes standard foundation phases and incorporated/linked phases.
--
-- Prerequisite: public.is_admin(uuid) exists (see security / profile roles migrations). RLS policies call it.
-- If pfmea_* tables already exist with a different shape, resolve conflicts before applying.

-- ---------------------------------------------------------------------------
-- 1) Extension table: projects_pfmea
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.projects_pfmea (
  project_id uuid PRIMARY KEY REFERENCES public.projects (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_pfmea_updated_at ON public.projects_pfmea (updated_at DESC);

-- ---------------------------------------------------------------------------
-- 2) PFMEA requirements: FKs to project_phases, phase_operations, operation_steps
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pfmea_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects_pfmea (project_id) ON DELETE CASCADE,
  project_phase_id uuid NOT NULL REFERENCES public.project_phases (id) ON DELETE CASCADE,
  phase_operation_id uuid NOT NULL REFERENCES public.phase_operations (id) ON DELETE CASCADE,
  operation_step_id uuid NOT NULL REFERENCES public.operation_steps (id) ON DELETE CASCADE,
  requirement_text text NOT NULL,
  output_reference jsonb,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pfmea_requirements_unique_line UNIQUE (project_id, operation_step_id, requirement_text)
);

CREATE INDEX IF NOT EXISTS idx_pfmea_requirements_project_id ON public.pfmea_requirements (project_id);
CREATE INDEX IF NOT EXISTS idx_pfmea_requirements_step_id ON public.pfmea_requirements (operation_step_id);

CREATE OR REPLACE FUNCTION public.pfmea_requirements_validate_chain()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_op_phase uuid;
  v_step_op uuid;
BEGIN
  SELECT po.phase_id INTO v_op_phase
  FROM public.phase_operations po
  WHERE po.id = NEW.phase_operation_id;

  IF v_op_phase IS DISTINCT FROM NEW.project_phase_id THEN
    RAISE EXCEPTION 'pfmea_requirements: phase_operation_id does not belong to project_phase_id';
  END IF;

  SELECT os.operation_id INTO v_step_op
  FROM public.operation_steps os
  WHERE os.id = NEW.operation_step_id;

  IF v_step_op IS DISTINCT FROM NEW.phase_operation_id THEN
    RAISE EXCEPTION 'pfmea_requirements: operation_step_id does not belong to phase_operation_id';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_pfmea_requirements_chain ON public.pfmea_requirements;
CREATE TRIGGER tr_pfmea_requirements_chain
  BEFORE INSERT OR UPDATE ON public.pfmea_requirements
  FOR EACH ROW
  EXECUTE PROCEDURE public.pfmea_requirements_validate_chain();

-- ---------------------------------------------------------------------------
-- 3) Failure mode tree (unchanged shape from app expectations)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pfmea_failure_modes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id uuid NOT NULL REFERENCES public.pfmea_requirements (id) ON DELETE CASCADE,
  failure_mode text NOT NULL,
  severity_score integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pfmea_failure_modes_requirement ON public.pfmea_failure_modes (requirement_id);

CREATE TABLE IF NOT EXISTS public.pfmea_potential_effects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  failure_mode_id uuid NOT NULL REFERENCES public.pfmea_failure_modes (id) ON DELETE CASCADE,
  effect_description text NOT NULL DEFAULT '',
  severity_score integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pfmea_potential_causes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  failure_mode_id uuid NOT NULL REFERENCES public.pfmea_failure_modes (id) ON DELETE CASCADE,
  cause_description text NOT NULL DEFAULT '',
  occurrence_score integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pfmea_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  failure_mode_id uuid REFERENCES public.pfmea_failure_modes (id) ON DELETE CASCADE,
  cause_id uuid REFERENCES public.pfmea_potential_causes (id) ON DELETE CASCADE,
  control_type text NOT NULL,
  control_description text NOT NULL DEFAULT '',
  detection_score integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pfmea_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  failure_mode_id uuid NOT NULL REFERENCES public.pfmea_failure_modes (id) ON DELETE CASCADE,
  recommended_action text NOT NULL DEFAULT '',
  responsible_person text,
  target_completion_date text,
  status text NOT NULL DEFAULT 'open',
  completion_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4) Ensure: create missing PFMEA requirement rows from relational workflow (custom phases only)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_pfmea_requirements_for_project(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_elem jsonb;
  v_req text;
  v_ord integer;
  v_i integer;
  v_len integer;
BEGIN
  IF p_project_id IS NULL THEN
    RAISE EXCEPTION 'sync_pfmea_requirements_for_project: project id required';
  END IF;

  INSERT INTO public.projects_pfmea (project_id)
  VALUES (p_project_id)
  ON CONFLICT (project_id) DO UPDATE SET updated_at = now();

  FOR r IN
    SELECT
      st.id AS operation_step_id,
      st.step_title,
      st.outputs,
      po.id AS phase_operation_id,
      pp.id AS project_phase_id
    FROM public.operation_steps st
    INNER JOIN public.phase_operations po ON po.id = st.operation_id
    INNER JOIN public.project_phases pp ON pp.id = po.phase_id
    WHERE pp.project_id = p_project_id
      AND pp.is_standard IS NOT TRUE
      AND pp.is_linked IS NOT TRUE
    ORDER BY pp.display_order, po.display_order, st.display_order
  LOOP
    v_ord := 0;
    IF r.outputs IS NOT NULL AND jsonb_typeof(r.outputs) = 'array' THEN
      v_len := jsonb_array_length(r.outputs);
      IF v_len > 0 THEN
        FOR v_i IN 0..(v_len - 1) LOOP
          v_elem := r.outputs -> v_i;
          v_req := nullif(trim(v_elem ->> 'name'), '');
          IF v_req IS NULL THEN
            v_req := r.step_title;
          END IF;
          v_ord := v_ord + 1;
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
            r.project_phase_id,
            r.phase_operation_id,
            r.operation_step_id,
            v_req,
            v_elem,
            v_ord
          )
          ON CONFLICT (project_id, operation_step_id, requirement_text) DO NOTHING;
        END LOOP;
      END IF;
    END IF;

    IF v_ord = 0 THEN
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
        r.project_phase_id,
        r.phase_operation_id,
        r.operation_step_id,
        r.step_title,
        NULL,
        1
      )
      ON CONFLICT (project_id, operation_step_id, requirement_text) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_pfmea_requirements_for_project(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_pfmea_requirements_for_project(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_pfmea_requirements_for_project(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 5) Auto-create projects_pfmea when a project row is inserted
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tr_projects_seed_pfmea()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.projects_pfmea (project_id)
  VALUES (NEW.id)
  ON CONFLICT (project_id) DO NOTHING;
  
  -- Seed requirement rows once per project revision/template so PFMEA exists at revision level.
  -- This is idempotent (does not overwrite user-entered PFMEA failure mode data).
  PERFORM public.sync_pfmea_requirements_for_project(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_projects_seed_pfmea ON public.projects;
CREATE TRIGGER tr_projects_seed_pfmea
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.tr_projects_seed_pfmea();

-- Backfill extension rows for existing projects
INSERT INTO public.projects_pfmea (project_id)
SELECT id FROM public.projects
ON CONFLICT (project_id) DO NOTHING;

-- Backfill PFMEA requirements for existing extension rows (idempotent)
DO $$
DECLARE
  pr record;
BEGIN
  FOR pr IN
    SELECT p.project_id
    FROM public.projects_pfmea p
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.pfmea_requirements r
      WHERE r.project_id = p.project_id
      LIMIT 1
    )
  LOOP
    PERFORM public.sync_pfmea_requirements_for_project(pr.project_id);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 6) RLS (requires public.is_admin from security migrations)
-- ---------------------------------------------------------------------------

ALTER TABLE public.projects_pfmea ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pfmea_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pfmea_failure_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pfmea_potential_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pfmea_potential_causes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pfmea_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pfmea_action_items ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r record;
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'projects_pfmea',
    'pfmea_requirements',
    'pfmea_failure_modes',
    'pfmea_potential_effects',
    'pfmea_potential_causes',
    'pfmea_controls',
    'pfmea_action_items'
  ]
  LOOP
    FOR r IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, t);
    END LOOP;
  END LOOP;
END $$;

CREATE POLICY projects_pfmea_admin ON public.projects_pfmea
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY pfmea_requirements_admin ON public.pfmea_requirements
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY pfmea_failure_modes_admin ON public.pfmea_failure_modes
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY pfmea_potential_effects_admin ON public.pfmea_potential_effects
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY pfmea_potential_causes_admin ON public.pfmea_potential_causes
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY pfmea_controls_admin ON public.pfmea_controls
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY pfmea_action_items_admin ON public.pfmea_action_items
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
