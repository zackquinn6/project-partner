import React, { useMemo, useState } from 'react';
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
  insertReworkOperation,
  reopenStepCompletion,
  legacyIssueFlagsFromTriage,
  RecoveryAction,
} from '@/utils/reworkEngine';
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
  spaceId?: string | null;
  completedSteps: string[];
  updateProjectRun: (run: ProjectRun) => Promise<void> | void;
  setCompletedSteps: (steps: Set<string>) => void;
  onOpenUnplannedWork?: () => void;
  onOpenShopping?: () => void;
  onOpenToolRentals?: () => void;
  onOpenExpertHelp?: () => void;
  onAskAi?: () => void;
  /** Called when recovery includes schedule_slip — parent applies regen + shows delta */
  onScheduleSlip?: () => Promise<void> | void;
}

function actionLabel(action: RecoveryAction): string {
  switch (action) {
    case 'reopen_step':
      return 'Reopen this step';
    case 'insert_rework_op':
      return 'Insert Rework operation';
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
    default:
      return action;
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
  spaceId,
  completedSteps,
  updateProjectRun,
  setCompletedSteps,
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

  const recoveryPlan = useMemo(
    () => (triageType ? buildRecoveryPlan(triageType) : null),
    [triageType]
  );

  const reset = () => {
    setTriageType(null);
    setComments('');
    setSubmitting(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleApply = async () => {
    if (!triageType || !recoveryPlan || !projectRun || !userId) {
      toast.error('Sign in and select what went wrong to continue.');
      return;
    }

    setSubmitting(true);
    try {
      const family = resolveTemplateFamily(templateName, templateCategories);
      let nextPhases: Phase[] = projectRun.phases || [];
      let reworkOperationId: string | null = null;
      let reworkStepId: string | null = null;

      if (recoveryPlan.actions.includes('insert_rework_op')) {
        const inserted = insertReworkOperation(
          nextPhases,
          phaseId,
          stepId,
          triageType,
          comments
        );
        nextPhases = inserted.phases;
        reworkOperationId = inserted.reworkOperationId;
        reworkStepId = inserted.reworkStepId;
      }

      let nextCompleted = [...completedSteps];
      if (recoveryPlan.actions.includes('reopen_step')) {
        nextCompleted = reopenStepCompletion(nextCompleted, stepId, spaceId);
        setCompletedSteps(new Set(nextCompleted));
      }

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

      const recoveryPayload = {
        ...recoveryPlan,
        reworkOperationId,
        reworkStepId,
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

      if (recoveryPlan.actions.includes('open_unplanned_work')) {
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
      } else if (reworkStepId) {
        toast.success('Rework plan applied', {
          description: 'A Rework operation was added. Complete it before finishing the original step.',
        });
      } else {
        toast.success('Recovery plan applied', {
          description: recoveryPlan.summary,
        });
      }

      handleOpenChange(false);
    } catch (err) {
      console.error('SomethingWrong apply failed:', err);
      toast.error('Could not apply the recovery plan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Something wrong?
          </DialogTitle>
          <DialogDescription>
            Tell us what happened. We will build a recovery path — reopen the step, insert rework, or update shopping and schedule.
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
                  {recoveryPlan.actions.map((a) => (
                    <Badge key={a} variant="outline" className="text-[10px]">
                      {actionLabel(a)}
                    </Badge>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
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
          <Button onClick={handleApply} disabled={!triageType || submitting || !userId}>
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
