# AI Project Development Reference (DB-first)

**Use when:** admin asks to complete **Step 1–10** of project development for a named template (`project_id`), or says **follow ai dev guide** (or similar). **§B is the single source of truth per step** (no duplicate checklist elsewhere). Field catalogs below list authoring columns/JSON keys; verify every write against `src/integrations/supabase/types.ts` and `src/interfaces/Project.ts`.

---

## Non-negotiables

- No silent defaults, fallback logic, or COALESCE-with-fake-defaults; NULL → handle explicitly or fail.
- No hardcoded strings for state; no hardcoded business logic—use DB fields and relationships.
- Fix root causes; if the app needs a workaround to run, let it fail—do not force it.

---

## A) Schema, cache, migrations, data model

- **Columns:** Verify every `INSERT`/`UPDATE` against `src/integrations/supabase/types.ts` or the live DB. Do not copy column lists from old migrations.
- **`operation_steps`:** No `content_type` / `content` / `content_sections` here—prose lives in **`step_instructions`**; optional one-line scope in `operation_steps.description`.
- **Phases JSON cache** after normalized workflow changes:  
`UPDATE public.projects SET phases = public.rebuild_phases_json_from_project_phases(<project_id>) WHERE id = <project_id>;`  
If rebuild fails, fix the cause—do not invent cache values.
- **Migration SQL:** Runnable as-is; **RAISE** when prerequisites missing; **idempotent** stable UUIDs + `ON CONFLICT` where appropriate (e.g. `(step_id, instruction_level)` for `step_instructions`).
- **UUID literals:** Last group after final hyphen = **exactly 12 hex digits** or PostgreSQL raises `22P02`.
- **One SQL file per step** (1–10) per project slug—never two “Step N” files; extra templates → another `DO $$ … $$` block in the **same** file. Filename: `YYYY_MM_DD_migration_<slug>_step<N>[_qualifier].sql`—**no** `project_id` in the name.
- **Same template across steps:** Steps **3–9** use the same `v_project_id` and the same **`operation_steps.id`** values from **Step 1**. **Step 2** touches only **`step_instructions`**. **Step 10** touches only **`projects`** (`description`, `project_challenges`).
- **Steps 5–6 bootstrap:** Insert missing **`public.tools`** / **`public.materials`** by `name` when absent (every NOT NULL / constrained column—tool **`category`** ∈ `PPE`, `Hand Tool`, `Power Tool`, `Other`). Step **6** repeats the **same tools** list as step 5. Step **7** = **no** tool/material catalog inserts.
- After bootstrap, resolve library IDs or **RAISE**—no orphan JSON with fake ids.

### Step 1 in SQL migrations (phases vs existing data)

Aligned with product rules: **if `project_phases` already has ≥1 row for the template, do not create, edit, or rename phases** in that migration. Assume existing phases cover the project; attach new **`phase_operations`** and **`operation_steps`** only.

- **Resolve `phase_id` for new operations** using **deterministic ordering** of existing `project_phases` rows—**not** by requiring fixed display names like “Preparation” or “Disconnect” (catalog phases may use any labels). Requiring name matches caused real migrations to fail when the catalog used different phase titles.
- **Recommended sort key** (matches typical process-map ordering): non-`last` before `last` (`CASE WHEN position_rule = 'last' THEN 1 ELSE 0 END`); then `position_value` NULLS LAST; then `created_at`; then `id`.
- **Fewer than three phases:** map multiple operation groups onto the same phase as needed. Use row numbers **`1`**, **`LEAST(2, n)`**, **`LEAST(3, n)`** against `n = count(*)` so one phase repeats for all three slots when `n = 1`, and the third group shares the second phase when `n = 2`.
- **Zero phases:** `INSERT` the phase set for that template in Step 1, then attach operations (greenfield).
- **After structure changes:** `UPDATE public.projects SET phases = public.rebuild_phases_json_from_project_phases(<project_id>) WHERE id = <project_id>;`
- **Optional:** `RAISE NOTICE` with resolved `phase_id`s when mapping by order—helps verify behavior in SQL editor logs.

**Phase → slot pattern (portable across Postgres versions):** do **not** use `max(uuid)` / `min(uuid)` aggregates on ids (not defined on all versions). Use a sorted CTE and scalar subqueries:

```sql
WITH sorted AS (
  SELECT pp.id,
         row_number() OVER (
           ORDER BY
             CASE WHEN pp.position_rule = 'last' THEN 1 ELSE 0 END,
             pp.position_value NULLS LAST,
             pp.created_at ASC,
             pp.id ASC
         ) AS rn
  FROM public.project_phases pp
  WHERE pp.project_id = v_project_id
)
SELECT
  (SELECT s.id FROM sorted s WHERE s.rn = 1 LIMIT 1),
  (SELECT s.id FROM sorted s WHERE s.rn = LEAST(2, v_phase_count) LIMIT 1),
  (SELECT s.id FROM sorted s WHERE s.rn = LEAST(3, v_phase_count) LIMIT 1)
INTO v_phase_a, v_phase_b, v_phase_c;
```

Reference implementation: `2026_04_04_migration_baseboard_dishwasher_caulking_step1_structure.sql` (baseboard + dishwasher blocks).

### Migrations — PostgreSQL / template resolution (field learnings)

- **Recursive CTE:** Walking from matched `projects` rows **up** `parent_project_id` to the family root requires **`WITH RECURSIVE`** on the **entire** `WITH` clause when a branch does `UNION ALL … INNER JOIN up ON …` (self-reference). Without `RECURSIVE` you get **`relation "up" does not exist`**.
- **Ancestor walk shape:** seed = all matched template/revision ids; recursive part = join `projects par` on `par.id = up.parent_project_id`; **roots** = rows where `parent_project_id IS NULL`. **Exactly one** distinct root after resolution, or **RAISE** (include a diagnostic `SELECT` in the error text when multiple roots match broad `LIKE` patterns).
- **`max(uuid)` / `min(uuid)`:** Not available on all PostgreSQL / managed pools. Use the **scalar subquery** pattern above, or `(array_agg(id ORDER BY rn))[subscript]`, not `max(id) FILTER (…)`.
- **Template rows:** Revisions may have `parent_project_id` set; attach normalized workflow to the **root** `projects.id` (`parent_project_id IS NULL`) for the canonical template family.
- **Name matching:** Catalog titles vary (`&` vs `and` vs `+`, punctuation). Use an explicit `IN (...)` list of normalized `lower(btrim(name))` values plus optional **`LIKE`** guards; **never** assume a single spelling. If zero matches, **RAISE** with a suggested `SELECT id, name, parent_project_id FROM projects WHERE …`.

### Tables (template workflow)

| Table | Notes |
| ----- | ----- |
| `projects` | Catalog header + `phases` cache + `scheduling_prerequisites`; see §D / §E |
| `project_phases` | `project_id`; linked/standard via `is_linked`, `source_*`; see Step 1 |
| `phase_operations` | `phase_id`; `operation_name`, `operation_description`, `display_order`, `estimated_time`, `flow_type` |
| `operation_steps` | `operation_id`; title, description, enrichments—see Steps 1, 3, 5–8 |
| `step_instructions` | `step_id` → `operation_steps.id`; levels beginner / intermediate / advanced; JSONB `content` |
| `project_risks` | Template timeline/budget risks; see Step 4 |
| `tools` / `materials` | Shared catalogs; Steps 5–6 |
| `pfmea_*` | Quality failure modes; Step 9 |

---

## D) Catalog header (`projects`) — field catalog

Author when creating/revising a template or in Step 10 (description/challenges). Do not invent publish/visibility transitions unless asked.

| Field | Type / enums | Authoring rule |
| ----- | ------------ | -------------- |
| `id` | uuid | Stable; resolve root via `parent_project_id IS NULL` for workflow attach |
| `name` | string | Catalog title; match carefully (see §A name matching) |
| `description` | string \| null | Step 10; ≤200 chars; structured product blurb |
| `project_challenges` | string \| null | Step 10; ≤200 chars; hardest aspects narrative |
| `category` | string[] \| null | Catalog tags |
| `cover_image`, `images`, `icon` | media URLs | Catalog visuals; do not invent URLs |
| `effort_level` | string \| null | e.g. Low / Medium / High (app: `Project.effortLevel`) |
| `skill_level` | string \| null | Beginner / Intermediate / Advanced / Professional |
| `estimated_time` | string \| null | Time per scaling unit |
| `estimated_total_time` | string \| null | Total for typical size |
| `typical_project_size` | number \| null | Size used for total-time estimate |
| `scaling_unit` | string \| null | e.g. per square feet / per linear feet / per item |
| `budget_per_unit`, `budget_per_typical_size`, `estimated_cost` | string \| null | Cost hints |
| `item_type`, `project_type` | string \| null | Classification (`Primary` / `Secondary` in app) |
| `publish_status` | string \| null | draft / published / beta-testing / archived |
| `visibility_status` | string | default / coming-soon / hidden |
| `release_date` | date \| null | Coming-soon launch (YYYY-MM-DD) |
| `is_standard` | bool \| null | Standard Project Foundation marker |
| `is_popular` | bool | Catalog carousel |
| `instructions_data_sources` | string \| null | Citation notes for instruction content |
| `tags` | string[] \| null | Extra tags |
| `phases` | Json \| null | **Cache only**—rebuild from normalized tables; never hand-author |
| `scheduling_prerequisites` | Json | See §E (not empty invent); map + reserved keys |
| `parent_project_id` | uuid \| null | NULL = root; set on revision rows → root |
| `revision_number`, `revision_notes`, `is_current_version` | revision metadata | See §F |
| `user_id`, `created_at`, `updated_at` | system | Do not invent ownership |

---

## B) Steps 1–10 (canonical)

### Step 1 — Structure only (phases, operations, steps)

**Phases:** If **≥1** `project_phases` row for `project_id` → **do not** INSERT phases; use existing `id` as `phase_id`; **assume phases cover the full template**; if scope cannot map or structure is wrong → **notify the user**, do not add phases without direction. If **0** phases → INSERT phases first, then attach ops. Rename phases only if the prompt requires it.

**Operations & steps:** **Additive:** read existing `phase_operations` / `operation_steps`; **do not** delete or replace rows unless the prompt explicitly requires it. **INSERT** additional rows; keep `display_order` coherent with existing rows.

**Process map descriptions:** Single-line **what/scope/outcome** per phase / operation / step—not numbered procedures (how-to → Step 2).

**SQL migrations:** When phases already exist, resolve `phase_id` by **ordered** `project_phases` rows, **not** by mandatory phase **names** (see §A “Step 1 in SQL migrations”).

#### `project_phases` fields

| Field | Type / enums | Authoring rule |
| ----- | ------------ | -------------- |
| `id` | uuid | Stable UUID in migrations |
| `project_id` | uuid | Root template id |
| `name` | string | Phase label |
| `description` | string \| null | One-line what/scope/outcome |
| `position_rule` | string \| null | Prefer `nth` / `last` / `last_minus_n` (app treats former `first` as `nth` + `position_value = 1`) |
| `position_value` | number \| null | Required for `nth` / `last_minus_n` |
| `is_linked` | bool \| null | True when phase content comes from another template |
| `is_standard` | bool \| null | Standard foundation phase; treat as locked unless directed |
| `source_phase_id` | uuid \| null | Source `project_phases.id` when linked |
| `source_project_id` | uuid \| null | Source `projects.id` when linked |

#### `phase_operations` fields

| Field | Type / enums | Authoring rule |
| ----- | ------------ | -------------- |
| `id` | uuid | Stable |
| `phase_id` | uuid | Parent phase |
| `operation_name` | string | Required |
| `operation_description` | string \| null | One-line scope |
| `display_order` | number | Coherent within phase |
| `estimated_time` | string \| null | Optional rollup hint |
| `flow_type` | string \| null | `prime` / `alternate` / `if-necessary` |

#### `operation_steps` fields (structure + later enrichments)

| Field | Type / enums | Authoring rule |
| ----- | ------------ | -------------- |
| `id` | uuid | Stable; reused by Steps 2–9 |
| `operation_id` | uuid | Parent operation |
| `step_title` | string | Required |
| `description` | string \| null | One-line scope only (not how-to) |
| `display_order` | number | Within operation |
| `flow_type` | string \| null | `prime` / `alternate` / `if-necessary` |
| `step_type` | string \| null | `prime` / `scaled` / `quality_control_non_scaled` / `quality_control_scaled` |
| `number_of_workers` | number \| null | Workers needed |
| `skill_level` | string \| null | Beginner / Intermediate / Advanced / Professional |
| `allow_content_edit` | bool \| null | Allow edit even in standard phases when true |
| `outputs`, `tools`, `materials`, `process_variables`, `apps` | Json \| null | Steps 3, 5–7 (and apps if directed) |
| `time_estimate_low`, `time_estimate_med`, `time_estimate_high` | number \| null | Step 8 (hours; see step_type) |

After structure changes: rebuild `projects.phases` cache (§A).

### Step 2 — `step_instructions` (3 levels)

Prereq: every target `operation_steps` row exists. **3** rows per step: beginner, intermediate, advanced.

#### `step_instructions` fields

| Field | Type / enums | Authoring rule |
| ----- | ------------ | -------------- |
| `step_id` | uuid | → `operation_steps.id` |
| `instruction_level` | string | `beginner` \| `intermediate` \| `advanced` (unique with `step_id`) |
| `content` | Json | Array of **ContentSection** objects |

#### ContentSection shape (`src/interfaces/Project.ts`)

| Key | Type / enums | Authoring rule |
| --- | ------------ | -------------- |
| `id` | string | Stable section id |
| `type` | `text` \| `image` \| `video` \| `link` \| `button` \| `safety-warning` \| `warning` \| `standard` \| `tip` | Legacy `warning` ≡ safety-warning; `standard`/`tip` = prose |
| `title` | string \| optional | Section heading |
| `content` | string | Body / URL as appropriate for type |
| `severity` | `low` \| `medium` \| `high` \| `critical` | For safety-warning |
| `width` | `full` \| `half` \| `third` \| `two-thirds` | Layout |
| `alignment` | `left` \| `center` \| `right` | Layout |
| `display_order` | number \| optional | Warnings ordered first in editor |
| `buttonAction` | project-customizer \| project-scheduler \| shopping-checklist \| materials-selection \| project-budgeting \| project-performance \| after-action-review | Buttons only |
| `buttonLabel`, `buttonIcon`, `buttonVariant` | string / variant | Buttons only |
| `decisionApplicability` | `{ decisionId, choiceIds[] }[]` \| null | AND rules vs general project decisions; null/omit = all choices |

**Default editor sections:** Background/Need-to-Know, Instructions, Error-Recovery (`getDefaultStepContentSections()`). Seed SQL may use `warning` / `standard` / `tip` types.

### Step 3 — Outputs (`operation_steps.outputs` JSON)

Per step: outputs with `name` (≤50 chars, prefer under 30), `description`, `type`, etc. Names = **physical achieved state**, not inspection verbs, unless the step is explicitly inspection.

| Key | Type / enums | Authoring rule |
| --- | ------------ | -------------- |
| `id` | string | Stable |
| `name` | string | ≤50 chars; physical state |
| `description` | string | What “done” looks like |
| `type` | `none` \| `major-aesthetics` \| `performance-durability` \| `safety` | Required classification |
| `requirement` | string \| optional | Spec / acceptance |
| `qualityChecks` | string \| optional | How to verify |
| `keyInputs` | string[] \| optional | Drivers of this output |
| `potentialEffects`, `photosOfEffects`, `mustGetRight`, `allowances`, `referenceSpecification` | optional | Enrich when known |

### Step 4 — Project risks (`project_risks`)

**Scope:** timeline and budget only—not quality (that is PFMEA, Step 9). Attach to **root** template id (see §F).

| Field | Type / enums | Authoring rule |
| ----- | ------------ | -------------- |
| `project_id` | uuid | Root template |
| `risk_title` | string | Required |
| `risk_description` | string \| null | Optional; narrative often in `benefit` |
| `likelihood` | string \| null | `low` / `medium` / `high` |
| `severity` / `impact` | string \| null | `low` / `medium` / `high` (UI uses severity) |
| `schedule_impact_low_days`, `schedule_impact_high_days` | number \| null | Calendar-day impact range |
| `budget_impact_low`, `budget_impact_high` | number \| null | Dollar impact range |
| `mitigation_strategy` | string \| null | Overall mitigation approach |
| `mitigation_actions` | Json \| null | `[{ action, benefit?, completed? }]` |
| `mitigation_cost` | number \| null | Cost to mitigate |
| `mitigation_effort_level` | string \| null | `low` / `medium` / `high` |
| `recommendation` | string \| null | What to do |
| `benefit` | string \| null | What if it happens / notes |
| `display_order` | number \| null | Register order |

### Step 5 — Tools

Catalog + step JSON; bootstrap by `name`; **RAISE** if unresolved.

#### `tools` catalog (bootstrap)

| Field | Notes |
| ----- | ----- |
| `name` | Match key |
| `description` | Required when inserting |
| `category` | **`PPE` \| `Hand Tool` \| `Power Tool` \| `Other`** |
| `alternates`, `photo_url`, `instructions` | Optional |
| `specialty_scale`, `attribute_definitions` | Respect NOT NULL / defaults in live schema |

#### `operation_steps.tools` JSON (app shape)

Prefer library-backed refs: `id` / `name`, `description`, `category`, `alternates`, optional `quantity`, `linkedContentSectionIds` (show tool only when linked instruction sections are visible).

### Step 6 — Materials

Same pattern as tools; repeat tool bootstrap in the same file.

#### `materials` catalog (bootstrap)

| Field | Notes |
| ----- | ----- |
| `name` | Match key |
| `description`, `category`, `unit`, `unit_size` | Fill constrained columns |
| `category` | **Check constraint:** `Components` \| `Consumables` \| `PPE` only |
| `avg_cost_per_unit`, `alternates`, `photo_url` | Optional |

#### `operation_steps.materials` JSON (app shape)

`id` / `name`, `description`, `category`, `unit`, `unit_size`, `alternates`, optional `quantity`, `coveragePerUnit`, `wasteFactor`, `packSize`, `linkedContentSectionIds`.

### Step 7 — Process variables (`operation_steps.process_variables`)

Intrinsic measurable parameters; **`process`** type required where coverage applies; **`upstream`** optional. SQL file = process-variable updates + cache if needed only. **No** tool/material catalog inserts.

Serialized shape (`processVariablesUtils.ts`):

| Key | Type | Authoring rule |
| --- | ---- | -------------- |
| `id` | string | Stable |
| `name` | string | Required |
| `type` | `process` \| `upstream` | DB stores `upstream` for upstream/input |
| `description` | string \| optional | |
| `unit` | string \| optional | |
| `options` | string[] \| optional | Selection-like |
| `required` | bool \| optional | |
| `sourceStepId`, `sourceStepName`, `targetValue` | optional | Upstream linkage |

### Step 8 — Time estimates

Low / med / high per step; evidence-based; per scaling unit when `step_type` is scaled.

| Field | Authoring rule |
| ----- | -------------- |
| `time_estimate_low` / `_med` / `_high` | Hours for `prime` / `quality_control_non_scaled`; **hours per scaling unit** for `scaled` / `quality_control_scaled` |
| `step_type` | Must already reflect scaled vs non-scaled (Step 1) |
| `number_of_workers`, `skill_level` | Align with effort assumptions when set |

### Step 9 — PFMEA

Anti-requirement failure modes; align `requirement_output_id` with Step 3 output ids; scoring from `pfmea_scoring`.

Core `pfmea_failure_modes`:

| Field | Authoring rule |
| ----- | -------------- |
| `project_id` | Root template |
| `operation_step_id` | Target step |
| `requirement_output_id` | Must match a Step 3 output `id` on that step |
| `failure_mode` | Anti-requirement narrative |
| `severity_score` | From `pfmea_scoring` reference |

Related tables (when filling full PFMEA): `pfmea_potential_causes`, `pfmea_potential_effects`, `pfmea_controls`, `pfmea_action_items`.

### Step 10 — `projects.description` + `projects.project_challenges`

≤200 chars each; structured description; narrative challenges. Touches only those `projects` columns (plus cache rebuild only if somehow structure changed—normally not).

---

## E) Schedule data (template authoring)

Template schedule content lives on **`projects.scheduling_prerequisites`** (Json). Do **not** author run-level `project_runs.schedule_events` in Steps 1–10.

| Piece | Location | Authoring rule |
| ----- | -------- | -------------- |
| Prerequisite map | string keys → string[] of entity ids | EntityId (phase/operation/step) → prerequisite entity IDs; parsed by scheduling deps helpers |
| `__decision_tree_config__` | reserved key (`DECISION_TREE_CONFIG_KEY`) | Decision-tree / flow config blob; phase entries may use `type: 'blocked'` (hidden from pickers) |
| `__general_project_decisions__` | reserved key (`GENERAL_PROJECT_DECISIONS_KEY`) | Array of `{ id, label, choices: [{ id, label }] }` (`GeneralProjectDecision`) |

**General project decisions** drive `ContentSection.decisionApplicability` (Step 2). Do not invent decision ids that sections do not reference (or leave sections without applicability when decisions are unused).

**Out of scope for this guide’s Steps 1–10:** run `schedule_events` (`events[]` with date/phaseId/duration, `teamMembers`, `globalSettings.quietHours`), `start_date` / `plan_end_date`, `schedule_optimization_method`.

---

## F) Related projects

| Mechanism | Fields / behavior | Authoring rule |
| --------- | ----------------- | -------------- |
| **Revisions** | `parent_project_id` → root; `revision_number`; `revision_notes`; `is_current_version` | Attach workflow/risks/PFMEA to **root** (`parent_project_id IS NULL`) |
| **Linked / standard phases** | `project_phases.is_linked`, `is_standard`, `source_project_id`, `source_phase_id` | Do not invent links; copy/link only when directed; respect standard locks |
| **Incorporated phases** | App: Browse Related Project Phases / PhaseIncorporation | Source template + phase must exist |
| **Decision-tree blocked phases** | `__decision_tree_config__` entries with `type: 'blocked'` | Hide incorporated/blocked phases from pickers—do not fake blocked ids |
| **Runs → templates** | `project_runs.project_id` → catalog | Not authored in Steps 1–10 |

Never invent related-project relationships. Resolve catalog names carefully (§A).

---

## C) Step index (pointers only)

| Step | Focus |
| ---- | ----- |
| 1 | `project_phases` (only if empty), `phase_operations`, `operation_steps`; additive; cache |
| 2 | `step_instructions` ×3 levels |
| 3 | `operation_steps.outputs` |
| 4 | Project risks (time $) |
| 5 | `tools` + `operation_steps.tools` |
| 6 | `materials` + `operation_steps.materials` |
| 7 | `operation_steps.process_variables` |
| 8 | `time_estimate_*` |
| 9 | PFMEA tables |
| 10 | `projects.description`, `projects.project_challenges` |

Also: §D catalog header, §E schedule prereqs, §F related projects / revisions.

---

## Revision history

Living changelog. When a field, constraint, or SQL lesson is **proven** during guided work: **append** a row here and fold durable rules into the matching section above.

| Date | Change | Why |
| ---- | ------ | --- |
| 2026-09-10 | Expanded field catalogs for catalog header, Steps 1–10, schedule prereqs (§E), related projects (§F); added on-demand Cursor rule `.cursor/rules/ai-project-dev-guide.mdc` | Single guide for template content development + continuous improvement |
| 2026-09-10 | `materials.category` check allows only `Components` / `Consumables` / `PPE` (not free-form labels like Flooring) | Tile Flooring Installation step 6 bootstrap failed `materials_category_chk` until categories matched the constraint |
