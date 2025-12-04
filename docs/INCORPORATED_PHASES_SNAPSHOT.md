# Incorporated Phases in Project Run Snapshots

## Critical Requirement

When a project run is created from a template, it MUST include **ALL** phases from the template, including:
- ✅ Standard phases (isStandard: true)
- ✅ Custom phases created for that project
- ✅ **Incorporated phases** (isLinked: true, sourceProjectId set)

## Problem

Incorporated phases are not being copied to project runs when `create_project_run_snapshot` database function is called.

## What Are Incorporated Phases?

Incorporated phases are phases that were added to a project template from another project. They have:
- `isLinked: true` - Marks them as incorporated/linked from another project
- `sourceProjectId: string` - ID of the project they came from
- `sourceProjectName: string` - Name of source project (for display)
- `incorporatedRevision?: number` - Revision number from source project
- `sourceScalingUnit?: string` - Original scaling unit from source project

## Database Function Requirements

The `create_project_run_snapshot` function MUST:

1. **Copy ALL phases from template** including those with `isLinked: true`
2. **Preserve the `isLinked` flag** in the project run phases
3. **Preserve `sourceProjectId` and related metadata** for incorporated phases  
4. **Maintain phase order** including incorporated phases
5. **Copy all operations and steps** from incorporated phases

## Verification Added

The TypeScript code now verifies:
- ✅ Total phase count matches (template vs run)
- ✅ Incorporated phase count matches (template vs run)
- ✅ Logs incorporated phase names from both template and run
- ✅ Deletes and fails if incorporated phases are missing

## SQL Function Checklist

The database function should:

```sql
-- When copying phases from template to project run:
INSERT INTO project_run_phases (...)
SELECT 
  gen_random_uuid() as id,
  -- ... other fields ...
  is_linked,  -- ← MUST copy this field
  source_project_id,  -- ← MUST copy this field
  source_project_name,  -- ← MUST copy this field
  incorporated_revision,  -- ← MUST copy this field if exists
  source_scaling_unit  -- ← MUST copy this field if exists
FROM project_phases
WHERE project_id = p_template_id
-- NO WHERE clause filtering out isLinked phases!
```

## Testing

To verify incorporated phases are copied:
1. Create a project template
2. Add an incorporated phase from another project
3. Verify template shows the incorporated phase
4. Create a project run from that template
5. Check console logs for incorporated phase verification
6. Verify workflow navigation shows incorporated phase
7. Verify scheduler includes incorporated phase tasks

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

