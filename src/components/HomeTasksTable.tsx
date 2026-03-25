import React, { useState, useMemo, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, ChevronDown, ChevronUp, Plus, Link2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/useResponsive";
import { useAuth } from "@/contexts/AuthContext";
import { useEnhancedAchievements } from "@/hooks/useEnhancedAchievements";

interface HomeTask {
  id: string;
  title: string;
  description: string | null;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'closed';
  diy_level: 'beginner' | 'intermediate' | 'advanced' | 'pro';
  notes: string | null;
  due_date: string | null;
  task_type: 'general' | 'pre_sale' | 'diy' | 'contractor';
  created_at: string;
  project_run_id: string | null;
  ordered: boolean;
}

function xpForHomeTaskComplete(task: HomeTask): number {
  const base = 18;
  const diyMult =
    task.diy_level === "beginner"
      ? 1
      : task.diy_level === "intermediate"
        ? 1.2
        : task.diy_level === "advanced"
          ? 1.45
          : 1.65;
  const priMult =
    task.priority === "low" ? 1 : task.priority === "medium" ? 1.1 : 1.22;
  return Math.round(base * diyMult * priMult);
}

interface Subtask {
  id: string;
  title: string;
  estimated_hours: number | null;
  diy_level: 'beginner' | 'intermediate' | 'advanced' | 'pro';
  completed: boolean;
  order_index: number;
}
interface HomeTasksTableProps {
  tasks: HomeTask[];
  onEdit: (task: HomeTask) => void;
  onLinkProject: (task: HomeTask) => void;
  onRapidCosting: (task: HomeTask) => void;
  onAddTask?: () => void;
  onProjectNavigate?: () => void;
  /** When set, opening a linked catalog project run uses this (e.g. membership gate) instead of navigating directly. */
  onOpenLinkedProjectRun?: (projectRunId: string) => void;
  onTaskUpdate?: () => void;
}
type SortField = 'title' | 'priority' | 'diy_level' | 'due_date';
type SortDirection = 'asc' | 'desc';
export function HomeTasksTable({
  tasks,
  onEdit,
  onLinkProject,
  onRapidCosting,
  onAddTask,
  onProjectNavigate,
  onOpenLinkedProjectRun,
  onTaskUpdate
}: HomeTasksTableProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { awardXP, checkMilestoneUnlocks } = useEnhancedAchievements(user?.id);
  const [sortField, setSortField] = useState<SortField>('due_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterDiyLevel, setFilterDiyLevel] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [projectStatuses, setProjectStatuses] = useState<Record<string, string>>({});
  const [subtasks, setSubtasks] = useState<Record<string, Subtask[]>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  const [swipedTaskId, setSwipedTaskId] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(0);
    setTouchStartX(e.targetTouches[0].clientX);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };
  const handleTouchEnd = (taskId: string) => {
    if (!touchStartX || !touchEndX) return;
    const delta = touchStartX - touchEndX;
    if (delta > 50) setSwipedTaskId(taskId);
    else if (delta < -30) setSwipedTaskId(null);
  };

  useEffect(() => {
    fetchProjectStatuses();
    fetchSubtasks();
  }, [tasks]);

  const fetchProjectStatuses = async () => {
    const projectRunIds = tasks
      .filter(t => t.project_run_id)
      .map(t => t.project_run_id as string);
    
    if (projectRunIds.length === 0) return;

    const { data } = await supabase
      .from("project_runs")
      .select("id, status")
      .in("id", projectRunIds);

    if (data) {
      const statusMap: Record<string, string> = {};
      data.forEach(pr => {
        statusMap[pr.id] = pr.status;
      });
      setProjectStatuses(statusMap);
    }
  };

  const fetchSubtasks = async () => {
    const taskIds = tasks.map(t => t.id);
    
    if (taskIds.length === 0) return;

    const { data } = await supabase
      .from("home_task_subtasks")
      .select("*")
      .in("task_id", taskIds)
      .order('order_index', { ascending: true });

    if (data) {
      const subtaskMap: Record<string, Subtask[]> = {};
      data.forEach((st: any) => {
        if (!subtaskMap[st.task_id]) {
          subtaskMap[st.task_id] = [];
        }
        subtaskMap[st.task_id].push(st);
      });
      setSubtasks(subtaskMap);
    }
  };

  const toggleRow = (taskId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedRows(newExpanded);
  };

  const handleToggleSubtaskComplete = async (subtaskId: string, currentCompleted: boolean) => {
    const { error } = await supabase
      .from('home_task_subtasks')
      .update({ completed: !currentCompleted })
      .eq('id', subtaskId);

    if (!error) {
      fetchSubtasks();
    }
  };

  const handleToggleTaskComplete = async (task: HomeTask) => {
    const newStatus = task.status === "closed" ? "open" : "closed";
    const { error } = await supabase
      .from("home_tasks")
      .update({ status: newStatus })
      .eq("id", task.id);

    if (error) return;

    if (newStatus === "closed") {
      const xp = xpForHomeTaskComplete(task);
      await awardXP(xp, `Task completed: ${task.title}`);
      await checkMilestoneUnlocks();
    }

    onTaskUpdate?.();
  };

  const getDisplayStatus = (task: HomeTask) => {
    if (task.project_run_id && projectStatuses[task.project_run_id]) {
      return projectStatuses[task.project_run_id];
    }
    return task.status;
  };
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  const SortIcon = ({
    field
  }: {
    field: SortField;
  }) => {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 opacity-30" />;
    return sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = [...tasks];

    // Hide completed tasks unless showCompleted is true
    if (!showCompleted) {
      filtered = filtered.filter(task => task.status !== 'closed');
    }

    // Apply filters
    if (searchTerm) {
      filtered = filtered.filter(task => task.title.toLowerCase().includes(searchTerm.toLowerCase()) || task.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }
    if (filterDiyLevel !== 'all') {
      filtered = filtered.filter(task => task.diy_level === filterDiyLevel);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      if (sortField === 'priority') {
        const priorityOrder = {
          high: 3,
          medium: 2,
          low: 1
        };
        aVal = priorityOrder[a.priority];
        bVal = priorityOrder[b.priority];
      } else if (sortField === 'diy_level') {
        const diyLevelOrder = {
          pro: 4,
          advanced: 3,
          intermediate: 2,
          beginner: 1
        };
        aVal = diyLevelOrder[a.diy_level];
        bVal = diyLevelOrder[b.diy_level];
      } else if (sortField === 'due_date') {
        aVal = a.due_date ? new Date(a.due_date).getTime() : 0;
        bVal = b.due_date ? new Date(b.due_date).getTime() : 0;
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [tasks, sortField, sortDirection, filterPriority, filterDiyLevel, searchTerm, showCompleted]);
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'default';
      case 'in_progress':
        return 'default';
      case 'closed':
        return 'secondary';
      default:
        return 'default';
    }
  };
  const getDiyLevelColor = (level: string) => {
    switch (level) {
      case 'pro':
        return 'destructive';
      case 'advanced':
        return 'destructive';
      case 'intermediate':
        return 'default';
      case 'beginner':
        return 'secondary';
      default:
        return 'default';
    }
  };
  const diyLevels: Array<{ id: string; label: string; labelDesktop?: string }> = [
    { id: 'all', label: 'All' },
    { id: 'beginner', label: 'Beg', labelDesktop: 'Beginner' },
    { id: 'intermediate', label: 'Int', labelDesktop: 'Intermediate' },
    { id: 'advanced', label: 'Adv', labelDesktop: 'Advanced' },
    { id: 'pro', label: 'Pro', labelDesktop: 'Professional' },
  ];

  return <div className="space-y-2 md:space-y-3 flex flex-col h-full">
      {/* Full-width desktop (xl+): DIY level pills + inline “Show completed” */}
      <div className="hidden xl:flex flex-row gap-4 items-center pt-3">
        {onAddTask && (
          <Button
            onClick={onAddTask}
            size="sm"
            variant="outline"
            className="h-8 min-h-8 py-1.5 px-2.5 md:h-8 md:w-auto md:min-h-0 md:px-3 md:py-2 shrink-0 text-xs border-blue-600 bg-transparent text-blue-600 hover:bg-blue-50 hover:border-blue-600 md:border-blue-600 md:bg-blue-600 md:text-white md:hover:bg-blue-700 md:hover:border-blue-700 rounded-md flex items-center justify-center gap-1.5"
            title="Add Task"
          >
            <Plus className="h-4 w-4 shrink-0 text-blue-600 md:text-primary" strokeWidth={2.5} aria-hidden />
            <span className="hidden sm:inline">Add Task</span>
          </Button>
        )}
        <div className="flex flex-wrap gap-2 flex-1 items-center min-w-0">
          <Input placeholder="Search tasks..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="max-w-xs text-xs h-8" />
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-20 sm:w-28 text-xs h-8">
              <SelectValue>
                {filterPriority === 'all' ? 'Priority' : filterPriority === 'high' ? 'High' : filterPriority === 'medium' ? 'Med' : 'Low'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-[100]">
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 flex-wrap">
            {diyLevels.map(level => (
              <button
                key={level.id}
                type="button"
                onClick={() => setFilterDiyLevel(level.id)}
                className={`px-2 h-8 rounded-full text-[11px] border transition-colors ${
                  filterDiyLevel === level.id
                    ? 'bg-slate-900 text-slate-50 border-slate-900'
                    : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80'
                }`}
              >
                {level.labelDesktop ?? level.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto border border-input rounded-lg px-3 py-1.5 bg-background">
            <Checkbox 
              id="show-completed" 
              checked={showCompleted}
              onCheckedChange={(checked) => setShowCompleted(checked as boolean)}
              className="h-5 w-5 rounded-full border-2"
            />
            <label htmlFor="show-completed" className="text-sm cursor-pointer whitespace-nowrap">
              Show completed
            </label>
          </div>
        </div>
      </div>

      {/* Tablet / slim desktop (md–lg): filters as dropdowns + Show Done button (same pattern as mobile) */}
      <div className="hidden md:flex xl:hidden flex-col gap-2 mb-1 pt-3">
        <Input
          placeholder="Search tasks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="text-sm h-8 w-full max-w-xl"
        />
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-8 text-xs min-w-[7.5rem] flex-1 sm:flex-none sm:w-36">
              <SelectValue>
                {filterPriority === 'all' ? 'Priority' : filterPriority === 'high' ? 'High' : filterPriority === 'medium' ? 'Med' : 'Low'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-[100]">
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High Priority</SelectItem>
              <SelectItem value="medium">Medium Priority</SelectItem>
              <SelectItem value="low">Low Priority</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterDiyLevel} onValueChange={setFilterDiyLevel}>
            <SelectTrigger className="h-8 text-xs min-w-[7.5rem] flex-1 sm:flex-none sm:w-36">
              <SelectValue>
                {filterDiyLevel === 'all' ? 'DIY level' : filterDiyLevel === 'beginner' ? 'Beginner' : filterDiyLevel === 'intermediate' ? 'Intermediate' : filterDiyLevel === 'advanced' ? 'Advanced' : 'Professional'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-[100]">
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
              <SelectItem value="pro">Professional</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCompleted(!showCompleted)}
            className="h-8 text-xs whitespace-nowrap px-3"
          >
            {showCompleted ? 'Hide' : 'Show'} Done
          </Button>

          {onAddTask && (
            <Button
              onClick={onAddTask}
              size="sm"
              variant="outline"
              className="h-8 shrink-0 text-xs border-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:border-blue-700"
              title="Add Task"
            >
              <Plus className="h-4 w-4 mr-1.5" aria-hidden />
              Add Task
            </Button>
          )}
        </div>
      </div>

      {/* Mobile filters and controls */}
      <div className="flex md:hidden flex-col gap-1.5 mb-1 pt-0.5">
        <Input
          placeholder="Search tasks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="text-sm h-7 w-full"
        />
        
        <div className="flex gap-2">
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue>
                {filterPriority === 'all' ? 'Priority' : filterPriority === 'high' ? 'High' : filterPriority === 'medium' ? 'Med' : 'Low'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-[100]">
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High Priority</SelectItem>
              <SelectItem value="medium">Medium Priority</SelectItem>
              <SelectItem value="low">Low Priority</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterDiyLevel} onValueChange={setFilterDiyLevel}>
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue>
                {filterDiyLevel === 'all' ? 'DIY' : filterDiyLevel === 'beginner' ? 'Beg' : filterDiyLevel === 'intermediate' ? 'Int' : filterDiyLevel === 'advanced' ? 'Adv' : 'Pro'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-[100]">
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
              <SelectItem value="pro">Professional</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCompleted(!showCompleted)}
            className="h-7 text-[10px] whitespace-nowrap px-2 border"
          >
            {showCompleted ? 'Hide' : 'Show'} Done
          </Button>
          
          {onAddTask && (
            <Button 
              onClick={onAddTask} 
              size="sm"
              className="h-7 w-7 p-0"
              title="Add Task"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Table: mobile = Task + Due date only; desktop = full columns */}
      <div className="border rounded-lg md:rounded-lg rounded-none border-x-0 md:border-x overflow-hidden flex-1">
        <div className="overflow-auto h-full">
          <Table>
            <TableHeader className="sticky top-0 bg-sky-600/80 text-white z-10 [&_th]:px-2 [&_th]:md:px-4 [&_th]:py-2 [&_th]:md:py-3">
              <TableRow className="border-sky-500/50">
                {!isMobile && <TableHead className="w-14 text-xs text-white"></TableHead>}
                <TableHead className="min-w-0 md:min-w-[281px] md:w-[281px] text-xs text-white">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('title')} className="h-6 px-1 md:px-2 text-xs font-medium text-white hover:bg-white/20 hover:text-white">
                    Task <SortIcon field="title" />
                  </Button>
                </TableHead>
                {!isMobile && <TableHead className="w-[180px] text-xs text-white">Notes</TableHead>}
                {!isMobile && (
                  <TableHead className="w-24 md:w-20 text-xs text-white">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('priority')} className="h-6 px-2 text-xs font-medium text-white hover:bg-white/20 hover:text-white">
                      Priority <SortIcon field="priority" />
                    </Button>
                  </TableHead>
                )}
                {!isMobile && (
                  <TableHead className="w-24 md:w-20 text-xs text-white">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('diy_level')} className="h-6 px-2 text-xs font-medium text-white hover:bg-white/20 hover:text-white">
                      DIY Level <SortIcon field="diy_level" />
                    </Button>
                  </TableHead>
                )}
                <TableHead className="w-[80px] md:w-24 text-xs text-white whitespace-nowrap">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('due_date')} className="h-6 px-1 md:px-2 text-xs font-medium text-white hover:bg-white/20 hover:text-white">
                    Due <SortIcon field="due_date" />
                  </Button>
                </TableHead>
                {!isMobile && <TableHead className="w-[150px] text-xs text-right text-white">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody className="[&_td]:px-2 [&_td]:md:px-4 [&_td]:py-2 [&_td]:md:py-3">
              {filteredAndSortedTasks.length === 0 ? <TableRow>
                  <TableCell colSpan={isMobile ? 2 : 7} className="text-center py-6 md:py-8 text-sm md:text-[18px] text-muted-foreground">
                    No tasks found. Add your first task to get started!
                  </TableCell>
                </TableRow> : filteredAndSortedTasks.map(task => (
                  <React.Fragment key={task.id}>
                    <TableRow
                      key={task.id}
                      className={task.status === 'closed' ? 'opacity-60' : ''}
                      {...(isMobile ? {
                        onTouchStart: handleTouchStart,
                        onTouchMove: handleTouchMove,
                        onTouchEnd: () => handleTouchEnd(task.id),
                      } : {})}
                    >
                      {!isMobile && (
                        <TableCell className="w-14 p-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleTaskComplete(task)}
                            className="h-12 w-12 min-h-12 min-w-12 p-0 text-lg font-medium rounded-md border-2 hover:bg-primary/10"
                            title={task.status === 'closed' ? 'Mark as open' : 'Mark as complete'}
                          >
                            {task.status === 'closed' ? '✓' : '○'}
                          </Button>
                        </TableCell>
                      )}
                     <TableCell className="min-w-0">
                      <div className="flex items-center gap-1.5 md:gap-2 flex-wrap min-w-0">
                        <span 
                          className={`text-sm md:text-[18px] font-medium cursor-pointer leading-tight min-w-0 truncate ${task.status === 'closed' ? 'line-through text-muted-foreground' : ''}`}
                          onClick={() => handleToggleTaskComplete(task)}
                        >
                          {task.status === 'closed' ? '✓ ' : ''}{task.title}
                        </span>
                        {isMobile && (
                          <Badge variant={getDiyLevelColor(task.diy_level)} className="text-xs px-1 py-0 shrink-0">
                            {task.diy_level === 'beginner' ? 'new' : task.diy_level === 'intermediate' ? 'mid' : task.diy_level === 'advanced' ? 'adv' : 'pro'}
                          </Badge>
                        )}
                        {subtasks[task.id]?.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRow(task.id)}
                            className="h-6 w-6 md:h-7 md:w-7 p-0 shrink-0"
                          >
                            {expandedRows.has(task.id) ? (
                              <ChevronUp className="h-4 w-4 md:h-[18px] md:w-[18px]" />
                            ) : (
                              <ChevronDown className="h-4 w-4 md:h-[18px] md:w-[18px]" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    {!isMobile && (
                      <TableCell className="text-[18px] truncate max-w-[180px]" title={task.notes || ''}>
                        {task.notes || '-'}
                      </TableCell>
                    )}
                    {!isMobile && (
                      <TableCell>
                        <Badge variant={getPriorityColor(task.priority)} className="text-[15px] px-1.5 py-0">
                          {task.priority === 'medium' ? 'med' : task.priority}
                        </Badge>
                      </TableCell>
                    )}
                    {!isMobile && (
                      <TableCell>
                        <Badge variant={getDiyLevelColor(task.diy_level)} className="text-[15px] px-1.5 py-0">
                          {task.diy_level === 'beginner' ? 'new' : 
                           task.diy_level === 'intermediate' ? 'mid' : 
                           task.diy_level === 'advanced' ? 'adv' : 'pro'}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="text-sm md:text-[18px] whitespace-nowrap">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString(undefined, isMobile ? { month: 'numeric', day: 'numeric', year: '2-digit' } : undefined) : '-'}
                    </TableCell>
                    {!isMobile && (
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRapidCosting(task)}
                            className="h-8 px-2"
                            title="Budget"
                            aria-label="Budget"
                          >
                            <span className="text-[18px]">$</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (task.project_run_id) {
                                if (onOpenLinkedProjectRun) {
                                  onOpenLinkedProjectRun(task.project_run_id);
                                } else {
                                  onProjectNavigate?.();
                                  navigate('/', { state: { view: 'user', projectRunId: task.project_run_id } });
                                }
                              } else {
                                onLinkProject(task);
                              }
                            }}
                            className="h-8 px-2"
                            title={task.project_run_id ? 'Open project' : 'Link to project'}
                            aria-label={task.project_run_id ? 'Open project' : 'Link to project'}
                          >
                            {task.project_run_id ? (
                              <ExternalLink className="h-[18px] w-[18px]" />
                            ) : (
                              <Link2 className="h-[18px] w-[18px]" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(task)}
                            className="h-8 px-2"
                            title="Edit"
                            aria-label="Edit"
                          >
                            <Pencil className="h-[18px] w-[18px]" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                  {isMobile && swipedTaskId === task.id && (
                    <TableRow key={`${task.id}-swipe-actions`} className="bg-muted/50">
                      <TableCell colSpan={2} className="py-2">
                        <div className="flex flex-wrap gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 text-[18px]"
                            onClick={() => {
                              onRapidCosting(task);
                              setSwipedTaskId(null);
                            }}
                          >
                            <span className="mr-1 text-[18px] font-medium">$</span>
                            Budget
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 text-[18px]"
                            onClick={() => {
                              if (task.project_run_id) {
                                if (onOpenLinkedProjectRun) {
                                  onOpenLinkedProjectRun(task.project_run_id);
                                } else {
                                  onProjectNavigate?.();
                                  navigate('/', { state: { view: 'user', projectRunId: task.project_run_id } });
                                }
                              } else {
                                onLinkProject(task);
                              }
                              setSwipedTaskId(null);
                            }}
                          >
                            {task.project_run_id ? (
                              <>
                                <ExternalLink className="mr-1 h-[18px] w-[18px]" />
                                Project
                              </>
                            ) : (
                              <>
                                <Link2 className="mr-1 h-[18px] w-[18px]" />
                                Project
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 text-[18px]"
                            onClick={() => {
                              onEdit(task);
                              setSwipedTaskId(null);
                            }}
                          >
                            <Pencil className="mr-1 h-[18px] w-[18px]" />
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                   {expandedRows.has(task.id) && subtasks[task.id]?.length > 0 && (
                    <TableRow key={`${task.id}-subtasks`}>
                      <TableCell colSpan={isMobile ? 2 : 7} className="bg-muted/30 p-2 md:p-4 border-l-4 border-l-primary/20">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-[18px] font-semibold text-primary">Subtasks</div>
                            <Badge variant="outline" className="text-[18px] bg-background">
                              Edit task to manage
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            {subtasks[task.id].map((subtask, index) => (
                              <div
                                key={subtask.id}
                                className={`flex items-center gap-2 p-2.5 border rounded-lg bg-background shadow-sm ${
                                  subtask.completed ? 'opacity-60' : ''
                                }`}
                              >
                                {task.ordered && (
                                  <div className="text-[18px] font-semibold text-muted-foreground w-6">
                                    {index + 1}.
                                  </div>
                                )}
                                <button
                                  onClick={() => handleToggleSubtaskComplete(subtask.id, subtask.completed)}
                                  className="h-7 w-7 flex items-center justify-center text-[18px] hover:opacity-70 transition-opacity"
                                  title={subtask.completed ? 'Mark as incomplete' : 'Mark as complete'}
                                >
                                  {subtask.completed ? '✓' : '○'}
                                </button>
                                <div 
                                  className={`text-[18px] flex-1 cursor-pointer leading-tight ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}
                                  onClick={() => handleToggleSubtaskComplete(subtask.id, subtask.completed)}
                                >
                                  {subtask.title}
                                </div>
                                <Badge variant="outline" className="text-[15px] px-2 py-0.5">
                                  {subtask.estimated_hours}h
                                </Badge>
                                <Badge variant="outline" className="text-[15px] px-2 py-0.5">
                                  {subtask.diy_level === 'beginner' ? 'new' : 
                                   subtask.diy_level === 'intermediate' ? 'mid' : 
                                   subtask.diy_level === 'advanced' ? 'adv' : 'pro'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>;
}