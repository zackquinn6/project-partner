# Standard Project Template Architecture - Testing Checklist

## Overview
This document provides a comprehensive testing checklist for the Standard Project Template Architecture implementation.

## Phase 1: Database Schema Validation ✅

### Standard Phases Table
- [x] `position_rule` column exists (TEXT)
- [x] `position_value` column exists (INTEGER)
- [x] `is_locked` column exists (BOOLEAN DEFAULT false)
- [x] Only 4 standard phases exist: Kickoff, Planning, Ordering, Close Project
- [x] Each phase has correct position rules:
  - Kickoff: `position_rule = 'first'`
  - Planning: `position_rule = 'nth'`, `position_value = 2`
  - Ordering: `position_rule = 'last_minus_n'`, `position_value = 1`
  - Close Project: `position_rule = 'last'`
- [x] All standard phases have `is_locked = true`

### Projects Table
- [x] `is_standard_template` column exists (BOOLEAN DEFAULT false)
- [x] Standard Project Foundation exists with ID `00000000-0000-0000-0000-000000000001`
- [x] Standard Project has `is_standard_template = true`

### Template Operations & Steps
- [x] Standard Project has operations linked to `standard_phase_id`
- [x] Standard Project has complete workflow steps
- [x] Operations properly reference standard phases

## Phase 2: Backend Functions Validation ✅

### Function: get_standard_project_template()
- [x] Returns project with `is_standard_template = true`
- [x] Includes all phases, operations, and steps
- [x] Returns correct JSON structure

### Function: apply_standard_phase_positioning()
- [x] Correctly positions Kickoff at first position
- [x] Correctly positions Planning at 2nd position
- [x] Correctly positions Ordering at last_minus_1 position
- [x] Correctly positions Close Project at last position
- [x] Custom phases inserted in correct positions

### Function: create_project_with_standard_foundation()
- [x] Creates new project with standard phases
- [x] Links operations to `standard_phase_id`
- [x] Copies all operations and steps from Standard Project
- [x] Rebuilds phases JSON correctly
- [x] Only allows admin users to execute

### Function: create_project_run_snapshot()
- [x] Creates immutable project run
- [x] Copies complete `phases` JSON from template
- [x] Returns project run ID
- [x] Does not link to template (pure snapshot)

### Function: create_project_revision()
- [x] Preserves `standard_phase_id` links when creating revisions
- [x] Prevents creating revisions of Standard Project
- [x] Correctly increments revision number
- [x] Copies all operations with their standard phase links

## Phase 3: Frontend Validation

### AdminView.tsx
- [ ] "Edit Standard Project" button visible
- [ ] Button calls `get_standard_project_template` RPC
- [ ] Loads Standard Project into ProjectContext
- [ ] Opens EditWorkflowView in 'edit-standard' mode

### EditWorkflowView.tsx
- [ ] Detects when editing Standard Project (`isEditingStandardProject`)
- [ ] Shows "🔒 Editing Standard Project" badge
- [ ] Can edit operations and steps within standard phases
- [ ] Properly saves changes to Standard Project

### StructureManager.tsx
- [ ] Shows 🔒 lock icon next to standard phase names
- [ ] Displays "(Standard - Locked)" text for standard phases
- [ ] Disables drag-and-drop for standard phases
- [ ] Prevents deletion of standard phases
- [ ] Prevents adding/deleting operations in standard phases
- [ ] Shows error toast when attempting disallowed actions

### UnifiedProjectManagement.tsx
- [ ] Calls `create_project_with_standard_foundation` for new projects
- [ ] New projects automatically include standard phases
- [ ] Standard phases positioned correctly in new projects

### ProjectActionsContext.tsx
- [ ] `addProjectRun` calls `create_project_run_snapshot` RPC
- [ ] Project runs created as immutable snapshots
- [ ] Success callback receives correct project run ID

## Phase 4: Data Migration Validation ✅

### Tile Flooring Installation Project
- [x] Old "Prep" and "Install" phases removed from standard_phases
- [x] Project operations now link to standard phases
- [x] Phases JSON rebuilt correctly
- [x] All 4 standard phases present in correct order

## Phase 5: Integration Testing

### Creating New Projects
- [ ] New project includes all 4 standard phases
- [ ] Standard phases in correct order
- [ ] Can add custom phases between standard phases
- [ ] Custom phases don't break standard phase ordering

### Editing Standard Project
- [ ] Admin can open Standard Project for editing
- [ ] Lock indicators visible
- [ ] Can edit step content within standard phases
- [ ] Changes save successfully
- [ ] New projects created after edit include updated content

### Creating Project Runs
- [ ] Project run creation uses snapshot function
- [ ] Project run includes complete phases JSON
- [ ] Project run is immutable (no structural changes allowed)
- [ ] Only step completion tracking works

### Creating Revisions
- [ ] Revisions preserve standard phase links
- [ ] Cannot create revision of Standard Project
- [ ] Revisions include both standard and custom phases
- [ ] Standard phases maintain positioning rules

## Error Scenarios

### Standard Phase Protection
- [ ] Cannot drag/reorder standard phases
- [ ] Cannot delete standard phases
- [ ] Cannot move phases to standard phase positions
- [ ] Appropriate error messages shown

### Standard Project Protection
- [ ] Cannot create revision of Standard Project
- [ ] Non-admins cannot edit Standard Project
- [ ] Appropriate error messages shown

### Project Run Immutability
- [ ] Cannot edit phases JSON in project runs
- [ ] Cannot restructure project runs
- [ ] Only step completion works

## Performance Testing

- [ ] New project creation completes in < 2 seconds
- [ ] Project run creation completes in < 2 seconds
- [ ] Standard Project edit saves in < 1 second
- [ ] Revision creation completes in < 3 seconds

## Documentation Validation ✅

- [x] STANDARD_PROJECT_ARCHITECTURE.md created
- [x] REVISION_CREATION_ARCHITECTURE.md updated with reference
- [x] Three-layer architecture clearly documented
- [x] Backend functions documented
- [x] Frontend components documented

## Rollback Testing

If issues occur, verify rollback procedures:
- [ ] Can restore from migration backup
- [ ] Can revert to previous code version
- [ ] Existing project runs unaffected
- [ ] Data integrity maintained

## Security Validation

- [ ] Only admins can edit Standard Project
- [ ] Only admins can create project templates
- [ ] Users can only create project runs from templates
- [ ] RLS policies prevent unauthorized modifications
- [ ] Security events logged correctly

## Production Readiness Checklist

- [x] All database migrations tested
- [x] All backend functions tested
- [ ] All frontend components tested
- [x] Data migration completed
- [x] Documentation updated
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] Rollback plan documented
- [ ] Team training completed

## Known Issues / Limitations

1. **Existing Project Runs**: Project runs created before this implementation do not use the immutable snapshot model. They will continue to function with the old architecture.

2. **Standard Project Edits**: Changes to the Standard Project only affect NEW projects created after the edit. Existing projects and project runs are unaffected.

3. **Custom Phase Positioning**: While standard phases are locked, custom phases can still be freely reordered as long as they don't violate standard phase positioning rules.

## Next Steps

1. Complete frontend integration testing
2. Conduct user acceptance testing with admin users
3. Monitor production performance
4. Gather feedback on lock UX
5. Consider phase 2 enhancements:
   - Visual workflow designer for standard phases
   - Version tracking for Standard Project edits
   - Bulk update mechanism for existing projects
