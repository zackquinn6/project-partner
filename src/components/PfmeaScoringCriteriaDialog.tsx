import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  RISK_DIMENSIONS,
  RISK_DIMENSION_LABELS,
  type RiskDimension,
} from '@/utils/riskDimensions';

type PfmeaScoringRow = Database['public']['Tables']['pfmea_scoring']['Row'];

const cell = 'align-top p-2 text-xs leading-snug';

const stickyTh =
  'sticky top-0 z-20 border-b border-border bg-background px-2 py-2 text-left text-xs font-medium text-foreground shadow-[0_1px_0_0_hsl(var(--border))]';

/** h-0 + flex-1 + min-h-0: flex scroll slot so overflow-auto works on every tab panel. */
function ScoringTableScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-0 min-h-0 flex-1 overflow-auto overscroll-contain rounded-md border">
      {children}
    </div>
  );
}

/**
 * Each component has its own severity anchors: safety on injury and code, schedule on days
 * lost, budget on dollars against planned spend, quality on the original scale. Occurrence and
 * detection guidance is component-specific too, because the same score means different things
 * for a delay than for a defect.
 */
const DIMENSION_NOTE: Record<RiskDimension, string> = {
  quality: 'Severity is the consequence of missing the requirement on the finished work.',
  safety: 'Severity 9 and 10 mean injury or a code violation, so those never fall off the list.',
  schedule: 'Severity is days lost against the window committed to for the step.',
  budget: 'Severity is the overrun against planned spend.',
};

const TAB_PANEL_CLASS =
  'col-start-1 row-start-2 mt-0 flex min-h-0 w-full min-w-0 flex-col overflow-hidden focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0';

export interface PfmeaScoringCriteriaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opens on this component's rubric. Quality is the PFMEA's own scale. */
  initialDimension?: RiskDimension;
}

export const PfmeaScoringCriteriaDialog: React.FC<PfmeaScoringCriteriaDialogProps> = ({
  open,
  onOpenChange,
  initialDimension = 'quality',
}) => {
  const [rows, setRows] = useState<PfmeaScoringRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [dimension, setDimension] = useState<RiskDimension>(initialDimension);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pfmea_scoring')
      .select('*')
      .order('criterion_type', { ascending: true })
      .order('score', { ascending: true });

    setLoading(false);
    if (error) {
      toast.error(error.message);
      setRows([]);
      return;
    }
    setRows(data ?? []);
  }, []);

  useEffect(() => {
    if (open) {
      setDimension(initialDimension);
      void load();
    }
  }, [open, load, initialDimension]);

  const byType = useMemo(
    () => (t: string) =>
      rows
        .filter((r) => r.criterion_type === t && r.dimension === dimension)
        .sort((a, b) => a.score - b.score),
    [rows, dimension]
  );

  const severityRows = byType('severity');
  const occurrenceRows = byType('occurrence');
  const detectionRows = byType('detection');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex h-[90vh] max-h-[90vh] w-[80vw] max-w-[80vw] flex-col gap-0 overflow-hidden p-0 md:max-w-[80vw]">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b px-6 py-4">
          <DialogHeader className="flex-1 space-y-0 border-0 p-0 text-left">
            <DialogTitle>Scoring criteria</DialogTitle>
          </DialogHeader>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-b px-4 pb-3 pt-3 sm:px-6">
          <div className="flex flex-wrap gap-1">
            {RISK_DIMENSIONS.map((d) => (
              <Button
                key={d}
                type="button"
                size="sm"
                variant={d === dimension ? 'default' : 'outline'}
                className="h-7 px-3 text-xs"
                onClick={() => setDimension(d)}
              >
                {RISK_DIMENSION_LABELS[d]}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{DIMENSION_NOTE[dimension]}</p>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 pb-4 pt-3 sm:px-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : severityRows.length === 0 && occurrenceRows.length === 0 && detectionRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No {RISK_DIMENSION_LABELS[dimension].toLowerCase()} rubric has been seeded yet.
            </p>
          ) : (
            <Tabs
              defaultValue="severity"
              className="grid h-full min-h-0 min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-0"
            >
              <TabsList className="col-span-full row-start-1 mb-3 grid h-10 w-full shrink-0 grid-cols-3 gap-1 rounded-md bg-muted p-1 text-muted-foreground">
                <TabsTrigger className="w-full" value="severity">
                  Severity
                </TabsTrigger>
                <TabsTrigger className="w-full" value="occurrence">
                  Occurrence
                </TabsTrigger>
                <TabsTrigger className="w-full" value="detection">
                  Detection
                </TabsTrigger>
              </TabsList>

              <TabsContent value="severity" className={TAB_PANEL_CLASS}>
                <ScoringTableScroll>
                  <table className="w-max min-w-full border-separate border-spacing-0 caption-bottom text-sm">
                    <TableHeader className="[&_tr]:border-b-0">
                      <TableRow className="border-0 hover:bg-transparent">
                        <TableHead className={cn(stickyTh, 'min-w-[180px]')}>Process effects</TableHead>
                        <TableHead className={cn(stickyTh, 'min-w-[180px]')}>Process examples</TableHead>
                        <TableHead className={cn(stickyTh, 'w-14 text-center')}>Score</TableHead>
                        <TableHead className={cn(stickyTh, 'min-w-[180px]')}>Quality effects</TableHead>
                        <TableHead className={cn(stickyTh, 'min-w-[180px]')}>Quality examples</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {severityRows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className={cell}>{r.process_effects}</TableCell>
                          <TableCell className={cell}>{r.process_examples}</TableCell>
                          <TableCell className="w-14 p-2 text-center text-xs font-semibold tabular-nums">
                            {r.score}
                          </TableCell>
                          <TableCell className={cell}>{r.quality_effects}</TableCell>
                          <TableCell className={cell}>{r.quality_examples}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </table>
                </ScoringTableScroll>
              </TabsContent>

              <TabsContent value="occurrence" className={TAB_PANEL_CLASS}>
                <p className="mb-2 text-xs text-muted-foreground">
                  Occurrence carries more weight than detection, so moving a score here changes
                  priority more than adding another check.
                </p>
                <ScoringTableScroll>
                  <table className="w-max min-w-full border-separate border-spacing-0 caption-bottom text-sm">
                    <TableHeader className="[&_tr]:border-b-0">
                      <TableRow className="border-0 hover:bg-transparent">
                        <TableHead className={cn(stickyTh, 'min-w-[160px]')}>Time scale</TableHead>
                        <TableHead className={cn(stickyTh, 'min-w-[160px]')}>Occurrence scale</TableHead>
                        <TableHead className={cn(stickyTh, 'w-14 text-center')}>Score</TableHead>
                        <TableHead className={cn(stickyTh, 'min-w-[180px]')}>Mistake-proofing</TableHead>
                        <TableHead className={cn(stickyTh, 'min-w-[200px]')}>Prevention control examples</TableHead>
                        <TableHead className={cn(stickyTh, 'min-w-[200px]')}>Typical scoring note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {occurrenceRows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className={cell}>{r.occurrence_time_scale}</TableCell>
                          <TableCell className={cell}>{r.occurrence_frequency_scale}</TableCell>
                          <TableCell className="w-14 p-2 text-center text-xs font-semibold tabular-nums">
                            {r.score}
                          </TableCell>
                          <TableCell className={cell}>{r.mistake_proofing_requirement}</TableCell>
                          <TableCell className={cell}>{r.prevention_control_examples}</TableCell>
                          <TableCell className={cell}>{r.typical_occurrence_note}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </table>
                </ScoringTableScroll>
              </TabsContent>

              <TabsContent value="detection" className={TAB_PANEL_CLASS}>
                <p className="mb-2 text-xs text-muted-foreground">
                  Detection only changes priority when occurrence is 1 to 3, and it can never
                  improve priority by more than one level.
                </p>
                <ScoringTableScroll>
                  <table className="w-max min-w-full border-separate border-spacing-0 caption-bottom text-sm">
                    <TableHeader className="[&_tr]:border-b-0">
                      <TableRow className="border-0 hover:bg-transparent">
                        <TableHead className={cn(stickyTh, 'min-w-[220px]')}>Failure mode detection</TableHead>
                        <TableHead className={cn(stickyTh, 'min-w-[220px]')}>Cause detection</TableHead>
                        <TableHead className={cn(stickyTh, 'w-14 text-center')}>Score</TableHead>
                        <TableHead className={cn(stickyTh, 'min-w-[200px]')}>Method guidance</TableHead>
                        <TableHead className={cn(stickyTh, 'min-w-[200px]')}>Typical note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detectionRows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className={cell}>{r.failure_mode_detection}</TableCell>
                          <TableCell className={cell}>{r.cause_detection}</TableCell>
                          <TableCell className="w-14 p-2 text-center text-xs font-semibold tabular-nums">
                            {r.score}
                          </TableCell>
                          <TableCell className={cell}>{r.detection_method_guidance}</TableCell>
                          <TableCell className={cell}>{r.typical_detection_note}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </table>
                </ScoringTableScroll>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
