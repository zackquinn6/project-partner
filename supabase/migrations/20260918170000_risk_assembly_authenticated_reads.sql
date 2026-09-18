-- Run creation and risk re-evaluation read Stage 1 / Stage 2 authoring as the member who
-- starts the run. Owner-only SELECT on project_risks (and editor-only SELECT on
-- project_risk_rules / pfmea_*) returned empty sets or 42501, which surfaced as
-- PAC-ASSE / PAC-ADD_ / CAT-STAR / PAC-CREA / RIS-REEV.
--
-- Readable when the caller is an admin, owns or co-owns the project, the project is the
-- Standard Project Foundation, or the project (or its root) is published / beta-testing.
-- Writes stay editor-scoped. Do not call can_caller_edit_project here: EXECUTE is revoked
-- from authenticated, which made every client policy evaluation fail with 42501.

CREATE OR REPLACE FUNCTION public.can_caller_read_template_risk_authoring(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = p_project_id
        AND (
          p.user_id = auth.uid()
          OR p.is_standard IS TRUE
          OR p.publish_status IN ('published', 'beta-testing')
          OR EXISTS (
            SELECT 1
            FROM public.projects root
            WHERE root.id = p.parent_project_id
              AND root.publish_status IN ('published', 'beta-testing')
          )
          OR EXISTS (
            SELECT 1
            FROM public.project_owners po
            WHERE po.project_id = p.id
              AND po.user_id = auth.uid()
              AND po.invitation_status IS NULL
          )
        )
    );
$$;

REVOKE ALL ON FUNCTION public.can_caller_read_template_risk_authoring(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_caller_read_template_risk_authoring(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- project_risks: foundation + published catalog templates must be readable to assemble runs
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS project_risks_read_access ON public.project_risks;
CREATE POLICY project_risks_read_access ON public.project_risks
  FOR SELECT
  TO authenticated
  USING (public.can_caller_read_template_risk_authoring(project_id) IS TRUE);

-- ---------------------------------------------------------------------------
-- project_risk_rules: Stage 2 evaluates rules for every run owner, not only editors
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS project_risk_rules_select_authenticated ON public.project_risk_rules;
DROP POLICY IF EXISTS project_risk_rules_select_editors ON public.project_risk_rules;
CREATE POLICY project_risk_rules_select_authenticated ON public.project_risk_rules
  FOR SELECT
  TO authenticated
  USING (public.can_caller_read_template_risk_authoring(project_id) IS TRUE);

DROP POLICY IF EXISTS project_risk_rules_insert_editors ON public.project_risk_rules;
CREATE POLICY project_risk_rules_insert_editors ON public.project_risk_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_risk_rules.project_id
        AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_owners po
      WHERE po.project_id = project_risk_rules.project_id
        AND po.user_id = auth.uid()
        AND po.invitation_status IS NULL
    )
  );

DROP POLICY IF EXISTS project_risk_rules_update_editors ON public.project_risk_rules;
CREATE POLICY project_risk_rules_update_editors ON public.project_risk_rules
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_risk_rules.project_id
        AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_owners po
      WHERE po.project_id = project_risk_rules.project_id
        AND po.user_id = auth.uid()
        AND po.invitation_status IS NULL
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_risk_rules.project_id
        AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_owners po
      WHERE po.project_id = project_risk_rules.project_id
        AND po.user_id = auth.uid()
        AND po.invitation_status IS NULL
    )
  );

DROP POLICY IF EXISTS project_risk_rules_delete_editors ON public.project_risk_rules;
CREATE POLICY project_risk_rules_delete_editors ON public.project_risk_rules
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_risk_rules.project_id
        AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_owners po
      WHERE po.project_id = project_risk_rules.project_id
        AND po.user_id = auth.uid()
        AND po.invitation_status IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- pfmea_requirements: Stage 1 quality load at run creation / re-evaluation
-- Keep editor write policies from 20260917130000; widen SELECT for runners.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS pfmea_requirements_select_editors ON public.pfmea_requirements;
DROP POLICY IF EXISTS pfmea_requirements_select_authenticated ON public.pfmea_requirements;
CREATE POLICY pfmea_requirements_select_authenticated ON public.pfmea_requirements
  FOR SELECT
  TO authenticated
  USING (public.can_caller_read_template_risk_authoring(project_id) IS TRUE);

-- ---------------------------------------------------------------------------
-- pfmea_failure_modes and nested cause/effect/control rows used by loadStage1 embeds
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS pfmea_failure_modes_select_authenticated ON public.pfmea_failure_modes;
DROP POLICY IF EXISTS pfmea_failure_modes_select_editors ON public.pfmea_failure_modes;
CREATE POLICY pfmea_failure_modes_select_authenticated ON public.pfmea_failure_modes
  FOR SELECT
  TO authenticated
  USING (public.can_caller_read_template_risk_authoring(project_id) IS TRUE);

DROP POLICY IF EXISTS pfmea_potential_causes_select_authenticated ON public.pfmea_potential_causes;
DROP POLICY IF EXISTS pfmea_potential_causes_select_editors ON public.pfmea_potential_causes;
CREATE POLICY pfmea_potential_causes_select_authenticated ON public.pfmea_potential_causes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.pfmea_failure_modes fm
      WHERE fm.id = pfmea_potential_causes.failure_mode_id
        AND public.can_caller_read_template_risk_authoring(fm.project_id) IS TRUE
    )
  );

DROP POLICY IF EXISTS pfmea_potential_effects_select_authenticated ON public.pfmea_potential_effects;
DROP POLICY IF EXISTS pfmea_potential_effects_select_editors ON public.pfmea_potential_effects;
CREATE POLICY pfmea_potential_effects_select_authenticated ON public.pfmea_potential_effects
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.pfmea_failure_modes fm
      WHERE fm.id = pfmea_potential_effects.failure_mode_id
        AND public.can_caller_read_template_risk_authoring(fm.project_id) IS TRUE
    )
  );

DROP POLICY IF EXISTS pfmea_controls_select_authenticated ON public.pfmea_controls;
DROP POLICY IF EXISTS pfmea_controls_select_editors ON public.pfmea_controls;
CREATE POLICY pfmea_controls_select_authenticated ON public.pfmea_controls
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.pfmea_failure_modes fm
      WHERE fm.id = pfmea_controls.failure_mode_id
        AND public.can_caller_read_template_risk_authoring(fm.project_id) IS TRUE
    )
    OR EXISTS (
      SELECT 1
      FROM public.pfmea_potential_causes c
      JOIN public.pfmea_failure_modes fm ON fm.id = c.failure_mode_id
      WHERE c.id = pfmea_controls.cause_id
        AND public.can_caller_read_template_risk_authoring(fm.project_id) IS TRUE
    )
  );
