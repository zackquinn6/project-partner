-- =====================================================
-- CREATE MISSING SECURITY TABLES AND FUNCTIONS
-- For audit logging and session cleanup
-- =====================================================

-- =====================================================
-- 1. CREATE ROLE_AUDIT_LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.role_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  old_role TEXT,
  new_role TEXT NOT NULL,
  changed_by UUID,
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient cleanup
CREATE INDEX IF NOT EXISTS idx_role_audit_log_created_at 
  ON public.role_audit_log(created_at);

-- Enable RLS
ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.role_audit_log;
CREATE POLICY "Admins can view audit logs"
  ON public.role_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Service role can insert audit logs
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.role_audit_log;
CREATE POLICY "Service role can insert audit logs"
  ON public.role_audit_log FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- 2. CREATE SESSION_FINGERPRINTS TABLE
-- (Referenced by cleanup function)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.session_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id TEXT NOT NULL,
  fingerprint_hash TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient cleanup
CREATE INDEX IF NOT EXISTS idx_session_fingerprints_last_verified 
  ON public.session_fingerprints(last_verified_at);

-- Enable RLS
ALTER TABLE public.session_fingerprints ENABLE ROW LEVEL SECURITY;

-- Users can view own session fingerprints
DROP POLICY IF EXISTS "Users can view own fingerprints" ON public.session_fingerprints;
CREATE POLICY "Users can view own fingerprints"
  ON public.session_fingerprints FOR SELECT
  USING (auth.uid() = user_id);

-- Service role full access
DROP POLICY IF EXISTS "Service role full access" ON public.session_fingerprints;
CREATE POLICY "Service role full access"
  ON public.session_fingerprints FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 3. CREATE CLEANUP_OLD_SESSIONS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete session fingerprints older than 30 days
  DELETE FROM public.session_fingerprints
  WHERE last_verified_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_sessions IS 
'Deletes session fingerprints older than 30 days. Returns count of deleted records.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.cleanup_old_sessions() TO authenticated, anon, service_role;

-- =====================================================
-- 4. CREATE SECURITY_EVENTS TABLE
-- (Optional - for enhanced security logging)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_security_events_created_at 
  ON public.security_events(created_at);

CREATE INDEX IF NOT EXISTS idx_security_events_user_id 
  ON public.security_events(user_id);

-- Enable RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Admins can view all security events
DROP POLICY IF EXISTS "Admins can view security events" ON public.security_events;
CREATE POLICY "Admins can view security events"
  ON public.security_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Users can view their own security events
DROP POLICY IF EXISTS "Users can view own security events" ON public.security_events;
CREATE POLICY "Users can view own security events"
  ON public.security_events FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert security events
DROP POLICY IF EXISTS "Service role can insert security events" ON public.security_events;
CREATE POLICY "Service role can insert security events"
  ON public.security_events FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ role_audit_log table created';
  RAISE NOTICE '✅ session_fingerprints table created';
  RAISE NOTICE '✅ security_events table created';
  RAISE NOTICE '✅ cleanup_old_sessions function created';
  RAISE NOTICE '✅ All security maintenance infrastructure ready';
END $$;

