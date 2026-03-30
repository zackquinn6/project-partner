import React, { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { GitBranch } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ProjectRun } from '@/interfaces/ProjectRun';
import { PLANNING_TOOLS } from '@/components/KickoffSteps/ProjectToolsStep';
import type { PlanningScopeBaselineV1 } from '@/utils/planningChangeTracking';

type ChangeRow = {
  id: string;
  occurred_at: string;
  planning_tool: string;
  change_summary: string;
};

const TOOL_LABELS: Record<string, string> = {
  ...Object.fromEntries(PLANNING_TOOLS.map((t) => [t.id, t.label])),
  quality_control: 'Quality',
};

function runDisplayName(run: ProjectRun): string {
  const c = run.customProjectName?.trim();
  if (c) return c;
  return run.name?.trim() || run.id;
}

function formatMaybeIso(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return format(d, 'MMM d, yyyy h:mm a');
  } catch {
    return iso;
  }
}

function formatGoalDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return null;
    return format(d, 'MMMM d, yyyy');
  } catch {
    return null;
  }
}

export interface ChangeManagementWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectRun: ProjectRun | null;
}

export function ChangeManagementWindow({
  open,
  onOpenChange,
  projectRun,
}: ChangeManagementWindowProps) {
  const { toast } = useToast();
  const [rows, setRows] = useState<ChangeRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRows = useCallback(async () => {
    if (!projectRun?.id) {
      setRows([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('project_run_planning_change_events')
      .select('id, occurred_at, planning_tool, change_summary')
      .eq('project_run_id', projectRun.id)
      .order('occurred_at', { ascending: false });
    setLoading(false);
    if (error) {
      toast({
        title: 'Could not load change log',
        description: error.message,
        variant: 'destructive',
      });
      setRows([]);
      return;
    }
    setRows((data ?? []) as ChangeRow[]);
  }, [projectRun?.id, toast]);

  useEffect(() => {
    if (!open || !projectRun?.id) return;
    void loadRows();
  }, [open, projectRun?.id, loadRows]);

  useEffect(() => {
    if (!open || !projectRun?.id) return;
    const onRefresh = (e: Event) => {
      const d = (e as CustomEvent<{ projectRunId?: string }>).detail;
      if (d?.projectRunId === projectRun.id) void loadRows();
    };
    window.addEventListener('project-scheduler-updated', onRefresh);
    window.addEventListener('project-customizer-updated', onRefresh);
    window.addEventListener('planning-change-events-updated', onRefresh);
    return () => {
      window.removeEventListener('project-scheduler-updated', onRefresh);
      window.removeEventListener('project-customizer-updated', onRefresh);
      window.removeEventListener('planning-change-events-updated', onRefresh);
    };
  }, [open, projectRun?.id, loadRows]);

  const baseline = projectRun?.planningScopeBaseline as PlanningScopeBaselineV1 | undefined;
  const baselineVersion =
    baseline && typeof baseline.version === 'number' ? baseline.version : null;
  const scheduleSnap = baseline?.schedule;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[90vw] md:max-w-none h-[85vh] p-0 gap-0 [&>button]:hidden">
        <DialogHeader className="p-4 border-b bg-gradient-subtle flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3 text-left">
            <div className="p-2 rounded-lg bg-primary/10">
              <GitBranch className="w-4 h-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Change management</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1 font-normal">
                Original scope, baseline from planning, and updates to planning tools
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogHeader>

        <ScrollArea className="flex-1 h-[calc(85vh-5.5rem)]">
          <div className="p-4 space-y-4">
            {projectRun ? (
              <>
                <div className="text-sm text-muted-foreground">
                  Project: <span className="text-foreground font-medium">{runDisplayName(projectRun)}</span>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base">Project created</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-1">
                      <p>
                        Recorded when this run was started from the catalog (same as database{' '}
                        <code className="text-xs bg-muted px-1 rounded">created_at</code>).
                      </p>
                      <p className="text-foreground font-medium tabular-nums">
                        {formatMaybeIso(projectRun.createdAt.toISOString())}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base">Baseline (planning complete)</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                      {!projectRun.planningCompletedAt ? (
                        <p>
                          When you finish the project planning workflow and start the project, schedule,
                          budget, and scope builder choices are stored as the baseline to compare later
                          changes against.
                        </p>
                      ) : baselineVersion === 1 && scheduleSnap ? (
                        <>
                          <p className="text-foreground font-medium tabular-nums">
                            Locked {formatMaybeIso(projectRun.planningCompletedAt.toISOString())}
                          </p>
                          <ul className="list-disc pl-4 space-y-1">
                            <li>
                              Goal completion date:{' '}
                              <span className="text-foreground">
                                {formatGoalDate(scheduleSnap.initial_timeline) ?? 'Not set'}
                              </span>
                            </li>
                            <li>
                              Plan bounds: start and end dates from the run at lock time are stored for
                              comparison.
                            </li>
                            <li>Budget line items and customizer decisions are fingerprinted at lock time.</li>
                          </ul>
                        </>
                      ) : (
                        <>
                          <p className="text-foreground font-medium tabular-nums">
                            Planning completed {formatMaybeIso(projectRun.planningCompletedAt.toISOString())}
                          </p>
                          <p>
                            Baseline snapshot is not stored yet for this run. It will be written on the next
                            save after the database migration is applied, or open any planning tool and save
                            once.
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="py-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Planning change log</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => void loadRows()} disabled={loading}>
                      Refresh
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {!projectRun.planningCompletedAt ? (
                      <p className="text-sm text-muted-foreground">
                        Changes are logged only after planning is complete and a baseline exists.
                      </p>
                    ) : rows.length === 0 && !loading ? (
                      <p className="text-sm text-muted-foreground">
                        No changes recorded yet after your baseline. Edits from Timekeeper, Scope Builder,
                        budgeting, shopping, and quality settings appear here with a short summary.
                      </p>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[200px]">When</TableHead>
                              <TableHead className="w-[140px]">Tool</TableHead>
                              <TableHead>Change</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rows.map((r) => (
                              <TableRow key={r.id}>
                                <TableCell className="tabular-nums text-muted-foreground align-top">
                                  {formatMaybeIso(r.occurred_at)}
                                </TableCell>
                                <TableCell className="align-top">
                                  <Badge variant="secondary" className="font-normal">
                                    {TOOL_LABELS[r.planning_tool] ?? r.planning_tool}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm align-top break-words max-w-[min(100%,32rem)]">
                                  {r.change_summary}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Open a project run to view change management.</p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
