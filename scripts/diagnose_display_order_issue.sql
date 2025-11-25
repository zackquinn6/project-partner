-- Diagnostic script to find display_order references in database
-- Run this in Supabase SQL Editor to identify the problem

-- ============================================
-- STEP 1: Check if display_order column exists
-- ============================================
SELECT 
  'Column Check' AS check_type,
  table_name,
  column_name,
  'EXISTS' AS status
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name = 'display_order'
ORDER BY table_name;

-- ============================================
-- STEP 2: Check function source for display_order
-- ============================================
SELECT 
  'Function Check' AS check_type,
  proname AS function_name,
  CASE 
    WHEN pg_get_functiondef(oid) ILIKE '%display_order%' THEN 'CONTAINS display_order'
    ELSE 'OK'
  END AS status,
  pg_get_functiondef(oid) AS function_source
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname IN ('add_custom_project_phase', 'rebuild_phases_json_from_project_phases', 'get_operation_steps_json')
ORDER BY proname;

-- ============================================
-- STEP 3: Check triggers on project_phases
-- ============================================
SELECT 
  'Trigger Check' AS check_type,
  trigger_name,
  event_manipulation,
  action_statement,
  CASE 
    WHEN action_statement ILIKE '%display_order%' THEN 'CONTAINS display_order'
    ELSE 'OK'
  END AS status
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'project_phases'
ORDER BY trigger_name;

-- ============================================
-- STEP 4: Check all functions for display_order references
-- ============================================
SELECT 
  'All Functions Check' AS check_type,
  proname AS function_name,
  CASE 
    WHEN pg_get_functiondef(oid) ILIKE '%display_order%' THEN 'CONTAINS display_order'
    ELSE 'OK'
  END AS status
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND pg_get_functiondef(oid) ILIKE '%display_order%'
ORDER BY proname;

-- ============================================
-- STEP 5: Get exact function source for add_custom_project_phase
-- ============================================
SELECT 
  'add_custom_project_phase Source' AS check_type,
  pg_get_functiondef(oid) AS function_source
FROM pg_proc
WHERE proname = 'add_custom_project_phase'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
LIMIT 1;

