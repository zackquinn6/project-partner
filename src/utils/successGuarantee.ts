/**
 * Success Guarantee: coverage, readiness, evidence, and claims. Spec: docs/SUCCESS_GUARANTEE.md.
 *
 * Coverage lives in the append-only project_run_guarantee_events log. A run is covered after its
 * single opted_in event and until the first event that ends coverage. Writes go through RPCs
 * that check run ownership; the client never inserts events directly.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { QualityControlSettings } from '@/utils/qualityControlSettings';

export class SuccessGuaranteeError extends Error {}

export const GUARANTEE_EVENT_TYPES = [
  'opted_in',
  'gate_bypassed',
  'qc_setting_disabled',
  'assumption_violated',
  'rework_path_missing',
  'custom_phase_added',
  'opted_out',
] as const;
export type GuaranteeEventType = (typeof GUARANTEE_EVENT_TYPES)[number];

export function isGuaranteeEventType(value: unknown): value is GuaranteeEventType {
  return typeof value === 'string' && (GUARANTEE_EVENT_TYPES as readonly string[]).includes(value);
}

export const GUARANTEE_EVENT_LABELS: Record<GuaranteeEventType, string> = {
  opted_in: 'Joined the guarantee',
  gate_bypassed: 'Skipped a required gate',
  qc_setting_disabled: 'Turned off a required Quality Control setting',
  assumption_violated: 'An assumption was violated',
  rework_path_missing: 'Failure reported on a step with no pre-built rework path',
  custom_phase_added: 'Added a custom phase',
  opted_out: 'Left the guarantee',
};

/** Quality Control settings a covered run must keep on. */
export const GUARANTEE_REQUIRED_QC_SETTINGS: QualityControlSettings = {
  require_photos_per_step: true,
  require_all_outputs: true,
};

export function meetsGuaranteeQcSettings(settings: QualityControlSettings): boolean {
  return settings.require_photos_per_step && settings.require_all_outputs;
}

export interface GuaranteeEvent {
  id: string;
  eventType: GuaranteeEventType;
  endsCoverage: boolean;
  stepId: string | null;
  note: string | null;
  createdAt: string;
}

export type GuaranteeCoverage =
  | { status: 'not_enrolled' }
  | { status: 'covered'; optedInAt: string }
  | { status: 'ended'; optedInAt: string; endingEvent: GuaranteeEvent };

/** Events must be in created order, as fetchGuaranteeEvents returns them. */
export function deriveGuaranteeCoverage(events: readonly GuaranteeEvent[]): GuaranteeCoverage {
  const optIn = events.find((e) => e.eventType === 'opted_in');
  if (!optIn) return { status: 'not_enrolled' };
  const ending = events.find((e) => e.endsCoverage);
  if (ending) return { status: 'ended', optedInAt: optIn.createdAt, endingEvent: ending };
  return { status: 'covered', optedInAt: optIn.createdAt };
}

export async function fetchGuaranteeEvents(projectRunId: string): Promise<GuaranteeEvent[]> {
  const { data, error } = await supabase
    .from('project_run_guarantee_events')
    .select('id, event_type, ends_coverage, step_id, note, created_at')
    .eq('project_run_id', projectRunId)
    .order('created_at', { ascending: true });
  if (error) {
    throw new SuccessGuaranteeError(`Could not load guarantee history: ${error.message}`);
  }
  return (data ?? []).map((row) => {
    if (!isGuaranteeEventType(row.event_type)) {
      throw new SuccessGuaranteeError(`Unknown guarantee event type ${row.event_type}`);
    }
    return {
      id: row.id,
      eventType: row.event_type,
      endsCoverage: row.ends_coverage,
      stepId: row.step_id,
      note: row.note,
      createdAt: row.created_at,
    };
  });
}

export interface UncoveredFailureMode {
  failureModeId: string;
  failureMode: string;
  operationStepId: string;
}

export interface GuaranteeReadiness {
  projectId: string;
  kcCandidateFailureModeCount: number;
  uncoveredFailureModes: UncoveredFailureMode[];
  templateAssumptionCount: number;
  foundationAssumptionCount: number;
  ready: boolean;
}

function asRecord(value: Json | undefined, label: string): Record<string, Json | undefined> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new SuccessGuaranteeError(`${label} returned an unexpected shape`);
  }
  return value as Record<string, Json | undefined>;
}

function asString(value: Json | undefined, label: string): string {
  if (typeof value !== 'string') throw new SuccessGuaranteeError(`${label} is missing`);
  return value;
}

function asNumber(value: Json | undefined, label: string): number {
  if (typeof value !== 'number') throw new SuccessGuaranteeError(`${label} is missing`);
  return value;
}

function asBoolean(value: Json | undefined, label: string): boolean {
  if (typeof value !== 'boolean') throw new SuccessGuaranteeError(`${label} is missing`);
  return value;
}

export async function fetchGuaranteeReadiness(projectId: string): Promise<GuaranteeReadiness> {
  const { data, error } = await supabase.rpc('get_project_guarantee_readiness', {
    p_project_id: projectId,
  });
  if (error) {
    throw new SuccessGuaranteeError(`Could not check guarantee readiness: ${error.message}`);
  }
  const record = asRecord(data, 'Guarantee readiness');
  const uncoveredRaw = record.uncoveredFailureModes;
  let uncoveredItems: Json[];
  // The SQL aggregate is null when nothing is uncovered.
  if (uncoveredRaw === null) {
    uncoveredItems = [];
  } else if (Array.isArray(uncoveredRaw)) {
    uncoveredItems = uncoveredRaw;
  } else {
    throw new SuccessGuaranteeError('Guarantee readiness listed uncovered failure modes in an unexpected shape');
  }
  const uncovered: UncoveredFailureMode[] = uncoveredItems.map((item) => {
    const fm = asRecord(item, 'Uncovered failure mode');
    return {
      failureModeId: asString(fm.failureModeId, 'failureModeId'),
      failureMode: asString(fm.failureMode, 'failureMode'),
      operationStepId: asString(fm.operationStepId, 'operationStepId'),
    };
  });
  return {
    projectId: asString(record.projectId, 'projectId'),
    kcCandidateFailureModeCount: asNumber(record.kcCandidateFailureModeCount, 'kcCandidateFailureModeCount'),
    uncoveredFailureModes: uncovered,
    templateAssumptionCount: asNumber(record.templateAssumptionCount, 'templateAssumptionCount'),
    foundationAssumptionCount: asNumber(record.foundationAssumptionCount, 'foundationAssumptionCount'),
    ready: asBoolean(record.ready, 'ready'),
  };
}

export async function optInToGuarantee(projectRunId: string): Promise<void> {
  const { error } = await supabase.rpc('opt_in_project_run_guarantee', { p_run_id: projectRunId });
  if (error) throw new SuccessGuaranteeError(error.message);
}

/** Event types the client reports; custom phases and QC settings are caught server-side. */
export type ClientGuaranteeEventType = Extract<
  GuaranteeEventType,
  'gate_bypassed' | 'rework_path_missing' | 'opted_out'
>;

export async function recordGuaranteeEvent(
  projectRunId: string,
  eventType: ClientGuaranteeEventType,
  stepId: string | null,
  note: string | null
): Promise<void> {
  const { error } = await supabase.rpc('record_project_run_guarantee_event', {
    p_run_id: projectRunId,
    p_event_type: eventType,
    p_step_id: stepId,
    p_note: note,
  });
  if (error) throw new SuccessGuaranteeError(error.message);
}

/** Server-built evidence record (same JSON a refund request freezes onto the claim). */
export async function fetchGuaranteeEvidence(projectRunId: string): Promise<Record<string, Json | undefined>> {
  const { data, error } = await supabase.rpc('get_project_run_guarantee_evidence', {
    p_run_id: projectRunId,
  });
  if (error) throw new SuccessGuaranteeError(`Could not load the evidence record: ${error.message}`);
  return asRecord(data, 'Evidence record');
}

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------

export const GUARANTEE_GOALS = ['quality', 'schedule'] as const;
export type GuaranteeGoal = (typeof GUARANTEE_GOALS)[number];

export const GUARANTEE_GOAL_LABELS: Record<GuaranteeGoal, string> = {
  quality: 'Quality goal',
  schedule: 'Schedule',
};

export const CLAIM_STATUSES = [
  'recovery',
  'resolved_by_recovery',
  'refund_requested',
  'approved_refund',
  'approved_credit',
  'denied',
] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  recovery: 'Recovery in progress',
  resolved_by_recovery: 'Resolved by recovery',
  refund_requested: 'Refund requested',
  approved_refund: 'Refund approved',
  approved_credit: 'Credit approved',
  denied: 'Denied',
};

export type ClaimDecision = Extract<ClaimStatus, 'approved_refund' | 'approved_credit' | 'denied'>;

function isGoal(value: unknown): value is GuaranteeGoal {
  return typeof value === 'string' && (GUARANTEE_GOALS as readonly string[]).includes(value);
}

function isClaimStatus(value: unknown): value is ClaimStatus {
  return typeof value === 'string' && (CLAIM_STATUSES as readonly string[]).includes(value);
}

export interface GuaranteeClaim {
  id: string;
  projectRunId: string;
  userId: string;
  goal: GuaranteeGoal;
  description: string;
  status: ClaimStatus;
  openedAt: string;
  refundRequestedAt: string | null;
  evidence: Json | null;
  subscriptionCapCents: number | null;
  decisionAmountCents: number | null;
  decisionNote: string | null;
  decidedAt: string | null;
}

const CLAIM_COLUMNS =
  'id, project_run_id, user_id, goal, description, status, opened_at, refund_requested_at, evidence, subscription_cap_cents, decision_amount_cents, decision_note, decided_at';

type ClaimRow = {
  id: string;
  project_run_id: string;
  user_id: string;
  goal: string;
  description: string;
  status: string;
  opened_at: string;
  refund_requested_at: string | null;
  evidence: Json | null;
  subscription_cap_cents: number | null;
  decision_amount_cents: number | null;
  decision_note: string | null;
  decided_at: string | null;
};

function claimFromRow(row: ClaimRow): GuaranteeClaim {
  if (!isGoal(row.goal)) throw new SuccessGuaranteeError(`Unknown claim goal ${row.goal}`);
  if (!isClaimStatus(row.status)) throw new SuccessGuaranteeError(`Unknown claim status ${row.status}`);
  return {
    id: row.id,
    projectRunId: row.project_run_id,
    userId: row.user_id,
    goal: row.goal,
    description: row.description,
    status: row.status,
    openedAt: row.opened_at,
    refundRequestedAt: row.refund_requested_at,
    evidence: row.evidence,
    subscriptionCapCents: row.subscription_cap_cents,
    decisionAmountCents: row.decision_amount_cents,
    decisionNote: row.decision_note,
    decidedAt: row.decided_at,
  };
}

export async function fetchClaimsForRun(projectRunId: string): Promise<GuaranteeClaim[]> {
  const { data, error } = await supabase
    .from('project_run_guarantee_claims')
    .select(CLAIM_COLUMNS)
    .eq('project_run_id', projectRunId)
    .order('opened_at', { ascending: false });
  if (error) throw new SuccessGuaranteeError(`Could not load claims: ${error.message}`);
  return (data ?? []).map(claimFromRow);
}

export async function fetchClaimsByStatus(statuses: readonly ClaimStatus[]): Promise<GuaranteeClaim[]> {
  const { data, error } = await supabase
    .from('project_run_guarantee_claims')
    .select(CLAIM_COLUMNS)
    .in('status', [...statuses])
    .order('opened_at', { ascending: true });
  if (error) throw new SuccessGuaranteeError(`Could not load claims: ${error.message}`);
  return (data ?? []).map(claimFromRow);
}

export async function openGuaranteeClaim(
  projectRunId: string,
  goal: GuaranteeGoal,
  description: string
): Promise<void> {
  const { error } = await supabase.rpc('open_project_run_guarantee_claim', {
    p_run_id: projectRunId,
    p_goal: goal,
    p_description: description,
  });
  if (error) throw new SuccessGuaranteeError(error.message);
}

export async function closeClaimResolvedByRecovery(claimId: string): Promise<void> {
  const { error } = await supabase.rpc('close_project_run_guarantee_claim_recovered', {
    p_claim_id: claimId,
  });
  if (error) throw new SuccessGuaranteeError(error.message);
}

export async function requestGuaranteeRefund(claimId: string): Promise<void> {
  const { error } = await supabase.rpc('request_project_run_guarantee_refund', { p_claim_id: claimId });
  if (error) throw new SuccessGuaranteeError(error.message);
}

export async function decideGuaranteeClaim(input: {
  claimId: string;
  decision: ClaimDecision;
  subscriptionCapCents: number | null;
  amountCents: number | null;
  note: string;
}): Promise<void> {
  const { error } = await supabase.rpc('decide_project_run_guarantee_claim', {
    p_claim_id: input.claimId,
    p_decision: input.decision,
    p_subscription_cap_cents: input.subscriptionCapCents,
    p_amount_cents: input.amountCents,
    p_note: input.note,
  });
  if (error) throw new SuccessGuaranteeError(error.message);
}
