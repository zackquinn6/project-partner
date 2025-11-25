# Quick Start: Apply Supabase Migrations

Your Supabase CLI is already installed! Here's how to connect and apply migrations.

## Step 1: Link Your Project

Link your local project to your Supabase project:

```bash
supabase link --project-ref drshvrukkavtpsprfcbc
```

You'll be prompted for:
- **Database password** (found in Supabase Dashboard → Settings → Database → Database Password)

Or use an access token:
```bash
supabase link --project-ref drshvrukkavtpsprfcbc --password <your-db-password>
```

## Step 2: Push All Migrations

Once linked, push all migrations:

```bash
supabase db push
```

This will apply all migration files from `supabase/migrations/` in order.

## Step 3: Verify & Fix Existing Projects

After migrations are applied, run this in Supabase SQL Editor:

```sql
-- Fix existing projects to have proper standard phase references
SELECT * FROM public.fix_existing_projects_standard_phases();

-- Then rebuild phases for each project template
-- (Replace 'project-id' with actual project IDs)
SELECT rebuild_phases_json_from_project_phases('project-id');
```

## Alternative: Manual Migration via SQL Editor

If `supabase db push` doesn't work, you can apply migrations manually:

1. Go to https://supabase.com/dashboard/project/drshvrukkavtpsprfcbc/sql/new
2. Open each migration file in order (00000 → 00001 → 00002, etc.)
3. Copy the SQL content
4. Paste into SQL Editor and run

**Migration order:**
1. `20250128000000_comprehensive_standard_phase_dynamic_linking.sql`
2. `20250128000001_create_project_run_snapshot.sql`
3. `20250128000002_create_project_templates_live_view.sql`
4. `20250128000003_comprehensive_test_suite.sql`
5. `20250128000004_diagnostic_check_phase_operations.sql`
6. `20250128000005_fix_create_project_dynamic_linking.sql`

## Troubleshooting

**If linking fails:**
- Make sure you're in the project directory
- Check your database password is correct
- Try generating a new access token in Dashboard → Settings → Access Tokens

**If migrations fail:**
- Check error messages carefully
- Some migrations may need to be applied manually
- See full guide in `docs/SUPABASE_MIGRATIONS_GUIDE.md`

## Next Steps After Migrations

1. ✅ Verify standard phases show in StructureManager
2. ✅ Test creating new project template
3. ✅ Test starting project run from catalog
4. ✅ Run test suite: `SELECT * FROM test_standard_phase_dynamic_linking();`


