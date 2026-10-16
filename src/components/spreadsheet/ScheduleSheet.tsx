import React, { useCallback, useMemo } from 'react';
import { format, parseISO, differenceInMinutes, addMinutes } from 'date-fns';
import type { Phase } from '@/interfaces/Project';
import type { SchedulingResult, Task, TaskStatus } from '@/interfaces/Scheduling';
import { SpreadsheetGrid } from './SpreadsheetGrid';
import type { SpreadsheetColumn, SpreadsheetRow } from './spreadsheetTypes';

interface TeamMember {
  id: string;
  name: string;
}

export interface ScheduleSheetProps {
  schedulingResult: SchedulingResult;
  schedulingTasks: Task[];
  teamMembers: TeamMember[];
  phases: Phase[];
  onChange: (next: {
    schedulingResult: SchedulingResult;
    schedulingTasks: Task[];
  }) => void;
  exportBasename?: string;
}

const STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'tentative', label: 'Tentative' },
  { value: 'conflict', label: 'Conflict' },
];

function toDateInput(value: Date): string {
  if (Number.isNaN(value.getTime())) return '';
  return format(value, 'yyyy-MM-dd');
}

function parseDateInput(value: string): Date | null {
  if (!value.trim()) return null;
  const parsed = parseISO(`${value.trim()}T09:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export const ScheduleSheet: React.FC<ScheduleSheetProps> = ({
  schedulingResult,
  schedulingTasks,
  teamMembers,
  phases,
  onChange,
  exportBasename = 'schedule',
}) => {
  const phaseOptions = useMemo(
    () =>
      phases.map((p) => ({
        value: p.id,
        label: p.name,
      })),
    [phases]
  );

  const assigneeOptions = useMemo(
    () =>
      teamMembers.map((m) => ({
        value: m.id,
        label: m.name,
      })),
    [teamMembers]
  );

  const columns = useMemo<SpreadsheetColumn[]>(
    () => [
      { id: 'title', header: 'Title', type: 'text', editable: true, width: 220 },
      {
        id: 'phaseId',
        header: 'Phase',
        type: 'select',
        editable: true,
        width: 160,
        options: phaseOptions,
      },
      { id: 'start', header: 'Start', type: 'date', editable: true, width: 120 },
      { id: 'end', header: 'End', type: 'date', editable: true, width: 120 },
      { id: 'hours', header: 'Hours', type: 'number', editable: true, width: 80 },
      {
        id: 'assignee',
        header: 'Assignee',
        type: 'select',
        editable: true,
        width: 140,
        options: assigneeOptions,
      },
      {
        id: 'status',
        header: 'Status',
        type: 'select',
        editable: true,
        width: 120,
        options: STATUS_OPTIONS,
      },
    ],
    [assigneeOptions, phaseOptions]
  );

  const taskById = useMemo(() => {
    const map = new Map<string, Task>();
    for (const t of schedulingTasks) map.set(t.id, t);
    return map;
  }, [schedulingTasks]);

  const rows = useMemo<SpreadsheetRow[]>(() => {
    return schedulingResult.scheduledTasks.map((st) => {
      const task = taskById.get(st.taskId);
      const hours =
        (st.endTime.getTime() - st.startTime.getTime()) / 3600000;
      return {
        id: st.taskId,
        deletable: true,
        cells: {
          title: task?.title ?? '',
          phaseId: task?.phaseId ?? '',
          start: toDateInput(st.startTime),
          end: toDateInput(st.endTime),
          hours: Number.isFinite(hours) ? String(Math.round(hours * 100) / 100) : '',
          assignee: st.workerId ?? '',
          status: st.status,
        },
      };
    });
  }, [schedulingResult.scheduledTasks, taskById]);

  const applyRows = useCallback(
    (nextRows: SpreadsheetRow[]) => {
      const nextTasks: Task[] = [];
      const nextScheduled: typeof schedulingResult.scheduledTasks = [];

      for (const row of nextRows) {
        const existingTask = taskById.get(row.id);
        const displayTitle = row.cells.title?.trim() ?? '';
        if (!displayTitle) {
          continue;
        }

        const start = parseDateInput(row.cells.start ?? '');
        const endFromCell = parseDateInput(row.cells.end ?? '');
        const hoursRaw = row.cells.hours?.trim() ?? '';
        const hoursParsed =
          hoursRaw === '' ? null : Number.parseFloat(hoursRaw);

        if (!start) {
          continue;
        }

        let end = endFromCell;
        if (
          hoursParsed != null &&
          Number.isFinite(hoursParsed) &&
          hoursParsed > 0
        ) {
          end = addMinutes(start, Math.round(hoursParsed * 60));
        } else if (!end) {
          continue;
        }

        if (end.getTime() <= start.getTime()) {
          continue;
        }

        const durationHours =
          differenceInMinutes(end, start) / 60;

        const status = (row.cells.status || 'confirmed') as TaskStatus;
        if (
          status !== 'confirmed' &&
          status !== 'tentative' &&
          status !== 'conflict'
        ) {
          continue;
        }

        const phaseId = row.cells.phaseId?.trim() || undefined;
        const task: Task = {
          id: row.id,
          title: displayTitle,
          estimatedHours: durationHours,
          minContiguousHours: existingTask?.minContiguousHours ?? Math.min(durationHours, 1),
          dependencies: existingTask?.dependencies ?? [],
          tags: existingTask?.tags ?? [],
          phaseId,
          operationId: existingTask?.operationId,
          materialLeadTimeDays: existingTask?.materialLeadTimeDays,
          confidence: existingTask?.confidence,
        };
        nextTasks.push(task);
        nextScheduled.push({
          taskId: row.id,
          workerId: row.cells.assignee ?? '',
          startTime: start,
          endTime: end,
          targetCompletionDate: existingTask
            ? schedulingResult.scheduledTasks.find((s) => s.taskId === row.id)
                ?.targetCompletionDate ?? end
            : end,
          latestCompletionDate: existingTask
            ? schedulingResult.scheduledTasks.find((s) => s.taskId === row.id)
                ?.latestCompletionDate ?? end
            : end,
          status,
          bufferApplied:
            schedulingResult.scheduledTasks.find((s) => s.taskId === row.id)
              ?.bufferApplied ?? 0,
          isManualEdit: true,
        });
      }

      const totalDuration = nextScheduled.reduce(
        (sum, st) =>
          sum + (st.endTime.getTime() - st.startTime.getTime()) / 3600000,
        0
      );

      onChange({
        schedulingTasks: nextTasks,
        schedulingResult: {
          ...schedulingResult,
          scheduledTasks: nextScheduled,
          totalDuration,
        },
      });
    },
    [onChange, schedulingResult, taskById]
  );

  const handleAddRow = () => {
    const id = `manual-${crypto.randomUUID()}`;
    const start = new Date();
    start.setHours(9, 0, 0, 0);
    const end = addMinutes(start, 60);
    const task: Task = {
      id,
      title: 'New task',
      estimatedHours: 1,
      minContiguousHours: 1,
      dependencies: [],
      tags: [],
    };
    onChange({
      schedulingTasks: [...schedulingTasks, task],
      schedulingResult: {
        ...schedulingResult,
        scheduledTasks: [
          ...schedulingResult.scheduledTasks,
          {
            taskId: id,
            workerId: teamMembers[0]?.id ?? '',
            startTime: start,
            endTime: end,
            targetCompletionDate: end,
            latestCompletionDate: end,
            status: 'confirmed',
            bufferApplied: 0,
            isManualEdit: true,
          },
        ],
        totalDuration: schedulingResult.totalDuration + 1,
      },
    });
  };

  const handleDeleteRows = (rowIds: string[]) => {
    const idSet = new Set(rowIds);
    onChange({
      schedulingTasks: schedulingTasks.filter((t) => !idSet.has(t.id)),
      schedulingResult: {
        ...schedulingResult,
        scheduledTasks: schedulingResult.scheduledTasks.filter(
          (st) => !idSet.has(st.taskId)
        ),
      },
    });
  };

  return (
    <SpreadsheetGrid
      columns={columns}
      rows={rows}
      onRowsChange={applyRows}
      onAddRow={handleAddRow}
      onDeleteRows={handleDeleteRows}
      exportBasename={exportBasename}
      allowAddRow
    />
  );
};
