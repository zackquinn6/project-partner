-- DIAGNOSTIC SCRIPT: Check what's actually in the database
-- Run this in Supabase SQL Editor to see what functions/triggers are active

-- 1. Check if standard_phase_id column exists in template_operations
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'template_operations' 
  AND column_name = 'standard_phase_id';

-- 2. List all triggers on template_operations
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'template_operations'
  AND event_object_schema = 'public'
ORDER BY trigger_name;

-- 3. Check the current definition of create_project_with_standard_foundation_v2
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'create_project_with_standard_foundation_v2';

-- 4. Check for any functions that reference standard_phase_id in template_operations
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_definition LIKE '%template_operations%standard_phase_id%'
  OR routine_definition LIKE '%standard_phase_id%template_operations%';

-- 5. Check trigger functions that might reference standard_phase_id
SELECT 
  t.trigger_name,
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM information_schema.triggers t
JOIN pg_trigger pt ON pt.tgname = t.trigger_name
JOIN pg_proc p ON p.oid = pt.tgfoid
WHERE t.event_object_table = 'template_operations'
  AND t.event_object_schema = 'public'
  AND (
    pg_get_functiondef(p.oid) LIKE '%standard_phase_id%'
    OR pg_get_functiondef(p.oid) LIKE '%NEW.standard_phase_id%'
    OR pg_get_functiondef(p.oid) LIKE '%OLD.standard_phase_id%'
  );

