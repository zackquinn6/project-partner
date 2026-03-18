-- Fix: allow authenticated users to manage project_risks they have access to.
-- Root cause: inserts were blocked by RLS, causing 403/42501 when adding risks.
--
-- Access is determined only by relationships/ownership:
-- - projects.user_id (creator/owner)
-- - project_owners (explicit ownership)

ALTER TABLE public.project_risks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_risks_read_access ON public.project_risks;
CREATE POLICY project_risks_read_access ON public.project_risks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_risks.project_id
        AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.project_owners po
      WHERE po.project_id = project_risks.project_id
        AND po.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS project_risks_insert_access ON public.project_risks;
CREATE POLICY project_risks_insert_access ON public.project_risks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_risks.project_id
        AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.project_owners po
      WHERE po.project_id = project_risks.project_id
        AND po.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS project_risks_update_access ON public.project_risks;
CREATE POLICY project_risks_update_access ON public.project_risks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_risks.project_id
        AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.project_owners po
      WHERE po.project_id = project_risks.project_id
        AND po.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_risks.project_id
        AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.project_owners po
      WHERE po.project_id = project_risks.project_id
        AND po.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS project_risks_delete_access ON public.project_risks;
CREATE POLICY project_risks_delete_access ON public.project_risks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_risks.project_id
        AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.project_owners po
      WHERE po.project_id = project_risks.project_id
        AND po.user_id = auth.uid()
    )
  );

