-- Create audit log table for role changes
CREATE TABLE public.role_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'add', 'remove'
  role TEXT NOT NULL,
  target_user_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS on audit log
ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.role_audit_log
FOR SELECT
USING (is_admin(auth.uid()));

-- Create function to prevent removing the last admin
CREATE OR REPLACE FUNCTION public.prevent_last_admin_removal()
RETURNS TRIGGER AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- Only check for admin role deletions
  IF OLD.role = 'admin' THEN
    -- Count remaining admins after this deletion
    SELECT COUNT(*) INTO admin_count
    FROM public.user_roles 
    WHERE role = 'admin' AND id != OLD.id;
    
    -- Prevent deletion if this would be the last admin
    IF admin_count = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last admin user. At least one admin must remain.';
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent last admin removal
CREATE TRIGGER prevent_last_admin_removal_trigger
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_admin_removal();

-- Create function to log role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log role additions
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.role_audit_log (
      user_id, 
      target_user_id, 
      action, 
      role,
      target_user_email
    ) VALUES (
      COALESCE(auth.uid(), NEW.user_id),
      NEW.user_id,
      'add',
      NEW.role,
      (SELECT email FROM auth.users WHERE id = NEW.user_id)
    );
    RETURN NEW;
  END IF;
  
  -- Log role removals
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.role_audit_log (
      user_id,
      target_user_id,
      action,
      role,
      target_user_email
    ) VALUES (
      COALESCE(auth.uid(), OLD.user_id),
      OLD.user_id,
      'remove',
      OLD.role,
      (SELECT email FROM auth.users WHERE id = OLD.user_id)
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for role change logging
CREATE TRIGGER log_role_changes_trigger
  AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_role_change();

-- Create data retention and export functions
CREATE OR REPLACE FUNCTION public.export_user_data(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
  user_data JSON;
BEGIN
  -- Only allow users to export their own data or admins to export any data
  IF auth.uid() != user_uuid AND NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot export data for other users';
  END IF;

  SELECT json_build_object(
    'profile', (SELECT row_to_json(profiles.*) FROM profiles WHERE user_id = user_uuid),
    'project_runs', (SELECT json_agg(row_to_json(project_runs.*)) FROM project_runs WHERE user_id = user_uuid),
    'user_roles', (SELECT json_agg(row_to_json(user_roles.*)) FROM user_roles WHERE user_id = user_uuid),
    'exported_at', now()
  ) INTO user_data;

  RETURN user_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to delete user data (GDPR compliance)
CREATE OR REPLACE FUNCTION public.delete_user_data(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  -- Only allow users to delete their own data or admins to delete any data
  IF auth.uid() != user_uuid AND NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot delete data for other users';
  END IF;

  -- Delete user data in correct order (respecting foreign keys)
  DELETE FROM public.project_runs WHERE user_id = user_uuid;
  DELETE FROM public.user_roles WHERE user_id = user_uuid;
  DELETE FROM public.profiles WHERE user_id = user_uuid;

  RETURN 'User data deleted successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create session monitoring table
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_end TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS on sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions, admins can view all
CREATE POLICY "Users can view own sessions"
ON public.user_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions"
ON public.user_sessions
FOR SELECT
USING (is_admin(auth.uid()));

-- Users can insert their own sessions
CREATE POLICY "Users can create own sessions"
ON public.user_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions, admins can update all
CREATE POLICY "Users can update own sessions"
ON public.user_sessions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all sessions"
ON public.user_sessions
FOR UPDATE
USING (is_admin(auth.uid()));

-- Create function to clean up old sessions (data retention)
CREATE OR REPLACE FUNCTION public.cleanup_old_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete sessions older than 90 days
  DELETE FROM public.user_sessions 
  WHERE session_start < (now() - INTERVAL '90 days');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to monitor failed login attempts
CREATE TABLE public.failed_login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address INET,
  attempt_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT
);

-- Enable RLS on failed login attempts
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can view failed login attempts
CREATE POLICY "Admins can view failed login attempts"
ON public.failed_login_attempts
FOR SELECT
USING (is_admin(auth.uid()));

-- Create function to log failed login attempts
CREATE OR REPLACE FUNCTION public.log_failed_login(
  user_email TEXT,
  ip_addr TEXT DEFAULT NULL,
  user_agent_string TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.failed_login_attempts (email, ip_address, user_agent)
  VALUES (user_email, ip_addr::INET, user_agent_string);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;