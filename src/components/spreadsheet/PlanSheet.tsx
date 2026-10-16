import React, { useCallback, useMemo } from 'react';
import type { Phase, WorkflowStep } from '@/interfaces/Project';
import { SpreadsheetGrid } from './SpreadsheetGrid';
import type { SpreadsheetColumn, SpreadsheetRow } from './spreadsheetTypes';

export interface PlanSheetProps {
  phases: Phase[];
  onPhasesChange: (phases: Phase[]) => void;
  /** When true, standard (non-linked) phase content may be edited. */
  allowStandardEdits?: boolean;
  exportBasename?: string;
}

function canMutatePhase(phase: Phase, allowStandardEdits: boolean): boolean {
  if (phase.isLinked) return false;
  if (phase.isStandard && !allowStandardEdits) return false;
  return true;
}

function mediumHours(step: WorkflowStep): string {
  const medium = step.timeEstimation?.variableTime?.medium;
  if (medium == null || !Number.isFinite(medium)) return '';
  return String(medium);
}

function workersValue(step: WorkflowStep): string {
  if (step.workersNeeded == null || !Number.isFinite(step.workersNeeded)) return '';
  return String(step.workersNeeded);
}

export const PlanSheet: React.FC<PlanSheetProps> = ({
  phases,
  onPhasesChange,
  allowStandardEdits = false,
  exportBasename = 'plan',
}) => {
  const columns = useMemo<SpreadsheetColumn[]>(
    () => [
      { id: 'phase', header: 'Phase', type: 'text', editable: false, width: 160 },
      { id: 'operation', header: 'Operation', type: 'text', editable: false, width: 160 },
      { id: 'step', header: 'Step', type: 'text', editable: true, width: 200 },
      { id: 'description', header: 'Description', type: 'text', editable: true, width: 260 },
      { id: 'hours', header: 'Hours (medium)', type: 'number', editable: true, width: 110 },
      { id: 'workers', header: 'Workers', type: 'number', editable: true, width: 90 },
    ],
    []
  );

  const rows = useMemo<SpreadsheetRow[]>(() => {
    const result: SpreadsheetRow[] = [];
    for (const phase of phases) {
      const mutable = canMutatePhase(phase, allowStandardEdits);
      for (const operation of phase.operations ?? []) {
        for (const step of operation.steps ?? []) {
          const stepMutable =
            mutable && !(step.isStandard === true && !allowStandardEdits);
          result.push({
            id: `${phase.id}::${operation.id}::${step.id}`,
            deletable: stepMutable,
            cellEditable: {
              phase: false,
              operation: false,
              step: stepMutable,
              description: stepMutable,
              hours: stepMutable,
              workers: stepMutable,
            },
            cells: {
              phase: phase.name,
              operation: operation.name,
              step: step.step,
              description: step.description ?? '',
              hours: mediumHours(step),
              workers: workersValue(step),
            },
          });
        }
      }
    }
    return result;
  }, [allowStandardEdits, phases]);

  const applyRows = useCallback(
    (nextRows: SpreadsheetRow[]) => {
      const byKey = new Map(nextRows.map((r) => [r.id, r]));
      const nextPhases = phases.map((phase) => {
        const mutable = canMutatePhase(phase, allowStandardEdits);
        if (!mutable) return phase;
        return {
          ...phase,
          operations: (phase.operations ?? []).map((operation) => ({
            ...operation,
            steps: (operation.steps ?? []).map((step) => {
              const key = `${phase.id}::${operation.id}::${step.id}`;
              const row = byKey.get(key);
              if (!row) return step;
              const stepMutable =
                mutable && !(step.isStandard === true && !allowStandardEdits);
              if (!stepMutable) return step;

              const hoursRaw = row.cells.hours?.trim() ?? '';
              const workersRaw = row.cells.workers?.trim() ?? '';
              const hoursParsed =
                hoursRaw === '' ? null : Number.parseFloat(hoursRaw);
              const workersParsed =
                workersRaw === '' ? null : Number.parseFloat(workersRaw);

              const nextStep: WorkflowStep = {
                ...step,
                step: row.cells.step ?? step.step,
                description: row.cells.description ?? step.description,
              };

              if (hoursParsed != null && Number.isFinite(hoursParsed)) {
                const prior = step.timeEstimation?.variableTime;
                if (prior) {
                  nextStep.timeEstimation = {
                    variableTime: {
                      low: prior.low,
                      medium: hoursParsed,
                      high: prior.high,
                    },
                  };
                } else {
                  nextStep.timeEstimation = {
                    variableTime: {
                      low: hoursParsed,
                      medium: hoursParsed,
                      high: hoursParsed,
                    },
                  };
                }
              } else if (hoursRaw === '') {
                nextStep.timeEstimation = undefined;
              }

              if (workersParsed != null && Number.isFinite(workersParsed)) {
                nextStep.workersNeeded = workersParsed;
              } else if (workersRaw === '') {
                nextStep.workersNeeded = undefined;
              }

              return nextStep;
            }),
          })),
        };
      });
      onPhasesChange(nextPhases);
    },
    [allowStandardEdits, onPhasesChange, phases]
  );

  const handleAddRow = () => {
    const mutablePhase = phases.find((p) => canMutatePhase(p, allowStandardEdits));
    if (!mutablePhase) return;
    const operation = mutablePhase.operations?.[0];
    if (!operation) return;

    const stepId = `step-${crypto.randomUUID()}`;
    const newStep: WorkflowStep = {
      id: stepId,
      step: 'New step',
      description: '',
      contentType: 'text',
      content: '',
      materials: [],
      tools: [],
      outputs: [],
    };

    onPhasesChange(
      phases.map((phase) => {
        if (phase.id !== mutablePhase.id) return phase;
        return {
          ...phase,
          operations: phase.operations.map((op) => {
            if (op.id !== operation.id) return op;
            return { ...op, steps: [...op.steps, newStep] };
          }),
        };
      })
    );
  };

  const handleDeleteRows = (rowIds: string[]) => {
    const idSet = new Set(rowIds);
    onPhasesChange(
      phases.map((phase) => {
        if (!canMutatePhase(phase, allowStandardEdits)) return phase;
        return {
          ...phase,
          operations: phase.operations.map((operation) => ({
            ...operation,
            steps: operation.steps.filter((step) => {
              const key = `${phase.id}::${operation.id}::${step.id}`;
              if (!idSet.has(key)) return true;
              if (step.isStandard === true && !allowStandardEdits) return true;
              return false;
            }),
          })),
        };
      })
    );
  };

  const canAdd = phases.some((p) => canMutatePhase(p, allowStandardEdits) && (p.operations?.length ?? 0) > 0);

  return (
    <SpreadsheetGrid
      columns={columns}
      rows={rows}
      onRowsChange={applyRows}
      onAddRow={canAdd ? handleAddRow : undefined}
      onDeleteRows={handleDeleteRows}
      exportBasename={exportBasename}
      allowAddRow={canAdd}
    />
  );
};
