import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import {
  TRIAGE_OPTIONS,
  TriageType,
  buildRecoveryPlan,
  reopenStepCompletion,
  legacyIssueFlagsFromTriage,
  RecoveryAction,
} from '@/utils/reworkEngine';
import {
  fetchReworkPathsForStep,
  placeReworkPathInRun,
  type ReworkPath,
} from '@/utils/reworkPaths';
import { recordGuaranteeEvent } from '@/utils/successGuarantee';
import { resolveTemplateFamily } from '@/utils/templateFamilies';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { Phase } from '@/interfaces/Project';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface SomethingWrongDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
  projectRun: ProjectRun | null;
  templateName?: string | null;
  templateCategories?: string[] | null;
  phaseId?: string;
  phaseName?: string;
  stepId?: string;
  stepTitle?: string;
  /** Template step whose rework paths apply (a loop-back step maps to the step it repeats). */
  reworkTriggerStepId?: string;
  spaceId?: string | null;
  completedSteps: string[];
  updateProjectRun: (run: ProjectRun) => Promise<void> | void;
  setCompletedSteps: (steps: Set<string>) => void;
  /** True while the run is covered by the success guarantee. */
  guaranteeCovered: boolean;
  onGuaranteeChanged?: () => Promise<void> | void;
  onOpenUnplannedWork?: () => void;
  onOpenShopping?: () => void;
  onOpenToolRentals?: () => void;
  onOpenExpertHelp?: () => void;
  onAskAi?: () => void;
  /** Called when recovery includes schedule_slip - parent applies regen + shows delta */
  onScheduleSlip?: () => Promise<void> | void;
}

function actionLabel(action: RecoveryAction): string {
  switch (action) {
    case 'reopen_step':
      return 'Reopen this step';
    case 'run_rework_path':
      return 'Run pre-built rework path';
    case 'open_shopping':
      return 'Update shopping list';
    case 'open_unplanned_work':
      return 'Open Course Correct';
    case 'open_tool_rentals':
      return 'Open tool rentals';
    case 'schedule_slip':
      return 'Slip schedule';
    case 'stop_and_seek_help':
      return 'Stop for safety';
    case 'ask_ai':
      return 'Ask AI';
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

export function SomethingWrongDialog({
  open,
  onOpenChange,
  userId,
  projectRun,
  templateName,
  templateCategories,
  phaseId,
  phaseName,
  stepId,
  stepTitle,
  reworkTriggerStepId,
  spaceId,
  completedSteps,
  updateProjectRun,
  setCompletedSteps,
  guaranteeCovered,
  onGuaranteeChanged,
  onOpenUnplannedWork,
  onOpenShopping,
  onOpenToolRentals,
  onOpenExpertHelp,
  onAskAi,
  onScheduleSlip,
}: SomethingWrongDialogProps) {
  const [triageType, setTriageType] = useState<TriageType | null>(null);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reworkPaths, setReworkPaths] = useState<ReworkPath[] | null>(null);
  const [reworkPathsError, setReworkPathsError] = useState<string | null>(null);
  const [selectedReworkPathId, setSelectedReworkPathId] = useState<string | null>(null);

  const recoveryPlan = useMemo(
    () => (triageType ? buildRecoveryPlan(triageType) : null),
    [triageType]
  );
  const needsReworkPath = Boolean(recoveryPlan?.actions.includes('run_rework_path'));

  useEffect(() => {
    if (!open || !needsReworkPath || !reworkTriggerStepId) return;
    let cancelled = false;
    setReworkPaths(null);
    setReworkPathsError(null);
    void fetchReworkPathsForStep(reworkTriggerStepId)
      .then((paths) => {
        if (cancelled) return;
        setReworkPaths(paths);
        setSelectedReworkPathId(paths.length === 1 ? paths[0].operationId : null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setReworkPathsError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [open, needsReworkPath, reworkTriggerStepId]);

  const selectedReworkPath =
    reworkPaths?.find((path) => path.operationId === selectedReworkPathId) ?? null;
  const noReworkPath = needsReworkPath && reworkPaths !== null && reworkPaths.length === 0;

  const reset = () => {
    setTriageType(null);
    setComments('');
    setSubmitting(false);
    setReworkPaths(null);
    setReworkPathsError(null);
    setSelectedReworkPathId(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const applyDisabled =
    !triageType ||
    submitting ||
    !userId ||
    (needsReworkPath &&
      (!reworkTriggerStepId ||
        reworkPaths === null ||
        (reworkPaths.length > 0 && !selectedReworkPath)));

  const handleApply = async () => {
    if (!triageType || !recoveryPlan || !projectRun || !userId) {
      toast.error('Sign in and select what went wrong to continue.');
      return;
    }

    setSubmitting(true);
    try {
      const family = resolveTemplateFamily(templateName, templateCategories);
      let nextPhases: Phase[] = projectRun.phases || [];
      let nextCompleted = [...completedSteps];
      let reworkOperationId: string | null = null;
      let failureModeIds: string[] = [];
      let reworkReopened = false;
      let reworkMissing = false;

      if (needsReworkPath) {
        if (!stepId || !reworkTriggerStepId || reworkPaths === null) {
          throw new Error('Rework paths are not loaded for this step.');
        }
        if (reworkPaths.length === 0) {
          reworkMissing = true;
        } else {
          if (!selectedReworkPath) throw new Error('Choose the rework path that matches the failure.');
          failureModeIds = selectedReworkPath.failureModes.map((fm) => fm.id);
          const placed = await placeReworkPathInRun({
            projectRunId: projectRun.id,
            runPhases: nextPhases,
            completedSteps: nextCompleted,
            operationId: selectedReworkPath.operationId,
            triggerStepId: reworkTriggerStepId,
            failureModeIds,
          });
          nextPhases = placed.phases;
          nextCompleted = placed.completedSteps;
          reworkOperationId = selectedReworkPath.operationId;
          reworkReopened = placed.reopened;
        }
      }

      if (recoveryPlan.actions.includes('reopen_step')) {
        nextCompleted = reopenStepCompletion(nextCompleted, stepId, spaceId);
      }
      setCompletedSteps(new Set(nextCompleted));

      const issueReportData = {
        stepId,
        phaseId,
        phaseName,
        step: stepTitle,
        issues: legacyIssueFlagsFromTriage(triageType),
        comments,
        timestamp: new Date().toISOString(),
        triageType,
        recoveryPlan,
      };

      const updatedRun: ProjectRun = {
        ...projectRun,
        phases: nextPhases,
        completedSteps: nextCompleted,
        issue_reports: [...(projectRun.issue_reports || []), issueReportData],
        updatedAt: new Date(),
      };

      await updateProjectRun(updatedRun);

      if (reworkMissing && guaranteeCovered) {
        await recordGuaranteeEvent(
          projectRun.id,
          'rework_path_missing',
          stepId ?? null,
          comments.trim() === '' ? null : comments.trim()
        );
        await onGuaranteeChanged?.();
      }

      const recoveryPayload = {
        ...recoveryPlan,
        reworkOperationId,
        failureModeIds,
        reworkPathMissing: reworkMissing,
      };

      // Tables from 2026_09_09_migration_rework_and_stuck_events.sql (apply in Supabase)
      const { data: reworkRow, error: reworkError } = await supabase
        .from('rework_events')
        .insert({
          user_id: userId,
          project_run_id: projectRun.id,
          template_project_id: projectRun.projectId || null,
          template_family: family,
          phase_id: phaseId || null,
          phase_name: phaseName || null,
          step_id: stepId || null,
          step_title: stepTitle || null,
          triage_type: triageType,
          severity: recoveryPlan.severity,
          comments: comments || null,
          recovery_plan: recoveryPayload,
          status: 'applied',
          applied_at: new Date().toISOString(),
        })
        .select('id')
        .maybeSingle();

      if (reworkError) {
        console.error('rework_events insert failed:', reworkError);
        toast.error(
          'Recovery applied on this run, but the rework log could not be saved. Apply the SQL migration if tables are missing.'
        );
      } else {
        const { error: stuckError } = await supabase.from('stuck_events').insert({
          user_id: userId,
          project_run_id: projectRun.id,
          template_project_id: projectRun.projectId || null,
          template_family: family,
          phase_id: phaseId || null,
          step_id: stepId || null,
          step_title: stepTitle || null,
          triage_type: triageType,
          resolution_action: recoveryPlan.actions.join(','),
          rework_event_id: reworkRow?.id || null,
        });

        if (stuckError) {
          console.error('stuck_events insert failed:', stuckError);
        }
      }

      if (recoveryPlan.actions.includes('open_unplanned_work') || reworkMissing) {
        onOpenUnplannedWork?.();
      }
      if (recoveryPlan.actions.includes('open_shopping')) {
        onOpenShopping?.();
      }
      if (recoveryPlan.actions.includes('open_tool_rentals')) {
        onOpenToolRentals?.();
      }
      if (recoveryPlan.actions.includes('schedule_slip')) {
        await onScheduleSlip?.();
      }
      if (recoveryPlan.actions.includes('ask_ai')) {
        onAskAi?.();
      }
      if (recoveryPlan.severity === 'stop') {
        onOpenExpertHelp?.();
      }

      if (recoveryPlan.severity === 'stop') {
        toast.message('Safety stop recorded', {
          description: 'Do not continue until it is safe. Premium pro chat is available if you need a human.',
        });
      } else if (reworkOperationId && selectedReworkPath) {
        toast.success(reworkReopened ? 'Rework path reopened' : 'Rework path added', {
          description: reworkReopened
            ? `${selectedReworkPath.operationName} steps are open again.`
            : `${selectedReworkPath.operationName} now follows this step in your plan.`,
        });
      } else if (reworkMissing) {
        toast.message('No pre-built rework path for this step', {
          description: 'Add the fix in Course Correct.',
        });
      } else {
        toast.success('Recovery plan applied', {
          description: recoveryPlan.summary,
        });
      }

      handleOpenChange(false);
    } catch (err) {
      console.error('SomethingWrong apply failed:', err);
      toast.error(err instanceof Error ? err.message : 'Could not apply the recovery plan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning-soft" />
            Something wrong?
          </DialogTitle>
          <DialogDescription>
            Quality failures run the pre-built rework path for this step, with its own steps,
            checks, and time in your schedule.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {stepTitle ? (
            <p className="text-sm text-muted-foreground">
              Step: <span className="font-medium text-foreground">{stepTitle}</span>
            </p>
          ) : null}

          <div className="grid gap-2">
            {TRIAGE_OPTIONS.map((opt) => {
              const selected = triageType === opt.type;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setTriageType(opt.type)}
                  className={cn(
                    'text-left rounded-lg border px-3 py-2 transition-colors',
                    selected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{opt.label}</span>
                    {opt.type === 'injury_near_miss' ? (
                      <Badge variant="destructive" className="text-[10px]">
                        Stop
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                </button>
              );
            })}
          </div>

          {recoveryPlan ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p className="font-medium text-foreground">{recoveryPlan.summary}</p>
                <ul className="list-disc pl-4 text-sm space-y-1">
                  {recoveryPlan.userSteps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-1 pt-1">
                  {recoveryPlan.actions
                    .filter((a) => a !== 'ask_ai' || Boolean(onAskAi))
                    .map((a) => (
                      <Badge key={a} variant="outline" className="text-[10px]">
                        {actionLabel(a)}
                      </Badge>
                    ))}
                </div>
              </AlertDescription>
            </Alert>
          ) : null}

          {needsReworkPath ? (
            <div className="space-y-2">
              <Label>Rework path</Label>
              {!reworkTriggerStepId ? (
                <p className="text-sm text-destructive">Open a workflow step to choose its rework path.</p>
              ) : reworkPathsError ? (
                <p className="text-sm text-destructive">{reworkPathsError}</p>
              ) : reworkPaths === null ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading rework paths
                </div>
              ) : noReworkPath ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This step has no pre-built rework path, so the fix goes to Course Correct.
                    {guaranteeCovered ? ' Applying ends success guarantee coverage for this run.' : ''}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid gap-2">
                  {reworkPaths.map((path) => {
                    const selected = path.operationId === selectedReworkPathId;
                    return (
                      <button
                        key={path.operationId}
                        type="button"
                        onClick={() => setSelectedReworkPathId(path.operationId)}
                        className={cn(
                          'text-left rounded-lg border px-3 py-2 transition-colors',
                          selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                        )}
                      >
                        <span className="text-sm font-medium text-foreground">{path.operationName}</span>
                        {path.operationDescription ? (
                          <p className="text-xs text-muted-foreground mt-0.5">{path.operationDescription}</p>
                        ) : null}
                        {path.failureModes.length > 0 ? (
                          <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground space-y-0.5">
                            {path.failureModes.map((fm) => (
                              <li key={fm.id}>{fm.failureMode}</li>
                            ))}
                          </ul>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="something-wrong-comments">Details (optional)</Label>
            <Textarea
              id="something-wrong-comments"
              placeholder="What went wrong? What did you try?"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={applyDisabled}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Applying…
              </>
            ) : (
              'Apply recovery plan'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
