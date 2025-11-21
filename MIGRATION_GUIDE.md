# Supabase Migration Guide

## Pending Migrations

The following migrations need to be applied to your Supabase database:

### 1. Progress Reporting Style Migration
**File**: `supabase/migrations/20251120223426_add_progress_reporting_style.sql`

This migration adds the `progress_reporting_style` column to the `project_runs` table to support linear, exponential, and time-based progress calculations.

**To Apply:**
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/20251120223426_add_progress_reporting_style.sql`
4. Run the SQL

**SQL:**
```sql
ALTER TABLE public.project_runs
  ADD COLUMN IF NOT EXISTS progress_reporting_style TEXT NOT NULL DEFAULT 'linear' 
    CHECK (progress_reporting_style IN ('linear', 'exponential', 'time-based'));

COMMENT ON COLUMN public.project_runs.progress_reporting_style IS 
  'Progress calculation method: "linear" (step count-based), "exponential" (weighted toward completion), or "time-based" (uses time estimates with speed setting)';
```

### 2. Other Recent Migrations

If you haven't applied these yet, they should also be applied:

- `20251120171500_add_workers_needed_to_steps.sql` - Adds workers_needed column to template_steps
- `20251120171530_add_multiple_sizing_units_per_space.sql` - Adds sizing_values JSONB column
- `20251120171600_add_completion_priority_to_project_runs.sql` - Adds completion_priority column
- `20251120172000_create_relational_space_sizing_table.sql` - Creates project_run_space_sizing table
- `20251120172100_update_triggers_for_relational_sizing.sql` - Updates triggers for relational sizing
- `20251120172200_create_space_sizing_view.sql` - Creates space_sizing_view

## Verification

After applying migrations, verify they were successful:

```sql
-- Check if progress_reporting_style column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'project_runs' 
AND column_name = 'progress_reporting_style';

-- Check if workers_needed column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'template_steps' 
AND column_name = 'workers_needed';

-- Check if project_run_space_sizing table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'project_run_space_sizing';
```

