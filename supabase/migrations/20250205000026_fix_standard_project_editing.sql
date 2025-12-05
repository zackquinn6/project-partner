-- =====================================================
-- FIX STANDARD PROJECT EDITING
-- Add RLS policies for relational tables
-- Frontend now queries relational tables directly
-- =====================================================

-- =====================================================
-- Add RLS policies for standard project editing
-- =====================================================

-- Allow viewing standard project and its relational data
DROP POLICY IF EXISTS "Anyone can view standard project phases" ON public.project_phases;
CREATE POLICY "Anyone can view standard project phases"
  ON public.project_phases FOR SELECT
  USING (
    project_id IN (SELECT id FROM public.projects WHERE is_standard = true)
  );

DROP POLICY IF EXISTS "Anyone can view standard phase operations" ON public.phase_operations;
CREATE POLICY "Anyone can view standard phase operations"
  ON public.phase_operations FOR SELECT
  USING (
    phase_id IN (
      SELECT pp.id FROM public.project_phases pp
      JOIN public.projects p ON p.id = pp.project_id
      WHERE p.is_standard = true
    )
  );

DROP POLICY IF EXISTS "Anyone can view standard operation steps" ON public.operation_steps;
CREATE POLICY "Anyone can view standard operation steps"
  ON public.operation_steps FOR SELECT
  USING (
    operation_id IN (
      SELECT po.id FROM public.phase_operations po
      JOIN public.project_phases pp ON pp.id = po.phase_id
      JOIN public.projects p ON p.id = pp.project_id
      WHERE p.is_standard = true
    )
  );

-- Admins can modify standard project phases
DROP POLICY IF EXISTS "Admins can modify standard project phases" ON public.project_phases;
CREATE POLICY "Admins can modify standard project phases"
  ON public.project_phases FOR ALL
  USING (
    project_id IN (SELECT id FROM public.projects WHERE is_standard = true) AND
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE is_standard = true) AND
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Admins can modify standard phase operations
DROP POLICY IF EXISTS "Admins can modify standard phase operations" ON public.phase_operations;
CREATE POLICY "Admins can modify standard phase operations"
  ON public.phase_operations FOR ALL
  USING (
    phase_id IN (
      SELECT pp.id FROM public.project_phases pp
      JOIN public.projects p ON p.id = pp.project_id
      WHERE p.is_standard = true
    ) AND
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    phase_id IN (
      SELECT pp.id FROM public.project_phases pp
      JOIN public.projects p ON p.id = pp.project_id
      WHERE p.is_standard = true
    ) AND
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Admins can modify standard operation steps
DROP POLICY IF EXISTS "Admins can modify standard operation steps" ON public.operation_steps;
CREATE POLICY "Admins can modify standard operation steps"
  ON public.operation_steps FOR ALL
  USING (
    operation_id IN (
      SELECT po.id FROM public.phase_operations po
      JOIN public.project_phases pp ON pp.id = po.phase_id
      JOIN public.projects p ON p.id = pp.project_id
      WHERE p.is_standard = true
    ) AND
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    operation_id IN (
      SELECT po.id FROM public.phase_operations po
      JOIN public.project_phases pp ON pp.id = po.phase_id
      JOIN public.projects p ON p.id = pp.project_id
      WHERE p.is_standard = true
    ) AND
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Added RLS policies for viewing standard project relational data';
  RAISE NOTICE '✅ Added RLS policies for admins to edit standard project';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Frontend now queries relational tables directly:';
  RAISE NOTICE '  1. projects - for project metadata';
  RAISE NOTICE '  2. project_phases - for phases';
  RAISE NOTICE '  3. phase_operations - for operations';
  RAISE NOTICE '  4. operation_steps - for steps';
  RAISE NOTICE '';
  RAISE NOTICE 'JSONB phases column is for immutable snapshots (project_runs) only.';
END $$;

