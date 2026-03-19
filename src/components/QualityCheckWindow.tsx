import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, Target, RefreshCw } from 'lucide-react';
import { WorkflowStep } from '@/interfaces/Project';
import { isStepCompleted } from '@/utils/projectUtils';

type StepInstance = WorkflowStep & {
  phaseName?: string;
  operationName?: string;
  phaseId?: string;
  operationId?: string;
  spaceId?: string;
};

type QualityCheckRow = {
  key: string;
  phaseName: string;
  operationStepName: string;
  stepId: string;
  spaceId?: string;
  outputId: string;
  outputName: string;
};

interface QualityCheckWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  steps: StepInstance[];
  completedSteps: Set<string>;
  checkedOutputs: Record<string, Set<string>>;
  onJumpToStep: (stepId: string, spaceId?: string | null) => void;
  onToggleOutputComplete: (stepId: string, outputId: string) => void;
  onRefresh?: () => void;
}

export function QualityCheckWindow({
  open,
  onOpenChange,
  steps,
  completedSteps,
  checkedOutputs,
  onJumpToStep,
  onToggleOutputComplete,
  onRefresh
}: QualityCheckWindowProps) {
  const missingRows = useMemo<QualityCheckRow[]>(() => {
    const rows: QualityCheckRow[] = [];
    const seen = new Set<string>();

    for (const step of steps) {
      const stepOutputs = Array.isArray(step.outputs) ? step.outputs : [];
      if (stepOutputs.length === 0) continue;

      // If the step is already completed for this space (or globally), all its outputs are considered complete.
      const stepIsComplete = isStepCompleted(completedSteps, step.id, step.spaceId ?? null);
      if (stepIsComplete) continue;

      const checkedSet = checkedOutputs[step.id] || new Set<string>();

      for (const output of stepOutputs) {
        if (checkedSet.has(output.id)) continue;

        const spaceId = step.spaceId ?? undefined;
        const rowKey = `${step.id}:${spaceId ?? 'global'}:${output.id}`;
        if (seen.has(rowKey)) continue;
        seen.add(rowKey);

        rows.push({
          key: rowKey,
          phaseName: typeof step.phaseName === 'string' ? step.phaseName : '',
          operationStepName: step.step,
          stepId: step.id,
          spaceId,
          outputId: output.id,
          outputName: output.name
        });
      }
    }

    rows.sort((a, b) => {
      const aPhase = a.phaseName || '';
      const bPhase = b.phaseName || '';
      if (aPhase !== bPhase) return aPhase.localeCompare(bPhase);
      return a.operationStepName.localeCompare(b.operationStepName);
    });

    return rows;
  }, [steps, completedSteps, checkedOutputs]);

  const remainingCount = missingRows.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Quality Check
              </DialogTitle>
              <DialogDescription>
                Outputs that are not completed yet (based on your project run progress).
              </DialogDescription>
            </div>

            {onRefresh && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={onRefresh}
                      aria-label="Refresh quality check"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    Recompute missing outputs from the current project run.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </DialogHeader>

        {remainingCount === 0 ? (
          <div className="p-6">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">All outputs completed!</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Every output across the workflow has been marked complete.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 px-1">
              <Badge variant="secondary" className="text-xs">
                {remainingCount} output{remainingCount !== 1 ? 's' : ''} remaining
              </Badge>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">Phase</TableHead>
                    <TableHead className="w-72">Operation Step</TableHead>
                    <TableHead>Output Not Completed</TableHead>
                    <TableHead className="w-[180px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missingRows.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="align-top">
                        {row.phaseName || ''}
                      </TableCell>
                      <TableCell className="align-top">
                        {row.operationStepName}
                      </TableCell>
                      <TableCell className="align-top">
                        {row.outputName}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex items-center gap-2">
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    onJumpToStep(row.stepId, row.spaceId ?? null);
                                    onOpenChange(false);
                                  }}
                                  aria-label="Jump to step"
                                >
                                  <Target className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs text-xs">
                                Jump back to the step to finish this output.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <Button
                            type="button"
                            variant="default"
                            className="bg-green-600 hover:bg-green-700 text-white text-xs"
                            onClick={() => onToggleOutputComplete(row.stepId, row.outputId)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Mark complete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

