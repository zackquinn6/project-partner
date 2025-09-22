import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Home, Plus, Calendar, Clock, AlertTriangle, CheckCircle, Filter, Trash2, FileText } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AddMaintenanceTaskDialog } from './AddMaintenanceTaskDialog';
import { TaskCompletionDialog } from './TaskCompletionDialog';
import { MaintenanceHistoryTab } from './MaintenanceHistoryTab';
import { MaintenancePdfPrinter } from './MaintenancePdfPrinter';
import { MaintenanceNotifications } from './MaintenanceNotifications';
interface MaintenanceTask {
  id: string;
  user_id: string;
  home_id: string;
  template_id?: string;
  title: string;
  description: string;
  category: string;
  frequency_days: number;
  last_completed_at: string | null;
  next_due_date: string;
  is_custom: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
interface MaintenanceCompletion {
  id: string;
  task_id: string;
  completed_at: string;
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
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [completions, setCompletions] = useState<MaintenanceCompletion[]>([]);
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
      } = await supabase.from('user_maintenance_tasks').select('*').eq('user_id', user.id).eq('home_id', selectedHomeId).eq('is_active', true).order('next_due_date', {
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
      const { data, error } = await supabase
        .from('maintenance_completions')
        .select(`
          id,
          task_id,
          completed_at,
          notes,
          photo_url,
          user_maintenance_tasks!inner (
            title,
            category,
            home_id
          )
        `)
        .eq('user_id', user.id)
        .eq('user_maintenance_tasks.home_id', selectedHomeId)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      // Transform the data structure
      const transformedData = data?.map(completion => ({
        id: completion.id,
        task_id: completion.task_id,
        completed_at: completion.completed_at,
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
    if (!task.last_completed_at) return 0;
    const lastCompleted = new Date(task.last_completed_at);
    const nextDue = new Date(task.next_due_date);
    const now = new Date();
    const totalDays = task.frequency_days;
    const daysSinceCompletion = differenceInDays(now, lastCompleted);
    return Math.min(Math.max(daysSinceCompletion / totalDays * 100, 0), 100);
  };
  const getTaskStatus = (task: MaintenanceTask) => {
    const dueDate = new Date(task.next_due_date);
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
    if (categoryFilter === 'all') {
      return tasks;
    }
    return tasks.filter(task => task.category === categoryFilter);
  };
  const categories = ['appliances', 'hvac', 'safety', 'plumbing', 'exterior', 'general'];
  const categoryLabels: Record<string, string> = {
    appliances: 'Appliances',
    hvac: 'HVAC',
    safety: 'Safety',
    plumbing: 'Plumbing',
    exterior: 'Exterior',
    general: 'General'
  };
  return <>
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Home className="h-4 w-4 sm:h-5 sm:w-5" />
              Home Maintenance Tracker
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Home Selection */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <Select value={selectedHomeId} onValueChange={setSelectedHomeId}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Select a home" />
                </SelectTrigger>
                <SelectContent>
                  {homes.map(home => <SelectItem key={home.id} value={home.id}>
                      {home.name} {home.address && `- ${home.address}`}
                    </SelectItem>)}
                </SelectContent>
              </Select>

              {selectedHomeId && tasks.length > 0 && (
                <MaintenancePdfPrinter 
                  tasks={tasks}
                  completions={completions}
                  homeName={homes.find(h => h.id === selectedHomeId)?.name || 'Home'}
                />
              )}
            </div>

            {selectedHomeId && <Tabs defaultValue="tasks" className="w-full">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="tasks">Active</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                  <TabsTrigger value="notifications">Alerts</TabsTrigger>
                </TabsList>

                <TabsContent value="tasks" className="space-y-4">
                  {/* Category Filter */}
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories ({tasks.length})</SelectItem>
                        {categories.map(category => {
                      const count = tasks.filter(task => task.category === category).length;
                      return count > 0 ? <SelectItem key={category} value={category}>
                              {categoryLabels[category]} ({count})
                            </SelectItem> : null;
                    })}
                      </SelectContent>
                    </Select>
                    
                    <Button onClick={() => setShowAddTask(true)} disabled={!selectedHomeId} className="w-6 h-6 p-0" title="Add Task">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto space-y-3">
                    {loading ? <div className="text-center py-8">Loading tasks...</div> : getFilteredTasks().length === 0 ? <Card>
                        <CardContent className="pt-6">
                          <div className="text-center py-8">
                            <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">
                              {tasks.length === 0 ? 'No maintenance tasks yet' : 'No tasks in this category'}
                            </h3>
                            <p className="text-muted-foreground mb-4">
                              {tasks.length === 0 ? 'Add your first maintenance task to start tracking your home maintenance.' : 'Try selecting a different category or add a new task.'}
                            </p>
                            <Button onClick={() => setShowAddTask(true)}>
                              <Plus className="h-4 w-4 mr-2" />
                              {tasks.length === 0 ? 'Add Your First Task' : 'Add New Task'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card> : getFilteredTasks().map(task => {
                  const progress = getTaskProgress(task);
                  const {
                    status,
                    color,
                    icon: StatusIcon
                  } = getTaskStatus(task);
                  return <Card key={task.id} className="hover:shadow-sm transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium text-sm truncate">{task.title}</h4>
                                    
                                    {task.is_custom && <Badge variant="outline" className="text-xs">Custom</Badge>}
                                  </div>
                                  <div className="text-xs text-muted-foreground mb-2">
                                    Due: {format(new Date(task.next_due_date), 'MMM dd, yyyy')}
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                      <span>Progress</span>
                                      <span>{Math.round(progress)}%</span>
                                    </div>
                                    <Progress value={progress} className="h-1" />
                                  </div>
                                </div>
                                 <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 ml-2 sm:ml-3 shrink-0">
                                   <Button onClick={() => handleTaskComplete(task)} size="sm" className="w-6 h-6 p-0 bg-green-600 hover:bg-green-700 text-white" title="Complete Task">
                                     <CheckCircle className="h-3 w-3" />
                                   </Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleDeleteTask(task.id)} className="w-4 h-4 p-0" title="Delete Task">
                                      <Trash2 className="h-1 w-1" />
                                    </Button>
                                 </div>
                              </div>
                            </CardContent>
                          </Card>;
                })}
                  </div>
                </TabsContent>

                <TabsContent value="history" className="max-w-full overflow-hidden">
                  <div className="max-h-[60vh] overflow-y-auto">
                    <MaintenanceHistoryTab selectedHomeId={selectedHomeId} />
                  </div>
                </TabsContent>

                <TabsContent value="notifications" className="max-w-full overflow-hidden">
                  <div className="max-h-[60vh] overflow-y-auto">
                    <MaintenanceNotifications selectedHomeId={selectedHomeId} />
                  </div>
                </TabsContent>
              </Tabs>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialogs */}
      <AddMaintenanceTaskDialog open={showAddTask} onOpenChange={setShowAddTask} homeId={selectedHomeId} onTaskAdded={fetchTasks} />

      {selectedTask && <TaskCompletionDialog open={!!selectedTask} onOpenChange={open => !open && setSelectedTask(null)} task={selectedTask} onCompleted={handleTaskCompleted} />}
    </>;
};