import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { BarChart3, CheckCircle, ChevronRight, LayoutGrid, Workflow } from 'lucide-react';
import type { Phase } from '@/interfaces/Project';

interface StepLike {
  id: string;
  step: string;
  description?: string;
}

/** Placeholder until PFMEA is wired; same shape expected from backend later. */
export interface PfmeaRiskCounts {
  high: number;
  medium: number;
  low: number;
}

interface ProgressViewsWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allSteps: StepLike[];
  completedSteps: Set<string>;
  currentStepId: string | undefined;
  onStepClick?: (stepIndex: number) => void;
  /** Workflow phases (template snapshot) for process map; optional when empty. */
  workflowPhases?: Phase[];
}

function placeholderPfmeaCounts(_key: string): PfmeaRiskCounts {
  return { high: 0, medium: 0, low: 0 };
}

function RiskCountStrip({ counts, compact }: { counts: PfmeaRiskCounts; compact?: boolean }) {
  const cls = compact ? 'text-[10px] leading-tight' : 'text-xs';
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-muted-foreground ${cls}`}
      title="Risk counts from PFMEA (not connected yet)"
    >
      <span className="tabular-nums">
        <span className="font-medium text-destructive/90">H</span> {counts.high}
      </span>
      <span className="text-border">·</span>
      <span className="tabular-nums">
        <span className="font-medium text-amber-600 dark:text-amber-500">M</span> {counts.medium}
      </span>
      <span className="text-border">·</span>
      <span className="tabular-nums">
        <span className="font-medium text-emerald-600 dark:text-emerald-500">L</span> {counts.low}
      </span>
    </div>
  );
}

type ProcessMapGranularity = 'phases' | 'operations';

function ProcessMapPanel({ workflowPhases }: { workflowPhases: Phase[] }) {
  const [granularity, setGranularity] = useState<ProcessMapGranularity>('phases');

  const phaseNodes = useMemo(
    () =>
      workflowPhases.map((phase) => ({
        id: phase.id,
        label: phase.name,
        counts: placeholderPfmeaCounts(`phase:${phase.id}`),
      })),
    [workflowPhases]
  );

  const operationNodes = useMemo(() => {
    const out: { id: string; label: string; phaseName: string; counts: PfmeaRiskCounts }[] = [];
    for (const phase of workflowPhases) {
      for (const op of phase.operations || []) {
        out.push({
          id: op.id,
          label: op.name,
          phaseName: phase.name,
          counts: placeholderPfmeaCounts(`op:${op.id}`),
        });
      }
    }
    return out;
  }, [workflowPhases]);

  if (workflowPhases.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No workflow phases loaded for this project run.
      </p>
    );
  }

  const nodes = granularity === 'phases' ? phaseNodes : operationNodes;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          High-level flow with PFMEA risk counts per {granularity === 'phases' ? 'phase' : 'operation'}{' '}
          (severities will link to PFMEA when connected).
        </p>
        <ToggleGroup
          type="single"
          value={granularity}
          onValueChange={(v) => v && setGranularity(v as ProcessMapGranularity)}
          className="justify-start sm:justify-end"
        >
          <ToggleGroupItem value="phases" aria-label="Show phases" className="px-3 text-xs">
            Phases
          </ToggleGroupItem>
          <ToggleGroupItem value="operations" aria-label="Show operations" className="px-3 text-xs">
            Operations
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="rounded-lg border bg-muted/20 p-4 overflow-x-auto">
        <div className="flex items-stretch gap-0 min-w-min py-2">
          {nodes.map((node, index) => (
            <React.Fragment key={node.id}>
              {index > 0 && (
                <div className="flex items-center justify-center px-1 sm:px-2 flex-shrink-0">
                  <ChevronRight className="h-5 w-5 text-muted-foreground/60" aria-hidden />
                </div>
              )}
              <div className="flex flex-col items-center gap-2 flex-shrink-0 w-[140px] sm:w-[160px]">
                <RiskCountStrip counts={node.counts} compact />
                <div
                  className="w-full rounded-full border-2 border-primary/25 bg-background px-3 py-3 text-center shadow-sm ring-1 ring-border/60"
                  title={node.label}
                >
                  {granularity === 'operations' && 'phaseName' in node && (
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate mb-1">
                      {(node as { phaseName: string }).phaseName}
                    </p>
                  )}
                  <p className="text-xs sm:text-sm font-semibold leading-snug line-clamp-3">{node.label}</p>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Map reads left → right in phase order. PFMEA linkage will populate H / M / L from failure-mode severity.
      </p>
    </div>
  );
}

export function ProgressViewsWindow({
  open,
  onOpenChange,
  allSteps,
  completedSteps,
  currentStepId,
  onStepClick,
  workflowPhases = [],
}: ProgressViewsWindowProps) {
  const [mainTab, setMainTab] = useState('gantt');

  useEffect(() => {
    if (open) setMainTab('gantt');
  }, [open]);

  const totalSteps = allSteps.length;
  const completedCount = useMemo(
    () => allSteps.filter((s) => completedSteps.has(s.id)).length,
    [allSteps, completedSteps]
  );

  const kanbanColumns = useMemo(() => {
    const notStarted: StepLike[] = [];
    const inProgress: StepLike[] = [];
    const done: StepLike[] = [];
    allSteps.forEach((step) => {
      if (completedSteps.has(step.id)) {
        done.push(step);
      } else if (step.id === currentStepId) {
        inProgress.push(step);
      } else {
        notStarted.push(step);
      }
    });
    return { notStarted, inProgress, done };
  }, [allSteps, completedSteps, currentStepId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-h-[90vh] w-full max-w-[100vw] flex-col overflow-hidden p-0 md:max-w-[100vw] lg:w-[50vw] lg:max-w-[50vw] [&>button]:hidden">
        <DialogTitle className="sr-only">Progress views</DialogTitle>
        <DialogDescription className="sr-only">
          Gantt, Kanban, and process map views of project progress
        </DialogDescription>

        <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Progress views</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 px-3 text-xs self-start sm:self-auto"
          >
            Close
          </Button>
        </div>

        <Tabs value={mainTab} onValueChange={setMainTab} className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <div className="border-b px-4">
            <TabsList className="h-auto w-full justify-start gap-1 bg-transparent p-0 py-2 flex-wrap">
              <TabsTrigger value="gantt" className="gap-1.5 data-[state=active]:bg-muted">
                <BarChart3 className="h-4 w-4" />
                Gantt
              </TabsTrigger>
              <TabsTrigger value="kanban" className="gap-1.5 data-[state=active]:bg-muted">
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </TabsTrigger>
              <TabsTrigger value="processmap" className="gap-1.5 data-[state=active]:bg-muted">
                <Workflow className="h-4 w-4" />
                Process Map
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto p-4 min-h-0">
            <TabsContent value="gantt" className="mt-0 space-y-1 h-full">
              <p className="text-sm text-muted-foreground mb-3">
                {completedCount} of {totalSteps} steps complete
              </p>
              <div className="space-y-2">
                {allSteps.map((step, index) => {
                  const isComplete = completedSteps.has(step.id);
                  const isCurrent = step.id === currentStepId;
                  return (
                    <div key={step.id} className="flex items-center gap-3 group">
                      <div className="w-48 flex-shrink-0 text-sm truncate" title={step.step}>
                        {step.step}
                      </div>
                      <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden flex">
                        <div
                          className={`h-full transition-all ${
                            isComplete
                              ? 'bg-green-500'
                              : isCurrent
                                ? 'bg-primary'
                                : 'bg-muted-foreground/20'
                          }`}
                          style={{
                            width: isComplete ? '100%' : isCurrent ? '50%' : '0%',
                          }}
                        />
                      </div>
                      {isComplete && (
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                      {onStepClick && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 text-xs"
                          onClick={() => onStepClick(index)}
                        >
                          Go
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="kanban" className="mt-0 h-full">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[400px]">
                <Card className="flex flex-col">
                  <CardHeader className="py-3 px-4 border-b">
                    <CardTitle className="text-sm font-medium">
                      Not started ({kanbanColumns.notStarted.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-auto p-2 space-y-2">
                    {kanbanColumns.notStarted.map((step) => {
                      const stepIndex = allSteps.findIndex((s) => s.id === step.id);
                      return (
                        <Card
                          key={step.id}
                          className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => onStepClick?.(stepIndex)}
                        >
                          <p className="text-sm font-medium truncate">{step.step}</p>
                        </Card>
                      );
                    })}
                  </CardContent>
                </Card>
                <Card className="flex flex-col border-primary/50">
                  <CardHeader className="py-3 px-4 border-b">
                    <CardTitle className="text-sm font-medium">
                      In progress ({kanbanColumns.inProgress.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-auto p-2 space-y-2">
                    {kanbanColumns.inProgress.map((step) => {
                      const stepIndex = allSteps.findIndex((s) => s.id === step.id);
                      return (
                        <Card
                          key={step.id}
                          className="p-3 cursor-pointer bg-primary/5 border-primary/30 hover:bg-primary/10"
                          onClick={() => onStepClick?.(stepIndex)}
                        >
                          <p className="text-sm font-medium truncate">{step.step}</p>
                        </Card>
                      );
                    })}
                  </CardContent>
                </Card>
                <Card className="flex flex-col">
                  <CardHeader className="py-3 px-4 border-b">
                    <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Done ({kanbanColumns.done.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-auto p-2 space-y-2">
                    {kanbanColumns.done.map((step) => {
                      const stepIndex = allSteps.findIndex((s) => s.id === step.id);
                      return (
                        <Card
                          key={step.id}
                          className="p-3 cursor-pointer hover:bg-muted/50 opacity-90"
                          onClick={() => onStepClick?.(stepIndex)}
                        >
                          <p className="text-sm font-medium truncate">{step.step}</p>
                        </Card>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="processmap" className="mt-0 h-full">
              <ProcessMapPanel workflowPhases={workflowPhases} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
