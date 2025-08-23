-- Create knowledge_sources table for tracking external knowledge sources
CREATE TABLE public.knowledge_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('blog', 'forum', 'manufacturer', 'manual')),
  category TEXT NOT NULL,
  last_scrape_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  trust_score DECIMAL(3,1) NOT NULL DEFAULT 5.0 CHECK (trust_score >= 0 AND trust_score <= 10),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create knowledge_revisions table for tracking changes to project guidance
CREATE TABLE public.knowledge_revisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  project_type TEXT NOT NULL,
  step_id TEXT NOT NULL,
  original_content TEXT NOT NULL,
  revised_content TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('improvement', 'safety_update', 'new_technique', 'tool_update')),
  impact_score DECIMAL(3,1) NOT NULL CHECK (impact_score >= 0 AND impact_score <= 10),
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  affected_users INTEGER DEFAULT 0,
  summary TEXT NOT NULL,
  data_source TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create knowledge_updates table for pending knowledge updates
CREATE TABLE public.knowledge_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  project_types TEXT[] NOT NULL,
  relevance_score DECIMAL(3,1) NOT NULL CHECK (relevance_score >= 0 AND relevance_score <= 10),
  source TEXT NOT NULL,
  discovered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'integrated')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Create workflow_optimizations table
CREATE TABLE public.workflow_optimizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  optimization_type TEXT NOT NULL CHECK (optimization_type IN ('step-reorder', 'tool-consolidation', 'time-reduction', 'parallel-tasks')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  time_savings INTEGER NOT NULL DEFAULT 0, -- minutes
  effort_reduction INTEGER NOT NULL DEFAULT 0, -- percentage
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  affected_steps TEXT[] NOT NULL,
  project_types TEXT[] NOT NULL,
  user_completions INTEGER DEFAULT 0,
  average_time_before INTEGER DEFAULT 0,
  average_time_after INTEGER DEFAULT 0,
  feedback_score DECIMAL(2,1) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'testing', 'validated', 'implemented')),
  applied BOOLEAN NOT NULL DEFAULT false,
  applied_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create optimization_insights table
CREATE TABLE public.optimization_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('efficiency', 'safety', 'quality', 'cost')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  impact TEXT NOT NULL CHECK (impact IN ('low', 'medium', 'high')),
  frequency DECIMAL(3,2) NOT NULL CHECK (frequency >= 0 AND frequency <= 1), -- percentage as decimal
  projects_affected TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for knowledge_sources
CREATE POLICY "Admins can manage knowledge sources" 
ON public.knowledge_sources 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view knowledge sources" 
ON public.knowledge_sources 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- RLS Policies for knowledge_revisions
CREATE POLICY "Admins can manage knowledge revisions" 
ON public.knowledge_revisions 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view knowledge revisions" 
ON public.knowledge_revisions 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- RLS Policies for knowledge_updates
CREATE POLICY "Admins can manage knowledge updates" 
ON public.knowledge_updates 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view knowledge updates" 
ON public.knowledge_updates 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- RLS Policies for workflow_optimizations
CREATE POLICY "Admins can manage workflow optimizations" 
ON public.workflow_optimizations 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view workflow optimizations" 
ON public.workflow_optimizations 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- RLS Policies for optimization_insights
CREATE POLICY "Admins can manage optimization insights" 
ON public.optimization_insights 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view optimization insights" 
ON public.optimization_insights 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Add triggers for updated_at columns
CREATE TRIGGER update_knowledge_sources_updated_at
BEFORE UPDATE ON public.knowledge_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_knowledge_updates_updated_at
BEFORE UPDATE ON public.knowledge_updates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_optimizations_updated_at
BEFORE UPDATE ON public.workflow_optimizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_optimization_insights_updated_at
BEFORE UPDATE ON public.optimization_insights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_knowledge_sources_category ON public.knowledge_sources(category);
CREATE INDEX idx_knowledge_sources_status ON public.knowledge_sources(status);
CREATE INDEX idx_knowledge_revisions_project_type ON public.knowledge_revisions(project_type);
CREATE INDEX idx_knowledge_revisions_change_type ON public.knowledge_revisions(change_type);
CREATE INDEX idx_knowledge_updates_status ON public.knowledge_updates(status);
CREATE INDEX idx_workflow_optimizations_status ON public.workflow_optimizations(status);
CREATE INDEX idx_workflow_optimizations_applied ON public.workflow_optimizations(applied);
CREATE INDEX idx_optimization_insights_category ON public.optimization_insights(category);