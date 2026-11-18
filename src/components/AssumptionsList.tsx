import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ProjectRun } from '@/interfaces/ProjectRun';
import type { Phase } from '@/interfaces/Project';
import {
  ASSUMPTION_CATEGORY_LABELS,
  ASSUMPTION_HANDLING_LABELS,
  markRunAssumptionViolated,
  placeBranchOperationInRun,
  type AssumptionLevel,
  type RunAssumption,
} from '@/utils/projectAssumptions';

const LEVEL_LABELS: Record<AssumptionLevel, string> = {
  foundation: 'Every project',
  template: 'This project',
};

interface AssumptionsListProps {
  assumptions: RunAssumption[];
  /** Required to report violations; omit for a read-only list. */
  projectRun?: ProjectRun;
  onChanged?: () => Promise<void> | void;
  onBranchPlaced?: (phases: Phase[]) => Promise<void>;
}

export function AssumptionsList({
  assumptions,
  projectRun,
  onChanged,
  onBranchPlaced,
}: AssumptionsListProps) {
  const [reporting, setReporting] = useState<RunAssumption | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const groups = useMemo(() => {
    const byLevel: Record<AssumptionLevel, RunAssumption[]> = { foundation: [], template: [] };
    for (const assumption of assumptions) byLevel[assumption.sourceLevel].push(assumption);
    return (['template', 'foundation'] as const).filter((level) => byLevel[level].length > 0).map((level) => ({
      level,
      items: byLevel[level],
    }));
  }, [assumptions]);

  const canReport = Boolean(projectRun && onChanged && onBranchPlaced);

  const submitViolation = async () => {
    if (!reporting || !projectRun || !onBranchPlaced) return;
    const trimmed = note.trim();
    if (trimmed === '') {
      toast.error('Describe what happened');
      return;
    }
    if (!projectRun.projectId) {
      toast.error('This run has no template project');
      return;
    }
    setSaving(true);
    try {
      const result = await markRunAssumptionViolated(reporting.id, trimmed);
      if (result.branchOperationId) {
        const placed = await placeBranchOperationInRun({
          projectRunId: projectRun.id,
          templateProjectId: projectRun.projectId,
          runPhases: (projectRun.phases || []) as Phase[],
          operationId: result.branchOperationId,
        });
        if (placed) {
          await onBranchPlaced(placed);
          toast.success('The plan branch for this condition was added to your workflow');
        } else {
          toast.success('The plan branch for this condition is already in your workflow');
        }
      } else if (result.endsCoverage) {
        toast.message('Recorded. Success guarantee coverage for this run has ended.');
      } else {
        toast.success('Recorded');
      }
      setReporting(null);
      setNote('');
      await onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (assumptions.length === 0) {
    return <p className="text-xs text-muted-foreground">No assumptions on this run.</p>;
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.level} className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{LEVEL_LABELS[group.level]}</p>
          {group.items.map((assumption) => (
            <div key={assumption.id} className="rounded-md border bg-background/50 p-2.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm flex-1 min-w-[12rem]">{assumption.statement}</p>
                {canReport && assumption.violatedAt === null ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => {
                      setReporting(assumption);
                      setNote('');
                    }}
                  >
                    Report violated
                  </Button>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[10px]">
                  {ASSUMPTION_CATEGORY_LABELS[assumption.category]}
                </Badge>
                <Badge
                  variant={assumption.handling === 'accepted' ? 'secondary' : 'outline'}
                  className="text-[10px]"
                >
                  {ASSUMPTION_HANDLING_LABELS[assumption.handling]}
                </Badge>
                {assumption.violatedAt ? (
                  <Badge variant="destructive" className="text-[10px]">
                    Violated
                  </Badge>
                ) : null}
              </div>
              {assumption.violationNote ? (
                <p className="mt-1 text-xs text-muted-foreground">{assumption.violationNote}</p>
              ) : null}
            </div>
          ))}
        </div>
      ))}

      <Dialog open={reporting !== null} onOpenChange={(open) => !open && setReporting(null)}>
        <DialogContent className="z-[100] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report a violated assumption</DialogTitle>
            <DialogDescription>
              {reporting?.handling === 'accepted'
                ? 'The plan has no response for this condition, so reporting it ends success guarantee coverage for this run.'
                : 'The plan has a branch for this condition. Reporting it adds that branch to your workflow.'}
            </DialogDescription>
          </DialogHeader>
          {reporting ? <p className="text-sm font-medium">{reporting.statement}</p> : null}
          <div className="space-y-2">
            <Label htmlFor="assumption-violation-note">What happened</Label>
            <Textarea
              id="assumption-violation-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReporting(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submitViolation} disabled={saving || note.trim() === ''}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Report'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
