import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ProjectVisualizer } from '@/components/ProjectVisualizer';
import { cn } from '@/lib/utils';

interface ProjectVisualizerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  projectName: string;
  phases: unknown;
  typicalProjectSize: number | null;
  scalingUnit: string | null;
  /**
   * When true: ~90% viewport + blurred backdrop (project workflow / planning tools).
   * When false: full-bleed visualizer (e.g. kickoff, admin).
   */
  planningWorkflowPresentation?: boolean;
}

export function ProjectVisualizerDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  phases,
  typicalProjectSize,
  scalingUnit,
  planningWorkflowPresentation = false,
}: ProjectVisualizerDialogProps) {
  const mainContents = (
    <>
      <DialogHeader className="flex-shrink-0 border-b bg-background px-2 py-1.5 md:px-4 md:py-2">
        <div className="flex items-center justify-between gap-2">
          <DialogTitle className="text-lg font-bold md:text-xl">Project Visualizer</DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[9px] md:text-xs"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogHeader>
      {projectId ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ProjectVisualizer
            projectId={projectId}
            projectName={projectName}
            phases={phases}
            typicalProjectSize={typicalProjectSize}
            scalingUnit={scalingUnit}
          />
        </div>
      ) : null}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {planningWorkflowPresentation ? (
        <DialogPortal>
          {open ? (
            <div
              className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-md transition-opacity duration-200"
              aria-hidden="true"
            />
          ) : null}
          <div
            data-dialog-content
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'fixed inset-0 z-[91] flex min-h-0 flex-col overflow-hidden bg-background p-0 shadow-lg',
              'md:left-1/2 md:top-1/2 md:right-auto md:bottom-auto md:-translate-x-1/2 md:-translate-y-1/2',
              'md:h-[90vh] md:max-h-[min(90vh,calc(100vh-2rem))] md:w-[90vw] md:max-w-[min(90vw,calc(100vw-2rem))]',
              'md:rounded-lg md:border'
            )}
          >
            {mainContents}
          </div>
        </DialogPortal>
      ) : (
        <DialogContent
          className={cn(
            'relative fixed inset-0 z-50 flex h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-background p-0 shadow-none overflow-hidden min-h-0',
            'md:max-w-none md:max-h-none md:rounded-none',
            '[&>button]:hidden',
          )}
        >
          {mainContents}
        </DialogContent>
      )}
    </Dialog>
  );
}
