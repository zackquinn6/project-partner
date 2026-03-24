import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { BarChart3, LayoutGrid, X } from 'lucide-react';
import { CheckCircle } from 'lucide-react';

interface StepLike {
  id: string;
  step: string;
  description?: string;
}

interface ProgressViewsWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allSteps: StepLike[];
  completedSteps: Set<string>;
  currentStepId: string | undefined;
  onStepClick?: (stepIndex: number) => void;
}

type ViewMode = 'gantt' | 'kanban';

export function ProgressViewsWindow({
  open,
  onOpenChange,
  allSteps,
  completedSteps,
  currentStepId,
  onStepClick,
}: ProgressViewsWindowProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('gantt');

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
          Gantt and Kanban views of project progress
        </DialogDescription>

        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold">Progress views</h2>
            <div className="flex items-center gap-2">
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(v) => v && setViewMode(v as ViewMode)}
              className="gap-0"
            >
              <ToggleGroupItem value="gantt" aria-label="Gantt chart" className="gap-1.5 px-3">
                <BarChart3 className="h-4 w-4" />
                Gantt
              </ToggleGroupItem>
              <ToggleGroupItem value="kanban" aria-label="Kanban" className="gap-1.5 px-3">
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </ToggleGroupItem>
            </ToggleGroup>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 px-3 text-xs"
            >
              Close
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {viewMode === 'gantt' && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground mb-3">
                {completedCount} of {totalSteps} steps complete
              </p>
              <div className="space-y-2">
                {allSteps.map((step, index) => {
                  const isComplete = completedSteps.has(step.id);
                  const isCurrent = step.id === currentStepId;
                  return (
                    <div
                      key={step.id}
                      className="flex items-center gap-3 group"
                    >
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
            </div>
          )}

          {viewMode === 'kanban' && (
            <div className="grid grid-cols-3 gap-4 h-full min-h-[400px]">
              <Card className="flex flex-col">
                <CardHeader className="py-3 px-4 border-b">
                  <CardTitle className="text-sm font-medium">
                    Not started ({kanbanColumns.notStarted.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto p-2 space-y-2">
                  {kanbanColumns.notStarted.map((step, index) => {
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
                  {kanbanColumns.inProgress.map((step, index) => {
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
                  {kanbanColumns.done.map((step, index) => {
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
