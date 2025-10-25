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
import { HomeTaskProjectLink } from "./HomeTaskProjectLink";

interface HomeTask {
  id: string;
  title: string;
  description: string | null;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'closed';
  diy_level: 'beginner' | 'intermediate' | 'pro';
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
  const [showProjectLink, setShowProjectLink] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks');
  const [subtasks, setSubtasks] = useState<Array<{ id: string; title: string; estimated_hours: number; diy_level: 'beginner' | 'intermediate' | 'pro' }>>([]);
  
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    status: 'open' | 'in_progress' | 'closed';
    diy_level: 'beginner' | 'intermediate' | 'pro';
    notes: string;
    due_date: string;
    task_type: 'diy' | 'contractor';
  }>({
    title: "",
    description: "",
    priority: "medium",
    status: "open",
    diy_level: "intermediate",
    notes: "",
    due_date: "",
    task_type: "diy",
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

    try {
      if (editingTask) {
        const { error } = await supabase
          .from("home_tasks")
          .update(taskData)
          .eq("id", editingTask.id);
        
        if (error) throw error;

        // Delete existing subtasks and insert new ones
        await supabase.from('home_task_subtasks').delete().eq('task_id', editingTask.id);
        
        if (subtasks.length > 0) {
          const subtasksToInsert = subtasks.filter(st => st.title.trim()).map((st, idx) => ({
            task_id: editingTask.id,
            user_id: user.id,
            title: st.title,
            estimated_hours: st.estimated_hours,
            diy_level: st.diy_level,
            order_index: idx
          }));
          
          if (subtasksToInsert.length > 0) {
            const { error: subtaskError } = await supabase
              .from('home_task_subtasks')
              .insert(subtasksToInsert);
            if (subtaskError) throw subtaskError;
          }
        }
        
        toast.success("Task updated");
      } else {
        const { data: newTask, error } = await supabase
          .from("home_tasks")
          .insert([taskData])
          .select()
          .single();
        
        if (error) throw error;

        // Insert subtasks if any
        if (subtasks.length > 0 && newTask) {
          const subtasksToInsert = subtasks.filter(st => st.title.trim()).map((st, idx) => ({
            task_id: newTask.id,
            user_id: user.id,
            title: st.title,
            estimated_hours: st.estimated_hours,
            diy_level: st.diy_level,
            order_index: idx
          }));
          
          if (subtasksToInsert.length > 0) {
            const { error: subtaskError } = await supabase
              .from('home_task_subtasks')
              .insert(subtasksToInsert);
            if (subtaskError) throw subtaskError;
          }
        }
        
        toast.success("Task created");
      }

      resetForm();
      fetchTasks();
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error("Failed to save task");
    }
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
      diy_level: "intermediate",
      notes: "",
      due_date: "",
      task_type: "diy",
    });
    setSubtasks([]);
    setEditingTask(null);
    setShowAddTask(false);
  };

  const startEdit = async (task: HomeTask) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      priority: task.priority as 'high' | 'medium' | 'low',
      status: task.status as 'open' | 'in_progress' | 'closed',
      diy_level: task.diy_level as 'beginner' | 'intermediate' | 'pro',
      notes: task.notes || "",
      due_date: task.due_date || "",
      task_type: task.task_type === 'general' || task.task_type === 'pre_sale' ? 'diy' : task.task_type as 'diy' | 'contractor',
    });
    
    // Fetch existing subtasks
    const { data: existingSubtasks } = await supabase
      .from('home_task_subtasks')
      .select('id, title, estimated_hours, diy_level')
      .eq('task_id', task.id)
      .order('order_index');
    
    if (existingSubtasks) {
      setSubtasks(existingSubtasks.map(st => ({
        id: st.id,
        title: st.title,
        estimated_hours: st.estimated_hours,
        diy_level: st.diy_level as 'beginner' | 'intermediate' | 'pro'
      })));
    }
    
    setShowAddTask(true);
  };

  const handleAddSubtasks = (task: HomeTask) => {
    setSelectedTask(task);
    setShowSubtasks(true);
  };

  const handleLinkProject = (task: HomeTask) => {
    setSelectedTask(task);
    setShowProjectLink(true);
  };

  const addSubtask = () => {
    setSubtasks([...subtasks, { 
      id: crypto.randomUUID(), 
      title: "", 
      estimated_hours: 1, 
      diy_level: "intermediate"
    }]);
  };

  const updateSubtask = (id: string, field: string, value: any) => {
    setSubtasks(subtasks.map(st => st.id === id ? { ...st, [field]: value } : st));
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-[95vw] md:max-w-[90vw] h-[92vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-2 md:px-4 pt-3 pb-2 border-b flex-shrink-0">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-xs md:text-sm font-semibold">Task Manager</DialogTitle>
              <div className="flex gap-1.5">
                <Select value={selectedHomeId || ""} onValueChange={setSelectedHomeId}>
                  <SelectTrigger className="w-[100px] md:w-[160px] text-[10px] md:text-xs h-7">
                    <SelectValue placeholder="Select home" />
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
                  className="h-7 text-[10px] md:text-xs px-2"
                >
                  <HomeIcon className="h-3 w-3 md:mr-1" />
                  <span className="hidden md:inline">Homes</span>
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="mx-2 md:mx-4 mt-2 mb-3 w-auto grid grid-cols-3 text-[10px] md:text-xs h-7 md:h-8 flex-shrink-0">
                <TabsTrigger value="tasks" className="text-[10px] md:text-xs px-2 md:px-3 py-1">Tasks</TabsTrigger>
                <TabsTrigger value="people" className="text-[10px] md:text-xs px-2 md:px-3 py-1">Team</TabsTrigger>
                <TabsTrigger value="schedule" className="text-[10px] md:text-xs px-2 md:px-3 py-1">Schedule</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-auto px-2 md:px-4 pb-3 min-h-0">
                <TabsContent value="tasks" className="mt-0 space-y-2 md:space-y-3 h-full">
                  <div className="flex justify-end">
                    <Button onClick={() => setShowAddTask(true)} size="sm" className="h-7 text-[10px] md:text-xs px-2">
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
            <label className="text-xs font-medium mb-1 block">DIY Level</label>
            <Select value={formData.diy_level} onValueChange={(val) => setFormData({ ...formData, diy_level: val as any })}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
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
                        
                        {/* Subtasks Section */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium">Sub-tasks</label>
                            <Button type="button" variant="outline" size="sm" onClick={addSubtask} className="h-6 text-xs">
                              <Plus className="h-3 w-3 mr-1" />
                              Add Sub-task
                            </Button>
                          </div>
                          {subtasks.length > 0 && (
                            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2 font-medium">Task Name</th>
                    <th className="text-left p-2 font-medium w-24">Hours</th>
                    <th className="text-left p-2 font-medium w-28">DIY Level</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                                <tbody>
                                  {subtasks.map((subtask) => (
                                    <tr key={subtask.id} className="border-t">
                                      <td className="p-2">
                                        <Input
                                          value={subtask.title}
                                          onChange={(e) => updateSubtask(subtask.id, 'title', e.target.value)}
                                          placeholder="Sub-task name"
                                          className="h-7 text-xs"
                                        />
                                      </td>
                                      <td className="p-2">
                                        <Input
                                          type="number"
                                          min="0.5"
                                          step="0.5"
                                          value={subtask.estimated_hours}
                                          onChange={(e) => updateSubtask(subtask.id, 'estimated_hours', parseFloat(e.target.value))}
                                          className="h-7 text-xs"
                                        />
                                      </td>
                      <td className="p-2">
                        <Select value={subtask.diy_level} onValueChange={(val) => updateSubtask(subtask.id, 'diy_level', val)}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </td>
                                      <td className="p-2">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeSubtask(subtask.id)}
                                          className="h-6 w-6 p-0 text-destructive"
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
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
                    onLinkProject={handleLinkProject}
                  />
                </TabsContent>

                <TabsContent value="people" className="mt-0 h-full">
                  {user && (
                    <HomeTaskPeople
                      userId={user.id}
                      homeId={selectedHomeId === 'all' ? null : selectedHomeId}
                    />
                  )}
                </TabsContent>

                <TabsContent value="schedule" className="mt-0 h-full">
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
        <>
          <HomeTaskSubtasks
            open={showSubtasks}
            onOpenChange={setShowSubtasks}
            taskId={selectedTask.id}
            taskTitle={selectedTask.title}
            userId={user?.id || ''}
            homeId={selectedHomeId === 'all' ? null : selectedHomeId}
          />
          <HomeTaskProjectLink
            open={showProjectLink}
            onOpenChange={setShowProjectLink}
            taskId={selectedTask.id}
            taskTitle={selectedTask.title}
            currentProjectRunId={selectedTask.project_run_id}
            onSuccess={fetchTasks}
          />
        </>
      )}
    </>
  );
}
