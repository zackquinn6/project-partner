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
import { Home, Plus, Calendar, Clock, AlertTriangle, CheckCircle, Trash2, FileText, Pencil, HelpCircle, ImageIcon, Wrench, ListTodo, History, Bell, ClipboardList, Check, ChevronDown, Menu } from 'lucide-react';
import { format, differenceInDays, addDays, startOfDay, endOfDay, isSameDay } from 'date-fns';
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
import { MaintenancePlanWorkflow } from './MaintenancePlanWorkflow';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { MaintenanceCalendarWindow, type MaintenanceTaskForCalendar } from './MaintenanceCalendarWindow';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  is_custom?: boolean | null;
  recurrence_start_date?: string | null;
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
    instructions: task.instructions ?? '',
    category: task.category,
    frequency_days: task.frequency_days,
    risks_of_skipping: task.risks_of_skipping ?? '',
    benefits_of_maintenance: task.benefits_of_maintenance ?? '',
    criticality: task.criticality ?? 2,
    repair_cost_savings: task.repair_cost_savings != null && task.repair_cost_savings !== '' ? String(task.repair_cost_savings) : '',
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
          instructions: form.instructions.trim() || null,
          category: form.category,
          frequency_days: form.frequency_days,
          risks_of_skipping: form.risks_of_skipping.trim() || null,
          benefits_of_maintenance: form.benefits_of_maintenance.trim() || null,
          criticality: form.criticality,
          repair_cost_savings: repairSavingsStr || null,
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

  const repairSavingsStr = String(form.repair_cost_savings ?? '').trim();
  const repairSavingsNum = repairSavingsStr === '' ? '' : parseInt(repairSavingsStr, 10);
  const repairSavingsValid = repairSavingsStr === '' || (Number.isInteger(repairSavingsNum) && repairSavingsNum >= 0);

  return (
    <div className="flex flex-col min-h-0 flex-1 text-[0.75rem]">
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
          <Label htmlFor="edit-instructions">Instructions</Label>
          <Textarea
            id="edit-instructions"
            rows={2}
            className="min-h-0 resize-y"
            value={form.instructions}
            onChange={(e) => setForm(prev => ({ ...prev, instructions: e.target.value }))}
            placeholder="Step-by-step instructions"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="min-w-0">
            <Label htmlFor="edit-category">Category</Label>
            <Select
              value={form.category}
              onValueChange={(value) => setForm(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger id="edit-category" className="w-full min-w-0 max-w-full h-7 md:h-8">
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
              <SelectTrigger id="edit-criticality" className="w-full min-w-0 max-w-full h-7 md:h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-w-[var(--radix-select-trigger-width)]">
                <SelectItem value="1">Low</SelectItem>
                <SelectItem value="2">Medium</SelectItem>
                <SelectItem value="3">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0">
            <Label htmlFor="edit-frequency" className="whitespace-nowrap">Frequency (days)</Label>
            <Input
              id="edit-frequency"
              type="number"
              min={1}
              max={3650}
              className="w-full min-w-0 max-w-full h-7 md:h-8"
              value={form.frequency_days}
              onChange={(e) =>
                setForm(prev => ({
                  ...prev,
                  frequency_days: parseInt(e.target.value, 10) || prev.frequency_days,
                }))
              }
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
              className="flex-1 [&_[data-radix-slider-track]]:bg-muted/60 [&_[data-radix-slider-range]]:bg-emerald-600 [&_[data-radix-slider-thumb]]:border-emerald-600"
            />
            <Input
              type="number"
              min={0}
              max={9999}
              className="w-20 h-7 text-center shrink-0"
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
        <div>
          <Label htmlFor="edit-repair-savings"><span className="md:hidden">Benefit $</span><span className="hidden md:inline">Repair cost savings ($)</span></Label>
          <Input
            id="edit-repair-savings"
            type="number"
            min={0}
            step={1}
            className="w-full min-w-0 max-w-[8rem] h-7 md:h-8"
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
      </div>
      <div className="flex justify-between gap-2 pt-2 border-t shrink-0 bg-background px-4">
        <Button variant="destructive" size="sm" onClick={onDelete} className="mr-auto h-6 w-6 p-0 md:h-7 md:w-auto md:px-2 md:py-1.5">
          <Trash2 className="h-3 w-3 md:h-3.5 md:w-3.5 md:mr-1" />
          <span className="hidden md:inline">Delete task</span>
        </Button>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !form.title.trim() || !repairSavingsValid}>
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
  const { toast } = useToast();
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
  const [showMaintenancePlanComingSoon, setShowMaintenancePlanComingSoon] = useState(false);
  const [showMaintenanceCalendar, setShowMaintenanceCalendar] = useState(false);
  const [quickLoggingTaskId, setQuickLoggingTaskId] = useState<string | null>(null);
  const {
    isMobile
  } = useResponsive();
  useEffect(() => {
    if (open && user) {
      fetchHomes();
    }
  }, [open, user]);

  // Avoid showing a focused/highlighted element or selected text when the maintenance view first opens
  useEffect(() => {
    if (open) {
      (document.activeElement as HTMLElement)?.blur();
      const selection = window.getSelection?.();
      if (selection && selection.removeAllRanges) {
        selection.removeAllRanges();
      }
    }
  }, [open]);
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
      } = await supabase.from('homes').select('id, name, is_primary').eq('user_id', user.id).order('is_primary', {
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
  const handleTaskCompleted = async () => {
    const completed = selectedTask;
    setSelectedTask(null);
    // When TaskCompletionDialog reports completion, we expect the DB to already
    // have a new maintenance_completions row for the chosen date. To keep
    // behavior consistent with quick log (including "completed today" grouping),
    // refresh tasks and completions from Supabase so the UI reflects the change.
    if (completed) {
      try {
        await Promise.all([fetchTasks(), fetchCompletions()]);
      } catch (error) {
        console.error('Error refreshing after detailed completion:', error);
      }
    } else {
      fetchTasks();
      fetchCompletions();
    }
  };
  const handleQuickLogComplete = async (task: MaintenanceTask) => {
    if (!user) return;
    setQuickLoggingTaskId(task.id);
    try {
      const now = new Date();
      const dayStart = startOfDay(now);
      const dayEnd = endOfDay(now);
      const { data: existing } = await supabase
        .from('maintenance_completions')
        .select('id')
        .eq('user_id', user.id)
        .eq('task_id', task.id)
        .gte('completed_at', dayStart.toISOString())
        .lte('completed_at', dayEnd.toISOString())
        .limit(1);
      if (existing && existing.length > 0) {
        setQuickLoggingTaskId(null);
        return;
      }
      const { error: insertError } = await supabase
        .from('maintenance_completions')
        .insert({
          user_id: user.id,
          task_id: task.id,
          completed_at: now.toISOString(),
          scheduled_due_date: task.next_due,
          notes: null,
          photo_url: null,
        });
      if (insertError) throw insertError;
      const nextDue = addDays(now, task.frequency_days).toISOString();
      const { error: updateError } = await supabase
        .from('user_maintenance_tasks')
        .update({
          last_completed: now.toISOString(),
          next_due: nextDue,
          updated_at: now.toISOString(),
        })
        .eq('id', task.id)
        .eq('user_id', user.id);
      if (updateError) throw updateError;
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, last_completed: now.toISOString(), next_due: nextDue } : t));
      toast({ title: 'Saved' });
      fetchTasks();
      fetchCompletions();
    } catch (error) {
      console.error('Error quick-logging task:', error);
      toast({
        title: 'Error',
        description: 'Failed to log completion',
        variant: 'destructive',
      });
    } finally {
      setQuickLoggingTaskId(null);
    }
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

  const filteredTasks = getFilteredTasks();
  // Completed today = completion date is same calendar day as today; resets next day so task can be completed again
  const today = new Date();
  const tasksNotCompletedToday = filteredTasks.filter(t => !t.last_completed || !isSameDay(new Date(t.last_completed), today));
  const tasksCompletedToday = filteredTasks.filter(t => t.last_completed && isSameDay(new Date(t.last_completed), today));

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
      <DialogContent
        className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col min-h-0 [&>button]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <VisuallyHidden.Root>
            <DialogTitle>Home Maintenance</DialogTitle>
          </VisuallyHidden.Root>
        </DialogHeader>
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Header with title, tooltip, and close button */}
        <div className="px-4 md:px-6 py-2 md:py-4 border-b flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 md:h-6 md:w-6 text-primary shrink-0" aria-hidden />
            <h2 className="text-base font-bold md:hidden">Home Maintenance</h2>
            <h2 className="hidden md:block text-xl font-bold">Home Maintenance Tracker</h2>
            <TooltipProvider delayDuration={400}>
              <Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <button type="button" tabIndex={-1} className="text-muted-foreground hover:text-foreground p-0.5 rounded" aria-label="About this app">
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
            {isMobile ? 'Back to Workspace' : 'Close'}
          </Button>
        </div>
        
        {/* Home Selection: mobile = wider dropdown + hamburger menu; desktop = dropdown + action buttons */}
        <div className="px-2 md:px-6 py-1 md:py-3 shrink-0 bg-background border-b">
          <div className="flex flex-row items-center gap-2 w-full min-w-0">
            <div className="flex items-center gap-1 min-w-0 flex-1 md:flex-initial">
              <Select value={selectedHomeId} onValueChange={setSelectedHomeId}>
                <SelectTrigger className="h-8 md:h-9 w-full min-w-0 px-2 md:px-3 text-xs md:text-base md:w-[280px]">
                  <SelectValue placeholder="Select a home" />
                </SelectTrigger>
                <SelectContent className="z-[200] bg-popover border border-border shadow-md">
                  {homes.map(home => (
                    <SelectItem key={home.id} value={home.id} className="cursor-pointer text-xs md:text-sm">
                      {home.name} {home.address && `- ${home.address}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 md:h-9 md:w-9 p-0 shrink-0 hidden md:flex"
                onClick={() => setShowHomeManager(true)}
                title="Manage homes"
              >
                <Home className="h-4 w-4" />
              </Button>
            </div>
            {/* Mobile: hamburger menu with all actions (wrapper ensures visibility; content above dialog) */}
            <div className="flex shrink-0 md:hidden items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 w-9 p-0 shrink-0 inline-flex items-center justify-center" title="Actions">
                    <Menu className="h-5 w-5 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 z-[100]">
                <DropdownMenuItem onClick={() => setShowHomeManager(true)}>
                  <Home className="h-4 w-4 mr-2" />
                  Edit home
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowMaintenancePlanComingSoon(true)} disabled={!selectedHomeId}>
                  <ClipboardList className="h-4 w-4 mr-2 text-primary" />
                  Generate plan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowMaintenancePhotos(true)}>
                  <ImageIcon className="h-4 w-4 mr-2 text-primary" />
                  View photos
                </DropdownMenuItem>
                {selectedHomeId && tasks.length > 0 && (
                  <DropdownMenuItem onSelect={() => document.getElementById('maintenance-pdf-trigger')?.click()}>
                    <FileText className="h-4 w-4 mr-2 text-primary" />
                    Export PDF
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setShowAlerts(true)} disabled={!selectedHomeId}>
                  <Bell className="h-4 w-4 mr-2 text-amber-500" />
                  Setup alerts
                </DropdownMenuItem>
              </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* Desktop: action buttons (right-aligned on the row; Generate Plan moved next to Add Tasks in task toolbar) */}
            <div className="flex items-center gap-1 shrink-0 overflow-x-auto overflow-y-hidden py-0.5 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMaintenancePhotos(true)}
                title="View photos from task completions"
                className="shrink-0 p-0 h-8 w-8 md:h-8 md:w-auto md:px-3 md:py-2"
              >
                <ImageIcon className="h-4 w-4 text-primary" />
                <span className="hidden md:inline ml-1.5 text-xs md:text-sm">View Photos</span>
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
                className="shrink-0 p-0 h-8 w-8 md:h-8 md:w-auto md:px-3 md:py-2"
                title="Setup Alerts"
              >
                <Bell className="h-4 w-4 text-amber-500" />
                <span className="hidden md:inline ml-1.5 text-xs md:text-sm">Setup Alerts</span>
              </Button>
            </div>
            {/* PDF trigger for mobile (hidden; triggered from hamburger menu) */}
            {selectedHomeId && tasks.length > 0 && (
              <div className="md:hidden [.hidden]:!hidden" style={{ position: 'absolute', left: '-9999px', width: 0, height: 0, overflow: 'hidden' }}>
                <MaintenancePdfPrinter
                  tasks={tasks}
                  completions={completions}
                  homeName={homes.find(h => h.id === selectedHomeId)?.name || 'Home'}
                  buttonId="maintenance-pdf-trigger"
                />
              </div>
            )}
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

            {/* Tabs – fills remaining height so task list uses full space on desktop */}
            {selectedHomeId && (
              <div className="flex flex-col flex-1 min-h-0 basis-0 overflow-hidden">
                <Tabs defaultValue="tasks" className="flex flex-col flex-1 min-h-0 basis-0">
                  <div className="px-2 md:px-6 pt-0.5 pb-0 md:py-2 bg-background border-b shrink-0 overflow-visible">
                    <TabsList className="grid grid-cols-2 w-full h-7 md:h-11 p-0 md:p-1 gap-0">
                      <TabsTrigger value="tasks" className="text-xs md:text-sm gap-1 py-0 min-h-7 h-7 px-1.5 md:py-1.5 md:px-2 md:min-h-0 rounded-l-md rounded-r-none md:rounded-sm data-[state=active]:bg-background">
                        <ListTodo className="h-3 w-3 md:h-3.5 md:w-3.5 shrink-0" />
                        Active
                      </TabsTrigger>
                      <TabsTrigger value="history" className="text-xs md:text-sm gap-1 py-0 min-h-7 h-7 px-1.5 md:py-1.5 md:px-2 md:min-h-0 rounded-r-md rounded-l-none md:rounded-sm data-[state=active]:bg-background">
                        <History className="h-3 w-3 md:h-3.5 md:w-3.5 shrink-0" />
                        History
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="tasks" className="flex-1 min-h-0 basis-0 overflow-hidden m-0 p-0 flex flex-col data-[state=inactive]:hidden">
                    <div className="flex flex-col flex-1 min-h-0 basis-0">
                      {/* System filter: mobile = Add button + filter dropdown; desktop = All + labels, Add right */}
                      <div className="shrink-0 border-b px-2 md:px-6 py-1.5 md:py-2 overflow-visible">
                        <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto overflow-y-visible pb-0.5 md:pb-1 scrollbar-thin min-h-0">
                          {/* Mobile: Add Task button (same height as filter dropdown); desktop: Add Tasks */}
                          <Button
                            onClick={() => setShowAddTask(true)}
                            disabled={!selectedHomeId}
                            variant="outline"
                            className="h-8 min-h-8 py-1.5 px-2.5 md:h-8 md:w-auto md:min-h-0 md:px-3 md:py-2 shrink-0 text-xs border-blue-600 bg-transparent text-blue-600 hover:bg-blue-50 hover:border-blue-600 md:border-blue-600 md:bg-blue-600 md:text-white md:hover:bg-blue-700 md:hover:border-blue-700 rounded-md flex items-center justify-center gap-1.5"
                            title="Add Task"
                          >
                            <Plus className="h-4 w-4 shrink-0 text-blue-600 md:text-primary" strokeWidth={2.5} aria-hidden />
                            <span className="md:hidden whitespace-nowrap">Add Task</span>
                            <span className="hidden md:inline">Add Tasks</span>
                          </Button>
                          {/* Desktop: Generate Maintenance Plan button next to Add Tasks */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowMaintenancePlanComingSoon(true)}
                            disabled={!selectedHomeId}
                            title="Guided workflow to create your maintenance plan"
                            className="hidden md:inline-flex h-8 min-h-8 px-3 py-2 shrink-0 text-xs md:text-sm rounded-md gap-1.5"
                          >
                            <ClipboardList className="h-4 w-4 text-primary shrink-0" />
                            <span>Generate Plan</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowMaintenanceCalendar(true)}
                            disabled={!selectedHomeId}
                            title="Plan and level-load maintenance across the year"
                            className="hidden md:inline-flex h-8 min-h-8 px-3 py-2 shrink-0 text-xs md:text-sm rounded-md gap-1.5"
                          >
                            <Calendar className="h-4 w-4 text-primary shrink-0" />
                            <span>Calendar</span>
                          </Button>
                          {/* Mobile: single filter dropdown (same h-8 as Add Task button); wider so label fits */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 min-h-8 py-1.5 px-2.5 gap-1 shrink-0 text-xs md:hidden rounded-md border border-input min-w-[8rem]"
                              >
                                {systemFilter === 'all' ? 'All' : SYSTEM_CONFIG[systemFilter as SystemKey]?.label ?? systemFilter}
                                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="max-h-[70vh] overflow-y-auto min-w-[12rem] w-[12rem] md:min-w-0 md:w-auto">
                              <DropdownMenuRadioGroup value={systemFilter} onValueChange={(v) => setSystemFilter(v as SystemKey | 'all')}>
                                <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                                {(Object.keys(SYSTEM_CONFIG) as SystemKey[]).map(sys => {
                                  const count = tasks.filter(t => getSystemForCategory(t.category) === sys).length;
                                  return (
                                    <DropdownMenuRadioItem key={sys} value={sys}>
                                      {SYSTEM_CONFIG[sys].label}{count > 0 ? ` (${count})` : ''}
                                    </DropdownMenuRadioItem>
                                  );
                                })}
                              </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {/* Desktop: All + system filter buttons */}
                          {(['all', ...Object.keys(SYSTEM_CONFIG)] as (SystemKey | 'all')[]).map(sys => {
                            if (sys === 'all') {
                              return (
                                <Button
                                  key="all"
                                  variant={systemFilter === 'all' ? 'default' : 'outline'}
                                  size="sm"
                                  className="h-8 w-8 md:h-8 md:w-auto md:min-h-0 md:px-3 md:ml-8 shrink-0 text-xs p-0 hidden md:flex"
                                  onClick={() => setSystemFilter('all')}
                                  title="All"
                                >
                                  <ListTodo className="h-4 w-4 md:hidden shrink-0" />
                                  <span className="hidden md:inline">All</span>
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
                                className="h-8 w-8 md:h-8 md:w-auto md:min-h-0 md:px-3 md:gap-1.5 shrink-0 text-xs p-0 hidden md:flex"
                                onClick={() => setSystemFilter(sys)}
                                title={`${SYSTEM_CONFIG[sys].label}${count > 0 ? ` (${count})` : ''}`}
                              >
                                <Icon className="h-4 w-4 md:h-3.5 md:w-3.5 shrink-0" />
                                <span className="hidden md:inline whitespace-nowrap">{SYSTEM_CONFIG[sys].label}</span>
                                {count > 0 && <span className="hidden md:inline opacity-80">({count})</span>}
                              </Button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Task list – fills remaining height so table area uses full window on desktop */}
                      <div className="flex-1 min-h-0 basis-0 overflow-y-auto py-3 pt-3 pb-0 md:pb-3 px-3 md:py-3 md:px-6">
                        {loading ? (
                          <div className="text-center py-8 text-muted-foreground">Loading tasks...</div>
                        ) : filteredTasks.length === 0 ? (
                          <Card className="mx-1 border-primary/20 bg-primary/5">
                            <CardContent className="pt-6">
                              <div className="text-center py-8">
                                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-4">
                                  {tasks.length === 0 ? <ClipboardList className="h-7 w-7" /> : <ListTodo className="h-7 w-7" />}
                                </div>
                                <h3 className="text-lg font-medium mb-2">
                                  {tasks.length === 0 ? 'Create your maintenance plan' : 'No tasks in this system'}
                                </h3>
                                <p className="text-muted-foreground mb-4 text-sm max-w-sm mx-auto">
                                  {tasks.length === 0
                                    ? 'Use our guided workflow to build a plan tailored to your home, or add tasks manually.'
                                    : 'Try selecting a different system filter or add a new task.'}
                                </p>
                                {tasks.length === 0 ? (
                                  <Button onClick={() => setShowMaintenancePlanComingSoon(true)} className="bg-primary hover:bg-primary/90 min-h-[44px]">
                                    <ClipboardList className="h-4 w-4 mr-2" />
                                    <span className="md:hidden">Plan Generator</span>
                                    <span className="hidden md:inline">Generate Plan</span>
                                  </Button>
                                ) : (
                                  <Button onClick={() => setShowAddTask(true)} className="bg-primary hover:bg-primary/90 min-h-[44px]">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add New Task
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ) : (
                          <>
                            {/* Mobile: card list */}
                            <div className="md:hidden space-y-2">
                              {tasksNotCompletedToday.map(task => {
                                const progress = getTaskProgress(task);
                                const summary = task.description ?? 'No description yet.';
                                return (
                                  <Card
                                    key={task.id}
                                    className="cursor-pointer hover:bg-muted/30 transition-colors border-border"
                                    onTouchStart={handleTouchStart}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={() => handleTouchEnd(task.id)}
                                    onClick={() => {
                                      setSwipedTaskId(null);
                                      setSelectedTaskForDetails(task);
                                    }}
                                  >
                                    <CardContent className="p-1.5 md:p-3">
                                      <div className="flex items-center justify-between gap-1.5 md:gap-2">
                                        <div className="min-w-0 flex-1">
                                          <h4 className="font-medium text-sm">{task.title}</h4>
                                          <p className="text-xs text-muted-foreground mt-0.5">
                                            Due {format(new Date(task.next_due), 'MMM dd, yyyy')} · Every {task.frequency_days} days
                                          </p>
                                          <div className="flex items-center gap-1.5 mt-1 md:mt-2 text-xs text-muted-foreground">
                                            <span className="shrink-0">Progress</span>
                                            <span className="shrink-0 tabular-nums">{Math.round(progress)}%</span>
                                            <Progress value={Math.min(100, progress)} indicatorClassName={getProgressBarColor(progress)} className="h-1.5 flex-1 min-w-0 max-w-[52%] md:max-w-none" />
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6 shrink-0 md:hidden text-muted-foreground hover:text-foreground"
                                              title="Edit Task"
                                              onClick={(e) => { e.stopPropagation(); setTaskBeingEdited(task); }}
                                            >
                                              <Pencil className="h-3 w-3 shrink-0" />
                                            </Button>
                                          </div>
                                          <p className="hidden md:block text-xs text-muted-foreground line-clamp-2 mt-1">{summary}</p>
                                        </div>
                                        <div className="flex flex-col gap-1 md:gap-2 shrink-0">
                                          <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-1.5">
                                            <Button
                                              onClick={(e) => { e.stopPropagation(); handleQuickLogComplete(task); }}
                                              disabled={quickLoggingTaskId === task.id}
                                              size="sm"
                                              className="h-6 w-6 md:h-9 md:min-w-[44px] md:w-auto bg-green-600 hover:bg-green-700 text-white p-0 shrink-0 md:px-2"
                                              title="Log complete for today"
                                            >
                                              <Check className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                            </Button>
                                            <Button
                                              onClick={(e) => { e.stopPropagation(); handleTaskComplete(task); }}
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 md:h-8 md:w-auto md:min-h-[36px] text-muted-foreground hover:text-foreground md:bg-green-600 md:hover:bg-green-700 md:text-white md:px-2 shrink-0"
                                              title="Log Complete (add date, notes, photo)"
                                            >
                                              <FileText className="h-3 w-3 md:hidden shrink-0" />
                                              <span className="hidden md:inline">Log Complete</span>
                                            </Button>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="hidden md:flex h-9 w-9 min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground"
                                            title="Edit Task"
                                            onClick={(e) => { e.stopPropagation(); setTaskBeingEdited(task); }}
                                          >
                                            <Pencil className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                              {tasksCompletedToday.length > 0 && (
                                <>
                                  <div className="border-t border-border my-3" aria-hidden />
                                  <p className="text-xs font-medium text-muted-foreground pt-2 pb-1 sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                                    Completed today
                                  </p>
                                  {tasksCompletedToday.map(task => {
                                    const progress = getTaskProgress(task);
                                    const summary = task.description ?? 'No description yet.';
                                    return (
                                      <Card
                                        key={task.id}
                                        className="cursor-pointer hover:bg-muted/30 transition-colors border-border border-green-200 dark:border-green-900/40 bg-green-50/50 dark:bg-green-950/20"
                                        onTouchStart={handleTouchStart}
                                        onTouchMove={handleTouchMove}
                                        onTouchEnd={() => handleTouchEnd(task.id)}
                                        onClick={() => {
                                          setSwipedTaskId(null);
                                          setSelectedTaskForDetails(task);
                                        }}
                                      >
                                        <CardContent className="p-1.5 md:p-3">
                                          <div className="flex items-center justify-between gap-1.5 md:gap-2">
                                            <div className="min-w-0 flex-1">
                                              <h4 className="font-medium text-sm">{task.title}</h4>
                                              <p className="text-xs text-muted-foreground mt-0.5">
                                                Due {format(new Date(task.next_due), 'MMM dd, yyyy')} · Every {task.frequency_days} days
                                              </p>
                                              <div className="flex items-center gap-1.5 mt-1 md:mt-2 text-xs text-muted-foreground">
                                                <span className="shrink-0">Progress</span>
                                                <span className="shrink-0 tabular-nums">{Math.round(progress)}%</span>
                                                <Progress value={Math.min(100, progress)} indicatorClassName={getProgressBarColor(progress)} className="h-1.5 flex-1 min-w-0 max-w-[52%] md:max-w-none" />
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-6 w-6 shrink-0 md:hidden text-muted-foreground hover:text-foreground"
                                                  title="Edit Task"
                                                  onClick={(e) => { e.stopPropagation(); setTaskBeingEdited(task); }}
                                                >
                                                  <Pencil className="h-3 w-3 shrink-0" />
                                                </Button>
                                              </div>
                                              <p className="hidden md:block text-xs text-muted-foreground line-clamp-2 mt-1">{summary}</p>
                                            </div>
                                            <div className="flex flex-col gap-1 md:gap-2 shrink-0">
                                              <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-1.5">
                                                <Button
                                                  onClick={(e) => { e.stopPropagation(); handleQuickLogComplete(task); }}
                                                  disabled={quickLoggingTaskId === task.id}
                                                  size="sm"
                                                  className="h-6 w-6 md:h-9 md:min-w-[44px] md:w-auto bg-green-600 hover:bg-green-700 text-white p-0 shrink-0 md:px-2"
                                                  title="Log complete for today"
                                                >
                                                  <Check className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                                </Button>
                                                <Button
                                                  onClick={(e) => { e.stopPropagation(); handleTaskComplete(task); }}
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-6 w-6 md:h-8 md:w-auto md:min-h-[36px] text-muted-foreground hover:text-foreground md:bg-green-600 md:hover:bg-green-700 md:text-white md:px-2 shrink-0"
                                                  title="Log Complete (add date, notes, photo)"
                                                >
                                                  <FileText className="h-3 w-3 md:hidden shrink-0" />
                                                  <span className="hidden md:inline">Log Complete</span>
                                                </Button>
                                              </div>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="hidden md:flex h-9 w-9 min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground"
                                                title="Edit Task"
                                                onClick={(e) => { e.stopPropagation(); setTaskBeingEdited(task); }}
                                              >
                                                <Pencil className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    );
                                  })}
                                </>
                              )}
                            </div>
                            {/* Desktop: table */}
                            <div className="hidden md:block">
                              <table className="w-full border-collapse text-sm">
                                <thead>
                                  <tr className="border-b border-border bg-muted/40">
                                    <th className="text-left px-2 py-2 font-medium">Task</th>
                                    <th className="text-left px-2 py-2 font-medium">Frequency</th>
                                    <th className="text-right px-2 py-2 font-medium">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tasksNotCompletedToday.map(task => {
                                    const progress = getTaskProgress(task);
                                    return (
                                      <tr
                                        key={task.id}
                                        className="border-b border-border hover:bg-muted/30 transition-colors"
                                        onTouchStart={handleTouchStart}
                                        onTouchMove={handleTouchMove}
                                        onTouchEnd={() => handleTouchEnd(task.id)}
                                      >
                                        <td
                                          className="px-2 py-2 align-middle cursor-pointer"
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
                                        <td className="px-2 py-2 align-middle">Every {task.frequency_days} days</td>
                                        <td className="px-2 py-2 align-middle">
                                          <div className="flex items-center justify-end gap-2">
                                            <Button
                                              onClick={() => handleQuickLogComplete(task)}
                                              disabled={quickLoggingTaskId === task.id}
                                              size="sm"
                                              className="h-8 bg-green-600 hover:bg-green-700 text-white text-xs px-2 min-h-[36px]"
                                              title="Log complete for today"
                                            >
                                              <Check className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                              onClick={() => handleTaskComplete(task)}
                                              size="sm"
                                              className="h-8 bg-green-600 hover:bg-green-700 text-white text-xs px-2 min-h-[36px]"
                                              title="Log Complete (add date, notes, photo)"
                                            >
                                              Log Complete
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
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
                                {tasksCompletedToday.length > 0 && (
                                  <tbody>
                                    <tr>
                                      <td colSpan={4} className="px-2 pt-4 pb-1 text-xs font-medium text-muted-foreground bg-muted/30 border-t border-border">
                                        Completed today
                                      </td>
                                    </tr>
                                    {tasksCompletedToday.map(task => {
                                      const progress = getTaskProgress(task);
                                      return (
                                        <tr
                                          key={task.id}
                                          className="border-b border-border hover:bg-muted/30 transition-colors bg-green-50/50 dark:bg-green-950/20"
                                          onTouchStart={handleTouchStart}
                                          onTouchMove={handleTouchMove}
                                          onTouchEnd={() => handleTouchEnd(task.id)}
                                        >
                                          <td
                                            className="px-2 py-2 align-middle cursor-pointer"
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
                                          <td className="px-2 py-2 align-middle">Every {task.frequency_days} days</td>
                                        <td className="px-2 py-2 align-middle">
                                            <div className="flex items-center justify-end gap-2">
                                              <Button
                                                onClick={() => handleQuickLogComplete(task)}
                                                disabled={quickLoggingTaskId === task.id}
                                                size="sm"
                                                className="h-8 bg-green-600 hover:bg-green-700 text-white text-xs px-2 min-h-[36px]"
                                                title="Log complete for today"
                                              >
                                                <Check className="h-3.5 w-3.5" />
                                              </Button>
                                              <Button
                                                onClick={() => handleTaskComplete(task)}
                                                size="sm"
                                                className="h-8 bg-green-600 hover:bg-green-700 text-white text-xs px-2 min-h-[36px]"
                                                title="Log Complete (add date, notes, photo)"
                                              >
                                                Log Complete
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
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
                                )}
                              </table>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="flex-1 min-h-0 basis-0 overflow-hidden m-0 p-0 flex flex-col data-[state=inactive]:hidden">
                    <div className="flex flex-col flex-1 min-h-0 basis-0">
                      <div className="flex flex-row flex-nowrap items-center gap-2 py-1.5 md:py-2 shrink-0 px-2 md:px-6 border-b">
                        <Select value={historyCategoryFilter} onValueChange={setHistoryCategoryFilter}>
                          <SelectTrigger className="min-w-0 flex-1 md:flex-none md:w-[180px] h-9 md:h-9 px-3 text-xs">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent className="z-[200] bg-popover border">
                            <SelectItem value="all">All Categories</SelectItem>
                            {historyCategories.map(category => (
                              <SelectItem key={category} value={category}>
                                {categoryLabels[category]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger className="min-w-0 flex-1 md:flex-none md:w-[180px] h-9 md:h-9 px-3 text-xs">
                            <SelectValue placeholder="Sort" />
                          </SelectTrigger>
                          <SelectContent className="z-[200] bg-popover border">
                            <SelectItem value="date-desc">Date (Newest First)</SelectItem>
                            <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
                            <SelectItem value="category">Category</SelectItem>
                            <SelectItem value="title">Task Name</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 min-h-0 basis-0 overflow-y-auto py-2 px-3 md:px-6">
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
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialogs */}
      <AddMaintenanceTaskDialog open={showAddTask} onOpenChange={setShowAddTask} homeId={selectedHomeId} onTaskAdded={fetchTasks} />

      <MaintenancePlanWorkflow
        open={showMaintenancePlanComingSoon}
        onOpenChange={setShowMaintenancePlanComingSoon}
        homeId={selectedHomeId || null}
        homeName={homes.find(h => h.id === selectedHomeId)?.name || 'Home'}
        onPlanSaved={fetchTasks}
      />

      <MaintenanceCalendarWindow
        open={showMaintenanceCalendar}
        onOpenChange={setShowMaintenanceCalendar}
        tasks={(tasks as MaintenanceTaskForCalendar[])}
        onOpenEditTask={(taskId) => {
          const t = tasks.find(x => x.id === taskId) || null;
          setTaskBeingEdited(t);
        }}
        onTasksUpdated={() => {
          fetchTasks();
          fetchCompletions();
        }}
      />

      {selectedTask && <TaskCompletionDialog open={!!selectedTask} onOpenChange={open => !open && setSelectedTask(null)} task={selectedTask} onCompleted={handleTaskCompleted} />}

      <Dialog open={showAlerts} onOpenChange={setShowAlerts}>
        <DialogContent
          className="w-[min(100vw-1rem,42rem)] max-w-[95vw] md:max-w-4xl max-h-[min(92dvh,880px)] p-0 gap-0 flex flex-col overflow-hidden text-xs md:text-sm [&>button]:z-30"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="shrink-0 px-4 pt-4 pb-3 border-b border-border bg-background z-20">
            <DialogTitle className="flex items-center gap-2 text-sm md:text-base pr-8">
              <Bell className="h-5 w-5 text-amber-500 shrink-0" />
              Setup Alerts
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 md:px-6 md:py-4">
            {selectedHomeId ? (
              <MaintenanceNotifications
                selectedHomeId={selectedHomeId}
                onSaved={() => {
                  queueMicrotask(() => setShowAlerts(false));
                }}
              />
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
                <h3 className="text-sm font-medium mb-1">Description</h3>
                {selectedTaskForDetails.description ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {selectedTaskForDetails.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No description for this task.</p>
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
              key={taskBeingEdited.id}
              task={taskBeingEdited}
              onClose={() => setTaskBeingEdited(null)}
              onUpdated={() => { fetchTasks(); setTaskBeingEdited(null); }}
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