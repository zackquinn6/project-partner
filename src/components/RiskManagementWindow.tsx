import { useState, useEffect, useMemo } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Edit, Trash2, Save, X, AlertTriangle, Shield, Crosshair, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useProject } from '@/contexts/ProjectContext';

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
  mitigation_actions?: { action: string; benefit?: string | null }[] | null;
  notes?: string | null;
  status?: 'open' | 'mitigated' | 'closed' | 'monitoring';
  is_template_risk?: boolean;
  template_risk_id?: string | null;
  display_order?: number;
  // Legacy fields for backward compatibility
  impact?: string;
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
  if (!schedule && !budget) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="space-y-1 text-sm">
      {schedule ? <div>{schedule}</div> : null}
      {budget ? <div>{budget}</div> : null}
    </div>
  );
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

function RiskFocusDashboard({ risks }: { risks: Risk[] }) {
  const { high, medium, low, unset, total } = riskFocusSeverityCounts(risks);
  return (
    <div className="shrink-0 border-b bg-muted/30 px-3 pb-1.5 pt-1 md:px-6 md:pb-2 md:pt-1">
      <div className="mb-0.5 shrink-0 border-b pb-0.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Current Risk Summary
      </div>
      <div className="flex w-full justify-center">
        <Card className="min-w-0 w-full max-w-xl overflow-hidden">
          <CardContent className="flex flex-row flex-wrap items-center justify-center gap-y-2 px-2 py-1.5">
            <div className="flex min-w-0 flex-row flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:gap-x-4">
              <div className="flex flex-row items-baseline gap-2.5">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  High
                </span>
                <span className="text-lg font-bold tabular-nums text-destructive sm:text-xl">{high}</span>
              </div>
              <div className="flex flex-row items-baseline gap-2.5 border-l border-foreground/20 pl-3 dark:border-foreground/30 sm:pl-4">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Med
                </span>
                <span className="text-lg font-bold tabular-nums text-amber-600 sm:text-xl">{medium}</span>
              </div>
              <div className="flex flex-row items-baseline gap-2.5 border-l border-foreground/20 pl-3 dark:border-foreground/30 sm:pl-4">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Low
                </span>
                <span className="text-lg font-bold tabular-nums text-emerald-600 sm:text-xl">{low}</span>
              </div>
              <div
                className="mx-1 h-7 w-px shrink-0 self-center bg-foreground/45 dark:bg-foreground/55 sm:mx-2"
                aria-hidden
                role="presentation"
              />
              <div className="flex flex-row items-baseline gap-2.5">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Total
                </span>
                <span className="text-lg font-bold tabular-nums sm:text-xl">{total}</span>
              </div>
            </div>
          </CardContent>
          {unset > 0 ? (
            <div className="border-t border-border/50 px-2 py-0.5 text-center text-[10px] text-muted-foreground">
              Not set: {unset}
            </div>
          ) : null}
        </Card>
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
}

export function RiskManagementWindow({
  open,
  onOpenChange,
  projectId,
  projectRunId,
  mode = 'run',
  readOnly = false,
  variant = 'default'
}: RiskManagementWindowProps) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { projectRuns, updateProjectRun } = useProject();
  const riskFocusRunForProgress = useMemo(
    () => (projectRunId ? projectRuns.find((r) => r.id === projectRunId) : undefined),
    [projectRuns, projectRunId]
  );
  const showRiskFocusProgressRow =
    variant === 'risk-focus' && mode === 'run' && Boolean(projectRunId && riskFocusRunForProgress);
  const showAddRiskRow =
    !readOnly && (mode === 'template' || (mode === 'run' && projectRunId));
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [templateProjectIdForRisks, setTemplateProjectIdForRisks] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [detailsRisk, setDetailsRisk] = useState<Risk | null>(null);
  const [formData, setFormData] = useState({
    risk: '',
    likelihood: 'medium' as 'low' | 'medium' | 'high',
    severity: 'medium' as 'low' | 'medium' | 'high',
    schedule_impact_days: 0,
    budget_impact_dollars: 0,
    mitigation: '',
    mitigation_actions: [] as { action: string; benefit?: string | null }[],
    notes: '',
    status: 'open' as 'open' | 'mitigated' | 'closed' | 'monitoring'
  });

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
          mitigation_actions: Array.isArray(risk.mitigation_actions) ? risk.mitigation_actions : [],
          notes: risk.risk_description || null,
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
          mitigation_actions: Array.isArray(risk.mitigation_actions) ? risk.mitigation_actions : [],
          notes: risk.risk_description || null,
          status: risk.status || 'open',
          is_template_risk: !!risk.template_risk_id,
          template_risk_id: risk.template_risk_id,
          display_order: risk.display_order,
          impact: risk.impact
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
              risk_description: formData.notes.trim() || null,
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
              risk_description: formData.notes.trim() || null,
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
              risk_description: formData.notes.trim() || null,
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
              risk_description: formData.notes.trim() || null,
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
              display_order: nextOrder
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
    setFormData({
      risk: risk.risk || risk.risk_title || '',
      likelihood: risk.likelihood,
      severity: risk.severity || 'medium',
      schedule_impact_days: risk.schedule_impact_days || risk.schedule_impact_high_days || risk.schedule_impact_low_days || 0,
      budget_impact_dollars: risk.budget_impact_dollars || risk.budget_impact_high || risk.budget_impact_low || 0,
      mitigation: risk.mitigation || risk.mitigation_strategy || '',
      notes: risk.notes || risk.risk_description || '',
      status: risk.status || 'open'
    });
    setShowAddForm(true);
  };

  const handleDeleteRisk = async (risk: Risk) => {
    if (!confirm('Are you sure you want to delete this risk?')) return;

    // Prevent deletion of template risks by users
    if (mode === 'run' && risk.is_template_risk) {
      toast.error('Template risks cannot be deleted. You can only change their status.');
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
          variant === 'risk-focus'
            ? 'flex h-screen max-h-full w-full max-w-[90vw] flex-col overflow-hidden p-0 md:h-[90vh] md:max-h-[90vh] md:max-w-[90vw] md:rounded-lg md:p-0 [&>button]:hidden'
            : 'h-screen max-h-full w-full max-w-full md:h-[90vh] md:max-h-[90vh] md:max-w-[90vw] md:rounded-lg'
        )}
      >
        <DialogHeader className="flex-shrink-0 border-b bg-background/95 px-2 pb-2 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-4 md:pb-3 md:pt-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-lg md:text-xl font-bold flex items-center gap-2">
                {variant === 'risk-focus' ? (
                  <Crosshair className="w-5 h-5" />
                ) : (
                  <Shield className="w-5 h-5" />
                )}
                {variant === 'risk-focus' ? 'Risk-Less' : 'Risk Management'}
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
                      {variant === 'risk-focus'
                        ? 'This session is dedicated to risks for your template: foundation and project risks are on the run, and you can add run-specific risks anytime.'
                        : 'A risk is simply something uncertain. Construction projects often go off-schedule due to uncertainty at the start. Projects come pre-loaded with risks and potential impact, and you can add your own when you see additional concerns.'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </DialogTitle>
              {variant === 'risk-focus' ? (
                <p className="mt-0.5 max-w-3xl text-sm font-normal leading-snug text-muted-foreground">
                  {`Spot what could go wrong, decide how much it matters, and plan how you'll handle it`}
                </p>
              ) : null}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onOpenChange(false)} 
              className="h-7 px-2 text-[9px] md:text-xs flex-shrink-0"
            >
              Close
            </Button>
          </div>
        </DialogHeader>

        {variant === 'risk-focus' && mode === 'run' ? <RiskFocusDashboard risks={risks} /> : null}

        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col px-2 md:px-4',
            variant === 'risk-focus'
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
              {showRiskFocusProgressRow || showAddRiskRow ? (
                <div
                  className={cn(
                    'flex shrink-0 flex-col sm:flex-row sm:items-center',
                    variant === 'risk-focus' ? 'gap-1.5' : 'gap-2',
                    showRiskFocusProgressRow && showAddRiskRow
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
                    </div>
                  ) : null}
                  {showAddRiskRow ? (
                    <div className="flex shrink-0 justify-end">
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
                  {/* Mobile: Card Layout */}
                  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain md:hidden">
                    {risks.map((risk) => {
                      const riskFocusRun = mode === 'run' && variant === 'risk-focus';
                      return (
                        <Card
                          key={risk.id}
                          className={cn(
                            'p-4',
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
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground mb-1">What could go wrong?</div>
                                <h3 className="font-semibold text-sm leading-snug">{risk.risk}</h3>
                              </div>
                              {!readOnly && (
                                <div
                                  className="flex gap-1 flex-shrink-0"
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
                                  {!(mode === 'run' && risk.is_template_risk) &&
                                    !(mode === 'run' && variant === 'risk-focus') && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteRisk(risk)}
                                        className="h-11 w-11 p-0 text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    )}
                                </div>
                              )}
                            </div>
                            <div className="space-y-3">
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">How likely?</div>
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
                                <div className="text-xs text-muted-foreground mb-1">What happens if it does?</div>
                                <ImpactIfItDoesContent risk={risk} />
                              </div>
                            </div>
                            {mode === 'run' && variant === 'risk-focus' && (
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
                                    <SelectTrigger className="h-11 text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="high">High</SelectItem>
                                      <SelectItem value="medium">Med</SelectItem>
                                      <SelectItem value="low">Low</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            )}
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
                            {(risk.mitigation_actions && risk.mitigation_actions.length > 0) && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">
                                  What can we do to prevent it?
                                </div>
                                <ul className="text-sm list-disc list-inside space-y-1">
                                  {risk.mitigation_actions.map((ma, idx) => (
                                    <li key={idx}>
                                      <span className="font-medium">{ma.action}</span>
                                      {ma.benefit && (
                                        <span className="text-muted-foreground"> – {ma.benefit}</span>
                                      )}
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
                  <div className="hidden min-h-0 flex-1 flex-col overflow-hidden md:flex">
                    <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border/60">
                      <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[180px] max-w-[240px]">What could go wrong?</TableHead>
                          <TableHead className="w-[100px]">How likely?</TableHead>
                          <TableHead className="min-w-[140px] max-w-[200px]">What happens if it does?</TableHead>
                          <TableHead className="min-w-[200px]">What can we do to prevent it?</TableHead>
                          {mode === 'run' && variant === 'risk-focus' ? (
                            <TableHead className="min-w-[100px] max-w-[140px] leading-tight">
                              Whats the new status?
                            </TableHead>
                          ) : null}
                          {mode === 'run' && variant !== 'risk-focus' ? (
                            <TableHead className="w-[120px]">Status</TableHead>
                          ) : null}
                          <TableHead className="w-[120px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {risks.map((risk) => {
                          const riskFocusRunRow = mode === 'run' && variant === 'risk-focus';
                          return (
                          <TableRow
                            key={risk.id}
                            className={cn(
                              riskFocusRunRow &&
                                'cursor-pointer hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                            )}
                            tabIndex={riskFocusRunRow ? 0 : undefined}
                            onClick={riskFocusRunRow ? () => setDetailsRisk(risk) : undefined}
                            onKeyDown={
                              riskFocusRunRow
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
                              {risk.risk}
                            </TableCell>
                            <TableCell>
                              <Badge className={getRiskLevelColor(risk.likelihood, risk.schedule_impact_days, risk.budget_impact_dollars)}>
                                {risk.likelihood}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm align-top">
                              <ImpactIfItDoesContent risk={risk} />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground align-top">
                              {risk.mitigation_actions && risk.mitigation_actions.length > 0 ? (
                                <div className="space-y-1">
                                  {risk.mitigation_actions.map((ma, idx) => (
                                    <div key={idx} className="flex flex-col">
                                      <span className="font-medium">{ma.action}</span>
                                      {ma.benefit && (
                                        <span className="text-xs text-muted-foreground">{ma.benefit}</span>
                                      )}
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
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="high">High</SelectItem>
                                      <SelectItem value="medium">Med</SelectItem>
                                      <SelectItem value="low">Low</SelectItem>
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
                            <TableCell
                              className="align-top"
                              onClick={riskFocusRunRow ? (e) => e.stopPropagation() : undefined}
                            >
                              <div className="flex flex-wrap gap-1">
                                {!riskFocusRunRow && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDetailsRisk(risk)}
                                    className="h-7 px-2 text-[10px]"
                                  >
                                    Details
                                  </Button>
                                )}
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
                                    {!(mode === 'run' && risk.is_template_risk) && !riskFocusRunRow && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteRisk(risk)}
                                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                        })}
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
                <Label htmlFor="risk">What could go wrong? *</Label>
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
                  <Label htmlFor="likelihood">How likely?</Label>
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
                <p className="text-sm font-medium text-foreground">What happens if it does?</p>
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
              </div>

              <div className="space-y-3">
                <Label htmlFor="mitigation">What can we do to prevent it?</Label>
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
                        setFormData(prev => ({
                          ...prev,
                          mitigation_actions: [
                            ...(prev.mitigation_actions || []),
                            { action: '', benefit: '' }
                          ]
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

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about this risk..."
                  rows={3}
                />
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
              <SheetDescription>
                Notes and impact breakdown for this risk.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 flex-1 space-y-5">
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  What could go wrong?
                </h4>
                <p className="mt-1.5 text-sm leading-relaxed">{detailsRisk.risk}</p>
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
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</h4>
                <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {detailsRisk.notes?.trim() ? detailsRisk.notes : '—'}
                </p>
              </section>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
    </>
  );
}

