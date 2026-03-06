import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useResponsive } from '@/hooks/useResponsive';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Home, Plus, Calendar, Clock, AlertTriangle, CheckCircle, Trash2, FileText, Pencil, HelpCircle, ImageIcon, Wrench, ListTodo, History, Bell } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { AddMaintenanceTaskDialog } from './AddMaintenanceTaskDialog';
import { TaskCompletionDialog } from './TaskCompletionDialog';
import { MaintenanceHistoryTab } from './MaintenanceHistoryTab';
import { MaintenancePdfPrinter } from './MaintenancePdfPrinter';
import { MaintenanceNotifications } from './MaintenanceNotifications';
import { MaintenanceDashboard, getSystemForCategory, SYSTEM_CONFIG, type SystemKey } from './MaintenanceDashboard';
import { HomeManager } from './HomeManager';
import { MaintenancePhotosWindow } from './MaintenancePhotosWindow';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
interface MaintenanceTask {
  id: string;
  user_id: string;
  home_id: string;
  template_id?: string;
  title: string;
  description: string | null;
  summary: string | null;
  instructions: string | null;
  category: string;
  frequency_days: number;
  last_completed: string | null;
  next_due: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  risks_of_skipping?: string | null;
  benefits_of_maintenance?: string | null;
  criticality?: number | null;
  repair_cost_savings?: string | null;
  progress_percentage?: number | null;
}
interface MaintenanceCompletion {
  id: string;
  task_id: string;
  completed_at: string;
  scheduled_due_date?: string;
  notes?: string;
  photo_url?: string;
  task: {
    title: string;
    category: string;
  };
}
interface Home {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
}
interface HomeMaintenanceWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EditMaintenanceTaskFormProps {
  task: MaintenanceTask;
  onClose: () => void;
  onUpdated: () => void;
  onDelete: () => void;
}

function computedProgress(task: MaintenanceTask): number {
  if (task.progress_percentage != null) return Math.max(0, task.progress_percentage);
  if (!task.last_completed) return 0;
  const totalDays = task.frequency_days;
  const daysSinceCompletion = differenceInDays(new Date(), new Date(task.last_completed));
  return Math.max(0, (daysSinceCompletion / totalDays) * 100);
}

const EditMaintenanceTaskForm: React.FC<EditMaintenanceTaskFormProps> = ({ task, onClose, onUpdated, onDelete }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: task.title,
    description: task.description || '',
    summary: task.summary ?? '',
    instructions: task.instructions ?? '',
    category: task.category,
    frequency_days: task.frequency_days,
    risks_of_skipping: task.risks_of_skipping ?? '',
    benefits_of_maintenance: task.benefits_of_maintenance ?? '',
    criticality: task.criticality ?? 2,
    repair_cost_savings: task.repair_cost_savings ?? '',
    progress_percentage: task.progress_percentage ?? computedProgress(task),
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user || !form.title.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_maintenance_tasks')
        .update({
          title: form.title.trim(),
          description: form.description.trim() || null,
          summary: form.summary.trim() || null,
          instructions: form.instructions.trim() || null,
          category: form.category,
          frequency_days: form.frequency_days,
          risks_of_skipping: form.risks_of_skipping.trim() || null,
          benefits_of_maintenance: form.benefits_of_maintenance.trim() || null,
          criticality: form.criticality,
          repair_cost_savings: form.repair_cost_savings.trim() || null,
          progress_percentage: form.progress_percentage,
        })
        .eq('id', task.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Task updated',
        description: 'Maintenance task details have been updated.',
      });

      onUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating maintenance task:', error);
      toast({
        title: 'Error',
        description: 'Failed to update maintenance task',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const repairSavingsNum = form.repair_cost_savings.trim() === '' ? '' : parseInt(form.repair_cost_savings, 10);
  const repairSavingsValid = form.repair_cost_savings.trim() === '' || (Number.isInteger(repairSavingsNum) && repairSavingsNum >= 0);

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex-1 min-h-0 overflow-y-auto pl-4 pr-2">
        <div className="grid gap-2 pb-6">
        <div>
          <Label htmlFor="edit-title">Task title</Label>
          <Input
            id="edit-title"
            value={form.title}
            onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="edit-description">Description</Label>
          <Textarea
            id="edit-description"
            rows={2}
            className="min-h-0 resize-y"
            value={form.description}
            onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="edit-summary">Summary (shown in table)</Label>
          <Textarea
            id="edit-summary"
            rows={2}
            className="min-h-0 resize-y"
            value={form.summary}
            onChange={(e) => setForm(prev => ({ ...prev, summary: e.target.value }))}
            placeholder="Short one-line overview"
          />
        </div>
        <div>
          <Label htmlFor="edit-instructions">Instructions (shown when task is opened)</Label>
          <Textarea
            id="edit-instructions"
            rows={2}
            className="min-h-0 resize-y"
            value={form.instructions}
            onChange={(e) => setForm(prev => ({ ...prev, instructions: e.target.value }))}
            placeholder="Step-by-step instructions"
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div className="min-w-0">
            <Label htmlFor="edit-category">Category</Label>
            <Select
              value={form.category}
              onValueChange={(value) => setForm(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger id="edit-category" className="w-full min-w-0 max-w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-w-[var(--radix-select-trigger-width)]">
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="appliances">Appliances</SelectItem>
                <SelectItem value="electrical">Electrical</SelectItem>
                <SelectItem value="exterior">Exterior</SelectItem>
                <SelectItem value="hvac">HVAC</SelectItem>
                <SelectItem value="interior">Interior</SelectItem>
                <SelectItem value="landscaping">Landscaping</SelectItem>
                <SelectItem value="outdoor">Outdoor</SelectItem>
                <SelectItem value="plumbing">Plumbing</SelectItem>
                <SelectItem value="roof">Roof</SelectItem>
                <SelectItem value="safety">Safety</SelectItem>
                <SelectItem value="security">Security</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0">
            <Label htmlFor="edit-criticality">Criticality</Label>
            <Select
              value={String(form.criticality)}
              onValueChange={(v) => setForm(prev => ({ ...prev, criticality: parseInt(v, 10) as 1 | 2 | 3 }))}
            >
              <SelectTrigger id="edit-criticality" className="w-full min-w-0 max-w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-w-[var(--radix-select-trigger-width)]">
                <SelectItem value="1">Low</SelectItem>
                <SelectItem value="2">Medium</SelectItem>
                <SelectItem value="3">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 max-w-[8rem]">
            <Label htmlFor="edit-frequency" className="whitespace-nowrap">Frequency (days)</Label>
            <Input
              id="edit-frequency"
              type="number"
              min={1}
              max={3650}
              className="w-full min-w-0 max-w-full"
              value={form.frequency_days}
              onChange={(e) =>
                setForm(prev => ({
                  ...prev,
                  frequency_days: parseInt(e.target.value, 10) || prev.frequency_days,
                }))
              }
            />
          </div>
          <div className="min-w-0">
            <Label htmlFor="edit-repair-savings">Repair cost savings ($)</Label>
            <Input
              id="edit-repair-savings"
              type="number"
              min={0}
              step={1}
              className="w-full min-w-0"
              value={form.repair_cost_savings}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  setForm(prev => ({ ...prev, repair_cost_savings: '' }));
                  return;
                }
                const v = parseInt(raw, 10);
                if (!Number.isNaN(v) && v >= 0) setForm(prev => ({ ...prev, repair_cost_savings: String(v) }));
              }}
              placeholder="0"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="edit-progress">Current progress (% toward due)</Label>
          <div className="flex items-center gap-3 mt-1">
            <Slider
              id="edit-progress"
              min={0}
              max={200}
              step={1}
              value={[Math.min(200, form.progress_percentage)]}
              onValueChange={([v]) => setForm(prev => ({ ...prev, progress_percentage: v }))}
              className="flex-1"
            />
            <Input
              type="number"
              min={0}
              max={9999}
              className="w-24 h-8 text-center shrink-0"
              value={form.progress_percentage}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!Number.isNaN(v)) setForm(prev => ({ ...prev, progress_percentage: Math.max(0, Math.min(9999, v)) }));
              }}
            />
            <span className="text-xs text-muted-foreground shrink-0 w-4">%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Override progress (0 = just started, 100 = due, &gt;100 = overdue).</p>
        </div>
        <div>
          <Label htmlFor="edit-risks">Risks of skipping</Label>
          <Textarea
            id="edit-risks"
            rows={1}
            className="min-h-0 resize-y"
            placeholder="e.g. Sediment buildup, early failure"
            value={form.risks_of_skipping}
            onChange={(e) => setForm(prev => ({ ...prev, risks_of_skipping: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="edit-benefits">Benefits of maintenance</Label>
          <Textarea
            id="edit-benefits"
            rows={1}
            className="min-h-0 resize-y"
            placeholder="e.g. Extend life from 10 to 20 yrs"
            value={form.benefits_of_maintenance}
            onChange={(e) => setForm(prev => ({ ...prev, benefits_of_maintenance: e.target.value }))}
          />
        </div>
        </div>
      </div>
      <div className="flex justify-between gap-2 pt-2 border-t shrink-0 bg-background px-4">
        <Button variant="destructive" onClick={onDelete} className="mr-auto">
          <Trash2 className="h-4 w-4 mr-1" />
          Delete task
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !form.title.trim() || !repairSavingsValid}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};
export const HomeMaintenanceWindow: React.FC<HomeMaintenanceWindowProps> = ({
  open,
  onOpenChange
}) => {
  const {
    user
  } = useAuth();
  const [homes, setHomes] = useState<Home[]>([]);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHomeId, setSelectedHomeId] = useState<string>('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);
  const [systemFilter, setSystemFilter] = useState<SystemKey | 'all'>('all');
  const [completions, setCompletions] = useState<MaintenanceCompletion[]>([]);
  const [swipedTaskId, setSwipedTaskId] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState<number>(0);
  const [touchEnd, setTouchEnd] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('date-desc');
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState<string>('all');
  const [showAlerts, setShowAlerts] = useState(false);
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<MaintenanceTask | null>(null);
  const [taskBeingEdited, setTaskBeingEdited] = useState<MaintenanceTask | null>(null);
  const [showHomeManager, setShowHomeManager] = useState(false);
  const [showMaintenancePhotos, setShowMaintenancePhotos] = useState(false);
  const {
    isMobile
  } = useResponsive();
  useEffect(() => {
    if (open && user) {
      fetchHomes();
    }
  }, [open, user]);
  useEffect(() => {
    if (selectedHomeId && user) {
      fetchTasks();
      fetchCompletions();
    }
  }, [selectedHomeId, user]);
  const fetchHomes = async () => {
    if (!user) return;
    try {
      const {
        data,
        error
      } = await supabase.from('homes').select('id, name, address, city, state').eq('user_id', user.id).order('is_primary', {
        ascending: false
      });
      if (error) throw error;
      setHomes(data || []);
      if (data && data.length > 0 && !selectedHomeId) {
        setSelectedHomeId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching homes:', error);
    }
  };
  const fetchTasks = async () => {
    if (!user || !selectedHomeId) return;
    setLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.from('user_maintenance_tasks').select('*').eq('user_id', user.id).eq('home_id', selectedHomeId).eq('is_active', true).order('next_due', {
        ascending: true
      });
      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };
  const fetchCompletions = async () => {
    if (!user || !selectedHomeId) return;
    try {
      const {
        data,
        error
      } = await supabase.from('maintenance_completions').select(`
          id,
          task_id,
          completed_at,
          scheduled_due_date,
          notes,
          photo_url,
          user_maintenance_tasks!inner (
            title,
            category,
            home_id
          )
        `).eq('user_id', user.id).eq('user_maintenance_tasks.home_id', selectedHomeId).order('completed_at', {
        ascending: false
      });
      if (error) throw error;

      // Transform the data structure
      const transformedData = data?.map(completion => ({
        id: completion.id,
        task_id: completion.task_id,
        completed_at: completion.completed_at,
        scheduled_due_date: completion.scheduled_due_date ?? undefined,
        notes: completion.notes,
        photo_url: completion.photo_url,
        task: {
          title: completion.user_maintenance_tasks.title,
          category: completion.user_maintenance_tasks.category
        }
      })) || [];
      setCompletions(transformedData);
    } catch (error) {
      console.error('Error fetching completion history:', error);
    }
  };
  const getTaskProgress = (task: MaintenanceTask) => {
    if (task.progress_percentage != null) return Math.max(0, task.progress_percentage);
    if (!task.last_completed) return 0;
    const lastCompleted = new Date(task.last_completed);
    const now = new Date();
    const totalDays = task.frequency_days;
    const daysSinceCompletion = differenceInDays(now, lastCompleted);
    return Math.max(0, (daysSinceCompletion / totalDays) * 100);
  };
  const getProgressBarColor = (progress: number) =>
    progress >= 100 ? 'bg-destructive' : progress >= 91 ? 'bg-amber-500' : 'bg-emerald-600';
  const getTaskStatus = (task: MaintenanceTask) => {
    const dueDate = new Date(task.next_due);
    const now = new Date();
    const daysUntilDue = differenceInDays(dueDate, now);
    if (daysUntilDue < 0) {
      return {
        status: 'overdue',
        color: 'destructive',
        icon: AlertTriangle
      };
    } else if (daysUntilDue <= 7) {
      return {
        status: 'due-soon',
        color: 'secondary',
        icon: Clock
      };
    } else {
      return {
        status: 'upcoming',
        color: 'default',
        icon: CheckCircle
      };
    }
  };
  const handleTaskComplete = (task: MaintenanceTask) => {
    setSelectedTask(task);
  };
  const handleTaskCompleted = () => {
    fetchTasks(); // Refresh tasks after completion
    fetchCompletions(); // Refresh completions after completion
    setSelectedTask(null);
  };
  const handleDeleteTask = async (taskId: string) => {
    if (!user) return;
    try {
      const {
        error
      } = await supabase.from('user_maintenance_tasks').delete().eq('id', taskId).eq('user_id', user.id);
      if (error) throw error;
      fetchTasks(); // Refresh tasks after deletion
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };
  const getFilteredTasks = () => {
    let list = systemFilter === 'all' ? tasks : tasks.filter(task => getSystemForCategory(task.category) === systemFilter);
    return [...list].sort((a, b) => new Date(a.next_due).getTime() - new Date(b.next_due).getTime());
  };

  const historyCategories = ['appliances', 'electrical', 'exterior', 'general', 'hvac', 'interior', 'landscaping', 'outdoor', 'plumbing', 'roof', 'safety', 'security'];
  const categoryLabels: Record<string, string> = {
    appliances: 'Appliances', electrical: 'Electrical', exterior: 'Exterior', general: 'General',
    hvac: 'HVAC', interior: 'Interior', landscaping: 'Landscaping', outdoor: 'Outdoor',
    plumbing: 'Plumbing', roof: 'Roof', safety: 'Safety', security: 'Security',
  };

  // Touch handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const handleTouchEnd = (taskId: string) => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    if (isLeftSwipe && swipedTaskId !== taskId) {
      setSwipedTaskId(taskId);
    } else if (isRightSwipe || isLeftSwipe && swipedTaskId === taskId) {
      setSwipedTaskId(null);
    }
  };
  return <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
        <div className="flex flex-col h-full max-h-full overflow-hidden">
        {/* Header with title, tooltip, and close button */}
        <div className="px-4 md:px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 md:h-6 md:w-6 text-primary shrink-0" aria-hidden />
            <h2 className="text-lg md:text-xl font-bold">Home Maintenance Tracker</h2>
            <TooltipProvider delayDuration={400}>
              <Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground p-0.5 rounded" aria-label="About this app">
                        <HelpCircle className="h-4 w-4" />
                      </button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p>About this app</p>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent side="bottom" className="max-w-xs" align="start">
                  <p className="font-medium mb-1">About this app</p>
                  <p className="text-sm">Add and manage maintenance tasks, track completions (with optional photos), and view home maintenance health. Use filters and the dashboard to stay on top of due dates and priorities.</p>
                </PopoverContent>
              </Popover>
            </TooltipProvider>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onOpenChange(false)} 
            className="ml-4 flex-shrink-0"
          >
            Close
          </Button>
        </div>
        
        {/* Home Selection - Fixed at top; actions (PDF, Alerts) on far right */}
        <div className="px-3 md:px-6 py-3 shrink-0 bg-background border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={selectedHomeId} onValueChange={setSelectedHomeId}>
                <SelectTrigger className="w-full sm:w-[280px] h-9">
                  <SelectValue placeholder="Select a home" />
                </SelectTrigger>
                <SelectContent className="z-[200] bg-popover border border-border shadow-md">
                  {homes.map(home => (
                    <SelectItem key={home.id} value={home.id} className="cursor-pointer">
                      {home.name} {home.address && `- ${home.address}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 shrink-0"
                onClick={() => setShowHomeManager(true)}
                title="Manage homes"
              >
                <Home className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 ml-auto w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMaintenancePhotos(true)}
                title="View photos from task completions"
                className="gap-1.5"
              >
                <ImageIcon className="h-4 w-4 text-primary" />
                View Photos
              </Button>
              {selectedHomeId && tasks.length > 0 && (
                <MaintenancePdfPrinter
                  tasks={tasks}
                  completions={completions}
                  homeName={homes.find(h => h.id === selectedHomeId)?.name || 'Home'}
                />
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={!selectedHomeId}
                onClick={() => setShowAlerts(true)}
                className="gap-1.5"
              >
                <Bell className="h-4 w-4 text-amber-500" />
                Setup Alerts
              </Button>
            </div>
          </div>
        </div>

            {/* Summary dashboard */}
            {selectedHomeId && tasks.length >= 0 && (
              <MaintenanceDashboard
                tasks={tasks.map(t => ({
                  id: t.id,
                  title: t.title,
                  category: t.category,
                  frequency_days: t.frequency_days,
                  next_due: t.next_due,
                  last_completed: t.last_completed,
                  criticality: t.criticality ?? undefined,
                  progress_percentage: t.progress_percentage ?? undefined,
                }))}
                completions={completions.map(c => ({
                  task_id: c.task_id,
                  completed_at: c.completed_at,
                  task: { category: c.task?.category },
                }))}
              />
            )}

            {/* Tabs - Takes remaining space */}
            {selectedHomeId && <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <Tabs defaultValue="tasks" className="flex flex-col h-full">
                  {/* Tab bar - Fixed at top of tabs area */}
                  <div className="px-3 md:px-6 py-3 bg-background border-b shrink-0">
                    <TabsList className="grid grid-cols-2 w-full h-11 p-1">
                      <TabsTrigger value="tasks" className="text-xs md:text-sm gap-1.5">
                        <ListTodo className="h-3.5 w-3.5" />
                        Active
                      </TabsTrigger>
                      <TabsTrigger value="history" className="text-xs md:text-sm gap-1.5">
                        <History className="h-3.5 w-3.5" />
                        History
                      </TabsTrigger>
                    </TabsList>
                  </div>

                   <TabsContent value="tasks" className="flex-1 min-h-0 overflow-hidden m-0">
                      <div className="flex flex-col h-full">
                        {/* System filter buttons + Add task */}
                        <div className="flex flex-wrap items-center gap-2 py-2 shrink-0 px-3 md:px-6 border-b">
                          {(['all', ...Object.keys(SYSTEM_CONFIG)] as (SystemKey | 'all')[]).map(sys => {
                            if (sys === 'all') {
                              return (
                                <Button
                                  key="all"
                                  variant={systemFilter === 'all' ? 'default' : 'outline'}
                                  size="sm"
                                  className="h-8 text-xs"
                                  onClick={() => setSystemFilter('all')}
                                >
                                  All
                                </Button>
                              );
                            }
                            const Icon = SYSTEM_CONFIG[sys].icon;
                            const count = tasks.filter(t => getSystemForCategory(t.category) === sys).length;
                            return (
                              <Button
                                key={sys}
                                variant={systemFilter === sys ? 'default' : 'outline'}
                                size="sm"
                                className="h-8 gap-1.5 text-xs"
                                onClick={() => setSystemFilter(sys)}
                                title={`${SYSTEM_CONFIG[sys].label}${count > 0 ? ` (${count})` : ''}`}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {SYSTEM_CONFIG[sys].label}
                                {count > 0 && <span className="opacity-80">({count})</span>}
                              </Button>
                            );
                          })}
                          <Button onClick={() => setShowAddTask(true)} disabled={!selectedHomeId} className="ml-auto h-8 shrink-0 text-xs bg-primary hover:bg-primary/90 text-primary-foreground" title="Add Tasks">
                            <Plus className="h-4 w-4 mr-1" />
                            Add Tasks
                          </Button>
                        </div>

                        {/* Scrollable task list */}
                        <div className="flex-1 min-h-0 overflow-y-auto py-3 px-3 md:px-6">
                      {loading ? <div className="text-center py-8 text-muted-foreground">Loading tasks...</div> : getFilteredTasks().length === 0 ? <Card className="mx-1 border-primary/20 bg-primary/5">
                          <CardContent className="pt-6">
                            <div className="text-center py-8">
                              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-4">
                                <ListTodo className="h-7 w-7" />
                              </div>
                              <h3 className="text-lg font-medium mb-2">
                                {tasks.length === 0 ? "You're all set to add your first task" : 'No tasks in this system'}
                              </h3>
                              <p className="text-muted-foreground mb-4 text-sm max-w-sm mx-auto">
                                {tasks.length === 0 ? "Add tasks from templates or create your own. We'll help you stay on top of due dates and keep your home in great shape." : 'Try selecting a different system filter or add a new task.'}
                              </p>
                              <Button onClick={() => setShowAddTask(true)} className="bg-primary hover:bg-primary/90">
                                <Plus className="h-4 w-4 mr-2" />
                                {tasks.length === 0 ? 'Add Your First Task' : 'Add New Task'}
                              </Button>
                            </div>
                          </CardContent>
                        </Card> : (
                        <table className="w-full border-collapse text-xs sm:text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/40">
                              <th className="text-left px-2 py-2 font-medium">Task</th>
                              <th className="text-left px-2 py-2 font-medium">Frequency</th>
                              <th className="text-left px-2 py-2 font-medium">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex items-center gap-1">
                                        Summary
                                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs">
                                      <p>Short overview shown here. Open a task to view full step-by-step instructions.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </th>
                              <th className="text-right px-2 py-2 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                        {getFilteredTasks().map(task => {
                    const progress = getTaskProgress(task);
                    const {
                      status,
                      color,
                      icon: StatusIcon
                    } = getTaskStatus(task);
                    const summary = task.summary ?? task.description ?? 'No summary yet.';
                    return (
                      <tr
                        key={task.id}
                        className="border-b border-border hover:bg-muted/30 transition-colors"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={() => handleTouchEnd(task.id)}
                      >
                        <td
                          className="px-2 py-2 align-top cursor-pointer"
                          onClick={() => {
                            setSwipedTaskId(null);
                            setSelectedTaskForDetails(task);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{task.title}</span>
                          </div>
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            Due {format(new Date(task.next_due), 'MMM dd, yyyy')}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>Progress</span>
                            <span>{Math.round(progress)}%</span>
                            <Progress value={Math.min(100, progress)} indicatorClassName={getProgressBarColor(progress)} className="h-1.5 flex-1" />
                          </div>
                        </td>
                        <td className="px-2 py-2 align-top">
                          Every {task.frequency_days} days
                        </td>
                        <td
                          className="px-2 py-2 align-top cursor-pointer max-w-xs"
                          onClick={() => {
                            setSwipedTaskId(null);
                            setSelectedTaskForDetails(task);
                          }}
                        >
                          <span className="line-clamp-3 text-xs text-muted-foreground">
                            {summary}
                          </span>
                        </td>
                        <td className="px-2 py-2 align-top">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              onClick={() => handleTaskComplete(task)}
                              size="sm"
                              className="h-6 bg-green-600 hover:bg-green-700 text-white text-xs px-2"
                              title="Mark completion"
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              Mark completion
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-foreground"
                              title="Edit Task"
                              onClick={() => setTaskBeingEdited(task)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                          </tbody>
                        </table>
                      )}
                        </div>
                      </div>
                    </TabsContent>

                   <TabsContent value="history" className="flex-1 min-h-0 overflow-hidden m-0">
                      <div className="flex flex-col h-full">
                        {/* Filters - Fixed at top */}
                        <div className="flex items-center gap-2 py-3 shrink-0 px-3 md:px-6 border-b">
                         <Select value={historyCategoryFilter} onValueChange={setHistoryCategoryFilter}>
                           <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs">
                             <SelectValue placeholder="Filter by category" />
                           </SelectTrigger>
                           <SelectContent className="z-[200] bg-popover border">
                             <SelectItem value="all">All Categories</SelectItem>
                             {historyCategories.map(category => <SelectItem key={category} value={category}>
                                 {categoryLabels[category]}
                               </SelectItem>)}
                           </SelectContent>
                         </Select>

                         <Select value={sortBy} onValueChange={setSortBy}>
                           <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs">
                             <SelectValue placeholder="Sort by" />
                           </SelectTrigger>
                           <SelectContent className="z-[200] bg-popover border">
                             <SelectItem value="date-desc">Date (Newest First)</SelectItem>
                             <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
                             <SelectItem value="category">Category</SelectItem>
                             <SelectItem value="title">Task Name</SelectItem>
                           </SelectContent>
                         </Select>
                       </div>

                       {/* Scrollable history list - matches structure of Active tab */}
                       <div className="flex-1 min-h-0 overflow-y-auto space-y-2 py-3 px-3 md:px-6">
                         <MaintenanceHistoryTab
                           selectedHomeId={selectedHomeId}
                           sortBy={sortBy}
                           categoryFilter={historyCategoryFilter}
                           onRefresh={() => { fetchTasks(); fetchCompletions(); }}
                         />
                       </div>
                      </div>
                   </TabsContent>
                 </Tabs>
               </div>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialogs */}
      <AddMaintenanceTaskDialog open={showAddTask} onOpenChange={setShowAddTask} homeId={selectedHomeId} onTaskAdded={fetchTasks} />

      {selectedTask && <TaskCompletionDialog open={!!selectedTask} onOpenChange={open => !open && setSelectedTask(null)} task={selectedTask} onCompleted={handleTaskCompleted} />}

      <Dialog open={showAlerts} onOpenChange={setShowAlerts}>
        <DialogContent className="w-full max-w-[95vw] md:max-w-[50vw] max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-500" />
              Setup Alerts
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 py-3 px-3 md:px-6">
            {selectedHomeId ? (
              <MaintenanceNotifications selectedHomeId={selectedHomeId} />
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Home className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Select a home above to configure alerts and reminders.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Task details dialog */}
      <Dialog open={!!selectedTaskForDetails} onOpenChange={(open) => !open && setSelectedTaskForDetails(null)}>
        <DialogContent className="w-full max-w-[95vw] md:max-w-[600px] max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              {selectedTaskForDetails?.title || 'Task details'}
            </DialogTitle>
          </DialogHeader>
          {selectedTaskForDetails && (
            <div className="flex flex-col gap-3 py-1 overflow-y-auto max-h-[70vh]">
              <div className="text-xs sm:text-sm text-muted-foreground">
                <div><span className="font-medium">Category:</span> {categoryLabels[selectedTaskForDetails.category] || selectedTaskForDetails.category}</div>
                <div><span className="font-medium">Frequency:</span> Every {selectedTaskForDetails.frequency_days} days</div>
                <div><span className="font-medium">Criticality:</span> {selectedTaskForDetails.criticality === 3 ? 'High' : selectedTaskForDetails.criticality === 1 ? 'Low' : 'Medium'}</div>
                <div><span className="font-medium">Next due:</span> {format(new Date(selectedTaskForDetails.next_due), 'MMM dd, yyyy')}</div>
              </div>
              <section className="mt-2">
                <h3 className="text-sm font-medium mb-1">Summary</h3>
                {(selectedTaskForDetails.summary || selectedTaskForDetails.description) ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {selectedTaskForDetails.summary ?? selectedTaskForDetails.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No summary for this task.</p>
                )}
              </section>
              <section className="mt-2 pt-3 border-t border-border">
                <h3 className="text-sm font-medium mb-1">Instructions</h3>
                {selectedTaskForDetails.instructions ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selectedTaskForDetails.instructions}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No instructions added for this task.</p>
                )}
              </section>
              {(selectedTaskForDetails.risks_of_skipping || selectedTaskForDetails.benefits_of_maintenance || selectedTaskForDetails.repair_cost_savings) && (
                <div className="mt-3 flex flex-col gap-2">
                  {selectedTaskForDetails.risks_of_skipping && (
                    <div>
                      <h3 className="text-sm font-medium mb-1">Risks of skipping</h3>
                      <p className="text-sm text-muted-foreground">{selectedTaskForDetails.risks_of_skipping}</p>
                    </div>
                  )}
                  {selectedTaskForDetails.benefits_of_maintenance && (
                    <div>
                      <h3 className="text-sm font-medium mb-1">Benefits of maintenance</h3>
                      <p className="text-sm text-muted-foreground">{selectedTaskForDetails.benefits_of_maintenance}</p>
                    </div>
                  )}
                  {selectedTaskForDetails.repair_cost_savings && (
                    <div>
                      <h3 className="text-sm font-medium mb-1">Repair cost savings</h3>
                      <p className="text-sm text-muted-foreground">{selectedTaskForDetails.repair_cost_savings}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Task edit dialog */}
      <Dialog open={!!taskBeingEdited} onOpenChange={(open) => !open && setTaskBeingEdited(null)}>
        <DialogContent className="w-full max-w-[95vw] md:max-w-[780px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 shrink-0">
            <DialogTitle>Edit Maintenance Task</DialogTitle>
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => setTaskBeingEdited(null)}>
              Close
            </Button>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {taskBeingEdited && (
            <EditMaintenanceTaskForm
              task={taskBeingEdited}
              onClose={() => setTaskBeingEdited(null)}
              onUpdated={fetchTasks}
              onDelete={() => {
                handleDeleteTask(taskBeingEdited.id);
                setTaskBeingEdited(null);
                fetchTasks();
              }}
            />
          )}
          </div>
        </DialogContent>
      </Dialog>

      <MaintenancePhotosWindow open={showMaintenancePhotos} onOpenChange={setShowMaintenancePhotos} />

      <HomeManager
        open={showHomeManager}
        onOpenChange={setShowHomeManager}
        selectedHomeId={null}
        onHomeSelected={fetchHomes}
        showSelector={false}
      />
    </>;
};