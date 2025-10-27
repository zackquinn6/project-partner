import { useState, useMemo, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2, ChevronDown, ChevronUp, Plus, Link2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/useResponsive";
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
  onDelete: (taskId: string) => void;
  onLinkProject: (task: HomeTask) => void;
  onRapidCosting: (task: HomeTask) => void;
  onAddTask?: () => void;
  onProjectNavigate?: () => void;
  onTaskUpdate?: () => void;
}
type SortField = 'title' | 'priority' | 'diy_level' | 'due_date';
type SortDirection = 'asc' | 'desc';
export function HomeTasksTable({
  tasks,
  onEdit,
  onDelete,
  onLinkProject,
  onRapidCosting,
  onAddTask,
  onProjectNavigate,
  onTaskUpdate
}: HomeTasksTableProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sortField, setSortField] = useState<SortField>('due_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterDiyLevel, setFilterDiyLevel] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [projectStatuses, setProjectStatuses] = useState<Record<string, string>>({});
  const [subtasks, setSubtasks] = useState<Record<string, Subtask[]>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);

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

  const handleToggleTaskComplete = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'closed' ? 'open' : 'closed';
    const { error } = await supabase
      .from('home_tasks')
      .update({ status: newStatus })
      .eq('id', taskId);

    if (!error) {
      onTaskUpdate?.();
    }
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
  return <div className="space-y-3">
      {/* Filters and Add Task Button */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1 items-center">
          <Input placeholder="Search tasks..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="max-w-xs text-xs h-8" />
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-24 sm:w-32 text-xs h-8">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterDiyLevel} onValueChange={setFilterDiyLevel}>
            <SelectTrigger className="w-24 sm:w-32 text-xs h-8">
              <SelectValue placeholder="DIY Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
              <SelectItem value="pro">Professional</SelectItem>
            </SelectContent>
          </Select>
          {isMobile ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCompleted(!showCompleted)}
              className="h-8 px-2 text-xs border"
            >
              {showCompleted ? "Hide done" : "Show done"}
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <Checkbox 
                id="show-completed" 
                checked={showCompleted}
                onCheckedChange={(checked) => setShowCompleted(checked as boolean)}
                className="h-3 w-3"
              />
              <label htmlFor="show-completed" className="text-[10px] sm:text-xs cursor-pointer whitespace-nowrap">
                Show completed
              </label>
            </div>
          )}
        </div>
        {onAddTask && (
          <Button onClick={onAddTask} size="sm" className="h-8 w-8 p-0 sm:w-auto sm:px-3 flex-shrink-0" title="Add Task">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Add Task</span>
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-auto max-h-[50vh]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                {!isMobile && <TableHead className="w-8 text-xs"></TableHead>}
                <TableHead className="w-[375px] text-xs">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('title')} className="h-6 px-2 text-xs font-medium">
                    Task <SortIcon field="title" />
                  </Button>
                </TableHead>
                <TableHead className="w-[180px] text-xs">Notes</TableHead>
                <TableHead className="w-[60px] text-xs">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('priority')} className="h-6 px-2 text-xs font-medium">
                    Priority <SortIcon field="priority" />
                  </Button>
                </TableHead>
                <TableHead className="w-[60px] text-xs">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('diy_level')} className="h-6 px-2 text-xs font-medium">
                    DIY Level <SortIcon field="diy_level" />
                  </Button>
                </TableHead>
                <TableHead className="w-[100px] text-xs">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('due_date')} className="h-6 px-2 text-xs font-medium">
                    Due Date <SortIcon field="due_date" />
                  </Button>
                </TableHead>
                <TableHead className="w-[150px] text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedTasks.length === 0 ? <TableRow>
                  <TableCell colSpan={isMobile ? 6 : 7} className="text-center py-8 text-xs text-muted-foreground">
                    No tasks found. Add your first task to get started!
                  </TableCell>
                </TableRow> : filteredAndSortedTasks.map(task => (
                  <>
                    <TableRow key={task.id} className={task.status === 'closed' ? 'opacity-60' : ''}>
                      {!isMobile && (
                        <TableCell className="w-8">
                          <button
                            onClick={() => handleToggleTaskComplete(task.id, task.status)}
                            className="text-xs font-medium hover:opacity-70 transition-opacity touch-target min-h-[44px] min-w-[44px] flex items-center justify-center -m-2"
                            title={task.status === 'closed' ? 'Mark as open' : 'Mark as complete'}
                          >
                            {task.status === 'closed' ? '✓' : '○'}
                          </button>
                        </TableCell>
                      )}
                     <TableCell>
                      <div className="flex items-center gap-2">
                        <span 
                          className={`text-xs font-medium cursor-pointer ${task.status === 'closed' ? 'line-through text-muted-foreground' : ''}`}
                          onClick={() => handleToggleTaskComplete(task.id, task.status)}
                        >
                          {task.status === 'closed' ? '✓ ' : ''}{task.title}
                        </span>
                        {subtasks[task.id]?.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRow(task.id)}
                            className="h-5 w-5 p-0"
                          >
                            {expandedRows.has(task.id) ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs truncate max-w-[180px]" title={task.notes || ''}>
                      {task.notes || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityColor(task.priority)} className="text-[10px] px-1.5 py-0">
                        {task.priority === 'medium' ? 'med' : task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getDiyLevelColor(task.diy_level)} className="text-[10px] px-1.5 py-0">
                        {task.diy_level === 'beginner' ? 'new' : 
                         task.diy_level === 'intermediate' ? 'mid' : 
                         task.diy_level === 'advanced' ? 'adv' : 'pro'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => onRapidCosting(task)} 
                          className="h-7 px-2"
                          title="Cost Assessment"
                        >
                          <span className="text-xs">$</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => onLinkProject(task)} 
                          className="h-7 px-2"
                          title={task.project_run_id ? "Linked to project" : "Link to project"}
                        >
                          <Link2 className="h-3 w-3" />
                        </Button>
                        {task.project_run_id && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              onProjectNavigate?.();
                              navigate('/', { state: { view: 'user', projectRunId: task.project_run_id } });
                            }} 
                            className="h-7 px-2"
                            title="Open linked project"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => onEdit(task)} className="h-7 px-2">
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onDelete(task.id)} className="h-7 px-2 text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                   {expandedRows.has(task.id) && subtasks[task.id]?.length > 0 && (
                    <TableRow key={`${task.id}-subtasks`}>
                      <TableCell colSpan={isMobile ? 6 : 7} className="bg-muted/50 p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">Subtasks (read-only)</div>
                            <Badge variant="outline" className="text-xs">
                              Edit task to manage subtasks
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            {subtasks[task.id].map((subtask, index) => (
                              <div
                                key={subtask.id}
                                className={`flex items-center gap-2 p-2 border rounded bg-background ${
                                  subtask.completed ? 'opacity-60' : ''
                                }`}
                              >
                                {task.ordered && (
                                  <div className="text-xs font-semibold text-muted-foreground w-6">
                                    {index + 1}.
                                  </div>
                                )}
                                <button
                                  onClick={() => handleToggleSubtaskComplete(subtask.id, subtask.completed)}
                                  className="h-6 w-6 flex items-center justify-center text-sm hover:opacity-70 transition-opacity"
                                  title={subtask.completed ? 'Mark as incomplete' : 'Mark as complete'}
                                >
                                  {subtask.completed ? '✓' : '○'}
                                </button>
                                <div 
                                  className={`text-xs flex-1 cursor-pointer ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}
                                  onClick={() => handleToggleSubtaskComplete(subtask.id, subtask.completed)}
                                >
                                  {subtask.title}
                                </div>
                                <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                                  {subtask.estimated_hours}h
                                </Badge>
                                <Badge variant="outline" className="text-[10px] px-2 py-0.5">
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
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>;
}