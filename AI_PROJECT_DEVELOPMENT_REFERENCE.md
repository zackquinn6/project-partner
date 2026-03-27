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
  - Holds step metadata and many “step-level” fields as JSON (e.g., `tools`, `materials`, `outputs`, `content_sections`, `apps`).
  - Time estimates live here as numeric fields:
    - `time_estimate_low`, `time_estimate_med`, `time_estimate_high`

- **`public.step_instructions`**
  - Stores **3-level instruction content** per step.
  - Key columns:
    - `template_step_id` → references `operation_steps.id`
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
  - Prefer **idempotent inserts** using stable UUIDs and `ON CONFLICT` on unique keys (e.g., `id`, or `(template_step_id, instruction_level)` for instructions).

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

- **Must use tools from the tools library.**
  - Search the admin tools library and attempt to match each needed tool to an existing **tool / variant**.
  - If either the tool or the needed variant is missing:
    - **Notify the user exactly which tool/variant needs to be added.**
    - Do not create a fake tool entry or default to a generic placeholder.

**DB placement**

- Step-level tools live in `public.operation_steps.tools` (JSON).
- Library tool/variant catalog is separate (must be used as the source of truth).

### Step 5 — Materials list

**Deliverables**

- A materials list required for the project (and per-step associations if required).

**Hard requirement**

- **Must use materials from the materials library.**
  - Search the admin materials library and attempt to match each needed material to an existing library item / variant.
  - If missing:
    - **Notify the user exactly which material/variant needs to be added.**
    - Do not create fake items or placeholders.

**DB placement**

- Step-level materials live in `public.operation_steps.materials` (JSON).
- Library material/variant catalog is separate (must be used as the source of truth).

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

**DB placement**

- Use the product’s canonical process-variable storage (tables/fields used by the admin UI).
- If unknown, locate the canonical schema first; do not invent a new table.

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

---

## C) Clarifications for steps (quick checklist)

- **Step 1**
  - Must include instructions at **all 3 levels** (beginner/intermediate/advanced) for each step.
  - Instructions belong in `public.step_instructions`, not embedded as defaults elsewhere.

- **Step 2**
  - Output `name` length: **≤ 50 chars** (prefer **< 30**).
  - Outputs stored in `public.operation_steps.outputs`.

- **Step 3**
  - Only risks that affect **timeline** or **budget**.
  - Quality risks handled in **PFMEA** instead.

- **Step 4**
  - Tools **must** come from **tools library** (match tool + variant).
  - If missing, **notify user what to add**; do not create placeholders.

- **Step 5**
  - Materials **must** come from **materials library** (match item + variant).
  - If missing, **notify user what to add**; do not create placeholders.

- **Step 6**
  - Process variables are **intrinsic**, **measurable**, and have **target ranges** with units.
  - Not “tool choice,” not “brand,” not “material SKU.”

- **Step 7**
  - Low = 10th percentile, High = 90th percentile, Med = average (with evidence rules).
  - Must normalize to scaling unit for scaled steps.
  - Must reason step-by-step; split into chunks if many steps.

