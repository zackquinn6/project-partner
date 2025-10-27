import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Users, Mail, Phone, CheckCircle2, AlertCircle } from "lucide-react";
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

  useEffect(() => {
    if (userId) {
      fetchPeople();
      fetchTasks();
      fetchSubtasks();
    }
  }, [userId, homeId]);

  const fetchPeople = async () => {
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
  };

  const fetchTasks = async () => {
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
  };

  const fetchSubtasks = async () => {
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
  };

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    // Parse the draggableId to determine if it's a task or subtask
    const [type, id] = draggableId.split('-');

    if (type === 'task') {
      const task = tasks.find(t => t.id === id);
      if (!task) return;

      const newAssignment: Assignment = {
        taskId: task.id,
        personId: destination.droppableId,
        title: task.title,
        taskTitle: task.title
      };

      setAssignments(prev => ({
        ...prev,
        [destination.droppableId]: [...(prev[destination.droppableId] || []), newAssignment]
      }));
    } else if (type === 'subtask') {
      const subtask = subtasks.find(st => st.id === id);
      if (!subtask) return;

      const newAssignment: Assignment = {
        taskId: subtask.task_id,
        subtaskId: subtask.id,
        personId: destination.droppableId,
        title: subtask.title,
        taskTitle: subtask.task_title
      };

      setAssignments(prev => ({
        ...prev,
        [destination.droppableId]: [...(prev[destination.droppableId] || []), newAssignment]
      }));
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0">
            {/* Left: Available Tasks/Subtasks */}
            <div className="space-y-3 overflow-auto border rounded-lg p-3 bg-muted/30">
              <div className="text-xs font-semibold">Available Tasks</div>
              
              {tasks.length === 0 && subtasks.length === 0 ? (
                <p className="text-[10px] md:text-xs text-muted-foreground text-center py-8">
                  No open tasks available
                </p>
              ) : (
                <>
                  {tasks.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-medium text-muted-foreground">Tasks</div>
                      {tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={`task-${task.id}`} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`border rounded-lg p-2 bg-background ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] md:text-xs font-medium flex-1">{task.title}</span>
                                <Badge variant={getDiyLevelColor(task.diy_level)} className="text-[9px] md:text-[10px]">
                                  {task.diy_level}
                                </Badge>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    </div>
                  )}

                  {subtasks.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <div className="text-[10px] font-medium text-muted-foreground">Subtasks</div>
                      {subtasks.map((subtask, index) => (
                        <Draggable key={subtask.id} draggableId={`subtask-${subtask.id}`} index={index + tasks.length}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`border rounded-lg p-2 bg-background ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                            >
                              <div className="space-y-1">
                                <div className="text-[9px] text-muted-foreground">{subtask.task_title}</div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] md:text-xs font-medium flex-1">{subtask.title}</span>
                                  <Badge variant={getDiyLevelColor(subtask.diy_level)} className="text-[9px] md:text-[10px]">
                                    {subtask.diy_level}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right: Team Members with Assignments */}
            <div className="space-y-3 overflow-auto border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold">Team Assignments</div>
                {totalAssignments > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {totalAssignments} assigned
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                {people.map(person => (
                  <Droppable key={person.id} droppableId={person.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`border rounded-lg p-2 ${snapshot.isDraggingOver ? 'bg-primary/10 border-primary' : 'bg-background'}`}
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
