import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Edit, Trash2, Target, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

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

interface PFMEAManagementProps {
  projectId?: string; // Optional project ID to bypass selection and go directly to editor
}

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

export const PFMEAManagement: React.FC<PFMEAManagementProps> = ({ projectId }) => {
  const [pfmeaTemplates, setPfmeaTemplates] = useState<PfmeaTemplateContext[]>([]);
  const [selectedPfmeaProject, setSelectedPfmeaProject] = useState<PfmeaTemplateContext | null>(null);
  const [projects, setProjects] = useState<DatabaseProject[]>([]);
  const [requirements, setRequirements] = useState<PFMEARequirement[]>([]);
  const [failureModes, setFailureModes] = useState<PFMEAFailureMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{row: string, column: string, type: string} | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [currentTab, setCurrentTab] = useState('overview');

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
    const maxSeverity = Math.max(
      failureMode.severity_score || 0,
      ...failureMode.pfmea_potential_effects.map(e => e.severity_score)
    );
    
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

  const getRPNColor = (rpn: number): string => {
    if (rpn >= 200) return 'bg-red-100 border-red-500 text-red-900';
    if (rpn >= 100) return 'bg-orange-100 border-orange-500 text-orange-900';
    if (rpn >= 50) return 'bg-yellow-100 border-yellow-500 text-yellow-900';
    return 'bg-green-100 border-green-500 text-green-900';
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

  const renderEditableCell = (value: string, rowId: string, column: string, type: string, isDropdown = false) => {
    const isEditing = editingCell?.row === rowId && editingCell?.column === column;
    
    if (isEditing) {
      if (isDropdown) {
        return (
          <Select 
            value={editingValue} 
            onValueChange={(newValue) => {
              setEditingValue(newValue);
              // Auto-save on dropdown change
              setTimeout(() => saveEdit(), 0);
            }}
            onOpenChange={(open) => {
              if (!open && editingValue !== value) {
                saveEdit();
              }
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                <SelectItem key={num} value={num.toString()}>
                  {num}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      } else {
        return (
          <Input
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            onBlur={saveEdit}
            className="h-8"
            autoFocus
          />
        );
      }
    }

    return (
      <div
        className="cursor-pointer hover:bg-muted/50 p-1 rounded min-h-[24px]"
        onClick={() => startEdit(rowId, column, type, value)}
      >
        {value || <span className="text-muted-foreground italic">Click to edit</span>}
      </div>
    );
  };

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
            <p className="text-xs text-muted-foreground">
              PFMEA lines reference custom phases only (linked via project_phases / phase_operations / operation_steps).
            </p>
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

    return (
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px] w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Phase</TableHead>
                  <TableHead className="min-w-[120px]">Operation</TableHead>
                  <TableHead className="min-w-[120px]">Process Step</TableHead>
                  <TableHead className="min-w-[200px]">Failure Mode</TableHead>
                  <TableHead className="min-w-[200px]">Potential Effects</TableHead>
                  <TableHead className="w-20">S</TableHead>
                  <TableHead className="min-w-[200px]">Potential Causes</TableHead>
                  <TableHead className="w-20">O</TableHead>
                  <TableHead className="min-w-[200px]">Controls</TableHead>
                  <TableHead className="w-20">D</TableHead>
                  <TableHead className="w-20">RPN</TableHead>
                  <TableHead className="min-w-[200px]">Recommended Actions</TableHead>
                  <TableHead className="w-40">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requirements.map(requirement => {
                  const reqFailureModes = failureModes.filter(fm => fm.requirement_id === requirement.id);
                  
                  // If no failure modes exist for this requirement, show an empty row with add button
                  if (reqFailureModes.length === 0) {
                    return (
                      <TableRow key={requirement.id}>
                        <TableCell className="font-medium">
                          <div className="text-sm">{requirementPhaseName(requirement)}</div>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="text-sm">{requirementOperationName(requirement)}</div>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="space-y-1">
                            <div className="text-sm">{requirementStepName(requirement)}</div>
                            <div className="text-xs text-muted-foreground font-normal">{requirement.requirement_text}</div>
                          </div>
                        </TableCell>
                        <TableCell colSpan={9} className="text-center py-4">
                          <Button
                            variant="outline"
                            onClick={() => addFailureMode(requirement.id)}
                            className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add First Failure Mode
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  }
                  
                  return reqFailureModes.map((failureMode, index) => {
                    const rpn = calculateRPN(failureMode);
                    const rpnColorClass = getRPNColor(rpn);
                    
                    return (
                      <TableRow key={failureMode.id} className={rpnColorClass}>
                        {index === 0 && (
                          <>
                            <TableCell rowSpan={reqFailureModes.length} className="font-medium">
                              <div className="text-sm">{requirementPhaseName(requirement)}</div>
                            </TableCell>
                            <TableCell rowSpan={reqFailureModes.length} className="font-medium">
                              <div className="text-sm">{requirementOperationName(requirement)}</div>
                            </TableCell>
                            <TableCell rowSpan={reqFailureModes.length} className="font-medium">
                              <div className="space-y-1">
                                <div className="text-sm">{requirementStepName(requirement)}</div>
                                <div className="text-xs text-muted-foreground font-normal">{requirement.requirement_text}</div>
                              </div>
                            </TableCell>
                          </>
                        )}
                        <TableCell>
                          {renderEditableCell(failureMode.failure_mode, failureMode.id, 'failure_mode', 'failure_mode')}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {failureMode.pfmea_potential_effects.map(effect => (
                              <div key={effect.id} className="text-sm border rounded p-2">
                                {renderEditableCell(effect.effect_description, effect.id, 'effect_description', 'effect')}
                                <div className="text-xs text-muted-foreground mt-1">
                                  S: {renderEditableCell(effect.severity_score.toString(), effect.id, 'severity_score', 'effect_severity', true)}
                                </div>
                              </div>
                            ))}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => addPotentialEffect(failureMode.id)}
                              className="text-xs p-1 h-6"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add Effect
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          {Math.max(failureMode.severity_score || 0, ...failureMode.pfmea_potential_effects.map(e => e.severity_score))}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {failureMode.pfmea_potential_causes.map(cause => (
                              <div key={cause.id} className="text-sm border rounded p-2">
                                {renderEditableCell(cause.cause_description, cause.id, 'cause_description', 'cause')}
                                <div className="text-xs text-muted-foreground mt-1">
                                  O: {renderEditableCell(cause.occurrence_score.toString(), cause.id, 'occurrence_score', 'cause_occurrence', true)}
                                </div>
                              </div>
                            ))}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => addPotentialCause(failureMode.id)}
                              className="text-xs p-1 h-6"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add Cause
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          {failureMode.pfmea_potential_causes.length > 0
                            ? Math.round(failureMode.pfmea_potential_causes.reduce((sum, c) => sum + c.occurrence_score, 0) / failureMode.pfmea_potential_causes.length)
                            : 10
                          }
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {failureMode.pfmea_controls
                              .filter(control => control.control_type === 'prevention')
                              .map(control => (
                                <div key={control.id} className="text-sm border rounded p-2">
                                  <Badge variant="outline" className="text-xs mr-1">Prev</Badge>
                                  {renderEditableCell(control.control_description, control.id, 'control_description', 'control')}
                                </div>
                              ))
                            }
                            {failureMode.pfmea_controls
                              .filter(control => control.control_type === 'detection')
                              .map(control => (
                                <div key={control.id} className="text-sm border rounded p-2">
                                  <Badge variant="outline" className="text-xs mr-1">Det</Badge>
                                  {renderEditableCell(control.control_description, control.id, 'control_description', 'control')}
                                  <div className="text-xs text-muted-foreground mt-1">
                                    D: {renderEditableCell((control.detection_score || 5).toString(), control.id, 'detection_score', 'control_detection', true)}
                                  </div>
                                </div>
                              ))
                            }
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => addControl(failureMode.id, 'prevention')}
                                className="text-xs p-1 h-6"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Prev
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => addControl(failureMode.id, 'detection')}
                                className="text-xs p-1 h-6"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Det
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          {(() => {
                            const d = failureMode.pfmea_controls
                              .filter((c) => c.control_type === 'detection' && c.detection_score != null)
                              .map((c) => c.detection_score!);
                            return d.length > 0 ? Math.min(...d, 10) : '—';
                          })()}
                        </TableCell>
                        <TableCell className={`text-center font-bold text-lg ${rpn >= 200 ? 'text-red-600' : rpn >= 100 ? 'text-orange-600' : ''}`}>
                          {rpn}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {failureMode.pfmea_action_items.map(action => (
                              <div key={action.id} className="text-sm p-2 bg-blue-50 rounded border">
                                {renderEditableCell(action.recommended_action, action.id, 'recommended_action', 'action')}
                                <div className="text-xs text-muted-foreground mt-1">
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
                              className="text-xs p-1 h-6"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add Action
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {index === 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addFailureMode(requirement.id)}
                                className="text-xs px-2 py-1 h-auto bg-blue-50 hover:bg-blue-100 border-blue-200"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Failure Mode
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addPotentialEffect(failureMode.id)}
                              className="text-xs px-2 py-1 h-auto bg-red-50 hover:bg-red-100 border-red-200"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Effect
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addPotentialCause(failureMode.id)}
                              className="text-xs px-2 py-1 h-auto bg-orange-50 hover:bg-orange-100 border-orange-200"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Cause
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addControl(failureMode.id, 'prevention')}
                              className="text-xs px-2 py-1 h-auto bg-green-50 hover:bg-green-100 border-green-200"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Control
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addActionItem(failureMode.id)}
                              className="text-xs px-2 py-1 h-auto bg-purple-50 hover:bg-purple-100 border-purple-200"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Action
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  });
                })}
              </TableBody>
            </Table>
          </ScrollArea>
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
                        <span className="font-medium">High Priority (RPN ≥ 200)</span>
                      </div>
                      <div className="text-2xl font-bold text-green-600">
                        {failureModes.filter(fm => calculateRPN(fm) >= 200).length}
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
                  <CardTitle>RPN Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: 'Critical (≥ 200)', color: 'bg-red-500', count: failureModes.filter(fm => calculateRPN(fm) >= 200).length },
                      { label: 'High (100-199)', color: 'bg-orange-500', count: failureModes.filter(fm => { const rpn = calculateRPN(fm); return rpn >= 100 && rpn < 200; }).length },
                      { label: 'Medium (50-99)', color: 'bg-yellow-500', count: failureModes.filter(fm => { const rpn = calculateRPN(fm); return rpn >= 50 && rpn < 100; }).length },
                      { label: 'Low (< 50)', color: 'bg-green-500', count: failureModes.filter(fm => calculateRPN(fm) < 50).length }
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
                          <TableHead className="cursor-pointer hover:bg-muted/50">Action</TableHead>
                          <TableHead className="cursor-pointer hover:bg-muted/50">Owner</TableHead>
                          <TableHead className="cursor-pointer hover:bg-muted/50">Due Date</TableHead>
                          <TableHead className="cursor-pointer hover:bg-muted/50">Project</TableHead>
                          <TableHead className="cursor-pointer hover:bg-muted/50">Status</TableHead>
                          <TableHead className="cursor-pointer hover:bg-muted/50">RPN</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getAllActionItems()
                          .sort((a, b) => {
                            if (a.status === 'complete' && b.status !== 'complete') return 1;
                            if (a.status !== 'complete' && b.status === 'complete') return -1;
                            const rpnA = calculateRPN(a.failureMode);
                            const rpnB = calculateRPN(b.failureMode);
                            return rpnB - rpnA;
                          })
                          .map((actionItem) => {
                            const rpn = calculateRPN(actionItem.failureMode);
                            return (
                              <TableRow key={actionItem.id} className={actionItem.status === 'complete' ? 'opacity-60' : ''}>
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
                                    className={`${
                                      rpn >= 200 ? 'border-red-500 text-red-700' :
                                      rpn >= 100 ? 'border-orange-500 text-orange-700' :
                                      rpn >= 50 ? 'border-yellow-500 text-yellow-700' :
                                      'border-green-500 text-green-700'
                                    }`}
                                  >
                                    {rpn}
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
    </div>
  );
};