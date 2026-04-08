import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoEmbedFrame } from "@/components/VideoEmbedFrame";
import type { WorkflowVideoItem } from "@/utils/workflowVideos";
import { Loader2 } from "lucide-react";

function formatLevelLabel(level: string): string {
  if (level === "beginner" || level === "intermediate" || level === "advanced") {
    return level.charAt(0).toUpperCase() + level.slice(1);
  }
  return level;
}

interface WorkflowVideosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  loading: boolean;
  items: WorkflowVideoItem[];
}

export function WorkflowVideosDialog({
  open,
  onOpenChange,
  title = "Project videos",
  loading,
  items,
}: WorkflowVideosDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[min(100vw-1rem,80rem)] max-w-[min(100vw-1rem,80rem)] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription>
            Videos from step instructions
            {loading ? " (loading…)" : items.length > 0 ? ` — ${items.length} found` : ""}.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin" />
              <span className="text-sm">Loading videos…</span>
            </div>
          ) : items.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">
              No videos found in this project&apos;s instructions.
            </p>
          ) : (
            <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-8 lg:grid-cols-2 xl:gap-10">
              {items.map((item) => {
                const metaLine = [formatLevelLabel(item.instructionLevel), item.sectionTitle]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <Card
                    key={item.id}
                    className="flex flex-col overflow-hidden border-2 shadow-lg"
                  >
                    <CardHeader className="space-y-2 bg-muted/50 pb-4">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{item.phaseName}</span>
                        <span aria-hidden className="text-muted-foreground/80">
                          ·
                        </span>
                        <span>{item.operationName}</span>
                      </div>
                      <CardTitle className="text-xl leading-snug sm:text-2xl">{item.stepTitle}</CardTitle>
                      {metaLine ? (
                        <CardDescription className="text-xs sm:text-sm">{metaLine}</CardDescription>
                      ) : null}
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col p-4 sm:p-6">
                      <div className="rounded-xl border-2 bg-muted/30 p-2 sm:p-4 dark:bg-muted/20">
                        <VideoEmbedFrame
                          raw={item.raw}
                          title={item.sectionTitle || item.stepTitle}
                          className="aspect-video rounded-lg border-0 shadow-md"
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
