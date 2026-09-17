/**
 * Stage 2 of the risk model: turning an authored template risk into this user's risk.
 *
 * Rules read signals and move occurrence and detection. Severity never moves, because the
 * consequence of a failure belongs to the requirement, not to the person doing the work: a
 * cut through a water line is severity 10 for an expert and for a beginner alike.
 *
 * The evaluator is pure. It takes signals, rules, and Stage 1 items, and returns applied
 * items plus an audit trail of every rule that fired, did not match, or could not be judged
 * because a signal was unresolved. The audit is what makes a personalized number defensible
 * instead of mysterious.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import {
  resolveActionPriority,
  type ActionPriorityTable,
} from '@/utils/actionPriorityTable';
import { isRiskDimension, type ActionPriority, type RiskDimension } from '@/utils/riskDimensions';
import {
  RISK_SIGNALS,
  RISK_SIGNAL_UNRESOLVED_REASON_TEXT,
  isRiskSignalKey,
  readRiskSignal,
  type RiskSignalKey,
  type RiskSignalSet,
} from '@/utils/riskSignals';

type ProjectRiskRuleRow = Database['public']['Tables']['project_risk_rules']['Row'];

export class ProjectRiskRuleError extends Error {}

export const RISK_RULE_TARGET_KINDS = [
  'pfmea_requirement',
  'pfmea_failure_mode',
  'template_risk',
] as const;
export type RiskRuleTargetKind = (typeof RISK_RULE_TARGET_KINDS)[number];

export const RISK_RULE_EFFECTS = [
  'adjust_occurrence',
  'adjust_detection',
  'include',
  'exclude',
] as const;
export type RiskRuleEffect = (typeof RISK_RULE_EFFECTS)[number];

/**
 * Operators a rule can use. Numeric comparisons are only valid against numeric signals; the
 * parser enforces that pairing so an authored rule cannot compare a skill level to `>= 3`.
 */
export const RISK_RULE_OPERATORS = ['is_any_of', 'is_none_of', 'at_least', 'at_most'] as const;
export type RiskRuleOperator = (typeof RISK_RULE_OPERATORS)[number];

const NUMERIC_OPERATORS: readonly RiskRuleOperator[] = ['at_least', 'at_most'];

export const RISK_RULE_OPERATOR_LABELS: Record<RiskRuleOperator, string> = {
  is_any_of: 'is any of',
  is_none_of: 'is none of',
  at_least: 'is at least',
  at_most: 'is at most',
};

export interface RiskRuleCondition {
  signal: RiskSignalKey;
  operator: RiskRuleOperator;
  /** One value for the numeric operators, one or more for the membership operators. */
  values: readonly (string | number)[];
}

export interface ProjectRiskRule {
  id: string;
  projectId: string;
  targetKind: RiskRuleTargetKind;
  targetId: string;
  /** ANDed. An empty list means the rule applies to every run of this template. */
  conditions: readonly RiskRuleCondition[];
  effect: RiskRuleEffect;
  /** Signed score movement for the adjust effects, null for include and exclude. */
  delta: number | null;
  /** The sentence the user reads explaining why this risk is theirs. */
  rationale: string;
  displayOrder: number;
}

/** A Stage 1 item as authored: a PFMEA failure mode line, or a template register risk. */
export interface RiskLogicItem {
  targetKind: RiskRuleTargetKind;
  targetId: string;
  dimension: RiskDimension;
  operationStepId: string | null;
  severityScore: number | null;
  occurrenceScore: number | null;
  detectionScore: number | null;
}

export type RiskRuleOutcome =
  /** Conditions all matched and the effect was applied. */
  | 'fired'
  /** A condition did not match this user. */
  | 'not_matched'
  /** A condition read a signal with no value, so the rule was not judged either way. */
  | 'skipped_unresolved_signal'
  /** The rule matched, but the item has no score to move. */
  | 'skipped_unscored'
  /** The rule matched, but the score was already at the end of the 1 to 10 scale. */
  | 'clamped_at_scale_limit';

export interface RiskRuleAuditEntry {
  ruleId: string;
  effect: RiskRuleEffect;
  outcome: RiskRuleOutcome;
  rationale: string;
  /** Which condition decided the outcome, and why, in plain language. */
  detail: string | null;
  /** The movement actually applied, which can be smaller than delta at the scale limit. */
  appliedDelta: number | null;
}

export interface AppliedRiskItem extends RiskLogicItem {
  /** Occurrence after the rules, still on the 1 to 10 scale. Null when never scored. */
  appliedOccurrenceScore: number | null;
  appliedDetectionScore: number | null;
  actionPriority: ActionPriority | null;
  rpn: number | null;
  /** False when an exclude rule fired, or when include rules exist and none matched. */
  included: boolean;
  /** Rationales from the rules that fired, in author order, for the user to read. */
  rationales: readonly string[];
  audit: readonly RiskRuleAuditEntry[];
}

const SCORE_MIN = 1;
const SCORE_MAX = 10;

function isTargetKind(value: unknown): value is RiskRuleTargetKind {
  return typeof value === 'string' && (RISK_RULE_TARGET_KINDS as readonly string[]).includes(value);
}

function isEffect(value: unknown): value is RiskRuleEffect {
  return typeof value === 'string' && (RISK_RULE_EFFECTS as readonly string[]).includes(value);
}

function isOperator(value: unknown): value is RiskRuleOperator {
  return typeof value === 'string' && (RISK_RULE_OPERATORS as readonly string[]).includes(value);
}

/**
 * Parses one stored condition. Anything malformed raises rather than being dropped: a rule
 * that silently disappears makes a run look safer than the author intended.
 */
function parseCondition(raw: unknown, ruleId: string): RiskRuleCondition {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ProjectRiskRuleError(`Rule ${ruleId} has a condition that is not an object.`);
  }
  const record = raw as Record<string, unknown>;

  if (!isRiskSignalKey(record.signal)) {
    throw new ProjectRiskRuleError(
      `Rule ${ruleId} references unknown signal ${String(record.signal)}.`
    );
  }
  if (!isOperator(record.operator)) {
    throw new ProjectRiskRuleError(
      `Rule ${ruleId} uses unknown operator ${String(record.operator)}.`
    );
  }
  if (!Array.isArray(record.values) || record.values.length === 0) {
    throw new ProjectRiskRuleError(`Rule ${ruleId} has a condition with no values.`);
  }

  const signal = record.signal;
  const operator = record.operator;
  const descriptor = RISK_SIGNALS[signal];
  const numeric = NUMERIC_OPERATORS.includes(operator);

  if (numeric && descriptor.valueType !== 'number') {
    throw new ProjectRiskRuleError(
      `Rule ${ruleId} compares ${signal}, which is text, with ${operator}.`
    );
  }
  if (numeric && record.values.length !== 1) {
    throw new ProjectRiskRuleError(
      `Rule ${ruleId} uses ${operator} with ${record.values.length} values; it takes one.`
    );
  }

  const values: (string | number)[] = [];
  for (const value of record.values) {
    if (descriptor.valueType === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new ProjectRiskRuleError(
          `Rule ${ruleId} compares numeric signal ${signal} against ${JSON.stringify(value)}.`
        );
      }
      values.push(value);
      continue;
    }
    if (typeof value !== 'string' || value.trim() === '') {
      throw new ProjectRiskRuleError(
        `Rule ${ruleId} compares text signal ${signal} against ${JSON.stringify(value)}.`
      );
    }
    values.push(value.trim());
  }

  return { signal, operator, values };
}

export function parseProjectRiskRule(row: ProjectRiskRuleRow): ProjectRiskRule {
  if (!isTargetKind(row.target_kind)) {
    throw new ProjectRiskRuleError(`Rule ${row.id} has unknown target kind ${row.target_kind}.`);
  }
  if (!isEffect(row.effect)) {
    throw new ProjectRiskRuleError(`Rule ${row.id} has unknown effect ${row.effect}.`);
  }
  if (!Array.isArray(row.conditions)) {
    throw new ProjectRiskRuleError(`Rule ${row.id} has conditions that are not a list.`);
  }
  const adjusts = row.effect === 'adjust_occurrence' || row.effect === 'adjust_detection';
  if (adjusts && (row.delta === null || row.delta === 0)) {
    throw new ProjectRiskRuleError(`Rule ${row.id} adjusts a score but has no delta.`);
  }

  return {
    id: row.id,
    projectId: row.project_id,
    targetKind: row.target_kind,
    targetId: row.target_id,
    conditions: row.conditions.map((condition) => parseCondition(condition, row.id)),
    effect: row.effect,
    delta: adjusts ? row.delta : null,
    rationale: row.rationale,
    displayOrder: row.display_order,
  };
}

/** Rules authored for a template, in the order the author put them in. */
export async function loadProjectRiskRules(projectId: string): Promise<ProjectRiskRule[]> {
  const { data, error } = await supabase
    .from('project_risk_rules')
    .select('*')
    .eq('project_id', projectId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new ProjectRiskRuleError(`Could not load personalization rules: ${error.message}`);
  }
  return (data ?? []).map(parseProjectRiskRule);
}

type ConditionVerdict =
  | { kind: 'matched' }
  | { kind: 'not_matched'; detail: string }
  | { kind: 'unresolved'; detail: string };

function evaluateCondition(
  condition: RiskRuleCondition,
  signals: RiskSignalSet,
  operationStepId: string | null
): ConditionVerdict {
  const descriptor = RISK_SIGNALS[condition.signal];
  const signal = readRiskSignal(signals, condition.signal, operationStepId);

  if (signal.state === 'unresolved') {
    return {
      kind: 'unresolved',
      detail: `${descriptor.label}: ${RISK_SIGNAL_UNRESOLVED_REASON_TEXT[signal.reason]}`,
    };
  }

  const describe = (): string =>
    `${descriptor.label} is ${String(signal.value)}, not ${RISK_RULE_OPERATOR_LABELS[condition.operator]} ${condition.values.join(', ')}`;

  switch (condition.operator) {
    case 'is_any_of':
      return condition.values.includes(signal.value)
        ? { kind: 'matched' }
        : { kind: 'not_matched', detail: describe() };
    case 'is_none_of':
      return condition.values.includes(signal.value)
        ? { kind: 'not_matched', detail: describe() }
        : { kind: 'matched' };
    case 'at_least':
      return typeof signal.value === 'number' && signal.value >= Number(condition.values[0])
        ? { kind: 'matched' }
        : { kind: 'not_matched', detail: describe() };
    case 'at_most':
      return typeof signal.value === 'number' && signal.value <= Number(condition.values[0])
        ? { kind: 'matched' }
        : { kind: 'not_matched', detail: describe() };
    default: {
      const _exhaustive: never = condition.operator;
      return _exhaustive;
    }
  }
}

/** All conditions must hold. The first condition that decides the outcome is the reason. */
function evaluateConditions(
  rule: ProjectRiskRule,
  signals: RiskSignalSet,
  operationStepId: string | null
): ConditionVerdict {
  for (const condition of rule.conditions) {
    const verdict = evaluateCondition(condition, signals, operationStepId);
    if (verdict.kind !== 'matched') return verdict;
  }
  return { kind: 'matched' };
}

export interface EvaluateProjectRiskLogicInput {
  items: readonly RiskLogicItem[];
  rules: readonly ProjectRiskRule[];
  signals: RiskSignalSet;
  actionPriorityTable: ActionPriorityTable;
}

/**
 * Applies the rules to every Stage 1 item.
 *
 * Include semantics: an item is included by default. If an author wrote any `include` rules
 * for it, the item becomes opt-in and needs one of them to fire, which is how a risk that
 * only applies to, say, a pre-1978 home stays off everyone else's list. An `exclude` rule
 * that fires removes the item outright.
 */
export function evaluateProjectRiskLogic(
  input: EvaluateProjectRiskLogicInput
): AppliedRiskItem[] {
  const { items, rules, signals, actionPriorityTable } = input;

  const rulesByTarget = new Map<string, ProjectRiskRule[]>();
  for (const rule of rules) {
    const key = `${rule.targetKind}:${rule.targetId}`;
    const list = rulesByTarget.get(key);
    if (list) {
      list.push(rule);
    } else {
      rulesByTarget.set(key, [rule]);
    }
  }

  return items.map((item) => {
    const itemRules = rulesByTarget.get(`${item.targetKind}:${item.targetId}`) ?? [];
    const audit: RiskRuleAuditEntry[] = [];
    const rationales: string[] = [];

    let occurrence = item.occurrenceScore;
    let detection = item.detectionScore;
    let excluded = false;
    let includeMatched = false;
    const hasIncludeRules = itemRules.some((rule) => rule.effect === 'include');

    for (const rule of itemRules) {
      const verdict = evaluateConditions(rule, signals, item.operationStepId);

      if (verdict.kind === 'unresolved') {
        audit.push({
          ruleId: rule.id,
          effect: rule.effect,
          outcome: 'skipped_unresolved_signal',
          rationale: rule.rationale,
          detail: verdict.detail,
          appliedDelta: null,
        });
        continue;
      }
      if (verdict.kind === 'not_matched') {
        audit.push({
          ruleId: rule.id,
          effect: rule.effect,
          outcome: 'not_matched',
          rationale: rule.rationale,
          detail: verdict.detail,
          appliedDelta: null,
        });
        continue;
      }

      if (rule.effect === 'include' || rule.effect === 'exclude') {
        if (rule.effect === 'include') includeMatched = true;
        if (rule.effect === 'exclude') excluded = true;
        audit.push({
          ruleId: rule.id,
          effect: rule.effect,
          outcome: 'fired',
          rationale: rule.rationale,
          detail: null,
          appliedDelta: null,
        });
        rationales.push(rule.rationale);
        continue;
      }

      const current = rule.effect === 'adjust_occurrence' ? occurrence : detection;
      if (current === null) {
        audit.push({
          ruleId: rule.id,
          effect: rule.effect,
          outcome: 'skipped_unscored',
          rationale: rule.rationale,
          detail: 'the template has not scored this line yet',
          appliedDelta: null,
        });
        continue;
      }

      const delta = rule.delta ?? 0;
      const next = Math.min(SCORE_MAX, Math.max(SCORE_MIN, current + delta));
      const appliedDelta = next - current;

      if (rule.effect === 'adjust_occurrence') {
        occurrence = next;
      } else {
        detection = next;
      }

      audit.push({
        ruleId: rule.id,
        effect: rule.effect,
        outcome: appliedDelta === delta ? 'fired' : 'clamped_at_scale_limit',
        rationale: rule.rationale,
        detail:
          appliedDelta === delta
            ? null
            : `already at ${current} on a ${SCORE_MIN} to ${SCORE_MAX} scale`,
        appliedDelta,
      });
      if (appliedDelta !== 0) {
        rationales.push(rule.rationale);
      }
    }

    const scored =
      item.severityScore !== null && occurrence !== null && detection !== null;

    return {
      ...item,
      appliedOccurrenceScore: occurrence,
      appliedDetectionScore: detection,
      actionPriority: scored
        ? resolveActionPriority(
            actionPriorityTable,
            item.dimension,
            item.severityScore as number,
            occurrence as number,
            detection as number
          )
        : null,
      rpn: scored ? (item.severityScore as number) * (occurrence as number) * (detection as number) : null,
      included: !excluded && (!hasIncludeRules || includeMatched),
      rationales,
      audit,
    };
  });
}

/** Narrows a stored dimension string, for callers building items out of database rows. */
export function riskDimensionOrThrow(value: unknown, context: string): RiskDimension {
  if (isRiskDimension(value)) return value;
  throw new ProjectRiskRuleError(`${context} has no usable risk component: ${String(value)}.`);
}
