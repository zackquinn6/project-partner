import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  AlertTriangle,
  Shield,
  Crosshair,
  Info,
  EyeOff,
  Eye,
  ArrowDownAZ,
  ArrowDownWideNarrow,
  ChevronDown,
  ListOrdered,
  CalendarDays,
  CircleDollarSign,
  BadgeCheck,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { PlanningToolWindowHeaderActions } from '@/components/PlanningWizardSteps/PlanningToolWindowHeaderActions';
import { PlanningToolContextBanner } from '@/components/PlanningWizardSteps/PlanningToolContextBanner';
import {
  PLANNING_TOOL_WINDOW_HEADER_CLASSNAME,
  PLANNING_TOOL_WINDOW_SUBTITLE_CLASSNAME,
  PLANNING_TOOL_WINDOW_TITLE_CLASSNAME,
} from '@/components/PlanningWizardSteps/planningToolWindowChrome';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  belowAppHeaderCenteredWindowClasses,
  belowAppHeaderOverlayClasses,
} from '@/utils/responsive';
import { useProject } from '@/contexts/ProjectContext';
import { isRiskFocusRun } from '@/utils/projectRunRiskFocus';
import { RiskRegisterList } from '@/components/RiskRegisterList';
import { useSteppedAutoAdvance } from '@/hooks/useSteppedAutoAdvance';
import { useRunRiskReevaluation } from '@/hooks/useRunRiskReevaluation';
import { reportUserFacingError } from '@/utils/errorReporting';
import { ProjectRiskRulesEditor } from '@/components/ProjectRiskRulesEditor';
import { useActionPriorityTable } from '@/hooks/useActionPriorityTable';
import { useOccurrenceDrivers } from '@/hooks/useOccurrenceDrivers';
import { actionPriorityLabel } from '@/utils/actionPriorityTable';
import {
  PREVENTION_STRENGTHS,
  PREVENTION_STRENGTH_LABELS,
  RISK_ITEM_KINDS,
  RISK_ITEM_KIND_LABELS,
  isPreventionStrength,
  isRiskItemKind,
  listKcItemOptions,
  type PreventionStrength,
  type RiskItemKind,
  type StepItemSource,
} from '@/utils/keyCharacteristics';
import {
  RISK_COMPONENT_CONSUMER_LABELS,
  RISK_COMPONENT_CONSUMER_STAKES,
  compareByRiskPriority,
  rollupRiskComponents,
  worstRpnByComponent,
} from '@/utils/riskProfileRollup';
import {
  REGISTER_RISK_DIMENSIONS,
  RISK_DIMENSIONS,
  RISK_DIMENSION_LABELS,
  isActionPriority,
  isRegisterRiskDimension,
  isRiskDimension,
  type ActionPriority,
  type RegisterRiskDimension,
  type RiskDimension,
} from '@/utils/riskDimensions';
import {
  REGISTER_RISK_UNSCORED_MESSAGE,
  registerRiskPriority,
} from '@/utils/registerRiskScoring';
import {
  currentRiskLevelBadgeClass,
  riskFocusSeveritySelectItemClass,
  riskFocusSeveritySelectTriggerClass,
} from '@/utils/riskSeverityStyles';
import { QUALITY_GOAL_OPTIONS, isQualityGoal } from '@/utils/qualityGoal';
import type { ProjectRun } from '@/interfaces/ProjectRun';
import { format } from 'date-fns';

const RISK_FOCUS_PROGRESS_STOPS = [0, 25, 50, 75, 100] as const;

/** Map stored progress to the nearest preset so the select always matches an item. */
function riskFocusProgressSelectValue(progress: number | null | undefined): string {
  if (progress == null || !Number.isFinite(progress)) {
    return String(RISK_FOCUS_PROGRESS_STOPS[0]);
  }
  const x = Math.round(Math.min(100, Math.max(0, progress)));
  let best: number = RISK_FOCUS_PROGRESS_STOPS[0];
  let bestDiff = Math.abs(x - best);
  for (const v of RISK_FOCUS_PROGRESS_STOPS) {
    const d = Math.abs(x - v);
    if (d < bestDiff) {
      best = v;
      bestDiff = d;
    }
  }
  return String(best);
}

function riskFocusProgressBarPercent(progress: number | null | undefined): number {
  if (progress == null || !Number.isFinite(progress)) return 0;
  return Math.round(Math.min(100, Math.max(0, progress)));
}

function riskRadarGoalDateLabel(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const dateOnly = raw.length >= 10 ? raw.slice(0, 10) : raw;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return null;
  const d = new Date(`${dateOnly}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return format(d, 'MMM d, yyyy');
}

function riskRadarBudgetLabel(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  return raw.includes('$') ? raw : `$${raw}`;
}

/** Latest end from schedule_events when the Schedule tool has produced a plan. */
function riskRadarPlannedScheduleLabel(projectRun: ProjectRun): string | null {
  const events = projectRun.schedule_events?.events;
  if (!Array.isArray(events) || events.length === 0) return null;

  const endDates = events
    .map((event: { date?: string; duration?: number; endTime?: string }) => {
      if (event.date) {
        const d = new Date(event.date);
        if (typeof event.duration === 'number' && !Number.isNaN(event.duration)) {
          d.setMinutes(d.getMinutes() + event.duration);
        }
        return d;
      }
      if (event.endTime) return new Date(event.endTime);
      return null;
    })
    .filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()));

  if (endDates.length === 0) return null;
  const latest = endDates.reduce((acc, d) => (d > acc ? d : acc));
  return format(latest, 'MMM d, yyyy');
}

/** Sum of budget line items when the Budget tool has produced a plan. */
function riskRadarPlannedBudgetLabel(projectRun: ProjectRun): string | null {
  const items = projectRun.budget_data?.lineItems;
  if (!Array.isArray(items) || items.length === 0) return null;

  let sum = 0;
  let hasAmount = false;
  for (const item of items) {
    if (!item) continue;
    const amount =
      typeof item.budgetedAmount === 'number'
        ? item.budgetedAmount
        : Number.parseFloat(String(item.budgetedAmount ?? ''));
    if (Number.isNaN(amount)) continue;
    sum += amount;
    hasAmount = true;
  }
  if (!hasAmount) return null;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(sum);
}

interface Risk {
  id: string;
  risk: string; // Maps to risk_title in DB
  risk_title?: string; // Database field
  risk_description?: string; // Database field
  likelihood: 'low' | 'medium' | 'high';
  severity: 'low' | 'medium' | 'high';
  schedule_impact_days: number | null; // Maps to schedule_impact_low_days or schedule_impact_high_days
  schedule_impact_low_days?: number | null; // Database field
  schedule_impact_high_days?: number | null; // Database field
  budget_impact_dollars: number | null; // Maps to budget_impact_low or budget_impact_high
  budget_impact_low?: number | null; // Database field
  budget_impact_high?: number | null; // Database field
  mitigation: string | null; // Legacy text field
  mitigation_strategy?: string | null; // Database field
  mitigation_actions?: { action: string; benefit?: string | null; completed?: boolean }[] | null;
  /** Template + run: effort to implement mitigation; admin sets on template, copied to runs. */
  mitigation_effort_level?: MitigationEffortLevel | null;
  notes?: string | null;
  status?: 'open' | 'mitigated' | 'closed' | 'monitoring';
  is_template_risk?: boolean;
  template_risk_id?: string | null;
  /** True when copied from Standard Project Foundation `project_risks` (DB `from_standard_foundation`). */
  from_standard_foundation?: boolean;
  display_order?: number;
  // Legacy fields for backward compatibility
  impact?: string;
  /** Narrative “what happens if it does?” (DB `benefit`); migrated from former notes in `risk_description`. */
  benefit?: string | null;
  hidden_from_register?: boolean;
  /**
   * Risk component and the three scores that feed the shared Action Priority table. On a run
   * this can be any of the four, because applied quality items land in the same list. Template
   * authoring only offers the three the register owns; quality is authored in the PFMEA.
   */
  risk_dimension?: RiskDimension | null;
  severity_score?: number | null;
  occurrence_score?: number | null;
  detection_score?: number | null;
  operation_step_id?: string | null;
  /**
   * Key Characteristic classifications, authored on the template register. Null means nobody
   * has judged them, which keeps the risk off the KC register rather than assuming it is safe.
   */
  occurrence_driver?: string | null;
  prevention_strength?: string | null;
  implicated_item_kind?: RiskItemKind | null;
  implicated_item_id?: string | null;
  /** Priority from the seeded table, or null when the row is unclassified or unscored. */
  action_priority?: ActionPriority | null;
  rpn?: number | null;
  /** Which layer this run row came from: the PFMEA, or the register. */
  source?: 'pfmea' | 'register' | null;
  /** A rule or a customization decision took this off the run. */
  excluded_by_customization?: boolean | null;
}

function scheduleBudgetParts(risk: Risk): { schedule: string | null; budget: string | null } {
  const s = risk.schedule_impact_days;
  const b = risk.budget_impact_dollars;
  const schedule =
    s != null && Number(s) > 0
      ? `${s} day${Number(s) === 1 ? '' : 's'} delay`
      : null;
  const budget =
    b != null && Number(b) > 0 ? `$${Number(b).toLocaleString()} budget impact` : null;
  return { schedule, budget };
}

function ImpactIfItDoesContent({ risk }: { risk: Risk }) {
  const { schedule, budget } = scheduleBudgetParts(risk);
  const narrative = typeof risk.benefit === 'string' ? risk.benefit.trim() : '';
  if (!narrative && !schedule && !budget) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="space-y-1 text-sm">
      {narrative ? <p className="whitespace-pre-wrap break-words leading-relaxed">{narrative}</p> : null}
      {schedule ? <div>{schedule}</div> : null}
      {budget ? <div>{budget}</div> : null}
    </div>
  );
}

function parseMitigationActionsFromDb(raw: unknown): { action: string; benefit?: string | null; completed?: boolean }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const action = typeof o.action === 'string' ? o.action : '';
      const benefit = typeof o.benefit === 'string' ? o.benefit : null;
      const completed = o.completed === true;
      return { action, benefit, completed };
    })
    .filter((x) => x != null) as unknown as { action: string; benefit: string; completed: boolean }[];
}

function severitySortRank(severity: string | null | undefined): number {
  const s = (severity || '').toLowerCase();
  if (s === 'high') return 3;
  if (s === 'medium') return 2;
  if (s === 'low') return 1;
  return 0;
}

type MitigationEffortLevel = 'low' | 'medium' | 'high';

function parseMitigationEffortLevelFromDb(raw: unknown): MitigationEffortLevel | null {
  if (raw == null || raw === '') return null;
  const s = String(raw).toLowerCase();
  if (s === 'low' || s === 'medium' || s === 'high') return s;
  return null;
}

/** Lower rank = easier mitigation (ascending = easiest first). Unknown last. */
function mitigationEffortSortRank(level: MitigationEffortLevel | null | undefined): number {
  if (level === 'low') return 1;
  if (level === 'medium') return 2;
  if (level === 'high') return 3;
  return 4;
}

type RiskRadarRegisterPrimarySort = 'easiest-mitigation' | 'most-important-risk';

function riskFocusSeverityCounts(risks: Risk[]) {
  let high = 0;
  let medium = 0;
  let low = 0;
  for (const r of risks) {
    const s = r.severity?.toLowerCase();
    if (s === 'high') high += 1;
    else if (s === 'medium') medium += 1;
    else if (s === 'low') low += 1;
  }
  return { high, medium, low };
}

function riskFocusLevelValue(risk: Risk): 'low' | 'medium' | 'high' {
  return registerRiskLevelOrMedium(risk.severity);
}

/** Assessed register level: invalid or missing values become medium. */
function registerRiskLevelOrMedium(value: unknown): 'low' | 'medium' | 'high' {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (raw === 'low' || raw === 'medium' || raw === 'high') return raw;
  return 'medium';
}

/** Inherent starting level before mitigation (uses likelihood when available). */
function riskBaselineSeverity(risk: Risk): 'low' | 'medium' | 'high' {
  const raw = typeof risk.likelihood === 'string' ? risk.likelihood.trim().toLowerCase() : '';
  if (raw === 'low' || raw === 'medium' || raw === 'high') return raw;
  return riskFocusLevelValue(risk);
}

/** Current register level: stored severity, else starting/baseline (likelihood). */
function currentRiskRegisterLevel(risk: Risk): 'low' | 'medium' | 'high' {
  const raw = typeof risk.severity === 'string' ? risk.severity.trim().toLowerCase() : '';
  if (raw === 'low' || raw === 'medium' || raw === 'high') return raw;
  return riskBaselineSeverity(risk);
}

const ACTION_PRIORITY_TO_TRIAGE_LEVEL: Record<ActionPriority, 'high' | 'medium' | 'low'> = {
  H: 'high',
  M: 'medium',
  L: 'low',
};

/**
 * Which triage pass a risk belongs to.
 *
 * Action Priority wins when the row has been scored, because it is the reading that accounts
 * for how often the failure happens and whether the user would catch it. Rows authored before
 * the components existed still carry a severity level, and that is what they are grouped by.
 */
function riskTriageLevel(risk: Risk): 'low' | 'medium' | 'high' {
  if (risk.action_priority != null && isActionPriority(risk.action_priority)) {
    return ACTION_PRIORITY_TO_TRIAGE_LEVEL[risk.action_priority];
  }
  return currentRiskRegisterLevel(risk);
}

/** Within one pass: worst priority first, then the bigger RPN, then alphabetical. */
function compareRisksByPriority(a: Risk, b: Risk): number {
  return compareByRiskPriority(
    { action_priority: a.action_priority ?? null, rpn: a.rpn ?? null, title: a.risk || '' },
    { action_priority: b.action_priority ?? null, rpn: b.rpn ?? null, title: b.risk || '' }
  );
}

type PlanningRiskStepKey = 'high' | 'medium' | 'low';
/** Empty string means every triage accordion is collapsed. */
type PlanningRiskStepValue = PlanningRiskStepKey | '';

const PLANNING_RISK_STEPS: {
  key: PlanningRiskStepKey;
  title: string;
  empty: string;
}[] = [
  {
    key: 'high',
    title: 'Close out the high risks',
    empty: 'No high risks right now - move on to medium risks.',
  },
  {
    key: 'medium',
    title: 'Work the medium risks',
    empty: 'No medium risks right now - keep reducing remaining risk.',
  },
  {
    key: 'low',
    title: 'Keep reducing risk',
    empty: 'No low risks in the register for this filter.',
  },
];

/**
 * Residual severity from mitigation check-offs.
 * Partial progress moves risk down; completing all actions targets low.
 */
function severityFromMitigationProgress(
  baseline: 'low' | 'medium' | 'high',
  actions: { action?: string | null; completed?: boolean }[]
): 'low' | 'medium' | 'high' {
  const actionable = actions.filter((a) => String(a.action ?? '').trim().length > 0);
  if (actionable.length === 0) return baseline;
  const completedCount = actionable.filter((a) => a.completed).length;
  if (completedCount === 0) return baseline;
  if (completedCount >= actionable.length) return 'low';
  if (baseline === 'high') return 'medium';
  if (baseline === 'medium') {
    return completedCount / actionable.length >= 0.5 ? 'low' : 'medium';
  }
  return 'low';
}

interface RiskFormData {
  risk: string;
  likelihood: 'low' | 'medium' | 'high';
  severity: 'low' | 'medium' | 'high';
  schedule_impact_days: number;
  budget_impact_dollars: number;
  mitigation: string;
  mitigation_actions: { action: string; benefit?: string | null; completed?: boolean }[];
  mitigation_effort_level: MitigationEffortLevel | null;
  notes: string;
  status: 'open' | 'mitigated' | 'closed' | 'monitoring';
  /**
   * Which component this risk belongs to, and its three scores on the shared scale. Null means
   * the author has not classified or scored it, which is reported rather than assumed.
   */
  risk_dimension: RegisterRiskDimension | null;
  severity_score: number | null;
  occurrence_score: number | null;
  detection_score: number | null;
  /** Optional link to the step where the risk arises, so it can surface during execution. */
  operation_step_id: string | null;
  /**
   * Key Characteristic classifications. The register carries one per risk rather than per
   * control, because these rows have no cause model to hang controls off.
   */
  occurrence_driver: string | null;
  prevention_strength: PreventionStrength | null;
  implicated_item_kind: RiskItemKind | null;
  implicated_item_id: string | null;
}

const EMPTY_RISK_FORM: RiskFormData = {
  risk: '',
  likelihood: 'medium',
  severity: 'medium',
  schedule_impact_days: 0,
  budget_impact_dollars: 0,
  mitigation: '',
  mitigation_actions: [],
  mitigation_effort_level: null,
  notes: '',
  status: 'open',
  risk_dimension: null,
  severity_score: null,
  occurrence_score: null,
  detection_score: null,
  operation_step_id: null,
  occurrence_driver: null,
  prevention_strength: null,
  implicated_item_kind: null,
  implicated_item_id: null,
};

/** True only for run risks the user created (no template link and no applied Stage 3 source). */
function isUserAddedRisk(risk: Risk): boolean {
  return (
    !risk.from_standard_foundation &&
    !risk.template_risk_id &&
    !risk.is_template_risk &&
    risk.source == null
  );
}

/** Light colour for a component's worst priority. Grey is "nothing scored", not "clear". */
function riskComponentLightClass(ap: ActionPriority | null): string {
  switch (ap) {
    case 'H':
      return 'bg-destructive-soft ring-destructive-soft';
    case 'M':
      return 'bg-warning-soft ring-warning-soft';
    case 'L':
      return 'bg-success ring-success';
    default:
      return 'bg-muted-foreground/40 ring-muted-foreground/15';
  }
}

/** Marker for goal-tile status: filled by priority, outlined when nothing is scored. */
function goalRiskStatusMarkerClass(ap: ActionPriority | null): string {
  if (ap == null) {
    return 'border border-muted-foreground/50 bg-transparent';
  }
  return cn('ring-2', riskComponentLightClass(ap));
}

/**
 * Visible status wording for goal-tile rollups. Uses short component-level copy rather than
 * action-priority table labels (those refer to scored steps, not overall goal risk).
 */
function resolveGoalRiskStatusText(ap: ActionPriority | null): string {
  if (ap == null) return 'Not assessed';
  switch (ap) {
    case 'H':
      return 'Act now';
    case 'M':
      return 'Safeguard';
    case 'L':
      return 'Covered';
  }
}

/** Cell tint for a component, so the four readings sit in one row without four boxes. */
function riskComponentTileClass(ap: ActionPriority | null): string {
  switch (ap) {
    case 'H':
      return 'bg-destructive-soft/10';
    case 'M':
      return 'bg-warning-soft/10';
    case 'L':
      return 'bg-success/10';
    default:
      return 'bg-transparent';
  }
}

/** Safety leads: it is the only component whose worst case is not recoverable. */
const RISK_COMPONENT_OVERVIEW_ORDER: readonly RiskDimension[] = [
  'safety',
  'quality',
  'schedule',
  'budget',
];

function openRiskComponentDashboard(projectRunId: string | undefined, dimension: RiskDimension) {
  if (!projectRunId) return;
  window.dispatchEvent(
    new CustomEvent('open-risk-dashboard', { detail: { projectRunId, dimension } })
  );
}

function riskRollupRowsFromRisks(risks: Risk[]) {
  return risks.map((risk) => ({
    risk_dimension: risk.risk_dimension ?? null,
    action_priority: risk.action_priority ?? null,
    excluded_by_customization: risk.excluded_by_customization ?? null,
    hidden_from_register: risk.hidden_from_register ?? null,
    rpn: risk.rpn ?? null,
  }));
}

/**
 * Status light for one risk component: opens the dashboard and explains stakes in a tooltip.
 * Used under Project goals chips and in the template overview strip.
 */
function GoalRiskLight({
  dimension,
  worstActionPriority,
  highCount,
  mediumCount,
  lowCount,
  unscoredCount,
  score,
  projectRunId,
  className,
  variant = 'dot',
}: {
  dimension: RiskDimension;
  worstActionPriority: ActionPriority | null;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  unscoredCount: number;
  score: number | null;
  projectRunId?: string;
  className?: string;
  /** `dot` for compact overview; `status` shows marker + plain-language status on goal tiles. */
  variant?: 'dot' | 'status';
}) {
  const { table } = useActionPriorityTable();
  const description =
    worstActionPriority && table
      ? actionPriorityLabel(table, worstActionPriority).description
      : null;
  const label = RISK_COMPONENT_CONSUMER_LABELS[dimension];
  const statusText = resolveGoalRiskStatusText(worstActionPriority);

  const light = (
    <span
      className={cn(
        'h-2 w-2 shrink-0 rounded-full',
        variant === 'status'
          ? goalRiskStatusMarkerClass(worstActionPriority)
          : cn('ring-2', riskComponentLightClass(worstActionPriority))
      )}
      aria-hidden
    />
  );

  const body =
    variant === 'status' ? (
      <span className="inline-flex min-w-0 items-center gap-1.5">
        {light}
        <span className="min-w-0 text-left text-[11px] font-semibold leading-none text-foreground">
          {statusText}
        </span>
      </span>
    ) : (
      light
    );

  const ariaLabel =
    variant === 'status'
      ? `${label} risk status: ${statusText}`
      : `${label} risk: open dashboard`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {projectRunId ? (
          <button
            type="button"
            onClick={() => openRiskComponentDashboard(projectRunId, dimension)}
            onDoubleClick={() => openRiskComponentDashboard(projectRunId, dimension)}
            className={cn(
              'inline-flex min-h-7 min-w-0 max-w-full items-center rounded-sm px-1 py-0.5 transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:brightness-110',
              variant === 'dot' && 'justify-center p-0.5',
              className
            )}
            aria-label={ariaLabel}
          >
            {body}
          </button>
        ) : (
          <span
            className={cn(
              'inline-flex min-w-0 max-w-full items-center',
              variant === 'dot' ? 'justify-center p-0.5' : 'px-1 py-0.5',
              className
            )}
          >
            {body}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p className="text-xs font-medium">
          {label}: {RISK_COMPONENT_CONSUMER_STAKES[dimension]}
        </p>
        {description ? <p className="mt-1 text-xs">{description}</p> : null}
        <p className="mt-1 text-xs text-muted-foreground">
          {highCount} act now, {mediumCount} safeguard, {lowCount} covered
          {unscoredCount > 0 ? `, ${unscoredCount} unscored` : ''}
        </p>
        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
          {score != null
            ? `Worst line scores ${score} out of 1000`
            : 'No line here carries a score yet'}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * One light per component, with the worst line's score out of 1000. Four separate readings
 * rather than one blended score, because a project can be safe and still be late, and the
 * user acts on those differently. The counts behind each light are in its tooltip.
 *
 * Each light opens the Risk Dashboard on that component.
 */
function RiskComponentOverview({
  risks,
  projectRunId,
}: {
  risks: Risk[];
  /** Absent on the template view, which has no run to open a dashboard for. */
  projectRunId?: string;
}) {
  const rollupRows = useMemo(() => riskRollupRowsFromRisks(risks), [risks]);
  const rollups = useMemo(() => rollupRiskComponents(rollupRows), [rollupRows]);
  const worstRpn = useMemo(() => worstRpnByComponent(rollupRows), [rollupRows]);

  return (
    <TooltipProvider>
      <div className="grid grid-cols-4 divide-x divide-border/60">
        {RISK_COMPONENT_OVERVIEW_ORDER.map((dimension) => {
          const rollup = rollups[dimension];
          const ap = rollup.worstActionPriority;
          const score = worstRpn[dimension];

          const body = (
            <>
              <GoalRiskLight
                dimension={dimension}
                worstActionPriority={ap}
                highCount={rollup.highCount}
                mediumCount={rollup.mediumCount}
                lowCount={rollup.lowCount}
                unscoredCount={rollup.unscoredCount}
                score={score}
                projectRunId={projectRunId}
              />
              <span className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {RISK_COMPONENT_CONSUMER_LABELS[dimension]}
              </span>
              <span className="shrink-0 text-[11px] font-bold tabular-nums">
                {score != null ? score : <span className="font-medium text-muted-foreground">-</span>}
              </span>
            </>
          );

          const tileClass = cn(
            'flex min-w-0 items-center justify-center gap-1.5 px-1.5 py-1',
            riskComponentTileClass(ap)
          );

          return (
            <div key={dimension} className={tileClass}>
              {body}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

function RiskFocusDashboard({
  risks,
  projectDisplayName,
  projectRunId,
  projectRun,
  showProgress,
  progressEditable,
  readOnly,
  onProgressChange,
  /** When true, hide name banner through progress/goals/summary to free space for the triage table. */
  collapseChrome = false,
}: {
  risks: Risk[];
  projectDisplayName?: string | null;
  /** Run whose dashboard the component lights open. Absent on the template view. */
  projectRunId?: string;
  /** Personalized run for progress and goals. Absent on the template view. */
  projectRun?: ProjectRun | null;
  showProgress?: boolean;
  progressEditable?: boolean;
  readOnly?: boolean;
  onProgressChange?: (progress: number) => void;
  collapseChrome?: boolean;
}) {
  const { high, medium, low } = riskFocusSeverityCounts(risks);
  const name = projectDisplayName?.trim() || null;
  const showGoals = Boolean(projectRun);
  const scheduleLabel = projectRun
    ? riskRadarPlannedScheduleLabel(projectRun) ??
      riskRadarGoalDateLabel(projectRun.initial_timeline)
    : null;
  const budgetLabel = projectRun
    ? riskRadarPlannedBudgetLabel(projectRun) ??
      riskRadarBudgetLabel(projectRun.initial_budget)
    : null;
  const qualityGoal = projectRun && isQualityGoal(projectRun.initial_quality_goal)
    ? projectRun.initial_quality_goal
    : null;

  const rollupRows = useMemo(() => riskRollupRowsFromRisks(risks), [risks]);
  const rollups = useMemo(() => rollupRiskComponents(rollupRows), [rollupRows]);
  const worstRpn = useMemo(() => worstRpnByComponent(rollupRows), [rollupRows]);

  const sectionHeaderClass =
    'mb-1 text-center font-display text-sm font-bold leading-5 text-foreground';
  const sectionShellClass =
    'flex h-full min-w-0 flex-col rounded-md border border-border bg-card px-2.5 py-2';
  const goalTileClass =
    'flex h-full min-h-0 min-w-0 flex-col items-center rounded-md border border-border bg-card px-1.5 py-1 text-center';
  const goalLabelClass =
    'font-display text-xs font-bold leading-tight text-foreground sm:text-sm';
  /** Shared outline height so Safety/Schedule/Budget match the Quality Good/Great/Professional row. */
  const goalMetricShellClass =
    'mt-1 flex h-9 w-full shrink-0 items-center justify-center overflow-hidden rounded-md border border-border px-1';
  const goalMetricClass =
    'min-w-0 break-words text-center font-display text-xs font-semibold leading-tight text-foreground sm:text-sm sm:leading-none';

  const goalLightProps = (dimension: RiskDimension) => {
    const rollup = rollups[dimension];
    return {
      dimension,
      worstActionPriority: rollup.worstActionPriority,
      highCount: rollup.highCount,
      mediumCount: rollup.mediumCount,
      lowCount: rollup.lowCount,
      unscoredCount: rollup.unscoredCount,
      score: worstRpn[dimension],
      projectRunId,
    };
  };

  const goalStatusFooter = (dimension: RiskDimension) => (
    <div className="mt-auto flex h-5 w-full shrink-0 items-center justify-center gap-1 pt-1">
      <span className="shrink-0 text-[11px] font-medium leading-none text-muted-foreground">
        Risk:
      </span>
      <GoalRiskLight {...goalLightProps(dimension)} variant="status" className="min-h-0 py-0" />
    </div>
  );

  const goalTitleRow = (
    icon: ReactNode,
    label: string,
    iconToneClass: string
  ) => (
    <div className="flex h-5 w-full shrink-0 items-center justify-center gap-1">
      <span
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded',
          iconToneClass
        )}
      >
        {icon}
      </span>
      <div className={cn(goalLabelClass, 'min-w-0 truncate')}>{label}</div>
    </div>
  );

  const qualityMetricLabel = qualityGoal
    ? QUALITY_GOAL_OPTIONS.find((o) => o.value === qualityGoal)?.label
    : null;

  return (
    <div className="shrink-0 border-b bg-muted/30 px-3 py-1.5 md:px-4">
      <div
        className={cn(
          'rounded-lg border border-slate-700/80 bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 px-3 py-2 text-center shadow-sm',
          collapseChrome ? 'mb-0' : 'mb-1.5'
        )}
      >
        <div className="text-sm font-bold leading-tight text-blue-50 md:text-base">
          Go as far as you can - Every step makes the finish line more likely
        </div>
      </div>
      {!collapseChrome ? (
        <>
          <div className="mb-1.5">
            <PlanningToolContextBanner
              projectName={name}
              flush
              className="pb-0"
            />
          </div>
          <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[minmax(8.5rem,0.5fr)_minmax(0,2.2fr)_minmax(9.5rem,0.65fr)] md:items-stretch">
            {showProgress && projectRun ? (
              <div className={sectionShellClass}>
                <div className={sectionHeaderClass}>Current project progress</div>
                <p className="mb-1 max-w-[14rem] text-[11px] leading-4 text-muted-foreground">
                  Risk falls as you get further into the project
                </p>
                {progressEditable ? (
                  <Select
                    disabled={readOnly}
                    value={riskFocusProgressSelectValue(projectRun.progress)}
                    onValueChange={(value) => {
                      const progress = Number.parseInt(value, 10);
                      if (
                        !Number.isFinite(progress) ||
                        !(RISK_FOCUS_PROGRESS_STOPS as readonly number[]).includes(progress)
                      ) {
                        return;
                      }
                      onProgressChange?.(progress);
                    }}
                  >
                    <SelectTrigger
                      className="mb-1.5 h-7 w-full text-xs text-muted-foreground"
                      aria-label="Current project progress"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="25">25%</SelectItem>
                      <SelectItem value="50">50%</SelectItem>
                      <SelectItem value="75">75%</SelectItem>
                      <SelectItem value="100">Complete</SelectItem>
                    </SelectContent>
                  </Select>
                ) : null}
                <div
                  className="mt-auto flex min-w-0 items-center gap-2"
                  role="status"
                  aria-label={`Current project progress ${riskFocusProgressBarPercent(projectRun.progress)}%`}
                >
                  <Progress
                    value={riskFocusProgressBarPercent(projectRun.progress)}
                    className="h-2 min-w-0 flex-1 border border-border bg-muted shadow-none"
                  />
                  <span className="w-11 shrink-0 text-right font-display text-lg font-bold tabular-nums leading-none text-foreground">
                    {riskFocusProgressBarPercent(projectRun.progress)}%
                  </span>
                </div>
              </div>
            ) : null}

            {showGoals ? (
              <div className={sectionShellClass}>
                <div className={sectionHeaderClass}>Project Goals</div>
                <TooltipProvider>
                  <div className="grid min-w-0 grid-cols-2 items-stretch gap-1 sm:grid-cols-[minmax(0,0.96fr)_minmax(0,0.96fr)_minmax(0,0.96fr)_minmax(0,1.12fr)]">
                    <div className={cn(goalTileClass, 'border-l-[3px] border-l-success')}>
                      {goalTitleRow(
                        <Shield className="h-3 w-3" aria-hidden />,
                        'Safety',
                        'bg-success/15 text-success'
                      )}
                      <div className={goalMetricShellClass}>
                        <div className={goalMetricClass}>0 injuries</div>
                      </div>
                      {goalStatusFooter('safety')}
                    </div>
                    <div className={cn(goalTileClass, 'border-l-[3px] border-l-info')}>
                      {goalTitleRow(
                        <CalendarDays className="h-3 w-3" aria-hidden />,
                        'Schedule',
                        'bg-info/15 text-info'
                      )}
                      <div className={goalMetricShellClass}>
                        <div className={goalMetricClass}>
                          {scheduleLabel ? `By ${scheduleLabel}` : '-'}
                        </div>
                      </div>
                      {goalStatusFooter('schedule')}
                    </div>
                    <div className={cn(goalTileClass, 'border-l-[3px] border-l-warning-soft')}>
                      {goalTitleRow(
                        <CircleDollarSign className="h-3 w-3" aria-hidden />,
                        'Budget',
                        'bg-warning-soft/15 text-warning-soft'
                      )}
                      <div className={goalMetricShellClass}>
                        <div className={cn(goalMetricClass, 'tabular-nums')}>
                          {budgetLabel ?? '-'}
                        </div>
                      </div>
                      {goalStatusFooter('budget')}
                    </div>
                    <div className={cn(goalTileClass, 'border-l-[3px] border-l-category-3')}>
                      {goalTitleRow(
                        <BadgeCheck className="h-3 w-3" aria-hidden />,
                        'Quality',
                        'bg-category-3/15 text-category-3'
                      )}
                      {qualityGoal ? (
                        <div
                          className={cn(goalMetricShellClass, 'grid grid-cols-3 gap-0 p-0')}
                          role="list"
                          aria-label={`Quality target ${qualityMetricLabel}. Options: Good, Great, Professional`}
                        >
                          {QUALITY_GOAL_OPTIONS.map((option, index) => {
                            const selected = option.value === qualityGoal;
                            return (
                              <span
                                key={option.value}
                                role="listitem"
                                aria-current={selected ? 'true' : undefined}
                                className={cn(
                                  'flex h-full min-w-0 items-center justify-center px-0.5 text-center text-[11px] leading-none',
                                  index > 0 && 'border-l border-border',
                                  selected
                                    ? 'bg-category-3/15 font-display font-semibold text-category-3'
                                    : 'bg-muted/40 font-medium text-muted-foreground'
                                )}
                              >
                                {option.label}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <div className={goalMetricShellClass}>
                          <div className={goalMetricClass}>-</div>
                        </div>
                      )}
                      {goalStatusFooter('quality')}
                    </div>
                  </div>
                </TooltipProvider>
              </div>
            ) : null}

            <div className={sectionShellClass}>
              <div className={sectionHeaderClass}>Current risk summary</div>
              <div className="mt-auto flex min-h-0 flex-1 items-center">
                <div className="grid w-full grid-cols-3 divide-x divide-border">
                  <div className="flex flex-col items-center justify-center gap-0.5 px-1 py-0.5">
                    <div className="flex items-center gap-1">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-destructive-soft"
                        aria-hidden
                      />
                      <span className="font-display text-xl font-bold tabular-nums leading-[22px] text-destructive-soft">
                        {high}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground">High</span>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-0.5 px-1 py-0.5">
                    <div className="flex items-center gap-1">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning-soft"
                        aria-hidden
                      />
                      <span className="font-display text-xl font-bold tabular-nums leading-[22px] text-warning-soft-foreground">
                        {medium}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground">Medium</span>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-0.5 px-1 py-0.5">
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" aria-hidden />
                      <span className="font-display text-xl font-bold tabular-nums leading-[22px] text-success">
                        {low}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground">Low</span>
                  </div>
                </div>
              </div>
              {!showGoals ? (
                <div className="mt-1 border-t border-border/60 pt-1">
                  <RiskComponentOverview risks={risks} projectRunId={projectRunId} />
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function RiskRadarListSortMenu({
  riskListSort,
  onSortChange,
  align = 'end',
  triggerClassName,
}: {
  riskListSort: 'alpha' | 'severity-desc';
  onSortChange: (v: 'alpha' | 'severity-desc') => void;
  align?: 'end' | 'center';
  triggerClassName?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('h-8 gap-0.5 px-1.5', triggerClassName)}
          aria-label={
            riskListSort === 'alpha'
              ? 'Sort list: A–Z (change)'
              : 'Sort list: risk level (change)'
          }
        >
          {riskListSort === 'alpha' ? (
            <ArrowDownAZ className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ArrowDownWideNarrow className="h-3.5 w-3.5 shrink-0" />
          )}
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="z-[250]">
        <DropdownMenuItem onClick={() => onSortChange('alpha')}>
          <ArrowDownAZ className="mr-2 h-4 w-4" />
          A–Z
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSortChange('severity-desc')}>
          <ArrowDownWideNarrow className="mr-2 h-4 w-4" />
          Risk level
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Run-mode Risk Radar (workshop / home): primary register order — easiest mitigation vs most important risk. */
function RiskRadarRegisterPrimarySortMenu({
  value,
  onValueChange,
  align = 'end',
  triggerClassName,
}: {
  value: RiskRadarRegisterPrimarySort;
  onValueChange: (v: RiskRadarRegisterPrimarySort) => void;
  align?: 'end' | 'center' | 'start';
  triggerClassName?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('h-8 gap-0.5 px-2 text-xs', triggerClassName)}
          aria-label={
            value === 'easiest-mitigation'
              ? 'Sort register: easiest mitigation first (change)'
              : 'Sort register: most important risk first (change)'
          }
        >
          <ListOrdered className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden min-[380px]:inline">Sort</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="z-[250] w-[min(100vw-2rem,18rem)]">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Sort register
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) => onValueChange(v as RiskRadarRegisterPrimarySort)}
        >
          <DropdownMenuRadioItem value="easiest-mitigation" className="text-sm">
            Easiest mitigation first
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="most-important-risk" className="text-sm">
            Most important risk first
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RiskRadarEditVisibilityMenu({
  showHiddenToggle,
  isRiskFocusRun,
  showHiddenRisks,
  onShowHiddenChange,
  hideStandardRisks,
  onHideStandardChange,
  triggerClassName,
}: {
  showHiddenToggle: boolean;
  isRiskFocusRun: boolean;
  showHiddenRisks: boolean;
  onShowHiddenChange: (v: boolean) => void;
  hideStandardRisks: boolean;
  onHideStandardChange: (v: boolean) => void;
  triggerClassName?: string;
}) {
  if (!showHiddenToggle && !isRiskFocusRun) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('gap-1', triggerClassName)}
          aria-label="Edit visibility"
        >
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[250]">
        {showHiddenToggle ? (
          <DropdownMenuCheckboxItem
            checked={showHiddenRisks}
            onCheckedChange={(c) => onShowHiddenChange(c === true)}
          >
            Show hidden risks
          </DropdownMenuCheckboxItem>
        ) : null}
        {isRiskFocusRun ? (
          <DropdownMenuCheckboxItem
            checked={hideStandardRisks}
            onCheckedChange={(c) => onHideStandardChange(c === true)}
          >
            Hide standard risks
          </DropdownMenuCheckboxItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface RiskManagementWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string; // Template project ID (for admin editing)
  projectRunId?: string; // Project run ID (for user viewing/editing)
  mode?: 'template' | 'run'; // 'template' for admin editing templates, 'run' for user editing runs
  readOnly?: boolean; // If true, disable all editing functionality
  variant?: 'default' | 'risk-focus';
  /** Workflow editor: use Risk Radar chrome, optional advanced register mode, open on the template being edited */
  workflowEditorRiskRadar?: boolean;
  /** Display name for Risk Radar dashboard when editing a template from the workflow editor */
  templateProjectDisplayName?: string;
  /**
   * When true with variant risk-focus + run mode: centered ~90% viewport + blurred backdrop (Planning Studio).
   * When false (default): full-bleed Risk Radar (e.g. My Workshop / workflow app).
   */
  planningWizardToolPresentation?: boolean;
}

export function RiskManagementWindow({
  open,
  onOpenChange,
  projectId,
  projectRunId,
  mode = 'run',
  readOnly = false,
  variant = 'default',
  workflowEditorRiskRadar = false,
  templateProjectDisplayName,
  planningWizardToolPresentation = false,
}: RiskManagementWindowProps) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { projectRuns, updateProjectRun, currentProjectRun } = useProject();
  const riskFocusRunForProgress = useMemo(
    () => (projectRunId ? projectRuns.find((r) => r.id === projectRunId) : undefined),
    [projectRuns, projectRunId]
  );
  const progressEditable = useMemo(
    () => Boolean(riskFocusRunForProgress && isRiskFocusRun(riskFocusRunForProgress)),
    [riskFocusRunForProgress]
  );
  const showRiskFocusProgressRow =
    variant === 'risk-focus' && mode === 'run' && Boolean(projectRunId && riskFocusRunForProgress);
  const riskFocusRun = variant === 'risk-focus' && mode === 'run';
  const useRiskRadarChrome = variant === 'risk-focus' || workflowEditorRiskRadar;
  const workflowTemplateRiskRadar = Boolean(workflowEditorRiskRadar && mode === 'template' && projectId);
  const showAdvancedToggle = workflowTemplateRiskRadar && !readOnly;
  const showAddRiskRow =
    !readOnly && (mode === 'template' || (mode === 'run' && projectRunId));
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [templateProjectIdForRisks, setTemplateProjectIdForRisks] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [detailsRisk, setDetailsRisk] = useState<Risk | null>(null);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [showHiddenRisks, setShowHiddenRisks] = useState(false);
  /** Risk Radar: when true, hide rows originating from Standard Project Foundation. Default off (show all). */
  const [hideStandardRisks, setHideStandardRisks] = useState(false);
  const [riskListSort, setRiskListSort] = useState<'alpha' | 'severity-desc'>('alpha');
  const [riskRadarRegisterPrimarySort, setRiskRadarRegisterPrimarySort] =
    useState<RiskRadarRegisterPrimarySort>('easiest-mitigation');
  const showRiskFocusHiddenToggle = riskFocusRun && risks.length > 0;
  const wfTableAdvanced = workflowTemplateRiskRadar && advancedMode;
  const wfTableFriendly = workflowTemplateRiskRadar && !advancedMode;
  /** User workshop / home Risk Radar run (not workflow editor template). */
  const friendlyRiskRadarRegisterUi = riskFocusRun && !workflowEditorRiskRadar;
  /** Risk Radar run without advanced register columns: combine risk + likelihood in one column. */
  const riskFocusEasyMode = riskFocusRun && !advancedMode;

  const usePlanningToolShell = Boolean(
    planningWizardToolPresentation && variant === 'risk-focus' && mode === 'run'
  );

  const [planningRiskStep, setPlanningRiskStep] = useState<PlanningRiskStepValue>('');
  const [rulesEditorOpen, setRulesEditorOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setPlanningRiskStep('');
      return;
    }
    if (usePlanningToolShell) {
      // Start with every triage step collapsed so the user opens each deliberately.
      setPlanningRiskStep('');
    }
  }, [open, usePlanningToolShell]);

  /** Keep scroll position in Risk Radar: avoid full fetchRisks() after small mitigation edits. */
  const patchRunRiskMitigationActions = useCallback(
    (
      riskId: string,
      mitigation_actions: NonNullable<Risk['mitigation_actions']> | null,
      severity?: 'low' | 'medium' | 'high'
    ) => {
      setRisks((prev) =>
        prev.map((r) =>
          r.id === riskId
            ? {
                ...r,
                mitigation_actions:
                  mitigation_actions && mitigation_actions.length > 0
                    ? mitigation_actions.map((a) => ({ ...a }))
                    : null,
                ...(severity ? { severity } : {}),
              }
            : r
        )
      );
    },
    []
  );

  const [formData, setFormData] = useState<RiskFormData>(EMPTY_RISK_FORM);

  const { table: actionPriorityTable } = useActionPriorityTable();
  const { table: occurrenceDriverTable, error: occurrenceDriverError } = useOccurrenceDrivers();

  /** Live priority for the row being authored, so the author sees the effect of each score. */
  const formDataPriority = useMemo(
    () =>
      registerRiskPriority(
        {
          riskDimension: formData.risk_dimension,
          severityScore: formData.severity_score,
          occurrenceScore: formData.occurrence_score,
          detectionScore: formData.detection_score,
        },
        actionPriorityTable
      ),
    [
      formData.risk_dimension,
      formData.severity_score,
      formData.occurrence_score,
      formData.detection_score,
      actionPriorityTable,
    ]
  );

  /**
   * Steps of the template being authored, for the optional step link on a register risk and for
   * the implicated item picker, which lists what that step actually has.
   */
  const [templateSteps, setTemplateSteps] = useState<
    { id: string; label: string; itemSource: StepItemSource }[]
  >([]);

  /**
   * What is keeping register risks off the Key Characteristics list. An unclassified driver is
   * the important number, because it excludes the risk silently rather than producing a wrong
   * answer. Null when there is nothing to report.
   */
  const registerClassificationGaps = useMemo(() => {
    if (mode !== 'template') return null;
    const unclassifiedDrivers = risks.filter((risk) => !risk.occurrence_driver).length;
    const unclassifiedPrevention = risks.filter((risk) => !risk.prevention_strength).length;
    const parts = [
      unclassifiedDrivers > 0
        ? `${unclassifiedDrivers} risk${unclassifiedDrivers === 1 ? '' : 's'} with no occurrence driver, so they cannot reach the Key Characteristics list`
        : null,
      unclassifiedPrevention > 0
        ? `${unclassifiedPrevention} risk${unclassifiedPrevention === 1 ? '' : 's'} with nothing recorded about what stops them`
        : null,
    ].filter(Boolean);
    return parts.length > 0 ? `${parts.join('. ')}.` : null;
  }, [mode, risks]);

  /** What the chosen step has of the chosen kind, for the implicated item picker. */
  const registerItemOptions = useMemo(() => {
    const kind = formData.implicated_item_kind;
    if (!kind || kind === 'step' || !formData.operation_step_id) return [];
    const step = templateSteps.find((s) => s.id === formData.operation_step_id);
    if (!step) return [];
    return listKcItemOptions(step.itemSource, kind);
  }, [formData.implicated_item_kind, formData.operation_step_id, templateSteps]);

  useEffect(() => {
    if (!open || mode !== 'template' || !templateProjectIdForRisks) {
      setTemplateSteps([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from('project_phases')
        .select(
          'name, position_value, phase_operations(operation_name, display_order, operation_steps(id, step_title, display_order, outputs, process_variables, materials, tools))'
        )
        .eq('project_id', templateProjectIdForRisks)
        .order('position_value', { ascending: true });

      if (cancelled) return;
      if (error) {
        console.error('Template step list load failed:', error);
        setTemplateSteps([]);
        return;
      }

      const stepIds = (data ?? []).flatMap((phase) =>
        (phase.phase_operations ?? []).flatMap((operation) =>
          (operation.operation_steps ?? []).map((step) => step.id)
        )
      );

      // Instruction sections are the one addressable item kind that does not live on the step
      // row. A failure here leaves the instruction option empty rather than blocking the form.
      const sectionsByStepId = new Map<string, unknown[]>();
      if (stepIds.length > 0) {
        const { data: instructionRows, error: instructionError } = await supabase
          .from('step_instructions')
          .select('step_id, content')
          .in('step_id', stepIds);
        if (instructionError) {
          console.error('Template step instruction load failed:', instructionError);
        } else {
          for (const row of instructionRows ?? []) {
            const sections = Array.isArray(row.content) ? row.content : [];
            const existing = sectionsByStepId.get(row.step_id);
            if (existing) existing.push(...sections);
            else sectionsByStepId.set(row.step_id, [...sections]);
          }
        }
      }

      const steps: { id: string; label: string; itemSource: StepItemSource }[] = [];
      for (const phase of data ?? []) {
        const operations = [...(phase.phase_operations ?? [])].sort(
          (a, b) => a.display_order - b.display_order
        );
        for (const operation of operations) {
          const operationSteps = [...(operation.operation_steps ?? [])].sort(
            (a, b) => a.display_order - b.display_order
          );
          for (const step of operationSteps) {
            steps.push({
              id: step.id,
              label: `${phase.name} - ${operation.operation_name} - ${step.step_title}`,
              itemSource: {
                stepTitle: step.step_title,
                outputs: step.outputs,
                processVariables: step.process_variables,
                materials: step.materials,
                tools: step.tools,
                instructionSections: sectionsByStepId.get(step.id) ?? [],
              },
            });
          }
        }
      }
      setTemplateSteps(steps);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, mode, templateProjectIdForRisks]);

  const displayRisks = useMemo(() => {
    let list =
      variant === 'risk-focus' && mode === 'run'
        ? showHiddenRisks
          ? risks
          : risks.filter((r) => !r.hidden_from_register)
        : risks;
    if (variant === 'risk-focus' && mode === 'run' && hideStandardRisks) {
      list = list.filter((r) => !r.from_standard_foundation);
    }
    const sorted = [...list];
    if (variant === 'risk-focus' && mode === 'run') {
      sorted.sort((a, b) => {
        if (riskRadarRegisterPrimarySort === 'easiest-mitigation') {
          const pe =
            mitigationEffortSortRank(a.mitigation_effort_level ?? null) -
            mitigationEffortSortRank(b.mitigation_effort_level ?? null);
          if (pe !== 0) return pe;
        } else {
          const sev = severitySortRank(b.severity) - severitySortRank(a.severity);
          if (sev !== 0) return sev;
        }
        return (a.risk || '').localeCompare(b.risk || '', undefined, { sensitivity: 'base' });
      });
    } else if (workflowTemplateRiskRadar) {
      if (riskListSort === 'alpha') {
        sorted.sort((a, b) => (a.risk || '').localeCompare(b.risk || '', undefined, { sensitivity: 'base' }));
      } else {
        sorted.sort(
          (a, b) =>
            severitySortRank(b.severity) - severitySortRank(a.severity) ||
            (a.risk || '').localeCompare(b.risk || '', undefined, { sensitivity: 'base' })
        );
      }
    }
    return sorted;
  }, [
    risks,
    variant,
    mode,
    showHiddenRisks,
    hideStandardRisks,
    riskListSort,
    workflowTemplateRiskRadar,
    riskRadarRegisterPrimarySort,
  ]);

  const planningRiskCounts = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 };
    for (const risk of displayRisks) {
      counts[riskTriageLevel(risk)] += 1;
    }
    return counts;
  }, [displayRisks]);

  const listRisks = useMemo(() => {
    if (!usePlanningToolShell) return displayRisks;
    if (planningRiskStep !== 'high' && planningRiskStep !== 'medium' && planningRiskStep !== 'low') {
      return [];
    }
    return displayRisks
      .filter((r) => riskTriageLevel(r) === planningRiskStep)
      .sort(compareRisksByPriority);
  }, [usePlanningToolShell, displayRisks, planningRiskStep]);

  const setPlanningRiskStepStable = useCallback((next: string) => {
    if (next === 'high' || next === 'medium' || next === 'low') {
      setPlanningRiskStep(next);
    }
  }, []);

  useSteppedAutoAdvance({
    enabled: open && usePlanningToolShell && planningRiskStep !== '',
    activeStep: planningRiskStep || null,
    setActiveStep: setPlanningRiskStepStable,
    steps: [
      { key: 'high', isComplete: planningRiskCounts.high === 0, next: 'medium' },
      { key: 'medium', isComplete: planningRiskCounts.medium === 0, next: 'low' },
    ],
  });

  useEffect(() => {
    if (!showAdvancedToggle) {
      setAdvancedMode(false);
    }
  }, [showAdvancedToggle, open]);

  useEffect(() => {
    if (open) {
      fetchRisks();
    }
  }, [open, projectId, projectRunId, mode]);

  // Opening Risk Radar is one of the re-evaluation points: the user's tools, spaces, and
  // history may have moved since this run's list was written.
  useRunRiskReevaluation({
    projectRunId: mode === 'run' ? projectRunId : null,
    enabled: open,
    onReevaluated: () => {
      void fetchRisks();
    },
  });

  const fetchRisks = async () => {
    if (!open) return;
    
    setLoading(true);
    try {
      if (mode === 'template' && projectId) {
        // First, check if this is a revision and get the parent/template project ID
        let templateProjectId = projectId;
        
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('id, parent_project_id')
          .eq('id', projectId)
          .single();
        
        if (projectError) {
          console.error('Error fetching project:', projectError);
        } else if (projectData?.parent_project_id) {
          // This is a revision, use the parent project ID
          templateProjectId = projectData.parent_project_id;
        }

        setTemplateProjectIdForRisks(templateProjectId);
        
        // Standard foundation risks are merged into each project at the UI layer,
        // but mitigation action tracking remains run-level (project_run_risks).
        const { data: standardProject, error: standardProjectError } = await supabase
          .from('projects')
          .select('id')
          .eq('is_standard', true)
          .single();

        if (standardProjectError) throw standardProjectError;
        if (!standardProject?.id) throw new Error('Standard project foundation not found (is_standard = true).');

        let mergedRisksData: any[] = [];
        if (standardProject.id === templateProjectId) {
          const { data, error } = await supabase
            .from('project_risks')
            .select('*')
            .eq('project_id', templateProjectId)
            .order('display_order', { ascending: true });

          if (error) throw error;
          mergedRisksData = data || [];
        } else {
          const [{ data: foundationRisks, error: foundationError }, { data: projectRisks, error: projectRisksError }] =
            await Promise.all([
              supabase
                .from('project_risks')
                .select('*')
                .eq('project_id', standardProject.id)
                .order('display_order', { ascending: true }),
              supabase
                .from('project_risks')
                .select('*')
                .eq('project_id', templateProjectId)
                .order('display_order', { ascending: true }),
            ]);

          if (foundationError) throw foundationError;
          if (projectRisksError) throw projectRisksError;

          mergedRisksData = [...(foundationRisks || []), ...(projectRisks || [])];
        }
        
        // Map database fields to component interface
        const mappedRisks: Risk[] = (mergedRisksData || []).map((risk: any) => ({
          id: risk.id,
          risk: risk.risk_title || '',
          risk_title: risk.risk_title,
          risk_description: risk.risk_description,
          likelihood: registerRiskLevelOrMedium(risk.likelihood),
          severity: registerRiskLevelOrMedium(risk.severity),
          schedule_impact_days: risk.schedule_impact_high_days || risk.schedule_impact_low_days || null,
          schedule_impact_low_days: risk.schedule_impact_low_days,
          schedule_impact_high_days: risk.schedule_impact_high_days,
          budget_impact_dollars: risk.budget_impact_high || risk.budget_impact_low || null,
          budget_impact_low: risk.budget_impact_low,
          budget_impact_high: risk.budget_impact_high,
          mitigation: risk.mitigation_strategy || null,
          mitigation_strategy: risk.mitigation_strategy,
          mitigation_actions: parseMitigationActionsFromDb(risk.mitigation_actions),
          mitigation_effort_level: parseMitigationEffortLevelFromDb(risk.mitigation_effort_level),
          notes: risk.benefit || risk.risk_description || null,
          benefit: typeof risk.benefit === 'string' ? risk.benefit : null,
          status: 'open' as const,
          display_order: risk.display_order,
          impact: risk.impact,
          risk_dimension: isRegisterRiskDimension(risk.risk_dimension) ? risk.risk_dimension : null,
          severity_score: risk.severity_score ?? null,
          occurrence_score: risk.occurrence_score ?? null,
          detection_score: risk.detection_score ?? null,
          operation_step_id: risk.operation_step_id ?? null,
          occurrence_driver: risk.occurrence_driver ?? null,
          prevention_strength: risk.prevention_strength ?? null,
          implicated_item_kind: isRiskItemKind(risk.implicated_item_kind)
            ? risk.implicated_item_kind
            : null,
          implicated_item_id: risk.implicated_item_id ?? null,
        }));
        
        setRisks(mappedRisks);
      } else if (mode === 'run' && projectRunId) {
        // Fetch run-level risks (template risks + user-added risks)
        const { data, error } = await supabase
          .from('project_run_risks')
          .select('*')
          .eq('project_run_id', projectRunId)
          .order('display_order', { ascending: true });

        if (error) throw error;
        
        // Map database fields to component interface
        const mappedRisks: Risk[] = (data || []).map((risk: any) => ({
          id: risk.id,
          risk: risk.risk_title || '',
          risk_title: risk.risk_title,
          risk_description: risk.risk_description,
          likelihood: registerRiskLevelOrMedium(risk.likelihood),
          severity: registerRiskLevelOrMedium(risk.severity),
          schedule_impact_days: risk.schedule_impact_high_days || risk.schedule_impact_low_days || null,
          schedule_impact_low_days: risk.schedule_impact_low_days,
          schedule_impact_high_days: risk.schedule_impact_high_days,
          budget_impact_dollars: risk.budget_impact_high || risk.budget_impact_low || null,
          budget_impact_low: risk.budget_impact_low,
          budget_impact_high: risk.budget_impact_high,
          mitigation: risk.mitigation_strategy || null,
          mitigation_strategy: risk.mitigation_strategy,
          mitigation_actions: parseMitigationActionsFromDb(risk.mitigation_actions),
          mitigation_effort_level: parseMitigationEffortLevelFromDb(risk.mitigation_effort_level),
          notes: risk.benefit || risk.risk_description || null,
          benefit: typeof risk.benefit === 'string' ? risk.benefit : null,
          status: risk.status || 'open',
          is_template_risk: !!risk.template_risk_id,
          template_risk_id: risk.template_risk_id,
          display_order: risk.display_order,
          impact: risk.impact,
          hidden_from_register: risk.hidden_from_register === true,
          from_standard_foundation: risk.from_standard_foundation === true,
          risk_dimension: isRiskDimension(risk.risk_dimension) ? risk.risk_dimension : null,
          severity_score: risk.severity_score ?? null,
          occurrence_score: risk.occurrence_score ?? null,
          detection_score: risk.detection_score ?? null,
          operation_step_id: risk.operation_step_id ?? null,
          action_priority: isActionPriority(risk.action_priority) ? risk.action_priority : null,
          rpn: risk.rpn ?? null,
          source: risk.source === 'pfmea' || risk.source === 'register' ? risk.source : null,
          excluded_by_customization: risk.excluded_by_customization === true,
        }));
        
        setRisks(mappedRisks);
      }
    } catch (error: any) {
      await reportUserFacingError({
        source: 'risk_radar',
        operation: 'load_risks',
        userId: user?.id,
        projectId: projectId ?? null,
        projectRunId: projectRunId ?? null,
        error,
        userMessage: 'Your risks could not be loaded.',
        notificationTitle: 'Risks did not load',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRisk = async () => {
    if (!formData.risk.trim()) {
      toast.error('Please enter a risk description');
      return;
    }

    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    const likelihood = registerRiskLevelOrMedium(formData.likelihood);
    const severity = registerRiskLevelOrMedium(formData.severity);

    try {
      if (mode === 'template' && projectId) {
        if (!templateProjectIdForRisks) {
          toast.error('Unable to determine which project record to save risks into.');
          return;
        }

        // The item reference is meaningless without knowing which step it sits on, and the
        // database enforces that, so it is dropped along with the step rather than rejected.
        const classification = {
          occurrence_driver: formData.occurrence_driver,
          prevention_strength: formData.prevention_strength,
          implicated_item_kind: formData.operation_step_id ? formData.implicated_item_kind : null,
          implicated_item_id:
            formData.operation_step_id &&
            formData.implicated_item_kind &&
            formData.implicated_item_kind !== 'step'
              ? formData.implicated_item_id
              : null,
        };

        // Save template risk
        if (editingRisk) {
          const { error } = await supabase
            .from('project_risks')
            .update({
              ...classification,
              risk_title: formData.risk.trim(),
              risk_description: null,
              benefit: formData.notes.trim() || null,
              likelihood,
              severity,
              schedule_impact_low_days: formData.schedule_impact_days || null,
              schedule_impact_high_days: formData.schedule_impact_days || null,
              budget_impact_low: formData.budget_impact_dollars ? Math.round(formData.budget_impact_dollars) : null,
              budget_impact_high: formData.budget_impact_dollars ? Math.round(formData.budget_impact_dollars) : null,
              mitigation_strategy: formData.mitigation.trim() || null,
              mitigation_actions: formData.mitigation_actions && formData.mitigation_actions.length > 0
                ? formData.mitigation_actions
                : null,
              mitigation_effort_level: formData.mitigation_effort_level,
              risk_dimension: formData.risk_dimension,
              severity_score: formData.severity_score,
              occurrence_score: formData.occurrence_score,
              detection_score: formData.detection_score,
              operation_step_id: formData.operation_step_id,
            })
            .eq('id', editingRisk.id);

          if (error) throw error;
                  } else {
          const { data: existingRisks } = await supabase
            .from('project_risks')
            .select('display_order')
            .eq('project_id', templateProjectIdForRisks)
            .order('display_order', { ascending: false })
            .limit(1);

          const nextOrder = existingRisks && existingRisks.length > 0 
            ? (existingRisks[0].display_order || 0) + 1 
            : 0;

          const { error } = await supabase
            .from('project_risks')
            .insert({
              ...classification,
              project_id: templateProjectIdForRisks,
              risk_title: formData.risk.trim(),
              risk_description: null,
              benefit: formData.notes.trim() || null,
              likelihood,
              severity,
              schedule_impact_low_days: formData.schedule_impact_days || null,
              schedule_impact_high_days: formData.schedule_impact_days || null,
              budget_impact_low: formData.budget_impact_dollars ? Math.round(formData.budget_impact_dollars) : null,
              budget_impact_high: formData.budget_impact_dollars ? Math.round(formData.budget_impact_dollars) : null,
              mitigation_strategy: formData.mitigation.trim() || null,
              mitigation_actions: formData.mitigation_actions && formData.mitigation_actions.length > 0
                ? formData.mitigation_actions
                : null,
              mitigation_effort_level: formData.mitigation_effort_level,
              risk_dimension: formData.risk_dimension,
              severity_score: formData.severity_score,
              occurrence_score: formData.occurrence_score,
              detection_score: formData.detection_score,
              operation_step_id: formData.operation_step_id,
              display_order: nextOrder
            });

          if (error) throw error;
                  }
      } else if (mode === 'run' && projectRunId) {
        // Save run risk
        if (editingRisk) {
          const baseUpdate = {
              risk_title: formData.risk.trim(),
              risk_description: null,
              benefit: formData.notes.trim() || null,
              likelihood,
              severity,
              schedule_impact_low_days: formData.schedule_impact_days || null,
              schedule_impact_high_days: formData.schedule_impact_days || null,
              budget_impact_low: formData.budget_impact_dollars ? Math.round(formData.budget_impact_dollars) : null,
              budget_impact_high: formData.budget_impact_dollars ? Math.round(formData.budget_impact_dollars) : null,
              mitigation_strategy: formData.mitigation.trim() || null,
              mitigation_actions: formData.mitigation_actions && formData.mitigation_actions.length > 0
                ? formData.mitigation_actions
                : null,
          };
          const { error } = await supabase
            .from('project_run_risks')
            .update(
              variant === 'risk-focus'
                ? baseUpdate
                : { ...baseUpdate, status: formData.status }
            )
            .eq('id', editingRisk.id);

          if (error) throw error;
                  } else {
          const { data: existingRisks } = await supabase
            .from('project_run_risks')
            .select('display_order')
            .eq('project_run_id', projectRunId)
            .order('display_order', { ascending: false })
            .limit(1);

          const nextOrder = existingRisks && existingRisks.length > 0 
            ? (existingRisks[0].display_order || 0) + 1 
            : 0;

          const { error } = await supabase
            .from('project_run_risks')
            .insert({
              project_run_id: projectRunId,
              risk_title: formData.risk.trim(),
              risk_description: null,
              benefit: formData.notes.trim() || null,
              likelihood,
              severity,
              schedule_impact_low_days: formData.schedule_impact_days || null,
              schedule_impact_high_days: formData.schedule_impact_days || null,
              budget_impact_low: formData.budget_impact_dollars ? Math.round(formData.budget_impact_dollars) : null,
              budget_impact_high: formData.budget_impact_dollars ? Math.round(formData.budget_impact_dollars) : null,
              mitigation_strategy: formData.mitigation.trim() || null,
              mitigation_actions: formData.mitigation_actions && formData.mitigation_actions.length > 0
                ? formData.mitigation_actions
                : null,
              status: formData.status,
              display_order: nextOrder,
              hidden_from_register: false,
              from_standard_foundation: false,
            });

          if (error) throw error;
                  }
      }

      setShowAddForm(false);
      setEditingRisk(null);
      setFormData(EMPTY_RISK_FORM);
      fetchRisks();
      
      // Notify scheduler that risks have been updated
      window.dispatchEvent(new CustomEvent('risks-updated'));
    } catch (error) {
      console.error('Error saving risk:', error);
      toast.error('Failed to save risk');
    }
  };

  const handleEditRisk = (risk: Risk) => {
    setEditingRisk(risk);
    const narrative =
      (typeof risk.benefit === 'string' && risk.benefit.trim() !== ''
        ? risk.benefit
        : null) ||
      risk.notes ||
      risk.risk_description ||
      '';
    setFormData({
      risk: risk.risk || risk.risk_title || '',
      likelihood: registerRiskLevelOrMedium(risk.likelihood),
      severity: registerRiskLevelOrMedium(risk.severity),
      schedule_impact_days: risk.schedule_impact_days || risk.schedule_impact_high_days || risk.schedule_impact_low_days || 0,
      budget_impact_dollars: risk.budget_impact_dollars || risk.budget_impact_high || risk.budget_impact_low || 0,
      mitigation: risk.mitigation || risk.mitigation_strategy || '',
      mitigation_actions: risk.mitigation_actions ? [...risk.mitigation_actions] : [],
      mitigation_effort_level: risk.mitigation_effort_level ?? null,
      notes: narrative,
      status: risk.status || 'open',
      // The form authors register components only. A quality row reached the list from the
      // PFMEA, so it has no register component to preselect.
      risk_dimension: isRegisterRiskDimension(risk.risk_dimension) ? risk.risk_dimension : null,
      severity_score: risk.severity_score ?? null,
      occurrence_score: risk.occurrence_score ?? null,
      detection_score: risk.detection_score ?? null,
      operation_step_id: risk.operation_step_id ?? null,
      occurrence_driver: risk.occurrence_driver ?? null,
      prevention_strength: isPreventionStrength(risk.prevention_strength)
        ? risk.prevention_strength
        : null,
      implicated_item_kind: risk.implicated_item_kind ?? null,
      implicated_item_id: risk.implicated_item_id ?? null,
    });
    setShowAddForm(true);
  };

  const handleDeleteRisk = async (risk: Risk) => {
    if (!confirm('Are you sure you want to delete this risk?')) return;

    // Prevent deletion of template risks by users
    if (mode === 'run' && risk.is_template_risk) {
      toast.error('Predefined risks cannot be deleted. Hide them from the register instead.');
      return;
    }

    try {
      if (mode === 'template' && projectId) {
        const { error } = await supabase
          .from('project_risks')
          .delete()
          .eq('id', risk.id);

        if (error) throw error;
              } else if (mode === 'run' && projectRunId) {
        const { error } = await supabase
          .from('project_run_risks')
          .delete()
          .eq('id', risk.id);

        if (error) throw error;
              }

      fetchRisks();
      setShowAddForm(false);
      setEditingRisk(null);
      setDetailsRisk((prev) => (prev?.id === risk.id ? null : prev));

      // Notify scheduler that risks have been updated
      window.dispatchEvent(new CustomEvent('risks-updated'));
    } catch (error) {
      console.error('Error deleting risk:', error);
      toast.error('Failed to delete risk');
    }
  };

  const handleUpdateStatus = async (risk: Risk, newStatus: 'open' | 'mitigated' | 'closed' | 'monitoring') => {
    if (mode !== 'run' || !projectRunId) return;

    try {
      const { error } = await supabase
        .from('project_run_risks')
        .update({ status: newStatus })
        .eq('id', risk.id);

      if (error) throw error;
            fetchRisks();
      
      // Notify scheduler that risks have been updated
      window.dispatchEvent(new CustomEvent('risks-updated'));
    } catch (error) {
      console.error('Error updating risk status:', error);
      toast.error('Failed to update risk status');
    }
  };

  const handleUpdateCurrentRiskLevel = async (risk: Risk, newLevel: 'low' | 'medium' | 'high') => {
    if (mode !== 'run' || !projectRunId || variant !== 'risk-focus') return;

    try {
      const { error } = await supabase
        .from('project_run_risks')
        .update({ severity: newLevel })
        .eq('id', risk.id);

      if (error) throw error;
            fetchRisks();
      window.dispatchEvent(new CustomEvent('risks-updated'));
    } catch (error) {
      console.error('Error updating risk level:', error);
      toast.error('Failed to update risk level');
    }
  };

  const handleMitigationActionCompletedToggle = async (risk: Risk, actionIndex: number) => {
    if (mode !== 'run' || !projectRunId || variant !== 'risk-focus' || readOnly) return;
    const actions = parseMitigationActionsFromDb(risk.mitigation_actions);
    if (actionIndex < 0 || actionIndex >= actions.length) return;
    const next = actions.map((a, i) =>
      i === actionIndex ? { ...a, completed: !a.completed } : a
    );
    const nextSeverity = severityFromMitigationProgress(riskBaselineSeverity(risk), next);
    try {
      const { error } = await supabase
        .from('project_run_risks')
        .update({
          mitigation_actions: next.length > 0 ? next : null,
          severity: nextSeverity,
        })
        .eq('id', risk.id);
      if (error) throw error;
      patchRunRiskMitigationActions(risk.id, next, nextSeverity);
      setDetailsRisk((prev) =>
        prev?.id === risk.id
          ? {
              ...prev,
              mitigation_actions: next.length > 0 ? next.map((a) => ({ ...a })) : null,
              severity: nextSeverity,
            }
          : prev
      );
      window.dispatchEvent(new CustomEvent('risks-updated'));
    } catch (error) {
      console.error('Error updating mitigation action:', error);
      toast.error('Failed to update mitigation action');
    }
  };

  const handleAppendMitigationAction = async (risk: Risk) => {
    if (mode !== 'run' || !projectRunId || variant !== 'risk-focus' || readOnly) return;
    const actions = parseMitigationActionsFromDb(risk.mitigation_actions);
    const next = [...actions, { action: '', benefit: '', completed: false }];
    try {
      const { error } = await supabase
        .from('project_run_risks')
        .update({ mitigation_actions: next })
        .eq('id', risk.id);
      if (error) throw error;
      patchRunRiskMitigationActions(risk.id, next);
      window.dispatchEvent(new CustomEvent('risks-updated'));
    } catch (error) {
      console.error('Error adding mitigation action:', error);
      toast.error('Failed to add mitigation');
    }
  };

  const handleMitigationActionTextBlur = async (risk: Risk, actionIndex: number, raw: string) => {
    if (mode !== 'run' || !projectRunId || variant !== 'risk-focus' || readOnly) return;
    const actions = parseMitigationActionsFromDb(risk.mitigation_actions);
    if (actionIndex < 0 || actionIndex >= actions.length) return;
    const trimmed = raw.trim();
    const prev = (actions[actionIndex].action || '').trim();
    if (trimmed === prev) return;
    let next: { action: string; benefit?: string | null; completed?: boolean }[];
    if (!trimmed) {
      next = actions.filter((_, i) => i !== actionIndex);
    } else {
      next = actions.map((a, i) => (i === actionIndex ? { ...a, action: trimmed } : a));
    }
    try {
      const { error } = await supabase
        .from('project_run_risks')
        .update({ mitigation_actions: next.length > 0 ? next : null })
        .eq('id', risk.id);
      if (error) throw error;
      patchRunRiskMitigationActions(risk.id, next.length > 0 ? next : null);
      window.dispatchEvent(new CustomEvent('risks-updated'));
    } catch (error) {
      console.error('Error updating mitigation text:', error);
      toast.error('Failed to save mitigation');
    }
  };

  useEffect(() => {
    setDetailsRisk((prev) => {
      if (!prev) return prev;
      const next = risks.find((r) => r.id === prev.id);
      return next ?? null;
    });
  }, [risks]);

  const handleSetRiskHiddenFromRegister = async (risk: Risk, hidden: boolean) => {
    if (mode !== 'run' || !projectRunId || variant !== 'risk-focus') return;
    if (!risk.is_template_risk) {
      toast.error('Only predefined risks can be hidden. Use delete for risks you added.');
      return;
    }
    try {
      const { error } = await supabase
        .from('project_run_risks')
        .update({ hidden_from_register: hidden })
        .eq('id', risk.id);
      if (error) throw error;
            fetchRisks();
      setDetailsRisk((prev) => (prev?.id === risk.id ? { ...prev, hidden_from_register: hidden } : prev));
      setEditingRisk((prev) => (prev?.id === risk.id ? { ...prev, hidden_from_register: hidden } : prev));
      window.dispatchEvent(new CustomEvent('risks-updated'));
    } catch (error) {
      console.error('Error updating risk visibility:', error);
      toast.error('Failed to update risk visibility');
    }
  };

  const getRiskLevelColor = (likelihood: string, scheduleImpact: number | null, budgetImpact: number | null) => {
    const likelihoodScore = likelihood === 'high' ? 3 : likelihood === 'medium' ? 2 : 1;
    const scheduleScore = (scheduleImpact || 0) > 7 ? 3 : (scheduleImpact || 0) > 3 ? 2 : 1;
    const budgetScore = (budgetImpact || 0) > 1000 ? 3 : (budgetImpact || 0) > 500 ? 2 : 1;
    
    const riskScore = Math.max(likelihoodScore, scheduleScore, budgetScore);
    
    if (riskScore >= 3) return 'bg-destructive-soft/15 text-destructive-soft border-destructive-soft/40';
    if (riskScore >= 2) return 'bg-warning-soft/15 text-warning-soft border-warning-soft/40';
    return 'bg-warning-soft/15 text-warning-soft border-warning-soft/40';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'closed': return 'bg-success/15 text-success';
      case 'mitigated': return 'bg-info/15 text-info';
      case 'monitoring': return 'bg-warning-soft/15 text-warning-soft';
      default: return 'bg-muted text-foreground';
    }
  };

  const mainContents = (
    <>
        <DialogHeader className={cn(PLANNING_TOOL_WINDOW_HEADER_CLASSNAME, 'flex-shrink-0')}>
          <div className="min-w-0 flex-1 space-y-1">
            <DialogTitle
              className={cn(
                PLANNING_TOOL_WINDOW_TITLE_CLASSNAME,
                'flex flex-wrap items-center gap-2'
              )}
            >
              {useRiskRadarChrome ? (
                <Crosshair className="h-5 w-5 shrink-0" />
              ) : (
                <Shield className="h-5 w-5 shrink-0" />
              )}
              Risk Radar
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      tabIndex={-1}
                      className="ml-1 inline-flex items-center justify-center rounded-full border border-muted-foreground/20 bg-background/80 p-0.5 text-[10px] text-muted-foreground hover:bg-muted"
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8} className="max-w-sm text-xs">
                    {workflowTemplateRiskRadar
                      ? 'Edit project risks for this template. Foundation risks may be included depending on the project.'
                      : variant === 'risk-focus'
                        ? 'This session is dedicated to risks for your template: foundation and project risks are on the run, and you can add run-specific risks anytime.'
                        : 'A risk is simply something uncertain. Construction projects often go off-schedule due to uncertainty at the start. Projects come pre-loaded with risks and potential impact, and you can add your own when you see additional concerns.'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </DialogTitle>
            {useRiskRadarChrome ? (
              <p
                className={cn(PLANNING_TOOL_WINDOW_SUBTITLE_CLASSNAME, 'max-w-3xl')}
              >
                {workflowTemplateRiskRadar
                  ? 'Review and edit risks for the project template you are working on'
                  : `Spot what could go wrong, and plan how you'll handle it`}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
            {showAdvancedToggle ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Advanced</span>
                <Switch checked={advancedMode} onCheckedChange={setAdvancedMode} />
              </div>
            ) : null}
            <PlanningToolWindowHeaderActions
              className="flex-shrink-0"
              onCancel={() => onOpenChange(false)}
              onSaveAndClose={() => onOpenChange(false)}
            />
          </div>
        </DialogHeader>

        {/* Name banner lives inside RiskFocusDashboard (under the hero). Avoid duplicating it here. */}
        {mode === 'run' && variant !== 'risk-focus' && !workflowTemplateRiskRadar ? (
          <PlanningToolContextBanner
            projectRun={riskFocusRunForProgress ?? currentProjectRun}
            className="px-4 pt-3 md:px-6"
            flush
          />
        ) : null}

        {variant === 'risk-focus' && mode === 'run' ? (
          <RiskFocusDashboard
            risks={displayRisks}
            projectRunId={projectRunId}
            projectDisplayName={
              riskFocusRunForProgress
                ? riskFocusRunForProgress.customProjectName?.trim() ||
                  riskFocusRunForProgress.name?.trim() ||
                  null
                : null
            }
            projectRun={riskFocusRunForProgress ?? null}
            showProgress={showRiskFocusProgressRow}
            progressEditable={progressEditable}
            readOnly={readOnly}
            collapseChrome={usePlanningToolShell && planningRiskStep !== ''}
            onProgressChange={(progress) => {
              if (!riskFocusRunForProgress) return;
              void updateProjectRun({ ...riskFocusRunForProgress, progress });
            }}
          />
        ) : workflowTemplateRiskRadar ? (
          <RiskFocusDashboard
            risks={displayRisks}
            projectDisplayName={templateProjectDisplayName?.trim() || null}
          />
        ) : null}

        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col px-2 md:px-4',
            useRiskRadarChrome
              ? 'gap-2 pb-2 pt-1 md:gap-2 md:pb-3 md:pt-1.5'
              : 'gap-3 py-2 md:py-3'
          )}
        >
          {loading ? (
            <div className="flex flex-1 items-center justify-center py-12">
              <div className="text-muted-foreground">Loading risks...</div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              {riskFocusRun &&
              !usePlanningToolShell &&
              (showAddRiskRow || showRiskFocusHiddenToggle || risks.length > 0) ? (
                <>
                  {/* Risk Radar mobile: compact stacked controls */}
                  <div className="flex w-full shrink-0 flex-col gap-2 md:hidden">
                    <div className="flex w-full flex-wrap items-center gap-2">
                      {risks.length > 0 && riskFocusRun ? (
                        <RiskRadarRegisterPrimarySortMenu
                          value={riskRadarRegisterPrimarySort}
                          onValueChange={setRiskRadarRegisterPrimarySort}
                          align="start"
                          triggerClassName="h-8"
                        />
                      ) : null}
                      <RiskRadarEditVisibilityMenu
                        showHiddenToggle={showRiskFocusHiddenToggle}
                        isRiskFocusRun={riskFocusRun}
                        showHiddenRisks={showHiddenRisks}
                        onShowHiddenChange={setShowHiddenRisks}
                        hideStandardRisks={hideStandardRisks}
                        onHideStandardChange={setHideStandardRisks}
                        triggerClassName="h-8 px-2 text-xs"
                      />
                      {showAddRiskRow ? (
                        <Button
                          variant="default"
                          size="sm"
                          className="ml-auto h-8 gap-1.5 px-2 text-xs"
                          aria-label="Add risk"
                          onClick={() => {
                            setEditingRisk(null);
                            setFormData(EMPTY_RISK_FORM);
                            setShowAddForm(true);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                          Add
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {/* Risk Radar desktop toolbar */}
                  <div className="hidden w-full shrink-0 flex-col gap-2 md:flex sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:ml-auto">
                      {risks.length > 0 && riskFocusRun ? (
                        <RiskRadarRegisterPrimarySortMenu
                          value={riskRadarRegisterPrimarySort}
                          onValueChange={setRiskRadarRegisterPrimarySort}
                          triggerClassName="h-7"
                        />
                      ) : null}
                      <RiskRadarEditVisibilityMenu
                        showHiddenToggle={showRiskFocusHiddenToggle}
                        isRiskFocusRun={riskFocusRun}
                        showHiddenRisks={showHiddenRisks}
                        onShowHiddenChange={setShowHiddenRisks}
                        hideStandardRisks={hideStandardRisks}
                        onHideStandardChange={setHideStandardRisks}
                        triggerClassName="h-7 px-2.5 text-xs"
                      />
                      {showAddRiskRow ? (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setEditingRisk(null);
                            setFormData(EMPTY_RISK_FORM);
                            setShowAddForm(true);
                          }}
                          className="h-7 gap-1 px-3 text-xs font-medium"
                        >
                          <Plus className="h-3.5 w-3.5 shrink-0" />
                          Add Risk
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : !usePlanningToolShell && (showAddRiskRow || showRiskFocusHiddenToggle) ? (
                <div
                  className={cn(
                    'flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between',
                    useRiskRadarChrome ? 'gap-1.5 sm:gap-2' : 'gap-2'
                  )}
                >
                  <div className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto">
                    {workflowTemplateRiskRadar && displayRisks.length > 0 ? (
                      <RiskRadarListSortMenu
                        riskListSort={riskListSort}
                        onSortChange={setRiskListSort}
                        triggerClassName="h-7"
                      />
                    ) : null}
                    {riskFocusRun && risks.length > 0 ? (
                      <RiskRadarRegisterPrimarySortMenu
                        value={riskRadarRegisterPrimarySort}
                        onValueChange={setRiskRadarRegisterPrimarySort}
                        triggerClassName="h-7"
                      />
                    ) : null}
                    <RiskRadarEditVisibilityMenu
                      showHiddenToggle={showRiskFocusHiddenToggle}
                      isRiskFocusRun={riskFocusRun}
                      showHiddenRisks={showHiddenRisks}
                      onShowHiddenChange={setShowHiddenRisks}
                      hideStandardRisks={hideStandardRisks}
                      onHideStandardChange={setHideStandardRisks}
                      triggerClassName="h-7 px-2.5 text-xs"
                    />
                    {showAddRiskRow ? (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          setEditingRisk(null);
                          setFormData(EMPTY_RISK_FORM);
                          setShowAddForm(true);
                        }}
                        className="h-7 gap-1 px-3 text-xs font-medium"
                      >
                        <Plus className="h-3.5 w-3.5 shrink-0" />
                        Add Risk
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {mode === 'template' && registerClassificationGaps ? (
                <div className="mb-3 rounded-md border border-warning-soft/40 bg-warning-soft/10 px-3 py-2 text-xs text-warning-soft">
                  {registerClassificationGaps}
                </div>
              ) : null}
              {risks.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
                  <AlertTriangle className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No risks defined yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {mode === 'template' 
                      ? 'Add risks to this project template' 
                      : 'Add risks specific to this project'}
                  </p>
                </div>
              ) : usePlanningToolShell ? (
                <Accordion
                  type="single"
                  collapsible
                  value={planningRiskStep}
                  onValueChange={(value) => {
                    if (value === 'high' || value === 'medium' || value === 'low') {
                      setPlanningRiskStep(value);
                    } else {
                      setPlanningRiskStep('');
                    }
                  }}
                  className="flex min-h-0 w-full flex-1 flex-col items-stretch gap-3"
                >
                  {PLANNING_RISK_STEPS.map((step, index) => (
                    <AccordionItem
                      key={step.key}
                      value={step.key}
                      className={cn(
                        'w-full min-w-0 shrink-0 self-stretch rounded-lg border bg-card px-4',
                        // Open pane fills leftover height; header stays content-sized at the top.
                        'data-[state=open]:flex data-[state=open]:min-h-0 data-[state=open]:flex-1 data-[state=open]:flex-col data-[state=open]:justify-start data-[state=open]:overflow-hidden',
                        '[&[data-state=open]>h3]:!flex-none [&[data-state=open]>h3]:!grow-0 [&[data-state=open]>h3]:!shrink-0 [&[data-state=open]>h3]:!basis-auto',
                        '[&[data-state=open]>[role=region]]:flex [&[data-state=open]>[role=region]]:min-h-0 [&[data-state=open]>[role=region]]:flex-1 [&[data-state=open]>[role=region]]:flex-col [&[data-state=open]>[role=region]]:overflow-hidden [&[data-state=open]>[role=region]]:animate-none [&[data-state=open]>[role=region]]:!h-auto',
                        '[&[data-state=open]>[role=region]>div]:flex [&[data-state=open]>[role=region]>div]:h-full [&[data-state=open]>[role=region]>div]:min-h-0 [&[data-state=open]>[role=region]>div]:flex-1 [&[data-state=open]>[role=region]>div]:flex-col [&[data-state=open]>[role=region]>div]:overflow-hidden [&[data-state=open]>[role=region]>div]:pb-3 [&[data-state=open]>[role=region]>div]:pt-0'
                      )}
                    >
                      <AccordionTrigger className="shrink-0 items-center py-3 hover:no-underline">
                        <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <div className="truncate whitespace-nowrap text-sm font-semibold leading-snug sm:text-base">
                              {step.title}
                            </div>
                            {planningRiskStep === step.key ? (
                              <div className="text-xs text-muted-foreground">
                                {planningRiskCounts[step.key]} risk
                                {planningRiskCounts[step.key] === 1 ? '' : 's'}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="!pb-0 !pt-0">
                        {planningRiskStep === step.key ? (
                          <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
                            <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2">
                              {risks.length > 0 ? (
                                <RiskRadarRegisterPrimarySortMenu
                                  value={riskRadarRegisterPrimarySort}
                                  onValueChange={setRiskRadarRegisterPrimarySort}
                                  align="start"
                                  triggerClassName="h-7"
                                />
                              ) : null}
                              <RiskRadarEditVisibilityMenu
                                showHiddenToggle={showRiskFocusHiddenToggle}
                                isRiskFocusRun={riskFocusRun}
                                showHiddenRisks={showHiddenRisks}
                                onShowHiddenChange={setShowHiddenRisks}
                                hideStandardRisks={hideStandardRisks}
                                onHideStandardChange={setHideStandardRisks}
                                triggerClassName="h-7 px-2.5 text-xs"
                              />
                              {showAddRiskRow ? (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    setEditingRisk(null);
                                    setFormData(EMPTY_RISK_FORM);
                                    setShowAddForm(true);
                                  }}
                                  className="ml-auto h-7 gap-1 px-3 text-xs font-medium"
                                >
                                  <Plus className="h-3.5 w-3.5 shrink-0" />
                                  Add Risk
                                </Button>
                              ) : null}
                            </div>
                            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                              <RiskRegisterList
                                risksToShow={listRisks}
                                risksTotalCount={risks.length}
                                hideStandardRisks={hideStandardRisks}
                                usePlanningToolShell={usePlanningToolShell}
                                planningStepEmptyMessage={step.empty}
                                riskFocusRun={riskFocusRun}
                                riskFocusEasyMode={riskFocusEasyMode}
                                readOnly={readOnly}
                                mode={mode}
                                variant={variant}
                                friendlyRiskRadarRegisterUi={friendlyRiskRadarRegisterUi}
                                advancedMode={advancedMode}
                                wfTableAdvanced={wfTableAdvanced}
                                wfTableFriendly={wfTableFriendly}
                                getRiskLevelColor={getRiskLevelColor}
                                getStatusColor={getStatusColor}
                                onOpenDetails={setDetailsRisk}
                                onEditRisk={handleEditRisk}
                                onDeleteRisk={handleDeleteRisk}
                                onUpdateStatus={handleUpdateStatus}
                                onMitigationActionCompletedToggle={handleMitigationActionCompletedToggle}
                                onMitigationActionTextBlur={handleMitigationActionTextBlur}
                                onAppendMitigationAction={handleAppendMitigationAction}
                                onUpdateCurrentRiskLevel={handleUpdateCurrentRiskLevel}
                              />
                            </div>
                          </div>
                        ) : null}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <RiskRegisterList
                  risksToShow={displayRisks}
                  risksTotalCount={risks.length}
                  hideStandardRisks={hideStandardRisks}
                  usePlanningToolShell={usePlanningToolShell}
                  planningStepEmptyMessage={
                    PLANNING_RISK_STEPS.find((s) => s.key === planningRiskStep)?.empty ??
                    'No risks in this step.'
                  }
                  riskFocusRun={riskFocusRun}
                  riskFocusEasyMode={riskFocusEasyMode}
                  readOnly={readOnly}
                  mode={mode}
                  variant={variant}
                  friendlyRiskRadarRegisterUi={friendlyRiskRadarRegisterUi}
                  advancedMode={advancedMode}
                  wfTableAdvanced={wfTableAdvanced}
                  wfTableFriendly={wfTableFriendly}
                  getRiskLevelColor={getRiskLevelColor}
                  getStatusColor={getStatusColor}
                  onOpenDetails={setDetailsRisk}
                  onEditRisk={handleEditRisk}
                  onDeleteRisk={handleDeleteRisk}
                  onUpdateStatus={handleUpdateStatus}
                  onMitigationActionCompletedToggle={handleMitigationActionCompletedToggle}
                  onMitigationActionTextBlur={handleMitigationActionTextBlur}
                  onAppendMitigationAction={handleAppendMitigationAction}
                  onUpdateCurrentRiskLevel={handleUpdateCurrentRiskLevel}
                />
              )}
            </div>
          )}
        </div>
      </>
    );

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      {usePlanningToolShell ? (
        <DialogPortal>
          {open ? (
            <div
              className={cn(
                'fixed inset-0 z-[90] bg-black/60 backdrop-blur-md transition-opacity duration-200',
                belowAppHeaderOverlayClasses
              )}
              aria-hidden="true"
            />
          ) : null}
          <div
            data-dialog-content
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'fixed inset-0 z-[91] flex flex-col overflow-hidden bg-background p-0 shadow-lg',
              belowAppHeaderCenteredWindowClasses,
              'md:rounded-lg md:border'
            )}
          >
            {mainContents}
          </div>
        </DialogPortal>
      ) : (
        <DialogContent
          className={cn(
            'flex flex-col overflow-hidden p-0 [&>button]:hidden',
            useRiskRadarChrome
              ? cn(
                  'gap-0 !inset-0 flex h-[100dvh] max-h-[100dvh] w-full max-w-none !translate-x-0 !translate-y-0 flex-col overflow-hidden rounded-none border-0 p-0 shadow-none sm:max-w-none md:!top-16 md:h-[calc(100dvh-4rem)] md:max-h-[calc(100dvh-4rem)] md:!max-w-none md:rounded-none md:p-0 [&>button]:hidden'
                )
              : 'h-screen max-h-full w-full max-w-full md:h-[min(90vh,calc(100dvh-5rem))] md:max-h-[calc(100dvh-5rem)] md:max-w-[min(90vw,calc(100vw-2rem))] md:rounded-lg'
          )}
        >
          {mainContents}
        </DialogContent>
      )}
    </Dialog>

    {/* Add/Edit risk dialog — sibling of main Dialog (nested Dialog inside DialogContent breaks Radix a11y). */}
    <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
      <DialogContent
        overlayClassName="z-[200]"
        className={cn(
          'z-[200] flex max-h-[min(90dvh,880px)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl',
          'border bg-background shadow-xl'
        )}
      >
        <DialogHeader className="shrink-0 space-y-1 border-b px-4 py-3 text-left sm:px-5 sm:py-4">
          <DialogTitle>{editingRisk ? 'Edit risk' : 'Add risk'}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          <div className="space-y-4">
              <div>
                <Label htmlFor="risk">Risk *</Label>
                <Textarea
                  id="risk"
                  value={formData.risk}
                  onChange={(e) => setFormData({ ...formData, risk: e.target.value })}
                  placeholder="Describe what could go wrong…"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="likelihood">Likelihood</Label>
                  <Select
                    value={formData.likelihood}
                    onValueChange={(value: any) => setFormData({ ...formData, likelihood: value })}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {formData.likelihood === 'low' && 'Low'}
                        {formData.likelihood === 'medium' && 'Medium'}
                        {formData.likelihood === 'high' && 'High'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">
                        <div className="flex flex-col">
                          <span className="font-medium">Low</span>
                          <span className="text-xs text-muted-foreground">Possible but rare</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div className="flex flex-col">
                          <span className="font-medium">Medium</span>
                          <span className="text-xs text-muted-foreground">It might happen</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="high">
                        <div className="flex flex-col">
                          <span className="font-medium">High</span>
                          <span className="text-xs text-muted-foreground">Not sure but it probably will happen</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="severity">
                    {variant === 'risk-focus' && mode === 'run'
                      ? `Whats the new status?`
                      : 'Severity'}
                  </Label>
                  <Select
                    value={formData.severity}
                    onValueChange={(value: any) => setFormData({ ...formData, severity: value })}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {formData.severity === 'low' && 'Low'}
                        {formData.severity === 'medium' &&
                          (variant === 'risk-focus' && mode === 'run' ? 'Med' : 'Medium')}
                        {formData.severity === 'high' && 'High'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">
                        <div className="flex flex-col">
                          <span className="font-medium">Low</span>
                          <span className="text-xs text-muted-foreground">Minor impact if it occurs</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {variant === 'risk-focus' && mode === 'run' ? 'Med' : 'Medium'}
                          </span>
                          <span className="text-xs text-muted-foreground">Noticeable impact requiring management</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="high">
                        <div className="flex flex-col">
                          <span className="font-medium">High</span>
                          <span className="text-xs text-muted-foreground">Severe impact to schedule or budget</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Impact</p>
                <p className="text-xs text-muted-foreground">Estimate schedule and budget impact if the risk occurs.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="schedule_impact">Schedule (days)</Label>
                    <Input
                      id="schedule_impact"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.schedule_impact_days}
                      onChange={(e) => setFormData({ ...formData, schedule_impact_days: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="budget_impact">Budget ($)</Label>
                    <Input
                      id="budget_impact"
                      type="number"
                      step="1"
                      min="0"
                      value={formData.budget_impact_dollars}
                      onChange={(e) => setFormData({ ...formData, budget_impact_dollars: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="impact_narrative">Narrative — what happens if it does?</Label>
                  <Textarea
                    id="impact_narrative"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Describe the impact in words (schedule, quality, scope, etc.)…"
                    rows={3}
                  />
                </div>
              </div>

              {mode === 'template' ? (
                <div className="space-y-3 rounded-md border bg-muted/20 p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Component and scores</p>
                    <p className="text-xs text-muted-foreground">
                      These feed the same priority table the quality analysis uses. Occurrence
                      moves priority more than detection.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="risk_dimension">Component</Label>
                    <Select
                      value={formData.risk_dimension ?? 'unset'}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          risk_dimension:
                            value === 'unset' ? null : (value as RegisterRiskDimension),
                        })
                      }
                    >
                      <SelectTrigger id="risk_dimension" className="w-full max-w-md">
                        <SelectValue placeholder="Not set" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unset">Not set</SelectItem>
                        {REGISTER_RISK_DIMENSIONS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {RISK_DIMENSION_LABELS[d]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {(
                      [
                        ['severity_score', 'Severity', 'Consequence if it happens'],
                        ['occurrence_score', 'Occurrence', 'How often it happens'],
                        ['detection_score', 'Detection', 'Chance of noticing in time'],
                      ] as const
                    ).map(([field, label, hint]) => (
                      <div key={field}>
                        <Label htmlFor={field}>{label}</Label>
                        <Select
                          value={formData[field] == null ? 'unset' : String(formData[field])}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              [field]: value === 'unset' ? null : parseInt(value, 10),
                            })
                          }
                        >
                          <SelectTrigger id={field}>
                            <SelectValue placeholder="Not set" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unset">Not set</SelectItem>
                            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                {n}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t pt-3 text-sm">
                    {formDataPriority.actionPriority != null ? (
                      <>
                        <span className="text-muted-foreground">Priority</span>
                        <Badge
                          variant="outline"
                          className={currentRiskLevelBadgeClass(
                            formDataPriority.actionPriority === 'H'
                              ? 'high'
                              : formDataPriority.actionPriority === 'M'
                                ? 'medium'
                                : 'low'
                          )}
                        >
                          {actionPriorityTable
                            ? actionPriorityLabel(actionPriorityTable, formDataPriority.actionPriority).label
                            : formDataPriority.actionPriority}
                        </Badge>
                        {formDataPriority.rpn != null ? (
                          <span className="text-xs text-muted-foreground">
                            RPN {formDataPriority.rpn}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {formDataPriority.unscoredReason
                          ? REGISTER_RISK_UNSCORED_MESSAGE[formDataPriority.unscoredReason]
                          : 'Priority is unavailable until the scoring table loads.'}
                      </span>
                    )}
                  </div>

                  {editingRisk && templateProjectIdForRisks ? (
                    <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-xs"
                        onClick={() => setRulesEditorOpen(true)}
                      >
                        Personalization rules
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Rules move occurrence and detection for the individual user, never
                        severity.
                      </span>
                    </div>
                  ) : null}

                  <div>
                    <Label htmlFor="operation_step_id">Step this arises on</Label>
                    <Select
                      value={formData.operation_step_id ?? 'unset'}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          operation_step_id: value === 'unset' ? null : value,
                        })
                      }
                    >
                      <SelectTrigger id="operation_step_id" className="w-full">
                        <SelectValue placeholder="Whole project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unset">Whole project</SelectItem>
                        {templateSteps.map((step) => (
                          <SelectItem key={step.id} value={step.id}>
                            {step.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-muted-foreground">
                      A linked risk appears while that step is being worked, not only during
                      planning.
                    </p>
                  </div>

                  <div className="space-y-3 border-t pt-3">
                    <div>
                      <Label htmlFor="occurrence_driver">What decides how often this happens</Label>
                      <Select
                        value={formData.occurrence_driver ?? 'unset'}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            occurrence_driver: value === 'unset' ? null : value,
                          })
                        }
                      >
                        <SelectTrigger id="occurrence_driver" className="w-full">
                          <SelectValue placeholder="Not set" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unset">Not set</SelectItem>
                          {(occurrenceDriverTable?.ordered ?? []).map((driver) => (
                            <SelectItem key={driver.driver} value={driver.driver}>
                              {driver.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Only risks the person controls reach the Key Characteristics list.
                        Everything else is fixed by changing the process.
                      </p>
                      {occurrenceDriverError ? (
                        <p className="mt-1 text-xs text-destructive">{occurrenceDriverError}</p>
                      ) : null}
                    </div>

                    <div>
                      <Label htmlFor="prevention_strength">What stops it today</Label>
                      <Select
                        value={formData.prevention_strength ?? 'unset'}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            prevention_strength:
                              value === 'unset' ? null : (value as PreventionStrength),
                          })
                        }
                      >
                        <SelectTrigger id="prevention_strength" className="w-full">
                          <SelectValue placeholder="Not set" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unset">Not set</SelectItem>
                          {PREVENTION_STRENGTHS.map((strength) => (
                            <SelectItem key={strength} value={strength}>
                              {PREVENTION_STRENGTH_LABELS[strength]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.operation_step_id ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="implicated_item_kind">What it affects</Label>
                          <Select
                            value={formData.implicated_item_kind ?? 'unset'}
                            onValueChange={(value) =>
                              setFormData({
                                ...formData,
                                implicated_item_kind:
                                  value === 'unset' ? null : (value as RiskItemKind),
                                implicated_item_id: null,
                              })
                            }
                          >
                            <SelectTrigger id="implicated_item_kind" className="w-full">
                              <SelectValue placeholder="Not set" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unset">Not set</SelectItem>
                              {RISK_ITEM_KINDS.map((kind) => (
                                <SelectItem key={kind} value={kind}>
                                  {RISK_ITEM_KIND_LABELS[kind]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {formData.implicated_item_kind &&
                        formData.implicated_item_kind !== 'step' ? (
                          <div>
                            <Label htmlFor="implicated_item_id">
                              {`Which ${RISK_ITEM_KIND_LABELS[formData.implicated_item_kind].toLowerCase()}`}
                            </Label>
                            {registerItemOptions.length > 0 ? (
                              <Select
                                value={formData.implicated_item_id ?? 'unset'}
                                onValueChange={(value) =>
                                  setFormData({
                                    ...formData,
                                    implicated_item_id: value === 'unset' ? null : value,
                                  })
                                }
                              >
                                <SelectTrigger id="implicated_item_id" className="w-full">
                                  <SelectValue placeholder="Not set" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unset">Not set</SelectItem>
                                  {registerItemOptions.map((option) => (
                                    <SelectItem key={option.id} value={option.id}>
                                      {option.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <p className="mt-2 text-xs text-warning-soft">
                                {`This step has no ${RISK_ITEM_KIND_LABELS[formData.implicated_item_kind].toLowerCase()} to point at.`}
                              </p>
                            )}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                {workflowTemplateRiskRadar ? (
                  <div className="space-y-2">
                    <Label htmlFor="mitigation_effort_level">Mitigation effort level</Label>
                    <p className="text-xs text-muted-foreground">
                      How much work the mitigation typically takes. Risk Radar uses this for &ldquo;easiest mitigation
                      first&rdquo; ordering.
                    </p>
                    <Select
                      value={formData.mitigation_effort_level ?? 'none'}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          mitigation_effort_level:
                            value === 'none' ? null : (value as MitigationEffortLevel),
                        })
                      }
                    >
                      <SelectTrigger id="mitigation_effort_level" className="w-full max-w-md">
                        <SelectValue placeholder="Not set" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not set</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <Label htmlFor="mitigation">Mitigation</Label>
                <Textarea
                  id="mitigation"
                  value={formData.mitigation}
                  onChange={(e) => setFormData({ ...formData, mitigation: e.target.value })}
                  placeholder="How you can prevent it or reduce the chance it happens…"
                  rows={2}
                />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Action steps
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          mitigation_actions: [
                            ...(prev.mitigation_actions || []),
                            { action: '', benefit: '', completed: false },
                          ],
                        }))
                      }
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add action
                    </Button>
                  </div>
                  {(formData.mitigation_actions || []).map((ma, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-[2fr,2fr,auto] gap-2 items-start">
                      <Input
                        placeholder="Mitigation action"
                        value={ma.action}
                        onChange={(e) => {
                          const next = [...(formData.mitigation_actions || [])];
                          next[idx] = { ...next[idx], action: e.target.value };
                          setFormData(prev => ({ ...prev, mitigation_actions: next }));
                        }}
                      />
                      <Input
                        placeholder="Benefit (e.g., reduces delay, lowers cost)"
                        value={ma.benefit || ''}
                        onChange={(e) => {
                          const next = [...(formData.mitigation_actions || [])];
                          next[idx] = { ...next[idx], benefit: e.target.value || null };
                          setFormData(prev => ({ ...prev, mitigation_actions: next }));
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="self-center text-destructive hover:text-destructive"
                        onClick={() => {
                          const next = [...(formData.mitigation_actions || [])];
                          next.splice(idx, 1);
                          setFormData(prev => ({ ...prev, mitigation_actions: next }));
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {mode === 'run' && variant !== 'risk-focus' && (
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="mitigated">Mitigated</SelectItem>
                      <SelectItem value="monitoring">Monitoring</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

            </div>
            </div>
            <DialogFooter className="shrink-0 flex-col gap-3 border-t bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                {editingRisk && mode === 'run' && variant === 'risk-focus' && !readOnly && editingRisk.is_template_risk ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => void handleSetRiskHiddenFromRegister(editingRisk, !editingRisk.hidden_from_register)}
                  >
                    {editingRisk.hidden_from_register ? (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        Show in register
                      </>
                    ) : (
                      <>
                        <EyeOff className="mr-2 h-4 w-4" />
                        Hide from register
                      </>
                    )}
                  </Button>
                ) : null}
                {editingRisk &&
                mode === 'run' &&
                variant === 'risk-focus' &&
                !readOnly &&
                !editingRisk.is_template_risk ? (
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full sm:w-auto"
                    onClick={() => void handleDeleteRisk(editingRisk)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete risk
                  </Button>
                ) : null}
              </div>
              <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingRisk(null);
                    setFormData(EMPTY_RISK_FORM);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveRisk}>
                  <Save className="w-4 h-4 mr-2" />
                  {editingRisk ? 'Update' : 'Add'} Risk
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

    <Sheet
      open={detailsRisk !== null}
      onOpenChange={(next) => {
        if (!next) setDetailsRisk(null);
      }}
    >
      <SheetContent side="right" className="z-[220] flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        {detailsRisk ? (
          <>
            <SheetHeader className="space-y-1 pr-6 text-left">
              <SheetTitle>More details</SheetTitle>
              <SheetDescription>Impact breakdown and actions for this risk.</SheetDescription>
            </SheetHeader>
            <div className="mt-6 flex-1 space-y-5">
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  What could go wrong?
                </h4>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <p className="text-sm leading-relaxed">{detailsRisk.risk}</p>
                  {riskFocusRun && isUserAddedRisk(detailsRisk) ? (
                    <Badge variant="secondary" className="text-[10px]">
                      User-Added
                    </Badge>
                  ) : null}
                </div>
              </section>
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  What happens if it does?
                </h4>
                <div className="mt-1.5">
                  <ImpactIfItDoesContent risk={detailsRisk} />
                </div>
              </section>
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  What can we do to prevent it?
                </h4>
                <div className="mt-1.5 space-y-3">
                  {detailsRisk.mitigation_strategy || detailsRisk.mitigation ? (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {detailsRisk.mitigation_strategy || detailsRisk.mitigation}
                    </p>
                  ) : null}
                  {(detailsRisk.mitigation_actions?.length ?? 0) > 0 ? (
                    <ul className="space-y-2 text-sm">
                      {detailsRisk.mitigation_actions!.map((ma, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          {riskFocusRun && !readOnly && String(ma.action).trim() ? (
                            <Checkbox
                              className="mt-0.5"
                              checked={Boolean(ma.completed)}
                              onCheckedChange={() => void handleMitigationActionCompletedToggle(detailsRisk, idx)}
                              aria-label={`Done: ${ma.action}`}
                            />
                          ) : null}
                          <div className="min-w-0 flex-1">
                            {riskFocusRun && !readOnly && !String(ma.action).trim() ? (
                              <Input
                                className="h-9 text-sm"
                                placeholder="Describe this mitigation"
                                defaultValue=""
                                onBlur={(e) => void handleMitigationActionTextBlur(detailsRisk, idx, e.target.value)}
                              />
                            ) : readOnly && !String(ma.action).trim() ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <span>
                                <span className="font-medium">{ma.action}</span>
                                {ma.benefit ? (
                                  <span className="text-muted-foreground"> – {ma.benefit}</span>
                                ) : null}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {!detailsRisk.mitigation_strategy &&
                  !detailsRisk.mitigation &&
                  !(detailsRisk.mitigation_actions?.length) ? (
                    <p className="text-sm text-muted-foreground">No mitigation steps recorded.</p>
                  ) : null}
                  {riskFocusRun && !readOnly ? (
                    <div className="flex justify-center border-t border-border/40 pt-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        aria-label="Add mitigation"
                        onClick={() => void handleAppendMitigationAction(detailsRisk)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              </section>
              {!readOnly ? (
                <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => {
                      const r = detailsRisk;
                      setDetailsRisk(null);
                      handleEditRisk(r);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit risk
                  </Button>
                  {riskFocusRun && detailsRisk.is_template_risk ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleSetRiskHiddenFromRegister(detailsRisk, !detailsRisk.hidden_from_register)}
                    >
                      {detailsRisk.hidden_from_register ? (
                        <>
                          <Eye className="mr-2 h-4 w-4" />
                          Show in register
                        </>
                      ) : (
                        <>
                          <EyeOff className="mr-2 h-4 w-4" />
                          Hide from register
                        </>
                      )}
                    </Button>
                  ) : null}
                  {riskFocusRun && !detailsRisk.is_template_risk ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => void handleDeleteRisk(detailsRisk)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete risk
                    </Button>
                  ) : null}
                  {!riskFocusRun && !(mode === 'run' && detailsRisk.is_template_risk) ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => void handleDeleteRisk(detailsRisk)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete risk
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
    {mode === 'template' && editingRisk && templateProjectIdForRisks ? (
      <ProjectRiskRulesEditor
        open={rulesEditorOpen}
        onOpenChange={setRulesEditorOpen}
        projectId={templateProjectIdForRisks}
        targetKind="template_risk"
        targetId={editingRisk.id}
        targetLabel={editingRisk.risk_title || editingRisk.risk || 'Template risk'}
      />
    ) : null}
    </>
  );
}

