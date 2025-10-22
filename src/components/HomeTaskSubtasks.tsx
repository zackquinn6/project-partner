import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Subtask {
  id: string;
  title: string;
  estimated_hours: number;
  skill_level: 'high' | 'medium' | 'low';
  completed: boolean;
  order_index: number;
}

interface HomeTaskSubtasksProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  userId: string;
}

export function HomeTaskSubtasks({ open, onOpenChange, taskId, taskTitle, userId }: HomeTaskSubtasksProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState({
    title: '',
    estimated_hours: 1,
    skill_level: 'medium' as 'high' | 'medium' | 'low'
  });

  useEffect(() => {
    if (open) {
      fetchSubtasks();
    }
  }, [open, taskId]);

  const fetchSubtasks = async () => {
    const { data, error } = await supabase
      .from('home_task_subtasks')
      .select('*')
      .eq('task_id', taskId)
      .order('order_index', { ascending: true });

    if (!error && data) {
      setSubtasks(data as Subtask[]);
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
        skill_level: newSubtask.skill_level,
        order_index: subtasks.length
      }]);

    if (error) {
      toast.error('Failed to add subtask');
      return;
    }

    toast.success('Subtask added');
    setNewSubtask({ title: '', estimated_hours: 1, skill_level: 'medium' });
    fetchSubtasks();
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm">Subtasks for: {taskTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Total estimated hours: <span className="font-semibold">{totalHours.toFixed(1)}h</span>
          </div>

          {/* Add new subtask */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                placeholder="Subtask title"
                value={newSubtask.title}
                onChange={(e) => setNewSubtask({ ...newSubtask, title: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div className="w-24">
              <Input
                type="number"
                min="0.5"
                step="0.5"
                value={newSubtask.estimated_hours}
                onChange={(e) => setNewSubtask({ ...newSubtask, estimated_hours: parseFloat(e.target.value) })}
                className="text-xs h-8"
                placeholder="Hours"
              />
            </div>
            <Select 
              value={newSubtask.skill_level} 
              onValueChange={(val) => setNewSubtask({ ...newSubtask, skill_level: val as any })}
            >
              <SelectTrigger className="w-28 text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low Skill</SelectItem>
                <SelectItem value="medium">Med Skill</SelectItem>
                <SelectItem value="high">High Skill</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAddSubtask} size="sm" className="h-8">
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          {/* Subtasks list */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {subtasks.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No subtasks yet</p>
            ) : (
              subtasks.map((subtask) => (
                <div
                  key={subtask.id}
                  className={`flex items-center gap-2 p-2 border rounded text-xs ${
                    subtask.completed ? 'bg-muted opacity-60' : ''
                  }`}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleComplete(subtask)}
                    className="h-6 w-6 p-0"
                  >
                    <Check className={`h-3 w-3 ${subtask.completed ? 'text-green-600' : 'text-muted-foreground'}`} />
                  </Button>
                  <div className={`flex-1 ${subtask.completed ? 'line-through' : ''}`}>
                    {subtask.title}
                  </div>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {subtask.estimated_hours}h
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {subtask.skill_level}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSubtask(subtask.id)}
                    className="h-6 w-6 p-0 text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}