# Dynamic Standard Phase Linking - Implementation Summary

## Overview

Implemented **true dynamic linking** where standard phases are NEVER copied into project templates. Instead, they are always dynamically merged from the Standard Project Foundation when viewing a project.

## Architecture

### Key Principle: NO COPYING
- Standard phases exist ONLY in Standard Project Foundation (ID: `00000000-0000-0000-0000-000000000001`)
- Project templates have NO standard phases stored
- When viewing a template, standard phases are dynamically merged from foundation
- When creating new projects, standard phases are NOT copied

### How It Works

1. **Standard Project Foundation** contains all standard phases with complete workflows
2. **Project Templates** contain only custom phases (if any)
3. **`get_project_workflow_with_standards(p_project_id)`** function:
   - Gets custom phases from the template
   - Gets standard phases from Standard Project Foundation
   - Merges them together
   - Returns complete workflow with all phases

## Migrations Applied

### 1. `20250129000002_create_get_project_workflow_with_standards.sql`
- Creates the RPC function used by the UI
- Function was missing, causing standard phases not to appear

### 2. `20250129000003_dynamic_standard_phase_linking.sql`
- **Updates `get_project_workflow_with_standards`** to dynamically merge:
  - Standard phases from Standard Project Foundation
  - Custom phases from the project template
- **Updates `create_project_with_standard_foundation_v2`** to NOT copy standard phases
  - Creates project with empty phases JSON
  - Standard phases will be added dynamically when viewing

### 3. `20250129000004_cleanup_copied_standard_phases.sql`
- Removes standard phases that were previously copied into templates
- Deletes standard phases from `project_phases` table for all templates
- Deletes operations that belonged to those standard phases
- Updates `projects.phases` JSON to remove standard phases

## Next Steps

### 1. Apply Migrations
Run the migrations in Supabase:
```bash
supabase db push
```

Or apply manually in Supabase SQL Editor:
1. Run `20250129000002_create_get_project_workflow_with_standards.sql`
2. Run `20250129000003_dynamic_standard_phase_linking.sql`
3. Run `20250129000004_cleanup_copied_standard_phases.sql`

### 2. Verify Functionality

**Test New Project Creation:**
```sql
-- Create a test project
SELECT create_project_with_standard_foundation_v2(
  'Test Dynamic Linking',
  'Test project to verify dynamic standard phase linking',
  'general'
) as new_project_id;

-- Check that it has NO standard phases in project_phases
SELECT COUNT(*) as standard_phases_count
FROM project_phases
WHERE project_id = 'YOUR_NEW_PROJECT_ID'
  AND is_standard = true;
-- Should return 0

-- Check that get_project_workflow_with_standards returns standard phases
SELECT jsonb_array_length(
  get_project_workflow_with_standards('YOUR_NEW_PROJECT_ID')
) as total_phases;
-- Should return 4 (standard phases) + any custom phases
```

**Test Existing Templates:**
```sql
-- Check a template project
SELECT 
  p.name,
  jsonb_array_length(get_project_workflow_with_standards(p.id)) as total_phases,
  (SELECT COUNT(*) FROM project_phases WHERE project_id = p.id AND is_standard = true) as copied_standard_phases
FROM projects p
WHERE p.id != '00000000-0000-0000-0000-000000000001'
  AND p.is_standard_template = false
  AND p.is_current_version = true
LIMIT 5;
```

### 3. UI Verification

1. **Open Structure Manager** for any project template
   - Standard phases should appear (Kickoff, Planning, Ordering, Close Project)
   - They should be marked with `isStandard: true`
   - They should have operations and steps

2. **Create a New Project**
   - Standard phases should appear immediately
   - No need to copy anything

3. **Start a Project Run**
   - Standard phases should be included in the run
   - All standard phase content should be present

## Benefits

1. **Single Source of Truth**: Standard phases only exist in Standard Project Foundation
2. **Always Up-to-Date**: Templates always get latest standard phase content
3. **No Duplication**: No standard phase data duplicated across templates
4. **Automatic Updates**: Changes to Standard Project Foundation automatically appear in all templates
5. **Simplified Maintenance**: Only one place to update standard phases

## Troubleshooting

### Standard phases not appearing?
1. Check that `get_project_workflow_with_standards` function exists:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'get_project_workflow_with_standards';
   ```

2. Check that Standard Project Foundation has phases:
   ```sql
   SELECT COUNT(*) FROM project_phases 
   WHERE project_id = '00000000-0000-0000-0000-000000000001';
   ```

3. Test the function directly:
   ```sql
   SELECT get_project_workflow_with_standards('YOUR_PROJECT_ID');
   ```

### Old standard phases still in templates?
- Run migration `20250129000004_cleanup_copied_standard_phases.sql` again
- Or manually delete:
  ```sql
  DELETE FROM project_phases 
  WHERE project_id != '00000000-0000-0000-0000-000000000001'
    AND is_standard = true;
  ```

## Related Files

- `supabase/migrations/20250129000002_create_get_project_workflow_with_standards.sql`
- `supabase/migrations/20250129000003_dynamic_standard_phase_linking.sql`
- `supabase/migrations/20250129000004_cleanup_copied_standard_phases.sql`
- `src/hooks/useDynamicPhases.ts` - UI hook that calls the function
- `src/components/StructureManager.tsx` - Uses the phases
- `src/components/EditWorkflowView.tsx` - Uses the phases

