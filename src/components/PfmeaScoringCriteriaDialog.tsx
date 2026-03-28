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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type PfmeaScoringRow = Database['public']['Tables']['pfmea_scoring']['Row'];

const cell = 'max-w-[220px] align-top text-xs leading-snug';

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
      <DialogContent className="flex max-h-[min(88vh,900px)] w-[60vw] max-w-[60vw] flex-col gap-0 overflow-hidden p-0 md:max-w-[60vw]">
        <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
          <DialogTitle>Scoring criteria</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto px-4 pb-4 pt-3 sm:px-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <Tabs defaultValue="severity" className="w-full">
              <TabsList className="mb-3 grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
                <TabsTrigger value="severity">Severity</TabsTrigger>
                <TabsTrigger value="occurrence">Occurrence</TabsTrigger>
                <TabsTrigger value="detection">Detection</TabsTrigger>
              </TabsList>

              <TabsContent value="severity" className="mt-0">
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="min-w-[180px] text-xs">Process effects</TableHead>
                        <TableHead className="min-w-[180px] text-xs">Process examples</TableHead>
                        <TableHead className="w-14 text-center text-xs">Score</TableHead>
                        <TableHead className="min-w-[180px] text-xs">Quality effects</TableHead>
                        <TableHead className="min-w-[180px] text-xs">Quality examples</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byType('severity').map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className={cell}>{r.process_effects}</TableCell>
                          <TableCell className={cell}>{r.process_examples}</TableCell>
                          <TableCell className="w-14 text-center font-semibold tabular-nums">{r.score}</TableCell>
                          <TableCell className={cell}>{r.quality_effects}</TableCell>
                          <TableCell className={cell}>{r.quality_examples}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="occurrence" className="mt-0">
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="min-w-[160px] text-xs">Time scale</TableHead>
                        <TableHead className="min-w-[160px] text-xs">Occurrence scale</TableHead>
                        <TableHead className="w-14 text-center text-xs">Score</TableHead>
                        <TableHead className="min-w-[180px] text-xs">Mistake-proofing</TableHead>
                        <TableHead className="min-w-[200px] text-xs">Prevention control examples</TableHead>
                        <TableHead className="min-w-[200px] text-xs">Typical scoring note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byType('occurrence').map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className={cell}>{r.occurrence_time_scale}</TableCell>
                          <TableCell className={cell}>{r.occurrence_frequency_scale}</TableCell>
                          <TableCell className="w-14 text-center font-semibold tabular-nums">{r.score}</TableCell>
                          <TableCell className={cell}>{r.mistake_proofing_requirement}</TableCell>
                          <TableCell className={cell}>{r.prevention_control_examples}</TableCell>
                          <TableCell className={cell}>{r.typical_occurrence_note}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="detection" className="mt-0">
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="min-w-[220px] text-xs">Failure mode detection</TableHead>
                        <TableHead className="min-w-[220px] text-xs">Cause detection</TableHead>
                        <TableHead className="w-14 text-center text-xs">Score</TableHead>
                        <TableHead className="min-w-[200px] text-xs">Method guidance</TableHead>
                        <TableHead className="min-w-[200px] text-xs">Typical note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byType('detection').map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className={cell}>{r.failure_mode_detection}</TableCell>
                          <TableCell className={cell}>{r.cause_detection}</TableCell>
                          <TableCell className="w-14 text-center font-semibold tabular-nums">{r.score}</TableCell>
                          <TableCell className={cell}>{r.detection_method_guidance}</TableCell>
                          <TableCell className={cell}>{r.typical_detection_note}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
