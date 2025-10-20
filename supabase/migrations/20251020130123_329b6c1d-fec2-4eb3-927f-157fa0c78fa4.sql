-- Create home_tasks table for managing pre-sale and general home tasks
CREATE TABLE public.home_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  home_id UUID REFERENCES public.homes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  notes TEXT,
  due_date DATE,
  project_run_id UUID REFERENCES public.project_runs(id) ON DELETE SET NULL,
  task_type TEXT DEFAULT 'general' CHECK (task_type IN ('general', 'pre_sale', 'diy', 'contractor')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.home_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own home tasks"
  ON public.home_tasks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own home tasks"
  ON public.home_tasks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own home tasks"
  ON public.home_tasks
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own home tasks"
  ON public.home_tasks
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_home_tasks_updated_at
  BEFORE UPDATE ON public.home_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_home_tasks_user_id ON public.home_tasks(user_id);
CREATE INDEX idx_home_tasks_home_id ON public.home_tasks(home_id);
CREATE INDEX idx_home_tasks_status ON public.home_tasks(status);