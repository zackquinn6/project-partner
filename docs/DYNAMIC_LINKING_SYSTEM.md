# Dynamic Linking System - Complete Architecture

## ✅ Overview

Your app now implements a **true dynamic linking system** where standard foundation phases are referenced, not copied. This means:

✅ **One source of truth** - Standard foundation lives in ONE place  
✅ **Automatic updates** - Edit standard → all templates update instantly  
✅ **No duplication** - Phase data isn't copied, just referenced  
✅ **Immutable snapshots** - Project runs capture resolved data at creation time  

---

## 🏗️ Architecture

### Three Layers

```
┌─────────────────────────────────────────────┐
│  LAYER 1: SOURCE (Standard Foundation)      │
│  - ONE standard project (is_standard: true) │
│  - Contains actual phase/operation/step data│
│  - Editable by admins                       │
└─────────────────────────────────────────────┘
                    ↓ (referenced by)
┌─────────────────────────────────────────────┐
│  LAYER 2: TEMPLATES (Project Templates)     │
│  - Multiple project templates               │
│  - Phases with isLinked: true               │
│  - Points to source_project_id              │
│  - NO operations/steps stored               │
│  - Dynamic - reflects current standard      │
└─────────────────────────────────────────────┘
                    ↓ (creates snapshot)
┌─────────────────────────────────────────────┐
│  LAYER 3: RUNS (Active Projects)            │
│  - project_runs with phases JSONB           │
│  - Fully resolved data at creation time     │
│  - IMMUTABLE - never changes                │
│  - Snapshot in time of template             │
└─────────────────────────────────────────────┘
```

---

## 📊 How Dynamic Linking Works

### Step 1: Create Project Template

When you create a new project (e.g., "Tile Flooring"):

**Function:** `create_project_with_standard_foundation_v2()`

```sql
-- Creates project entry
INSERT INTO projects (...) VALUES (...);

-- Creates LINKS to standard phases (NOT copies)
INSERT INTO project_phases (
  project_id,       -- New project ID
  name,             -- 'Kickoff', 'Plan', etc.
  is_linked,        -- TRUE = this is a link
  source_project_id -- Points to standard project
) VALUES (...);
```

**Result:**
- New project has phase REFERENCES
- No operations/steps data duplicated
- Just lightweight links

---

### Step 2: View Template (Dynamic Resolution)

When you view a project template:

**View:** `project_templates_live`

```sql
SELECT 
  ...
  operations = CASE 
    WHEN isLinked = true THEN
      -- Fetch from source_project_id
      SELECT operations FROM standard_project 
      WHERE phase.name = linked_phase.name
    ELSE
      -- Fetch from this project
      SELECT operations FROM this_project
  END
```

**Result:**
- Linked phases show current standard data
- Custom phases show their own data
- View is always up-to-date

---

### Step 3: Start Project Run (Immutable Snapshot)

When a user starts a project run:

**Function:** `create_project_run_snapshot()`

```sql
-- Resolve ALL links at snapshot time
FOR each phase:
  IF isLinked = true THEN
    -- Fetch operations from source_project_id
    operations = get_from_standard_project()
  ELSE
    -- Use phase's own operations
    operations = get_from_this_phase()
  END
  
-- Store FULLY RESOLVED data in project_runs.phases JSONB
INSERT INTO project_runs (phases) VALUES (resolved_phases);
```

**Result:**
- Project run contains complete data
- No more links - everything resolved
- Immutable - won't change if standard updates
- Snapshot in time of what the template was

---

## 🔄 Update Propagation

### Scenario: Update Standard Foundation

**Admin edits Kickoff phase in standard project:**

```
1. Edit standard project
   └─> Updates project_phases for standard project
   
2. ALL project templates automatically see changes
   └─> project_templates_live view resolves links dynamically
   └─> Shows updated Kickoff immediately
   
3. Existing project runs UNCHANGED
   └─> They have immutable snapshots
   └─> Continue using old version (as expected)
   
4. NEW project runs get updated version
   └─> create_project_run_snapshot resolves current links
   └─> Captures new Kickoff in their snapshot
```

---

## 📋 Database Structure

### Standard Foundation Project
```sql
-- Project entry
projects:
  id: d82dff80-e8ac-4511-be46-3d0e64bb5fc5
  name: 'Standard Foundation'
  is_standard: true

-- Actual phase data
project_phases:
  id: phase-1
  project_id: standard-id
  name: 'Kickoff'
  is_linked: false  -- Not linked, this IS the source

phase_operations:
  id: op-1
  phase_id: phase-1
  operation_name: 'Project Setup'
  
operation_steps:
  id: step-1
  operation_id: op-1
  step_title: 'Project Overview'
```

### User Project Template (e.g., "Tile Flooring")
```sql
-- Project entry
projects:
  id: tile-project-id
  name: 'Tile Flooring'
  is_standard: false

-- LINKS to standard phases (NOT copies)
project_phases:
  id: linked-phase-1
  project_id: tile-project-id
  name: 'Kickoff'
  is_linked: true  -- This is a link!
  source_project_id: standard-id  -- Points to source
  
  -- NO phase_operations for linked phases!
  -- Operations come from source_project_id
  
-- Custom phases (not linked)
project_phases:
  id: custom-phase-1
  project_id: tile-project-id
  name: 'Tile Installation'
  is_linked: false  -- This is original content
  
phase_operations:
  id: custom-op-1
  phase_id: custom-phase-1  -- Has its own operations
  operation_name: 'Prepare Subfloor'
```

### Project Run (Immutable Snapshot)
```sql
project_runs:
  id: run-id
  template_id: tile-project-id
  phases: {  -- RESOLVED JSONB snapshot
    [
      {
        name: 'Kickoff',
        isLinked: true,
        operations: [...]  -- RESOLVED from standard
      },
      {
        name: 'Tile Installation',
        isLinked: false,
        operations: [...]  -- From template
      }
    ]
  }
```

---

## ✅ Benefits

### 1. Single Source of Truth
- Standard foundation exists once
- No data duplication
- Easier to maintain

### 2. Automatic Updates
- Edit Kickoff phase → All templates updated instantly
- No need to manually update each template
- Consistency across all projects

### 3. Efficient Storage
- Links are lightweight (just IDs)
- Operations/steps not duplicated
- Significant space savings

### 4. Immutable Runs
- Project runs are snapshots
- Won't break if standard changes
- Users' active projects stay stable

---

## 🔧 For Developers

### Creating a Project Template

```typescript
// Call the function
const { data, error } = await supabase.rpc(
  'create_project_with_standard_foundation_v2',
  {
    p_user_id: user.id,
    p_project_name: 'Tile Flooring',
    p_project_description: 'Install new tile floor',
    p_difficulty_level: 'intermediate'
  }
);

// Result: Project created with 4 linked standard phases
```

### Editing Standard Foundation

```typescript
// Query from relational tables
const { data: project } = await supabase
  .from('projects')
  .select(`
    *,
    project_phases (
      *,
      phase_operations (
        *,
        operation_steps (*)
      )
    )
  `)
  .eq('is_standard', true)
  .single();

// Edit and save - updates propagate automatically
```

### Starting a Project Run

```typescript
// Call snapshot function
const { data: runId, error } = await supabase.rpc(
  'create_project_run_snapshot',
  {
    p_template_id: templateId,
    p_user_id: userId,
    p_run_name: 'My Bathroom Tile',
    p_home_id: homeId
  }
);

// Result: Immutable snapshot with ALL links resolved
```

---

## ✅ Migration Summary

**Total Migrations Applied:** 29  
**Core Architecture:**
- ✅ Dynamic linking in project creation (20250205000027)
- ✅ View resolves links dynamically (20250205000028)
- ✅ Snapshot resolves links once (20250205000029)

---

## 🎯 What This Means For You

### As Admin
1. **Edit Standard Foundation** anytime
2. **Changes instantly appear** in all templates
3. **Existing project runs** stay stable (immutable)
4. **One place to maintain** standard workflow

### For Users
1. **Consistent experience** across all projects
2. **Latest best practices** automatically applied
3. **Active projects unchanged** by updates
4. **Predictable workflow** in every project

---

## ✅ Status

**Dynamic Linking System:** ✅ FULLY OPERATIONAL  
**Standard Foundation:** ✅ 4 phases ready  
**Project Creation:** ✅ Auto-incorporates standard  
**All Changes Committed:** ✅ Pushed to git  

**Your system now has proper dynamic linking architecture!** 🚀

