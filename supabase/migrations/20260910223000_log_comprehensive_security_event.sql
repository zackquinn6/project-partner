-- Restore client-facing security logging RPCs against public.security_events.
-- Callers: src/utils/enhancedSecurityLogger.ts, sync-standard-phases edge function.

CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type TEXT NOT NULL,
  severity TEXT,
  description TEXT,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_created_at
  ON public.security_events(created_at);

CREATE INDEX IF NOT EXISTS idx_security_events_user_id
  ON public.security_events(user_id);

CREATE INDEX IF NOT EXISTS idx_security_events_type_severity
  ON public.security_events(event_type, severity, created_at DESC);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view security events" ON public.security_events;
CREATE POLICY "Admins can view security events"
  ON public.security_events
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own security events" ON public.security_events;
CREATE POLICY "Users can view own security events"
  ON public.security_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert security events" ON public.security_events;
CREATE POLICY "Service role can insert security events"
  ON public.security_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_comprehensive_security_event(
  p_event_type TEXT,
  p_severity TEXT,
  p_description TEXT,
  p_user_id UUID DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_additional_data JSONB DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_metadata JSONB;
  v_ip INET;
BEGIN
  IF p_event_type IS NULL OR btrim(p_event_type) = '' THEN
    RAISE EXCEPTION 'p_event_type is required';
  END IF;

  IF p_description IS NULL OR btrim(p_description) = '' THEN
    RAISE EXCEPTION 'p_description is required';
  END IF;

  IF p_severity IS NULL OR p_severity NOT IN ('low', 'medium', 'high', 'critical') THEN
    RAISE EXCEPTION 'p_severity must be one of: low, medium, high, critical';
  END IF;

  v_user_id := p_user_id;
  IF v_user_id IS NULL THEN
    v_user_id := auth.uid();
  END IF;

  IF p_ip_address IS NULL THEN
    v_ip := NULL;
  ELSE
    v_ip := p_ip_address::INET;
  END IF;

  IF p_user_email IS NULL THEN
    v_metadata := p_additional_data;
  ELSIF p_additional_data IS NULL THEN
    v_metadata := jsonb_build_object('user_email', p_user_email);
  ELSE
    v_metadata := p_additional_data || jsonb_build_object('user_email', p_user_email);
  END IF;

  INSERT INTO public.security_events (
    event_type,
    severity,
    description,
    user_id,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    p_event_type,
    p_severity,
    p_description,
    v_user_id,
    v_ip,
    p_user_agent,
    v_metadata
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.enhanced_rate_limit_check(
  identifier TEXT,
  operation_type TEXT,
  max_attempts INTEGER DEFAULT 10,
  window_minutes INTEGER DEFAULT 15
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count INTEGER;
  window_start TIMESTAMPTZ;
BEGIN
  IF identifier IS NULL OR btrim(identifier) = '' THEN
    RAISE EXCEPTION 'identifier is required';
  END IF;

  IF operation_type IS NULL OR btrim(operation_type) = '' THEN
    RAISE EXCEPTION 'operation_type is required';
  END IF;

  IF max_attempts IS NULL OR max_attempts < 1 THEN
    RAISE EXCEPTION 'max_attempts must be >= 1';
  END IF;

  IF window_minutes IS NULL OR window_minutes < 1 THEN
    RAISE EXCEPTION 'window_minutes must be >= 1';
  END IF;

  window_start := now() - (window_minutes || ' minutes')::INTERVAL;

  SELECT COUNT(*) INTO attempt_count
  FROM public.security_events
  WHERE metadata->>'identifier' = identifier
    AND metadata->>'operation_type' = operation_type
    AND created_at > window_start;

  IF attempt_count >= max_attempts THEN
    PERFORM public.log_comprehensive_security_event(
      'rate_limit_exceeded',
      'high',
      'Rate limit exceeded for operation: ' || operation_type,
      auth.uid(),
      NULL,
      NULL,
      NULL,
      jsonb_build_object(
        'identifier', identifier,
        'operation_type', operation_type,
        'attempt_count', attempt_count,
        'max_attempts', max_attempts
      )
    );
    RETURN FALSE;
  END IF;

  PERFORM public.log_comprehensive_security_event(
    'rate_limit_check',
    'low',
    'Rate limit check passed for operation: ' || operation_type,
    auth.uid(),
    NULL,
    NULL,
    NULL,
    jsonb_build_object(
      'identifier', identifier,
      'operation_type', operation_type,
      'attempt_count', attempt_count
    )
  );

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.detect_suspicious_activity()
RETURNS TABLE(
  user_id UUID,
  user_email TEXT,
  risk_score INTEGER,
  suspicious_events JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  WITH user_activity AS (
    SELECT
      se.user_id,
      se.metadata->>'user_email' AS user_email,
      COUNT(*) FILTER (WHERE se.severity = 'high') AS high_severity_events,
      COUNT(*) FILTER (WHERE se.severity = 'critical') AS critical_events,
      COUNT(*) FILTER (WHERE se.event_type = 'rate_limit_exceeded') AS rate_limit_violations,
      COUNT(*) FILTER (WHERE se.event_type LIKE '%_failed') AS failed_operations,
      COUNT(DISTINCT se.ip_address) AS unique_ips,
      array_agg(DISTINCT se.event_type) AS event_types
    FROM public.security_events se
    WHERE se.created_at > (now() - INTERVAL '24 hours')
      AND se.user_id IS NOT NULL
    GROUP BY se.user_id, se.metadata->>'user_email'
  )
  SELECT
    ua.user_id,
    ua.user_email,
    (
      ua.critical_events * 50 +
      ua.high_severity_events * 20 +
      ua.rate_limit_violations * 15 +
      ua.failed_operations * 10 +
      CASE WHEN ua.unique_ips > 5 THEN 25 ELSE 0 END
    )::INTEGER AS risk_score,
    jsonb_build_object(
      'critical_events', ua.critical_events,
      'high_severity_events', ua.high_severity_events,
      'rate_limit_violations', ua.rate_limit_violations,
      'failed_operations', ua.failed_operations,
      'unique_ips', ua.unique_ips,
      'event_types', ua.event_types
    ) AS suspicious_events
  FROM user_activity ua
  WHERE (
    ua.critical_events > 0 OR
    ua.high_severity_events > 5 OR
    ua.rate_limit_violations > 3 OR
    ua.failed_operations > 10 OR
    ua.unique_ips > 5
  )
  ORDER BY risk_score DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.log_comprehensive_security_event(TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_comprehensive_security_event(TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, JSONB)
  TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.enhanced_rate_limit_check(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enhanced_rate_limit_check(TEXT, TEXT, INTEGER, INTEGER)
  TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.detect_suspicious_activity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.detect_suspicious_activity() TO authenticated, service_role;

COMMENT ON FUNCTION public.log_comprehensive_security_event IS
  'Inserts a row into security_events for auth and security monitoring.';
COMMENT ON FUNCTION public.enhanced_rate_limit_check IS
  'Counts recent security_events for identifier/operation and logs the check.';
COMMENT ON FUNCTION public.detect_suspicious_activity IS
  'Admin-only aggregation of recent high-risk security_events.';
