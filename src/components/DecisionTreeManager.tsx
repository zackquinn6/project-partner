import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Card, CardContent } from './ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  X,
  ChevronsDownUp,
  ChevronsUpDown,
  GitBranch,
  Info,
  List,
  Save,
} from 'lucide-react';
import { Project, Phase, Operation, WorkflowStep } from '@/interfaces/Project';
import { useProject } from '@/contexts/ProjectContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import {
  DECISION_TREE_CONFIG_KEY,
  GENERAL_PROJECT_DECISIONS_KEY,
} from '@/utils/decisionTreeSchedulingPrereqs';
import type { GeneralProjectDecision, GeneralProjectChoice } from '@/interfaces/Project';
import {
  parseGeneralProjectDecisionsFromPrerequisites,
} from '@/utils/generalProjectDecisions';
import { sanitizeMicroDecisionOrphansForProject } from '@/utils/sanitizeMicroDecisionOrphansForProject';
import { 
  ReactFlow,
  Node, 
  Edge, 
  Background, 
  Controls, 
  MiniMap,
  Position,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface DecisionTreeManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProject: Project;
  /** Process Map / Workflow editor load phases in local state; pass them here so the table is not empty. */
  phases?: Phase[];
  /**
   * True only when Decision Tree is opened from Edit Standard (standard project foundation).
   * Standard phase/operation/step flow settings are editable only in this mode.
   */
  editingStandardFoundation?: boolean;
}

interface FlowTypeConfig {
  type: 'if-necessary' | 'alternate' | 'dependent' | 'blocked' | null;
  decisionPrompt?: string;
  alternateIds?: string[]; // IDs of alternate operations/steps
  predecessorIds?: string[]; // IDs of prerequisite operations
  dependentOn?: string; // ID of the if-necessary operation this depends on
}

interface StoredDecisionTreeEntity {
  type: 'if-necessary' | 'alternate' | 'dependent' | 'blocked' | null;
  decisionPrompt?: string | null;
  alternateIds?: string[];
  dependentOn?: string | null;
}

function serializeDecisionTreeEntity(config: FlowTypeConfig): StoredDecisionTreeEntity | null {
  const prompt = config.decisionPrompt?.trim();
  const hasContent =
    !!config.type ||
    !!prompt ||
    (config.alternateIds && config.alternateIds.length > 0) ||
    !!config.dependentOn;
  if (!hasContent) {
    return null;
  }
  return {
    type: config.type ?? null,
    decisionPrompt: prompt ? prompt : null,
    alternateIds:
      config.alternateIds && config.alternateIds.length > 0 ? config.alternateIds : undefined,
    dependentOn: config.dependentOn ?? null,
  };
}

export const DecisionTreeManager: React.FC<DecisionTreeManagerProps> = ({
  open,
  onOpenChange,
  currentProject,
  phases: phasesProp,
  editingStandardFoundation = false,
}) => {
  const workflowPhases = phasesProp ?? currentProject.phases ?? [];
  const { updateProject } = useProject();
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [expandedOperations, setExpandedOperations] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'table' | 'flowchart'>('table');
  const [flowchartLevel, setFlowchartLevel] = useState<'phase' | 'operation' | 'step'>('operation');
  /** When false, rows under `isStandard` phases are omitted from table and flowchart. */
  const [showStandardPhaseContent, setShowStandardPhaseContent] = useState(false);
  
  // Store flow type configurations by ID (phase/operation/step)
  const [flowConfigs, setFlowConfigs] = useState<Record<string, FlowTypeConfig>>({});
  
  // Store which item is currently showing alternate selector
  const [showAlternateSelector, setShowAlternateSelector] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [generalProjectDecisions, setGeneralProjectDecisions] = useState<GeneralProjectDecision[]>([]);

  const canEditGeneralProjectDecisions =
    !currentProject.isStandardTemplate || editingStandardFoundation;

  // Load existing flow configurations from database when component opens
  useEffect(() => {
    if (open && currentProject) {
      loadFlowConfigs();
    }
  }, [open, currentProject.id]);

  const hasStandardPhases = useMemo(
    () => workflowPhases.some((p) => p.isStandard === true),
    [workflowPhases]
  );

  const visiblePhases = useMemo(
    () =>
      workflowPhases.filter(
        (p) => showStandardPhaseContent || p.isStandard !== true
      ),
    [workflowPhases, showStandardPhaseContent]
  );

  const visiblePhaseTreeKey = useMemo(
    () => visiblePhases.map((p) => p.id).join(','),
    [visiblePhases]
  );

  /**
   * True if this entity is a standard foundation phase or anything inside a standard phase.
   * Uses parent phase `isStandard` only (operation/step `isStandard` is not reliable in all loaders).
   */
  const isUnderStandardFoundationPhase = useCallback(
    (entityId: string): boolean => {
      for (const phase of workflowPhases) {
        if (phase.id === entityId) {
          return phase.isStandard === true;
        }
        if (phase.isStandard !== true) {
          continue;
        }
        for (const op of phase.operations) {
          if (op.id === entityId) {
            return true;
          }
          for (const step of op.steps) {
            if (step.id === entityId) {
              return true;
            }
          }
        }
      }
      return false;
    },
    [workflowPhases]
  );

  const canEditDecisionSettings = useCallback(
    (entityId: string) => {
      if (editingStandardFoundation) {
        return true;
      }
      return !isUnderStandardFoundationPhase(entityId);
    },
    [editingStandardFoundation, isUnderStandardFoundationPhase]
  );

  // Expand phases and operations when opening so the table shows rows immediately
  useEffect(() => {
    if (!open || visiblePhases.length === 0) return;
    setExpandedPhases(new Set(visiblePhases.map((p) => p.id)));
    setExpandedOperations(
      new Set(visiblePhases.flatMap((p) => p.operations.map((o) => o.id)))
    );
  }, [open, visiblePhaseTreeKey]);

  const loadFlowConfigs = async () => {
    try {
      console.log('🔍 Loading decision tree config for project:', currentProject.id, 'Name:', currentProject.name);

      const phasesRes = await supabase
        .from('project_phases')
        .select('id')
        .eq('project_id', currentProject.id);

      if (phasesRes.error) throw phasesRes.error;

      const phaseIds = phasesRes.data?.map((p) => p.id) || [];

      const [operationsRes, projectRes] = await Promise.all([
        phaseIds.length > 0
          ? supabase.from('phase_operations').select('id, flow_type').in('phase_id', phaseIds)
          : Promise.resolve({ data: [] as { id: string; flow_type: string | null }[], error: null }),
        supabase.from('projects').select('scheduling_prerequisites').eq('id', currentProject.id).maybeSingle(),
      ]);

      if (operationsRes.error) throw operationsRes.error;
      if (projectRes.error) throw projectRes.error;

      const configs: Record<string, FlowTypeConfig> = {};

      operationsRes.data?.forEach((op) => {
        const ft = op.flow_type as string | null;
        if (!ft || ft === 'prime') {
          return;
        }
        if (ft === 'blocked') {
          configs[op.id] = {
            type: 'blocked',
            decisionPrompt: undefined,
            alternateIds: undefined,
            dependentOn: undefined,
            predecessorIds: [],
          };
          return;
        }
        configs[op.id] = {
          type: ft as 'if-necessary' | 'alternate' | 'dependent',
          decisionPrompt: undefined,
          alternateIds: undefined,
          dependentOn: undefined,
          predecessorIds: [],
        };
      });

      const rawPrereq = projectRes.data?.scheduling_prerequisites;
      if (rawPrereq && typeof rawPrereq === 'object' && !Array.isArray(rawPrereq)) {
        const rawObj = rawPrereq as Record<string, unknown>;
        setGeneralProjectDecisions(parseGeneralProjectDecisionsFromPrerequisites(rawPrereq));
        const dtBlob = rawObj[DECISION_TREE_CONFIG_KEY];
        if (dtBlob && typeof dtBlob === 'object' && !Array.isArray(dtBlob)) {
          for (const [eid, data] of Object.entries(dtBlob as Record<string, unknown>)) {
            if (typeof data !== 'object' || data === null || Array.isArray(data)) continue;
            const d = data as StoredDecisionTreeEntity;
            const prev = configs[eid] ?? { predecessorIds: [] as string[] };
            configs[eid] = {
              ...prev,
              type: d.type ?? prev.type ?? null,
              decisionPrompt:
                d.decisionPrompt !== undefined && d.decisionPrompt !== null
                  ? d.decisionPrompt || undefined
                  : prev.decisionPrompt,
              alternateIds: d.alternateIds ?? prev.alternateIds,
              dependentOn: d.dependentOn ?? prev.dependentOn,
              predecessorIds: prev.predecessorIds ?? [],
            };
          }
        }

        for (const [entityId, preds] of Object.entries(rawObj)) {
          if (entityId === DECISION_TREE_CONFIG_KEY) continue;
          if (entityId === GENERAL_PROJECT_DECISIONS_KEY) continue;
          if (!Array.isArray(preds)) continue;
          const ids = preds.filter((x): x is string => typeof x === 'string' && x.length > 0);
          if (ids.length === 0) continue;
          const existing = configs[entityId];
          configs[entityId] = {
            type: existing?.type ?? null,
            decisionPrompt: existing?.decisionPrompt,
            alternateIds: existing?.alternateIds,
            dependentOn: existing?.dependentOn,
            predecessorIds: ids,
          };
        }
      }

      setFlowConfigs(configs);
    } catch (error) {
      console.error('Error loading flow configs:', error);
      toast.error('Failed to load decision tree configuration');
      setGeneralProjectDecisions([]);
    }
  };

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phaseId)) {
        newSet.delete(phaseId);
        // Also collapse all operations in this phase
        workflowPhases.find(p => p.id === phaseId)?.operations.forEach(op => {
          const newOps = new Set(expandedOperations);
          newOps.delete(op.id);
          setExpandedOperations(newOps);
        });
      } else {
        newSet.add(phaseId);
      }
      return newSet;
    });
  };

  const toggleOperation = (operationId: string) => {
    setExpandedOperations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(operationId)) {
        newSet.delete(operationId);
      } else {
        newSet.add(operationId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedPhases(new Set(visiblePhases.map((p) => p.id)));
    const allOps = visiblePhases.flatMap((p) => p.operations.map((o) => o.id));
    setExpandedOperations(new Set(allOps));
  };

  const collapseAll = () => {
    setExpandedPhases(new Set());
    setExpandedOperations(new Set());
  };

  const updateFlowConfig = (id: string, config: Partial<FlowTypeConfig>) => {
    setFlowConfigs(prev => ({
      ...prev,
      [id]: { ...prev[id], ...config } as FlowTypeConfig
    }));
  };

  const addAlternate = (itemId: string, alternateId: string) => {
    const currentConfig = flowConfigs[itemId] || { type: 'alternate', alternateIds: [] };
    const updatedAlternates = [...(currentConfig.alternateIds || []), alternateId];
    
    // Update the main item
    updateFlowConfig(itemId, { 
      type: 'alternate',
      alternateIds: updatedAlternates 
    });
    
    // Update the alternate item to reference back (bidirectional)
    const alternateConfig = flowConfigs[alternateId] || { type: 'alternate', alternateIds: [] };
    if (!alternateConfig.alternateIds?.includes(itemId)) {
      updateFlowConfig(alternateId, {
        type: 'alternate',
        alternateIds: [...(alternateConfig.alternateIds || []), itemId]
      });
    }
    
      };

  const removeAlternate = (itemId: string, alternateId: string) => {
    const currentConfig = flowConfigs[itemId];
    if (currentConfig?.alternateIds) {
      updateFlowConfig(itemId, {
        alternateIds: currentConfig.alternateIds.filter(id => id !== alternateId)
      });
    }
    
    // Remove bidirectional reference
    const alternateConfig = flowConfigs[alternateId];
    if (alternateConfig?.alternateIds) {
      updateFlowConfig(alternateId, {
        alternateIds: alternateConfig.alternateIds.filter(id => id !== itemId)
      });
    }
    
      };

  const getAllOperations = () => {
    return workflowPhases.flatMap(phase => 
      phase.operations.map(op => ({
        ...op,
        phaseName: phase.name,
        fullId: `${phase.id}-${op.id}`
      }))
    );
  };

  const getItemLabel = (itemId: string) => {
    // Try to find as operation
    const allOps = getAllOperations();
    const op = allOps.find(o => o.id === itemId || o.fullId === itemId);
    if (op) return op.name;
    
    // Try to find as step
    for (const phase of workflowPhases) {
      for (const operation of phase.operations) {
        const step = operation.steps.find(s => s.id === itemId);
        if (step) return step.step;
      }
    }
    
    // Try to find as phase
    const phase = workflowPhases.find(p => p.id === itemId);
    if (phase) return phase.name;
    
    return itemId;
  };

  const renderFlowTypeControls = (
    itemId: string,
    itemName: string,
    availableAlternates: Array<{ id: string; label: string }>,
    editable: boolean,
    options?: { allowBlocked?: boolean }
  ) => {
    const allowBlocked = options?.allowBlocked === true;
    const config = flowConfigs[itemId] || { type: null };
    const showBlockedOption = allowBlocked || config.type === 'blocked';

    if (!editable) {
      const parts: string[] = [];
      if (config.type) {
        parts.push(config.type === 'blocked' ? 'blocked' : String(config.type));
      }
      if (config.decisionPrompt) {
        parts.push('prompt');
      }
      if (config.alternateIds && config.alternateIds.length > 0) {
        parts.push(`${config.alternateIds.length} alternate(s)`);
      }
      if (config.type === 'dependent' && config.dependentOn) {
        parts.push(`depends on ${getItemLabel(config.dependentOn)}`);
      }
      if (parts.length === 0) {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <span className="text-xs text-muted-foreground">{parts.join(' · ')}</span>
      );
    }

    return (
      <div className="min-w-0 space-y-1.5 sm:space-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <Select 
            value={config.type || 'none'} 
            onValueChange={(value) => {
              if (value === 'none') {
                updateFlowConfig(itemId, {
                  type: null,
                  decisionPrompt: undefined,
                  alternateIds: [],
                  dependentOn: undefined,
                });
              } else if (value === 'blocked') {
                updateFlowConfig(itemId, {
                  type: 'blocked',
                  decisionPrompt: undefined,
                  alternateIds: [],
                  dependentOn: undefined,
                });
              } else {
                updateFlowConfig(itemId, {
                  type: value as 'if-necessary' | 'alternate' | 'dependent',
                });
              }
            }}
          >
            <SelectTrigger className="h-8 min-w-0 max-w-full flex-1 text-xs sm:h-9 sm:text-sm">
              <SelectValue placeholder="Select flow type" />
            </SelectTrigger>
            <SelectContent className="z-[200] bg-popover">
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="if-necessary">If-Necessary</SelectItem>
              <SelectItem value="alternate">Alternate</SelectItem>
              <SelectItem value="dependent">Dependent</SelectItem>
              {showBlockedOption ? (
                <SelectItem value="blocked">Blocked (incorporated)</SelectItem>
              ) : null}
            </SelectContent>
          </Select>

          {config.type === 'alternate' && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 shrink-0 px-2 text-xs"
              onClick={() => setShowAlternateSelector(itemId)}
            >
              <Plus className="mr-1 h-3 w-3" />
              Add Alternate
            </Button>
          )}
        </div>

        {/* Dependent operation selector */}
        {config.type === 'dependent' && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Depends On (If-Necessary Operation)</Label>
            <Select 
              value={config.dependentOn || ''} 
              onValueChange={(value) => updateFlowConfig(itemId, { dependentOn: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select if-necessary operation" />
              </SelectTrigger>
              <SelectContent className="z-[200] max-h-[300px] bg-popover">
                {availableAlternates
                  .filter(alt => {
                    const altConfig = flowConfigs[alt.id];
                    return altConfig?.type === 'if-necessary' && alt.id !== itemId;
                  })
                  .map(alt => (
                    <SelectItem key={alt.id} value={alt.id} className="text-sm">
                      {alt.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This operation will be automatically included when the selected if-necessary operation is chosen by the user
            </p>
          </div>
        )}

        {config.type && config.type !== 'blocked' && (
          <div>
            <Label className="text-sm font-semibold">Decision Prompt</Label>
            <Textarea
              placeholder="Enter question or description for this decision point"
              value={config.decisionPrompt || ''}
              onChange={(e) => updateFlowConfig(itemId, { decisionPrompt: e.target.value })}
              className="min-h-[80px] mt-1 text-sm"
            />
          </div>
        )}

        {config.type === 'alternate' && config.alternateIds && config.alternateIds.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Alternates:</div>
            {config.alternateIds.map(altId => (
              <div key={altId} className="flex items-center gap-2 text-xs">
                <Badge variant="secondary" className="text-xs">
                  {getItemLabel(altId)}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeAlternate(itemId, altId)}
                  className="h-5 w-5 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {config.type === 'dependent' && config.dependentOn && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Depends on:</div>
            <Badge variant="outline" className="text-xs">
              {getItemLabel(config.dependentOn)}
            </Badge>
          </div>
        )}

        {/* Alternate selector dialog */}
        {showAlternateSelector === itemId && (
          <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/50">
            <div className="bg-background p-6 rounded-lg max-w-lg w-full max-h-[500px] overflow-auto border shadow-lg">
              <h3 className="text-lg font-semibold mb-4">Select Alternates</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose operations that are alternatives to "{itemName}"
              </p>
              <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto">
                {availableAlternates
                  .filter(alt => alt.id !== itemId && !config.alternateIds?.includes(alt.id))
                  .map(alt => (
                    <Button
                      key={alt.id}
                      variant="outline"
                      className="w-full justify-start text-left text-sm h-auto py-3 px-4"
                      onClick={() => {
                        addAlternate(itemId, alt.id);
                        setShowAlternateSelector(null);
                      }}
                    >
                      <span className="truncate">{alt.label}</span>
                    </Button>
                  ))}
              </div>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setShowAlternateSelector(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPredecessorControls = (
    itemId: string,
    availableOps: Array<{ id: string; label: string }>,
    editable: boolean
  ) => {
    const config = flowConfigs[itemId] || { predecessorIds: [] };

    if (!editable) {
      const preds = config.predecessorIds;
      if (!preds || preds.length === 0) {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <div className="flex min-w-0 flex-wrap gap-1">
          {preds.map((predId) => (
            <Badge key={predId} variant="outline" className="max-w-full truncate text-xs">
              {getItemLabel(predId)}
            </Badge>
          ))}
        </div>
      );
    }

    return (
      <div className="min-w-0 space-y-1.5 sm:space-y-2">
        <Select
          onValueChange={(value) => {
            const currentPreds = config.predecessorIds || [];
            if (!currentPreds.includes(value)) {
              updateFlowConfig(itemId, {
                predecessorIds: [...currentPreds, value]
              });
            }
          }}
        >
          <SelectTrigger className="h-8 w-full min-w-0 max-w-full text-xs sm:h-9 sm:text-sm">
            <SelectValue placeholder="Add predecessor" />
          </SelectTrigger>
          <SelectContent className="z-[200] max-h-[300px] bg-popover">
            {availableOps
              .filter(op => op.id !== itemId && !config.predecessorIds?.includes(op.id))
              .map(op => (
                <SelectItem key={op.id} value={op.id} className="text-sm">
                  {op.label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {config.predecessorIds && config.predecessorIds.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Prerequisites:</div>
            {config.predecessorIds.map(predId => (
              <div key={predId} className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="text-xs">
                  {getItemLabel(predId)}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    updateFlowConfig(itemId, {
                      predecessorIds: config.predecessorIds?.filter(id => id !== predId)
                    });
                  }}
                  className="h-5 w-5 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const saveDecisionTree = async (closeAfter: boolean) => {
    setIsSaving(true);
    try {
      console.log('💾 Saving decision tree configurations for project:', currentProject.id);
      
      // Build a map of operations to their alternate groups
      // Each group of alternates should share the same group identifier
      const alternateGroupMap = new Map<string, string>(); // operationId -> groupId
      
      // First pass: identify alternate groups
      for (const [itemId, config] of Object.entries(flowConfigs)) {
        if (config.type === 'alternate' && config.alternateIds && config.alternateIds.length > 0) {
          // Check if any of the alternates already have a group ID
          let groupId: string | null = null;
          
          // Check if this operation or any of its alternates already have a group
          for (const altId of [itemId, ...config.alternateIds]) {
            if (alternateGroupMap.has(altId)) {
              groupId = alternateGroupMap.get(altId)!;
              break;
            }
          }
          
          // If no existing group, create a new group ID
          if (!groupId) {
            groupId = `alt-group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          }
          
          // Assign all operations in this alternate group to the same group ID
          alternateGroupMap.set(itemId, groupId);
          config.alternateIds.forEach(altId => {
            alternateGroupMap.set(altId, groupId!);
          });
        }
      }
      
      // Second pass: update all operations in database
      let errorCount = 0;
      
      for (const [itemId, config] of Object.entries(flowConfigs)) {
        // Check if this is an operation (exists in phase_operations)
        const isOperation = workflowPhases.some(phase => 
          phase.operations.some(op => op.id === itemId)
        );
        
        if (isOperation) {
          if (!editingStandardFoundation && isUnderStandardFoundationPhase(itemId)) {
            continue;
          }
          const flowTypeDb =
            config.type === null || config.type === undefined ? 'prime' : config.type;
          const { error } = await supabase
            .from('phase_operations')
            .update({
              flow_type: flowTypeDb,
              updated_at: new Date().toISOString(),
            })
            .eq('id', itemId);

          if (error) {
            console.error('Error updating operation:', itemId, error);
            errorCount++;
          }
        }
      }

      const { data: projRow, error: prereqFetchErr } = await supabase
        .from('projects')
        .select('scheduling_prerequisites')
        .eq('id', currentProject.id)
        .maybeSingle();

      if (prereqFetchErr) {
        throw prereqFetchErr;
      }

      const raw = projRow?.scheduling_prerequisites;
      const mergedStringPrereqs: Record<string, string[]> = {};
      let existingDecisionBlob: Record<string, StoredDecisionTreeEntity> = {};

      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        for (const [k, v] of Object.entries(raw)) {
          if (k === DECISION_TREE_CONFIG_KEY) {
            if (v && typeof v === 'object' && !Array.isArray(v)) {
              existingDecisionBlob = { ...(v as Record<string, StoredDecisionTreeEntity>) };
            }
            continue;
          }
          if (k === GENERAL_PROJECT_DECISIONS_KEY) {
            continue;
          }
          if (
            !editingStandardFoundation &&
            Array.isArray(v) &&
            v.every((x) => typeof x === 'string')
          ) {
            const ids = v.filter((x): x is string => typeof x === 'string' && x.length > 0);
            if (ids.length > 0) {
              mergedStringPrereqs[k] = ids;
            }
          }
        }
      }

      if (editingStandardFoundation) {
        for (const [itemId, config] of Object.entries(flowConfigs)) {
          const preds = config.predecessorIds?.filter((id) => typeof id === 'string' && id.length > 0);
          if (preds && preds.length > 0) {
            mergedStringPrereqs[itemId] = preds;
          }
        }
      } else {
        for (const [itemId, config] of Object.entries(flowConfigs)) {
          if (isUnderStandardFoundationPhase(itemId)) {
            continue;
          }
          const preds = config.predecessorIds?.filter((id) => typeof id === 'string' && id.length > 0);
          if (preds && preds.length > 0) {
            mergedStringPrereqs[itemId] = preds;
          } else {
            delete mergedStringPrereqs[itemId];
          }
        }
      }

      let mergedDecisionBlob: Record<string, StoredDecisionTreeEntity> = {};
      if (editingStandardFoundation) {
        for (const [id, cfg] of Object.entries(flowConfigs)) {
          const s = serializeDecisionTreeEntity(cfg);
          if (s) {
            mergedDecisionBlob[id] = s;
          }
        }
      } else {
        mergedDecisionBlob = { ...existingDecisionBlob };
        for (const [id, cfg] of Object.entries(flowConfigs)) {
          if (isUnderStandardFoundationPhase(id)) {
            continue;
          }
          const s = serializeDecisionTreeEntity(cfg);
          if (s === null) {
            delete mergedDecisionBlob[id];
          } else {
            mergedDecisionBlob[id] = s;
          }
        }
      }

      const scheduling_prerequisites: Record<string, unknown> = { ...mergedStringPrereqs };
      if (Object.keys(mergedDecisionBlob).length > 0) {
        scheduling_prerequisites[DECISION_TREE_CONFIG_KEY] = mergedDecisionBlob;
      }

      const existingGpd = parseGeneralProjectDecisionsFromPrerequisites(raw);
      const gpdToPersist = canEditGeneralProjectDecisions ? generalProjectDecisions : existingGpd;
      if (gpdToPersist.length > 0) {
        scheduling_prerequisites[GENERAL_PROJECT_DECISIONS_KEY] = gpdToPersist.map((d) => ({
          id: d.id,
          label: d.label,
          choices: d.choices.map((c: GeneralProjectChoice) => ({ id: c.id, label: c.label })),
        }));
      }

      const { error: prereqError } = await supabase
        .from('projects')
        .update({
          scheduling_prerequisites: scheduling_prerequisites as Json,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentProject.id);

      if (prereqError) {
        console.error('Error saving scheduling prerequisites:', prereqError);
        toast.error('Flow types may have saved, but scheduling prerequisites failed to save.');
        return;
      }

      const { error: rebuildErr } = await supabase.rpc('rebuild_phases_json_from_project_phases', {
        p_project_id: currentProject.id,
      });
      if (rebuildErr) {
        console.warn('DecisionTreeManager: rebuild_phases_json_from_project_phases failed', rebuildErr);
      }

      const { operationStepsUpdated, instructionsUpdated } = await sanitizeMicroDecisionOrphansForProject(
        currentProject.id,
        gpdToPersist
      );
      if (operationStepsUpdated > 0 || instructionsUpdated > 0) {
        const { error: rebuild2 } = await supabase.rpc('rebuild_phases_json_from_project_phases', {
          p_project_id: currentProject.id,
        });
        if (rebuild2) {
          console.warn('DecisionTreeManager: rebuild after micro-decision sanitize failed', rebuild2);
        }
      }

      if (errorCount > 0) {
        toast.error(`Failed to save ${errorCount} operation(s)`);
      } else {
        console.log('✅ Successfully saved decision tree configurations');

        if (closeAfter) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          onOpenChange(false);
        }
      }
    } catch (error) {
      console.error('Error saving decision tree:', error);
      toast.error('Failed to save decision tree configuration');
    } finally {
      setIsSaving(false);
    }
  };

  // Generate flowchart nodes and edges based on level
  const generateFlowchart = useCallback(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let xPos = 0;
    const nodeSpacing = 250;
    const verticalSpacing = 200;

    if (flowchartLevel === 'phase') {
      // Phase-level flowchart (horizontal)
      visiblePhases.forEach((phase, index) => {
        const config = flowConfigs[phase.id];
        const nodeType =
          config?.type === 'if-necessary'
            ? 'if-necessary'
            : config?.type === 'alternate'
              ? 'alternate'
              : config?.type === 'dependent'
                ? 'dependent'
                : config?.type === 'blocked'
                  ? 'blocked'
                  : 'default';

        nodes.push({
          id: phase.id,
          data: { 
            label: phase.name,
            type: nodeType,
            prompt: config?.decisionPrompt
          },
          position: { x: xPos, y: 100 },
          type: 'default',
          style: {
            background:
              config?.type === 'blocked'
                ? '#e7e5e4'
                : config?.type === 'if-necessary'
                  ? '#fef3c7'
                  : config?.type === 'alternate'
                    ? '#dbeafe'
                    : config?.type === 'dependent'
                      ? '#f3e8ff'
                      : '#f3f4f6',
            border: '2px solid',
            borderColor:
              config?.type === 'blocked'
                ? '#57534e'
                : config?.type === 'if-necessary'
                  ? '#f59e0b'
                  : config?.type === 'alternate'
                    ? '#3b82f6'
                    : config?.type === 'dependent'
                      ? '#a855f7'
                      : '#9ca3af',
            borderRadius: '8px',
            padding: '10px',
            width: 180,
          },
        });

        // Add edges to next phase
        if (index < visiblePhases.length - 1) {
          edges.push({
            id: `${phase.id}-${visiblePhases[index + 1].id}`,
            source: phase.id,
            target: visiblePhases[index + 1].id,
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
          });
        }

        // Add alternate branches with fork visualization
        if (config?.alternateIds && config.alternateIds.length > 0) {
          // Create a decision diamond node
          const decisionNodeId = `decision-${phase.id}`;
          nodes.push({
            id: decisionNodeId,
            data: { label: '◇', type: 'decision' },
            position: { x: xPos + nodeSpacing - 100, y: 100 + verticalSpacing / 2 },
            type: 'default',
            style: {
              background: '#fef3c7',
              border: '2px solid #f59e0b',
              borderRadius: '50%',
              padding: '15px',
              width: 60,
              height: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
            },
          });

          // Connect main phase to decision node
          edges.push({
            id: `${phase.id}-${decisionNodeId}`,
            source: phase.id,
            target: decisionNodeId,
            animated: true,
            style: { stroke: '#f59e0b' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
          });

          config.alternateIds.forEach((altId, altIndex) => {
            const yOffset = (altIndex + 1) * verticalSpacing;
            const altPhase = workflowPhases.find(p => p.id === altId);
            if (altPhase && !nodes.find(n => n.id === altId)) {
              nodes.push({
                id: altId,
                data: { label: altPhase.name, type: 'alternate' },
                position: { x: xPos + nodeSpacing, y: 100 + yOffset },
                type: 'default',
                style: {
                  background: '#dbeafe',
                  border: '2px solid #3b82f6',
                  borderRadius: '8px',
                  padding: '10px',
                  width: 180,
                },
              });

              // Connect decision node to alternate
              edges.push({
                id: `${decisionNodeId}-${altId}`,
                source: decisionNodeId,
                target: altId,
                animated: true,
                style: { stroke: '#3b82f6', strokeDasharray: '5,5' },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
              });
            }
          });
        }

        xPos += nodeSpacing;
      });
    } else if (flowchartLevel === 'operation') {
      // Operation-level flowchart (horizontal)
      visiblePhases.forEach((phase) => {
        // Add phase header
        nodes.push({
          id: `phase-header-${phase.id}`,
          data: { label: `Phase: ${phase.name}` },
          position: { x: xPos, y: 0 },
          type: 'default',
          style: {
            background: '#f0fdf4',
            border: '2px solid #16a34a',
            borderRadius: '8px',
            padding: '10px',
            fontWeight: 'bold',
            width: 200,
          },
        });
        xPos += nodeSpacing / 2;

        phase.operations.forEach((operation, opIndex) => {
          const config = flowConfigs[operation.id];
          const nodeType = config?.type === 'if-necessary' ? 'if-necessary' : 
                          config?.type === 'alternate' ? 'alternate' : 
                          config?.type === 'dependent' ? 'dependent' : 'default';

          nodes.push({
            id: operation.id,
            data: { 
              label: operation.name,
              type: nodeType,
              prompt: config?.decisionPrompt
            },
            position: { x: xPos, y: 100 },
            type: 'default',
            style: {
              background: config?.type === 'if-necessary' ? '#fef3c7' : 
                         config?.type === 'alternate' ? '#dbeafe' : 
                         config?.type === 'dependent' ? '#f3e8ff' : '#ffffff',
              border: '2px solid',
              borderColor: config?.type === 'if-necessary' ? '#f59e0b' : 
                          config?.type === 'alternate' ? '#3b82f6' : 
                          config?.type === 'dependent' ? '#a855f7' : '#d1d5db',
              borderRadius: '8px',
              padding: '10px',
              width: 180,
            },
          });

          // Connect to previous operation or phase header
          if (opIndex === 0) {
            edges.push({
              id: `phase-${phase.id}-${operation.id}`,
              source: `phase-header-${phase.id}`,
              target: operation.id,
              animated: true,
              markerEnd: { type: MarkerType.ArrowClosed },
            });
          } else {
            edges.push({
              id: `${phase.operations[opIndex - 1].id}-${operation.id}`,
              source: phase.operations[opIndex - 1].id,
              target: operation.id,
              animated: true,
              markerEnd: { type: MarkerType.ArrowClosed },
            });
          }

          // Add alternate branches with fork visualization
          if (config?.alternateIds && config.alternateIds.length > 0) {
            // Create a decision diamond node
            const decisionNodeId = `decision-${operation.id}`;
            nodes.push({
              id: decisionNodeId,
              data: { label: '◇', type: 'decision' },
              position: { x: xPos + nodeSpacing - 100, y: 100 + verticalSpacing / 2 },
              type: 'default',
              style: {
                background: '#fef3c7',
                border: '2px solid #f59e0b',
                borderRadius: '50%',
                padding: '15px',
                width: 60,
                height: 60,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
              },
            });

            // Connect main operation to decision node
            edges.push({
              id: `${operation.id}-${decisionNodeId}`,
              source: operation.id,
              target: decisionNodeId,
              animated: true,
              style: { stroke: '#f59e0b' },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
            });

            config.alternateIds.forEach((altId, altIndex) => {
              const yOffset = (altIndex + 1) * verticalSpacing;
              const altOp = phase.operations.find(o => o.id === altId);
              if (altOp && !nodes.find(n => n.id === altId)) {
                nodes.push({
                  id: altId,
                  data: { label: altOp.name, type: 'alternate' },
                  position: { x: xPos + nodeSpacing, y: 100 + yOffset },
                  type: 'default',
                  style: {
                    background: '#dbeafe',
                    border: '2px solid #3b82f6',
                    borderRadius: '8px',
                    padding: '10px',
                    width: 180,
                  },
                });

                // Connect decision node to alternate
                edges.push({
                  id: `${decisionNodeId}-${altId}`,
                  source: decisionNodeId,
                  target: altId,
                  animated: true,
                  style: { stroke: '#3b82f6', strokeDasharray: '5,5' },
                  markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
                });
              }
            });
          }

          xPos += nodeSpacing;
        });
      });
    } else {
      // Step-level flowchart (horizontal)
      visiblePhases.forEach((phase) => {
        phase.operations.forEach((operation) => {
          // Add operation header
          nodes.push({
            id: `op-header-${operation.id}`,
            data: { label: `${phase.name} > ${operation.name}` },
            position: { x: xPos, y: 0 },
            type: 'default',
            style: {
              background: '#f0fdf4',
              border: '2px solid #16a34a',
              borderRadius: '8px',
              padding: '8px',
              fontSize: '12px',
              width: 200,
            },
          });
          xPos += nodeSpacing / 2;

          operation.steps.forEach((step, stepIndex) => {
            const config = flowConfigs[step.id];
            const nodeType = config?.type === 'if-necessary' ? 'if-necessary' : 
                            config?.type === 'alternate' ? 'alternate' : 
                            config?.type === 'dependent' ? 'dependent' : 'default';

            nodes.push({
              id: step.id,
              data: { 
                label: step.step,
                type: nodeType,
                prompt: config?.decisionPrompt
              },
              position: { x: xPos, y: 100 },
              type: 'default',
              style: {
                background: config?.type === 'if-necessary' ? '#fef3c7' : 
                           config?.type === 'alternate' ? '#dbeafe' : 
                           config?.type === 'dependent' ? '#f3e8ff' : '#ffffff',
                border: '1px solid',
                borderColor: config?.type === 'if-necessary' ? '#f59e0b' : 
                            config?.type === 'alternate' ? '#3b82f6' : 
                            config?.type === 'dependent' ? '#a855f7' : '#d1d5db',
                borderRadius: '6px',
                padding: '8px',
                fontSize: '12px',
                width: 180,
              },
            });

            // Connect to previous step or operation header
            if (stepIndex === 0) {
              edges.push({
                id: `op-${operation.id}-${step.id}`,
                source: `op-header-${operation.id}`,
                target: step.id,
                animated: true,
                markerEnd: { type: MarkerType.ArrowClosed },
              });
            } else {
              edges.push({
                id: `${operation.steps[stepIndex - 1].id}-${step.id}`,
                source: operation.steps[stepIndex - 1].id,
                target: step.id,
                animated: true,
                markerEnd: { type: MarkerType.ArrowClosed },
              });
            }

            // Add alternate branches with fork visualization
            if (config?.alternateIds && config.alternateIds.length > 0) {
              // Create a decision diamond node
              const decisionNodeId = `decision-${step.id}`;
              nodes.push({
                id: decisionNodeId,
                data: { label: '◇', type: 'decision' },
                position: { x: xPos + nodeSpacing * 0.5, y: 100 + verticalSpacing / 2 },
                type: 'default',
                style: {
                  background: '#fef3c7',
                  border: '2px solid #f59e0b',
                  borderRadius: '50%',
                  padding: '12px',
                  width: 50,
                  height: 50,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                },
              });

              // Connect main step to decision node
              edges.push({
                id: `${step.id}-${decisionNodeId}`,
                source: step.id,
                target: decisionNodeId,
                animated: true,
                style: { stroke: '#f59e0b' },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
              });

              config.alternateIds.forEach((altId, altIndex) => {
                const yOffset = (altIndex + 1) * verticalSpacing;
                const altStep = operation.steps.find(s => s.id === altId);
                if (altStep && !nodes.find(n => n.id === altId)) {
                  nodes.push({
                    id: altId,
                    data: { label: altStep.step, type: 'alternate' },
                    position: { x: xPos + nodeSpacing, y: 100 + yOffset },
                    type: 'default',
                    style: {
                      background: '#dbeafe',
                      border: '1px solid #3b82f6',
                      borderRadius: '6px',
                      padding: '8px',
                      fontSize: '12px',
                      width: 180,
                    },
                  });

                  // Connect decision node to alternate
                  edges.push({
                    id: `${decisionNodeId}-${altId}`,
                    source: decisionNodeId,
                    target: altId,
                    animated: true,
                    style: { stroke: '#3b82f6', strokeDasharray: '5,5' },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
                  });
                }
              });
            }

            xPos += nodeSpacing * 0.7;
          });

          xPos += nodeSpacing / 2;
        });
      });
    }

    return { nodes, edges };
  }, [visiblePhases, workflowPhases, flowConfigs, flowchartLevel]);

  const { nodes, edges } = useMemo(() => generateFlowchart(), [generateFlowchart]);

  if (!currentProject) return null;

  const allOperations = getAllOperations();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[100]"
        className="!fixed !inset-0 !left-0 !top-0 z-[101] !flex h-[100dvh] max-h-[100dvh] w-full max-w-[100vw] !max-w-[100vw] translate-x-0 translate-y-0 !flex-col gap-0 overflow-hidden rounded-none border-0 p-0 shadow-none md:h-[100dvh] md:max-h-[100dvh] md:!max-w-none md:!translate-x-0 md:!translate-y-0"
      >
        <DialogHeader className="shrink-0 border-b px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="min-w-0 truncate text-base sm:text-lg">
              Decision Tree Manager - {currentProject.name}
            </DialogTitle>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 sm:h-9 sm:w-9"
                disabled={isSaving}
                onClick={() => void saveDecisionTree(false)}
                title="Save"
                aria-label="Save decision tree without closing"
              >
                <Save className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isSaving}
                onClick={() => void saveDecisionTree(true)}
              >
                Save & Close
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'table' | 'flowchart')} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="mb-2 shrink-0 px-4 pt-2 sm:mb-4 sm:px-6 sm:pt-0">
            <TabsList className="grid h-11 w-full grid-cols-2 gap-0 rounded-md border border-border bg-muted p-0 text-muted-foreground shadow-sm">
              <TabsTrigger
                value="table"
                className="flex h-full w-full items-center justify-center gap-2 rounded-none rounded-l-md border-r border-border py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                <List className="h-4 w-4 shrink-0" />
                Table View
              </TabsTrigger>
              <TabsTrigger
                value="flowchart"
                className="flex h-full w-full items-center justify-center gap-2 rounded-none rounded-r-md py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                <GitBranch className="h-4 w-4 shrink-0" />
                Flowchart
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="table"
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 data-[state=inactive]:hidden sm:px-6 sm:pb-6"
          >
            {/* Single scroll viewport: Accordion + Radix content heights are content-sized, so flex+min-h-0 must live here */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
            <TooltipProvider delayDuration={300}>
              <Accordion
                type="multiple"
                defaultValue={['general-project-decisions', 'structure-decisions']}
                className="border-0"
              >
                <AccordionItem value="general-project-decisions" className="shrink-0 border-b border-border">
                  <AccordionTrigger className="py-3 text-base font-semibold hover:no-underline [&[data-state=open]]:pb-2">
                    <span className="flex flex-1 items-center gap-2 pr-2 text-left">
                      <span>General Project Decisions</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="inline-flex shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            role="button"
                            tabIndex={0}
                            aria-label="About general project decisions"
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
                            }}
                          >
                            <Info className="h-4 w-4" aria-hidden />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="start" className="max-w-sm text-left">
                          Project-wide choices (e.g. tile size, layout). Homeowners pick these in Project Customizer
                          alongside phase/alternate decisions. Link instruction sections and tools to these in the
                          workflow editor.
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0 pt-0">
            <Card className="mb-4 shrink-0 border-muted">
              <CardContent className="space-y-4 pt-4">
                {!canEditGeneralProjectDecisions ? (
                  <p className="text-sm text-muted-foreground">
                    General project decisions for the Standard Project Foundation can only be edited from{' '}
                    <span className="font-medium text-foreground">Edit Standard</span>.
                  </p>
                ) : null}
                <div className="space-y-4">
                  {generalProjectDecisions.map((decision, dIdx) => (
                    <div
                      key={decision.id}
                      className="rounded-lg border bg-muted/20 p-3 space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1 flex-1 min-w-[12rem]">
                          <Label className="text-xs font-semibold">Decision label</Label>
                          <Input
                            value={decision.label}
                            disabled={!canEditGeneralProjectDecisions}
                            onChange={(e) => {
                              const v = e.target.value;
                              setGeneralProjectDecisions((prev) =>
                                prev.map((d, i) => (i === dIdx ? { ...d, label: v } : d))
                              );
                            }}
                            placeholder="e.g. Tile size"
                            className="h-8 text-sm"
                          />
                        </div>
                        {canEditGeneralProjectDecisions ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() =>
                              setGeneralProjectDecisions((prev) => prev.filter((_, i) => i !== dIdx))
                            }
                          >
                            <X className="h-4 w-4 mr-1" />
                            Remove decision
                          </Button>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Choices</Label>
                        {decision.choices.map((choice, cIdx) => (
                          <div key={choice.id} className="flex flex-wrap items-center gap-2">
                            <Input
                              value={choice.label}
                              disabled={!canEditGeneralProjectDecisions}
                              onChange={(e) => {
                                const v = e.target.value;
                                setGeneralProjectDecisions((prev) =>
                                  prev.map((d, i) => {
                                    if (i !== dIdx) return d;
                                    const nextChoices = d.choices.map((c, j) =>
                                      j === cIdx ? { ...c, label: v } : c
                                    );
                                    return { ...d, choices: nextChoices };
                                  })
                                );
                              }}
                              className="h-8 text-sm flex-1 min-w-[8rem]"
                              placeholder="Choice label"
                            />
                            {canEditGeneralProjectDecisions ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setGeneralProjectDecisions((prev) =>
                                    prev.map((d, i) => {
                                      if (i !== dIdx) return d;
                                      return {
                                        ...d,
                                        choices: d.choices.filter((_, j) => j !== cIdx),
                                      };
                                    })
                                  )
                                }
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            ) : null}
                          </div>
                        ))}
                        {canEditGeneralProjectDecisions ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setGeneralProjectDecisions((prev) =>
                                prev.map((d, i) => {
                                  if (i !== dIdx) return d;
                                  const nid = `gpc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
                                  return {
                                    ...d,
                                    choices: [...d.choices, { id: nid, label: 'New choice' }],
                                  };
                                })
                              )
                            }
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add choice
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
                {canEditGeneralProjectDecisions ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      setGeneralProjectDecisions((prev) => [
                        ...prev,
                        {
                          id: `gpd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                          label: 'New decision',
                          choices: [
                            {
                              id: `gpc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                              label: 'Choice A',
                            },
                          ],
                        },
                      ])
                    }
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add decision
                  </Button>
                ) : null}
              </CardContent>
            </Card>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="structure-decisions" className="border-b-0">
                  <AccordionTrigger className="shrink-0 py-3 text-base font-semibold hover:no-underline [&[data-state=open]]:pb-2">
                    Structure Decisions
                  </AccordionTrigger>
                  <AccordionContent className="pb-2 pt-0">
            <div className="mb-2 flex shrink-0 flex-col gap-2 sm:mb-4 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={expandAll}>
                  <ChevronsUpDown className="mr-2 h-4 w-4" />
                  Expand All
                </Button>
                <Button size="sm" variant="outline" onClick={collapseAll}>
                  <ChevronsDownUp className="mr-2 h-4 w-4" />
                  Collapse All
                </Button>
              </div>
              {hasStandardPhases ? (
                <div className="flex items-center gap-2 px-3 py-2">
                  <Switch
                    id="dtm-show-standard"
                    checked={showStandardPhaseContent}
                    onCheckedChange={setShowStandardPhaseContent}
                  />
                  <Label htmlFor="dtm-show-standard" className="cursor-pointer text-xs font-medium leading-snug sm:text-sm">
                    Show standard phase rows
                  </Label>
                </div>
              ) : null}
            </div>

            {workflowPhases.length === 0 ? (
              <div className="flex min-h-[12rem] flex-1 items-center justify-center rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No workflow phases are loaded for this project. Open Process Map or Workflow editor so phases load, then open Decision Tree again.
              </div>
            ) : visiblePhases.length === 0 ? (
              <div className="flex min-h-[12rem] flex-1 items-center justify-center rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                All phases are standard foundation rows and are hidden. Turn on <span className="font-medium text-foreground">Show standard phase rows</span> to view them.
              </div>
            ) : (
            <div className="rounded-lg border">
              <Table
                wrapperClassName="min-w-0 overflow-x-auto"
                className="table-fixed w-full min-w-[640px] text-xs sm:text-sm [&_td]:p-2 [&_th]:h-9 [&_th]:px-2 [&_th]:py-1.5"
              >
            <TableHeader className="sticky top-0 z-[1] bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
              <TableRow>
                <TableHead className="w-[36%] min-w-0 font-semibold">Item</TableHead>
                <TableHead className="w-[32%] min-w-0 font-semibold">Flow Type</TableHead>
                <TableHead className="w-[32%] min-w-0 font-semibold">Prerequisites</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiblePhases.map((phase) => (
                <React.Fragment key={phase.id}>
                  {/* Phase Row */}
                  <TableRow className="bg-muted/50">
                    <TableCell className="min-w-0 font-semibold align-top">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePhase(phase.id)}
                          className="h-6 w-6 p-0"
                        >
                          {expandedPhases.has(phase.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                        <span className="min-w-0 break-words">{phase.name}</span>
                        {phase.isLinked ? (
                          <Badge variant="secondary" className="shrink-0 text-[10px] sm:text-xs">
                            Incorporated
                          </Badge>
                        ) : phase.isStandard ? (
                          <Badge variant="secondary" className="shrink-0 text-[10px] sm:text-xs">
                            Standard
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-0 align-top">
                      {renderFlowTypeControls(
                        phase.id,
                        phase.name,
                        workflowPhases.map((p) => ({ id: p.id, label: p.name })),
                        canEditDecisionSettings(phase.id)
                      )}
                    </TableCell>
                    <TableCell className="min-w-0 align-top">
                      {renderPredecessorControls(
                        phase.id,
                        workflowPhases.map((p) => ({ id: p.id, label: p.name })),
                        canEditDecisionSettings(phase.id)
                      )}
                    </TableCell>
                  </TableRow>

                  {/* Operations under this phase */}
                  {expandedPhases.has(phase.id) && phase.operations.map((operation) => (
                    <React.Fragment key={operation.id}>
                      <TableRow className="bg-muted/20">
                        <TableCell className="min-w-0 align-top">
                          <div className="flex min-w-0 items-center gap-1.5 pl-4 sm:pl-8">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleOperation(operation.id)}
                              className="h-6 w-6 p-0"
                            >
                              {expandedOperations.has(operation.id) ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </Button>
                            <span className="min-w-0 break-words font-medium">{operation.name}</span>
                            {phase.isLinked ? (
                              <Badge variant="secondary" className="shrink-0 text-[10px] sm:text-xs">
                                Incorporated
                              </Badge>
                            ) : operation.isStandard ? (
                              <Badge variant="secondary" className="shrink-0 text-[10px] sm:text-xs">
                                Standard
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-0 align-top">
                          {renderFlowTypeControls(
                            operation.id,
                            operation.name,
                            allOperations.map((op) => ({
                              id: op.id,
                              label: `${op.phaseName} > ${op.name}`,
                            })),
                            canEditDecisionSettings(operation.id),
                            phase.isLinked ? { allowBlocked: true } : undefined
                          )}
                        </TableCell>
                        <TableCell className="min-w-0 align-top">
                          {renderPredecessorControls(
                            operation.id,
                            allOperations
                              .filter((op) => op.phaseName === phase.name)
                              .map((op) => ({ id: op.id, label: op.name })),
                            canEditDecisionSettings(operation.id)
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Steps under this operation */}
                      {expandedOperations.has(operation.id) && operation.steps.map((step) => (
                        <TableRow key={step.id}>
                          <TableCell className="min-w-0 align-top">
                            <div className="flex min-w-0 flex-wrap items-center gap-1.5 pl-8 sm:pl-16">
                              <span className="break-words text-xs sm:text-sm">{step.step}</span>
                              {phase.isLinked ? (
                                <Badge variant="secondary" className="shrink-0 text-[10px] sm:text-xs">
                                  Incorporated
                                </Badge>
                              ) : step.isStandard ? (
                                <Badge variant="secondary" className="shrink-0 text-[10px] sm:text-xs">
                                  Standard
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="min-w-0 align-top">
                            {renderFlowTypeControls(
                              step.id,
                              step.step,
                              operation.steps.map((s) => ({
                                id: s.id,
                                label: s.step,
                              })),
                              canEditDecisionSettings(step.id)
                            )}
                          </TableCell>
                          <TableCell className="min-w-0 align-top">
                            {renderPredecessorControls(
                              step.id,
                              operation.steps.map((s) => ({ id: s.id, label: s.step })),
                              canEditDecisionSettings(step.id)
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
            </div>
            )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </TooltipProvider>
            </div>
          </TabsContent>

          <TabsContent
            value="flowchart"
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 data-[state=inactive]:hidden sm:px-6 sm:pb-6"
          >
            <div className="mb-2 flex shrink-0 flex-wrap items-center gap-3 sm:mb-4 sm:gap-4">
              <Label className="font-semibold">View Level:</Label>
              <RadioGroup 
                value={flowchartLevel} 
                onValueChange={(v) => setFlowchartLevel(v as 'phase' | 'operation' | 'step')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="phase" id="phase" />
                  <Label htmlFor="phase" className="cursor-pointer">Phase Level</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="operation" id="operation" />
                  <Label htmlFor="operation" className="cursor-pointer">Operation Level</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="step" id="step" />
                  <Label htmlFor="step" className="cursor-pointer">Step Level</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-muted/20">
              <ReactFlow
                className="h-full min-h-[200px]"
                nodes={nodes}
                edges={edges}
                fitView
                attributionPosition="bottom-right"
              >
                <Background />
                <Controls />
                <MiniMap />
              </ReactFlow>
            </div>

            <div className="mt-2 grid shrink-0 grid-cols-2 gap-2 rounded-lg bg-muted/30 p-2 sm:mt-4 sm:grid-cols-3 sm:gap-4 sm:p-4 lg:grid-cols-5">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-gray-400 bg-gray-100"></div>
                <span className="text-sm">Standard Flow</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-amber-500 bg-amber-100"></div>
                <span className="text-sm">If-Necessary</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-blue-500 bg-blue-100"></div>
                <span className="text-sm">Alternate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-purple-500 bg-purple-100"></div>
                <span className="text-sm">Dependent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-stone-600 bg-stone-200"></div>
                <span className="text-sm">Blocked (incorporated phase)</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
