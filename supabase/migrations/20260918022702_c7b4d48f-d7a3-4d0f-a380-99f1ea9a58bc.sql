DROP POLICY IF EXISTS project_risk_rules_select_authenticated ON public.project_risk_rules;
CREATE POLICY project_risk_rules_select_editors
ON public.project_risk_rules
FOR SELECT
TO authenticated
USING (public.can_caller_edit_project(project_id) IS TRUE);