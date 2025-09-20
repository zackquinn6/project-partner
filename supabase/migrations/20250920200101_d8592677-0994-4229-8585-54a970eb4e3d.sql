-- Phase 1: Critical Data Protection - Implement data masking and enhanced audit logging

-- Create enhanced security audit log table for tracking admin access to sensitive data
CREATE TABLE IF NOT EXISTS public.admin_sensitive_data_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL,
  accessed_table TEXT NOT NULL,
  accessed_user_id UUID,
  access_type TEXT NOT NULL, -- 'view', 'export', 'modify'
  data_fields_accessed TEXT[], -- which fields were accessed
  justification TEXT, -- admin must provide reason
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on the new audit table
ALTER TABLE public.admin_sensitive_data_access ENABLE ROW LEVEL SECURITY;

-- Only admins can view their own access logs, super admins can view all
CREATE POLICY "Admins can view their own access logs"
ON public.admin_sensitive_data_access
FOR SELECT
USING (auth.uid() = admin_user_id OR is_admin(auth.uid()));

-- Create security definer function for masked profile access
CREATE OR REPLACE FUNCTION public.get_masked_profile_for_admin(profile_user_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  display_name TEXT,
  email_masked TEXT,
  full_name_masked TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  skill_level TEXT,
  home_ownership TEXT,
  home_state TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id UUID;
BEGIN
  admin_id := auth.uid();
  
  -- Verify admin access
  IF NOT is_admin(admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Log the access attempt
  INSERT INTO public.admin_sensitive_data_access (
    admin_user_id, accessed_table, accessed_user_id, access_type, 
    data_fields_accessed, ip_address
  ) VALUES (
    admin_id, 'profiles', profile_user_id, 'view',
    ARRAY['display_name', 'email_masked', 'full_name_masked'],
    inet_client_addr()
  );
  
  -- Return masked profile data
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.display_name,
    CASE 
      WHEN p.email IS NOT NULL THEN 
        LEFT(p.email, 2) || '***@' || split_part(p.email, '@', 2)
      ELSE NULL 
    END as email_masked,
    CASE 
      WHEN p.full_name IS NOT NULL THEN 
        LEFT(p.full_name, 1) || '*** ' || RIGHT(p.full_name, 1) || '***'
      ELSE NULL 
    END as full_name_masked,
    p.created_at,
    p.skill_level,
    p.home_ownership,
    p.home_state
  FROM public.profiles p
  WHERE p.user_id = profile_user_id;
END;
$$;

-- Create security definer function for masked home address access
CREATE OR REPLACE FUNCTION public.get_masked_home_for_admin(home_user_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  name TEXT,
  address_masked TEXT,
  city TEXT,
  state TEXT,
  home_type TEXT,
  build_year TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id UUID;
BEGIN
  admin_id := auth.uid();
  
  -- Verify admin access
  IF NOT is_admin(admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Log the access attempt
  INSERT INTO public.admin_sensitive_data_access (
    admin_user_id, accessed_table, accessed_user_id, access_type, 
    data_fields_accessed, ip_address
  ) VALUES (
    admin_id, 'homes', home_user_id, 'view',
    ARRAY['address_masked', 'city', 'state'],
    inet_client_addr()
  );
  
  -- Return masked home data
  RETURN QUERY
  SELECT 
    h.id,
    h.user_id,
    h.name,
    CASE 
      WHEN h.address IS NOT NULL THEN 
        'XXX ' || split_part(h.address, ' ', -1) -- Only show street name, hide number
      ELSE NULL 
    END as address_masked,
    h.city,
    h.state,
    h.home_type,
    h.build_year,
    h.created_at
  FROM public.homes h
  WHERE h.user_id = home_user_id;
END;
$$;

-- Create function to require justification for sensitive data access
CREATE OR REPLACE FUNCTION public.request_sensitive_data_access(
  target_table TEXT,
  target_user_id UUID,
  justification TEXT,
  requested_fields TEXT[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  access_request_id UUID;
  admin_id UUID;
BEGIN
  admin_id := auth.uid();
  
  -- Verify admin access
  IF NOT is_admin(admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Validate justification
  IF justification IS NULL OR LENGTH(TRIM(justification)) < 10 THEN
    RAISE EXCEPTION 'Access justification must be at least 10 characters';
  END IF;
  
  -- Log the access request with justification
  INSERT INTO public.admin_sensitive_data_access (
    admin_user_id, accessed_table, accessed_user_id, access_type, 
    data_fields_accessed, justification, ip_address
  ) VALUES (
    admin_id, target_table, target_user_id, 'justified_access',
    COALESCE(requested_fields, ARRAY['full_access']),
    justification, inet_client_addr()
  ) RETURNING id INTO access_request_id;
  
  -- Log security event
  PERFORM log_comprehensive_security_event(
    'admin_sensitive_access_request',
    'high',
    'Admin requested access to sensitive data: ' || target_table,
    admin_id,
    NULL, NULL, NULL,
    jsonb_build_object(
      'target_table', target_table,
      'target_user_id', target_user_id,
      'justification', justification,
      'access_request_id', access_request_id
    )
  );
  
  RETURN access_request_id;
END;
$$;

-- Create admin session tracking for enhanced security
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL,
  session_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_end TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sensitive_data_accessed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin sessions
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage their own sessions"
ON public.admin_sessions
FOR ALL
USING (auth.uid() = admin_user_id OR is_admin(auth.uid()));

-- Function to start admin session with enhanced logging
CREATE OR REPLACE FUNCTION public.start_admin_session()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_id UUID;
  admin_id UUID;
BEGIN
  admin_id := auth.uid();
  
  -- Verify admin access
  IF NOT is_admin(admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- End any existing active sessions for this admin
  UPDATE public.admin_sessions 
  SET is_active = false, session_end = now()
  WHERE admin_user_id = admin_id AND is_active = true;
  
  -- Create new session
  INSERT INTO public.admin_sessions (
    admin_user_id, ip_address, user_agent
  ) VALUES (
    admin_id, inet_client_addr(), 
    current_setting('request.headers', true)::json->>'user-agent'
  ) RETURNING id INTO session_id;
  
  -- Log session start
  PERFORM log_comprehensive_security_event(
    'admin_session_start',
    'medium',
    'Admin started new session',
    admin_id, NULL, NULL, NULL,
    jsonb_build_object('session_id', session_id)
  );
  
  RETURN session_id;
END;
$$;

-- Update existing admin policies to use masked functions
-- Remove direct admin access to profiles
DROP POLICY IF EXISTS "Admins can view profile metadata" ON public.profiles;

-- Create new restricted admin policy for profiles
CREATE POLICY "Admins have restricted profile access"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id OR 
  (is_admin(auth.uid()) AND false) -- Force admins to use masked functions
);

-- Remove direct admin access to homes
DROP POLICY IF EXISTS "Admins can view all homes" ON public.homes;

-- Create new restricted admin policy for homes  
CREATE POLICY "Admins have restricted home access"
ON public.homes
FOR SELECT
USING (
  auth.uid() = user_id OR 
  (is_admin(auth.uid()) AND false) -- Force admins to use masked functions
);

-- Add trigger to automatically track sensitive data access
CREATE OR REPLACE FUNCTION public.track_admin_sensitive_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If an admin is accessing sensitive data, mark their session
  IF is_admin(auth.uid()) AND auth.uid() != NEW.user_id THEN
    UPDATE public.admin_sessions 
    SET sensitive_data_accessed = true
    WHERE admin_user_id = auth.uid() AND is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$;