# Step Completion Tracking Analysis

## Current Implementation Status

### ✅ What's Working

1. **Global Step Completion Tracking**
   - Step completion is saved in `project_runs.completed_steps` JSONB column as an array of step IDs
   - Example: `["step-id-1", "step-id-2", "step-id-3"]`
   - Saved via `updateProjectRun()` in `ProjectActionsContext.tsx` (line 614)
   - Works correctly for projects with **single space** or **no spaces**

2. **Step Analytics Tracking**
   - `project_run_steps` table tracks individual step instances with:
     - `started_at` timestamp (when step is first viewed)
     - `completed_at` timestamp (when step is marked complete)
     - `completion_percentage` (0-100)
     - `is_completed` boolean flag
   - Used for analytics and progress tracking
   - **Limitation**: Does NOT have `space_id` column, so cannot track per-space completion

3. **Scaled Step Progress (Partial Solution)**
   - `scaled_step_progress` table tracks progress per space for scaled steps
   - Columns: `project_run_id`, `step_id`, `space_id`, `progress_percentage`
   - **Limitation**: Only used for scaled steps via `ScaledStepProgressDialog` component
   - Not integrated with main workflow completion tracking

### ❌ What's Missing

1. **Per-Space Step Completion Tracking**
   - When multiple spaces exist, steps are created with `spaceId` and `spaceName` properties (see `workflowNavigationUtils.ts` lines 255-256)
   - However, completion only saves the step ID, not the step ID + space ID combination
   - **Problem**: Completing "Install flooring" in Room 1 marks it complete globally, so Room 2's instance is also marked complete

2. **Composite Key for Step Completion**
   - Current: `completed_steps = ["step-id-1"]` (global completion)
   - Needed: `completed_steps = ["step-id-1:space-id-1", "step-id-1:space-id-2"]` (per-space completion)
   - OR use `project_run_steps` table with `space_id` column

3. **Completion Check Logic**
   - Current: `completedSteps.has(step.id)` checks if step is complete globally
   - Needed: `completedSteps.has(`${step.id}:${step.spaceId}`)` to check per-space completion
   - OR query `project_run_steps` table with `space_id` filter

## Database Schema Analysis

### `project_runs` Table
```sql
completed_steps: JSONB  -- Array of step IDs: ["step-id-1", "step-id-2"]
```

### `project_run_steps` Table
```sql
- project_run_id: UUID
- template_step_id: UUID
- started_at: TIMESTAMPTZ
- completed_at: TIMESTAMPTZ
- completion_percentage: INTEGER
- is_completed: BOOLEAN
-- ❌ MISSING: space_id column
```

### `scaled_step_progress` Table
```sql
- project_run_id: UUID
- step_id: UUID
- space_id: UUID  -- ✅ Has space_id
- progress_percentage: INTEGER
-- ✅ Properly tracks per-space progress
-- ❌ Only used for scaled steps, not all steps
```

## Workflow Navigation Structure

### Single-Piece-Flow
- Steps organized by space containers
- Each step has `spaceId` and `spaceName` properties
- Structure: Standard Phases → Space Containers (each with ALL custom phases) → Close Project
- Example step: `{ id: "step-1", spaceId: "space-1", spaceName: "Room 1", ... }`

### Batch-Flow
- Steps organized by phase, with spaces nested inside
- Each step still has `spaceId` and `spaceName` when multiple spaces exist
- Structure: Standard Phases → Custom Phases (with spaces nested) → Close Project
- Example step: `{ id: "step-1", spaceId: "space-1", spaceName: "Room 1", ... }`

**Both methods create steps with `spaceId` when multiple spaces exist**, but completion tracking doesn't use this information.

## Code Locations

### Step Completion Handler
- **File**: `src/components/UserView.tsx`
- **Function**: `handleStepComplete()` (line 1366)
- **Current Logic**: 
  ```typescript
  const newCompletedSteps = [...new Set([...completedSteps, currentStep.id])];
  ```
  - Only saves `currentStep.id`, ignores `currentStep.spaceId`

### Step Completion Check
- **File**: `src/components/UserView.tsx`
- **Location**: Throughout component, checks `completedSteps.has(step.id)`
- **Current Logic**: Global completion check, doesn't consider space

### Database Update
- **File**: `src/contexts/ProjectActionsContext.tsx`
- **Function**: `updateProjectRun()` (line 548)
- **Current Logic**: 
  ```typescript
  completed_steps: JSON.stringify(projectRun.completedSteps)
  ```
  - Saves array of step IDs to JSONB column

## Recommendations

### Option 1: Composite Key in `completed_steps` Array (Recommended)
**Pros:**
- No database schema changes required
- Works with existing JSONB column
- Simple to implement

**Implementation:**
1. When step has `spaceId`, save as `"${stepId}:${spaceId}"`
2. When step has no `spaceId`, save as `stepId` (backward compatible)
3. Update completion check: `completedSteps.has(spaceId ? `${step.id}:${spaceId}` : step.id)`

**Example:**
```typescript
// Multiple spaces
completed_steps = ["step-1:space-1", "step-1:space-2", "step-2:space-1"]

// Single space or no spaces (backward compatible)
completed_steps = ["step-1", "step-2"]
```

### Option 2: Add `space_id` to `project_run_steps` Table
**Pros:**
- Proper relational structure
- Better for analytics and reporting
- Can query per-space completion easily

**Cons:**
- Requires database migration
- More complex implementation
- Need to update all queries

**Implementation:**
1. Add `space_id UUID NULL` column to `project_run_steps`
2. Create unique constraint: `(project_run_id, template_step_id, space_id)`
3. Update completion logic to insert/update `project_run_steps` with `space_id`
4. Update completion check to query `project_run_steps` table

### Option 3: Use `scaled_step_progress` for All Steps
**Pros:**
- Table already exists with proper structure
- Already tracks per-space progress

**Cons:**
- Table name suggests it's only for scaled steps
- Would need to rename or create new table
- Requires significant refactoring

## Testing Requirements

### Test Cases

1. **Single Space Project**
   - ✅ Step completion should work as before (backward compatible)
   - ✅ `completed_steps` should contain simple step IDs

2. **Multiple Spaces - Single-Piece-Flow**
   - ✅ Completing step in Room 1 should NOT mark it complete in Room 2
   - ✅ Each space should track completion independently
   - ✅ Progress calculation should count all space instances

3. **Multiple Spaces - Batch-Flow**
   - ✅ Same as single-piece-flow
   - ✅ Steps with same `stepId` but different `spaceId` should be tracked separately

4. **Mixed Steps (Some with spaces, some without)**
   - ✅ Steps without `spaceId` should use simple step ID
   - ✅ Steps with `spaceId` should use composite key

## Implementation Priority

**HIGH PRIORITY**: This is a critical bug that prevents proper progress tracking for multi-space projects.

**Recommended Approach**: Option 1 (Composite Key) - fastest to implement, no schema changes, backward compatible.

