# Supabase Migrations Guide

This guide explains how to connect to Supabase and apply migrations automatically.

## Prerequisites

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```
   Or using other package managers:
   ```bash
   # Homebrew (Mac)
   brew install supabase/tap/supabase
   
   # Scoop (Windows)
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```

2. **Verify Installation**
   ```bash
   supabase --version
   ```

## Step 1: Link Your Project to Supabase

You need to link your local project to your remote Supabase project.

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project: `drshvrukkavtpsprfcbc`
3. Go to **Settings** → **Project Settings** → **General**
4. Copy your **Project Reference ID** (this is different from your project ID)

5. In your terminal, navigate to your project directory:
   ```bash
   cd "C:\Users\zackq\OneDrive\Desktop\Project Partner\project-partner"
   ```

6. Link your project:
   ```bash
   supabase link --project-ref <your-project-ref>
   ```
   
   You'll be prompted to enter:
   - Database password (found in Settings → Database → Database Password)
   - Or you can use an access token (Settings → Access Tokens)

### Option B: Using Environment Variables

Create a `.env` file in your project root (if it doesn't exist):

```env
SUPABASE_URL=https://drshvrukkavtpsprfcbc.supabase.co
SUPABASE_DB_PASSWORD=your-database-password
SUPABASE_ACCESS_TOKEN=your-access-token
```

Then link using the access token:
```bash
supabase link --project-ref drshvrukkavtpsprfcbc --password <db-password>
```

## Step 2: Apply Migrations

Once linked, you can apply migrations:

### Push All Migrations

```bash
supabase db push
```

This will:
- Upload all migration files from `supabase/migrations/`
- Apply them in order (by timestamp prefix)
- Show progress and any errors

### Push Specific Migration

```bash
supabase migration up <migration-name>
```

### Check Migration Status

```bash
supabase migration list
```

This shows which migrations have been applied and which are pending.

## Step 3: Verify Migrations

After pushing, verify the migrations were applied:

### Option 1: Check in Supabase Dashboard
1. Go to Database → Migrations
2. Verify all migrations are listed

### Option 2: Use SQL Editor
1. Go to SQL Editor in Supabase Dashboard
2. Run:
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;
   ```

## Current Migration Files

Your project has these migrations ready to apply:

1. `20250128000000_comprehensive_standard_phase_dynamic_linking.sql` - Dynamic standard phase linking
2. `20250128000001_create_project_run_snapshot.sql` - Project run snapshot function
3. `20250128000002_create_project_templates_live_view.sql` - Project templates view
4. `20250128000003_comprehensive_test_suite.sql` - Automated test suite
5. `20250128000004_diagnostic_check_phase_operations.sql` - Diagnostic function
6. `20250128000005_fix_create_project_dynamic_linking.sql` - Fix create project function

## Troubleshooting

### Error: "Project not linked"

**Solution:** Run `supabase link` again with your project reference ID.

### Error: "Access denied"

**Solution:** 
1. Check your database password is correct
2. Or generate a new access token in Supabase Dashboard → Settings → Access Tokens

### Error: "Migration already applied"

**Solution:** 
- Check migration status: `supabase migration list`
- If migration is partially applied, you may need to fix it manually in SQL Editor

### Error: "Connection timeout"

**Solution:**
- Check your internet connection
- Verify Supabase project is active (not paused)
- Try again: `supabase db push --debug` for more details

## Alternative: Manual Migration via SQL Editor

If automatic migrations fail, you can apply them manually:

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of each migration file (in order)
3. Paste into SQL Editor
4. Run each migration one by one

**Important:** Apply migrations in order (00000 → 00001 → 00002, etc.)

## After Applying Migrations

1. **Fix existing projects** (run this in SQL Editor):
   ```sql
   SELECT * FROM public.fix_existing_projects_standard_phases();
   ```

2. **Run test suite** (verify everything works):
   ```sql
   SELECT * FROM public.test_standard_phase_dynamic_linking();
   ```

3. **Rebuild phases for existing projects**:
   ```sql
   -- For each project template, rebuild phases
   SELECT rebuild_phases_json_from_project_phases('project-id-here');
   ```

## Useful Commands

```bash
# Check Supabase CLI version
supabase --version

# Link project
supabase link --project-ref <project-ref>

# Push migrations
supabase db push

# Check status
supabase migration list

# Pull remote migrations (sync local)
supabase db pull

# Reset local database (careful!)
supabase db reset

# Start local Supabase (for development)
supabase start
```

## Next Steps

After applying migrations:

1. Verify standard phases show up in StructureManager
2. Test creating a new project template
3. Test starting a project run from catalog
4. Run diagnostic function if issues occur

For more information, see the [Supabase CLI documentation](https://supabase.com/docs/guides/cli).


