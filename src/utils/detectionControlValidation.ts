/**
 * A detection score claims the user would notice the defect before it mattered. That claim is
 * only credible if the step actually tells them what to look at.
 *
 * The Output the requirement came from carries the three fields that make a check real:
 * qualityChecks (what to look at), allowances (how much deviation is acceptable), and
 * referenceSpecification (what to compare against). A detection control scored against an
 * output with none of them is scoring an inspection that does not exist, which is how a
 * detection-heavy line ends up looking safer than it is.
 */

import type { Output } from '@/interfaces/Project';

export type DetectionEvidenceField = 'qualityChecks' | 'allowances' | 'referenceSpecification';

export interface DetectionEvidence {
  present: DetectionEvidenceField[];
  missing: DetectionEvidenceField[];
  /** No field is populated, so the detection score has nothing behind it. */
  hasNoEvidence: boolean;
}

const DETECTION_EVIDENCE_FIELDS: DetectionEvidenceField[] = [
  'qualityChecks',
  'allowances',
  'referenceSpecification',
];

function isPopulated(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim() !== '';
}

export function detectionEvidenceForOutput(output: Output | null | undefined): DetectionEvidence {
  const present: DetectionEvidenceField[] = [];
  const missing: DetectionEvidenceField[] = [];

  for (const field of DETECTION_EVIDENCE_FIELDS) {
    if (output && isPopulated(output[field])) present.push(field);
    else missing.push(field);
  }

  return { present, missing, hasNoEvidence: present.length === 0 };
}

export const DETECTION_EVIDENCE_FIELD_LABELS: Record<DetectionEvidenceField, string> = {
  qualityChecks: 'Quality checks',
  allowances: 'Allowances',
  referenceSpecification: 'Reference specification',
};

export interface DetectionControlIssue {
  controlId: string;
  outputId: string | null;
  requirementText: string;
  evidence: DetectionEvidence;
}

/**
 * Detection controls on this step whose output gives the user nothing to check against.
 * Controls with no detection score are not flagged: they make no claim yet.
 */
export function detectionControlIssuesForStep(args: {
  controls: { id: string; control_type: string; detection_score?: number | null }[];
  outputById: Map<string, Output>;
  requirementOutputId: string | null;
  requirementText: string;
}): DetectionControlIssue[] {
  const { controls, outputById, requirementOutputId, requirementText } = args;
  const output = requirementOutputId ? outputById.get(requirementOutputId) : undefined;
  const evidence = detectionEvidenceForOutput(output);
  if (!evidence.hasNoEvidence) return [];

  return controls
    .filter((control) => control.control_type === 'detection' && control.detection_score != null)
    .map((control) => ({
      controlId: control.id,
      outputId: requirementOutputId,
      requirementText,
      evidence,
    }));
}
