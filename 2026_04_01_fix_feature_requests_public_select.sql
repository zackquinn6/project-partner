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

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'feature_requests'
      AND policyname IN (
        'Anyone can view feature requests',
        'feature_requests_public_select'
      )
  ) THEN
    RAISE EXCEPTION 'Missing public SELECT policies on public.feature_requests';
  END IF;

  DROP POLICY IF EXISTS "Anyone can view feature requests" ON public.feature_requests;
  DROP POLICY IF EXISTS "feature_requests_public_select" ON public.feature_requests;
END $$;
