import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
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

const RISK_CRITICAL_KEYWORDS = [
  'hvac filter', 'sump pump', 'smoke alarm', 'smoke detector', 'co detector', 'carbon monoxide',
  'pressure relief', 'water heater', 'gfci', 'fire extinguisher',
];

export interface MaintenanceTaskForDashboard {
  id: string;
  title: string;
  category: string;
  frequency_days: number;
  next_due: string;
  last_completed: string | null;
}

export interface CompletionForDashboard {
  task_id: string;
  completed_at: string;
  task?: { category?: string };
}

const ESTIMATED_SAVINGS_PER_COMPLETION = 45;
const HEALTH_DEDUCT_OVERDUE = 4;
const HEALTH_DEDUCT_RISK_OVERDUE = 8;
const HEALTH_DEDUCT_SYSTEM_RED = 6;

function getSystemForCategory(category: string): SystemKey {
  return CATEGORY_TO_SYSTEM[category] ?? 'other';
}

function isRiskCritical(task: MaintenanceTaskForDashboard): boolean {
  const t = task.title.toLowerCase();
  return RISK_CRITICAL_KEYWORDS.some(kw => t.includes(kw)) || task.category === 'safety';
}

interface MaintenanceDashboardProps {
  tasks: MaintenanceTaskForDashboard[];
  completions: CompletionForDashboard[];
}

export function MaintenanceDashboard({ tasks, completions }: MaintenanceDashboardProps) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const overdue = tasks.filter(t => differenceInDays(today, new Date(t.next_due)) > 0);
  const overdueRiskCritical = overdue.filter(isRiskCritical);
  const upcoming30 = tasks.filter(t => {
    const d = differenceInDays(new Date(t.next_due), today);
    return d >= 0 && d <= 30;
  });

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
    const hasOverdue = list.some(t => differenceInDays(today, new Date(t.next_due)) > 0);
    const hasDue30 = list.some(t => {
      const d = differenceInDays(new Date(t.next_due), today);
      return d >= 0 && d <= 30;
    });
    if (hasOverdue) systemStatus[sys] = 'red';
    else if (hasDue30) systemStatus[sys] = 'yellow';
  });

  let healthScore = 100;
  healthScore -= overdue.length * HEALTH_DEDUCT_OVERDUE;
  healthScore -= overdueRiskCritical.length * (HEALTH_DEDUCT_RISK_OVERDUE - HEALTH_DEDUCT_OVERDUE);
  (Object.keys(systemStatus) as SystemKey[]).forEach(sys => {
    if (systemStatus[sys] === 'red') healthScore -= HEALTH_DEDUCT_SYSTEM_RED;
  });
  healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

  const gaugeRotation = -90 + (healthScore / 100) * 180;

  return (
    <div className="px-3 md:px-6 py-4 border-b bg-muted/30 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Home Health Score - Speedometer */}
        <Card className="col-span-2 md:col-span-1 flex flex-col">
          <CardContent className="p-3 flex flex-col items-center justify-center flex-1">
            <div className="text-xs font-medium text-muted-foreground mb-1">Home Health Score</div>
            <div className="relative w-28 h-14 flex items-end justify-center">
              <svg viewBox="0 0 120 70" className="w-full h-full">
                <defs>
                  <linearGradient id="gaugeTrack" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="40%" stopColor="#f97316" />
                    <stop offset="70%" stopColor="#eab308" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                </defs>
                <path d="M 12 58 A 48 48 0 0 1 108 58" fill="none" stroke="url(#gaugeTrack)" strokeWidth="10" strokeLinecap="round" />
                <g transform={`rotate(${gaugeRotation} 60 60)`}>
                  <line x1="60" y1="60" x2="60" y2="28" stroke="var(--foreground)" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="60" cy="60" r="3.5" fill="var(--foreground)" />
                </g>
              </svg>
            </div>
            <span className="text-2xl font-bold tabular-nums">{healthScore}</span>
            <span className="text-[10px] text-muted-foreground">On-time, overdue & systems</span>
          </CardContent>
        </Card>

        {/* Overdue + Due in next 30 days - combined */}
        <Card>
          <CardContent className="p-3 flex flex-col items-center justify-center min-h-[80px]">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums text-destructive">{overdue.length}</span>
              <span className="text-muted-foreground/80">/</span>
              <span className="text-2xl font-bold tabular-nums">{upcoming30.length}</span>
            </div>
            <span className="text-[10px] text-muted-foreground text-center">Overdue / Due in 30 days</span>
            {overdueRiskCritical.length > 0 && (
              <span className="text-[10px] text-destructive font-medium mt-0.5">{overdueRiskCritical.length} risk-critical</span>
            )}
          </CardContent>
        </Card>

        {/* Money saved */}
        <Card>
          <CardContent className="p-3 flex flex-col items-center justify-center min-h-[80px]">
            <span className="text-2xl font-bold tabular-nums text-emerald-600">${moneySaved}</span>
            <span className="text-[10px] text-muted-foreground text-center">Est. repairs avoided this year</span>
          </CardContent>
        </Card>

        {/* System status flags - larger, spread out, with status badge overlay */}
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-3">
            <div className="text-xs font-medium text-muted-foreground mb-3">System status</div>
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              {(Object.keys(SYSTEM_CONFIG) as SystemKey[]).map(sys => {
                const status = systemStatus[sys];
                const Icon = SYSTEM_CONFIG[sys].icon;
                const StatusBadge = status === 'red' ? XCircle : status === 'yellow' ? AlertTriangle : CheckCircle2;
                const badgeColor = status === 'red' ? 'text-destructive' : status === 'yellow' ? 'text-amber-500' : 'text-emerald-600';
                return (
                  <div
                    key={sys}
                    className="flex flex-col items-center gap-1 relative"
                    title={`${SYSTEM_CONFIG[sys].label}: ${status === 'red' ? 'Overdue' : status === 'yellow' ? 'Due soon' : 'Good'}`}
                  >
                    <div className="relative">
                      <Icon className="h-8 w-8 md:h-9 md:w-9 text-muted-foreground" strokeWidth={1.5} />
                      <StatusBadge
                        className={`h-4 w-4 md:h-5 md:w-5 absolute -top-0.5 -right-0.5 ${badgeColor}`}
                        strokeWidth={2.5}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate w-full text-center">{SYSTEM_CONFIG[sys].label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
