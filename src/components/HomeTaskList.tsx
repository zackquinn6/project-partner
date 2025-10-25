import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Home as HomeIcon, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HomeManager } from "./HomeManager";
import { HomeTasksTable } from "./HomeTasksTable";
import { HomeTaskPeople } from "./HomeTaskPeople";
import { HomeTaskScheduler } from "./HomeTaskScheduler";
import { HomeTaskProjectLink } from "./HomeTaskProjectLink";

interface HomeTask {
  id: string;
  title: string;
  description: string | null;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'closed';
  diy_level: 'beginner' | 'intermediate' | 'advanced' | 'pro';
  notes: string | null;
  due_date: string | null;
  home_id: string | null;
  task_type: 'general' | 'pre_sale' | 'diy' | 'contractor';
  project_run_id: string | null;
  ordered: boolean;
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
  const [selectedTask, setSelectedTask] = useState<HomeTask | null>(null);
  const [showProjectLink, setShowProjectLink] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks');
  
  const [formData, setFormData] = useState<{
    title: string;
    priority: 'high' | 'medium' | 'low';
    status: 'open' | 'in_progress' | 'closed';
    diy_level: 'beginner' | 'intermediate' | 'advanced' | 'pro';
    notes: string;
    due_date: string;
    task_type: 'diy' | 'contractor';
  }>({
    title: "",
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
      return;
    }

    if (!selectedHomeId || selectedHomeId === 'all') {
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
      } else {
        const { error } = await supabase
          .from("home_tasks")
          .insert([taskData]);
        
        if (error) throw error;
      }

      resetForm();
      fetchTasks();
    } catch (error) {
      console.error("Error saving task:", error);
    }
  };

  const handleDelete = async (taskId: string) => {
    const { error } = await supabase
      .from("home_tasks")
      .delete()
      .eq("id", taskId);
    
    if (error) {
      return;
    }
    fetchTasks();
  };

  const resetForm = () => {
    setFormData({
      title: "",
      priority: "medium",
      status: "open",
      diy_level: "intermediate",
      notes: "",
      due_date: "",
      task_type: "diy",
    });
    setEditingTask(null);
    setShowAddTask(false);
  };

  const startEdit = async (task: HomeTask) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      priority: task.priority as 'high' | 'medium' | 'low',
      status: task.status as 'open' | 'in_progress' | 'closed',
      diy_level: task.diy_level as 'beginner' | 'intermediate' | 'advanced' | 'pro',
      notes: task.notes || "",
      due_date: task.due_date || "",
      task_type: task.task_type === 'general' || task.task_type === 'pre_sale' ? 'diy' : task.task_type as 'diy' | 'contractor',
    });
    
    setShowAddTask(true);
  };

  const handleEdit = (task: HomeTask) => {
    setEditingTask(task);
    setShowAddTask(true);
  };

  const handleLinkProject = (task: HomeTask) => {
    setSelectedTask(task);
    setShowProjectLink(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-[95vw] md:max-w-[90vw] h-[98vh] p-0 overflow-hidden flex flex-col">
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

              <div className="flex-1 overflow-auto px-2 md:px-4 pb-1 min-h-0">
                <TabsContent value="tasks" className="mt-0 space-y-2 md:space-y-3 h-full">
                  {showAddTask && (
                    <Card>
                      <CardContent className="pt-4 space-y-3">
                        <Input
                          placeholder="Task title *"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="text-xs h-8"
                        />
                        <div className="grid grid-cols-2 gap-2">
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
            <label className="text-xs font-medium mb-1 block">DIY Level</label>
            <Select value={formData.diy_level} onValueChange={(val) => setFormData({ ...formData, diy_level: val as any })}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="pro">Professional</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
                        
                        <Textarea
                          placeholder="Notes (optional)"
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
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onLinkProject={handleLinkProject}
                    onAddTask={() => {
                      resetForm();
                      setShowAddTask(true);
                    }}
                    onProjectNavigate={() => onOpenChange(false)}
                    onTaskUpdate={fetchTasks}
                    userId={user?.id || ''}
                    homeId={selectedHomeId === 'all' ? null : selectedHomeId}
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
        <HomeTaskProjectLink
          open={showProjectLink}
          onOpenChange={setShowProjectLink}
          taskId={selectedTask.id}
          taskTitle={selectedTask.title}
          currentProjectRunId={selectedTask.project_run_id}
          onSuccess={fetchTasks}
        />
      )}
    </>
  );
}
