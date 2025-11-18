import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, AlertTriangle, CheckCircle2, Loader2, CalendarIcon, Save, Mail, Info, Users } from "lucide-react";
import { scheduleHomeTasksOptimized } from "@/utils/homeTaskScheduler";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { format, startOfToday, isBefore } from "date-fns";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HomeTaskSchedulerProps {
  userId: string;
  homeId: string | null;
  activeTab?: string; // Track when schedule tab becomes active
}

// Helper function to get today's date at midnight
const getToday = () => startOfToday();

export function HomeTaskScheduler({ userId, homeId, activeTab }: HomeTaskSchedulerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [schedule, setSchedule] = useState<any>(null);
  // Initialize start date to today to avoid generating schedules in the past
  const [startDate, setStartDate] = useState<Date>(() => getToday());
  const [isSaving, setIsSaving] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [currentScheduleId, setCurrentScheduleId] = useState<string | null>(null);
  const [existingAssignments, setExistingAssignments] = useState<any[]>([]);

  useEffect(() => {
    const today = getToday();
    // Always ensure start date is today or in the future
    if (isBefore(startDate, today)) {
      setStartDate(today);
    }
    loadLatestSchedule();
    loadExistingAssignments();
  }, [userId, homeId]);

  // Reset start date to today whenever schedule tab becomes active
  useEffect(() => {
    if (activeTab === 'schedule') {
      const today = getToday();
      // Reset to today when schedule tab opens
      setStartDate(today);
    }
  }, [activeTab]);

  // Also check on mount
  useEffect(() => {
    const today = getToday();
    if (isBefore(startDate, today)) {
      setStartDate(today);
    }
  }, []);

  const loadExistingAssignments = async () => {
    try {
      let query = supabase
        .from('home_task_assignments')
        .select('task_id, subtask_id, person_id, scheduled_date, scheduled_hours')
        .eq('user_id', userId);

      if (homeId) {
        // Get tasks for this home first
        const { data: homeTasks } = await supabase
          .from('home_tasks')
          .select('id')
          .eq('home_id', homeId);
        
        if (homeTasks && homeTasks.length > 0) {
          const taskIds = homeTasks.map(t => t.id);
          query = query.in('task_id', taskIds);
        }
      }

      const { data, error } = await query;
      
      if (!error && data) {
        setExistingAssignments(data);
      }
    } catch (error) {
      console.error('Error loading existing assignments:', error);
    }
  };

  const loadLatestSchedule = async () => {
    try {
      let query = supabase
        .from('home_task_schedules')
        .select('*')
        .eq('user_id', userId)
        .order('generated_at', { ascending: false })
        .limit(1);

      if (homeId) {
        query = query.eq('home_id', homeId);
      }

      const { data, error } = await query.single();
      
      if (!error && data) {
        setCurrentScheduleId(data.id);
        const loadedDate = new Date(data.start_date);
        const today = getToday();
        
        // Only use loaded date if it's today or in the future
        if (!isBefore(loadedDate, today)) {
          setStartDate(loadedDate);
        } else {
          // Reset to today if loaded date is in the past
          setStartDate(today);
        }
        
        // Reconstruct schedule from stored data
        if (data.schedule_data && typeof data.schedule_data === 'object') {
          const scheduleData = data.schedule_data as any;
          setSchedule({
            assignments: (scheduleData.assignments || []).map((a: any) => ({
              ...a,
              scheduledDate: new Date(a.scheduledDate)
            })),
            warnings: data.warnings || [],
            unassigned: data.unassigned || []
          });
        }
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
    }
  };

  const handleGenerateSchedule = async () => {
    setIsGenerating(true);

    try {
      // Fetch tasks with subtasks
      let tasksQuery = supabase
        .from('home_tasks')
        .select('id, title, diy_level, status, priority, due_date')
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

      // Fetch existing manual assignments
      const { data: existingAssignments, error: assignmentsError } = await supabase
        .from('home_task_assignments')
        .select('task_id, subtask_id, person_id, scheduled_date, scheduled_hours')
        .in('task_id', taskIds)
        .eq('user_id', userId);

      if (assignmentsError) throw assignmentsError;

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

      // Generate schedule with existing assignments
      const result = scheduleHomeTasksOptimized(
        tasksWithSubtasks as any,
        people as any,
        startDate,
        existingAssignments as any
      );

      setSchedule(result);

      // Save to database
      await saveScheduleToDatabase(result);

    } catch (error) {
      console.error('Error generating schedule:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveScheduleToDatabase = async (scheduleData: any) => {
    try {
      const taskIds = [...new Set(scheduleData.assignments.map((a: any) => a.taskId))] as string[];
      
      // Save schedule metadata
      const scheduleRecord = {
        user_id: userId,
        home_id: homeId,
        start_date: startDate.toISOString().split('T')[0],
        schedule_data: {
          assignments: scheduleData.assignments.map((a: any) => ({
            ...a,
            scheduledDate: a.scheduledDate.toISOString()
          })),
          professionalTasks: scheduleData.professionalTasks || []
        },
        assignments_count: scheduleData.assignments.length,
        warnings: scheduleData.warnings || [],
        unassigned: scheduleData.unassigned || []
      };

      let scheduleId = currentScheduleId;

      if (currentScheduleId) {
        // Update existing schedule
        const { error: updateError } = await supabase
          .from('home_task_schedules')
          .update(scheduleRecord)
          .eq('id', currentScheduleId);

        if (updateError) throw updateError;
      } else {
        // Create new schedule
        const { data: newSchedule, error: insertError } = await supabase
          .from('home_task_schedules')
          .insert([scheduleRecord])
          .select()
          .single();

        if (insertError) throw insertError;
        scheduleId = newSchedule.id;
        setCurrentScheduleId(scheduleId);
      }

      // Save assignments to database
      if (scheduleData.assignments.length > 0) {
        // Clear existing assignments for these tasks
        await supabase
          .from('home_task_assignments')
          .delete()
          .in('task_id', taskIds);

        // Insert new assignments
        const assignmentsToSave = scheduleData.assignments.map((a: any) => ({
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
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      throw error;
    }
  };

  const handleSaveSchedule = async () => {
    if (!schedule?.assignments?.length) {
      return;
    }

    setIsSaving(true);
    try {
      await saveScheduleToDatabase(schedule);
    } catch (error) {
      console.error('Error saving schedule:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmailSchedule = async () => {
    if (!schedule?.assignments?.length) {
      return;
    }

    setIsEmailing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
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
    } catch (error) {
      console.error('Error emailing schedule:', error);
    } finally {
      setIsEmailing(false);
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
    <div className="space-y-3">
      {existingAssignments && existingAssignments.length > 0 && (
        <Alert>
          <Info className="h-3 w-3 md:h-4 md:w-4" />
          <AlertDescription className="text-[10px] md:text-xs">
            Using {existingAssignments.length} manual assignment(s) from the Assign tab. Remaining work will be auto-assigned.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-2">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
          <div className="flex-1">
            <Label className="text-[10px] md:text-xs">Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1 h-7 text-[10px] md:text-xs",
                    !startDate && "text-muted-foreground"
                  )}
                  size="sm"
                >
                  <CalendarIcon className="mr-1.5 h-2.5 w-2.5 md:h-3 md:w-3" />
                  {startDate ? format(startDate, "MMM d, yyyy") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50 bg-popover" align="start">
                <CalendarComponent
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    if (date) {
                      const today = getToday();
                      // Only allow dates that are today or in the future
                      if (!isBefore(date, today)) {
                        setStartDate(date);
                      } else {
                        // If user tries to select a past date, reset to today
                        setStartDate(today);
                      }
                    }
                  }}
                  disabled={(date) => {
                    // Disable all dates before today
                    return isBefore(date, getToday());
                  }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex-1 flex items-end">
            <Button onClick={handleGenerateSchedule} disabled={isGenerating} size="sm" className="w-full h-7 text-[10px] md:text-xs">
              {isGenerating ? (
                <>
                  <Loader2 className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1 animate-spin" />
                  <span className="hidden md:inline">Generating...</span>
                  <span className="md:hidden">Gen...</span>
                </>
              ) : (
                <>
                  <Calendar className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
                  <span className="hidden md:inline">Generate Schedule</span>
                  <span className="md:hidden">Generate</span>
                </>
              )}
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="text-[10px] md:text-xs text-muted-foreground">
            Generate an optimized schedule matching people's skills and availability
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground cursor-help flex-shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs p-3">
                <div className="space-y-2">
                  <p className="font-semibold">How the scheduler works:</p>
                  <ul className="space-y-1 text-[10px]">
                    <li>• <strong>Priority:</strong> High priority tasks are scheduled first</li>
                    <li>• <strong>Skills:</strong> Matches people to tasks based on DIY level</li>
                    <li>• <strong>Availability:</strong> Respects available days and hours</li>
                    <li>• <strong>Consecutive Days:</strong> Honors max consecutive work days</li>
                    <li>• <strong>Cost:</strong> Prefers lower hourly rates when skills match</li>
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {schedule?.warnings && schedule.warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-3 w-3 md:h-4 md:w-4" />
          <AlertDescription className="text-[10px] md:text-xs">
            {schedule.warnings.map((warning: string, idx: number) => (
              <div key={idx}>{warning}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {schedule?.unassigned && schedule.unassigned.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-3 w-3 md:h-4 md:w-4" />
          <AlertDescription className="text-[10px] md:text-xs space-y-1">
            <div className="font-semibold">Unassigned Work:</div>
            {schedule.unassigned.map((item: any, idx: number) => (
              <div key={idx}>• {item.taskTitle}: {item.reason}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {schedule?.professionalTasks && schedule.professionalTasks.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <Users className="h-3 w-3 md:h-4 md:w-4 text-orange-600" />
          <AlertDescription className="text-[10px] md:text-xs space-y-1">
            <div className="font-semibold text-orange-900">Professional Tasks to be Completed:</div>
            <div className="text-orange-800">These tasks require professional contractors and won't be assigned to your team.</div>
            {schedule.professionalTasks.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center text-orange-900">
                <span>• {item.subtaskTitle || item.taskTitle}</span>
                {item.dueDate && (
                  <span className="text-[9px] md:text-[10px] font-medium">
                    Due: {new Date(item.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {schedule?.assignments && schedule.assignments.length > 0 && (
        <div className="space-y-2 md:space-y-3">
          <div className="flex gap-2">
            <Button 
              onClick={handleSaveSchedule} 
              disabled={isSaving} 
              size="sm"
              variant="outline"
              className="flex-1 h-7 text-[10px] md:text-xs"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-2.5 w-2.5 md:h-3 md:w-3 animate-spin" />
                  <span className="hidden md:inline md:ml-1">Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-2.5 w-2.5 md:h-3 md:w-3" />
                  <span className="hidden md:inline md:ml-1">Save Schedule</span>
                </>
              )}
            </Button>
            <Button 
              onClick={handleEmailSchedule} 
              disabled={isEmailing} 
              size="sm"
              variant="outline"
              className="flex-1 h-7 text-[10px] md:text-xs"
            >
              {isEmailing ? (
                <>
                  <Loader2 className="h-2.5 w-2.5 md:h-3 md:w-3 animate-spin" />
                  <span className="hidden md:inline md:ml-1">Sending...</span>
                </>
              ) : (
                <>
                  <Mail className="h-2.5 w-2.5 md:h-3 md:w-3" />
                  <span className="hidden md:inline md:ml-1">Email Schedule</span>
                </>
              )}
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="h-2.5 w-2.5 md:h-3 md:w-3 text-green-600" />
              <span className="hidden md:inline">Optimized Schedule ({schedule.assignments.length} assignments)</span>
              <span className="md:hidden">Schedule ({schedule.assignments.length})</span>
            </div>
            <div className="max-h-[350px] md:max-h-[400px] overflow-y-auto">
              {sortedDates.map(date => (
                <div key={date} className="border-t">
                  <div className="bg-muted/50 px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs font-medium">
                    {new Date(date).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="divide-y">
                    {assignmentsByDate[date].map((assignment: any, idx: number) => (
                      <div key={idx} className="px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs flex items-center gap-2 hover:bg-muted/30">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {assignment.subtaskTitle}
                          </div>
                          <div className="text-[9px] md:text-[10px] text-muted-foreground truncate">{assignment.taskTitle}</div>
                        </div>
                        <div className="flex gap-1 md:gap-1.5 items-center flex-shrink-0">
                          <Badge variant="outline" className="text-[9px] md:text-[10px] px-1 md:px-1.5 py-0 max-w-[60px] md:max-w-none truncate">
                            {assignment.personName}
                          </Badge>
                          <Badge variant="secondary" className="text-[9px] md:text-[10px] px-1 md:px-1.5 py-0">
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
        <p className="text-[10px] md:text-xs text-muted-foreground text-center py-6 md:py-8">
          Click "Generate Schedule" to create an optimized work schedule
        </p>
      )}
    </div>
  );
}