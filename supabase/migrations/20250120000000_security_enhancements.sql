-- Security Enhancements Migration
-- This migration adds additional security measures to the database

-- ============================================
-- 1. Enhanced Input Validation Functions
-- ============================================

-- Improve sanitize_input function to handle more edge cases
CREATE OR REPLACE FUNCTION public.sanitize_input(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove potential XSS vectors
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(input_text, '<[^>]*>', '', 'g'), -- Remove HTML tags
          '[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]', '', 'g'), -- Remove control characters
        'javascript:', '', 'gi'), -- Remove javascript: protocol
      'on\w+\s*=', '', 'gi'), -- Remove event handlers
    'data:(?!image\/)', '', 'gi'); -- Remove data URIs except images
END;
$$;

-- ============================================
-- 2. File Upload Security Functions
-- ============================================

-- Function to validate file extensions
CREATE OR REPLACE FUNCTION public.validate_file_extension(filename text, allowed_extensions text[])
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  file_ext text;
BEGIN
  IF filename IS NULL THEN
    RETURN false;
  END IF;
  
  file_ext := lower(split_part(filename, '.', -1));
  
  RETURN file_ext = ANY(allowed_extensions);
END;
$$;

-- Function to sanitize file paths (prevent directory traversal)
CREATE OR REPLACE FUNCTION public.sanitize_file_path(file_path text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF file_path IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove path traversal attempts
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(file_path, '\.\./', '', 'g'), -- Remove ../
      '\.\.\\', '', 'g'), -- Remove ..\
    '[^a-zA-Z0-9._/-]', '', 'g'); -- Remove special characters except safe ones
END;
$$;

-- ============================================
-- 3. Enhanced Rate Limiting
-- ============================================

-- Create index on failed_login_attempts for better performance
CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_email_time 
ON public.failed_login_attempts(email, attempt_time DESC);

-- Function to check and enforce rate limits with IP tracking
CREATE OR REPLACE FUNCTION public.check_rate_limit_with_ip(
  identifier text,
  ip_address text,
  max_attempts integer DEFAULT 5,
  window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  attempt_count INTEGER;
  ip_attempt_count INTEGER;
BEGIN
  -- Count recent attempts by identifier
  SELECT COUNT(*) INTO attempt_count
  FROM public.failed_login_attempts
  WHERE email = identifier 
  AND attempt_time > (now() - (window_minutes || ' minutes')::INTERVAL);
  
  -- Count recent attempts by IP address
  SELECT COUNT(*) INTO ip_attempt_count
  FROM public.failed_login_attempts
  WHERE ip_address = check_rate_limit_with_ip.ip_address
  AND attempt_time > (now() - (window_minutes || ' minutes')::INTERVAL);
  
  -- Return false if either limit exceeded
  RETURN attempt_count < max_attempts AND ip_attempt_count < (max_attempts * 2);
END;
$$;

-- ============================================
-- 4. Security Audit Logging Enhancement
-- ============================================

-- Add index on security_events_log for faster queries
CREATE INDEX IF NOT EXISTS idx_security_events_log_user_created 
ON public.security_events_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_log_type_severity 
ON public.security_events_log(event_type, severity, created_at DESC);

-- ============================================
-- 5. Session Security
-- ============================================

-- Function to detect suspicious session activity
CREATE OR REPLACE FUNCTION public.detect_suspicious_session(
  p_user_id uuid,
  p_ip_address text,
  p_user_agent text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_sessions_count INTEGER;
  different_ips_count INTEGER;
BEGIN
  -- Count recent sessions for this user
  SELECT COUNT(DISTINCT ip_address) INTO different_ips_count
  FROM public.security_events_log
  WHERE user_id = p_user_id
  AND event_type = 'session_created'
  AND created_at > (now() - INTERVAL '1 hour');
  
  -- Flag as suspicious if more than 3 different IPs in last hour
  IF different_ips_count > 3 THEN
    PERFORM log_security_event(
      'suspicious_session_activity',
      format('Multiple IP addresses detected for user %s', p_user_id::text),
      NULL,
      p_ip_address
    );
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- ============================================
-- 6. Input Length Validation
-- ============================================

-- Function to validate input length (prevent DoS via large inputs)
CREATE OR REPLACE FUNCTION public.validate_input_length(
  input_text text,
  max_length integer DEFAULT 10000
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  IF length(input_text) > max_length THEN
    -- Log potential DoS attempt
    RAISE WARNING 'Input length % exceeds maximum %', length(input_text), max_length;
    RETURN left(input_text, max_length);
  END IF;
  
  RETURN input_text;
END;
$$;

-- ============================================
-- 7. Comments for Documentation
-- ============================================

COMMENT ON FUNCTION public.sanitize_input IS 'Sanitizes user input to prevent XSS attacks. Removes HTML tags, control characters, and dangerous protocols.';
COMMENT ON FUNCTION public.validate_file_extension IS 'Validates file extensions against a whitelist to prevent malicious file uploads.';
COMMENT ON FUNCTION public.sanitize_file_path IS 'Sanitizes file paths to prevent directory traversal attacks.';
COMMENT ON FUNCTION public.check_rate_limit_with_ip IS 'Enhanced rate limiting that tracks both user identifier and IP address.';
COMMENT ON FUNCTION public.detect_suspicious_session IS 'Detects suspicious session activity such as multiple IP addresses.';
COMMENT ON FUNCTION public.validate_input_length IS 'Validates and truncates input length to prevent DoS attacks via large inputs.';

