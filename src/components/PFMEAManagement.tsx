import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2, FileText, Info, Plus, Scale, Target, Trash2 } from 'lucide-react';
import { PfmeaScoringCriteriaDialog } from '@/components/PfmeaScoringCriteriaDialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Output } from '@/interfaces/Project';

// Database types for PFMEA
interface DatabaseProject {
  id: string;
  name: string;
  description: string;
  phases: any;
  [key: string]: any;
}

/** Catalog project used for PFMEA (requirements are derived from operation_steps.outputs). */
interface PfmeaTemplateContext {
  project_id: string;
  name: string;
  description?: string;
  publish_status?: 'draft' | 'beta-testing' | 'published' | 'archived' | string | null;
}

interface PFMEARequirement {
  id: string;
  project_id: string;
  project_phase_id: string;
  phase_operation_id: string;
  operation_step_id: string;
  requirement_text: string;
  output_reference: { output_id: string | null; output_index: number };
  display_order: number;
  project_phases?: {
    id: string;
    name: string;
    position_rule?: string | null;
    position_value?: number | null;
  } | null;
  phase_operations?: { id: string; operation_name: string; display_order: number } | null;
  operation_steps?: { id: string; step_title: string; display_order: number; description?: string | null; outputs?: unknown } | null;
}

interface PFMEAFailureMode {
  id: string;
  project_id: string;
  operation_step_id: string;
  requirement_output_id: string;
  failure_mode: string;
  severity_score: number;
  pfmea_potential_effects: PFMEAPotentialEffect[];
  pfmea_potential_causes: PFMEAPotentialCause[];
  pfmea_controls: PFMEAControl[];
  pfmea_action_items: PFMEAActionItem[];
}

interface PFMEAPotentialEffect {
  id: string;
  failure_mode_id: string;
  effect_description: string;
  severity_score: number;
}

interface PFMEAPotentialCause {
  id: string;
  failure_mode_id: string;
  cause_description: string;
  occurrence_score: number;
}

interface PFMEAControl {
  id: string;
  failure_mode_id?: string;
  cause_id?: string;
  control_type: string;
  control_description: string;
  detection_score?: number;
}

interface PFMEAActionItem {
  id: string;
  failure_mode_id: string;
  recommended_action: string;
  responsible_person?: string;
  target_completion_date?: string;
  status: string;
  completion_notes?: string;
}

/** Highest severity from listed effects; if none, use failure mode row severity (explicit DB field). */
function maxPfmeaSeverityForFailureMode(fm: PFMEAFailureMode): number {
  if (fm.pfmea_potential_effects.length > 0) {
    return Math.max(...fm.pfmea_potential_effects.map((e) => e.severity_score));
  }
  return fm.severity_score;
}

type PfmeaNavColumn =
  | 'requirements'
  | 'failure_mode'
  | 'effects'
  | 's'
  | 'causes'
  | 'prevention_controls'
  | 'o'
  | 'detection_controls'
  | 'd'
  | 'rpn'
  | 'ap'
  | 'recommended_actions';

const PFMEA_NAV_COLS: PfmeaNavColumn[] = [
  'requirements',
  'failure_mode',
  'effects',
  's',
  'causes',
  'prevention_controls',
  'o',
  'detection_controls',
  'd',
  'rpn',
  'ap',
  'recommended_actions',
];

interface PFMEAManagementProps {
  projectId?: string;
  /** Increment (e.g. after Process Map closes) to re-sync requirements from workflow and reload PFMEA. */
  refreshTrigger?: number;
}

type PfmeaLineDeleteTarget =
  | {
      kind: 'failure_mode' | 'effect' | 'cause' | 'control' | 'action';
      id: string;
      title: string;
      description: string;
    }
  | {
      kind: 'requirement_output';
      requirement: PFMEARequirement;
      title: string;
      description: string;
    };

function requirementPhaseName(r: PFMEARequirement): string {
  return r.project_phases?.name ?? '—';
}

function requirementOperationName(r: PFMEARequirement): string {
  return r.phase_operations?.operation_name ?? '—';
}

function requirementStepName(r: PFMEARequirement): string {
  return r.operation_steps?.step_title ?? '—';
}

function parseStepOutputs(raw: unknown): Output[] {
  if (!Array.isArray(raw)) return [];
  const valid: Output[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const output = item as Partial<Output>;
    if (typeof output.name !== 'string') continue;
    const trimmedName = output.name.trim();
    if (!trimmedName) continue;
    valid.push({
      ...output,
      name: trimmedName,
    } as Output);
  }
  return valid;
}

function requirementOutputKey(requirement: PFMEARequirement): string {
  const outputId = requirement.output_reference.output_id;
  if (outputId) return outputId;
  return `index:${requirement.output_reference.output_index}`;
}

function phasePositionSortKey(phase: PFMEARequirement['project_phases']): number {
  if (!phase) return Number.MAX_SAFE_INTEGER;
  if (phase.position_rule === 'last') return Number.MAX_SAFE_INTEGER - 1;
  if (phase.position_rule === 'nth' && typeof phase.position_value === 'number') return phase.position_value;
  return Number.MAX_SAFE_INTEGER;
}

export const PFMEAManagement: React.FC<PFMEAManagementProps> = ({ projectId, refreshTrigger }) => {
  const [pfmeaTemplates, setPfmeaTemplates] = useState<PfmeaTemplateContext[]>([]);
  const [selectedPfmeaProject, setSelectedPfmeaProject] = useState<PfmeaTemplateContext | null>(null);
  const [projects, setProjects] = useState<DatabaseProject[]>([]);
  const [requirements, setRequirements] = useState<PFMEARequirement[]>([]);
  const [failureModes, setFailureModes] = useState<PFMEAFailureMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{
    entityId: string;
    column: string;
    type: string;
    rowIndex: number;
  } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [addOutputDialogStepId, setAddOutputDialogStepId] = useState<string | null>(null);
  const [addOutputName, setAddOutputName] = useState('');
  const [currentTab, setCurrentTab] = useState('overview');
  const [pfmeaColVisibility, setPfmeaColVisibility] = useState({
    phase: true,
    operation: true,
    step: true,
    step_description: false,
  });
  const [colWidths, setColWidths] = useState<Record<string, number>>({
    phase: 120,
    operation: 140,
    step: 120,
    step_description: 260,
    requirements: 220,
    failure_mode: 220,
    effects: 260,
    s: 64,
    causes: 240,
    prevention_controls: 230,
    o: 64,
    detection_controls: 230,
    d: 64,
    rpn: 80,
    ap: 120,
    recommended_actions: 260,
  });
  const [gridFocus, setGridFocus] = useState<{ rowIndex: number; col: PfmeaNavColumn }>({
    rowIndex: 0,
    col: 'failure_mode',
  });
  const [pfmeaLineDeleteTarget, setPfmeaLineDeleteTarget] = useState<PfmeaLineDeleteTarget | null>(null);
  const [pfmeaDeletePending, setPfmeaDeletePending] = useState(false);
  const [pfmeaScoringCriteriaOpen, setPfmeaScoringCriteriaOpen] = useState(false);
  const pfmeaIsEditable = selectedPfmeaProject?.publish_status === 'draft';

  type PfmeaSortKey =
    | 'default'
    | 'phase'
    | 'operation'
    | 'step'
    | 'step_description'
    | 'requirement'
    | 'failure_mode'
    | 'severity'
    | 'cause'
    | 'occurrence'
    | 'prevention_controls'
    | 'detection_controls'
    | 'detection'
    | 'rpn'
    | 'ap'
    | 'recommended_actions';

  const [pfmeaSort, setPfmeaSort] = useState<{ key: PfmeaSortKey; dir: 'asc' | 'desc' }>({
    key: 'default',
    dir: 'asc',
  });

  useEffect(() => {
    void fetchData();
  }, []);

  const fetchPfmeaDetails = useCallback(async (templateProjectId: string) => {
    try {
      const { data: phaseRows, error: phaseError } = await supabase
        .from('project_phases')
        .select(
          `
          id,
          name,
          position_rule,
          position_value,
          phase_operations (
            id,
            operation_name,
            display_order,
            operation_steps (
              id,
              step_title,
              display_order,
              description,
              outputs
            )
          )
        `
        )
        .eq('project_id', templateProjectId);

      if (phaseError) throw phaseError;

      const rows: PFMEARequirement[] = [];
      const sortedPhases = [...(phaseRows ?? [])].sort((a, b) => {
        const aKey =
          a.position_rule === 'last'
            ? Number.MAX_SAFE_INTEGER - 1
            : a.position_rule === 'nth' && typeof a.position_value === 'number'
              ? a.position_value
              : Number.MAX_SAFE_INTEGER;
        const bKey =
          b.position_rule === 'last'
            ? Number.MAX_SAFE_INTEGER - 1
            : b.position_rule === 'nth' && typeof b.position_value === 'number'
              ? b.position_value
              : Number.MAX_SAFE_INTEGER;
        return aKey - bKey;
      });
      for (const phase of sortedPhases) {
        const operations = Array.isArray(phase.phase_operations) ? [...phase.phase_operations] : [];
        operations.sort((a, b) => (a.display_order ?? Number.MAX_SAFE_INTEGER) - (b.display_order ?? Number.MAX_SAFE_INTEGER));
        for (const operation of operations) {
          const steps = Array.isArray(operation.operation_steps) ? [...operation.operation_steps] : [];
          steps.sort((a, b) => (a.display_order ?? Number.MAX_SAFE_INTEGER) - (b.display_order ?? Number.MAX_SAFE_INTEGER));
          for (const step of steps) {
            const outputs = parseStepOutputs(step.outputs);
            for (let outputIndex = 0; outputIndex < outputs.length; outputIndex += 1) {
              const output = outputs[outputIndex];
              rows.push({
                id: `${step.id}::${output.id ?? `index:${outputIndex}`}`,
                project_id: templateProjectId,
                project_phase_id: phase.id,
                phase_operation_id: operation.id,
                operation_step_id: step.id,
                requirement_text: output.name,
                output_reference: {
                  output_id: output.id ?? null,
                  output_index: outputIndex,
                },
                display_order: outputIndex,
                project_phases: {
                  id: phase.id,
                  name: phase.name,
                  position_rule: phase.position_rule,
                  position_value: phase.position_value,
                },
                phase_operations: {
                  id: operation.id,
                  operation_name: operation.operation_name,
                  display_order: operation.display_order,
                },
                operation_steps: {
                  id: step.id,
                  step_title: step.step_title,
                  display_order: step.display_order,
                  description: step.description,
                  outputs: step.outputs,
                },
              });
            }
          }
        }
      }
      setRequirements(rows);

      if (rows.length === 0) {
        setFailureModes([]);
        return;
      }

      const { data: fmData, error: fmError } = await supabase
        .from('pfmea_failure_modes')
        .select(
          `
          *,
          pfmea_potential_effects(*),
          pfmea_potential_causes(*),
          pfmea_controls(*),
          pfmea_action_items(*)
        `
        )
        .eq('project_id', templateProjectId);

      if (fmError) throw fmError;
      setFailureModes((fmData ?? []) as PFMEAFailureMode[]);
    } catch (error) {
      console.error('Error fetching PFMEA details:', error);
      toast.error('Failed to load PFMEA details');
    }
  }, []);

  useEffect(() => {
    if (refreshTrigger === undefined || refreshTrigger < 1 || !projectId) return;
    void (async () => {
      await fetchPfmeaDetails(projectId);
    })();
  }, [refreshTrigger, projectId, fetchPfmeaDetails]);

  const persistEffectSeverity = useCallback(
    async (effectId: string, scoreStr: string) => {
      if (!pfmeaIsEditable) {
        toast.error('PFMEA is locked. Switch this revision to draft to edit.');
        return;
      }
      try {
        const { error } = await supabase
          .from('pfmea_potential_effects')
          .update({ severity_score: parseInt(scoreStr, 10) })
          .eq('id', effectId);
        if (error) throw error;
        if (selectedPfmeaProject) {
          await fetchPfmeaDetails(selectedPfmeaProject.project_id);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to update severity');
      }
    },
    [selectedPfmeaProject, fetchPfmeaDetails, pfmeaIsEditable]
  );

  const executePfmeaLineDelete = useCallback(async () => {
    if (!pfmeaLineDeleteTarget || !selectedPfmeaProject) return;
    if (!pfmeaIsEditable) {
      toast.error('PFMEA is locked. Switch this revision to draft to edit.');
      return;
    }
    if (pfmeaLineDeleteTarget.kind === 'requirement_output') {
      const req = pfmeaLineDeleteTarget.requirement;
      const outputKey = requirementOutputKey(req);
      setPfmeaDeletePending(true);
      try {
        const { error: fmErr } = await supabase
          .from('pfmea_failure_modes')
          .delete()
          .eq('operation_step_id', req.operation_step_id)
          .eq('requirement_output_id', outputKey);
        if (fmErr) throw fmErr;

        const { data: stepRow, error: stepErr } = await supabase
          .from('operation_steps')
          .select('id, outputs')
          .eq('id', req.operation_step_id)
          .single();
        if (stepErr) throw stepErr;

        const outputs = parseStepOutputs(stepRow?.outputs);
        const ref = req.output_reference;
        let next: Output[];
        if (ref.output_id) {
          next = outputs.filter((o) => String(o.id) !== String(ref.output_id));
        } else {
          const idx = ref.output_index;
          if (idx < 0 || idx >= outputs.length) {
            throw new Error('Output index out of range for this step');
          }
          next = outputs.filter((_, i) => i !== idx);
        }

        const { error: upErr } = await supabase
          .from('operation_steps')
          .update({ outputs: next })
          .eq('id', req.operation_step_id);
        if (upErr) throw upErr;

        await fetchPfmeaDetails(selectedPfmeaProject.project_id);
        toast.success('Output removed');
        setPfmeaLineDeleteTarget(null);
      } catch (err) {
        console.error(err);
        toast.error('Failed to remove output');
      } finally {
        setPfmeaDeletePending(false);
      }
      return;
    }

    const { kind, id } = pfmeaLineDeleteTarget;
    const table =
      kind === 'failure_mode'
        ? 'pfmea_failure_modes'
        : kind === 'effect'
          ? 'pfmea_potential_effects'
          : kind === 'cause'
            ? 'pfmea_potential_causes'
            : kind === 'control'
              ? 'pfmea_controls'
              : 'pfmea_action_items';
    setPfmeaDeletePending(true);
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      await fetchPfmeaDetails(selectedPfmeaProject.project_id);
      toast.success('Removed');
      setPfmeaLineDeleteTarget(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete');
    } finally {
      setPfmeaDeletePending(false);
    }
  }, [pfmeaLineDeleteTarget, selectedPfmeaProject, fetchPfmeaDetails, pfmeaIsEditable]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: projectsData } = await supabase.from('projects').select('*').order('name');

      if (projectsData) {
        setProjects(projectsData);
      }

      const { data: projectRows, error: projectsErr } = await supabase
        .from('projects')
        .select('id, name, description, publish_status')
        .order('name', { ascending: true });

      if (projectsErr) {
        console.error('PFMEA projects load error:', projectsErr);
        toast.error(projectsErr.message || 'Failed to load projects');
        setPfmeaTemplates([]);
      } else {
        const mapped: PfmeaTemplateContext[] = (projectRows ?? []).map((row) => ({
          project_id: row.id,
          name: row.name ?? 'Unknown project',
          description: row.description ?? undefined,
          publish_status: row.publish_status ?? null,
        }));
        setPfmeaTemplates(mapped);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load PFMEA data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId || loading) return;

    const run = async () => {
      const nameFromList = pfmeaTemplates.find((t) => t.project_id === projectId)?.name;
      const nameFromProjects = projects.find((p) => p.id === projectId)?.name;
      const publishFromList = pfmeaTemplates.find((t) => t.project_id === projectId)?.publish_status ?? null;
      const publishFromProjects = (projects.find((p) => p.id === projectId) as { publish_status?: string | null } | undefined)
        ?.publish_status ?? null;
      setSelectedPfmeaProject({
        project_id: projectId,
        name: nameFromList ?? nameFromProjects ?? 'Project',
        description: projects.find((p) => p.id === projectId)?.description,
        publish_status: publishFromList ?? publishFromProjects,
      });

      await fetchPfmeaDetails(projectId);
    };

    void run();
  }, [projectId, loading, pfmeaTemplates, projects, fetchPfmeaDetails]);

  const addFailureMode = async (requirement: PFMEARequirement) => {
    if (!pfmeaIsEditable) {
      toast.error('PFMEA is locked. Switch this revision to draft to edit.');
      return;
    }
    try {
      const { error } = await supabase
        .from('pfmea_failure_modes')
        .insert({
          project_id: requirement.project_id,
          operation_step_id: requirement.operation_step_id,
          requirement_output_id: requirementOutputKey(requirement),
          failure_mode: 'New Failure Mode',
          severity_score: 5
        });

      if (error) throw error;
      
      if (selectedPfmeaProject) {
        await fetchPfmeaDetails(selectedPfmeaProject.project_id);
      }
      toast.success('Failure mode added');
    } catch (error) {
      console.error('Error adding failure mode:', error);
      toast.error('Failed to add failure mode');
    }
  };

  const calculateRPN = (failureMode: PFMEAFailureMode, cause: PFMEAPotentialCause | null): number => {
    const severity = failureMode.severity_score;
    const occurrence = cause?.occurrence_score ?? 10;
    const detectionScores = failureMode.pfmea_controls
      .filter((c) => c.control_type === 'detection' && c.detection_score != null)
      .map((c) => c.detection_score!);
    const minDetection =
      detectionScores.length > 0 ? Math.min(...detectionScores, 10) : 10;

    return Math.round(severity * occurrence * minDetection);
  };

  // AIAG-VDA Action Priority (AP): High / Medium / Low based on the S/O/D decision table.
  const calculateActionPriority = (failureMode: PFMEAFailureMode): 'H' | 'M' | 'L' => {
    const s = Math.round(maxPfmeaSeverityForFailureMode(failureMode));

    const avgOccurrence = failureMode.pfmea_potential_causes.length > 0
      ? failureMode.pfmea_potential_causes.reduce((sum, c) => sum + c.occurrence_score, 0) / failureMode.pfmea_potential_causes.length
      : 10;
    const o = Math.round(avgOccurrence);

    const detectionScores = failureMode.pfmea_controls
      .filter((c) => c.control_type === 'detection' && c.detection_score != null)
      .map((c) => c.detection_score!);
    const d = detectionScores.length > 0 ? Math.min(...detectionScores) : 10;

    // Severity bands
    if (s >= 9) {
      // O: 8-10 => H, 6-7 => H, 4-5 => (D=1 -> M else H), 2-3 => (D>=7 -> H, D>=5 -> M, else L), O=1 => L
      if (o >= 8) return 'H';
      if (o >= 6) return 'H';
      if (o >= 4) return d === 1 ? 'M' : 'H';
      if (o >= 2) return d >= 7 ? 'H' : d >= 5 ? 'M' : 'L';
      return 'L';
    }

    if (s >= 7) {
      // O: 8-10 => H, 6-7 => (D=1 -> M else H), 4-5 => (D>=7 -> H else M), 2-3 => (D>=5 -> M else L), O=1 => L
      if (o >= 8) return 'H';
      if (o >= 6) return d === 1 ? 'M' : 'H';
      if (o >= 4) return d >= 7 ? 'H' : 'M';
      if (o >= 2) return d >= 5 ? 'M' : 'L';
      return 'L';
    }

    if (s >= 4) {
      // O: 8-10 => (D>=5 -> H else M), 6-7 => (D=1 -> L else M), 4-5 => (D>=7 -> M else L), 2-3 => L, O=1 => L
      if (o >= 8) return d >= 5 ? 'H' : 'M';
      if (o >= 6) return d === 1 ? 'L' : 'M';
      if (o >= 4) return d >= 7 ? 'M' : 'L';
      return 'L';
    }

    if (s >= 2) {
      // O: 8-10 => (D>=5 -> M else L), else => L
      if (o >= 8) return d >= 5 ? 'M' : 'L';
      return 'L';
    }

    return 'L';
  };

  const getActionPriorityRowClass = (ap: 'H' | 'M' | 'L'): string => {
    if (ap === 'H') return 'bg-red-50';
    if (ap === 'M') return 'bg-orange-50';
    return 'bg-green-50';
  };

  const getActionPriorityBadgeClasses = (ap: 'H' | 'M' | 'L'): string => {
    if (ap === 'H') return 'border-red-500 text-red-700';
    if (ap === 'M') return 'border-orange-500 text-orange-700';
    return 'border-green-500 text-green-700';
  };

  const getAllActionItems = () => {
    return failureModes.flatMap(failureMode => 
      failureMode.pfmea_action_items.map(action => ({
        ...action,
        failureMode
      }))
    );
  };

  // Editing functions for inline editing (rowIndex disambiguates the same entity shown on multiple PFMEA rows)
  const startEdit = (rowIndex: number, entityId: string, column: string, type: string, currentValue: string) => {
    if (!pfmeaIsEditable) {
      toast.error('PFMEA is locked. Switch this revision to draft to edit.');
      return;
    }
    setEditingCell({ entityId, column, type, rowIndex });
    setEditingValue(currentValue);
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditingValue('');
  };

  const saveEdit = async () => {
    if (!editingCell) return;

    try {
      const { entityId, column, type } = editingCell;

      // Update based on type
      if (type === 'failure_mode') {
        await supabase
          .from('pfmea_failure_modes')
          .update({ failure_mode: editingValue })
          .eq('id', entityId);
      } else if (type === 'effect') {
        await supabase
          .from('pfmea_potential_effects')
          .update({ effect_description: editingValue })
          .eq('id', entityId);
      } else if (type === 'effect_severity') {
        await supabase
          .from('pfmea_potential_effects')
          .update({ severity_score: parseInt(editingValue) })
          .eq('id', entityId);
      } else if (type === 'cause') {
        await supabase
          .from('pfmea_potential_causes')
          .update({ cause_description: editingValue })
          .eq('id', entityId);
      } else if (type === 'cause_occurrence') {
        await supabase
          .from('pfmea_potential_causes')
          .update({ occurrence_score: parseInt(editingValue) })
          .eq('id', entityId);
      } else if (type === 'control') {
        await supabase
          .from('pfmea_controls')
          .update({ control_description: editingValue })
          .eq('id', entityId);
      } else if (type === 'control_detection') {
        await supabase
          .from('pfmea_controls')
          .update({ detection_score: parseInt(editingValue) })
          .eq('id', entityId);
      } else if (type === 'action') {
        await supabase
          .from('pfmea_action_items')
          .update({ recommended_action: editingValue })
          .eq('id', entityId);
      }

      // Refresh data
      if (selectedPfmeaProject) {
        await fetchPfmeaDetails(selectedPfmeaProject.project_id);
      }
      
      cancelEdit();
      toast.success('Updated successfully');
    } catch (error) {
      console.error('Error saving edit:', error);
      toast.error('Failed to save changes');
    }
  };

  const renderEditableCell = (
    rowIndex: number,
    value: string,
    rowId: string,
    column: string,
    type: string,
    isDropdown = false,
    opts?: {
      fullWidth?: boolean;
      editFooter?: {
        addLabel: string;
        onAdd: () => void | Promise<void>;
        onDelete: () => void;
      };
    }
  ) => {
    const isEditing =
      editingCell?.entityId === rowId && editingCell?.column === column && editingCell?.rowIndex === rowIndex;
    const fw = opts?.fullWidth;
    const footer = opts?.editFooter;

    if (isEditing) {
      if (isDropdown) {
        return (
          <Select
            value={editingValue}
            onValueChange={(newValue) => {
              setEditingValue(newValue);
              setTimeout(() => void saveEdit(), 0);
            }}
            onOpenChange={(open) => {
              if (!open && editingValue !== value) {
                void saveEdit();
              }
            }}
          >
            <SelectTrigger className={cn('h-8', fw && 'w-full min-w-0')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  {num}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      return (
        <div
          className={cn(
            'flex w-full flex-col overflow-hidden rounded-none border border-input bg-background -m-1',
            footer ? 'min-h-[140px]' : 'min-h-24',
            fw && 'min-w-0'
          )}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Textarea
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') cancelEdit();
            }}
            onBlur={() => void saveEdit()}
            className="min-h-0 flex-1 resize-none rounded-none border-0 px-2 py-2 text-sm shadow-none ring-offset-0 focus-visible:ring-1 focus-visible:ring-ring"
            autoFocus
          />
          {footer ? (
            <div className="flex shrink-0 items-stretch border-t border-border bg-muted/40">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 min-h-0 flex-1 justify-start gap-1 rounded-none border-0 border-r border-border px-2 py-0 text-xs font-normal leading-none text-foreground shadow-none ring-offset-0 hover:!bg-muted/30 hover:!text-foreground hover:font-semibold focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                disabled={!pfmeaIsEditable}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  void (async () => {
                    await saveEdit();
                    await Promise.resolve(footer.onAdd());
                  })();
                }}
              >
                <Plus className="h-3 w-3 shrink-0" />
                {footer.addLabel}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 rounded-none border-0 text-muted-foreground shadow-none ring-offset-0 hover:!bg-muted/30 hover:!text-destructive hover:font-semibold focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                disabled={!pfmeaIsEditable}
                title="Delete line"
                aria-label="Delete line"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  cancelEdit();
                  footer.onDelete();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div
        className={cn(
          'cursor-pointer rounded-sm hover:bg-muted/40',
          fw ? 'min-h-[22px] w-full min-w-0 py-0.5' : 'min-h-[22px] p-0.5'
        )}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => startEdit(rowIndex, rowId, column, type, value)}
      >
        {value ? (
          <span className={cn('text-sm', fw && 'block w-full min-w-0 whitespace-pre-wrap break-words')}>{value}</span>
        ) : (
          <span className="text-muted-foreground italic text-sm">Click to edit</span>
        )}
      </div>
    );
  };

  const renderEffectSeverityInParens = (effect: PFMEAPotentialEffect) => (
    <Select value={String(effect.severity_score)} onValueChange={(v) => void persistEffectSeverity(effect.id, v)}>
      <SelectTrigger
        className="inline-flex h-auto w-auto min-h-0 items-baseline gap-0 border-0 bg-transparent p-0 text-sm font-semibold text-muted-foreground shadow-none ring-0 ring-offset-0 hover:bg-muted/50 hover:text-foreground focus:ring-1 focus:ring-ring data-[state=open]:bg-muted/50 [&_svg]:hidden [&>span]:line-clamp-none"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        title="Change severity (1–10)"
      >
        <SelectValue>
          <span className="tabular-nums">({effect.severity_score})</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
          <SelectItem key={num} value={String(num)}>
            {num}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const updateFailureModeSeverity = useCallback(
    async (failureModeId: string, score: string) => {
      if (!pfmeaIsEditable) return;
      const parsed = parseInt(score, 10);
      if (Number.isNaN(parsed)) return;
      const { error } = await supabase
        .from('pfmea_failure_modes')
        .update({ severity_score: parsed })
        .eq('id', failureModeId);
      if (error) {
        toast.error('Failed to update severity');
        return;
      }
      if (selectedPfmeaProject) await fetchPfmeaDetails(selectedPfmeaProject.project_id);
    },
    [pfmeaIsEditable, selectedPfmeaProject, fetchPfmeaDetails]
  );

  const updateCauseOccurrence = useCallback(
    async (causeId: string, score: string) => {
      if (!pfmeaIsEditable) return;
      const parsed = parseInt(score, 10);
      if (Number.isNaN(parsed)) return;
      const { error } = await supabase
        .from('pfmea_potential_causes')
        .update({ occurrence_score: parsed })
        .eq('id', causeId);
      if (error) {
        toast.error('Failed to update occurrence');
        return;
      }
      if (selectedPfmeaProject) await fetchPfmeaDetails(selectedPfmeaProject.project_id);
    },
    [pfmeaIsEditable, selectedPfmeaProject, fetchPfmeaDetails]
  );

  const updateDetectionScoreForRow = useCallback(
    async (failureMode: PFMEAFailureMode, score: string) => {
      if (!pfmeaIsEditable) return;
      const parsed = parseInt(score, 10);
      if (Number.isNaN(parsed)) return;
      const detectionControls = failureMode.pfmea_controls.filter((c) => c.control_type === 'detection');
      if (detectionControls.length === 0) {
        toast.error('Add a detection control first');
        return;
      }
      const ids = detectionControls.map((c) => c.id);
      const { error } = await supabase
        .from('pfmea_controls')
        .update({ detection_score: parsed })
        .in('id', ids);
      if (error) {
        toast.error('Failed to update detection');
        return;
      }
      if (selectedPfmeaProject) await fetchPfmeaDetails(selectedPfmeaProject.project_id);
    },
    [pfmeaIsEditable, selectedPfmeaProject, fetchPfmeaDetails]
  );

  const renderScoreCell = (
    value: number | null,
    onChange?: (value: string) => void
  ) => {
    if (value == null) return '';
    if (!onChange || !pfmeaIsEditable) {
      return (
        <div className="flex h-full min-h-8 w-full items-center justify-center text-sm font-bold tabular-nums text-foreground">
          {value}
        </div>
      );
    }
    return (
      <Select value={String(value)} onValueChange={onChange}>
        <SelectTrigger
          className={cn(
            'box-border h-full min-h-8 w-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 text-center text-sm font-bold tabular-nums text-foreground shadow-none',
            'flex items-center justify-center ring-0 ring-offset-0 focus:ring-2 focus:ring-ring focus:ring-offset-0 focus-visible:rounded-none',
            'hover:bg-muted/40 data-[state=open]:bg-muted/40 [&_svg]:hidden'
          )}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
            <SelectItem key={num} value={String(num)}>
              {num}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const addPotentialEffect = async (failureModeId: string) => {
    if (!pfmeaIsEditable) {
      toast.error('PFMEA is locked. Switch this revision to draft to edit.');
      return;
    }
    try {
      const { error } = await supabase
        .from('pfmea_potential_effects')
        .insert({
          failure_mode_id: failureModeId,
          effect_description: 'New potential effect',
          severity_score: 5
        });

      if (error) throw error;

      toast.success('Potential effect added successfully');
      if (selectedPfmeaProject) fetchPfmeaDetails(selectedPfmeaProject.project_id);
    } catch (error) {
      console.error('Error adding potential effect:', error);
      toast.error('Failed to add potential effect');
    }
  };

  const addPotentialCause = async (failureModeId: string) => {
    if (!pfmeaIsEditable) {
      toast.error('PFMEA is locked. Switch this revision to draft to edit.');
      return;
    }
    try {
      const { error } = await supabase
        .from('pfmea_potential_causes')
        .insert({
          failure_mode_id: failureModeId,
          cause_description: 'New potential cause',
          occurrence_score: 5
        });

      if (error) throw error;

      toast.success('Potential cause added successfully');
      if (selectedPfmeaProject) fetchPfmeaDetails(selectedPfmeaProject.project_id);
    } catch (error) {
      console.error('Error adding potential cause:', error);
      toast.error('Failed to add potential cause');
    }
  };

  const addControl = async (
    failureModeId: string,
    controlType: 'prevention' | 'detection',
    causeId?: string
  ) => {
    if (!pfmeaIsEditable) {
      toast.error('PFMEA is locked. Switch this revision to draft to edit.');
      return;
    }
    try {
      const { error } = await supabase
        .from('pfmea_controls')
        .insert({
          failure_mode_id: failureModeId,
          cause_id: controlType === 'prevention' ? causeId ?? null : null,
          control_type: controlType,
          control_description: `New ${controlType} control`,
          detection_score: controlType === 'detection' ? 5 : null
        });

      if (error) throw error;

      toast.success(`${controlType} control added successfully`);
      if (selectedPfmeaProject) fetchPfmeaDetails(selectedPfmeaProject.project_id);
    } catch (error) {
      console.error(`Error adding ${controlType} control:`, error);
      toast.error(`Failed to add ${controlType} control`);
    }
  };

  const addActionItem = async (failureModeId: string) => {
    if (!pfmeaIsEditable) {
      toast.error('PFMEA is locked. Switch this revision to draft to edit.');
      return;
    }
    try {
      const { error } = await supabase
        .from('pfmea_action_items')
        .insert({
          failure_mode_id: failureModeId,
          recommended_action: 'New recommended action',
          status: 'not_started'
        });

      if (error) throw error;

      toast.success('Action item added successfully');
      if (selectedPfmeaProject) fetchPfmeaDetails(selectedPfmeaProject.project_id);
    } catch (error) {
      console.error('Error adding action item:', error);
      toast.error('Failed to add action item');
    }
  };

  const openAddOutputDialog = useCallback((operationStepId: string) => {
    if (!pfmeaIsEditable) {
      toast.error('PFMEA is locked. Switch this revision to draft to edit.');
      return;
    }
    setAddOutputDialogStepId(operationStepId);
    setAddOutputName('');
  }, [pfmeaIsEditable]);

  const submitAddOutput = useCallback(async () => {
    if (!addOutputDialogStepId) return;
    if (!pfmeaIsEditable) {
      toast.error('PFMEA is locked. Switch this revision to draft to edit.');
      return;
    }
    const name = addOutputName.trim();
    if (!name) {
      toast.error('Enter a name for the output');
      return;
    }

    const operationStepId = addOutputDialogStepId;

    try {
      const { data: stepRow, error: stepErr } = await supabase
        .from('operation_steps')
        .select('id, outputs')
        .eq('id', operationStepId)
        .single();
      if (stepErr) throw stepErr;

      const existing = (stepRow?.outputs ?? null) as unknown;
      const outputs: Output[] = Array.isArray(existing) ? (existing as Output[]) : [];

      const next: Output[] = [
        ...outputs,
        {
          id: `output-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name,
          description: '',
          type: 'none',
        },
      ];

      const { error: updateErr } = await supabase
        .from('operation_steps')
        .update({ outputs: next })
        .eq('id', operationStepId);
      if (updateErr) throw updateErr;

      setAddOutputDialogStepId(null);
      setAddOutputName('');

      if (selectedPfmeaProject) {
        await fetchPfmeaDetails(selectedPfmeaProject.project_id);
      }
      toast.success('Output added');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add output');
    }
  }, [addOutputDialogStepId, addOutputName, pfmeaIsEditable, selectedPfmeaProject, fetchPfmeaDetails]);

  type PfmeaFlatRow = {
    requirement: PFMEARequirement;
    failureMode: PFMEAFailureMode | null;
    cause: PFMEAPotentialCause | null;
  };

  const pfmeaFlatRows: PfmeaFlatRow[] = useMemo(() => {
    const out: PfmeaFlatRow[] = [];
    for (const requirement of requirements) {
      const outputKey = requirementOutputKey(requirement);
      const reqFms = failureModes.filter(
        (fm) =>
          fm.operation_step_id === requirement.operation_step_id &&
          fm.requirement_output_id === outputKey
      );
      if (reqFms.length === 0) {
        out.push({ requirement, failureMode: null, cause: null });
        continue;
      }

      for (const fm of reqFms) {
        const causes = fm.pfmea_potential_causes ?? [];
        if (causes.length === 0) {
          out.push({ requirement, failureMode: fm, cause: null });
          continue;
        }
        for (const cause of causes) {
          out.push({ requirement, failureMode: fm, cause });
        }
      }
    }
    return out;
  }, [requirements, failureModes]);

  const sortedPfmeaRows: PfmeaFlatRow[] = useMemo(() => {
    const rows = [...pfmeaFlatRows];

    const cmpText = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });
    const phase = (r: PfmeaFlatRow) => requirementPhaseName(r.requirement);
    const op = (r: PfmeaFlatRow) => requirementOperationName(r.requirement);
    const step = (r: PfmeaFlatRow) => requirementStepName(r.requirement);
    const stepDesc = (r: PfmeaFlatRow) => r.requirement.operation_steps?.description ?? '';
    const req = (r: PfmeaFlatRow) => r.requirement.requirement_text ?? '';
    const phaseOrder = (r: PfmeaFlatRow) => phasePositionSortKey(r.requirement.project_phases);
    const opOrder = (r: PfmeaFlatRow) => r.requirement.phase_operations?.display_order;
    const stepOrder = (r: PfmeaFlatRow) => r.requirement.operation_steps?.display_order;
    const reqOrderInStep = (r: PfmeaFlatRow) => r.requirement.display_order;
    const fm = (r: PfmeaFlatRow) => r.failureMode?.failure_mode ?? '';
    const maxS = (r: PfmeaFlatRow) => (r.failureMode ? maxPfmeaSeverityForFailureMode(r.failureMode) : -1);
    const causeDesc = (r: PfmeaFlatRow) => r.cause?.cause_description ?? '';
    const occ = (r: PfmeaFlatRow) => (r.cause ? r.cause.occurrence_score : -1);
    const det = (r: PfmeaFlatRow) => {
      if (!r.failureMode) return -1;
      const scores = r.failureMode.pfmea_controls
        .filter((c) => c.control_type === 'detection' && c.detection_score != null)
        .map((c) => c.detection_score as number);
      return scores.length > 0 ? Math.min(...scores) : -1;
    };
    const rpn = (r: PfmeaFlatRow) => (r.failureMode ? calculateRPN(r.failureMode, r.cause) : -1);
    const ap = (r: PfmeaFlatRow) => (r.failureMode ? calculateActionPriority(r.failureMode) : 'L');

    const defaultComparator = (a: PfmeaFlatRow, b: PfmeaFlatRow) => {
      // Primary: Process Map flow order (NOT alphabetical).
      const pA = phaseOrder(a);
      const pB = phaseOrder(b);
      if (pA != null && pB != null && pA !== pB) return pA - pB;

      const oA = opOrder(a);
      const oB = opOrder(b);
      if (oA != null && oB != null && oA !== oB) return oA - oB;

      const sA = stepOrder(a);
      const sB = stepOrder(b);
      if (sA != null && sB != null && sA !== sB) return sA - sB;

      // Within a step: keep outputs in the synced order, then alphabetical as tie-break.
      const c0 = reqOrderInStep(a) - reqOrderInStep(b);
      if (c0 !== 0) return c0;
      const c1 = cmpText(req(a), req(b));
      if (c1 !== 0) return c1;
      // Within the same requirement, show higher-occurrence causes first.
      const c2 = occ(b) - occ(a);
      if (c2 !== 0) return c2;
      // Stable-ish tie breakers
      const c3 = cmpText(fm(a), fm(b));
      if (c3 !== 0) return c3;
      return cmpText(causeDesc(a), causeDesc(b));
    };

    const dirFactor = pfmeaSort.dir === 'asc' ? 1 : -1;

    rows.sort((a, b) => {
      if (pfmeaSort.key === 'default') return defaultComparator(a, b);
      switch (pfmeaSort.key) {
        case 'phase':
          return dirFactor * cmpText(phase(a), phase(b));
        case 'operation':
          return dirFactor * cmpText(op(a), op(b));
        case 'step':
          return dirFactor * cmpText(step(a), step(b));
        case 'step_description':
          return dirFactor * cmpText(stepDesc(a), stepDesc(b));
        case 'requirement':
          return dirFactor * cmpText(req(a), req(b));
        case 'failure_mode':
          return dirFactor * cmpText(fm(a), fm(b));
        case 'severity':
          return dirFactor * (maxS(a) - maxS(b));
        case 'cause':
          return dirFactor * cmpText(causeDesc(a), causeDesc(b));
        case 'occurrence':
          return dirFactor * (occ(a) - occ(b));
        case 'detection':
          return dirFactor * (det(a) - det(b));
        case 'rpn':
          return dirFactor * (rpn(a) - rpn(b));
        case 'ap':
          return dirFactor * cmpText(ap(a), ap(b));
        case 'prevention_controls':
        case 'detection_controls':
        case 'recommended_actions':
          // For multi-line cells, sort by the primary row text.
          return dirFactor * defaultComparator(a, b);
        default:
          return defaultComparator(a, b);
      }
    });

    return rows;
  }, [pfmeaFlatRows, pfmeaSort]);

  useEffect(() => {
    setGridFocus((f) => ({
      ...f,
      rowIndex: Math.min(f.rowIndex, Math.max(0, sortedPfmeaRows.length - 1)),
    }));
  }, [sortedPfmeaRows.length]);

  const handleColumnAdd = useCallback(
    (col: PfmeaNavColumn) => {
      const entry = sortedPfmeaRows[gridFocus.rowIndex];
      if (!entry) {
        toast.error('Select a row in the PFMEA table (click a cell or focus the table and use arrow keys).');
        return;
      }
      const { requirement, failureMode: fm, cause } = entry;
      switch (col) {
        case 'requirements':
          openAddOutputDialog(requirement.operation_step_id);
          return;
        case 'failure_mode':
          void addFailureMode(requirement);
          return;
        case 'effects':
        case 's':
          if (!fm) {
            toast.message('Add a failure mode first', { description: 'Select a requirement row, then add a Failure Mode.' });
            return;
          }
          void addPotentialEffect(fm.id);
          return;
        case 'causes':
        case 'o':
          if (!fm) {
            toast.message('Add a failure mode first', { description: 'Select a requirement row, then add a Failure Mode.' });
            return;
          }
          void addPotentialCause(fm.id);
          return;
        case 'prevention_controls':
          if (!fm) {
            toast.message('Add a failure mode first', { description: 'Select a requirement row, then add a Failure Mode.' });
            return;
          }
          if (!cause) {
            toast.message('Add a potential cause first', {
              description: 'Prevention controls are aligned to a specific cause row.',
            });
            return;
          }
          void addControl(fm.id, 'prevention', cause.id);
          return;
        case 'detection_controls':
        case 'd':
          if (!fm) {
            toast.message('Add a failure mode first', { description: 'Select a requirement row, then add a Failure Mode.' });
            return;
          }
          void addControl(fm.id, 'detection');
          return;
        case 'rpn':
        case 'ap':
          return;
        case 'recommended_actions':
          if (!fm) {
            toast.message('Add a failure mode first', { description: 'Select a requirement row, then add a Failure Mode.' });
            return;
          }
          void addActionItem(fm.id);
          return;
        default:
          return;
      }
    },
    [sortedPfmeaRows, gridFocus.rowIndex, openAddOutputDialog, addFailureMode]
  );

  const handlePfmeaGridKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (sortedPfmeaRows.length === 0) return;
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (el.closest('[data-radix-popper-content-wrapper]')) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setGridFocus((f) => ({
          ...f,
          rowIndex: Math.min(f.rowIndex + 1, sortedPfmeaRows.length - 1),
        }));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setGridFocus((f) => ({
          ...f,
          rowIndex: Math.max(f.rowIndex - 1, 0),
        }));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setGridFocus((f) => {
          const idx = PFMEA_NAV_COLS.indexOf(f.col);
          return { ...f, col: PFMEA_NAV_COLS[(idx + 1) % PFMEA_NAV_COLS.length] };
        });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setGridFocus((f) => {
          const idx = PFMEA_NAV_COLS.indexOf(f.col);
          return {
            ...f,
            col: PFMEA_NAV_COLS[(idx - 1 + PFMEA_NAV_COLS.length) % PFMEA_NAV_COLS.length],
          };
        });
      } else if (e.key === 'Home' && !e.ctrlKey) {
        e.preventDefault();
        setGridFocus((f) => ({ ...f, rowIndex: 0 }));
      } else if (e.key === 'End' && !e.ctrlKey) {
        e.preventDefault();
        setGridFocus((f) => ({ ...f, rowIndex: sortedPfmeaRows.length - 1 }));
      }
    },
    [sortedPfmeaRows.length]
  );

  const pfmeaGridCellMouseDown = useCallback((e: React.MouseEvent, rowIndex: number, col: PfmeaNavColumn) => {
    const t = e.target as HTMLElement;
    if (t.closest('input, textarea, button, a, [role="combobox"], [data-radix-collection-item]')) {
      return;
    }
    setGridFocus({ rowIndex, col });
  }, []);

  const pfmeaThSticky = 'sticky top-0 z-20 border-b shadow-sm';
  /** Column header bar colors (PFMEA table). `!text-white` overrides TableHead default `text-muted-foreground`. */
  const pfmeaHeaderBar = {
    structure: `${pfmeaThSticky} bg-[#0c2744] !text-white border-blue-950/60`,
    requirements: `${pfmeaThSticky} bg-yellow-300 text-yellow-950 border-yellow-500/70`,
    failure: `${pfmeaThSticky} bg-yellow-300 text-yellow-950 border-yellow-500/70`,
    effectSeverity: `${pfmeaThSticky} bg-[#722f37] text-white border-[#5c262e]`,
    causeOccurrence: `${pfmeaThSticky} bg-green-800 text-white border-green-950/70`,
    detectionPurple: `${pfmeaThSticky} bg-purple-800 text-white border-purple-950/80`,
    other: `${pfmeaThSticky} bg-slate-600 text-white border-slate-800`,
  } as const;

  const togglePfmeaSort = useCallback(
    (key: PfmeaSortKey, defaultDir: 'asc' | 'desc' = 'asc') => {
      setPfmeaSort((s) => {
        if (s.key !== key) return { key, dir: defaultDir };
        return { key, dir: s.dir === 'asc' ? 'desc' : 'asc' };
      });
    },
    []
  );

  const sortIcon = (key: PfmeaSortKey) => {
    if (pfmeaSort.key !== key) return <ArrowUpDown className="h-3.5 w-3.5" />;
    return pfmeaSort.dir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  };

  const startResize = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const initialWidth = colWidths[colKey] ?? 120;
    const onMove = (ev: MouseEvent) => {
      const next = Math.max(56, initialWidth + (ev.clientX - startX));
      setColWidths((prev) => ({ ...prev, [colKey]: next }));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const resizeHandle = (colKey: string, dark = true) => (
    <span
      role="separator"
      aria-orientation="vertical"
      onMouseDown={(e) => startResize(colKey, e)}
      className={cn(
        'absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none',
        dark ? 'hover:bg-white/30' : 'hover:bg-slate-400/60'
      )}
      title="Drag to resize column"
    />
  );

  const renderHeaderWithPlus = (
    label: string,
    col: PfmeaNavColumn,
    opts?: {
      derived?: boolean;
      barClassName: string;
      lightBar?: boolean;
      hidePlus?: boolean;
      sortKey?: PfmeaSortKey;
      sortDefaultDir?: 'asc' | 'desc';
    }
  ) => (
    <TableHead
      className={cn(opts?.barClassName ?? pfmeaHeaderBar.other, 'relative h-auto px-1 py-1 align-bottom')}
      style={{ width: `${colWidths[col]}px`, minWidth: `${colWidths[col]}px` }}
    >
      <div className="flex min-h-9 flex-col items-stretch justify-center gap-0.5 py-0.5">
        <div className="flex items-center justify-center gap-0.5">
          <span
            className={cn(
              'text-center text-xs font-medium leading-tight',
              opts?.lightBar ? 'text-amber-950' : 'text-white'
            )}
          >
            {label}
          </span>
          {opts?.sortKey ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                'h-7 w-7 shrink-0',
                opts?.lightBar ? 'text-amber-950 hover:bg-amber-950/15' : 'text-white hover:bg-white/15'
              )}
              title={`Sort by ${label}`}
              onClick={() => togglePfmeaSort(opts.sortKey!, opts.sortDefaultDir)}
            >
              {sortIcon(opts.sortKey)}
            </Button>
          ) : null}
          {opts?.hidePlus ? null : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                'h-7 w-7 shrink-0',
                opts?.lightBar ? 'text-amber-950 hover:bg-amber-950/15' : 'text-white hover:bg-white/15'
              )}
              disabled={opts?.derived}
              title={
                opts?.derived
                  ? 'Derived from S, O, and D'
                  : `Add for the selected PFMEA line (${label})`
              }
              onClick={() => handleColumnAdd(col)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      {resizeHandle(col, !(opts?.lightBar ?? false))}
    </TableHead>
  );

  const focusCellClass = (rowIndex: number, col: PfmeaNavColumn) =>
    gridFocus.rowIndex === rowIndex && gridFocus.col === col ? 'ring-2 ring-primary ring-inset' : '';

  const pfmeaTrashButton = (
    label: string,
    onRequest: () => void,
    opts?: { variant?: 'inline' | 'toolbar' }
  ) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        'shrink-0 rounded-none text-muted-foreground shadow-none ring-offset-0 hover:!bg-muted/30 hover:!text-muted-foreground hover:font-semibold focus-visible:ring-1 focus-visible:ring-ring',
        opts?.variant === 'toolbar'
          ? 'h-7 w-7 border-0 hover:!text-destructive'
          : 'h-6 w-6 hover:bg-transparent hover:!text-destructive'
      )}
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onRequest();
      }}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );

  const renderProjectSelector = () => {
    if (projectId && !loading && !selectedPfmeaProject) {
      const sourceProject = projects.find((p) => p.id === projectId);
      return (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Loading PFMEA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {sourceProject
                ? `Preparing PFMEA for "${sourceProject.name}" (workflow sync)…`
                : 'Preparing PFMEA for this project…'}
            </p>
          </CardContent>
        </Card>
      );
    }

    if (projectId && selectedPfmeaProject) {
      return null;
    }

    if (!selectedPfmeaProject) {
      return (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              PFMEA — select template project
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground mb-4">
              Each catalog project can have PFMEA requirements. Requirements link to{' '}
              <code className="text-xs">project_phases</code>, <code className="text-xs">phase_operations</code>, and{' '}
              <code className="text-xs">operation_steps</code> (custom phases only).
            </p>
            <div className="flex gap-4 flex-wrap">
              {pfmeaTemplates.map((t) => (
                <Button
                  key={t.project_id}
                  variant="outline"
                  onClick={() => {
                    setSelectedPfmeaProject(t);
                    void fetchPfmeaDetails(t.project_id);
                  }}
                  className="h-auto p-4 text-left flex flex-col items-start gap-2 max-w-xs"
                >
                  <div className="font-medium">{t.name}</div>
                  {t.description ? (
                    <div className="text-sm opacity-70 line-clamp-3">{t.description}</div>
                  ) : null}
                </Button>
              ))}
            </div>
            {pfmeaTemplates.length === 0 && !loading ? (
              <p className="text-sm text-muted-foreground">No projects found (ensure migrations applied and you are admin).</p>
            ) : null}
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Template:</span>
        </div>
        <Select
          value={selectedPfmeaProject.project_id}
          onValueChange={(value) => {
            const t = pfmeaTemplates.find((p) => p.project_id === value);
            if (t) {
              setSelectedPfmeaProject(t);
              void fetchPfmeaDetails(t.project_id);
            }
          }}
        >
          <SelectTrigger className="w-auto min-w-[200px]">
            <SelectValue>
              <span className="font-medium">{selectedPfmeaProject.name}</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {pfmeaTemplates.map((t) => (
              <SelectItem key={t.project_id} value={t.project_id}>
                <div className="flex flex-col items-start gap-1">
                  <span className="font-medium">{t.name}</span>
                  {t.description ? (
                    <span className="text-xs text-muted-foreground line-clamp-2">{t.description}</span>
                  ) : null}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.success('Export functionality coming soon')}>
            Export
          </Button>
        </div>
      </div>
    );
  };

  const renderPfmeaTable = () => {
    if (!selectedPfmeaProject) return null;

    const isPfmeaCellEditing = (rowIndex: number, entityId: string, column: string) =>
      editingCell?.rowIndex === rowIndex && editingCell?.entityId === entityId && editingCell?.column === column;

    const td = 'p-1 align-top h-full';
    const pfmeaCellToolbar = 'mt-auto flex w-full shrink-0 border-t border-border -mx-1 -mb-1';
    const pfmeaCellToolbarAdd =
      'h-7 min-h-0 flex-1 justify-start gap-1 rounded-none border-0 border-r border-border bg-transparent px-2 py-0 text-xs font-normal leading-none text-foreground shadow-none ring-offset-0 hover:!bg-muted/30 hover:!text-foreground hover:font-semibold focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';
    const frozenBg = 'bg-background';
    const frozenCellBase = 'sticky z-10 border-r border-border/50';

    const wPhase = colWidths.phase;
    const wOp = colWidths.operation;
    const wStep = colWidths.step;
    const wDesc = colWidths.step_description;

    const leftPhase = 0;
    const leftOp = leftPhase + wPhase;
    const leftStep = leftOp + wOp;
    const leftDesc = leftStep + wStep;

    const frozenCol = (leftPx: number, widthPx: number) => ({
      className: cn(frozenCellBase, frozenBg),
      style: {
        position: 'sticky',
        left: leftPx,
        zIndex: 10,
        minWidth: widthPx,
        width: widthPx,
        maxWidth: widthPx,
      } as React.CSSProperties,
    });

    /** Sticky on both axes so headers stay aligned with frozen body cells (do not use `relative` on th — it breaks sticky). */
    const frozenHeaderThStyle = (leftPx: number, widthPx: number): React.CSSProperties => ({
      position: 'sticky',
      left: leftPx,
      top: 0,
      zIndex: 50,
      minWidth: widthPx,
      width: widthPx,
      maxWidth: widthPx,
      backgroundColor: '#0c2744',
    });
    const pfmeaColBand: Record<PfmeaNavColumn, string> = {
      // Note: requirements + failure_mode headers are colored; keep body un-tinted for those columns.
      requirements: '',
      failure_mode: '',
      effects: 'bg-rose-50/55',
      s: 'bg-rose-100/55',
      causes: 'bg-emerald-50/55',
      prevention_controls: 'bg-emerald-100/55',
      o: 'bg-emerald-50/55',
      detection_controls: 'bg-violet-50/55',
      d: 'bg-violet-100/55',
      rpn: 'bg-slate-50/55',
      ap: 'bg-slate-100/55',
      recommended_actions: 'bg-slate-50/55',
    };
    const band = (col: PfmeaNavColumn) => cn('border-l border-border/30', pfmeaColBand[col]);

    return (
      <>
      <Card>
        <CardContent className="min-w-0 p-0">
          <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground border-b bg-muted/20">
            <div className="min-w-0">
              <span className="font-semibold text-foreground">
                Process FMEA{selectedPfmeaProject?.name ? `: ${selectedPfmeaProject.name}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => setPfmeaScoringCriteriaOpen(true)}
              >
                <Scale className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Scoring Criteria
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs">
                    Edit Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuCheckboxItem
                    checked={pfmeaColVisibility.phase}
                    onCheckedChange={(v) => setPfmeaColVisibility((s) => ({ ...s, phase: Boolean(v) }))}
                  >
                    Phase
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={pfmeaColVisibility.operation}
                    onCheckedChange={(v) => setPfmeaColVisibility((s) => ({ ...s, operation: Boolean(v) }))}
                  >
                    Operation
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={pfmeaColVisibility.step}
                    onCheckedChange={(v) => setPfmeaColVisibility((s) => ({ ...s, step: Boolean(v) }))}
                  >
                    Process Step
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={pfmeaColVisibility.step_description}
                    onCheckedChange={(v) => setPfmeaColVisibility((s) => ({ ...s, step_description: Boolean(v) }))}
                  >
                    Step Description
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setPfmeaSort({ key: 'default', dir: 'asc' })}
                title="Return to default PFMEA sort"
              >
                Default sort
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="PFMEA navigation help">
                      <Info className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs leading-relaxed">
                    Focus the table (click inside the grid or Tab to it), then use arrow keys to move the selection. Header + adds a line for the
                    selected row (same process step). Phases, operations, and steps are edited only in Process Map.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div
            role="grid"
            aria-label="PFMEA worksheet"
            tabIndex={0}
            onKeyDown={handlePfmeaGridKeyDown}
            className="h-[600px] w-full min-w-0 touch-pan-x overflow-x-auto overflow-y-auto overscroll-x-contain outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <table className="w-full min-w-[1950px] border-separate border-spacing-0 caption-bottom text-sm">
              <TableHeader>
                {/* Left-to-right: Phase, Operation, Process Step, Step Description, then Requirements, Failure Mode, Effects, … */}
                <TableRow>
                  {pfmeaColVisibility.phase ? (
                    <TableHead
                      className="border-b border-blue-950/60 border-r border-blue-950/50 shadow-sm !text-white h-auto px-1 py-1 font-medium align-middle"
                      style={frozenHeaderThStyle(leftPhase, wPhase)}
                    >
                      <div className="relative flex min-h-9 w-full items-center justify-center gap-0.5">
                        <span className="text-xs font-medium text-white">Phase</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-white hover:bg-white/15"
                          title="Sort by Phase"
                          onClick={() => togglePfmeaSort('phase')}
                        >
                          {sortIcon('phase')}
                        </Button>
                        {resizeHandle('phase')}
                      </div>
                    </TableHead>
                  ) : null}
                  {pfmeaColVisibility.operation ? (
                    <TableHead
                      className="border-b border-blue-950/60 border-r border-blue-950/50 shadow-sm !text-white h-auto px-1 py-1 font-medium align-middle"
                      style={frozenHeaderThStyle(leftOp, wOp)}
                    >
                      <div className="relative flex min-h-9 w-full items-center justify-center gap-0.5">
                        <span className="text-xs font-medium text-white">Operation</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-white hover:bg-white/15"
                          title="Sort by Operation"
                          onClick={() => togglePfmeaSort('operation')}
                        >
                          {sortIcon('operation')}
                        </Button>
                        {resizeHandle('operation')}
                      </div>
                    </TableHead>
                  ) : null}
                  {pfmeaColVisibility.step ? (
                    <TableHead
                      className="border-b border-blue-950/60 border-r border-blue-950/50 shadow-sm !text-white h-auto px-1 py-1 font-medium align-middle"
                      style={frozenHeaderThStyle(leftStep, wStep)}
                    >
                      <div className="relative flex min-h-9 w-full items-center justify-center gap-0.5">
                        <span className="text-xs font-medium text-white">Process Step</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-white hover:bg-white/15"
                          title="Sort by Step"
                          onClick={() => togglePfmeaSort('step')}
                        >
                          {sortIcon('step')}
                        </Button>
                        {resizeHandle('step')}
                      </div>
                    </TableHead>
                  ) : null}
                  {pfmeaColVisibility.step_description ? (
                    <TableHead
                      className="border-b border-blue-950/60 border-r border-blue-950/50 shadow-sm !text-white h-auto px-1 py-1 font-medium align-middle"
                      style={frozenHeaderThStyle(leftDesc, wDesc)}
                    >
                      <div className="relative flex min-h-9 w-full items-center justify-center gap-0.5">
                        <span className="text-xs font-medium text-white">Step Description</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-white hover:bg-white/15"
                          title="Sort by Step Description"
                          onClick={() => togglePfmeaSort('step_description')}
                        >
                          {sortIcon('step_description')}
                        </Button>
                        {resizeHandle('step_description')}
                      </div>
                    </TableHead>
                  ) : null}
                  {renderHeaderWithPlus('Requirements', 'requirements', {
                    barClassName: pfmeaHeaderBar.requirements,
                    lightBar: true,
                    derived: !pfmeaIsEditable,
                    sortKey: 'requirement',
                  })}
                  {renderHeaderWithPlus('Failure Mode', 'failure_mode', {
                    barClassName: pfmeaHeaderBar.failure,
                    lightBar: true,
                    derived: !pfmeaIsEditable,
                    sortKey: 'failure_mode',
                  })}
                  {renderHeaderWithPlus('Potential Effects', 'effects', {
                    barClassName: pfmeaHeaderBar.effectSeverity,
                    derived: !pfmeaIsEditable,
                    sortKey: 'severity',
                    sortDefaultDir: 'desc',
                  })}
                  {renderHeaderWithPlus('S', 's', {
                    barClassName: pfmeaHeaderBar.effectSeverity,
                    hidePlus: true,
                    sortKey: 'severity',
                    sortDefaultDir: 'desc',
                  })}
                  {renderHeaderWithPlus('Potential Causes', 'causes', {
                    barClassName: pfmeaHeaderBar.causeOccurrence,
                    derived: !pfmeaIsEditable,
                    sortKey: 'cause',
                  })}
                  {renderHeaderWithPlus('Prevention Controls', 'prevention_controls', {
                    barClassName: pfmeaHeaderBar.causeOccurrence,
                    derived: !pfmeaIsEditable,
                    sortKey: 'prevention_controls',
                  })}
                  {renderHeaderWithPlus('O', 'o', {
                    barClassName: pfmeaHeaderBar.causeOccurrence,
                    hidePlus: true,
                    sortKey: 'occurrence',
                    sortDefaultDir: 'desc',
                  })}
                  {renderHeaderWithPlus('Detection Controls', 'detection_controls', {
                    barClassName: pfmeaHeaderBar.detectionPurple,
                    derived: !pfmeaIsEditable,
                    sortKey: 'detection_controls',
                  })}
                  {renderHeaderWithPlus('D', 'd', {
                    barClassName: pfmeaHeaderBar.detectionPurple,
                    hidePlus: true,
                    sortKey: 'detection',
                    sortDefaultDir: 'desc',
                  })}
                  {renderHeaderWithPlus('RPN', 'rpn', {
                    derived: true,
                    barClassName: pfmeaHeaderBar.other,
                    hidePlus: true,
                    sortKey: 'rpn',
                    sortDefaultDir: 'desc',
                  })}
                  {renderHeaderWithPlus('Action Priority', 'ap', {
                    derived: true,
                    barClassName: pfmeaHeaderBar.other,
                    hidePlus: true,
                    sortKey: 'ap',
                    sortDefaultDir: 'desc',
                  })}
                  {renderHeaderWithPlus('Recommended Actions', 'recommended_actions', {
                    barClassName: pfmeaHeaderBar.other,
                    derived: !pfmeaIsEditable,
                    sortKey: 'recommended_actions',
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPfmeaRows.map((entry, rowIndex) => {
                  const { requirement, failureMode, cause } = entry;

                  const ap = failureMode ? calculateActionPriority(failureMode) : 'L';
                  const apColorClass = failureMode ? getActionPriorityRowClass(ap) : '';
                  const rpn = failureMode ? calculateRPN(failureMode, cause) : null;

                  const detectionScores = failureMode
                    ? failureMode.pfmea_controls
                        .filter((c) => c.control_type === 'detection' && c.detection_score != null)
                        .map((c) => c.detection_score as number)
                    : [];
                  const minDetection = detectionScores.length > 0 ? Math.min(...detectionScores) : null;

                  const preventionControls =
                    failureMode && cause
                      ? failureMode.pfmea_controls.filter((c) => c.control_type === 'prevention' && c.cause_id === cause.id)
                      : [];

                  const detectionControls = failureMode ? failureMode.pfmea_controls.filter((c) => c.control_type === 'detection') : [];

                  return (
                    <TableRow
                      key={`${requirement.id}-${failureMode?.id ?? 'no-fm'}-${cause?.id ?? 'no-cause'}`}
                      className={`${apColorClass} ${gridFocus.rowIndex === rowIndex ? 'outline outline-1 outline-primary/50' : ''}`}
                    >
                      {pfmeaColVisibility.phase ? (
                        <TableCell
                          className={cn(td, frozenCol(leftPhase, wPhase).className, 'font-medium')}
                          style={frozenCol(leftPhase, wPhase).style}
                        >
                          <div className="w-full min-w-0 text-sm break-words">{requirementPhaseName(requirement)}</div>
                        </TableCell>
                      ) : null}
                      {pfmeaColVisibility.operation ? (
                        <TableCell
                          className={cn(td, frozenCol(leftOp, wOp).className, 'font-medium')}
                          style={frozenCol(leftOp, wOp).style}
                        >
                          <div className="w-full min-w-0 text-sm break-words">{requirementOperationName(requirement)}</div>
                        </TableCell>
                      ) : null}
                      {pfmeaColVisibility.step ? (
                        <TableCell
                          className={cn(td, frozenCol(leftStep, wStep).className, 'font-medium')}
                          style={frozenCol(leftStep, wStep).style}
                        >
                          <div className="w-full min-w-0 text-sm break-words">{requirementStepName(requirement)}</div>
                        </TableCell>
                      ) : null}
                      {pfmeaColVisibility.step_description ? (
                        <TableCell
                          className={cn(td, frozenCol(leftDesc, wDesc).className, 'z-20')}
                          style={frozenCol(leftDesc, wDesc).style}
                        >
                          <div className="w-full min-w-0 text-xs text-muted-foreground font-normal break-words">
                            {requirement.operation_steps?.description ?? ''}
                          </div>
                        </TableCell>
                      ) : null}

                      <TableCell
                        className={cn(td, band('requirements'), focusCellClass(rowIndex, 'requirements'))}
                        style={{ width: `${colWidths.requirements}px`, minWidth: `${colWidths.requirements}px` }}
                        onMouseDown={(e) => pfmeaGridCellMouseDown(e, rowIndex, 'requirements')}
                      >
                        <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
                          <div className="min-w-0 flex-1">
                            <div className="w-full min-w-0 px-1.5 py-1 text-sm break-words">{requirement.requirement_text}</div>
                          </div>
                          {gridFocus.rowIndex === rowIndex && gridFocus.col === 'requirements' ? (
                            <div className={pfmeaCellToolbar}>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={!pfmeaIsEditable}
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAddOutputDialog(requirement.operation_step_id);
                                }}
                                className={pfmeaCellToolbarAdd}
                              >
                                <Plus className="h-3 w-3 shrink-0" />
                                Add Output
                              </Button>
                              {pfmeaTrashButton(
                                'Remove this output from the process step',
                                () =>
                                  setPfmeaLineDeleteTarget({
                                    kind: 'requirement_output',
                                    requirement,
                                    title: 'Remove this output?',
                                    description: `This removes "${requirement.requirement_text}" from the step. All PFMEA data for this output (failure modes and linked rows) will be deleted.`,
                                  }),
                                { variant: 'toolbar' }
                              )}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell
                        className={cn(td, band('failure_mode'), focusCellClass(rowIndex, 'failure_mode'))}
                        style={{ width: `${colWidths.failure_mode}px`, minWidth: `${colWidths.failure_mode}px` }}
                        onMouseDown={(e) => pfmeaGridCellMouseDown(e, rowIndex, 'failure_mode')}
                      >
                        {failureMode ? (
                          <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
                            <div className="flex min-h-0 min-w-0 flex-1 items-start gap-0.5">
                              <div className="min-w-0 flex-1">
                                {renderEditableCell(rowIndex, failureMode.failure_mode, failureMode.id, 'failure_mode', 'failure_mode', false, {
                                  fullWidth: true,
                                  editFooter: {
                                    addLabel: 'Add',
                                    onAdd: () => void addFailureMode(requirement),
                                    onDelete: () =>
                                      setPfmeaLineDeleteTarget({
                                        kind: 'failure_mode',
                                        id: failureMode.id,
                                        title: 'Delete this failure mode?',
                                        description: `This removes "${failureMode.failure_mode}" and all potential effects, causes, controls, and action items linked to it. Process steps stay unchanged — edit those in Process Map.`,
                                      }),
                                  },
                                })}
                              </div>
                            </div>
                            {gridFocus.rowIndex === rowIndex && gridFocus.col === 'failure_mode' ? (
                              <div className={pfmeaCellToolbar}>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  disabled={!pfmeaIsEditable}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void addFailureMode(requirement);
                                  }}
                                  className={pfmeaCellToolbarAdd}
                                >
                                  <Plus className="h-3 w-3 shrink-0" />
                                  Add Failure Mode
                                </Button>
                                {!isPfmeaCellEditing(rowIndex, failureMode.id, 'failure_mode')
                                  ? pfmeaTrashButton(
                                      'Delete failure mode and all lines under it',
                                      () =>
                                        setPfmeaLineDeleteTarget({
                                          kind: 'failure_mode',
                                          id: failureMode.id,
                                          title: 'Delete this failure mode?',
                                          description: `This removes "${failureMode.failure_mode}" and all potential effects, causes, controls, and action items linked to it. Process steps stay unchanged — edit those in Process Map.`,
                                        }),
                                      { variant: 'toolbar' }
                                    )
                                  : null}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="flex h-full min-h-0 flex-col">
                            <div className="min-w-0 flex-1 text-sm text-muted-foreground italic">No failure modes</div>
                            {gridFocus.rowIndex === rowIndex && gridFocus.col === 'failure_mode' ? (
                              <div className={pfmeaCellToolbar}>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  disabled={!pfmeaIsEditable}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void addFailureMode(requirement);
                                  }}
                                  className={cn(pfmeaCellToolbarAdd, 'border-r-0')}
                                >
                                  <Plus className="h-3 w-3 shrink-0" />
                                  Add Failure Mode
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </TableCell>

                      <TableCell
                        className={cn(td, band('effects'), 'min-w-0 max-w-none', focusCellClass(rowIndex, 'effects'))}
                        style={{ width: `${colWidths.effects}px`, minWidth: `${colWidths.effects}px` }}
                        onMouseDown={(e) => pfmeaGridCellMouseDown(e, rowIndex, 'effects')}
                      >
                        {failureMode ? (
                          <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-0">
                            <div className="min-w-0 flex-1">
                              {failureMode.pfmea_potential_effects.map((effect) => (
                                <div
                                  key={effect.id}
                                  className="flex w-full min-w-0 flex-wrap items-baseline gap-x-1 gap-y-0.5 border-b border-border/50 pb-1 last:border-b-0 last:pb-0"
                                >
                                  <div className="min-w-0 flex-1">
                                    {renderEditableCell(rowIndex, effect.effect_description, effect.id, 'effect_description', 'effect', false, {
                                      fullWidth: true,
                                      editFooter: {
                                        addLabel: 'Add',
                                        onAdd: () => void addPotentialEffect(failureMode.id),
                                        onDelete: () =>
                                          setPfmeaLineDeleteTarget({
                                            kind: 'effect',
                                            id: effect.id,
                                            title: 'Delete this potential effect?',
                                            description: 'This line will be removed from the PFMEA table.',
                                          }),
                                      },
                                    })}
                                  </div>
                                  <div className="flex shrink-0 items-baseline gap-0.5">
                                    {renderEffectSeverityInParens(effect)}
                                    {gridFocus.rowIndex === rowIndex &&
                                    gridFocus.col === 'effects' &&
                                    !isPfmeaCellEditing(rowIndex, effect.id, 'effect_description')
                                      ? pfmeaTrashButton('Delete potential effect', () =>
                                          setPfmeaLineDeleteTarget({
                                            kind: 'effect',
                                            id: effect.id,
                                            title: 'Delete this potential effect?',
                                            description: 'This line will be removed from the PFMEA table.',
                                          })
                                        )
                                      : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                            {gridFocus.rowIndex === rowIndex && gridFocus.col === 'effects' ? (
                              <div className={pfmeaCellToolbar}>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void addPotentialEffect(failureMode.id);
                                  }}
                                  className={cn(pfmeaCellToolbarAdd, 'border-r-0')}
                                  disabled={!pfmeaIsEditable}
                                >
                                  <Plus className="h-3 w-3 shrink-0" />
                                  Add Effect
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </TableCell>

                      <TableCell
                        className={cn(
                          td,
                          band('s'),
                          'p-0 align-middle text-center text-sm font-bold tabular-nums',
                          focusCellClass(rowIndex, 's')
                        )}
                        style={{ width: `${colWidths.s}px`, minWidth: `${colWidths.s}px` }}
                        onMouseDown={(e) => pfmeaGridCellMouseDown(e, rowIndex, 's')}
                      >
                        <div className="flex h-full min-h-8 w-full items-stretch">
                          {failureMode
                            ? renderScoreCell(failureMode.severity_score, (value) => void updateFailureModeSeverity(failureMode.id, value))
                            : null}
                        </div>
                      </TableCell>

                      <TableCell
                        className={cn(td, band('causes'), 'min-w-0', focusCellClass(rowIndex, 'causes'))}
                        style={{ width: `${colWidths.causes}px`, minWidth: `${colWidths.causes}px` }}
                        onMouseDown={(e) => pfmeaGridCellMouseDown(e, rowIndex, 'causes')}
                      >
                        {failureMode ? (
                          <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-0">
                            <div className="min-w-0 flex-1">
                              {cause ? (
                                <div className="flex items-start gap-0.5">
                                  <div className="min-w-0 flex-1">
                                    {renderEditableCell(rowIndex, cause.cause_description, cause.id, 'cause_description', 'cause', false, {
                                      fullWidth: true,
                                      editFooter: {
                                        addLabel: 'Add',
                                        onAdd: () => void addPotentialCause(failureMode.id),
                                        onDelete: () =>
                                          setPfmeaLineDeleteTarget({
                                            kind: 'cause',
                                            id: cause.id,
                                            title: 'Delete this potential cause?',
                                            description:
                                              'This line will be removed. Controls tied only to this cause are removed by the database.',
                                          }),
                                      },
                                    })}
                                  </div>
                                  {gridFocus.rowIndex === rowIndex &&
                                  gridFocus.col === 'causes' &&
                                  !isPfmeaCellEditing(rowIndex, cause.id, 'cause_description')
                                    ? pfmeaTrashButton('Delete potential cause', () =>
                                        setPfmeaLineDeleteTarget({
                                          kind: 'cause',
                                          id: cause.id,
                                          title: 'Delete this potential cause?',
                                          description:
                                            'This line will be removed. Controls tied only to this cause are removed by the database.',
                                        })
                                      )
                                    : null}
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground italic">No causes</div>
                              )}
                            </div>
                            {gridFocus.rowIndex === rowIndex && gridFocus.col === 'causes' ? (
                              <div className={pfmeaCellToolbar}>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void addPotentialCause(failureMode.id);
                                  }}
                                  className={cn(pfmeaCellToolbarAdd, 'border-r-0')}
                                  disabled={!pfmeaIsEditable}
                                >
                                  <Plus className="h-3 w-3 shrink-0" />
                                  Add Cause
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </TableCell>

                      <TableCell
                        className={cn(td, band('prevention_controls'), 'min-w-0', focusCellClass(rowIndex, 'prevention_controls'))}
                        style={{ width: `${colWidths.prevention_controls}px`, minWidth: `${colWidths.prevention_controls}px` }}
                        onMouseDown={(e) => pfmeaGridCellMouseDown(e, rowIndex, 'prevention_controls')}
                      >
                        <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-0">
                          <div className="min-w-0 flex-1">
                            {cause && preventionControls.length > 0 ? (
                              preventionControls.map((control) => (
                                <div key={control.id} className="rounded border p-1 text-sm">
                                  <div className="flex items-start gap-0.5">
                                    <Badge variant="outline" className="mt-0.5 mr-1 shrink-0 text-xs">
                                      Prev
                                    </Badge>
                                    <div className="min-w-0 flex-1">
                                      {renderEditableCell(rowIndex, control.control_description, control.id, 'control_description', 'control', false, {
                                        fullWidth: true,
                                        editFooter: {
                                          addLabel: 'Add',
                                          onAdd: () => {
                                            void addControl(failureMode.id, 'prevention', cause.id);
                                          },
                                          onDelete: () =>
                                            setPfmeaLineDeleteTarget({
                                              kind: 'control',
                                              id: control.id,
                                              title: 'Delete this prevention control?',
                                              description: 'This line will be removed from the PFMEA table.',
                                            }),
                                        },
                                      })}
                                    </div>
                                    {gridFocus.rowIndex === rowIndex &&
                                    gridFocus.col === 'prevention_controls' &&
                                    !isPfmeaCellEditing(rowIndex, control.id, 'control_description')
                                      ? pfmeaTrashButton('Delete prevention control', () =>
                                          setPfmeaLineDeleteTarget({
                                            kind: 'control',
                                            id: control.id,
                                            title: 'Delete this prevention control?',
                                            description: 'This line will be removed from the PFMEA table.',
                                          })
                                        )
                                      : null}
                                  </div>
                                </div>
                              ))
                            ) : cause ? (
                              <div className="text-sm text-muted-foreground italic">No prevention controls</div>
                            ) : (
                              <div className="text-sm text-muted-foreground italic">Select a cause</div>
                            )}
                          </div>
                          {gridFocus.rowIndex === rowIndex &&
                          gridFocus.col === 'prevention_controls' &&
                          failureMode &&
                          cause ? (
                            <div className={pfmeaCellToolbar}>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void addControl(failureMode.id, 'prevention', cause.id);
                                }}
                                className={cn(pfmeaCellToolbarAdd, 'border-r-0')}
                                disabled={!pfmeaIsEditable}
                              >
                                <Plus className="h-3 w-3 shrink-0" />
                                Add Prevention
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell
                        className={cn(
                          td,
                          band('o'),
                          'p-0 align-middle text-center text-sm font-bold tabular-nums',
                          focusCellClass(rowIndex, 'o')
                        )}
                        style={{ width: `${colWidths.o}px`, minWidth: `${colWidths.o}px` }}
                        onMouseDown={(e) => pfmeaGridCellMouseDown(e, rowIndex, 'o')}
                      >
                        <div className="flex h-full min-h-8 w-full items-stretch">
                          {cause
                            ? renderScoreCell(cause.occurrence_score, (value) => void updateCauseOccurrence(cause.id, value))
                            : null}
                        </div>
                      </TableCell>

                      <TableCell
                        className={cn(td, band('detection_controls'), 'min-w-0', focusCellClass(rowIndex, 'detection_controls'))}
                        style={{ width: `${colWidths.detection_controls}px`, minWidth: `${colWidths.detection_controls}px` }}
                        onMouseDown={(e) => pfmeaGridCellMouseDown(e, rowIndex, 'detection_controls')}
                      >
                        {failureMode ? (
                          <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-0">
                            <div className="min-w-0 flex-1">
                              {detectionControls.map((control) => (
                                <div key={control.id} className="rounded border p-1 text-sm">
                                  <div className="flex items-start gap-0.5">
                                    <Badge variant="outline" className="mt-0.5 mr-1 shrink-0 text-xs">
                                      Det
                                    </Badge>
                                    <div className="min-w-0 flex-1">
                                      {renderEditableCell(rowIndex, control.control_description, control.id, 'control_description', 'control', false, {
                                        fullWidth: true,
                                        editFooter: {
                                          addLabel: 'Add',
                                          onAdd: () => void addControl(failureMode.id, 'detection'),
                                          onDelete: () =>
                                            setPfmeaLineDeleteTarget({
                                              kind: 'control',
                                              id: control.id,
                                              title: 'Delete this detection control?',
                                              description: 'This line will be removed from the PFMEA table.',
                                            }),
                                        },
                                      })}
                                    </div>
                                    {gridFocus.rowIndex === rowIndex &&
                                    gridFocus.col === 'detection_controls' &&
                                    !isPfmeaCellEditing(rowIndex, control.id, 'control_description')
                                      ? pfmeaTrashButton('Delete detection control', () =>
                                          setPfmeaLineDeleteTarget({
                                            kind: 'control',
                                            id: control.id,
                                            title: 'Delete this detection control?',
                                            description: 'This line will be removed from the PFMEA table.',
                                          })
                                        )
                                      : null}
                                  </div>
                                  <div className="mt-0.5 text-xs text-muted-foreground">
                                    D:{' '}
                                    {renderEditableCell(
                                      rowIndex,
                                      (control.detection_score ?? 5).toString(),
                                      control.id,
                                      'detection_score',
                                      'control_detection',
                                      true
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            {gridFocus.rowIndex === rowIndex && gridFocus.col === 'detection_controls' ? (
                              <div className={pfmeaCellToolbar}>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void addControl(failureMode.id, 'detection');
                                  }}
                                  className={cn(pfmeaCellToolbarAdd, 'border-r-0')}
                                  disabled={!pfmeaIsEditable}
                                >
                                  <Plus className="h-3 w-3 shrink-0" />
                                  Add Detection
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </TableCell>

                      <TableCell
                        className={cn(
                          td,
                          band('d'),
                          'p-0 align-middle text-center text-sm font-bold tabular-nums',
                          focusCellClass(rowIndex, 'd')
                        )}
                        style={{ width: `${colWidths.d}px`, minWidth: `${colWidths.d}px` }}
                        onMouseDown={(e) => pfmeaGridCellMouseDown(e, rowIndex, 'd')}
                      >
                        <div className="flex h-full min-h-8 w-full items-stretch">
                          {failureMode
                            ? renderScoreCell(minDetection ?? 10, (value) => void updateDetectionScoreForRow(failureMode, value))
                            : null}
                        </div>
                      </TableCell>

                      <TableCell
                        className={cn(td, band('rpn'), 'text-center text-sm font-bold tabular-nums', focusCellClass(rowIndex, 'rpn'))}
                        style={{ width: `${colWidths.rpn}px`, minWidth: `${colWidths.rpn}px` }}
                        onMouseDown={(e) => pfmeaGridCellMouseDown(e, rowIndex, 'rpn')}
                      >
                        {rpn != null ? rpn : ''}
                      </TableCell>

                      <TableCell
                        className={cn(td, band('ap'), 'text-center text-sm font-bold tabular-nums', focusCellClass(rowIndex, 'ap'))}
                        style={{ width: `${colWidths.ap}px`, minWidth: `${colWidths.ap}px` }}
                        onMouseDown={(e) => pfmeaGridCellMouseDown(e, rowIndex, 'ap')}
                      >
                        {failureMode ? (
                          <Badge variant={ap === 'H' ? 'destructive' : ap === 'M' ? 'default' : 'secondary'} className="text-xs">
                            {ap}
                          </Badge>
                        ) : (
                          ''
                        )}
                      </TableCell>

                      <TableCell
                        className={cn(td, band('recommended_actions'), 'min-w-0', focusCellClass(rowIndex, 'recommended_actions'))}
                        style={{ width: `${colWidths.recommended_actions}px`, minWidth: `${colWidths.recommended_actions}px` }}
                        onMouseDown={(e) => pfmeaGridCellMouseDown(e, rowIndex, 'recommended_actions')}
                      >
                        {failureMode ? (
                          <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-0">
                            <div className="min-w-0 flex-1">
                              {failureMode.pfmea_action_items.map((action) => (
                                <div key={action.id} className="rounded border p-2 text-sm">
                                  <div className="flex items-start gap-0.5">
                                    <div className="min-w-0 flex-1">
                                      {renderEditableCell(rowIndex, action.recommended_action, action.id, 'recommended_action', 'action', false, {
                                        fullWidth: true,
                                        editFooter: {
                                          addLabel: 'Add',
                                          onAdd: () => void addActionItem(failureMode.id),
                                          onDelete: () =>
                                            setPfmeaLineDeleteTarget({
                                              kind: 'action',
                                              id: action.id,
                                              title: 'Delete this recommended action?',
                                              description: 'This action line will be removed from the PFMEA table.',
                                            }),
                                        },
                                      })}
                                    </div>
                                    {gridFocus.rowIndex === rowIndex &&
                                    gridFocus.col === 'recommended_actions' &&
                                    !isPfmeaCellEditing(rowIndex, action.id, 'recommended_action')
                                      ? pfmeaTrashButton('Delete recommended action', () =>
                                          setPfmeaLineDeleteTarget({
                                            kind: 'action',
                                            id: action.id,
                                            title: 'Delete this recommended action?',
                                            description: 'This action line will be removed from the PFMEA table.',
                                          })
                                        )
                                      : null}
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {action.responsible_person && `Assigned: ${action.responsible_person}`}
                                    {action.target_completion_date && ` | Due: ${action.target_completion_date}`}
                                  </div>
                                  <Badge variant="secondary" className="text-xs mt-1">
                                    {action.status.replace('_', ' ')}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                            {gridFocus.rowIndex === rowIndex && gridFocus.col === 'recommended_actions' ? (
                              <div className={pfmeaCellToolbar}>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void addActionItem(failureMode.id);
                                  }}
                                  className={cn(pfmeaCellToolbarAdd, 'border-r-0')}
                                  disabled={!pfmeaIsEditable}
                                >
                                  <Plus className="h-3 w-3 shrink-0" />
                                  Add Action
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );

                  /* legacy rowspan-based render (kept temporarily during refactor)
                  if (entry.kind === 'empty') {
                    const { requirement } = entry;
                    return (
                      <TableRow
                        key={`${requirement.id}-empty`}
                        className={gridFocus.rowIndex === rowIndex ? 'bg-muted/40' : ''}
                      >
                        <TableCell rowSpan={1} className={cn(td, 'font-medium bg-muted/10')}>
                          <div className="w-full min-w-0 text-sm break-words">{requirementPhaseName(requirement)}</div>
                        </TableCell>
                        <TableCell rowSpan={1} className={cn(td, 'font-medium bg-muted/5')}>
                          <div className="w-full min-w-0 text-sm break-words">{requirementOperationName(requirement)}</div>
                        </TableCell>
                        <TableCell rowSpan={1} className={cn(td, 'font-medium bg-muted/10')}>
                          <div className="w-full min-w-0 text-sm break-words">{requirementStepName(requirement)}</div>
                        </TableCell>
                        <TableCell className={cn(td, 'bg-muted/5')}>
                          <div className="w-full min-w-0 text-xs text-muted-foreground font-normal break-words">
                            {requirement.operation_steps?.description ?? ''}
                          </div>
                        </TableCell>
                        <TableCell
                          className={cn(td, band('requirements'), focusCellClass(rowIndex, 'requirements'))}
                          onMouseDown={() => setGridFocus({ rowIndex, col: 'requirements' })}
                        >
                          <div className="flex w-full min-w-0 flex-col gap-1">
                            <div className="w-full min-w-0 px-1.5 py-1 text-sm break-words">
                              {requirement.requirement_text}
                            </div>
                            {gridFocus.rowIndex === rowIndex && gridFocus.col === 'requirements' ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={!pfmeaIsEditable}
                                onClick={() => void addOutputToStep(requirement.operation_step_id)}
                                className="h-6 px-1 text-xs self-start"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add Output
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell
                          colSpan={11}
                          className={cn(td, 'py-2 text-sm text-muted-foreground', focusCellClass(rowIndex, 'failure_mode'))}
                          onMouseDown={() => setGridFocus({ rowIndex, col: 'failure_mode' })}
                        >
                          No failure modes
                        </TableCell>
                      </TableRow>
                    );
                  }

                  const { requirement, failureMode, firstInReq, groupSize } = entry;
                  const rpn = calculateRPN(failureMode, null);
                  const ap = calculateActionPriority(failureMode);
                  const apColorClass = getActionPriorityRowClass(ap);

                  return (
                    <TableRow
                      key={failureMode.id}
                      className={`${apColorClass} ${gridFocus.rowIndex === rowIndex ? 'outline outline-1 outline-primary/50' : ''}`}
                    >
                      {firstInReq ? (
                        <>
                          <TableCell rowSpan={groupSize} className={cn(td, 'font-medium bg-muted/10')}>
                            <div className="w-full min-w-0 text-sm break-words">{requirementPhaseName(requirement)}</div>
                          </TableCell>
                          <TableCell rowSpan={groupSize} className={cn(td, 'font-medium bg-muted/5')}>
                            <div className="w-full min-w-0 text-sm break-words">{requirementOperationName(requirement)}</div>
                          </TableCell>
                          <TableCell rowSpan={groupSize} className={cn(td, 'font-medium bg-muted/10')}>
                            <div className="w-full min-w-0 text-sm break-words">{requirementStepName(requirement)}</div>
                          </TableCell>
                          <TableCell rowSpan={groupSize} className={cn(td, 'bg-muted/5')}>
                            <div className="w-full min-w-0 text-xs text-muted-foreground font-normal break-words">
                              {requirement.operation_steps?.description ?? ''}
                            </div>
                          </TableCell>
                          <TableCell
                            rowSpan={groupSize}
                            className={cn(td, band('requirements'), focusCellClass(rowIndex, 'requirements'))}
                            onMouseDown={() => setGridFocus({ rowIndex, col: 'requirements' })}
                          >
                            <div className="flex w-full min-w-0 flex-col gap-1">
                              <div className="w-full min-w-0 px-1.5 py-1 text-sm break-words">
                                {requirement.requirement_text}
                              </div>
                              {gridFocus.rowIndex === rowIndex && gridFocus.col === 'requirements' ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  disabled={!pfmeaIsEditable}
                                  onClick={() => void addOutputToStep(requirement.operation_step_id)}
                                  className="h-6 px-1 text-xs self-start"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add Output
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </>
                      ) : null}
                      <TableCell
                        className={cn(td, band('failure_mode'), focusCellClass(rowIndex, 'failure_mode'))}
                        onMouseDown={() => setGridFocus({ rowIndex, col: 'failure_mode' })}
                      >
                        <div className="flex w-full min-w-0 items-start gap-0.5">
                          <div className="min-w-0 flex-1">
                            {renderEditableCell(failureMode.failure_mode, failureMode.id, 'failure_mode', 'failure_mode', false, {
                              fullWidth: true,
                            })}
                          </div>
                          {pfmeaTrashButton('Delete failure mode and all lines under it', () =>
                            setPfmeaLineDeleteTarget({
                              kind: 'failure_mode',
                              id: failureMode.id,
                              title: 'Delete this failure mode?',
                              description: `This removes "${failureMode.failure_mode}" and all potential effects, causes, controls, and action items linked to it. Process steps stay unchanged — edit those in Process Map.`,
                            })
                          )}
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(td, band('effects'), 'min-w-0 max-w-none', focusCellClass(rowIndex, 'effects'))}
                        onMouseDown={() => setGridFocus({ rowIndex, col: 'effects' })}
                      >
                        <div className="flex w-full min-w-0 flex-col gap-1">
                          {failureMode.pfmea_potential_effects.map((effect) => (
                            <div
                              key={effect.id}
                              className="flex w-full min-w-0 flex-wrap items-baseline gap-x-1 gap-y-0.5 border-b border-border/50 pb-1 last:border-b-0 last:pb-0"
                            >
                              <div className="min-w-0 flex-1">
                                {renderEditableCell(
                                  effect.effect_description,
                                  effect.id,
                                  'effect_description',
                                  'effect',
                                  false,
                                  { fullWidth: true }
                                )}
                              </div>
                              <div className="flex shrink-0 items-baseline gap-0.5">
                                {renderEffectSeverityInParens(effect)}
                                {pfmeaTrashButton('Delete potential effect', () =>
                                  setPfmeaLineDeleteTarget({
                                    kind: 'effect',
                                    id: effect.id,
                                    title: 'Delete this potential effect?',
                                    description: 'This line will be removed from the PFMEA table.',
                                  })
                                )}
                              </div>
                            </div>
                          ))}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => addPotentialEffect(failureMode.id)}
                            className="h-6 px-1 text-xs"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Effect
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(td, band('s'), 'text-center text-sm font-bold tabular-nums', focusCellClass(rowIndex, 's'))}
                        onMouseDown={() => setGridFocus({ rowIndex, col: 's' })}
                      >
                        {maxPfmeaSeverityForFailureMode(failureMode)}
                      </TableCell>
                      <TableCell
                        className={cn(td, band('causes'), 'min-w-0', focusCellClass(rowIndex, 'causes'))}
                        onMouseDown={() => setGridFocus({ rowIndex, col: 'causes' })}
                      >
                        <div className="flex w-full min-w-0 flex-col gap-1">
                          {failureMode.pfmea_potential_causes.map((cause) => (
                            <div key={cause.id} className="rounded border p-1 text-sm">
                              <div className="flex items-start gap-0.5">
                                <div className="min-w-0 flex-1">
                                  {renderEditableCell(cause.cause_description, cause.id, 'cause_description', 'cause', false, {
                                    fullWidth: true,
                                  })}
                                </div>
                                {pfmeaTrashButton('Delete potential cause', () =>
                                  setPfmeaLineDeleteTarget({
                                    kind: 'cause',
                                    id: cause.id,
                                    title: 'Delete this potential cause?',
                                    description:
                                      'This line will be removed. Controls tied only to this cause are removed by the database.',
                                  })
                                )}
                              </div>
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                O:{' '}
                                {renderEditableCell(
                                  cause.occurrence_score.toString(),
                                  cause.id,
                                  'occurrence_score',
                                  'cause_occurrence',
                                  true
                                )}
                              </div>
                            </div>
                          ))}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => addPotentialCause(failureMode.id)}
                            className="h-6 px-1 text-xs"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Cause
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(td, band('prevention_controls'), 'min-w-0', focusCellClass(rowIndex, 'prevention_controls'))}
                        onMouseDown={() => setGridFocus({ rowIndex, col: 'prevention_controls' })}
                      >
                        <div className="flex w-full min-w-0 flex-col gap-1">
                          {failureMode.pfmea_controls
                            .filter((control) => control.control_type === 'prevention')
                            .map((control) => (
                              <div key={control.id} className="rounded border p-1 text-sm">
                                <div className="flex items-start gap-0.5">
                                  <Badge variant="outline" className="mt-0.5 mr-1 shrink-0 text-xs">
                                    Prev
                                  </Badge>
                                  <div className="min-w-0 flex-1">
                                    {renderEditableCell(control.control_description, control.id, 'control_description', 'control', false, {
                                      fullWidth: true,
                                    })}
                                  </div>
                                  {pfmeaTrashButton('Delete prevention control', () =>
                                    setPfmeaLineDeleteTarget({
                                      kind: 'control',
                                      id: control.id,
                                      title: 'Delete this prevention control?',
                                      description: 'This control line will be removed from the PFMEA table.',
                                    })
                                  )}
                                </div>
                              </div>
                            ))}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => addControl(failureMode.id, 'prevention')}
                            className="h-6 px-1 text-xs"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Prev
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(td, band('o'), 'text-center text-sm font-bold tabular-nums', focusCellClass(rowIndex, 'o'))}
                        onMouseDown={() => setGridFocus({ rowIndex, col: 'o' })}
                      >
                        {failureMode.pfmea_potential_causes.length > 0
                          ? Math.round(
                              failureMode.pfmea_potential_causes.reduce((sum, c) => sum + c.occurrence_score, 0) /
                                failureMode.pfmea_potential_causes.length
                            )
                          : 10}
                      </TableCell>
                      <TableCell
                        className={cn(td, band('detection_controls'), 'min-w-0', focusCellClass(rowIndex, 'detection_controls'))}
                        onMouseDown={() => setGridFocus({ rowIndex, col: 'detection_controls' })}
                      >
                        <div className="flex w-full min-w-0 flex-col gap-1">
                          {failureMode.pfmea_controls
                            .filter((control) => control.control_type === 'detection')
                            .map((control) => (
                              <div key={control.id} className="rounded border p-1 text-sm">
                                <div className="flex items-start gap-0.5">
                                  <Badge variant="outline" className="mt-0.5 mr-1 shrink-0 text-xs">
                                    Det
                                  </Badge>
                                  <div className="min-w-0 flex-1">
                                    {renderEditableCell(control.control_description, control.id, 'control_description', 'control', false, {
                                      fullWidth: true,
                                    })}
                                  </div>
                                  {pfmeaTrashButton('Delete detection control', () =>
                                    setPfmeaLineDeleteTarget({
                                      kind: 'control',
                                      id: control.id,
                                      title: 'Delete this detection control?',
                                      description: 'This control line will be removed from the PFMEA table.',
                                    })
                                  )}
                                </div>
                                <div className="mt-0.5 text-xs text-muted-foreground">
                                  D:{' '}
                                  {renderEditableCell(
                                    (control.detection_score || 5).toString(),
                                    control.id,
                                    'detection_score',
                                    'control_detection',
                                    true
                                  )}
                                </div>
                              </div>
                            ))}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => addControl(failureMode.id, 'detection')}
                            className="h-6 px-1 text-xs"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Det
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(td, band('d'), 'text-center text-sm font-bold tabular-nums', focusCellClass(rowIndex, 'd'))}
                        onMouseDown={() => setGridFocus({ rowIndex, col: 'd' })}
                      >
                        {(() => {
                          const d = failureMode.pfmea_controls
                            .filter((c) => c.control_type === 'detection' && c.detection_score != null)
                            .map((c) => c.detection_score!);
                          return d.length > 0 ? Math.min(...d, 10) : '—';
                        })()}
                      </TableCell>
                      <TableCell
                        className={cn(
                          td,
                          band('rpn'),
                          'text-center text-lg font-bold tabular-nums',
                          ap === 'H' ? 'text-red-600' : ap === 'M' ? 'text-orange-600' : 'text-green-700',
                          focusCellClass(rowIndex, 'rpn')
                        )}
                        onMouseDown={() => setGridFocus({ rowIndex, col: 'rpn' })}
                      >
                        {rpn}
                      </TableCell>
                      <TableCell
                        className={cn(td, band('ap'), 'text-center', focusCellClass(rowIndex, 'ap'))}
                        onMouseDown={() => setGridFocus({ rowIndex, col: 'ap' })}
                      >
                        <Badge variant="outline" className={getActionPriorityBadgeClasses(ap)}>
                          {ap === 'H' ? 'High' : ap === 'M' ? 'Medium' : 'Low'}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={cn(td, band('recommended_actions'), 'min-w-0', focusCellClass(rowIndex, 'recommended_actions'))}
                        onMouseDown={() => setGridFocus({ rowIndex, col: 'recommended_actions' })}
                      >
                        <div className="flex w-full min-w-0 flex-col gap-1">
                          {failureMode.pfmea_action_items.map((action) => (
                            <div key={action.id} className="rounded border bg-blue-50 p-1 text-sm">
                              <div className="flex items-start gap-0.5">
                                <div className="min-w-0 flex-1">
                                  {renderEditableCell(action.recommended_action, action.id, 'recommended_action', 'action', false, {
                                    fullWidth: true,
                                  })}
                                </div>
                                {pfmeaTrashButton('Delete recommended action', () =>
                                  setPfmeaLineDeleteTarget({
                                    kind: 'action',
                                    id: action.id,
                                    title: 'Delete this recommended action?',
                                    description: 'This action line will be removed from the PFMEA table.',
                                  })
                                )}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {action.responsible_person && `Assigned: ${action.responsible_person}`}
                                {action.target_completion_date && ` | Due: ${action.target_completion_date}`}
                              </div>
                              <Badge variant="secondary" className="text-xs mt-1">
                                {action.status.replace('_', ' ')}
                              </Badge>
                            </div>
                          ))}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => addActionItem(failureMode.id)}
                            className="h-6 px-1 text-xs"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Action
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                */
                })}
              </TableBody>
            </table>
          </div>
        </CardContent>
      </Card>

      <PfmeaScoringCriteriaDialog open={pfmeaScoringCriteriaOpen} onOpenChange={setPfmeaScoringCriteriaOpen} />

      <Dialog
        open={addOutputDialogStepId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAddOutputDialogStepId(null);
            setAddOutputName('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add output</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-1">
            <Label htmlFor="pfmea-add-output-name">Output / requirement name</Label>
            <Input
              id="pfmea-add-output-name"
              value={addOutputName}
              onChange={(e) => setAddOutputName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void submitAddOutput();
                }
              }}
              placeholder="Name"
              autoComplete="off"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOutputDialogStepId(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitAddOutput()}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading PFMEA data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {renderProjectSelector()}

      {selectedPfmeaProject && (
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="mt-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview & Reports</TabsTrigger>
            <TabsTrigger value="table">PFMEA Table</TabsTrigger>
            <TabsTrigger value="actions">Action Tracker</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Project Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <span className="font-medium">Requirements</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">{requirements.length}</div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                        <span className="font-medium">Failure Modes</span>
                      </div>
                      <div className="text-2xl font-bold text-orange-600">{failureModes.length}</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="font-medium">High Priority (AP = H)</span>
                      </div>
                      <div className="text-2xl font-bold text-green-600">
                        {failureModes.filter(fm => calculateActionPriority(fm) === 'H').length}
                      </div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-5 h-5 text-purple-600" />
                        <span className="font-medium">Open Actions</span>
                      </div>
                      <div className="text-2xl font-bold text-purple-600">
                        {failureModes.reduce((count, fm) => 
                          count + fm.pfmea_action_items.filter(action => action.status !== 'complete').length, 0
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Action Priority Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: 'High (H)', color: 'bg-red-500', count: failureModes.filter(fm => calculateActionPriority(fm) === 'H').length },
                      { label: 'Medium (M)', color: 'bg-orange-500', count: failureModes.filter(fm => calculateActionPriority(fm) === 'M').length },
                      { label: 'Low (L)', color: 'bg-green-500', count: failureModes.filter(fm => calculateActionPriority(fm) === 'L').length }
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                          <span className="text-sm">{item.label}</span>
                        </div>
                        <span className="font-bold">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="table" className="mt-3">
            {renderPfmeaTable()}
          </TabsContent>

          <TabsContent value="actions" className="mt-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Action Tracker</CardTitle>
                  <Badge variant="secondary">{getAllActionItems().length} Total Actions</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {getAllActionItems().length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No action items found. Add actions through the PFMEA table.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10 p-2" aria-label="Delete" />
                          <TableHead className="cursor-pointer hover:bg-muted/50">Action</TableHead>
                          <TableHead className="cursor-pointer hover:bg-muted/50">Owner</TableHead>
                          <TableHead className="cursor-pointer hover:bg-muted/50">Due Date</TableHead>
                          <TableHead className="cursor-pointer hover:bg-muted/50">Project</TableHead>
                          <TableHead className="cursor-pointer hover:bg-muted/50">Status</TableHead>
                          <TableHead className="cursor-pointer hover:bg-muted/50">RPN</TableHead>
                          <TableHead className="cursor-pointer hover:bg-muted/50">Action Priority</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getAllActionItems()
                          .sort((a, b) => {
                            if (a.status === 'complete' && b.status !== 'complete') return 1;
                            if (a.status !== 'complete' && b.status === 'complete') return -1;
                            const apA = calculateActionPriority(a.failureMode);
                            const apB = calculateActionPriority(b.failureMode);
                            const rankA = apA === 'H' ? 3 : apA === 'M' ? 2 : 1;
                            const rankB = apB === 'H' ? 3 : apB === 'M' ? 2 : 1;
                            if (rankB !== rankA) return rankB - rankA;
                            const rpnA = calculateRPN(a.failureMode, null);
                            const rpnB = calculateRPN(b.failureMode, null);
                            return rpnB - rpnA;
                          })
                          .map((actionItem) => {
                            const rpn = calculateRPN(actionItem.failureMode, null);
                            const ap = calculateActionPriority(actionItem.failureMode);
                            return (
                              <TableRow key={actionItem.id} className={actionItem.status === 'complete' ? 'opacity-60' : ''}>
                                <TableCell className="w-10 p-2 align-top">
                                  {pfmeaTrashButton('Delete action item', () =>
                                    setPfmeaLineDeleteTarget({
                                      kind: 'action',
                                      id: actionItem.id,
                                      title: 'Delete this action item?',
                                      description: 'This action will be removed from the tracker and the PFMEA table.',
                                    })
                                  )}
                                </TableCell>
                                <TableCell className="max-w-xs">
                                  <div className="font-medium">{actionItem.recommended_action}</div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Failure Mode: {actionItem.failureMode.failure_mode}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {actionItem.responsible_person || 'Unassigned'}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {actionItem.target_completion_date ? (
                                    <div className={`text-sm ${
                                      new Date(actionItem.target_completion_date) < new Date() && actionItem.status !== 'complete'
                                        ? 'text-red-600 font-medium'
                                        : ''
                                    }`}>
                                      {actionItem.target_completion_date}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">No due date</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">{selectedPfmeaProject?.name}</div>
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={
                                      actionItem.status === 'complete' ? 'secondary' :
                                      actionItem.status === 'in_progress' ? 'default' : 'outline'
                                    }
                                  >
                                    {actionItem.status.replace('_', ' ')}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant="outline"
                                    className={getActionPriorityBadgeClasses(ap)}
                                  >
                                    {rpn}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={getActionPriorityBadgeClasses(ap)}>
                                    {ap === 'H' ? 'High' : ap === 'M' ? 'Medium' : 'Low'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        }
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <AlertDialog
        open={pfmeaLineDeleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !pfmeaDeletePending) setPfmeaLineDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pfmeaLineDeleteTarget?.title}</AlertDialogTitle>
            <AlertDialogDescription>{pfmeaLineDeleteTarget?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pfmeaDeletePending}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={pfmeaDeletePending}
              onClick={() => void executePfmeaLineDelete()}
            >
              {pfmeaDeletePending ? 'Deleting…' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};