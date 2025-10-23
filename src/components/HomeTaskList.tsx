import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Home as HomeIcon, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HomeManager } from "./HomeManager";
import { HomeTasksTable } from "./HomeTasksTable";
import { HomeTaskSubtasks } from "./HomeTaskSubtasks";
import { HomeTaskPeople } from "./HomeTaskPeople";
import { HomeTaskScheduler } from "./HomeTaskScheduler";

interface HomeTask {
  id: string;
  title: string;
  description: string | null;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'closed';
  skill_level: 'high' | 'medium' | 'low';
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
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [selectedTask, setSelectedTask] = useState<HomeTask | null>(null);
  const [activeTab, setActiveTab] = useState('tasks');
  
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    status: 'open' | 'in_progress' | 'closed';
    skill_level: 'high' | 'medium' | 'low';
    notes: string;
    due_date: string;
    task_type: 'general' | 'pre_sale' | 'diy' | 'contractor';
  }>({
    title: "",
    description: "",
    priority: "medium",
    status: "open",
    skill_level: "medium",
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
      skill_level: "medium",
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
      skill_level: task.skill_level as 'high' | 'medium' | 'low',
      notes: task.notes || "",
      due_date: task.due_date || "",
      task_type: task.task_type as 'general' | 'pre_sale' | 'diy' | 'contractor',
    });
    setShowAddTask(true);
  };

  const handleAddSubtasks = (task: HomeTask) => {
    setSelectedTask(task);
    setShowSubtasks(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-4 pt-4 pb-2 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm font-semibold">Home Task Manager</DialogTitle>
              <div className="flex gap-2">
                <Select value={selectedHomeId || ""} onValueChange={setSelectedHomeId}>
                  <SelectTrigger className="w-[200px] text-xs h-8">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHomeManager(true)}
                  className="h-8 text-xs"
                >
                  <HomeIcon className="h-3 w-3 mr-1" />
                  Homes
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="mx-4 mt-2 w-auto grid grid-cols-3 text-xs h-8">
                <TabsTrigger value="tasks" className="text-xs">Tasks</TabsTrigger>
                <TabsTrigger value="people" className="text-xs">Team</TabsTrigger>
                <TabsTrigger value="schedule" className="text-xs">Schedule</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-auto px-4 pb-4">
                <TabsContent value="tasks" className="mt-3 space-y-3">
                  <div className="flex justify-end">
                    <Button onClick={() => setShowAddTask(true)} size="sm" className="h-8 text-xs">
                      <Plus className="h-3 w-3 mr-1" />
                      Add Task
                    </Button>
                  </div>

                  {showAddTask && (
                    <Card>
                      <CardContent className="pt-4 space-y-3">
                        <Input
                          placeholder="Task title *"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="text-xs h-8"
                        />
                        <Textarea
                          placeholder="Description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="text-xs min-h-[60px]"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-xs font-medium mb-1 block">Priority</label>
                            <Select value={formData.priority} onValueChange={(val) => setFormData({ ...formData, priority: val as any })}>
                              <SelectTrigger className="text-xs h-8">
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
                            <label className="text-xs font-medium mb-1 block">Status</label>
                            <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val as any })}>
                              <SelectTrigger className="text-xs h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1 block">Skill Level</label>
                            <Select value={formData.skill_level} onValueChange={(val) => setFormData({ ...formData, skill_level: val as any })}>
                              <SelectTrigger className="text-xs h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs font-medium mb-1 block">Task Type</label>
                            <Select value={formData.task_type} onValueChange={(val) => setFormData({ ...formData, task_type: val as any })}>
                              <SelectTrigger className="text-xs h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="general">General</SelectItem>
                                <SelectItem value="pre_sale">Pre-Sale</SelectItem>
                                <SelectItem value="diy">DIY</SelectItem>
                                <SelectItem value="contractor">Contractor</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1 block">Due Date</label>
                            <Input
                              type="date"
                              value={formData.due_date}
                              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                              className="text-xs h-8"
                            />
                          </div>
                        </div>
                        <Textarea
                          placeholder="Notes and questions"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          className="text-xs min-h-[60px]"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" onClick={resetForm} size="sm" className="h-8 text-xs">
                            Cancel
                          </Button>
                          <Button onClick={handleSubmit} size="sm" className="h-8 text-xs">
                            {editingTask ? "Update" : "Create"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <HomeTasksTable
                    tasks={tasks}
                    onEdit={startEdit}
                    onDelete={handleDelete}
                    onAddSubtasks={handleAddSubtasks}
                  />
                </TabsContent>

                <TabsContent value="people" className="mt-3">
                  {user && (
                    <HomeTaskPeople
                      userId={user.id}
                      homeId={selectedHomeId === 'all' ? null : selectedHomeId}
                    />
                  )}
                </TabsContent>

                <TabsContent value="schedule" className="mt-3">
                  {user && (
                    <HomeTaskScheduler
                      userId={user.id}
                      homeId={selectedHomeId === 'all' ? null : selectedHomeId}
                    />
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      <HomeManager
        open={showHomeManager}
        onOpenChange={setShowHomeManager}
        selectedHomeId={null}
        onHomeSelected={() => fetchHomes()}
        showSelector={false}
      />

      {selectedTask && (
        <HomeTaskSubtasks
          open={showSubtasks}
          onOpenChange={setShowSubtasks}
          taskId={selectedTask.id}
          taskTitle={selectedTask.title}
          userId={user?.id || ''}
        />
      )}
    </>
  );
}
