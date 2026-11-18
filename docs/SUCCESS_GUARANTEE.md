# Success Guarantee

What Project Partner guarantees, to whom, and how a claim is judged. The code paths named here
are the source of truth; when they disagree with this page, fix the page in the same pass.

## The promise

A **covered run** that misses its goal gets two things, in order:

1. **Process guarantee (A).** Priority recovery: the pre-built rework path for the failure,
   replan, and AI or expert help. Recovery is always the first response to a missed goal.
2. **Financial guarantee (B).** If recovery cannot bring the run back to its goal, a refund or
   membership credit. The amount is capped at what the user paid for the subscription period
   that covered the run, never more.

Redo support (paying for the fix) and coverage tiered by quality goal are later phases and are
not part of this promise.

## Goals covered

| Goal | Measured against | A miss means |
| --- | --- | --- |
| Quality | The run's quality goal (Good / Great / Professional) in the Quality app | A covered step's outputs cannot be brought to the expected finish for that goal after the authored rework path ran |
| Schedule | The locked plan (`project_runs.planning_scope_baseline`) | The finish date slips past the baseline for reasons the plan owned. Delays from user-initiated changes (scope adds, quality goal changes, date moves) are excluded |

Safety outcomes are never covered. Process guidance and warnings stay in place; injury
avoidance is not warrantied.

## Who is covered

A run is covered from the moment it opts in until the first coverage-ending event. Opting in
requires all of:

- The template is **guarantee-ready** (`get_project_guarantee_readiness`): every Key
  Characteristic candidate failure mode on the template has an authored rework path, and the
  template and the foundation both carry assumptions.
- Every assumption on the run is acknowledged.
- Quality Control gates are on: photos required on each step, and every output required.

Coverage cannot be restored once it ends, so a bypass cannot be undone by opting in again.

## What ends coverage

Each of these is recorded on `project_run_guarantee_events` and ends coverage for the whole run:

| Event | Trigger |
| --- | --- |
| `gate_bypassed` | The user skips a required gate on a step |
| `qc_setting_disabled` | A required Quality Control setting is turned off |
| `assumption_violated` | An **accepted** assumption is violated (one the plan has no response for) |
| `rework_path_missing` | A failure is reported on a step with no authored rework path |
| `custom_phase_added` | A custom phase is added to the run |
| `opted_out` | The user leaves the guarantee |

Violating a **checked** or **branched** assumption does not end coverage: the plan routes to the
linked branch operation and coverage continues.

## Assumptions are the coverage boundary

Assumptions are authored at two levels and copied onto every run at create:

- **Foundation** (Standard Project Foundation project): apply to every run. Examples: the home is
  structurally sound, no natural disaster strikes during the project, utilities stay available.
- **Template**: apply to one project. Example for Tile: the room stays inside the mortar's cure
  temperature range.

Each assumption is handled one of three ways:

| Handling | Plan response | When violated |
| --- | --- | --- |
| Checked | A step output verifies it; failure routes to a linked branch operation | Branch runs, coverage continues |
| Branched | A linked branch operation already in the template handles it | Branch runs, coverage continues |
| Accepted | None. Listed so the user agrees to it up front | Coverage ends |

Accepted assumptions are the honest list of what the plan does not handle. Authors convert them
into branched assumptions over time.

## Rework is planned work

Rework paths are operations with `flow_type = 'rework'`, authored on the template like any other
operation: steps with tools, materials, outputs, quality checks, time estimates, skill level,
and PFMEA / register risks. A rework operation:

- is linked to the failure modes and step outputs it recovers (`rework_operation_triggers`);
- contains new steps (for example, remove failed tile) and loop-back steps that re-run an
  existing step by reference (`operation_steps.repeats_operation_step_id`), so the original
  content, controls, and durations are reused rather than copied;
- stays out of the run plan until Something Wrong triggers it, then lands immediately after the
  failing step's operation so schedule and prerequisites recalculate.

There is no generic free-text rework. A failure on a step with no authored rework path is outside
coverage and routes to Unplanned Work.

## Claims

1. From a covered run, the user reports a missed goal. The claim opens in `recovery`.
2. If recovery fixes it, the user closes the claim as resolved by recovery.
3. If not, the user requests a refund. The evidence record is frozen onto the claim.
4. An admin decides: refund, membership credit, or deny. Approved amounts are checked against the
   recorded subscription cap.

## Evidence record

Everything a claim is judged on already lives on the run:

- completed outputs and step completion
- step photos (`project_run_photos`)
- rework events, including which authored rework path ran (`rework_events`)
- locked baseline vs actual dates
- custom-phase flag
- assumption acknowledgements and violations (`project_run_assumptions`)
- guarantee events (`project_run_guarantee_events`)

## Where it lives

| Concern | Code |
| --- | --- |
| Schema, RLS, RPCs | `supabase/migrations/20261113000000_success_guarantee_schema.sql` |
| Foundation + Tile assumptions, Tile rework paths | `supabase/migrations/20261113010000_success_guarantee_tile_content_bundle.sql` |
| Coverage, readiness, evidence, claims | `src/utils/successGuarantee.ts` |
| Assumptions | `src/utils/projectAssumptions.ts` |
| Rework paths | `src/utils/reworkPaths.ts` |
| Opt-in, assumptions, evidence, claims UI | `src/components/SuccessGuaranteePanel.tsx` (Quality app) |
| Gate bypass | `src/components/UserView.tsx` |
| Rework path selection | `src/components/SomethingWrongDialog.tsx` |
| Claim decisions | `src/components/GuaranteeClaimsAdminWindow.tsx` |
