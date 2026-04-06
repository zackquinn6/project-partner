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
- **One SQL file per step** (1–10) per project slug—never two “Step N” files; extra templates → another `DO $$ … $$` block in the **same** file. Filename: `YYYY_MM_DD_migration_<slug>_step<N>[_qualifier].sql`—**no** `project_id` in the name. Legacy filenames may say `step2_outputs` → that is **Step 3** in the current numbering; map: 1 structure, 2 instructions, 3 outputs, 4 risks, 5 tools, 6 materials, 7 process vars, 8 time, 9 PFMEA, 10 project copy.
- **Same template across steps:** Steps **3–9** use the same `v_project_id` and the same **`operation_steps.id`** values from **Step 1**. **Step 2** touches only **`step_instructions`**. **Step 10** touches only **`projects`** (`description`, `project_challenges`).
- **Steps 5–6 bootstrap:** Insert missing **`public.tools`** / **`public.materials`** by `name` when absent (every NOT NULL / constrained column—tool **`category`** ∈ `PPE`, `Hand Tool`, `Power Tool`, `Other`). Step **6** repeats the **same tools** list as step 5 so running 6 alone still satisfies catalog needs. Step **7** = **no** tool/material catalog inserts.
- After bootstrap, resolve library IDs or **RAISE**—no orphan JSON with fake ids.

### Tables (template workflow)

| Table | Notes |
|--------|--------|
| `project_phases` | `project_id`; phase behavior in **Step 1** below |
| `phase_operations` | `phase_id`; typical: `operation_name`, `operation_description`, `display_order`, `estimated_time`, `flow_type` |
| `operation_steps` | `operation_id`; title, description, `display_order`, later: `outputs`, `tools`, `materials`, `process_variables`, time columns—see `types.ts` |
| `step_instructions` | `step_id` → `operation_steps.id`; `instruction_level` ∈ beginner, intermediate, advanced; JSONB `content` |

---

## B) Steps 1–10 (canonical)

### Step 1 — Structure only (phases, operations, steps)

**Phases:** If **≥1** `project_phases` row for `project_id` → **do not** INSERT phases; use existing `id` as `phase_id`; **assume phases cover the full project**; if scope cannot map or structure is wrong → **notify the user**, do not add phases without direction. If **0** phases → INSERT phases first, then attach ops. Rename phases only if the prompt requires it.

**Operations & steps:** **Additive:** read existing `phase_operations` / `operation_steps`; **do not** delete or replace rows unless the prompt explicitly requires it. **INSERT** additional rows; keep `display_order` coherent with existing rows.

**Deliverables:** Per operation: name, description, display order, `flow_type` if applicable. Per step: title + **one-line** description. **No** `step_instructions` (that is Step 2).

**Process map descriptions** (`project_phases.description`, `phase_operations.operation_description`, `operation_steps.description`): single-line **what/scope/outcome**, not numbered procedures or how-to (how-to → Step 2). Minimize **the** in operation/step titles. Example pattern: phase *“Tile layout, cutting, and setting.”*; step *“Toilet placement and bolt installation”*—not *“Lower the toilet onto…”*.

**DB:** New phases only if none existed → `project_phases`; ops → `phase_operations`; steps → `operation_steps`. Then **cache refresh** (global section).

### Step 2 — `step_instructions` (3 levels)

**Prereq:** Every target `operation_steps` row exists (from Step 1). **Deliverable:** For **each** step, **3** rows: beginner, intermediate, advanced (`content` JSONB sections). Minimize gratuitous “the” in prose. Scope vs how-to: Step 1 descriptions stay one line; sequencing and technique live here.

### Step 3 — Outputs (`operation_steps.outputs` JSON)

Per step: one+ outputs with `name`, `description`, `type`, quality fields as needed. **Name ≤50 chars** (prefer under 30). Name the **physical achieved state**, not inspection verbs (`verified`, `inspected`, …) unless the step **is** an inspection step—e.g. install → `100% sealing coverage`; flood test → `Verification of 100% sealing coverage`. `qualityChecks` may mention inspection; output **name** stays the condition unless verification is the deliverable.

### Step 4 — Project risks

**Timeline and budget only**—not quality (quality → PFMEA). Locate canonical risk tables in schema/types; do not invent storage.

### Step 5 — Tools

Tools must exist in `public.tools` (and `tool_variations` if used). Bootstrap by `name` (global section), attach to `operation_steps.tools`, then resolve or **RAISE**.

### Step 6 — Materials

Same pattern as tools for `public.materials` / `materials_variants` → `operation_steps.materials`; repeat tool bootstrap in this file.

### Step 7 — Process variables (`operation_steps.process_variables` JSON)

**Definition:** Intrinsic to the action, measurable (angle, pressure, time, …), affects Q/S/P, has a target range conceptually. **Not** tool brand or SKU.

**Per stored object:** `type` = **`process`** (required for in-scope control—at least one per step that needs coverage) and/or **`upstream`** (optional contextual factor outside project scope; use `description` / `targetValue`). App may author `input` → stored **`upstream`**. SQL: only `'process'` and `'upstream'`. Shape: `serializeProcessVariablesForDb` in `src/utils/processVariablesUtils.ts` (`id`, `name`, `type`, optional fields). **Migration file:** only process-variable `UPDATE`s + cache refresh if needed—**no** tools/materials catalog inserts.

### Step 8 — Time estimates

Per step: `time_estimate_low` = **10th %ile**, `med` = **mean** (from evidence), `high` = **90th %ile**; align to scaling unit; use **step-scoped** evidence (normalize, e.g. 2 hr / 50 ft → per LF). Each step gets its own numbers—no single blanket guess for the whole project.

### Step 9 — PFMEA

**Scope:** Quality failure analysis here—not Step 4 timeline/budget risks. Link to `operation_steps` and Step 3 output keys: `requirement_output_id` = output JSON **`id`** or `index:<n>` (see `requirementOutputKey` in `PFMEAManagement.tsx`).

**`failure_mode`:** Short **anti-requirement**—direct negation of **that** output’s wording only (no extra adverbs like “safely” unless in the output). Quantified output → quantified failure. Rich text in effects/causes/controls. **Prevention controls:** concrete method (tool, WI, video, training)—not “follow instructions”; blank if none; prefer tool-based when real.

**Grid:** Every Step 3 output you ship needs **≥1** failure mode or the UI shows blank PFMEA rows. Multiple causes → one grid row per cause; reference templates often use ~2 causes per mode.

**Detection scores:** Use **`public.pfmea_scoring`** (app: PFMEA → Scoring criteria). Lower score = easier detection. Manual/subjective checks → **higher** scores than justified gage/automation—do not default manual to 1–3 unless the table says so. RPN uses min detection among detection controls (`calculateRPN` in `PFMEAManagement.tsx`).

**SQL:** Stable ids + `ON CONFLICT`; for `pfmea_failure_modes`, `ON CONFLICT (id) DO UPDATE` on `failure_mode` / `severity_score` helps idempotent refreshes. Valid UUIDs only. Prereq: Steps 1–3 minimum; usually after 8.

### Step 10 — `projects.description` + `projects.project_challenges`

**Limits:** Each field **≤200** chars (count everything); aim **≤150**.

**`description`:** Catalog blurb—not a step list. One tight prose blob (no bullets): **(1)** 2–3 phase-level themes (max 4), **(2)** typical home areas, **(3)** purpose/benefit. Align to template; don’t paste `step_instructions`.

**`project_challenges`:** Short **narrative** on felt difficulty and hot spots—not a risk catalog, not a second description, not Step 4/9. Prefer `project_challenges` column over legacy names.

**SQL:** `UPDATE` after row exists check; idempotent; no phase rebuild **unless** same migration changes normalized phases.

---

## C) Step index (pointers only)

| Step | Focus |
|------|--------|
| 1 | `project_phases`, `phase_operations`, `operation_steps`; additive; cache |
| 2 | `step_instructions` ×3 levels |
| 3 | `operation_steps.outputs` |
| 4 | Project risks (time $) |
| 5 | `tools` + `operation_steps.tools` |
| 6 | `materials` + `operation_steps.materials` |
| 7 | `operation_steps.process_variables` |
| 8 | `time_estimate_*` |
| 9 | PFMEA tables ↔ outputs / steps |
| 10 | `projects.description`, `projects.project_challenges` |
