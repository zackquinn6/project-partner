import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

const db: any = supabase;
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
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, FileText, Info, Plus, Scale, Target, Trash2 } from 'lucide-react';
import { PfmeaScoringCriteriaDialog } from '@/components/PfmeaScoringCriteriaDialog';
import { ProjectRiskRulesEditor } from '@/components/ProjectRiskRulesEditor';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Output, StepInput } from '@/interfaces/Project';
import {
  buildUniquePfmeaProcessVariableNames,
  parseProcessVariablesFromDb,
  serializeProcessVariablesForDb,
  type WorkflowStepProcessVariableRow,
} from '@/utils/processVariablesUtils';
import {
  aggregatePfmeaMetrics,
  calculateActionPriority,
  calculateRPN,
  maxPfmeaSeverityForFailureMode,
  minPfmeaDetectionScoreForFailureMode,
  preventionCoverageForFailureMode,
} from '@/utils/pfmeaRiskMetrics';
import { detectionControlIssuesForStep } from '@/utils/detectionControlValidation';
import {
  newOutputId,
  parseAuthorableOutputs,
  syncPfmeaRequirementsForProject,
} from '@/utils/pfmeaRequirementSync';
import { useActionPriorityTable } from '@/hooks/useActionPriorityTable';
import {
  actionPriorityLabel,
  type ActionPriorityTable,
} from '@/utils/actionPriorityTable';
import {
  RISK_DIMENSIONS,
  RISK_DIMENSION_LABELS,
  actionPriorityUrgency,
  type ActionPriority,
} from '@/utils/riskDimensions';
import {
  loadStepRiskEvidence,
  stepsNeedingOccurrenceReview,
  type StepOccurrenceComparison,
} from '@/utils/riskEvidence';
import { useOccurrenceDrivers } from '@/hooks/useOccurrenceDrivers';
import {
  CONTROL_STRENGTHS,
  CONTROL_STRENGTH_LABELS,
  KC_DISQUALIFICATION_TEXT,
  RISK_ITEM_KINDS,
  RISK_ITEM_KIND_LABELS,
  evaluateKeyCharacteristic,
  isControlStrength,
  listKcItemOptions,
  summarizeKcClassificationGaps,
  type ControlStrength,
  type OccurrenceDriverTable,
  type RiskItemKind,
  type StepItemSource,
} from '@/utils/keyCharacteristics';

// Database types for PFMEA
interface DatabaseProject {
  id: string;
  name: string;
  description: string;
  phases: any;
  [key: string]: any;
}

/** Catalog project whose PFMEA is being authored. */
interface PfmeaTemplateContext {
  project_id: string;
  name: string;
  description?: string;
  publish_status?: 'draft' | 'beta-testing' | 'published' | 'archived' | string | null;
}

/**
 * A row of pfmea_requirements plus its place in the workflow. `id` is a real primary key, so
 * a failure mode's link survives outputs being reordered on the step.
 */
interface PFMEARequirement {
  id: string;
  project_id: string;
  project_phase_id: string;
  phase_operation_id: string;
  operation_step_id: string;
  requirement_text: string;
  output_id: string | null;
  display_order: number;
  project_phases?: {
    id: string;
    name: string;
    position_rule?: string | null;
    position_value?: number | null;
  } | null;
  phase_operations?: { id: string; operation_name: string; display_order: number } | null;
  operation_steps?: {
    id: string;
    step_title: string;
    display_order: number;
    description?: string | null;
    outputs?: unknown;
    process_variables?: unknown;
    materials?: unknown;
    tools?: unknown;
  } | null;
}

interface PFMEAFailureMode {
  id: string;
  project_id: string;
  operation_step_id: string;
  requirement_id: string;
  failure_mode: string;
  /** Null until authored. An unscored line is reported as unscored, not scored as maximum. */
  severity_score: number | null;
  pfmea_potential_effects: PFMEAPotentialEffect[];
  pfmea_potential_causes: PFMEAPotentialCause[];
  pfmea_controls: PFMEAControl[];
  pfmea_action_items: PFMEAActionItem[];
}

interface PFMEAPotentialEffect {
  id: string;
  failure_mode_id: string;
  effect_description: string;
  severity_score: number | null;
}

interface PFMEAPotentialCause {
  id: string;
  failure_mode_id: string;
  cause_description: string;
  occurrence_score: number | null;
  /** Null until classified. An unclassified cause cannot become a Key Characteristic. */
  occurrence_driver: string | null;
  implicated_item_kind: RiskItemKind | null;
  implicated_item_id: string | null;
}

interface PFMEAControl {
  id: string;
  failure_mode_id?: string;
  cause_id?: string;
  control_type: string;
  control_description: string;
  detection_score?: number;
  /** Prevention only. Mistake-proofing is what takes an item off the KC register. */
  control_strength: string | null;
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

/** Single source of truth: `pfmea_action_items` columns (PFMEA table + Action Tracker read the same row). */
function ymdFromIso(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function actionItemDisplayFields(action: PFMEAActionItem): {
  action: string;
  owner: string;
  dueYmd: string;
  status: string;
} {
  return {
    action: action.recommended_action,
    owner: action.responsible_person ?? '',
    dueYmd: ymdFromIso(action.target_completion_date),
    status: action.status ?? 'not_started',
  };
}

/** Read-only status label for PFMEA grid (tracker uses dropdown without `blocked`). */
function formatActionStatusLabel(status: string): string {
  switch (status) {
    case 'not_started':
      return 'Not started';
    case 'in_progress':
      return 'In progress';
    case 'complete':
      return 'Complete';
    case 'blocked':
      return 'Blocked';
    default:
      return status.replace(/_/g, ' ');
  }
}

function readOnlyActionStatusBadgeClassName(status: string): string {
  if (status === 'complete') {
    return 'border-success/40 bg-success/10 text-success';
  }
  if (status === 'in_progress') {
    return 'border-info/40 bg-info/10 text-info';
  }
  if (status === 'blocked') {
    return 'border-destructive/40 bg-destructive/10 text-destructive';
  }
  return 'border-muted-foreground/25 bg-muted/50 text-muted-foreground';
}

/**
 * PFMEA grid: unique process variable names only (bullets), no descriptions.
 * Shown only on rows that have a potential cause. Prefers `workflow_step_process_variables`; else JSON on step.
 */
function PfmeaProcessVariablesReadonlyCell({
  cause,
  requirement,
  workflowRowsForStep,
}: {
  cause: PFMEAPotentialCause | null;
  requirement: PFMEARequirement;
  workflowRowsForStep: WorkflowStepProcessVariableRow[] | undefined;
}) {
  if (!cause) {
    return <span className="text-xs italic text-muted-foreground">—</span>;
  }
  const names = buildUniquePfmeaProcessVariableNames(
    workflowRowsForStep,
    requirement.operation_steps?.process_variables
  );
  if (names.length === 0) {
    return <span className="text-xs italic text-muted-foreground">—</span>;
  }
  return (
    <ul className="m-0 list-outside list-disc space-y-1 pl-4 text-xs leading-snug marker:text-muted-foreground">
      {names.map((name, i) => (
        <li key={`${name}:${i}`} className="break-words font-medium text-foreground">
          {name}
        </li>
      ))}
    </ul>
  );
}

/**
 * Sentinel for "nothing chosen" in the classification selects. Radix needs a non-empty value,
 * and an empty string cannot be used because `none` is a real prevention strength.
 */
const KC_UNSET = '__unset';

/**
 * Occurrence driver and implicated item, authored on the cause.
 *
 * These are shown on every cause rather than behind a dialog because leaving the driver blank
 * quietly keeps the item off the Key Characteristic register, so the blank has to be visible.
 */
function CauseClassificationControls({
  cause,
  drivers,
  stepItemSource,
  editable,
  onDriverChange,
  onItemChange,
}: {
  cause: PFMEAPotentialCause;
  drivers: OccurrenceDriverTable | null;
  stepItemSource: StepItemSource | null;
  editable: boolean;
  onDriverChange: (driver: string | null) => void;
  onItemChange: (kind: RiskItemKind | null, itemId: string | null) => void;
}) {
  const itemKind = cause.implicated_item_kind;
  const itemOptions =
    stepItemSource && itemKind && itemKind !== 'step'
      ? listKcItemOptions(stepItemSource, itemKind)
      : [];

  if (!editable) {
    const driverLabel = cause.occurrence_driver
      ? drivers?.byDriver[cause.occurrence_driver]?.label ?? cause.occurrence_driver
      : null;
    const itemLabel = itemKind
      ? itemKind === 'step'
        ? RISK_ITEM_KIND_LABELS.step
        : itemOptions.find((option) => option.id === cause.implicated_item_id)?.name ?? null
      : null;
    if (!driverLabel && !itemLabel) return null;
    return (
      <div className="px-1 pb-1 text-xs text-muted-foreground">
        {[driverLabel, itemLabel].filter(Boolean).join(' · ')}
      </div>
    );
  }

  return (
    <div className="space-y-1 px-1 pb-1" onMouseDown={(e) => e.stopPropagation()}>
      <Select
        value={cause.occurrence_driver ?? KC_UNSET}
        onValueChange={(value) => onDriverChange(value === KC_UNSET ? null : value)}
      >
        <SelectTrigger className="h-6 w-full px-1.5 text-xs">
          <SelectValue placeholder="What drives how often" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={KC_UNSET}>What drives how often</SelectItem>
          {(drivers?.ordered ?? []).map((driver) => (
            <SelectItem key={driver.driver} value={driver.driver} title={driver.description}>
              {driver.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={itemKind ?? KC_UNSET}
        onValueChange={(value) =>
          onItemChange(value === KC_UNSET ? null : (value as RiskItemKind), null)
        }
      >
        <SelectTrigger className="h-6 w-full px-1.5 text-xs">
          <SelectValue placeholder="What it affects" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={KC_UNSET}>What it affects</SelectItem>
          {RISK_ITEM_KINDS.map((kind) => (
            <SelectItem key={kind} value={kind}>
              {RISK_ITEM_KIND_LABELS[kind]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {itemKind && itemKind !== 'step' ? (
        itemOptions.length > 0 ? (
          <Select
            value={cause.implicated_item_id ?? KC_UNSET}
            onValueChange={(value) => onItemChange(itemKind, value === KC_UNSET ? null : value)}
          >
            <SelectTrigger className="h-6 w-full px-1.5 text-xs">
              <SelectValue placeholder={`Which ${RISK_ITEM_KIND_LABELS[itemKind].toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={KC_UNSET}>
                {`Which ${RISK_ITEM_KIND_LABELS[itemKind].toLowerCase()}`}
              </SelectItem>
              {itemOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="text-xs text-warning-soft">
            {`This step has no ${RISK_ITEM_KIND_LABELS[itemKind].toLowerCase()} to point at.`}
          </div>
        )
      ) : null}
    </div>
  );
}

function getPotentialCauseSubtext(failureMode: PFMEAFailureMode, cause: PFMEAPotentialCause | null): string {
  if (cause?.cause_description) return cause.cause_description;
  const causes = failureMode.pfmea_potential_causes ?? [];
  if (causes.length === 0) return '—';
  return causes.map((c) => c.cause_description).join(' · ');
}

type PfmeaNavColumn =
  | 'requirements'
  | 'failure_mode'
  | 'effects'
  | 's'
  | 'process_variables'
  | 'causes'
  | 'prevention_controls'
  | 'o'
  | 'detection_controls'
  | 'd'
  | 'rpn'
  | 'ap'
  | 'kc'
  | 'recommended_actions';

const PFMEA_NAV_COLS: PfmeaNavColumn[] = [
  'requirements',
  'failure_mode',
  'effects',
  's',
  'process_variables',
  'causes',
  'prevention_controls',
  'o',
  'detection_controls',
  'd',
  'rpn',
  'ap',
  'kc',
  'recommended_actions',
];

/** Solid background + border classes for Requirements→Recommended Actions headers (`sticky top` only — they scroll horizontally with the table). */
const PFMEA_SCROLL_HEADER_STICKY: Record<
  PfmeaNavColumn,
  { backgroundColor: string; className: string }
> = {
  requirements: {
    backgroundColor: 'hsl(var(--warning-soft))',
    className: 'border-b border-warning-soft-foreground/25 shadow-sm',
  },
  failure_mode: {
    backgroundColor: 'hsl(var(--warning-soft))',
    className: 'border-b border-warning-soft-foreground/25 shadow-sm',
  },
  effects: {
    backgroundColor: 'hsl(var(--destructive-soft))',
    className: 'border-b border-destructive-soft-foreground/25 shadow-sm',
  },
  s: {
    backgroundColor: 'hsl(var(--destructive-soft))',
    className: 'border-b border-destructive-soft-foreground/25 shadow-sm',
  },
  process_variables: {
    backgroundColor: 'hsl(var(--success))',
    className: 'border-b border-success-foreground/25 shadow-sm',
  },
  causes: {
    backgroundColor: 'hsl(var(--success))',
    className: 'border-b border-success-foreground/25 shadow-sm',
  },
  prevention_controls: {
    backgroundColor: 'hsl(var(--success))',
    className: 'border-b border-success-foreground/25 shadow-sm',
  },
  o: {
    backgroundColor: 'hsl(var(--success))',
    className: 'border-b border-success-foreground/25 shadow-sm',
  },
  detection_controls: {
    backgroundColor: 'hsl(var(--category-3))',
    className: 'border-b border-category-3-foreground/25 shadow-sm',
  },
  d: {
    backgroundColor: 'hsl(var(--category-3))',
    className: 'border-b border-category-3-foreground/25 shadow-sm',
  },
  rpn: {
    backgroundColor: 'hsl(var(--muted-foreground))',
    className: 'border-b border-background/25 shadow-sm',
  },
  ap: {
    backgroundColor: 'hsl(var(--muted-foreground))',
    className: 'border-b border-background/25 shadow-sm',
  },
  kc: {
    backgroundColor: 'hsl(var(--muted-foreground))',
    className: 'border-b border-background/25 shadow-sm',
  },
  recommended_actions: {
    backgroundColor: 'hsl(var(--muted-foreground))',
    className: 'border-b border-background/25 shadow-sm',
  },
};

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
  /**
   * Requirements whose output no longer exists on the step. Surfaced rather than deleted,
   * because deleting one cascades to its authored failure modes.
   */
  const [orphanedRequirementIds, setOrphanedRequirementIds] = useState<string[]>([]);
  const {
    table: actionPriorityTable,
    loading: actionPriorityLoading,
    error: actionPriorityError,
  } = useActionPriorityTable();
  const [workflowStepPvByStepId, setWorkflowStepPvByStepId] = useState<
    Record<string, WorkflowStepProcessVariableRow[]>
  >({});
  /** Pooled instruction sections per step, so a cause can name the instruction it is about. */
  const [instructionSectionsByStepId, setInstructionSectionsByStepId] = useState<
    Record<string, unknown[]>
  >({});
  const {
    table: occurrenceDriverTable,
    error: occurrenceDriverError,
  } = useOccurrenceDrivers();
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
  const [addProcessVariableDialogStepId, setAddProcessVariableDialogStepId] = useState<string | null>(null);
  const [addProcessVariableName, setAddProcessVariableName] = useState('');
  const [addProcessVariableDescription, setAddProcessVariableDescription] = useState('');
  const [addProcessVariableUnit, setAddProcessVariableUnit] = useState('');
  const [addProcessVariableTargetValue, setAddProcessVariableTargetValue] = useState('');
  const [currentTab, setCurrentTab] = useState('overview');
  const [pfmeaColVisibility, setPfmeaColVisibility] = useState({
    phase: true,
    operation: true,
    step: true,
    step_description: false,
    process_variables: true,
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
    process_variables: 220,
    causes: 240,
    prevention_controls: 230,
    o: 64,
    detection_controls: 230,
    d: 64,
    rpn: 80,
    ap: 120,
    kc: 190,
    recommended_actions: 260,
  });

  const visiblePfmeaNavCols = useMemo(
    () =>
      PFMEA_NAV_COLS.filter(
        (c) => c !== 'process_variables' || pfmeaColVisibility.process_variables
      ),
    [pfmeaColVisibility.process_variables]
  );

  const [gridFocus, setGridFocus] = useState<{ rowIndex: number; col: PfmeaNavColumn }>({
    rowIndex: 0,
    col: 'failure_mode',
  });

  useEffect(() => {
    if (!pfmeaColVisibility.process_variables) {
      setGridFocus((f) => (f.col === 'process_variables' ? { ...f, col: 'causes' } : f));
    }
  }, [pfmeaColVisibility.process_variables]);
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
      // Reconcile requirement rows with the step outputs before reading, so an output added
      // or renamed in the Process Map shows up here without a separate manual step.
      const syncResult = await syncPfmeaRequirementsForProject(templateProjectId);
      setOrphanedRequirementIds(syncResult.orphanedRequirementIds);

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
              outputs,
              process_variables,
              materials,
              tools
            )
          )
        `
        )
        .eq('project_id', templateProjectId);

      if (phaseError) throw phaseError;

      const { data: requirementRows, error: requirementError } = await supabase
        .from('pfmea_requirements')
        .select('id, project_id, operation_step_id, output_id, requirement_text, display_order')
        .eq('project_id', templateProjectId);

      if (requirementError) throw requirementError;

      // Index the workflow so each requirement row can carry its phase, operation, and step.
      const stepContextById = new Map<
        string,
        Pick<PFMEARequirement, 'project_phase_id' | 'phase_operation_id' | 'project_phases' | 'phase_operations' | 'operation_steps'>
      >();
      for (const phase of phaseRows ?? []) {
        for (const operation of phase.phase_operations ?? []) {
          for (const step of operation.operation_steps ?? []) {
            stepContextById.set(step.id, {
              project_phase_id: phase.id,
              phase_operation_id: operation.id,
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
                process_variables: (step as { process_variables?: unknown }).process_variables,
                materials: (step as { materials?: unknown }).materials,
                tools: (step as { tools?: unknown }).tools,
              },
            });
          }
        }
      }

      const rows: PFMEARequirement[] = [];
      for (const row of requirementRows ?? []) {
        const context = stepContextById.get(row.operation_step_id);
        // A requirement whose step is gone cannot be placed in the grid. The sync above
        // reports it as orphaned rather than silently inventing a position for it.
        if (!context) continue;
        rows.push({
          id: row.id,
          project_id: row.project_id,
          operation_step_id: row.operation_step_id,
          requirement_text: row.requirement_text,
          output_id: row.output_id,
          display_order: row.display_order,
          ...context,
        });
      }
      setRequirements(rows);

      if (rows.length === 0) {
        setWorkflowStepPvByStepId({});
        setInstructionSectionsByStepId({});
        setFailureModes([]);
        return;
      }

      const stepIds = [...new Set(rows.map((r) => r.operation_step_id))];
      const wfByStep: Record<string, WorkflowStepProcessVariableRow[]> = {};
      if (stepIds.length > 0) {
        const { data: wspv, error: wspvErr } = await db
          .from('workflow_step_process_variables')
          .select('id, step_id, variable_key, label, description, variable_type, unit, required')
          .in('step_id', stepIds)
          .order('variable_key', { ascending: true });
        if (wspvErr) {
          console.error('workflow_step_process_variables load:', wspvErr);
        } else {
          for (const row of (wspv ?? []) as any[]) {
            const sid = row.step_id as string;
            if (!wfByStep[sid]) wfByStep[sid] = [];
            wfByStep[sid].push(row as WorkflowStepProcessVariableRow);
          }
        }
      }
      setWorkflowStepPvByStepId(wfByStep);

      // Instruction sections are the one addressable item kind that does not live on the step
      // row, so the implicated item picker needs them loaded separately.
      const sectionsByStepId: Record<string, unknown[]> = {};
      const { data: instructionRows, error: instructionError } = await supabase
        .from('step_instructions')
        .select('step_id, content')
        .in('step_id', stepIds);
      if (instructionError) {
        console.error('step_instructions load:', instructionError);
      } else {
        for (const row of instructionRows ?? []) {
          const sections = Array.isArray(row.content) ? row.content : [];
          if (!sectionsByStepId[row.step_id]) sectionsByStepId[row.step_id] = [];
          sectionsByStepId[row.step_id].push(...sections);
        }
      }
      setInstructionSectionsByStepId(sectionsByStepId);

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

  const syncFailureModeSeverityFromDb = useCallback(async (failureModeId: string) => {
    const { data: effs, error: effErr } = await supabase
      .from('pfmea_potential_effects')
      .select('severity_score')
      .eq('failure_mode_id', failureModeId);
    if (effErr) {
      console.error(effErr);
      return;
    }
    const { data: fmRow, error: fmErr } = await supabase
      .from('pfmea_failure_modes')
      .select('severity_score')
      .eq('id', failureModeId)
      .single();
    if (fmErr || !fmRow) return;
    // Mirror the highest authored effect severity onto the failure mode. Effects that have not
    // been scored yet do not participate, and if none are scored the row keeps its own value.
    const scoredEffects = (effs ?? [])
      .map((r) => r.severity_score)
      .filter((score): score is number => score != null);
    const next = scoredEffects.length > 0 ? Math.max(...scoredEffects) : fmRow.severity_score;
    if (next === fmRow.severity_score) return;
    const { error: upErr } = await supabase
      .from('pfmea_failure_modes')
      .update({ severity_score: next })
      .eq('id', failureModeId);
    if (upErr) console.error(upErr);
  }, []);

  const persistEffectSeverity = useCallback(
    async (effectId: string, scoreStr: string) => {
      if (!pfmeaIsEditable) {
        toast.error('PFMEA is locked. Switch this revision to draft to edit.');
        return;
      }
      try {
        const { data: effRow, error: selErr } = await supabase
          .from('pfmea_potential_effects')
          .select('failure_mode_id')
          .eq('id', effectId)
          .single();
        if (selErr) throw selErr;

        const { error } = await supabase
          .from('pfmea_potential_effects')
          .update({ severity_score: parseInt(scoreStr, 10) })
          .eq('id', effectId);
        if (error) throw error;
        if (effRow?.failure_mode_id) await syncFailureModeSeverityFromDb(effRow.failure_mode_id);
        if (selectedPfmeaProject) {
          await fetchPfmeaDetails(selectedPfmeaProject.project_id);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to update severity');
      }
    },
    [selectedPfmeaProject, fetchPfmeaDetails, pfmeaIsEditable, syncFailureModeSeverityFromDb]
  );

  const persistControlDetectionScore = useCallback(
    async (controlId: string, scoreStr: string) => {
      if (!pfmeaIsEditable) {
        toast.error('PFMEA is locked. Switch this revision to draft to edit.');
        return;
      }
      const parsed = parseInt(scoreStr, 10);
      if (Number.isNaN(parsed)) return;
      try {
        const { error } = await supabase.from('pfmea_controls').update({ detection_score: parsed }).eq('id', controlId);
        if (error) throw error;
        if (selectedPfmeaProject) await fetchPfmeaDetails(selectedPfmeaProject.project_id);
      } catch (err) {
        console.error(err);
        toast.error('Failed to update detection score');
      }
    },
    [pfmeaIsEditable, selectedPfmeaProject, fetchPfmeaDetails]
  );

  const executePfmeaLineDelete = useCallback(async () => {
    if (!pfmeaLineDeleteTarget || !selectedPfmeaProject) return;
    if (!pfmeaIsEditable) {
      toast.error('PFMEA is locked. Switch this revision to draft to edit.');
      return;
    }
    if (pfmeaLineDeleteTarget.kind === 'requirement_output') {
      const req = pfmeaLineDeleteTarget.requirement;
      setPfmeaDeletePending(true);
      try {
        // Remove the output from the step first. If this fails the requirement row survives
        // and the next sync leaves everything as it was.
        if (!req.output_id) {
          throw new Error('This requirement is not linked to an output on the step');
        }

        const { data: stepRow, error: stepErr } = await supabase
          .from('operation_steps')
          .select('id, outputs')
          .eq('id', req.operation_step_id)
          .single();
        if (stepErr) throw stepErr;

        const rawOutputs = Array.isArray(stepRow?.outputs) ? (stepRow.outputs as unknown[]) : [];
        const next = rawOutputs.filter((item) => {
          if (!item || typeof item !== 'object') return true;
          return String((item as Partial<Output>).id ?? '') !== req.output_id;
        });

        const { error: upErr } = await supabase
          .from('operation_steps')
          .update({ outputs: next as unknown as Json })
          .eq('id', req.operation_step_id);
        if (upErr) throw upErr;

        // Deleting the requirement cascades to its failure modes and everything under them.
        const { error: reqErr } = await supabase
          .from('pfmea_requirements')
          .delete()
          .eq('id', req.id);
        if (reqErr) throw reqErr;

        await fetchPfmeaDetails(selectedPfmeaProject.project_id);
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
    let effectFailureModeId: string | null = null;
    if (kind === 'effect') {
      const { data: effMeta } = await supabase
        .from('pfmea_potential_effects')
        .select('failure_mode_id')
        .eq('id', id)
        .single();
      effectFailureModeId = effMeta?.failure_mode_id ?? null;
    }
    setPfmeaDeletePending(true);
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      if (kind === 'effect' && effectFailureModeId) await syncFailureModeSeverityFromDb(effectFailureModeId);
      await fetchPfmeaDetails(selectedPfmeaProject.project_id);
            setPfmeaLineDeleteTarget(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete');
    } finally {
      setPfmeaDeletePending(false);
    }
  }, [pfmeaLineDeleteTarget, selectedPfmeaProject, fetchPfmeaDetails, pfmeaIsEditable, syncFailureModeSeverityFromDb]);

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
      // No severity is set here. A new failure mode has not been analyzed, and seeding a
      // middle score would make it indistinguishable from one an author actually rated.
      const { error } = await supabase
        .from('pfmea_failure_modes')
        .insert({
          project_id: requirement.project_id,
          operation_step_id: requirement.operation_step_id,
          requirement_id: requirement.id,
          failure_mode: 'New Failure Mode',
        });

      if (error) throw error;
      
      if (selectedPfmeaProject) {
        await fetchPfmeaDetails(selectedPfmeaProject.project_id);
      }
          } catch (error) {
      console.error('Error adding failure mode:', error);
      toast.error('Failed to add failure mode');
    }
  };

  /**
   * Priority comes from the seeded action priority table, so it is not recomputed here.
   * Null means the line is not fully scored, which the grid shows as unscored rather than
   * as Low.
   */
  const actionPriorityFor = useCallback(
    (failureMode: PFMEAFailureMode): ActionPriority | null => {
      if (!actionPriorityTable) return null;
      return calculateActionPriority(failureMode, actionPriorityTable, 'quality');
    },
    [actionPriorityTable]
  );

  /** The step's addressable items, for the implicated item picker and the KC verdict. */
  const stepItemSourceFor = useCallback(
    (requirement: PFMEARequirement): StepItemSource | null => {
      const step = requirement.operation_steps;
      if (!step) return null;
      return {
        stepTitle: step.step_title,
        outputs: step.outputs,
        processVariables: step.process_variables,
        materials: step.materials,
        tools: step.tools,
        instructionSections: instructionSectionsByStepId[step.id] ?? [],
      };
    },
    [instructionSectionsByStepId]
  );

  /**
   * Whether one cause line resolves to a Key Characteristic, using the same test Stage 3 runs.
   * Null while either lookup table is still loading, since a verdict without them is a guess.
   */
  const keyCharacteristicVerdictFor = useCallback(
    (failureMode: PFMEAFailureMode, cause: PFMEAPotentialCause) => {
      if (!actionPriorityTable || !occurrenceDriverTable) return null;
      const preventionForCause = failureMode.pfmea_controls.filter(
        (control) =>
          control.control_type === 'prevention' &&
          (!control.cause_id || control.cause_id === cause.id)
      );
      return evaluateKeyCharacteristic(
        {
          actionPriority: calculateActionPriority(failureMode, actionPriorityTable, 'quality'),
          occurrenceDriver: cause.occurrence_driver,
          isMistakeProofed: preventionForCause.some((c) => c.control_strength === 'mistake_proof'),
        },
        occurrenceDriverTable,
        actionPriorityTable
      );
    },
    [actionPriorityTable, occurrenceDriverTable]
  );

  /**
   * What is keeping causes off the KC register. An unclassified driver is the important number:
   * it silently excludes the item rather than producing a wrong answer.
   */
  const kcClassificationGaps = useMemo(() => {
    if (!actionPriorityTable || !occurrenceDriverTable) return null;
    let unclassifiedControlStrengthCount = 0;
    const items = failureModes.flatMap((fm) => {
      for (const control of fm.pfmea_controls) {
        if (control.control_type === 'prevention' && control.control_strength === null) {
          unclassifiedControlStrengthCount += 1;
        }
      }
      const mistakeProofedCauseIds = new Set<string>();
      let mistakeProofedAll = false;
      for (const control of fm.pfmea_controls) {
        if (control.control_type !== 'prevention') continue;
        if (control.control_strength !== 'mistake_proof') continue;
        if (control.cause_id) mistakeProofedCauseIds.add(control.cause_id);
        else mistakeProofedAll = true;
      }
      const priority = calculateActionPriority(fm, actionPriorityTable, 'quality');
      return (fm.pfmea_potential_causes ?? []).map((cause) => ({
        candidate: {
          actionPriority: priority,
          occurrenceDriver: cause.occurrence_driver,
          isMistakeProofed: mistakeProofedAll || mistakeProofedCauseIds.has(cause.id),
        },
        hasItemRef: cause.implicated_item_kind !== null,
      }));
    });
    return summarizeKcClassificationGaps(
      items,
      unclassifiedControlStrengthCount,
      occurrenceDriverTable,
      actionPriorityTable
    );
  }, [failureModes, actionPriorityTable, occurrenceDriverTable]);

  /** Null until the action priority table has loaded. Counts are never shown without it. */
  const pfmeaMetrics = useMemo(
    () =>
      actionPriorityTable
        ? aggregatePfmeaMetrics(failureModes, actionPriorityTable, 'quality')
        : null,
    [failureModes, actionPriorityTable]
  );

  /** Steps where reported problems disagree with the authored occurrence. Null while loading. */
  const [evidenceReviewSteps, setEvidenceReviewSteps] = useState<
    StepOccurrenceComparison[] | null
  >(null);

  /** The failure mode whose personalization rules are open, if any. */
  const [rulesEditorTarget, setRulesEditorTarget] = useState<{ id: string; label: string } | null>(
    null
  );

  const evidenceProjectId = selectedPfmeaProject?.project_id ?? null;

  useEffect(() => {
    if (!evidenceProjectId) {
      setEvidenceReviewSteps(null);
      return;
    }
    let cancelled = false;
    void loadStepRiskEvidence(evidenceProjectId)
      .then((evidence) => {
        if (!cancelled) setEvidenceReviewSteps(stepsNeedingOccurrenceReview(evidence));
      })
      .catch((err: unknown) => {
        console.error('Risk evidence load failed:', err);
        if (!cancelled) setEvidenceReviewSteps([]);
      });
    return () => {
      cancelled = true;
    };
  }, [evidenceProjectId]);

  const getActionPriorityRowClass = (ap: ActionPriority | null): string => {
    if (ap === 'H') return 'bg-destructive-soft/10';
    if (ap === 'M') return 'bg-warning-soft/10';
    if (ap === 'L') return 'bg-success/10';
    return '';
  };

  const getActionPriorityBadgeClasses = (ap: ActionPriority | null): string => {
    if (ap === 'H') return 'border-destructive-soft/40 text-destructive-soft';
    if (ap === 'M') return 'border-warning-soft/40 text-warning-soft';
    if (ap === 'L') return 'border-success/40 text-success';
    return 'border-muted-foreground/40 text-muted-foreground';
  };

  const getAllActionItems = () => {
    return failureModes.flatMap((failureMode) =>
      failureMode.pfmea_action_items.map((action) => ({
        ...action,
        failureMode,
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
        const { data: effMeta } = await supabase
          .from('pfmea_potential_effects')
          .select('failure_mode_id')
          .eq('id', entityId)
          .single();
        if (effMeta?.failure_mode_id) await syncFailureModeSeverityFromDb(effMeta.failure_mode_id);
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
      /** Borderless, full-bleed cell (e.g. prevention / detection control text). */
      plainCell?: boolean;
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
    const plain = opts?.plainCell;

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
            <SelectTrigger
              className={cn(
                'h-8',
                fw && 'w-full min-w-0',
                plain && 'border-0 bg-transparent shadow-none ring-0 ring-offset-0 focus:ring-1 focus:ring-ring'
              )}
            >
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
            'flex w-full flex-col overflow-hidden rounded-none',
            plain
              ? cn('min-h-24 flex-1 border-0 bg-transparent shadow-none', footer && 'min-h-[140px]')
              : cn('border border-input bg-background -m-1', footer ? 'min-h-[140px]' : 'min-h-24'),
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
            className={cn(
              'min-h-0 flex-1 resize-none rounded-none border-0 px-2 py-2 text-sm shadow-none ring-offset-0 focus-visible:ring-1 focus-visible:ring-ring',
              plain && 'min-h-[5rem] w-full'
            )}
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
          'cursor-pointer hover:bg-muted/40',
          plain
            ? 'min-h-[22px] w-full min-w-0 rounded-none border-0 py-1'
            : cn('rounded-sm', fw ? 'min-h-[22px] w-full min-w-0 py-0.5' : 'min-h-[22px] p-0.5')
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

  const renderDetectionScoreInParens = (control: PFMEAControl) => {
    const triggerClass =
      'inline-flex h-auto w-auto min-h-0 items-baseline gap-0 border-0 bg-transparent p-0 text-sm font-semibold text-muted-foreground shadow-none ring-0 ring-offset-0 hover:bg-muted/50 hover:text-foreground focus:ring-1 focus:ring-ring data-[state=open]:bg-muted/50 [&_svg]:hidden [&>span]:line-clamp-none';
    const items = Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
      <SelectItem key={num} value={String(num)}>
        {num}
      </SelectItem>
    ));
    if (control.detection_score != null) {
      return (
        <Select value={String(control.detection_score)} onValueChange={(v) => void persistControlDetectionScore(control.id, v)}>
          <SelectTrigger
            className={triggerClass}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            title="Change detection (1–10)"
          >
            <SelectValue>
              <span className="tabular-nums">({control.detection_score})</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>{items}</SelectContent>
        </Select>
      );
    }
    return (
      <Select onValueChange={(v) => void persistControlDetectionScore(control.id, v)}>
        <SelectTrigger
          className={triggerClass}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          title="Set detection (1–10)"
        >
          <SelectValue placeholder="(—)" />
        </SelectTrigger>
        <SelectContent>{items}</SelectContent>
      </Select>
    );
  };

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

  /**
   * What decides how often this cause happens. Recorded on the cause because that is where
   * occurrence lives, and it is the second of the three Key Characteristic tests.
   */
  const updateCauseOccurrenceDriver = useCallback(
    async (causeId: string, driver: string | null) => {
      if (!pfmeaIsEditable) return;
      const { error } = await supabase
        .from('pfmea_potential_causes')
        .update({ occurrence_driver: driver })
        .eq('id', causeId);
      if (error) {
        toast.error('Failed to update the occurrence driver');
        return;
      }
      if (selectedPfmeaProject) await fetchPfmeaDetails(selectedPfmeaProject.project_id);
    },
    [pfmeaIsEditable, selectedPfmeaProject, fetchPfmeaDetails]
  );

  /**
   * Which workflow item the cause is about. Clearing the kind clears the id with it, since the
   * database rejects an id without a kind.
   */
  const updateCauseImplicatedItem = useCallback(
    async (causeId: string, kind: RiskItemKind | null, itemId: string | null) => {
      if (!pfmeaIsEditable) return;
      const { error } = await supabase
        .from('pfmea_potential_causes')
        .update({
          implicated_item_kind: kind,
          implicated_item_id: kind === null || kind === 'step' ? null : itemId,
        })
        .eq('id', causeId);
      if (error) {
        toast.error('Failed to update the item this cause affects');
        return;
      }
      if (selectedPfmeaProject) await fetchPfmeaDetails(selectedPfmeaProject.project_id);
    },
    [pfmeaIsEditable, selectedPfmeaProject, fetchPfmeaDetails]
  );

  /**
   * Whether the prevention control removes the opportunity for the error or only asks the
   * person to follow it. Only the first takes the item off the KC register.
   */
  const updateControlStrength = useCallback(
    async (controlId: string, strength: ControlStrength | null) => {
      if (!pfmeaIsEditable) return;
      const { error } = await supabase
        .from('pfmea_controls')
        .update({ control_strength: strength })
        .eq('id', controlId);
      if (error) {
        toast.error('Failed to update the control strength');
        return;
      }
      if (selectedPfmeaProject) await fetchPfmeaDetails(selectedPfmeaProject.project_id);
    },
    [pfmeaIsEditable, selectedPfmeaProject, fetchPfmeaDetails]
  );

  /** Creating the cause from the occurrence cell is what gives the line an occurrence at all. */
  const createCauseWithOccurrence = useCallback(
    async (failureModeId: string, score: string) => {
      if (!pfmeaIsEditable) return;
      const parsed = parseInt(score, 10);
      if (Number.isNaN(parsed)) return;
      try {
        const { error } = await supabase.from('pfmea_potential_causes').insert({
          failure_mode_id: failureModeId,
          cause_description: 'New potential cause',
          occurrence_score: parsed,
        });
        if (error) throw error;
        if (selectedPfmeaProject) await fetchPfmeaDetails(selectedPfmeaProject.project_id);
              } catch (err) {
        console.error(err);
        toast.error('Failed to add potential cause');
      }
    },
    [pfmeaIsEditable, selectedPfmeaProject, fetchPfmeaDetails]
  );

  const updatePfmeaActionItemTracking = useCallback(
    async (
      action: PFMEAActionItem,
      partial: Partial<{ owner: string | null; dueYmd: string | null; status: string }>
    ) => {
      if (!pfmeaIsEditable) {
        toast.error('PFMEA is locked. Switch this revision to draft to edit.');
        return;
      }
      const cur = actionItemDisplayFields(action);
      const ownerRaw = partial.owner !== undefined ? partial.owner : cur.owner;
      const dueYmd = partial.dueYmd !== undefined ? partial.dueYmd : cur.dueYmd;
      const status = partial.status !== undefined ? partial.status : cur.status;

      const ownerNorm =
        ownerRaw === null || ownerRaw === undefined
          ? null
          : ownerRaw.trim() === ''
            ? null
            : ownerRaw.trim();

      const dueDate =
        dueYmd !== undefined && dueYmd !== null && String(dueYmd).trim() !== ''
          ? String(dueYmd).trim().slice(0, 10)
          : null;

      try {
        const { error } = await supabase
          .from('pfmea_action_items')
          .update({
            responsible_person: ownerNorm,
            target_completion_date: dueDate ? `${dueDate}T12:00:00.000Z` : null,
            status,
          })
          .eq('id', action.id);
        if (error) throw error;

        if (selectedPfmeaProject) await fetchPfmeaDetails(selectedPfmeaProject.project_id);
      } catch (e) {
        console.error(e);
        toast.error('Failed to save action');
      }
    },
    [pfmeaIsEditable, selectedPfmeaProject, fetchPfmeaDetails]
  );

  const saveRecommendedActionText = useCallback(
    async (actionId: string, text: string) => {
      if (!pfmeaIsEditable) return;
      try {
        const { error } = await supabase
          .from('pfmea_action_items')
          .update({ recommended_action: text })
          .eq('id', actionId);
        if (error) throw error;
        if (selectedPfmeaProject) await fetchPfmeaDetails(selectedPfmeaProject.project_id);
      } catch (e) {
        console.error(e);
        toast.error('Failed to save action');
      }
    },
    [pfmeaIsEditable, selectedPfmeaProject, fetchPfmeaDetails]
  );

  /**
   * A null score renders as a visible blank marker, not an empty cell, so an author can tell
   * "nobody has scored this" apart from "the column does not apply here".
   */
  const renderScoreCell = (
    value: number | null,
    onChange?: (value: string) => void
  ) => {
    if (!onChange || !pfmeaIsEditable) {
      return (
        <div
          className={cn(
            'flex h-full min-h-8 w-full items-center justify-center text-sm font-bold tabular-nums',
            value == null ? 'text-muted-foreground' : 'text-foreground'
          )}
          title={value == null ? 'Not scored' : undefined}
        >
          {value ?? '–'}
        </div>
      );
    }
    return (
      <Select value={value == null ? undefined : String(value)} onValueChange={onChange}>
        <SelectTrigger
          className={cn(
            'box-border h-full min-h-8 w-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 text-center text-sm font-bold tabular-nums shadow-none',
            'flex items-center justify-center ring-0 ring-offset-0 focus:ring-2 focus:ring-ring focus:ring-offset-0 focus-visible:rounded-none',
            'hover:bg-muted/40 data-[state=open]:bg-muted/40 [&_svg]:hidden',
            value == null ? 'text-muted-foreground' : 'text-foreground'
          )}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          title={value == null ? 'Not scored' : undefined}
        >
          <SelectValue placeholder="–" />
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
      // Unscored on creation. The author sets severity from the rubric; a seeded 5 would look
      // like a rated consequence.
      const { error } = await supabase
        .from('pfmea_potential_effects')
        .insert({
          failure_mode_id: failureModeId,
          effect_description: 'New potential effect',
        });

      if (error) throw error;

      await syncFailureModeSeverityFromDb(failureModeId);
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
        });

      if (error) throw error;

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
          detection_score: null,
        });

      if (error) throw error;

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
      const { error } = await supabase.from('pfmea_action_items').insert({
        failure_mode_id: failureModeId,
        recommended_action: 'New recommended action',
        status: 'not_started',
      });

      if (error) throw error;

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

  const openAddProcessVariableDialog = useCallback((operationStepId: string) => {
    if (!pfmeaIsEditable) {
      toast.error('PFMEA is locked. Switch this revision to draft to edit.');
      return;
    }
    setAddProcessVariableDialogStepId(operationStepId);
    setAddProcessVariableName('');
    setAddProcessVariableDescription('');
    setAddProcessVariableUnit('');
    setAddProcessVariableTargetValue('');
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
          id: newOutputId(),
          name,
          description: '',
          type: 'none',
        },
      ];

      const { error: updateErr } = await supabase
        .from('operation_steps')
        .update({ outputs: next as unknown as Json })
        .eq('id', operationStepId);
      if (updateErr) throw updateErr;

      setAddOutputDialogStepId(null);
      setAddOutputName('');

      if (selectedPfmeaProject) {
        await fetchPfmeaDetails(selectedPfmeaProject.project_id);
      }
          } catch (err) {
      console.error(err);
      toast.error('Failed to add output');
    }
  }, [addOutputDialogStepId, addOutputName, pfmeaIsEditable, selectedPfmeaProject, fetchPfmeaDetails]);

  const submitAddProcessVariable = useCallback(async () => {
    if (!addProcessVariableDialogStepId) return;
    if (!pfmeaIsEditable) {
      toast.error('PFMEA is locked. Switch this revision to draft to edit.');
      return;
    }

    const name = addProcessVariableName.trim();
    const description = addProcessVariableDescription.trim();
    const unit = addProcessVariableUnit.trim();
    const targetValue = addProcessVariableTargetValue.trim();

    if (!name) {
      toast.error('Enter a name for the process variable');
      return;
    }

    const operationStepId = addProcessVariableDialogStepId;

    try {
      const { data: stepRow, error: stepErr } = await supabase
        .from('operation_steps')
        .select('id, process_variables')
        .eq('id', operationStepId)
        .single();
      if (stepErr) throw stepErr;

      const current = parseProcessVariablesFromDb(stepRow?.process_variables);
      if (current.some((item) => item.name.trim().toLowerCase() === name.toLowerCase())) {
        toast.error('A process variable with that name already exists for this step');
        return;
      }

      const next: StepInput[] = [
        ...current,
        {
          id: `process-variable-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name,
          type: 'process',
          ...(description ? { description } : {}),
          ...(unit ? { unit } : {}),
          ...(targetValue ? { targetValue } : {}),
        },
      ];

      const { error: updateErr } = await supabase
        .from('operation_steps')
        .update({ process_variables: serializeProcessVariablesForDb(next) as unknown as Json })
        .eq('id', operationStepId);
      if (updateErr) throw updateErr;

      setAddProcessVariableDialogStepId(null);
      setAddProcessVariableName('');
      setAddProcessVariableDescription('');
      setAddProcessVariableUnit('');
      setAddProcessVariableTargetValue('');

      if (selectedPfmeaProject) {
        await fetchPfmeaDetails(selectedPfmeaProject.project_id);
      }
          } catch (err) {
      console.error(err);
      toast.error('Failed to add process variable');
    }
  }, [
    addProcessVariableDescription,
    addProcessVariableDialogStepId,
    addProcessVariableName,
    addProcessVariableTargetValue,
    addProcessVariableUnit,
    pfmeaIsEditable,
    selectedPfmeaProject,
    fetchPfmeaDetails,
  ]);

  /**
   * The step's outputs keyed by id, used to check whether a detection score has anything
   * behind it. Built once per requirement set rather than per rendered row.
   */
  const outputsByStepId = useMemo(() => {
    const byStep = new Map<string, Map<string, Output>>();
    for (const requirement of requirements) {
      if (byStep.has(requirement.operation_step_id)) continue;
      const byId = new Map<string, Output>();
      for (const output of parseAuthorableOutputs(requirement.operation_steps?.outputs)) {
        if (typeof output.id === 'string' && output.id !== '') byId.set(output.id, output);
      }
      byStep.set(requirement.operation_step_id, byId);
    }
    return byStep;
  }, [requirements]);

  const outputsByIdForStep = useCallback(
    (stepId: string): Map<string, Output> => outputsByStepId.get(stepId) ?? new Map<string, Output>(),
    [outputsByStepId]
  );

  type PfmeaFlatRow = {
    requirement: PFMEARequirement;
    failureMode: PFMEAFailureMode | null;
    cause: PFMEAPotentialCause | null;
  };

  const pfmeaFlatRows: PfmeaFlatRow[] = useMemo(() => {
    const out: PfmeaFlatRow[] = [];
    for (const requirement of requirements) {
      const reqFms = failureModes.filter((fm) => fm.requirement_id === requirement.id);
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
    // Unscored sorts below every scored value rather than being treated as a zero score.
    const UNSCORED_SORT = -1;
    const maxS = (r: PfmeaFlatRow) =>
      (r.failureMode ? maxPfmeaSeverityForFailureMode(r.failureMode) : null) ?? UNSCORED_SORT;
    const causeDesc = (r: PfmeaFlatRow) => r.cause?.cause_description ?? '';
    const occ = (r: PfmeaFlatRow) => r.cause?.occurrence_score ?? UNSCORED_SORT;
    const det = (r: PfmeaFlatRow) =>
      (r.failureMode ? minPfmeaDetectionScoreForFailureMode(r.failureMode) : null) ?? UNSCORED_SORT;
    const rpn = (r: PfmeaFlatRow) =>
      (r.failureMode ? calculateRPN(r.failureMode, r.cause) : null) ?? UNSCORED_SORT;
    const apRank = (r: PfmeaFlatRow) => {
      const value = r.failureMode ? actionPriorityFor(r.failureMode) : null;
      return value == null ? UNSCORED_SORT : actionPriorityUrgency(value);
    };

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
          return dirFactor * (apRank(a) - apRank(b));
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
  }, [pfmeaFlatRows, pfmeaSort, actionPriorityFor]);

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
            toast.error('Add a failure mode first', { description: 'Select a requirement row, then add a Failure Mode.' });
            return;
          }
          void addPotentialEffect(fm.id);
          return;
        case 'causes':
        case 'o':
          if (!fm) {
            toast.error('Add a failure mode first', { description: 'Select a requirement row, then add a Failure Mode.' });
            return;
          }
          void addPotentialCause(fm.id);
          return;
        case 'prevention_controls':
          if (!fm) {
            toast.error('Add a failure mode first', { description: 'Select a requirement row, then add a Failure Mode.' });
            return;
          }
          if (!cause) {
            toast.error('Add a potential cause first', {
              description: 'Prevention controls are aligned to a specific cause row.',
            });
            return;
          }
          void addControl(fm.id, 'prevention', cause.id);
          return;
        case 'detection_controls':
        case 'd':
          if (!fm) {
            toast.error('Add a failure mode first', { description: 'Select a requirement row, then add a Failure Mode.' });
            return;
          }
          void addControl(fm.id, 'detection');
          return;
        case 'process_variables':
          openAddProcessVariableDialog(requirement.operation_step_id);
          return;
        case 'rpn':
        case 'ap':
          return;
        case 'recommended_actions':
          if (!fm) {
            toast.error('Add a failure mode first', { description: 'Select a requirement row, then add a Failure Mode.' });
            return;
          }
          void addActionItem(fm.id);
          return;
        default:
          return;
      }
    },
    [sortedPfmeaRows, gridFocus.rowIndex, openAddOutputDialog, addFailureMode, openAddProcessVariableDialog]
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
          const cols = visiblePfmeaNavCols;
          if (cols.length === 0) return f;
          let idx = cols.indexOf(f.col);
          if (idx === -1) idx = 0;
          return { ...f, col: cols[(idx + 1) % cols.length] };
        });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setGridFocus((f) => {
          const cols = visiblePfmeaNavCols;
          if (cols.length === 0) return f;
          let idx = cols.indexOf(f.col);
          if (idx === -1) idx = 0;
          return { ...f, col: cols[(idx - 1 + cols.length) % cols.length] };
        });
      } else if (e.key === 'Home' && !e.ctrlKey) {
        e.preventDefault();
        setGridFocus((f) => ({ ...f, rowIndex: 0 }));
      } else if (e.key === 'End' && !e.ctrlKey) {
        e.preventDefault();
        setGridFocus((f) => ({ ...f, rowIndex: sortedPfmeaRows.length - 1 }));
      }
    },
    [sortedPfmeaRows.length, visiblePfmeaNavCols]
  );

  const pfmeaGridCellMouseDown = useCallback((e: React.MouseEvent, rowIndex: number, col: PfmeaNavColumn) => {
    const t = e.target as HTMLElement;
    if (t.closest('input, textarea, button, a, [role="combobox"], [data-radix-collection-item]')) {
      return;
    }
    setGridFocus({ rowIndex, col });
  }, []);

  const pfmeaThSticky = 'sticky top-0 z-20 border-b shadow-sm';
  /**
   * Column header bar colors (PFMEA table). Each band pairs a solid token with that token's own
   * foreground, so the band inverts between light and dark mode and its label stays legible.
   * The `!` overrides TableHead's default `text-muted-foreground`.
   */
  const pfmeaHeaderBar = {
    structure: `${pfmeaThSticky} bg-category-1 !text-category-1-foreground border-category-1-foreground/25`,
    requirements: `${pfmeaThSticky} bg-warning-soft !text-warning-soft-foreground border-warning-soft-foreground/25`,
    failure: `${pfmeaThSticky} bg-warning-soft !text-warning-soft-foreground border-warning-soft-foreground/25`,
    effectSeverity: `${pfmeaThSticky} bg-destructive-soft !text-destructive-soft-foreground border-destructive-soft-foreground/25`,
    causeOccurrence: `${pfmeaThSticky} bg-success !text-success-foreground border-success-foreground/25`,
    detectionPurple: `${pfmeaThSticky} bg-category-3 !text-category-3-foreground border-category-3-foreground/25`,
    other: `${pfmeaThSticky} bg-muted-foreground !text-background border-background/25`,
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
        dark ? 'hover:bg-card/30' : 'hover:bg-muted-foreground/60'
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
      /** Sticky to top of scroll viewport only; column scrolls horizontally with body cells. */
      stickyHeaderVerticalScrollRegion?: boolean;
    }
  ) => {
    const vSticky = opts?.stickyHeaderVerticalScrollRegion ? PFMEA_SCROLL_HEADER_STICKY[col] : null;
    const w = colWidths[col];
    return (
    <TableHead
      className={cn(
        vSticky ? vSticky.className : (opts?.barClassName ?? pfmeaHeaderBar.other),
        'relative h-auto px-1 py-1 align-bottom'
      )}
      style={{
        width: `${w}px`,
        minWidth: `${w}px`,
        ...(vSticky
          ? {
              position: 'sticky' as const,
              top: 0,
              zIndex: 40,
              backgroundColor: vSticky.backgroundColor,
            }
          : {}),
      }}
    >
      <div className="flex min-h-9 flex-col items-stretch justify-center gap-0.5 py-0.5">
        <div className="flex items-center justify-center gap-0.5">
          <span
            className={cn(
              'text-center text-xs font-medium leading-tight',
              opts?.lightBar ? 'text-warning-soft-foreground' : 'text-success-foreground'
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
                opts?.lightBar ? 'text-warning-soft-foreground hover:bg-background/15' : 'text-success-foreground hover:bg-background/15'
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
                opts?.lightBar ? 'text-warning-soft-foreground hover:bg-background/15' : 'text-success-foreground hover:bg-background/15'
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
  };

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
          <Button variant="outline" size="sm" disabled title="Export is not available yet">
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
    const pfmeaCellToolbarFlush = 'mt-auto flex w-full shrink-0 border-t border-border';
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
      backgroundColor: 'hsl(var(--category-1))',
    });
    // Column-group banding, not status: worksheet columns are shaded so related groups read together.
    const pfmeaColBand: Record<PfmeaNavColumn, string> = {
      requirements: 'bg-category-4/8',
      failure_mode: 'bg-category-4/8',
      effects: 'bg-category-5/8',
      s: 'bg-category-5/14',
      process_variables: 'bg-category-2/8',
      causes: 'bg-category-2/8',
      prevention_controls: 'bg-category-2/14',
      o: 'bg-category-2/8',
      detection_controls: 'bg-category-3/8',
      d: 'bg-category-3/14',
      rpn: 'bg-muted/40',
      ap: 'bg-muted/70',
      kc: 'bg-category-1/8',
      recommended_actions: 'bg-muted/40',
    };
    const band = (col: PfmeaNavColumn) => cn('border-l border-border/30', pfmeaColBand[col]);

    return (
      <>
      <Card>
        <CardContent className="min-w-0 p-0">
          {actionPriorityError ? (
            <div className="border-b border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              Action priority is unavailable: {actionPriorityError}
            </div>
          ) : null}
          {orphanedRequirementIds.length > 0 ? (
            <div className="border-b border-warning-soft/40 bg-warning-soft/10 px-3 py-2 text-xs text-warning-soft">
              {orphanedRequirementIds.length} requirement
              {orphanedRequirementIds.length === 1 ? '' : 's'} point at an output that no longer
              exists on its step. Their failure modes are still stored. Remove them from the
              Requirements column, or restore the output in Process Map.
            </div>
          ) : null}
          {occurrenceDriverError ? (
            <div className="border-b border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              Occurrence drivers are unavailable: {occurrenceDriverError}
            </div>
          ) : null}
          {kcClassificationGaps &&
          (kcClassificationGaps.unclassifiedDriverCount > 0 ||
            kcClassificationGaps.unclassifiedControlStrengthCount > 0 ||
            kcClassificationGaps.missingItemRefCount > 0) ? (
            <div className="border-b border-warning-soft/40 bg-warning-soft/10 px-3 py-2 text-xs text-warning-soft">
              {[
                kcClassificationGaps.unclassifiedDriverCount > 0
                  ? `${kcClassificationGaps.unclassifiedDriverCount} cause${kcClassificationGaps.unclassifiedDriverCount === 1 ? '' : 's'} with no occurrence driver, so they cannot reach the Key Characteristics list`
                  : null,
                kcClassificationGaps.unclassifiedControlStrengthCount > 0
                  ? `${kcClassificationGaps.unclassifiedControlStrengthCount} prevention control${kcClassificationGaps.unclassifiedControlStrengthCount === 1 ? '' : 's'} with no strength recorded, so mistake-proofing is unknown`
                  : null,
                kcClassificationGaps.missingItemRefCount > 0
                  ? `${kcClassificationGaps.missingItemRefCount} qualifying cause${kcClassificationGaps.missingItemRefCount === 1 ? '' : 's'} that name no item, so they list under the step instead`
                  : null,
              ]
                .filter(Boolean)
                .join('. ')}
              .
            </div>
          ) : null}
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
                  <DropdownMenuCheckboxItem
                    checked={pfmeaColVisibility.process_variables}
                    onCheckedChange={(v) => setPfmeaColVisibility((s) => ({ ...s, process_variables: Boolean(v) }))}
                  >
                    Process Variables
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
            <table className="w-full min-w-[2170px] border-separate border-spacing-0 caption-bottom text-sm">
              <TableHeader>
                {/* Left-to-right: Phase, Operation, Process Step, Step Description, then Requirements, Failure Mode, Effects, … */}
                <TableRow>
                  {pfmeaColVisibility.phase ? (
                    <TableHead
                      className="border-b border-info-foreground/25 border-r border-info-foreground/25 shadow-sm !text-category-1-foreground h-auto px-1 py-1 font-medium align-middle"
                      style={frozenHeaderThStyle(leftPhase, wPhase)}
                    >
                      <div className="relative flex min-h-9 w-full items-center justify-center gap-0.5">
                        <span className="text-xs font-medium text-category-1-foreground">Phase</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-category-1-foreground hover:bg-card/15"
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
                      className="border-b border-info-foreground/25 border-r border-info-foreground/25 shadow-sm !text-category-1-foreground h-auto px-1 py-1 font-medium align-middle"
                      style={frozenHeaderThStyle(leftOp, wOp)}
                    >
                      <div className="relative flex min-h-9 w-full items-center justify-center gap-0.5">
                        <span className="text-xs font-medium text-category-1-foreground">Operation</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-category-1-foreground hover:bg-card/15"
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
                      className="border-b border-info-foreground/25 border-r border-info-foreground/25 shadow-sm !text-category-1-foreground h-auto px-1 py-1 font-medium align-middle"
                      style={frozenHeaderThStyle(leftStep, wStep)}
                    >
                      <div className="relative flex min-h-9 w-full items-center justify-center gap-0.5">
                        <span className="text-xs font-medium text-category-1-foreground">Process Step</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-category-1-foreground hover:bg-card/15"
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
                      className="border-b border-info-foreground/25 border-r border-info-foreground/25 shadow-sm !text-category-1-foreground h-auto px-1 py-1 font-medium align-middle"
                      style={frozenHeaderThStyle(leftDesc, wDesc)}
                    >
                      <div className="relative flex min-h-9 w-full items-center justify-center gap-0.5">
                        <span className="text-xs font-medium text-category-1-foreground">Step Description</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-category-1-foreground hover:bg-card/15"
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
                    stickyHeaderVerticalScrollRegion: true,
                  })}
                  {renderHeaderWithPlus('Failure Mode', 'failure_mode', {
                    barClassName: pfmeaHeaderBar.failure,
                    lightBar: true,
                    derived: !pfmeaIsEditable,
                    sortKey: 'failure_mode',
                    stickyHeaderVerticalScrollRegion: true,
                  })}
                  {renderHeaderWithPlus('Potential Effects', 'effects', {
                    barClassName: pfmeaHeaderBar.effectSeverity,
                    derived: !pfmeaIsEditable,
                    sortKey: 'severity',
                    sortDefaultDir: 'desc',
                    stickyHeaderVerticalScrollRegion: true,
                  })}
                  {renderHeaderWithPlus('S', 's', {
                    barClassName: pfmeaHeaderBar.effectSeverity,
                    hidePlus: true,
                    sortKey: 'severity',
                    sortDefaultDir: 'desc',
                    stickyHeaderVerticalScrollRegion: true,
                  })}
                  {pfmeaColVisibility.process_variables ? (
                    renderHeaderWithPlus('Process Variables', 'process_variables', {
                      barClassName: pfmeaHeaderBar.causeOccurrence,
                      derived: !pfmeaIsEditable,
                      stickyHeaderVerticalScrollRegion: true,
                    })
                  ) : null}
                  {renderHeaderWithPlus('Potential Causes', 'causes', {
                    barClassName: pfmeaHeaderBar.causeOccurrence,
                    derived: !pfmeaIsEditable,
                    sortKey: 'cause',
                    stickyHeaderVerticalScrollRegion: true,
                  })}
                  {renderHeaderWithPlus('Prevention Controls', 'prevention_controls', {
                    barClassName: pfmeaHeaderBar.causeOccurrence,
                    derived: !pfmeaIsEditable,
                    sortKey: 'prevention_controls',
                    stickyHeaderVerticalScrollRegion: true,
                  })}
                  {renderHeaderWithPlus('O', 'o', {
                    barClassName: pfmeaHeaderBar.causeOccurrence,
                    hidePlus: true,
                    sortKey: 'occurrence',
                    sortDefaultDir: 'desc',
                    stickyHeaderVerticalScrollRegion: true,
                  })}
                  {renderHeaderWithPlus('Detection Controls', 'detection_controls', {
                    barClassName: pfmeaHeaderBar.detectionPurple,
                    derived: !pfmeaIsEditable,
                    sortKey: 'detection_controls',
                    stickyHeaderVerticalScrollRegion: true,
                  })}
                  {renderHeaderWithPlus('D', 'd', {
                    barClassName: pfmeaHeaderBar.detectionPurple,
                    hidePlus: true,
                    sortKey: 'detection',
                    sortDefaultDir: 'desc',
                    stickyHeaderVerticalScrollRegion: true,
                  })}
                  {renderHeaderWithPlus('RPN', 'rpn', {
                    derived: true,
                    barClassName: pfmeaHeaderBar.other,
                    hidePlus: true,
                    sortKey: 'rpn',
                    sortDefaultDir: 'desc',
                    stickyHeaderVerticalScrollRegion: true,
                  })}
                  {renderHeaderWithPlus('Action Priority', 'ap', {
                    derived: true,
                    barClassName: pfmeaHeaderBar.other,
                    hidePlus: true,
                    sortKey: 'ap',
                    sortDefaultDir: 'desc',
                    stickyHeaderVerticalScrollRegion: true,
                  })}
                  {renderHeaderWithPlus('Key Characteristic', 'kc', {
                    derived: true,
                    barClassName: pfmeaHeaderBar.other,
                    hidePlus: true,
                    stickyHeaderVerticalScrollRegion: true,
                  })}
                  {renderHeaderWithPlus('Recommended Actions', 'recommended_actions', {
                    barClassName: pfmeaHeaderBar.other,
                    derived: !pfmeaIsEditable,
                    sortKey: 'recommended_actions',
                    stickyHeaderVerticalScrollRegion: true,
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPfmeaRows.map((entry, rowIndex) => {
                  const { requirement, failureMode, cause } = entry;

                  const ap = failureMode ? actionPriorityFor(failureMode) : null;
                  const apColorClass = getActionPriorityRowClass(ap);
                  const rpn = failureMode ? calculateRPN(failureMode, cause) : null;

                  const rowMinDetection = failureMode ? minPfmeaDetectionScoreForFailureMode(failureMode) : null;

                  const preventionControls =
                    failureMode && cause
                      ? failureMode.pfmea_controls.filter((c) => c.control_type === 'prevention' && c.cause_id === cause.id)
                      : [];

                  const detectionControls = failureMode ? failureMode.pfmea_controls.filter((c) => c.control_type === 'detection') : [];

                  // Prevention gap and unbacked detection are the two authoring problems the
                  // retuned priority table cares about most, so they are flagged on the row.
                  const preventionCoverage = failureMode ? preventionCoverageForFailureMode(failureMode) : null;
                  const unbackedDetectionControlIds = new Set(
                    failureMode
                      ? detectionControlIssuesForStep({
                          controls: failureMode.pfmea_controls,
                          outputById: outputsByIdForStep(requirement.operation_step_id),
                          requirementOutputId: requirement.output_id,
                          requirementText: requirement.requirement_text,
                        }).map((issue) => issue.controlId)
                      : []
                  );

                  return (
                    <TableRow
                      key={`${requirement.id}-${failureMode?.id ?? 'no-fm'}-${cause?.id ?? 'no-cause'}`}
                      className={cn(
                        apColorClass,
                        gridFocus.rowIndex === rowIndex ? 'outline outline-1 outline-primary/50' : '',
                        '[&>td]:border-b [&>td]:border-border/40'
                      )}
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
                            {preventionCoverage?.isDetectionOnly ? (
                              <p className="px-1.5 pb-1 text-xs text-warning-soft">
                                Only detection controls. Priority stays High until a prevention
                                control is added to a cause.
                              </p>
                            ) : null}
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
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  disabled={!pfmeaIsEditable}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRulesEditorTarget({
                                      id: failureMode.id,
                                      label: failureMode.failure_mode,
                                    });
                                  }}
                                  className={pfmeaCellToolbarAdd}
                                >
                                  Rules
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
                        <div className="flex h-full min-h-8 w-full items-center justify-center">
                          {failureMode
                            ? failureMode.pfmea_potential_effects.length > 0
                              ? renderScoreCell(maxPfmeaSeverityForFailureMode(failureMode), undefined)
                              : renderScoreCell(failureMode.severity_score, (value) =>
                                  void updateFailureModeSeverity(failureMode.id, value)
                                )
                            : null}
                        </div>
                      </TableCell>

                      {pfmeaColVisibility.process_variables ? (
                        <TableCell
                          className={cn(td, band('process_variables'), 'min-w-0', focusCellClass(rowIndex, 'process_variables'))}
                          style={{
                            width: `${colWidths.process_variables}px`,
                            minWidth: `${colWidths.process_variables}px`,
                          }}
                          onMouseDown={(e) => pfmeaGridCellMouseDown(e, rowIndex, 'process_variables')}
                        >
                          <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
                            <div className="min-w-0 flex-1">
                              <PfmeaProcessVariablesReadonlyCell
                                cause={cause}
                                requirement={requirement}
                                workflowRowsForStep={workflowStepPvByStepId[requirement.operation_step_id]}
                              />
                            </div>
                            {gridFocus.rowIndex === rowIndex && gridFocus.col === 'process_variables' ? (
                              <div className={pfmeaCellToolbar}>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  disabled={!pfmeaIsEditable}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openAddProcessVariableDialog(requirement.operation_step_id);
                                  }}
                                  className={cn(pfmeaCellToolbarAdd, 'border-r-0')}
                                >
                                  <Plus className="h-3 w-3 shrink-0" />
                                  Add Process Variable
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                      ) : null}

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
                              {cause ? (
                                <CauseClassificationControls
                                  cause={cause}
                                  drivers={occurrenceDriverTable}
                                  stepItemSource={stepItemSourceFor(requirement)}
                                  editable={pfmeaIsEditable}
                                  onDriverChange={(driver) =>
                                    void updateCauseOccurrenceDriver(cause.id, driver)
                                  }
                                  onItemChange={(kind, itemId) =>
                                    void updateCauseImplicatedItem(cause.id, kind, itemId)
                                  }
                                />
                              ) : null}
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
                        className={cn(
                          'align-top h-full min-h-0 p-0',
                          band('prevention_controls'),
                          focusCellClass(rowIndex, 'prevention_controls')
                        )}
                        style={{ width: `${colWidths.prevention_controls}px`, minWidth: `${colWidths.prevention_controls}px` }}
                        onMouseDown={(e) => pfmeaGridCellMouseDown(e, rowIndex, 'prevention_controls')}
                      >
                        <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-0">
                          <div className="min-h-0 min-w-0 flex-1">
                            {cause && preventionControls.length > 0 ? (
                              preventionControls.map((control) => (
                                <div
                                  key={control.id}
                                  className="border-b border-border/40 px-1 py-1 text-sm last:border-b-0"
                                >
                                  <div className="flex min-h-0 w-full items-start gap-0.5">
                                    <div className="min-h-0 min-w-0 flex-1">
                                      {renderEditableCell(rowIndex, control.control_description, control.id, 'control_description', 'control', false, {
                                        fullWidth: true,
                                        plainCell: true,
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
                                  {pfmeaIsEditable ? (
                                    <div className="pt-1" onMouseDown={(e) => e.stopPropagation()}>
                                      <Select
                                        value={control.control_strength ?? KC_UNSET}
                                        onValueChange={(value) =>
                                          void updateControlStrength(
                                            control.id,
                                            value === KC_UNSET ? null : (value as ControlStrength)
                                          )
                                        }
                                      >
                                        <SelectTrigger className="h-6 w-full px-1.5 text-xs">
                                          <SelectValue placeholder="How strong is it" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value={KC_UNSET}>How strong is it</SelectItem>
                                          {CONTROL_STRENGTHS.map((strength) => (
                                            <SelectItem key={strength} value={strength}>
                                              {CONTROL_STRENGTH_LABELS[strength]}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  ) : isControlStrength(control.control_strength) ? (
                                    <div className="pt-0.5 text-xs text-muted-foreground">
                                      {CONTROL_STRENGTH_LABELS[control.control_strength]}
                                    </div>
                                  ) : null}
                                </div>
                              ))
                            ) : cause ? (
                              <div className="px-1 py-1 text-sm text-warning-soft">
                                Nothing prevents this cause, so the only defence is noticing the
                                failure afterward.
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground italic">Select a cause</div>
                            )}
                          </div>
                          {gridFocus.rowIndex === rowIndex &&
                          gridFocus.col === 'prevention_controls' &&
                          failureMode &&
                          cause ? (
                            <div className={pfmeaCellToolbarFlush}>
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
                        <div className="flex h-full min-h-8 w-full items-center justify-center">
                          {failureMode ? (
                            cause ? (
                              renderScoreCell(cause.occurrence_score, (value) => void updateCauseOccurrence(cause.id, value))
                            ) : (
                              // No cause yet, so there is no occurrence to show. Picking a score
                              // here creates the cause that carries it.
                              renderScoreCell(
                                null,
                                pfmeaIsEditable ? (value) => void createCauseWithOccurrence(failureMode.id, value) : undefined
                              )
                            )
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell
                        className={cn(
                          'align-top h-full min-h-0 p-0',
                          band('detection_controls'),
                          focusCellClass(rowIndex, 'detection_controls')
                        )}
                        style={{ width: `${colWidths.detection_controls}px`, minWidth: `${colWidths.detection_controls}px` }}
                        onMouseDown={(e) => pfmeaGridCellMouseDown(e, rowIndex, 'detection_controls')}
                      >
                        {failureMode ? (
                          <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-0">
                            <div className="min-h-0 min-w-0 flex-1">
                              {detectionControls.map((control) => (
                                <div
                                  key={control.id}
                                  className="flex w-full min-w-0 flex-wrap items-baseline gap-x-1 gap-y-0.5 border-b border-border/50 px-1 py-1 last:border-b-0"
                                >
                                  <div className="min-w-0 flex-1">
                                    {renderEditableCell(rowIndex, control.control_description, control.id, 'control_description', 'control', false, {
                                      fullWidth: true,
                                      plainCell: true,
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
                                  <div className="flex shrink-0 items-baseline gap-0.5">
                                    {renderDetectionScoreInParens(control)}
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
                                  {unbackedDetectionControlIds.has(control.id) ? (
                                    <p className="w-full text-xs text-warning-soft">
                                      This score assumes a check the step does not describe. Add
                                      quality checks, allowances, or a reference specification to
                                      the output first.
                                    </p>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                            {gridFocus.rowIndex === rowIndex && gridFocus.col === 'detection_controls' ? (
                              <div className={pfmeaCellToolbarFlush}>
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
                        <div className="flex h-full min-h-8 w-full items-center justify-center">
                          {failureMode ? (
                            rowMinDetection != null ? (
                              renderScoreCell(rowMinDetection, undefined)
                            ) : (
                              <span className="text-sm font-bold tabular-nums text-muted-foreground">—</span>
                            )
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell
                        className={cn(
                          td,
                          band('rpn'),
                          'p-0 align-middle text-center text-sm font-bold tabular-nums',
                          focusCellClass(rowIndex, 'rpn')
                        )}
                        style={{ width: `${colWidths.rpn}px`, minWidth: `${colWidths.rpn}px` }}
                        onMouseDown={(e) => pfmeaGridCellMouseDown(e, rowIndex, 'rpn')}
                      >
                        <div className="flex min-h-8 w-full items-center justify-center px-1">
                          {rpn != null ? rpn : ''}
                        </div>
                      </TableCell>

                      <TableCell
                        className={cn(
                          td,
                          band('ap'),
                          'p-0 align-middle text-center text-sm font-bold tabular-nums',
                          focusCellClass(rowIndex, 'ap')
                        )}
                        style={{ width: `${colWidths.ap}px`, minWidth: `${colWidths.ap}px` }}
                        onMouseDown={(e) => pfmeaGridCellMouseDown(e, rowIndex, 'ap')}
                      >
                        <div className="flex min-h-8 w-full items-center justify-center px-1">
                          {failureMode ? (
                            ap != null ? (
                              <Badge
                                variant={ap === 'H' ? 'destructive' : ap === 'M' ? 'default' : 'secondary'}
                                className="text-xs"
                                title={
                                  actionPriorityTable
                                    ? actionPriorityLabel(actionPriorityTable, ap).description
                                    : undefined
                                }
                              >
                                {ap}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-dashed text-xs font-normal text-muted-foreground"
                                title="Severity, occurrence, and detection must all be set before this line can be prioritized."
                              >
                                Not scored
                              </Badge>
                            )
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell
                        className={cn(td, band('kc'), 'align-middle', focusCellClass(rowIndex, 'kc'))}
                        style={{ width: `${colWidths.kc}px`, minWidth: `${colWidths.kc}px` }}
                        onMouseDown={(e) => pfmeaGridCellMouseDown(e, rowIndex, 'kc')}
                      >
                        <div className="flex min-h-8 w-full items-center justify-center px-1 text-center">
                          {failureMode && cause ? (
                            (() => {
                              const verdict = keyCharacteristicVerdictFor(failureMode, cause);
                              if (!verdict) {
                                return (
                                  <span className="text-xs text-muted-foreground">Loading</span>
                                );
                              }
                              if (verdict.outcome === 'key_characteristic') {
                                return (
                                  <Badge
                                    className="border-warning-soft/40 bg-warning-soft/15 text-xs text-warning-soft hover:bg-warning-soft/15"
                                    title={verdict.driver.description}
                                  >
                                    {verdict.driver.label}
                                  </Badge>
                                );
                              }
                              return (
                                <span className="text-xs leading-snug text-muted-foreground">
                                  {KC_DISQUALIFICATION_TEXT[verdict.reason]}
                                </span>
                              );
                            })()
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell
                        className={cn(td, band('recommended_actions'), 'min-w-0', focusCellClass(rowIndex, 'recommended_actions'))}
                        style={{ width: `${colWidths.recommended_actions}px`, minWidth: `${colWidths.recommended_actions}px` }}
                        onMouseDown={(e) => pfmeaGridCellMouseDown(e, rowIndex, 'recommended_actions')}
                      >
                        {failureMode ? (
                          <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-0">
                            <div className="min-w-0 flex-1">
                              {failureMode.pfmea_action_items.map((action) => {
                                const fields = actionItemDisplayFields(action);
                                return (
                                  <div key={action.id} className="rounded border p-2 text-sm">
                                    <div className="flex items-start gap-0.5">
                                      <div className="min-w-0 flex-1 space-y-2">
                                        <div className="space-y-1">
                                          <Label htmlFor={`${action.id}-pfmea-action`} className="text-xs text-muted-foreground">
                                            Action
                                          </Label>
                                          <Textarea
                                            id={`${action.id}-pfmea-action`}
                                            className="min-h-[60px] text-sm"
                                            disabled={!pfmeaIsEditable}
                                            defaultValue={fields.action}
                                            key={`${action.id}-a-${fields.action.slice(0, 48)}`}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onBlur={(e) => {
                                              const v = e.target.value;
                                              if (v !== fields.action) void saveRecommendedActionText(action.id, v);
                                            }}
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <span className="text-xs text-muted-foreground">Status</span>
                                          <Badge
                                            variant="outline"
                                            className={cn(
                                              'pointer-events-none select-none text-xs font-normal',
                                              readOnlyActionStatusBadgeClassName(fields.status)
                                            )}
                                          >
                                            {formatActionStatusLabel(fields.status)}
                                          </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground border-t border-border/60 pt-2">
                                          <span className="font-medium text-foreground/80">Potential cause: </span>
                                          {getPotentialCauseSubtext(failureMode, cause)}
                                        </p>
                                      </div>
                                      {gridFocus.rowIndex === rowIndex && gridFocus.col === 'recommended_actions'
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
                                  </div>
                                );
                              })}
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
                            Add Prevention
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
                            Add Detection
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
                          ap === 'H' ? 'text-destructive-soft' : ap === 'M' ? 'text-warning-soft' : 'text-success',
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
                            <div key={action.id} className="rounded border bg-info/10 p-1 text-sm">
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

      {rulesEditorTarget && evidenceProjectId ? (
        <ProjectRiskRulesEditor
          open
          onOpenChange={(next) => {
            if (!next) setRulesEditorTarget(null);
          }}
          projectId={evidenceProjectId}
          targetKind="pfmea_failure_mode"
          targetId={rulesEditorTarget.id}
          targetLabel={rulesEditorTarget.label}
        />
      ) : null}

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

      <Dialog
        open={addProcessVariableDialogStepId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAddProcessVariableDialogStepId(null);
            setAddProcessVariableName('');
            setAddProcessVariableDescription('');
            setAddProcessVariableUnit('');
            setAddProcessVariableTargetValue('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add process variable</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="grid gap-2">
              <Label htmlFor="pfmea-add-process-variable-name">Name</Label>
              <Input
                id="pfmea-add-process-variable-name"
                value={addProcessVariableName}
                onChange={(e) => setAddProcessVariableName(e.target.value)}
                placeholder="Tip diameter"
                autoComplete="off"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pfmea-add-process-variable-description">Description</Label>
              <Textarea
                id="pfmea-add-process-variable-description"
                value={addProcessVariableDescription}
                onChange={(e) => setAddProcessVariableDescription(e.target.value)}
                placeholder="What it controls and why it matters"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="pfmea-add-process-variable-unit">Unit</Label>
                <Input
                  id="pfmea-add-process-variable-unit"
                  value={addProcessVariableUnit}
                  onChange={(e) => setAddProcessVariableUnit(e.target.value)}
                  placeholder="inches"
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pfmea-add-process-variable-target">Target value</Label>
                <Input
                  id="pfmea-add-process-variable-target"
                  value={addProcessVariableTargetValue}
                  onChange={(e) => setAddProcessVariableTargetValue(e.target.value)}
                  placeholder="<= 1/4"
                  autoComplete="off"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void submitAddProcessVariable();
                    }
                  }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddProcessVariableDialogStepId(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitAddProcessVariable()}>
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
                    <div className="bg-info/10 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-info" />
                        <span className="font-medium">Requirements</span>
                      </div>
                      <div className="text-2xl font-bold text-info">{requirements.length}</div>
                    </div>
                    <div className="bg-warning-soft/10 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-warning-soft" />
                        <span className="font-medium">Failure Modes</span>
                      </div>
                      <div className="text-2xl font-bold text-warning-soft">{failureModes.length}</div>
                    </div>
                    <div className="bg-destructive-soft/10 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-destructive-soft" />
                        <span className="font-medium">High Priority (AP = H)</span>
                      </div>
                      <div className="text-2xl font-bold text-destructive-soft">
                        {pfmeaMetrics ? pfmeaMetrics.high : '—'}
                      </div>
                    </div>
                    <div className="bg-category-3/10 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-5 h-5 text-category-3" />
                        <span className="font-medium">Open Actions</span>
                      </div>
                      <div className="text-2xl font-bold text-category-3">
                        {failureModes.reduce(
                          (count, fm) =>
                            count +
                            fm.pfmea_action_items.filter((action) => actionItemDisplayFields(action).status !== 'complete')
                              .length,
                          0
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
                  {actionPriorityError ? (
                    <p className="text-sm text-destructive">{actionPriorityError}</p>
                  ) : !pfmeaMetrics ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  ) : (
                    <div className="space-y-3">
                      {[
                        { label: 'High (H)', color: 'bg-destructive-soft', count: pfmeaMetrics.high },
                        { label: 'Medium (M)', color: 'bg-warning-soft', count: pfmeaMetrics.medium },
                        { label: 'Low (L)', color: 'bg-success', count: pfmeaMetrics.low },
                        {
                          label: 'Not scored',
                          color: 'bg-muted-foreground/40',
                          count: pfmeaMetrics.unscoredFailureModeCount,
                        },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                            <span className="text-sm">{item.label}</span>
                          </div>
                          <span className="font-bold">{item.count}</span>
                        </div>
                      ))}
                      <div className="border-t pt-3 text-sm text-muted-foreground">
                        {pfmeaMetrics.preventionGapCount > 0 ? (
                          <p>
                            {pfmeaMetrics.preventionGapCount} failure mode
                            {pfmeaMetrics.preventionGapCount === 1 ? '' : 's'} rely on catching the
                            defect rather than preventing it.
                          </p>
                        ) : (
                          <p>Every failure mode has a prevention control on each cause.</p>
                        )}
                        {pfmeaMetrics.unscoredLineCount > 0 ? (
                          <p className="mt-1">
                            {pfmeaMetrics.unscoredLineCount} of {pfmeaMetrics.lineCount} lines are
                            missing a severity, occurrence, or detection score.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>What users actually reported</CardTitle>
                </CardHeader>
                <CardContent>
                  {evidenceReviewSteps === null ? (
                    <p className="text-sm text-muted-foreground">Loading reported problems...</p>
                  ) : evidenceReviewSteps.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No reported problem contradicts the occurrence scores on this template.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        These steps were reported as problems by real users. The occurrence scores
                        behind them say otherwise, so one of the two is wrong.
                      </p>
                      {evidenceReviewSteps.map((step) => (
                        <div key={step.operationStepId} className="rounded-md border p-3 text-sm">
                          <div className="font-medium">
                            {step.stepTitle ?? 'Step no longer in this template'}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {step.reworkTotal} problem{step.reworkTotal === 1 ? '' : 's'} and{' '}
                            {step.stallCount} stall{step.stallCount === 1 ? '' : 's'} from{' '}
                            {step.reporterCount} user{step.reporterCount === 1 ? '' : 's'}.{' '}
                            {step.reportedButUnscored
                              ? 'No occurrence has been scored on this step.'
                              : 'The lowest authored occurrence here is 1, which claims it does not happen.'}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            By component:{' '}
                            {RISK_DIMENSIONS.filter(
                              (dimension) => step.reworkByDimension[dimension] > 0
                            )
                              .map(
                                (dimension) =>
                                  `${RISK_DIMENSION_LABELS[dimension]} ${step.reworkByDimension[dimension]}`
                              )
                              .join(', ') || 'not classified'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
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
                  <div className="max-h-[min(70vh,560px)] overflow-auto rounded-md border">
                    <Table wrapperClassName="overflow-visible">
                      <TableHeader className="sticky top-0 z-20 bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
                        <TableRow>
                          <TableHead className="w-10 bg-background p-2" aria-label="Delete" />
                          <TableHead className="cursor-pointer bg-background hover:bg-muted/50">Action</TableHead>
                          <TableHead className="cursor-pointer bg-background hover:bg-muted/50">Owner</TableHead>
                          <TableHead className="cursor-pointer bg-background hover:bg-muted/50">Due Date</TableHead>
                          <TableHead className="cursor-pointer bg-background hover:bg-muted/50">Project</TableHead>
                          <TableHead className="cursor-pointer bg-background hover:bg-muted/50">Status</TableHead>
                          <TableHead className="cursor-pointer bg-background hover:bg-muted/50">RPN</TableHead>
                          <TableHead className="cursor-pointer bg-background hover:bg-muted/50">Action Priority</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getAllActionItems()
                          .sort((a, b) => {
                            const aSt = actionItemDisplayFields(a).status;
                            const bSt = actionItemDisplayFields(b).status;
                            if (aSt === 'complete' && bSt !== 'complete') return 1;
                            if (aSt !== 'complete' && bSt === 'complete') return -1;
                            // Highest priority first, then RPN as the tie-break inside a
                            // priority class. Unscored items sort last: they cannot claim a
                            // place in the queue until someone scores them.
                            const apA = actionPriorityFor(a.failureMode);
                            const apB = actionPriorityFor(b.failureMode);
                            const rankA = apA == null ? 0 : actionPriorityUrgency(apA);
                            const rankB = apB == null ? 0 : actionPriorityUrgency(apB);
                            if (rankB !== rankA) return rankB - rankA;
                            const rpnA = calculateRPN(a.failureMode, null) ?? -1;
                            const rpnB = calculateRPN(b.failureMode, null) ?? -1;
                            return rpnB - rpnA;
                          })
                          .map((actionItem) => {
                            const rpn = calculateRPN(actionItem.failureMode, null);
                            const ap = actionPriorityFor(actionItem.failureMode);
                            const fields = actionItemDisplayFields(actionItem);
                            const dueOverdue =
                              fields.dueYmd &&
                              new Date(`${fields.dueYmd}T12:00:00`) < new Date() &&
                              fields.status !== 'complete';
                            return (
                              <TableRow key={actionItem.id} className={fields.status === 'complete' ? 'opacity-60' : ''}>
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
                                <TableCell className="max-w-[min(28rem,90vw)] align-top">
                                  <Textarea
                                    className="min-h-[56px] text-sm"
                                    disabled={!pfmeaIsEditable}
                                    defaultValue={fields.action}
                                    key={`tr-${actionItem.id}-act-${fields.action.slice(0, 40)}`}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onBlur={(e) => {
                                      const v = e.target.value;
                                      if (v !== fields.action) void saveRecommendedActionText(actionItem.id, v);
                                    }}
                                  />
                                  <div className="text-xs text-muted-foreground mt-1">
                                    <span className="font-medium text-foreground/80">Potential cause: </span>
                                    {getPotentialCauseSubtext(actionItem.failureMode, null)}
                                  </div>
                                </TableCell>
                                <TableCell className="align-top max-w-[12rem]">
                                  <Input
                                    disabled={!pfmeaIsEditable}
                                    defaultValue={fields.owner}
                                    key={`tr-${actionItem.id}-own-${fields.owner}`}
                                    placeholder="Owner"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onBlur={(e) => {
                                      const v = e.target.value;
                                      if (v !== fields.owner) void updatePfmeaActionItemTracking(actionItem, { owner: v });
                                    }}
                                  />
                                </TableCell>
                                <TableCell className="align-top w-[11rem]">
                                  <Input
                                    type="date"
                                    disabled={!pfmeaIsEditable}
                                    defaultValue={fields.dueYmd}
                                    key={`tr-${actionItem.id}-due-${fields.dueYmd}`}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onBlur={(e) => {
                                      const v = e.target.value;
                                      if (v !== fields.dueYmd) {
                                        void updatePfmeaActionItemTracking(actionItem, { dueYmd: v || null });
                                      }
                                    }}
                                    className={dueOverdue ? 'text-destructive-soft font-medium' : ''}
                                  />
                                </TableCell>
                                <TableCell className="align-top">
                                  <div className="text-sm">{selectedPfmeaProject?.name}</div>
                                </TableCell>
                                <TableCell className="align-top w-[10rem]">
                                  {fields.status === 'blocked' ? (
                                    <div className="flex flex-col gap-2">
                                      <Badge variant="destructive" className="w-fit text-xs">
                                        {formatActionStatusLabel('blocked')}
                                      </Badge>
                                      <Select
                                        disabled={!pfmeaIsEditable}
                                        onValueChange={(v) => {
                                          void updatePfmeaActionItemTracking(actionItem, { status: v });
                                        }}
                                      >
                                        <SelectTrigger className="h-9 text-xs" onMouseDown={(e) => e.stopPropagation()}>
                                          <SelectValue placeholder="Change status…" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="not_started">Not started</SelectItem>
                                          <SelectItem value="in_progress">In progress</SelectItem>
                                          <SelectItem value="complete">Complete</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  ) : (
                                    <Select
                                      value={fields.status}
                                      disabled={!pfmeaIsEditable}
                                      onValueChange={(v) => {
                                        void updatePfmeaActionItemTracking(actionItem, { status: v });
                                      }}
                                    >
                                      <SelectTrigger className="h-9 text-xs" onMouseDown={(e) => e.stopPropagation()}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="not_started">Not started</SelectItem>
                                        <SelectItem value="in_progress">In progress</SelectItem>
                                        <SelectItem value="complete">Complete</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                </TableCell>
                                <TableCell className="align-middle">
                                  <div className="flex min-h-[2.75rem] items-center justify-center">
                                    <Badge variant="outline" className={cn('shrink-0 tabular-nums', getActionPriorityBadgeClasses(ap))}>
                                      {rpn}
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell className="align-middle">
                                  <div className="flex min-h-[2.75rem] items-center justify-center">
                                    <Badge variant="outline" className={cn('shrink-0', getActionPriorityBadgeClasses(ap))}>
                                      {ap === 'H' ? 'High' : ap === 'M' ? 'Medium' : 'Low'}
                                    </Badge>
                                  </div>
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