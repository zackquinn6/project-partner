import { useState, useMemo, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Pencil, Trash2, ChevronDown, ChevronUp, Plus, Link2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
interface HomeTask {
  id: string;
  title: string;
  description: string | null;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'closed';
  skill_level: 'high' | 'medium' | 'low';
  notes: string | null;
  due_date: string | null;
  task_type: 'general' | 'pre_sale' | 'diy' | 'contractor';
  created_at: string;
  project_run_id: string | null;
}

interface Subtask {
  id: string;
  title: string;
  estimated_hours: number | null;
  skill_level: 'high' | 'medium' | 'low';
}
interface HomeTasksTableProps {
  tasks: HomeTask[];
  onEdit: (task: HomeTask) => void;
  onDelete: (taskId: string) => void;
  onAddSubtasks: (task: HomeTask) => void;
  onLinkProject: (task: HomeTask) => void;
}
type SortField = 'title' | 'priority' | 'status' | 'skill_level' | 'due_date' | 'task_type';
type SortDirection = 'asc' | 'desc';
export function HomeTasksTable({
  tasks,
  onEdit,
  onDelete,
  onAddSubtasks,
  onLinkProject
}: HomeTasksTableProps) {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>('due_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSkill, setFilterSkill] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [projectStatuses, setProjectStatuses] = useState<Record<string, string>>({});
  const [subtasks, setSubtasks] = useState<Record<string, Subtask[]>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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
      .in("task_id", taskIds);

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

    // Apply filters
    if (searchTerm) {
      filtered = filtered.filter(task => task.title.toLowerCase().includes(searchTerm.toLowerCase()) || task.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }
    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }
    if (filterSkill !== 'all') {
      filtered = filtered.filter(task => task.skill_level === filterSkill);
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
      } else if (sortField === 'skill_level') {
        const skillOrder = {
          high: 3,
          medium: 2,
          low: 1
        };
        aVal = skillOrder[a.skill_level];
        bVal = skillOrder[b.skill_level];
      } else if (sortField === 'due_date') {
        aVal = a.due_date ? new Date(a.due_date).getTime() : 0;
        bVal = b.due_date ? new Date(b.due_date).getTime() : 0;
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [tasks, sortField, sortDirection, filterPriority, filterStatus, filterSkill, searchTerm]);
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
  const getSkillColor = (skill: string) => {
    switch (skill) {
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
  return <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Search tasks..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="max-w-xs text-xs h-8" />
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-32 text-xs h-8">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32 text-xs h-8">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSkill} onValueChange={setFilterSkill}>
          <SelectTrigger className="w-32 text-xs h-8">
            <SelectValue placeholder="Skill" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Skills</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-auto max-h-[50vh]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[250px] text-xs">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('title')} className="h-6 px-2 text-xs font-medium">
                    Task <SortIcon field="title" />
                  </Button>
                </TableHead>
                <TableHead className="w-[100px] text-xs">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('priority')} className="h-6 px-2 text-xs font-medium">
                    Priority <SortIcon field="priority" />
                  </Button>
                </TableHead>
                <TableHead className="w-[100px] text-xs">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('status')} className="h-6 px-2 text-xs font-medium">
                    Status <SortIcon field="status" />
                  </Button>
                </TableHead>
                <TableHead className="w-[100px] text-xs">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('skill_level')} className="h-6 px-2 text-xs font-medium">
                    Skill <SortIcon field="skill_level" />
                  </Button>
                </TableHead>
                <TableHead className="w-[120px] text-xs">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('task_type')} className="h-6 px-2 text-xs font-medium">
                    Type <SortIcon field="task_type" />
                  </Button>
                </TableHead>
                <TableHead className="w-[120px] text-xs">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('due_date')} className="h-6 px-2 text-xs font-medium">
                    Due Date <SortIcon field="due_date" />
                  </Button>
                </TableHead>
                <TableHead className="w-[200px] text-xs">Notes</TableHead>
                <TableHead className="w-[150px] text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedTasks.length === 0 ? <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                    No tasks found. Add your first task to get started!
                  </TableCell>
                </TableRow> : filteredAndSortedTasks.map(task => (
                  <>
                    <TableRow key={task.id}>
                     <TableCell>
                      <div className="flex items-center gap-2">
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
                        <span className="text-xs font-medium">{task.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityColor(task.priority)} className="text-[10px] px-1.5 py-0">
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(getDisplayStatus(task))} className="text-[10px] px-1.5 py-0">
                        {getDisplayStatus(task).replace('_', ' ').replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSkillColor(task.skill_level)} className="text-[10px] px-1.5 py-0">
                        {task.skill_level}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{task.task_type.replace('_', ' ')}</TableCell>
                    <TableCell className="text-xs">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-xs truncate max-w-[200px]" title={task.notes || ''}>
                      {task.notes || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
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
                            onClick={() => navigate(`/?project=${task.project_run_id}`)} 
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
                      <TableCell colSpan={8} className="bg-muted/50 p-0">
                        <div className="px-12 py-3">
                          <div className="text-xs font-medium mb-2">Subtasks:</div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs h-8">Subtask</TableHead>
                                <TableHead className="text-xs h-8">Est. Hours</TableHead>
                                <TableHead className="text-xs h-8">Skill Level</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {subtasks[task.id].map(subtask => (
                                <TableRow key={subtask.id}>
                                  <TableCell className="text-xs py-2">{subtask.title}</TableCell>
                                  <TableCell className="text-xs py-2">{subtask.estimated_hours || '-'}</TableCell>
                                  <TableCell className="text-xs py-2">
                                    <Badge variant={getSkillColor(subtask.skill_level)} className="text-[10px] px-1.5 py-0">
                                      {subtask.skill_level}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
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