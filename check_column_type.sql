-- Run this FIRST to check the actual column type
SELECT 
  column_name,
  data_type,
  udt_name,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'project_phases'
  AND column_name IN ('position_rule', 'position_value')
ORDER BY column_name;

