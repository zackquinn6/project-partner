import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { ChevronRight, ChevronDown, Plus, X, ChevronsDownUp, ChevronsUpDown, GitBranch, List } from 'lucide-react';
import { Project, Phase, Operation, WorkflowStep } from '@/interfaces/Project';
import { useProject } from '@/contexts/ProjectContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
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
}

interface FlowTypeConfig {
  type: 'if-necessary' | 'alternate' | 'dependent' | null;
  decisionPrompt?: string;
  alternateIds?: string[]; // IDs of alternate operations/steps
  predecessorIds?: string[]; // IDs of prerequisite operations
  dependentOn?: string; // ID of the if-necessary operation this depends on
}

export const DecisionTreeManager: React.FC<DecisionTreeManagerProps> = ({
  open,
  onOpenChange,
  currentProject
}) => {
  const { updateProject } = useProject();
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [expandedOperations, setExpandedOperations] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'table' | 'flowchart'>('table');
  const [flowchartLevel, setFlowchartLevel] = useState<'phase' | 'operation' | 'step'>('operation');
  
  // Store flow type configurations by ID (phase/operation/step)
  const [flowConfigs, setFlowConfigs] = useState<Record<string, FlowTypeConfig>>({});
  
  // Store which item is currently showing alternate selector
  const [showAlternateSelector, setShowAlternateSelector] = useState<string | null>(null);

  // Load existing flow configurations from database when component opens
  useEffect(() => {
    if (open && currentProject) {
      loadFlowConfigs();
    }
  }, [open, currentProject.id]);

  const loadFlowConfigs = async () => {
    try {
      // CRITICAL: Decision tree data is scoped to specific project revisions
      // Each revision has its own template_operations with unique flow configurations
      // When a revision is deleted, its template_operations and decision tree data are CASCADE deleted
      console.log('🔍 Loading decision tree config for project:', currentProject.id, 'Name:', currentProject.name);
      
      // Load flow configurations from phase_operations
      // Note: flow_type is available, but user_prompt, alternate_group, and dependent_on may not exist
      const { data: operations, error } = await supabase
        .from('phase_operations')
        .select('id, flow_type')
        .in('phase_id', 
          (await supabase
            .from('project_phases')
            .select('id')
            .eq('project_id', currentProject.id)
          ).data?.map(p => p.id) || []
        );

      if (error) throw error;

      console.log('📊 Loaded operations:', operations?.length, 'for project', currentProject.id);

      const configs: Record<string, FlowTypeConfig> = {};
      
      // Build a map of alternate_group to operation IDs
      const alternateGroups = new Map<string, string[]>();
      operations?.forEach(op => {
        if (op.alternate_group) {
          const existing = alternateGroups.get(op.alternate_group) || [];
          alternateGroups.set(op.alternate_group, [...existing, op.id]);
        }
      });
      
      operations?.forEach(op => {
        if (op.flow_type) {
          // Get all operations in the same alternate group (excluding self)
          const alternateIds = op.alternate_group 
            ? (alternateGroups.get(op.alternate_group) || []).filter(id => id !== op.id)
            : undefined;
            
          configs[op.id] = {
            type: op.flow_type as 'if-necessary' | 'alternate' | 'dependent',
            decisionPrompt: op.user_prompt || undefined,
            alternateIds,
            dependentOn: op.dependent_on || undefined,
            predecessorIds: []
          };
        }
      });

      setFlowConfigs(configs);
    } catch (error) {
      console.error('Error loading flow configs:', error);
      toast.error('Failed to load decision tree configuration');
    }
  };

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phaseId)) {
        newSet.delete(phaseId);
        // Also collapse all operations in this phase
        currentProject.phases.find(p => p.id === phaseId)?.operations.forEach(op => {
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
    setExpandedPhases(new Set(currentProject.phases.map(p => p.id)));
    const allOps = currentProject.phases.flatMap(p => p.operations.map(o => o.id));
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
    
    toast.success('Alternate relationship added');
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
    
    toast.success('Alternate relationship removed');
  };

  const getAllOperations = () => {
    return currentProject.phases.flatMap(phase => 
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
    for (const phase of currentProject.phases) {
      for (const operation of phase.operations) {
        const step = operation.steps.find(s => s.id === itemId);
        if (step) return step.step;
      }
    }
    
    // Try to find as phase
    const phase = currentProject.phases.find(p => p.id === itemId);
    if (phase) return phase.name;
    
    return itemId;
  };

  const renderFlowTypeControls = (
    itemId: string, 
    itemName: string,
    availableAlternates: Array<{ id: string; label: string }>
  ) => {
    const config = flowConfigs[itemId] || { type: null };

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Select 
            value={config.type || 'none'} 
            onValueChange={(value) => {
              if (value === 'none') {
                updateFlowConfig(itemId, { type: null, decisionPrompt: undefined, alternateIds: [] });
              } else {
                updateFlowConfig(itemId, { type: value as 'if-necessary' | 'alternate' });
              }
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select flow type" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-[100]">
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="if-necessary">If-Necessary</SelectItem>
              <SelectItem value="alternate">Alternate</SelectItem>
              <SelectItem value="dependent">Dependent</SelectItem>
            </SelectContent>
          </Select>

          {config.type === 'alternate' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAlternateSelector(itemId)}
            >
              <Plus className="w-3 h-3 mr-1" />
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
              <SelectContent className="bg-popover max-h-[300px] z-[100]">
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

        {config.type && (
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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

  const renderPredecessorControls = (itemId: string, availableOps: Array<{ id: string; label: string }>) => {
    const config = flowConfigs[itemId] || { predecessorIds: [] };

    return (
      <div className="space-y-2">
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
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Add predecessor" />
          </SelectTrigger>
          <SelectContent className="bg-popover max-h-[300px] z-[100]">
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

  const handleSave = async () => {
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
        // Check if this is an operation (exists in template_operations)
        const isOperation = currentProject.phases.some(phase => 
          phase.operations.some(op => op.id === itemId)
        );
        
        if (isOperation) {
          // Get the alternate group ID if this operation is part of an alternate group
          const alternateGroupId = alternateGroupMap.get(itemId) || null;
          
          // Update template_operations with flow_type, user_prompt, alternate_group, dependent_on
          const { error } = await supabase
            .from('template_operations')
            .update({
              flow_type: config.type || null,
              user_prompt: config.decisionPrompt || null,
              alternate_group: alternateGroupId,
              dependent_on: config.type === 'dependent' ? config.dependentOn : null,
              updated_at: new Date().toISOString()
            })
            .eq('id', itemId);
          
          if (error) {
            console.error('Error updating operation:', itemId, error);
            errorCount++;
          }
        }
      }
      
      if (errorCount > 0) {
        toast.error(`Failed to save ${errorCount} operation(s)`);
      } else {
        console.log('✅ Successfully saved decision tree configurations');
        toast.success('Decision tree saved successfully');
        
        // The trigger_rebuild_phases_json trigger will automatically rebuild the phases JSON
        // Wait a moment for the trigger to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error saving decision tree:', error);
      toast.error('Failed to save decision tree configuration');
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
      currentProject.phases.forEach((phase, index) => {
        const config = flowConfigs[phase.id];
        const nodeType = config?.type === 'if-necessary' ? 'if-necessary' : 
                        config?.type === 'alternate' ? 'alternate' : 
                        config?.type === 'dependent' ? 'dependent' : 'default';
        
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
            background: config?.type === 'if-necessary' ? '#fef3c7' : 
                       config?.type === 'alternate' ? '#dbeafe' : 
                       config?.type === 'dependent' ? '#f3e8ff' : '#f3f4f6',
            border: '2px solid',
            borderColor: config?.type === 'if-necessary' ? '#f59e0b' : 
                        config?.type === 'alternate' ? '#3b82f6' : 
                        config?.type === 'dependent' ? '#a855f7' : '#9ca3af',
            borderRadius: '8px',
            padding: '10px',
            width: 180,
          },
        });

        // Add edges to next phase
        if (index < currentProject.phases.length - 1) {
          edges.push({
            id: `${phase.id}-${currentProject.phases[index + 1].id}`,
            source: phase.id,
            target: currentProject.phases[index + 1].id,
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
            const altPhase = currentProject.phases.find(p => p.id === altId);
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
      currentProject.phases.forEach((phase) => {
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
      currentProject.phases.forEach((phase) => {
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
  }, [currentProject, flowConfigs, flowchartLevel]);

  const { nodes, edges } = useMemo(() => generateFlowchart(), [generateFlowchart]);

  if (!currentProject) return null;

  const allOperations = getAllOperations();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] !max-w-[90vw] md:!max-w-[90vw] h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Decision Tree Manager - {currentProject.name}</DialogTitle>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'table' | 'flowchart')} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mb-4 shrink-0 h-10 bg-muted">
            <TabsTrigger 
              value="table" 
              className="flex items-center gap-2 h-9"
            >
              <List className="w-4 h-4" />
              Table View
            </TabsTrigger>
            <TabsTrigger 
              value="flowchart" 
              className="flex items-center gap-2 h-9"
            >
              <GitBranch className="w-4 h-4" />
              Flowchart
            </TabsTrigger>
          </TabsList>

          <TabsContent value="table" className="flex-1 flex flex-col min-h-0 px-6 pb-6 mt-0 data-[state=inactive]:hidden">
            <div className="flex gap-2 mb-4 shrink-0">
              <Button size="sm" variant="outline" onClick={expandAll}>
                <ChevronsUpDown className="w-4 h-4 mr-2" />
                Expand All
              </Button>
              <Button size="sm" variant="outline" onClick={collapseAll}>
                <ChevronsDownUp className="w-4 h-4 mr-2" />
                Collapse All
              </Button>
            </div>
            
            <div className="flex-1 overflow-auto border rounded-lg min-h-0">
              <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Item</TableHead>
                <TableHead className="w-[200px]">Flow Type</TableHead>
                <TableHead className="w-[200px]">Prerequisites</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentProject.phases.map(phase => (
                <React.Fragment key={phase.id}>
                  {/* Phase Row */}
                  <TableRow className="bg-muted/50">
                    <TableCell className="font-semibold">
                      <div className="flex items-center gap-2">
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
                        <span>{phase.name}</span>
                        <Badge variant="outline" className="text-xs">Phase</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {renderFlowTypeControls(
                        phase.id, 
                        phase.name,
                        currentProject.phases.map(p => ({ id: p.id, label: p.name }))
                      )}
                    </TableCell>
                    <TableCell>
                      {renderPredecessorControls(
                        phase.id,
                        currentProject.phases.map(p => ({ id: p.id, label: p.name }))
                      )}
                    </TableCell>
                  </TableRow>

                  {/* Operations under this phase */}
                  {expandedPhases.has(phase.id) && phase.operations.map(operation => (
                    <React.Fragment key={operation.id}>
                      <TableRow className="bg-muted/20">
                        <TableCell>
                          <div className="flex items-center gap-2 pl-8">
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
                            <span className="font-medium">{operation.name}</span>
                            <Badge variant="secondary" className="text-xs">Operation</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {renderFlowTypeControls(
                            operation.id,
                            operation.name,
                            allOperations.map(op => ({ 
                              id: op.id, 
                              label: `${op.phaseName} > ${op.name}` 
                            }))
                          )}
                        </TableCell>
                        <TableCell>
                          {renderPredecessorControls(
                            operation.id,
                            allOperations
                              .filter(op => op.phaseName === phase.name)
                              .map(op => ({ id: op.id, label: op.name }))
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Steps under this operation */}
                      {expandedOperations.has(operation.id) && operation.steps.map(step => (
                        <TableRow key={step.id}>
                          <TableCell>
                            <div className="flex items-center gap-2 pl-16">
                              <span className="text-sm">{step.step}</span>
                              <Badge variant="outline" className="text-xs">Step</Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {renderFlowTypeControls(
                              step.id,
                              step.step,
                              operation.steps.map(s => ({ 
                                id: s.id, 
                                label: s.step 
                              }))
                            )}
                          </TableCell>
                          <TableCell>
                            {renderPredecessorControls(
                              step.id,
                              operation.steps.map(s => ({ id: s.id, label: s.step }))
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
          </TabsContent>

          <TabsContent value="flowchart" className="flex-1 flex flex-col min-h-0 px-6 pb-6 mt-0 data-[state=inactive]:hidden">
            <div className="mb-4 flex items-center gap-4">
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

            <div className="flex-1 border rounded-lg overflow-hidden bg-muted/20">
              <ReactFlow
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

            <div className="mt-4 grid grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
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
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
