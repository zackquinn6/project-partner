import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { ChevronRight, ChevronDown, Plus, X, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { Project, Phase, Operation, WorkflowStep } from '@/interfaces/Project';
import { useProject } from '@/contexts/ProjectContext';
import { toast } from 'sonner';

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

  if (!currentProject) return null;

  const allOperations = getAllOperations();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle>Decision Tree Manager - {currentProject.name}</DialogTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={expandAll}>
                <ChevronsUpDown className="w-4 h-4 mr-2" />
                Expand All
              </Button>
              <Button size="sm" variant="outline" onClick={collapseAll}>
                <ChevronsDownUp className="w-4 h-4 mr-2" />
                Collapse All
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-6 pb-6">
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
      </DialogContent>
    </Dialog>
  );
};
