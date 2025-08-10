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
import { Separator } from '@/components/ui/separator';
import { Edit, Trash2, Plus, Settings, FileText, Video, Image, File } from 'lucide-react';
import { toast } from 'sonner';

export const AdminView: React.FC = () => {
  const { currentProject, updateProject } = useProject();
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('');
  const [selectedOperationId, setSelectedOperationId] = useState<string>('');
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    step: '',
    description: '',
    contentType: 'text' as 'text' | 'video' | 'image' | 'document',
    content: '',
    materials: [] as Material[],
    tools: [] as Tool[],
    outputs: [] as Output[]
  });

  const [newPhase, setNewPhase] = useState({ name: '', description: '' });
  const [newOperation, setNewOperation] = useState({ name: '', description: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentProject || !selectedPhaseId || !selectedOperationId) {
      toast.error('Please select a project, phase, and operation first');
      return;
    }

    const updatedProject = { ...currentProject };
    const phaseIndex = updatedProject.phases.findIndex(p => p.id === selectedPhaseId);
    const operationIndex = updatedProject.phases[phaseIndex].operations.findIndex(o => o.id === selectedOperationId);

    if (editingStepId) {
      const stepIndex = updatedProject.phases[phaseIndex].operations[operationIndex].steps.findIndex(s => s.id === editingStepId);
      updatedProject.phases[phaseIndex].operations[operationIndex].steps[stepIndex] = { ...formData, id: editingStepId };
      toast.success('Step updated successfully');
    } else {
      const newStep: WorkflowStep = { ...formData, id: Date.now().toString() };
      updatedProject.phases[phaseIndex].operations[operationIndex].steps.push(newStep);
      toast.success('Step added successfully');
    }

    updatedProject.updatedAt = new Date();
    updateProject(updatedProject);
    setEditingStepId(null);
    
    // Reset form
    setFormData({
      step: '',
      description: '',
      contentType: 'text',
      content: '',
      materials: [],
      tools: [],
      outputs: []
    });
  };

  const addPhase = () => {
    if (!currentProject || !newPhase.name.trim()) return;
    
    const phase: Phase = {
      id: Date.now().toString(),
      name: newPhase.name,
      description: newPhase.description,
      operations: []
    };

    const updatedProject = {
      ...currentProject,
      phases: [...currentProject.phases, phase],
      updatedAt: new Date()
    };

    updateProject(updatedProject);
    setNewPhase({ name: '', description: '' });
    toast.success('Phase added successfully');
  };

  const addOperation = () => {
    if (!currentProject || !selectedPhaseId || !newOperation.name.trim()) return;
    
    const operation: Operation = {
      id: Date.now().toString(),
      name: newOperation.name,
      description: newOperation.description,
      steps: []
    };

    const updatedProject = { ...currentProject };
    const phaseIndex = updatedProject.phases.findIndex(p => p.id === selectedPhaseId);
    updatedProject.phases[phaseIndex].operations.push(operation);
    updatedProject.updatedAt = new Date();

    updateProject(updatedProject);
    setNewOperation({ name: '', description: '' });
    toast.success('Operation added successfully');
  };

  const editStep = (step: WorkflowStep) => {
    setFormData(step);
    setEditingStepId(step.id);
  };

  const deleteStep = (stepId: string) => {
    if (!currentProject || !selectedPhaseId || !selectedOperationId) return;

    const updatedProject = { ...currentProject };
    const phaseIndex = updatedProject.phases.findIndex(p => p.id === selectedPhaseId);
    const operationIndex = updatedProject.phases[phaseIndex].operations.findIndex(o => o.id === selectedOperationId);
    
    updatedProject.phases[phaseIndex].operations[operationIndex].steps = 
      updatedProject.phases[phaseIndex].operations[operationIndex].steps.filter(s => s.id !== stepId);
    updatedProject.updatedAt = new Date();

    updateProject(updatedProject);
    toast.success('Step deleted successfully');
  };

  // Material management functions
  const addMaterial = () => {
    const newMaterial: Material = {
      id: Date.now().toString(),
      name: '',
      description: '',
      category: 'Other',
      required: false
    };
    setFormData(prev => ({
      ...prev,
      materials: [...prev.materials, newMaterial]
    }));
  };

  const updateMaterial = (index: number, field: keyof Material, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.map((material, i) => 
        i === index ? { ...material, [field]: value } : material
      )
    }));
  };

  const removeMaterial = (index: number) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index)
    }));
  };

  // Tool management functions
  const addTool = () => {
    const newTool: Tool = {
      id: Date.now().toString(),
      name: '',
      description: '',
      category: 'Other',
      required: false
    };
    setFormData(prev => ({
      ...prev,
      tools: [...prev.tools, newTool]
    }));
  };

  const updateTool = (index: number, field: keyof Tool, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      tools: prev.tools.map((tool, i) => 
        i === index ? { ...tool, [field]: value } : tool
      )
    }));
  };

  const removeTool = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tools: prev.tools.filter((_, i) => i !== index)
    }));
  };

  // Output management functions
  const addOutput = () => {
    const newOutput: Output = {
      id: Date.now().toString(),
      name: '',
      description: '',
      type: 'none'
    };
    setFormData(prev => ({
      ...prev,
      outputs: [...prev.outputs, newOutput]
    }));
  };

  const updateOutput = (index: number, field: keyof Output, value: string) => {
    setFormData(prev => ({
      ...prev,
      outputs: prev.outputs.map((output, i) => 
        i === index ? { ...output, [field]: value } : output
      )
    }));
  };

  const removeOutput = (index: number) => {
    setFormData(prev => ({
      ...prev,
      outputs: prev.outputs.filter((_, i) => i !== index)
    }));
  };

  const getContentIcon = (contentType: string) => {
    switch (contentType) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      case 'document': return <File className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const selectedPhase = currentProject?.phases.find(p => p.id === selectedPhaseId);
  const selectedOperation = selectedPhase?.operations.find(o => o.id === selectedOperationId);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <ProjectSelector />
      
      {!currentProject ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Please select or create a project to manage workflows.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Phase Management */}
          <Card>
            <CardHeader>
              <CardTitle>Phase Management</CardTitle>
              <CardDescription>Create and manage project phases</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Input
                  placeholder="Phase name"
                  value={newPhase.name}
                  onChange={(e) => setNewPhase(prev => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  placeholder="Phase description"
                  value={newPhase.description}
                  onChange={(e) => setNewPhase(prev => ({ ...prev, description: e.target.value }))}
                />
                <Button onClick={addPhase} disabled={!newPhase.name.trim()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Phase
                </Button>
              </div>
              
              <Select value={selectedPhaseId} onValueChange={setSelectedPhaseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a phase" />
                </SelectTrigger>
                <SelectContent>
                  {currentProject.phases.map(phase => (
                    <SelectItem key={phase.id} value={phase.id}>{phase.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Operation Management */}
          {selectedPhaseId && (
            <Card>
              <CardHeader>
                <CardTitle>Operation Management</CardTitle>
                <CardDescription>Create and manage operations for {selectedPhase?.name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Input
                    placeholder="Operation name"
                    value={newOperation.name}
                    onChange={(e) => setNewOperation(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    placeholder="Operation description"
                    value={newOperation.description}
                    onChange={(e) => setNewOperation(prev => ({ ...prev, description: e.target.value }))}
                  />
                  <Button onClick={addOperation} disabled={!newOperation.name.trim()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Operation
                  </Button>
                </div>
                
                <Select value={selectedOperationId} onValueChange={setSelectedOperationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an operation" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedPhase?.operations.map(operation => (
                      <SelectItem key={operation.id} value={operation.id}>{operation.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Step Management */}
          {selectedOperationId && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    {editingStepId ? 'Edit Step' : 'Add Step'}
                  </CardTitle>
                  <CardDescription>
                    Create detailed steps for {selectedOperation?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="step">Step Name</Label>
                      <Input
                        id="step"
                        placeholder="e.g., Stakeholder Interviews"
                        value={formData.step}
                        onChange={(e) => setFormData({...formData, step: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Detailed description of this step"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contentType">Content Type</Label>
                        <Select 
                          value={formData.contentType} 
                          onValueChange={(value: 'text' | 'video' | 'image' | 'document') => setFormData({...formData, contentType: value})}
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
                      </div>
                      <div>
                        <Label htmlFor="content">Content</Label>
                        <Input
                          id="content"
                          placeholder="Content URL or description"
                          value={formData.content}
                          onChange={(e) => setFormData({...formData, content: e.target.value})}
                        />
                      </div>
                    </div>

                    {/* Materials Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Materials</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addMaterial}>
                          <Plus className="w-4 h-4 mr-1" />
                          Add Material
                        </Button>
                      </div>
                      {formData.materials.map((material, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center">
                          <Input
                            className="col-span-4"
                            placeholder="Material name"
                            value={material.name}
                            onChange={(e) => updateMaterial(index, 'name', e.target.value)}
                          />
                          <Input
                            className="col-span-4"
                            placeholder="Description"
                            value={material.description}
                            onChange={(e) => updateMaterial(index, 'description', e.target.value)}
                          />
                          <Select 
                            value={material.category} 
                            onValueChange={(value) => updateMaterial(index, 'category', value)}
                          >
                            <SelectTrigger className="col-span-3">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Software">Software</SelectItem>
                              <SelectItem value="Hardware">Hardware</SelectItem>
                              <SelectItem value="Document">Document</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="col-span-1"
                            onClick={() => removeMaterial(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Tools Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Tools</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addTool}>
                          <Plus className="w-4 h-4 mr-1" />
                          Add Tool
                        </Button>
                      </div>
                      {formData.tools.map((tool, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center">
                          <Input
                            className="col-span-4"
                            placeholder="Tool name"
                            value={tool.name}
                            onChange={(e) => updateTool(index, 'name', e.target.value)}
                          />
                          <Input
                            className="col-span-4"
                            placeholder="Description"
                            value={tool.description}
                            onChange={(e) => updateTool(index, 'description', e.target.value)}
                          />
                          <Select 
                            value={tool.category} 
                            onValueChange={(value) => updateTool(index, 'category', value)}
                          >
                            <SelectTrigger className="col-span-3">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Software">Software</SelectItem>
                              <SelectItem value="Hardware">Hardware</SelectItem>
                              <SelectItem value="Document">Document</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="col-span-1"
                            onClick={() => removeTool(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Outputs Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Outputs</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addOutput}>
                          <Plus className="w-4 h-4 mr-1" />
                          Add Output
                        </Button>
                      </div>
                      {formData.outputs.map((output, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center">
                          <Input
                            className="col-span-4"
                            placeholder="Output name"
                            value={output.name}
                            onChange={(e) => updateOutput(index, 'name', e.target.value)}
                          />
                          <Input
                            className="col-span-4"
                            placeholder="Description"
                            value={output.description}
                            onChange={(e) => updateOutput(index, 'description', e.target.value)}
                          />
                          <Select 
                            value={output.type} 
                            onValueChange={(value) => updateOutput(index, 'type', value)}
                          >
                            <SelectTrigger className="col-span-3">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="document">Document</SelectItem>
                              <SelectItem value="deliverable">Deliverable</SelectItem>
                              <SelectItem value="artifact">Artifact</SelectItem>
                              <SelectItem value="none">None</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="col-span-1"
                            onClick={() => removeOutput(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full gradient-primary text-white shadow-elegant hover:shadow-lg transition-smooth"
                    >
                      {editingStepId ? 'Update Step' : 'Add Step'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Step List */}
              <Card>
                <CardHeader>
                  <CardTitle>Steps</CardTitle>
                  <CardDescription>
                    Current steps for {selectedOperation?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedOperation?.steps.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No steps yet. Add your first step to get started.
                      </p>
                    ) : (
                      selectedOperation?.steps.map((step) => (
                        <div key={step.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <h4 className="font-medium">{step.step}</h4>
                              <p className="text-sm text-muted-foreground">{step.description}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  {getContentIcon(step.contentType)}
                                  {step.contentType}
                                </span>
                                <span>{step.materials?.length || 0} materials</span>
                                <span>{step.tools?.length || 0} tools</span>
                                <span>{step.outputs?.length || 0} outputs</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => editStep(step)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteStep(step.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};
