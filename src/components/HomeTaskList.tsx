import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Home as HomeIcon, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { HomeManager } from "./HomeManager";

interface HomeTask {
  id: string;
  title: string;
  description: string | null;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'closed';
  notes: string | null;
  due_date: string | null;
  home_id: string | null;
  task_type: 'general' | 'pre_sale' | 'diy' | 'contractor';
  project_run_id: string | null;
  created_at: string;
}

interface Home {
  id: string;
  name: string;
}

export function HomeTaskList({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<HomeTask[]>([]);
  const [homes, setHomes] = useState<Home[]>([]);
  const [selectedHomeId, setSelectedHomeId] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showHomeManager, setShowHomeManager] = useState(false);
  const [editingTask, setEditingTask] = useState<HomeTask | null>(null);
  
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    status: 'open' | 'in_progress' | 'closed';
    notes: string;
    due_date: string;
    task_type: 'general' | 'pre_sale' | 'diy' | 'contractor';
  }>({
    title: "",
    description: "",
    priority: "medium",
    status: "open",
    notes: "",
    due_date: "",
    task_type: "general",
  });

  useEffect(() => {
    if (open && user) {
      fetchHomes();
      fetchTasks();
    }
  }, [open, user]);

  useEffect(() => {
    if (selectedHomeId) {
      fetchTasks();
    }
  }, [selectedHomeId]);

  const fetchHomes = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("homes")
      .select("id, name")
      .eq("user_id", user.id)
      .order("is_primary", { ascending: false });
    
    if (!error && data) {
      setHomes(data);
      if (data.length > 0 && !selectedHomeId) {
        setSelectedHomeId(data[0].id);
      }
    }
  };

  const fetchTasks = async () => {
    if (!user) return;
    
    let query = supabase
      .from("home_tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    if (selectedHomeId) {
      query = query.eq("home_id", selectedHomeId);
    }
    
    const { data, error } = await query;
    
    if (!error && data) {
      setTasks(data as HomeTask[]);
    }
  };

  const handleSubmit = async () => {
    if (!user || !formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    const taskData = {
      ...formData,
      user_id: user.id,
      home_id: selectedHomeId,
      due_date: formData.due_date || null,
    };

    if (editingTask) {
      const { error } = await supabase
        .from("home_tasks")
        .update(taskData)
        .eq("id", editingTask.id);
      
      if (error) {
        toast.error("Failed to update task");
        return;
      }
      toast.success("Task updated");
    } else {
      const { error } = await supabase
        .from("home_tasks")
        .insert([taskData]);
      
      if (error) {
        toast.error("Failed to create task");
        return;
      }
      toast.success("Task created");
    }

    resetForm();
    fetchTasks();
  };

  const handleDelete = async (taskId: string) => {
    const { error } = await supabase
      .from("home_tasks")
      .delete()
      .eq("id", taskId);
    
    if (error) {
      toast.error("Failed to delete task");
      return;
    }
    toast.success("Task deleted");
    fetchTasks();
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      priority: "medium",
      status: "open",
      notes: "",
      due_date: "",
      task_type: "general",
    });
    setEditingTask(null);
    setShowAddTask(false);
  };

  const startEdit = (task: HomeTask) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      priority: task.priority as 'high' | 'medium' | 'low',
      status: task.status as 'open' | 'in_progress' | 'closed',
      notes: task.notes || "",
      due_date: task.due_date || "",
      task_type: task.task_type as 'general' | 'pre_sale' | 'diy' | 'contractor',
    });
    setShowAddTask(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'default';
      case 'in_progress': return 'default';
      case 'closed': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Home Task List</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHomeManager(true)}
                >
                  <HomeIcon className="h-4 w-4 mr-2" />
                  Manage Homes
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Home Selector */}
            <div className="flex items-center gap-2">
              <Select value={selectedHomeId || ""} onValueChange={setSelectedHomeId}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select a home" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Homes</SelectItem>
                  {homes.map((home) => (
                    <SelectItem key={home.id} value={home.id}>
                      {home.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setShowAddTask(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>

            {/* Add/Edit Task Form */}
            {showAddTask && (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <Input
                    placeholder="Task title *"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                  <Textarea
                    placeholder="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Priority</label>
                      <Select value={formData.priority} onValueChange={(val) => setFormData({ ...formData, priority: val as any })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Status</label>
                      <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val as any })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Task Type</label>
                      <Select value={formData.task_type} onValueChange={(val) => setFormData({ ...formData, task_type: val as any })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="pre_sale">Pre-Sale</SelectItem>
                          <SelectItem value="diy">DIY</SelectItem>
                          <SelectItem value="contractor">Contractor Needed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Due Date</label>
                      <Input
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <Textarea
                    placeholder="Notes and questions"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={resetForm}>Cancel</Button>
                    <Button onClick={handleSubmit}>
                      {editingTask ? "Update" : "Create"} Task
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Task List */}
            <div className="space-y-3">
              {tasks.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No tasks yet. Create your first task to get started!
                </p>
              ) : (
                tasks.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{task.title}</h3>
                            <Badge variant={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                            <Badge variant={getStatusColor(task.status)}>
                              {task.status.replace('_', ' ')}
                            </Badge>
                            <Badge variant="outline">
                              {task.task_type.replace('_', ' ')}
                            </Badge>
                          </div>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                          )}
                          {task.due_date && (
                            <p className="text-sm text-muted-foreground">
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </p>
                          )}
                          {task.notes && (
                            <div className="mt-2 p-2 bg-muted rounded-md">
                              <p className="text-sm font-medium mb-1">Notes:</p>
                              <p className="text-sm">{task.notes}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEdit(task)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(task.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <HomeManager
        open={showHomeManager}
        onOpenChange={setShowHomeManager}
        selectedHomeId={null}
        onHomeSelected={() => {}}
        showSelector={false}
      />
    </>
  );
}
