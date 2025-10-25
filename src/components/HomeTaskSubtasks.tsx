import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Check, User } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Subtask {
  id: string;
  title: string;
  estimated_hours: number;
  diy_level: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  completed: boolean;
  order_index: number;
  assigned_person_id: string | null;
  assigned_person_name?: string;
}

interface Person {
  id: string;
  name: string;
}

interface HomeTaskSubtasksProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  userId: string;
  homeId: string | null;
}

export function HomeTaskSubtasks({ open, onOpenChange, taskId, taskTitle, userId, homeId }: HomeTaskSubtasksProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [newSubtask, setNewSubtask] = useState({
    title: '',
    estimated_hours: 1,
    diy_level: 'intermediate' as 'beginner' | 'intermediate' | 'advanced' | 'professional',
    assigned_person_id: null as string | null
  });

  useEffect(() => {
    if (open) {
      fetchSubtasks();
      fetchPeople();
    }
  }, [open, taskId]);

  const fetchPeople = async () => {
    let query = supabase
      .from('home_task_people')
      .select('id, name')
      .eq('user_id', userId);
    
    if (homeId) {
      query = query.eq('home_id', homeId);
    }

    const { data, error } = await query;
    if (!error && data) {
      setPeople(data);
    }
  };

  const fetchSubtasks = async () => {
    const { data, error } = await supabase
      .from('home_task_subtasks')
      .select(`
        *,
        assigned_person:home_task_people!assigned_person_id(name)
      `)
      .eq('task_id', taskId)
      .order('order_index', { ascending: true });

    if (!error && data) {
      const subtasksWithNames = data.map(st => ({
        ...st,
        assigned_person_name: (st.assigned_person as any)?.name || null
      }));
      setSubtasks(subtasksWithNames as any);
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.title.trim()) {
      toast.error('Subtask title is required');
      return;
    }

    const { error } = await supabase
      .from('home_task_subtasks')
      .insert([{
        task_id: taskId,
        user_id: userId,
        title: newSubtask.title,
        estimated_hours: newSubtask.estimated_hours,
        diy_level: newSubtask.diy_level,
        assigned_person_id: newSubtask.assigned_person_id,
        order_index: subtasks.length
      }]);

    if (error) {
      toast.error('Failed to add subtask');
      return;
    }

    toast.success('Subtask added');
    setNewSubtask({ title: '', estimated_hours: 1, diy_level: 'intermediate', assigned_person_id: null });
    fetchSubtasks();
  };

  const handleUpdateAssignment = async (subtaskId: string, personId: string | null) => {
    const { error } = await supabase
      .from('home_task_subtasks')
      .update({ assigned_person_id: personId })
      .eq('id', subtaskId);

    if (!error) {
      toast.success('Assignment updated');
      fetchSubtasks();
    } else {
      toast.error('Failed to update assignment');
    }
  };

  const handleToggleComplete = async (subtask: Subtask) => {
    const { error } = await supabase
      .from('home_task_subtasks')
      .update({ completed: !subtask.completed })
      .eq('id', subtask.id);

    if (!error) {
      fetchSubtasks();
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    const { error } = await supabase
      .from('home_task_subtasks')
      .delete()
      .eq('id', subtaskId);

    if (error) {
      toast.error('Failed to delete subtask');
      return;
    }

    toast.success('Subtask deleted');
    fetchSubtasks();
  };

  const totalHours = subtasks.reduce((sum, st) => sum + Number(st.estimated_hours), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] md:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm md:text-base pr-8">Subtasks: {taskTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 md:space-y-4">
          <div className="text-xs md:text-sm text-muted-foreground">
            Total: <span className="font-semibold">{totalHours.toFixed(1)}h</span>
          </div>

          {/* Add new subtask */}
          <div className="grid grid-cols-1 gap-2">
            <Input
              placeholder="Subtask title"
              value={newSubtask.title}
              onChange={(e) => setNewSubtask({ ...newSubtask, title: e.target.value })}
              className="text-xs md:text-sm h-9 md:h-10"
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Input
                type="number"
                min="0.5"
                step="0.5"
                value={newSubtask.estimated_hours}
                onChange={(e) => setNewSubtask({ ...newSubtask, estimated_hours: parseFloat(e.target.value) })}
                className="text-xs md:text-sm h-9 md:h-10"
                placeholder="Hours"
              />
              <Select 
                value={newSubtask.diy_level} 
                onValueChange={(val) => setNewSubtask({ ...newSubtask, diy_level: val as any })}
              >
                <SelectTrigger className="text-xs md:text-sm h-9 md:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                </SelectContent>
              </Select>
              <Select 
                value={newSubtask.assigned_person_id || "unassigned"} 
                onValueChange={(val) => setNewSubtask({ ...newSubtask, assigned_person_id: val === 'unassigned' ? null : val })}
              >
                <SelectTrigger className="text-xs md:text-sm h-9 md:h-10">
                  <SelectValue placeholder="Assign to" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {people.map(person => (
                    <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAddSubtask} size="sm" className="h-9 md:h-10 text-xs md:text-sm">
                <Plus className="h-4 w-4" />
                <span className="ml-1">Add</span>
              </Button>
            </div>
          </div>

          {/* Subtasks list */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {subtasks.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No subtasks yet</p>
            ) : (
              subtasks.map((subtask) => (
                <div
                  key={subtask.id}
                  className={`grid grid-cols-[auto,1fr,auto] sm:grid-cols-[auto,1fr,auto,auto,auto,auto] gap-2 items-center p-2.5 md:p-3 border rounded ${
                    subtask.completed ? 'bg-muted/50' : ''
                  }`}
                >
                  <button
                    onClick={() => handleToggleComplete(subtask)}
                    className="h-6 w-6 flex items-center justify-center text-sm hover:opacity-70 transition-opacity flex-shrink-0"
                    title={subtask.completed ? 'Mark as incomplete' : 'Mark as complete'}
                  >
                    {subtask.completed ? '✓' : '○'}
                  </button>
                  <div 
                    className={`text-xs md:text-sm min-w-0 cursor-pointer ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}
                    onClick={() => handleToggleComplete(subtask)}
                  >
                    {subtask.title}
                  </div>
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 flex-shrink-0">
                    {subtask.estimated_hours}h
                  </Badge>
                  <Badge variant="outline" className="hidden sm:inline-flex text-[10px] px-2 py-0.5 flex-shrink-0">
                    {subtask.diy_level === 'beginner' ? 'new' : 
                     subtask.diy_level === 'intermediate' ? 'mid' : 
                     subtask.diy_level === 'advanced' ? 'adv' : 
                     subtask.diy_level === 'professional' ? 'pro' : subtask.diy_level}
                  </Badge>
                  <Select 
                    value={subtask.assigned_person_id || "unassigned"}
                    onValueChange={(val) => handleUpdateAssignment(subtask.id, val === 'unassigned' ? null : val)}
                    disabled={subtask.completed}
                  >
                    <SelectTrigger className="w-24 sm:w-32 h-7 text-[10px] sm:text-xs px-2 flex-shrink-0">
                      <SelectValue>
                        {subtask.assigned_person_name ? (
                          <span className="flex items-center gap-1">
                            <User className="h-2.5 w-2.5" />
                            <span className="truncate">{subtask.assigned_person_name}</span>
                          </span>
                        ) : (
                          'Unassign'
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {people.map(person => (
                        <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    onClick={() => handleDeleteSubtask(subtask.id)}
                    className="h-6 w-6 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded transition-colors flex-shrink-0"
                    title="Delete subtask"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}