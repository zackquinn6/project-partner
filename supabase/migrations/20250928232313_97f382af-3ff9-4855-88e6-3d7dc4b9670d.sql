-- Create decision trees table for admin-configured project workflows
CREATE TABLE public.decision_trees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create decision tree operations table for operation-level configuration
CREATE TABLE public.decision_tree_operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  decision_tree_id UUID NOT NULL REFERENCES public.decision_trees(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL,
  operation_name TEXT NOT NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('necessary', 'alternative', 'standard_flow', 'if_necessary')),
  display_order INTEGER NOT NULL DEFAULT 0,
  dependencies TEXT[], -- Array of operation IDs this depends on
  parallel_group TEXT, -- Operations in same group can run in parallel
  fallback_operation_id UUID, -- Default operation if this fails
  is_optional BOOLEAN NOT NULL DEFAULT false,
  condition_rules JSONB DEFAULT '{}', -- Rules for when this operation applies
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create decision tree conditions table for branching logic
CREATE TABLE public.decision_tree_conditions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_id UUID NOT NULL REFERENCES public.decision_tree_operations(id) ON DELETE CASCADE,
  condition_type TEXT NOT NULL CHECK (condition_type IN ('user_choice', 'data_check', 'dependency_check', 'automatic')),
  condition_data JSONB NOT NULL DEFAULT '{}',
  next_operation_id UUID REFERENCES public.decision_tree_operations(id),
  priority INTEGER NOT NULL DEFAULT 0,
  is_fallback BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create execution paths table for analytics tracking
CREATE TABLE public.decision_tree_execution_paths (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_run_id UUID NOT NULL,
  decision_tree_id UUID NOT NULL REFERENCES public.decision_trees(id),
  operation_id UUID NOT NULL REFERENCES public.decision_tree_operations(id),
  phase_name TEXT NOT NULL,
  operation_name TEXT NOT NULL,
  chosen_path TEXT,
  execution_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  decision_data JSONB DEFAULT '{}',
  execution_status TEXT NOT NULL DEFAULT 'pending' CHECK (execution_status IN ('pending', 'in_progress', 'completed', 'skipped', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.decision_trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_tree_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_tree_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_tree_execution_paths ENABLE ROW LEVEL SECURITY;

-- RLS Policies for decision_trees (admin only)
CREATE POLICY "Admins can manage decision trees" 
ON public.decision_trees 
FOR ALL 
USING (is_admin(auth.uid()));

-- RLS Policies for decision_tree_operations (admin only)
CREATE POLICY "Admins can manage decision tree operations" 
ON public.decision_tree_operations 
FOR ALL 
USING (is_admin(auth.uid()));

-- RLS Policies for decision_tree_conditions (admin only)
CREATE POLICY "Admins can manage decision tree conditions" 
ON public.decision_tree_conditions 
FOR ALL 
USING (is_admin(auth.uid()));

-- RLS Policies for execution paths (users can view their own, admins can view all)
CREATE POLICY "Users can view their own execution paths" 
ON public.decision_tree_execution_paths 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own execution paths" 
ON public.decision_tree_execution_paths 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all execution paths" 
ON public.decision_tree_execution_paths 
FOR ALL 
USING (is_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_decision_trees_project_id ON public.decision_trees(project_id);
CREATE INDEX idx_decision_tree_operations_tree_id ON public.decision_tree_operations(decision_tree_id);
CREATE INDEX idx_decision_tree_operations_phase ON public.decision_tree_operations(phase_name);
CREATE INDEX idx_decision_tree_conditions_operation_id ON public.decision_tree_conditions(operation_id);
CREATE INDEX idx_execution_paths_project_run ON public.decision_tree_execution_paths(project_run_id);
CREATE INDEX idx_execution_paths_user ON public.decision_tree_execution_paths(user_id);

-- Create updated_at trigger for decision_trees
CREATE TRIGGER update_decision_trees_updated_at
BEFORE UPDATE ON public.decision_trees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for decision_tree_operations
CREATE TRIGGER update_decision_tree_operations_updated_at
BEFORE UPDATE ON public.decision_tree_operations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();