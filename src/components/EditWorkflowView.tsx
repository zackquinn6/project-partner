import { useState, useEffect } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { WorkflowStep, Tool, Material, Output, ContentSection, Phase, Operation, Project, AppReference } from '@/interfaces/Project';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MultiContentEditor } from '@/components/MultiContentEditor';
import { MultiContentRenderer } from '@/components/MultiContentRenderer';
import { FlowTypeSelector } from '@/components/FlowTypeSelector';
import { ToolsMaterialsWindow } from '@/components/ToolsMaterialsWindow';
import { MultiSelectLibraryDialog } from '@/components/MultiSelectLibraryDialog';
import { StructureManager } from '@/components/StructureManager';
import { OutputEditForm } from '@/components/OutputEditForm';
import { ProjectContentImport } from '@/components/ProjectContentImport';
import { ProcessImprovementEngine } from '@/components/ProcessImprovementEngine';
import { CompactToolsTable } from '@/components/CompactToolsTable';
import { CompactMaterialsTable } from '@/components/CompactMaterialsTable';
import { CompactProcessVariablesTable } from '@/components/CompactProcessVariablesTable';
import { CompactOutputsTable } from '@/components/CompactOutputsTable';
import { CompactTimeEstimation } from '@/components/CompactTimeEstimation';
import { CompactAppsSection } from '@/components/CompactAppsSection';
import { AppsLibraryDialog } from '@/components/AppsLibraryDialog';
import { ArrowLeft, Eye, Edit, Package, Wrench, FileOutput, Plus, X, Settings, Save, ChevronLeft, ChevronRight, FileText, List, Upload, Trash2, Brain, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

// Extended interfaces for step-level usage
interface StepMaterial extends Material {
  quantity?: number;
  purpose?: string;
}
interface StepTool extends Tool {
  quantity?: number;
  purpose?: string;
}
interface EditWorkflowViewProps {
  onBackToAdmin: () => void;
}
export default function EditWorkflowView({
  onBackToAdmin
}: EditWorkflowViewProps) {
  const {
    currentProject,
    updateProject
  } = useProject();
  
  // Detect if editing Standard Project Foundation
  const isEditingStandardProject = currentProject?.id === '00000000-0000-0000-0000-000000000001' || currentProject?.isStandardTemplate;
  
  // Debug log to check phases
  useEffect(() => {
    if (currentProject) {
      console.log('🔍 EditWorkflowView - Project loaded:', {
        projectId: currentProject.id,
        projectName: currentProject.name,
        isEditingStandardProject,
        phases: currentProject.phases.map(p => ({
          name: p.name,
          isStandard: p.isStandard,
          operationCount: p.operations.length
        }))
      });
    }
  }, [currentProject?.id, isEditingStandardProject]);
  const [viewMode, setViewMode] = useState<'steps' | 'structure'>('steps');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingOutput, setEditingOutput] = useState<Output | null>(null);
  const [outputEditOpen, setOutputEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [toolsMaterialsOpen, setToolsMaterialsOpen] = useState(false);
  const [toolsLibraryOpen, setToolsLibraryOpen] = useState(false);
  const [materialsLibraryOpen, setMaterialsLibraryOpen] = useState(false);
  const [appsLibraryOpen, setAppsLibraryOpen] = useState(false);
  const [showStructureManager, setShowStructureManager] = useState(false);
  const [processImprovementOpen, setProcessImprovementOpen] = useState(false);

  // Structure editing state
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [editingOperation, setEditingOperation] = useState<Operation | null>(null);
  const [editingStructureStep, setEditingStructureStep] = useState<WorkflowStep | null>(null);
  const [showAddDialog, setShowAddDialog] = useState<{
    type: 'phase' | 'operation' | 'step';
    parentId?: string;
  } | null>(null);

  // Get phases directly from project - no dynamic addition needed
  const displayPhases = currentProject ? currentProject.phases : [];

  // Debug logging
  useEffect(() => {
    if (currentProject) {
      console.log('🔍 EditWorkflowView - currentProject loaded:', {
        projectId: currentProject.id,
        projectName: currentProject.name,
        phaseCount: currentProject.phases?.length,
        phases: currentProject.phases?.map(p => ({
          name: p.name,
          operationCount: p.operations?.length,
          operations: p.operations?.map(op => ({
            name: op.name,
            stepCount: op.steps?.length,
            steps: op.steps?.map(s => s.step)
          }))
        }))
      });
    }
  }, [currentProject?.id]);

  // Flatten all steps from all phases and operations for navigation
  const allSteps = displayPhases.flatMap(phase => phase.operations.flatMap(operation => operation.steps.map(step => ({
    ...step,
    phaseName: phase.name,
    operationName: operation.name,
    phaseId: phase.id,
    operationId: operation.id
  }))));
  
  console.log('🔍 EditWorkflowView - allSteps flattened:', {
    totalSteps: allSteps.length,
    steps: allSteps.map(s => `${s.phaseName} > ${s.operationName} > ${s.step}`)
  });
  const currentStep = allSteps[currentStepIndex];
  const progress = allSteps.length > 0 ? (currentStepIndex + 1) / allSteps.length * 100 : 0;
  useEffect(() => {
    if (currentStep && (!editingStep || editingStep.id !== currentStep.id)) {
      setEditingStep({
        ...currentStep
      });
    }
  }, [currentStep?.id]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
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
    // Check if this step is in a standard phase
    const stepPhase = displayPhases.find(phase => 
      phase.operations.some(op => 
        op.steps.some(s => s.id === currentStep?.id)
      )
    );
    
    // Prevent editing steps in standard phases for non-standard projects
    if (!isEditingStandardProject && stepPhase?.isStandard) {
      toast('Cannot edit steps in standard phases. Standard phases are read-only in this project.');
      return;
    }
    
    setEditMode(true);
    setEditingStep({
      ...currentStep
    });
  };
  const handleCancelEdit = () => {
    setEditMode(false);
    setEditingStep({
      ...currentStep
    });
  };
  const handleSaveEdit = () => {
    if (!editingStep || !currentProject) {
      console.error('SaveEdit: Missing data', {
        editingStep: !!editingStep,
        currentProject: !!currentProject
      });
      return;
    }
    console.log('SaveEdit: Starting save with:', {
      stepId: editingStep.id,
      stepName: editingStep.step,
      contentSections: editingStep.contentSections?.length || 0,
      hasContent: !!editingStep.content
    });

    // Update only custom phases (standard phases are generated dynamically)
    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.map(phase => ({
        ...phase,
        operations: phase.operations.map(operation => ({
          ...operation,
          steps: operation.steps.map(step => step.id === editingStep.id ? editingStep : step)
        }))
      })),
      updatedAt: new Date()
    };
    console.log('SaveEdit: Calling updateProject');
    updateProject(updatedProject);
    setEditMode(false);
    console.log('SaveEdit: Completed successfully');
  };
  const handleEditOutput = (output: Output) => {
    setEditingOutput(output);
    setOutputEditOpen(true);
  };
  const handleSaveOutput = (updatedOutput: Output) => {
    if (!editingOutput || !currentProject || !editingStep) return;

    // Find the output in the current editing step and update it
    const outputIndex = editingStep.outputs.findIndex(o => o.id === updatedOutput.id);
    if (outputIndex !== -1) {
      const updatedOutputs = [...editingStep.outputs];
      updatedOutputs[outputIndex] = updatedOutput;
      updateEditingStep('outputs', updatedOutputs);
    }
    setOutputEditOpen(false);
    setEditingOutput(null);
  };

  const handleAddStepInput = (inputName: string) => {
    if (!editingStep || !inputName.trim()) return;
    
    // Check if input already exists
    const existingInput = editingStep.inputs?.find(input => input.name === inputName.trim());
    if (existingInput) return;
    
    // Add new input to step
    const newInput = {
      id: `input-${Date.now()}-${Math.random()}`,
      name: inputName.trim(),
      type: 'text' as const,
      required: false
    };
    
    updateEditingStep('inputs', [...(editingStep.inputs || []), newInput]);
  };
  const updateEditingStep = (field: keyof WorkflowStep, value: any) => {
    if (!editingStep) {
      console.error('updateEditingStep: No editingStep found');
      return;
    }
    console.log('updateEditingStep:', {
      field,
      valueType: typeof value,
      hasValue: !!value
    });
    setEditingStep({
      ...editingStep,
      [field]: value
    });
  };

  // Handle import functionality
  const handleImport = (phases: Phase[]) => {
    if (!currentProject) return;
    const updatedProject = {
      ...currentProject,
      phases: [...currentProject.phases, ...phases],
      updatedAt: new Date()
    };
    updateProject(updatedProject);
    toast.success(`Imported ${phases.length} phases successfully`);
  };
  const renderContent = (step: typeof currentStep) => {
    if (!step) return null;
    
    console.log('🎨 EditWorkflowView renderContent:', {
      stepId: step.id,
      stepName: step.step,
      hasContentSections: !!step.contentSections,
      contentSectionsLength: step.contentSections?.length,
      contentSections: step.contentSections,
      contentType: (step as any).contentType,
      editMode
    });
    
    if (editMode && editingStep) {
      // Parse existing content sections or create default
      let contentSections: ContentSection[] = [];
      try {
        if (editingStep.contentSections) {
          contentSections = editingStep.contentSections;
        } else if (editingStep.content) {
          // Migrate existing content to new format
          const contentStr = typeof editingStep.content === 'string' ? editingStep.content : '';
          contentSections = [{
            id: `section-${Date.now()}`,
            type: 'text',
            content: contentStr,
            title: '',
            width: 'full',
            alignment: 'left'
          }];
        }
      } catch (e) {
        contentSections = [];
      }
      return <div className="space-y-6">
          <MultiContentEditor sections={contentSections} onChange={sections => updateEditingStep('contentSections', sections)} />
        </div>;
    }

    // Render multi-content sections if available, otherwise fallback to legacy
    if (step.contentSections && step.contentSections.length > 0) {
      return <MultiContentRenderer sections={step.contentSections} />;
    }

    // Handle case where content might be an array (content_sections)
    if (Array.isArray(step.content) && step.content.length > 0) {
      return <MultiContentRenderer sections={step.content} />;
    }

    // Fallback for steps with legacy string content
    if (typeof step.content === 'string' && step.content.trim()) {
      return <div className="text-muted-foreground whitespace-pre-wrap">
          {step.content}
        </div>;
    }

    // Show empty state only if truly no content
    return <div className="flex items-center justify-center h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg">
        <p className="text-muted-foreground">No content available. Edit this step to add content.</p>
      </div>;
  };

  // Group steps by phase and operation for sidebar navigation
  const groupedSteps = displayPhases.reduce((acc, phase) => {
    acc[phase.name] = phase.operations.reduce((opAcc, operation) => {
      opAcc[operation.name] = operation.steps;
      return opAcc;
    }, {} as Record<string, any[]>);
    return acc;
  }, {} as Record<string, Record<string, any[]>>);
  if (!currentProject) {
    return <div className="fixed inset-0 bg-background overflow-auto z-50 flex items-center justify-center">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No project selected</p>
          </CardContent>
        </Card>
      </div>;
  }
  if (viewMode === 'structure') {
    return <div className="fixed inset-0 bg-background overflow-auto z-50">
        {/* Header with Back Button and View Toggle */}
        <div className="w-full px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" onClick={onBackToAdmin} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Project Manager
            </Button>
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <Button onClick={() => setViewMode('steps')} variant={'outline'} size="sm" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Step Editor
                </Button>
                <Button onClick={() => setViewMode('structure')} variant="default" size="sm" className="flex items-center gap-2">
                  <List className="w-4 h-4" />
                  Structure Manager
                </Button>
              </div>
              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                Structure Mode
              </Badge>
            </div>
          </div>
        </div>

        <div className="w-full px-6">
          <StructureManager onBack={() => setViewMode('steps')} />
        </div>
      </div>;
  }
  if (allSteps.length === 0) {
    return <div className="fixed inset-0 bg-background overflow-auto z-50">
        <div className="w-full px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" onClick={onBackToAdmin} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Project Manager
            </Button>
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <Button onClick={() => setViewMode('steps')} variant={'outline'} size="sm" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Step Editor
                </Button>
                <Button onClick={() => setViewMode('structure')} variant={'default'} size="sm" className="flex items-center gap-2">
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
      </div>;
  }
  return <div className="fixed inset-0 bg-background overflow-auto z-50">
      {/* Header with Project Name and Controls */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Workflow Editor: {currentProject?.name || 'Untitled Project'}</h1>
            <div className="flex items-center gap-4">
              {editMode && <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  Editing: {currentStep?.step}
                </Badge>}
                <div className="flex gap-2">
                {editMode ? <>
                    <Button onClick={handleSaveEdit} size="icon" variant="outline" title="Save Changes">
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button onClick={handleCancelEdit} size="icon" variant="outline" title="Cancel">
                      <X className="w-4 h-4" />
                    </Button>
                  </> : <>
                    <Button onClick={() => setViewMode('steps')} variant="default" size="sm" className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Step Editor
                    </Button>
                    <Button onClick={() => setViewMode('structure')} variant="outline" size="sm" className="flex items-center gap-2">
                      <List className="w-4 h-4" />
                      Structure Manager
                    </Button>
                    <Button onClick={() => setImportOpen(true)} variant="outline" size="sm" className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Import
                    </Button>
                     <Button onClick={() => setProcessImprovementOpen(true)} variant="outline" size="sm" className="flex items-center gap-2">
                       <Brain className="w-4 h-4" />
                       Process Improvement
                     </Button>
                     <Button onClick={onBackToAdmin} variant="default" size="sm" className="flex items-center gap-2">
                       <Save className="w-4 h-4" />
                       Save and Close
                     </Button>
                   </>}
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-6 py-8">
        {editMode ?
      // Full-screen edit mode
      <div className="space-y-6">

            {/* Step Details */}
            {editingStep && <div className="space-y-6">
                {/* Basic Info */}
                <Card className="gradient-card border-0 shadow-card">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        {currentStep?.phaseName}
                      </Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant="outline">
                        {currentStep?.operationName}
                      </Badge>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="step-title" className="text-base font-medium">Step Title</Label>
                        <Input id="step-title" value={editingStep.step} onChange={e => updateEditingStep('step', e.target.value)} className="text-2xl font-bold mt-2" placeholder="Step title..." />
                      </div>
                      <div>
                        <Label htmlFor="step-description" className="text-base font-medium">Description</Label>
                        <Textarea id="step-description" value={editingStep.description || ''} onChange={e => updateEditingStep('description', e.target.value)} placeholder="Step description..." className="mt-2" rows={3} />
                      </div>
                      <div>
                        <Label className="text-base font-medium">Flow Type</Label>
                        <div className="mt-2">
                          <FlowTypeSelector value={editingStep.flowType} onValueChange={value => updateEditingStep('flowType', value)} />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Content Editor */}
                <Card className="gradient-card border-0 shadow-card">
                  <CardHeader>
                    <CardTitle>Step Content</CardTitle>
                    <CardDescription>Add instructions, images, videos, and other content for this step</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8">
                    {renderContent(currentStep)}
                  </CardContent>
                </Card>

                {/* Apps Section */}
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Apps & Tools
                    </CardTitle>
                    <CardDescription>
                      Interactive apps to help complete this step
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CompactAppsSection
                      apps={editingStep.apps || []}
                      onAppsChange={(apps) => updateEditingStep('apps', apps)}
                      onAddApp={() => setAppsLibraryOpen(true)}
                      onLaunchApp={() => {}}
                      editMode={true}
                    />
                  </CardContent>
                </Card>

                {/* Tools, Materials, Inputs, and Outputs */}
                <div className="grid lg:grid-cols-1 gap-6">
                  {/* Tools & Materials Card */}
                  <Card className="bg-muted/30 border shadow-sm">
                    <CardHeader>
                      <CardTitle>Tools & Materials</CardTitle>
                      <CardDescription>Manage tools and materials for this step</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <CompactToolsTable
                        tools={editingStep.tools}
                        onToolsChange={(tools) => updateEditingStep('tools', tools)}
                        onAddTool={() => setToolsLibraryOpen(true)}
                      />
                      
                      <CompactMaterialsTable
                        materials={editingStep.materials}
                        onMaterialsChange={(materials) => updateEditingStep('materials', materials)}
                        onAddMaterial={() => setMaterialsLibraryOpen(true)}
                      />
                    </CardContent>
                  </Card>

                {/* Process Variables Card */}
                  <Card className="bg-muted/30 border shadow-sm">
                    <CardHeader>
                       <CardTitle>Process Variables</CardTitle>
                       <CardDescription>Define process variables for this step</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CompactProcessVariablesTable
                        variables={editingStep.inputs || []}
                        onVariablesChange={(variables) => updateEditingStep('inputs', variables)}
                        onAddVariable={() => {
                          const newInput = {
                            id: `input-${Date.now()}-${Math.random()}`,
                            name: '',
                            type: 'text' as const,
                            required: false
                          };
                          updateEditingStep('inputs', [...(editingStep?.inputs || []), newInput]);
                        }}
                      />
                    </CardContent>
                  </Card>

                  {/* Outputs Card */}
                  <Card className="bg-muted/30 border shadow-sm">
                    <CardHeader>
                      <CardTitle>Step Outputs</CardTitle>
                      <CardDescription>Manage outputs produced by this step</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CompactOutputsTable
                        outputs={editingStep.outputs || []}
                        onOutputsChange={(outputs) => updateEditingStep('outputs', outputs)}
                        onAddOutput={() => {
                          const newOutput: Output = {
                            id: `output-${Date.now()}-${Math.random()}`,
                            name: 'New Output',
                            description: '',
                            type: 'none'
                          };
                          updateEditingStep('outputs', [...(editingStep?.outputs || []), newOutput]);
                        }}
                        onEditOutput={(output) => {
                          setEditingOutput(output);
                          setOutputEditOpen(true);
                        }}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Time Estimation */}
                <CompactTimeEstimation 
                  step={editingStep} 
                  scalingUnit={currentProject?.scalingUnit} 
                  onChange={timeEstimation => updateEditingStep('timeEstimation', timeEstimation)} 
                />

                {/* Navigation */}
                <div className="flex justify-between">
                  <Button onClick={handlePrevious} disabled={currentStepIndex === 0} variant="outline">
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous Step
                  </Button>
                  <Button onClick={handleNext} disabled={currentStepIndex >= allSteps.length - 1}>
                    Next Step
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>}
          </div> :
      // Normal grid layout with sidebar
      <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <Card className="lg:col-span-1 bg-muted/20 border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Workflow Steps</CardTitle>
                <CardDescription>
                  Step {currentStepIndex + 1} of {allSteps.length}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="space-y-4">
                  {Object.entries(groupedSteps).map(([phase, operations]) => <div key={phase} className="space-y-2">
                      <h4 className="font-semibold text-primary">{phase}</h4>
                      {Object.entries(operations).map(([operation, opSteps]) => <div key={operation} className="ml-2 space-y-1">
                          <h5 className="text-sm font-medium text-muted-foreground">{operation}</h5>
                          {opSteps.map(step => {
                    const stepIndex = allSteps.findIndex(s => s.id === step.id);
                    return <div key={step.id} className={`ml-2 p-2 rounded text-sm cursor-pointer transition-fast ${step.id === currentStep?.id ? 'bg-primary/10 text-primary border border-primary/20' : 'hover:bg-muted/50'}`} onClick={() => {
                      setCurrentStepIndex(stepIndex);
                      setEditMode(false);
                    }}>
                                <div className="flex items-center gap-2">
                                  <span className="truncate">{step.step}</span>
                                </div>
                              </div>;
                  })}
                        </div>)}
                    </div>)}
                </div>
              </CardContent>
            </Card>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Header */}
              <Card className="bg-muted/30 border shadow-sm">
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
                      <>
                        <CardTitle className="text-2xl">{currentStep?.step}</CardTitle>
                        {currentStep?.description && <CardDescription className="text-base">
                            {currentStep.description}
                          </CardDescription>}
                      </>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleStartEdit} variant="outline" size="sm">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Step
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Content */}
              <Card className="bg-muted/30 border shadow-sm">
                <CardContent className="p-8">
                  {renderContent(currentStep)}
                </CardContent>
              </Card>

              {/* Apps Section - View Mode */}
              {(() => {
                console.log('🎨 Rendering apps section:', {
                  stepId: currentStep?.id,
                  stepName: currentStep?.step,
                  hasApps: !!currentStep?.apps,
                  appsLength: currentStep?.apps?.length || 0,
                  apps: currentStep?.apps
                });
                return null;
              })()}
              
              {currentStep && currentStep.apps && currentStep.apps.length > 0 && (
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Sparkles className="w-5 h-5" />
                      Apps for This Step
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CompactAppsSection
                      apps={currentStep.apps}
                      onAppsChange={() => {}}
                      onAddApp={() => {}}
                      onLaunchApp={() => {}}
                      editMode={false}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Tools, Materials, and Outputs */}
              <Card className="bg-muted/30 border shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Tools, Materials & Outputs</h3>
                  </div>
                  <Accordion type="multiple" defaultValue={["materials", "tools", "outputs"]} className="w-full">
                    {/* Materials */}
                    {currentStep?.materials?.length > 0 && <AccordionItem value="materials">
                        <AccordionTrigger className="text-lg font-semibold">
                          Materials Needed ({currentStep?.materials?.length || 0})
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-2">
                            {currentStep.materials.map(material => <div key={material.id} className="p-3 bg-background/50 rounded-lg">
                                <div className="flex items-start gap-3">
                                  <div className="flex-1">
                                    <div className="font-medium">{material.name}</div>
                                    {material.category && <Badge variant="outline" className="text-xs mt-1">{material.category}</Badge>}
                                    {material.description && <div className="text-sm text-muted-foreground mt-1">{material.description}</div>}
                                  </div>
                                </div>
                              </div>)}
                          </div>
                        </AccordionContent>
                      </AccordionItem>}

                    {/* Tools */}
                    {currentStep?.tools?.length > 0 && <AccordionItem value="tools">
                        <AccordionTrigger className="text-lg font-semibold">
                          Tools Required ({currentStep?.tools?.length || 0})
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-2">
                            {currentStep.tools.map(tool => <div key={tool.id} className="p-3 bg-background/50 rounded-lg">
                                <div className="flex items-start gap-3">
                                  <div className="flex-1">
                                    <div className="font-medium">{tool.name}</div>
                                    {tool.category && <Badge variant="outline" className="text-xs mt-1">{tool.category}</Badge>}
                                    {tool.description && <div className="text-sm text-muted-foreground mt-1">{tool.description}</div>}
                                  </div>
                                </div>
                              </div>)}
                          </div>
                        </AccordionContent>
                      </AccordionItem>}

                    {/* Outputs */}
                    {currentStep?.outputs?.length > 0 && <AccordionItem value="outputs">
                        <AccordionTrigger className="text-lg font-semibold">
                          Outputs ({currentStep.outputs.length})
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-2">
                            {currentStep.outputs.map(output => <div key={output.id} className="p-3 bg-background/50 rounded-lg">
                                <div className="flex items-start gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                       <div className="font-medium">{output.name}</div>
                                       {output.type !== "none" && <Badge variant="outline" className="text-xs capitalize">{output.type}</Badge>}
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1">{output.description}</div>
                                  </div>
                                  
                                </div>
                              </div>)}
                          </div>
                        </AccordionContent>
                      </AccordionItem>}
                  </Accordion>
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex justify-between">
                <Button onClick={handlePrevious} disabled={currentStepIndex === 0} variant="outline">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                <Button onClick={handleNext} disabled={currentStepIndex >= allSteps.length - 1}>
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>}
      </div>

      {/* Output Edit Form */}
      {editingOutput && <OutputEditForm 
        output={editingOutput} 
        isOpen={outputEditOpen} 
        onClose={() => {
          setOutputEditOpen(false);
          setEditingOutput(null);
        }} 
        onSave={handleSaveOutput}
        stepInputs={editingStep?.inputs || []}
        onAddStepInput={handleAddStepInput}
      />}

      {/* Import Dialog */}
      <ProjectContentImport open={importOpen} onOpenChange={setImportOpen} onImport={handleImport} />
      
      {/* Process Improvement Engine Dialog */}
      {processImprovementOpen && currentProject && <ProcessImprovementEngine project={currentProject} onProjectUpdate={updateProject} onClose={() => setProcessImprovementOpen(false)} />}
      {/* Tools & Materials Library */}
      <ToolsMaterialsWindow open={toolsMaterialsOpen} onOpenChange={setToolsMaterialsOpen} />
      
      {/* Apps Library Dialog */}
      <AppsLibraryDialog
        open={appsLibraryOpen}
        onOpenChange={setAppsLibraryOpen}
        selectedApps={editingStep?.apps || []}
        onAppsSelected={(apps) => updateEditingStep('apps', apps)}
      />
      
      <MultiSelectLibraryDialog open={toolsLibraryOpen} onOpenChange={setToolsLibraryOpen} type="tools" availableStepTools={editingStep?.tools?.map(t => ({id: t.id, name: t.name})) || []} onSelect={selectedItems => {
      const newTools: StepTool[] = selectedItems.map(item => ({
        id: `tool-${Date.now()}-${Math.random()}`,
        name: item.item,
        description: item.description || '',
        category: 'Hand Tool',
        alternates: [],
        quantity: item.quantity
      }));
      updateEditingStep('tools', [...(editingStep?.tools || []), ...newTools]);
    }} />
      
      <MultiSelectLibraryDialog open={materialsLibraryOpen} onOpenChange={setMaterialsLibraryOpen} type="materials" onSelect={selectedItems => {
      const newMaterials: StepMaterial[] = selectedItems.map(item => ({
        id: `material-${Date.now()}-${Math.random()}`,
        name: item.item,
        description: item.description || '',
        category: 'Consumable',
        alternates: [],
        quantity: item.quantity
      }));
      updateEditingStep('materials', [...(editingStep?.materials || []), ...newMaterials]);
    }} />
    </div>;
}