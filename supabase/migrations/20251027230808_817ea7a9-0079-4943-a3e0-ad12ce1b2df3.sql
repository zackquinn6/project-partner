-- Add project_owner role and ownership tracking

-- Add owner_id to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);

-- Create project_owner_invitations table
CREATE TABLE IF NOT EXISTS public.project_owner_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  invited_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  terms_version text NOT NULL DEFAULT '1.0',
  invitation_token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for invitations
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.project_owner_invitations(invited_email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.project_owner_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.project_owner_invitations(status);

-- Enable RLS on invitations
ALTER TABLE public.project_owner_invitations ENABLE ROW LEVEL SECURITY;

-- Create project_owner_terms_acceptances table
CREATE TABLE IF NOT EXISTS public.project_owner_terms_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitation_id uuid NOT NULL REFERENCES public.project_owner_invitations(id) ON DELETE CASCADE,
  terms_version text NOT NULL,
  accepted_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, invitation_id)
);

-- Enable RLS on terms acceptances
ALTER TABLE public.project_owner_terms_acceptances ENABLE ROW LEVEL SECURITY;

-- Create helper function to check if user is project owner for a specific project
CREATE OR REPLACE FUNCTION public.is_project_owner(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects
    WHERE id = _project_id
      AND owner_id = _user_id
  )
$$;

-- Create helper function to check if user has project_owner role
CREATE OR REPLACE FUNCTION public.has_project_owner_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'project_owner'
  )
$$;

-- RLS Policies for project_owner_invitations

-- Admins can manage all invitations
CREATE POLICY "Admins can manage all invitations"
ON public.project_owner_invitations
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- Project owners can create invitations
CREATE POLICY "Project owners can create invitations"
ON public.project_owner_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = invited_by 
  AND (is_admin(auth.uid()) OR has_project_owner_role(auth.uid()))
);

-- Users can view their own invitations
CREATE POLICY "Users can view their own invitations"
ON public.project_owner_invitations
FOR SELECT
TO authenticated
USING (
  auth.uid() = invited_by 
  OR auth.uid() = invited_user_id
  OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Invited users can update their invitation status
CREATE POLICY "Users can update their invitation status"
ON public.project_owner_invitations
FOR UPDATE
TO authenticated
USING (
  auth.uid() = invited_user_id
  OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- RLS Policies for project_owner_terms_acceptances

-- Users can create their own terms acceptance
CREATE POLICY "Users can create terms acceptance"
ON public.project_owner_terms_acceptances
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own terms acceptances
CREATE POLICY "Users can view their own terms acceptances"
ON public.project_owner_terms_acceptances
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all terms acceptances
CREATE POLICY "Admins can view all terms acceptances"
ON public.project_owner_terms_acceptances
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Update RLS policies for projects table to allow project owners

-- Project owners can view their own projects
CREATE POLICY "Project owners can view their projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  auth.uid() = owner_id
  OR has_project_owner_role(auth.uid())
);

-- Project owners can update their own projects
CREATE POLICY "Project owners can update their projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Project owners can create projects
CREATE POLICY "Project owners can create projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
  has_project_owner_role(auth.uid())
  AND (owner_id = auth.uid() OR owner_id IS NULL)
);

-- Function to automatically set owner_id on project creation if user is project owner
CREATE OR REPLACE FUNCTION public.set_project_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If owner_id is not set and user has project_owner role, set it
  IF NEW.owner_id IS NULL AND has_project_owner_role(auth.uid()) THEN
    NEW.owner_id := auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to set owner on project creation
DROP TRIGGER IF EXISTS set_project_owner_trigger ON public.projects;
CREATE TRIGGER set_project_owner_trigger
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_project_owner();

-- Function to expire old invitations
CREATE OR REPLACE FUNCTION public.expire_old_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.project_owner_invitations
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'pending'
    AND expires_at < now();
END;
$$;