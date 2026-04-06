# AI Project Development Reference (DB-first)

**Use when:** admin asks to complete **Step 1–10** of project development for a named template (`project_id`). **§B is the single source of truth per step** (no duplicate checklist elsewhere).

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

- **Resolve `phase_id` for new operations** using **deterministic ordering** of existing `project_phases` rows—**not** by requiring fixed display names like “Preparation” or “Disconnect” (catalog phases may use any labels).
- **Recommended sort key** (matches typical process-map ordering): `position_rule` rows with `'last'` after non-last; then `position_value` NULLS LAST; then `created_at`; then `id`.
- **Fewer than three phases:** map multiple operation groups onto the same phase as needed (e.g. 1st sorted phase → first group; 2nd sorted → second group; if only one phase, all groups use that `phase_id`). Use `LEAST(2, n)` / `LEAST(3, n)` row numbers so 1–2 phase templates still get a consistent mapping.
- **Zero phases:** `INSERT` the phase set for that template in Step 1, then attach operations (same as greenfield Step 1).

### Migrations — PostgreSQL / template resolution (field learnings)

- **Recursive CTE:** Walking from a matched `projects.id` up `parent_project_id` to the family root uses **`WITH RECURSIVE`** on the whole `WITH` clause whenever a CTE references itself in `UNION ALL`—otherwise you get `relation "up" does not exist`.
- **`max(uuid)` / `min(uuid)`:** Not available on all PostgreSQL versions (e.g. some managed pools). Prefer **`(SELECT id FROM … WHERE rn = n LIMIT 1)`** or `(array_agg(id ORDER BY …))[n]` instead of `max(id) FILTER` on UUIDs.
- **Template rows:** Revisions may have `parent_project_id` set; resolve the **root** row (`parent_project_id IS NULL`) when attaching workflow to the canonical template family.
- **Name matching:** Catalog titles vary (`&` vs `and` vs `+`, spacing). Prefer explicit lists or documented `LIKE` patterns; fail with a diagnostic query if zero or ambiguous matches.

### Tables (template workflow)

| Table | Notes |
|--------|--------|
| `project_phases` | `project_id`; see Step 1 rules above |
| `phase_operations` | `phase_id`; typical: `operation_name`, `operation_description`, `display_order`, `estimated_time`, `flow_type` |
| `operation_steps` | `operation_id`; title, description, `display_order`, later enrichments—see `types.ts` |
| `step_instructions` | `step_id` → `operation_steps.id`; levels beginner / intermediate / advanced; JSONB `content` |

---

## B) Steps 1–10 (canonical)

### Step 1 — Structure only (phases, operations, steps)

**Phases:** If **≥1** `project_phases` row for `project_id` → **do not** INSERT phases; use existing `id` as `phase_id`; **assume phases cover the full template**; if scope cannot map or structure is wrong → **notify the user**, do not add phases without direction. If **0** phases → INSERT phases first, then attach ops. Rename phases only if the prompt requires it.

**Operations & steps:** **Additive:** read existing `phase_operations` / `operation_steps`; **do not** delete or replace rows unless the prompt explicitly requires it. **INSERT** additional rows; keep `display_order` coherent with existing rows.

**Process map descriptions:** Single-line **what/scope/outcome** per phase / operation / step—not numbered procedures (how-to → Step 2).

**SQL migrations:** When phases already exist, resolve `phase_id` by **ordered** `project_phases` rows, **not** by mandatory phase **names** (see §A “Step 1 in SQL migrations”).

### Step 2 — `step_instructions` (3 levels)

Prereq: every target `operation_steps` row exists. **3** rows per step: beginner, intermediate, advanced.

### Step 3 — Outputs (`operation_steps.outputs` JSON)

Per step: outputs with `name` (≤50 chars, prefer under 30), `description`, `type`, etc. Names = **physical achieved state**, not inspection verbs, unless the step is explicitly inspection.

### Step 4 — Project risks

Timeline and budget only—not quality (PFMEA).

### Step 5 — Tools

Catalog + step JSON; bootstrap by `name`; **RAISE** if unresolved.

### Step 6 — Materials

Same pattern as tools; repeat tool bootstrap in the same file.

### Step 7 — Process variables (`operation_steps.process_variables`)

Intrinsic measurable parameters; **`process`** type required where coverage applies; **`upstream`** optional. SQL file = process-variable updates + cache if needed only.

### Step 8 — Time estimates

Low / med / high per step; evidence-based; per scaling unit.

### Step 9 — PFMEA

Anti-requirement failure modes; align `requirement_output_id` with Step 3; scoring from `pfmea_scoring`.

### Step 10 — `projects.description` + `projects.project_challenges`

≤200 chars each; structured description; narrative challenges.

---

## C) Step index (pointers only)

| Step | Focus |
|------|--------|
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
