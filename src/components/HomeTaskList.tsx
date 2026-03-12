import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMembership } from "@/contexts/MembershipContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Home as HomeIcon, X, GripVertical, List, ListOrdered, ShoppingCart, Users, Link2 } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HomeManager } from "./HomeManager";
import { HomeTasksTable } from "./HomeTasksTable";
import { HomeTaskPeople } from "./HomeTaskPeople";
import { HomeTaskAssignment } from "./HomeTaskAssignment";
import { HomeTaskScheduler } from "./HomeTaskScheduler";
import { HomeTaskProjectLink } from "./HomeTaskProjectLink";
import { RapidProjectAssessment } from "./RapidProjectAssessment";
import { ResponsiveDialog } from "./ResponsiveDialog";
import { ShoppingListManager } from "./ShoppingListManager";

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
  estimated_hours?: number | null;
  ordered: boolean;
  created_at: string;
  updated_at?: string | null;
}

interface Home {
  id: string;
  name: string;
}

export function HomeTaskList({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const { canAccessPaidFeatures } = useMembership();
  const [tasks, setTasks] = useState<HomeTask[]>([]);
  const [homes, setHomes] = useState<Home[]>([]);
  const [selectedHomeId, setSelectedHomeId] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showHomeManager, setShowHomeManager] = useState(false);
  const [editingTask, setEditingTask] = useState<HomeTask | null>(null);
  const [selectedTask, setSelectedTask] = useState<HomeTask | null>(null);
  const [showProjectLink, setShowProjectLink] = useState(false);
  const [showRapidCosting, setShowRapidCosting] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks');
  const [subtasksOrdered, setSubtasksOrdered] = useState(false);
  const [showTeamWindow, setShowTeamWindow] = useState(false);
  const [showAssignWindow, setShowAssignWindow] = useState(false);
  const [subtasks, setSubtasks] = useState<Array<{ 
    id: string; 
    title: string; 
    estimated_hours: number; 
    diy_level: 'beginner' | 'intermediate' | 'advanced' | 'pro';
    assigned_person_id: string | null;
  }>>([]);
  const [materials, setMaterials] = useState<Array<{ 
    id: string; 
    material_name: string;
    quantity: number;
  }>>([]);
  
  const [formData, setFormData] = useState<{
    title: string;
    priority: 'high' | 'medium' | 'low';
    status: 'open' | 'in_progress' | 'closed';
    diy_level: 'beginner' | 'intermediate' | 'advanced' | 'pro';
    notes: string;
    due_date: string;
    task_type: 'diy' | 'contractor';
    estimated_hours: string;
  }>({
    title: "",
    priority: "medium",
    status: "open",
    diy_level: "intermediate",
    notes: "",
    due_date: "",
    task_type: "diy",
    estimated_hours: "",
  });

  const [subtasksByTaskId, setSubtasksByTaskId] = useState<Record<string, Array<{ task_id: string; estimated_hours: number | null; completed: boolean }>>>({});

  useEffect(() => {
    const fetchSubtasksForDashboard = async () => {
      if (!user || tasks.length === 0) {
        setSubtasksByTaskId({});
        return;
      }
      const taskIds = tasks.map(t => t.id);
      const { data, error } = await supabase
        .from('home_task_subtasks')
        .select('task_id, estimated_hours, completed')
        .in('task_id', taskIds);
      if (error) {
        console.error('Error loading subtasks for dashboard:', error);
        return;
      }
      const map: Record<string, Array<{ task_id: string; estimated_hours: number | null; completed: boolean }>> = {};
      (data || []).forEach((st: any) => {
        if (!map[st.task_id]) map[st.task_id] = [];
        map[st.task_id].push(st);
      });
      setSubtasksByTaskId(map);
    };
    fetchSubtasksForDashboard();
  }, [user, tasks]);

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

  const handleSubmit = async (onCreated?: (task: HomeTask) => void) => {
    if (!user || !formData.title.trim()) {
      return;
    }

    if (!selectedHomeId || selectedHomeId === 'all') {
      return;
    }

    const hasSubtasks = subtasks.filter(st => st.title.trim()).length > 0;
    const estimatedHoursValue = formData.estimated_hours.trim().length > 0
      ? Number(formData.estimated_hours)
      : null;

    const taskData = {
      title: formData.title,
      priority: formData.priority,
      status: formData.status,
      diy_level: formData.diy_level,
      notes: formData.notes,
      task_type: formData.task_type,
      estimated_hours: hasSubtasks ? null : estimatedHoursValue,
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
            assigned_person_id: st.assigned_person_id,
            order_index: idx
          }));
          
          if (subtasksToInsert.length > 0) {
            const { error: subtaskError } = await supabase
              .from('home_task_subtasks')
              .insert(subtasksToInsert);
            if (subtaskError) throw subtaskError;
          }
        }

        // Delete existing materials and insert new ones
        await supabase.from('task_shopping_list').delete().eq('task_id', editingTask.id);
        
        if (materials.length > 0) {
          const materialsToInsert = materials.filter(m => m.material_name.trim()).map(m => ({
            task_id: editingTask.id,
            user_id: user.id,
            material_name: m.material_name,
            quantity: m.quantity || 1
          }));
          
          if (materialsToInsert.length > 0) {
            const { error: materialError } = await supabase
              .from('task_shopping_list')
              .insert(materialsToInsert);
            if (materialError) throw materialError;
          }
        }
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
            assigned_person_id: st.assigned_person_id,
            order_index: idx
          }));
          
          if (subtasksToInsert.length > 0) {
            const { error: subtaskError } = await supabase
              .from('home_task_subtasks')
              .insert(subtasksToInsert);
            if (subtaskError) throw subtaskError;
          }
        }

        // Insert materials if any
        if (materials.length > 0 && newTask) {
          const materialsToInsert = materials.filter(m => m.material_name.trim()).map(m => ({
            task_id: newTask.id,
            user_id: user.id,
            material_name: m.material_name,
            quantity: m.quantity || 1
          }));
          
          if (materialsToInsert.length > 0) {
            const { error: materialError } = await supabase
              .from('task_shopping_list')
              .insert(materialsToInsert);
            if (materialError) throw materialError;
          }
        }

        onCreated?.(newTask as HomeTask);
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
      estimated_hours: "",
    });
    setSubtasks([]);
    setMaterials([]);
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
      estimated_hours: task.estimated_hours == null ? "" : String(task.estimated_hours),
    });
    
    // Fetch existing subtasks
    const { data: existingSubtasks } = await supabase
      .from('home_task_subtasks')
      .select('id, title, estimated_hours, diy_level, assigned_person_id')
      .eq('task_id', task.id)
      .order('order_index');
    
    if (existingSubtasks) {
      setSubtasks(existingSubtasks.map(st => ({
        id: st.id,
        title: st.title,
        estimated_hours: st.estimated_hours,
        diy_level: st.diy_level as 'beginner' | 'intermediate' | 'advanced' | 'pro',
        assigned_person_id: st.assigned_person_id
      })));
    }
    
    // Fetch existing materials
    const { data: existingMaterials } = await supabase
      .from('task_shopping_list')
      .select('id, material_name, quantity')
      .eq('task_id', task.id);
    
    if (existingMaterials) {
      setMaterials(existingMaterials.map(m => ({
        id: m.id,
        material_name: m.material_name,
        quantity: m.quantity || 1
      })));
    }
    
    setShowAddTask(true);
  };

  const handleEdit = (task: HomeTask) => {
    startEdit(task);
  };

  const handleLinkProject = (task: HomeTask) => {
    setSelectedTask(task);
    setShowProjectLink(true);
  };

  const handleRapidCosting = (task: HomeTask) => {
    setSelectedTask(task);
    setShowRapidCosting(true);
  };

  const addSubtask = () => {
    setSubtasks([...subtasks, { 
      id: crypto.randomUUID(), 
      title: "", 
      estimated_hours: 1, 
      diy_level: "intermediate",
      assigned_person_id: null
    }]);
  };

  const updateSubtask = (id: string, field: string, value: any) => {
    setSubtasks(subtasks.map(st => st.id === id ? { ...st, [field]: value } : st));
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(subtasks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setSubtasks(items);
  };

  const addMaterial = () => {
    setMaterials([...materials, { 
      id: crypto.randomUUID(), 
      material_name: "",
      quantity: 1
    }]);
  };

  const updateMaterial = (id: string, field: 'material_name' | 'quantity', value: string | number) => {
    setMaterials(materials.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const removeMaterial = (id: string) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  return (
    <>
      <Dialog 
        open={open} 
        onOpenChange={(isOpen) => {
          // Prevent closing Task Manager if Rapid Costing is open
          if (!isOpen && showRapidCosting) {
            return; // Don't close if child dialog is open
          }
          onOpenChange(isOpen);
        }}
      >
        <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
          <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-lg md:text-xl font-bold">Task Manager</DialogTitle>
              <div className="flex gap-1.5 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHomeManager(true)}
                  className="h-7 text-[10px] md:text-xs px-2"
                >
                  <HomeIcon className="h-3 w-3 md:mr-1" />
                  <span className="hidden md:inline">Homes</span>
                </Button>
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
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="h-7 px-2 text-[9px] md:text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="flex-shrink-0 px-2 md:px-4 pt-3 pb-4 md:pb-5 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="mb-0 overflow-hidden">
                  <TabsList className={`w-full inline-flex ${canAccessPaidFeatures ? 'h-9 md:h-10' : 'h-9 md:h-10'} p-0.5 md:p-1 gap-0.5 md:gap-1 bg-muted/50 rounded-lg`}>
                    <TabsTrigger value="tasks" className="text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-md flex-1 min-w-0 truncate">Tasks</TabsTrigger>
                    <TabsTrigger value="shopping" className="text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-md flex-1 min-w-0 truncate">Shopping</TabsTrigger>
                    {canAccessPaidFeatures && (
                      <TabsTrigger value="schedule" className="text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-md flex-1 min-w-0 truncate">Schedule</TabsTrigger>
                    )}
                  </TabsList>
                </div>
              </div>

              <div className="flex-1 overflow-auto px-2 md:px-4 pb-2 min-h-0">
                <TabsContent value="tasks" className="mt-0 space-y-2 md:space-y-3 h-full">
                  {/* Project Dashboard metrics (Task Manager) */}
                  {(() => {
                    const now = new Date();
                    const openTasks = tasks.filter(t => t.status !== 'closed');
                    const completedTasks = tasks.filter(t => t.status === 'closed');

                    const openByLevel = openTasks.reduce((acc, t) => {
                      acc[t.diy_level] = (acc[t.diy_level] ?? 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);
                    const openByPriority = openTasks.reduce((acc, t) => {
                      acc[t.priority] = (acc[t.priority] ?? 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);

                    const overdueTasks = openTasks.filter(t => {
                      if (!t.due_date) return false;
                      const due = new Date(t.due_date);
                      return !Number.isNaN(due.getTime()) && due < now;
                    }).length;

                    const activeProjects = openTasks.filter(t => t.project_run_id != null).length;

                    const completedWithDate = completedTasks
                      .map(t => {
                        const ts = t.updated_at ?? null;
                        if (!ts) return null;
                        const d = new Date(ts);
                        if (Number.isNaN(d.getTime())) return null;
                        return d;
                      })
                      .filter((d): d is Date => d != null);

                    const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
                    const completedLast7 = completedWithDate.filter(d => d >= daysAgo(7)).length;
                    const completedLast30 = completedWithDate.filter(d => d >= daysAgo(30)).length;

                    // Remaining hours:
                    // - If a task has subtasks, sum incomplete subtask hours (only where estimated_hours is not null)
                    // - Else use task.estimated_hours when present
                    let remainingHours = 0;
                    let missingHoursCount = 0;
                    openTasks.forEach(t => {
                      const subtasksForTask = subtasksByTaskId[t.id] || [];
                      if (subtasksForTask.length > 0) {
                        subtasksForTask.forEach(st => {
                          if (st.completed) return;
                          if (st.estimated_hours == null) {
                            missingHoursCount += 1;
                            return;
                          }
                          remainingHours += Number(st.estimated_hours);
                        });
                        return;
                      }
                      if (t.estimated_hours == null) {
                        missingHoursCount += 1;
                        return;
                      }
                      remainingHours += Number(t.estimated_hours);
                    });

                    return (
                      <div className="space-y-3">
                        {/* Key metrics row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <Card className="md:col-span-1">
                            <CardContent className="p-4">
                              <div className="text-xs text-muted-foreground">Total open</div>
                              <div className="text-3xl font-bold leading-tight">{openTasks.length}</div>
                            </CardContent>
                          </Card>
                          <Card className="md:col-span-1">
                            <CardContent className="p-4">
                              <div className="text-xs text-muted-foreground">Total complete (all time)</div>
                              <div className="text-3xl font-bold leading-tight">{completedTasks.length}</div>
                            </CardContent>
                          </Card>
                          <div className="md:col-span-1">
                            <Accordion type="single" collapsible>
                              <AccordionItem value="other-metrics" className="border rounded-lg">
                                <AccordionTrigger className="px-4 py-3 text-sm">
                                  View other metrics
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <Card>
                                      <CardContent className="p-4">
                                        <div className="text-xs text-muted-foreground">Completed tasks</div>
                                        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                                          <div>
                                            <div className="text-lg font-semibold">{completedLast7}</div>
                                            <div className="text-[11px] text-muted-foreground">Last 7d</div>
                                          </div>
                                          <div>
                                            <div className="text-lg font-semibold">{completedLast30}</div>
                                            <div className="text-[11px] text-muted-foreground">Last 30d</div>
                                          </div>
                                          <div>
                                            <div className="text-lg font-semibold">{completedTasks.length}</div>
                                            <div className="text-[11px] text-muted-foreground">All time</div>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>

                                    <Card>
                                      <CardContent className="p-4">
                                        <div className="text-xs text-muted-foreground">Overdue tasks</div>
                                        <div className="text-2xl font-bold mt-1">{overdueTasks}</div>
                                      </CardContent>
                                    </Card>

                                    <Card>
                                      <CardContent className="p-4">
                                        <div className="text-xs text-muted-foreground">Open tasks by priority</div>
                                        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                                          <div>
                                            <div className="text-lg font-semibold">{openByPriority.high ?? 0}</div>
                                            <div className="text-[11px] text-muted-foreground">High</div>
                                          </div>
                                          <div>
                                            <div className="text-lg font-semibold">{openByPriority.medium ?? 0}</div>
                                            <div className="text-[11px] text-muted-foreground">Med</div>
                                          </div>
                                          <div>
                                            <div className="text-lg font-semibold">{openByPriority.low ?? 0}</div>
                                            <div className="text-[11px] text-muted-foreground">Low</div>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>

                                    <Card>
                                      <CardContent className="p-4">
                                        <div className="text-xs text-muted-foreground">Open tasks by level</div>
                                        <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                                          <div>
                                            <div className="text-lg font-semibold">{openByLevel.beginner ?? 0}</div>
                                            <div className="text-[11px] text-muted-foreground">Beg</div>
                                          </div>
                                          <div>
                                            <div className="text-lg font-semibold">{openByLevel.intermediate ?? 0}</div>
                                            <div className="text-[11px] text-muted-foreground">Int</div>
                                          </div>
                                          <div>
                                            <div className="text-lg font-semibold">{openByLevel.advanced ?? 0}</div>
                                            <div className="text-[11px] text-muted-foreground">Adv</div>
                                          </div>
                                          <div>
                                            <div className="text-lg font-semibold">{openByLevel.pro ?? 0}</div>
                                            <div className="text-[11px] text-muted-foreground">Pro</div>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>

                                    <Card>
                                      <CardContent className="p-4">
                                        <div className="text-xs text-muted-foreground">Active projects</div>
                                        <div className="text-2xl font-bold mt-1">{activeProjects}</div>
                                        <div className="text-[11px] text-muted-foreground mt-1">Tasks linked to a project</div>
                                      </CardContent>
                                    </Card>

                                    <Card>
                                      <CardContent className="p-4">
                                        <div className="text-xs text-muted-foreground">Estimated hours remaining</div>
                                        <div className="text-2xl font-bold mt-1">{remainingHours.toFixed(1)}h</div>
                                        {missingHoursCount > 0 && (
                                          <div className="text-[11px] text-muted-foreground mt-1">+ {missingHoursCount} item(s) without hours</div>
                                        )}
                                      </CardContent>
                                    </Card>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

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

                        <div>
                          <label className="text-xs font-medium mb-1 block">Estimated hours</label>
                          {subtasks.length > 0 ? (
                            <div className="text-xs text-muted-foreground h-8 flex items-center">
                              N/A (using sub-task hours)
                            </div>
                          ) : (
                            <Input
                              type="number"
                              min="0.25"
                              step="0.25"
                              value={formData.estimated_hours}
                              onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                              placeholder="e.g. 2"
                              className="text-xs h-8"
                            />
                          )}
                        </div>
                        
                        <Textarea
                          placeholder="Notes (optional)"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          className="text-xs min-h-[60px]"
                        />

                        {/* Subtasks Section */}
                        <div className="space-y-2 border-t pt-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium">Subtasks</label>
                            <div className="flex gap-2">
                              <Button 
                                type="button"
                                variant="outline" 
                                size="sm" 
                                onClick={() => setSubtasksOrdered(!subtasksOrdered)} 
                                className="h-7 text-xs"
                              >
                                {subtasksOrdered ? <ListOrdered className="h-3 w-3 mr-1" /> : <List className="h-3 w-3 mr-1" />}
                                {subtasksOrdered ? 'Ordered' : 'Unordered'}
                              </Button>
                              <Button type="button" variant="outline" size="sm" onClick={addSubtask} className="h-7 text-xs">
                                <Plus className="h-3 w-3 mr-1" />
                                Add Sub-task
                              </Button>
                            </div>
                          </div>
                          {subtasks.length > 0 && (
                            <DragDropContext onDragEnd={handleDragEnd}>
                              <div className="border rounded-md overflow-hidden">
                                <div className={`grid grid-cols-[32px_auto_100px_120px_32px] ${subtasksOrdered ? 'md:grid-cols-[32px_48px_auto_100px_120px_32px]' : ''} gap-2 p-2 bg-muted text-xs font-medium`}>
                                  <div></div>
                                  {subtasksOrdered && <div>#</div>}
                                  <div>Task Name</div>
                                  <div>Hours</div>
                                  <div>DIY Level</div>
                                  <div></div>
                                </div>
                                  <Droppable droppableId="subtasks">
                                    {(provided) => (
                                      <div {...provided.droppableProps} ref={provided.innerRef}>
                                        {subtasks.map((subtask, index) => (
                                          <Draggable key={subtask.id} draggableId={subtask.id} index={index}>
                                            {(provided, snapshot) => (
                                              <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className={`grid grid-cols-[32px_auto_100px_120px_32px] ${subtasksOrdered ? 'md:grid-cols-[32px_48px_auto_100px_120px_32px]' : ''} gap-2 p-2 border-t items-center ${snapshot.isDragging ? 'bg-accent' : ''}`}
                                              >
                                                <div {...provided.dragHandleProps} className="flex items-center">
                                                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                                                </div>
                                                {subtasksOrdered && (
                                                  <div className="font-medium text-muted-foreground text-xs">
                                                    {index + 1}
                                                  </div>
                                                )}
                                                <Input
                                                  value={subtask.title}
                                                  onChange={(e) => updateSubtask(subtask.id, 'title', e.target.value)}
                                                  placeholder="Subtask name"
                                                  className="h-7 text-xs"
                                                />
                                                <Input
                                                  type="number"
                                                  min="0.25"
                                                  step="0.25"
                                                  value={subtask.estimated_hours}
                                                  onChange={(e) => updateSubtask(subtask.id, 'estimated_hours', parseFloat(e.target.value))}
                                                  className="h-7 text-xs"
                                                />
                                                <Select value={subtask.diy_level} onValueChange={(val) => updateSubtask(subtask.id, 'diy_level', val)}>
                                                  <SelectTrigger className="h-7 text-xs">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="beginner">Beginner</SelectItem>
                                                    <SelectItem value="intermediate">Intermediate</SelectItem>
                                                    <SelectItem value="advanced">Advanced</SelectItem>
                                                    <SelectItem value="pro">Professional</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => removeSubtask(subtask.id)}
                                                  className="h-6 w-6 p-0 text-destructive"
                                                >
                                                  <X className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            )}
                                          </Draggable>
                                        ))}
                                        {provided.placeholder}
                                      </div>
                                    )}
                                  </Droppable>
                                </div>
                              </DragDropContext>
                             )}
                           </div>

                        {/* Materials Section */}
                        <div className="space-y-2 border-t pt-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium">Materials</label>
                            <Button type="button" variant="outline" size="sm" onClick={addMaterial} className="h-7 text-xs">
                              <Plus className="h-3 w-3 mr-1" />
                              Add Material
                            </Button>
                          </div>
                          {materials.length > 0 && (
                            <div className="border rounded-md overflow-hidden">
                              <div className="grid grid-cols-[1fr_80px_32px] gap-2 p-2 bg-muted text-xs font-medium">
                                <div>Material Name</div>
                                <div>Quantity</div>
                                <div></div>
                              </div>
                              <div>
                                {materials.map((material) => (
                                  <div
                                    key={material.id}
                                    className="grid grid-cols-[1fr_80px_32px] gap-2 p-2 border-t items-center"
                                  >
                                    <Input
                                      value={material.material_name}
                                      onChange={(e) => updateMaterial(material.id, 'material_name', e.target.value)}
                                      placeholder="Material name"
                                      className="h-7 text-xs"
                                    />
                                    <Input
                                      type="number"
                                      min="1"
                                      value={material.quantity}
                                      onChange={(e) => updateMaterial(material.id, 'quantity', parseInt(e.target.value) || 1)}
                                      placeholder="Qty"
                                      className="h-7 text-xs"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeMaterial(material.id)}
                                      className="h-6 w-6 p-0 text-destructive"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                         <div className="flex gap-2 justify-end flex-wrap">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => {
                              if (editingTask) {
                                setSelectedTask(editingTask);
                                setShowProjectLink(true);
                              } else {
                                handleSubmit((task) => {
                                  setSelectedTask(task);
                                  setShowProjectLink(true);
                                });
                              }
                            }}
                            disabled={!formData.title.trim() || !selectedHomeId || selectedHomeId === 'all'}
                          >
                            <Link2 className="h-3 w-3 mr-1" />
                            Link task to project
                          </Button>
                          <Button variant="outline" onClick={resetForm} size="sm" className="h-8 text-xs">
                            Cancel
                          </Button>
                          <Button onClick={() => handleSubmit()} size="sm" className="h-8 text-xs">
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
                    onRapidCosting={handleRapidCosting}
                    onAddTask={() => {
                      resetForm();
                      setShowAddTask(true);
                    }}
                    onProjectNavigate={() => onOpenChange(false)}
                    onTaskUpdate={fetchTasks}
                  />
                </TabsContent>

                <TabsContent value="shopping" className="mt-0 h-full">
                  <ShoppingListManager />
                </TabsContent>

                {canAccessPaidFeatures && (
                  <TabsContent value="schedule" className="mt-0 h-full space-y-4">
                    {/* Top buttons for Team and Assign windows */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAssignWindow(true)}
                        className="flex-1"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Assign Tasks
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTeamWindow(true)}
                        className="flex-1"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Team Availability
                      </Button>
                    </div>

                    {/* Schedule content */}
                    {user && (
                      <HomeTaskScheduler
                        userId={user.id}
                        homeId={selectedHomeId === 'all' ? null : selectedHomeId}
                        activeTab={activeTab}
                      />
                    )}
                  </TabsContent>
                )}
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

      {selectedTask && showRapidCosting && (
        <ResponsiveDialog
          open={showRapidCosting}
          onOpenChange={(isOpen) => {
            // Only close the Rapid Costing dialog, prevent propagation to Task Manager
            if (!isOpen) {
              setShowRapidCosting(false);
            }
          }}
          size="content-large"
          title={`Cost Assessment - ${selectedTask.title}`}
        >
          <RapidProjectAssessment 
            taskId={selectedTask.id}
            taskTitle={selectedTask.title}
            taskNotes={selectedTask.notes || ''}
            onClose={() => {
              // Explicitly only close the Rapid Costing dialog
              setShowRapidCosting(false);
            }}
          />
        </ResponsiveDialog>
      )}

      {/* Team Availability Window */}
      <Dialog open={showTeamWindow} onOpenChange={setShowTeamWindow}>
        <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
          <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-lg md:text-xl font-bold">Team Availability</DialogTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowTeamWindow(false)} 
                className="h-7 px-2 text-[9px] md:text-xs"
              >
                Close
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
            {user && (
              <HomeTaskPeople
                userId={user.id}
                homeId={selectedHomeId === 'all' ? null : selectedHomeId}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Assignment Window */}
      <Dialog open={showAssignWindow} onOpenChange={setShowAssignWindow}>
        <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
          <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-lg md:text-xl font-bold">Assign Tasks</DialogTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowAssignWindow(false)} 
                className="h-7 px-2 text-[9px] md:text-xs"
              >
                Close
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
            {user && (
              <HomeTaskAssignment
                userId={user.id}
                homeId={selectedHomeId === 'all' ? null : selectedHomeId}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
