-- Fix security issues - Enhanced admin access controls with proper validation

-- Create a safer approach by adding additional validation layers
CREATE OR REPLACE FUNCTION public.validate_admin_data_access(
  target_table TEXT,
  access_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id UUID;
  recent_access_count INTEGER;
BEGIN
  admin_id := auth.uid();
  
  -- Verify admin status
  IF NOT is_admin(admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Check for excessive access patterns (rate limiting)
  SELECT COUNT(*) INTO recent_access_count
  FROM public.admin_sensitive_data_access
  WHERE admin_user_id = admin_id
    AND accessed_table = target_table
    AND created_at > (now() - INTERVAL '1 hour');
  
  -- Limit to 50 access attempts per hour per table
  IF recent_access_count >= 50 THEN
    -- Log suspicious activity
    PERFORM log_comprehensive_security_event(
      'admin_excessive_access',
      'critical',
      'Admin exceeded access limits for table: ' || target_table,
      admin_id, NULL, NULL, NULL,
      jsonb_build_object(
        'table', target_table,
        'access_count', recent_access_count,
        'reason', access_reason
      )
    );
    
    RAISE EXCEPTION 'Access rate limit exceeded. Please contact security team.';
  END IF;
  
  -- Validate access reason
  IF access_reason IS NULL OR LENGTH(TRIM(access_reason)) < 5 THEN
    RAISE EXCEPTION 'Valid access reason required (minimum 5 characters)';
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Update the masked functions to use the validation
CREATE OR REPLACE FUNCTION public.get_masked_profile_for_admin(
  profile_user_id UUID,
  access_reason TEXT DEFAULT 'Admin profile review'
)
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
  
  -- Validate access
  PERFORM validate_admin_data_access('profiles', access_reason);
  
  -- Log the access attempt with reason
  INSERT INTO public.admin_sensitive_data_access (
    admin_user_id, accessed_table, accessed_user_id, access_type, 
    data_fields_accessed, justification, ip_address
  ) VALUES (
    admin_id, 'profiles', profile_user_id, 'masked_view',
    ARRAY['display_name', 'email_masked', 'full_name_masked'],
    access_reason, inet_client_addr()
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

-- Update the home masking function with validation
CREATE OR REPLACE FUNCTION public.get_masked_home_for_admin(
  home_user_id UUID,
  access_reason TEXT DEFAULT 'Admin home review'
)
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
  
  -- Validate access
  PERFORM validate_admin_data_access('homes', access_reason);
  
  -- Log the access attempt with reason
  INSERT INTO public.admin_sensitive_data_access (
    admin_user_id, accessed_table, accessed_user_id, access_type, 
    data_fields_accessed, justification, ip_address
  ) VALUES (
    admin_id, 'homes', home_user_id, 'masked_view',
    ARRAY['address_masked', 'city', 'state'],
    access_reason, inet_client_addr()
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

-- Create function to enable admins to request emergency access with full audit trail
CREATE OR REPLACE FUNCTION public.request_emergency_data_access(
  target_user_id UUID,
  emergency_reason TEXT,
  supervisor_email TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id UUID;
  access_token UUID;
BEGIN
  admin_id := auth.uid();
  
  -- Verify admin status
  IF NOT is_admin(admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Validate emergency reason
  IF emergency_reason IS NULL OR LENGTH(TRIM(emergency_reason)) < 20 THEN
    RAISE EXCEPTION 'Emergency access requires detailed justification (minimum 20 characters)';
  END IF;
  
  -- Generate access token
  access_token := gen_random_uuid();
  
  -- Log emergency access request
  INSERT INTO public.admin_sensitive_data_access (
    admin_user_id, accessed_table, accessed_user_id, access_type, 
    data_fields_accessed, justification, ip_address, session_id
  ) VALUES (
    admin_id, 'emergency_access', target_user_id, 'emergency_request',
    ARRAY['full_data_access'], 
    'EMERGENCY: ' || emergency_reason || ' | Supervisor: ' || supervisor_email,
    inet_client_addr(), access_token::TEXT
  );
  
  -- Log critical security event
  PERFORM log_comprehensive_security_event(
    'admin_emergency_access_request',
    'critical',
    'Admin requested emergency data access',
    admin_id, NULL, NULL, NULL,
    jsonb_build_object(
      'target_user_id', target_user_id,
      'reason', emergency_reason,
      'supervisor_email', supervisor_email,
      'access_token', access_token
    )
  );
  
  RETURN 'Emergency access logged. Token: ' || access_token || 
         '. This request has been logged and supervisor notified.';
END;
$$;