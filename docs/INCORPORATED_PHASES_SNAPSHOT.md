# Incorporated Phases in Project Run Snapshots

## Critical Requirement

When a project run is created from a template, it MUST include **ALL** phases from the template, including:
- ✅ Standard phases (isStandard: true)
- ✅ Custom phases created for that project
- ✅ **Incorporated phases** (isLinked: true, sourceProjectId set)

## Critical Discovery

**Database Architecture:**
- ❌ There is **NO** `project_run_phases` relational table
- ✅ Phases are stored in `project_runs.phases` as **JSONB**
- ✅ This JSONB array contains the complete phase objects with all metadata
- ✅ The `create_project_run_snapshot` function copies this JSONB

## Problem

Incorporated phases are not being included in the JSONB when `create_project_run_snapshot` database function is called.

## What Are Incorporated Phases?

Incorporated phases are phases that were added to a project template from another project. They have:
- `isLinked: true` - Marks them as incorporated/linked from another project
- `sourceProjectId: string` - ID of the project they came from
- `sourceProjectName: string` - Name of source project (for display)
- `incorporatedRevision?: number` - Revision number from source project
- `sourceScalingUnit?: string` - Original scaling unit from source project

## Database Schema

```sql
-- project_runs table structure:
project_runs {
  id: UUID,
  phases: JSONB,  -- ← Entire phase array stored here as JSON
  ...
}

-- The phases JSONB contains an array like:
[
  {
    "id": "phase-uuid-1",
    "name": "Standard Phase",
    "isStandard": true,
    "operations": [...]
  },
  {
    "id": "phase-uuid-2", 
    "name": "Incorporated Phase",
    "isLinked": true,           -- ← MUST be preserved
    "sourceProjectId": "...",   -- ← MUST be preserved
    "sourceProjectName": "...", -- ← MUST be preserved
    "operations": [...]
  }
]
```

## Database Function Requirements

The `create_project_run_snapshot` function MUST:

1. **Copy the ENTIRE phases JSONB from template** without filtering
2. **Preserve ALL metadata in the JSON** including `isLinked`, `sourceProjectId`, etc.
3. **NOT filter out incorporated phases** from the JSON array
4. **Maintain the complete array structure** with all phase types

## Verification Added

The TypeScript code now verifies:
- ✅ Total phase count matches (template vs run)
- ✅ Incorporated phase count matches (template vs run)
- ✅ Logs incorporated phase names from both template and run
- ✅ Deletes and fails if incorporated phases are missing

## SQL Function Checklist

The database function should copy phases JSONB directly:

```sql
-- CORRECT: Copy entire phases JSONB
INSERT INTO project_runs (phases, ...)
SELECT 
  phases,  -- ← Copy entire JSONB array as-is
  ...
FROM project_templates_live
WHERE id = p_template_id;

-- INCORRECT: Don't do this
SELECT 
  (
    SELECT jsonb_agg(phase)
    FROM jsonb_array_elements(phases) phase
    WHERE (phase->>'isLinked')::boolean IS NOT TRUE  -- ❌ Don't filter!
  ) as phases
  ...

-- If building phases from project_phases table, ensure ALL fields copied:
SELECT jsonb_agg(
  jsonb_build_object(
    'id', pp.id,
    'name', pp.name,
    'isStandard', pp.is_standard,
    'isLinked', COALESCE(pp.is_linked, false),  -- ← MUST include
    'sourceProjectId', pp.source_project_id,     -- ← MUST include
    'sourceProjectName', pp.source_project_name, -- ← MUST include
    'incorporatedRevision', pp.incorporated_revision,
    'sourceScalingUnit', pp.source_scaling_unit,
    -- ... all other fields ...
    'operations', pp.operations  -- Including operations JSONB
  )
  ORDER BY pp.display_order
) as phases
FROM project_phases pp
WHERE pp.project_id = p_template_id;
-- NO filtering of incorporated phases!
```

## How to Check Current Database Function

```sql
-- View the create_project_run_snapshot function source:
SELECT 
  prosrc 
FROM pg_proc 
WHERE proname = 'create_project_run_snapshot';

-- Or in Supabase Dashboard:
-- Database → Functions → create_project_run_snapshot → View Definition
```

## How Incorporated Phases Are Identified

**In `project_phases` table:**
- `source_project_id IS NOT NULL` → indicates incorporated phase
- New `is_linked` field explicitly marks incorporated phases
- Both should be TRUE for incorporated phases

**In JSONB (templates and runs):**
- `isLinked: true` → marks as incorporated
- `sourceProjectId: "uuid"` → references source project
- `sourceProjectName: "Name"` → for display
- `sourceScalingUnit: "unit"` → if different from main project

## Testing

To verify incorporated phases are copied:
1. Run database migration: `20250204000001_ensure_incorporated_phase_fields.sql`
2. Create a project template
3. Add an incorporated phase from another project
4. Verify template shows the incorporated phase
5. Create a project run from that template
6. Check console logs for incorporated phase verification
7. Check if it passes or fails with clear error
8. If it fails: Check the create_project_run_snapshot function
9. Verify workflow navigation shows incorporated phase
10. Verify scheduler includes incorporated phase tasks

## Error Messages

If incorporated phases are missing, you'll see:
```
❌ CRITICAL: Project run missing incorporated phases!
Project run is missing X incorporated phases. The create_project_run_snapshot database 
function failed to copy incorporated phases. This is a critical error - project runs 
must be complete immutable snapshots.
```

The project run will be automatically deleted and creation will fail to prevent incomplete snapshots.

## Fix Required

Update the `create_project_run_snapshot` database function in Supabase to ensure it copies ALL phase metadata including `isLinked`, `sourceProjectId`, and related fields for incorporated phases.

