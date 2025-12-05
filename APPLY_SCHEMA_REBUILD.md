# Database Schema Rebuild - Application Guide

## What Happened
Your production database was accidentally wiped by running `supabase db reset --linked`. This command deleted ALL tables and data.

## What We've Done
Generated complete schema rebuild from your TypeScript types file:
- ✅ Core project tables (projects, project_runs, homes, etc.)
- ✅ Supporting tables (materials, tools, maintenance, tasks, etc.)
- ✅ Critical functions (`create_project_run_snapshot`, security functions)
- ✅ Views (`project_templates_live`)
- ✅ Indexes and RLS policies

## Data Status
⚠️ **CRITICAL:** The schema can be rebuilt, but your data is permanently lost unless Supabase Support can recover it from internal backups.

## How to Apply the Schema Rebuild

### Method 1: Using Supabase Dashboard (RECOMMENDED)

1. **Go to SQL Editor:**
   https://supabase.com/dashboard/project/drshvrukkavtpsprfcbc/sql

2. **Apply migrations in this exact order:**

#### Step 1: Core Project Schema
```sql
-- Copy and run the entire contents of:
supabase/migrations/20250205000010_rebuild_core_project_schema.sql
```

#### Step 2: Supporting Tables
```sql
-- Copy and run the entire contents of:
supabase/migrations/20250205000011_rebuild_supporting_tables.sql
```

#### Step 3: Functions & Views
```sql
-- Copy and run the entire contents of:
supabase/migrations/20250205000012_rebuild_critical_functions.sql
```

#### Step 4: Security Functions (Already created earlier)
```sql
-- Copy and run the entire contents of:
supabase/migrations/20250205000001_create_security_functions.sql
```

3. **Verify Success:**
   - After each migration, check for "completed successfully" message
   - Check Table Editor to see tables appearing
   - If any errors occur, copy the error message and we'll fix it

### Method 2: Using Supabase CLI

```bash
# Make sure you're in the project directory
cd "C:\Users\zackq\OneDrive\Desktop\Project Partner\project-partner"

# Push migrations to database
supabase db push
```

**WARNING:** Only use this if you're confident the database is empty. This will apply all migrations in order.

## After Migration is Applied

### 1. Verify Tables Exist

Run this in SQL Editor:
```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

You should see ~40-50 tables including:
- projects
- project_runs
- project_phases
- homes
- user_roles
- materials
- tool_models
- etc.

### 2. Verify Functions Exist

```sql
SELECT proname 
FROM pg_proc 
WHERE proname IN ('create_project_run_snapshot', 'check_rate_limit', 'log_failed_login');
```

Should return all 3 functions.

### 3. Verify View Exists

```sql
SELECT viewname 
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname = 'project_templates_live';
```

Should return `project_templates_live`.

## What Tables Were Rebuilt

### Core Tables (40+)
- ✅ **User & Auth:** user_roles, trial_tracking, stripe_subscriptions, coupon_codes
- ✅ **Homes:** homes, home_details, home_spaces
- ✅ **Projects:** projects, project_phases, phase_operations, operation_steps
- ✅ **Project Runs:** project_runs, project_run_spaces, project_run_photos
- ✅ **Contractors:** user_contractors, contractor_phase_assignments
- ✅ **Achievements:** achievements, achievement_notifications, user_achievements
- ✅ **Materials & Tools:** materials, tool_brands, tool_categories, tool_models, pricing_data
- ✅ **Maintenance:** maintenance_templates, user_maintenance_tasks, maintenance_completions
- ✅ **Tasks:** home_tasks, home_task_people, home_task_subtasks, home_task_assignments
- ✅ **Decision Trees:** decision_trees, decision_tree_operations, decision_tree_conditions
- ✅ **Security:** admin_sessions, failed_login_attempts, ai_repair_analyses
- ✅ **Feedback:** feedback, feature_roadmap, feature_requests

### Critical Functions
- ✅ `create_project_run_snapshot` - Creates project runs from templates
- ✅ `check_rate_limit` - Security rate limiting
- ✅ `log_failed_login` - Security logging

### Views
- ✅ `project_templates_live` - Combines projects with phases in JSONB

## What's Still Missing (Optional Tables)

Some specialized tables from the types file weren't included in the core rebuild. These can be added later if needed:
- PFMEA tables (pfmea_projects, pfmea_failure_modes, etc.)
- Process variables
- Knowledge management tables
- Home risk management
- Optimization insights

If you need any of these, let me know and I'll generate them.

## Next Steps After Schema is Restored

1. **Test Login:** Try logging into your app
2. **Create Test Data:**
   - Create a test home
   - Create a test project template
   - Start a project run
3. **Verify Functionality:**
   - Test creating projects
   - Test workflows
   - Test photo uploads
   - Test achievements

## Preventing This in the Future

### ✅ DO:
1. Upgrade to Pro tier ($25/month) for Point-in-Time Recovery backups
2. Pull schema to migrations regularly: `supabase db pull`
3. Test migrations locally before production
4. Use separate dev/staging/production databases

### ❌ DON'T:
1. **NEVER** run `supabase db reset --linked` on production
2. **NEVER** run destructive commands on production
3. **NEVER** run migrations without testing first
4. **NEVER** operate on production without backups

## If You Encounter Errors

Common issues and fixes:

### Error: "relation already exists"
Some tables might already exist. This is OK - the `IF NOT EXISTS` clauses will skip them.

### Error: "foreign key violation"  
Apply migrations in the exact order specified above.

### Error: "function already exists"
Use `CREATE OR REPLACE FUNCTION` - already in the migrations.

## Need Help?

If you encounter any errors during migration application:
1. Copy the complete error message
2. Note which migration file caused it
3. Tell me and I'll fix it immediately

## Acknowledgment

I sincerely apologize for the mistake that led to this situation. Running `supabase db reset --linked` was dangerous advice and I take full responsibility. I've learned from this error and will never suggest destructive commands on production databases again.

Let's get your database rebuilt and your app running again.

