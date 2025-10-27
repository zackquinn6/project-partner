import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Users, Mail, Phone, CheckCircle2, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Person {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  diy_level: 'beginner' | 'intermediate' | 'advanced' | 'pro';
}

interface Task {
  id: string;
  title: string;
  diy_level: 'beginner' | 'intermediate' | 'advanced' | 'pro';
}

interface Subtask {
  id: string;
  task_id: string;
  title: string;
  diy_level: 'beginner' | 'intermediate' | 'advanced' | 'pro';
  task_title: string;
}

interface Assignment {
  taskId: string;
  subtaskId?: string;
  personId: string;
  title: string;
  taskTitle: string;
}

interface HomeTaskAssignmentProps {
  userId: string;
  homeId: string | null;
}

export function HomeTaskAssignment({ userId, homeId }: HomeTaskAssignmentProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [people, setPeople] = useState<Person[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Assignment[]>>({});
  const [isSaving, setIsSaving] = useState(false);

  const fetchPeople = useCallback(async () => {
    let query = supabase
      .from('home_task_people')
      .select('id, name, email, phone, diy_level')
      .eq('user_id', userId);

    if (homeId) {
      query = query.eq('home_id', homeId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setPeople(data as Person[]);
      // Initialize assignments for each person
      const initialAssignments: Record<string, Assignment[]> = {};
      data.forEach(person => {
        initialAssignments[person.id] = [];
      });
      setAssignments(initialAssignments);
    }
  }, [userId, homeId]);

  const fetchTasks = useCallback(async () => {
    let query = supabase
      .from('home_tasks')
      .select('id, title, diy_level')
      .eq('user_id', userId)
      .neq('status', 'closed');

    if (homeId) {
      query = query.eq('home_id', homeId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setTasks(data as Task[]);
    }
  }, [userId, homeId]);

  const fetchSubtasks = useCallback(async () => {
    let taskQuery = supabase
      .from('home_tasks')
      .select('id')
      .eq('user_id', userId)
      .neq('status', 'closed');

    if (homeId) {
      taskQuery = taskQuery.eq('home_id', homeId);
    }

    const { data: taskData } = await taskQuery;
    
    if (!taskData || taskData.length === 0) return;

    const taskIds = taskData.map(t => t.id);

    const { data, error } = await supabase
      .from('home_task_subtasks')
      .select(`
        id,
        task_id,
        title,
        diy_level,
        completed
      `)
      .in('task_id', taskIds)
      .eq('completed', false);

    if (!error && data) {
      // Get task titles
      const { data: tasksData } = await supabase
        .from('home_tasks')
        .select('id, title')
        .in('id', taskIds);

      const taskTitles: Record<string, string> = {};
      tasksData?.forEach(t => {
        taskTitles[t.id] = t.title;
      });

      const subtasksWithTaskTitle = data.map(st => ({
        ...st,
        task_title: taskTitles[st.task_id] || 'Unknown Task'
      }));

      setSubtasks(subtasksWithTaskTitle as Subtask[]);
    }
  }, [userId, homeId]);

  useEffect(() => {
    if (userId) {
      fetchPeople();
      fetchTasks();
      fetchSubtasks();
    }
  }, [userId, homeId, fetchPeople, fetchTasks, fetchSubtasks]);

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    console.log('Drag ended:', { source, destination, draggableId });

    if (!destination) {
      console.log('No destination - drag cancelled');
      return;
    }

    // Don't allow dropping back to available tasks
    if (destination.droppableId === 'available-tasks') {
      console.log('Cannot drop back to available tasks');
      return;
    }

    // Parse the draggableId - format is "task-{uuid}" or "subtask-{uuid}"
    // Use indexOf to split only on the FIRST hyphen since UUIDs contain hyphens
    const firstHyphen = draggableId.indexOf('-');
    const type = draggableId.substring(0, firstHyphen);
    const id = draggableId.substring(firstHyphen + 1);
    
    console.log('Parsed drag item:', { type, id });

    if (type === 'task') {
      const task = tasks.find(t => t.id === id);
      if (!task) {
        console.log('Task not found:', id);
        return;
      }

      console.log('Assigning task:', task.title, 'to person:', destination.droppableId);

      // Get all subtasks for this task
      const taskSubtasks = subtasks.filter(st => st.task_id === task.id);

      const newAssignments: Assignment[] = [
        {
          taskId: task.id,
          personId: destination.droppableId,
          title: task.title,
          taskTitle: task.title
        }
      ];

      // Add all subtasks to the assignment
      taskSubtasks.forEach(subtask => {
        newAssignments.push({
          taskId: task.id,
          subtaskId: subtask.id,
          personId: destination.droppableId,
          title: subtask.title,
          taskTitle: task.title
        });
      });

      setAssignments(prev => {
        const updated = {
          ...prev,
          [destination.droppableId]: [...(prev[destination.droppableId] || []), ...newAssignments]
        };
        console.log('Updated assignments:', updated);
        return updated;
      });
    } else if (type === 'subtask') {
      const subtask = subtasks.find(st => st.id === id);
      if (!subtask) {
        console.log('Subtask not found:', id);
        return;
      }

      console.log('Assigning subtask:', subtask.title, 'to person:', destination.droppableId);

      const newAssignment: Assignment = {
        taskId: subtask.task_id,
        subtaskId: subtask.id,
        personId: destination.droppableId,
        title: subtask.title,
        taskTitle: subtask.task_title
      };

      setAssignments(prev => {
        const updated = {
          ...prev,
          [destination.droppableId]: [...(prev[destination.droppableId] || []), newAssignment]
        };
        console.log('Updated assignments:', updated);
        return updated;
      });
    }
  };

  const removeAssignment = (personId: string, index: number) => {
    setAssignments(prev => ({
      ...prev,
      [personId]: prev[personId].filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Prepare assignments for database
      const allAssignments = Object.entries(assignments).flatMap(([personId, personAssignments]) =>
        personAssignments.map(assignment => ({
          task_id: assignment.taskId,
          subtask_id: assignment.subtaskId || null,
          person_id: personId,
          user_id: userId,
          scheduled_date: new Date().toISOString().split('T')[0],
          scheduled_hours: 1
        }))
      );

      if (allAssignments.length === 0) {
        toast({
          title: "No assignments",
          description: "Please assign tasks to team members before saving.",
          variant: "destructive"
        });
        setIsSaving(false);
        return;
      }

      // Clear existing assignments and insert new ones
      const taskIds = [...new Set(allAssignments.map(a => a.task_id))];
      await supabase
        .from('home_task_assignments')
        .delete()
        .in('task_id', taskIds)
        .eq('user_id', userId);

      const { error } = await supabase
        .from('home_task_assignments')
        .insert(allAssignments);

      if (error) throw error;

      // Send notifications (if enabled)
      await sendNotifications();

      toast({
        title: "Assignments saved",
        description: "Task assignments have been saved successfully.",
      });

      // Clear assignments after save
      const clearedAssignments: Record<string, Assignment[]> = {};
      people.forEach(person => {
        clearedAssignments[person.id] = [];
      });
      setAssignments(clearedAssignments);
      
    } catch (error) {
      console.error("Error saving assignments:", error);
      toast({
        title: "Error",
        description: "Failed to save assignments. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const sendNotifications = async () => {
    // Prepare notification data
    const peopleToNotify = Object.entries(assignments)
      .filter(([_, personAssignments]) => personAssignments.length > 0)
      .map(([personId, _]) => {
        const person = people.find(p => p.id === personId);
        return person;
      })
      .filter(p => p && (p.email || p.phone));

    if (peopleToNotify.length === 0) return;

    try {
      // Call edge function to send notifications
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      const notificationData = peopleToNotify.map(person => {
        const personAssignments = assignments[person!.id];
        return {
          personName: person!.name,
          email: person!.email,
          phone: person!.phone,
          assignments: personAssignments.map(a => ({
            taskTitle: a.taskTitle,
            subtaskTitle: a.subtaskId ? a.title : null
          }))
        };
      });

      const SUPABASE_URL = "https://drshvrukkavtpsprfcbc.supabase.co";

      await fetch(`${SUPABASE_URL}/functions/v1/send-assignment-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          notifications: notificationData,
          userEmail: user?.email
        })
      });
    } catch (error) {
      console.error("Error sending notifications:", error);
      // Don't throw - notifications are secondary to saving assignments
    }
  };

  const getDiyLevelColor = (level: string) => {
    switch (level) {
      case 'pro': return 'destructive';
      case 'advanced': return 'destructive';
      case 'intermediate': return 'default';
      case 'beginner': return 'secondary';
      default: return 'default';
    }
  };

  const totalAssignments = Object.values(assignments).reduce((sum, arr) => sum + arr.length, 0);

  // Get assigned task and subtask IDs to filter them from available list
  const assignedTaskIds = new Set<string>();
  const assignedSubtaskIds = new Set<string>();
  
  Object.values(assignments).forEach(personAssignments => {
    personAssignments.forEach(assignment => {
      assignedTaskIds.add(assignment.taskId);
      if (assignment.subtaskId) {
        assignedSubtaskIds.add(assignment.subtaskId);
      }
    });
  });

  // Filter available tasks and subtasks
  const availableTasks = tasks.filter(task => !assignedTaskIds.has(task.id));
  const availableSubtasks = subtasks.filter(st => !assignedSubtaskIds.has(st.id));

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="text-[10px] md:text-xs text-muted-foreground">
        Drag tasks and subtasks to team members to assign work
      </div>

      {people.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">No team members found. Add team members in the Team tab first.</p>
          </CardContent>
        </Card>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 overflow-hidden">
            {/* Left: Available Tasks/Subtasks */}
            <div className="border rounded-lg bg-muted/30 flex flex-col overflow-hidden">
              <div className="text-xs font-semibold p-3 pb-2">Available Tasks</div>
              
              {availableTasks.length === 0 ? (
                <p className="text-[10px] md:text-xs text-muted-foreground text-center py-8">
                  No open tasks available
                </p>
              ) : (
                <Droppable droppableId="available-tasks" isDropDisabled={true}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 p-3 pt-1 overflow-auto flex-1">
                        {availableTasks.map((task, index) => {
                        const taskSubtasks = availableSubtasks.filter(st => st.task_id === task.id);
                        
                        return (
                          <Draggable key={task.id} draggableId={`task-${task.id}`} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`border rounded-lg bg-background p-2 cursor-grab active:cursor-grabbing ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-primary' : ''}`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="flex-shrink-0 text-muted-foreground">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                                      <circle cx="3" cy="3" r="1" />
                                      <circle cx="3" cy="6" r="1" />
                                      <circle cx="3" cy="9" r="1" />
                                      <circle cx="9" cy="3" r="1" />
                                      <circle cx="9" cy="6" r="1" />
                                      <circle cx="9" cy="9" r="1" />
                                    </svg>
                                  </div>
                                  <span className="text-[10px] md:text-xs font-medium flex-1">{task.title}</span>
                                  <Badge variant={getDiyLevelColor(task.diy_level)} className="text-[9px] md:text-[10px]">
                                    {task.diy_level}
                                  </Badge>
                                </div>
                                
                                {taskSubtasks.length > 0 && (
                                  <Accordion type="single" collapsible className="border-t">
                                    <AccordionItem value="subtasks" className="border-0">
                                      <AccordionTrigger className="px-2 py-1 text-[9px] text-muted-foreground hover:no-underline">
                                        {taskSubtasks.length} subtask{taskSubtasks.length !== 1 ? 's' : ''}
                                      </AccordionTrigger>
                                      <AccordionContent className="px-2 pb-2 space-y-1">
                                        {taskSubtasks.map((subtask, subIndex) => (
                                           <Draggable 
                                            key={subtask.id} 
                                            draggableId={`subtask-${subtask.id}`} 
                                            index={availableTasks.length + subIndex}
                                          >
                                            {(subProvided, subSnapshot) => (
                                              <div
                                                ref={subProvided.innerRef}
                                                {...subProvided.draggableProps}
                                                {...subProvided.dragHandleProps}
                                                className={`border rounded p-1.5 bg-muted/30 cursor-grab active:cursor-grabbing ${subSnapshot.isDragging ? 'shadow-lg ring-2 ring-primary' : ''}`}
                                              >
                                                <div className="flex items-center gap-2">
                                                  <div className="flex-shrink-0 text-muted-foreground">
                                                    <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
                                                      <circle cx="3" cy="3" r="1" />
                                                      <circle cx="3" cy="6" r="1" />
                                                      <circle cx="3" cy="9" r="1" />
                                                      <circle cx="9" cy="3" r="1" />
                                                      <circle cx="9" cy="6" r="1" />
                                                      <circle cx="9" cy="9" r="1" />
                                                    </svg>
                                                  </div>
                                                  <span className="text-[9px] md:text-[10px] flex-1">{subtask.title}</span>
                                                  <Badge variant={getDiyLevelColor(subtask.diy_level)} className="text-[8px] md:text-[9px] py-0 px-1">
                                                    {subtask.diy_level}
                                                  </Badge>
                                                </div>
                                              </div>
                                            )}
                                          </Draggable>
                                        ))}
                                      </AccordionContent>
                                    </AccordionItem>
                                  </Accordion>
                                )}
                              </div>
                            )}
                          </Draggable>
                        );
                       })}
                       {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              )}
            </div>

            {/* Right: Team Members with Assignments */}
            <div className="border rounded-lg flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-3 pb-2">
                <div className="text-xs font-semibold">Team Assignments</div>
                {totalAssignments > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {totalAssignments} assigned
                  </Badge>
                )}
              </div>

              <div className="overflow-auto flex-1 space-y-2 p-3 pt-1">
                {people.map(person => (
                  <Droppable key={person.id} droppableId={person.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`border rounded-lg p-2 min-h-[80px] ${snapshot.isDraggingOver ? 'bg-primary/10 border-primary ring-2 ring-primary' : 'bg-background'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] md:text-xs font-semibold">{person.name}</span>
                            <Badge variant={getDiyLevelColor(person.diy_level)} className="text-[9px]">
                              {person.diy_level}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                            {person.email && <Mail className="h-3 w-3" />}
                            {person.phone && <Phone className="h-3 w-3" />}
                          </div>
                        </div>

                        {assignments[person.id] && assignments[person.id].length > 0 ? (
                          <div className="space-y-1">
                            {assignments[person.id].map((assignment, index) => (
                              <div key={index} className="flex items-center justify-between bg-muted/50 rounded p-1.5">
                                <div className="flex-1 min-w-0">
                                  {assignment.subtaskId && (
                                    <div className="text-[9px] text-muted-foreground truncate">{assignment.taskTitle}</div>
                                  )}
                                  <div className="text-[10px] font-medium truncate">{assignment.title}</div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAssignment(person.id, index)}
                                  className="h-5 w-5 p-0 ml-1"
                                >
                                  ×
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[9px] text-center text-muted-foreground py-2">
                            Drop tasks here
                          </div>
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              onClick={handleSave}
              disabled={isSaving || totalAssignments === 0}
              className="h-8 text-xs"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {isSaving ? 'Saving...' : 'Save Assignments'}
            </Button>
          </div>
        </DragDropContext>
      )}
    </div>
  );
}
