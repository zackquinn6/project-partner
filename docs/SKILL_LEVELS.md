# Skill and experience system

This document describes how proficiency (skill) and experience work for personalization, kickoff matching, and the risk engine.

**Skill = proficiency (0-100).** How well the person can perform a capability.  
**Experience = time practiced.** Seconds/hours and completion counts for that capability.  
They are related but not the same: someone can have low skill and rising experience, or high skill with little recent practice.

For risk evaluation mechanics, see [`RISK_ENGINE.md`](RISK_ENGINE.md). For product thesis, see [`APP_THESIS_AND_GOALS.md`](APP_THESIS_AND_GOALS.md).

---

## Layers

### 1. Baseline skill catalog (`skill_definitions`)

Shared DIY capabilities authors attach to projects (seeded baseline, admin-extensible). Examples: site prep and protection, layout and measuring, mixing materials, cutting, waterproofing, finish work, ladder work, QC checks.

Skills are **content-correlated** (what the project asks the person to do). They are **not** owned by PFMEA. PFMEA and the risk register may **read** proficiency/experience through risk signals and rules.

### 2. Template key skills (`project_key_skills`)

Authors select which catalog skills matter for a project template, order them, and mark which are required at kickoff assessment.

### 3. Step skill links (`operation_step_skills`) optional

A step may require one or more key skills (primary/secondary) with an optional minimum proficiency hint for authors. This does not replace `operation_steps.skill_level` band labels used for instruction detail until those bands are fully derived from proficiency.

### 4. User proficiency (`user_skill_ratings`)

Per user, per skill: proficiency 0-100, source (`assessment` | `inferred` | `achievement` | `assumed_low`).

### 5. User experience (`user_skill_experience`)

Per user, per skill: `experience_seconds`, `completion_count`, `last_practiced_at`. Updated from completed work and practiced time.

### 6. Overall proficiency (`user_profiles.overall_proficiency`)

Single 0-100 DIY overall, **project-dependent in interpretation** when combined with template key skills. Migrated from legacy `skill_level` text:

| Legacy `skill_level` | Mapped overall proficiency |
|----------------------|----------------------------|
| `newbie` | 15 |
| `confident` | 50 |
| `hero` | 85 |

UI may still show band labels derived from ranges; the store of record for risk is 0-100.

---

## Legacy systems (still present)

Until fully retired from matching UI:

| System | Storage | Role going forward |
|--------|---------|-------------------|
| Profile text skill | `user_profiles.skill_level` (`newbie` / `confident` / `hero`) | Legacy; prefer `overall_proficiency` |
| Broad project buckets | `user_profiles.project_skills` JSON | Migrated into `user_skill_ratings` where names map |
| Per-template text | `user_project_skill_levels.skill_level` | Prefer key-skill ratings for the template’s skills |
| Project band | `projects.skill_level` (Beginner…Professional) | Catalog / instruction default band |
| Step band | `operation_steps.skill_level` | Instruction detail; optional key-skill links added beside it |

---

## Assessment UX

1. **Profile / skill assessment questionnaire** - rate relevant skills 0-100; see experience separately.
2. **Run kickoff refresh** - confirm or update skills attached to the chosen template before risk re-evaluation.
3. **Admin Project Skill Assessments** - manage catalog and attach skills to templates/steps (replaces coming-soon placeholder).

---

## Risk engine policy

- New signals (Phase 1): overall proficiency, key-skill proficiency aggregates (min/median/for-step), experience hours aggregates.
- **Missing proficiency = assumed low skill** → higher occurrence risk; audit records `assumed_low_skill`.
- Incomplete information does not mean “skip personalization”; it means a **more conservative** risk picture.
- Severity is never adjusted by skill or experience.

---

## Achievements and completions

Completing project runs and practiced step time increases **experience** on the skills linked to that work. Proficiency does not jump to “expert” from a single completion; any proficiency nudge from achievements must be calibrated and sourced as `achievement`.

---

## Migration history

- Legacy constraints: `20251120230000_add_skill_level_to_template_steps.sql`, `20251120231000_add_skill_level_constraints.sql`
- Key-skill catalog and ratings: `20260920010000_skill_definitions_and_ratings.sql` (Phase 1)
