-- Create table to track failed login attempts
CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_email_time 
  ON public.failed_login_attempts(user_email, attempted_at);

-- Enable RLS
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table
DROP POLICY IF EXISTS "Service role only" ON public.failed_login_attempts;
CREATE POLICY "Service role only" ON public.failed_login_attempts
  FOR ALL
  USING (auth.role() = 'service_role');

-- Function to check rate limit
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
  -- Calculate the start of the time window
  window_start := NOW() - (window_minutes || ' minutes')::INTERVAL;
  
  -- Count failed attempts within the time window
  SELECT COUNT(*)
  INTO attempt_count
  FROM public.failed_login_attempts
  WHERE user_email = identifier
    AND attempted_at >= window_start;
  
  -- Return TRUE if under the limit, FALSE if exceeded
  RETURN attempt_count < max_attempts;
END;
$$;

-- Function to log failed login attempts
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
  -- Insert the failed login attempt
  INSERT INTO public.failed_login_attempts (user_email, ip_address, user_agent)
  VALUES (user_email, ip_addr, user_agent_string);
  
  -- Clean up old attempts (older than 24 hours)
  DELETE FROM public.failed_login_attempts
  WHERE attempted_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Grant execute permissions to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.log_failed_login(TEXT, TEXT, TEXT) TO authenticated, anon, service_role;

