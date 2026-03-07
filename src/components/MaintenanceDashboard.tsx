import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Thermometer,
  Home,
  Refrigerator,
  ShieldCheck,
  MoreHorizontal,
  Droplets,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { differenceInDays } from 'date-fns';

export type SystemKey = 'hvac' | 'roof' | 'plumbing' | 'appliances' | 'safety' | 'other';

const CATEGORY_TO_SYSTEM: Record<string, SystemKey> = {
  hvac: 'hvac',
  exterior: 'roof',
  roof: 'roof',
  plumbing: 'plumbing',
  appliances: 'appliances',
  safety: 'safety',
  electrical: 'other',
  interior: 'other',
  outdoor: 'other',
  landscaping: 'other',
  security: 'other',
  general: 'other',
};

const SYSTEM_CONFIG: Record<SystemKey, { label: string; icon: React.ElementType }> = {
  hvac: { label: 'HVAC', icon: Thermometer },
  roof: { label: 'Roof', icon: Home },
  plumbing: { label: 'Plumbing', icon: Droplets },
  appliances: { label: 'Appliances', icon: Refrigerator },
  safety: { label: 'Safety', icon: ShieldCheck },
  other: { label: 'Other', icon: MoreHorizontal },
};

export interface MaintenanceTaskForDashboard {
  id: string;
  title: string;
  category: string;
  frequency_days: number;
  next_due: string;
  last_completed: string | null;
  criticality?: number | null;
  progress_percentage?: number | null;
}

export interface CompletionForDashboard {
  task_id: string;
  completed_at: string;
  task?: { category?: string };
}

const ESTIMATED_SAVINGS_PER_COMPLETION = 45;
const W_O = 5;
const W_C = 3;
const W_D = 1;
const DEFAULT_CRITICALITY = 2;

export function getSystemForCategory(category: string): SystemKey {
  return CATEGORY_TO_SYSTEM[category] ?? 'other';
}

export { SYSTEM_CONFIG };

function getCriticality(task: MaintenanceTaskForDashboard): number {
  const c = task.criticality;
  if (c === 1 || c === 2 || c === 3) return c;
  return DEFAULT_CRITICALITY;
}

interface MaintenanceDashboardProps {
  tasks: MaintenanceTaskForDashboard[];
  completions: CompletionForDashboard[];
}

export function MaintenanceDashboard({ tasks, completions }: MaintenanceDashboardProps) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const getTaskProgress = (task: MaintenanceTaskForDashboard): number => {
    if (task.progress_percentage != null) {
      return Math.max(0, task.progress_percentage);
    }
    if (!task.last_completed) return 0;
    const daysSince = differenceInDays(today, new Date(task.last_completed));
    return Math.max(0, (daysSince / task.frequency_days) * 100);
  };

  const overdue = tasks.filter(t => getTaskProgress(t) >= 100);
  const caution = tasks.filter(t => {
    const p = getTaskProgress(t);
    return p >= 90 && p < 100;
  });
  const O = overdue.length;
  const C = overdue.reduce((sum, t) => sum + getCriticality(t), 0);
  const D = caution.length;

  const yearStart = new Date(now.getFullYear(), 0, 1);
  const completionsThisYear = completions.filter(
    c => new Date(c.completed_at).getFullYear() === now.getFullYear()
  );
  const taskIdToFrequency: Record<string, number> = {};
  tasks.forEach(t => {
    taskIdToFrequency[t.id] = t.frequency_days;
  });
  const periodKeys = new Set<string>();
  completionsThisYear.forEach(c => {
    const freq = taskIdToFrequency[c.task_id];
    if (!freq || freq < 1) return;
    const completedDate = new Date(c.completed_at);
    const daysSinceYearStart = differenceInDays(completedDate, yearStart);
    const periodIndex = Math.floor(daysSinceYearStart / freq);
    if (periodIndex >= 0) periodKeys.add(`${c.task_id}:${periodIndex}`);
  });
  const moneySaved = periodKeys.size * ESTIMATED_SAVINGS_PER_COMPLETION;

  const systemStatus: Record<SystemKey, 'green' | 'yellow' | 'red'> = {
    hvac: 'green',
    roof: 'green',
    plumbing: 'green',
    appliances: 'green',
    safety: 'green',
    other: 'green',
  };
  const systemTasks: Record<SystemKey, MaintenanceTaskForDashboard[]> = {
    hvac: [],
    roof: [],
    plumbing: [],
    appliances: [],
    safety: [],
    other: [],
  };
  tasks.forEach(t => {
    const sys = getSystemForCategory(t.category);
    systemTasks[sys].push(t);
  });
  (Object.keys(systemStatus) as SystemKey[]).forEach(sys => {
    const list = systemTasks[sys];
    const hasOverdue = list.some(t => getTaskProgress(t) >= 100);
    const hasCaution = list.some(t => {
      const p = getTaskProgress(t);
      return p >= 90 && p < 100;
    });
    if (hasOverdue) systemStatus[sys] = 'red';
    else if (hasCaution) systemStatus[sys] = 'yellow';
  });

  const healthScore = Math.max(0, Math.min(100, Math.round(100 - W_O * O - W_C * C - W_D * D)));

  const gaugeRotation = -90 + (healthScore / 100) * 180;
  const totalCompletions = completions.length;

  const healthScoreTooltip = (
    <div className="space-y-1.5 text-left">
      <p className="font-semibold">Home Health Score</p>
      <p className="text-sm text-muted-foreground">
        Starts at 100 and decreases for: overdue tasks (5 pts each), their criticality (3 pts per level), and tasks in the caution zone (90–99% toward due, 1 pt each). Higher is better—stay on top of maintenance to keep your score up.
      </p>
    </div>
  );

  const systemKeys = Object.keys(SYSTEM_CONFIG) as SystemKey[];

  const cardMinH = '4rem';
  const cardMaxH = '4.5rem';
  return (
    <div
      className="px-3 md:px-6 py-2 border-b bg-muted/30 shrink-0"
      style={{ ['--card-min-h' as string]: cardMinH, ['--card-max-h' as string]: cardMaxH }}
    >
      <TooltipProvider delayDuration={300}>
        {/* Front row: Home Health + Tasks card only */}
        <div className="grid grid-cols-[1fr_auto] sm:grid-cols-2 gap-2 sm:gap-4 items-stretch max-w-full mb-2">
          {/* 1. Home Health – speedometer left, score right */}
          <div className="space-y-0 min-w-0 flex flex-col min-h-0">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b pb-1 mb-1 shrink-0">
              Home Health
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="w-full min-w-0 flex flex-col cursor-help border-dashed h-full min-h-[var(--card-min-h)] max-h-[var(--card-max-h)] overflow-hidden">
                  <CardContent className="p-1.5 sm:p-2 flex flex-row items-center flex-1 min-h-0 gap-1">
                    <div className="relative flex-1 min-h-0 flex items-center justify-center min-w-0">
                      <svg
                        viewBox="0 0 120 70"
                        className="w-full h-full max-h-[2.75rem] sm:max-h-[3.25rem] text-foreground"
                        aria-hidden
                        preserveAspectRatio="xMidYMax meet"
                      >
                        <defs>
                          <linearGradient id="gaugeTrack" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#ef4444" />
                            <stop offset="40%" stopColor="#f97316" />
                            <stop offset="70%" stopColor="#eab308" />
                            <stop offset="100%" stopColor="#22c55e" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M 12 58 A 48 48 0 0 1 108 58"
                          fill="none"
                          stroke="hsl(var(--muted-foreground) / 0.25)"
                          strokeWidth="10"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 12 58 A 48 48 0 0 1 108 58"
                          fill="none"
                          stroke="url(#gaugeTrack)"
                          strokeWidth="8"
                          strokeLinecap="round"
                        />
                        <g stroke="hsl(var(--muted-foreground) / 0.5)" strokeWidth="1">
                          <line x1="22" y1="52" x2="26" y2="56" />
                          <line x1="60" y1="26" x2="60" y2="30" />
                          <line x1="98" y1="52" x2="94" y2="56" />
                        </g>
                        <g transform={`rotate(${gaugeRotation} 60 60)`}>
                          <line
                            x1="60"
                            y1="60"
                            x2="60"
                            y2="24"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                          <circle cx="60" cy="60" r="4" fill="currentColor" />
                        </g>
                      </svg>
                    </div>
                    <div className="flex-1 flex items-center justify-center min-w-0">
                      <span
                        className={`text-2xl sm:text-[2.24rem] font-bold tabular-nums ${
                          healthScore >= 90
                            ? 'text-emerald-600'
                            : healthScore >= 70
                              ? 'text-amber-500'
                              : 'text-destructive'
                        }`}
                        aria-live="polite"
                      >
                        {healthScore}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[280px]" align="start">
                {healthScoreTooltip}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* 2. Tasks – overdue & caution up front */}
          <div className="space-y-0 min-w-0 flex flex-col min-h-0">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b pb-1 mb-1 shrink-0">
              Tasks
            </div>
            <Card className="min-w-0 flex flex-col h-full min-h-[var(--card-min-h)] max-h-[var(--card-max-h)] overflow-hidden">
              <CardContent className="p-2 flex flex-col flex-1 min-h-0 justify-center gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Overdue</span>
                  <span
                    className={`text-lg sm:text-xl font-bold tabular-nums ${
                      overdue.length === 0 ? 'text-emerald-600' : 'text-destructive'
                    }`}
                  >
                    {overdue.length}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 border-t pt-1">
                  <span className="text-xs text-muted-foreground">Caution (90–99%)</span>
                  <span className="text-lg sm:text-xl font-bold tabular-nums">
                    {caution.length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Other metrics in accordion */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="metrics" className="border rounded-lg px-2 sm:px-3">
            <AccordionTrigger className="text-xs sm:text-sm font-semibold py-2 hover:no-underline">
              More dashboard metrics
            </AccordionTrigger>
            <AccordionContent className="pt-0 pb-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* System status */}
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    System status
                  </div>
                  <Card className="overflow-hidden">
                    <CardContent className="p-2 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                      {systemKeys.map(sys => {
                        const status = systemStatus[sys];
                        const Icon = SYSTEM_CONFIG[sys].icon;
                        const StatusBadge =
                          status === 'red' ? XCircle : status === 'yellow' ? AlertTriangle : CheckCircle2;
                        const badgeColor =
                          status === 'red'
                            ? 'text-destructive'
                            : status === 'yellow'
                              ? 'text-amber-500'
                              : 'text-emerald-600';
                        return (
                          <Tooltip key={sys}>
                            <TooltipTrigger asChild>
                              <div className="flex flex-col items-center gap-0.5 min-w-0 shrink-0">
                                <div className="flex flex-row items-center justify-center gap-0.5">
                                  <Icon className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
                                  <StatusBadge className={`h-4 w-4 shrink-0 ${badgeColor}`} strokeWidth={2.5} />
                                </div>
                                <span className="text-xs text-muted-foreground truncate">{SYSTEM_CONFIG[sys].label}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              {SYSTEM_CONFIG[sys].label}:{' '}
                              {status === 'red' ? 'Overdue' : status === 'yellow' ? 'Caution (90–99% toward due)' : 'Good'}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>
                {/* Benefits */}
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Benefits
                  </div>
                  <Card>
                    <CardContent className="p-2 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">Est. repairs avoided</span>
                        <span className="text-base sm:text-lg font-bold tabular-nums text-emerald-600">
                          ${moneySaved}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t pt-1.5">
                        <span className="text-xs text-muted-foreground">Cumulative completed</span>
                        <span className="text-base sm:text-lg font-bold tabular-nums">{totalCompletions}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </TooltipProvider>
    </div>
  );
}

