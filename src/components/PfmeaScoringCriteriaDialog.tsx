import React, { useCallback, useEffect, useState } from 'react';
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

type PfmeaScoringRow = Database['public']['Tables']['pfmea_scoring']['Row'];

const cell = 'align-top p-2 text-xs leading-snug';

const stickyTh =
  'sticky top-0 z-20 border-b border-border bg-background px-2 py-2 text-left text-xs font-medium text-foreground shadow-[0_1px_0_0_hsl(var(--border))]';

function ScoringTableScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-md border">
      {children}
    </div>
  );
}

export interface PfmeaScoringCriteriaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PfmeaScoringCriteriaDialog: React.FC<PfmeaScoringCriteriaDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [rows, setRows] = useState<PfmeaScoringRow[]>([]);
  const [loading, setLoading] = useState(false);

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
    if (open) void load();
  }, [open, load]);

  const byType = (t: string) => rows.filter((r) => r.criterion_type === t).sort((a, b) => a.score - b.score);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex h-[90vh] max-h-[90vh] w-[80vw] max-w-[80vw] flex-col gap-0 overflow-hidden p-0 md:max-w-[80vw]">
        <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
          <DialogTitle>Scoring criteria</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 pt-3 sm:px-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
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

              <TabsContent
                value="severity"
                className="col-start-1 row-start-2 mt-0 flex h-full min-h-0 w-full flex-col overflow-hidden focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              >
                <ScoringTableScroll>
                  <table className="w-full min-w-0 border-separate border-spacing-0 caption-bottom text-sm">
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
                      {byType('severity').map((r) => (
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

              <TabsContent
                value="occurrence"
                className="col-start-1 row-start-2 mt-0 flex h-full min-h-0 w-full flex-col overflow-hidden focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              >
                <ScoringTableScroll>
                  <table className="w-full min-w-0 border-separate border-spacing-0 caption-bottom text-sm">
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
                      {byType('occurrence').map((r) => (
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

              <TabsContent
                value="detection"
                className="col-start-1 row-start-2 mt-0 flex h-full min-h-0 w-full flex-col overflow-hidden focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              >
                <ScoringTableScroll>
                  <table className="w-full min-w-0 border-separate border-spacing-0 caption-bottom text-sm">
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
                      {byType('detection').map((r) => (
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

        <div className="shrink-0 border-t px-6 py-3">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
