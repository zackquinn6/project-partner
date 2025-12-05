-- Verification query to check database schema

-- Count tables
SELECT 
  'Total Tables' as check_type,
  COUNT(*)::text as count
FROM pg_tables 
WHERE schemaname = 'public'

UNION ALL

-- Count functions
SELECT 
  'Total Functions' as check_type,
  COUNT(DISTINCT proname)::text as count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN ('create_project_run_snapshot', 'check_rate_limit', 'log_failed_login')

UNION ALL

-- Count views
SELECT 
  'Total Views' as check_type,
  COUNT(*)::text as count
FROM pg_views 
WHERE schemaname = 'public'

UNION ALL

-- List critical tables (should exist)
SELECT 
  'Critical Tables Exist' as check_type,
  CASE 
    WHEN COUNT(*) >= 10 THEN 'YES (' || COUNT(*)::text || ' found)'
    ELSE 'MISSING (' || COUNT(*)::text || ' found)'
  END as count
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN (
    'projects', 'project_runs', 'project_phases', 'homes', 
    'user_roles', 'achievements', 'materials', 'tool_models',
    'user_contractors', 'feedback'
  );

-- List all tables
SELECT 'Tables:' as info, tablename as details
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

