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
export const PLANNING_STANDARD_VERSION = '1.1.0';

export const PLANNING_TOPIC_IDS = [
  'product-guidelines',
  'structure',
  'instruction-levels',
  'publishing-checklist',
  'waiting-steps',
  'risks-vs-pfmea',
  'alternates',
  'no-em-dashes',
  'actions-vs-db',
  'step-instruction-sections',
] as const;

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
      'Quality control steps and criteria defined where applicable (step types and checks).',
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
    id: 'risks-vs-pfmea',
    title: 'Risks vs PFMEA',
    rule:
      'Project risks (Step 4) cover timeline and budget only. Quality failure modes belong in PFMEA (Step 9), not the risk register.',
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
