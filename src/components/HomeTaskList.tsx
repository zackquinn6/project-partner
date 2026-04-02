import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMembership } from "@/contexts/MembershipContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Home as HomeIcon, X, GripVertical, List, ListOrdered, ShoppingCart, Users, Link2, Bell } from "lucide-react";
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
import { ProjectPortfolioRemindersDialog } from "@/components/ProjectPortfolioRemindersDialog";
import { useNavigate } from "react-router-dom";
import { WorkspaceSubViewHeader } from "@/components/WorkspaceSubViewHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import type { ProjectRun } from "@/interfaces/ProjectRun";
import { isRiskFocusRun } from "@/utils/projectRunRiskFocus";

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

/** Format decimal hours as "h:mm" for duration display (no seconds). */
function decimalHoursToHhMm(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "";
  const h = Math.floor(value);
  const m = Math.round((value - h) * 60);
  return `${h}:${m.toString().padStart(2, "0")}`;
}

export function HomeTaskList({
  open,
  onOpenChange,
  embedded = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embedded?: boolean;
}) {
  const { user } = useAuth();
  const { hasProjectsTier, hasRiskLessTier, loading: membershipLoading } = useMembership();
  const navigate = useNavigate();
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
  const [showPortfolioReminders, setShowPortfolioReminders] = useState(false);
  const isMobileTaskForm = useIsMobile();
  /** Mobile new-task only: name + due on top; other fields in accordion (avoids duplicate drag-drop trees). */
  const compactNewTaskMobile = isMobileTaskForm && !editingTask;
  const [linkedProjectUpgradeOpen, setLinkedProjectUpgradeOpen] = useState(false);
  const [linkedProjectUpgradeFeature, setLinkedProjectUpgradeFeature] = useState('Projects membership');
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
    estimated_hours: string;
  }>({
    title: "",
    priority: "medium",
    status: "open",
    diy_level: "intermediate",
    notes: "",
    due_date: "",
    estimated_hours: "",
  });

  const [subtasksByTaskId, setSubtasksByTaskId] = useState<Record<string, Array<{ task_id: string; estimated_hours: number | null; completed: boolean }>>>({});
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);

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
    if ((open || embedded) && user) {
      void (async () => {
        const homesResult = await fetchHomes();
        if (!homesResult.ok) return;
        await fetchTasks(
          "tasksHomeId" in homesResult ? homesResult.tasksHomeId : undefined
        );
      })();
    }
  }, [open, embedded, user]);

  useEffect(() => {
    if (selectedHomeId) {
      void fetchTasks();
    }
  }, [selectedHomeId]);

  const fetchHomes = async (): Promise<
    { ok: false } | { ok: true; tasksHomeId: string } | { ok: true }
  > => {
    if (!user) return { ok: false };
    const { data, error } = await supabase
      .from("homes")
      .select("id, name")
      .eq("user_id", user.id)
      .order("is_primary", { ascending: false });

    if (error) {
      console.error("Error loading homes:", error);
      const msg = error.message ?? "";
      const code = "code" in error ? String((error as { code?: string }).code) : "";
      setDataLoadError(
        msg === "Failed to fetch" || code === ""
          ? "Cannot reach the backend. Check your internet connection, VPN, and firewall. Try opening your Supabase project URL in the browser to confirm it loads."
          : msg
      );
      return { ok: false };
    }

    if (data) {
      setHomes(data);
      if (data.length > 0) {
        const firstId = data[0].id;
        setSelectedHomeId(firstId);
        return { ok: true, tasksHomeId: firstId };
      }
    }
    return { ok: true };
  };

  const fetchTasks = async (homeIdOverride?: string | null): Promise<boolean> => {
    if (!user) return false;

    const effectiveHomeId =
      homeIdOverride !== undefined ? homeIdOverride : selectedHomeId;

    let query = supabase
      .from("home_tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (effectiveHomeId && effectiveHomeId !== "all") {
      query = query.eq("home_id", effectiveHomeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading home_tasks:", error);
      const msg = error.message ?? "";
      const code = "code" in error ? String((error as { code?: string }).code) : "";
      setDataLoadError(
        msg === "Failed to fetch" || code === ""
          ? "Cannot reach the backend. Check your internet connection, VPN, and firewall. Try opening your Supabase project URL in the browser to confirm it loads."
          : msg
      );
      return false;
    }

    setDataLoadError(null);
    if (data) {
      setTasks(data as HomeTask[]);
    }
    return true;
  };

  const handleSubmit = async (onCreated?: (task: HomeTask) => void) => {
    if (!user || !formData.title.trim()) {
      return;
    }

    if (!selectedHomeId || selectedHomeId === 'all') {
      return;
    }

    const hasSubtasks = subtasks.filter(st => st.title.trim()).length > 0;

    let estimatedHoursValue: number | null = null;
    if (!hasSubtasks && formData.estimated_hours.trim().length > 0) {
      const trimmed = formData.estimated_hours.trim();
      const [hh, mm = "0"] = trimmed.split(':');
      const hours = Number(hh ?? "0");
      const minutes = Number(mm ?? "0");
      if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
        estimatedHoursValue = hours + minutes / 60;
      }
    }

    const taskData = {
      title: formData.title,
      priority: formData.priority,
      status: formData.status,
      diy_level: formData.diy_level,
      notes: formData.notes,
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

        // Delete existing materials and insert new ones (skip if task_shopping_list table missing)
        const { error: deleteMaterialsError } = await supabase.from('task_shopping_list').delete().eq('task_id', editingTask.id);
        if (deleteMaterialsError && deleteMaterialsError.code !== 'PGRST205') throw deleteMaterialsError;
        
        if (materials.length > 0 && deleteMaterialsError?.code !== 'PGRST205') {
          const materialsToInsert = materials.filter(m => m.material_name.trim()).map(m => ({
            task_id: editingTask.id,
            user_id: user.id,
            material_name: m.material_name,
            quantity: m.quantity || 1,
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

        // Insert materials if any (skip if task_shopping_list table missing)
        if (materials.length > 0 && newTask) {
          const materialsToInsert = materials.filter(m => m.material_name.trim()).map(m => ({
            task_id: newTask.id,
            user_id: user.id,
            material_name: m.material_name,
            quantity: m.quantity || 1,
          }));
          
          if (materialsToInsert.length > 0) {
            const { error: materialError } = await supabase
              .from('task_shopping_list')
              .insert(materialsToInsert);
            if (materialError && materialError.code !== 'PGRST205') throw materialError;
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

  const resetForm = () => {
    setFormData({
      title: "",
      priority: "medium",
      status: "open",
      diy_level: "intermediate",
      notes: "",
      due_date: "",
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
      estimated_hours: task.estimated_hours == null ? "" : decimalHoursToHhMm(task.estimated_hours),
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

  /** Open a linked project run in the workspace; respects Risk-less vs Projects membership (manual entries always allowed). */
  const tryOpenLinkedProjectRun = async (projectRunId: string) => {
    if (membershipLoading) return;

    const { data, error } = await supabase
      .from('project_runs')
      .select('customization_decisions, is_manual_entry')
      .eq('id', projectRunId)
      .maybeSingle();

    if (error || !data) {
      onOpenChange(false);
      navigate('/', { state: { view: 'user', projectRunId } });
      return;
    }

    const stub = {
      customization_decisions: data.customization_decisions,
      isManualEntry: Boolean(data.is_manual_entry),
    } as ProjectRun;

    if (stub.isManualEntry) {
      onOpenChange(false);
      navigate('/', { state: { view: 'user', projectRunId } });
      return;
    }

    if (isRiskFocusRun(stub)) {
      if (!hasRiskLessTier) {
        setLinkedProjectUpgradeFeature('Risk-Less');
        setLinkedProjectUpgradeOpen(true);
        return;
      }
    } else if (!hasProjectsTier) {
      setLinkedProjectUpgradeFeature('Projects membership');
      setLinkedProjectUpgradeOpen(true);
      return;
    }

    onOpenChange(false);
    navigate('/', { state: { view: 'user', projectRunId } });
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

  const handleMainOpenChange = (isOpen: boolean) => {
    if (!isOpen && showRapidCosting) {
      return;
    }
    onOpenChange(isOpen);
  };

  const tryCloseFromChrome = () => {
    if (showRapidCosting) return;
    onOpenChange(false);
  };

  const workspaceHeader = (
    <WorkspaceSubViewHeader
      compactMobile
      mobileTwoRowHomeControls
      screenTitle="Project & Task Manager"
      screenIcon={<List className="h-4 w-4 md:h-[18px] md:w-[18px]" aria-hidden />}
      helpTitle="About Project & Task Manager"
      helpBody="Project & Task Manager includes both projects and tasks. Complex projects should be linked to allow for detailed project management. All tasks can have tracking of sub-tasks, materials shopping list, and budgeting."
      onGoToWorkspace={tryCloseFromChrome}
      homes={homes}
      selectedHomeId={selectedHomeId}
      onHomeChange={setSelectedHomeId}
      onOpenHomeManager={() => setShowHomeManager(true)}
      showReminders
      onOpenReminders={() => setShowPortfolioReminders(true)}
    />
  );

  const connectionProblemBanner =
    dataLoadError ? (
      <Alert variant="destructive" className="mx-2 mt-1 shrink-0 md:mx-4 md:mt-2">
        <AlertTitle>Connection problem</AlertTitle>
        <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <span>{dataLoadError}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 border-destructive/40"
            onClick={() => {
              void (async () => {
                const homesResult = await fetchHomes();
                if (!homesResult.ok) return;
                await fetchTasks(
                  "tasksHomeId" in homesResult ? homesResult.tasksHomeId : undefined
                );
              })();
            }}
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    ) : null;

  const renderSubtasksAndMaterials = () => (
    <>
      <div className="space-y-2 border-t pt-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium">Subtasks</label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={subtasksOrdered ? "default" : "outline"}
              size="sm"
              onClick={() => setSubtasksOrdered(!subtasksOrdered)}
              className="h-7 text-xs"
              aria-pressed={subtasksOrdered}
              title={subtasksOrdered ? "Subtasks are ordered (toggle to unordered)" : "Subtasks are unordered (toggle to ordered)"}
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
    </>
  );

  const taskManagerTabs = (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-shrink-0 border-b border-border/60 bg-background/95 px-2 pb-1 pt-0 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6 md:pb-1.5 md:pt-0">
                <div className="overflow-hidden">
                  <TabsList className="w-full inline-flex h-8 md:h-9 p-0.5 gap-0.5 md:gap-1 bg-muted/50 rounded-full">
                    <TabsTrigger value="tasks" className="text-[11px] md:text-xs px-2 md:px-3 py-1.5 rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1 min-w-0 truncate">
                      Tasks
                    </TabsTrigger>
                    <TabsTrigger value="shopping" className="text-[11px] md:text-xs px-2 md:px-3 py-1.5 rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1 min-w-0 truncate">
                      Shopping
                    </TabsTrigger>
                    {user ? (
                      <TabsTrigger value="schedule" className="text-[11px] md:text-xs px-2 md:px-3 py-1.5 rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1 min-w-0 truncate">
                        Schedule
                      </TabsTrigger>
                    ) : null}
                  </TabsList>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-background to-muted/30 px-2 pb-2 pt-0 md:px-6 md:pb-4 md:pt-0">
                <TabsContent value="tasks" className="mt-0 flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden md:gap-3">
                  <div className="shrink-0 space-y-0.5 md:space-y-3">
                  {/* Project Dashboard metrics (Project & Task Manager) */}
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
                      <div className="space-y-0 md:space-y-3">
                        {/* Desktop: Open/Done cards + expandable metrics (hidden on mobile) */}
                        <div className="hidden md:flex md:flex-wrap md:items-start md:gap-2">
                          <div className="flex shrink-0 gap-2">
                            <Card className="w-[5.75rem] shrink-0 border-border/60 shadow-sm">
                              <CardContent className="px-2.5 py-2">
                                <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground leading-none">
                                  Open
                                </div>
                                <div className="text-lg font-bold tabular-nums leading-none mt-1">{openTasks.length}</div>
                              </CardContent>
                            </Card>
                            <Card className="w-[5.75rem] shrink-0 border-border/60 shadow-sm">
                              <CardContent className="px-2.5 py-2">
                                <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground leading-none">
                                  Done
                                </div>
                                <div className="text-lg font-bold tabular-nums leading-none mt-1">{completedTasks.length}</div>
                              </CardContent>
                            </Card>
                          </div>
                          <div className="min-w-0 flex-1 basis-[min(100%,20rem)]">
                            <Accordion type="single" collapsible className="w-full">
                              <AccordionItem
                                value="other-metrics"
                                className="rounded-lg border border-border/60 bg-background/80 shadow-sm border-b-0"
                              >
                                <AccordionTrigger className="px-3 py-2.5 text-xs hover:no-underline [&[data-state=open]>svg]:rotate-180">
                                  View metrics
                                </AccordionTrigger>
                                <AccordionContent className="px-3 pb-3 pt-0 text-xs">
                                  <div className="grid grid-cols-1 gap-2 min-[520px]:grid-cols-2 min-w-0">
                                    <Card className="min-w-0 border-border/60 shadow-sm overflow-hidden">
                                      <CardContent className="p-3 space-y-2">
                                        <div className="text-[11px] font-medium text-muted-foreground">Completed tasks</div>
                                        <div className="grid grid-cols-3 gap-1.5 text-center min-w-0">
                                          <div className="min-w-0 px-0.5">
                                            <div className="text-base font-semibold tabular-nums">{completedLast7}</div>
                                            <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">Last 7d</div>
                                          </div>
                                          <div className="min-w-0 px-0.5">
                                            <div className="text-base font-semibold tabular-nums">{completedLast30}</div>
                                            <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">Last 30d</div>
                                          </div>
                                          <div className="min-w-0 px-0.5">
                                            <div className="text-base font-semibold tabular-nums">{completedTasks.length}</div>
                                            <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">All time</div>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>

                                    <Card className="min-w-0 border-border/60 shadow-sm overflow-hidden">
                                      <CardContent className="p-3 space-y-1">
                                        <div className="text-[11px] font-medium text-muted-foreground">Overdue tasks</div>
                                        <div className="text-xl font-bold tabular-nums leading-none">{overdueTasks}</div>
                                      </CardContent>
                                    </Card>

                                    <Card className="min-w-0 border-border/60 shadow-sm overflow-hidden">
                                      <CardContent className="p-3 space-y-2">
                                        <div className="text-[11px] font-medium text-muted-foreground">Open by priority</div>
                                        <div className="grid grid-cols-3 gap-1.5 text-center min-w-0">
                                          <div className="min-w-0 px-0.5">
                                            <div className="text-base font-semibold tabular-nums">{openByPriority.high ?? 0}</div>
                                            <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">High</div>
                                          </div>
                                          <div className="min-w-0 px-0.5">
                                            <div className="text-base font-semibold tabular-nums">{openByPriority.medium ?? 0}</div>
                                            <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">Med</div>
                                          </div>
                                          <div className="min-w-0 px-0.5">
                                            <div className="text-base font-semibold tabular-nums">{openByPriority.low ?? 0}</div>
                                            <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">Low</div>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>

                                    <Card className="min-w-0 border-border/60 shadow-sm overflow-hidden">
                                      <CardContent className="p-3 space-y-2">
                                        <div className="text-[11px] font-medium text-muted-foreground">Open by level</div>
                                        <div className="grid grid-cols-2 min-[640px]:grid-cols-4 gap-x-2 gap-y-2 text-center min-w-0">
                                          <div className="min-w-0 px-0.5">
                                            <div className="text-base font-semibold tabular-nums">{openByLevel.beginner ?? 0}</div>
                                            <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">Beginner</div>
                                          </div>
                                          <div className="min-w-0 px-0.5">
                                            <div className="text-base font-semibold tabular-nums">{openByLevel.intermediate ?? 0}</div>
                                            <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">Intermediate</div>
                                          </div>
                                          <div className="min-w-0 px-0.5">
                                            <div className="text-base font-semibold tabular-nums">{openByLevel.advanced ?? 0}</div>
                                            <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">Advanced</div>
                                          </div>
                                          <div className="min-w-0 px-0.5">
                                            <div className="text-base font-semibold tabular-nums">{openByLevel.pro ?? 0}</div>
                                            <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">Pro</div>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>

                                    <Card className="min-w-0 border-border/60 shadow-sm overflow-hidden">
                                      <CardContent className="p-3 space-y-1">
                                        <div className="text-[11px] font-medium text-muted-foreground">Active projects</div>
                                        <div className="text-xl font-bold tabular-nums leading-none">{activeProjects}</div>
                                        <div className="text-[10px] text-muted-foreground leading-snug">Tasks linked to a project</div>
                                      </CardContent>
                                    </Card>

                                    <Card className="min-w-0 border-border/60 shadow-sm overflow-hidden">
                                      <CardContent className="p-3 space-y-1">
                                        <div className="text-[11px] font-medium text-muted-foreground">Est. hours left</div>
                                        <div className="text-xl font-bold tabular-nums leading-none">{remainingHours.toFixed(1)}h</div>
                                        {missingHoursCount > 0 && (
                                          <div className="text-[10px] text-muted-foreground leading-snug">
                                            + {missingHoursCount} without hours
                                          </div>
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
                      <CardContent className="pt-3 pb-3 space-y-3">
                        {compactNewTaskMobile ? (
                          <>
                            <div className="space-y-2">
                              <div className="space-y-1">
                                <Label htmlFor="home-new-task-name" className="text-xs font-medium">
                                  Name
                                </Label>
                                <Input
                                  id="home-new-task-name"
                                  placeholder="Required"
                                  value={formData.title}
                                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                  className="h-9 text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="home-new-task-due" className="text-xs font-medium">
                                  Due date
                                </Label>
                                <Input
                                  id="home-new-task-due"
                                  type="date"
                                  value={formData.due_date}
                                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                  className="h-9 text-sm"
                                />
                              </div>
                            </div>
                            <Accordion type="single" collapsible className="rounded-md border border-border/80">
                              <AccordionItem value="more" className="border-0">
                                <AccordionTrigger className="px-3 py-2.5 text-sm font-medium hover:no-underline">
                                  More Settings
                                </AccordionTrigger>
                                <AccordionContent className="space-y-3 px-3 pb-3 pt-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="min-w-0">
                                      <label className="mb-1 block text-xs font-medium">Priority</label>
                                      <Select value={formData.priority} onValueChange={(val) => setFormData({ ...formData, priority: val as any })}>
                                        <SelectTrigger className="h-8 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="high">High</SelectItem>
                                          <SelectItem value="medium">Medium</SelectItem>
                                          <SelectItem value="low">Low</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="min-w-0">
                                      <label className="mb-1 block text-xs font-medium">DIY Level</label>
                                      <Select value={formData.diy_level} onValueChange={(val) => setFormData({ ...formData, diy_level: val as any })}>
                                        <SelectTrigger className="h-8 text-xs">
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
                                  <div className="min-w-0">
                                    <label className="mb-1 block text-xs font-medium">Estimated duration</label>
                                    {subtasks.length > 0 ? (
                                      <div className="flex h-8 items-center text-xs text-muted-foreground">
                                        N/A (using sub-task hours)
                                      </div>
                                    ) : (
                                      <Input
                                        type="text"
                                        placeholder="0:00"
                                        value={formData.estimated_hours}
                                        onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                                        className="h-8 text-xs"
                                        aria-label="Duration in hours and minutes, e.g. 1:30"
                                      />
                                    )}
                                  </div>
                                  <Textarea
                                    placeholder="Notes (optional)"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="min-h-[60px] text-xs"
                                  />
                                  {renderSubtasksAndMaterials()}
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          </>
                        ) : (
                          <>
                            <Input
                              placeholder="Task title *"
                              value={formData.title}
                              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                              className="h-8 text-xs"
                            />
                            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                              <div className="min-w-0">
                                <label className="mb-1 block text-xs font-medium">Priority</label>
                                <Select value={formData.priority} onValueChange={(val) => setFormData({ ...formData, priority: val as any })}>
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="min-w-0">
                                <label className="mb-1 block text-xs font-medium">DIY Level</label>
                                <Select value={formData.diy_level} onValueChange={(val) => setFormData({ ...formData, diy_level: val as any })}>
                                  <SelectTrigger className="h-8 text-xs">
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
                              <div className="min-w-0">
                                <label className="mb-1 block text-xs font-medium">Due Date</label>
                                <Input
                                  type="date"
                                  value={formData.due_date}
                                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div className="min-w-0">
                                <label className="mb-1 block text-xs font-medium">Estimated duration</label>
                                {subtasks.length > 0 ? (
                                  <div className="flex h-8 items-center text-xs text-muted-foreground">
                                    N/A (using sub-task hours)
                                  </div>
                                ) : (
                                  <Input
                                    type="text"
                                    placeholder="0:00"
                                    value={formData.estimated_hours}
                                    onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                                    className="h-8 text-xs"
                                    aria-label="Duration in hours and minutes, e.g. 1:30"
                                  />
                                )}
                              </div>
                            </div>

                            <Textarea
                              placeholder="Notes (optional)"
                              value={formData.notes}
                              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                              className="min-h-[60px] text-xs"
                            />

                            {renderSubtasksAndMaterials()}
                          </>
                        )}

                        <div className="flex flex-wrap justify-end gap-2">
                          {editingTask?.project_run_id && (
                            <div className="w-full flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                Linked project: <span className="font-medium text-foreground">{editingTask.project_run_id}</span>
                              </span>
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => {
                              if (editingTask) {
                                handleRapidCosting(editingTask);
                              } else {
                                void handleSubmit((task) => {
                                  setSelectedTask(task);
                                  setShowRapidCosting(true);
                                });
                              }
                            }}
                            disabled={!formData.title.trim() || !selectedHomeId || selectedHomeId === 'all'}
                          >
                            <span className="mr-1 text-[13px] font-medium">$</span>
                            Budget
                          </Button>
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
                            {editingTask?.project_run_id ? 'Edit Link to Project' : 'Link task to project'}
                          </Button>
                          {editingTask?.project_run_id && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => {
                                if (editingTask.project_run_id) {
                                  void tryOpenLinkedProjectRun(editingTask.project_run_id);
                                }
                              }}
                            >
                              Open Project
                            </Button>
                          )}
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
                  </div>

                  <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                  <HomeTasksTable
                    tasks={tasks}
                    onEdit={handleEdit}
                    onLinkProject={handleLinkProject}
                    onRapidCosting={handleRapidCosting}
                    onAddTask={() => {
                      resetForm();
                      setShowAddTask(true);
                    }}
                    onProjectNavigate={() => onOpenChange(false)}
                    onOpenLinkedProjectRun={(id) => void tryOpenLinkedProjectRun(id)}
                    onTaskUpdate={fetchTasks}
                  />
                  </div>
                </TabsContent>

                <TabsContent value="shopping" className="mt-0 flex min-h-0 flex-1 flex-col overflow-auto">
                  <ShoppingListManager />
                </TabsContent>

                {user ? (
                  <TabsContent value="schedule" className="mt-0 flex min-h-0 flex-1 flex-col space-y-4 overflow-auto">
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
                ) : null}
              </div>
            </Tabs>
  );

  return (
    <>
      {embedded ? (
        <div className="flex h-full max-h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
          <p className="sr-only">
            Project & Task Manager for tasks, projects, sub-tasks, shopping list, and budgeting.
          </p>
          {workspaceHeader}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {connectionProblemBanner}
            {taskManagerTabs}
          </div>
        </div>
      ) : (
        <Dialog open={open} onOpenChange={handleMainOpenChange}>
          <DialogContent className="flex h-screen max-h-full w-full max-w-full flex-col overflow-hidden p-0 md:h-[calc(100dvh-1.5rem)] md:max-h-[calc(100dvh-1.5rem)] md:max-w-[90vw] md:rounded-lg [&>button]:hidden">
            <DialogTitle className="sr-only">Project & Task Manager</DialogTitle>
            <DialogDescription className="sr-only">
              Project & Task Manager for tasks, projects, sub-tasks, shopping list, and budgeting.
            </DialogDescription>
            {workspaceHeader}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {connectionProblemBanner}
              {taskManagerTabs}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <HomeManager
        open={showHomeManager}
        onOpenChange={setShowHomeManager}
        selectedHomeId={null}
        onHomeSelected={() => fetchHomes()}
        showSelector={false}
      />

      <UpgradePrompt
        open={linkedProjectUpgradeOpen}
        onOpenChange={setLinkedProjectUpgradeOpen}
        feature={linkedProjectUpgradeFeature}
      />

      <ProjectPortfolioRemindersDialog
        open={showPortfolioReminders}
        onOpenChange={setShowPortfolioReminders}
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
            // Only close the Rapid Costing dialog, prevent propagation to Project & Task Manager
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
