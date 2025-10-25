import { useState, useMemo, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2, ChevronDown, ChevronUp, Plus, Link2, ExternalLink, GripVertical, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
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
  assigned_person_id: string | null;
  assigned_person_name?: string;
}

interface Person {
  id: string;
  name: string;
}
interface HomeTasksTableProps {
  tasks: HomeTask[];
  onEdit: (task: HomeTask) => void;
  onDelete: (taskId: string) => void;
  onLinkProject: (task: HomeTask) => void;
  onAddTask?: () => void;
  onProjectNavigate?: () => void;
  onTaskUpdate?: () => void;
  userId: string;
  homeId: string | null;
}
type SortField = 'title' | 'priority' | 'diy_level' | 'due_date';
type SortDirection = 'asc' | 'desc';
export function HomeTasksTable({
  tasks,
  onEdit,
  onDelete,
  onLinkProject,
  onAddTask,
  onProjectNavigate,
  onTaskUpdate,
  userId,
  homeId
}: HomeTasksTableProps) {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>('due_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterDiyLevel, setFilterDiyLevel] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [projectStatuses, setProjectStatuses] = useState<Record<string, string>>({});
  const [subtasks, setSubtasks] = useState<Record<string, Subtask[]>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [newSubtask, setNewSubtask] = useState<Record<string, {
    title: string;
    estimated_hours: number;
    diy_level: 'beginner' | 'intermediate' | 'advanced' | 'pro';
    assigned_person_id: string | null;
  }>>({});

  useEffect(() => {
    fetchProjectStatuses();
    fetchSubtasks();
    fetchPeople();
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

  const fetchPeople = async () => {
    let query = supabase
      .from('home_task_people')
      .select('id, name')
      .eq('user_id', userId);
    
    if (homeId) {
      query = query.eq('home_id', homeId);
    }

    const { data, error } = await query;
    if (!error && data) {
      setPeople(data);
    }
  };

  const fetchSubtasks = async () => {
    const taskIds = tasks.map(t => t.id);
    
    if (taskIds.length === 0) return;

    const { data } = await supabase
      .from("home_task_subtasks")
      .select(`
        *,
        assigned_person:home_task_people!assigned_person_id(name)
      `)
      .in("task_id", taskIds)
      .order('order_index', { ascending: true });

    if (data) {
      const subtaskMap: Record<string, Subtask[]> = {};
      data.forEach((st: any) => {
        if (!subtaskMap[st.task_id]) {
          subtaskMap[st.task_id] = [];
        }
        subtaskMap[st.task_id].push({
          ...st,
          assigned_person_name: (st.assigned_person as any)?.name || null
        });
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

  const handleOrderedChange = async (taskId: string, ordered: boolean) => {
    const { error } = await supabase
      .from('home_tasks')
      .update({ ordered })
      .eq('id', taskId);
    
    if (!error) {
      onTaskUpdate?.();
    }
  };

  const getNewSubtask = (taskId: string) => {
    return newSubtask[taskId] || {
      title: '',
      estimated_hours: 1,
      diy_level: 'intermediate' as const,
      assigned_person_id: null
    };
  };

  const updateNewSubtask = (taskId: string, updates: Partial<typeof newSubtask[string]>) => {
    setNewSubtask(prev => ({
      ...prev,
      [taskId]: { ...getNewSubtask(taskId), ...updates }
    }));
  };

  const handleAddSubtask = async (taskId: string) => {
    const subtask = getNewSubtask(taskId);
    if (!subtask.title.trim()) return;

    const taskSubtasks = subtasks[taskId] || [];
    const { error } = await supabase
      .from('home_task_subtasks')
      .insert([{
        task_id: taskId,
        user_id: userId,
        title: subtask.title,
        estimated_hours: subtask.estimated_hours,
        diy_level: subtask.diy_level,
        assigned_person_id: subtask.assigned_person_id,
        order_index: taskSubtasks.length
      }]);

    if (!error) {
      setNewSubtask(prev => {
        const updated = { ...prev };
        delete updated[taskId];
        return updated;
      });
      fetchSubtasks();
    }
  };

  const handleUpdateAssignment = async (subtaskId: string, personId: string | null) => {
    const { error } = await supabase
      .from('home_task_subtasks')
      .update({ assigned_person_id: personId })
      .eq('id', subtaskId);

    if (!error) {
      fetchSubtasks();
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    const { error } = await supabase
      .from('home_task_subtasks')
      .delete()
      .eq('id', subtaskId);

    if (!error) {
      fetchSubtasks();
    }
  };

  const handleDragEnd = async (result: DropResult, taskId: string) => {
    if (!result.destination) return;

    const taskSubtasks = subtasks[taskId] || [];
    const items = Array.from(taskSubtasks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update local state immediately
    setSubtasks(prev => ({
      ...prev,
      [taskId]: items
    }));

    // Update order_index for all affected subtasks
    const updates = items.map((item, index) => 
      supabase
        .from('home_task_subtasks')
        .update({ order_index: index })
        .eq('id', item.id)
    );

    await Promise.all(updates);
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
                <TableHead className="w-8 text-xs"></TableHead>
                <TableHead className="w-[250px] text-xs">
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
                  <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                    No tasks found. Add your first task to get started!
                  </TableCell>
                </TableRow> : filteredAndSortedTasks.map(task => (
                  <>
                    <TableRow key={task.id} className={task.status === 'closed' ? 'opacity-60' : ''}>
                      <TableCell className="w-8">
                        <button
                          onClick={() => handleToggleTaskComplete(task.id, task.status)}
                          className="text-xs font-medium hover:opacity-70 transition-opacity touch-target min-h-[44px] min-w-[44px] flex items-center justify-center -m-2"
                          title={task.status === 'closed' ? 'Mark as open' : 'Mark as complete'}
                        >
                          {task.status === 'closed' ? '✓' : '○'}
                        </button>
                      </TableCell>
                     <TableCell>
                      <div className="flex items-center gap-2">
                        <span 
                          className={`text-xs font-medium cursor-pointer ${task.status === 'closed' ? 'line-through text-muted-foreground' : ''}`}
                          onClick={() => handleToggleTaskComplete(task.id, task.status)}
                        >
                          {task.title}
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
                          onClick={() => toggleRow(task.id)} 
                          className="h-7 px-2"
                          title="Manage subtasks"
                        >
                          <Plus className="h-3 w-3" />
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
                  {expandedRows.has(task.id) && (
                    <TableRow key={`${task.id}-subtasks`}>
                      <TableCell colSpan={7} className="bg-muted/50 p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">Subtasks</div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-muted-foreground">Order matters:</label>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant={!task.ordered ? "default" : "outline"}
                                  onClick={() => handleOrderedChange(task.id, false)}
                                  className="h-7 px-2 text-xs"
                                >
                                  No
                                </Button>
                                <Button
                                  size="sm"
                                  variant={task.ordered ? "default" : "outline"}
                                  onClick={() => handleOrderedChange(task.id, true)}
                                  className="h-7 px-2 text-xs"
                                >
                                  Yes
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Add new subtask form */}
                          <div className="grid grid-cols-1 gap-2 p-3 border rounded bg-background">
                            <Input
                              placeholder="New subtask title"
                              value={getNewSubtask(task.id).title}
                              onChange={(e) => updateNewSubtask(task.id, { title: e.target.value })}
                              className="text-xs h-9"
                            />
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <Input
                                type="number"
                                min="0.25"
                                step="0.25"
                                value={getNewSubtask(task.id).estimated_hours}
                                onChange={(e) => updateNewSubtask(task.id, { estimated_hours: parseFloat(e.target.value) })}
                                className="text-xs h-9"
                                placeholder="Hours"
                              />
                              <Select 
                                value={getNewSubtask(task.id).diy_level} 
                                onValueChange={(val) => updateNewSubtask(task.id, { diy_level: val as any })}
                              >
                                <SelectTrigger className="text-xs h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="beginner">Beginner</SelectItem>
                                  <SelectItem value="intermediate">Intermediate</SelectItem>
                                  <SelectItem value="advanced">Advanced</SelectItem>
                                  <SelectItem value="pro">Professional</SelectItem>
                                </SelectContent>
                              </Select>
                              <Select 
                                value={getNewSubtask(task.id).assigned_person_id || "unassigned"} 
                                onValueChange={(val) => updateNewSubtask(task.id, { assigned_person_id: val === 'unassigned' ? null : val })}
                              >
                                <SelectTrigger className="text-xs h-9">
                                  <SelectValue placeholder="Assign to" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unassigned">Unassigned</SelectItem>
                                  {people.map(person => (
                                    <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button onClick={() => handleAddSubtask(task.id)} size="sm" className="h-9 text-xs">
                                <Plus className="h-4 w-4 mr-1" />
                                Add
                              </Button>
                            </div>
                          </div>

                          {/* Subtasks list with drag-drop */}
                          <DragDropContext onDragEnd={(result) => handleDragEnd(result, task.id)}>
                            <Droppable droppableId={`subtasks-${task.id}`}>
                              {(provided) => (
                                <div 
                                  {...provided.droppableProps}
                                  ref={provided.innerRef}
                                  className="space-y-2"
                                >
                                  {(!subtasks[task.id] || subtasks[task.id].length === 0) ? (
                                    <p className="text-xs text-muted-foreground text-center py-4">No subtasks yet</p>
                                  ) : (
                                    subtasks[task.id].map((subtask, index) => (
                                      <Draggable key={subtask.id} draggableId={subtask.id} index={index}>
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className={`grid ${task.ordered ? 'grid-cols-[auto,auto,auto,1fr,auto,auto,auto,auto]' : 'grid-cols-[auto,auto,1fr,auto,auto,auto,auto]'} gap-2 items-center p-2 border rounded bg-background ${
                                              subtask.completed ? 'opacity-60' : ''
                                            } ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                                          >
                                            <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                                              <GripVertical className="h-4 w-4" />
                                            </div>
                                            {task.ordered && (
                                              <div className="text-xs font-semibold text-muted-foreground w-6 text-center">
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
                                              className={`text-xs cursor-pointer ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}
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
                                            <Select 
                                              value={subtask.assigned_person_id || "unassigned"}
                                              onValueChange={(val) => handleUpdateAssignment(subtask.id, val === 'unassigned' ? null : val)}
                                              disabled={subtask.completed}
                                            >
                                              <SelectTrigger className="w-32 h-7 text-xs px-2">
                                                <SelectValue>
                                                  {subtask.assigned_person_name ? (
                                                    <span className="flex items-center gap-1">
                                                      <User className="h-2.5 w-2.5" />
                                                      <span className="truncate">{subtask.assigned_person_name}</span>
                                                    </span>
                                                  ) : (
                                                    'Unassign'
                                                  )}
                                                </SelectValue>
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                                {people.map(person => (
                                                  <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                            <button
                                              onClick={() => handleDeleteSubtask(subtask.id)}
                                              className="h-6 w-6 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded transition-colors"
                                              title="Delete subtask"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                          </div>
                                        )}
                                      </Draggable>
                                    ))
                                  )}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </DragDropContext>
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