# Fix Standard Phase Linking to Project Templates

## Problem

Standard phases are not properly linking into individual project templates. This means that when templates are created, the standard phases (Kickoff, Planning, Ordering, Close Project) are not correctly linked to the Standard Project Foundation.

## Root Cause

When project templates are created, two critical links need to be established:

1. **Phase Level**: `project_phases.standard_phase_id` must reference the standard phase from the `standard_phases` table
2. **Operation Level**: `template_operations.source_operation_id` must reference the corresponding operation in the Standard Project Foundation

If these links are missing, the template cannot dynamically pull content from the Standard Project Foundation.

## Solution

The fix involves three steps:

### Step 1: Fix Phase Links
Update all `project_phases` records in templates to have `standard_phase_id` set by matching phase names with the Standard Project Foundation.

### Step 2: Fix Operation Links
Update all `template_operations` records in templates to have `source_operation_id` set by matching operation names and positions with the Standard Project Foundation.

### Step 3: Rebuild Phases JSON
Rebuild the `phases` JSONB column for all affected templates to reflect the new links.

## How to Apply the Fix

### Option 1: Run the Migration (Recommended)

If you're using Supabase migrations, the fix has been added as:
```
supabase/migrations/20250129000000_fix_standard_phase_linking.sql
```

Apply it using:
```bash
supabase db push
```

Or apply it directly in the Supabase SQL Editor.

### Option 2: Run the Standalone Fix Script

If you prefer to run the fix manually, use:
```
fix_standard_phase_linking.sql
```

This script includes diagnostic queries to show the current state before and after the fix.

## Verification

After running the fix, verify the links are working:

```sql
-- Check that all standard phases in templates have standard_phase_id
SELECT 
  p.name as project_name,
  pp.name as phase_name,
  pp.standard_phase_id,
  CASE 
    WHEN pp.standard_phase_id IS NULL THEN '❌ MISSING'
    ELSE '✅ LINKED'
  END as link_status
FROM projects p
JOIN project_phases pp ON pp.project_id = p.id
WHERE p.id != '00000000-0000-0000-0000-000000000001'
  AND p.is_standard_template = false
  AND p.is_current_version = true
  AND pp.is_standard = true
ORDER BY p.name, pp.display_order;

-- Check that all standard operations in templates have source_operation_id
SELECT 
  p.name as project_name,
  pp.name as phase_name,
  op.name as operation_name,
  op.source_operation_id,
  CASE 
    WHEN op.source_operation_id IS NULL THEN '❌ MISSING'
    WHEN std_op.id IS NULL THEN '❌ BROKEN LINK'
    WHEN std_op.project_id = '00000000-0000-0000-0000-000000000001' THEN '✅ LINKED'
    ELSE '⚠️ WRONG LINK'
  END as link_status
FROM projects p
JOIN project_phases pp ON pp.project_id = p.id
JOIN template_operations op ON op.phase_id = pp.id
LEFT JOIN template_operations std_op ON op.source_operation_id = std_op.id
WHERE p.id != '00000000-0000-0000-0000-000000000001'
  AND p.is_standard_template = false
  AND p.is_current_version = true
  AND pp.is_standard = true
ORDER BY p.name, pp.display_order, op.display_order;
```

## Prevention

To prevent this issue in the future, ensure that:

1. The `create_project_with_standard_foundation_v2()` function properly sets `standard_phase_id` when copying phases
2. The `create_project_with_standard_foundation_v2()` function properly sets `source_operation_id` when copying operations
3. The migration `20250128000004_fix_standard_foundation_linking.sql` is applied (it should handle this for new projects)
4. The migration `20250129000001_ensure_new_project_linking.sql` is applied to ensure the function is correct

## Testing New Projects

To verify that new projects are created with proper linking, run:

```sql
-- Run the verification script
\i verify_and_fix_new_project_linking.sql
```

Or test manually:

```sql
-- Create a test project
SELECT create_project_with_standard_foundation_v2(
  'Test Project',
  'Test Description',
  'general'
) as test_project_id;

-- Check linking (replace with actual test_project_id)
SELECT 
  pp.name as phase_name,
  pp.standard_phase_id,
  COUNT(op.id) as operations_count,
  COUNT(op.source_operation_id) as linked_operations_count
FROM project_phases pp
LEFT JOIN template_operations op ON op.phase_id = pp.id
WHERE pp.project_id = 'YOUR_TEST_PROJECT_ID'
  AND pp.is_standard = true
GROUP BY pp.id, pp.name, pp.standard_phase_id;
```

## Critical Missing Function

The UI uses `get_project_workflow_with_standards` RPC function to fetch phases, but this function was missing from the database! This is why standard phases weren't showing.

**Solution**: Created migration `20250129000002_create_get_project_workflow_with_standards.sql` which creates this function.

## Related Files

- `supabase/migrations/20250128000004_fix_standard_foundation_linking.sql` - Original migration that should fix this for new projects
- `supabase/migrations/20250129000000_fix_standard_phase_linking.sql` - Fix for existing templates
- `supabase/migrations/20250129000001_ensure_new_project_linking.sql` - Ensures new projects link correctly
- `supabase/migrations/20250129000002_create_get_project_workflow_with_standards.sql` - **CRITICAL**: Creates the missing RPC function used by UI
- `fix_standard_phase_linking.sql` - Standalone fix script with diagnostics
- `fix_complete_standard_phase_display.sql` - Complete fix including the missing function

