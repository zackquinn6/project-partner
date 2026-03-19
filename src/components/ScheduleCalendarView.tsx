import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScheduledTask, Task, Worker } from '@/interfaces/Scheduling';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';

interface ScheduleCalendarViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduledTasks: ScheduledTask[];
  tasks: Task[];
  workers: Worker[];
}

export function ScheduleCalendarView({
  open,
  onOpenChange,
  scheduledTasks,
  tasks,
  workers
}: ScheduleCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Group tasks by date
  const getTasksForDate = (date: Date) => {
    return scheduledTasks.filter(st => {
      const startDate = new Date(st.startTime);
      return isSameDay(startDate, date);
    });
  };

  // Get task details
  const getTaskDetails = (taskId: string) => {
    return tasks.find(t => t.id === taskId);
  };

  const getWorkerName = (workerId: string) => {
    return workers.find(w => w.id === workerId)?.name || 'Unknown';
  };

  // Get days in current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Calculate target completion date and latest date from scheduled tasks
  const getTargetAndLatestDates = () => {
    if (scheduledTasks.length === 0) {
      return { targetCompletionDate: null, latestDate: null };
    }
    
    // Find the latest task's target and latest completion dates
    const latestTask = scheduledTasks.reduce((latest, task) => {
      const taskTargetDate = new Date(task.targetCompletionDate);
      const latestTargetDate = new Date(latest.targetCompletionDate);
      return taskTargetDate > latestTargetDate ? task : latest;
    });
    
    return {
      targetCompletionDate: new Date(latestTask.targetCompletionDate),
      latestDate: new Date(latestTask.latestCompletionDate)
    };
  };

  const { targetCompletionDate, latestDate } = getTargetAndLatestDates();

  const formatTaskHours = (start: Date, end: Date) =>
    ((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          flex flex-col gap-0 overflow-hidden p-0
          h-[min(92dvh,920px)] max-h-[92dvh] w-[calc(100vw-1.25rem)] max-w-[calc(100vw-1.25rem)]
          rounded-2xl border shadow-xl
          sm:h-[90vh] sm:max-h-[90vh] sm:w-[min(calc(100vw-2rem),1600px)] sm:max-w-[min(calc(100vw-2rem),1600px)]
          md:max-w-none md:w-[min(calc(100vw-2rem),1920px)]
          lg:w-[min(calc(100vw-3rem),1920px)]
          [&>button]:hidden
        "
      >
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <DialogHeader className="shrink-0 space-y-0 border-b bg-muted/20 px-4 py-4 sm:px-5 md:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <DialogTitle className="text-left text-base sm:text-lg pr-2">
              Project Schedule Calendar
            </DialogTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border bg-background p-0.5">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handlePrevMonth} aria-label="Previous month">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[8.5rem] text-center tabular-nums px-1">
                  {format(currentMonth, 'MMMM yyyy')}
                </span>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleNextMonth} aria-label="Next month">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
          
          {/* Target completion date and Latest date */}
          {(targetCompletionDate || latestDate) && (
            <div className="flex flex-col gap-2 text-xs sm:text-sm pt-3 mt-3 border-t border-border/60 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-1">
              {targetCompletionDate && (
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium text-muted-foreground">Target completion:</span>
                  <span className="font-semibold tabular-nums">{format(targetCompletionDate, 'MMM dd, yyyy')}</span>
                </div>
              )}
              {latestDate && (
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium text-muted-foreground">Latest date:</span>
                  <span className="font-semibold tabular-nums">{format(latestDate, 'MMM dd, yyyy')}</span>
                </div>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto px-3 pb-4 pt-3 sm:px-4 md:px-6">
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 min-w-[280px]">
          {/* Weekday headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-[10px] font-medium text-muted-foreground p-1 sm:text-xs sm:p-2">
              <span className="sm:hidden">{day.slice(0, 1)}</span>
              <span className="hidden sm:inline">{day}</span>
            </div>
          ))}

          {/* Calendar days */}
          {daysInMonth.map((day) => {
            const tasksForDay = getTasksForDate(day);
            const isToday = isSameDay(day, new Date());
            const hasScheduledWork = tasksForDay.length > 0;

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[72px] sm:min-h-[100px] border rounded-md sm:rounded-lg p-1 sm:p-2 ${
                  isToday ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border'
                } ${hasScheduledWork ? 'bg-accent/25' : ''}`}
              >
                <div className={`text-[10px] sm:text-xs font-semibold mb-0.5 sm:mb-1 tabular-nums ${isToday ? 'text-primary' : 'text-foreground'}`}>
                  {format(day, 'd')}
                </div>

                <div className="space-y-0.5 sm:space-y-1">
                  {tasksForDay.map(scheduledTask => {
                    const task = getTaskDetails(scheduledTask.taskId);
                    const workerName = getWorkerName(scheduledTask.workerId);
                    const st = new Date(scheduledTask.startTime);
                    const en = new Date(scheduledTask.endTime);

                    return (
                      <div
                        key={`${scheduledTask.taskId}-${scheduledTask.startTime}`}
                        className="text-[9px] sm:text-[10px] leading-tight p-1 rounded-md bg-primary/15 border border-primary/30"
                      >
                        <div className="font-medium line-clamp-2" title={task?.title || scheduledTask.taskId}>
                          {task?.title || scheduledTask.taskId}
                        </div>
                        <div className="text-muted-foreground tabular-nums">
                          {format(st, 'HH:mm')}–{format(en, 'HH:mm')} · {formatTaskHours(st, en)}h
                        </div>
                        <div className="text-muted-foreground truncate">
                          {workerName}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground px-1">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 border-2 border-primary bg-primary/5 rounded" />
            <span>Today</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 border border-border bg-accent/30 rounded" />
            <span>Scheduled work</span>
          </div>
        </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

