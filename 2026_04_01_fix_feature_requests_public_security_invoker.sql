DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_views
    WHERE schemaname = 'public'
      AND viewname = 'feature_requests_public'
  ) THEN
    RAISE EXCEPTION 'Missing view "%" in schema public', 'feature_requests_public';
  END IF;

  EXECUTE '
    ALTER VIEW public.feature_requests_public
    SET (security_invoker = true)
  ';
END $$;
