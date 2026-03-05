-- Home Maintenance Tracker: RLS and security hardening
-- Architecture: Each user has unique maintenance data. Tasks are scoped by home (user can have multiple homes).
-- Tables: homes (user_id), user_maintenance_tasks (user_id, home_id), maintenance_completions (user_id, task_id).

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_completions ENABLE ROW LEVEL SECURITY;

-- -------------------------------
-- homes: user can only access own rows
-- -------------------------------
DROP POLICY IF EXISTS "homes_select_own" ON public.homes;
CREATE POLICY "homes_select_own" ON public.homes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "homes_insert_own" ON public.homes;
CREATE POLICY "homes_insert_own" ON public.homes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "homes_update_own" ON public.homes;
CREATE POLICY "homes_update_own" ON public.homes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "homes_delete_own" ON public.homes;
CREATE POLICY "homes_delete_own" ON public.homes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- -------------------------------
-- user_maintenance_tasks: user can only access own tasks; insert only for homes they own
-- -------------------------------
DROP POLICY IF EXISTS "user_maintenance_tasks_select_own" ON public.user_maintenance_tasks;
CREATE POLICY "user_maintenance_tasks_select_own" ON public.user_maintenance_tasks
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_maintenance_tasks_insert_own_home" ON public.user_maintenance_tasks;
CREATE POLICY "user_maintenance_tasks_insert_own_home" ON public.user_maintenance_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND home_id IN (SELECT id FROM public.homes WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "user_maintenance_tasks_update_own" ON public.user_maintenance_tasks;
CREATE POLICY "user_maintenance_tasks_update_own" ON public.user_maintenance_tasks
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND home_id IN (SELECT id FROM public.homes WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "user_maintenance_tasks_delete_own" ON public.user_maintenance_tasks;
CREATE POLICY "user_maintenance_tasks_delete_own" ON public.user_maintenance_tasks
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- -------------------------------
-- maintenance_completions: user can only access own completions; insert only for tasks they own
-- -------------------------------
DROP POLICY IF EXISTS "maintenance_completions_select_own" ON public.maintenance_completions;
CREATE POLICY "maintenance_completions_select_own" ON public.maintenance_completions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "maintenance_completions_insert_own_task" ON public.maintenance_completions;
CREATE POLICY "maintenance_completions_insert_own_task" ON public.maintenance_completions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND task_id IN (SELECT id FROM public.user_maintenance_tasks WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "maintenance_completions_update_own" ON public.maintenance_completions;
CREATE POLICY "maintenance_completions_update_own" ON public.maintenance_completions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "maintenance_completions_delete_own" ON public.maintenance_completions;
CREATE POLICY "maintenance_completions_delete_own" ON public.maintenance_completions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Indexes to keep RLS policy checks efficient (create only if not present)
CREATE INDEX IF NOT EXISTS idx_user_maintenance_tasks_user_id ON public.user_maintenance_tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_user_maintenance_tasks_home_id ON public.user_maintenance_tasks (home_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_completions_user_id ON public.maintenance_completions (user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_completions_task_id ON public.maintenance_completions (task_id);
CREATE INDEX IF NOT EXISTS idx_homes_user_id ON public.homes (user_id);

-- Document architecture
COMMENT ON TABLE public.user_maintenance_tasks IS 'Per-user, per-home maintenance tasks. Each user has unique rows; scoped by home_id (user can have multiple homes). RLS enforces user_id = auth.uid() and home ownership.';
COMMENT ON TABLE public.maintenance_completions IS 'Completion records for user maintenance tasks. user_id and task_id (FK to user_maintenance_tasks). RLS enforces user ownership and task ownership on insert.';
