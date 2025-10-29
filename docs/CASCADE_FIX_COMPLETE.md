# Standard Phase Cascade - Complete Fix

## Date: 2025-10-29

## Root Cause Identified

The cascade system was working correctly, but there were TWO critical issues:

### Issue 1: Empty Apps in Standard Project Foundation
The Standard Project Foundation's kickoff steps had **empty `apps` arrays**. When the cascade sync ran, it was correctly copying empty arrays to all templates.

**Database Query Proof:**
```sql
SELECT step_title, apps FROM template_steps 
WHERE operation_id IN (
  SELECT id FROM template_operations 
  WHERE project_id = '00000000-0000-0000-0000-000000000001'
)
-- Result: All kickoff steps showed apps: []
```

### Issue 2: Trigger Function Bug
The `cascade_standard_phase_updates()` trigger had an **ambiguous column reference** bug that prevented any updates to standard steps from working:

```sql
-- BROKEN CODE:
AND (standard_phase_id IS NULL OR tmo.standard_phase_id = standard_phase_id)
-- This was ambiguous - Postgres couldn't tell if standard_phase_id 
-- referred to the variable or the column

-- FIXED CODE:
AND (affected_standard_phase_id IS NULL OR tmo.standard_phase_id = affected_standard_phase_id)
```

## Complete Fix Applied

### 1. Fixed Trigger Function (Migration)
- Renamed variable from `standard_phase_id` to `affected_standard_phase_id` to eliminate ambiguity
- This allows the automatic cascade trigger to work properly when Standard Project steps are updated

### 2. Populated Standard Project Foundation Apps (Migration)
Added the correct apps to kickoff steps:

**Step 2: Complete DIY Assessment**
- Added "My Profile" app (app-my-profile)
- Allows users to view/edit their DIY profile during kickoff

**Step 3: Set Project Parameters**  
- Added "Scope Builder" app (app-project-customizer)
- Allows users to customize their project scope during kickoff

### 3. Automatic Cascade Triggered
The UPDATE statements automatically triggered the `cascade_standard_phase_updates()` function, which:
1. Rebuilt Standard Project Foundation phases JSON
2. Cascaded changes to ALL 9 project templates
3. Updated `updated_at` timestamps

## How the System Now Works

### Automatic Cascade (Preferred)
When you edit Standard Project Foundation in the admin workflow editor:
1. Changes save to `template_steps` table
2. Trigger automatically rebuilds phases JSON for Standard Project
3. Trigger automatically cascades to all project templates
4. All templates updated instantly

### Manual Sync (Backup)
The "Sync Standard Phases" button in Admin Panel:
- Manually calls the `sync-standard-phases` edge function
- Useful for debugging or if automatic cascade fails
- Shows toast notifications with detailed results

## Testing Performed

✅ Verified Standard Project Foundation has correct apps
✅ Verified automatic cascade updated all 9 templates
✅ Verified trigger function no longer has ambiguous column error
✅ Confirmed manual sync edge function still works as backup

## Expected Behavior Going Forward

### For Existing Project Runs
- Old project runs are **immutable snapshots** and won't automatically update
- Users must delete and recreate project runs to get latest template changes
- Or use the "Refresh from Template" button in workflow sidebar (if available)

### For New Project Runs
- Will automatically include the correct apps in kickoff steps
- "My Profile" app will appear in DIY Assessment step
- "Scope Builder" app will appear in Set Project Parameters step

## Progress Bar Issues

The progress bar fix is separate and has been addressed in previous updates:
1. Fresh database fetches on project selection
2. Robust progress calculation with both UUID and legacy ID matching
3. Completed steps properly persisted to database

## Manual Sync Button Toast Notifications

The toast notifications now work correctly:
1. Loading toast appears immediately
2. Success toast shows after 100ms delay (10 second duration)
3. Detailed results logged to console
4. Shows count of templates updated/failed

## Summary

- ✅ Trigger bug fixed - automatic cascade now works
- ✅ Standard Project Foundation populated with correct apps
- ✅ All 9 templates automatically updated via cascade
- ✅ New project runs will have correct kickoff apps
- ✅ Manual sync button works as backup method
- ✅ Toast notifications display correctly

**Action Required:**
Users must **delete existing project runs** and **create new ones** to see the updated kickoff apps.
