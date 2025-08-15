-- Create projects table for template projects (admin-created)
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  plan_end_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  end_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'not-started' CHECK (status IN ('not-started', 'in-progress', 'complete')),
  publish_status TEXT NOT NULL DEFAULT 'draft' CHECK (publish_status IN ('draft', 'published')),
  category TEXT,
  difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  effort_level TEXT CHECK (effort_level IN ('Low', 'Medium', 'High')),
  estimated_time TEXT,
  phases JSONB NOT NULL DEFAULT '[]',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create project_runs table for user instances of projects
CREATE TABLE public.project_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  plan_end_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  end_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'not-started' CHECK (status IN ('not-started', 'in-progress', 'complete')),
  project_leader TEXT,
  accountability_partner TEXT,
  custom_project_name TEXT,
  current_phase_id TEXT,
  current_operation_id TEXT,
  current_step_id TEXT,
  completed_steps JSONB NOT NULL DEFAULT '[]',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  phases JSONB NOT NULL DEFAULT '[]',
  category TEXT,
  difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  estimated_time TEXT
);

-- Add user roles table for admin permissions
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = is_admin.user_id 
    AND role = 'admin'
  );
$$;

-- Enable RLS on all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Projects policies (only admins can create/edit, everyone can view published)
CREATE POLICY "Published projects are viewable by everyone" 
ON public.projects 
FOR SELECT 
USING (publish_status = 'published');

CREATE POLICY "Admins can view all projects" 
ON public.projects 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can create projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update projects" 
ON public.projects 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete projects" 
ON public.projects 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- Project runs policies (users can only see their own, admins can see all)
CREATE POLICY "Users can view their own project runs" 
ON public.project_runs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all project runs" 
ON public.project_runs 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can create their own project runs" 
ON public.project_runs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own project runs" 
ON public.project_runs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all project runs" 
ON public.project_runs 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can delete their own project runs" 
ON public.project_runs 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete all project runs" 
ON public.project_runs 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- User roles policies (users can view their own, admins can manage all)
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can create roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update roles" 
ON public.user_roles 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles" 
ON public.user_roles 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- Create triggers for updating timestamps
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_runs_updated_at
  BEFORE UPDATE ON public.project_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_projects_publish_status ON public.projects(publish_status);
CREATE INDEX idx_projects_created_by ON public.projects(created_by);
CREATE INDEX idx_project_runs_user_id ON public.project_runs(user_id);
CREATE INDEX idx_project_runs_template_id ON public.project_runs(template_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);