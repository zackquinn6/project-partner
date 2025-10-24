import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, AlertTriangle, CheckCircle2, Loader2, CalendarIcon, Save, Mail } from "lucide-react";
import { toast } from "sonner";
import { scheduleHomeTasksOptimized } from "@/utils/homeTaskScheduler";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface HomeTaskSchedulerProps {
  userId: string;
  homeId: string | null;
}

export function HomeTaskScheduler({ userId, homeId }: HomeTaskSchedulerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [schedule, setSchedule] = useState<any>(null);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [completedSubtasks, setCompletedSubtasks] = useState<Set<string>>(new Set());

  const handleGenerateSchedule = async () => {
    setIsGenerating(true);

    try {
      // Fetch tasks with subtasks
      let tasksQuery = supabase
        .from('home_tasks')
        .select('id, title, skill_level, status')
        .eq('user_id', userId)
        .in('status', ['open', 'in_progress']);

      if (homeId) {
        tasksQuery = tasksQuery.eq('home_id', homeId);
      }

      const { data: tasks, error: tasksError } = await tasksQuery;
      if (tasksError) throw tasksError;

      // Fetch all subtasks for these tasks
      const taskIds = tasks?.map(t => t.id) || [];
      const { data: subtasks, error: subtasksError } = await supabase
        .from('home_task_subtasks')
        .select('*')
        .in('task_id', taskIds)
        .eq('completed', false);

      if (subtasksError) throw subtasksError;

      // Fetch people
      let peopleQuery = supabase
        .from('home_task_people')
        .select('*')
        .eq('user_id', userId);

      if (homeId) {
        peopleQuery = peopleQuery.eq('home_id', homeId);
      }

      const { data: people, error: peopleError } = await peopleQuery;
      if (peopleError) throw peopleError;

      // Organize tasks with their subtasks
      const tasksWithSubtasks = tasks?.map(task => ({
        ...task,
        subtasks: subtasks?.filter(st => st.task_id === task.id) || []
      })) || [];

      // Generate schedule
      const result = scheduleHomeTasksOptimized(
        tasksWithSubtasks as any,
        people as any,
        startDate
      );

      setSchedule(result);

      // Save assignments to database
      if (result.assignments.length > 0) {
        // Clear existing assignments for these tasks
        await supabase
          .from('home_task_assignments')
          .delete()
          .in('task_id', taskIds);

        // Insert new assignments
        const assignmentsToSave = result.assignments.map(a => ({
          task_id: a.taskId,
          subtask_id: a.subtaskId,
          person_id: a.personId,
          user_id: userId,
          scheduled_date: a.scheduledDate.toISOString().split('T')[0],
          scheduled_hours: a.scheduledHours
        }));

        const { error: saveError } = await supabase
          .from('home_task_assignments')
          .insert(assignmentsToSave);

        if (saveError) throw saveError;

        toast.success('Schedule generated and saved');
      } else {
        toast.info('No assignments could be generated');
      }

    } catch (error) {
      console.error('Error generating schedule:', error);
      toast.error('Failed to generate schedule');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!schedule?.assignments?.length) {
      toast.error('No schedule to save');
      return;
    }

    setIsSaving(true);
    try {
      const taskIds = [...new Set(schedule.assignments.map((a: any) => a.taskId))] as string[];
      
      // Clear existing assignments
      await supabase
        .from('home_task_assignments')
        .delete()
        .in('task_id', taskIds);

      // Insert new assignments
      const assignmentsToSave = schedule.assignments.map((a: any) => ({
        task_id: a.taskId,
        subtask_id: a.subtaskId,
        person_id: a.personId,
        user_id: userId,
        scheduled_date: a.scheduledDate.toISOString().split('T')[0],
        scheduled_hours: a.scheduledHours
      }));

      const { error } = await supabase
        .from('home_task_assignments')
        .insert(assignmentsToSave);

      if (error) throw error;
      
      toast.success('Schedule saved successfully');
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Failed to save schedule');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmailSchedule = async () => {
    if (!schedule?.assignments?.length) {
      toast.error('No schedule to email');
      return;
    }

    setIsEmailing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error('User email not found');
        return;
      }

      // Get unique people in the schedule
      const peopleIds = [...new Set(schedule.assignments.map((a: any) => a.personId))] as string[];
      const { data: people } = await supabase
        .from('home_task_people')
        .select('*')
        .in('id', peopleIds);

      const response = await supabase.functions.invoke('send-schedule-notification', {
        body: {
          schedule: schedule.assignments,
          startDate: startDate.toISOString(),
          userEmail: user.email,
          people: people || []
        }
      });

      if (response.error) throw response.error;
      
      toast.success('Schedule emailed successfully');
    } catch (error) {
      console.error('Error emailing schedule:', error);
      toast.error('Failed to email schedule');
    } finally {
      setIsEmailing(false);
    }
  };

  const handleToggleSubtaskComplete = async (subtaskId: string) => {
    const newCompleted = new Set(completedSubtasks);
    if (newCompleted.has(subtaskId)) {
      newCompleted.delete(subtaskId);
    } else {
      newCompleted.add(subtaskId);
    }
    setCompletedSubtasks(newCompleted);

    // Update in database
    try {
      const { error } = await supabase
        .from('home_task_subtasks')
        .update({ completed: !completedSubtasks.has(subtaskId) })
        .eq('id', subtaskId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating subtask:', error);
      toast.error('Failed to update subtask');
    }
  };

  // Group assignments by date
  const assignmentsByDate = schedule?.assignments?.reduce((acc: any, assignment: any) => {
    const dateKey = assignment.scheduledDate.toISOString().split('T')[0];
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(assignment);
    return acc;
  }, {}) || {};

  const sortedDates = Object.keys(assignmentsByDate).sort();

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label className="text-xs">Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1 h-9",
                    !startDate && "text-muted-foreground"
                  )}
                  size="sm"
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex-1 flex items-end">
            <Button onClick={handleGenerateSchedule} disabled={isGenerating} size="sm" className="w-full">
              {isGenerating ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Calendar className="h-3 w-3 mr-1" />
                  Generate Schedule
                </>
              )}
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Generate an optimized schedule matching people's skills and availability
        </div>
      </div>

      {schedule?.warnings && schedule.warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {schedule.warnings.map((warning: string, idx: number) => (
              <div key={idx}>{warning}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {schedule?.unassigned && schedule.unassigned.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs space-y-1">
            <div className="font-semibold">Unassigned Work:</div>
            {schedule.unassigned.map((item: any, idx: number) => (
              <div key={idx}>• {item.taskTitle}: {item.reason}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {schedule?.assignments && schedule.assignments.length > 0 && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button 
              onClick={handleSaveSchedule} 
              disabled={isSaving} 
              size="sm"
              variant="outline"
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 mr-1" />
                  Save Schedule
                </>
              )}
            </Button>
            <Button 
              onClick={handleEmailSchedule} 
              disabled={isEmailing} 
              size="sm"
              variant="outline"
              className="flex-1"
            >
              {isEmailing ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-3 w-3 mr-1" />
                  Email Schedule
                </>
              )}
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted px-3 py-2 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              Optimized Schedule ({schedule.assignments.length} assignments)
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {sortedDates.map(date => (
                <div key={date} className="border-t">
                  <div className="bg-muted/50 px-3 py-2 text-xs font-medium">
                    {new Date(date).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="divide-y">
                    {assignmentsByDate[date].map((assignment: any, idx: number) => (
                      <div key={idx} className="px-3 py-2 text-xs flex items-center gap-3 hover:bg-muted/30">
                        {assignment.subtaskId && (
                          <Checkbox
                            checked={completedSubtasks.has(assignment.subtaskId)}
                            onCheckedChange={() => handleToggleSubtaskComplete(assignment.subtaskId)}
                            className="h-3.5 w-3.5"
                          />
                        )}
                        <div className="flex-1">
                          <div className={cn(
                            "font-medium",
                            assignment.subtaskId && completedSubtasks.has(assignment.subtaskId) && "line-through text-muted-foreground"
                          )}>
                            {assignment.subtaskTitle}
                          </div>
                          <div className="text-[10px] text-muted-foreground">{assignment.taskTitle}</div>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {assignment.personName}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {assignment.scheduledHours.toFixed(1)}h
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!schedule && !isGenerating && (
        <p className="text-xs text-muted-foreground text-center py-8">
          Click "Generate Schedule" to create an optimized work schedule
        </p>
      )}
    </div>
  );
}