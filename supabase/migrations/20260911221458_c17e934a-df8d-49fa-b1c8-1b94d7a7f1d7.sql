-- 1. app_settings: remove blanket read for signed-in users (public allowlist policy + admin policy remain)
DROP POLICY IF EXISTS "Authenticated users can view app settings" ON public.app_settings;

-- 2. project_hidden_operations: fix self-referential owner check
DROP POLICY IF EXISTS "Admins and owners can select project_hidden_operations" ON public.project_hidden_operations;
DROP POLICY IF EXISTS "Admins and owners can insert project_hidden_operations" ON public.project_hidden_operations;
DROP POLICY IF EXISTS "Admins and owners can delete project_hidden_operations" ON public.project_hidden_operations;

CREATE POLICY "Admins and owners can select project_hidden_operations"
ON public.project_hidden_operations
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_hidden_operations.project_id AND p.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.project_owners po WHERE po.project_id = project_hidden_operations.project_id AND po.user_id = auth.uid())
);

CREATE POLICY "Admins and owners can insert project_hidden_operations"
ON public.project_hidden_operations
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_hidden_operations.project_id AND p.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.project_owners po WHERE po.project_id = project_hidden_operations.project_id AND po.user_id = auth.uid())
);

CREATE POLICY "Admins and owners can delete project_hidden_operations"
ON public.project_hidden_operations
FOR DELETE
TO authenticated
USING (
  public.is_admin()
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_hidden_operations.project_id AND p.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.project_owners po WHERE po.project_id = project_hidden_operations.project_id AND po.user_id = auth.uid())
);

-- 3. SECURITY DEFINER functions: revoke execute where clients never call them
REVOKE EXECUTE ON FUNCTION public.filter_hidden_operations_from_workflow(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.latest_published_in_family(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.project_family_root_id(uuid) FROM PUBLIC, anon, authenticated;
-- Anonymous visitors do not need to write arbitrary security log rows
REVOKE EXECUTE ON FUNCTION public.log_comprehensive_security_event(text, text, text, uuid, text, text, text, jsonb) FROM PUBLIC, anon;