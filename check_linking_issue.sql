-- Diagnostic query to check if standard foundation is linking to templates
-- This checks if template_operations have source_operation_id pointing to standard foundation

-- 1. Check if standard foundation exists
SELECT 
  id,
  name,
  is_standard_template
FROM projects
WHERE id = '00000000-0000-0000-0000-000000000001'
  OR is_standard_template = true;

-- 2. Check standard foundation operations
SELECT 
  op.id as operation_id,
  op.name as operation_name,
  pp.name as phase_name,
  pp.standard_phase_id
FROM template_operations op
JOIN project_phases pp ON op.phase_id = pp.id
WHERE pp.project_id = '00000000-0000-0000-0000-000000000001'
ORDER BY pp.display_order, op.display_order
LIMIT 10;

-- 3. Check if template projects have source_operation_id links
SELECT 
  t.id as template_id,
  t.name as template_name,
  COUNT(op.id) as total_operations,
  COUNT(op.source_operation_id) as linked_operations,
  COUNT(CASE WHEN op.source_operation_id IS NOT NULL AND std_op.id IS NOT NULL THEN 1 END) as valid_links
FROM projects t
LEFT JOIN project_phases pp ON pp.project_id = t.id
LEFT JOIN template_operations op ON op.phase_id = pp.id
LEFT JOIN template_operations std_op ON op.source_operation_id = std_op.id
WHERE t.id != '00000000-0000-0000-0000-000000000001'
  AND t.is_standard_template = false
  AND t.is_current_version = true
GROUP BY t.id, t.name
ORDER BY t.name
LIMIT 10;

-- 4. Check a specific template's operations and their links
SELECT 
  pp.name as phase_name,
  op.name as operation_name,
  op.source_operation_id,
  std_op.name as source_operation_name,
  std_op.id as source_operation_id_check,
  CASE 
    WHEN op.source_operation_id IS NULL THEN '❌ NO LINK'
    WHEN std_op.id IS NULL THEN '❌ BROKEN LINK'
    WHEN std_op.project_id = '00000000-0000-0000-0000-000000000001' THEN '✅ LINKED TO FOUNDATION'
    ELSE '⚠️ LINKED TO OTHER'
  END as link_status
FROM projects t
JOIN project_phases pp ON pp.project_id = t.id
JOIN template_operations op ON op.phase_id = pp.id
LEFT JOIN template_operations std_op ON op.source_operation_id = std_op.id
WHERE t.id != '00000000-0000-0000-0000-000000000001'
  AND t.is_standard_template = false
  AND t.is_current_version = true
  AND pp.is_standard = true
ORDER BY t.name, pp.display_order, op.display_order
LIMIT 20;















