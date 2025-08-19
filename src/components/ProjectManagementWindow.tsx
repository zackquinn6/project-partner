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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [editingProject, setEditingProject] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [expandedOperations, setExpandedOperations] = useState<Set<string>>(new Set());

  const updateProjectData = async (updatedProject: typeof currentProject) => {
    if (updatedProject) {
      console.log('updateProjectData called with project:', updatedProject);
      console.log('Project phases being updated:', updatedProject.phases);
      await updateProject({
        ...updatedProject,
        updatedAt: new Date()
      });
    }
  };

  // Build flat table structure from hierarchical data
  const buildTableRows = (): TableRow[] => {
    if (!currentProject || !Array.isArray(currentProject.phases)) return [];
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
    
    console.log('Adding phase - current phases:', currentProject.phases);
    
    // Ensure phases is an array and get current phases
    const currentPhases = Array.isArray(currentProject.phases) ? currentProject.phases : [];
    
    const newPhase: Phase = {
      id: Date.now().toString(),
      name: 'New Phase',
      description: '',
      operations: []
    };
    
    console.log('New phase created:', newPhase);
    console.log('Current phases array:', currentPhases);
    
    const updatedPhases = [...currentPhases, newPhase];
    console.log('Updated phases array:', updatedPhases);
    
    const updatedProject = {
      ...currentProject,
      phases: updatedPhases
    };
    
    console.log('Final updated project phases:', updatedProject.phases);
    updateProjectData(updatedProject);
    setEditing({
      type: 'phase',
      id: newPhase.id,
      data: { ...newPhase }
    });
    setExpandedPhases(prev => new Set([...prev, newPhase.id]));
    // Removed duplicate toast - updateProject in context already shows one
  };

  const addOperation = (phaseId: string) => {
    if (!currentProject) return;
    
    // Ensure phases is an array
    const currentPhases = Array.isArray(currentProject.phases) ? currentProject.phases : [];
    
    const newOperation: Operation = {
      id: Date.now().toString(),
      name: 'New Operation',
      description: '',
      steps: []
    };
    const updatedProject = {
      ...currentProject,
      phases: currentPhases.map(phase => phase.id === phaseId ? {
        ...phase,
        operations: [...(phase.operations || []), newOperation]
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
  };

  const addStep = (phaseId: string, operationId: string) => {
    if (!currentProject) return;
    
    // Ensure phases is an array
    const currentPhases = Array.isArray(currentProject.phases) ? currentProject.phases : [];
    
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
      phases: currentPhases.map(phase => phase.id === phaseId ? {
        ...phase,
        operations: (phase.operations || []).map(op => op.id === operationId ? {
          ...op,
          steps: [...(op.steps || []), newStep]
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
  };

  // Update functions
  const updateItem = (type: string, id: string, updates: any) => {
    if (!currentProject) return;
    
    // Ensure phases is an array
    const currentPhases = Array.isArray(currentProject.phases) ? currentProject.phases : [];
    let updatedProject = { ...currentProject };
    
    if (type === 'phase') {
      updatedProject.phases = currentPhases.map(phase => 
        phase.id === id ? { ...phase, ...updates } : phase
      );
    } else if (type === 'operation') {
      updatedProject.phases = currentPhases.map(phase => ({
        ...phase,
        operations: (phase.operations || []).map(op => 
          op.id === id ? { ...op, ...updates } : op
        )
      }));
    } else if (type === 'step') {
      updatedProject.phases = currentPhases.map(phase => ({
        ...phase,
        operations: (phase.operations || []).map(op => ({
          ...op,
          steps: (op.steps || []).map(step => 
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
    
    // Ensure phases is an array
    const currentPhases = Array.isArray(currentProject.phases) ? currentProject.phases : [];
    let updatedProject = { ...currentProject };
    
    if (type === 'phase') {
      updatedProject.phases = currentPhases.filter(phase => phase.id !== id);
    } else if (type === 'operation') {
      updatedProject.phases = currentPhases.map(phase => ({
        ...phase,
        operations: (phase.operations || []).filter(op => op.id !== id)
      }));
    } else if (type === 'step') {
      updatedProject.phases = currentPhases.map(phase => ({
        ...phase,
        operations: (phase.operations || []).map(op => ({
          ...op,
          steps: (op.steps || []).filter(step => step.id !== id)
        }))
      }));
    }
    updateProjectData(updatedProject);
  };

  const startEdit = (type: EditingState['type'], id: string, data: any) => {
    setEditing({ type, id, data: { ...data } });
  };

  const saveEdit = () => {
    if (!editing.type || !editing.id || !editing.data) return;
    updateItem(editing.type, editing.id, editing.data);
    setEditing({ type: null, id: null, data: null });
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

  const renderProjectSelector = () => (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Project Selection & Details</CardTitle>
            <CardDescription>Choose a project to manage and edit its details</CardDescription>
          </div>
          {currentProject && !editingProject && (
            <Button onClick={() => setEditingProject(true)} variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit Project
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ProjectSelector isAdminMode={true} />
        {currentProject && !editingProject && (
          <div className="mt-4 space-y-4 border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Project Name</label>
                <p className="mt-1 text-sm">{currentProject.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Category</label>
                <p className="mt-1 text-sm">{currentProject.category || 'Not set'}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <p className="mt-1 text-sm">{currentProject.description || 'No description'}</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Difficulty</label>
                <p className="mt-1 text-sm">{currentProject.difficulty || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Effort Level</label>
                <p className="mt-1 text-sm">{currentProject.effortLevel || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Estimated Time</label>
                <p className="mt-1 text-sm">{currentProject.estimatedTime || 'Not set'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Estimated Time Per Unit</label>
                <p className="mt-1 text-sm">{currentProject.estimatedTimePerUnit ? `${currentProject.estimatedTimePerUnit} hours` : 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Scaling Unit</label>
                <p className="mt-1 text-sm">{currentProject.scalingUnit || 'Not set'}</p>
              </div>
            </div>
          </div>
        )}
        {currentProject && editingProject && (
          <div className="mt-4 space-y-4 border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Project Name</label>
                <Input 
                  value={currentProject.name} 
                  onChange={(e) => updateProjectData({...currentProject, name: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Input 
                  value={currentProject.category || ''} 
                  onChange={(e) => updateProjectData({...currentProject, category: e.target.value})}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea 
                value={currentProject.description} 
                onChange={(e) => updateProjectData({...currentProject, description: e.target.value})}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Difficulty</label>
                <select 
                  value={currentProject.difficulty || ''} 
                  onChange={(e) => updateProjectData({...currentProject, difficulty: e.target.value as any})}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select difficulty</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Effort Level</label>
                <select 
                  value={currentProject.effortLevel || ''} 
                  onChange={(e) => updateProjectData({...currentProject, effortLevel: e.target.value as any})}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select effort</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Estimated Time</label>
                <Input 
                  value={currentProject.estimatedTime || ''} 
                  onChange={(e) => updateProjectData({...currentProject, estimatedTime: e.target.value})}
                  className="mt-1"
                  placeholder="e.g., 2-4 hours"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Estimated Time Per Unit</label>
                <Input 
                  type="number"
                  step="0.1"
                  value={currentProject.estimatedTimePerUnit || ''} 
                  onChange={(e) => updateProjectData({...currentProject, estimatedTimePerUnit: e.target.value ? parseFloat(e.target.value) : undefined})}
                  className="mt-1"
                  placeholder="e.g., 2.5"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Scaling Unit</label>
                <Select 
                  value={currentProject.scalingUnit || 'none'} 
                  onValueChange={(value) => updateProjectData({...currentProject, scalingUnit: value === 'none' ? undefined : value as any})}
                >
                  <SelectTrigger className="mt-1 bg-background">
                    <SelectValue placeholder="Select scaling unit" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    <SelectItem value="none">No scaling unit</SelectItem>
                    <SelectItem value="per square foot">per square foot</SelectItem>
                    <SelectItem value="per 10x10 room">per 10x10 room</SelectItem>
                    <SelectItem value="per linear foot">per linear foot</SelectItem>
                    <SelectItem value="per cubic yard">per cubic yard</SelectItem>
                    <SelectItem value="per item">per item</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => setEditingProject(false)} variant="outline">
                <Check className="w-4 h-4 mr-2" />
                Done Editing
              </Button>
              <Button onClick={() => setEditingProject(false)} variant="ghost">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!currentProject) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Project Management</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            {renderProjectSelector()}
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
            {renderProjectSelector()}
            
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Project Structure</h2>
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
                  <CardTitle>Phases, Operations, and Steps</CardTitle>
                  <CardDescription>Manage the workflow structure</CardDescription>
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