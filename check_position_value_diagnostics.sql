-- Run this in Supabase SQL Editor to check position_value column and data

-- 1. Check the actual column type
SELECT 
  column_name,
  data_type,
  udt_name,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'project_phases'
  AND column_name = 'position_value';

-- 2. Check all phases in standard project
SELECT 
  id,
  name,
  position_rule,
  position_value,
  pg_typeof(position_value) as value_type
FROM public.project_phases
WHERE project_id = '00000000-0000-0000-0000-000000000001'::UUID
ORDER BY position_rule, name;

-- 3. Check for any bad data (position_rule = 'last' with non-NULL position_value)
SELECT 
  id,
  name,
  position_rule,
  position_value,
  pg_typeof(position_value) as value_type
FROM public.project_phases
WHERE project_id = '00000000-0000-0000-0000-000000000001'::UUID
  AND position_rule = 'last'
  AND position_value IS NOT NULL;

-- 4. Try to see what happens when we select position_value for 'last' rule
SELECT 
  name,
  position_rule,
  position_value,
  position_value::INTEGER as cast_attempt
FROM public.project_phases
WHERE project_id = '00000000-0000-0000-0000-000000000001'::UUID
  AND position_rule = 'last'
LIMIT 1;

