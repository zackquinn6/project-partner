import React, { useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { WorkflowStep, Material, Tool, Output, Phase, Operation } from '@/interfaces/Project';
import { ProjectSelector } from '@/components/ProjectSelector';
import ProjectRollup from '@/components/ProjectRollup';
import EditWorkflowView from '@/components/EditWorkflowView';
import EditableUserView from '@/components/EditableUserView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Plus, Check, X, ChevronRight, ChevronDown, Package, Wrench, FileOutput } from 'lucide-react';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface EditingState {
  type: 'phase' | 'operation' | 'step' | null;
  id: string | null;
  data: any;
}

interface TableRow {
  type: 'phase' | 'operation' | 'step';
  id: string;
  data: Phase | Operation | WorkflowStep;
  parentId?: string;
  level: number;
}

interface ProjectManagementWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProjectManagementWindow: React.FC<ProjectManagementWindowProps> = ({ open, onOpenChange }) => {
  const {
    currentProject,
    updateProject,
    projects
  } = useProject();
  
  const [currentView, setCurrentView] = useState<'table' | 'editWorkflow'>('table');
  const [editing, setEditing] = useState<EditingState>({
    type: null,
    id: null,
    data: null
  });
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [expandedOperations, setExpandedOperations] = useState<Set<string>>(new Set());

  const updateProjectData = (updatedProject: typeof currentProject) => {
    if (updatedProject) {
      updateProject({
        ...updatedProject,
        updatedAt: new Date()
      });
    }
  };

  // Build flat table structure from hierarchical data
  const buildTableRows = (): TableRow[] => {
    if (!currentProject) return [];
    const rows: TableRow[] = [];
    currentProject.phases.forEach(phase => {
      rows.push({
        type: 'phase',
        id: phase.id,
        data: phase,
        level: 0
      });

      if (expandedPhases.has(phase.id)) {
        phase.operations.forEach(operation => {
          rows.push({
            type: 'operation',
            id: operation.id,
            data: operation,
            parentId: phase.id,
            level: 1
          });

          if (expandedOperations.has(operation.id)) {
            operation.steps.forEach(step => {
              rows.push({
                type: 'step',
                id: step.id,
                data: step,
                parentId: operation.id,
                level: 2
              });
            });
          }
        });
      }
    });
    return rows;
  };

  const togglePhaseExpansion = (phaseId: string) => {
    setExpandedPhases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phaseId)) {
        newSet.delete(phaseId);
        const phase = currentProject?.phases.find(p => p.id === phaseId);
        phase?.operations.forEach(op => {
          setExpandedOperations(prev => {
            const newOpSet = new Set(prev);
            newOpSet.delete(op.id);
            return newOpSet;
          });
        });
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

  // Add functions
  const addPhase = () => {
    if (!currentProject) return;
    const newPhase: Phase = {
      id: Date.now().toString(),
      name: 'New Phase',
      description: '',
      operations: []
    };
    const updatedProject = {
      ...currentProject,
      phases: [...currentProject.phases, newPhase]
    };
    updateProjectData(updatedProject);
    setEditing({
      type: 'phase',
      id: newPhase.id,
      data: { ...newPhase }
    });
    setExpandedPhases(prev => new Set([...prev, newPhase.id]));
    toast.success('Phase added');
  };

  const addOperation = (phaseId: string) => {
    if (!currentProject) return;
    const newOperation: Operation = {
      id: Date.now().toString(),
      name: 'New Operation',
      description: '',
      steps: []
    };
    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.map(phase => phase.id === phaseId ? {
        ...phase,
        operations: [...phase.operations, newOperation]
      } : phase)
    };
    updateProjectData(updatedProject);
    setEditing({
      type: 'operation',
      id: newOperation.id,
      data: { ...newOperation }
    });
    setExpandedPhases(prev => new Set([...prev, phaseId]));
    setExpandedOperations(prev => new Set([...prev, newOperation.id]));
    toast.success('Operation added');
  };

  const addStep = (phaseId: string, operationId: string) => {
    if (!currentProject) return;
    const newStep: WorkflowStep = {
      id: Date.now().toString(),
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
      phases: currentProject.phases.map(phase => phase.id === phaseId ? {
        ...phase,
        operations: phase.operations.map(op => op.id === operationId ? {
          ...op,
          steps: [...op.steps, newStep]
        } : op)
      } : phase)
    };
    updateProjectData(updatedProject);
    setEditing({
      type: 'step',
      id: newStep.id,
      data: { ...newStep }
    });
    setExpandedPhases(prev => new Set([...prev, phaseId]));
    setExpandedOperations(prev => new Set([...prev, operationId]));
    toast.success('Step added');
  };

  // Update functions
  const updateItem = (type: string, id: string, updates: any) => {
    if (!currentProject) return;
    let updatedProject = { ...currentProject };
    
    if (type === 'phase') {
      updatedProject.phases = updatedProject.phases.map(phase => 
        phase.id === id ? { ...phase, ...updates } : phase
      );
    } else if (type === 'operation') {
      updatedProject.phases = updatedProject.phases.map(phase => ({
        ...phase,
        operations: phase.operations.map(op => 
          op.id === id ? { ...op, ...updates } : op
        )
      }));
    } else if (type === 'step') {
      updatedProject.phases = updatedProject.phases.map(phase => ({
        ...phase,
        operations: phase.operations.map(op => ({
          ...op,
          steps: op.steps.map(step => 
            step.id === id ? { ...step, ...updates } : step
          )
        }))
      }));
    }
    updateProjectData(updatedProject);
  };

  // Delete functions
  const deleteItem = (type: string, id: string) => {
    if (!currentProject) return;
    let updatedProject = { ...currentProject };
    
    if (type === 'phase') {
      updatedProject.phases = updatedProject.phases.filter(phase => phase.id !== id);
    } else if (type === 'operation') {
      updatedProject.phases = updatedProject.phases.map(phase => ({
        ...phase,
        operations: phase.operations.filter(op => op.id !== id)
      }));
    } else if (type === 'step') {
      updatedProject.phases = updatedProject.phases.map(phase => ({
        ...phase,
        operations: phase.operations.map(op => ({
          ...op,
          steps: op.steps.filter(step => step.id !== id)
        }))
      }));
    }
    updateProjectData(updatedProject);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted`);
  };

  const startEdit = (type: EditingState['type'], id: string, data: any) => {
    setEditing({ type, id, data: { ...data } });
  };

  const saveEdit = () => {
    if (!editing.type || !editing.id || !editing.data) return;
    updateItem(editing.type, editing.id, editing.data);
    setEditing({ type: null, id: null, data: null });
    toast.success('Changes saved');
  };

  const cancelEdit = () => {
    setEditing({ type: null, id: null, data: null });
  };

  const getIndentStyle = (level: number) => ({
    paddingLeft: `${level * 24}px`
  });

  const renderRowContent = (row: TableRow) => {
    const isEditing = editing.type === row.type && editing.id === row.id;
    const data = row.data as any;
    const nameField = row.type === 'step' ? 'step' : 'name';
    
    switch (row.type) {
      case 'phase':
        const phase = data as Phase;
        const isPhaseExpanded = expandedPhases.has(phase.id);
        return (
          <>
            <TableCell style={getIndentStyle(row.level)}>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => togglePhaseExpansion(phase.id)} className="p-1 h-6 w-6">
                  {isPhaseExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
                {isEditing ? (
                  <Input 
                    value={editing.data.name} 
                    onChange={e => setEditing(prev => ({
                      ...prev,
                      data: { ...prev.data, name: e.target.value }
                    }))} 
                    className="font-bold" 
                  />
                ) : (
                  <span className="font-bold text-lg text-primary">{phase.name}</span>
                )}
              </div>
            </TableCell>
            <TableCell>
              {isEditing ? (
                <Textarea 
                  value={editing.data.description} 
                  onChange={e => setEditing(prev => ({
                    ...prev,
                    data: { ...prev.data, description: e.target.value }
                  }))} 
                />
              ) : (
                <span className="text-sm text-muted-foreground">{phase.description || 'No description'}</span>
              )}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                {isEditing ? (
                  <>
                    <Button size="sm" onClick={saveEdit}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => addOperation(phase.id)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => startEdit('phase', phase.id, phase)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteItem('phase', phase.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </TableCell>
          </>
        );
      case 'operation':
        const operation = data as Operation;
        const isOperationExpanded = expandedOperations.has(operation.id);
        return (
          <>
            <TableCell style={getIndentStyle(row.level)}>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => toggleOperationExpansion(operation.id)} className="p-1 h-6 w-6">
                  {isOperationExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
                {isEditing ? (
                  <Input 
                    value={editing.data.name} 
                    onChange={e => setEditing(prev => ({
                      ...prev,
                      data: { ...prev.data, name: e.target.value }
                    }))} 
                    className="font-medium" 
                  />
                ) : (
                  <span className="font-medium text-blue-600">{operation.name}</span>
                )}
              </div>
            </TableCell>
            <TableCell>
              {isEditing ? (
                <Textarea 
                  value={editing.data.description} 
                  onChange={e => setEditing(prev => ({
                    ...prev,
                    data: { ...prev.data, description: e.target.value }
                  }))} 
                />
              ) : (
                <span className="text-sm text-muted-foreground">{operation.description || 'No description'}</span>
              )}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                {isEditing ? (
                  <>
                    <Button size="sm" onClick={saveEdit}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => addStep(row.parentId!, operation.id)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => startEdit('operation', operation.id, operation)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteItem('operation', operation.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </TableCell>
          </>
        );
      case 'step':
        const step = data as WorkflowStep;
        return (
          <>
            <TableCell style={getIndentStyle(row.level)}>
              <div className="flex items-center gap-2">
                <div className="w-6" />
                {isEditing ? (
                  <Input 
                    value={editing.data.step} 
                    onChange={e => setEditing(prev => ({
                      ...prev,
                      data: { ...prev.data, step: e.target.value }
                    }))} 
                  />
                ) : (
                  <span>{step.step}</span>
                )}
              </div>
            </TableCell>
            <TableCell>
              {isEditing ? (
                <Textarea 
                  value={editing.data.description} 
                  onChange={e => setEditing(prev => ({
                    ...prev,
                    data: { ...prev.data, description: e.target.value }
                  }))} 
                />
              ) : (
                <span className="text-sm text-muted-foreground">{step.description || 'No description'}</span>
              )}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                {isEditing ? (
                  <>
                    <Button size="sm" onClick={saveEdit}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => startEdit('step', step.id, step)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteItem('step', step.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </TableCell>
          </>
        );
      default:
        return null;
    }
  };

  if (!currentProject) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Project Management</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <Card>
              <CardHeader>
                <CardTitle>Select a Project</CardTitle>
                <CardDescription>Choose a project to manage its workflow, materials, and tools</CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectSelector isAdminMode={true} />
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'editWorkflow':
        return <EditWorkflowView onBackToAdmin={() => setCurrentView('table')} />;
      default:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Project Management</h2>
              <div className="flex gap-2">
                <Button onClick={() => {
                  onOpenChange(false);
                  // Navigate to edit workflow in full screen
                  window.dispatchEvent(new CustomEvent('navigate-to-edit-workflow'));
                }}>
                  Edit Workflow
                </Button>
              </div>
            </div>
            
            
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Project Structure</CardTitle>
                  <CardDescription>Manage phases, operations, and steps</CardDescription>
                </div>
                <Button onClick={addPhase}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Phase
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[150px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {buildTableRows().map((row) => (
                      <TableRow key={`${row.type}-${row.id}`}>
                        {renderRowContent(row)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            
            <ProjectRollup />
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Project Management</DialogTitle>
        </DialogHeader>
        <div className="p-6">
          {renderView()}
        </div>
      </DialogContent>
    </Dialog>
  );
};