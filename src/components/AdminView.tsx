import React, { useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { WorkflowStep, Material, Tool, Output, Phase, Operation } from '@/interfaces/Project';
import { ProjectSelector } from '@/components/ProjectSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Plus, Save, X, Check } from 'lucide-react';
import { toast } from 'sonner';

interface EditingState {
  type: 'phase' | 'operation' | 'step' | null;
  id: string | null;
  data: any;
}

export const AdminView: React.FC = () => {
  const { currentProject, updateProject } = useProject();
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('');
  const [selectedOperationId, setSelectedOperationId] = useState<string>('');
  const [editing, setEditing] = useState<EditingState>({ type: null, id: null, data: null });

  const updateProjectData = (updatedProject: typeof currentProject) => {
    if (updatedProject) {
      updateProject({ ...updatedProject, updatedAt: new Date() });
    }
  };

  // Phase Management
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
    setEditing({ type: 'phase', id: newPhase.id, data: { ...newPhase } });
    toast.success('Phase added');
  };

  const updatePhase = (phaseId: string, updates: Partial<Phase>) => {
    if (!currentProject) return;

    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.map(phase => 
        phase.id === phaseId ? { ...phase, ...updates } : phase
      )
    };

    updateProjectData(updatedProject);
  };

  const deletePhase = (phaseId: string) => {
    if (!currentProject) return;

    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.filter(phase => phase.id !== phaseId)
    };

    updateProjectData(updatedProject);
    if (selectedPhaseId === phaseId) {
      setSelectedPhaseId('');
      setSelectedOperationId('');
    }
    toast.success('Phase deleted');
  };

  // Operation Management
  const addOperation = () => {
    if (!currentProject || !selectedPhaseId) return;

    const newOperation: Operation = {
      id: Date.now().toString(),
      name: 'New Operation',
      description: '',
      steps: []
    };

    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.map(phase =>
        phase.id === selectedPhaseId
          ? { ...phase, operations: [...phase.operations, newOperation] }
          : phase
      )
    };

    updateProjectData(updatedProject);
    setEditing({ type: 'operation', id: newOperation.id, data: { ...newOperation } });
    toast.success('Operation added');
  };

  const updateOperation = (operationId: string, updates: Partial<Operation>) => {
    if (!currentProject || !selectedPhaseId) return;

    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.map(phase =>
        phase.id === selectedPhaseId
          ? {
              ...phase,
              operations: phase.operations.map(op =>
                op.id === operationId ? { ...op, ...updates } : op
              )
            }
          : phase
      )
    };

    updateProjectData(updatedProject);
  };

  const deleteOperation = (operationId: string) => {
    if (!currentProject || !selectedPhaseId) return;

    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.map(phase =>
        phase.id === selectedPhaseId
          ? { ...phase, operations: phase.operations.filter(op => op.id !== operationId) }
          : phase
      )
    };

    updateProjectData(updatedProject);
    if (selectedOperationId === operationId) {
      setSelectedOperationId('');
    }
    toast.success('Operation deleted');
  };

  // Step Management
  const addStep = () => {
    if (!currentProject || !selectedPhaseId || !selectedOperationId) return;

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
      phases: currentProject.phases.map(phase =>
        phase.id === selectedPhaseId
          ? {
              ...phase,
              operations: phase.operations.map(op =>
                op.id === selectedOperationId
                  ? { ...op, steps: [...op.steps, newStep] }
                  : op
              )
            }
          : phase
      )
    };

    updateProjectData(updatedProject);
    setEditing({ type: 'step', id: newStep.id, data: { ...newStep } });
    toast.success('Step added');
  };

  const updateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    if (!currentProject || !selectedPhaseId || !selectedOperationId) return;

    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.map(phase =>
        phase.id === selectedPhaseId
          ? {
              ...phase,
              operations: phase.operations.map(op =>
                op.id === selectedOperationId
                  ? {
                      ...op,
                      steps: op.steps.map(step =>
                        step.id === stepId ? { ...step, ...updates } : step
                      )
                    }
                  : op
              )
            }
          : phase
      )
    };

    updateProjectData(updatedProject);
  };

  const deleteStep = (stepId: string) => {
    if (!currentProject || !selectedPhaseId || !selectedOperationId) return;

    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.map(phase =>
        phase.id === selectedPhaseId
          ? {
              ...phase,
              operations: phase.operations.map(op =>
                op.id === selectedOperationId
                  ? { ...op, steps: op.steps.filter(step => step.id !== stepId) }
                  : op
              )
            }
          : phase
      )
    };

    updateProjectData(updatedProject);
    toast.success('Step deleted');
  };

  const startEdit = (type: EditingState['type'], id: string, data: any) => {
    setEditing({ type, id, data: { ...data } });
  };

  const saveEdit = () => {
    if (!editing.type || !editing.id || !editing.data) return;

    switch (editing.type) {
      case 'phase':
        updatePhase(editing.id, editing.data);
        break;
      case 'operation':
        updateOperation(editing.id, editing.data);
        break;
      case 'step':
        updateStep(editing.id, editing.data);
        break;
    }

    setEditing({ type: null, id: null, data: null });
    toast.success('Changes saved');
  };

  const cancelEdit = () => {
    setEditing({ type: null, id: null, data: null });
  };

  const selectedPhase = currentProject?.phases.find(p => p.id === selectedPhaseId);
  const selectedOperation = selectedPhase?.operations.find(o => o.id === selectedOperationId);

  if (!currentProject) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <ProjectSelector />
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Please select or create a project to manage workflows.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <ProjectSelector />

      {/* Phases Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Phases</CardTitle>
              <CardDescription>Manage project phases</CardDescription>
            </div>
            <Button onClick={addPhase}>
              <Plus className="w-4 h-4 mr-2" />
              Add Phase
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Operations</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentProject.phases.map((phase) => (
                <TableRow 
                  key={phase.id}
                  className={selectedPhaseId === phase.id ? 'bg-muted/50' : ''}
                >
                  <TableCell>
                    {editing.type === 'phase' && editing.id === phase.id ? (
                      <Input
                        value={editing.data.name}
                        onChange={(e) => setEditing(prev => ({ ...prev, data: { ...prev.data, name: e.target.value } }))}
                        className="w-full"
                      />
                    ) : (
                      <div 
                        className="font-medium cursor-pointer hover:text-primary"
                        onClick={() => setSelectedPhaseId(phase.id)}
                      >
                        {phase.name}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {editing.type === 'phase' && editing.id === phase.id ? (
                      <Textarea
                        value={editing.data.description}
                        onChange={(e) => setEditing(prev => ({ ...prev, data: { ...prev.data, description: e.target.value } }))}
                        className="w-full"
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {phase.description || 'No description'}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{phase.operations.length} operations</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {editing.type === 'phase' && editing.id === phase.id ? (
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
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => startEdit('phase', phase.id, phase)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => deletePhase(phase.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Operations Table */}
      {selectedPhaseId && selectedPhase && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Operations - {selectedPhase.name}</CardTitle>
                <CardDescription>Manage operations within this phase</CardDescription>
              </div>
              <Button onClick={addOperation}>
                <Plus className="w-4 h-4 mr-2" />
                Add Operation
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Steps</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedPhase.operations.map((operation) => (
                  <TableRow 
                    key={operation.id}
                    className={selectedOperationId === operation.id ? 'bg-muted/50' : ''}
                  >
                    <TableCell>
                      {editing.type === 'operation' && editing.id === operation.id ? (
                        <Input
                          value={editing.data.name}
                          onChange={(e) => setEditing(prev => ({ ...prev, data: { ...prev.data, name: e.target.value } }))}
                          className="w-full"
                        />
                      ) : (
                        <div 
                          className="font-medium cursor-pointer hover:text-primary"
                          onClick={() => setSelectedOperationId(operation.id)}
                        >
                          {operation.name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editing.type === 'operation' && editing.id === operation.id ? (
                        <Textarea
                          value={editing.data.description}
                          onChange={(e) => setEditing(prev => ({ ...prev, data: { ...prev.data, description: e.target.value } }))}
                          className="w-full"
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {operation.description || 'No description'}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{operation.steps.length} steps</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {editing.type === 'operation' && editing.id === operation.id ? (
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
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => startEdit('operation', operation.id, operation)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => deleteOperation(operation.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Steps Table */}
      {selectedOperationId && selectedOperation && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Steps - {selectedOperation.name}</CardTitle>
                <CardDescription>Manage steps within this operation</CardDescription>
              </div>
              <Button onClick={addStep}>
                <Plus className="w-4 h-4 mr-2" />
                Add Step
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Content Type</TableHead>
                  <TableHead>Resources</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedOperation.steps.map((step) => (
                  <TableRow key={step.id}>
                    <TableCell>
                      {editing.type === 'step' && editing.id === step.id ? (
                        <Input
                          value={editing.data.step}
                          onChange={(e) => setEditing(prev => ({ ...prev, data: { ...prev.data, step: e.target.value } }))}
                          className="w-full"
                        />
                      ) : (
                        <div className="font-medium">{step.step}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editing.type === 'step' && editing.id === step.id ? (
                        <Textarea
                          value={editing.data.description}
                          onChange={(e) => setEditing(prev => ({ ...prev, data: { ...prev.data, description: e.target.value } }))}
                          className="w-full"
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground max-w-xs">
                          {step.description || 'No description'}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editing.type === 'step' && editing.id === step.id ? (
                        <Select
                          value={editing.data.contentType}
                          onValueChange={(value) => setEditing(prev => ({ ...prev, data: { ...prev.data, contentType: value } }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                            <SelectItem value="image">Image</SelectItem>
                            <SelectItem value="document">Document</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="capitalize">{step.contentType}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {step.materials?.length || 0}M
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {step.tools?.length || 0}T
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {step.outputs?.length || 0}O
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {editing.type === 'step' && editing.id === step.id ? (
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
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => startEdit('step', step.id, step)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => deleteStep(step.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};