import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Pencil } from 'lucide-react';
import { addDays, format, getDaysInMonth, isBefore, startOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface MaintenanceTaskForCalendar {
  id: string;
  user_id: string;
  home_id: string;
  title: string;
  frequency_days: number;
  next_due: string;
  recurrence_start_date?: string | null;
}

interface MaintenanceCalendarWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: MaintenanceTaskForCalendar[];
  onOpenEditTask: (taskId: string) => void;
  onTasksUpdated: () => void;
}

function toDateOnlyISO(d: Date): string {
  // YYYY-MM-DD (no timezone ambiguity for DATE columns)
  return format(d, 'yyyy-MM-dd');
}

function firstOccurrenceOnOrAfter(anchor: Date, frequencyDays: number, target: Date): Date {
  if (frequencyDays <= 0) return anchor;
  let d = anchor;
  const t = startOfDay(target);
  while (isBefore(d, t)) {
    d = addDays(d, frequencyDays);
  }
  return d;
}

function occurrencesInMonth(task: MaintenanceTaskForCalendar, year: number, monthIndex: number): { due: Date; task: MaintenanceTaskForCalendar }[] {
  const monthStart = startOfDay(new Date(year, monthIndex, 1));
  const monthEndExclusive = startOfDay(new Date(year, monthIndex + 1, 1));

  const anchorStr = task.recurrence_start_date ?? task.next_due;
  if (!anchorStr) return [];

  const anchor = startOfDay(new Date(anchorStr));

  // Monthly-style recurrence: show the task in every month on the chosen day-of-month.
  // This avoids drift from "every N days" and matches user expectation for monthly maintenance.
  if (task.frequency_days > 0 && task.frequency_days <= 31) {
    const desiredDay = anchor.getDate();
    const daysInThisMonth = getDaysInMonth(monthStart);
    const clampedDay = Math.min(desiredDay, daysInThisMonth);
    const due = startOfDay(new Date(year, monthIndex, clampedDay));
    return [{ due, task }];
  }

  const first = firstOccurrenceOnOrAfter(anchor, task.frequency_days, monthStart);

  const out: { due: Date; task: MaintenanceTaskForCalendar }[] = [];
  let d = first;
  while (isBefore(d, monthEndExclusive)) {
    out.push({ due: d, task });
    d = addDays(d, task.frequency_days);
  }
  return out;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export function MaintenanceCalendarWindow({
  open,
  onOpenChange,
  tasks,
  onOpenEditTask,
  onTasksUpdated,
}: MaintenanceCalendarWindowProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [year] = useState(() => new Date().getFullYear());
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [monthValue, setMonthValue] = useState<string>('');
  const [dayValue, setDayValue] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const taskById = useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks]);

  const yearBuckets = useMemo(() => {
    const buckets: { monthIndex: number; items: { due: Date; task: MaintenanceTaskForCalendar }[] }[] = [];
    for (let m = 0; m < 12; m++) {
      const all = tasks.flatMap(t => occurrencesInMonth(t, year, m));
      // For a month view, duplicates can happen when freq<=31. Keep all occurrences, but display one row per task (earliest due in month).
      const earliestByTask = new Map<string, { due: Date; task: MaintenanceTaskForCalendar }>();
      for (const item of all) {
        const existing = earliestByTask.get(item.task.id);
        if (!existing || isBefore(item.due, existing.due)) earliestByTask.set(item.task.id, item);
      }
      const items = Array.from(earliestByTask.values()).sort((a, b) => a.due.getTime() - b.due.getTime());
      buckets.push({ monthIndex: m, items });
    }
    return buckets;
  }, [tasks, year]);

  const openRecurrenceEditor = (taskId: string) => {
    const t = taskById.get(taskId);
    if (!t) return;
    setEditingTaskId(taskId);

    const baseStr = t.recurrence_start_date ?? t.next_due;
    const base = baseStr ? new Date(baseStr) : new Date();
    setMonthValue(String(base.getMonth() + 1));
    setDayValue(String(base.getDate()));
  };

  const closeRecurrenceEditor = () => {
    setEditingTaskId(null);
    setMonthValue('');
    setDayValue('');
  };

  const saveRecurrenceStart = async () => {
    if (!user || !editingTaskId) return;
    const task = taskById.get(editingTaskId);
    if (!task) return;
    const m = parseInt(monthValue, 10);
    const d = parseInt(dayValue, 10);
    if (!Number.isInteger(m) || !Number.isInteger(d)) return;

    setSaving(true);
    try {
      // Build an explicit anchor date in the selected year (or next year if already in the past)
      const now = startOfDay(new Date());
      let anchor = startOfDay(new Date(now.getFullYear(), m - 1, d));
      if (isBefore(anchor, now)) {
        anchor = startOfDay(new Date(now.getFullYear() + 1, m - 1, d));
      }

      const nextDue = firstOccurrenceOnOrAfter(anchor, task.frequency_days, now);

      const { error } = await supabase
        .from('user_maintenance_tasks')
        .update({
          recurrence_start_date: toDateOnlyISO(anchor),
          next_due: nextDue.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({ title: 'Saved', description: 'Recurrence start date updated.' });
      closeRecurrenceEditor();
      onTasksUpdated();
    } catch (e) {
      console.error('Error saving recurrence start date:', e);
      toast({ title: 'Error', description: 'Failed to save recurrence start date', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const editingTask = editingTaskId ? taskById.get(editingTaskId) : null;
  const disableMonth = !!editingTask && editingTask.frequency_days <= 31;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[96vw] !max-w-[96vw] h-[88vh] max-h-[88vh] overflow-hidden flex flex-col p-0 sm:w-[90vw] sm:!max-w-[90vw] sm:h-[80vh] sm:max-h-[80vh]">
          <DialogHeader className="px-4 md:px-6 py-4 border-b">
            <DialogTitle className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 min-w-0">
                <CalendarDays className="h-5 w-5 text-primary shrink-0" />
                <span className="truncate">Maintenance Calendar</span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-auto p-3 md:p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {yearBuckets.map(({ monthIndex, items }) => (
                <div key={monthIndex} className="border rounded-lg bg-card overflow-hidden flex flex-col min-h-[10rem]">
                  <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between">
                    <div className="font-semibold text-sm">{MONTHS[monthIndex]}</div>
                    <div className="text-xs text-muted-foreground">{year}</div>
                  </div>
                  <div className="p-2 flex-1 min-h-0 overflow-auto space-y-1">
                    {items.length === 0 ? (
                      <div className="text-xs text-muted-foreground">No tasks due</div>
                    ) : (
                      items.map(({ due, task }) => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => openRecurrenceEditor(task.id)}
                          className="w-full text-left text-xs px-2 py-1 rounded-md hover:bg-accent/40 transition-colors flex items-center justify-between gap-2"
                          title={`Due ${format(due, 'MMM d')}`}
                        >
                          <span className="truncate">
                            {task.title}
                          </span>
                          <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                            {format(due, 'MMM d')}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTaskId} onOpenChange={(o) => !o && closeRecurrenceEditor()}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3">
              <span className="truncate">{editingTask?.title ?? 'Edit recurrence'}</span>
              {editingTask ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => {
                    onOpenEditTask(editingTask.id);
                    closeRecurrenceEditor();
                  }}
                  title="Edit task details"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : null}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className={disableMonth ? 'opacity-60' : ''}>
                <div className="text-xs font-medium mb-1">Month</div>
                <Select value={monthValue} onValueChange={setMonthValue} disabled={disableMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, idx) => (
                      <SelectItem key={m} value={String(idx + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="text-xs font-medium mb-1">Day</div>
                <Select value={dayValue} onValueChange={setDayValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeRecurrenceEditor} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" onClick={saveRecurrenceStart} disabled={saving || !editingTaskId}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

