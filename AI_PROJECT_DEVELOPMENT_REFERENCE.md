# AI Project Development Reference (DB-first)

This document is intended as a **strict reference for AI** when the user prompts:

> **“Complete step X of project development for project ‘[project name]’ with project id [xyz123]”**

Where **Step X** is one of the steps defined below.

---

## Key non-negotiable rules (from this chat)

- **No fallbacks**: Do not add “just in case” default values, silent defaults, or backup logic.
- **No hardcoded strings for state**: Don’t check hardcoded names/strings to determine state.
- **No COALESCE with hardcoded fallback values**: If a field can be NULL, handle explicitly or fail.
- **Fix root causes**: No workaround-driven “force coding.” If the app cannot run without a workaround, let it fail; do not force it.
- **Use DB relationships and fields**: Never hardcode business logic.

---

## A) Database setup (how project workflow content is stored)

### Primary normalized tables (template workflow)

- **`public.project_phases`**
  - Stores phases for a template project (`project_id`).
  - Phases are assumed to exist before adding operations/steps when the prompt says phases are sufficient.

- **`public.phase_operations`**
  - Stores operations under a phase (`phase_id`).
  - Required fields (typical): `operation_name`, `operation_description`, `display_order`, `estimated_time`, `flow_type`.

- **`public.operation_steps`**
  - Stores steps under an operation (`operation_id`).
  - **Do not assume extra columns** (e.g. `content_type`, `content`, `content_sections`) exist unless the live schema or generated types say so. In this codebase, step copy lives in **`public.step_instructions`**, not on `operation_steps`.
  - Columns that **`src/integrations/supabase/types.ts`** exposes for `operation_steps` include: `id`, `operation_id`, `step_title`, `description`, `display_order`, `materials`, `tools`, `outputs`, `apps`, `process_variables`, `flow_type`, `step_type`, `time_estimate_low`, `time_estimate_med`, `time_estimate_high`, `number_of_workers`, `skill_level`, `allow_content_edit`, timestamps.

- **`public.step_instructions`**
  - Stores **3-level instruction content** per template step row in `operation_steps`.
  - Key columns:
    - `step_id` → references `operation_steps.id` (**not** `template_step_id`; that name is used on `project_run_step_instructions` for run instances)
    - `instruction_level` ∈ {`beginner`, `intermediate`, `advanced`}
    - `content` (JSONB) → typically an array of sections (title/content/type)

### Template cache refresh

- Some parts of the app rely on `public.projects.phases` (JSON cache).
- After inserting/updating normalized workflow rows, **refresh**:
  - `UPDATE public.projects SET phases = public.rebuild_phases_json_from_project_phases(<project_id>) WHERE id = <project_id>;`
- Do not “default” a cache value; if rebuild fails, **fail** and fix the cause.

### Migration format expectation

- When asked to “Create as a migration for direct database update,” produce **SQL** suitable for running directly (e.g., Supabase SQL editor / migration runner).
- Behavior requirements:
  - **Fail loudly** if required upstream entities are missing (e.g., phase not found).
  - Prefer **idempotent inserts** using stable UUIDs and `ON CONFLICT` on unique keys (e.g., `id`, or `(step_id, instruction_level)` for `public.step_instructions`).

### UUID literals in migrations (avoid `22P02` invalid input syntax)

- PostgreSQL accepts UUIDs in the standard form `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` where the **last group must be exactly 12 hexadecimal characters** (not 11, not 13).
- When hand-authoring stable IDs for `INSERT` … `::uuid`, **count the last segment** after the final hyphen. A mistake such as `…5409ed1f04003` (13 hex digits) or a truncated group will fail at runtime with **`ERROR: 22P02: invalid input syntax for type uuid`**.
- Prefer a generator or copy a known-valid UUID pattern; if using a numeric suffix scheme, ensure each full UUID string remains valid (e.g. `…f0403` not `…f04003` when the latter makes the last group too long).

### One migration file per project-development step (required)

- **Exactly one SQL file per Step** (Step 1 … Step 8 as defined in section B). Do not split a single step across multiple migration files (for example, do not add a second “Step 1” file when another `project_id` needs the same workflow—extend the existing Step 1 file instead).
- **Multiple template projects** that need the same step: put **one PostgreSQL `DO $$ … END $$;` block per `project_id`** in that step’s file, in stable order, with comments separating blocks. Each block uses its own stable operation/step UUIDs. If there is only one target `project_id`, use **one** `DO` block.
- **Steps 2–8** for the same template must use the **same** `v_project_id` as Step 1, and any `UPDATE public.operation_steps … WHERE id = …` must reference the **same** `operation_steps.id` values created in Step 1 for that project (Step 8 PFMEA rows reference those steps via `operation_step_id`).
- **Naming:** use a single slug and step number, e.g. `YYYY_MM_DD_migration_<project_slug>_step<N>[_<qualifier>].sql`. Use a **qualifier** only when two different migrations would both be “step N” by number but different in purpose (outputs vs risks vs tools). Example (Toilet Replacement, project `f46b9b02-de31-42e0-ab04-5409ed1f21ee`):
  - `2026_03_30_migration_toilet_replacement_step1.sql` — Step 1
  - `2026_03_26_migration_toilet_replacement_step2_outputs.sql` — Step 2
  - `2026_03_26_migration_toilet_replacement_step3_project_risks.sql` — Step 3
  - `2026_03_26_migration_toilet_replacement_step4_tools.sql` — Step 4
  - `2026_03_30_migration_toilet_replacement_step5_materials.sql` — Step 5
  - `2026_03_30_migration_toilet_replacement_step6_process_variables.sql` — Step 6
  - `2026_03_30_migration_toilet_replacement_step7_time_estimates.sql` — Step 7
  - `2026_03_30_migration_toilet_replacement_step8_pfmea.sql` — Step 8
- Do **not** encode `project_id` in the **filename**; the project is identified inside the SQL (`v_project_id` or comments).

### Library bootstrap inside steps 4–5 (tools + materials)

- **Step 4 migrations** begin by **inserting missing `public.tools` rows** when no row with the same `name` exists (`INSERT … SELECT … WHERE NOT EXISTS (SELECT 1 FROM public.tools t WHERE t.name = v.n)`). Include every **NOT NULL** / check-constrained column the database enforces (e.g. **`category`** — the admin tools UI uses `PPE`, `Hand Tool`, `Power Tool`, `Other`; align inserts to that set). Use real `name` / `description` / required numeric fields (e.g. `specialty_scale`); do not invent silent defaults on step rows—only explicit catalog inserts.
- **Step 5 migrations** do the same for **`public.materials`** (match on `name`), and **repeat the same tools list** as step 4 so running step 5 alone still leaves the tool catalog sufficient for step 4’s assignments if step 4 was skipped in a bad order (idempotent).
- **Step 6 migrations do not** insert into **`public.tools`** or **`public.materials`**. Step 6 is **only** `operation_steps.process_variables` (plus project cache refresh). Catalog and step-level tools/materials belong in steps **4** and **5**.
- After bootstrap in steps 4–5, migrations should still **resolve IDs** (or `RAISE`) if a row is missing—e.g. permissions, renamed catalog, or schema mismatch—so failures remain loud.

### Schema alignment (avoid 42703 / “column does not exist”)

- **Before writing `INSERT`/`UPDATE` SQL**, confirm column names against a **real source of truth**: e.g. `src/integrations/supabase/types.ts` (reflects the linked database) or `\d table_name` / information_schema in the target DB.
- **Do not copy column lists from older migrations or from other products** unless you verify each column still exists.
- **Lesson:** `public.operation_steps` in this project **does not** include `content_type`, `content`, or `content_sections`. Putting narrative instructions only in `step_instructions`; optional single-line context belongs in `operation_steps.description` if needed.

---

## B) The “project development” steps (what Step X means)

### Step 1 — Operations, steps, step description, and 3-level instructions

**Deliverables**

- **Phases** (do not rename unless the prompt requires it), with:
  - **Operations** under each phase:
    - operation name
    - operation description
    - display order
    - flow type (only if applicable; otherwise omit)
  - **Steps** under each operation:
    - step title
    - step description
    - **instructions at all 3 levels**:
      - beginner
      - intermediate
      - advanced

**DB placement**

- Operations → `public.phase_operations`
- Steps → `public.operation_steps` (title + description at minimum)
- Instructions → `public.step_instructions` (3 rows per step)

### Step 2 — Outputs for each step

**Deliverables**

- For every step, define **one or more outputs**:
  - output `name`
  - output `description`
  - output `type` (e.g., `none`, `major-aesthetics`, `performance-durability`, `safety`)
  - include quality-oriented fields when appropriate (e.g., `qualityChecks`, `mustGetRight`)

**DB placement**

- Outputs are stored on the step row as JSON:
  - `public.operation_steps.outputs`

**Clarification**

- Output name length constraint:
  - **≤ 50 characters max**
  - **< 30 characters preferred**

- The output of a step should be a **physical condition / achieved state**, not an inspection label.
- Do **not** name a normal installation/process-step output as **`verified`**, **`inspected`**, **`checked`**, **`confirmed`**, **`tested`**, etc. when the real deliverable is the physical condition produced by the work.
- Only use a **verification/inspection output** when the step itself is explicitly a **separate inspection / test / validation step** beyond the normal execution of the work.
- Example:
  - Waterproofing install step output: **`100% sealing coverage`**
  - Flood test step output: **`Verification of 100% sealing coverage`**
- Toilet example:
  - Prefer **`Water isolated`** over **`Shutoff verified`**
  - Prefer **`Leak-free installation`** over **`Leak-free verified`**
- A step may include inspection activities in its `qualityChecks`, but the output name should still be the **resulting condition** unless the step’s distinct deliverable is the verification itself.

### Step 3 — Project Risks

**Deliverables**

- A set of project risks focused on:
  - **timeline impact**
  - **budget impact**
- Do **not** focus on quality risks here:
  - Quality risks are covered via **PFMEA**, not the generic risks list.

**DB placement**

- Use the project’s risk-management storage (whatever the app’s canonical risk tables are).
- If the exact storage tables are unknown in the current context, first locate them in the schema/types and then insert/update accordingly. Do not invent a new storage pattern.

### Step 4 — Tools list

**Deliverables**

- A tools list required for the project (and per-step associations if required by the product).

**Hard requirement**

- **Tools must exist in `public.tools`** (and `tool_variations` when a step references a variant).
- **Migrations:** insert the canonical tool row **when missing** (see **Library bootstrap inside steps 4–5**), then attach library IDs to steps. If a row still cannot be resolved after insert, **fail with an explicit `RAISE`** listing what is wrong—do not leave orphan JSON with fake IDs.

**DB placement**

- Step-level tools live in `public.operation_steps.tools` (JSON).
- Library catalog: `public.tools` / `tool_variations`.

### Step 5 — Materials list

**Deliverables**

- A materials list required for the project (and per-step associations if required).

**Hard requirement**

- **Materials must exist in `public.materials`** (and `materials_variants` when a step references a variant).
- **Migrations:** insert the canonical material row **when missing** (match on `name`, same pattern as tools), then attach IDs to steps. If still missing, **`RAISE`** with a clear message.

**DB placement**

- Step-level materials live in `public.operation_steps.materials` (JSON).
- Library catalog: `public.materials` / `materials_variants`.

### Step 6 — Process variables

**Definition (must follow)**

A **process variable** is a fundamental, theoretically measurable parameter that governs how a step in a home‑improvement process is executed. It is:

- **Intrinsic to the action** (not the tool or material)
- Has a definable physical value (angle, pressure, speed, time, depth, temperature, etc.)
- Directly affects quality, safety, or performance
- Conceptually measurable with an **ideal target range**, even if not practically measured in the field

**Examples**

- brush pressure, mixing speed, cure time, trowel angle, depth of cut

**Deliverables**

- For each step where it matters, list:
  - variable name
  - what it controls
  - target range (with units)
  - what happens if too low vs too high (brief)
- When you define variables for a step, include **at least one** with **`type`** = **`process`**. **`upstream`** entries are optional.

**Variable `type` (required on each stored object)**

- **`process`** (default): A parameter the worker or system **directly executes or measures within this project’s scope**—the thing you tune, time, or control on site.
- **`upstream`**: Optional. A **contextual / input factor outside this project’s scope**—assumed **acceptable** for the job as defined (e.g. “typical residential pressure,” “manufacturer bowl geometry,” “assumed sound subfloor”). It is **not** something this project is chartered to redesign, but it may be **acknowledged as a source of variation** in outcomes. Use `description` and, when helpful, `targetValue` (assumed acceptable band or note) when you add an upstream variable.
- **Authoring synonym:** In TypeScript, `StepInput.type` may use **`input`** as an alias for **`upstream`**; **`serializeProcessVariablesForDb`** persists **`upstream`** in JSON (see `src/utils/processVariablesUtils.ts`). SQL migrations should write **`'upstream'`** or **`'process'`** only.

**Minimum counts**

- Each step that needs process-variable coverage should have **at least one** variable with **`type`** = **`process`** (in-scope execution control).
- **`upstream`** variables are **optional**—do not require them per step or per project.

**DB placement**

- In this codebase, template step process variables are stored on **`public.operation_steps.process_variables`** (JSON array). Each element matches the shape produced by `serializeProcessVariablesForDb` in `src/utils/processVariablesUtils.ts`: required **`id`**, **`name`**, **`type`** (`process` \| `upstream`), optional **`description`**, **`required`**, **`unit`**, **`targetValue`** (often used for upstream assumed bounds), **`sourceStepId`** / **`sourceStepName`** when linking to another step.
- **Step 6 SQL migrations** contain **only** process-variable `UPDATE`s (and `rebuild_phases_json_from_project_phases`). Do **not** duplicate tools/materials library inserts here—that is steps **4** and **5**.

### Step 7 — Time estimates (low, med, high) for each step

**Deliverables**

- For every step, provide:
  - `low` = **10th percentile**
  - `med` = **average** (either the specified time if given, or the mean of researched datapoints)
  - `high` = **90th percentile**
- Estimates must align to the step’s **scaling unit**, when the step is scaled (e.g., per square foot / per linear foot / per item).
- Estimates must be based on **specific researched datapoints** for the step scope (not the whole project).

**Example requirement**

- If evidence says: “2 hours to install 50 ft of baseboard” and that evidence is only for the install step:
  - Normalize to: \(2 \text{ hr} / 50 \text{ ft} = 2.4 \text{ min per linear foot}\)
  - Store per-unit values where the step is scaled.

**Deep reasoning expectation**

- Assess project size (number of steps) and split the work into **reasonable chunks** when completing Step 7.
- Do not guess a single blanket time for many steps; each step should have its own estimate.

**DB placement**

- `public.operation_steps.time_estimate_low`
- `public.operation_steps.time_estimate_med`
- `public.operation_steps.time_estimate_high`

### Step 8 — PFMEA (failure modes and related rows)

**Role**

- **Step 3** stores **project risks** (timeline / budget). **Quality** failure analysis belongs in **PFMEA** tables, not in `project_risks`.
- Step 8 migrations seed **`pfmea_failure_modes`** and related rows linked to template **`operation_steps`** and to each step output’s stable **`id`** (see below).

**Deliverables**

- For each primary output (per step), at least one **failure mode** with defensible text; typically also **potential effects**, **potential causes**, **controls** (prevention / detection), and optionally **action items**—matching how the admin PFMEA UI expects rows.
- **`requirement_output_id`** on `public.pfmea_failure_modes` must match the app’s key for that output: the output’s JSON **`id`** string when present, or the index form `index:<n>` (see `requirementOutputKey` in `src/components/PFMEAManagement.tsx`). Keep this aligned with **Step 2** output `id` values.

**Failure mode = anti-requirement (direct negation of the output)**

- The **`failure_mode`** string is **not** a free-form narrative of “what could go wrong” in abstract terms. It is the **negation of the requirement/output** for that row: what is **wrong** if the output is **not** actually achieved, stated **concisely** and **tied to that same requirement**.
- Think: *Requirement / output (Step 2 `name`)* → *Failure mode* = the **opposite** or **unmet** state in short form.
- The failure mode must stay **strictly inside the requirement text that actually exists**. Do **not** pull in extra standards, hidden quality criteria, or implied adverbs that are **not specified** in the output. If the requirement is **`Supply disconnected`**, valid failure text is **`Supply not disconnected`**. Invalid examples include **`Supply not safely disconnected`** or **`Supply disconnected improperly`** unless **safe disconnection** or **proper disconnection** is itself an explicit requirement/output.
- If a distinct concept matters, make it a **separate requirement/output** first. Do **not** smuggle it into the failure-mode wording.
- Examples (pattern only):
  - Output **“Toilet drained”** → Failure mode **“Toilet not drained”**.
  - Output **“Bolt torqued to 45 ft-lbs minimum”** → Failure mode **“Torque below 45 ft-lbs”** (or **“Below minimum torque”** if the number lives in the requirement text only).
  - Output **“Shutoff verified”** → Failure mode **“Shutoff not verified”**.
- **Potential effects**, **causes**, and **controls** carry the richer explanation; the failure mode line stays **short** so the PFMEA grid shows an obvious **requirement ↔ anti-requirement** pair.

**Grid completeness (avoid “blank” failure-mode rows)**

- In the admin PFMEA grid, each **requirement** (one per step output) is rendered as one or more rows. If **no** `pfmea_failure_modes` row exists for that step’s `operation_step_id` and output key, the grid still shows the requirement with **empty** failure-mode columns (`failureMode: null` in `pfmeaFlatRows` in `PFMEAManagement.tsx`). That looks like a **blank** line for that output.
- Seed migrations for reference templates should ensure **every** Step 2 output you ship has **at least one** matching failure mode so those rows are not blank.
- Multiple **failure modes** can share the same `(operation_step_id, requirement_output_id)`; multiple **causes** under one failure mode produce **one grid row per cause**. Reference migrations often include **two causes per failure mode** (with prevention controls tied to each cause) so the analysis is visibly populated, not a single sparse line.

**Detection scores (`pfmea_controls.detection_score`, `control_type = 'detection'`)**

- Severity, occurrence, and detection scoring definitions live in **`public.pfmea_scoring`** and are shown in the app under **PFMEA → Scoring criteria** (`PfmeaScoringCriteriaDialog.tsx`). Step 8 SQL must assign detection scores **using that scale**, not ad-hoc low numbers.
- RPN in the app uses **severity × occurrence × minimum detection** among detection controls on the failure mode (`calculateRPN` in `PFMEAManagement.tsx`). **Lower** numeric detection score means **better** (easier) detection; **higher** means **worse** (harder to detect before impact).
- **Manual checks** (visual inspection, paper-towel tests, smell, subjective “feel,” operator judgment) should carry **higher** detection scores than methods that behave like automated verification, gages, or hard mistake-proofing—when the criteria table for those score bands says so. Do **not** default manual checks to scores 1–3 unless the `pfmea_scoring` rows for those scores clearly apply.

**DB placement** (see `src/integrations/supabase/types.ts`)

- `public.pfmea_failure_modes` — `project_id`, `operation_step_id`, `requirement_output_id`, `failure_mode`, `severity_score`
- `public.pfmea_potential_effects`, `public.pfmea_potential_causes`, `public.pfmea_controls`, `public.pfmea_action_items` — linked by foreign keys as in the schema.

**Step 8 SQL migrations**

- Use stable **`id`** UUIDs on inserted rows and **`ON CONFLICT (id) DO NOTHING`** (or equivalent) for idempotency. For **`pfmea_failure_modes`**, prefer **`ON CONFLICT (id) DO UPDATE`** on **`failure_mode`** (and **`severity_score`** if you revise it) so re-running a template migration refreshes anti-requirement wording without duplicating rows.
- **Validate every UUID literal** per **UUID literals in migrations** above—invalid UUIDs fail the whole batch after earlier inserts may have committed inside the same transaction, depending on runner behavior.
- Prerequisite: Steps **1–2** (steps + outputs with stable output `id`s) at minimum; typically run after **7** so workflow content is complete.

---

## C) Clarifications for steps (quick checklist)

- **All steps (1–8)** — Ship **one** migration file per step for a given project slug (see **One migration file per project-development step** above). Never duplicate the same step number across multiple files.

- **Step 1**
  - Must include instructions at **all 3 levels** (beginner/intermediate/advanced) for each step.
  - Instructions belong in `public.step_instructions`, not embedded as defaults elsewhere.
  - `INSERT` into `public.operation_steps` must use only columns that exist in schema (see **Schema alignment** above).
  - Deliver as **one** migration file for Step 1 (see **One migration file per project-development step**); add extra `DO` blocks for additional `project_id`s, not extra files.

- **Step 2**
  - Output `name` length: **≤ 50 chars** (prefer **< 30**).
  - Outputs stored in `public.operation_steps.outputs`.

- **Step 3**
  - Only risks that affect **timeline** or **budget**.
  - Quality risks handled in **PFMEA** instead.

- **Step 4**
  - Tools **must** exist in **`public.tools`**; migrations insert missing rows by **`name`**, then assign to steps.
  - Variants: if required, assert `tool_variations` or fail loudly.

- **Step 5**
  - Materials **must** exist in **`public.materials`**; migrations insert missing rows by **`name`**, then assign to steps.
  - Repeat tool bootstrap here (idempotent) so catalog is complete if step order is wrong.

- **Step 6**
  - Migration file = **process variables only** (no `INSERT` into tools/materials catalogs; those are steps 4–5).
  - Include **at least one** **`process`** variable per step that needs coverage; **`upstream`** is **optional** (not required per step).
  - Each entry sets **`type`** to **`process`** and/or **`upstream`**. Optional author **`input`** in app code maps to stored **`upstream`**.
  - Process variables are **intrinsic**, **measurable**, and have **target ranges** with units (in prose/`unit` field) where applicable.
  - Not “tool choice,” not “brand,” not “material SKU.”
  - Persist on **`operation_steps.process_variables`**. Run after steps 1–5 so template steps exist.

- **Step 7**
  - Low = 10th percentile, High = 90th percentile, Med = average (with evidence rules).
  - Must normalize to scaling unit for scaled steps.
  - Must reason step-by-step; split into chunks if many steps.

- **Step 8**
  - PFMEA only—not timeline/budget risks (those are Step 3).
  - `requirement_output_id` matches Step 2 output **`id`** (or `index:<n>`), consistent with the PFMEA UI (`requirementOutputKey`).
  - **`failure_mode`** text = **anti-requirement**: concise **negation of that output’s requirement**, not a long independent scenario (see **Failure mode = anti-requirement** under Step 8 above).
  - Do **not** add words that are not present in the requirement/output. No implied qualifiers such as **`safely`**, **`properly`**, **`fully`**, **`leak-free`**, **`securely`**, etc. unless the requirement explicitly includes them.
  - Cover **every** seeded Step 2 output with at least one failure mode so the PFMEA grid does not show blank failure-mode rows for those outputs; add multiple causes (and linked prevention controls) when a fuller reference table is desired.
  - **Detection** scores on `pfmea_controls` must follow **`pfmea_scoring`** / Scoring criteria: manual and subjective detection methods use **higher** numeric scores (worse detection) than justified automated or gage-based methods.
  - All inserted UUID literals must be syntactically valid: the **last group is exactly 12 hex digits** (see **UUID literals in migrations**).
  - Idempotent inserts with explicit ids and `ON CONFLICT` where appropriate.

