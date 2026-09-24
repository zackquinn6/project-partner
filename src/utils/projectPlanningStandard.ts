/**
 * Shared product-planning rules (SoT for humans + AI).
 * AI-only SQL/field catalogs stay in AI_PROJECT_DEVELOPMENT_REFERENCE.md.
 * Human-only UI click-paths stay in PlanningGuideWindow.
 *
 * After changing this file: `npm run sync:planning-standard`
 * Drift check: `npm run check:planning-standard`
 */

import {
  TOOLIO_PROJECT_STRUCTURE_STANDARD,
  type ToolioProjectStructureStandard,
} from './projectStructureStandard';

export { TOOLIO_PROJECT_STRUCTURE_STANDARD };
export type { ToolioProjectStructureStandard };

/** Bump when shared product rules change; both surfaces must show the same value. */
export const PLANNING_STANDARD_VERSION = '1.5.0';

export const PLANNING_TOPIC_IDS = [
  'product-guidelines',
  'structure',
  'instruction-levels',
  'publishing-checklist',
  'waiting-steps',
  'quality-control-placement',
  'risks-vs-pfmea',
  'alternates',
  'no-em-dashes',
  'actions-vs-db',
  'step-instruction-sections',
  'owned-vs-adopted-phases',
  'content-completeness',
  'quality-goals',
  'content-axes',
  'professional-naming',
] as const;

/**
 * Where QC lives in the process map, and how QC steps connect to workflow methods.
 * Default: nest QC inside value-add operations. Distinct QC ops/phases are rare.
 */
export const QUALITY_CONTROL_STANDARD = {
  defaultPlacement:
    'Quality control belongs as steps inside value-add operations (Prep, Install, Finish), not as its own phase or operation. A normal process map does not include a Quality Control stage.',
  stepTypeRule:
    'Mark those steps with step_type quality_control_non_scaled or quality_control_scaled. Keep the parent operation named for the value-add work.',
  methodsSectionRule:
    'Every quality_control_* step must name the method(s) it applies from the Quality Control Methods catalog below. Put the method name and how to apply it in outputs[].qualityChecks (and in Instructions when the check is a user action). The Quality Control planning tool and PFMEA detection controls should stay consistent with those method names.',
  methods: [
    {
      id: 'visual',
      label: 'Visual inspection',
      description:
        'Eyes and light: clean/sound substrate, seam continuity, coverage look, finish defects, raking-light plane.',
      placement: 'in-process',
    },
    {
      id: 'dimensional',
      label: 'Dimensional / flatness measurement',
      description:
        'Straightedge, level, square, gap gauge, or similar against a stated tolerance (e.g. substrate flatness).',
      placement: 'in-process',
    },
    {
      id: 'sample-frequency',
      label: 'Sample / frequency check',
      description:
        'Periodic lift, pull, or probe at a stated sample rate during production (e.g. lift tiles for mortar coverage).',
      placement: 'in-process',
    },
    {
      id: 'short-functional',
      label: 'Short functional test',
      description:
        'Brief operate-and-observe check measured in minutes, interleaved with production (fit, alignment, open/close).',
      placement: 'in-process',
    },
    {
      id: 'hold-soak-pressure',
      label: 'Hold / soak / flood / pressure test',
      description:
        'Dedicated setup plus a timed hold that is the work itself (overnight flood, code pressure/DWV water test). Gates the next value-add stage.',
      placement: 'distinct-when-scheduled',
    },
  ],
  distinctOpCriteria:
    'Create a distinct QC operation (or, when the hold is overnight or a natural pause between stages, a distinct phase) only when the control is the primary activity for that block, requires dedicated setup plus a scheduled hold that breaks continuous production, and produces a standalone pass/fail gate before the next value-add work. Visual checks, straightedge measurements, and sample-frequency lifts stay nested in the value-add operation.',
  examples: [
    {
      project: 'Tile flooring / shower tile',
      valueAdd: 'Prep → Install → Finish',
      inProcess:
        'Prep: visual substrate check + straightedge flatness. Install: periodic tile lifts for mortar coverage. Finish: lippage/joint checks as QC steps inside Finish.',
      distinct:
        'After waterproofing: flood test (plug, fill, mark level, hold overnight, verify no drop/leak) as its own operation or phase before setting tile.',
    },
    {
      project: 'Painting',
      valueAdd: 'Prep → Prime → Paint → Finish',
      inProcess:
        'Prep: feel and light check for dust/defects. Paint: wet-edge and coverage checks under raking light during rolling.',
      distinct: 'None for routine DIY painting.',
    },
    {
      project: 'Drywall',
      valueAdd: 'Hang → Tape/mud → Sand → Finish',
      inProcess:
        'Hang: screw-depth checks while fastening. Mud/sand: coverage and raking-light checks inside those ops.',
      distinct: 'None for routine DIY drywall.',
    },
    {
      project: 'Plumbing rough-in',
      valueAdd: 'Rough-in → Connect → Finish',
      inProcess: 'Joint makeup visual checks while assembling.',
      distinct:
        'Code DWV/water pressure or vacuum test (fill/pressurize, timed hold, leak check) as its own operation before covering walls.',
    },
  ],
  authoringRule:
    'Default nest in-process QC as quality_control_* steps inside value-add ops and link each to a Quality Control Methods catalog entry via outputs.qualityChecks. Promote to a distinct operation or phase only for hold/soak/flood/pressure (or equivalent scheduled gate) tests. Never invent a Quality Control phase for visual, dimensional, sample-frequency, or short functional checks.',
} as const;

/**
 * Three orthogonal axes that change what a run shows.
 * Instruction depth and quality path do not interact: Professional + beginner is allowed.
 */
export const CONTENT_AXES_STANDARD = {
  axes: [
    {
      id: 'instruction',
      label: 'Instruction detail',
      values: 'beginner / intermediate / advanced',
      effect: 'Same steps; different prose depth (and media) via step_instructions rows.',
    },
    {
      id: 'quality',
      label: 'Quality goal',
      values: 'good / great / professional',
      effect:
        'Different process path: include or exclude steps and operations via min_quality_goal; outcome/process narrative via project_quality_levels (snapshotted onto the run).',
    },
    {
      id: 'customization',
      label: 'Customization',
      values: 'prime / alternate / if-necessary (+ micro-decisions)',
      effect:
        'Branching choices. Do not overload if-necessary for quality ladder gating.',
    },
  ],
  interactionRule:
    'Axes are orthogonal. A beginner can run a Professional quality path (harder process with more scaffolding). Write all three instruction levels on quality-gated steps too.',
  namingRule:
    'Do not confuse quality goal Professional (finish / process ladder) with catalog or step skill_level Professional (who the work is sized for). Use clear labels: Quality goal vs Skill level.',
} as const;

/** Run quality goal ladder: outcome + process (kickoff / Risk Radar). */
export const QUALITY_GOAL_LEVEL_STANDARD = {
  levels: [
    {
      value: 'good',
      label: 'Good',
      outcome:
        'Functional, acceptable finish; visible DIY imperfections within stated tolerances.',
      process: 'Shortest owned path: core steps only.',
    },
    {
      value: 'great',
      label: 'Great',
      outcome:
        'Strong DIY finish; tighter tolerances and cleaner detailing.',
      process: 'Core path plus standard best-practice steps. Default for new runs.',
    },
    {
      value: 'professional',
      label: 'Professional',
      outcome:
        'Near-trade finish; strictest tolerances and presentation.',
      process:
        'Great path plus extra prep and finish steps (sanding, leveling systems, seal always, extra QC, etc.).',
    },
  ],
  authoringRule:
    'Every catalog template that ships quality goals authors three project_quality_levels rows (kickoff_summary + outcome + process). kickoff_summary is the one-line kickoff Goals blurb for that project and level. Relative vs_lower_summary is required on great and professional. Process differences are real operation_steps (and phase_operations when a whole op is gated) with min_quality_goal, not prose alone. Quality-impact content is authored on the owning project only; adopted or linked phases display their source project rows without copying onto the host. At run create, copy contributing rows into project_run_quality_levels so impact copy stays frozen with the run.',
} as const;

export type PlanningTopicId = (typeof PLANNING_TOPIC_IDS)[number];

export const PRODUCT_GUIDELINES: string[] = [
  'Keep instructions sequential, simple, and broken into clear phases.',
  'Number only actions the user performs; put context, why-it-matters, and completion meaning in Background/Need-to-Know - never as their own instruction step.',
  'Be specific about tools, materials, timing, and what "good" looks like.',
  'Update content regularly to reflect current techniques and standards.',
  'Put safety guidance upfront and explain why each step matters.',
  'Use visuals only when they add clarity or prevent confusion.',
  'Treat feedback as a signal for improvement and respond promptly.',
  'Monitor Success Scores and adjust content based on user outcomes.',
  'Maintain a supportive, human tone that builds confidence.',
  'Offer alternatives and quick fixes when tools or conditions vary.',
  'Keep version notes so updates stay consistent across the system.',
];

export const INSTRUCTION_LEVELS = {
  levels: ['beginner', 'intermediate', 'advanced'] as const,
  rule:
    'Every target step needs three instruction rows: beginner, intermediate, and advanced. Write level-appropriate detail; users see the level that matches their experience.',
};

export interface PublishingChecklistItem {
  id: string;
  label: string;
  description: string;
  /** Maps to AI_PROJECT_DEVELOPMENT_REFERENCE.md §B Step N headings. */
  aiStepRefs: number[];
}

export const PUBLISHING_CHECKLIST: PublishingChecklistItem[] = [
  {
    id: 'instruction-levels',
    label: '3 levels of instructions',
    description:
      'Beginner, Intermediate, and Advanced content for steps where it matters.',
    aiStepRefs: [2],
  },
  {
    id: 'tools-alternates',
    label: 'Tools & alternates',
    description:
      'Primary tools and alternate options defined for steps that require tools.',
    aiStepRefs: [5],
  },
  {
    id: 'materials-alternates',
    label: 'Materials & alternates',
    description:
      'Materials and quantities (and alternates where applicable) for each step.',
    aiStepRefs: [6],
  },
  {
    id: 'pfmea',
    label: 'PFMEA',
    description:
      'Process FMEA (failure modes and effects) completed where relevant for the project.',
    aiStepRefs: [9],
  },
  {
    id: 'risks',
    label: 'Risks',
    description:
      'Timeline and budget risks with mitigation strategies documented in project risk management.',
    aiStepRefs: [4],
  },
  {
    id: 'outputs-priorities',
    label: 'Outputs / priorities',
    description:
      'Key product or process outputs identified and documented (what "done" looks like).',
    aiStepRefs: [3],
  },
  {
    id: 'quality-control',
    label: 'Quality Control',
    description:
      'In-process QC nested as quality_control_* steps inside value-add operations, each linked to a Quality Control Methods catalog entry via outputs.qualityChecks; distinct QC ops/phases only for scheduled hold/soak/flood/pressure gates.',
    aiStepRefs: [1, 3],
  },
  {
    id: 'error-correction',
    label: 'Error Correction',
    description:
      'Guidance for common errors and how to correct them (Error-Recovery instruction sections).',
    aiStepRefs: [2],
  },
  {
    id: 'safety',
    label: 'Safety',
    description:
      'Safety guidance upfront and at relevant steps; reasons explained.',
    aiStepRefs: [2],
  },
  {
    id: 'quality-goals',
    label: 'Quality goals',
    description:
      'Good / Great / Professional outcome and process content, plus min_quality_goal on steps that differ by level.',
    aiStepRefs: [11],
  },
];

export interface CrossCuttingRule {
  id: PlanningTopicId | string;
  title: string;
  rule: string;
}

export const CROSS_CUTTING_RULES: CrossCuttingRule[] = [
  {
    id: 'waiting-steps',
    title: 'Waiting steps (drying, curing)',
    rule:
      'Engineer all waiting steps (e.g. paint dry, curing) as their own step with specific wait times, and set workers needed = 0.',
  },
  {
    id: 'quality-control-placement',
    title: 'Quality control placement (in-process vs distinct)',
    rule: QUALITY_CONTROL_STANDARD.authoringRule,
  },
  {
    id: 'risks-vs-pfmea',
    title: 'Risks vs PFMEA',
    rule:
      'Project risks (Step 4) cover safety, schedule, and budget. Quality failure modes belong in PFMEA (Step 9), not the risk register. Risk titles name a concrete cause or failure mode a user can mitigate (e.g. "Expired thinset or mortar past use-by date", "Shelf-expired adhesives or finishes"), not a vague category ("Low-quality materials") or an outcome of many risks ("Underestimating project time").',
  },
  {
    id: 'alternates',
    title: 'Tools and materials alternates',
    rule:
      'Where a step requires tools or materials, define primary items and alternate options when users may substitute brand, type, or pack size.',
  },
  {
    id: 'no-em-dashes',
    title: 'No em-dashes in catalog prose',
    rule:
      'Do not use em-dashes in authored catalog / user-facing prose (descriptions, challenges, step instructions, risk copy). Use standard dashes or hyphens.',
  },
  {
    id: 'actions-vs-db',
    title: 'Actions vs database tables',
    rule:
      'Hierarchy is Phase → Operation → Step → Action. Actions are instructional micro-units inside step_instructions content; they are not a separate database table. DB tables stop at operation_steps + step_instructions.',
  },
  {
    id: 'step-instruction-sections',
    title: 'Step instruction sections',
    rule:
      'Background/Need-to-Know is valuable domain context (why it matters, timing, complexity, how the app helps) - not a restatement of what the step is. Instructions are numbered sequential actions only; do not number explanatory status or completion notes as their own steps - put that in Background or fold it into an adjacent action. Error-Recovery uses full-sentence context so the user can diagnose quickly (e.g. "If your list is missing something, finish your plan").',
  },
  {
    id: 'owned-vs-adopted-phases',
    title: 'Owned vs standard and adopted phases',
    rule:
      'A project only owns the phases authored on it. Standard foundation phases and phases linked or adopted from another template are read-only inside this project: their phases, operations, steps, instructions, and enrichments are edited in the source template instead. Project content work covers owned phases only; gaps found in a standard or adopted phase get reported to the owner of that template, not patched locally.',
  },
  {
    id: 'content-completeness',
    title: 'Content completeness per step',
    rule:
      'A project is content complete when every step in every owned phase satisfies the step requirements above: three instruction levels, outputs, tools, materials, process variables, time estimates, quality checks, and failure modes where relevant. Partial coverage is a gap list, not a finished project, so audit every owned step rather than the ones most recently touched.',
  },
  {
    id: 'quality-goals',
    title: 'Quality goals (Good / Great / Professional)',
    rule:
      'Good, Great, and Professional are both outcome and process. Author three project_quality_levels rows per owning template, including kickoff_summary for the kickoff Goals one-liner. Gate extra process with operation_steps.min_quality_goal and phase_operations.min_quality_goal when a whole operation is quality-gated (null = all levels; great = Great+Professional; professional = Professional only). Do not overload if-necessary for quality gating. Adopted phases keep quality-impact content on the source project; runs snapshot contributing rows into project_run_quality_levels at create. Mid-run goal changes reshape incomplete forward steps and ops only; completed steps stay complete; Quality Control uses the current goal as the expected level.',
  },
  {
    id: 'content-axes',
    title: 'Content axes (instruction, quality, customization)',
    rule: CONTENT_AXES_STANDARD.interactionRule,
  },
  {
    id: 'professional-naming',
    title: 'Professional naming (quality vs skill)',
    rule: CONTENT_AXES_STANDARD.namingRule,
  },
];

export const HIERARCHY_SUMMARY =
  'Phases & operations = project management. Steps = instructions. Actions = micro instructions inside step content (not a separate DB table).';

/** Stable snapshot used by sync/check scripts (plain data only). */
export function getPlanningStandardSnapshot() {
  return {
    version: PLANNING_STANDARD_VERSION,
    topicIds: [...PLANNING_TOPIC_IDS],
    productGuidelines: PRODUCT_GUIDELINES,
    instructionLevels: INSTRUCTION_LEVELS,
    qualityGoalLevels: QUALITY_GOAL_LEVEL_STANDARD,
    contentAxes: CONTENT_AXES_STANDARD,
    qualityControl: QUALITY_CONTROL_STANDARD,
    publishingChecklist: PUBLISHING_CHECKLIST,
    crossCuttingRules: CROSS_CUTTING_RULES,
    hierarchySummary: HIERARCHY_SUMMARY,
    structure: TOOLIO_PROJECT_STRUCTURE_STANDARD,
  };
}

export function renderPlanningStandardMarkdown(): string {
  const s = TOOLIO_PROJECT_STRUCTURE_STANDARD;
  const lines: string[] = [];

  lines.push(`## Shared product planning standard (generated)`);
  lines.push('');
  lines.push(
    `**Version:** \`${PLANNING_STANDARD_VERSION}\` - **Source of truth:** \`src/utils/projectPlanningStandard.ts\``,
  );
  lines.push('');
  lines.push(
    'Do not hand-edit this block. Change the TypeScript module, then run `npm run sync:planning-standard`. Authoring/SQL field catalogs remain in §A / §B below.',
  );
  lines.push('');

  lines.push('### Product guidelines');
  lines.push('');
  for (const g of PRODUCT_GUIDELINES) {
    lines.push(`- ${g}`);
  }
  lines.push('');

  lines.push('### Instruction levels');
  lines.push('');
  lines.push(
    `- Levels: ${INSTRUCTION_LEVELS.levels.map((l) => `\`${l}\``).join(', ')}`,
  );
  lines.push(`- ${INSTRUCTION_LEVELS.rule}`);
  lines.push('');

  lines.push('### Content axes (instruction, quality, customization)');
  lines.push('');
  lines.push('| Axis | Values | Effect |');
  lines.push('| ---- | ------ | ------ |');
  for (const axis of CONTENT_AXES_STANDARD.axes) {
    lines.push(`| **${axis.label}** (\`${axis.id}\`) | ${axis.values} | ${axis.effect} |`);
  }
  lines.push('');
  lines.push(`- ${CONTENT_AXES_STANDARD.interactionRule}`);
  lines.push(`- ${CONTENT_AXES_STANDARD.namingRule}`);
  lines.push('');

  lines.push('### Quality goals (Good / Great / Professional)');
  lines.push('');
  lines.push('| Level | Outcome | Process |');
  lines.push('| ----- | ------- | ------- |');
  for (const level of QUALITY_GOAL_LEVEL_STANDARD.levels) {
    lines.push(
      `| **${level.label}** (\`${level.value}\`) | ${level.outcome} | ${level.process} |`,
    );
  }
  lines.push('');
  lines.push(`- ${QUALITY_GOAL_LEVEL_STANDARD.authoringRule}`);
  lines.push('');

  lines.push('### Quality control placement and methods');
  lines.push('');
  lines.push(`- **Default:** ${QUALITY_CONTROL_STANDARD.defaultPlacement}`);
  lines.push(`- **Step type:** ${QUALITY_CONTROL_STANDARD.stepTypeRule}`);
  lines.push(`- **Methods link:** ${QUALITY_CONTROL_STANDARD.methodsSectionRule}`);
  lines.push(`- **Distinct op/phase:** ${QUALITY_CONTROL_STANDARD.distinctOpCriteria}`);
  lines.push(`- **Authoring:** ${QUALITY_CONTROL_STANDARD.authoringRule}`);
  lines.push('');
  lines.push('#### Quality Control Methods catalog');
  lines.push('');
  lines.push('| Id | Method | Placement | Description |');
  lines.push('| -- | ------ | --------- | ----------- |');
  for (const method of QUALITY_CONTROL_STANDARD.methods) {
    lines.push(
      `| \`${method.id}\` | **${method.label}** | ${method.placement} | ${method.description} |`,
    );
  }
  lines.push('');
  lines.push('#### Research examples (in-process vs distinct)');
  lines.push('');
  for (const ex of QUALITY_CONTROL_STANDARD.examples) {
    lines.push(
      `- **${ex.project}** (${ex.valueAdd}): In-process - ${ex.inProcess} Distinct - ${ex.distinct}`,
    );
  }
  lines.push('');

  lines.push('### Project structure');
  lines.push('');
  lines.push(s.summary);
  lines.push('');
  lines.push(`**Hierarchy:** ${s.hierarchy.join(' · ')}`);
  lines.push('');
  lines.push(HIERARCHY_SUMMARY);
  lines.push('');

  for (const key of ['phase', 'operation', 'step', 'action'] as const) {
    const level = s.levels[key];
    lines.push(`#### ${level.name}`);
    lines.push('');
    lines.push(`- **Description:** ${level.description}`);
    lines.push(`- **Purpose:** ${level.purpose}`);
    lines.push(`- **Contains:** ${level.contains}`);
    if (level.durationTypical) {
      lines.push(`- **Typical duration:** ${level.durationTypical}`);
    }
    if (level.durationMax) {
      lines.push(`- **Max duration:** ${level.durationMax}`);
    }
    if (level.countRules) {
      lines.push(`- **Count:** ${level.countRules}`);
    }
    for (const rule of level.mustRules) {
      lines.push(`- ${rule}`);
    }
    if (level.examples && level.examples.length > 0) {
      lines.push(`- **Examples:** ${level.examples.join('; ')}`);
    }
    lines.push('');
  }

  lines.push('#### Step requirements (every step)');
  lines.push('');
  for (const req of s.stepRequirements) {
    lines.push(`- ${req}`);
  }
  lines.push('');

  lines.push('#### Time standards summary');
  lines.push('');
  lines.push('| Level | Typical | Max | Notes |');
  lines.push('| ----- | ------- | --- | ----- |');
  for (const row of s.timeStandards) {
    lines.push(
      `| ${row.level} | ${row.typicalDuration} | ${row.maxDuration} | ${row.notes} |`,
    );
  }
  lines.push('');

  lines.push('### Publishing checklist (maps to §B Steps)');
  lines.push('');
  lines.push('| Id | Checklist item | AI Step refs |');
  lines.push('| -- | -------------- | ------------ |');
  for (const item of PUBLISHING_CHECKLIST) {
    lines.push(
      `| \`${item.id}\` | **${item.label}** - ${item.description} | ${item.aiStepRefs.map((n) => String(n)).join(', ')} |`,
    );
  }
  lines.push('');

  lines.push('### Cross-cutting product rules');
  lines.push('');
  for (const rule of CROSS_CUTTING_RULES) {
    lines.push(`- **${rule.title}** (\`${rule.id}\`): ${rule.rule}`);
  }
  lines.push('');

  return lines.join('\n');
}
