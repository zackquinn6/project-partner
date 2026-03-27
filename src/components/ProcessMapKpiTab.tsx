import React, { useMemo } from 'react';
import type { Phase, WorkflowStep, Output, StepInput } from '@/interfaces/Project';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
export interface ProcessMapKpiRow {
  phaseName: string;
  operationName: string;
  step: WorkflowStep;
}

function normalizeOutputs(raw: unknown): Output[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((o): o is Output => !!o && typeof o === 'object' && typeof (o as Output).name === 'string');
}

function formatOutputLine(o: Output): string {
  const typePart = o.type && o.type !== 'none' ? ` (${o.type.replace(/-/g, ' ')})` : '';
  return `${o.name}${typePart}`;
}

function formatProcessVariableLine(v: StepInput): string {
  const parts = [v.name];
  if (v.type === 'upstream') parts.push('upstream');
  if (v.unit) parts.push(v.unit);
  if (v.required) parts.push('required');
  return parts.join(' · ');
}

export function ProcessMapKpiTab({ phases }: { phases: Phase[] }) {
  const rows = useMemo(() => {
    const out: ProcessMapKpiRow[] = [];
    for (const phase of phases || []) {
      for (const op of phase.operations || []) {
        for (const step of op.steps || []) {
          out.push({
            phaseName: phase.name,
            operationName: op.name,
            step,
          });
        }
      }
    }
    return out;
  }, [phases]);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-md">
        No steps in this workflow yet. Add phases and steps in the Structure tab.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground max-w-3xl">
        Key process outputs and variables per step, using the same step data as the workflow editor (outputs and process
        variables from the database).
      </p>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-xs min-w-[160px] whitespace-nowrap">Phase</TableHead>
              <TableHead className="text-xs min-w-[160px] whitespace-nowrap">Operation</TableHead>
              <TableHead className="text-xs min-w-[180px]">Step</TableHead>
              <TableHead className="text-xs min-w-[220px]">Outputs (KPO)</TableHead>
              <TableHead className="text-xs min-w-[260px]">Process variables (KPI)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ phaseName, operationName, step }) => {
              const outputs = normalizeOutputs(step.outputs);
              const inputs = step.inputs || [];
              return (
                <TableRow key={step.id} className="text-xs align-top">
                  <TableCell className="whitespace-nowrap">{phaseName}</TableCell>
                  <TableCell className="whitespace-nowrap">{operationName}</TableCell>
                  <TableCell className="font-medium">{step.step}</TableCell>
                  <TableCell>
                    {outputs.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <ul className="list-disc pl-4 space-y-1">
                        {outputs.map((o) => (
                          <li key={o.id}>{formatOutputLine(o)}</li>
                        ))}
                      </ul>
                    )}
                  </TableCell>
                  <TableCell>
                    {inputs.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <ul className="list-disc pl-4 space-y-1.5">
                        {inputs.map((v) => (
                          <li key={v.id} className="leading-snug">
                            <span>{formatProcessVariableLine(v)}</span>
                            {v.description ? (
                              <span className="block text-[10px] text-muted-foreground mt-0.5">{v.description}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
