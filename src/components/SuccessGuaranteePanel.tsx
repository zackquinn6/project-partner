import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, ShieldCheck, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import type { ProjectRun } from '@/interfaces/ProjectRun';
import type { Phase } from '@/interfaces/Project';
import type { Json } from '@/integrations/supabase/types';
import type { SuccessGuaranteeState } from '@/hooks/useSuccessGuarantee';
import { mergeQualityControlSettings } from '@/utils/qualityControlSettings';
import {
  CLAIM_STATUS_LABELS,
  GUARANTEE_EVENT_LABELS,
  GUARANTEE_GOALS,
  GUARANTEE_GOAL_LABELS,
  GUARANTEE_REQUIRED_QC_SETTINGS,
  closeClaimResolvedByRecovery,
  fetchClaimsForRun,
  fetchGuaranteeEvidence,
  meetsGuaranteeQcSettings,
  openGuaranteeClaim,
  optInToGuarantee,
  recordGuaranteeEvent,
  requestGuaranteeRefund,
  type GuaranteeClaim,
  type GuaranteeGoal,
} from '@/utils/successGuarantee';
import { AssumptionsList } from '@/components/AssumptionsList';
import {
  acknowledgeRunAssumptions,
  unacknowledgedAssumptions,
} from '@/utils/projectAssumptions';

interface SuccessGuaranteePanelProps {
  projectRun: ProjectRun;
  updateProjectRun: (run: ProjectRun) => Promise<void>;
  guarantee: SuccessGuaranteeState;
  /** Opens the recovery tools (Something Wrong) when a missed goal is reported. */
  onStartRecovery?: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

interface EvidenceSummary {
  completedSteps: number | null;
  stepsWithPhotos: number;
  reworkEvents: number;
  customPhases: number;
  guaranteeEvents: number;
}

/** Evidence lists are null when empty (SQL aggregate over no rows). */
function evidenceListLength(value: Json | undefined, label: string): number {
  if (value === null) return 0;
  if (Array.isArray(value)) return value.length;
  throw new Error(`Evidence record field ${label} has an unexpected shape`);
}

function summarizeEvidence(record: Record<string, Json | undefined>): EvidenceSummary {
  const completed = record.completedStepCount;
  let completedSteps: number | null;
  if (completed === null) {
    completedSteps = null;
  } else if (typeof completed === 'number') {
    completedSteps = completed;
  } else {
    throw new Error('Evidence record has an unexpected completed step count');
  }
  return {
    completedSteps,
    stepsWithPhotos: evidenceListLength(record.photosByStep, 'photosByStep'),
    reworkEvents: evidenceListLength(record.reworkEvents, 'reworkEvents'),
    customPhases: evidenceListLength(record.customPhases, 'customPhases'),
    guaranteeEvents: evidenceListLength(record.guaranteeEvents, 'guaranteeEvents'),
  };
}

export function SuccessGuaranteePanel({
  projectRun,
  updateProjectRun,
  guarantee,
  onStartRecovery,
}: SuccessGuaranteePanelProps) {
  const { coverage, readiness, assumptions, loading, error, refresh } = guarantee;
  const [busy, setBusy] = useState(false);
  const [optInOpen, setOptInOpen] = useState(false);
  const [optOutOpen, setOptOutOpen] = useState(false);
  const [claims, setClaims] = useState<GuaranteeClaim[]>([]);
  const [claimGoal, setClaimGoal] = useState<GuaranteeGoal>('quality');
  const [claimDescription, setClaimDescription] = useState('');
  const [refundClaim, setRefundClaim] = useState<GuaranteeClaim | null>(null);
  const [evidence, setEvidence] = useState<EvidenceSummary | null>(null);

  const loadClaims = useCallback(async () => {
    try {
      setClaims(await fetchClaimsForRun(projectRun.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }, [projectRun.id]);

  useEffect(() => {
    void loadClaims();
  }, [loadClaims]);

  const pending = useMemo(() => unacknowledgedAssumptions(assumptions), [assumptions]);
  const qcCompliant = meetsGuaranteeQcSettings(
    mergeQualityControlSettings(projectRun.quality_control_settings ?? null)
  );

  const run = async (label: string, action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      toast.error(`${label}: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleAcknowledge = () =>
    run('Could not acknowledge assumptions', async () => {
      await acknowledgeRunAssumptions(projectRun.id);
      await refresh();
    });

  const handleOptIn = () =>
    run('Could not join the guarantee', async () => {
      if (!qcCompliant) {
        await updateProjectRun({
          ...projectRun,
          quality_control_settings: GUARANTEE_REQUIRED_QC_SETTINGS,
          updatedAt: new Date(),
        });
      }
      await optInToGuarantee(projectRun.id);
      await refresh();
      setOptInOpen(false);
      toast.success('This run is covered by the success guarantee');
    });

  const handleOptOut = () =>
    run('Could not leave the guarantee', async () => {
      await recordGuaranteeEvent(projectRun.id, 'opted_out', null, null);
      await refresh();
      setOptOutOpen(false);
    });

  const handleOpenClaim = () =>
    run('Could not report the missed goal', async () => {
      const description = claimDescription.trim();
      if (description === '') throw new Error('Describe what missed the goal');
      await openGuaranteeClaim(projectRun.id, claimGoal, description);
      setClaimDescription('');
      await loadClaims();
      toast.success('Recovery started', {
        description: 'Work the recovery first. If the goal still cannot be met, request a refund here.',
      });
      onStartRecovery?.();
    });

  const handleRecovered = (claim: GuaranteeClaim) =>
    run('Could not close the claim', async () => {
      await closeClaimResolvedByRecovery(claim.id);
      await loadClaims();
    });

  const handleRequestRefund = () =>
    run('Could not request a refund', async () => {
      if (!refundClaim) return;
      await requestGuaranteeRefund(refundClaim.id);
      setRefundClaim(null);
      await loadClaims();
      toast.success('Refund requested', { description: 'Your evidence record was attached for review.' });
    });

  const handleLoadEvidence = () =>
    run('Could not load the evidence record', async () => {
      setEvidence(summarizeEvidence(await fetchGuaranteeEvidence(projectRun.id)));
    });

  const handleBranchPlaced = async (phases: Phase[]) => {
    await updateProjectRun({ ...projectRun, phases, updatedAt: new Date() });
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (loading && !readiness) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading guarantee status
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {coverage.status === 'covered' ? (
          <Badge className="gap-1 bg-success text-success-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Covered since {formatDate(coverage.optedInAt)}
          </Badge>
        ) : coverage.status === 'ended' ? (
          <Badge variant="destructive" className="gap-1">
            <ShieldOff className="h-3.5 w-3.5" />
            Coverage ended {formatDate(coverage.endingEvent.createdAt)}
          </Badge>
        ) : (
          <Badge variant="outline">Not enrolled</Badge>
        )}
      </div>

      {coverage.status === 'ended' ? (
        <p className="text-xs text-muted-foreground">
          {GUARANTEE_EVENT_LABELS[coverage.endingEvent.eventType]}
          {coverage.endingEvent.note ? `: ${coverage.endingEvent.note}` : ''}
        </p>
      ) : null}

      {readiness && !readiness.ready && coverage.status === 'not_enrolled' ? (
        <Alert>
          <AlertDescription className="space-y-1 text-sm">
            <p className="font-medium text-foreground">This project is not guarantee-ready yet.</p>
            <ul className="list-disc pl-4 text-xs text-muted-foreground">
              {readiness.uncoveredFailureModes.length > 0 ? (
                <li>
                  {readiness.uncoveredFailureModes.length} failure mode
                  {readiness.uncoveredFailureModes.length === 1 ? '' : 's'} still need a pre-built
                  rework path
                </li>
              ) : null}
              {readiness.kcCandidateFailureModeCount === 0 ? (
                <li>No failure modes are authored where your attention decides the outcome</li>
              ) : null}
              {readiness.templateAssumptionCount === 0 ? <li>Project assumptions are not authored</li> : null}
              {readiness.foundationAssumptionCount === 0 ? (
                <li>Assumptions for all projects are not authored</li>
              ) : null}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="text-sm font-medium">Assumptions</Label>
          {pending.length > 0 ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={handleAcknowledge}>
              Acknowledge {pending.length}
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          The guarantee covers what the plan handles. A violated assumption marked "Not covered by
          the plan" ends coverage.
        </p>
        <AssumptionsList
          assumptions={assumptions}
          projectRun={projectRun}
          onChanged={refresh}
          onBranchPlaced={handleBranchPlaced}
        />
      </div>

      {coverage.status === 'not_enrolled' && readiness?.ready ? (
        <div className="space-y-1">
          <Button disabled={busy || pending.length > 0} onClick={() => setOptInOpen(true)}>
            Join the success guarantee
          </Button>
          {pending.length > 0 ? (
            <p className="text-xs text-muted-foreground">Acknowledge the assumptions first.</p>
          ) : null}
        </div>
      ) : null}

      {coverage.status === 'covered' ? (
        <div className="space-y-3 rounded-md border bg-muted/30 p-3">
          <Label className="text-sm font-medium">Report a missed goal</Label>
          <RadioGroup
            value={claimGoal}
            onValueChange={(value) => {
              if ((GUARANTEE_GOALS as readonly string[]).includes(value)) {
                setClaimGoal(value as GuaranteeGoal);
              }
            }}
            className="flex gap-4"
          >
            {GUARANTEE_GOALS.map((goal) => (
              <div key={goal} className="flex items-center gap-2">
                <RadioGroupItem value={goal} id={`claim-goal-${goal}`} />
                <Label htmlFor={`claim-goal-${goal}`} className="text-sm">
                  {GUARANTEE_GOAL_LABELS[goal]}
                </Label>
              </div>
            ))}
          </RadioGroup>
          <Textarea
            value={claimDescription}
            onChange={(e) => setClaimDescription(e.target.value)}
            placeholder="What missed the goal, and where?"
            rows={3}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={busy || claimDescription.trim() === ''} onClick={handleOpenClaim}>
              Start recovery
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setOptOutOpen(true)}>
              Leave the guarantee
            </Button>
          </div>
        </div>
      ) : null}

      {claims.length > 0 ? (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Claims</Label>
          {claims.map((claim) => (
            <div key={claim.id} className="space-y-2 rounded-md border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{GUARANTEE_GOAL_LABELS[claim.goal]}</Badge>
                <Badge variant="secondary">{CLAIM_STATUS_LABELS[claim.status]}</Badge>
                <span className="text-xs text-muted-foreground">{formatDate(claim.openedAt)}</span>
              </div>
              <p className="text-sm">{claim.description}</p>
              {claim.decisionNote ? (
                <p className="text-xs text-muted-foreground">
                  {claim.decisionAmountCents !== null
                    ? `$${(claim.decisionAmountCents / 100).toFixed(2)}: `
                    : ''}
                  {claim.decisionNote}
                </p>
              ) : null}
              {claim.status === 'recovery' ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => handleRecovered(claim)}>
                    Recovery fixed it
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || coverage.status !== 'covered'}
                    onClick={() => setRefundClaim(claim)}
                  >
                    Request refund
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {coverage.status !== 'not_enrolled' ? (
        <div className="space-y-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={handleLoadEvidence}>
            {evidence ? 'Refresh evidence record' : 'Show evidence record'}
          </Button>
          {evidence ? (
            <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-0.5">
              <li>
                Completed steps:{' '}
                {evidence.completedSteps === null ? 'not recorded' : evidence.completedSteps}
              </li>
              <li>Steps with photos: {evidence.stepsWithPhotos}</li>
              <li>Rework events: {evidence.reworkEvents}</li>
              <li>Custom phases: {evidence.customPhases}</li>
              <li>Guarantee events: {evidence.guaranteeEvents}</li>
            </ul>
          ) : null}
        </div>
      ) : null}

      <AlertDialog open={optInOpen} onOpenChange={setOptInOpen}>
        <AlertDialogContent className="z-[100]">
          <AlertDialogHeader>
            <AlertDialogTitle>Join the success guarantee</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  If this run misses its quality goal or locked schedule, you get priority recovery
                  first, then a refund or membership credit up to what you paid for the subscription
                  period covering the run.
                </p>
                <p>Photos and every output become required on each step.</p>
                <p>
                  Coverage ends, and cannot be restored, if you skip a required gate, turn those
                  settings off, add a custom phase, report a failure on a step with no pre-built rework
                  path, or an assumption the plan does not cover is violated.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void handleOptIn();
              }}
            >
              Join
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={optOutOpen} onOpenChange={setOptOutOpen}>
        <AlertDialogContent className="z-[100]">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave the success guarantee?</AlertDialogTitle>
            <AlertDialogDescription>
              Coverage for this run cannot be restored after you leave.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Stay covered</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void handleOptOut();
              }}
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={refundClaim !== null} onOpenChange={(open) => !open && setRefundClaim(null)}>
        <AlertDialogContent className="z-[100]">
          <AlertDialogHeader>
            <AlertDialogTitle>Request a refund</AlertDialogTitle>
            <AlertDialogDescription>
              Your evidence record is frozen onto the claim for review. Approved refunds or credits
              never exceed what you paid for the subscription period covering this run.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void handleRequestRefund();
              }}
            >
              Request refund
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
