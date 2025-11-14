-- Add missing quantity column to task_shopping_list table
ALTER TABLE public.task_shopping_list
ADD COLUMN IF NOT EXISTS quantity numeric DEFAULT 1 NOT NULL;

COMMENT ON COLUMN public.task_shopping_list.quantity IS 'Quantity of the material needed for the task';