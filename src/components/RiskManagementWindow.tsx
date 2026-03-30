import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  DropdownMenuContent,
  DropdownMenuItem,
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
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { PlanningToolWindowHeaderActions } from '@/components/PlanningWizardSteps/PlanningToolWindowHeaderActions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useProject } from '@/contexts/ProjectContext';
import { isRiskFocusRun } from '@/utils/projectRunRiskFocus';

const RISK_FOCUS_PROGRESS_STOPS = [0, 25, 50, 75, 100] as const;

/** Map stored progress to the nearest preset so the select always matches an item. */
function riskFocusProgressSelectValue(progress: number | null | undefined): string {
  if (progress == null || !Number.isFinite(progress)) {
    return String(RISK_FOCUS_PROGRESS_STOPS[0]);
  }
  const x = Math.round(Math.min(100, Math.max(0, progress)));
  let best = RISK_FOCUS_PROGRESS_STOPS[0];
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

interface Risk {
  id: string;
  risk: string; // Maps to risk_title in DB
  risk_title?: string; // Database field
  risk_description?: string; // Database field
  likelihood: 'low' | 'medium' | 'high';
  severity?: 'low' | 'medium' | 'high' | null;
  schedule_impact_days: number | null; // Maps to schedule_impact_low_days or schedule_impact_high_days
  schedule_impact_low_days?: number | null; // Database field
  schedule_impact_high_days?: number | null; // Database field
  budget_impact_dollars: number | null; // Maps to budget_impact_low or budget_impact_high
  budget_impact_low?: number | null; // Database field
  budget_impact_high?: number | null; // Database field
  mitigation: string | null; // Legacy text field
  mitigation_strategy?: string | null; // Database field
  mitigation_actions?: { action: string; benefit?: string | null; completed?: boolean }[] | null;
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
    .filter((x): x is { action: string; benefit?: string | null; completed?: boolean } => x != null);
}

function severitySortRank(severity: string | null | undefined): number {
  const s = (severity || '').toLowerCase();
  if (s === 'high') return 3;
  if (s === 'medium') return 2;
  if (s === 'low') return 1;
  return 0;
}

function riskFocusSeverityCounts(risks: Risk[]) {
  let high = 0;
  let medium = 0;
  let low = 0;
  let unset = 0;
  for (const r of risks) {
    const s = r.severity?.toLowerCase();
    if (s === 'high') high += 1;
    else if (s === 'medium') medium += 1;
    else if (s === 'low') low += 1;
    else unset += 1;
  }
  return { high, medium, low, unset, total: risks.length };
}

function riskFocusLevelValue(risk: Risk): 'low' | 'medium' | 'high' {
  const s = risk.severity?.toLowerCase();
  if (s === 'high' || s === 'low' || s === 'medium') return s;
  return 'medium';
}

function currentRiskLevelBadgeClass(level: 'low' | 'medium' | 'high') {
  switch (level) {
    case 'high':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'low':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    default:
      return 'bg-amber-100 text-amber-900 border-amber-300';
  }
}

/** Select trigger styling for “What’s the new status?” severity (red / yellow / green). */
function riskFocusSeveritySelectTriggerClass(level: 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'high':
      return 'border-red-300 bg-red-50/90 text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200';
    case 'low':
      return 'border-emerald-300 bg-emerald-50/90 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';
    default:
      return 'border-amber-300 bg-amber-50/90 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200';
  }
}

function riskFocusSeveritySelectItemClass(level: 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'high':
      return 'text-red-800 focus:bg-red-50 focus:text-red-900 dark:text-red-300 dark:focus:bg-red-950/50 dark:focus:text-red-200';
    case 'low':
      return 'text-emerald-800 focus:bg-emerald-50 focus:text-emerald-900 dark:text-emerald-300 dark:focus:bg-emerald-950/40 dark:focus:text-emerald-200';
    default:
      return 'text-amber-900 focus:bg-amber-50 focus:text-amber-950 dark:text-amber-300 dark:focus:bg-amber-950/40 dark:focus:text-amber-200';
  }
}

function RiskFocusDashboard({
  risks,
  projectDisplayName
}: {
  risks: Risk[];
  projectDisplayName?: string | null;
}) {
  const { high, medium, low, unset, total } = riskFocusSeverityCounts(risks);
  const name = projectDisplayName?.trim() || null;
  return (
    <div className="shrink-0 border-b bg-muted/30 px-3 py-2 md:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0 sm:max-w-[38%] sm:flex-1">
          {name ? (
            <h2 className="text-center text-xl font-semibold leading-tight tracking-tight text-foreground sm:text-left sm:text-2xl md:text-3xl">
              {name}
            </h2>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col sm:max-w-[58%] sm:items-end">
          <div className="mb-1 w-full text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-right">
            Current Risk Summary
          </div>
          <div className="flex w-full justify-center sm:justify-end">
            <Card className="min-w-0 w-full max-w-md overflow-hidden">
              <CardContent className="flex flex-row flex-wrap items-center justify-center gap-y-1 px-1.5 py-1 sm:px-2 sm:py-1">
                <div className="flex min-w-0 flex-row flex-wrap items-center justify-center gap-x-2 gap-y-0.5 sm:gap-x-3">
                  <div className="flex flex-row items-baseline gap-1.5 sm:gap-2">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      High
                    </span>
                    <span className="text-base font-bold tabular-nums text-destructive sm:text-lg">{high}</span>
                  </div>
                  <div className="flex flex-row items-baseline gap-1.5 border-l border-foreground/20 pl-2 dark:border-foreground/30 sm:gap-2 sm:pl-3">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Med
                    </span>
                    <span className="text-base font-bold tabular-nums text-amber-600 sm:text-lg">{medium}</span>
                  </div>
                  <div className="flex flex-row items-baseline gap-1.5 border-l border-foreground/20 pl-2 dark:border-foreground/30 sm:gap-2 sm:pl-3">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Low
                    </span>
                    <span className="text-base font-bold tabular-nums text-emerald-600 sm:text-lg">{low}</span>
                  </div>
                  <div
                    className="mx-0.5 h-6 w-px shrink-0 self-center bg-foreground/45 dark:bg-foreground/55 sm:mx-1.5"
                    aria-hidden
                    role="presentation"
                  />
                  <div className="flex flex-row items-baseline gap-1.5 sm:gap-2">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Total
                    </span>
                    <span className="text-base font-bold tabular-nums sm:text-lg">{total}</span>
                  </div>
                </div>
              </CardContent>
              {unset > 0 ? (
                <div className="border-t border-border/50 px-1.5 py-0.5 text-center text-[10px] text-muted-foreground">
                  Not set: {unset}
                </div>
              ) : null}
            </Card>
          </div>
        </div>
      </div>
    </div>
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
  /** Workflow editor: use Risk-Less chrome, optional advanced register mode, open on the template being edited */
  workflowEditorRiskLess?: boolean;
  /** Display name for Risk-Less dashboard when editing a template from the workflow editor */
  templateProjectDisplayName?: string;
}

export function RiskManagementWindow({
  open,
  onOpenChange,
  projectId,
  projectRunId,
  mode = 'run',
  readOnly = false,
  variant = 'default',
  workflowEditorRiskLess = false,
  templateProjectDisplayName
}: RiskManagementWindowProps) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { projectRuns, updateProjectRun } = useProject();
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
  const useRiskLessChrome = variant === 'risk-focus' || workflowEditorRiskLess;
  const workflowTemplateRiskLess = Boolean(workflowEditorRiskLess && mode === 'template' && projectId);
  const showAdvancedToggle = workflowTemplateRiskLess && !readOnly;
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
  /** Risk-Less: when true, hide rows originating from Standard Project Foundation. Default off (show all). */
  const [hideStandardRisks, setHideStandardRisks] = useState(false);
  const [riskListSort, setRiskListSort] = useState<'alpha' | 'severity-desc'>('alpha');
  const showRiskFocusHiddenToggle = riskFocusRun && risks.length > 0;
  const wfTableAdvanced = workflowTemplateRiskLess && advancedMode;
  const wfTableFriendly = workflowTemplateRiskLess && !advancedMode;

  /** Keep scroll position in Risk-Less: avoid full fetchRisks() after small mitigation edits. */
  const patchRunRiskMitigationActions = useCallback(
    (riskId: string, mitigation_actions: NonNullable<Risk['mitigation_actions']> | null) => {
      setRisks((prev) =>
        prev.map((r) =>
          r.id === riskId
            ? {
                ...r,
                mitigation_actions:
                  mitigation_actions && mitigation_actions.length > 0
                    ? mitigation_actions.map((a) => ({ ...a }))
                    : null,
              }
            : r
        )
      );
    },
    []
  );

  const [formData, setFormData] = useState({
    risk: '',
    likelihood: 'medium' as 'low' | 'medium' | 'high',
    severity: 'medium' as 'low' | 'medium' | 'high',
    schedule_impact_days: 0,
    budget_impact_dollars: 0,
    mitigation: '',
    mitigation_actions: [] as { action: string; benefit?: string | null; completed?: boolean }[],
    notes: '',
    status: 'open' as 'open' | 'mitigated' | 'closed' | 'monitoring'
  });

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
      if (riskListSort === 'alpha') {
        sorted.sort((a, b) => (a.risk || '').localeCompare(b.risk || '', undefined, { sensitivity: 'base' }));
      } else {
        sorted.sort(
          (a, b) =>
            severitySortRank(b.severity) - severitySortRank(a.severity) ||
            (a.risk || '').localeCompare(b.risk || '', undefined, { sensitivity: 'base' })
        );
      }
    } else if (workflowTemplateRiskLess) {
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
  }, [risks, variant, mode, showHiddenRisks, hideStandardRisks, riskListSort, workflowTemplateRiskLess]);

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

  const fetchRisks = async () => {
    if (!open) return;
    
    setLoading(true);
    try {
      if (mode === 'template' && projectId) {
        console.log('🔍 RiskManagementWindow: Fetching risks for template project:', projectId);
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
          console.log('📋 RiskManagementWindow: Detected revision, using parent project ID:', templateProjectId);
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
          console.log('📊 RiskManagementWindow: Template is the standard foundation; querying only foundation risks');
          const { data, error } = await supabase
            .from('project_risks')
            .select('*')
            .eq('project_id', templateProjectId)
            .order('display_order', { ascending: true });

          if (error) throw error;
          mergedRisksData = data || [];
        } else {
          console.log('📊 RiskManagementWindow: Querying foundation + project risks for merged view');
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
          likelihood: risk.likelihood,
          severity: risk.severity,
          schedule_impact_days: risk.schedule_impact_high_days || risk.schedule_impact_low_days || null,
          schedule_impact_low_days: risk.schedule_impact_low_days,
          schedule_impact_high_days: risk.schedule_impact_high_days,
          budget_impact_dollars: risk.budget_impact_high || risk.budget_impact_low || null,
          budget_impact_low: risk.budget_impact_low,
          budget_impact_high: risk.budget_impact_high,
          mitigation: risk.mitigation_strategy || null,
          mitigation_strategy: risk.mitigation_strategy,
          mitigation_actions: parseMitigationActionsFromDb(risk.mitigation_actions),
          notes: risk.benefit || risk.risk_description || null,
          benefit: typeof risk.benefit === 'string' ? risk.benefit : null,
          status: 'open' as const,
          display_order: risk.display_order,
          impact: risk.impact
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
          likelihood: risk.likelihood,
          severity: risk.severity,
          schedule_impact_days: risk.schedule_impact_high_days || risk.schedule_impact_low_days || null,
          schedule_impact_low_days: risk.schedule_impact_low_days,
          schedule_impact_high_days: risk.schedule_impact_high_days,
          budget_impact_dollars: risk.budget_impact_high || risk.budget_impact_low || null,
          budget_impact_low: risk.budget_impact_low,
          budget_impact_high: risk.budget_impact_high,
          mitigation: risk.mitigation_strategy || null,
          mitigation_strategy: risk.mitigation_strategy,
          mitigation_actions: parseMitigationActionsFromDb(risk.mitigation_actions),
          notes: risk.benefit || risk.risk_description || null,
          benefit: typeof risk.benefit === 'string' ? risk.benefit : null,
          status: risk.status || 'open',
          is_template_risk: !!risk.template_risk_id,
          template_risk_id: risk.template_risk_id,
          display_order: risk.display_order,
          impact: risk.impact,
          hidden_from_register: risk.hidden_from_register === true,
          from_standard_foundation: risk.from_standard_foundation === true,
        }));
        
        setRisks(mappedRisks);
      }
    } catch (error: any) {
      console.error('Error fetching risks:', error);
      const code = error?.code || error?.message;
      if (code === 'PGRST205') {
        toast.error('Risk tracking table is missing. Please run the latest database migrations to create project_risks.');
      } else {
        toast.error('Failed to load risks');
      }
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

    try {
      if (mode === 'template' && projectId) {
        if (!templateProjectIdForRisks) {
          toast.error('Unable to determine which project record to save risks into.');
          return;
        }

        // Save template risk
        if (editingRisk) {
          const { error } = await supabase
            .from('project_risks')
            .update({
              risk_title: formData.risk.trim(),
              risk_description: null,
              benefit: formData.notes.trim() || null,
              likelihood: formData.likelihood,
              severity: formData.severity,
              schedule_impact_low_days: formData.schedule_impact_days || null,
              schedule_impact_high_days: formData.schedule_impact_days || null,
              budget_impact_low: formData.budget_impact_dollars ? Math.round(formData.budget_impact_dollars) : null,
              budget_impact_high: formData.budget_impact_dollars ? Math.round(formData.budget_impact_dollars) : null,
              mitigation_strategy: formData.mitigation.trim() || null,
              mitigation_actions: formData.mitigation_actions && formData.mitigation_actions.length > 0
                ? formData.mitigation_actions
                : null
            })
            .eq('id', editingRisk.id);

          if (error) throw error;
          toast.success('Risk updated successfully');
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
              project_id: templateProjectIdForRisks,
              risk_title: formData.risk.trim(),
              risk_description: null,
              benefit: formData.notes.trim() || null,
              likelihood: formData.likelihood,
              severity: formData.severity,
              schedule_impact_low_days: formData.schedule_impact_days || null,
              schedule_impact_high_days: formData.schedule_impact_days || null,
              budget_impact_low: formData.budget_impact_dollars ? Math.round(formData.budget_impact_dollars) : null,
              budget_impact_high: formData.budget_impact_dollars ? Math.round(formData.budget_impact_dollars) : null,
              mitigation_strategy: formData.mitigation.trim() || null,
              mitigation_actions: formData.mitigation_actions && formData.mitigation_actions.length > 0
                ? formData.mitigation_actions
                : null,
              display_order: nextOrder
            });

          if (error) throw error;
          toast.success('Risk added successfully');
        }
      } else if (mode === 'run' && projectRunId) {
        // Save run risk
        if (editingRisk) {
          const baseUpdate = {
              risk_title: formData.risk.trim(),
              risk_description: null,
              benefit: formData.notes.trim() || null,
              likelihood: formData.likelihood,
              severity: formData.severity,
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
          toast.success('Risk updated successfully');
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
              likelihood: formData.likelihood,
              severity: formData.severity,
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
          toast.success('Risk added successfully');
        }
      }

      setShowAddForm(false);
      setEditingRisk(null);
      setFormData({
        risk: '',
        likelihood: 'medium',
        severity: 'medium',
        schedule_impact_days: 0,
        budget_impact_dollars: 0,
        mitigation: '',
        mitigation_actions: [],
        notes: '',
        status: 'open'
      });
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
      likelihood: risk.likelihood,
      severity: risk.severity || 'medium',
      schedule_impact_days: risk.schedule_impact_days || risk.schedule_impact_high_days || risk.schedule_impact_low_days || 0,
      budget_impact_dollars: risk.budget_impact_dollars || risk.budget_impact_high || risk.budget_impact_low || 0,
      mitigation: risk.mitigation || risk.mitigation_strategy || '',
      mitigation_actions: risk.mitigation_actions ? [...risk.mitigation_actions] : [],
      notes: narrative,
      status: risk.status || 'open'
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
        toast.success('Risk deleted successfully');
      } else if (mode === 'run' && projectRunId) {
        const { error } = await supabase
          .from('project_run_risks')
          .delete()
          .eq('id', risk.id);

        if (error) throw error;
        toast.success('Risk deleted successfully');
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
      toast.success('Risk status updated');
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
      toast.success('Risk level updated');
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
    try {
      const { error } = await supabase
        .from('project_run_risks')
        .update({ mitigation_actions: next.length > 0 ? next : null })
        .eq('id', risk.id);
      if (error) throw error;
      patchRunRiskMitigationActions(risk.id, next);
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
      toast.success(hidden ? 'Risk hidden from register' : 'Risk shown in register again');
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
    
    if (riskScore >= 3) return 'bg-red-100 text-red-800 border-red-300';
    if (riskScore >= 2) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'closed': return 'bg-green-100 text-green-800';
      case 'mitigated': return 'bg-blue-100 text-blue-800';
      case 'monitoring': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex flex-col overflow-hidden p-0 [&>button]:hidden',
          useRiskLessChrome
            ? 'flex h-screen max-h-full w-full max-w-[90vw] flex-col overflow-hidden p-0 md:h-[90vh] md:max-h-[90vh] md:max-w-[90vw] md:rounded-lg md:p-0 [&>button]:hidden'
            : 'h-screen max-h-full w-full max-w-full md:h-[90vh] md:max-h-[90vh] md:max-w-[90vw] md:rounded-lg'
        )}
      >
        <DialogHeader className="flex-shrink-0 border-b bg-background/95 px-2 pb-2 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-4 md:pb-3 md:pt-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-lg md:text-xl font-bold flex items-center gap-2">
                {useRiskLessChrome ? (
                  <Crosshair className="w-5 h-5" />
                ) : (
                  <Shield className="w-5 h-5" />
                )}
                {useRiskLessChrome ? 'Risk-Less' : 'Risk Management'}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        tabIndex={-1}
                        className="ml-1 inline-flex items-center justify-center rounded-full border border-muted-foreground/20 bg-background/80 p-0.5 text-[10px] text-muted-foreground hover:bg-muted"
                      >
                        <Info className="w-3 h-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={8} className="max-w-sm text-xs">
                      {workflowTemplateRiskLess
                        ? 'Edit project risks for this template. Foundation risks may be included depending on the project.'
                        : variant === 'risk-focus'
                          ? 'This session is dedicated to risks for your template: foundation and project risks are on the run, and you can add run-specific risks anytime.'
                          : 'A risk is simply something uncertain. Construction projects often go off-schedule due to uncertainty at the start. Projects come pre-loaded with risks and potential impact, and you can add your own when you see additional concerns.'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </DialogTitle>
              {useRiskLessChrome ? (
                <p className="mt-0.5 max-w-3xl text-sm font-normal leading-snug text-muted-foreground">
                  {workflowTemplateRiskLess
                    ? 'Review and edit risks for the project template you are working on'
                    : `Spot what could go wrong, decide how much it matters, and plan how you'll handle it`}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
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
          </div>
        </DialogHeader>

        {variant === 'risk-focus' && mode === 'run' ? (
          <RiskFocusDashboard
            risks={displayRisks}
            projectDisplayName={
              riskFocusRunForProgress
                ? riskFocusRunForProgress.customProjectName?.trim() ||
                  riskFocusRunForProgress.name?.trim() ||
                  null
                : null
            }
          />
        ) : workflowTemplateRiskLess ? (
          <RiskFocusDashboard
            risks={displayRisks}
            projectDisplayName={templateProjectDisplayName?.trim() || null}
          />
        ) : null}

        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col px-2 md:px-4',
            useRiskLessChrome
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
              (showRiskFocusProgressRow ||
                showAddRiskRow ||
                showRiskFocusHiddenToggle ||
                risks.length > 0) ? (
                <>
                  {/* Risk-Less mobile: progress (narrow) | sort menu (center) | hidden + add */}
                  <div className="flex w-full shrink-0 items-center gap-2 md:hidden">
                    <div className="shrink-0">
                      {showRiskFocusProgressRow && riskFocusRunForProgress ? (
                        progressEditable ? (
                          <Select
                            disabled={readOnly}
                            value={riskFocusProgressSelectValue(riskFocusRunForProgress.progress)}
                            onValueChange={(value) => {
                              const progress = Number.parseInt(value, 10);
                              if (
                                !Number.isFinite(progress) ||
                                !(RISK_FOCUS_PROGRESS_STOPS as readonly number[]).includes(progress)
                              ) {
                                return;
                              }
                              void updateProjectRun({ ...riskFocusRunForProgress, progress });
                            }}
                          >
                            <SelectTrigger
                              className="h-7 w-[120px] max-w-[120px] shrink-0 text-xs"
                              aria-label="Project progress"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem
                                value="0"
                                className="justify-center pl-2 pr-2 text-center [&>span:first-child]:hidden"
                              >
                                0%
                              </SelectItem>
                              <SelectItem
                                value="25"
                                className="justify-center pl-2 pr-2 text-center [&>span:first-child]:hidden"
                              >
                                25%
                              </SelectItem>
                              <SelectItem
                                value="50"
                                className="justify-center pl-2 pr-2 text-center [&>span:first-child]:hidden"
                              >
                                50%
                              </SelectItem>
                              <SelectItem
                                value="75"
                                className="justify-center pl-2 pr-2 text-center [&>span:first-child]:hidden"
                              >
                                75%
                              </SelectItem>
                              <SelectItem
                                value="100"
                                className="justify-center pl-2 pr-2 text-center [&>span:first-child]:hidden"
                              >
                                Complete
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div
                            className="flex w-[min(100%,9rem)] flex-col gap-0.5"
                            role="status"
                            aria-label={`Project progress ${riskFocusProgressBarPercent(riskFocusRunForProgress.progress)}%`}
                          >
                            <div className="flex items-center justify-between gap-1 text-[10px] text-muted-foreground">
                              <span>Progress</span>
                              <span className="tabular-nums font-medium text-foreground">
                                {riskFocusProgressBarPercent(riskFocusRunForProgress.progress)}%
                              </span>
                            </div>
                            <Progress
                              value={riskFocusProgressBarPercent(riskFocusRunForProgress.progress)}
                              className="h-1.5"
                            />
                          </div>
                        )
                      ) : null}
                    </div>
                    <div className="flex min-w-0 flex-1 justify-center px-1">
                      {risks.length > 0 ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 px-2 text-xs"
                              aria-label="Sort risks"
                            >
                              {riskListSort === 'alpha' ? (
                                <ArrowDownAZ className="h-3.5 w-3.5 shrink-0" />
                              ) : (
                                <ArrowDownWideNarrow className="h-3.5 w-3.5 shrink-0" />
                              )}
                              <span className="max-w-[5.5rem] truncate">
                                {riskListSort === 'alpha' ? 'A–Z' : 'Risk level'}
                              </span>
                              <ChevronDown className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center" className="z-[250]">
                            <DropdownMenuItem onClick={() => setRiskListSort('alpha')}>
                              <ArrowDownAZ className="mr-2 h-4 w-4" />
                              A–Z
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setRiskListSort('severity-desc')}>
                              <ArrowDownWideNarrow className="mr-2 h-4 w-4" />
                              Risk level
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {showRiskFocusHiddenToggle ? (
                        <div className="flex max-w-[9rem] items-start gap-1">
                          <Checkbox
                            id="show-hidden-risks-riskless-mobile"
                            className="mt-0.5 h-3 w-3 shrink-0 rounded-sm border-[1.5px] [&_svg]:h-2.5 [&_svg]:w-2.5"
                            checked={showHiddenRisks}
                            onCheckedChange={(c) => setShowHiddenRisks(c === true)}
                          />
                          <Label
                            htmlFor="show-hidden-risks-riskless-mobile"
                            className="cursor-pointer text-[10px] font-normal leading-tight"
                          >
                            <span className="block leading-tight">Show</span>
                            <span className="block leading-tight">Hidden risks</span>
                          </Label>
                        </div>
                      ) : null}
                      {riskFocusRun ? (
                        <div className="flex max-w-[9rem] items-start gap-1">
                          <Checkbox
                            id="hide-standard-risks-riskless-mobile"
                            className="mt-0.5 h-3 w-3 shrink-0 rounded-sm border-[1.5px] [&_svg]:h-2.5 [&_svg]:w-2.5"
                            checked={hideStandardRisks}
                            onCheckedChange={(c) => setHideStandardRisks(c === true)}
                          />
                          <Label
                            htmlFor="hide-standard-risks-riskless-mobile"
                            className="cursor-pointer text-[10px] font-normal leading-tight"
                          >
                            <span className="block leading-tight">Hide</span>
                            <span className="block leading-tight">Standard risks</span>
                          </Label>
                        </div>
                      ) : null}
                      {showAddRiskRow ? (
                        <Button
                          variant="default"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          aria-label="Add risk"
                          onClick={() => {
                            setEditingRisk(null);
                            setFormData({
                              risk: '',
                              likelihood: 'medium',
                              severity: 'medium',
                              schedule_impact_days: 0,
                              budget_impact_dollars: 0,
                              mitigation: '',
                              mitigation_actions: [],
                              notes: '',
                              status: 'open'
                            });
                            setShowAddForm(true);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {/* Risk-Less desktop toolbar */}
                  <div
                    className={cn(
                      'hidden w-full shrink-0 flex-row items-center gap-2 md:flex',
                      showRiskFocusProgressRow && (showAddRiskRow || showRiskFocusHiddenToggle)
                        ? 'justify-between'
                        : showRiskFocusProgressRow
                          ? 'justify-start'
                          : 'justify-end'
                    )}
                  >
                    {showRiskFocusProgressRow && riskFocusRunForProgress ? (
                      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-1.5">
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Project progress
                        </span>
                        {progressEditable ? (
                          <Select
                            disabled={readOnly}
                            value={riskFocusProgressSelectValue(riskFocusRunForProgress.progress)}
                            onValueChange={(value) => {
                              const progress = Number.parseInt(value, 10);
                              if (
                                !Number.isFinite(progress) ||
                                !(RISK_FOCUS_PROGRESS_STOPS as readonly number[]).includes(progress)
                              ) {
                                return;
                              }
                              void updateProjectRun({ ...riskFocusRunForProgress, progress });
                            }}
                          >
                            <SelectTrigger
                              className="h-7 w-[160px] text-xs"
                              aria-label="Project progress"
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
                        ) : (
                          <div
                            className="flex min-w-0 max-w-md flex-1 flex-col gap-1 sm:min-w-[200px]"
                            role="status"
                            aria-label={`Project progress ${riskFocusProgressBarPercent(riskFocusRunForProgress.progress)}%`}
                          >
                            <div className="flex items-center justify-end text-xs tabular-nums text-foreground">
                              {riskFocusProgressBarPercent(riskFocusRunForProgress.progress)}%
                            </div>
                            <Progress
                              value={riskFocusProgressBarPercent(riskFocusRunForProgress.progress)}
                              className="h-2"
                            />
                          </div>
                        )}
                      </div>
                    ) : null}
                    {showAddRiskRow ? (
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
                        {riskFocusRun ? (
                          <div className="flex flex-wrap items-center gap-4">
                            {showRiskFocusHiddenToggle ? (
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id="show-hidden-risks-toolbar"
                                  checked={showHiddenRisks}
                                  onCheckedChange={(c) => setShowHiddenRisks(c === true)}
                                />
                                <Label
                                  htmlFor="show-hidden-risks-toolbar"
                                  className="cursor-pointer text-xs font-normal sm:text-sm"
                                >
                                  Show hidden risks
                                </Label>
                              </div>
                            ) : null}
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="hide-standard-risks-toolbar-md"
                                checked={hideStandardRisks}
                                onCheckedChange={(c) => setHideStandardRisks(c === true)}
                              />
                              <Label
                                htmlFor="hide-standard-risks-toolbar-md"
                                className="cursor-pointer text-xs font-normal sm:text-sm"
                              >
                                Hide standard risks
                              </Label>
                            </div>
                          </div>
                        ) : null}
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setEditingRisk(null);
                            setFormData({
                              risk: '',
                              likelihood: 'medium',
                              severity: 'medium',
                              schedule_impact_days: 0,
                              budget_impact_dollars: 0,
                              mitigation: '',
                              mitigation_actions: [],
                              notes: '',
                              status: 'open'
                            });
                            setShowAddForm(true);
                          }}
                          className="h-7 gap-1 px-3 text-xs font-medium"
                        >
                          <Plus className="h-3.5 w-3.5 shrink-0" />
                          Add Risk
                        </Button>
                      </div>
                    ) : showRiskFocusHiddenToggle ? (
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="show-hidden-risks-toolbar-solo"
                              checked={showHiddenRisks}
                              onCheckedChange={(c) => setShowHiddenRisks(c === true)}
                            />
                            <Label
                              htmlFor="show-hidden-risks-toolbar-solo"
                              className="cursor-pointer text-xs font-normal sm:text-sm"
                            >
                              Show hidden risks
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="hide-standard-risks-toolbar-md-solo"
                              checked={hideStandardRisks}
                              onCheckedChange={(c) => setHideStandardRisks(c === true)}
                            />
                            <Label
                              htmlFor="hide-standard-risks-toolbar-md-solo"
                              className="cursor-pointer text-xs font-normal sm:text-sm"
                            >
                              Hide standard risks
                            </Label>
                          </div>
                        </div>
                      </div>
                    ) : riskFocusRun ? (
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="hide-standard-risks-toolbar-md-only"
                            checked={hideStandardRisks}
                            onCheckedChange={(c) => setHideStandardRisks(c === true)}
                          />
                          <Label
                            htmlFor="hide-standard-risks-toolbar-md-only"
                            className="cursor-pointer text-xs font-normal sm:text-sm"
                          >
                            Hide standard risks
                          </Label>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : showRiskFocusProgressRow || showAddRiskRow || showRiskFocusHiddenToggle ? (
                <div
                  className={cn(
                    'flex shrink-0 flex-col sm:flex-row sm:items-center',
                    useRiskLessChrome ? 'gap-1.5' : 'gap-2',
                    showRiskFocusProgressRow && (showAddRiskRow || showRiskFocusHiddenToggle)
                      ? 'sm:justify-between'
                      : showRiskFocusProgressRow
                        ? 'sm:justify-start'
                        : 'sm:justify-end'
                  )}
                >
                  {showRiskFocusProgressRow && riskFocusRunForProgress ? (
                    <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-1.5">
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Project progress
                      </span>
                      {progressEditable ? (
                        <Select
                          disabled={readOnly}
                          value={riskFocusProgressSelectValue(riskFocusRunForProgress.progress)}
                          onValueChange={(value) => {
                            const progress = Number.parseInt(value, 10);
                            if (
                              !Number.isFinite(progress) ||
                              !(RISK_FOCUS_PROGRESS_STOPS as readonly number[]).includes(progress)
                            ) {
                              return;
                            }
                            void updateProjectRun({ ...riskFocusRunForProgress, progress });
                          }}
                        >
                          <SelectTrigger
                            className="h-7 w-full text-xs sm:w-[160px]"
                            aria-label="Project progress"
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
                      ) : (
                        <div
                          className="flex min-w-0 w-full flex-col gap-1 sm:max-w-md sm:flex-1"
                          role="status"
                          aria-label={`Project progress ${riskFocusProgressBarPercent(riskFocusRunForProgress.progress)}%`}
                        >
                          <div className="flex items-center justify-end text-xs tabular-nums text-foreground">
                            {riskFocusProgressBarPercent(riskFocusRunForProgress.progress)}%
                          </div>
                          <Progress
                            value={riskFocusProgressBarPercent(riskFocusRunForProgress.progress)}
                            className="h-2"
                          />
                        </div>
                      )}
                    </div>
                  ) : null}
                  {showAddRiskRow ? (
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
                      {riskFocusRun ? (
                        <div className="flex flex-wrap items-center gap-4">
                          {showRiskFocusHiddenToggle ? (
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="show-hidden-risks-toolbar-sm"
                                checked={showHiddenRisks}
                                onCheckedChange={(c) => setShowHiddenRisks(c === true)}
                              />
                              <Label
                                htmlFor="show-hidden-risks-toolbar-sm"
                                className="cursor-pointer text-xs font-normal sm:text-sm"
                              >
                                Show hidden risks
                              </Label>
                            </div>
                          ) : null}
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="hide-standard-risks-toolbar-sm"
                              checked={hideStandardRisks}
                              onCheckedChange={(c) => setHideStandardRisks(c === true)}
                            />
                            <Label
                              htmlFor="hide-standard-risks-toolbar-sm"
                              className="cursor-pointer text-xs font-normal sm:text-sm"
                            >
                              Hide standard risks
                            </Label>
                          </div>
                        </div>
                      ) : null}
                      {workflowTemplateRiskLess && displayRisks.length > 0 ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 px-2 text-xs"
                              aria-label="Sort risks"
                            >
                              {riskListSort === 'alpha' ? (
                                <ArrowDownAZ className="h-3.5 w-3.5 shrink-0" />
                              ) : (
                                <ArrowDownWideNarrow className="h-3.5 w-3.5 shrink-0" />
                              )}
                              <span className="max-w-[5.5rem] truncate">
                                {riskListSort === 'alpha' ? 'A–Z' : 'Severity'}
                              </span>
                              <ChevronDown className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="z-[250]">
                            <DropdownMenuItem onClick={() => setRiskListSort('alpha')}>
                              <ArrowDownAZ className="mr-2 h-4 w-4" />
                              A–Z
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setRiskListSort('severity-desc')}>
                              <ArrowDownWideNarrow className="mr-2 h-4 w-4" />
                              Severity
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          setEditingRisk(null);
                          setFormData({
                            risk: '',
                            likelihood: 'medium',
                            severity: 'medium',
                            schedule_impact_days: 0,
                            budget_impact_dollars: 0,
                            mitigation: '',
                            mitigation_actions: [],
                            notes: '',
                            status: 'open'
                          });
                          setShowAddForm(true);
                        }}
                        className="h-7 gap-1 px-3 text-xs font-medium"
                      >
                        <Plus className="h-3.5 w-3.5 shrink-0" />
                        Add Risk
                      </Button>
                    </div>
                  ) : showRiskFocusHiddenToggle ? (
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="show-hidden-risks-toolbar-sm-solo"
                            checked={showHiddenRisks}
                            onCheckedChange={(c) => setShowHiddenRisks(c === true)}
                          />
                          <Label
                            htmlFor="show-hidden-risks-toolbar-sm-solo"
                            className="cursor-pointer text-xs font-normal sm:text-sm"
                          >
                            Show hidden risks
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="hide-standard-risks-toolbar-sm-solo"
                            checked={hideStandardRisks}
                            onCheckedChange={(c) => setHideStandardRisks(c === true)}
                          />
                          <Label
                            htmlFor="hide-standard-risks-toolbar-sm-solo"
                            className="cursor-pointer text-xs font-normal sm:text-sm"
                          >
                            Hide standard risks
                          </Label>
                        </div>
                      </div>
                    </div>
                  ) : riskFocusRun ? (
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="hide-standard-risks-toolbar-sm-only"
                          checked={hideStandardRisks}
                          onCheckedChange={(c) => setHideStandardRisks(c === true)}
                        />
                        <Label
                          htmlFor="hide-standard-risks-toolbar-sm-only"
                          className="cursor-pointer text-xs font-normal sm:text-sm"
                        >
                          Hide standard risks
                        </Label>
                      </div>
                    </div>
                  ) : null}
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
              ) : (
                <>
                  {displayRisks.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
                      <p className="text-muted-foreground text-sm">
                        {risks.length === 0
                          ? 'No risks loaded for this run.'
                          : hideStandardRisks
                            ? 'No risks match the current filters. Turn off Hide standard risks or Show hidden risks to see more.'
                            : 'All predefined risks are hidden. Turn on Show hidden risks next to Add Risk to see them.'}
                      </p>
                    </div>
                  ) : null}
                  {/* Mobile: Card Layout */}
                  <div
                    className={cn(
                      'min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain md:hidden',
                      displayRisks.length === 0 ? 'hidden' : ''
                    )}
                  >
                    {displayRisks.map((risk) => {
                      return (
                        <Card
                          key={risk.id}
                          className={cn(
                            'p-4',
                            riskFocusRun && 'pb-2',
                            riskFocusRun &&
                              'cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                          )}
                          tabIndex={riskFocusRun ? 0 : undefined}
                          onClick={riskFocusRun ? () => setDetailsRisk(risk) : undefined}
                          onKeyDown={
                            riskFocusRun
                              ? (e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setDetailsRisk(risk);
                                  }
                                }
                              : undefined
                          }
                        >
                          <div className={cn('space-y-3', riskFocusRun && 'space-y-2')}>
                            <div className="flex items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="text-xs text-muted-foreground mb-1">Risk</div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-semibold text-sm leading-snug">{risk.risk}</h3>
                                  {riskFocusRun && risk.from_standard_foundation ? (
                                    <Badge variant="outline" className="text-[10px] border-muted-foreground/40">
                                      Standard
                                    </Badge>
                                  ) : null}
                                  {riskFocusRun && risk.hidden_from_register ? (
                                    <Badge variant="secondary" className="text-[10px]">
                                      Hidden
                                    </Badge>
                                  ) : null}
                                </div>
                              </div>
                              {!readOnly && !riskFocusRun ? (
                                <div
                                  className="flex shrink-0 gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                >
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditRisk(risk)}
                                    className="h-11 w-11 p-0"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  {!(mode === 'run' && risk.is_template_risk) ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteRisk(risk)}
                                      className="h-11 w-11 p-0 text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                            <div className={cn('space-y-3', riskFocusRun && 'space-y-2')}>
                              {riskFocusRun ? (
                                <>
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1">Likelihood</div>
                                    <Badge
                                      className={getRiskLevelColor(
                                        risk.likelihood,
                                        risk.schedule_impact_days,
                                        risk.budget_impact_dollars
                                      )}
                                    >
                                      {risk.likelihood}
                                    </Badge>
                                  </div>
                                  {advancedMode ? (
                                    <div className="grid grid-cols-3 gap-3">
                                      <div>
                                        <div className="text-xs text-muted-foreground mb-1">Overall Severity</div>
                                        {risk.severity ? (
                                          <Badge variant="outline">{risk.severity}</Badge>
                                        ) : (
                                          <span className="text-muted-foreground">—</span>
                                        )}
                                      </div>
                                      <div>
                                        <div className="text-xs text-muted-foreground mb-1">Budget Risk</div>
                                        <div className="text-sm tabular-nums">
                                          {risk.budget_impact_dollars != null
                                            ? `$${Number(risk.budget_impact_dollars).toLocaleString()}`
                                            : '—'}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-xs text-muted-foreground mb-1">Timeline Risk</div>
                                        <div className="text-sm tabular-nums">
                                          {risk.schedule_impact_days != null ? `${Number(risk.schedule_impact_days)} days` : '—'}
                                        </div>
                                      </div>
                                    </div>
                                  ) : null}
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1">Impact</div>
                                    <ImpactIfItDoesContent risk={risk} />
                                  </div>
                                </>
                              ) : wfTableAdvanced ? (
                                <>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">Severity</div>
                                      {risk.severity ? (
                                        <Badge variant="outline">{risk.severity}</Badge>
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </div>
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">Risk level</div>
                                      <Badge
                                        className={getRiskLevelColor(
                                          risk.likelihood,
                                          risk.schedule_impact_days,
                                          risk.budget_impact_dollars
                                        )}
                                      >
                                        {risk.likelihood}
                                      </Badge>
                                    </div>
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">Timeline impact</div>
                                      <div className="text-sm tabular-nums">
                                        {risk.schedule_impact_days != null ? `${Number(risk.schedule_impact_days)} days` : '—'}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">Budget impact</div>
                                      <div className="text-sm tabular-nums">
                                        {risk.budget_impact_dollars != null
                                          ? `$${Number(risk.budget_impact_dollars).toLocaleString()}`
                                          : '—'}
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1">Impact</div>
                                    <ImpactIfItDoesContent risk={risk} />
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1">
                                      {wfTableFriendly ? 'How likely is it?' : 'Likelihood'}
                                    </div>
                                    <Badge
                                      className={getRiskLevelColor(
                                        risk.likelihood,
                                        risk.schedule_impact_days,
                                        risk.budget_impact_dollars
                                      )}
                                    >
                                      {risk.likelihood}
                                    </Badge>
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1">
                                      {wfTableFriendly ? 'If it happens, then what?' : 'Impact'}
                                    </div>
                                    <ImpactIfItDoesContent risk={risk} />
                                  </div>
                                </>
                              )}
                            </div>
                            {mode === 'run' && variant !== 'risk-focus' && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Status</div>
                                {readOnly ? (
                                  <Badge className={getStatusColor(risk.status || 'open')}>
                                    {risk.status || 'open'}
                                  </Badge>
                                ) : (
                                  <Select
                                    value={risk.status || 'open'}
                                    onValueChange={(value) => handleUpdateStatus(risk, value as any)}
                                  >
                                    <SelectTrigger className="h-11 text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="open">Open</SelectItem>
                                      <SelectItem value="mitigated">Mitigated</SelectItem>
                                      <SelectItem value="monitoring">Monitoring</SelectItem>
                                      <SelectItem value="closed">Closed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            )}
                            {riskFocusRun ? (
                              <>
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                >
                                  <div className="text-xs text-muted-foreground mb-1">Mitigation</div>
                                  {(risk.mitigation_actions?.length ?? 0) > 0 ? (
                                    <ul className="space-y-2 text-sm">
                                      {risk.mitigation_actions!.map((ma, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                          {!readOnly && String(ma.action).trim() ? (
                                            <Checkbox
                                              className="mt-0.5 h-3 w-3 shrink-0 rounded-sm border-[1.5px] [&_svg]:h-2.5 [&_svg]:w-2.5"
                                              checked={Boolean(ma.completed)}
                                              onCheckedChange={() => void handleMitigationActionCompletedToggle(risk, idx)}
                                              aria-label={`Done: ${ma.action}`}
                                            />
                                          ) : null}
                                          <div className="min-w-0 flex-1">
                                            {!readOnly && !String(ma.action).trim() ? (
                                              <Input
                                                className="h-9 text-sm"
                                                placeholder="Describe this mitigation"
                                                defaultValue=""
                                                onBlur={(e) => void handleMitigationActionTextBlur(risk, idx, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                onKeyDown={(e) => e.stopPropagation()}
                                              />
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
                                  ) : risk.mitigation ? (
                                    <p className="text-sm">{risk.mitigation}</p>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">No mitigation steps yet.</p>
                                  )}
                                  {!readOnly ? (
                                    <div className="mt-2 flex justify-center">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                                        aria-label="Add mitigation"
                                        onClick={() => void handleAppendMitigationAction(risk)}
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : null}
                                </div>
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                >
                                  <div className="text-xs text-muted-foreground mb-1">Whats the new status?</div>
                                  {readOnly ? (
                                    <Badge className={currentRiskLevelBadgeClass(riskFocusLevelValue(risk))}>
                                      {riskFocusLevelValue(risk) === 'high'
                                        ? 'High'
                                        : riskFocusLevelValue(risk) === 'low'
                                          ? 'Low'
                                          : 'Med'}
                                    </Badge>
                                  ) : (
                                    <Select
                                      value={riskFocusLevelValue(risk)}
                                      onValueChange={(value) =>
                                        handleUpdateCurrentRiskLevel(risk, value as 'low' | 'medium' | 'high')
                                      }
                                    >
                                      <SelectTrigger
                                        className={cn(
                                          'h-11 text-sm',
                                          riskFocusSeveritySelectTriggerClass(riskFocusLevelValue(risk))
                                        )}
                                      >
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="high" className={riskFocusSeveritySelectItemClass('high')}>
                                          High
                                        </SelectItem>
                                        <SelectItem value="medium" className={riskFocusSeveritySelectItemClass('medium')}>
                                          Med
                                        </SelectItem>
                                        <SelectItem value="low" className={riskFocusSeveritySelectItemClass('low')}>
                                          Low
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              </>
                            ) : (
                              <>
                                {(risk.mitigation_actions && risk.mitigation_actions.length > 0) && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.stopPropagation()}
                                  >
                                    <div className="text-xs text-muted-foreground mb-1">
                                      What can we do to prevent it?
                                    </div>
                                    <ul className="space-y-2 text-sm">
                                      {risk.mitigation_actions.map((ma, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                          <span>
                                            <span className="font-medium">{ma.action}</span>
                                            {ma.benefit ? (
                                              <span className="text-muted-foreground"> – {ma.benefit}</span>
                                            ) : null}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {!risk.mitigation_actions?.length && risk.mitigation && (
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1">
                                      What can we do to prevent it?
                                    </div>
                                    <p className="text-sm">{risk.mitigation}</p>
                                  </div>
                                )}
                              </>
                            )}
                            {!(mode === 'run' && variant === 'risk-focus') ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => setDetailsRisk(risk)}
                              >
                                <Info className="w-4 h-4 mr-2" />
                                More details
                              </Button>
                            ) : null}
                          </div>
                        </Card>
                    );
                    })}
                  </div>

                  {/* Desktop: Table Layout — fills remaining height */}
                  <div
                    className={cn(
                      'hidden min-h-0 flex-1 flex-col overflow-hidden md:flex',
                      displayRisks.length === 0 ? 'md:hidden' : ''
                    )}
                  >
                    <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border/60">
                      <Table
                        className={cn(
                          riskFocusRun &&
                            '[&_td]:!px-3 [&_td]:!py-1.5 [&_td]:!pb-1 [&_th]:!h-10 [&_th]:!py-2 [&_th]:!px-3'
                        )}
                      >
                      <TableHeader>
                        <TableRow>
                          <TableHead
                            className={cn(
                              riskFocusRun ? 'min-w-[135px] max-w-[180px]' : 'min-w-[180px] max-w-[240px]'
                            )}
                          >
                            {riskFocusRun ? (
                              <button
                                type="button"
                                className={cn(
                                  '-mx-1 inline-flex max-w-full items-center gap-1 rounded-md px-1 py-1 text-left text-sm font-semibold transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                  riskListSort === 'alpha' ? 'text-primary' : 'text-foreground'
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRiskListSort('alpha');
                                }}
                                aria-pressed={riskListSort === 'alpha'}
                              >
                                <span className="min-w-0 leading-snug">Risk</span>
                                <ArrowDownAZ
                                  className={cn(
                                    'h-3.5 w-3.5 shrink-0',
                                    riskListSort === 'alpha' ? 'opacity-100' : 'opacity-35'
                                  )}
                                  aria-hidden
                                />
                              </button>
                            ) : (
                              'Risk'
                            )}
                          </TableHead>
                          {riskFocusRun ? (
                            <>
                              <TableHead className="w-[100px]">Likelihood</TableHead>
                              {advancedMode ? <TableHead className="w-[120px]">Overall Severity</TableHead> : null}
                              {advancedMode ? <TableHead className="w-[120px]">Budget Risk</TableHead> : null}
                              {advancedMode ? <TableHead className="w-[120px]">Timeline Risk</TableHead> : null}
                            </>
                          ) : wfTableAdvanced ? (
                            <>
                              <TableHead className="w-[100px]">Severity</TableHead>
                              <TableHead className="w-[120px]">Timeline impact</TableHead>
                              <TableHead className="w-[120px]">Budget impact</TableHead>
                              <TableHead className="w-[120px]">Risk level</TableHead>
                            </>
                          ) : (
                            <TableHead className="w-[100px]">
                              {wfTableFriendly ? 'How likely is it?' : 'Likelihood'}
                            </TableHead>
                          )}
                          <TableHead
                            className={cn(
                              'align-top',
                              riskFocusRun
                                ? 'w-[17.5%] min-w-[8.75rem] max-w-[12.5rem]'
                                : 'min-w-[140px] max-w-[200px]'
                            )}
                          >
                            {wfTableFriendly ? 'If it happens, then what?' : 'Impact'}
                          </TableHead>
                          <TableHead
                            className={cn(
                              'align-top',
                              riskFocusRun ? 'min-w-[16rem] w-[36%]' : 'min-w-[200px]'
                            )}
                          >
                            {wfTableFriendly ? 'What can we do to prevent it?' : 'Mitigation'}
                          </TableHead>
                          {mode === 'run' && variant === 'risk-focus' ? (
                            <TableHead className="min-w-[100px] max-w-[140px] leading-tight">
                              <button
                                type="button"
                                className={cn(
                                  '-mx-1 inline-flex max-w-full items-center gap-1 rounded-md px-1 py-1 text-left text-sm font-semibold transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                  riskListSort === 'severity-desc' ? 'text-primary' : 'text-foreground'
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRiskListSort('severity-desc');
                                }}
                                aria-pressed={riskListSort === 'severity-desc'}
                              >
                                <span className="min-w-0 leading-tight">Whats the new status?</span>
                                <ArrowDownWideNarrow
                                  className={cn(
                                    'h-3.5 w-3.5 shrink-0',
                                    riskListSort === 'severity-desc' ? 'opacity-100' : 'opacity-35'
                                  )}
                                  aria-hidden
                                />
                              </button>
                            </TableHead>
                          ) : null}
                          {mode === 'run' && variant !== 'risk-focus' ? (
                            <TableHead className="w-[120px]">Status</TableHead>
                          ) : null}
                          {!riskFocusRun ? <TableHead className="w-[120px]">Actions</TableHead> : null}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayRisks.map((risk) => (
                          <TableRow
                            key={risk.id}
                            className={cn(
                              riskFocusRun &&
                                'cursor-pointer hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                            )}
                            tabIndex={riskFocusRun ? 0 : undefined}
                            onClick={riskFocusRun ? () => setDetailsRisk(risk) : undefined}
                            onKeyDown={
                              riskFocusRun
                                ? (e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      setDetailsRisk(risk);
                                    }
                                  }
                                : undefined
                            }
                          >
                            <TableCell className="font-medium">
                              <div className="flex flex-wrap items-center gap-2">
                                <span>{risk.risk}</span>
                                {riskFocusRun && risk.from_standard_foundation ? (
                                  <Badge variant="outline" className="text-[10px] border-muted-foreground/40">
                                    Standard
                                  </Badge>
                                ) : null}
                                {riskFocusRun && risk.hidden_from_register ? (
                                  <Badge variant="secondary" className="text-[10px]">
                                    Hidden
                                  </Badge>
                                ) : null}
                              </div>
                            </TableCell>
                            {riskFocusRun ? (
                              <>
                                <TableCell>
                                  <Badge className={getRiskLevelColor(risk.likelihood, risk.schedule_impact_days, risk.budget_impact_dollars)}>
                                    {risk.likelihood}
                                  </Badge>
                                </TableCell>
                                {advancedMode ? (
                                  <TableCell>
                                    {risk.severity ? (
                                      <Badge variant="outline">{risk.severity}</Badge>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                ) : null}
                                {advancedMode ? (
                                  <TableCell className="tabular-nums">
                                    {risk.budget_impact_dollars != null ? (
                                      `$${Number(risk.budget_impact_dollars).toLocaleString()}`
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                ) : null}
                                {advancedMode ? (
                                  <TableCell className="tabular-nums">
                                    {risk.schedule_impact_days != null ? (
                                      `${Number(risk.schedule_impact_days)}`
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                ) : null}
                              </>
                            ) : wfTableAdvanced ? (
                              <>
                                <TableCell>
                                  {risk.severity ? (
                                    <Badge variant="outline">{risk.severity}</Badge>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="tabular-nums">
                                  {risk.schedule_impact_days != null ? (
                                    `${Number(risk.schedule_impact_days)}`
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="tabular-nums">
                                  {risk.budget_impact_dollars != null ? (
                                    `$${Number(risk.budget_impact_dollars).toLocaleString()}`
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge className={getRiskLevelColor(risk.likelihood, risk.schedule_impact_days, risk.budget_impact_dollars)}>
                                    {risk.likelihood}
                                  </Badge>
                                </TableCell>
                              </>
                            ) : (
                              <TableCell>
                                <Badge className={getRiskLevelColor(risk.likelihood, risk.schedule_impact_days, risk.budget_impact_dollars)}>
                                  {risk.likelihood}
                                </Badge>
                              </TableCell>
                            )}
                            <TableCell
                              className={cn(
                                'text-sm align-top',
                                riskFocusRun && 'max-w-[12.5rem]'
                              )}
                            >
                              <ImpactIfItDoesContent risk={risk} />
                            </TableCell>
                            <TableCell
                              className={cn(
                                'text-sm text-muted-foreground align-top',
                                riskFocusRun && 'min-w-[14rem]'
                              )}
                              onClick={riskFocusRun ? (e) => e.stopPropagation() : undefined}
                            >
                              {riskFocusRun ? (
                                <div className="space-y-2">
                                  {(risk.mitigation_actions?.length ?? 0) > 0 ? (
                                    risk.mitigation_actions!.map((ma, idx) => (
                                      <div key={idx} className="flex items-start gap-2">
                                        {!readOnly && String(ma.action).trim() ? (
                                          <Checkbox
                                            className="mt-0.5"
                                            checked={Boolean(ma.completed)}
                                            onCheckedChange={() => void handleMitigationActionCompletedToggle(risk, idx)}
                                            aria-label={`Done: ${ma.action}`}
                                          />
                                        ) : null}
                                        <div className="flex min-w-0 flex-1 flex-col">
                                          {!readOnly && !String(ma.action).trim() ? (
                                            <Input
                                              className="h-8 text-xs"
                                              placeholder="Describe this mitigation"
                                              defaultValue=""
                                              onBlur={(e) => void handleMitigationActionTextBlur(risk, idx, e.target.value)}
                                              onClick={(e) => e.stopPropagation()}
                                              onKeyDown={(e) => e.stopPropagation()}
                                            />
                                          ) : (
                                            <>
                                              <span className="font-medium">{ma.action}</span>
                                              {ma.benefit ? (
                                                <span className="text-xs text-muted-foreground">{ma.benefit}</span>
                                              ) : null}
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    ))
                                  ) : risk.mitigation ? (
                                    <p className="text-sm">{risk.mitigation}</p>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                  {!readOnly ? (
                                    <div className="flex justify-center pt-0.5">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                                        aria-label="Add mitigation"
                                        onClick={() => void handleAppendMitigationAction(risk)}
                                      >
                                        <Plus className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  ) : null}
                                </div>
                              ) : risk.mitigation_actions && risk.mitigation_actions.length > 0 ? (
                                <div className="space-y-2">
                                  {risk.mitigation_actions.map((ma, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                      <div className="flex min-w-0 flex-col">
                                        <span className="font-medium">{ma.action}</span>
                                        {ma.benefit ? (
                                          <span className="text-xs text-muted-foreground">{ma.benefit}</span>
                                        ) : null}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                risk.mitigation || '-'
                              )}
                            </TableCell>
                            {mode === 'run' && variant === 'risk-focus' && (
                              <TableCell
                                className="align-top"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {readOnly ? (
                                  <Badge className={currentRiskLevelBadgeClass(riskFocusLevelValue(risk))}>
                                    {riskFocusLevelValue(risk) === 'high'
                                      ? 'High'
                                      : riskFocusLevelValue(risk) === 'low'
                                        ? 'Low'
                                        : 'Med'}
                                  </Badge>
                                ) : (
                                  <Select
                                    value={riskFocusLevelValue(risk)}
                                    onValueChange={(value) =>
                                      handleUpdateCurrentRiskLevel(risk, value as 'low' | 'medium' | 'high')
                                    }
                                  >
                                    <SelectTrigger
                                      className={cn(
                                        'h-8 text-xs',
                                        riskFocusSeveritySelectTriggerClass(riskFocusLevelValue(risk))
                                      )}
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="high" className={riskFocusSeveritySelectItemClass('high')}>
                                        High
                                      </SelectItem>
                                      <SelectItem value="medium" className={riskFocusSeveritySelectItemClass('medium')}>
                                        Med
                                      </SelectItem>
                                      <SelectItem value="low" className={riskFocusSeveritySelectItemClass('low')}>
                                        Low
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </TableCell>
                            )}
                            {mode === 'run' && variant !== 'risk-focus' && (
                              <TableCell>
                                {readOnly ? (
                                  <Badge className={getStatusColor(risk.status || 'open')}>
                                    {risk.status || 'open'}
                                  </Badge>
                                ) : (
                                  <Select
                                    value={risk.status || 'open'}
                                    onValueChange={(value) => handleUpdateStatus(risk, value as any)}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="open">Open</SelectItem>
                                      <SelectItem value="mitigated">Mitigated</SelectItem>
                                      <SelectItem value="monitoring">Monitoring</SelectItem>
                                      <SelectItem value="closed">Closed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </TableCell>
                            )}
                            {!riskFocusRun ? (
                              <TableCell
                                className="align-top"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex flex-wrap gap-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDetailsRisk(risk)}
                                    className="h-7 px-2 text-[10px]"
                                  >
                                    Details
                                  </Button>
                                  {!readOnly && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditRisk(risk)}
                                        className="h-7 w-7 p-0"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </Button>
                                      {!(mode === 'run' && risk.is_template_risk) ? (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeleteRisk(risk)}
                                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                      ) : null}
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            ) : null}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Add/Edit Form Dialog — scrollable body + fixed footer so it fits inside Risk-Less */}
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogContent
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

              <div className="space-y-3">
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
                      size="xs"
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
                    setFormData({
                      risk: '',
                      likelihood: 'medium',
                      severity: 'medium',
                      schedule_impact_days: 0,
                      budget_impact_dollars: 0,
                      mitigation: '',
                      mitigation_actions: [],
                      notes: '',
                      status: 'open'
                    });
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
                  {riskFocusRun && detailsRisk.from_standard_foundation ? (
                    <Badge variant="outline" className="text-[10px] border-muted-foreground/40">
                      Standard
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
    </>
  );
}

