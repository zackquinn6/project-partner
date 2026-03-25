# Standard Phase Cascade Testing Protocol

## System Overview

The Standard Phase Cascade system ensures that changes made to the Standard Project Foundation automatically propagate to all project templates in the system.

### Key Components

1. **Standard Project Foundation** (ID: `00000000-0000-0000-0000-000000000001`)
   - Single source of truth for standard phases (Kickoff, Planning, Ordering, Close Project)
   - Editable via "Edit Standard" button in Admin Panel
   - Changes must cascade to all project templates

2. **Project Templates**
   - Created via "Create New Project" in Admin Panel
   - Include standard phases + optional custom phases
   - Must reflect latest standard phase content at all times
   - Identified by: `is_standard_template = false` AND `parent_project_id IS NULL`

3. **Project Runs**
   - Immutable snapshots of project templates
   - Do NOT receive cascade updates (by design)
   - Users execute these to complete actual projects

## Cascade Mechanisms

### 1. Automatic Cascade (Primary)
When admin saves changes in Standard Project Editor:
- EditWorkflowView detects `isEditingStandardProject = true`
- Updates `template_steps` table with new content
- Automatically calls `sync-standard-phases` edge function
- Displays toast notification with results
- All project templates updated immediately

**Location**: `src/components/EditWorkflowView.tsx` lines 408-437

### 2. Manual Cascade (Backup)
Admin clicks "Sync Standard Phases" button in Admin Panel:
- Button located in header of AdminView
- Calls `sync-standard-phases` edge function
- Displays loading toast during sync
- Shows success/failure notification with count
- Useful for troubleshooting or forced updates

**Location**: `src/components/AdminView.tsx` lines 42-72

### 3. Edge Function Logic
`supabase/functions/sync-standard-phases/index.ts`:
1. Verifies admin authorization
2. Calls `rebuild_phases_json_from_templates()` for Standard Project
3. Fetches all project templates (excluding revisions and Standard Project)
4. For each template:
   - Calls `rebuild_phases_json_from_templates()` to incorporate latest standard phases
   - Updates `updated_at` timestamp
5. Logs results to security events
6. Returns detailed sync report

## Testing Protocol

### Pre-Test Setup
1. Ensure you're logged in as admin
2. Navigate to Admin Panel → Project Management
3. Note current state of test project (e.g., "Dishwasher Replacement")

### Test Case 1: Verify Current State
**Objective**: Confirm initial state before changes

**Steps**:
1. Open database query tool
2. Run query to check Standard Project step:
   ```sql
   SELECT ts.step_title, ts.apps
   FROM template_steps ts
   JOIN template_operations to ON ts.operation_id = to.id
   WHERE to.project_id = '00000000-0000-0000-0000-000000000001'
   AND ts.step_title ILIKE '%initial project plan%'
   ```
3. Run query to check template project step:
   ```sql
   SELECT ts.step_title, ts.apps
   FROM template_steps ts
   JOIN template_operations to ON ts.operation_id = to.id
   WHERE to.project_id = (SELECT id FROM projects WHERE name = 'Dishwasher Replacement')
   AND ts.step_title ILIKE '%initial project plan%'
   ```

**Expected Result**: 
- Standard Project shows latest app (e.g., "Scope Builder")
- Template may show outdated app (e.g., "Project Customizer") if cascade not working

### Test Case 2: Manual Sync Button
**Objective**: Verify manual cascade mechanism

**Steps**:
1. In Admin Panel header, click "Sync Standard Phases" button
2. Observe loading toast appears
3. Wait for completion (should take 2-5 seconds)
4. Check success toast message
5. Verify count of templates updated in toast
6. Re-run database queries from Test Case 1

**Expected Result**:
- Toast shows "Standard phases synced! Updated X template(s)"
- Database queries now show matching apps between Standard Project and templates
- Console logs show detailed sync results

### Test Case 3: Automatic Cascade on Save
**Objective**: Verify automatic cascade when editing Standard Project

**Steps**:
1. Click "Edit Standard" button in Project Management
2. Navigate to Planning phase → Initial Project Plan step
3. Add or modify an app (e.g., change description)
4. Click save button (or auto-save triggers)
5. Observe cascade toast notification
6. Wait for completion
7. Return to Project Management
8. Open a project template to verify changes propagated

**Expected Result**:
- Toast shows "Syncing standard phases to all project templates..."
- Followed by success toast: "Changes cascaded to X template(s)"
- Template projects immediately reflect the changes
- No manual sync needed

### Test Case 4: Verify Apps in Step
**Objective**: Specific test for app cascade (the reported bug)

**Steps**:
1. Ensure Standard Project → Planning → Initial Project Plan has "Scope Builder" app
2. Run manual sync (Test Case 2)
3. Open Dishwasher Replacement template in Edit Workflow
4. Navigate to Planning → Initial Project Plan
5. Check apps list in step editor

**Expected Result**:
- Apps list includes "Scope Builder" (not "Project Customizer")
- Apps list may also include "Project Budgeting" or other standard apps
- Apps display in correct order

### Test Case 5: Create New Project
**Objective**: Verify new projects get latest standard phases

**Steps**:
1. Ensure Standard Project has latest content
2. Click "Create New Project" in Project Management
3. Fill in project details and save
4. Immediately open new project in Edit Workflow
5. Check Planning → Initial Project Plan → Apps

**Expected Result**:
- New project automatically has latest standard phase content
- No manual sync needed
- Apps match Standard Project exactly

### Test Case 6: Project Runs Stay Immutable
**Objective**: Confirm project runs don't receive updates

**Steps**:
1. Create a project run from an older template (before latest changes)
2. Note current step content in project run
3. Update Standard Project with new content
4. Trigger cascade (manual or automatic)
5. Re-open the same project run
6. Verify step content unchanged

**Expected Result**:
- Project run content remains exactly as it was at creation time
- No updates applied to project runs
- This is correct behavior (immutability)

## Common Issues and Solutions

### Issue: Cascade Not Triggering
**Symptoms**: Manual sync works, but automatic cascade doesn't trigger on save

**Debug Steps**:
1. Check console logs for "💾 SaveEdit: Cascading Standard Project changes..."
2. Verify `isEditingStandardProject` is true
3. Check network tab for edge function call
4. Review edge function logs in Supabase dashboard

**Solution**: Ensure EditWorkflowView properly detects Standard Project editing mode

### Issue: Edge Function Authorization Failed
**Symptoms**: "Admin access required" error in toast

**Debug Steps**:
1. Verify admin status via `public.is_admin(user_id)` and the user profile record
2. Check auth token in network request headers
3. Review edge function logs for auth errors

**Solution**: Ensure user is logged in as admin and session is valid

### Issue: Templates Not Updating
**Symptoms**: Sync completes but templates still show old content

**Debug Steps**:
1. Check `rebuild_phases_json_from_templates()` function exists
2. Verify template projects have correct flags:
   - `is_standard_template = false`
   - `parent_project_id IS NULL`
3. Check for database errors in edge function logs
4. Verify template_operations have correct `standard_phase_id` references

**Solution**: Run manual database rebuild or check template data structure

### Issue: Partial Updates
**Symptoms**: Some templates update, others don't

**Debug Steps**:
1. Check edge function response for `failedTemplates` array
2. Review console logs for specific error messages
3. Query database for problematic templates:
   ```sql
   SELECT id, name, updated_at 
   FROM projects 
   WHERE is_standard_template = false 
   AND parent_project_id IS NULL
   ORDER BY updated_at DESC
   ```

**Solution**: Manually debug failed templates, check for data integrity issues

## Success Criteria

✅ **Automatic Cascade**:
- Saves to Standard Project trigger cascade within 2 seconds
- Toast notifications appear and show accurate counts
- All templates update successfully (0 failures)

✅ **Manual Cascade**:
- "Sync Standard Phases" button works from Admin Panel
- Sync completes within 5 seconds for typical project count
- Results displayed in toast with template count

✅ **Data Integrity**:
- Standard Project changes fully propagate to templates
- Apps, content sections, materials, tools all update correctly
- Project runs remain immutable (no updates)

✅ **User Experience**:
- Clear feedback via toast notifications
- No data loss during cascade
- System remains responsive during sync

## Monitoring and Logs

### Database Logs
Check `security_events_log` table for cascade events:
```sql
SELECT * 
FROM security_events_log 
WHERE event_type IN ('standard_phase_cascade', 'manual_standard_phase_sync')
ORDER BY created_at DESC
LIMIT 10
```

### Edge Function Logs
1. Navigate to Supabase Dashboard → Edge Functions
2. Click on `sync-standard-phases` function
3. View recent invocations and errors
4. Check for authorization failures or database errors

### Console Logs
When testing in browser:
- Open DevTools console
- Look for "CASCADE:", "SYNC:", "SaveEdit:" prefixes
- Verify step-by-step execution
- Check for error messages or warnings

## Rollback Procedure

If cascade causes issues:

1. **Immediate**: Disable automatic cascade by commenting out lines 408-437 in EditWorkflowView.tsx
2. **Restore**: Use database backup to restore previous template states
3. **Manual Fix**: Query affected templates and manually update problematic steps
4. **Investigate**: Review edge function logs to identify root cause

## Future Enhancements

- [ ] Add cascade preview mode (show what would change before applying)
- [ ] Implement selective cascade (choose which templates to update)
- [ ] Add rollback button to undo last cascade
- [ ] Create cascade history log viewable in Admin Panel
- [ ] Add batch processing for large numbers of templates
- [ ] Implement cascade scheduling (delayed propagation)
- [ ] Add validation checks before cascade (ensure data integrity)
