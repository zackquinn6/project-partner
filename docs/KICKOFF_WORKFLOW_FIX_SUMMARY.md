# Kickoff Workflow & Budget Data Comprehensive Fix

## Issues Identified

### 1. **Database Column Missing**
- **Problem**: `budget_data` column did not exist in `project_runs` table
- **Impact**: Every project run update was failing with error: `"Could not find the 'budget_data' column of 'project_runs' in the schema cache"`
- **Fix**: Added `budget_data JSONB` column via database migration

### 2. **Kickoff Completion Logic Error**
- **Problem**: `isKickoffPhaseComplete()` function was checking for 4 steps including `'kickoff-step-4'`
- **Impact**: Even after completing all 3 kickoff steps, the system never transitioned to workflow because it was waiting for a 4th step that no longer exists
- **Fix**: Updated function to only check for 3 steps: `['kickoff-step-1', 'kickoff-step-2', 'kickoff-step-3']`

### 3. **Inconsistent Step References**
- **Problem**: Multiple files had hardcoded references to 4 kickoff steps
- **Files affected**: 
  - `src/utils/projectUtils.ts`
  - `src/components/UserView.tsx` (2 locations)
  - `src/components/ProjectCatalog.tsx`
  - `src/components/ProjectSelector.tsx` (2 locations)
- **Fix**: Updated all references to use only 3 steps

## Changes Made

### Database Migration
```sql
ALTER TABLE public.project_runs
ADD COLUMN IF NOT EXISTS budget_data JSONB DEFAULT '{}'::jsonb;
```

### Code Updates

#### 1. `src/utils/projectUtils.ts`
- Updated `isKickoffPhaseComplete()` to check only 3 steps
- Removed `kickoff-step-4` from the step IDs array

#### 2. `src/contexts/ProjectActionsContext.tsx`
- Restored `budget_data` field in the `updateProjectRun` database query
- Now properly saves budget data when updating project runs

#### 3. `src/components/UserView.tsx`
- Updated kickoff step preservation logic (2 locations)
- Changed from 4 steps to 3 steps

#### 4. `src/components/ProjectCatalog.tsx`
- Updated kickoff completion check to use 3 steps

#### 5. `src/components/ProjectSelector.tsx`
- Updated kickoff completion checks (2 locations) to use 3 steps

#### 6. `src/components/KickoffWorkflow.tsx`
- Already correctly configured with 3 steps
- Import list cleaned up (removed ProjectAgreementStep)

#### 7. `src/utils/projectUtils.ts` (Kickoff Phase Definition)
- Removed 4th step (Service Terms) from standard kickoff phase
- Now only includes: DIY Profile, Project Overview, Project Profile

## Budget Data Feature

### Purpose
The `budget_data` column stores project budget information including:
- **Line Items**: Budgeted amounts for materials, labor, and other expenses
- **Actual Entries**: Real expenses as they occur
- **Last Updated**: Timestamp of last budget modification

### Data Structure
```typescript
{
  lineItems: BudgetLineItem[],
  actualEntries: ActualEntry[],
  lastUpdated: string
}
```

### Used By
- `ProjectBudgetingWindow.tsx` - Main budget management interface
- `ProjectPerformanceWindow.tsx` - Budget metrics and analytics

## Service Terms Agreement

### New Location
- **Previously**: Part of 4-step kickoff workflow (removed)
- **Now**: Integrated into membership signup flow
- **Implementation**: `MembershipAgreementDialog.tsx`
- **Storage**: `profiles.signed_agreement` JSONB field
- **Trigger**: Required before paid subscription, not required for free tier

### Benefits
- Users only sign once per membership
- Agreement linked to user profile, not individual projects
- Free tier users don't need to sign
- Streamlined project kickoff process

## Testing Checklist

- [x] Database migration executed successfully
- [x] Budget data column exists in project_runs table
- [x] isKickoffPhaseComplete checks only 3 steps
- [x] All hardcoded step references updated
- [x] Budget data saves correctly in ProjectBudgetingWindow
- [x] Budget data displays correctly in ProjectPerformanceWindow
- [x] Kickoff workflow shows 3 steps
- [x] Workflow opens after step 3 completion
- [x] Membership agreement dialog functional
- [x] Agreement stored in profiles table

## Validation Steps

1. **Start a new project**
   - Verify kickoff shows 3 steps only
   - Complete all 3 steps
   - Confirm automatic transition to workflow

2. **Test budget feature**
   - Add budget line items
   - Verify data saves without errors
   - Check budget data appears in performance window

3. **Test membership agreement**
   - Attempt to subscribe (for free users)
   - Verify agreement dialog appears
   - Sign agreement and confirm storage in profiles

## Security Notes

Pre-existing security warnings were noted but are unrelated to this fix:
- Function Search Path Mutable (WARN)
- Leaked Password Protection Disabled (WARN)

These should be addressed separately as part of security hardening.
