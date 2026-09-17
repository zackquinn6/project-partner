# Risk Engine

How risk is authored, personalized, scored, and shown. This describes the system as built, not
as intended, and the last section lists what is still missing.

Read this instead of tracing the code. When the two disagree, the code wins and this document
is stale, so fix it in the same pass.

## The shape of it in one paragraph

Risk is authored once per template in two places: a PFMEA for quality, and a risk register for
safety, schedule, and budget. Both score on the same 1-10 severity, occurrence, and detection
scales, and both resolve to an Action Priority of High, Medium, or Low through one shared
lookup table that lives in the database. When a user starts a run, a rules engine reads facts
about that specific user, moves occurrence and detection, and writes a plain-language risk list
onto the run along with an audit trail of every rule that fired. That list is what the user
sees, in the Risk Radar, in the planning walkthrough, and inline on the step they are working.
From that list a shorter one is derived: the Key Characteristics, the specific items where this
user's attention is what decides the outcome.

Three layers, in order:

| Layer | What it is | Where it lives |
| --- | --- | --- |
| Stage 1, template risk | The analysis an author does once, for everyone | `pfmea_*` tables, `project_risks` |
| Stage 2, logic layer | Rules that turn the template's risk into this user's risk | `project_risk_rules`, `src/utils/projectRiskLogic.ts` |
| Stage 3, applied profile | The scored, translated list for one run, plus the KC register derived from it | `project_run_risks`, `project_run_risk_profile`, `project_run_key_characteristics` |

## 1. The four components

Every risk in the system belongs to exactly one of four components. The vocabulary is closed
and defined in `src/utils/riskDimensions.ts`.

| Key | Admin label | User-facing label | What it threatens |
| --- | --- | --- | --- |
| `quality` | Quality | Result | how the finished work turns out |
| `safety` | Safety | Safety | getting hurt or breaking code |
| `schedule` | Schedule | Time | finishing when you planned to |
| `budget` | Budget | Cost | spending more than you planned |

They are separate because a process step can be excellent on one and terrible on another, and
a single number hides that. Skim-coating a wall is low quality risk for a careful beginner and
high schedule risk, because the failure mode is not a bad wall, it is four thin coats instead
of two and a lost weekend.

### Why each one matters, and why plans miss it

A plan is a list of actions that succeed. Each of the failures below is a branch off the plan
rather than a step in it, which is exactly why writing the plan does not surface them.

**Quality.** The finish disappoints in a way that is expensive to undo.

- Tile laid on a subfloor nobody checked for flatness. Every tile went down correctly and the
  floor still has lippage you catch with a sock. The plan said "set tile in thinset", which is
  the action that succeeded; flatness was a precondition nobody wrote down.
- Patched drywall that flashes under the second coat because the patch was not primed. The
  paint step was done right. The failure happened one step earlier and only became visible
  after the step that would have caught it was finished.
- Cabinet run scribed to a wall that is out of plumb by half an inch over eight feet. Each
  cabinet is level. The countertop will not sit.

The pattern: quality failures usually originate in a step upstream of the step where they
become visible, and plans are written forward.

**Safety.** Injury, or work that cannot pass inspection.

- Cutting a hole for a recessed light in a ceiling with a cable stapled across the joist bay.
  The plan says "cut opening", and the wire is not in the plan because the author could not
  know it was there.
- Carrying a sheet of drywall up a stairwell alone because the second person was scheduled for
  the following day. The plan had both tasks, just not the constraint linking them.
- Sanding pre-1978 paint without containment. Nothing about the sanding step changes; the
  hazard comes from the house, not the task.

The pattern: safety risk is mostly a property of the environment and the person, not of the
action, so it cannot be authored into a step description that is meant to work for everyone.

**Schedule.** The finish date moves, usually not because a task took longer.

- Thinset that needs to cure before grout. The plan shows two tasks and no gap. A weekend
  project becomes two weekends because of a wait, not because of work.
- The one tool you did not own, discovered at 4pm on a Sunday. Every task estimate was right.
- An inspection that has to be scheduled and cleared before the wall can close. The wait is
  longer than everything on either side of it.

The pattern: schedule failures are dominated by waits, dependencies, and trips, and plans
estimate work.

**Budget.** Money leaves in a way the material list did not anticipate.

- The rotten subfloor under the vanity you were only replacing for looks. Discovery, not a
  line item.
- The shutoff valve that will not close, so a straightforward faucet swap becomes a supply
  line and a trip. Small individually, and it happens on most runs.
- Cut waste on a room that is nearly but not quite a tile multiple. The material list assumed
  area plus ten percent.

The pattern: budget risk lives in discovery and in second trips, and a bill of materials
prices what you already know you need.

## 2. Scoring vocabulary

Every risk in both layers carries three scores on 1-10 scales.

| Score | 1 means | 10 means |
| --- | --- | --- |
| Severity | no discernible effect | injury, code violation, or work that must be torn out |
| Occurrence | effectively never with normal practice | expect it this run |
| Detection | a hard stop or gauge prevents proceeding | no way to notice before the consequence lands |

Detection is inverted the way it is in the standard: a high detection number is bad.

Written anchors for all three, per component, are seeded in `pfmea_scoring` and shown in the
authoring UI through `PfmeaScoringCriteriaDialog`, which has one tab per component. The
occurrence anchors are stated as explicit frequencies ("about one in five attempts") rather
than relative words, because occurrence carries real weight in prioritization and vague
language made it drift.

### Action Priority, not RPN bands

Priority comes from a lookup table, `pfmea_action_priority_rules`, seeded in
`supabase/migrations/20260916221000_action_priority_rules.sql`. It is data, not code, so it can
be retuned per component with a migration and no deploy. A migration-time check proves the
table is a total function over every severity, occurrence, and detection triple from 1 to 10
for all four components, which is what lets the lookup code refuse to invent a default.

The seeded table is retuned away from the standard toward first-pass success, on four rules:

1. Detection only influences priority when occurrence is low (1-3). Above that, severity and
   occurrence decide alone.
2. Severity 7 or higher with occurrence 4 or higher is High regardless of detection.
3. Detection can never improve priority by more than one level.
4. Severity 9 or higher with occurrence 2 or higher is at least Medium.

The result, identical for all four components today:

| Severity | Occurrence | Detection 1-4 | Detection 5-10 |
| --- | --- | --- | --- |
| 9-10 | 4-10 | High | High |
| 9-10 | 2-3 | Medium | High |
| 9-10 | 1 | Low | Medium |
| 7-8 | 4-10 | High | High |
| 7-8 | 2-3 | Medium | High |
| 7-8 | 1 | Low | Medium |
| 4-6 | 8-10 | High | High |
| 4-6 | 4-7 | Medium | Medium |
| 4-6 | 2-3 | Low | Medium |
| 4-6 | 1 | Low | Low |
| 2-3 | 6-10 | Medium | Medium |
| 2-3 | 1-5 | Low | Low |
| 1 | 1-10 | Low | Low |

The intent is that an author who wants a High off the list has to change the method or reduce
the frequency. Adding another inspection does not move it, because for a DIYer catching a
defect after producing it is rework, not success.

RPN is still computed as severity times occurrence times detection, but it is only used to
order items inside one priority class. It never decides priority.

User-facing wording for each level lives in `risk_action_priority_labels`, also data:

| Level | Label | Description |
| --- | --- | --- |
| H | Act before this step | Change how you do this step, or the result is likely to disappoint. |
| M | Have a safeguard ready | Set up your check or backup before you start, not after. |
| L | Nothing needed | Covered by the normal instructions. |

### Unscored is a real state

Nothing in the scoring path substitutes a number for a missing one. If severity, occurrence, or
detection is absent, `calculateActionPriority` and `calculateRPN` return `null`, and the item is
counted as unscored rather than as Low. The old behavior of standing in a default reported
analysis nobody had done, which is worse than reporting nothing.

## 3. Stage 1: template risk

### Quality, through the PFMEA

The chain, template-scoped, all admin-authored in `PFMEAManagement`:

```
operation_steps.outputs
  -> pfmea_requirements        (one row per output, real table, stable id)
    -> pfmea_failure_modes     (requirement_id FK, operation_step_id FK)
      -> pfmea_potential_effects   (severity_score)
      -> pfmea_potential_causes    (occurrence_score)
      -> pfmea_controls            (control_type prevention|detection, cause_id, detection_score)
```

Requirements are a table, not derived on read, and `pfmea_failure_modes.requirement_id` is a
foreign key to it. The earlier positional `index:N` reference is gone, so renaming or
reordering an output no longer silently repoints a failure mode at a different requirement.
`src/utils/pfmeaRequirementSync.ts` reconciles requirements with outputs and flags orphans
rather than deleting them.

Roll-up per failure mode, all in `src/utils/pfmeaRiskMetrics.ts`:

- **Severity** is the highest severity among the failure mode's effects. Worst consequence
  wins.
- **Occurrence** is the highest occurrence among its causes. The most frequent cause wins,
  because averaging let a rare cause dilute a frequent one out of the action list.
- **Detection** is the lowest, meaning best, score among its detection controls. A partially
  scored control set returns `null` rather than claiming a best.
- **Priority** is the worst priority across the failure mode's lines, where a line is the
  failure mode paired with one cause.

Two authoring checks run alongside:

- **Prevention gap.** `hasPreventionControlGap` flags a failure mode whose controls are all
  detection type, or that has a cause with no prevention control scoped to it. The grid says so
  inline: only detection controls, priority stays High until a prevention control is added.
- **Detection reality check.** `src/utils/detectionControlValidation.ts` flags a detection
  score whose requirement traces to an output with no `qualityChecks`, no `allowances`, and no
  `referenceSpecification`. A detection score claims the failure is catchable; if the output
  defines nothing to catch it against, the score is a guess.

### Safety, schedule, and budget, through the register

`project_risks` carries the other three components. It gained `risk_dimension`, the three
scores, and `operation_step_id`, so a register risk can be tied to the step it arises on the
same way a failure mode is. Authoring is in `RiskManagementWindow` in template mode.

A `project_risks` row with no `risk_dimension` was authored before the components existed. It
still reaches runs through the existing sync, it just has no priority and no personalization.

### Generic cross-project risks

The Standard Project Foundation, the single `projects` row with `is_standard = true`, holds
`project_risks` that apply to every project. At run creation
`syncFoundationAndTemplateRisksToProjectRun` in `src/contexts/ProjectActionsContext.tsx` copies
foundation risks first, then template risks, onto `project_run_risks`, deduplicating by
case-insensitive title, and marks the foundation-derived rows `from_standard_foundation = true`.
Risk Radar can filter them out.

Note the boundary: foundation risks reach the run, but Stage 1 loading in
`applyProjectRiskLogicToRun` only reads `project_risks` for the template root, so foundation
risks are not scored, not dimensioned, and not personalized. See the gaps section.

## 4. Stage 2: the logic layer

This is what makes the risk picture the user's rather than the template's. Two halves: signals,
which are facts, and rules, which are judgments.

### Signals

`src/utils/riskSignals.ts` defines a closed vocabulary. A signal is a raw fact and never
contains a threshold or a verdict, so all judgment lives in rule data. There is no escape hatch
for an ad hoc signal.

A signal that cannot be resolved is reported unresolved with a reason, never averaged,
defaulted, or guessed. Reasons: no profile row, not recorded, no match, no step context, not
applicable, no history. A rule reading an unresolved signal does not fire, and the skip is
recorded.

| Signal | Scope | Type |
| --- | --- | --- |
| `profile.project_skill_level` | run | text |
| `profile.overall_skill_level` | run | text |
| `profile.physical_capability` | run | text |
| `profile.project_type_skill_rating` | run | number |
| `profile.avoids_project_type` | run | number |
| `tools.step_tool_count` | step | number |
| `tools.step_tools_owned_count` | step | number |
| `tools.step_tools_missing_count` | step | number |
| `tools.step_tools_owned_ratio` | step | number |
| `environment.home_build_year` | run | number |
| `environment.home_ownership` | run | text |
| `environment.home_material_risk_count` | run | number |
| `environment.space_count` | run | number |
| `environment.largest_space_scale_value` | run | number |
| `environment.schedule_tempo` | run | text |
| `behavior.family_rework_count` | run | number |
| `behavior.family_rework_count_quality` | run | number |
| `behavior.family_rework_count_safety` | run | number |
| `behavior.family_rework_count_schedule` | run | number |
| `behavior.family_rework_count_budget` | run | number |
| `behavior.family_stall_count` | run | number |
| `behavior.family_median_unstick_seconds` | run | number |
| `behavior.completed_step_count` | run | number |
| `behavior.pace_ratio_median` | run | number |
| `behavior.step_rework_count` | step | number |
| `behavior.step_stall_count` | step | number |
| `behavior.step_pace_ratio_median` | step | number |

Sources: `user_profiles` and `user_project_skill_levels` for profile, `user_tools` matched
against step tool lists for tools, `user_profiles` plus `home_risks` plus `project_run_spaces`
plus `project_runs.schedule_events` for environment, and `rework_events` plus `stuck_events`
plus `user_projects_runtime` for behavior.

Two details that matter:

- Step-scoped signals require the step the risk sits on. A risk with no step gets
  `no_step_context`, never a run-level substitute.
- Behavioral counts are gated on the user actually having history in the template family. A
  zero from someone who has never built anything in this family is absence of evidence, not
  evidence they do fine, so those signals stay unresolved.

Query failures throw. A rule set evaluated against partially loaded data would under-report
risk silently.

### Rules

`project_risk_rules` rows, authored per template, targeting one Stage 1 item.

| Column | Meaning |
| --- | --- |
| `project_id` | Template the rule belongs to |
| `target_kind` | `pfmea_requirement`, `pfmea_failure_mode`, or `template_risk` |
| `target_id` | Polymorphic, validated by a `BEFORE INSERT OR UPDATE` trigger |
| `conditions` | JSONB array of `{ signal, operator, values }`, ANDed. Empty means always |
| `effect` | `adjust_occurrence`, `adjust_detection`, `include`, or `exclude` |
| `delta` | Signed movement, required and non-zero for the adjust effects, null otherwise |
| `rationale` | Required, non-blank. The sentence the user reads |
| `display_order` | Author order, which is also evaluation order |

Operators: `is_any_of`, `is_none_of`, `at_least`, `at_most`. The numeric operators are only
valid against numeric signals and take exactly one value, enforced at parse time.

**Severity is never a target.** The consequence of a failure belongs to the requirement, not to
the person: a cut through a water line is severity 10 for an expert and for a beginner alike.
Personalization moves how often something goes wrong and how likely it is to be caught.

Evaluation, in `evaluateProjectRiskLogic`:

- Adjusted scores clamp to 1-10, and hitting the limit is recorded as `clamped_at_scale_limit`
  with the movement actually applied.
- An item is included by default. If an author wrote any `include` rules for it, the item
  becomes opt-in and needs one to fire, which is how a risk specific to, say, a pre-1978 home
  stays off everyone else's list. An `exclude` rule that fires removes it.
- Every rule produces an audit entry with one of six outcomes: `fired`, `not_matched`,
  `skipped_unresolved_signal`, `skipped_unscored`, `clamped_at_scale_limit`, plus the rationale
  and a plain-language detail naming the condition that decided it.
- A malformed rule row throws `ProjectRiskRuleError` at load time rather than being skipped. A
  rule that silently disappears makes a run look safer than the author intended.

Authoring UI is `ProjectRiskRulesEditor`, opened from the Rules button on a failure mode in the
PFMEA grid and from Personalization rules in the register template form.

## 5. Stage 3: the applied risk profile

`applyProjectRiskLogicToRun(projectRunId, templateRootIdForRisks)` in
`src/utils/applyProjectRiskLogic.ts` loads Stage 1, resolves signals, loads rules for both the
template root and the run's revision, evaluates, and writes `project_run_risks`.

Columns Stage 3 owns: `risk_dimension`, `operation_step_id`, `severity_score`,
`occurrence_score`, `detection_score`, `action_priority`, `rpn`, `excluded_by_customization`,
`applied_rule_audit`, plus title and description for quality rows.

Two invariants on every re-evaluation:

1. A row the user created is never touched. User rows have no `source` and no
   `template_risk_id`, which is what distinguishes them.
2. Only the baseline scoring columns are rewritten. Mitigation progress, notes, and a
   `hidden_from_register` choice belong to the user and survive.

Excluded items are flagged, not deleted, so the audit trail and the user's state on that row
survive an evaluation that drops it.

`applied_rule_audit` holds the baseline occurrence and detection, the evaluation timestamp, and
every rule outcome. This is what makes a personalized number defensible instead of mysterious.

### Quality translation

Quality items are translated into plain language at write time, so no consumer ever joins to a
`pfmea_*` table and those tables keep their admin-only policies.

- Title: `"{step title}: {failure mode}"`, trimmed to 160 characters.
- Description: `"This step has to end up {requirement text}."`, then
  `"Get it wrong and {effect descriptions}."`, then one sentence per rule rationale that fired.

Register items keep their authored title and pick up scoring only. `writeRegisterRow` updates
the row the template sync already created and throws if there is none, because the sync is a
prerequisite.

### Rollup

`project_run_risk_profile` holds one row per run per component: worst Action Priority plus
high, medium, low, and unscored counts. Counts rather than a single score, because one High and
nine Lows are not the same problem and averaging hides which to work on. Unscored is its own
count. Rows the user hid and rows an exclude removed are not counted.

### When it runs

| Trigger | Path |
| --- | --- |
| Run creation | `ProjectActionsContext`, after the template risk sync. Failure deletes the run |
| Risk Radar opens | `useRunRiskReevaluation` in `RiskManagementWindow` |
| Planning Studio opens | `useRunRiskReevaluation` in `ProjectPlanningWizard` |
| Run completes | `ProjectCompletionHandler` |

Run creation fails hard: if risk assembly throws, the run is deleted, because a run whose risk
list is half written shows the user a safer project than they have. The later triggers surface
the error as a banner and leave the previous list in place.

Re-evaluation is not idempotent in the sense of being pointless. Tools, spaces, and history
change between runs, and re-evaluating at completion is what makes the next run start from what
actually happened on this one.

## 6. Key Characteristics

A Key Characteristic is an item where the person doing the work is the variable. It is not the
same as a severe risk, and keeping the two apart is the whole point: severity says what happens
if it goes wrong, a KC says whether paying attention changes the odds.

### The three-part test

An item qualifies when all three hold. All three inputs are data, so a component can be retuned
by migration rather than by code change.

| Test | Reads | Passes when |
| --- | --- | --- |
| It needs attention | `risk_action_priority_labels.counts_for_key_characteristic` against the applied Action Priority | The level qualifies. Seeded true for `urgency_rank >= 2`, which is H and M |
| Occurrence is human-variable | `risk_occurrence_drivers.is_human_variable` against the authored `occurrence_driver` | The driver is the person, not the process |
| It is not mistake-proofed | Quality: a prevention control on that cause with `control_strength = 'mistake_proof'`. Register: `project_risks.prevention_strength` | Nothing removes the opportunity for the error |

The third test is what keeps the list short enough to read. A high-severity failure that a jig
makes impossible is not a KC, because there is nothing for the user to watch. Without that test
the list degenerates into "everything severe", which is the failure mode of most quality
systems.

Unclassified is a real state, matching the unscored precedent. A cause or risk with a null
`occurrence_driver` is not a KC and is not assumed safe. It is counted and reported in both
authoring surfaces, because an unclassified cause excludes an item silently.

`evaluateKeyCharacteristic` in `src/utils/keyCharacteristics.ts` returns either a qualifying
verdict or one of five reasons: `unclassified_driver`, `unscored`,
`priority_does_not_qualify`, `driver_not_human_variable`, `mistake_proofed`. The PFMEA grid's
`kc` column shows the reason, so an author sees the consequence of a classification immediately.

### Driver vocabulary

`risk_occurrence_drivers`, seeded. Only the first three make a KC possible.

| Driver | Human-variable | What it means |
| --- | --- | --- |
| `skill` | yes | Goes wrong until the technique is practiced |
| `experience` | yes | Goes wrong when the person has not met this case before |
| `attention` | yes | Goes wrong when rushing, tired, or distracted, regardless of skill |
| `process_design` | no | Goes wrong for everyone because the method invites the error |
| `material_variation` | no | The material itself differs piece to piece |
| `tool_condition` | no | The tool is worn, wrong, or cannot hold the tolerance |
| `environment` | no | Temperature, humidity, light, access, or the state of the space |
| `upstream_input` | no | An earlier step handed this one something out of tolerance |

### What a KC points at

`risk_item_kind`: `output`, `process_variable`, `instruction`, `material`, `tool`, `step`. This
follows the `pfmea_requirements` precedent of a real step FK plus the id of an item inside that
step's JSON. `step` is the case where the risk is about the step as a whole and carries no item
id; the database constrains that pairing both ways.

`process_variable` is first-class because `operation_steps.process_variables` already holds the
controllable parameters, and a KC is often not the output itself but the parameter that decides
whether the output lands.

### Where the classifications are authored

| Layer | Columns | Surface |
| --- | --- | --- |
| Quality | `pfmea_potential_causes.occurrence_driver`, `implicated_item_kind`, `implicated_item_id`; `pfmea_controls.control_strength` | PFMEA grid, in the Potential Causes and Prevention Controls cells |
| Register | `project_risks.occurrence_driver`, `prevention_strength`, `implicated_item_kind`, `implicated_item_id` | Risk Radar template risk form |

Quality carries them on the cause, because occurrence lives there and the cause is what
implicates a specific item. Safety, schedule, and budget carry them on the risk row, because
those rows have no cause model: control analysis on that side is necessarily less specific, so
it is one classification per risk rather than per control.

`prevention_strength` allows `none` as distinct from null. Null means nobody has judged the
controls; `none` means they were judged and there is nothing in place.

### The run register

`project_run_key_characteristics` is derived, never authored. `recomputeProjectRunKeyCharacteristics`
in `src/utils/applyProjectRiskLogic.ts` deletes and rewrites the run's rows from the applied
list, on the same four triggers as the risk profile. So KCs move when the user's signals move:
an item can be a KC for a beginner and not for an expert, because the urgency test reads the
personalized Action Priority rather than the template's.

Delete and rewrite rather than upsert, because a classification change can remove an item from
the register and a leftover row would tell the user to watch something the analysis dropped.

One row per item per source risk, so one failure mode with three causes implicating three
different items produces three rows against a single `project_run_risks` row. That grain is why
this is a separate table rather than columns on the applied list.

`item_label` is resolved at write time from the step's JSON, and `resolveKcItemLabel` throws
rather than falling back when the id does not resolve. A KC that renders as an id tells the user
to pay attention to something they cannot identify, which is worse than not listing it.

A risk with no `operation_step_id` cannot produce a KC, since a KC has to point at something in
the workflow. A qualifying cause that names no item lands under `step`, which the authoring
surfaces report as a gap.

## 7. Where the user encounters it

| Surface | What it shows |
| --- | --- |
| Risk Radar header | Four-component strip: worst priority per component with DIY labels (Result, Safety, Time, Cost), counts, and a tooltip naming what is at stake |
| Risk Radar triage | High-first walkthrough grouped by `action_priority`, ordered by priority then RPN then title, with per-component filter chips |
| Step header, desktop and mobile | `StepRiskPriorityBadge` with a popover of that step's risk items, each marking the items it puts on the KC register |
| Step body, mobile | Sections start collapsed on Low-priority steps and expanded otherwise |
| Step body | `StepMustGetRightCallout` renders High items inline, with KCs called out separately as the ones the user can change by working differently |
| Priorities window | The run's KC register, grouped by item rather than by step, worst priority first |
| PFMEA authoring | A `kc` column showing the verdict or the reason, plus prevention gap notes, detection reality flags, an occurrence contradiction card, and unclassified counts |
| Risk Radar template authoring | Unclassified driver and prevention counts for register risks |

The read side is `useRunStepRisk`, which groups applied rows by `operation_step_id`, attaches
each row's KC entries, and sorts worst first. It skips excluded and hidden rows.

`Output.type` (`safety`, `performance-durability`, `major-aesthetics`, `none`) is the consequence
class only: what kind of harm a miss causes. It is not the KC designation, and the Priorities
window no longer reads it. Quality-scope settings still use it to mean "this output has a named
consequence", which is a different question.

### Evidence loop

`src/utils/riskEvidence.ts` aggregates `rework_events` and `stuck_events` per template step and
compares observed problems against authored occurrence.
`stepsNeedingOccurrenceReview` surfaces the contradictions, for instance a step users keep
reporting problems on that is authored as effectively never. It reports the disagreement and
does not invent a score. `riskDimensionForTriageType` in `src/utils/reworkEngine.ts` routes a
reported problem to the component it counted against.

## 8. Table reference

| Table | Role |
| --- | --- |
| `pfmea_requirements` | Stage 1 quality requirements, one per step output |
| `pfmea_failure_modes` | Failure modes, FK to requirement and step |
| `pfmea_potential_effects` | Effects with severity |
| `pfmea_potential_causes` | Causes with occurrence, occurrence driver, and implicated item |
| `pfmea_controls` | Prevention and detection controls, detection score, prevention strength |
| `pfmea_scoring` | Written 1-10 anchors, per component per criterion |
| `pfmea_action_priority_rules` | The Action Priority lookup, per component |
| `risk_action_priority_labels` | User-facing wording, urgency rank, and KC qualification for H, M, L |
| `risk_occurrence_drivers` | Driver vocabulary and which drivers are human-variable |
| `project_risks` | Stage 1 register risks for safety, schedule, budget, plus foundation risks, with their KC classifications |
| `project_risk_rules` | Stage 2 personalization rules |
| `project_run_risks` | Stage 3 applied list, all four components, plus user-added rows |
| `project_run_risk_profile` | Stage 3 per-component rollup |
| `project_run_key_characteristics` | Stage 3 KC register, one row per item per source risk |

RLS: the `pfmea_*`, rule, and lookup tables are readable by authenticated users and writable by
project editors or admins. `project_run_risk_profile` and `project_run_key_characteristics` are
scoped to the owner of the run through `project_runs.user_id`.

## 9. Gaps and known problems

Things this document would otherwise imply exist.

**No rules are seeded.** `project_risk_rules` ships empty. Every mechanism in Stage 2 is
wired, but until an author writes rules, personalization is a no-op and applied scores equal
template scores. The engine is real; the content is not there yet.

**Foundation risks are not part of the four-component system.** They reach the run and appear
in Risk Radar, but Stage 1 loading only reads `project_risks` for the template root. Foundation
rows arrive with no `risk_dimension`, no scores, and no Action Priority, so they show as
untracked in the rollup and get no personalization. Fixing this means loading the standard
project's risks into Stage 1 and dimensioning the seeded foundation rows.

**`pfmea_requirement` is an unreachable rule target.** It is allowed by the table constraint,
by `RISK_RULE_TARGET_KINDS`, and by the trigger, but `loadStage1` only builds items for
`pfmea_failure_mode` and `template_risk`, and the authoring UI only opens for those two. A rule
targeting a requirement would validate, save, and never match anything.

**`project_run_risks.is_spiked` is dead.** The column exists with a default of false and is
never written or read.

**The Risk Radar header shows two scoring systems at once.** The "Current Risk Summary"
High/Med/Low counts still come from the legacy free-text `project_run_risks.severity`, while
the four-component strip below it comes from `action_priority`. They can disagree on the same
run. The triage walkthrough prefers `action_priority` and falls back to the legacy field, so
the fallback path is still live.

**Title-collision dedupe can fail a run.** The template sync deduplicates foundation and
template risks by case-insensitive title, foundation first. If a template register risk has the
same title as a foundation risk, it is dropped from the run, and if that template risk is
scored, `writeRegisterRow` throws "is scored but has no row", which at run creation deletes the
run. The failure is loud rather than silent, but it is triggered by an authoring collision the
author gets no warning about.

**Old default scores are indistinguishable from real ones.** The `severity_score: 5` insert
default and the occurrence fallbacks are gone, so new incomplete lines read as unscored.
Rows written before that change still hold `5` and look deliberately scored. There is no way to
tell a real 5 from a defaulted one in existing data.

**Occurrence is still authored, not measured.** The evidence loop reports where reported
problems contradict authored occurrence, and stops there. Nothing feeds observed frequency back
into an occurrence score automatically, by design for now, since the sample per step is small.

**No classifications are authored yet.** The KC columns ship nullable with no backfill, so until
an author sets occurrence drivers, every run's KC register is empty and the Priorities window
shows nothing. The authoring surfaces report the count of unclassified causes and risks, which
is the number to work down.

**The KC urgency test reads the failure mode, not the cause.** Stage 2 moves one occurrence per
item, and an item is a failure mode, so the applied Action Priority belongs to the failure mode
while the driver and mistake-proofing belong to the cause. A KC therefore means "this risk needs
attention, and this cause of it is one the person controls". A cause with a low occurrence of
its own inside a high-priority failure mode still qualifies.

**Register prevention strength is coarse.** Safety, schedule, and budget risks carry one
strength for the whole risk, because those rows have no typed controls, only
`mitigation_strategy` text and a `mitigation_actions` array. A risk with one mistake-proof
control and three procedural ones cannot express that.

**`Output.mustGetRight` is orphaned.** The free-text field still exists on outputs and is no
longer read by any surface, now that the Priorities window reads the derived register. It is
neither migrated into the KC data nor removed.
