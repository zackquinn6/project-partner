import React, { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp, Plus, Link2, ExternalLink, MoreHorizontal, Pencil, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEnhancedAchievements } from "@/hooks/useEnhancedAchievements";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface HomeTask {
  id: string;
  title: string;
  description: string | null;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'closed';
  diy_level: 'beginner' | 'intermediate' | 'advanced' | 'pro';
  notes: string | null;
  due_date: string | null;
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
  onLinkProject: (task: HomeTask) => void;
  onRapidCosting: (task: HomeTask) => void;
  onAddTask?: () => void;
  onProjectNavigate?: () => void;
  onOpenLinkedProjectRun?: (projectRunId: string) => void;
  onTaskUpdate?: () => void;
  /** Optional slot for Insights / secondary header actions */
  leadingActions?: React.ReactNode;
}

/** Parse YYYY-MM-DD (or ISO date prefix) as local calendar date — avoids UTC day skew. */
function parseLocalDueDate(due: string): Date | null {
  const ymd = due.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatTaskDueDate(due: string | null): string {
  if (!due) return "";
  const date = parseLocalDueDate(due);
  if (!date) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function HomeTasksTable({
  tasks,
  onEdit,
  onLinkProject,
  onRapidCosting,
  onAddTask,
  onProjectNavigate,
  onOpenLinkedProjectRun,
  onTaskUpdate,
  leadingActions,
}: HomeTasksTableProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { checkMilestoneUnlocks } = useEnhancedAchievements(user?.id);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterDiyLevel, setFilterDiyLevel] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [subtasks, setSubtasks] = useState<Record<string, Subtask[]>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const toggleCompleteInFlight = useRef(false);

  useEffect(() => {
    void fetchSubtasks();
  }, [tasks]);

  const fetchSubtasks = async () => {
    const taskIds = tasks.map(t => t.id);
    if (taskIds.length === 0) {
      setSubtasks({});
      return;
    }

    const { data } = await supabase
      .from("home_task_subtasks")
      .select("*")
      .in("task_id", taskIds)
      .order('order_index', { ascending: true });

    if (data) {
      const subtaskMap: Record<string, Subtask[]> = {};
      data.forEach((st) => {
        if (!subtaskMap[st.task_id]) {
          subtaskMap[st.task_id] = [];
        }
        subtaskMap[st.task_id].push({
          id: st.id,
          title: st.title,
          estimated_hours: st.estimated_hours,
          diy_level: st.diy_level as Subtask['diy_level'],
          completed: st.completed,
          order_index: st.order_index,
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
      void fetchSubtasks();
    }
  };

  const handleToggleTaskComplete = async (task: HomeTask) => {
    if (toggleCompleteInFlight.current) return;
    toggleCompleteInFlight.current = true;
    try {
      const newStatus = task.status === "closed" ? "open" : "closed";
      const { error } = await supabase
        .from("home_tasks")
        .update({ status: newStatus })
        .eq("id", task.id);

      if (error) return;

      onTaskUpdate?.();
      if (newStatus === "closed") {
        void checkMilestoneUnlocks();
      }
    } finally {
      toggleCompleteInFlight.current = false;
    }
  };

  const openLinkedOrLink = (task: HomeTask) => {
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
  };

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = [...tasks];

    if (!showCompleted) {
      filtered = filtered.filter(task => task.status !== 'closed');
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        task =>
          task.title.toLowerCase().includes(q) ||
          task.description?.toLowerCase().includes(q) ||
          task.notes?.toLowerCase().includes(q)
      );
    }
    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }
    if (filterDiyLevel !== 'all') {
      filtered = filtered.filter(task => task.diy_level === filterDiyLevel);
    }

    filtered.sort((a, b) => {
      const aDue = a.due_date ? parseLocalDueDate(a.due_date)?.getTime() ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
      const bDue = b.due_date ? parseLocalDueDate(b.due_date)?.getTime() ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
      if (aDue !== bDue) return aDue - bDue;
      return a.title.localeCompare(b.title);
    });
    return filtered;
  }, [tasks, filterPriority, filterDiyLevel, searchTerm, showCompleted]);

  const filtersActive = filterPriority !== 'all' || filterDiyLevel !== 'all';

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2 md:gap-2.5">
      <div className="flex shrink-0 flex-col gap-2 pt-1 md:pt-2">
        <div className="flex flex-wrap items-center gap-2">
          {leadingActions}
          <Input
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 min-w-0 flex-1 text-sm md:max-w-xs"
          />
          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`h-9 shrink-0 gap-1.5 text-xs ${filtersActive ? 'border-primary text-primary' : ''}`}
              >
                <Filter className="h-3.5 w-3.5" />
                Filters
                {filtersActive ? (
                  <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-medium">On</span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 space-y-3 p-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="all">All priorities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">DIY level</label>
                <Select value={filterDiyLevel} onValueChange={setFilterDiyLevel}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="all">All levels</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="pro">Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {filtersActive ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full text-xs"
                  onClick={() => {
                    setFilterPriority('all');
                    setFilterDiyLevel('all');
                  }}
                >
                  Clear filters
                </Button>
              ) : null}
            </PopoverContent>
          </Popover>
          <div className="flex items-center gap-1.5 shrink-0">
            <Checkbox
              id="show-completed-tasks"
              checked={showCompleted}
              onCheckedChange={(checked) => setShowCompleted(checked === true)}
              className="h-4 w-4"
            />
            <label htmlFor="show-completed-tasks" className="cursor-pointer whitespace-nowrap text-xs text-muted-foreground">
              Show done
            </label>
          </div>
          {onAddTask ? (
            <Button
              type="button"
              size="sm"
              onClick={onAddTask}
              className="h-9 shrink-0 gap-1.5 text-xs"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              <span className="hidden sm:inline">Add Task</span>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/80 bg-background">
        <div className="min-h-0 flex-1 overflow-auto">
          {filteredAndSortedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                {showCompleted || searchTerm || filtersActive
                  ? 'No tasks match these filters.'
                  : 'No open tasks.'}
              </p>
              {onAddTask && !showCompleted && !searchTerm && !filtersActive ? (
                <Button type="button" size="sm" onClick={onAddTask} className="gap-1.5 text-xs">
                  <Plus className="h-4 w-4" aria-hidden />
                  Add a task
                </Button>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {filteredAndSortedTasks.map((task) => {
                const dueLabel = formatTaskDueDate(task.due_date);
                const hasSubtasks = (subtasks[task.id]?.length ?? 0) > 0;
                const isExpanded = expandedRows.has(task.id);

                return (
                  <li key={task.id} className={task.status === 'closed' ? 'opacity-60' : undefined}>
                    <div className="flex items-center gap-2 px-2 py-2 md:gap-3 md:px-3 md:py-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 shrink-0 touch-manipulation p-0 text-sm font-medium leading-none rounded-md border-2 hover:bg-primary/10"
                        title={task.status === 'closed' ? 'Mark as not complete' : 'Mark as complete'}
                        aria-label={task.status === 'closed' ? 'Mark task as not complete' : 'Mark task complete'}
                        onClick={() => void handleToggleTaskComplete(task)}
                      >
                        {task.status === 'closed' ? '✓' : '○'}
                      </Button>

                      <button
                        type="button"
                        className={`min-w-0 flex-1 truncate text-left text-sm font-medium leading-snug hover:underline ${
                          task.status === 'closed' ? 'line-through text-muted-foreground' : 'text-foreground'
                        }`}
                        onClick={() => onEdit(task)}
                      >
                        {task.title}
                      </button>

                      {hasSubtasks ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 shrink-0 p-0"
                          onClick={() => toggleRow(task.id)}
                          aria-label={isExpanded ? 'Hide subtasks' : 'Show subtasks'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      ) : null}

                      {dueLabel ? (
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{dueLabel}</span>
                      ) : null}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 shrink-0 p-0"
                            aria-label="Task actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-[100]">
                          <DropdownMenuItem onClick={() => onEdit(task)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRapidCosting(task)}>
                            <span className="mr-2 inline-flex h-4 w-4 items-center justify-center text-sm font-medium">$</span>
                            Budget
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openLinkedOrLink(task)}>
                            {task.project_run_id ? (
                              <ExternalLink className="mr-2 h-4 w-4" />
                            ) : (
                              <Link2 className="mr-2 h-4 w-4" />
                            )}
                            {task.project_run_id ? 'Open project' : 'Link project'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {isExpanded && hasSubtasks ? (
                      <div className="space-y-1 border-t border-border/40 bg-muted/20 px-3 py-2 pl-12 md:pl-14">
                        {subtasks[task.id].map((subtask, index) => (
                          <div key={subtask.id} className="flex items-center gap-2 py-1">
                            {task.ordered ? (
                              <span className="w-4 shrink-0 text-[10px] text-muted-foreground">{index + 1}.</span>
                            ) : null}
                            <button
                              type="button"
                              className="h-6 w-6 shrink-0 text-sm hover:opacity-70"
                              onClick={() => void handleToggleSubtaskComplete(subtask.id, subtask.completed)}
                              title={subtask.completed ? 'Mark incomplete' : 'Mark complete'}
                            >
                              {subtask.completed ? '✓' : '○'}
                            </button>
                            <span
                              className={`min-w-0 flex-1 truncate text-xs ${
                                subtask.completed ? 'line-through text-muted-foreground' : ''
                              }`}
                            >
                              {subtask.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
