import React, { useEffect, useMemo, useState } from 'react';
import type { Phase, WorkflowStep, Output, StepInput } from '@/interfaces/Project';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { parseProcessVariablesFromDb, serializeProcessVariablesForDb } from '@/utils/processVariablesUtils';
import { cn } from '@/lib/utils';

export interface ProcessMapKpiRow {
  phase: Phase;
  operationName: string;
  step: WorkflowStep;
}

const OUTPUT_TYPES: Output['type'][] = ['none', 'major-aesthetics', 'performance-durability', 'safety'];

function normalizeOutputs(raw: unknown): Output[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((o): o is Output => !!o && typeof o === 'object' && typeof (o as Output).name === 'string');
}

function formatOutputLine(o: Output): string {
  const typePart = o.type && o.type !== 'none' ? ` (${o.type.replace(/-/g, ' ')})` : '';
  return `${o.name}${typePart}`;
}

function kpiVariableTypeLabel(type: StepInput['type']): string {
  return type === 'upstream' ? 'Input/Upstream' : 'Process';
}

function formatProcessVariableLine(v: StepInput): string {
  const parts = [v.name, kpiVariableTypeLabel(v.type)];
  if (v.unit) parts.push(v.unit);
  if (v.required) parts.push('required');
  return parts.join(' · ');
}

function canMutateStep(phase: Phase, step: WorkflowStep, isEditingStandardProject: boolean): boolean {
  if (phase.isLinked) return false;
  if (isEditingStandardProject) return true;
  if (phase.isStandard) return false;
  if (step.isStandard) return false;
  return true;
}

export interface ProcessMapKpiTabProps {
  phases: Phase[];
  isEditingStandardProject: boolean;
  onDataChanged: () => Promise<void>;
}

type DialogState =
  | { kind: 'output_add'; stepId: string }
  | { kind: 'output_edit'; stepId: string; output: Output }
  | { kind: 'variable_add'; stepId: string }
  | { kind: 'variable_edit'; stepId: string; variable: StepInput }
  | null;

type DeleteState =
  | { kind: 'output'; stepId: string; outputId: string; label: string }
  | { kind: 'variable'; stepId: string; variableId: string; label: string }
  | null;

type KpiColKey = 'phase' | 'operation' | 'step' | 'kpo' | 'kpi';

const defaultKpiColWidths: Record<KpiColKey, number> = {
  phase: 160,
  operation: 160,
  step: 180,
  kpo: 220,
  kpi: 260,
};

export function ProcessMapKpiTab({ phases, isEditingStandardProject, onDataChanged }: ProcessMapKpiTabProps) {
  const [hideStandardPhases, setHideStandardPhases] = useState(true);
  const [kpiColWidths, setKpiColWidths] = useState<Record<KpiColKey, number>>(defaultKpiColWidths);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteState>(null);
  const [pending, setPending] = useState(false);

  const [outName, setOutName] = useState('');
  const [outDesc, setOutDesc] = useState('');
  const [outType, setOutType] = useState<Output['type']>('none');

  const [varName, setVarName] = useState('');
  const [varDesc, setVarDesc] = useState('');
  /** KPI dialog: `process` = Process, `upstream` = Input/Upstream (matches StepInput / DB). */
  const [varKpiType, setVarKpiType] = useState<'process' | 'upstream'>('process');

  const filteredPhases = useMemo(() => {
    if (!hideStandardPhases) return phases || [];
    return (phases || []).filter((p) => !p.isStandard);
  }, [phases, hideStandardPhases]);

  const rows = useMemo(() => {
    const out: ProcessMapKpiRow[] = [];
    for (const phase of filteredPhases) {
      for (const op of phase.operations || []) {
        for (const step of op.steps || []) {
          out.push({ phase, operationName: op.name, step });
        }
      }
    }
    return out;
  }, [filteredPhases]);

  useEffect(() => {
    if (!dialog) return;
    if (dialog.kind === 'output_add') {
      setOutName('');
      setOutDesc('');
      setOutType('none');
      return;
    }
    if (dialog.kind === 'output_edit') {
      setOutName(dialog.output.name);
      setOutDesc(dialog.output.description ?? '');
      setOutType(dialog.output.type ?? 'none');
      return;
    }
    if (dialog.kind === 'variable_add') {
      setVarName('');
      setVarDesc('');
      setVarKpiType('process');
      return;
    }
    if (dialog.kind === 'variable_edit') {
      setVarName(dialog.variable.name);
      setVarDesc(dialog.variable.description ?? '');
      setVarKpiType(dialog.variable.type === 'upstream' ? 'upstream' : 'process');
    }
  }, [dialog]);

  const runRefresh = async () => {
    try {
      await onDataChanged();
    } catch (e) {
      console.error(e);
      toast.error('Failed to refresh');
    }
  };

  const saveOutputDialog = async () => {
    if (!dialog || dialog.kind !== 'output_add' && dialog.kind !== 'output_edit') return;
    const name = outName.trim();
    if (!name) {
      toast.error('Name is required');
      return;
    }
    setPending(true);
    try {
      const { data: row, error: fetchErr } = await supabase
        .from('operation_steps')
        .select('outputs')
        .eq('id', dialog.stepId)
        .single();
      if (fetchErr) throw fetchErr;

      const current = normalizeOutputs(row?.outputs);
      let next: Output[];

      if (dialog.kind === 'output_add') {
        const id = `output-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        next = [
          ...current,
          {
            id,
            name,
            description: outDesc.trim(),
            type: outType,
          },
        ];
      } else {
        next = current.map((o) =>
          o.id === dialog.output.id
            ? { ...o, name, description: outDesc.trim(), type: outType }
            : o
        );
      }

      const { error: upErr } = await supabase
        .from('operation_steps')
        .update({
          outputs: next,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dialog.stepId);
      if (upErr) throw upErr;

      toast.success(dialog.kind === 'output_add' ? 'Output added' : 'Output updated');
      setDialog(null);
      await runRefresh();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save output');
    } finally {
      setPending(false);
    }
  };

  const saveVariableDialog = async () => {
    if (!dialog || (dialog.kind !== 'variable_add' && dialog.kind !== 'variable_edit')) return;
    const name = varName.trim();
    if (!name) {
      toast.error('Name is required');
      return;
    }
    setPending(true);
    try {
      const { data: row, error: fetchErr } = await supabase
        .from('operation_steps')
        .select('process_variables')
        .eq('id', dialog.stepId)
        .single();
      if (fetchErr) throw fetchErr;

      const current = parseProcessVariablesFromDb(row?.process_variables);
      let next: StepInput[];

      if (dialog.kind === 'variable_add') {
        const id = `input-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        next = [
          ...current,
          {
            id,
            name,
            type: varKpiType,
            description: varDesc.trim() || undefined,
            required: false,
          },
        ];
      } else {
        next = current.map((v) =>
          v.id === dialog.variable.id
            ? {
                ...v,
                name,
                type: varKpiType,
                description: varDesc.trim() || undefined,
              }
            : v
        );
      }

      const { error: upErr } = await supabase
        .from('operation_steps')
        .update({
          process_variables: serializeProcessVariablesForDb(next),
          updated_at: new Date().toISOString(),
        })
        .eq('id', dialog.stepId);
      if (upErr) throw upErr;

      toast.success(dialog.kind === 'variable_add' ? 'Process variable added' : 'Process variable updated');
      setDialog(null);
      await runRefresh();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save process variable');
    } finally {
      setPending(false);
    }
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setPending(true);
    try {
      if (deleteTarget.kind === 'output') {
        const { data: row, error: fetchErr } = await supabase
          .from('operation_steps')
          .select('outputs')
          .eq('id', deleteTarget.stepId)
          .single();
        if (fetchErr) throw fetchErr;
        const current = normalizeOutputs(row?.outputs);
        const next = current.filter((o) => o.id !== deleteTarget.outputId);
        const { error: upErr } = await supabase
          .from('operation_steps')
          .update({ outputs: next, updated_at: new Date().toISOString() })
          .eq('id', deleteTarget.stepId);
        if (upErr) throw upErr;
        toast.success('Output removed');
      } else {
        const { data: row, error: fetchErr } = await supabase
          .from('operation_steps')
          .select('process_variables')
          .eq('id', deleteTarget.stepId)
          .single();
        if (fetchErr) throw fetchErr;
        const current = parseProcessVariablesFromDb(row?.process_variables);
        const next = current.filter((v) => v.id !== deleteTarget.variableId);
        const { error: upErr } = await supabase
          .from('operation_steps')
          .update({
            process_variables: serializeProcessVariablesForDb(next),
            updated_at: new Date().toISOString(),
          })
          .eq('id', deleteTarget.stepId);
        if (upErr) throw upErr;
        toast.success('Process variable removed');
      }
      setDeleteTarget(null);
      await runRefresh();
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete');
    } finally {
      setPending(false);
    }
  };

  const kpiThClass =
    'sticky top-0 z-20 bg-sky-600 px-2 py-2 text-left text-xs font-medium text-white border-b border-sky-700/60 shadow-[0_1px_0_0_rgba(0,0,0,0.08)] [&:not(:last-child)]:border-r [&:not(:last-child)]:border-white/25';

  const startKpiResize = (colKey: KpiColKey, e: React.PointerEvent) => {
    if (!e.isPrimary) return;
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    const startX = e.clientX;
    const initialWidth = kpiColWidths[colKey];
    const onMove = (ev: PointerEvent) => {
      const next = Math.max(56, initialWidth + (ev.clientX - startX));
      setKpiColWidths((prev) => ({ ...prev, [colKey]: next }));
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      try {
        el.releasePointerCapture(ev.pointerId);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const kpiResizeHandle = (colKey: KpiColKey) => (
    <span
      role="separator"
      aria-orientation="vertical"
      onPointerDown={(e) => startKpiResize(colKey, e)}
      className="pointer-events-auto absolute right-0 top-0 z-50 flex h-full w-4 cursor-col-resize touch-none select-none items-stretch justify-end hover:bg-white/25"
      title="Drag to resize column"
    >
      <span className="h-full w-1.5 shrink-0 cursor-col-resize hover:bg-white/40" aria-hidden />
    </span>
  );

  const kpiHeaderLabel = (label: string) => (
    <span className="pointer-events-none block min-w-0 truncate pr-3 text-left">{label}</span>
  );

  const kpiTableMinWidthPx =
    kpiColWidths.phase +
    kpiColWidths.operation +
    kpiColWidths.step +
    kpiColWidths.kpo +
    kpiColWidths.kpi;

  const kpiColStyle = (key: KpiColKey): React.CSSProperties => ({
    width: `${kpiColWidths[key]}px`,
    minWidth: `${kpiColWidths[key]}px`,
  });

  const kpiAddIconBtnClass =
    'inline-flex shrink-0 rounded-sm p-0 text-muted-foreground shadow-none transition-none hover:font-semibold hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

  if (rows.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="hide-standard-phases-kpi"
              checked={hideStandardPhases}
              onCheckedChange={(v) => setHideStandardPhases(v === true)}
            />
            <Label htmlFor="hide-standard-phases-kpi" className="text-sm font-normal cursor-pointer">
              Hide Standard Phases
            </Label>
          </div>
        </div>
        <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-md">
          {hideStandardPhases
            ? 'No custom phases with steps to show. Uncheck Hide Standard Phases or add phases in the Structure tab.'
            : 'No steps in this workflow yet. Add phases and steps in the Structure tab.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="hide-standard-phases-kpi"
            checked={hideStandardPhases}
            onCheckedChange={(v) => setHideStandardPhases(v === true)}
          />
          <Label htmlFor="hide-standard-phases-kpi" className="text-sm font-normal cursor-pointer">
            Hide Standard Phases
          </Label>
        </div>
      </div>

      <div className="relative max-h-[min(70vh,640px)] w-full overflow-auto rounded-md border">
        <table
          className="table-fixed w-full min-w-0 border-separate border-spacing-0 caption-bottom text-sm"
          style={{ minWidth: `${kpiTableMinWidthPx}px` }}
        >
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="border-0 border-b border-sky-700/60 bg-sky-600 hover:bg-sky-600">
              <TableHead
                className={cn(kpiThClass, 'relative overflow-hidden')}
                style={kpiColStyle('phase')}
              >
                {kpiHeaderLabel('Phase')}
                {kpiResizeHandle('phase')}
              </TableHead>
              <TableHead
                className={cn(kpiThClass, 'relative overflow-hidden')}
                style={kpiColStyle('operation')}
              >
                {kpiHeaderLabel('Operation')}
                {kpiResizeHandle('operation')}
              </TableHead>
              <TableHead className={cn(kpiThClass, 'relative overflow-hidden')} style={kpiColStyle('step')}>
                {kpiHeaderLabel('Step')}
                {kpiResizeHandle('step')}
              </TableHead>
              <TableHead className={cn(kpiThClass, 'relative overflow-hidden')} style={kpiColStyle('kpo')}>
                {kpiHeaderLabel('Outputs (KPO)')}
                {kpiResizeHandle('kpo')}
              </TableHead>
              <TableHead className={cn(kpiThClass, 'relative overflow-hidden')} style={kpiColStyle('kpi')}>
                {kpiHeaderLabel('Process variables (KPI)')}
                {kpiResizeHandle('kpi')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ phase, operationName, step }) => {
              const outputs = normalizeOutputs(step.outputs);
              const inputs = step.inputs || [];
              const canEdit = canMutateStep(phase, step, isEditingStandardProject);

              return (
                <TableRow key={step.id} className="h-px text-xs align-top">
                  <TableCell
                    className="h-full p-2 whitespace-nowrap align-top"
                    style={kpiColStyle('phase')}
                  >
                    {phase.name}
                  </TableCell>
                  <TableCell
                    className="h-full p-2 whitespace-nowrap align-top"
                    style={kpiColStyle('operation')}
                  >
                    {operationName}
                  </TableCell>
                  <TableCell className="h-full p-2 align-top font-medium" style={kpiColStyle('step')}>
                    {step.step}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'relative h-full border-r border-border/50 p-2 align-top',
                      canEdit && 'pb-10'
                    )}
                    style={kpiColStyle('kpo')}
                  >
                    <div className="min-w-0 space-y-1">
                      {outputs.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <ul className="list-none space-y-1 pl-0">
                          {outputs.map((o) => (
                            <li
                              key={o.id}
                              className="flex items-start gap-0.5 border-b border-border/40 pb-1 last:border-b-0 last:pb-0"
                            >
                              <span className="min-w-0 flex-1 leading-snug">{formatOutputLine(o)}</span>
                              {canEdit ? (
                                <span className="flex shrink-0 items-center gap-0">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    title="Edit output"
                                    onClick={() => setDialog({ kind: 'output_edit', stepId: step.id, output: o })}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    title="Delete output"
                                    onClick={() =>
                                      setDeleteTarget({
                                        kind: 'output',
                                        stepId: step.id,
                                        outputId: o.id,
                                        label: o.name,
                                      })
                                    }
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {canEdit ? (
                      <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex justify-center">
                        <button
                          type="button"
                          className={cn(kpiAddIconBtnClass, 'pointer-events-auto')}
                          title="Add output (KPO)"
                          aria-label="Add output (KPO)"
                          onClick={() => setDialog({ kind: 'output_add', stepId: step.id })}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell
                    className={cn('relative h-full p-2 align-top', canEdit && 'pb-10')}
                    style={kpiColStyle('kpi')}
                  >
                    <div className="min-w-0 space-y-1">
                      {inputs.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <ul className="list-none space-y-1 pl-0">
                          {inputs.map((v) => (
                            <li
                              key={v.id}
                              className="flex items-start gap-0.5 border-b border-border/40 pb-1 last:border-b-0 last:pb-0"
                            >
                              <span className="min-w-0 flex-1 leading-snug">
                                <span>{formatProcessVariableLine(v)}</span>
                                {v.description ? (
                                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                                    {v.description}
                                  </span>
                                ) : null}
                              </span>
                              {canEdit ? (
                                <span className="flex shrink-0 items-center gap-0">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    title="Edit process variable"
                                    onClick={() =>
                                      setDialog({ kind: 'variable_edit', stepId: step.id, variable: v })
                                    }
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    title="Delete process variable"
                                    onClick={() =>
                                      setDeleteTarget({
                                        kind: 'variable',
                                        stepId: step.id,
                                        variableId: v.id,
                                        label: v.name,
                                      })
                                    }
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {canEdit ? (
                      <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex justify-center">
                        <button
                          type="button"
                          className={cn(kpiAddIconBtnClass, 'pointer-events-auto')}
                          title="Add process variable (KPI)"
                          aria-label="Add process variable (KPI)"
                          onClick={() => setDialog({ kind: 'variable_add', stepId: step.id })}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </table>
      </div>

      <Dialog
        open={dialog !== null}
        onOpenChange={(o) => {
          if (!o) setDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          {dialog?.kind === 'output_add' || dialog?.kind === 'output_edit' ? (
            <>
              <DialogHeader>
                <DialogTitle>{dialog.kind === 'output_add' ? 'Add output (KPO)' : 'Edit output (KPO)'}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-1">
                <div className="grid gap-1.5">
                  <Label htmlFor="kpo-name">Name</Label>
                  <Input
                    id="kpo-name"
                    value={outName}
                    onChange={(e) => setOutName(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="kpo-type">Type</Label>
                  <Select value={outType} onValueChange={(v) => setOutType(v as Output['type'])}>
                    <SelectTrigger id="kpo-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OUTPUT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.replace(/-/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="kpo-desc">Description</Label>
                  <Textarea
                    id="kpo-desc"
                    value={outDesc}
                    onChange={(e) => setOutDesc(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialog(null)} disabled={pending}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => void saveOutputDialog()} disabled={pending}>
                  {pending ? 'Saving…' : 'Save'}
                </Button>
              </DialogFooter>
            </>
          ) : dialog?.kind === 'variable_add' || dialog?.kind === 'variable_edit' ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {dialog.kind === 'variable_add' ? 'Add process variable (KPI)' : 'Edit process variable (KPI)'}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-1">
                <div className="grid gap-1.5">
                  <Label htmlFor="kpi-name">Name</Label>
                  <Input
                    id="kpi-name"
                    value={varName}
                    onChange={(e) => setVarName(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="kpi-type">Type</Label>
                  <Select
                    value={varKpiType}
                    onValueChange={(v) => setVarKpiType(v as 'process' | 'upstream')}
                  >
                    <SelectTrigger id="kpi-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="process">Process</SelectItem>
                      <SelectItem value="upstream">Input/Upstream</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="kpi-desc">Description</Label>
                  <Textarea
                    id="kpi-desc"
                    value={varDesc}
                    onChange={(e) => setVarDesc(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialog(null)} disabled={pending}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => void saveVariableDialog()} disabled={pending}>
                  {pending ? 'Saving…' : 'Save'}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && !pending && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this {deleteTarget?.kind === 'output' ? 'output' : 'process variable'}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `"${deleteTarget.label}" will be removed from this step.` : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                void executeDelete();
              }}
            >
              {pending ? 'Removing…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
