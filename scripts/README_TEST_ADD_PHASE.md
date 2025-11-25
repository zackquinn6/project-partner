# Testing add_custom_project_phase Function

## Problem
The `add_custom_project_phase` function was failing with error: `column "display_order" does not exist`

## Root Cause
The database still has an old version of the function that references the `display_order` column, which has been removed from the schema.

## Solution
1. Apply all migrations in order (especially `20251126000007_comprehensive_fix_and_verify.sql`)
2. Run the test script to verify the function works

## Steps to Fix

### Step 1: Apply Migrations
Apply all migrations in the `supabase/migrations` directory, in order:
- `20251126000001_remove_display_order_column.sql` - Removes display_order column
- `20251126000002_update_rebuild_function_for_position_rules.sql` - Updates rebuild function
- `20251126000003_fix_ambiguous_id_in_add_phase.sql` - Fixes ambiguous id
- `20251126000004_fix_get_operation_steps_json_display_order.sql` - Fixes get_operation_steps_json
- `20251126000005_ensure_all_functions_updated_no_display_order.sql` - Ensures functions updated
- `20251126000006_force_recreate_add_custom_project_phase.sql` - Force recreates function
- `20251126000007_comprehensive_fix_and_verify.sql` - **COMPREHENSIVE FIX** (applies all fixes and verifies)

### Step 2: Run Test Script
1. Open Supabase SQL Editor
2. Copy and paste the contents of `scripts/test_add_phase_function.sql`
3. Run the script
4. Verify all tests pass (you should see ✅ messages)

## Expected Test Results

When you run the test script, you should see:
```
✅ TEST 1 PASSED: Function exists
✅ TEST 2 PASSED: Function does not reference display_order
✅ TEST 3 PASSED: Function correctly adds phase with operation and step to Standard Project Foundation
✅ TEST 4 PASSED: Function correctly adds phase with operation and step to regular project
✅ TEST 5 PASSED: display_order column does not exist in project_phases

========================================
✅ ALL TESTS PASSED
The add_custom_project_phase function is working correctly!
========================================
```

## Manual Testing

After running the automated tests, manually test in the UI:

1. Navigate to "Edit Standard" (Standard Project Foundation structure manager)
2. Click "Add Phase" button
3. Verify:
   - A new phase is added
   - The phase is positioned at "last minus one" (second-to-last, before "Close Project")
   - The phase has one operation named "New Operation"
   - The operation has one step named "New Step"
   - No errors appear in the console

## If Tests Fail

If any test fails:
1. Check the error message
2. Verify all migrations have been applied
3. Check if `display_order` column still exists:
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'project_phases' 
     AND column_name = 'display_order';
   ```
4. Check function source for display_order:
   ```sql
   SELECT pg_get_functiondef(oid)
   FROM pg_proc
   WHERE proname = 'add_custom_project_phase';
   ```

## Function Requirements

The `add_custom_project_phase` function must:
- ✅ NOT reference `display_order` column
- ✅ Use `position_rule` and `position_value` for Standard Project Foundation
- ✅ Set `position_rule = 'last_minus_n'` and `position_value = 1` for Standard Project Foundation
- ✅ Create one operation named "New Operation" for each new phase
- ✅ Create one step named "New Step" for each new operation
- ✅ Return the newly created phase with all required fields

