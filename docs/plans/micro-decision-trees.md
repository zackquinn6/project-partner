# Step-level micro decision trees (plan)

## Data

- **Template** (`projects.scheduling_prerequisites`): reserved key `__general_project_decisions__` — array of `{ id, label, choices: [{ id, label }] }`.
- **Run** (`project_runs.customization_decisions`): `generalProjectChoices` — `Record<decisionId, choiceId>` (one choice per decision).
- **Instructions** (`step_instructions` / `project_run_step_instructions` JSON): each section may include `id`, `decisionApplicability: [{ decisionId, choiceIds[] }]` (AND across rules; OR within `choiceIds`). `null`/missing = all choices.
- **Tools / materials** (on `WorkflowStep`): optional `linkedContentSectionIds: string[]`. Missing or empty = applies to **all** sections on the step.

## Admin

- **Decision Tree Manager**: “General Project Decisions” card; editable when not standard template, or when **Edit Standard** for the foundation.
- **Workflow editor**: `MultiContentEditor` shows applicability per section when template has decisions loaded; tools/materials/PPE get section multi-select when instruction sections exist (Compact\* tables).

## Runner

- **UserView**: `useWorkflowMicroDecisions` loads template decisions (filtered by phases on the run), run snapshot instruction JSON, and `generalProjectChoices`. When `shouldApply`, steps with no visible instruction block are removed; tools/materials filtered by visible section ids; `MultiContentRenderer` input filtered for DB-backed sections.
- **Admin preview** (**EditableUserView**): when no matching run or no `generalProjectChoices`, content is unfiltered. When the selected run belongs to the open template and choices exist, filtering matches the runner.

## Customizer

- Flat list of general decisions (after filter by referenced phases) with radio choices; persists `generalProjectChoices` in `customization_decisions`.

## Follow-ups (addressed in app + notes for hosted SQL)

- **CompactMaterialsTable** / **CompactPpeTable** already expose the same section link pattern as tools.
- **MobileWorkflowView**: `microDecisions` prop from **UserView** filters instruction sections and fallback `contentSections` / `content` arrays.
- **EditableUserView**: when the open run’s `projectId` matches the template, applies the same micro-decision filtering as the runner (including sidebar step list).
- **Sanitize**: `sanitizeMicroDecisionOrphansForProject` runs after **DecisionTreeManager** save; updates `operation_steps` and `step_instructions`, then re-invokes `rebuild_phases_json_from_project_phases` when rows changed.

### `rebuild_phases_json_from_project_phases` (Supabase)

The function is defined in remote migrations, not in this repository. It should pass through fields the UI depends on (`content_sections` / `contentSections`, instruction JSON with `decisionApplicability`, `linkedContentSectionIds` on tools/materials). If the rebuild omits keys, extend the SQL in Supabase accordingly.
