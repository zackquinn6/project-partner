-- Fix search path for security functions
CREATE OR REPLACE FUNCTION public.prevent_last_admin_removal()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.export_user_data(user_uuid UUID)
RETURNS JSON 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.delete_user_data(user_uuid UUID)
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_sessions()
RETURNS INTEGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete sessions older than 90 days
  DELETE FROM public.user_sessions 
  WHERE session_start < (now() - INTERVAL '90 days');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_failed_login(
  user_email TEXT,
  ip_addr TEXT DEFAULT NULL,
  user_agent_string TEXT DEFAULT NULL
)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.failed_login_attempts (email, ip_address, user_agent)
  VALUES (user_email, ip_addr::INET, user_agent_string);
END;
$$;