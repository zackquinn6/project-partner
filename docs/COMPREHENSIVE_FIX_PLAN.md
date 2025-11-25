# Comprehensive Fix Plan: Project Management System

## Executive Summary

This document outlines the comprehensive fix plan for the project management system, ensuring:
1. **Dynamic Linking**: Standard Project Foundation dynamically links to templates (not copied)
2. **Immutable Snapshots**: Project runs are complete, immutable copies
3. **Automated Testing**: Comprehensive test suite validates functionality

## Architecture Overview

### Three-Layer System

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Standard Project Foundation                    │
│ - Single source of truth for standard phases            │
│ - Editable via StructureManager                         │
│ - ID: 00000000-0000-0000-0000-000000000001              │
│ - is_standard_template = true                           │
└─────────────────────────────────────────────────────────┘
                        │
                        │ DYNAMIC LINK
                        │ (references, not copies)
                        ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Project Templates                              │
│ - Reference standard phases via standard_phase_id       │
│ - Can add custom phases                                 │
│ - Rebuild dynamically pulls from foundation             │
└─────────────────────────────────────────────────────────┘
                        │
                        │ IMMUTABLE SNAPSHOT
                        │ (complete copy)
                        ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Project Runs                                   │
│ - Complete immutable snapshot at creation               │
│ - Never changes, even if template changes               │
│ - User-specific progress tracking                       │
└─────────────────────────────────────────────────────────┘
```

## Key Principles

### 1. Dynamic Linking (Templates ← Foundation)

**What it means:**
- Templates **reference** standard phases via `project_phases.standard_phase_id`
- When rebuilding, operations/steps are **pulled dynamically** from foundation
- Changes to foundation automatically appear in templates when rebuilt

**Implementation:**
- `project_phases` table stores `standard_phase_id` for standard phases
- `rebuild_phases_json_from_project_phases()` checks for `standard_phase_id`
- If present, pulls operations/steps from Standard Project Foundation
- If absent, pulls from project's own tables (custom phases)

**Benefits:**
- Single source of truth
- No stale data
- Changes propagate automatically
- No duplication

### 2. Immutable Snapshots (Runs ← Templates)

**What it means:**
- Project runs are **complete copies** of template phases JSON
- Once created, never changes
- Even if template or foundation changes, run remains unchanged

**Implementation:**
- `create_project_run_snapshot()` rebuilds template phases first
- Takes complete JSON snapshot and stores in `project_runs.phases`
- No references - pure copy

**Benefits:**
- Users see consistent workflow
- Changes to templates don't affect in-progress runs
- Historical accuracy

## Database Schema

### project_phases Table

```sql
CREATE TABLE project_phases (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  name TEXT NOT NULL,
  standard_phase_id UUID REFERENCES standard_phases(id), -- Links to foundation
  is_standard BOOLEAN DEFAULT false,
  display_order INTEGER,
  ...
);
```

**Key fields:**
- `standard_phase_id`: NULL for custom phases, UUID for standard phases
- `is_standard`: Boolean flag (can be derived from `standard_phase_id IS NOT NULL`)

### Standard Phase Linking

```sql
-- Template has standard phase record
INSERT INTO project_phases (project_id, name, standard_phase_id, is_standard, display_order)
VALUES (template_id, 'Kickoff', foundation_standard_phase_id, true, 1);

-- No operations/steps stored in template - they're pulled dynamically
```

## Function Specifications

### rebuild_phases_json_from_project_phases(p_project_id UUID)

**Purpose:** Rebuilds phases JSON from relational tables with dynamic standard phase linking

**Logic:**
1. For each phase in `project_phases`:
   - If `standard_phase_id IS NOT NULL`:
     - Find corresponding phase in Standard Project Foundation
     - Pull all operations/steps from foundation dynamically
   - Else:
     - Pull operations/steps from project's own tables
2. Build phases JSON array
3. Update `projects.phases` column
4. Return JSONB

**Key Points:**
- Dynamic linking means pulling from foundation at rebuild time
- No operations/steps stored in templates for standard phases
- Custom phases store their own operations/steps

### create_project_run_snapshot(...)

**Purpose:** Creates immutable snapshot of template as project run

**Logic:**
1. Validate template exists
2. Call `rebuild_phases_json_from_project_phases()` to get current template state
3. Take complete JSON snapshot (no references)
4. Create `project_runs` record with snapshot
5. Create default "Room 1" space
6. Return project run ID

**Key Points:**
- Complete copy (no dynamic linking)
- Immutable (never changes)
- User-specific (requires user_id)

## Migration Files

### 1. `20250128000000_comprehensive_standard_phase_dynamic_linking.sql`

**What it does:**
- Drops and recreates `rebuild_phases_json_from_project_phases()`
- Implements dynamic linking logic
- Pulls from foundation when `standard_phase_id` exists
- Pulls from project's own tables for custom phases

**Changes:**
- Checks `standard_phase_id` for each phase
- Queries Standard Project Foundation for standard phases
- Validates every phase has operations and every operation has steps

### 2. `20250128000001_create_project_run_snapshot.sql`

**What it does:**
- Creates `create_project_run_snapshot()` function
- Creates immutable snapshots (complete copies)
- Uses correct table names (`project_run_spaces`, not `project_spaces`)
- Uses correct column names

### 3. `20250128000002_create_project_templates_live_view.sql`

**What it does:**
- Creates view for latest published revisions
- Filters out standard foundation
- Shows only published/beta-testing projects

### 4. `20250128000003_comprehensive_test_suite.sql`

**What it does:**
- Creates test suite
- Validates foundation exists
- Tests dynamic linking
- Tests snapshot creation
- Returns test results

## Testing Strategy

### Automated Tests

The test suite (`test_standard_phase_dynamic_linking()`) validates:

1. **Foundation Exists**: Standard Project Foundation is present and configured
2. **Foundation Has Phases**: At least 4 standard phases exist
3. **Standard Phases Linked**: All standard phases have `standard_phase_id`
4. **Rebuild Function Works**: Function exists and can rebuild phases
5. **Dynamic Linking Works**: Rebuild pulls from foundation for standard phases
6. **Snapshot Function Works**: Can create immutable project runs

### Manual Testing Checklist

1. **Edit Standard Project Foundation**
   - Open StructureManager for foundation
   - Edit a standard phase operation
   - Save changes
   - Verify template sees changes after rebuild

2. **Create Project Template**
   - Create new template
   - Verify standard phases appear
   - Verify standard phases are locked (read-only)
   - Add custom phase
   - Verify custom phase is editable

3. **Start Project Run**
   - Select template from catalog
   - Create project run
   - Verify all phases are present
   - Verify phases are complete copies (no references)
   - Verify default "Room 1" space created

4. **Verify Immutability**
   - Start project run
   - Edit template
   - Verify project run unchanged

## Expected Behavior

### Template Behavior

**When editing template:**
- Standard phases show lock icons
- Standard phases cannot be deleted
- Standard phases cannot be reordered (position locked)
- Operations/steps within standard phases are read-only
- Custom phases are fully editable

**When rebuilding template:**
- Standard phases pull latest content from foundation
- Custom phases use their own stored content
- Phase order respects standard phase positioning rules

### Project Run Behavior

**When creating run:**
- Complete snapshot of template taken
- All phases included (standard + custom)
- All operations/steps included
- No references to foundation or template
- Default "Room 1" space created

**During run execution:**
- Workflow structure never changes
- Users can only mark steps complete
- No editing of phases/operations/steps allowed

## Troubleshooting

### Issue: Standard phases not showing in templates

**Check:**
1. Standard Project Foundation exists and has phases
2. Template has `project_phases` records with `standard_phase_id`
3. `rebuild_phases_json_from_project_phases()` called
4. Function logic checks for `standard_phase_id`

**Fix:**
- Ensure foundation has all 4 standard phases
- Ensure template `project_phases` records have `standard_phase_id`
- Rebuild phases: `SELECT rebuild_phases_json_from_project_phases(template_id)`

### Issue: Changes to foundation not appearing in templates

**Check:**
1. Foundation actually updated
2. Template phases rebuilt after foundation change
3. Template viewing correct JSON

**Fix:**
- Rebuild template phases after foundation changes
- Verify `rebuild_phases_json_from_project_phases()` pulls from foundation

### Issue: Project runs missing phases

**Check:**
1. Template has phases before snapshot creation
2. `rebuild_phases_json_from_project_phases()` succeeds
3. Template `phases` JSON is populated
4. Snapshot creation succeeds

**Fix:**
- Rebuild template phases before creating run
- Verify template has complete phases JSON
- Check snapshot function logs

## Success Criteria

✅ Standard phases dynamically linked to templates
✅ Changes to foundation propagate to templates when rebuilt
✅ Project runs are immutable snapshots
✅ Standard phases locked/read-only in templates
✅ Custom phases editable in templates
✅ Automated tests pass
✅ Manual testing checklist complete

## Next Steps

1. Apply migrations in order
2. Run test suite: `SELECT * FROM test_standard_phase_dynamic_linking();`
3. Fix any failing tests
4. Manual testing per checklist
5. Verify in production


