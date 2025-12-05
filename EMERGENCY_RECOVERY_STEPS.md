# 🚨 EMERGENCY RECOVERY STEPS

## What Happened
You ran `supabase db reset --linked` which **WIPED YOUR ENTIRE PRODUCTION DATABASE**.

This command is EXTREMELY dangerous and should NEVER be run on a linked production database.

## IMMEDIATE ACTIONS

### 1. RESTORE FROM BACKUP (DO THIS FIRST)

**Go to:** https://supabase.com/dashboard/project/drshvrukkavtpsprfcbc/database/backups

**If you have Point-in-Time Recovery (Pro+ plan):**
- Click "Restore to a point in time"
- Set time to **15-20 minutes ago** (before you ran the reset command)
- Click Restore
- Wait for completion

**If you only have Daily Backups (Free plan):**
- Find the most recent backup
- Click Restore
- This will restore to the last daily backup (may lose today's changes)

### 2. NEVER RUN THESE COMMANDS ON PRODUCTION

**DANGEROUS COMMANDS - NEVER USE ON --linked:**
```bash
supabase db reset --linked      # WIPES ENTIRE DATABASE
supabase db reset              # WIPES LOCAL DATABASE (still dangerous)
```

### 3. After Database is Restored

Once Supabase confirms the restore is complete:

#### Pull your schema into migrations (so you have a backup):
```bash
# This saves your CURRENT database schema to a migration file
supabase db pull

# Or if that doesn't work:
supabase db dump -f supabase/migrations/20250205000002_backup_full_schema.sql
```

This will create a migration file with ALL your tables, so this never happens again.

### 4. Verify Data is Back

After restore completes:

1. Go to Table Editor in Supabase
2. Check that tables exist: `projects`, `project_runs`, `users`, etc.
3. Verify your data is present
4. Test logging into your app

### 5. Update Migrations Folder

After pulling schema:
```bash
git add supabase/migrations/
git commit -m "Add complete database schema backup after emergency recovery"
git push
```

## Prevention

**Rules to prevent this from happening again:**

1. ✅ **NEVER** run `supabase db reset --linked` 
2. ✅ **NEVER** run destructive commands on production
3. ✅ Always pull schema to migrations: `supabase db pull`
4. ✅ Test migrations on local database first
5. ✅ Use `--dry-run` flags when available

## Safe Workflow Going Forward

### For Schema Changes:
1. Make changes in Supabase Dashboard
2. Pull to migrations: `supabase db pull`
3. Commit to git

### For Migrations:
1. Create migration file
2. Test locally first: `supabase db reset` (local only, no --linked!)
3. Then push to production: `supabase db push`

## Current Status

- ❌ Database was wiped by `supabase db reset --linked`
- ⏳ Awaiting backup restore
- 📋 Need to pull schema to migrations after restore
- 🔐 Need to implement safeguards

## Contact

If restore fails or you need help:
1. Check Supabase Status: https://status.supabase.com/
2. Contact Supabase Support: https://supabase.com/dashboard/support
3. Provide project ref: drshvrukkavtpsprfcbc

