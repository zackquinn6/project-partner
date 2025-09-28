import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useProject } from '@/contexts/ProjectContext';
import { WorkflowStep, Material, Tool, Output, Phase, Operation } from '@/interfaces/Project';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Copy, Trash2, Edit, Check, X, GripVertical, FileOutput, Wrench, Package, Clipboard, ClipboardCheck, Save, ChevronDown, ChevronRight } from 'lucide-react';
import { FlowTypeSelector, getFlowTypeBadge } from './FlowTypeSelector';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { OutputEditForm } from './OutputEditForm';
import { MultiContentEditor } from './MultiContentEditor';
import { MultiContentRenderer } from './MultiContentRenderer';
import { DecisionTreeFlowchart } from './DecisionTreeFlowchart';
import { DecisionPointEditor } from './DecisionPointEditor';
import { addStandardPhasesToProjectRun } from '@/utils/projectUtils';
interface StructureManagerProps {
  onBack: () => void;
}
interface ClipboardData {
  type: 'phase' | 'operation' | 'step';
  data: Phase | Operation | WorkflowStep;
}
export const StructureManager: React.FC<StructureManagerProps> = ({
  onBack
}) => {
  const {
    currentProject,
    updateProject
  } = useProject();
  const [editingItem, setEditingItem] = useState<{
    type: 'phase' | 'operation' | 'step';
    id: string;
    data: any;
  } | null>(null);
  const [showOutputEdit, setShowOutputEdit] = useState<{
    stepId: string;
    output?: Output;
  } | null>(null);
  const [showToolsMaterialsEdit, setShowToolsMaterialsEdit] = useState<{
    stepId: string;
    type: 'tools' | 'materials';
  } | null>(null);
  const [showStepContentEdit, setShowStepContentEdit] = useState<{
    stepId: string;
    step: WorkflowStep;
  } | null>(null);
  const [showDecisionTreeView, setShowDecisionTreeView] = useState(false);
  const [showDecisionEditor, setShowDecisionEditor] = useState<{
    step: WorkflowStep;
  } | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);

  // Collapsible state
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [expandedOperations, setExpandedOperations] = useState<Set<string>>(new Set());
  if (!currentProject) {
    return <div>No project selected</div>;
  }

  // Get phases directly from project and ensure no duplicates
  const deduplicatePhases = (phases: Phase[]): Phase[] => {
    const seen = new Set<string>();
    const result: Phase[] = [];
    for (const phase of phases) {
      if (!seen.has(phase.name)) {
        seen.add(phase.name);
        result.push(phase);
      }
    }
    return result;
  };
  const displayPhases = deduplicatePhases(currentProject?.phases || []);

  // Toggle functions for collapsible sections
  const togglePhaseExpansion = (phaseId: string) => {
    setExpandedPhases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phaseId)) {
        newSet.delete(phaseId);
      } else {
        newSet.add(phaseId);
      }
      return newSet;
    });
  };
  const toggleOperationExpansion = (operationId: string) => {
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

  // Initialize all phases and operations as collapsed by default
  // No useEffect needed - they start collapsed with empty Sets

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !currentProject) return;
    const {
      source,
      destination,
      type
    } = result;
    if (source.index === destination.index && source.droppableId === destination.droppableId) {
      return;
    }
    const updatedProject = {
      ...currentProject
    };
    if (type === 'phases') {
      // Only allow reordering of non-standard phases (after index 2: kickoff, planning, ordering)
      const standardPhaseCount = 3;
      if (source.index >= standardPhaseCount && destination.index >= standardPhaseCount) {
        const newPhases = Array.from(updatedProject.phases);
        const sourceIndex = source.index - standardPhaseCount;
        const destIndex = destination.index - standardPhaseCount;
        const [removed] = newPhases.splice(sourceIndex, 1);
        newPhases.splice(destIndex, 0, removed);
        updatedProject.phases = newPhases;
        updateProject(updatedProject);
        toast.success('Phase reordered successfully');
      }
    } else if (type === 'operations') {
      const phaseId = source.droppableId.split('-')[1];
      const phase = displayPhases.find(p => p.id === phaseId);
      const standardPhaseNames = ['Kickoff', 'Planning', 'Ordering', 'Close Project'];
      const isStandardPhase = standardPhaseNames.includes(phase?.name || '');
      if (isStandardPhase) {
        toast.error('Cannot reorder operations in standard phases');
        return;
      }
      const phaseIndex = currentProject.phases.findIndex(p => p.id === phaseId);
      if (phaseIndex !== -1) {
        const operations = Array.from(currentProject.phases[phaseIndex].operations);
        const [removed] = operations.splice(source.index, 1);
        operations.splice(destination.index, 0, removed);
        updatedProject.phases[phaseIndex].operations = operations;
        updateProject(updatedProject);
        toast.success('Operation reordered successfully');
      }
    } else if (type === 'steps') {
      const [phaseId, operationId] = source.droppableId.split('-').slice(1);
      const phase = displayPhases.find(p => p.id === phaseId);
      const standardPhaseNames = ['Kickoff', 'Planning', 'Ordering', 'Close Project'];
      const isStandardPhase = standardPhaseNames.includes(phase?.name || '');
      if (isStandardPhase) {
        toast.error('Cannot reorder steps in standard phases');
        return;
      }
      const phaseIndex = currentProject.phases.findIndex(p => p.id === phaseId);
      if (phaseIndex !== -1) {
        const operationIndex = currentProject.phases[phaseIndex].operations.findIndex(o => o.id === operationId);
        if (operationIndex !== -1) {
          const steps = Array.from(currentProject.phases[phaseIndex].operations[operationIndex].steps);
          const [removed] = steps.splice(source.index, 1);
          steps.splice(destination.index, 0, removed);
          updatedProject.phases[phaseIndex].operations[operationIndex].steps = steps;
          updateProject(updatedProject);
          toast.success('Step reordered successfully');
        }
      }
    }
  };

  // Copy/Paste functionality
  const copyItem = (type: 'phase' | 'operation' | 'step', data: Phase | Operation | WorkflowStep) => {
    setClipboard({
      type,
      data: JSON.parse(JSON.stringify(data))
    });
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} copied to clipboard`);
  };
  const pasteItem = (targetType: 'phase' | 'operation' | 'step', targetLocation?: {
    phaseId?: string;
    operationId?: string;
  }) => {
    if (!clipboard || !currentProject) return;
    const updatedProject = {
      ...currentProject
    };
    const newId = `${clipboard.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    if (clipboard.type === 'phase' && targetType === 'phase') {
      const newPhase = {
        ...(clipboard.data as Phase),
        id: newId,
        name: `${(clipboard.data as Phase).name} (Copy)`
      };
      updatedProject.phases.push(newPhase);
    } else if (clipboard.type === 'operation' && targetType === 'operation' && targetLocation?.phaseId) {
      const phaseIndex = updatedProject.phases.findIndex(p => p.id === targetLocation.phaseId);
      if (phaseIndex !== -1) {
        const newOperation = {
          ...(clipboard.data as Operation),
          id: newId,
          name: `${(clipboard.data as Operation).name} (Copy)`
        };
        updatedProject.phases[phaseIndex].operations.push(newOperation);
      }
    } else if (clipboard.type === 'step' && targetType === 'step' && targetLocation?.phaseId && targetLocation?.operationId) {
      const phaseIndex = updatedProject.phases.findIndex(p => p.id === targetLocation.phaseId);
      if (phaseIndex !== -1) {
        const operationIndex = updatedProject.phases[phaseIndex].operations.findIndex(o => o.id === targetLocation.operationId);
        if (operationIndex !== -1) {
          const newStep = {
            ...(clipboard.data as WorkflowStep),
            id: newId,
            step: `${(clipboard.data as WorkflowStep).step} (Copy)`
          };
          updatedProject.phases[phaseIndex].operations[operationIndex].steps.push(newStep);
        }
      }
    }
    updateProject(updatedProject);
    toast.success('Item pasted successfully');
  };

  // CRUD operations
  const addPhase = () => {
    if (!currentProject) return;
    const newPhase: Phase = {
      id: `phase-${Date.now()}`,
      name: 'New Phase',
      description: 'Phase description',
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
    if (!currentProject) return;

    // Check if this is a standard phase
    const phase = displayPhases.find(p => p.id === phaseId);
    const standardPhaseNames = ['Kickoff', 'Planning', 'Ordering', 'Close Project'];
    const isStandardPhase = standardPhaseNames.includes(phase?.name || '');
    if (isStandardPhase) {
      toast.error('Cannot add operations to standard phases. Operations are predefined for standard phases.');
      return;
    }
    const newOperation: Operation = {
      id: `operation-${Date.now()}`,
      name: 'New Operation',
      description: 'Operation description',
      steps: []
    };
    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.map(phase => phase.id === phaseId ? {
        ...phase,
        operations: [...phase.operations, newOperation]
      } : phase),
      updatedAt: new Date()
    };
    updateProject(updatedProject);
    toast.success('Operation added successfully');
  };
  const addStep = (phaseId: string, operationId: string) => {
    if (!currentProject) return;
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      step: 'New Step',
      description: 'Step description',
      contentType: 'text',
      content: '',
      materials: [],
      tools: [],
      outputs: [],
      contentSections: [],
      flowType: 'prime'
    };
    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.map(phase => phase.id === phaseId ? {
        ...phase,
        operations: phase.operations.map(operation => operation.id === operationId ? {
          ...operation,
          steps: [...operation.steps, newStep]
        } : operation)
      } : phase),
      updatedAt: new Date()
    };
    updateProject(updatedProject);
  };

  // Delete operations
  const deletePhase = (phaseId: string) => {
    if (!currentProject) return;

    // Check if this is a standard phase
    const phase = displayPhases.find(p => p.id === phaseId);
    const standardPhaseNames = ['Kickoff', 'Planning', 'Ordering', 'Close Project'];
    const isStandardPhase = standardPhaseNames.includes(phase?.name || '');
    if (isStandardPhase) {
      toast.error('Cannot delete standard phases (Kickoff, Planning, Ordering, Close Project)');
      return;
    }
    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.filter(phase => phase.id !== phaseId),
      updatedAt: new Date()
    };
    updateProject(updatedProject);
    toast.success('Phase deleted');
  };
  const deleteOperation = (phaseId: string, operationId: string) => {
    if (!currentProject) return;
    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.map(phase => phase.id === phaseId ? {
        ...phase,
        operations: phase.operations.filter(op => op.id !== operationId)
      } : phase),
      updatedAt: new Date()
    };
    updateProject(updatedProject);
    toast.success('Operation deleted');
  };
  const deleteStep = (phaseId: string, operationId: string, stepId: string) => {
    if (!currentProject) return;
    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.map(phase => phase.id === phaseId ? {
        ...phase,
        operations: phase.operations.map(operation => operation.id === operationId ? {
          ...operation,
          steps: operation.steps.filter(step => step.id !== stepId)
        } : operation)
      } : phase),
      updatedAt: new Date()
    };
    updateProject(updatedProject);
    toast.success('Step deleted');
  };

  // Edit operations
  const startEdit = (type: 'phase' | 'operation' | 'step', id: string, data: any) => {
    setEditingItem({
      type,
      id,
      data: {
        ...data
      }
    });
  };
  const saveEdit = () => {
    if (!editingItem || !currentProject) return;
    const updatedProject = {
      ...currentProject
    };
    if (editingItem.type === 'phase') {
      const phaseIndex = updatedProject.phases.findIndex(p => p.id === editingItem.id);
      if (phaseIndex !== -1) {
        updatedProject.phases[phaseIndex] = {
          ...updatedProject.phases[phaseIndex],
          ...editingItem.data
        };
      }
    } else if (editingItem.type === 'operation') {
      for (const phase of updatedProject.phases) {
        const operationIndex = phase.operations.findIndex(o => o.id === editingItem.id);
        if (operationIndex !== -1) {
          phase.operations[operationIndex] = {
            ...phase.operations[operationIndex],
            ...editingItem.data
          };
          break;
        }
      }
    } else if (editingItem.type === 'step') {
      for (const phase of updatedProject.phases) {
        for (const operation of phase.operations) {
          const stepIndex = operation.steps.findIndex(s => s.id === editingItem.id);
          if (stepIndex !== -1) {
            operation.steps[stepIndex] = {
              ...operation.steps[stepIndex],
              ...editingItem.data
            };
            break;
          }
        }
      }
    }
    updatedProject.updatedAt = new Date();
    updateProject(updatedProject);
    setEditingItem(null);
    toast.success(`${editingItem.type.charAt(0).toUpperCase() + editingItem.type.slice(1)} updated`);
  };

  // Get all available steps for decision point linking
  const getAllAvailableSteps = () => {
    const steps: {
      id: string;
      name: string;
      phaseId: string;
      operationId: string;
    }[] = [];
    displayPhases.forEach(phase => {
      phase.operations.forEach(operation => {
        operation.steps.forEach(step => {
          steps.push({
            id: step.id,
            name: step.step,
            phaseId: phase.id,
            operationId: operation.id
          });
        });
      });
    });
    return steps;
  };
  const handleDecisionEditorSave = (updatedStep: WorkflowStep) => {
    if (!currentProject) return;
    const updatedProject = {
      ...currentProject
    };

    // Find and update the step
    for (const phase of updatedProject.phases) {
      for (const operation of phase.operations) {
        const stepIndex = operation.steps.findIndex(s => s.id === updatedStep.id);
        if (stepIndex !== -1) {
          operation.steps[stepIndex] = updatedStep;
          updatedProject.updatedAt = new Date();
          updateProject(updatedProject);
          return;
        }
      }
    }
  };
  if (showDecisionTreeView) {
    return <DecisionTreeFlowchart phases={displayPhases} onBack={() => setShowDecisionTreeView(false)} onUpdatePhases={updatedPhases => {
      if (currentProject) {
        // Filter out standard phases and update only user phases
        const userPhases = updatedPhases.slice(3);
        const updatedProject = {
          ...currentProject,
          phases: userPhases,
          updatedAt: new Date()
        };
        updateProject(updatedProject);
      }
    }} />;
  }
  return <div className="fixed inset-0 bg-background overflow-hidden">
      <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-2 py-1">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold">Structure Manager</h2>
              <p className="text-muted-foreground text-xs">Drag and drop to reorder, copy/paste to duplicate</p>
            </div>
            <div className="flex items-center gap-1">
              {clipboard && <Badge variant="outline" className="flex items-center gap-1">
                  <ClipboardCheck className="w-3 h-3" />
                  {clipboard.type} copied
                </Badge>}
               <Button variant="outline" onClick={() => setShowDecisionTreeView(true)} className="flex items-center gap-2">
                 🔀 Decision Tree
               </Button>
               <Button variant="outline" onClick={() => setExpandedPhases(expandedPhases.size === displayPhases.length ? new Set() : new Set(displayPhases.map(p => p.id)))} className="flex items-center gap-2">
                 {expandedPhases.size === displayPhases.length ? <>
                     <ChevronRight className="w-4 h-4" />
                     Collapse All
                   </> : <>
                     <ChevronDown className="w-4 h-4" />
                     Expand All
                   </>}
               </Button>
              <Button onClick={addPhase} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Phase
              </Button>
              <Button onClick={onBack} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Done Editing
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="container mx-auto px-2 py-2">
          <Droppable droppableId="phases" type="phases">
            {provided => <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1">
                {displayPhases.map((phase, phaseIndex) => {
                const standardPhaseNames = ['Kickoff', 'Planning', 'Ordering', 'Close Project'];
                const isStandardPhase = standardPhaseNames.includes(phase.name);
                const isEditing = editingItem?.type === 'phase' && editingItem.id === phase.id;
                return <Draggable key={phase.id} draggableId={phase.id} index={phaseIndex} isDragDisabled={isStandardPhase}>
                      {(provided, snapshot) => <Card ref={provided.innerRef} {...provided.draggableProps} className={`border-2 ${snapshot.isDragging ? 'shadow-lg' : ''} ${isStandardPhase ? 'bg-blue-50 border-blue-200' : ''}`}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 flex-1">
                                {!isStandardPhase && phase.name !== 'Close Project' && <div {...provided.dragHandleProps}>
                                    <GripVertical className="w-3 h-3 text-muted-foreground cursor-grab" />
                                  </div>}
                                {(isStandardPhase || phase.name === 'Close Project') && <div className="w-3" />}
                                
                                 {isEditing ? <div className="flex-1 space-y-1">
                                     <Input value={editingItem.data.name} onChange={e => setEditingItem({
                               ...editingItem,
                               data: {
                                 ...editingItem.data,
                                 name: e.target.value
                               }
                             })} placeholder="Phase name" className="text-xs h-6" />
                                     <Textarea value={editingItem.data.description} onChange={e => setEditingItem({
                               ...editingItem,
                               data: {
                                 ...editingItem.data,
                                 description: e.target.value
                               }
                             })} placeholder="Phase description" rows={1} className="text-xs" />
                                  </div> : <div className="flex-1">
                                      <CardTitle className="flex items-center gap-1 text-sm">
                                        <Button variant="ghost" size="sm" onClick={() => togglePhaseExpansion(phase.id)} className="p-0 h-4 w-4">
                                          {expandedPhases.has(phase.id) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                        </Button>
                                        {phase.name}
                                        {isStandardPhase}
                                      </CardTitle>
                                     <p className="text-muted-foreground text-xs">{phase.description}</p>
                                   </div>}
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="text-xs h-4">{phase.operations.length} operations</Badge>
                                
                                {!isStandardPhase && phase.name !== 'Close Project' && <>
                                    <Button size="sm" variant="ghost" onClick={() => copyItem('phase', phase)} className="h-6 w-6 p-0">
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                    
                                    {clipboard?.type === 'phase' && <Button size="sm" variant="ghost" onClick={() => pasteItem('phase')} className="h-6 w-6 p-0">
                                        <Clipboard className="w-3 h-3" />
                                      </Button>}
                                    
                                    {isEditing ? <>
                                        <Button size="sm" onClick={saveEdit} className="h-6 w-6 p-0">
                                          <Check className="w-3 h-3" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)} className="h-6 w-6 p-0">
                                          <X className="w-3 h-3" />
                                        </Button>
                                      </> : <>
                                        <Button size="sm" variant="ghost" onClick={() => startEdit('phase', phase.id, phase)} className="h-6 w-6 p-0">
                                          <Edit className="w-3 h-3" />
                                        </Button>
                                        
                                        <Button size="sm" variant="ghost" onClick={() => deletePhase(phase.id)} className="h-6 w-6 p-0">
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </>}
                                  </>}
                                
                              </div>
                            </div>
                           </CardHeader>
                           
                           <Collapsible open={expandedPhases.has(phase.id)}>
                             <CollapsibleContent>
                                <CardContent className="py-2">
                              <div className="flex items-center gap-1 mb-2">
                                 <Button onClick={() => addOperation(phase.id)} className="flex items-center gap-1 text-xs h-6">
                                   <Plus className="w-2 h-2" />
                                   Add Operation
                                 </Button>
                              </div>
                            
                            <Droppable droppableId={`operations-${phase.id}`} type="operations">
                              {provided => <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1">
                                  {phase.operations.map((operation, operationIndex) => {
                                const isOperationEditing = editingItem?.type === 'operation' && editingItem.id === operation.id;
                                return <Draggable key={operation.id} draggableId={operation.id} index={operationIndex} isDragDisabled={isStandardPhase || phase.name === 'Close Project'}>
                                        {(provided, snapshot) => <Card ref={provided.innerRef} {...provided.draggableProps} className={`ml-6 ${snapshot.isDragging ? 'shadow-lg' : ''} ${isStandardPhase ? 'bg-muted/20' : ''}`}>
                                            <CardHeader className="pb-3">
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 flex-1">
                                                  {!isStandardPhase && phase.name !== 'Close Project' && <div {...provided.dragHandleProps}>
                                                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                                                    </div>}
                                                  
                                                  {isOperationEditing ? <div className="flex-1 space-y-2">
                                                      <Input value={editingItem.data.name} onChange={e => setEditingItem({
                                              ...editingItem,
                                              data: {
                                                ...editingItem.data,
                                                name: e.target.value
                                              }
                                            })} placeholder="Operation name" className="text-sm" />
                                                      <Textarea value={editingItem.data.description} onChange={e => setEditingItem({
                                              ...editingItem,
                                              data: {
                                                ...editingItem.data,
                                                description: e.target.value
                                              }
                                            })} placeholder="Operation description" rows={1} className="text-sm" />
                                                    </div> : <div className="flex-1">
                                                       <h4 className="font-medium text-xs flex items-center gap-1">
                                                         <Button variant="ghost" size="sm" onClick={() => toggleOperationExpansion(operation.id)} className="p-0 h-3 w-3">
                                                           {expandedOperations.has(operation.id) ? <ChevronDown className="w-2 h-2" /> : <ChevronRight className="w-2 h-2" />}
                                                         </Button>
                                                         {operation.name}
                                                       </h4>
                                                       <p className="text-muted-foreground text-xs">{operation.description}</p>
                                                     </div>}
                                                </div>
                                                
                                                <div className="flex items-center gap-1">
                                                  <Badge variant="outline" className="text-xs h-4">{operation.steps.length} steps</Badge>
                                                  
                                                  {!isStandardPhase && phase.name !== 'Close Project' && <>
                                                      <Button size="sm" variant="ghost" onClick={() => copyItem('operation', operation)} className="h-5 w-5 p-0">
                                                        <Copy className="w-2 h-2" />
                                                      </Button>
                                                      
                                                      {clipboard?.type === 'operation' && <Button size="sm" variant="ghost" onClick={() => pasteItem('operation', {
                                              phaseId: phase.id
                                            })} className="h-5 w-5 p-0">
                                                          <Clipboard className="w-2 h-2" />
                                                        </Button>}
                                                      
                                                      {isOperationEditing ? <>
                                                          <Button size="sm" onClick={saveEdit} className="h-5 w-5 p-0">
                                                            <Check className="w-2 h-2" />
                                                          </Button>
                                                          <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)} className="h-5 w-5 p-0">
                                                            <X className="w-2 h-2" />
                                                          </Button>
                                                        </> : <>
                                                          <Button size="sm" variant="ghost" onClick={() => startEdit('operation', operation.id, operation)} className="h-5 w-5 p-0">
                                                            <Edit className="w-2 h-2" />
                                                          </Button>
                                                          {phase.name !== 'Close Project' && <Button size="sm" variant="ghost" onClick={() => deleteOperation(phase.id, operation.id)} className="h-5 w-5 p-0">
                                                              <Trash2 className="w-2 h-2" />
                                                            </Button>}
                                                        </>}
                                                    </>}
                                                </div>
                                              </div>
                                             </CardHeader>
                                             
                                             <Collapsible open={expandedOperations.has(operation.id)}>
                                               <CollapsibleContent>
                                                 <CardContent className="py-1 px-2">
                                               <div className="flex items-center gap-1 mb-1">
                                                 <Button size="sm" variant="outline" onClick={() => addStep(phase.id, operation.id)} className="flex items-center gap-1 text-xs h-5">
                                                   <Plus className="w-2 h-2" />
                                                   Add Step
                                                 </Button>
                                               </div>
                                              
                                              <Droppable droppableId={`steps-${phase.id}-${operation.id}`} type="steps">
                                                {provided => <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1">
                                                    {operation.steps.map((step, stepIndex) => {
                                                const isStepEditing = editingItem?.type === 'step' && editingItem.id === step.id;
                                                return <Draggable key={step.id} draggableId={step.id} index={stepIndex} isDragDisabled={isStandardPhase || phase.name === 'Close Project'}>
                                                          {(provided, snapshot) => <Card ref={provided.innerRef} {...provided.draggableProps} className={`ml-4 ${snapshot.isDragging ? 'shadow-lg' : ''} ${isStandardPhase ? 'bg-muted/10' : ''}`}>
                                                              <CardContent className="p-3">
                                                                <div className="flex items-center justify-between">
                                                                  <div className="flex items-center gap-1 flex-1">
                                                                     {!isStandardPhase && phase.name !== 'Close Project' && <div {...provided.dragHandleProps}>
                                                                         <GripVertical className="w-2 h-2 text-muted-foreground cursor-grab" />
                                                                       </div>}
                                                                     
                                                                      {isStepEditing ? <div className="flex-1 space-y-1">
                                                                          <Input value={editingItem.data.step} onChange={e => setEditingItem({
                                                               ...editingItem,
                                                               data: {
                                                                 ...editingItem.data,
                                                                 step: e.target.value
                                                               }
                                                             })} placeholder="Step name" className="text-xs h-4" />
                                                                          <Textarea value={editingItem.data.description} onChange={e => setEditingItem({
                                                               ...editingItem,
                                                               data: {
                                                                 ...editingItem.data,
                                                                 description: e.target.value
                                                               }
                                                             })} placeholder="Step description" rows={1} className="text-xs" />
                                                                          <div className="text-xs">
                                                                           <FlowTypeSelector value={editingItem.data.flowType} onValueChange={value => setEditingItem({
                                                                ...editingItem,
                                                                data: {
                                                                  ...editingItem.data,
                                                                  flowType: value
                                                                }
                                                              })} />
                                                                         </div>
                                                                        </div> : <div className="flex-1">
                                                                          <div className="flex items-center gap-1">
                                                                            <p className="font-medium text-xs">{step.step}</p>
                                                                            {getFlowTypeBadge(step.flowType)}
                                                                          </div>
                                                                          <p className="text-muted-foreground text-xs">{step.description}</p>
                                                                        </div>}
                                                                  </div>
                                                                  
                                                                    <div className="flex items-center gap-1">
                                                                      <div className="flex items-center gap-1">
                                                                        {step.tools?.length > 0 && <Badge variant="outline" className="text-xs h-4 flex items-center gap-1">
                                                                            <Wrench className="w-2 h-2" />
                                                                            {step.tools.length}
                                                                          </Badge>}
                                                                        {step.materials?.length > 0 && <Badge variant="outline" className="text-xs h-4 flex items-center gap-1">
                                                                            <Package className="w-2 h-2" />
                                                                            {step.materials.length}
                                                                          </Badge>}
                                                                        {step.outputs?.length > 0 && <Badge variant="outline" className="text-xs h-4 flex items-center gap-1">
                                                                            <FileOutput className="w-2 h-2" />
                                                                            {step.outputs.length}
                                                                         </Badge>}
                                                                     </div>
                                                     
                                                       {<>
                                                           <Button size="sm" variant="ghost" onClick={() => setShowDecisionEditor({
                                                              step
                                                            })} title="Configure decision point">
                                                             🔀
                                                           </Button>
                                                           <Button size="sm" variant="ghost" onClick={() => setShowStepContentEdit({
                                                              stepId: step.id,
                                                              step
                                                            })}>
                                                             <Edit className="w-3 h-3" />
                                                           </Button>
                                                           
                                                           <Button size="sm" variant="ghost" onClick={() => copyItem('step', step)}>
                                                             <Copy className="w-3 h-3" />
                                                           </Button>
                                                           
                                                           {clipboard?.type === 'step' && <Button size="sm" variant="ghost" onClick={() => pasteItem('step', {
                                                              phaseId: phase.id,
                                                              operationId: operation.id
                                                            })}>
                                                               <Clipboard className="w-3 h-3" />
                                                             </Button>}
                                                           
                                                           {!isStandardPhase && phase.name !== 'Close Project' && <Button size="sm" variant="ghost" onClick={() => deleteStep(phase.id, operation.id, step.id)}>
                                                               <Trash2 className="w-3 h-3" />
                                                             </Button>}
                                                         </>}
                                                                  </div>
                                                                </div>
                                                              </CardContent>
                                                            </Card>}
                                                        </Draggable>;
                                              })}
                                                    {provided.placeholder}
                                                  </div>}
                                               </Droppable>
                                                 </CardContent>
                                               </CollapsibleContent>
                                             </Collapsible>
                                          </Card>}
                                      </Draggable>;
                              })}
                                  {provided.placeholder}
                                </div>}
                             </Droppable>
                               </CardContent>
                             </CollapsibleContent>
                           </Collapsible>
                        </Card>}
                    </Draggable>;
              })}
                {provided.placeholder}
              </div>}
          </Droppable>
        </div>
      </DragDropContext>

      {/* Step Content Edit Dialog */}
      {showStepContentEdit && <Dialog open={!!showStepContentEdit} onOpenChange={() => setShowStepContentEdit(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Edit Step Content: {showStepContentEdit.step.step}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <MultiContentEditor sections={showStepContentEdit.step.contentSections || []} onChange={sections => {
              const updatedProject = {
                ...currentProject
              };

              // Find and update the step
              for (const phase of updatedProject.phases) {
                for (const operation of phase.operations) {
                  const stepIndex = operation.steps.findIndex(s => s.id === showStepContentEdit.stepId);
                  if (stepIndex !== -1) {
                    operation.steps[stepIndex] = {
                      ...operation.steps[stepIndex],
                      contentSections: sections
                    };
                    updateProject(updatedProject);
                    return;
                  }
                }
              }
            }} />
            </div>
          </DialogContent>
        </Dialog>}

      {/* Decision Point Editor Dialog */}
      {showDecisionEditor && <DecisionPointEditor open={!!showDecisionEditor} onOpenChange={() => setShowDecisionEditor(null)} step={showDecisionEditor.step} availableSteps={getAllAvailableSteps()} onSave={handleDecisionEditorSave} />}
    </div>
    </div>;
};