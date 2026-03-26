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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Target, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Database types for PFMEA
interface DatabaseProject {
  id: string;
  name: string;
  description: string;
  phases: any;
  [key: string]: any;
}

/** Template project + extension row (projects_pfmea.project_id = projects.id). */
interface PfmeaTemplateContext {
  project_id: string;
  name: string;
  description?: string;
}

interface PFMEARequirement {
  id: string;
  project_id: string;
  project_phase_id: string;
  phase_operation_id: string;
  operation_step_id: string;
  requirement_text: string;
  output_reference: Record<string, unknown> | null;
  project_phases?: { id: string; name: string } | null;
  phase_operations?: { id: string; operation_name: string } | null;
  operation_steps?: { id: string; step_title: string } | null;
}

interface PFMEAFailureMode {
  id: string;
  requirement_id: string;
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

type PfmeaLineDeleteTarget = {
  kind: 'failure_mode' | 'effect' | 'cause' | 'control' | 'action';
  id: string;
  title: string;
  description: string;
};

function requirementPhaseName(r: PFMEARequirement): string {
  return r.project_phases?.name ?? (r.output_reference as { phase_name?: string } | null)?.phase_name ?? '—';
}

function requirementOperationName(r: PFMEARequirement): string {
  return (
    r.phase_operations?.operation_name ??
    (r.output_reference as { operation_name?: string } | null)?.operation_name ??
    '—'
  );
}

function requirementStepName(r: PFMEARequirement): string {
  return (
    r.operation_steps?.step_title ?? (r.output_reference as { step_name?: string } | null)?.step_name ?? '—'
  );
}

export const PFMEAManagement: React.FC<PFMEAManagementProps> = ({ projectId, refreshTrigger }) => {
  const [pfmeaTemplates, setPfmeaTemplates] = useState<PfmeaTemplateContext[]>([]);
  const [selectedPfmeaProject, setSelectedPfmeaProject] = useState<PfmeaTemplateContext | null>(null);
  const [projects, setProjects] = useState<DatabaseProject[]>([]);
  const [requirements, setRequirements] = useState<PFMEARequirement[]>([]);
  const [failureModes, setFailureModes] = useState<PFMEAFailureMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{row: string, column: string, type: string} | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [currentTab, setCurrentTab] = useState('overview');
  const [gridFocus, setGridFocus] = useState<{ rowIndex: number; col: PfmeaNavColumn }>({
    rowIndex: 0,
    col: 'failure_mode',
  });
  const [pfmeaLineDeleteTarget, setPfmeaLineDeleteTarget] = useState<PfmeaLineDeleteTarget | null>(null);
  const [pfmeaDeletePending, setPfmeaDeletePending] = useState(false);

  useEffect(() => {
    void fetchData();
  }, []);

  const fetchPfmeaDetails = useCallback(async (templateProjectId: string) => {
    try {
      const { data: reqData, error: reqError } = await supabase
        .from('pfmea_requirements')
        .select(
          `
          *,
          project_phases ( id, name ),
          phase_operations ( id, operation_name ),
          operation_steps ( id, step_title )
        `
        )
        .eq('project_id', templateProjectId)
        .order('display_order', { ascending: true });

      if (reqError) throw reqError;

      const rows = (reqData ?? []) as PFMEARequirement[];
      setRequirements(rows);

      const reqIds = rows.map((r) => r.id);
      if (reqIds.length === 0) {
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
        .in('requirement_id', reqIds);

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
      const { error } = await supabase.rpc('sync_pfmea_requirements_for_project', {
        p_project_id: projectId,
      });
      if (error) {
        console.error('sync_pfmea_requirements_for_project', error);
        toast.error(error.message);
      }
      await fetchPfmeaDetails(projectId);
    })();
  }, [refreshTrigger, projectId, fetchPfmeaDetails]);

  const persistEffectSeverity = useCallback(
    async (effectId: string, scoreStr: string) => {
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
    [selectedPfmeaProject, fetchPfmeaDetails]
  );

  const executePfmeaLineDelete = useCallback(async () => {
    if (!pfmeaLineDeleteTarget || !selectedPfmeaProject) return;
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
  }, [pfmeaLineDeleteTarget, selectedPfmeaProject, fetchPfmeaDetails]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: projectsData } = await supabase.from('projects').select('*').order('name');

      if (projectsData) {
        setProjects(projectsData);
      }

      const { data: pfmeaRows, error: pfmeaErr } = await supabase
        .from('projects_pfmea')
        .select('project_id, updated_at, projects ( id, name, description, publish_status )')
        .order('updated_at', { ascending: false });

      if (pfmeaErr) {
        console.error('projects_pfmea load error:', pfmeaErr);
        toast.error(pfmeaErr.message || 'Failed to load projects_pfmea');
        setPfmeaTemplates([]);
      } else {
        const mapped: PfmeaTemplateContext[] = (pfmeaRows ?? []).map((row: Record<string, unknown>) => {
          const pr = row.projects as { name?: string; description?: string } | null;
          return {
            project_id: row.project_id as string,
            name: pr?.name ?? 'Unknown project',
            description: pr?.description ?? undefined,
          };
        });
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
      const { error: upsertErr } = await supabase
        .from('projects_pfmea')
        .upsert({ project_id: projectId }, { onConflict: 'project_id' });
      if (upsertErr) {
        console.error('projects_pfmea upsert:', upsertErr);
        toast.error(upsertErr.message || 'Could not ensure projects_pfmea row');
        return;
      }

      const nameFromList = pfmeaTemplates.find((t) => t.project_id === projectId)?.name;
      const nameFromProjects = projects.find((p) => p.id === projectId)?.name;
      setSelectedPfmeaProject({
        project_id: projectId,
        name: nameFromList ?? nameFromProjects ?? 'Project',
        description: projects.find((p) => p.id === projectId)?.description,
      });

      await fetchPfmeaDetails(projectId);
    };

    void run();
  }, [projectId, loading, pfmeaTemplates, projects, fetchPfmeaDetails]);

  const addFailureMode = async (requirementId: string) => {
    try {
      const { error } = await supabase
        .from('pfmea_failure_modes')
        .insert({
          requirement_id: requirementId,
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

  const calculateRPN = (failureMode: PFMEAFailureMode): number => {
    const maxSeverity = maxPfmeaSeverityForFailureMode(failureMode);
    
    const avgOccurrence = failureMode.pfmea_potential_causes.length > 0
      ? failureMode.pfmea_potential_causes.reduce((sum, c) => sum + c.occurrence_score, 0) / failureMode.pfmea_potential_causes.length
      : 10;

    const detectionScores = failureMode.pfmea_controls
      .filter((c) => c.control_type === 'detection' && c.detection_score != null)
      .map((c) => c.detection_score!);
    const minDetection =
      detectionScores.length > 0 ? Math.min(...detectionScores, 10) : 10;

    return Math.round(maxSeverity * avgOccurrence * minDetection);
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

  // Editing functions for inline editing
  const startEdit = (row: string, column: string, type: string, currentValue: string) => {
    setEditingCell({ row, column, type });
    setEditingValue(currentValue);
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditingValue('');
  };

  const saveEdit = async () => {
    if (!editingCell) return;

    try {
      const { row, column, type } = editingCell;
      
      // Update based on type
      if (type === 'failure_mode') {
        await supabase
          .from('pfmea_failure_modes')
          .update({ failure_mode: editingValue })
          .eq('id', row);
      } else if (type === 'effect') {
        await supabase
          .from('pfmea_potential_effects')
          .update({ effect_description: editingValue })
          .eq('id', row);
      } else if (type === 'effect_severity') {
        await supabase
          .from('pfmea_potential_effects')
          .update({ severity_score: parseInt(editingValue) })
          .eq('id', row);
      } else if (type === 'cause') {
        await supabase
          .from('pfmea_potential_causes')
          .update({ cause_description: editingValue })
          .eq('id', row);
      } else if (type === 'cause_occurrence') {
        await supabase
          .from('pfmea_potential_causes')
          .update({ occurrence_score: parseInt(editingValue) })
          .eq('id', row);
      } else if (type === 'control') {
        await supabase
          .from('pfmea_controls')
          .update({ control_description: editingValue })
          .eq('id', row);
      } else if (type === 'control_detection') {
        await supabase
          .from('pfmea_controls')
          .update({ detection_score: parseInt(editingValue) })
          .eq('id', row);
      } else if (type === 'action') {
        await supabase
          .from('pfmea_action_items')
          .update({ recommended_action: editingValue })
          .eq('id', row);
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
    value: string,
    rowId: string,
    column: string,
    type: string,
    isDropdown = false,
    opts?: { fullWidth?: boolean }
  ) => {
    const isEditing = editingCell?.row === rowId && editingCell?.column === column;
    const fw = opts?.fullWidth;

    if (isEditing) {
      if (isDropdown) {
        return (
          <Select
            value={editingValue}
            onValueChange={(newValue) => {
              setEditingValue(newValue);
              setTimeout(() => saveEdit(), 0);
            }}
            onOpenChange={(open) => {
              if (!open && editingValue !== value) {
                saveEdit();
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
        <Input
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveEdit();
            if (e.key === 'Escape') cancelEdit();
          }}
          onBlur={saveEdit}
          className={cn('h-8 text-sm', fw && 'w-full min-w-0')}
          autoFocus
        />
      );
    }

    return (
      <div
        className={cn(
          'cursor-pointer rounded-sm hover:bg-muted/40',
          fw ? 'min-h-[22px] w-full min-w-0 py-0.5' : 'min-h-[22px] p-0.5'
        )}
        onClick={() => startEdit(rowId, column, type, value)}
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

  const addPotentialEffect = async (failureModeId: string) => {
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

  const addControl = async (failureModeId: string, controlType: 'prevention' | 'detection') => {
    try {
      const { error } = await supabase
        .from('pfmea_controls')
        .insert({
          failure_mode_id: failureModeId,
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

  type PfmeaFlatRow =
    | { kind: 'empty'; requirement: PFMEARequirement }
    | {
        kind: 'fm';
        requirement: PFMEARequirement;
        failureMode: PFMEAFailureMode;
        firstInReq: boolean;
        groupSize: number;
      };

  const pfmeaFlatRows: PfmeaFlatRow[] = useMemo(() => {
    const out: PfmeaFlatRow[] = [];
    for (const requirement of requirements) {
      const reqFms = failureModes.filter((fm) => fm.requirement_id === requirement.id);
      if (reqFms.length === 0) {
        out.push({ kind: 'empty', requirement });
      } else {
        reqFms.forEach((fm, idx) => {
          out.push({
            kind: 'fm',
            requirement,
            failureMode: fm,
            firstInReq: idx === 0,
            groupSize: reqFms.length,
          });
        });
      }
    }
    return out;
  }, [requirements, failureModes]);

  useEffect(() => {
    setGridFocus((f) => ({
      ...f,
      rowIndex: Math.min(f.rowIndex, Math.max(0, pfmeaFlatRows.length - 1)),
    }));
  }, [pfmeaFlatRows.length]);

  const handleColumnAdd = useCallback(
    (col: PfmeaNavColumn) => {
      const entry = pfmeaFlatRows[gridFocus.rowIndex];
      if (!entry) {
        toast.error('Select a row in the PFMEA table (click a cell or focus the table and use arrow keys).');
        return;
      }
      if (entry.kind === 'empty') {
        if (col === 'failure_mode') {
          void addFailureMode(entry.requirement.id);
          return;
        }
        toast.message('Add a failure mode for this step first', {
          description: 'Use the + control on the Failure Mode column header.',
        });
        return;
      }
      const { requirement, failureMode: fm } = entry;
      switch (col) {
        case 'failure_mode':
          void addFailureMode(requirement.id);
          return;
        case 'effects':
        case 's':
          void addPotentialEffect(fm.id);
          return;
        case 'causes':
        case 'o':
          void addPotentialCause(fm.id);
          return;
        case 'prevention_controls':
          void addControl(fm.id, 'prevention');
          return;
        case 'detection_controls':
        case 'd':
          void addControl(fm.id, 'detection');
          return;
        case 'rpn':
        case 'ap':
          return;
        case 'recommended_actions':
          void addActionItem(fm.id);
          return;
        default:
          return;
      }
    },
    [pfmeaFlatRows, gridFocus.rowIndex]
  );

  const handlePfmeaGridKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (pfmeaFlatRows.length === 0) return;
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (el.closest('[data-radix-popper-content-wrapper]')) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setGridFocus((f) => ({
          ...f,
          rowIndex: Math.min(f.rowIndex + 1, pfmeaFlatRows.length - 1),
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
        setGridFocus((f) => ({ ...f, rowIndex: pfmeaFlatRows.length - 1 }));
      }
    },
    [pfmeaFlatRows.length]
  );

  const pfmeaThSticky = 'sticky top-0 z-20 border-b shadow-sm';
  /** Column header bar colors (PFMEA table). */
  const pfmeaHeaderBar = {
    structure: `${pfmeaThSticky} bg-[#0c2744] text-white border-blue-950/60`,
    failure: `${pfmeaThSticky} bg-amber-400 text-amber-950 border-amber-600/70`,
    effectSeverity: `${pfmeaThSticky} bg-[#722f37] text-white border-[#5c262e]`,
    causeOccurrence: `${pfmeaThSticky} bg-green-800 text-white border-green-950/70`,
    detectionPurple: `${pfmeaThSticky} bg-purple-800 text-white border-purple-950/80`,
    other: `${pfmeaThSticky} bg-slate-600 text-white border-slate-800`,
  } as const;

  const renderHeaderWithPlus = (
    label: string,
    col: PfmeaNavColumn,
    opts?: { derived?: boolean; barClassName: string; lightBar?: boolean; hidePlus?: boolean }
  ) => (
    <TableHead className={cn(opts?.barClassName ?? pfmeaHeaderBar.other, 'h-auto px-1 py-1 align-bottom')}>
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
    </TableHead>
  );

  const focusCellClass = (rowIndex: number, col: PfmeaNavColumn) =>
    gridFocus.rowIndex === rowIndex && gridFocus.col === col ? 'ring-2 ring-primary ring-inset' : '';

  const pfmeaTrashButton = (label: string, onRequest: () => void) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
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
                ? `Preparing PFMEA for "${sourceProject.name}" (projects_pfmea + workflow sync)…`
                : 'Preparing PFMEA for this project…'}
            </p>
          </CardContent>
        </Card>
      );
    }

    if (projectId && selectedPfmeaProject) {
      return (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">{selectedPfmeaProject.name}</p>
          </div>
        </div>
      );
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
              Each project has a <code className="text-xs">projects_pfmea</code> row. Requirements link to{' '}
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

    const td = 'p-1 align-top';

    return (
      <Card>
        <CardContent className="min-w-0 p-0">
          <p className="px-3 py-2 text-xs text-muted-foreground border-b bg-muted/20">
            Focus the table (click inside the grid or Tab to it), then use arrow keys to move the selection. Header + adds a line for the{' '}
            <span className="font-medium text-foreground">selected row</span> (same process step). Phases, operations, and steps are edited only in{' '}
            <span className="font-medium text-foreground">Process Map</span>.
          </p>
          <div
            role="grid"
            aria-label="PFMEA worksheet"
            tabIndex={0}
            onKeyDown={handlePfmeaGridKeyDown}
            className="h-[600px] w-full min-w-0 touch-pan-x overflow-x-auto overflow-y-auto overscroll-x-contain outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <table className="w-full min-w-[1800px] caption-bottom text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className={cn(pfmeaHeaderBar.structure, 'h-auto min-w-[120px] px-1 py-1 font-medium')}>
                    Phase
                  </TableHead>
                  <TableHead className={cn(pfmeaHeaderBar.structure, 'h-auto min-w-[140px] px-1 py-1 font-medium')}>
                    Operation
                  </TableHead>
                  <TableHead className={cn(pfmeaHeaderBar.structure, 'h-auto min-w-[120px] px-1 py-1 font-medium')}>
                    Process Step
                  </TableHead>
                  <TableHead className={cn(pfmeaHeaderBar.structure, 'h-auto min-w-[260px] px-1 py-1 font-medium')}>
                    Step Description
                  </TableHead>
                  {renderHeaderWithPlus('Failure Mode', 'failure_mode', {
                    barClassName: pfmeaHeaderBar.failure,
                    lightBar: true,
                  })}
                  {renderHeaderWithPlus('Potential Effects', 'effects', { barClassName: pfmeaHeaderBar.effectSeverity })}
                  {renderHeaderWithPlus('S', 's', { barClassName: pfmeaHeaderBar.effectSeverity, hidePlus: true })}
                  {renderHeaderWithPlus('Potential Causes', 'causes', { barClassName: pfmeaHeaderBar.causeOccurrence })}
                  {renderHeaderWithPlus('Prevention Controls', 'prevention_controls', {
                    barClassName: pfmeaHeaderBar.causeOccurrence,
                  })}
                  {renderHeaderWithPlus('O', 'o', { barClassName: pfmeaHeaderBar.causeOccurrence, hidePlus: true })}
                  {renderHeaderWithPlus('Detection Controls', 'detection_controls', {
                    barClassName: pfmeaHeaderBar.detectionPurple,
                  })}
                  {renderHeaderWithPlus('D', 'd', { barClassName: pfmeaHeaderBar.detectionPurple, hidePlus: true })}
                  {renderHeaderWithPlus('RPN', 'rpn', {
                    derived: true,
                    barClassName: pfmeaHeaderBar.other,
                    hidePlus: true,
                  })}
                  {renderHeaderWithPlus('Action Priority', 'ap', {
                    derived: true,
                    barClassName: pfmeaHeaderBar.other,
                    hidePlus: true,
                  })}
                  {renderHeaderWithPlus('Recommended Actions', 'recommended_actions', {
                    barClassName: pfmeaHeaderBar.other,
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pfmeaFlatRows.map((entry, rowIndex) => {
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
                            {requirement.requirement_text}
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
                  const rpn = calculateRPN(failureMode);
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
                              {requirement.requirement_text}
                            </div>
                          </TableCell>
                        </>
                      ) : null}
                      <TableCell
                        className={cn(td, focusCellClass(rowIndex, 'failure_mode'))}
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
                        className={cn(td, 'min-w-0 max-w-none', focusCellClass(rowIndex, 'effects'))}
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
                        className={cn(td, 'text-center text-sm font-bold tabular-nums', focusCellClass(rowIndex, 's'))}
                        onMouseDown={() => setGridFocus({ rowIndex, col: 's' })}
                      >
                        {maxPfmeaSeverityForFailureMode(failureMode)}
                      </TableCell>
                      <TableCell
                        className={cn(td, 'min-w-0', focusCellClass(rowIndex, 'causes'))}
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
                        className={cn(td, 'min-w-0', focusCellClass(rowIndex, 'prevention_controls'))}
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
                        className={cn(td, 'text-center text-sm font-bold tabular-nums', focusCellClass(rowIndex, 'o'))}
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
                        className={cn(td, 'min-w-0', focusCellClass(rowIndex, 'detection_controls'))}
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
                        className={cn(td, 'text-center text-sm font-bold tabular-nums', focusCellClass(rowIndex, 'd'))}
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
                          'text-center text-lg font-bold tabular-nums',
                          ap === 'H' ? 'text-red-600' : ap === 'M' ? 'text-orange-600' : 'text-green-700',
                          focusCellClass(rowIndex, 'rpn')
                        )}
                        onMouseDown={() => setGridFocus({ rowIndex, col: 'rpn' })}
                      >
                        {rpn}
                      </TableCell>
                      <TableCell
                        className={cn(td, 'text-center', focusCellClass(rowIndex, 'ap'))}
                        onMouseDown={() => setGridFocus({ rowIndex, col: 'ap' })}
                      >
                        <Badge variant="outline" className={getActionPriorityBadgeClasses(ap)}>
                          {ap === 'H' ? 'High' : ap === 'M' ? 'Medium' : 'Low'}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={cn(td, 'min-w-0', focusCellClass(rowIndex, 'recommended_actions'))}
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
                })}
              </TableBody>
            </table>
          </div>
        </CardContent>
      </Card>
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
    <div className="space-y-6">

      {renderProjectSelector()}

      {selectedPfmeaProject && (
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview & Reports</TabsTrigger>
            <TabsTrigger value="table">PFMEA Table</TabsTrigger>
            <TabsTrigger value="actions">Action Tracker</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
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

          <TabsContent value="table" className="mt-6">
            {renderPfmeaTable()}
          </TabsContent>

          <TabsContent value="actions" className="mt-6">
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
                            const rpnA = calculateRPN(a.failureMode);
                            const rpnB = calculateRPN(b.failureMode);
                            return rpnB - rpnA;
                          })
                          .map((actionItem) => {
                            const rpn = calculateRPN(actionItem.failureMode);
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