-- Create task_shopping_list table for Task Manager (materials per task).
-- Run this in Supabase Dashboard → SQL Editor if you get 404 "Could not find the table 'public.task_shopping_list'".

CREATE TABLE IF NOT EXISTS public.task_shopping_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.home_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_name text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_task_shopping_list_task_id ON public.task_shopping_list(task_id);
CREATE INDEX IF NOT EXISTS idx_task_shopping_list_user_id ON public.task_shopping_list(user_id);

ALTER TABLE public.task_shopping_list ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own task_shopping_list" ON public.task_shopping_list;
CREATE POLICY "Users can read own task_shopping_list"
  ON public.task_shopping_list FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own task_shopping_list" ON public.task_shopping_list;
CREATE POLICY "Users can insert own task_shopping_list"
  ON public.task_shopping_list FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own task_shopping_list" ON public.task_shopping_list;
CREATE POLICY "Users can update own task_shopping_list"
  ON public.task_shopping_list FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own task_shopping_list" ON public.task_shopping_list;
CREATE POLICY "Users can delete own task_shopping_list"
  ON public.task_shopping_list FOR DELETE
  USING (auth.uid() = user_id);
