import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useProject } from '@/contexts/ProjectContext';
import { WorkflowStep, Material, Tool, Output, Phase, Operation } from '@/interfaces/Project';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Copy, Trash2, Edit, Check, X, GripVertical, FileOutput, Wrench, Package } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OutputEditForm } from './OutputEditForm';
import { addStandardPhasesToProjectRun } from '@/utils/projectUtils';

interface DragDropAdminViewProps {
  onBack: () => void;
}

export const DragDropAdminView: React.FC<DragDropAdminViewProps> = ({ onBack }) => {
  const { currentProject, updateProject } = useProject();
  const [editingItem, setEditingItem] = useState<{ type: 'phase' | 'operation' | 'step'; id: string; data: any } | null>(null);
  const [showOutputEdit, setShowOutputEdit] = useState<{ stepId: string; output?: Output } | null>(null);
  const [showToolsMaterialsEdit, setShowToolsMaterialsEdit] = useState<{ stepId: string; type: 'tools' | 'materials' } | null>(null);

  if (!currentProject) {
    return <div>No project selected</div>;
  }

  // Get processed phases including standard phases (kickoff, planning, ordering)
  const displayPhases = addStandardPhasesToProjectRun(currentProject.phases || []);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !currentProject) return;

    const { source, destination, type } = result;
    
    if (source.index === destination.index && source.droppableId === destination.droppableId) {
      return;
    }

    const updatedProject = { ...currentProject };
    
    if (type === 'phases') {
      // Only allow reordering of non-standard phases (after index 2: kickoff, planning, ordering)
      const standardPhaseCount = 3;
      if (source.index >= standardPhaseCount && destination.index >= standardPhaseCount) {
        const newPhases = Array.from(updatedProject.phases);
        const sourcePhaseIndex = source.index - standardPhaseCount;
        const destPhaseIndex = destination.index - standardPhaseCount;
        const [reorderedPhase] = newPhases.splice(sourcePhaseIndex, 1);
        newPhases.splice(destPhaseIndex, 0, reorderedPhase);
        updatedProject.phases = newPhases;
        toast.success('Phase reordered successfully');
      } else {
        toast.warning('Standard phases (Kickoff, Planning, Ordering) cannot be reordered');
        return;
      }
    } else if (type === 'operations') {
      const phaseId = source.droppableId.replace('operations-', '');
      const phase = updatedProject.phases.find(p => p.id === phaseId);
      if (phase) {
        const newOps = Array.from(phase.operations);
        const [reorderedOp] = newOps.splice(source.index, 1);
        newOps.splice(destination.index, 0, reorderedOp);
        phase.operations = newOps;
      }
    } else if (type === 'steps') {
      const [phaseId, operationId] = source.droppableId.replace('steps-', '').split('-');
      const phase = updatedProject.phases.find(p => p.id === phaseId);
      const operation = phase?.operations.find(o => o.id === operationId);
      if (operation) {
        const newSteps = Array.from(operation.steps);
        const [reorderedStep] = newSteps.splice(source.index, 1);
        newSteps.splice(destination.index, 0, reorderedStep);
        operation.steps = newSteps;
      }
    }

    updatedProject.updatedAt = new Date();
    updateProject(updatedProject);
  };

  const addPhase = () => {
    const newPhase: Phase = {
      id: `phase-${Date.now()}`,
      name: 'New Phase',
      description: '',
      operations: []
    };
    
    const updatedProject = {
      ...currentProject,
      phases: [...currentProject.phases, newPhase],
      updatedAt: new Date()
    };
    
    updateProject(updatedProject);
  };

  const addOperation = (phaseId: string) => {
    const newOperation: Operation = {
      id: `operation-${Date.now()}`,
      name: 'New Operation',
      description: '',
      steps: []
    };
    
    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.map(phase => 
        phase.id === phaseId 
          ? { ...phase, operations: [...phase.operations, newOperation] }
          : phase
      ),
      updatedAt: new Date()
    };
    
    updateProject(updatedProject);
  };

  const addStep = (phaseId: string, operationId: string) => {
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      step: 'New Step',
      description: '',
      contentType: 'text',
      content: '',
      materials: [],
      tools: [],
      outputs: []
    };
    
    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.map(phase => 
        phase.id === phaseId 
          ? {
              ...phase,
              operations: phase.operations.map(operation =>
                operation.id === operationId
                  ? { ...operation, steps: [...operation.steps, newStep] }
                  : operation
              )
            }
          : phase
      ),
      updatedAt: new Date()
    };
    
    updateProject(updatedProject);
  };

  const copyItem = (type: 'operation' | 'step', sourceId: string, targetPhaseId?: string, targetOperationId?: string) => {
    if (!currentProject) return;

    if (type === 'operation') {
      // Find the operation to copy
      let operationToCopy: Operation | undefined;
      for (const phase of currentProject.phases) {
        operationToCopy = phase.operations.find(op => op.id === sourceId);
        if (operationToCopy) break;
      }

      if (!operationToCopy || !targetPhaseId) return;

      const copiedOperation: Operation = {
        ...operationToCopy,
        id: `operation-${Date.now()}`,
        name: `${operationToCopy.name} (Copy)`,
        steps: operationToCopy.steps.map(step => ({
          ...step,
          id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }))
      };

      const updatedProject = {
        ...currentProject,
        phases: currentProject.phases.map(phase => 
          phase.id === targetPhaseId 
            ? { ...phase, operations: [...phase.operations, copiedOperation] }
            : phase
        ),
        updatedAt: new Date()
      };

      updateProject(updatedProject);
      toast.success('Operation copied successfully');
    } else if (type === 'step') {
      // Find the step to copy
      let stepToCopy: WorkflowStep | undefined;
      for (const phase of currentProject.phases) {
        for (const operation of phase.operations) {
          stepToCopy = operation.steps.find(step => step.id === sourceId);
          if (stepToCopy) break;
        }
        if (stepToCopy) break;
      }

      if (!stepToCopy || !targetPhaseId || !targetOperationId) return;

      const copiedStep: WorkflowStep = {
        ...stepToCopy,
        id: `step-${Date.now()}`,
        step: `${stepToCopy.step} (Copy)`
      };

      const updatedProject = {
        ...currentProject,
        phases: currentProject.phases.map(phase => 
          phase.id === targetPhaseId 
            ? {
                ...phase,
                operations: phase.operations.map(operation =>
                  operation.id === targetOperationId
                    ? { ...operation, steps: [...operation.steps, copiedStep] }
                    : operation
                )
              }
            : phase
        ),
        updatedAt: new Date()
      };

      updateProject(updatedProject);
      toast.success('Step copied successfully');
    }
  };

  const deleteItem = (type: 'phase' | 'operation' | 'step', id: string, phaseId?: string, operationId?: string) => {
    if (!currentProject) return;

    // Check if trying to delete a standard phase
    const standardPhaseIds = ['kickoff-phase', 'planning-phase', 'ordering-phase'];
    if (type === 'phase' && standardPhaseIds.includes(id)) {
      toast.warning('Standard phases (Kickoff, Planning, Ordering) cannot be deleted');
      return;
    }

    let updatedProject = { ...currentProject };

    if (type === 'phase') {
      updatedProject.phases = updatedProject.phases.filter(phase => phase.id !== id);
    } else if (type === 'operation' && phaseId) {
      updatedProject.phases = updatedProject.phases.map(phase => 
        phase.id === phaseId 
          ? { ...phase, operations: phase.operations.filter(op => op.id !== id) }
          : phase
      );
    } else if (type === 'step' && phaseId && operationId) {
      updatedProject.phases = updatedProject.phases.map(phase => 
        phase.id === phaseId 
          ? {
              ...phase,
              operations: phase.operations.map(operation =>
                operation.id === operationId
                  ? { ...operation, steps: operation.steps.filter(step => step.id !== id) }
                  : operation
              )
            }
          : phase
      );
    }

    updatedProject.updatedAt = new Date();
    updateProject(updatedProject);
  };

  const updateItem = (type: 'phase' | 'operation' | 'step', id: string, updates: any, phaseId?: string, operationId?: string) => {
    if (!currentProject) return;

    let updatedProject = { ...currentProject };

    if (type === 'phase') {
      updatedProject.phases = updatedProject.phases.map(phase => 
        phase.id === id ? { ...phase, ...updates } : phase
      );
    } else if (type === 'operation' && phaseId) {
      updatedProject.phases = updatedProject.phases.map(phase => 
        phase.id === phaseId 
          ? {
              ...phase,
              operations: phase.operations.map(op => 
                op.id === id ? { ...op, ...updates } : op
              )
            }
          : phase
      );
    } else if (type === 'step' && phaseId && operationId) {
      updatedProject.phases = updatedProject.phases.map(phase => 
        phase.id === phaseId 
          ? {
              ...phase,
              operations: phase.operations.map(operation =>
                operation.id === operationId
                  ? {
                      ...operation,
                      steps: operation.steps.map(step =>
                        step.id === id ? { ...step, ...updates } : step
                      )
                    }
                  : operation
              )
            }
          : phase
      );
    }

    updatedProject.updatedAt = new Date();
    updateProject(updatedProject);
    setEditingItem(null);
  };

  const addOutput = (stepId: string, phaseId: string, operationId: string) => {
    const newOutput: Output = {
      id: `output-${Date.now()}`,
      name: 'New Output',
      description: '',
      type: 'none'
    };

    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.map(phase =>
        phase.id === phaseId
          ? {
              ...phase,
              operations: phase.operations.map(operation =>
                operation.id === operationId
                  ? {
                      ...operation,
                      steps: operation.steps.map(step =>
                        step.id === stepId
                          ? { ...step, outputs: [...(step.outputs || []), newOutput] }
                          : step
                      )
                    }
                  : operation
              )
            }
          : phase
      ),
      updatedAt: new Date()
    };

    updateProject(updatedProject);
    setShowOutputEdit({ stepId, output: newOutput });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button onClick={onBack} variant="ghost">← Back to Admin</Button>
          <h2 className="text-2xl font-bold mt-2">Drag & Drop Workflow Editor</h2>
        </div>
        <Button onClick={addPhase}>
          <Plus className="w-4 h-4 mr-2" />
          Add Phase
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="phases" type="phases">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
              {displayPhases.map((phase, phaseIndex) => {
                const isStandardPhase = phaseIndex < 3; // First 3 are standard phases
                return (
                <Draggable key={phase.id} draggableId={phase.id} index={phaseIndex}>
                  {(provided) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="border-2"
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                            </div>
                            {editingItem?.type === 'phase' && editingItem.id === phase.id ? (
                              <div className="flex-1 space-y-2">
                                <Input
                                  value={editingItem.data.name}
                                  onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, name: e.target.value } })}
                                />
                                <Textarea
                                  value={editingItem.data.description}
                                  onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, description: e.target.value } })}
                                />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => updateItem('phase', phase.id, editingItem.data)}>
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingItem(null)}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                          <div className="flex-1">
                            <CardTitle className="flex items-center gap-2">
                              <Badge variant={isStandardPhase ? "default" : "outline"}>
                                Phase {phaseIndex + 1}
                              </Badge>
                              {phase.name}
                              {isStandardPhase && <Badge variant="secondary" className="text-xs">Standard</Badge>}
                            </CardTitle>
                            {phase.description && <p className="text-sm text-muted-foreground">{phase.description}</p>}
                          </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => addOperation(phase.id)}>
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingItem({ type: 'phase', id: phase.id, data: { ...phase } })} disabled={isStandardPhase}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteItem('phase', phase.id)} disabled={isStandardPhase}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Droppable droppableId={`operations-${phase.id}`} type="operations">
                          {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                              {phase.operations.map((operation, operationIndex) => (
                                <Draggable key={operation.id} draggableId={operation.id} index={operationIndex}>
                                  {(provided) => (
                                    <Card
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className="ml-4 border"
                                    >
                                      <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <div {...provided.dragHandleProps}>
                                              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                                            </div>
                                            {editingItem?.type === 'operation' && editingItem.id === operation.id ? (
                                              <div className="flex-1 space-y-2">
                                                <Input
                                                  value={editingItem.data.name}
                                                  onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, name: e.target.value } })}
                                                />
                                                <Textarea
                                                  value={editingItem.data.description}
                                                  onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, description: e.target.value } })}
                                                />
                                                <div className="flex gap-2">
                                                  <Button size="sm" onClick={() => updateItem('operation', operation.id, editingItem.data, phase.id)}>
                                                    <Check className="w-4 h-4" />
                                                  </Button>
                                                  <Button size="sm" variant="outline" onClick={() => setEditingItem(null)}>
                                                    <X className="w-4 h-4" />
                                                  </Button>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="flex-1">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                  <Badge variant="secondary">Op {operationIndex + 1}</Badge>
                                                  {operation.name}
                                                </CardTitle>
                                                {operation.description && <p className="text-sm text-muted-foreground">{operation.description}</p>}
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex gap-1">
                                            <Button size="sm" onClick={() => addStep(phase.id, operation.id)}>
                                              <Plus className="w-4 h-4" />
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => copyItem('operation', operation.id, phase.id)}>
                                              <Copy className="w-4 h-4" />
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => setEditingItem({ type: 'operation', id: operation.id, data: { ...operation } })}>
                                              <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => deleteItem('operation', operation.id, phase.id)}>
                                              <Trash2 className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      </CardHeader>
                                      <CardContent>
                                        <Droppable droppableId={`steps-${phase.id}-${operation.id}`} type="steps">
                                          {(provided) => (
                                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                                              {operation.steps.map((step, stepIndex) => (
                                                <Draggable key={step.id} draggableId={step.id} index={stepIndex}>
                                                  {(provided) => (
                                                    <div
                                                      ref={provided.innerRef}
                                                      {...provided.draggableProps}
                                                      className="ml-4 p-3 border rounded-lg bg-muted/20"
                                                    >
                                                      <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                          <div {...provided.dragHandleProps}>
                                                            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                                                          </div>
                                                          {editingItem?.type === 'step' && editingItem.id === step.id ? (
                                                            <div className="flex-1 space-y-2">
                                                              <Input
                                                                value={editingItem.data.step}
                                                                onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, step: e.target.value } })}
                                                              />
                                                              <Textarea
                                                                value={editingItem.data.description}
                                                                onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, description: e.target.value } })}
                                                              />
                                                              <div className="flex gap-2">
                                                                <Button size="sm" onClick={() => updateItem('step', step.id, editingItem.data, phase.id, operation.id)}>
                                                                  <Check className="w-4 h-4" />
                                                                </Button>
                                                                <Button size="sm" variant="outline" onClick={() => setEditingItem(null)}>
                                                                  <X className="w-4 h-4" />
                                                                </Button>
                                                              </div>
                                                            </div>
                                                          ) : (
                                                            <div className="flex-1">
                                                              <div className="font-medium flex items-center gap-2">
                                                                <Badge variant="outline">Step {stepIndex + 1}</Badge>
                                                                {step.step}
                                                              </div>
                                                              {step.description && <div className="text-sm text-muted-foreground">{step.description}</div>}
                                                            </div>
                                                          )}
                                                        </div>
                                                        <div className="flex gap-1">
                                                          <Button 
                                                            size="sm" 
                                                            variant="ghost"
                                                            onClick={() => addOutput(step.id, phase.id, operation.id)}
                                                            title="Add Output"
                                                          >
                                                            <FileOutput className="w-4 h-4" />
                                                          </Button>
                                                          <Button 
                                                            size="sm" 
                                                            variant="ghost"
                                                            onClick={() => setShowToolsMaterialsEdit({ stepId: step.id, type: 'tools' })}
                                                            title="Edit Tools"
                                                          >
                                                            <Wrench className="w-4 h-4" />
                                                          </Button>
                                                          <Button 
                                                            size="sm" 
                                                            variant="ghost"
                                                            onClick={() => setShowToolsMaterialsEdit({ stepId: step.id, type: 'materials' })}
                                                            title="Edit Materials"
                                                          >
                                                            <Package className="w-4 h-4" />
                                                          </Button>
                                                          <Button size="sm" variant="ghost" onClick={() => copyItem('step', step.id, phase.id, operation.id)}>
                                                            <Copy className="w-4 h-4" />
                                                          </Button>
                                                          <Button size="sm" variant="ghost" onClick={() => setEditingItem({ type: 'step', id: step.id, data: { ...step } })}>
                                                            <Edit className="w-4 h-4" />
                                                          </Button>
                                                          <Button size="sm" variant="ghost" onClick={() => deleteItem('step', step.id, phase.id, operation.id)}>
                                                            <Trash2 className="w-4 h-4" />
                                                          </Button>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  )}
                                                </Draggable>
                                              ))}
                                              {provided.placeholder}
                                            </div>
                                          )}
                                        </Droppable>
                                      </CardContent>
                                    </Card>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </CardContent>
                    </Card>
                  )}
                </Draggable>
              );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Output Edit Dialog */}
      {showOutputEdit && (
        <OutputEditForm
          output={showOutputEdit.output || { id: `output-${Date.now()}`, name: 'New Output', description: '', type: 'none' }}
          isOpen={true}
          onClose={() => setShowOutputEdit(null)}
          onSave={(output) => {
            // Update the output in the project
            const updatedProject = { ...currentProject };
            for (const phase of updatedProject.phases) {
              for (const operation of phase.operations) {
                for (const step of operation.steps) {
                  if (step.id === showOutputEdit.stepId) {
                    const outputIndex = step.outputs?.findIndex(o => o.id === output.id);
                    if (outputIndex !== undefined && outputIndex !== -1) {
                      step.outputs[outputIndex] = output;
                    } else {
                      step.outputs = [...(step.outputs || []), output];
                    }
                  }
                }
              }
            }
            updatedProject.updatedAt = new Date();
            updateProject(updatedProject);
          }}
        />
      )}

      {/* Tools/Materials Edit Dialog */}
      {showToolsMaterialsEdit && (
        <Dialog open={true} onOpenChange={() => setShowToolsMaterialsEdit(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit {showToolsMaterialsEdit.type === 'tools' ? 'Tools' : 'Materials'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {showToolsMaterialsEdit.type === 'tools' ? 'Tools' : 'Materials'} editing functionality will be implemented here.
              </p>
              <Button onClick={() => setShowToolsMaterialsEdit(null)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};