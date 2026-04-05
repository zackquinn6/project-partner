# AI Project Development Reference (DB-first)

This document is intended as a **strict reference for AI** when the user prompts:

> **“Complete step X of project development for project ‘[project name]’ with project id [xyz123]”**

Where **Step X** is one of the steps defined below (**Step 1** through **Step 10**).

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

- **Exactly one SQL file per Step** (Step 1 … Step 10 as defined in section B). Do not split a single step across multiple migration files (for example, do not add a second “Step 1” file when another `project_id` needs the same workflow—extend the existing Step 1 file instead).
- **Multiple template projects** that need the same step: put **one PostgreSQL `DO $$ … END $$;` block per `project_id`** in that step’s file, in stable order, with comments separating blocks. Each block uses its own stable operation/step UUIDs. If there is only one target `project_id`, use **one** `DO` block.
- **Steps 3–9** for the same template must use the **same** `v_project_id` as Steps 1–2, and any `UPDATE public.operation_steps … WHERE id = …` must reference the **same** `operation_steps.id` values created in **Step 1** for that project (Step 9 PFMEA rows reference those steps via `operation_step_id`). **Step 2** only inserts/updates **`public.step_instructions`** for those step ids. **Step 10** is **project-level copy only** (`projects.description`, `projects.project_challenges`); it does not touch `operation_steps`.
- **Naming:** use a single slug and step number, e.g. `YYYY_MM_DD_migration_<project_slug>_step<N>[_<qualifier>].sql`. Use a **qualifier** only when two different migrations would both be “step N” by number but different in purpose (outputs vs risks vs tools). Example (Toilet Replacement, project `f46b9b02-de31-42e0-ab04-5409ed1f21ee`):
  - `2026_03_30_migration_toilet_replacement_step1.sql` — Step 1 (structure); legacy combined files may still include Step 2 content—prefer splitting new work into dedicated step 1 + step 2 migrations
  - `…_step2_instructions.sql` (or equivalent) — Step 2 (3-level `step_instructions` only)
  - `2026_03_26_migration_toilet_replacement_step2_outputs.sql` — **renumber to Step 3** in new workflows: outputs
  - `2026_03_26_migration_toilet_replacement_step3_project_risks.sql` — Step 4
  - `2026_03_26_migration_toilet_replacement_step4_tools.sql` — Step 5
  - `2026_03_30_migration_toilet_replacement_step5_materials.sql` — Step 6
  - `2026_03_30_migration_toilet_replacement_step6_process_variables.sql` — Step 7
  - `2026_03_30_migration_toilet_replacement_step7_time_estimates.sql` — Step 8
  - `2026_03_30_migration_toilet_replacement_step8_pfmea.sql` — Step 9
  - `YYYY_MM_DD_migration_<project_slug>_step10_project_copy.sql` — Step 10 (description + project challenges)
- Do **not** encode `project_id` in the **filename**; the project is identified inside the SQL (`v_project_id` or comments).

### Library bootstrap inside steps 5–6 (tools + materials)

- **Step 5 migrations** begin by **inserting missing `public.tools` rows** when no row with the same `name` exists (`INSERT … SELECT … WHERE NOT EXISTS (SELECT 1 FROM public.tools t WHERE t.name = v.n)`). Include every **NOT NULL** / check-constrained column the database enforces (e.g. **`category`** — the admin tools UI uses `PPE`, `Hand Tool`, `Power Tool`, `Other`; align inserts to that set). Use real `name` / `description` / required numeric fields (e.g. `specialty_scale`); do not invent silent defaults on step rows—only explicit catalog inserts.
- **Step 6 migrations** do the same for **`public.materials`** (match on `name`), and **repeat the same tools list** as step 5 so running step 6 alone still leaves the tool catalog sufficient for step 5’s assignments if step 5 was skipped in a bad order (idempotent).
- **Step 7 migrations do not** insert into **`public.tools`** or **`public.materials`**. Step 7 is **only** `operation_steps.process_variables` (plus project cache refresh). Catalog and step-level tools/materials belong in steps **5** and **6**.
- After bootstrap in steps 5–6, migrations should still **resolve IDs** (or `RAISE`) if a row is missing—e.g. permissions, renamed catalog, or schema mismatch—so failures remain loud.

### Schema alignment (avoid 42703 / “column does not exist”)

- **Before writing `INSERT`/`UPDATE` SQL**, confirm column names against a **real source of truth**: e.g. `src/integrations/supabase/types.ts` (reflects the linked database) or `\d table_name` / information_schema in the target DB.
- **Do not copy column lists from older migrations or from other products** unless you verify each column still exists.
- **Lesson:** `public.operation_steps` in this project **does not** include `content_type`, `content`, or `content_sections`. Putting narrative instructions only in `step_instructions`; optional single-line context belongs in `operation_steps.description` if needed.

---

## B) The “project development” steps (what Step X means)

### Step 1 — Operations, steps, and step description (structure only)

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

**Do not include in Step 1:** 3-level instruction body content. That is **Step 2** (`public.step_instructions`).

**DB placement**

- Operations → `public.phase_operations`
- Steps → `public.operation_steps` (title + description at minimum)

**Prerequisite / cache**

- After inserting/updating normalized workflow rows, **refresh** the project phases JSON cache when applicable:
  - `UPDATE public.projects SET phases = public.rebuild_phases_json_from_project_phases(<project_id>) WHERE id = <project_id>;`

**Process map / Structure Manager — descriptions (phases, operations, steps)**

In the admin **Process Map** (**Structure Manager**), **phase**, **operation**, and **step** description fields are **single-line summaries of what that unit covers**. They answer *what this block of work is about*, not *how to execute it step-by-step*.

- **Do write:** One tight sentence or phrase that states **outcome, scope, or intent** of the phase/operation/step in plain language.
- **Do not write:** A **numbered or bulleted procedure**, a **laundry list of sub-tasks**, or **instructional sequencing** (“first… then… then…”). That content belongs in **`public.step_instructions`** (**Step 2**), not in these description fields.

**Where each description lives**

| Level     | DB field |
|----------|----------|
| Phase    | `public.project_phases.description` |
| Operation | `public.phase_operations.operation_description` |
| Step     | `public.operation_steps.description` |

**Examples (pattern only)**

- **Phase — Prepare Subfloor:** *Bring the structural floor to a clean, sound, flat plane and install an appropriate tile underlayment system.*
- **Phase — Install:** *Tile layout, cutting, and setting.*

Operation and step descriptions follow the same rule: **one line**, **summary of what happens**, not a mini–work instruction.

**Writing guidance for process map names and step copy**

- Minimize use of the word **`the`** in operation names and step titles when it is not needed for clarity.
- Prefer concise naming:
  - Use **`Reconnect water supply line`** instead of **`Reconnect the water supply line`**
- **Describe, don't instruct** in `public.operation_steps.description` (and in phase/operation descriptions as above).
- Step descriptions should name the work or resulting scope, not tell the user how to do it.
- Prefer short descriptive phrases such as **`Toilet placement and bolt installation`** instead of instructional sentences such as **`Lower the toilet onto the bolts, compress the seal, and tighten nuts evenly until stable`**.
- Put execution guidance, sequencing, cautions, and technique details in the 3 instruction levels under `public.step_instructions` (**Step 2**), not in the step description.

### Step 2 — 3-level instructions (`step_instructions`)

**Prerequisite**

- **Step 1** must have created every `public.operation_steps` row. Step 2 references each step by **`step_id`** → `operation_steps.id`.

**Deliverables**

- For **each** step from Step 1, author **instructions at all 3 levels**:
  - beginner
  - intermediate
  - advanced

**DB placement**

- `public.step_instructions` — typically **3 rows per step** (`instruction_level` + JSONB `content`).

**Writing guidance (instruction content)**

- Minimize unnecessary use of **`the`** in instruction prose when clarity does not require it.
- **Describe vs instruct:** phase/operation/step **descriptions** (Step 1) stay one-line scope; **how-to**, sequencing, cautions, and technique belong here in `content`, not in `operation_steps.description`.

### Step 3 — Outputs for each step

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

### Step 4 — Project Risks

**Deliverables**

- A set of project risks focused on:
  - **timeline impact**
  - **budget impact**
- Do **not** focus on quality risks here:
  - Quality risks are covered via **PFMEA**, not the generic risks list.

**DB placement**

- Use the project’s risk-management storage (whatever the app’s canonical risk tables are).
- If the exact storage tables are unknown in the current context, first locate them in the schema/types and then insert/update accordingly. Do not invent a new storage pattern.

### Step 5 — Tools list

**Deliverables**

- A tools list required for the project (and per-step associations if required by the product).

**Hard requirement**

- **Tools must exist in `public.tools`** (and `tool_variations` when a step references a variant).
- **Migrations:** insert the canonical tool row **when missing** (see **Library bootstrap inside steps 5–6**), then attach library IDs to steps. If a row still cannot be resolved after insert, **fail with an explicit `RAISE`** listing what is wrong—do not leave orphan JSON with fake IDs.

**DB placement**

- Step-level tools live in `public.operation_steps.tools` (JSON).
- Library catalog: `public.tools` / `tool_variations`.

### Step 6 — Materials list

**Deliverables**

- A materials list required for the project (and per-step associations if required).

**Hard requirement**

- **Materials must exist in `public.materials`** (and `materials_variants` when a step references a variant).
- **Migrations:** insert the canonical material row **when missing** (match on `name`, same pattern as tools), then attach IDs to steps. If still missing, **`RAISE`** with a clear message.

**DB placement**

- Step-level materials live in `public.operation_steps.materials` (JSON).
- Library catalog: `public.materials` / `materials_variants`.

### Step 7 — Process variables

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
- **Step 7 SQL migrations** contain **only** process-variable `UPDATE`s (and `rebuild_phases_json_from_project_phases`). Do **not** duplicate tools/materials library inserts here—that is steps **5** and **6**.

### Step 8 — Time estimates (low, med, high) for each step

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

- Assess project size (number of steps) and split the work into **reasonable chunks** when completing Step 8.
- Do not guess a single blanket time for many steps; each step should have its own estimate.

**DB placement**

- `public.operation_steps.time_estimate_low`
- `public.operation_steps.time_estimate_med`
- `public.operation_steps.time_estimate_high`

### Step 9 — PFMEA (failure modes and related rows)

**Role**

- **Step 4** stores **project risks** (timeline / budget). **Quality** failure analysis belongs in **PFMEA** tables, not in `project_risks`.
- Step 9 migrations seed **`pfmea_failure_modes`** and related rows linked to template **`operation_steps`** and to each step output’s stable **`id`** (see below).

**Deliverables**

- For each primary output (per step), at least one **failure mode** with defensible text; typically also **potential effects**, **potential causes**, **controls** (prevention / detection), and optionally **action items**—matching how the admin PFMEA UI expects rows.
- **`requirement_output_id`** on `public.pfmea_failure_modes` must match the app’s key for that output: the output’s JSON **`id`** string when present, or the index form `index:<n>` (see `requirementOutputKey` in `src/components/PFMEAManagement.tsx`). Keep this aligned with **Step 3** output `id` values.

**Failure mode = anti-requirement (direct negation of the output)**

- The **`failure_mode`** string is **not** a free-form narrative of “what could go wrong” in abstract terms. It is the **negation of the requirement/output** for that row: what is **wrong** if the output is **not** actually achieved, stated **concisely** and **tied to that same requirement**.
- Think: *Requirement / output (Step 3 `name`)* → *Failure mode* = the **opposite** or **unmet** state in short form.
- The failure mode must stay **strictly inside the requirement text that actually exists**. Do **not** pull in extra standards, hidden quality criteria, or implied adverbs that are **not specified** in the output. If the requirement is **`Supply disconnected`**, valid failure text is **`Supply not disconnected`**. Invalid examples include **`Supply not safely disconnected`** or **`Supply disconnected improperly`** unless **safe disconnection** or **proper disconnection** is itself an explicit requirement/output.
- When the requirement/output is **quantified**, the failure mode should also be **quantified** as the unmet threshold, not generic "not achieved" wording.
- Examples:
  - Output **`100% coverage on intended zones`** → Failure mode **`<100% coverage`**
  - Output **`No bead >1/4"`** → Failure mode **`Bead >1/4"`**
  - Output **`Torque >= 45 ft-lbs`** → Failure mode **`Torque < 45 ft-lbs`**
- If a distinct concept matters, make it a **separate requirement/output** first. Do **not** smuggle it into the failure-mode wording.
- Examples (pattern only):
  - Output **“Toilet drained”** → Failure mode **“Toilet not drained”**.
  - Output **“Bolt torqued to 45 ft-lbs minimum”** → Failure mode **“Torque below 45 ft-lbs”** (or **“Below minimum torque”** if the number lives in the requirement text only).
  - Output **“Shutoff verified”** → Failure mode **“Shutoff not verified”**.
- **Potential effects**, **causes**, and **controls** carry the richer explanation; the failure mode line stays **short** so the PFMEA grid shows an obvious **requirement ↔ anti-requirement** pair.
- **Prevention controls** must be a **specific control method**, not a general instruction or generic skill statement.
- Valid prevention-control examples include explicit methods such as a named **tool**, a specific **work instruction**, a linked **video**, or a defined **training/certification method** such as **`2-day caulking course with demo certification`**.
- Do **not** use generic prevention controls like **`follow instructions carefully`**, **`use experience`**, **`steady application`**, or broad craft advice with no concrete control method behind it.
- Prefer a **tool-based** prevention control when one exists.
- If there is **no specific prevention control method**, leave the prevention control **blank** rather than filling it with generic guidance.

**Grid completeness (avoid “blank” failure-mode rows)**

- In the admin PFMEA grid, each **requirement** (one per step output) is rendered as one or more rows. If **no** `pfmea_failure_modes` row exists for that step’s `operation_step_id` and output key, the grid still shows the requirement with **empty** failure-mode columns (`failureMode: null` in `pfmeaFlatRows` in `PFMEAManagement.tsx`). That looks like a **blank** line for that output.
- Seed migrations for reference templates should ensure **every** Step 3 output you ship has **at least one** matching failure mode so those rows are not blank.
- Multiple **failure modes** can share the same `(operation_step_id, requirement_output_id)`; multiple **causes** under one failure mode produce **one grid row per cause**. Reference migrations often include **two causes per failure mode** (with prevention controls tied to each cause) so the analysis is visibly populated, not a single sparse line.

**Detection scores (`pfmea_controls.detection_score`, `control_type = 'detection'`)**

- Severity, occurrence, and detection scoring definitions live in **`public.pfmea_scoring`** and are shown in the app under **PFMEA → Scoring criteria** (`PfmeaScoringCriteriaDialog.tsx`). Step 9 SQL must assign detection scores **using that scale**, not ad-hoc low numbers.
- RPN in the app uses **severity × occurrence × minimum detection** among detection controls on the failure mode (`calculateRPN` in `PFMEAManagement.tsx`). **Lower** numeric detection score means **better** (easier) detection; **higher** means **worse** (harder to detect before impact).
- **Manual checks** (visual inspection, paper-towel tests, smell, subjective “feel,” operator judgment) should carry **higher** detection scores than methods that behave like automated verification, gages, or hard mistake-proofing—when the criteria table for those score bands says so. Do **not** default manual checks to scores 1–3 unless the `pfmea_scoring` rows for those scores clearly apply.

**DB placement** (see `src/integrations/supabase/types.ts`)

- `public.pfmea_failure_modes` — `project_id`, `operation_step_id`, `requirement_output_id`, `failure_mode`, `severity_score`
- `public.pfmea_potential_effects`, `public.pfmea_potential_causes`, `public.pfmea_controls`, `public.pfmea_action_items` — linked by foreign keys as in the schema.

**Step 9 SQL migrations**

- Use stable **`id`** UUIDs on inserted rows and **`ON CONFLICT (id) DO NOTHING`** (or equivalent) for idempotency. For **`pfmea_failure_modes`**, prefer **`ON CONFLICT (id) DO UPDATE`** on **`failure_mode`** (and **`severity_score`** if you revise it) so re-running a template migration refreshes anti-requirement wording without duplicating rows.
- **Validate every UUID literal** per **UUID literals in migrations** above—invalid UUIDs fail the whole batch after earlier inserts may have committed inside the same transaction, depending on runner behavior.
- Prerequisite: Steps **1–3** (structure + instructions + outputs with stable output `id`s) at minimum; typically run after **8** so workflow content is complete.

### Step 10 — Project description and project challenges

**Role**

- Step 10 finalizes **catalog-facing narrative** on the template project row: a **very short purpose summary** (`description`) and a **tiny experiential read on the hardest moments** (`project_challenges`) so someone can **decide** if the project fits their skill and appetite. Separate from step-level instructions (**Step 2**), timeline/budget risks (**Step 4**), and quality PFMEA (**Step 9**).

**Hard limits (both fields)**

- **`description`** and **`project_challenges`** each: **maximum 200 characters** (count spaces and punctuation). **Target ≤ 150 characters** when possible.
- Before shipping SQL or copy, **count characters** on the final string; do not exceed 200.

**Deliverables**

1. **`public.projects.description`** — **Catalog overview**, not a procedure list.

   **What it is *not***

   - **Not** a list of every step, operation, or micro-task in the workflow. The full sequence belongs in the process map and `step_instructions`, not in `description`.
   - **Not** a long paragraph; the **character limit** forces compression.

   **Required structure (integrate into coherent prose within the character budget)**

   Fit all three layers into the allowed length—often **one tight sentence** or **2–3 very short lines** of continuous prose (no bullets). Order:

   1. **Key steps (phases)** — **Only high-level phases** from this template (**2–3**; **max 4**), as **phase-level** labels or micro-phrases—not individual `operation_steps` titles.
   2. **Typical areas in the home** — Where the work usually happens (e.g. bathroom, kitchen). Credible and template-aligned only.
   3. **Purpose / benefit** — Outcome in plain language (durable floor, stop leaks, etc.).

   **Alignment and research**

   - Stay aligned with **this template’s phases and scope**; light research only when consistent. Do **not** duplicate `step_instructions`.

   **Example (tile — pattern only; length illustrative, stay under your budget):**  
   *Prep, set, and grout tile in kitchens and baths for a durable, lasting floor.*

2. **`public.projects.project_challenges`** — **Narrative only** — **not** a list of risks or challenges.

   **Form and focus**

   - Write as **flowing prose** (one small paragraph). **Do not** write as a **catalog** of separate risks (no “Risk 1 / Risk 2,” no stacked clauses that read like a bullet list without bullets, no inventory of disconnected hazards).
   - Center on **what the person may actually feel or notice**—doubt, timing pressure, cramped space, “is this good enough?”—and on the **hardest specific zones or moments** in the job (e.g. corners, ceiling line, flange, last coat, first full row).
   - **2–3 short lines** of narrative in the UI sense is fine, but the **hard cap is character count**: **≤ 200 characters**, **≤ 150** ideal—same as **`description`**.

   **Intent (must not duplicate the description)**

   - Answers: *“Where does this get ugly for a real homeowner?”* **Not** a second description, **not** a re-list of phases/steps, **not** Step 4 or Step 9 content.

   **Authoring inputs:** Template choke points + light research; stay consistent with scope.

   - Tone: direct; no lecturing.

   **Examples (narrative, experience + hot spots; each under ~150 characters):**

   - **Tile:** *You’ll second-guess flatness before you set; big tile and tight corners punish rushed grout timing.*

   - **Interior painting:** *Ceiling lines and big walls show every waver; dust sneaking in before the last coat is the quiet killer.*

   - **Toilet:** *Cramped bath, scary shutoff, easy flange damage lifting the bowl—then a slow leak you notice days later.*

**DB placement**

- `public.projects.description` — text / nullable per live schema (`src/integrations/supabase/types.ts`).
- `public.projects.project_challenges` — text / nullable; canonical column (legacy `diy_length_challenges` may exist in some contexts—prefer **`project_challenges`** for new work).

**Step 10 SQL migrations**

- **`UPDATE public.projects`** (or equivalent) setting **`description`** and **`project_challenges`** for `v_project_id`, after verifying the row exists (e.g. `IF NOT FOUND THEN RAISE`).
- Each string must respect **`char_length(description) ≤ 200`** and **`char_length(project_challenges) ≤ 200`** (prefer ≤ 150). Validate when authoring.
- **No** `rebuild_phases_json_from_project_phases` required solely for these fields unless other workflow rows in the same migration also changed normalized phases.
- **Idempotent:** safe to re-run with the same final text (e.g. `UPDATE … WHERE id = v_project_id`).
- Typically run **after** Steps **1–9** so copy reflects the built workflow; do not contradict steps, risks, or PFMEA seed data.

---

## C) Clarifications for steps (quick checklist)

- **All steps (1–10)** — Ship **one** migration file per step for a given project slug (see **One migration file per project-development step** above). Never duplicate the same step number across multiple files.

- **Step 1**
  - **Structure only:** phases (as needed), operations, steps with titles and **one-line** descriptions on `operation_steps` / process map fields. **No** `step_instructions` rows in this step.
  - `INSERT` into `public.operation_steps` must use only columns that exist in schema (see **Schema alignment** above).
  - Minimize unnecessary use of **`the`** across process map names and step titles.
  - **Process map descriptions** (`project_phases.description`, `phase_operations.operation_description`, `operation_steps.description`): **one line** each — summary of **what happens** in that phase/operation/step; **not** a list of instructions or procedural steps (see **Process map / Structure Manager — descriptions** in Step 1 above).
  - For `public.operation_steps.description`, follow **describe, don't instruct**: description = scope/state label; how-to belongs in **Step 2**.
  - Deliver as **one** migration file for Step 1 (see **One migration file per project-development step**); add extra `DO` blocks for additional `project_id`s, not extra files.

- **Step 2**
  - **Instructions only:** for every `operation_steps` row from Step 1, **`public.step_instructions`** at **all 3 levels** (beginner / intermediate / advanced). Do not embed instruction prose as defaults on `operation_steps`.
  - Prerequisite: Step 1 complete (stable `step_id` values).

- **Step 3**
  - Output `name` length: **≤ 50 chars** (prefer **< 30**).
  - Outputs stored in `public.operation_steps.outputs`.

- **Step 4**
  - Only risks that affect **timeline** or **budget**.
  - Quality risks handled in **PFMEA** instead.

- **Step 5**
  - Tools **must** exist in **`public.tools`**; migrations insert missing rows by **`name`**, then assign to steps.
  - Variants: if required, assert `tool_variations` or fail loudly.

- **Step 6**
  - Materials **must** exist in **`public.materials`**; migrations insert missing rows by **`name`**, then assign to steps.
  - Repeat tool bootstrap here (idempotent) so catalog is complete if step order is wrong.

- **Step 7**
  - Migration file = **process variables only** (no `INSERT` into tools/materials catalogs; those are steps **5–6**).
  - Include **at least one** **`process`** variable per step that needs coverage; **`upstream`** is **optional** (not required per step).
  - Each entry sets **`type`** to **`process`** and/or **`upstream`**. Optional author **`input`** in app code maps to stored **`upstream`**.
  - Process variables are **intrinsic**, **measurable**, and have **target ranges** with units (in prose/`unit` field) where applicable.
  - Not “tool choice,” not “brand,” not “material SKU.”
  - Persist on **`operation_steps.process_variables`**. Run after steps **1–6** so template steps (and prior enrichments) exist.

- **Step 8**
  - Low = 10th percentile, High = 90th percentile, Med = average (with evidence rules).
  - Must normalize to scaling unit for scaled steps.
  - Must reason step-by-step; split into chunks if many steps.

- **Step 9**
  - PFMEA only—not timeline/budget risks (those are **Step 4**).
  - `requirement_output_id` matches **Step 3** output **`id`** (or `index:<n>`), consistent with the PFMEA UI (`requirementOutputKey`).
  - **`failure_mode`** text = **anti-requirement**: concise **negation of that output’s requirement**, not a long independent scenario (see **Failure mode = anti-requirement** under Step 9 above).
  - Do **not** add words that are not present in the requirement/output. No implied qualifiers such as **`safely`**, **`properly`**, **`fully`**, **`leak-free`**, **`securely`**, etc. unless the requirement explicitly includes them.
  - Cover **every** seeded **Step 3** output with at least one failure mode so the PFMEA grid does not show blank failure-mode rows for those outputs; add multiple causes (and linked prevention controls) when a fuller reference table is desired.
  - **Detection** scores on `pfmea_controls` must follow **`pfmea_scoring`** / Scoring criteria: manual and subjective detection methods use **higher** numeric scores (worse detection) than justified automated or gage-based methods.
  - All inserted UUID literals must be syntactically valid: the **last group is exactly 12 hex digits** (see **UUID literals in migrations**).
  - Idempotent inserts with explicit ids and `ON CONFLICT` where appropriate.

- **Step 10**
  - Updates **`public.projects.description`** and **`public.projects.project_challenges`** only (project-level copy).
  - **Both fields:** **≤ 200 characters** each (hard max), **≤ 150** ideal—count before ship.
  - **Description** = structured overview (**not** a full step list) within the limit: **(1)** **2–3** high-level **phases** (**max 4**), **(2)** **typical home areas**, **(3)** **purpose/benefit**. See **Step 10** in section B.
  - **Project challenges** = **narrative prose** (experience + hardest specific zones/moments); **not** a list or catalog of risks. Same length rules as description. **Not** a re-list of phases/steps; **not** Step 4 / Step 9.
  - Verify **`projects.id`** exists before `UPDATE`; fail loudly if missing.
  - No PFMEA, no `operation_steps`, no phase JSON rebuild required **solely** for these two fields.

