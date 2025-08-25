import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, CheckCircle, ExternalLink, Image, Video, Edit, Save, X, ArrowLeft, Settings, Plus, Trash2, FolderPlus, FileText, List } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useProject } from '@/contexts/ProjectContext';
import { WorkflowStep, Material, Tool, Output, Phase, Operation, ContentSection } from '@/interfaces/Project';
import { OutputEditForm } from './OutputEditForm';
import { MultiContentEditor } from './MultiContentEditor';
import { MultiContentRenderer } from './MultiContentRenderer';
import { toast } from 'sonner';
import { addStandardPhasesToProjectRun } from '@/utils/projectUtils';

interface EditWorkflowViewProps {
  onBackToAdmin: () => void;
}

export default function EditWorkflowView({ onBackToAdmin }: EditWorkflowViewProps) {
  const { currentProject, updateProject } = useProject();
  const [viewMode, setViewMode] = useState<'steps' | 'structure'>('steps');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingOutput, setEditingOutput] = useState<{ output: Output; stepId: string } | null>(null);
  const [outputEditOpen, setOutputEditOpen] = useState(false);
  
  // Structure editing state
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [editingOperation, setEditingOperation] = useState<Operation | null>(null);
  const [editingStructureStep, setEditingStructureStep] = useState<WorkflowStep | null>(null);
  const [showAddDialog, setShowAddDialog] = useState<{ type: 'phase' | 'operation' | 'step'; parentId?: string } | null>(null);

  // Get processed phases including standard phases
  const displayPhases = currentProject ? addStandardPhasesToProjectRun(currentProject.phases || []) : [];
  
  // Flatten all steps from all phases and operations for navigation
  const allSteps = displayPhases.flatMap(phase => 
    phase.operations.flatMap(operation => 
      operation.steps.map(step => ({
        ...step,
        phaseName: phase.name,
        operationName: operation.name,
        phaseId: phase.id,
        operationId: operation.id
      }))
    )
  );

  const currentStep = allSteps[currentStepIndex];
  const progress = allSteps.length > 0 ? (currentStepIndex + 1) / allSteps.length * 100 : 0;

  useEffect(() => {
    if (currentStep && (!editingStep || editingStep.id !== currentStep.id)) {
      setEditingStep({ ...currentStep });
    }
  }, [currentStep?.id]);

  const handleNext = () => {
    if (currentStepIndex < allSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      setEditMode(false);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      setEditMode(false);
    }
  };

  const handleStartEdit = () => {
    setEditMode(true);
    setEditingStep({ ...currentStep });
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditingStep({ ...currentStep });
  };

  const handleSaveEdit = () => {
    if (!editingStep || !currentProject) return;

    // Update only custom phases (standard phases are generated dynamically)
    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.map(phase => ({
        ...phase,
        operations: phase.operations.map(operation => ({
          ...operation,
          steps: operation.steps.map(step => 
            step.id === editingStep.id ? editingStep : step
          )
        }))
      })),
      updatedAt: new Date()
    };

    updateProject(updatedProject);
    setEditMode(false);
  };

  const handleEditOutput = (output: Output, stepId: string) => {
    setEditingOutput({ output, stepId });
    setOutputEditOpen(true);
  };

  const handleSaveOutput = (updatedOutput: Output) => {
    if (!editingOutput || !currentProject) return;
    
    const updatedProject = { ...currentProject };
    
    // Find and update the output in the project
    for (const phase of updatedProject.phases) {
      for (const operation of phase.operations) {
        for (const step of operation.steps) {
          if (step.id === editingOutput.stepId) {
            const outputIndex = step.outputs.findIndex(o => o.id === updatedOutput.id);
            if (outputIndex !== -1) {
              step.outputs[outputIndex] = updatedOutput;
            }
          }
        }
      }
    }
    
    updatedProject.updatedAt = new Date();
    updateProject(updatedProject);
    setEditingOutput(null);
  };

  const updateEditingStep = (field: keyof WorkflowStep, value: any) => {
    if (!editingStep) return;
    setEditingStep({ ...editingStep, [field]: value });
  };

  // Structure management functions
  const addPhase = () => {
    if (!currentProject) return;
    
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
    if (!currentProject) return;
    
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
    if (!currentProject) return;
    
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

  const updatePhase = (updatedPhase: Phase) => {
    if (!currentProject) return;
    
    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.map(phase => 
        phase.id === updatedPhase.id ? updatedPhase : phase
      ),
      updatedAt: new Date()
    };
    
    updateProject(updatedProject);
    setEditingPhase(null);
  };

  const updateOperation = (phaseId: string, updatedOperation: Operation) => {
    if (!currentProject) return;
    
    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.map(phase => 
        phase.id === phaseId 
          ? {
              ...phase,
              operations: phase.operations.map(operation =>
                operation.id === updatedOperation.id ? updatedOperation : operation
              )
            }
          : phase
      ),
      updatedAt: new Date()
    };
    
    updateProject(updatedProject);
    setEditingOperation(null);
  };

  const updateStructureStep = (phaseId: string, operationId: string, updatedStep: WorkflowStep) => {
    if (!currentProject) return;
    
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
                        step.id === updatedStep.id ? updatedStep : step
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
    setEditingStructureStep(null);
  };

  const deletePhase = (phaseId: string) => {
    if (!currentProject) return;
    
    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.filter(phase => phase.id !== phaseId),
      updatedAt: new Date()
    };
    
    updateProject(updatedProject);
  };

  const deleteOperation = (phaseId: string, operationId: string) => {
    if (!currentProject) return;
    
    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.map(phase => 
        phase.id === phaseId 
          ? {
              ...phase,
              operations: phase.operations.filter(operation => operation.id !== operationId)
            }
          : phase
      ),
      updatedAt: new Date()
    };
    
    updateProject(updatedProject);
  };

  const deleteStep = (phaseId: string, operationId: string, stepId: string) => {
    if (!currentProject) return;
    
    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.map(phase => 
        phase.id === phaseId 
          ? {
              ...phase,
              operations: phase.operations.map(operation =>
                operation.id === operationId
                  ? { ...operation, steps: operation.steps.filter(step => step.id !== stepId) }
                  : operation
              )
            }
          : phase
      ),
      updatedAt: new Date()
    };
    
    updateProject(updatedProject);
  };

  const renderContent = (step: typeof currentStep) => {
    if (!step) return null;

    if (editMode && editingStep) {
      // Parse existing content sections or create default
      let contentSections: ContentSection[] = [];
      try {
        if (editingStep.contentSections) {
          contentSections = editingStep.contentSections;
        } else if (editingStep.content) {
          // Migrate existing content to new format
          contentSections = [{
            id: `section-${Date.now()}`,
            type: 'text',
            content: editingStep.content,
            title: '',
            width: 'full',
            alignment: 'left'
          }];
        }
      } catch (e) {
        contentSections = [];
      }

      return (
        <div className="space-y-6">
          <MultiContentEditor 
            sections={contentSections}
            onChange={(sections) => updateEditingStep('contentSections', sections)}
          />
          
          {/* Legacy content field for backward compatibility */}
          <div className="border-t pt-4">
            <Label htmlFor="legacy-content">Legacy Content (for backward compatibility)</Label>
            <Textarea
              id="legacy-content"
              value={editingStep.content}
              onChange={(e) => updateEditingStep('content', e.target.value)}
              className="min-h-[100px]"
              placeholder="Legacy text content..."
            />
          </div>
        </div>
      );
    }

    // Render multi-content sections if available, otherwise fallback to legacy
    if (step.contentSections && step.contentSections.length > 0) {
      return <MultiContentRenderer sections={step.contentSections} />;
    }

    // Legacy content rendering for backward compatibility
    switch (step.contentType) {
      case 'document':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ExternalLink className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-orange-800">External Resource</span>
              </div>
              <a href={step.content} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-800 underline break-all">
                {step.content}
              </a>
            </div>
          </div>
        );
      case 'image':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Image className="w-5 h-5 text-primary" />
              <span className="font-medium">Visual Reference</span>
            </div>
            {step.image && <img src={step.image} alt={step.step} className="w-full rounded-lg shadow-card max-w-2xl" />}
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap">{step.content}</div>
            </div>
          </div>
        );
      case 'video':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Video className="w-5 h-5 text-primary" />
              <span className="font-medium">Tutorial Video</span>
            </div>
            <div className="aspect-video rounded-lg overflow-hidden shadow-card">
              <iframe src={step.content} className="w-full h-full" allowFullScreen title={step.step} />
            </div>
          </div>
        );
      default:
        return (
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-foreground leading-relaxed">
              {step.content}
            </div>
          </div>
        );
    }
  };

  // Group steps by phase and operation for sidebar navigation
  const groupedSteps = displayPhases.reduce((acc, phase) => {
    acc[phase.name] = phase.operations.reduce((opAcc, operation) => {
      opAcc[operation.name] = operation.steps;
      return opAcc;
    }, {} as Record<string, any[]>);
    return acc;
  }, {} as Record<string, Record<string, any[]>>);

  // Structure view rendering
  const renderStructureView = () => {
    if (!currentProject) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Project Structure</h2>
          <Button onClick={addPhase} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Phase
          </Button>
        </div>

        <div className="space-y-4">
          {displayPhases.map((phase, phaseIndex) => {
            const isStandardPhase = phaseIndex < 3; // First 3 are standard phases
            return (
            <Card key={phase.id} className="border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {editingPhase?.id === phase.id ? (
                      <div className="space-y-2">
                        <Input
                          value={editingPhase.name}
                          onChange={(e) => setEditingPhase({ ...editingPhase, name: e.target.value })}
                          className="text-xl font-bold"
                        />
                        <Textarea
                          value={editingPhase.description}
                          onChange={(e) => setEditingPhase({ ...editingPhase, description: e.target.value })}
                          placeholder="Phase description..."
                        />
                        <div className="flex gap-2">
                          <Button onClick={() => updatePhase(editingPhase)} size="sm">Save</Button>
                          <Button onClick={() => setEditingPhase(null)} variant="outline" size="sm">Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <CardTitle className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-primary/10 text-primary">Phase {phaseIndex + 1}</Badge>
                          {phase.name}
                        </CardTitle>
                        {phase.description && <CardDescription>{phase.description}</CardDescription>}
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => addOperation(phase.id)} size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Operation
                    </Button>
                    <Button onClick={() => setEditingPhase(phase)} size="sm" variant="ghost">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button onClick={() => deletePhase(phase.id)} size="sm" variant="ghost" className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {phase.operations.map((operation, operationIndex) => (
                    <Card key={operation.id} className="ml-4">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            {editingOperation?.id === operation.id ? (
                              <div className="space-y-2">
                                <Input
                                  value={editingOperation.name}
                                  onChange={(e) => setEditingOperation({ ...editingOperation, name: e.target.value })}
                                  className="font-medium"
                                />
                                <Textarea
                                  value={editingOperation.description}
                                  onChange={(e) => setEditingOperation({ ...editingOperation, description: e.target.value })}
                                  placeholder="Operation description..."
                                />
                                <div className="flex gap-2">
                                  <Button onClick={() => updateOperation(phase.id, editingOperation)} size="sm">Save</Button>
                                  <Button onClick={() => setEditingOperation(null)} variant="outline" size="sm">Cancel</Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <Badge variant="secondary">Op {operationIndex + 1}</Badge>
                                  {operation.name}
                                </CardTitle>
                                {operation.description && <CardDescription>{operation.description}</CardDescription>}
                              </>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={() => addStep(phase.id, operation.id)} size="sm" variant="outline">
                              <Plus className="w-4 h-4 mr-2" />
                              Add Step
                            </Button>
                            <Button onClick={() => setEditingOperation(operation)} size="sm" variant="ghost">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button onClick={() => deleteOperation(phase.id, operation.id)} size="sm" variant="ghost" className="text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {operation.steps.map((step, stepIndex) => (
                            <div key={step.id} className="ml-4 p-3 border rounded-lg bg-muted/20">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  {editingStructureStep?.id === step.id ? (
                                    <div className="space-y-2">
                                      <Input
                                        value={editingStructureStep.step}
                                        onChange={(e) => setEditingStructureStep({ ...editingStructureStep, step: e.target.value })}
                                        className="font-medium"
                                      />
                                      <Textarea
                                        value={editingStructureStep.description}
                                        onChange={(e) => setEditingStructureStep({ ...editingStructureStep, description: e.target.value })}
                                        placeholder="Step description..."
                                      />
                                      <div className="flex gap-2">
                                        <Button onClick={() => updateStructureStep(phase.id, operation.id, editingStructureStep)} size="sm">Save</Button>
                                        <Button onClick={() => setEditingStructureStep(null)} variant="outline" size="sm">Cancel</Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="font-medium flex items-center gap-2">
                                        <Badge variant="outline">Step {stepIndex + 1}</Badge>
                                        {step.step}
                                      </div>
                                      {step.description && <div className="text-sm text-muted-foreground">{step.description}</div>}
                                    </>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Button onClick={() => setEditingStructureStep(step)} size="sm" variant="ghost">
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button onClick={() => deleteStep(phase.id, operation.id, step.id)} size="sm" variant="ghost" className="text-destructive">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                          {operation.steps.length === 0 && (
                            <div className="text-center py-4 text-muted-foreground">
                              No steps added yet
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {phase.operations.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      No operations added yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
          })}
        </div>
      </div>
    );
  };

  if (!currentProject) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No project selected</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (viewMode === 'structure') {
    return (
      <div className="container mx-auto px-6 py-8">
        {/* Header with Back Button and View Toggle */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={onBackToAdmin} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Project Manager
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <Button 
                onClick={() => setViewMode('steps')} 
                variant={'outline'}
                size="sm"
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Step Editor
              </Button>
              <Button 
                onClick={() => setViewMode('structure')} 
                variant={'default'}
                size="sm"
                className="flex items-center gap-2"
              >
                <List className="w-4 h-4" />
                Structure Manager
              </Button>
            </div>
            <Badge variant="outline" className="bg-blue-100 text-blue-800">
              Structure Mode
            </Badge>
          </div>
        </div>

        {renderStructureView()}
      </div>
    );
  }

  if (allSteps.length === 0) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={onBackToAdmin} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Project Manager
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <Button 
                onClick={() => setViewMode('steps')} 
                variant={'outline'}
                size="sm"
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Step Editor
              </Button>
              <Button 
                onClick={() => setViewMode('structure')} 
                variant={'default'}
                size="sm"
                className="flex items-center gap-2"
              >
                <List className="w-4 h-4" />
                Structure Manager
              </Button>
            </div>
          </div>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              This project has no workflow steps. Use Structure Manager to add phases, operations, and steps.
            </p>
            <Button onClick={() => setViewMode('structure')} className="flex items-center gap-2">
              <List className="w-4 h-4" />
              Go to Structure Manager
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header with Back Button and View Toggle */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBackToAdmin} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Project Manager
        </Button>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Button 
              onClick={() => setViewMode('steps')} 
              variant={'default'}
              size="sm"
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Step Editor
            </Button>
            <Button 
              onClick={() => setViewMode('structure')} 
              variant={'outline'}
              size="sm"
              className="flex items-center gap-2"
            >
              <List className="w-4 h-4" />
              Structure Manager
            </Button>
          </div>
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            Step Edit Mode
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <Card className="lg:col-span-1 gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Workflow Steps</CardTitle>
            <CardDescription>
              Step {currentStepIndex + 1} of {allSteps.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="space-y-4">
              {Object.entries(groupedSteps).map(([phase, operations]) => (
                <div key={phase} className="space-y-2">
                  <h4 className="font-semibold text-primary">{phase}</h4>
                  {Object.entries(operations).map(([operation, opSteps]) => (
                    <div key={operation} className="ml-2 space-y-1">
                      <h5 className="text-sm font-medium text-muted-foreground">{operation}</h5>
                      {opSteps.map(step => {
                        const stepIndex = allSteps.findIndex(s => s.id === step.id);
                        return (
                          <div 
                            key={step.id} 
                            className={`ml-2 p-2 rounded text-sm cursor-pointer transition-fast ${
                              step.id === currentStep?.id 
                                ? 'bg-primary/10 text-primary border border-primary/20' 
                                : 'hover:bg-muted/50'
                            }`} 
                            onClick={() => {
                              setCurrentStepIndex(stepIndex);
                              setEditMode(false);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="truncate">{step.step}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Header */}
          <Card className="gradient-card border-0 shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      {currentStep?.phaseName}
                    </Badge>
                    <span className="text-muted-foreground">→</span>
                    <Badge variant="outline">
                      {currentStep?.operationName}
                    </Badge>
                  </div>
                  {editMode && editingStep ? (
                    <div className="space-y-2">
                      <Input
                        value={editingStep.step}
                        onChange={(e) => updateEditingStep('step', e.target.value)}
                        className="text-2xl font-bold border-none p-0 h-auto shadow-none"
                        placeholder="Step title..."
                      />
                      <Textarea
                        value={editingStep.description || ''}
                        onChange={(e) => updateEditingStep('description', e.target.value)}
                        placeholder="Step description..."
                        className="resize-none"
                      />
                    </div>
                  ) : (
                    <>
                      <CardTitle className="text-2xl">{currentStep?.step}</CardTitle>
                      {currentStep?.description && (
                        <CardDescription className="text-base">
                          {currentStep.description}
                        </CardDescription>
                      )}
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  {editMode ? (
                    <>
                      <Button onClick={handleSaveEdit} size="sm">
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button onClick={handleCancelEdit} variant="outline" size="sm">
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button onClick={handleStartEdit} variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Step
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Content */}
          <Card className="gradient-card border-0 shadow-card">
            <CardContent className="p-8">
              {renderContent(currentStep)}
            </CardContent>
          </Card>

          {/* Materials, Tools, and Outputs */}
          {currentStep && (currentStep.materials?.length > 0 || currentStep.tools?.length > 0 || currentStep.outputs?.length > 0) && (
            <Card className="gradient-card border-0 shadow-card">
              <CardContent className="p-6">
                <Accordion type="multiple" defaultValue={["materials", "tools", "outputs"]} className="w-full">
                  {/* Materials */}
                  {currentStep.materials?.length > 0 && (
                    <AccordionItem value="materials">
                      <AccordionTrigger className="text-lg font-semibold">
                        Materials Needed ({currentStep.materials.length})
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {currentStep.materials.map(material => (
                            <div key={material.id} className="p-3 bg-background/50 rounded-lg">
                              <div className="flex items-start gap-3">
                                <div className="flex-1">
                                  <div className="font-medium">{material.name}</div>
                                  {material.category && <Badge variant="outline" className="text-xs mt-1">{material.category}</Badge>}
                                  {material.description && <div className="text-sm text-muted-foreground mt-1">{material.description}</div>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* Tools */}
                  {currentStep.tools?.length > 0 && (
                    <AccordionItem value="tools">
                      <AccordionTrigger className="text-lg font-semibold">
                        Tools Required ({currentStep.tools.length})
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {currentStep.tools.map(tool => (
                            <div key={tool.id} className="p-3 bg-background/50 rounded-lg">
                              <div className="flex items-start gap-3">
                                <div className="flex-1">
                                  <div className="font-medium">{tool.name}</div>
                                  {tool.category && <Badge variant="outline" className="text-xs mt-1">{tool.category}</Badge>}
                                  {tool.description && <div className="text-sm text-muted-foreground mt-1">{tool.description}</div>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* Outputs */}
                  {currentStep.outputs?.length > 0 && (
                    <AccordionItem value="outputs">
                      <AccordionTrigger className="text-lg font-semibold">
                        Outputs ({currentStep.outputs.length})
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {currentStep.outputs.map(output => (
                            <div key={output.id} className="p-3 bg-background/50 rounded-lg">
                              <div className="flex items-start gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className="font-medium">{output.name}</div>
                                    <Badge variant="outline" className="text-xs capitalize">{output.type}</Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground mt-1">{output.description}</div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditOutput(output, currentStep.id)}
                                >
                                  <Settings className="w-3 h-3 mr-1" />
                                  Edit Details
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <Button 
              onClick={handlePrevious} 
              disabled={currentStepIndex === 0}
              variant="outline"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <Button 
              onClick={handleNext} 
              disabled={currentStepIndex >= allSteps.length - 1}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* Output Edit Form */}
      {editingOutput && (
        <OutputEditForm
          output={editingOutput.output}
          isOpen={outputEditOpen}
          onClose={() => {
            setOutputEditOpen(false);
            setEditingOutput(null);
          }}
          onSave={handleSaveOutput}
        />
      )}
    </div>
  );
}