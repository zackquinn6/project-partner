# Revision Creation - Testing Checklist

## Pre-Testing Setup
- [ ] Database migration completed successfully
- [ ] All triggers created and enabled
- [ ] Verification query shows ✓ PASS for all revisions

## Acceptance Criteria Tests

### AC1: Create New Revision - All Steps Copied
**Project**: Tile Flooring Installation (Base project has 48 steps)

- [ ] Navigate to Project Management
- [ ] Select "Tile Flooring Installation" (revision 0 or 1)
- [ ] Click "Create New Revision"
- [ ] Add revision notes: "Acceptance test - verifying all 48 steps copy"
- [ ] Click "Create"
- [ ] Verify success message appears
- [ ] **CRITICAL**: Run verification query - new revision should show 48 steps

**SQL Verification**:
```sql
-- Should show 48 steps for the new revision
SELECT 
  p.revision_number,
  COUNT(ts.id) as step_count
FROM projects p
JOIN template_operations toper ON toper.project_id = p.id
JOIN template_steps ts ON ts.operation_id = toper.id
WHERE p.name = 'Tile Flooring Installation'
GROUP BY p.id, p.revision_number
ORDER BY p.revision_number DESC
LIMIT 1;
```

**Expected**: `step_count = 48` ✓

---

### AC2: Standard Phases Present and Ordered
**Project**: Any new project

- [ ] Create new project via UI
- [ ] Verify Kickoff phase appears first
- [ ] Verify Planning phase appears second
- [ ] Verify Ordering phase appears third
- [ ] Add custom phases
- [ ] Verify Close Project phase automatically moves to last position
- [ ] Try to move Kickoff after Planning (should be prevented)
- [ ] Try to move Close Project to middle (should be prevented)

**SQL Verification**:
```sql
-- Check phase ordering for newly created project
WITH phase_order AS (
  SELECT 
    sp.name,
    sp.display_order,
    COUNT(toper.id) as operation_count
  FROM template_operations toper
  JOIN standard_phases sp ON sp.id = toper.standard_phase_id
  WHERE toper.project_id = 'new-project-id-here'
  GROUP BY sp.id, sp.name, sp.display_order
  ORDER BY sp.display_order
)
SELECT * FROM phase_order;
```

**Expected**: Kickoff(1), Planning(2), Ordering(3), ..., Close Project(last) ✓

---

### AC3: Revision Maintains Standard Phase Rules
**Project**: Tile Flooring Installation revision

- [ ] Open newly created revision in Structure Manager
- [ ] Verify Kickoff phase is at position 1 (cannot move)
- [ ] Verify Planning phase is at position 2 (cannot move)  
- [ ] Verify Ordering phase is at position 3 (cannot move)
- [ ] Verify Close Project phase is last (cannot move)
- [ ] Verify all operations under correct phases
- [ ] Verify all 48 steps are visible

---

### AC4: Project Run from Revision Works Correctly
**Project**: New Tile Flooring revision from AC1

- [ ] Navigate to Projects page
- [ ] Click "Start Project" for the new revision
- [ ] Complete Kickoff phase steps
- [ ] Navigate into project workflow
- [ ] **CRITICAL**: Verify all 48 steps are accessible
- [ ] Navigate to step 1 of first custom phase
- [ ] Navigate to step 25 (middle of project)
- [ ] Navigate to last step (step 48)
- [ ] Verify step content displays correctly
- [ ] Complete a few steps
- [ ] Verify progress tracking works

---

### AC5: Data Consistency Check
**All Projects**

- [ ] Run comprehensive consistency check:

```sql
WITH phase_steps AS (
  SELECT 
    p.id,
    p.name,
    p.revision_number,
    COUNT(*) as steps_in_phases_json
  FROM projects p,
       jsonb_array_elements(p.phases) as phase,
       jsonb_array_elements(phase->'operations') as operation,
       jsonb_array_elements(operation->'steps') as step
  GROUP BY p.id, p.name, p.revision_number
),
template_steps_count AS (
  SELECT 
    p.id,
    COUNT(ts.id) as steps_in_templates
  FROM projects p
  LEFT JOIN template_operations toper ON toper.project_id = p.id
  LEFT JOIN template_steps ts ON ts.operation_id = toper.id
  GROUP BY p.id
)
SELECT 
  ps.name,
  ps.revision_number,
  ps.steps_in_phases_json,
  tsc.steps_in_templates,
  CASE 
    WHEN ps.steps_in_phases_json = tsc.steps_in_templates THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM phase_steps ps
JOIN template_steps_count tsc ON tsc.id = ps.id
ORDER BY ps.name, ps.revision_number;
```

- [ ] **CRITICAL**: All rows show "✓ PASS"
- [ ] No rows show "✗ FAIL"

---

## Regression Tests

### RT1: Existing Revisions Still Work
- [ ] Open Tile Flooring Installation revision 0
- [ ] Create project run
- [ ] Verify all 48 steps accessible
- [ ] Open Tile Flooring Installation revision 1  
- [ ] Create project run
- [ ] Verify all 48 steps accessible

---

### RT2: Edit Existing Project
- [ ] Open any existing project in Structure Manager
- [ ] Add a new operation
- [ ] Add 3 new steps to the operation
- [ ] Save changes
- [ ] Run SQL verification to check phases JSON updated
- [ ] Create revision of edited project
- [ ] Verify new steps included in revision

```sql
-- Verify phases JSON updated automatically
SELECT 
  jsonb_array_length(phases) as phase_count,
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(phases) as phase,
         jsonb_array_elements(phase->'operations') as operation,
         jsonb_array_elements(operation->'steps') as step
  ) as total_steps
FROM projects
WHERE id = 'edited-project-id-here';
```

---

### RT3: Trigger System Works
- [ ] Insert new operation directly via SQL:

```sql
-- Add test operation
INSERT INTO template_operations (
  project_id,
  standard_phase_id,
  name,
  description,
  display_order
) VALUES (
  'test-project-id',
  (SELECT id FROM standard_phases WHERE name = 'Kickoff'),
  'Test Operation',
  'Testing automatic sync',
  999
);
```

- [ ] Check phases JSON immediately updated:

```sql
-- Should include the new operation
SELECT phases::jsonb 
FROM projects 
WHERE id = 'test-project-id';
```

- [ ] Delete test operation
- [ ] Verify phases JSON updated again

---

## Performance Tests

### PT1: Large Project Revision
- [ ] Create project with 100+ steps
- [ ] Time revision creation (should complete in < 5 seconds)
- [ ] Verify all steps copied correctly

---

### PT2: Bulk Operations
- [ ] Add 50 new steps to a project via UI
- [ ] Monitor trigger performance
- [ ] Verify phases JSON updated correctly

---

## Edge Case Tests

### EC1: Empty Project
- [ ] Create project with no custom operations (only standard phases)
- [ ] Create revision
- [ ] Verify standard phases present
- [ ] Verify standard steps present

---

### EC2: Project with Linked Phases
- [ ] Create project with linked phases
- [ ] Create revision
- [ ] Verify linked phases copied correctly
- [ ] Verify linked phases positioned after custom phases

---

### EC3: Maximum Nesting
- [ ] Create project with deep nesting (many operations, many steps)
- [ ] Create revision
- [ ] Verify all nesting maintained
- [ ] Verify performance acceptable

---

## Security Tests

### ST1: Non-Admin Cannot Create Revision
- [ ] Log in as regular user
- [ ] Try to access revision creation
- [ ] Verify permission denied

---

### ST2: Audit Trail
- [ ] Create revision
- [ ] Query security_events_log:

```sql
SELECT *
FROM security_events_log
WHERE event_type = 'project_revision_created'
ORDER BY created_at DESC
LIMIT 1;
```

- [ ] Verify event logged with correct details

---

## Final Acceptance Test

### Tile Flooring Installation - Complete Workflow
- [ ] Navigate to Project Management
- [ ] Select Tile Flooring Installation (revision 0)
- [ ] Note current step count: 48 steps
- [ ] Click "Create New Revision"
- [ ] Add revision notes: "Final acceptance test"
- [ ] Verify success message
- [ ] Open new revision in Structure Manager
- [ ] **COUNT ALL STEPS**: Should be 48 steps total
- [ ] Verify all operation names match original
- [ ] Verify all step titles present
- [ ] Create project run from new revision
- [ ] Complete Kickoff phase
- [ ] Navigate to Subfloor Prep (should be step ~20)
- [ ] Navigate to Grout & Caulk (should be step ~40)
- [ ] Navigate to final step (step 48)
- [ ] **PASS CRITERIA**: All 48 steps accessible and functional ✓

---

## Sign-Off

**Tested By**: ___________________________

**Date**: ___________________________

**All Tests Passed**: [ ] YES [ ] NO

**Issues Found**: ___________________________

**Notes**: ___________________________

---

## Quick Verification Commands

### Check Specific Project
```sql
-- Replace 'project-name' with actual name
SELECT 
  p.name,
  p.revision_number,
  COUNT(DISTINCT toper.id) as operations,
  COUNT(ts.id) as steps,
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(p.phases) as phase,
         jsonb_array_elements(phase->'operations') as operation,
         jsonb_array_elements(operation->'steps') as step
  ) as steps_in_json,
  CASE 
    WHEN COUNT(ts.id) = (
      SELECT COUNT(*)
      FROM jsonb_array_elements(p.phases) as phase,
           jsonb_array_elements(phase->'operations') as operation,
           jsonb_array_elements(operation->'steps') as step
    ) THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM projects p
JOIN template_operations toper ON toper.project_id = p.id
JOIN template_steps ts ON ts.operation_id = toper.id
WHERE p.name LIKE '%project-name%'
GROUP BY p.id, p.name, p.revision_number, p.phases
ORDER BY p.revision_number;
```

### Trigger Status
```sql
-- Verify all triggers are enabled
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%rebuild_phases%'
ORDER BY event_object_table, event_manipulation;
```

Expected: 6 triggers (3 on template_operations, 3 on template_steps) ✓
