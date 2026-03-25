-- Track whether a shopping list line item has been purchased (Project & Task Manager > Shopping tab).
ALTER TABLE public.task_shopping_list
  ADD COLUMN IF NOT EXISTS shopped boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.task_shopping_list.shopped IS 'When true, the user marked this material as shopped.';
