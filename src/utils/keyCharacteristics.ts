/**
 * Key Characteristics: the items where the person doing the work is the variable.
 *
 * A KC is not simply a severe risk. Severity says what happens if it goes wrong; a KC says
 * whether paying attention changes the odds. Three things have to be true:
 *
 *   1. It needs attention at all, meaning its applied Action Priority is urgent enough. Which
 *      levels qualify is data, on risk_action_priority_labels.
 *   2. Its occurrence is human-variable, meaning the authored driver is skill, experience, or
 *      attention rather than the process design, the material, or the room. Which drivers are
 *      human is data, on risk_occurrence_drivers.
 *   3. It is not mistake-proofed. A step with a jig that makes the error impossible is not a KC
 *      however bad the consequence would be, because there is nothing for the user to watch.
 *
 * The third test is why a KC list is short and useful. Without it the list becomes "everything
 * severe", which is the failure mode of most quality systems: a list nobody reads.
 *
 * An item whose driver has not been classified is not a KC and is not assumed safe either. It
 * is reported as unclassified, the same way an unscored risk line is reported rather than
 * defaulted.
 */

import type { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import type { ActionPriorityTable } from '@/utils/actionPriorityTable';
import type { ActionPriority, RiskDimension } from '@/utils/riskDimensions';

export type RiskItemKind = Database['public']['Enums']['risk_item_kind'];

export const RISK_ITEM_KINDS: readonly RiskItemKind[] = [
  'output',
  'process_variable',
  'instruction',
  'material',
  'tool',
  'step',
];

export function isRiskItemKind(value: unknown): value is RiskItemKind {
  return typeof value === 'string' && (RISK_ITEM_KINDS as readonly string[]).includes(value);
}

/** Admin-facing names for the item a KC points at. */
export const RISK_ITEM_KIND_LABELS: Record<RiskItemKind, string> = {
  output: 'Output',
  process_variable: 'Process variable',
  instruction: 'Instruction',
  material: 'Material',
  tool: 'Tool',
  step: 'The step itself',
};

/** How the strength of a prevention control is recorded. */
export const CONTROL_STRENGTHS = ['mistake_proof', 'procedural'] as const;
export type ControlStrength = (typeof CONTROL_STRENGTHS)[number];

export const CONTROL_STRENGTH_LABELS: Record<ControlStrength, string> = {
  mistake_proof: 'Makes the error impossible',
  procedural: 'Depends on the person following it',
};

/** The register side records one strength per risk, including an explicit "nothing in place". */
export const PREVENTION_STRENGTHS = ['mistake_proof', 'procedural', 'none'] as const;
export type PreventionStrength = (typeof PREVENTION_STRENGTHS)[number];

export const PREVENTION_STRENGTH_LABELS: Record<PreventionStrength, string> = {
  mistake_proof: 'Something makes it impossible',
  procedural: 'A habit or checklist, if followed',
  none: 'Nothing in place',
};

export function isControlStrength(value: unknown): value is ControlStrength {
  return typeof value === 'string' && (CONTROL_STRENGTHS as readonly string[]).includes(value);
}

export function isPreventionStrength(value: unknown): value is PreventionStrength {
  return typeof value === 'string' && (PREVENTION_STRENGTHS as readonly string[]).includes(value);
}

export class KeyCharacteristicError extends Error {}

export interface OccurrenceDriver {
  driver: string;
  label: string;
  description: string;
  isHumanVariable: boolean;
  displayOrder: number;
}

/** The driver vocabulary, keyed for lookup. */
export interface OccurrenceDriverTable {
  byDriver: Readonly<Record<string, OccurrenceDriver>>;
  /** Author order, for select inputs. */
  ordered: readonly OccurrenceDriver[];
}

export async function fetchOccurrenceDriverTable(): Promise<OccurrenceDriverTable> {
  const { data, error } = await supabase
    .from('risk_occurrence_drivers')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    throw new KeyCharacteristicError(`Could not load occurrence drivers: ${error.message}`);
  }

  const ordered = (data ?? []).map((row) => ({
    driver: row.driver,
    label: row.label,
    description: row.description,
    isHumanVariable: row.is_human_variable,
    displayOrder: row.display_order,
  }));

  if (ordered.length === 0) {
    throw new KeyCharacteristicError(
      'risk_occurrence_drivers is empty. Key Characteristics cannot be identified without it.'
    );
  }

  const byDriver: Record<string, OccurrenceDriver> = {};
  for (const driver of ordered) {
    byDriver[driver.driver] = driver;
  }

  return { byDriver, ordered };
}

export function occurrenceDriverOrThrow(
  table: OccurrenceDriverTable,
  driver: string
): OccurrenceDriver {
  const found = table.byDriver[driver];
  if (!found) {
    throw new KeyCharacteristicError(
      `risk_occurrence_drivers has no row for ${driver}, which a risk references.`
    );
  }
  return found;
}

/** Why an item is not a Key Characteristic. Every case is reportable to the author. */
export type KcDisqualification =
  /** Nobody has said what drives this occurrence, so it cannot be judged. */
  | 'unclassified_driver'
  /** The line has no priority yet, because it is not fully scored. */
  | 'unscored'
  /** The priority is not urgent enough to single out. */
  | 'priority_does_not_qualify'
  /** Occurrence is driven by the process, the material, or the room, not by the person. */
  | 'driver_not_human_variable'
  /** A control makes the error impossible, so there is nothing to watch for. */
  | 'mistake_proofed';

export const KC_DISQUALIFICATION_TEXT: Record<KcDisqualification, string> = {
  unclassified_driver: 'No occurrence driver recorded yet',
  unscored: 'Not fully scored yet',
  priority_does_not_qualify: 'Priority is not high enough to single out',
  driver_not_human_variable: 'Occurrence is set by the process, not the person',
  mistake_proofed: 'A control already makes this error impossible',
};

export interface KcCandidate {
  /** Null when the line is not fully scored. */
  actionPriority: ActionPriority | null;
  /** Null when nobody has classified the driver yet. */
  occurrenceDriver: string | null;
  /** True when a control removes the opportunity for the error entirely. */
  isMistakeProofed: boolean;
}

/** Tagged with a string rather than a boolean so it narrows under this project's tsconfig. */
export type KcVerdict =
  | { outcome: 'key_characteristic'; driver: OccurrenceDriver; actionPriority: ActionPriority }
  | { outcome: 'not_key_characteristic'; reason: KcDisqualification };

/**
 * The three-part test. Order matters for the reason returned: an unclassified driver is
 * reported ahead of everything else, because it is the one an author can act on.
 */
export function evaluateKeyCharacteristic(
  candidate: KcCandidate,
  drivers: OccurrenceDriverTable,
  actionPriorityTable: ActionPriorityTable
): KcVerdict {
  if (candidate.occurrenceDriver === null) {
    return { outcome: 'not_key_characteristic', reason: 'unclassified_driver' };
  }
  if (candidate.actionPriority === null) {
    return { outcome: 'not_key_characteristic', reason: 'unscored' };
  }

  const label = actionPriorityTable.labels[candidate.actionPriority];
  if (!label) {
    throw new KeyCharacteristicError(
      `risk_action_priority_labels has no row for ${candidate.actionPriority}.`
    );
  }
  if (!label.countsForKeyCharacteristic) {
    return { outcome: 'not_key_characteristic', reason: 'priority_does_not_qualify' };
  }

  const driver = occurrenceDriverOrThrow(drivers, candidate.occurrenceDriver);
  if (!driver.isHumanVariable) {
    return { outcome: 'not_key_characteristic', reason: 'driver_not_human_variable' };
  }

  if (candidate.isMistakeProofed) {
    return { outcome: 'not_key_characteristic', reason: 'mistake_proofed' };
  }

  return { outcome: 'key_characteristic', driver, actionPriority: candidate.actionPriority };
}

/**
 * The item a KC points at, resolved against the step it belongs to.
 *
 * `item_kind` of 'step' carries no id: the risk is about the step as a whole.
 */
export interface KcItemRef {
  kind: RiskItemKind;
  id: string | null;
}

/** The JSON collections on operation_steps that hold addressable items. */
export interface StepItemSource {
  stepTitle: string;
  outputs: unknown;
  processVariables: unknown;
  materials: unknown;
  tools: unknown;
  /** Content section objects from step_instructions.content, across instruction levels. */
  instructionSections: unknown;
}

function namedEntries(raw: unknown): { id: string; name: string }[] {
  if (!Array.isArray(raw)) return [];
  const entries: { id: string; name: string }[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id.trim() : '';
    if (id === '') continue;
    // Steps carry items under different keys depending on the authoring surface that wrote
    // them, so the first present name-like field is used rather than assuming one shape.
    const name =
      typeof record.name === 'string' && record.name.trim() !== ''
        ? record.name.trim()
        : typeof record.title === 'string' && record.title.trim() !== ''
          ? record.title.trim()
          : typeof record.item === 'string' && record.item.trim() !== ''
            ? record.item.trim()
            : '';
    if (name === '') continue;
    entries.push({ id, name });
  }
  return entries;
}

function sourceForKind(source: StepItemSource, kind: RiskItemKind): unknown {
  switch (kind) {
    case 'output':
      return source.outputs;
    case 'process_variable':
      return source.processVariables;
    case 'material':
      return source.materials;
    case 'tool':
      return source.tools;
    case 'instruction':
      return source.instructionSections;
    case 'step':
      return null;
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

/**
 * The items of one kind an author can point a risk at, in the order the step lists them.
 *
 * Empty means the step has none of that kind authored yet, which the picker shows rather than
 * offering a kind with nothing behind it.
 */
export function listKcItemOptions(
  source: StepItemSource,
  kind: RiskItemKind
): { id: string; name: string }[] {
  if (kind === 'step') return [];
  return namedEntries(sourceForKind(source, kind));
}

/**
 * Display name for the item, or a throw when the id does not resolve.
 *
 * Throwing matters: a KC that renders as an id or a placeholder tells the user to pay
 * attention to something they cannot identify, which is worse than not listing it.
 */
export function resolveKcItemLabel(ref: KcItemRef, source: StepItemSource): string {
  if (ref.kind === 'step') return source.stepTitle;

  if (ref.id === null) {
    throw new KeyCharacteristicError(
      `A ${RISK_ITEM_KIND_LABELS[ref.kind]} key characteristic has no item id.`
    );
  }

  const match = namedEntries(sourceForKind(source, ref.kind)).find((entry) => entry.id === ref.id);
  if (!match) {
    throw new KeyCharacteristicError(
      `Step "${source.stepTitle}" has no ${RISK_ITEM_KIND_LABELS[ref.kind]} with id ${ref.id}. ` +
        'The risk points at an item that was renamed or removed.'
    );
  }
  return match.name;
}

/** What the authoring surfaces report so an author can see what is blocking the register. */
export interface KcClassificationGaps {
  /** Items with no occurrence driver recorded. */
  unclassifiedDriverCount: number;
  /** Prevention controls with no strength recorded, so mistake-proofing is unknown. */
  unclassifiedControlStrengthCount: number;
  /** Qualifying items whose implicated workflow item was never chosen. */
  missingItemRefCount: number;
  /** Items that passed all three tests. */
  keyCharacteristicCount: number;
}

export interface KcGapInput {
  candidate: KcCandidate;
  hasItemRef: boolean;
}

export function summarizeKcClassificationGaps(
  items: readonly KcGapInput[],
  unclassifiedControlStrengthCount: number,
  drivers: OccurrenceDriverTable,
  actionPriorityTable: ActionPriorityTable
): KcClassificationGaps {
  let unclassifiedDriverCount = 0;
  let missingItemRefCount = 0;
  let keyCharacteristicCount = 0;

  for (const item of items) {
    const verdict = evaluateKeyCharacteristic(item.candidate, drivers, actionPriorityTable);
    if (verdict.outcome === 'not_key_characteristic') {
      if (verdict.reason === 'unclassified_driver') unclassifiedDriverCount += 1;
      continue;
    }
    keyCharacteristicCount += 1;
    if (!item.hasItemRef) missingItemRefCount += 1;
  }

  return {
    unclassifiedDriverCount,
    unclassifiedControlStrengthCount,
    missingItemRefCount,
    keyCharacteristicCount,
  };
}

/** One row of the register, as consumers read it. */
export interface KeyCharacteristicRow {
  id: string;
  projectRunRiskId: string;
  operationStepId: string;
  itemKind: RiskItemKind;
  itemId: string | null;
  itemLabel: string;
  dimension: RiskDimension;
  actionPriority: ActionPriority;
  occurrenceDriver: string;
  attentionReason: string;
}
