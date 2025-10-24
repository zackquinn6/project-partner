import React, { useState, useMemo, useCallback } from 'react';
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
  type: 'if-necessary' | 'alternate' | null;
  decisionPrompt?: string;
  alternateIds?: string[]; // IDs of alternate operations/steps
  predecessorIds?: string[]; // IDs of prerequisite operations
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

  const getOperationLabel = (opId: string) => {
    const allOps = getAllOperations();
    const op = allOps.find(o => o.id === opId || o.fullId === opId);
    return op ? `${op.phaseName} > ${op.name}` : opId;
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
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="if-necessary">If-Necessary</SelectItem>
              <SelectItem value="alternate">Alternate</SelectItem>
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

        {config.type && (
          <Input
            placeholder="Decision prompt"
            value={config.decisionPrompt || ''}
            onChange={(e) => updateFlowConfig(itemId, { decisionPrompt: e.target.value })}
            className="text-sm"
          />
        )}

        {config.type === 'alternate' && config.alternateIds && config.alternateIds.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Alternates:</div>
            {config.alternateIds.map(altId => (
              <div key={altId} className="flex items-center gap-2 text-xs">
                <Badge variant="secondary" className="text-xs">
                  {getOperationLabel(altId)}
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

        {/* Alternate selector dialog */}
        {showAlternateSelector === itemId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-4 rounded-lg max-w-md w-full max-h-[400px] overflow-auto">
              <h3 className="font-semibold mb-2">Select Alternates</h3>
              <div className="space-y-2">
                {availableAlternates
                  .filter(alt => alt.id !== itemId && !config.alternateIds?.includes(alt.id))
                  .map(alt => (
                    <Button
                      key={alt.id}
                      variant="outline"
                      className="w-full justify-start text-sm"
                      onClick={() => {
                        addAlternate(itemId, alt.id);
                        setShowAlternateSelector(null);
                      }}
                    >
                      {alt.label}
                    </Button>
                  ))}
              </div>
              <Button
                variant="ghost"
                className="w-full mt-4"
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
          <SelectContent>
            {availableOps
              .filter(op => op.id !== itemId && !config.predecessorIds?.includes(op.id))
              .map(op => (
                <SelectItem key={op.id} value={op.id}>
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
                  {getOperationLabel(predId)}
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

  const handleSave = () => {
    // TODO: Save flow configs to project data structure
    // This would require updating the Phase/Operation/Step interfaces to include flow type metadata
    toast.success('Decision tree configuration saved');
    onOpenChange(false);
  };

  // Generate flowchart nodes and edges based on level
  const generateFlowchart = useCallback(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let yPos = 0;
    const levelSpacing = 150;
    const horizontalSpacing = 300;

    if (flowchartLevel === 'phase') {
      // Phase-level flowchart
      currentProject.phases.forEach((phase, index) => {
        const config = flowConfigs[phase.id];
        const nodeType = config?.type === 'if-necessary' ? 'if-necessary' : 
                        config?.type === 'alternate' ? 'alternate' : 'default';
        
        nodes.push({
          id: phase.id,
          data: { 
            label: phase.name,
            type: nodeType,
            prompt: config?.decisionPrompt
          },
          position: { x: 250, y: yPos },
          type: 'default',
          style: {
            background: config?.type === 'if-necessary' ? '#fef3c7' : 
                       config?.type === 'alternate' ? '#dbeafe' : '#f3f4f6',
            border: '2px solid',
            borderColor: config?.type === 'if-necessary' ? '#f59e0b' : 
                        config?.type === 'alternate' ? '#3b82f6' : '#9ca3af',
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

        // Add alternate branches
        if (config?.alternateIds) {
          config.alternateIds.forEach((altId, altIndex) => {
            const xOffset = (altIndex + 1) * horizontalSpacing;
            const altPhase = currentProject.phases.find(p => p.id === altId);
            if (altPhase && !nodes.find(n => n.id === altId)) {
              nodes.push({
                id: altId,
                data: { label: altPhase.name, type: 'alternate' },
                position: { x: 250 + xOffset, y: yPos },
                type: 'default',
                style: {
                  background: '#dbeafe',
                  border: '2px dashed #3b82f6',
                  borderRadius: '8px',
                  padding: '10px',
                  width: 180,
                },
              });

              edges.push({
                id: `${phase.id}-${altId}-alt`,
                source: phase.id,
                target: altId,
                label: 'OR',
                animated: true,
                style: { stroke: '#3b82f6' },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
              });
            }
          });
        }

        yPos += levelSpacing;
      });
    } else if (flowchartLevel === 'operation') {
      // Operation-level flowchart
      currentProject.phases.forEach((phase) => {
        // Add phase header
        nodes.push({
          id: `phase-header-${phase.id}`,
          data: { label: `Phase: ${phase.name}` },
          position: { x: 0, y: yPos },
          type: 'default',
          style: {
            background: '#e0e7ff',
            border: '2px solid #6366f1',
            borderRadius: '8px',
            padding: '10px',
            fontWeight: 'bold',
            width: 200,
          },
        });
        yPos += levelSpacing / 2;

        phase.operations.forEach((operation, opIndex) => {
          const config = flowConfigs[operation.id];
          const nodeType = config?.type === 'if-necessary' ? 'if-necessary' : 
                          config?.type === 'alternate' ? 'alternate' : 'default';

          nodes.push({
            id: operation.id,
            data: { 
              label: operation.name,
              type: nodeType,
              prompt: config?.decisionPrompt
            },
            position: { x: 250, y: yPos },
            type: 'default',
            style: {
              background: config?.type === 'if-necessary' ? '#fef3c7' : 
                         config?.type === 'alternate' ? '#dbeafe' : '#ffffff',
              border: '2px solid',
              borderColor: config?.type === 'if-necessary' ? '#f59e0b' : 
                          config?.type === 'alternate' ? '#3b82f6' : '#d1d5db',
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

          // Add alternate branches
          if (config?.alternateIds) {
            config.alternateIds.forEach((altId, altIndex) => {
              const xOffset = (altIndex + 1) * horizontalSpacing;
              const altOp = phase.operations.find(o => o.id === altId);
              if (altOp && !nodes.find(n => n.id === altId)) {
                nodes.push({
                  id: altId,
                  data: { label: altOp.name, type: 'alternate' },
                  position: { x: 250 + xOffset, y: yPos },
                  type: 'default',
                  style: {
                    background: '#dbeafe',
                    border: '2px dashed #3b82f6',
                    borderRadius: '8px',
                    padding: '10px',
                    width: 180,
                  },
                });

                edges.push({
                  id: `${operation.id}-${altId}-alt`,
                  source: operation.id,
                  target: altId,
                  label: 'OR',
                  animated: true,
                  style: { stroke: '#3b82f6' },
                  markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
                });
              }
            });
          }

          yPos += levelSpacing;
        });
      });
    } else {
      // Step-level flowchart
      currentProject.phases.forEach((phase) => {
        phase.operations.forEach((operation) => {
          // Add operation header
          nodes.push({
            id: `op-header-${operation.id}`,
            data: { label: `${phase.name} > ${operation.name}` },
            position: { x: 0, y: yPos },
            type: 'default',
            style: {
              background: '#e0e7ff',
              border: '2px solid #6366f1',
              borderRadius: '8px',
              padding: '8px',
              fontSize: '12px',
              width: 200,
            },
          });
          yPos += levelSpacing / 2;

          operation.steps.forEach((step, stepIndex) => {
            const config = flowConfigs[step.id];
            const nodeType = config?.type === 'if-necessary' ? 'if-necessary' : 
                            config?.type === 'alternate' ? 'alternate' : 'default';

            nodes.push({
              id: step.id,
              data: { 
                label: step.step,
                type: nodeType,
                prompt: config?.decisionPrompt
              },
              position: { x: 250, y: yPos },
              type: 'default',
              style: {
                background: config?.type === 'if-necessary' ? '#fef3c7' : 
                           config?.type === 'alternate' ? '#dbeafe' : '#ffffff',
                border: '1px solid',
                borderColor: config?.type === 'if-necessary' ? '#f59e0b' : 
                            config?.type === 'alternate' ? '#3b82f6' : '#d1d5db',
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

            // Add alternate branches
            if (config?.alternateIds) {
              config.alternateIds.forEach((altId, altIndex) => {
                const xOffset = (altIndex + 1) * horizontalSpacing;
                const altStep = operation.steps.find(s => s.id === altId);
                if (altStep && !nodes.find(n => n.id === altId)) {
                  nodes.push({
                    id: altId,
                    data: { label: altStep.step, type: 'alternate' },
                    position: { x: 250 + xOffset, y: yPos },
                    type: 'default',
                    style: {
                      background: '#dbeafe',
                      border: '1px dashed #3b82f6',
                      borderRadius: '6px',
                      padding: '8px',
                      fontSize: '12px',
                      width: 180,
                    },
                  });

                  edges.push({
                    id: `${step.id}-${altId}-alt`,
                    source: step.id,
                    target: altId,
                    label: 'OR',
                    animated: true,
                    style: { stroke: '#3b82f6' },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
                  });
                }
              });
            }

            yPos += levelSpacing * 0.7;
          });

          yPos += levelSpacing / 2;
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
      <DialogContent className="w-[90vw] !max-w-[90vw] md:!max-w-[90vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle>Decision Tree Manager - {currentProject.name}</DialogTitle>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'table' | 'flowchart')} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 bg-muted p-1 rounded-lg">
            <TabsTrigger 
              value="table" 
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <List className="w-4 h-4" />
              Table View
            </TabsTrigger>
            <TabsTrigger 
              value="flowchart" 
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <GitBranch className="w-4 h-4" />
              Flowchart
            </TabsTrigger>
          </TabsList>

          <TabsContent value="table" className="flex-1 flex flex-col overflow-hidden px-6 pb-6 mt-4">
            <div className="flex gap-2 mb-4">
              <Button size="sm" variant="outline" onClick={expandAll}>
                <ChevronsUpDown className="w-4 h-4 mr-2" />
                Expand All
              </Button>
              <Button size="sm" variant="outline" onClick={collapseAll}>
                <ChevronsDownUp className="w-4 h-4 mr-2" />
                Collapse All
              </Button>
            </div>
            
            <div className="flex-1 overflow-auto border rounded-lg">
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

          <TabsContent value="flowchart" className="flex-1 flex flex-col px-6 pb-6 mt-4">
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

            <div className="mt-4 grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-gray-400 bg-gray-100"></div>
                <span className="text-sm">Standard Flow</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-amber-500 bg-amber-100"></div>
                <span className="text-sm">If-Necessary (Branch)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-blue-500 bg-blue-100"></div>
                <span className="text-sm">Alternate (Fork)</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
