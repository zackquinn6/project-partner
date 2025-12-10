import { Calendar } from '@/components/ui/calendar';
import { ScheduledTask, Task, Worker } from '@/interfaces/Scheduling';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';

interface ScheduleCalendarContentProps {
  scheduledTasks: ScheduledTask[];
  tasks: Task[];
  workers: Worker[];
}

export function ScheduleCalendarContent({
  scheduledTasks,
  tasks,
  workers
}: ScheduleCalendarContentProps) {
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

  return (
    <div className="h-full flex flex-col">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-base font-semibold min-w-[150px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <Button variant="outline" size="sm" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Target completion date and Latest date */}
      {(targetCompletionDate || latestDate) && (
        <div className="flex items-center gap-6 text-sm mb-4 pb-4 border-b">
          {targetCompletionDate && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-muted-foreground">Target completion date:</span>
              <span className="font-semibold">{format(targetCompletionDate, 'MMM dd, yyyy')}</span>
            </div>
          )}
          {latestDate && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-muted-foreground">Latest date:</span>
              <span className="font-semibold">{format(latestDate, 'MMM dd, yyyy')}</span>
            </div>
          )}
        </div>
      )}

      {/* Calendar grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 gap-1">
          {/* Weekday headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2 sticky top-0 bg-background z-10">
              {day}
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
                className={`min-h-[100px] border rounded-lg p-2 ${
                  isToday ? 'border-primary bg-primary/5' : 'border-border'
                } ${hasScheduledWork ? 'bg-accent/30' : ''}`}
              >
                <div className={`text-xs font-medium mb-1 ${isToday ? 'text-primary' : 'text-foreground'}`}>
                  {format(day, 'd')}
                </div>
                
                {/* Display tasks for this day */}
                <div className="space-y-1">
                  {tasksForDay.map(scheduledTask => {
                    const task = getTaskDetails(scheduledTask.taskId);
                    const workerName = getWorkerName(scheduledTask.workerId);
                    
                    return (
                      <div
                        key={`${scheduledTask.taskId}-${scheduledTask.startTime}`}
                        className="text-[10px] p-1 rounded bg-primary/20 border border-primary/40"
                      >
                        <div className="font-medium truncate" title={task?.title || scheduledTask.taskId}>
                          {task?.title || scheduledTask.taskId}
                        </div>
                        <div className="text-muted-foreground truncate">
                          {format(new Date(scheduledTask.startTime), 'HH:mm')} - {format(new Date(scheduledTask.endTime), 'HH:mm')}
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
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary bg-primary/5 rounded"></div>
          <span>Today</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border border-border bg-accent/30 rounded"></div>
          <span>Scheduled Work</span>
        </div>
      </div>
    </div>
  );
}

