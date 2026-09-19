# AI Project Development Reference (DB-first)

**Use when:** admin asks to complete **Step 1-10** of project development for a named template (`project_id`), says **follow ai dev guide** / **ref ai dev guide** (or similar), asks to **build out** the content for a named project or for **standard phases / Standard Foundation**, or asks to research/add/update **home maintenance** `maintenance_templates` (§G).

**"Ref ai dev guide and build out project X" / "Build out content for project X ref ai dev guide" is a complete instruction.** It means: run §H end to end for that template - owned phases only (unless the user explicitly named Standard Foundation / standard phases - see H.1), full completeness audit, every required component, draft per-step SQL then ship one bundle under `supabase/migrations/` (§H.5), **commit and push**, and **name the migration path(s) in the final report**. Do not ask which steps, which phases, or which deliverable format; §H already answers all three.

**Sources of truth:**
- **Shared product rules** (structure limits, publishing checklist, instruction levels, cross-cutting product meaning): `src/utils/projectPlanningStandard.ts` - generated block below. Human Planning Guide in admin Project Management reads the same module.
- **Authoring / SQL SoT** for Steps 1–10: §A / §B field catalogs below (no duplicate checklist elsewhere for SQL). Verify every write against `src/integrations/supabase/types.ts` and `src/interfaces/Project.ts`. For maintenance catalog work, use **§G** instead of Steps 1–10.

---

## Non-negotiables

- No silent defaults, fallback logic, or COALESCE-with-fake-defaults; NULL → handle explicitly or fail.
- No hardcoded strings for state; no hardcoded business logic—use DB fields and relationships.
- Fix root causes; if the app needs a workaround to run, let it fail—do not force it.
- **No em-dashes** (—) in authored catalog / user-facing prose (`description`, `project_challenges`, step instructions, risk copy, etc.). Standard dashes/hyphens (-) are okay.

---

## H) Build out a project (end-to-end protocol)

**Trigger:** "Ref ai dev guide and build out project X", "Build out content for project X ref ai dev guide", "build out the content for X", "complete project X", or the same phrasing aimed at **standard phases / Standard Foundation**. No further scoping questions are needed.

### H.1 Scope: owned phases only

| Phase kind | How to detect on `project_phases` | Treatment |
| ---------- | --------------------------------- | --------- |
| **Owned** | `is_standard IS NOT TRUE` **and** `is_linked IS NOT TRUE` **and** `source_phase_id IS NULL` **and** `source_project_id IS NULL` | **In scope.** Author operations, steps, instructions, and all enrichments here. |
| **Standard foundation** | `is_standard = true` (Kickoff, Plan, Ordering, Close style phases) | **Out of scope on a catalog project build out.** Read for context only. Never edit foundation content while building a non-standard template. **Exception:** when the user explicitly asks to review/build out **standard phases** or **Standard Foundation**, author on the foundation project (`projects.is_standard = true` root) - those phases are in scope there. |
| **Linked / adopted from another template** | `is_linked = true` or `source_project_id` / `source_phase_id` set | **Out of scope.** Owned by the source template; edits there would change every project that adopted it. |

- Build the owned-phase list **from these columns**, never from phase names.
- Never add, rename, reorder, or delete phases during a build out. If owned phases cannot carry the scope, **report it and stop** (Step 1 rule).
- Gaps found inside a standard or adopted phase go in the final report as a note naming the source template. Do not patch them in this project (unless this request is the foundation exception above).
- `allow_content_edit = true` on a step inside a standard phase is **not** an invitation to author it on a host template; it only unlocks admin editing.

### H.2 Audit before authoring

Read the current state first, then author. Produce a per-step matrix over **all** owned steps (not just recently touched ones) with one column per required component:

| Component | Source of truth | Guide step |
| --------- | --------------- | ---------- |
| Step exists with title, description, `display_order`, `flow_type`, `step_type`, `number_of_workers`, `skill_level` | `operation_steps` | 1 |
| 3 instruction levels with Background / Instructions / Error-Recovery | `step_instructions` | 2 |
| Outputs | `operation_steps.outputs` | 3 |
| Tools (+ alternates) | `tools` library + `operation_steps.tools` | 5 |
| Materials (+ alternates) | `materials` library + `operation_steps.materials` | 6 |
| Process variables | `operation_steps.process_variables` | 7 |
| Time estimates low / med / high | `operation_steps.time_estimate_*` | 8 |
| Failure modes where relevant | `pfmea_requirements` → `pfmea_failure_modes` → effects / causes / controls | 9 |
| Quality goal levels (3 rows) | `project_quality_levels` | 11 |
| Quality-gated steps | `operation_steps.min_quality_goal` | 11 |

Project-level components audited once: `project_risks` (Step 4, including component and scores on every row), `projects.description` / `project_challenges` (Step 10), `project_quality_levels` (Step 11, all three levels), `scheduling_prerequisites` (§E), catalog header (§D).

**Check the JSON shape against the component that reads it, not against what is already stored.** Step JSON written by an older authoring surface can be structurally stale (for example tool rows keyed on `coreItemId` render with no name in `CompactToolsTable`). A populated column is not the same as a working one.

**A component counts as present only if it is complete for that step.** One instruction level out of three, or a tools array with no alternates where substitution is realistic, is a gap.

### H.3 Authoring order (fixed)

1. **Structure** (Step 1): phases → operations → steps. Confirm structure limits and durations from the generated standard, confirm `step_type` and `number_of_workers` (waiting/cure steps = 0 workers), and fix ordering before writing any prose. Structure churn after instructions exist wastes the instruction work.
2. **Instructions** (Step 2): 3 levels per step, section intent per §B.
3. **Outputs** (Step 3) - needed before PFMEA, which keys on output ids.
4. **Tools** (Step 5), then **Materials** (Step 6), including library bootstrap (H.4).
5. **Process variables** (Step 7), then **time estimates** (Step 8).
6. **Project risks** (Step 4), then **PFMEA** (Step 9).
7. **Quality goals** (Step 11): `project_quality_levels` + `min_quality_goal` on owned steps that differ by level.
8. **Catalog copy** (Step 10) and schedule prerequisites (§E) last, once scope is settled.

### H.4 General library bootstrap is expected

Adding rows to the shared `public.tools` and `public.materials` catalogs is **normal build-out work, not an exception**. Do not skip a tool or material because it is missing from the library, and do not inline a step-only item that other projects would reasonably reuse.

- Match by `name`; insert when absent with every NOT NULL / constrained column filled (`tools.category` ∈ `PPE` / `Hand Tool` / `Power Tool` / `Other`; `materials.category` ∈ `Components` / `Consumables` / `PPE`).
- Write generic library copy (`description`, `unit`, `unit_size`, `alternates`) that reads correctly for any project, then keep project-specific quantities and coverage in the step JSON.
- Resolve library ids after bootstrap or **RAISE**. No orphan JSON with invented ids.

### H.5 Deliverable

**Author separately, ship as one file.**

1. **During development:** write one SQL file per guide step (and the content audit) under `supabase/migrations/` so each step can be applied and debugged on its own. Filename while drafting: `YYYYMMDDHHMMSS_<slug>_step<N>[_qualifier].sql` (plus `_content_audit.sql`). Keep blocks idempotent and `RAISE` on missing prerequisites (§A).
2. **Before commit / push:** concatenate those step files **in H.3 order** (structure → instructions → outputs → tools → materials → process variables → time → risks → PFMEA → quality goals → catalog copy → audit) into **one** ship migration for that build-out: `YYYYMMDDHHMMSS_<slug>_<scope>_bundle.sql`. Delete the per-step draft files from `supabase/migrations/` in the same commit so only the bundle remains. Schema-only migrations (new tables/columns) stay separate from content bundles.
3. The ship file must stay runnable as-is: stable UUIDs, `ON CONFLICT` where appropriate, in-migration row-count checks (`GET DIAGNOSTICS` + `RAISE` on mismatch), and a closing content audit that asserts completeness per owned step (three instruction levels, outputs, tools, materials array, process variables, time estimates, structure metadata). Enforce only what the build out owns; report gaps outside it with `RAISE NOTICE`.
4. Rebuild the phases cache after any structure change (§A).
5. Commit and push the **bundle** (not the draft step files). Commit body lists which guide steps the bundle covers. Push is part of the instruction whenever the user asked to build out content ref this guide - do not stop at a local-only commit unless push is impossible (then report the blocker and the local commit SHA).
6. Final report **must** name the ship migration path(s) under `supabase/migrations/` so the user can apply them, plus the H.2 matrix after the change, anything intentionally left out, and gaps observed in standard or adopted phases (or, for a foundation build out, gaps left intentionally such as Step 11 quality goals).

---

<!-- PLANNING_STANDARD:BEGIN -->
## Shared product planning standard (generated)

**Version:** `1.4.2` - **Source of truth:** `src/utils/projectPlanningStandard.ts`

Do not hand-edit this block. Change the TypeScript module, then run `npm run sync:planning-standard`. Authoring/SQL field catalogs remain in §A / §B below.

### Product guidelines

- Keep instructions sequential, simple, and broken into clear phases.
- Number only actions the user performs; put context, why-it-matters, and completion meaning in Background/Need-to-Know - never as their own instruction step.
- Be specific about tools, materials, timing, and what "good" looks like.
- Update content regularly to reflect current techniques and standards.
- Put safety guidance upfront and explain why each step matters.
- Use visuals only when they add clarity or prevent confusion.
- Treat feedback as a signal for improvement and respond promptly.
- Monitor Success Scores and adjust content based on user outcomes.
- Maintain a supportive, human tone that builds confidence.
- Offer alternatives and quick fixes when tools or conditions vary.
- Keep version notes so updates stay consistent across the system.

### Instruction levels

- Levels: `beginner`, `intermediate`, `advanced`
- Every target step needs three instruction rows: beginner, intermediate, and advanced. Write level-appropriate detail; users see the level that matches their experience.

### Content axes (instruction, quality, customization)

| Axis | Values | Effect |
| ---- | ------ | ------ |
| **Instruction detail** (`instruction`) | beginner / intermediate / advanced | Same steps; different prose depth (and media) via step_instructions rows. |
| **Quality goal** (`quality`) | good / great / professional | Different process path: include or exclude steps and operations via min_quality_goal; outcome/process narrative via project_quality_levels (snapshotted onto the run). |
| **Customization** (`customization`) | prime / alternate / if-necessary (+ micro-decisions) | Branching choices. Do not overload if-necessary for quality ladder gating. |

- Axes are orthogonal. A beginner can run a Professional quality path (harder process with more scaffolding). Write all three instruction levels on quality-gated steps too.
- Do not confuse quality goal Professional (finish / process ladder) with catalog or step skill_level Professional (who the work is sized for). Use clear labels: Quality goal vs Skill level.

### Quality goals (Good / Great / Professional)

| Level | Outcome | Process |
| ----- | ------- | ------- |
| **Good** (`good`) | Functional, acceptable finish; visible DIY imperfections within stated tolerances. | Shortest owned path: core steps only. |
| **Great** (`great`) | Strong DIY finish; tighter tolerances and cleaner detailing. | Core path plus standard best-practice steps. Default for new runs. |
| **Professional** (`professional`) | Near-trade finish; strictest tolerances and presentation. | Great path plus extra prep and finish steps (sanding, leveling systems, seal always, extra QC, etc.). |

- Every catalog template that ships quality goals authors three project_quality_levels rows (kickoff_summary + outcome + process). kickoff_summary is the one-line kickoff Goals blurb for that project and level. Relative vs_lower_summary is required on great and professional. Process differences are real operation_steps (and phase_operations when a whole op is gated) with min_quality_goal, not prose alone. Quality-impact content is authored on the owning project only; adopted or linked phases display their source project rows without copying onto the host. At run create, copy contributing rows into project_run_quality_levels so impact copy stays frozen with the run.

### Project structure

TOOLIO PROJECT STRUCTURE - QUICK REFERENCE STANDARD. This standard defines what belongs at each level, how long each level should be, and the structural limits for every project.

**Hierarchy:** Phase → Operation → Step → Action

Phases & operations = project management. Steps = instructions. Actions = micro instructions inside step content (not a separate DB table).

#### Phase

- **Description:** Major milestone with a natural stopping point.
- **Purpose:** Organize the project into big, sequential chunks.
- **Contains:** No instructions.
- **Typical duration:** ½–1 day
- **Max duration:** 1 day
- **Count:** Unlimited phases per project (typical: 2–5).
- Represent a meaningful shift in the project.
- Have a clear "before/after" state.
- Allow a natural pause (you can stop for hours or overnight).
- Change tools, materials, or skill type.
- **Examples:** Removal → Install; Prep → Prime → Paint → Finish → Cleanup

#### Operation

- **Description:** A distinct task inside a phase that produces a specific outcome.
- **Purpose:** Break phases into teachable, outcome-based tasks.
- **Contains:** No instructions.
- **Typical duration:** 1–3 hours
- **Max duration:** 4 hours
- **Count:** Maximum 10 operations per phase.
- Produce a clear, observable result.
- Be teachable as a standalone skill.
- Use a consistent tool/material set.
- Not require stopping mid operation.
- **Examples:** Set toilet; Connect water; Patch walls; Cut in edges

#### Step

- **Description:** The instructional unit - everything the user needs to complete one part of an operation.
- **Purpose:** Deliver complete, actionable guidance.
- **Contains:** Instructions (Actions) with full metadata.
- **Typical duration:** 5–30 minutes (standard step).
- **Max duration:** 60 minutes (standard or scaled step).
- **Count:** Maximum 10 steps per operation.
- Include all required instructional metadata as defined in the standard.
- Be completable without splitting across multiple sessions in normal conditions.

#### Action

- **Description:** Micro instruction representing a single motion or micro-task.
- **Purpose:** Describe the smallest unit of observable work.
- **Contains:** One motion or micro instruction inside a step.
- **Typical duration:** Minutes.
- **Max duration:** Minutes.
- **Count:** Defined within a single step; not tracked independently at the project level.
- Be specific and observable (e.g., "Turn wrench ¼ turn").
- Be written so a user can complete it in one continuous motion or focus block.
- **Examples:** Turn wrench ¼ turn; Feather brush outward; Press evenly

#### Step requirements (every step)

- Instructions (Actions) with visual aids.
- Warnings.
- PPE list.
- Tool list.
- Material list.
- Inputs (factors that matter).
- Outputs (observable success criteria).
- Time estimate.
- Common mistakes.
- Variations / branching logic.
- Quality checks.
- Cleanup requirements.

#### Time standards summary

| Level | Typical | Max | Notes |
| ----- | ------- | --- | ----- |
| phase | ½–1 day | 1 day | Natural stopping point. |
| operation | 1–3 hours | 4 hours | Produces a specific outcome. |
| step | 5–30 minutes | 60 minutes | Atomic instructional unit. |
| action | Minutes | Minutes | One motion. |

### Publishing checklist (maps to §B Steps)

| Id | Checklist item | AI Step refs |
| -- | -------------- | ------------ |
| `instruction-levels` | **3 levels of instructions** - Beginner, Intermediate, and Advanced content for steps where it matters. | 2 |
| `tools-alternates` | **Tools & alternates** - Primary tools and alternate options defined for steps that require tools. | 5 |
| `materials-alternates` | **Materials & alternates** - Materials and quantities (and alternates where applicable) for each step. | 6 |
| `pfmea` | **PFMEA** - Process FMEA (failure modes and effects) completed where relevant for the project. | 9 |
| `risks` | **Risks** - Timeline and budget risks with mitigation strategies documented in project risk management. | 4 |
| `outputs-priorities` | **Outputs / priorities** - Key product or process outputs identified and documented (what "done" looks like). | 3 |
| `quality-control` | **Quality Control** - Quality control steps and criteria defined where applicable (step types and checks). | 1, 3 |
| `error-correction` | **Error Correction** - Guidance for common errors and how to correct them (Error-Recovery instruction sections). | 2 |
| `safety` | **Safety** - Safety guidance upfront and at relevant steps; reasons explained. | 2 |
| `quality-goals` | **Quality goals** - Good / Great / Professional outcome and process content, plus min_quality_goal on steps that differ by level. | 11 |

### Cross-cutting product rules

- **Waiting steps (drying, curing)** (`waiting-steps`): Engineer all waiting steps (e.g. paint dry, curing) as their own step with specific wait times, and set workers needed = 0.
- **Risks vs PFMEA** (`risks-vs-pfmea`): Project risks (Step 4) cover safety, schedule, and budget. Quality failure modes belong in PFMEA (Step 9), not the risk register. Risk titles name a concrete cause or failure mode a user can mitigate (e.g. "Expired thinset or mortar past use-by date", "Shelf-expired adhesives or finishes"), not a vague category ("Low-quality materials") or an outcome of many risks ("Underestimating project time").
- **Tools and materials alternates** (`alternates`): Where a step requires tools or materials, define primary items and alternate options when users may substitute brand, type, or pack size.
- **No em-dashes in catalog prose** (`no-em-dashes`): Do not use em-dashes in authored catalog / user-facing prose (descriptions, challenges, step instructions, risk copy). Use standard dashes or hyphens.
- **Actions vs database tables** (`actions-vs-db`): Hierarchy is Phase → Operation → Step → Action. Actions are instructional micro-units inside step_instructions content; they are not a separate database table. DB tables stop at operation_steps + step_instructions.
- **Step instruction sections** (`step-instruction-sections`): Background/Need-to-Know is valuable domain context (why it matters, timing, complexity, how the app helps) - not a restatement of what the step is. Instructions are numbered sequential actions only; do not number explanatory status or completion notes as their own steps - put that in Background or fold it into an adjacent action. Error-Recovery uses full-sentence context so the user can diagnose quickly (e.g. "If your list is missing something, finish your plan").
- **Owned vs standard and adopted phases** (`owned-vs-adopted-phases`): A project only owns the phases authored on it. Standard foundation phases and phases linked or adopted from another template are read-only inside this project: their phases, operations, steps, instructions, and enrichments are edited in the source template instead. Project content work covers owned phases only; gaps found in a standard or adopted phase get reported to the owner of that template, not patched locally.
- **Content completeness per step** (`content-completeness`): A project is content complete when every step in every owned phase satisfies the step requirements above: three instruction levels, outputs, tools, materials, process variables, time estimates, quality checks, and failure modes where relevant. Partial coverage is a gap list, not a finished project, so audit every owned step rather than the ones most recently touched.
- **Quality goals (Good / Great / Professional)** (`quality-goals`): Good, Great, and Professional are both outcome and process. Author three project_quality_levels rows per owning template, including kickoff_summary for the kickoff Goals one-liner. Gate extra process with operation_steps.min_quality_goal and phase_operations.min_quality_goal when a whole operation is quality-gated (null = all levels; great = Great+Professional; professional = Professional only). Do not overload if-necessary for quality gating. Adopted phases keep quality-impact content on the source project; runs snapshot contributing rows into project_run_quality_levels at create. Mid-run goal changes reshape incomplete forward steps and ops only; completed steps stay complete; Quality Control uses the current goal as the expected level.
- **Content axes (instruction, quality, customization)** (`content-axes`): Axes are orthogonal. A beginner can run a Professional quality path (harder process with more scaffolding). Write all three instruction levels on quality-gated steps too.
- **Professional naming (quality vs skill)** (`professional-naming`): Do not confuse quality goal Professional (finish / process ladder) with catalog or step skill_level Professional (who the work is sized for). Use clear labels: Quality goal vs Skill level.
<!-- PLANNING_STANDARD:END -->

---

## A) Schema, cache, migrations, data model

- **Columns:** Verify every `INSERT`/`UPDATE` against `src/integrations/supabase/types.ts` or the live DB. Do not copy column lists from old migrations.
- **`operation_steps`:** No `content_type` / `content` / `content_sections` here—prose lives in **`step_instructions`**; optional one-line scope in `operation_steps.description`.
- **Phases JSON cache** after normalized workflow changes:  
`UPDATE public.projects SET phases = public.rebuild_phases_json_from_project_phases_internal(<project_id>) WHERE id = <project_id>;`  
Call the **`_internal`** function from migrations. The un-suffixed `rebuild_phases_json_from_project_phases` is an auth-gated wrapper that checks `can_caller_edit_project` and raises `Not authorized` for a migration, SQL-editor, or service-role caller. If rebuild fails, fix the cause - do not invent cache values.
- **The rebuild emits only** `id`, `name`, `description`, `flowType`, `steps`, `isStandard` per operation. Decision copy (`userPrompt`, `decisionDetailedSummary`, `optionImageUrl`, `optionDetailedDescription`) lives in `projects.scheduling_prerequisites.__decision_tree_config__` and is merged onto operations at read time, so a rebuild dropping those keys from the cache is expected and not data loss.
- **Migration SQL:** Runnable as-is; **RAISE** when prerequisites missing; **idempotent** stable UUIDs + `ON CONFLICT` where appropriate (e.g. `(step_id, instruction_level)` for `step_instructions`).
- **UUID literals:** Last group after final hyphen = **exactly 12 hex digits** or PostgreSQL raises `22P02`.
- **Draft vs ship (§H.5):** During authoring, one SQL file per guide step per project slug so steps can be applied and fixed independently. Before commit, concatenate those files in H.3 order into **one** `<slug>_<scope>_bundle.sql` and remove the per-step drafts from `supabase/migrations/`. Never leave two competing Step N ship files for the same slug/scope; extra templates in one build-out → another `DO $$ … $$` block in the **same** bundle. Filename: `YYYYMMDDHHMMSS_<slug>_…` - **no** `project_id` in the name.
- **Same template across steps:** Steps **3–9** use the same `v_project_id` and the same **`operation_steps.id`** values from **Step 1**. **Step 2** touches only **`step_instructions`**. **Step 10** touches only **`projects`** (`description`, `project_challenges`).
- **Steps 5–6 bootstrap:** Insert missing **`public.tools`** / **`public.materials`** by `name` when absent (every NOT NULL / constrained column—tool **`category`** ∈ `PPE`, `Hand Tool`, `Power Tool`, `Other`). Step **6** repeats the **same tools** list as step 5. Step **7** = **no** tool/material catalog inserts.
- After bootstrap, resolve library IDs or **RAISE**—no orphan JSON with fake ids.

### Step 1 in SQL migrations (phases vs existing data)

Aligned with product rules: **if `project_phases` already has ≥1 row for the template, do not create, edit, or rename phases** in that migration. Assume existing phases cover the project; attach new **`phase_operations`** and **`operation_steps`** only.

- **Resolve `phase_id` for new operations** using **deterministic ordering** of existing `project_phases` rows—**not** by requiring fixed display names like “Preparation” or “Disconnect” (catalog phases may use any labels). Requiring name matches caused real migrations to fail when the catalog used different phase titles.
- **Recommended sort key** (matches typical process-map ordering): non-`last` before `last` (`CASE WHEN position_rule = 'last' THEN 1 ELSE 0 END`); then `position_value` NULLS LAST; then `created_at`; then `id`.
- **Fewer than three phases:** map multiple operation groups onto the same phase as needed. Use row numbers **`1`**, **`LEAST(2, n)`**, **`LEAST(3, n)`** against `n = count(*)` so one phase repeats for all three slots when `n = 1`, and the third group shares the second phase when `n = 2`.
- **Zero phases:** `INSERT` the phase set for that template in Step 1, then attach operations (greenfield).
- **Resolve operations through their phase, never by `operation_name`.** Operation names are editable product copy and do get rewritten: the tile flooring alternates were renamed from `Install uncoupling membrane` to `Uncoupling membrane (e.g. Ditra)` by a later copy migration, which silently breaks any exact name match. Scope owned steps with the phase ownership columns (`is_standard IS NOT TRUE AND is_linked IS NOT TRUE AND source_phase_id IS NULL AND source_project_id IS NULL`), and where a single operation is needed, assert the phase holds exactly one and take its id.
- **Temp tables shared across step files** (e.g. an `owned_steps` scope table) need `DROP TABLE IF EXISTS` before `CREATE TEMP TABLE`, since a runner may apply several migrations in one transaction.
- **After structure changes:** `UPDATE public.projects SET phases = public.rebuild_phases_json_from_project_phases_internal(<project_id>) WHERE id = <project_id>;`
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
| `project_quality_levels` | Good / Great / Professional outcome + process copy; Step 11 |
| `operation_steps.min_quality_goal` | Step inclusion gate by run quality goal; Step 11 |

---

## D) Catalog header (`projects`) — field catalog

Author when creating/revising a template or in Step 10 (description/challenges). Do not invent publish/visibility transitions unless asked.

| Field | Type / enums | Authoring rule |
| ----- | ------------ | -------------- |
| `id` | uuid | Stable; resolve root via `parent_project_id IS NULL` for workflow attach |
| `name` | string | Catalog title; match carefully (see §A name matching) |
| `description` | string \| null | Step 10; ≤200 chars; structured product blurb |
| `project_challenges` | string \| null | Step 10; ≤200 chars; 1–2 sentences on the **hardest parts** only (see Step 10) |
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

**Shared checklist:** `quality-control` (step types) · structure limits in generated planning standard above.

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
| `min_quality_goal` | string \| null | Optional; `great` / `professional` when the whole operation is quality-gated (Step 11) |

#### `operation_steps` fields (structure + later enrichments)

| Field | Type / enums | Authoring rule |
| ----- | ------------ | -------------- |
| `id` | uuid | Stable; reused by Steps 2–9 |
| `operation_id` | uuid | Parent operation |
| `step_title` | string | Required |
| `description` | string \| null | One-line scope only (not how-to) |
| `display_order` | number | Within operation |
| `flow_type` | string \| null | `prime` / `alternate` / `if-necessary` |
| `min_quality_goal` | string \| null | NULL = all goals; `great` = Great+Professional; `professional` = Professional only (Step 11). Do not overload `if-necessary` for quality gating |
| `step_type` | string \| null | `prime` / `scaled` / `quality_control_non_scaled` / `quality_control_scaled` |
| `number_of_workers` | number \| null | Workers needed |
| `skill_level` | string \| null | Beginner / Intermediate / Advanced / Professional |
| `allow_content_edit` | bool \| null | Allow edit even in standard phases when true |
| `outputs`, `tools`, `materials`, `process_variables`, `apps` | Json \| null | Steps 3, 5–7 (and apps if directed) |
| `time_estimate_low`, `time_estimate_med`, `time_estimate_high` | number \| null | Step 8 (hours; see step_type) |

After structure changes: rebuild `projects.phases` cache (§A).

### Step 2 — `step_instructions` (3 levels)

**Shared checklist:** `instruction-levels`, `error-correction`, `safety`.

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

**Section authoring intent (required):**

| Section | Write for | Do not write |
| ------- | --------- | ------------ |
| **Background/Need-to-Know** | Valuable domain context: why the work matters, timing pressure, complexity, and how the in-step app helps. Example for Tool & Material Ordering: rentals are worth using but must be scheduled close to use; material buying needs buffer and contingency; Shopping Checklist optimizes the buy/rent list. Include how this step finishes (e.g. Step Checklist outputs) here when that is status/completion meaning rather than a user motion. | A restatement of what the step is ("this is where you buy/rent…") or a one-line paraphrase of the Instructions. |
| **Instructions** | Numbered **sequential actions** the user performs in order. Each number must be something they do. | Explanatory descriptions, status meaning, or completion notes numbered as their own steps. Information is not a step - move it to Background or fold it into an adjacent action. |
| **Error-Recovery** | Full-sentence diagnosis → fix lines a user can scan quickly (e.g. "If your list is missing something, finish your plan so scope, tools, and materials are locked in."). | Telegraphic labels without context ("Missing list items: lock plan/scope first."). |

Level detail still varies (beginner more scaffolding, advanced denser) but **section intent stays the same** across beginner / intermediate / advanced.

### Step 3 — Outputs (`operation_steps.outputs` JSON)

**Shared checklist:** `outputs-priorities`, `quality-control`.

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

**Shared checklist:** `risks` · see cross-cutting `risks-vs-pfmea`.

**Scope:** the three components the register owns - **safety, schedule, and budget**. Quality is the PFMEA (Step 9). Attach to **root** template id (see §F). See `docs/RISK_ENGINE.md` for the shared model.

**Every row needs a component and three scores**, or it is reported as unscored rather than prioritized: `risk_dimension` ∈ `safety` / `schedule` / `budget`, plus `severity_score`, `occurrence_score`, `detection_score` on 1-10 scales anchored in `pfmea_scoring` (detection inverted: high is bad). Action Priority comes from `pfmea_action_priority_rules`; never author a priority directly.

**Key Characteristic classification** (`occurrence_driver`, `prevention_strength`, `implicated_item_kind`, `implicated_item_id`): `occurrence_driver` FKs `risk_occurrence_drivers` and says what actually drives the frequency, `prevention_strength` ∈ `mistake_proof` / `procedural` / `none`, and the item pair points at the step 3 output, step 7 process variable, or step 5 / 6 tool or material id the risk lives on (`implicated_item_kind = 'step'` carries no id and requires `operation_step_id`). Leave a classification null rather than guessing: null is reported as unclassified, a wrong value silently changes the KC register.

**Mitigation completeness:** Every identified risk must include `mitigation_actions` that, taken together, can bring residual severity to **medium or low** (ideally **low**). Do not leave a risk whose full mitigation set still leaves residual **high**. Prefer concrete, checkable actions; set `mitigation_effort_level` honestly so Risk Radar can sort easiest-first.

**Risk title rules (concrete cause, not category or outcome):**

1. **Name the failure mode the user can act on.** Titles must be specific enough that the mitigation set is obvious and checkable. Prefer product- or process-specific causes over umbrella labels.
2. **Do not author vague material categories.** Bad: `Low-quality materials`. Good (foundation / cross-project): `Shelf-expired adhesives or finishes`. Good (Tile Flooring): `Expired thinset or mortar past use-by date`. Good (paint project): `Expired paint that will not lay flat`. Mitigations differ by product (date codes vs grade vs dye lot), so the title must pick one cause.
3. **Do not author outcomes of many risks as if they were causes.** Bad: `Underestimating project time` (that is what happens when stockouts, wrong tools, helper no-shows, hidden damage, etc. fire). Put the schedule impact on those causal rows instead of a separate "we took too long" risk.
4. **Foundation vs project template.** Standard Foundation may keep only causes that stay specific and mitigable across DIY (e.g. shelf-expired adhesives). Project templates author the project-specific material and process causes. Template rows win title collisions over foundation at run sync.

**Risk Radar copy rules (strategy, actions, recommendation, benefit, descriptions):**

1. **Do not use the word "proper"** (or "properly"). Define the standard instead - what measurement, product limit, coverage %, cure hours, or visible pass/fail looks like.
2. **Do not say "slow down" or "speed up" without a quantification method.** If the intent is more detailed focus, give a timed rate (e.g. "Use a timer, and aim for about 3 sq ft every 15 min - that is cautious enough for detailed focus."). Same for pace-up: state the target rate or batch size.
3. **Quantify recommendations.** Vague buffers become numbers: e.g. not "keep a small contingency budget" but "Keep a 10% contingency budget or a minimum of $500 for most DIY projects." Apply the same to overage %, tolerances (inch per 10 ft), cure windows (hours/days), and $ / day impact ranges already on the risk row.
4. **Be specific, not polite-vague.** Replace soft phrases with actionable defaults people can put on a calendar - e.g. not "work within reasonable hours" but "Most people are okay with an 8:00-9:00a start and up to 7:00-8:00p. No power tools before or after." Name the tool types, gates, and thresholds.

| Field | Type / enums | Authoring rule |
| ----- | ------------ | -------------- |
| `project_id` | uuid | Root template |
| `risk_title` | string | Required; concrete cause per title rules above (not a vague category or multi-risk outcome) |
| `risk_description` | string \| null | Optional; narrative often in `benefit`; follow copy rules above |
| `likelihood` | string \| null | `low` / `medium` / `high` |
| `severity` / `impact` | string \| null | `low` / `medium` / `high` (UI uses severity) |
| `schedule_impact_low_days`, `schedule_impact_high_days` | number \| null | Calendar-day impact range |
| `budget_impact_low`, `budget_impact_high` | number \| null | Dollar impact range |
| `mitigation_strategy` | string \| null | Overall mitigation approach; quantified and specific (copy rules) |
| `mitigation_actions` | Json \| null | `[{ action, benefit?, completed? }]` — cumulative actions must reduce residual to medium or low (ideally low); each `action` checkable with numbers where applicable |
| `mitigation_cost` | number \| null | Cost to mitigate |
| `mitigation_effort_level` | string \| null | `low` / `medium` / `high` |
| `recommendation` | string \| null | What to do; quantified gate or default, not vague advice |
| `benefit` | string \| null | What if it happens / notes; include $ and/or day ranges when known |
| `display_order` | number \| null | Register order |
| `risk_dimension` | string \| null | `safety` / `schedule` / `budget`; required for the row to be prioritized |
| `severity_score`, `occurrence_score`, `detection_score` | number \| null | 1-10 each; all three or the row counts as unscored |
| `occurrence_driver` | string \| null | FK `risk_occurrence_drivers.driver` |
| `prevention_strength` | string \| null | `mistake_proof` / `procedural` / `none` |
| `operation_step_id` | uuid \| null | Required when `implicated_item_kind` is set |
| `implicated_item_kind`, `implicated_item_id` | enum / string \| null | `output` / `process_variable` / `instruction` / `material` / `tool` / `step`; id must resolve in that step's JSON |

### Step 5 — Tools

**Shared checklist:** `tools-alternates`.

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

Prefer library-backed refs: `id` / `name`, `description`, `category`, `alternates`, optional `quantity`, `purpose`, `linkedContentSectionIds` (show tool only when linked instruction sections are visible).

**Substitutes are child rows, not text.** `CompactToolsTable` renders a row carrying `parentId` (the id of the primary row it can replace) as an indented alternate, and it only falls back to the `alternates` string list when the primary has no child rows. Author the library-backed substitute as its own row with `parentId`, and keep `tools.alternates` in the catalog for substitutes that are guidance rather than a specific item.

### Step 6 — Materials

**Shared checklist:** `materials-alternates`.

Same pattern as tools; repeat tool bootstrap in the same file.

#### `materials` catalog (bootstrap)

| Field | Notes |
| ----- | ----- |
| `name` | Match key |
| `description`, `category`, `unit`, `unit_size` | Fill constrained columns |
| `category` | **Check constraint:** `Components` \| `Consumables` \| `PPE` only |
| `avg_cost_per_unit`, `alternates`, `photo_url` | Optional |

#### `operation_steps.materials` JSON (app shape)

`id` / `name`, `description`, `category`, `unit`, `unit_size`, `alternates`, optional `quantity`, `purpose`, `parentId`, `coveragePerUnit`, `wasteFactor`, `packSize`, `linkedContentSectionIds`. Substitutes use `parentId` child rows as in Step 5. Coverage math (`coveragePerUnit`, `wasteFactor`, `packSize`) is what lets scope turn into a purchase quantity, so state the assumption it depends on (trowel notch, joint width, tile size) in the row `description`. Omit coverage on anything that does not scale with the scaling unit rather than inventing a rate.

**PPE lives in these same arrays**, classified by `category = 'PPE'`; the step editor and workflow views split it into the PPE table by category, not by a separate column.

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

**Shared product rule:** waiting/cure steps use `number_of_workers = 0` (see cross-cutting `waiting-steps`).

Low / med / high per step; evidence-based; per scaling unit when `step_type` is scaled.

| Field | Authoring rule |
| ----- | -------------- |
| `time_estimate_low` / `_med` / `_high` | Hours for `prime` / `quality_control_non_scaled`; **hours per scaling unit** for `scaled` / `quality_control_scaled` |
| `step_type` | Must already reflect scaled vs non-scaled (Step 1) |
| `number_of_workers`, `skill_level` | Align with effort assumptions when set |

### Step 9 — PFMEA

**Shared checklist:** `pfmea` · see cross-cutting `risks-vs-pfmea` and `docs/RISK_ENGINE.md`.

Quality only. A failure mode is a requirement stated as the thing that goes wrong, and it hangs off a **`pfmea_requirements`** row rather than off an output id directly.

`pfmea_requirements` (author first):

| Field | Authoring rule |
| ----- | -------------- |
| `project_id` | Root template |
| `operation_step_id` | Target step |
| `output_id` | The Step 3 output `id` this requirement comes from; must still exist in that step's `outputs` JSON |
| `requirement_text` | A limit that can be failed, not a goal |
| `display_order` | Author order |

`pfmea_failure_modes`:

| Field | Authoring rule |
| ----- | -------------- |
| `project_id` | Root template |
| `operation_step_id` | Target step |
| `requirement_id` | FK to the `pfmea_requirements` row (**not** an output id) |
| `failure_mode` | Anti-requirement narrative |
| `severity_score` | 1-10 from `pfmea_scoring`; keep it consistent with the effect severity |

Related tables, all part of a complete PFMEA:

| Table | Authoring rule |
| ----- | -------------- |
| `pfmea_potential_effects` | Consequence the user lives with, not a restatement of the failure; `severity_score` agrees with the failure mode |
| `pfmea_potential_causes` | `occurrence_score` 1-10, plus `occurrence_driver` (FK `risk_occurrence_drivers`) and `implicated_item_kind` / `implicated_item_id` pointing at the output, process variable, tool, or material id the cause lives on (`step` kind carries no id) |
| `pfmea_controls` | `control_type` `prevention` or `detection`. Detection controls carry `detection_score` 1-10 (inverted: high is bad). **`control_strength` is prevention-only** and is `mistake_proof` only when the control removes the opportunity for the error, which is also what disqualifies the item as a Key Characteristic |
| `pfmea_action_items` | Required on lines that land High. Because the Action Priority table is tuned so another inspection does not move a High, an action has to change the method or remove the chance to get it wrong |

**Never invent a score, a driver, or a strength to fill a column.** Unscored and unclassified are real states the risk engine reports; a guessed value silently changes what the user is told to pay attention to.

### Step 10 — `projects.description` + `projects.project_challenges`

≤200 chars each. Touches only those `projects` columns (plus cache rebuild only if somehow structure changed; normally not). No em-dashes in either field (see Non-negotiables).

| Field | Authoring rule |
| ----- | -------------- |
| `description` | Structured product blurb: what the work is and what it achieves |
| `project_challenges` | **Informational decision tool:** short 1–2 sentences on the hardest parts so the user can judge fit before proceeding. Neutral tone: do **not** sell the project or scare them away; no major sway for or against. Focus on difficulty (physical demand, precision, prep, mess, failure modes that are hard to recover from), not a full risk register (that is Step 4 / Risk Radar) |

If the user is uncomfortable with the listed challenges, they may choose not to move forward; that is intentional. Write so a quick read surfaces the real hard parts without hype or hedging.

### Step 11 - Quality goals (`project_quality_levels` + `min_quality_goal`)

**Product meaning:** Good / Great / Professional are both **outcome** and **process**. Shared ladder and authoring rules live in the generated planning standard (`quality-goals`). This step is the SQL/field catalog.

**Scope:** owning template only. Do not copy quality-impact rows onto a host that adopts phases; each source template owns its own `project_quality_levels`. Linked/adopted phases display source rows at run time.

#### `project_quality_levels` (required: 3 rows per owning template)

| Column | Rule |
| ------ | ---- |
| `project_id` | Root catalog template id |
| `quality_level` | `good` \| `great` \| `professional` (UNIQUE with `project_id`) |
| `kickoff_summary` | Very short project-specific blurb for kickoff Goals (what this level means for this project). Required when shipping quality goals. |
| `outcome_summary` | What the finish looks like at this level (tolerances, appearance, serviceability) |
| `process_summary` | What work this level requires (prep, QC, finish) |
| `vs_lower_summary` | Required on `great` and `professional`: impact of choosing this instead of the level below. NULL on `good` |
| `example_image_urls` | jsonb array of URLs; optional placeholders for UI testing. Do not invent production photo pipelines |

#### `operation_steps.min_quality_goal`

| Value | Include when run goal is |
| ----- | ------------------------ |
| NULL | Good, Great, or Professional |
| `great` | Great or Professional |
| `professional` | Professional only |

- Process differences between levels are **real steps** with `min_quality_goal`, not prose alone. Do **not** overload `flow_type = if-necessary` for quality gating.
- Optional: same column on `phase_operations` when an entire operation is quality-gated.
- Snapshot JSON must carry `min_quality_goal` so runs can filter at runtime. Mid-run goal changes reshape **incomplete** forward steps only; completed steps stay complete and visible. Quality Control uses the **current** `project_runs.initial_quality_goal` as the expected level.

**Audit:** three level rows present; every non-null `min_quality_goal` is a valid value; gated steps have titles that still exist on owned phases.

---

## E) Schedule data (template authoring)

Template schedule content lives on **`projects.scheduling_prerequisites`** (Json). Do **not** author run-level `project_runs.schedule_events` in Steps 1–10.

| Piece | Location | Authoring rule |
| ----- | -------- | -------------- |
| Prerequisite map | string keys → string[] of entity ids | EntityId (phase/operation/step) → prerequisite entity IDs; parsed by scheduling deps helpers |
| `__decision_tree_config__` | reserved key (`DECISION_TREE_CONFIG_KEY`) | Decision-tree / flow config blob; phase entries may use `type: 'blocked'` (hidden from pickers). Per alternate/if-necessary operation may also store Project Customizer step 3 detail fields: `decisionDetailedSummary`, `optionImageUrl`, `optionDetailedDescription` (plus existing `decisionPrompt` / `alternateIds`). These are merged onto `projects.phases` operation objects as `decisionDetailedSummary`, `optionImageUrl`, `optionDetailedDescription`, `userPrompt` after rebuild. |
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
| 11 | `project_quality_levels` + `operation_steps.min_quality_goal` |

Also: **§H build out a project end to end**, §D catalog header, §E schedule prereqs, §F related projects / revisions, **§G home maintenance templates**.

---

## G) Home maintenance templates (`maintenance_templates`)

**Use when:** the user asks to review, research, add, or update **home maintenance** pre-built tasks / `maintenance_templates` / DIY maintenance catalog cadences (including modern-home / smart-home tasks), or says follow the ai dev guide for maintenance tasks.

This section is **separate** from Steps 1–10 project catalog work. Do not invent project-template tables for maintenance tasks.

### G.1 Read schema and UI first

1. Confirm columns against `src/integrations/supabase/types.ts` → `maintenance_templates` and `user_maintenance_tasks`.
2. Confirm plan filtering and system hooks in `src/components/MaintenancePlanWorkflow.tsx` (`MAINTENANCE_LEVELS`, `APPLIANCES_SYSTEMS_OPTIONS`, category sets, **exact title** allowlists).
3. Confirm which fields the tracker UI shows in `HomeMaintenanceWindow.tsx` / `AddMaintenanceTaskDialog.tsx` (title, description, summary, instructions, category, `frequency_days`, `criticality`, risks, benefits, repair savings).
4. Stay inside existing columns. Do **not** add DIY difficulty, custom recurrence engines, or season-as-schedule fields unless product explicitly expands the schema. Optional `typical_season` may be set for seasonal tasks; the calendar does not consume it today.

### G.2 Product levels ↔ criticality

| User language | Plan UI label | Filter |
| ------------- | ------------- | ------ |
| Bare min | Essential only | `criticality >= 3` |
| Normal | Add recommended | `criticality >= 2` |
| Comprehensive | Full control | `criticality >= 1` |

**Criticality rubric**

- **3 (High / Essential):** life safety, major water or fire risk, code-adjacent DIY checks.
- **2 (Medium / Recommended):** cost avoidance, efficiency, moderate damage prevention.
- **1 (Low / Full):** appearance, convenience, polish.

### G.3 Field catalog (authoring)

| Field | Rule |
| ----- | ---- |
| `title` | Stable, unique (case-insensitive). Wizard filters use **exact** titles - renaming requires updating `MaintenancePlanWorkflow.tsx` title sets in the same change. Prefer `Check …` over `Inspect …`. |
| `description` | Short what/why for list/detail. |
| `summary` | One-line cadence / outcome. |
| `instructions` | Numbered DIY steps; call out when a licensed pro is required; no em-dashes. |
| `category` | Whitelist used by UI: `safety`, `security`, `hvac`, `plumbing`, `exterior`, `electrical`, `interior`, `landscaping`, `appliances` (also `general` / `outdoor` / `roof` if needed). Prefer existing buckets; use `security` for cameras, locks, hubs, sensors. |
| `frequency_days` | Prefer presets aligned with app: `7`, `30`, `90`, `182`, `365`, `730`, `1095`, `1825`, `3650`. Schedule model is `next_due = now + frequency_days` - do not invent non-day recurrence. |
| `criticality` | Integer 1–3 per rubric above. |
| `risks_of_skipping` / `benefits_of_maintenance` / `repair_cost_savings` | Concrete DIY consumer copy; quantify when honest. |
| `typical_season` | Optional hint (`spring` / `summer` / `fall` / `winter`); not required for due logic. |
| `photo_url` | Do not invent URLs. |

### G.4 Industry research protocol (required before writing SQL)

Before inserting or changing cadences/guidance, research and cite **at least**:

1. **Standards / government** where applicable (examples: USFA, CPSC, NFPA, ENERGY STAR, EPA WaterSense, NAHB consumer guidance).
2. **Manufacturer or trade** cadence for that system (HVAC OEM, garage opener maker, EVSE guidance, etc.).
3. **DIY consumer checklist** realism (what a homeowner can actually do safely).

Record sources in **migration SQL comments** (and PR/commit body when committing). Prefer root-cause frequency fixes over “nice to have” churn.

Tone: DIY-safe visual checks; never instruct homeowners to open sealed combustion chambers, remove electrical dead-front covers, or enter septic tanks.

### G.5 System gating (plan wizard)

- Every **optional-system** template must have: (a) a questionnaire option in `APPLIANCES_SYSTEMS_OPTIONS` or heating/cooling options when relevant, and (b) a **title allowlist / exclusion** in `MaintenancePlanWorkflow` so homes without that system do not get the task.
- Do **not** rely on category alone for optional systems.
- The plan wizard does **not** auto-include `security` unless smart-home / camera / lock options are selected - add `categoriesToInclude.add('security')` when those systems are present.
- Central-air filter task is gated separately from mini-split / heat-pump tasks.

### G.6 SQL delivery rules

- Ship **idempotent** migrations under `supabase/migrations/`: `UPDATE` by `lower(trim(title))`; `INSERT … SELECT … WHERE NOT EXISTS` by title.
- Fill all guidance columns the UI displays.
- **Do not** silently mutate existing `user_maintenance_tasks` unless the user explicitly asks to backfill. New catalog rows apply to new plan saves and Add-from-template flows.
- No new enums or columns unless explicitly requested; verify RLS only if creating new tables (templates table already exists).
- **Avoid `/`, bare `%`, and `;` inside string literals** in migration SQL source. Some SQL editors split statements on `;` without respecting quotes, which can execute a prose fragment and treat a word like `battery` as a relation (`42P01`). Prefer `and` / `or` in titles; write `20 percent` not `20%`; build LIKE wildcards with `chr(37)`; use `.` or ` -` instead of `;` inside guidance prose.

### G.7 Out of scope

- New recurrence models (nth weekday, “spring only” due engines).
- DIY difficulty on maintenance tasks (`home_tasks.diy_level` is a different product surface).
- Hardcoded business rules outside DB fields + existing wizard filters.
- Restoring deleted historical seed migrations; forward-fix with new migrations only.

---

## Revision history

Living changelog. When a field, constraint, or SQL lesson is **proven** during guided work: **append** a row here and fold durable rules into the matching section above.

| Date | Change | Why |
| ---- | ------ | --- |
| 2026-09-18 | Tile Flooring Step 11 summaries rewritten: Good forbids major failures but allows imperfect less-visible edges; Professional targets flawless grout lines/cuts with leveling clips, seal, and final QC | Kickoff quality ladder needed project-specific meaning tied to owned Prep/Install/Grout gating |
| 2026-09-18 | Step 11: `kickoff_summary` on `project_quality_levels` / run snapshot; kickoff Goals shows short per-level blurbs and drops Instruction detail + long impact panel | Kickoff needs project-specific meaning without the full outcome/process panel |
| 2026-09-18 | Step 4 risk title rules: concrete cause/failure mode only; ban vague categories (e.g. Low-quality materials) and multi-risk outcomes (e.g. Underestimating project time); examples for foundation, tile, paint; planning standard v1.4.1 | Risk Radar showed unactionable general risks; mitigations are product-specific |
| 2026-09-18 | §H trigger/H.1/H.5: "Build out content for project X ref ai dev guide" requires commit, push, and naming migration path(s); explicit exception to author Standard Foundation when user asks for standard phases | Build-out requests must leave applyable migrations and push; foundation content was previously blocked by the catalog-only scope rule |
| 2026-09-18 | Planning standard v1.4.0: three content axes (instruction / quality / customization), Professional naming vs skill_level; op-level min_quality_goal wired; project_run_quality_levels snapshot at run create | Dual-axis assessment follow-up |
| 2026-09-18 | §H.5 / §A: author one SQL file per guide step during development, then concatenate into a single `<slug>_<scope>_bundle.sql` before commit; delete per-step drafts in the same commit. Schema migrations stay separate from content bundles | Tile quality-gated build out shipped as many step files; ship surface should be one applyable file |
| 2026-09-18 | Tile Flooring: quality-gated Professional steps (leveling clips, final finish inspection) fully enriched (instructions through PFMEA) plus content audit expecting ≥19 owned steps | Quality goals migration added process steps that still needed Steps 2-9 content |
| 2026-09-18 | Step 11 quality goals: `project_quality_levels` + `operation_steps.min_quality_goal`; planning standard v1.3.0 ladder (outcome + process); §H audit/order updated | Quality goal must change run path and show per-project impacts including adopted phase sources |
| 2026-09-17 | §A: migrations must call `rebuild_phases_json_from_project_phases_internal` (the un-suffixed wrapper is auth-gated and raises `Not authorized`); operations are resolved through their phase, never by `operation_name`; shared temp tables need a `DROP TABLE IF EXISTS` guard; noted that decision copy survives a rebuild through `__decision_tree_config__` | A state audit of the live tile flooring template found both traps in already-authored migrations: the gated rebuild would have failed the run, and the two Prepare subfloor alternates had been renamed by a later copy migration so every name match resolved nothing |
| 2026-09-17 | Step 4 rewritten for the shared risk model (component + three scores + KC classification fields); Step 9 rewritten for `pfmea_requirements` and `requirement_id`, with cause drivers, `control_strength`, and action items on High lines; Steps 5 and 6 document `parentId` substitute rows, `purpose`, coverage math, and PPE by category; §H.2 adds "check JSON shape against the component that reads it"; §H.5 adds in-migration row-count verification and a closing content audit migration | Tile Flooring build out found step tool JSON in a shape the app cannot render, PFMEA keyed on a column that no longer exists, and a register with no safety component and no scores |
| 2026-09-16 | Added §H build-out protocol (owned-phase scope by column not name, completeness audit matrix, fixed authoring order, library bootstrap expected, migrations + push as default deliverable); shared rules `owned-vs-adopted-phases` and `content-completeness` in planning standard v1.2.0 | "Ref ai dev guide and build out project X" must be a sufficient instruction with no scoping questions |
| 2026-09-15 | Step 2 section authoring: Background = valuable domain context (not step restatement); Instructions = sequential actions only (information is not a step); Error-Recovery = full-sentence diagnosis. Shared rule `step-instruction-sections` in planning standard v1.1.0 | Tool & Material Ordering advanced copy had explanatory Background, a non-action Instruction #3, and telegraphic Error-Recovery |
| 2026-09-15 | Shared product planning SoT: `src/utils/projectPlanningStandard.ts` + generated marker block; admin Planning Guide consumes same module; `npm run sync/check:planning-standard` | Align human Planning Guide and AI reference; prevent product-rule drift |
| 2026-09-14 | Added §G Home maintenance templates: schema/UI fit, criticality↔Essential/Recommended/Full, field catalog, industry research protocol, system gating, idempotent SQL rules | DIY maintenance catalog review; future prompts must research industry standards before updating `maintenance_templates` |
| 2026-09-11 | `__decision_tree_config__` / phases ops: `decisionDetailedSummary`, `optionImageUrl`, `optionDetailedDescription` for Project Customizer step 3 workflow decisions (summary = name/description/prompt; detail window via Info) | Tile flooring underlayment decision needed images + deeper copy without replacing short summaries |
| 2026-09-11 | Step 4 Risk Radar copy rules: no "proper" (define the standard); no slow/speed without a timed rate; quantify contingencies/tolerances/$/days; replace vague hours with concrete windows (e.g. 8-9a to 7-8p, no power tools outside) | Tile Flooring Risk Radar review; DIY guidance must be checkable |
| 2026-09-11 | Step 4: every risk's `mitigation_actions` must cumulatively reduce residual severity to medium or low (ideally low) | Risk Radar check-offs drive "Whats the new status?"; authored mitigations must be able to get there |
| 2026-09-11 | Step 10 `project_challenges`: clarify purpose as neutral hardest-parts decision tool (1-2 sentences, ≤200 chars; not sales or scare); Non-negotiables: no em-dashes in authored user-facing prose (hyphens OK) | Recreated tile flooring / backsplash challenges; authors need tone+scope+punctuation rules |
| 2026-09-10 | Expanded field catalogs for catalog header, Steps 1–10, schedule prereqs (§E), related projects (§F); added on-demand Cursor rule `.cursor/rules/ai-project-dev-guide.mdc` | Single guide for template content development + continuous improvement |
| 2026-09-10 | `materials.category` check allows only `Components` / `Consumables` / `PPE` (not free-form labels like Flooring) | Tile Flooring Installation step 6 bootstrap failed `materials_category_chk` until categories matched the constraint |
