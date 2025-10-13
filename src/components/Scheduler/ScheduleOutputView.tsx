import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Calendar, CheckCircle, AlertTriangle, Clock, Users, TrendingUp, Circle, CheckCircle2 } from 'lucide-react';
import { format, isSameDay, startOfDay, addDays, differenceInDays } from 'date-fns';
import { SchedulingResult, Task, PlanningMode } from '@/interfaces/Scheduling';

interface TeamMember {
  id: string;
  name: string;
}

interface ScheduleOutputViewProps {
  schedulingResult: SchedulingResult | null;
  planningMode: PlanningMode;
  schedulingTasks: Task[];
  teamMembers: TeamMember[];
}

export const ScheduleOutputView: React.FC<ScheduleOutputViewProps> = ({
  schedulingResult,
  planningMode,
  schedulingTasks,
  teamMembers
}) => {
  // Group tasks by day for Standard mode
  const tasksByDay = useMemo(() => {
    if (!schedulingResult) return {};
    const grouped: Record<string, typeof schedulingResult.scheduledTasks> = {};
    
    schedulingResult.scheduledTasks
      .filter(st => st.status === 'confirmed')
      .forEach(task => {
        const dateKey = format(startOfDay(task.startTime), 'yyyy-MM-dd');
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      });
    
    return grouped;
  }, [schedulingResult]);

  // Group tasks by phase for Quick mode
  const tasksByPhase = useMemo(() => {
    if (!schedulingResult) return {};
    const grouped: Record<string, typeof schedulingResult.scheduledTasks> = {};
    
    schedulingResult.scheduledTasks
      .filter(st => st.status === 'confirmed')
      .forEach(scheduledTask => {
        const task = schedulingTasks.find(t => t.id === scheduledTask.taskId);
        const phaseId = task?.phaseId || 'Other';
        
        if (!grouped[phaseId]) {
          grouped[phaseId] = [];
        }
        grouped[phaseId].push(scheduledTask);
      });
    
    return grouped;
  }, [schedulingResult, schedulingTasks]);

  // Empty state
  if (!schedulingResult) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Ready to Schedule?</h3>
              <p className="text-sm text-muted-foreground">
                Configure your project dates and preferences, then generate your personalized schedule
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const confirmedTasks = schedulingResult.scheduledTasks.filter(st => st.status === 'confirmed');
  const totalDuration = confirmedTasks.length > 0 
    ? differenceInDays(
        new Date(Math.max(...confirmedTasks.map(t => t.endTime.getTime()))),
        new Date(Math.min(...confirmedTasks.map(t => t.startTime.getTime())))
      )
    : 0;

  if (planningMode === 'quick') {
    // Quick Mode: Phase/Milestone Timeline with enhanced visuals
    const phaseCount = Object.keys(tasksByPhase).length;
    const completedPhases = 0; // Can track progress later
    
    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Duration</p>
                  <p className="text-2xl font-bold">{totalDuration}</p>
                  <p className="text-xs text-muted-foreground">days</p>
                </div>
                <Calendar className="w-8 h-8 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Phases</p>
                  <p className="text-2xl font-bold">{phaseCount}</p>
                  <p className="text-xs text-muted-foreground">milestones</p>
                </div>
                <TrendingUp className="w-8 h-8 text-secondary opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Team Size</p>
                  <p className="text-2xl font-bold">{teamMembers.length}</p>
                  <p className="text-xs text-muted-foreground">members</p>
                </div>
                <Users className="w-8 h-8 text-accent opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Total Tasks</p>
                  <p className="text-2xl font-bold">{confirmedTasks.length}</p>
                  <p className="text-xs text-muted-foreground">scheduled</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Phase Timeline */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Project Milestones</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {phaseCount} phases
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(tasksByPhase).map(([phaseId, tasks], index) => {
              const startDate = new Date(Math.min(...tasks.map(t => t.startTime.getTime())));
              const endDate = new Date(Math.max(...tasks.map(t => t.endTime.getTime())));
              const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
              
              return (
                <div 
                  key={phaseId} 
                  className="group relative flex items-start gap-4 p-4 rounded-lg border bg-card hover:shadow-md transition-all"
                >
                  {/* Timeline connector */}
                  {index < Object.keys(tasksByPhase).length - 1 && (
                    <div className="absolute left-[18px] top-16 w-0.5 h-8 bg-border" />
                  )}
                  
                  {/* Phase number */}
                  <div className="mt-0.5 rounded-full p-1 bg-primary/10 text-primary w-10 h-10 flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm leading-tight">Phase {index + 1}</h4>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {totalDays} days
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {format(startDate, 'MMM d')} → {format(endDate, 'MMM d, yyyy')}
                      </span>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">{tasks.length} tasks scheduled</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (planningMode === 'standard') {
    // Standard Mode: Daily Task Lists with enhanced UI
    const sortedDays = Object.keys(tasksByDay).sort();
    const today = new Date();
    
    return (
      <div className="space-y-6">
        {/* Week Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">{confirmedTasks.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Work Days</p>
                <p className="text-2xl font-bold">{sortedDays.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Avg Tasks/Day</p>
                <p className="text-2xl font-bold">
                  {sortedDays.length > 0 
                    ? Math.round(confirmedTasks.length / sortedDays.length)
                    : 0}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Team Members</p>
                <p className="text-2xl font-bold">{teamMembers.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daily Task Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {sortedDays.map((dateKey) => {
              const date = new Date(dateKey);
              const dayTasks = tasksByDay[dateKey];
              const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
              const isPast = date < today;
              const totalHours = dayTasks.reduce((sum, st) => {
                return sum + ((st.endTime.getTime() - st.startTime.getTime()) / (1000 * 60 * 60));
              }, 0);

              return (
                <div 
                  key={dateKey} 
                  className={`relative rounded-lg border-l-4 pl-4 pr-4 py-3 transition-all ${
                    isToday ? 'border-l-primary bg-primary/5 shadow-md' :
                    isPast ? 'border-l-muted bg-muted/20' :
                    'border-l-secondary bg-card'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${
                        isToday ? 'bg-primary text-primary-foreground' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {format(date, 'd')}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">
                          {format(date, 'EEEE, MMM d')}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {dayTasks.length} tasks · {Math.round(totalHours * 10) / 10}h total
                        </p>
                      </div>
                    </div>
                    {isToday && (
                      <Badge className="bg-primary text-primary-foreground">Today</Badge>
                    )}
                  </div>
                  
                  <Separator className="mb-3" />
                  
                  <div className="space-y-2">
                    {dayTasks
                      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
                      .map((scheduledTask) => {
                        const task = schedulingTasks.find(t => t.id === scheduledTask.taskId);
                        const worker = teamMembers.find(w => w.id === scheduledTask.workerId);
                        
                        return (
                          <div 
                            key={scheduledTask.taskId}
                            className="group flex items-start gap-3 p-3 rounded-md bg-background/50 hover:bg-background border hover:shadow-sm transition-all"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium leading-tight">{task?.title || 'Unknown Task'}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {worker?.name || 'Unknown'} • {format(scheduledTask.startTime, 'h:mm a')} - {format(scheduledTask.endTime, 'h:mm a')}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs shrink-0">
                              <Clock className="w-3 h-3 mr-1" />
                              {Math.round(((scheduledTask.endTime.getTime() - scheduledTask.startTime.getTime()) / (1000 * 60 * 60)) * 10) / 10}h
                            </Badge>
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}
            
            {sortedDays.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No daily tasks scheduled</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Detailed Mode: Hour-by-Hour Table with enhanced styling
  return (
    <div className="space-y-6">
      {/* Team Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Team Members</p>
                <p className="text-xl font-bold">{teamMembers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-secondary" />
              <div>
                <p className="text-xs text-muted-foreground">Tasks Scheduled</p>
                <p className="text-xl font-bold">{confirmedTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-accent" />
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-xl font-bold">{totalDuration} days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Detailed Schedule (Hour-by-Hour)
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Precise task assignments for each team member
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-2">
            <div className="inline-block min-w-full align-middle px-2">
              <table className="min-w-full divide-y divide-border">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Task
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Worker
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Start
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-green-700">
                      Target Complete
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700">
                      Latest Complete
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {schedulingResult.scheduledTasks
                    .filter(st => st.status === 'confirmed')
                    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
                    .map((scheduledTask) => {
                      const task = schedulingTasks.find(t => t.id === scheduledTask.taskId);
                      const worker = teamMembers.find(w => w.id === scheduledTask.workerId);
                      
                      return (
                        <tr key={scheduledTask.taskId} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-3">
                            <div className="font-medium text-sm">{task?.title || 'Unknown'}</div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                {worker?.name?.substring(0, 2).toUpperCase() || '?'}
                              </div>
                              <span className="text-sm">{worker?.name || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-xs">{format(scheduledTask.startTime, 'MMM dd, h:mm a')}</td>
                          <td className="px-3 py-3 text-xs text-green-700 font-medium">
                            {format(scheduledTask.targetCompletionDate, 'MMM dd, h:mm a')}
                          </td>
                          <td className="px-3 py-3 text-xs text-red-700 font-medium">
                            {format(scheduledTask.latestCompletionDate, 'MMM dd, h:mm a')}
                          </td>
                          <td className="px-3 py-3">
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              {scheduledTask.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
          
          {schedulingResult.scheduledTasks.some(st => st.status === 'conflict') && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {schedulingResult.scheduledTasks.filter(st => st.status === 'conflict').length} tasks could not be scheduled
              </AlertDescription>
            </Alert>
          )}

          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> Target dates are your goal completion times. 
              Latest dates represent absolute deadlines based on critical path analysis.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};