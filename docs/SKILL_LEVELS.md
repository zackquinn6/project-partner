# Skill Level System Documentation

This document clarifies the three separate skill level systems in the application.

## Overview

There are **three distinct skill level variables** that serve different purposes:

1. **User Skill Level** (from "Build Your Profile")
2. **Project Overall Skill Level** 
3. **Step Skill Level**

All three are stored in **relational database tables** (not JSON).

---

## 1. User Skill Level

**Purpose**: Represents the user's overall DIY experience level from their profile.

**Storage**: `profiles.skill_level` (TEXT column)

**Options** (3):
- `'newbie'` - Beginner user
- `'confident'` - Intermediate user  
- `'hero'` - Advanced user

**Source**: Set during the DIY survey/profile creation ("Build Your Profile")

**Constraint**: `CHECK (skill_level IS NULL OR skill_level IN ('newbie', 'confident', 'hero'))`

**Usage**: Used for personalization, recommendations, and matching users to appropriate projects.

---

## 2. Project Overall Skill Level

**Purpose**: Represents the overall skill level required for the entire project template.

**Storage**: `projects.skill_level` (TEXT column)

**Options** (4):
- `'Beginner'` - Beginner skill level required
- `'Intermediate'` - Intermediate skill level required
- `'Advanced'` - Advanced skill level required
- `'Professional'` - Professional contractor level required

**Source**: Set by admin when creating/editing project templates in Project Management

**Constraint**: `CHECK (skill_level IS NULL OR skill_level IN ('Beginner', 'Intermediate', 'Advanced', 'Professional'))`

**Usage**: 
- Default value for all steps when creating a new project run
- Used for project filtering and recommendations
- Displayed in project catalog and project information

---

## 3. Step Skill Level

**Purpose**: Represents the skill level required for a specific workflow step.

**Storage**: `template_steps.skill_level` (TEXT column)

**Options** (4):
- `'Beginner'` - Beginner skill level required for this step
- `'Intermediate'` - Intermediate skill level required for this step
- `'Advanced'` - Advanced skill level required for this step
- `'Professional'` - Professional contractor level required for this step

**Source**: 
- Defaults to project skill level when creating project runs
- Can be individually set per step in Edit Workflow / Step Editor

**Constraint**: `CHECK (skill_level IS NULL OR skill_level IN ('Beginner', 'Intermediate', 'Advanced', 'Professional'))`

**Usage**:
- Allows different steps within the same project to have different skill requirements
- Used for step-level filtering and recommendations
- Can override project default on a per-step basis

---

## Key Differences

| Aspect | User Skill Level | Project Skill Level | Step Skill Level |
|--------|-----------------|-------------------|------------------|
| **Options** | 3 (newbie, confident, hero) | 4 (Beginner, Intermediate, Advanced, Professional) | 4 (Beginner, Intermediate, Advanced, Professional) |
| **Table** | `profiles` | `projects` | `template_steps` |
| **Set By** | User (DIY survey) | Admin (project template) | Admin (step editor) or defaults to project |
| **Scope** | User profile | Entire project | Individual step |
| **Purpose** | User personalization | Project requirements | Step-specific requirements |

---

## Default Behavior

When creating a new project run:
1. All steps default to the **project skill level** if step skill level is not set
2. If a step has an explicit skill level set, it uses that instead
3. User skill level is **never** used as a default for projects or steps

---

## Code References

- **User Skill Level**: `profiles.skill_level`, values: `'newbie'`, `'confident'`, `'hero'`
- **Project Skill Level**: `projects.skill_level`, values: `'Beginner'`, `'Intermediate'`, `'Advanced'`, `'Professional'`
- **Step Skill Level**: `template_steps.skill_level`, values: `'Beginner'`, `'Intermediate'`, `'Advanced'`, `'Professional'`

---

## Migration History

- `20251120230000_add_skill_level_to_template_steps.sql` - Added step skill level column
- `20251120231000_add_skill_level_constraints.sql` - Added CHECK constraints for all three skill levels

