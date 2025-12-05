-- =====================================================
-- HOTFIX: Fix column names in rate limit functions
-- Issue: Functions were referencing wrong column names
-- Correct: user_email, attempted_at
-- Wrong: email, attempt_time
-- =====================================================

-- Fix check_rate_limit function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  identifier TEXT,
  max_attempts INTEGER DEFAULT 5,
  window_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  attempt_count INTEGER;
  window_start TIMESTAMPTZ;
BEGIN
  window_start := NOW() - (window_minutes || ' minutes')::INTERVAL;
  
  SELECT COUNT(*)
  INTO attempt_count
  FROM public.failed_login_attempts
  WHERE user_email = identifier
    AND attempted_at >= window_start;
  
  RETURN attempt_count < max_attempts;
END;
$$;

-- Fix log_failed_login function  
CREATE OR REPLACE FUNCTION public.log_failed_login(
  user_email TEXT,
  ip_addr TEXT DEFAULT NULL,
  user_agent_string TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.failed_login_attempts (user_email, ip_address, user_agent)
  VALUES (user_email, ip_addr, user_agent_string);
  
  -- Clean up old attempts (older than 24 hours)
  DELETE FROM public.failed_login_attempts
  WHERE attempted_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Rate limit functions hotfix applied successfully';
END $$;

