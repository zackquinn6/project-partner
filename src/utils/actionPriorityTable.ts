/**
 * The Action Priority lookup, loaded from pfmea_action_priority_rules.
 *
 * The table is data rather than a switch so it can be retuned without a deploy, and so a
 * component can be made stricter than the others. The seed migration proves the table is a
 * total function over severity, occurrence, and detection in 1..10 for every component, so
 * a miss here means the data was edited into an invalid state and is raised rather than
 * papered over with a default priority.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import {
  isActionPriority,
  isRiskDimension,
  type ActionPriority,
  type RiskDimension,
} from '@/utils/riskDimensions';

type ActionPriorityRuleRow = Database['public']['Tables']['pfmea_action_priority_rules']['Row'];
type ActionPriorityLabelRow = Database['public']['Tables']['risk_action_priority_labels']['Row'];

export interface ActionPriorityRule {
  dimension: RiskDimension;
  severityMin: number;
  severityMax: number;
  occurrenceMin: number;
  occurrenceMax: number;
  detectionMin: number;
  detectionMax: number;
  actionPriority: ActionPriority;
}

export interface ActionPriorityLabel {
  actionPriority: ActionPriority;
  /** Consumer-facing wording, e.g. "Act before this step". */
  label: string;
  description: string;
  urgencyRank: number;
}

export interface ActionPriorityTable {
  rules: readonly ActionPriorityRule[];
  labels: Readonly<Record<ActionPriority, ActionPriorityLabel>>;
}

export class ActionPriorityLookupError extends Error {}

/**
 * Resolve one scored line to its priority.
 *
 * Throws when the table does not cover the inputs. Returning a default here would
 * reintroduce exactly the invented scoring this work removes, and the caller cannot tell a
 * genuine Low from an uncovered cell.
 */
export function resolveActionPriority(
  table: ActionPriorityTable,
  dimension: RiskDimension,
  severity: number,
  occurrence: number,
  detection: number
): ActionPriority {
  const matches = table.rules.filter(
    (rule) =>
      rule.dimension === dimension &&
      severity >= rule.severityMin &&
      severity <= rule.severityMax &&
      occurrence >= rule.occurrenceMin &&
      occurrence <= rule.occurrenceMax &&
      detection >= rule.detectionMin &&
      detection <= rule.detectionMax
  );

  if (matches.length === 1) return matches[0].actionPriority;

  throw new ActionPriorityLookupError(
    `Action priority table returned ${matches.length} rows for ${dimension} ` +
      `severity=${severity} occurrence=${occurrence} detection=${detection}. ` +
      'pfmea_action_priority_rules must cover every score combination exactly once.'
  );
}

export function actionPriorityLabel(
  table: ActionPriorityTable,
  ap: ActionPriority
): ActionPriorityLabel {
  const label = table.labels[ap];
  if (!label) {
    throw new ActionPriorityLookupError(
      `risk_action_priority_labels has no row for action priority ${ap}.`
    );
  }
  return label;
}

function toRule(row: ActionPriorityRuleRow): ActionPriorityRule {
  if (!isRiskDimension(row.dimension)) {
    throw new ActionPriorityLookupError(
      `pfmea_action_priority_rules row ${row.id} has unknown dimension ${row.dimension}.`
    );
  }
  if (!isActionPriority(row.action_priority)) {
    throw new ActionPriorityLookupError(
      `pfmea_action_priority_rules row ${row.id} has unknown action priority ${row.action_priority}.`
    );
  }
  return {
    dimension: row.dimension,
    severityMin: row.severity_min,
    severityMax: row.severity_max,
    occurrenceMin: row.occurrence_min,
    occurrenceMax: row.occurrence_max,
    detectionMin: row.detection_min,
    detectionMax: row.detection_max,
    actionPriority: row.action_priority,
  };
}

function toLabels(rows: ActionPriorityLabelRow[]): Record<ActionPriority, ActionPriorityLabel> {
  const labels = {} as Record<ActionPriority, ActionPriorityLabel>;
  for (const row of rows) {
    if (!isActionPriority(row.action_priority)) {
      throw new ActionPriorityLookupError(
        `risk_action_priority_labels has unknown action priority ${row.action_priority}.`
      );
    }
    labels[row.action_priority] = {
      actionPriority: row.action_priority,
      label: row.consumer_label,
      description: row.consumer_description,
      urgencyRank: row.urgency_rank,
    };
  }
  for (const ap of ['H', 'M', 'L'] as const) {
    if (!labels[ap]) {
      throw new ActionPriorityLookupError(
        `risk_action_priority_labels is missing the row for action priority ${ap}.`
      );
    }
  }
  return labels;
}

export async function fetchActionPriorityTable(): Promise<ActionPriorityTable> {
  const [rulesResult, labelsResult] = await Promise.all([
    supabase.from('pfmea_action_priority_rules').select('*'),
    supabase.from('risk_action_priority_labels').select('*'),
  ]);

  if (rulesResult.error) throw rulesResult.error;
  if (labelsResult.error) throw labelsResult.error;

  const rules = (rulesResult.data ?? []).map(toRule);
  if (rules.length === 0) {
    throw new ActionPriorityLookupError(
      'pfmea_action_priority_rules is empty. Risk cannot be prioritized without it.'
    );
  }

  return { rules, labels: toLabels(labelsResult.data ?? []) };
}

export const ACTION_PRIORITY_TABLE_QUERY_KEY = ['action-priority-table'] as const;
