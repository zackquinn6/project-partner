import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Play, CheckCircle, ExternalLink, Image, Video, AlertTriangle, Edit, Save, X, Upload, Info, ChevronDown, ChevronUp, FileText, ShoppingCart, Lock, Users } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useProject } from '@/contexts/ProjectContext';
import { WorkflowStep, Output } from '@/interfaces/Project';
import { OutputDetailPopup } from './OutputDetailPopup';
import { AccountabilityMessagePopup } from './AccountabilityMessagePopup';
import { ExpertHelpWindow } from './ExpertHelpWindow';
import { PhaseCompletionPopup } from './PhaseCompletionPopup';
import { MaterialsSelectionWindow } from './MaterialsSelectionWindow';
import { MultiContentRenderer } from './MultiContentRenderer';
import { OrderingWindow } from './OrderingWindow';
import { SignatureCapture } from './SignatureCapture';
import { StepCompletionTracker } from './StepCompletionTracker';
import { EnhancedProjectPlanning } from './EnhancedProjectPlanning';
import { toast } from "@/hooks/use-toast";

interface EditableUserViewProps {
  onBackToAdmin: () => void;
  isAdminEditing?: boolean;
}

export default function EditableUserView({ onBackToAdmin, isAdminEditing = false }: EditableUserViewProps) {
  const { currentProject, currentProjectRun, updateProject, updateProjectRun } = useProject();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  
  // Initialize completed steps from project run data and prevent duplicates
  useEffect(() => {
    if (currentProjectRun?.completedSteps) {
      // Parse the JSON data and create a unique Set to prevent duplicates
      let steps: string[] = [];
      try {
        if (typeof currentProjectRun.completedSteps === 'string') {
          steps = JSON.parse(currentProjectRun.completedSteps);
        } else if (Array.isArray(currentProjectRun.completedSteps)) {
          steps = currentProjectRun.completedSteps;
        }
        // Create Set to eliminate duplicates, then convert back to Set
        const uniqueSteps = [...new Set(steps)];
        setCompletedSteps(new Set(uniqueSteps));
      } catch (error) {
        console.error('Error parsing completed steps:', error);
        setCompletedSteps(new Set());
      }
    } else {
      setCompletedSteps(new Set());
    }
  }, [currentProjectRun?.id]);  // Only depend on project run ID to prevent loops
  const [checkedMaterials, setCheckedMaterials] = useState<Record<string, Set<string>>>({});
  const [checkedTools, setCheckedTools] = useState<Record<string, Set<string>>>({});
  const [checkedOutputs, setCheckedOutputs] = useState<Record<string, Set<string>>>({});
  const [selectedOutput, setSelectedOutput] = useState<Output | null>(null);
  const [outputPopupOpen, setOutputPopupOpen] = useState(false);
  const [accountabilityPopupOpen, setAccountabilityPopupOpen] = useState(false);
  const [messageType, setMessageType] = useState<'phase-complete' | 'issue-report'>('phase-complete');
  const [expertHelpOpen, setExpertHelpOpen] = useState(false);
  const [phaseCompletionPopupOpen, setPhaseCompletionPopupOpen] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<any>(null);
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set());
  const [signatures, setSignatures] = useState<Record<string, string>>({});
  const [orderingWindowOpen, setOrderingWindowOpen] = useState(false);
  const [completionTrackerOpen, setCompletionTrackerOpen] = useState(false);
  const [stepCompletionPercentages, setStepCompletionPercentages] = useState<Record<string, number>>(
    currentProjectRun?.stepCompletionPercentages || {}
  );
  
  // Editing state
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  // Flatten all steps from all phases and operations for navigation
  const allSteps = currentProject ? currentProject.phases.flatMap((phase, phaseIndex) =>
    phase.operations.flatMap((operation, operationIndex) =>
      operation.steps.map((step, stepIndex) => ({
        ...step,
        phaseId: phase.id,
        phaseName: phase.name,
        operationId: operation.id,
        operationName: operation.name,
        phaseIndex,
        operationIndex,
        stepIndex
      }))
    )
  ) : [];

  const currentStep = allSteps[currentStepIndex];
  const progress = allSteps.length > 0 ? completedSteps.size / allSteps.length * 100 : 0;

  const handleNext = () => {
    if (currentStepIndex < allSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  // Start editing a step
  const startEditing = (step: any) => {
    setEditingStep(step.id);
    setEditData({
      step: step.step,
      description: step.description,
      content: step.content,
      contentType: step.contentType
    });
  };

  // Save edits
  const saveEdits = () => {
    if (!currentProject || !editingStep) return;

    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.map(phase => ({
        ...phase,
        operations: phase.operations.map(operation => ({
          ...operation,
          steps: operation.steps.map(step => 
            step.id === editingStep 
              ? { ...step, ...editData }
              : step
          )
        }))
      }))
    };

    updateProject(updatedProject);
    setEditingStep(null);
    setEditData({});
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingStep(null);
    setEditData({});
  };

  // Helper functions for check-off functionality
  const toggleMaterialCheck = (stepId: string, materialId: string) => {
    setCheckedMaterials(prev => {
      const stepMaterials = prev[stepId] || new Set();
      const newSet = new Set(stepMaterials);
      if (newSet.has(materialId)) {
        newSet.delete(materialId);
      } else {
        newSet.add(materialId);
      }
      return { ...prev, [stepId]: newSet };
    });
  };

  const toggleToolCheck = (stepId: string, toolId: string) => {
    setCheckedTools(prev => {
      const stepTools = prev[stepId] || new Set();
      const newSet = new Set(stepTools);
      if (newSet.has(toolId)) {
        newSet.delete(toolId);
      } else {
        newSet.add(toolId);
      }
      return { ...prev, [stepId]: newSet };
    });
  };

  const toggleOutputCheck = (stepId: string, outputId: string) => {
    setCheckedOutputs(prev => {
      const stepOutputs = prev[stepId] || new Set();
      const newSet = new Set(stepOutputs);
      if (newSet.has(outputId)) {
        newSet.delete(outputId);
      } else {
        newSet.add(outputId);
      }
      return { ...prev, [stepId]: newSet };
    });
  };

  // Check if prerequisites are met for a step
  const arePrerequisitesMet = (step: WorkflowStep | (typeof currentStep)) => {
    if (!step || !currentProject) return true;
    
    // Find the operation containing this step
    const operation = currentProject.phases
      .flatMap(p => p.operations)
      .find(op => op.steps.some(s => s.id === step.id));
    
    if (!operation?.dependentOn) return true;
    
    // Find all steps in the dependent operation
    const dependentOperation = currentProject.phases
      .flatMap(p => p.operations)
      .find(op => op.id === operation.dependentOn);
    
    if (!dependentOperation) return true;
    
    // Check if all steps in the dependent operation are completed
    // Note: EditableUserView doesn't have spaceId context, so check globally
    const dependentSteps = dependentOperation.steps.map(s => s.id);
    return dependentSteps.every(stepId => isStepCompleted(completedSteps, stepId));
  };

  // Check if all outputs are completed (required for step completion)
  const areAllOutputsCompleted = (step: typeof currentStep) => {
    if (!step || !step.outputs || step.outputs.length === 0) return true;
    
    // Special validation for safety agreement step - require signature
    if (step.id === 'safety-agreement-step') {
      return signatures[step.id] !== undefined;
    }
    
    const stepOutputs = checkedOutputs[step.id] || new Set();
    return step.outputs.every(output => stepOutputs.has(output.id));
  };

  // Helper functions for phase completion check
  const getCurrentPhase = () => {
    if (!currentStep || !currentProject) return null;
    
    for (const phase of currentProject.phases) {
      for (const operation of phase.operations) {
        if (operation.steps.some(step => step.id === currentStep.id)) {
          return phase;
        }
      }
    }
    return null;
  };

  const getAllStepsInPhase = (phase: any) => {
    if (!phase) return [];
    return phase.operations.flatMap((operation: any) => operation.steps);
  };

  const togglePhaseCollapse = (phaseId: string) => {
    setCollapsedPhases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phaseId)) {
        newSet.delete(phaseId);
      } else {
        newSet.add(phaseId);
      }
      return newSet;
    });
  };

  const handleCompletePhase = (phase: any) => {
    setSelectedPhase(phase);
    setPhaseCompletionPopupOpen(true);
  };

  const handlePhaseCompleted = () => {
    if (!selectedPhase) return;
    
    // Mark all steps in the phase as completed
    const phaseSteps = getAllStepsInPhase(selectedPhase);
    const newCompletedSteps = new Set([...completedSteps, ...phaseSteps.map(step => step.id)]);
    setCompletedSteps(newCompletedSteps);
    
    setMessageType('phase-complete');
    setAccountabilityPopupOpen(true);
  };

  const handleComplete = () => {
    if (currentStep) {
      setCompletionTrackerOpen(true);
    }
  };

  const handleStepCompletion = async (percentage: number) => {
    if (!currentStep || !currentProjectRun) return;

    // Update step completion percentage
    const newPercentages = {
      ...stepCompletionPercentages,
      [currentStep.id]: percentage
    };
    setStepCompletionPercentages(newPercentages);

    // Only mark as completed if 100%
    // Note: EditableUserView doesn't have spaceId context, so use simple key
    // This is fine for admin editing where per-space tracking isn't needed
    let newCompletedSteps = new Set(completedSteps);
    if (percentage === 100) {
      const completionKey = getStepCompletionKey(currentStep.id); // No spaceId for admin view
      newCompletedSteps.add(completionKey);
      setCompletedSteps(newCompletedSteps);
    } else {
      // Remove from completed if less than 100%
      // Remove both simple and composite keys for this step
      newCompletedSteps.delete(currentStep.id);
      // Also remove any composite keys (stepId:spaceId)
      const keysToRemove: string[] = [];
      newCompletedSteps.forEach(key => {
        if (key.startsWith(`${currentStep.id}:`)) {
          keysToRemove.push(key);
        }
      });
      keysToRemove.forEach(key => newCompletedSteps.delete(key));
      setCompletedSteps(newCompletedSteps);
    }

    // Update project run with new percentages
    await updateProjectRun({
      ...currentProjectRun,
      stepCompletionPercentages: newPercentages,
      completedSteps: Array.from(newCompletedSteps),
      updatedAt: new Date()
    });

    setCompletionTrackerOpen(false);

    // Check for phase completion only if step is 100%
    if (percentage === 100) {
      const currentPhase = getCurrentPhase();
      if (currentPhase) {
        const allPhaseSteps = getAllStepsInPhase(currentPhase);
        const completedPhaseSteps = allPhaseSteps.filter(step => 
          newCompletedSteps.has(step.id)
        );

        if (completedPhaseSteps.length === allPhaseSteps.length) {
          // Phase is complete - show phase completion popup
          setSelectedPhase(currentPhase);
          setPhaseCompletionPopupOpen(true);
        }
      }
      
      // Auto-advance to next step if completed
      if (currentStepIndex < allSteps.length - 1) {
        setTimeout(() => {
          setCurrentStepIndex(currentStepIndex + 1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 500);
      }
    }
  };

  const renderEditableContent = (step: typeof currentStep) => {
    if (!step) return null;
    
    const isEditing = editingStep === step.id;
    
    if (isEditing) {
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="content-type">Content Type</Label>
            <Select value={editData.contentType || 'text'} onValueChange={(value) => setEditData(prev => ({ ...prev, contentType: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="document">Document/Link</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="content">Content</Label>
            {editData.contentType === 'text' ? (
              <Textarea 
                value={editData.content || ''} 
                onChange={(e) => setEditData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter step instructions..."
                rows={8}
              />
            ) : (
              <Input 
                value={editData.content || ''} 
                onChange={(e) => setEditData(prev => ({ ...prev, content: e.target.value }))}
                placeholder={
                  editData.contentType === 'image' ? 'Enter image URL...' :
                  editData.contentType === 'video' ? 'Enter video URL...' :
                  'Enter document/link URL...'
                }
              />
            )}
          </div>
          
          <div className="flex gap-2">
            <Button onClick={saveEdits} size="icon" variant="outline">
              <Save className="w-4 h-4" />
            </Button>
            <Button onClick={cancelEditing} variant="outline" size="icon">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      );
    }

    // Check if content is an array (content_sections from normalized tables)
    if (Array.isArray(step.content) && step.content.length > 0) {
      return <MultiContentRenderer sections={step.content} />;
    }

    // Legacy content display based on contentType
    const contentStr = typeof step.content === 'string' ? step.content : '';
    
    switch (step.contentType) {
      case 'image':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Image className="w-5 h-5 text-primary" />
              <span className="font-medium">Visual Reference</span>
            </div>
            {step.image && <img src={step.image} alt={step.step} className="w-full rounded-lg shadow-card max-w-2xl" />}
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap">{contentStr}</div>
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
              <iframe src={contentStr} className="w-full h-full" allowFullScreen title={step.step} />
            </div>
          </div>
        );
      case 'document':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-primary" />
              <span className="font-medium">Document</span>
            </div>
            <div className="prose max-w-none bg-muted/20 p-6 rounded-lg border">
              <div className="whitespace-pre-wrap text-foreground leading-relaxed text-sm">
                {contentStr}
              </div>
            </div>
            
            {/* Add signature capture for safety agreement step */}
            {step.id === 'safety-agreement-step' && (
              <div className="mt-6">
                <SignatureCapture
                  onSignatureComplete={(signature) => {
                    setSignatures(prev => ({ ...prev, [step.id]: signature }));
                  }}
                  onClear={() => {
                    setSignatures(prev => {
                      const newSignatures = { ...prev };
                      delete newSignatures[step.id];
                      return newSignatures;
                    });
                  }}
                />
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-foreground leading-relaxed">
              {contentStr}
            </div>
          </div>
        );
    }
  };

  // Group steps by phase and operation for sidebar navigation
  const groupedSteps = currentProject?.phases.reduce((acc, phase) => {
    acc[phase.name] = phase.operations.reduce((opAcc, operation) => {
      opAcc[operation.name] = operation.steps;
      return opAcc;
    }, {} as Record<string, any[]>);
    return acc;
  }, {} as Record<string, Record<string, any[]>>) || {};

  if (!currentProject) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No project selected</p>
            <Button onClick={onBackToAdmin} className="mt-4">Back to Admin</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If current project has no workflow steps
  if (allSteps.length === 0) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              This project under construction - check back soon!
            </p>
            <Button onClick={onBackToAdmin} className="mt-4">Back to Admin</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6">
        <Button onClick={onBackToAdmin} variant="outline">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Admin
        </Button>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar - Move Help button to top */}
        <Card className="lg:col-span-1 gradient-card border-0 shadow-card">
          <CardHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Workflow Progress</CardTitle>
                  <CardDescription>
                    Step {currentStepIndex + 1} of {allSteps.length}
                  </CardDescription>
                </div>
              </div>
              
              {/* Help button prominently at top */}
              <Button 
                variant="outline" 
                onClick={() => setExpertHelpOpen(true)}
                className="w-full bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
              >
                Expert Virtual Consults
              </Button>
            </div>
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
              {currentProject ? currentProject.phases.map((phase) => {
                const phaseSteps = getAllStepsInPhase(phase);
                const completedPhaseSteps = phaseSteps.filter(step => 
                  isStepCompleted(completedSteps, step.id)
                );
                const isPhaseComplete = phaseSteps.length > 0 && completedPhaseSteps.length === phaseSteps.length;
                const isCollapsed = collapsedPhases.has(phase.id);
                
                return (
                  <div key={phase.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div 
                        className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors flex-1"
                        onClick={() => togglePhaseCollapse(phase.id)}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                        <h4 className="font-semibold text-primary">{phase.name}</h4>
                        {isPhaseComplete && <CheckCircle className="w-4 h-4 text-green-600" />}
                        <span className="text-xs text-muted-foreground">
                          ({completedPhaseSteps.length}/{phaseSteps.length})
                        </span>
                      </div>
                      {!isAdminEditing && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCompletePhase(phase)}
                          className="text-xs px-2 py-1 h-6"
                        >
                          Complete Phase
                        </Button>
                      )}
                    </div>
                    
                    {!isCollapsed && (
                      <div className="ml-6 space-y-2">
                        {phase.operations.map((operation) => (
                          <div key={operation.id} className="space-y-1">
                            <h5 className="text-sm font-medium text-muted-foreground">{operation.name}</h5>
                            {operation.steps.map(step => {
                              const stepIndex = allSteps.findIndex(s => s.id === step.id);
                              const completionPercentage = stepCompletionPercentages[step.id] || 0;
                              const isInProgress = completionPercentage > 0 && completionPercentage < 100;
                              const isCompleted = isStepCompleted(completedSteps, step.id);
                              const hasUnmetPrerequisites = !arePrerequisitesMet(step);
                              
                              return (
                                 <div 
                                   key={step.id} 
                                   className={`ml-2 p-2 rounded text-sm cursor-pointer transition-fast ${
                                     step.id === currentStep?.id ? 'bg-primary/10 text-primary border border-primary/20' : 
                                     isCompleted ? 'bg-green-50 text-green-700 border border-green-200' : 
                                     isInProgress ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                                     hasUnmetPrerequisites ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                                     'hover:bg-muted/50 border border-transparent hover:border-muted-foreground/20'
                                   }`} 
                                    onClick={() => {
                                      if (stepIndex >= 0) {
                                        // Check prerequisites before navigation
                                        if (hasUnmetPrerequisites && !isAdminEditing) {
                                          // Find the dependent operation name for better messaging
                                          const dependentOp = currentProject?.phases
                                            .flatMap(p => p.operations)
                                            .find(op => op.steps.some(s => s.id === step.id))
                                            ?.dependentOn;
                                          
                                          const dependentOpName = currentProject?.phases
                                            .flatMap(p => p.operations)
                                            .find(op => op.id === dependentOp)?.name;
                                          
                                          toast({
                                            title: "Prerequisites Not Met",
                                            description: dependentOpName 
                                              ? `You must complete "${dependentOpName}" before accessing this step.`
                                              : "You must complete prerequisite steps before accessing this step.",
                                            variant: "destructive",
                                          });
                                          return;
                                        }
                                        
                                        setCurrentStepIndex(stepIndex);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                      }
                                    }}
                                 >
                                  <div className="flex items-center gap-2 justify-between">
                                    <div className="flex items-center gap-2">
                                      {hasUnmetPrerequisites && !isCompleted && <Lock className="w-4 h-4 text-orange-500" />}
                                      {isCompleted && <CheckCircle className="w-4 h-4" />}
                                      {isInProgress && <div className="w-4 h-4 rounded-full bg-yellow-400 border-2 border-yellow-600" />}
                                      <span className="truncate">{step.step}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {step.workersNeeded && step.workersNeeded > 0 && (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-blue-100 text-blue-700 border-blue-300 flex items-center gap-1">
                                          <Users className="w-2.5 h-2.5" />
                                          {step.workersNeeded}
                                        </Badge>
                                      )}
                                      {hasUnmetPrerequisites && !isCompleted && (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-orange-100 text-orange-700 border-orange-300">
                                          Locked
                                        </Badge>
                                      )}
                                      {isInProgress && (
                                        <span className="text-xs font-medium text-yellow-600">
                                          {completionPercentage}%
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }) : null}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Content Header */}
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
                  {editingStep === currentStep?.id ? (
                    <div className="space-y-2">
                      <Input 
                        value={editData.step || ''} 
                        onChange={(e) => setEditData(prev => ({ ...prev, step: e.target.value }))}
                        className="text-2xl font-bold"
                        placeholder="Step title..."
                      />
                      <Textarea 
                        value={editData.description || ''} 
                        onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Step description..."
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
                <div className="flex items-center gap-2">
                <Button 
                  onClick={() => {
                    if (currentStep) {
                      startEditing(currentStep.id);
                    }
                  }} 
                  variant="outline" 
                  size="sm"
                  disabled={editingStep === currentStep?.id}
                >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Step
                  </Button>

                  
                  {/* Don't show ordering button for ordering steps since it's now in content */}
                  
                  {/* Debug button to always show ordering - remove after testing */}
                  <Button 
                    onClick={() => {
                      setOrderingWindowOpen(true);
                    }}
                    variant="outline"
                    className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Debug Shop
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Content */}
          <Card className="gradient-card border-0 shadow-card">
            <CardContent className="p-8">
              {/* Prerequisite Warning Banner */}
              {currentStep && !arePrerequisitesMet(currentStep) && !isAdminEditing && (
                <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-orange-900 mb-1">Prerequisites Required</h4>
                    <p className="text-sm text-orange-800">
                      This step requires completion of previous operations before you can proceed. 
                      Complete the prerequisite steps first to unlock this content.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Show Enhanced Project Planning for Planning phase steps */}
              {currentStep?.phaseName === 'Planning' && (
                currentStep.step.includes('Project Work Scope') || 
                currentStep.step.includes('Project Scheduling') ||
                currentStep.step.includes('Final Planning')
              ) ? (
                <EnhancedProjectPlanning
                  onComplete={() => {
                    // Mark this planning step as complete when sizing is done
                    handleStepCompletion(100);
                  }}
                  isCompleted={isStepCompleted(completedSteps, currentStep.id)}
                />
              ) : (
                renderEditableContent(currentStep)
              )}
            </CardContent>
          </Card>

          {/* Materials, Tools, and Outputs - Hide for ordering steps since they don't need materials/tools */}
          {currentStep && 
            !(currentStep.step === 'Tool & Material Ordering' || 
              currentStep.phaseName === 'Ordering' || 
              currentStep.id === 'ordering-step-1') &&
            (currentStep.materials?.length > 0 || currentStep.tools?.length > 0 || currentStep.outputs?.length > 0) && (
            <Card className="gradient-card border-0 shadow-card">
              <CardContent className="p-6">
                <Accordion type="multiple" defaultValue={["materials", "tools", "outputs"]} className="w-full">
                  {/* Materials */}
                  {currentStep.materials?.length > 0 && (() => {
                    const stepMaterials = checkedMaterials[currentStep.id] || new Set();
                    const completedCount = stepMaterials.size;
                    const totalCount = currentStep.materials.length;
                    const isAllCompleted = completedCount === totalCount;
                    
                    return (
                      <AccordionItem value="materials">
                        <AccordionTrigger className="text-base font-semibold py-3">
                          <div className="flex items-center gap-2">
                            <span>Materials Needed</span>
                            <Badge variant={isAllCompleted ? "default" : "outline"} className={isAllCompleted ? "bg-green-500 text-white" : ""}>
                              {completedCount}/{totalCount}
                            </Badge>
                            {isAllCompleted && <CheckCircle className="w-4 h-4 text-green-500" />}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pt-1">
                            {currentStep.materials.map(material => (
                              <div key={material.id} className="p-2 bg-background/50 rounded-lg">
                                <div className="flex items-start gap-2">
                                  <Checkbox 
                                    id={`material-${material.id}`}
                                    checked={stepMaterials.has(material.id)}
                                    onCheckedChange={() => toggleMaterialCheck(currentStep.id, material.id)}
                                    className="mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium">{material.name}</div>
                                    {material.description && <div className="text-xs text-muted-foreground mt-0.5">{material.description}</div>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })()}

                  {/* Tools */}
                  {currentStep.tools?.length > 0 && (() => {
                    const stepTools = checkedTools[currentStep.id] || new Set();
                    const completedCount = stepTools.size;
                    const totalCount = currentStep.tools.length;
                    const isAllCompleted = completedCount === totalCount;
                    
                    return (
                      <AccordionItem value="tools">
                        <AccordionTrigger className="text-base font-semibold py-3">
                          <div className="flex items-center gap-2">
                            <span>Tools Required</span>
                            <Badge variant={isAllCompleted ? "default" : "outline"} className={isAllCompleted ? "bg-green-500 text-white" : ""}>
                              {completedCount}/{totalCount}
                            </Badge>
                            {isAllCompleted && <CheckCircle className="w-4 h-4 text-green-500" />}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pt-1">
                            {currentStep.tools.map(tool => (
                              <div key={tool.id} className="p-2 bg-background/50 rounded-lg">
                                <div className="flex items-start gap-2">
                                  <Checkbox 
                                    id={`tool-${tool.id}`}
                                    checked={stepTools.has(tool.id)}
                                    onCheckedChange={() => toggleToolCheck(currentStep.id, tool.id)}
                                    className="mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <div className="text-sm font-medium">{tool.name}</div>
                                      {tool.alternates && tool.alternates.length > 0 && <Badge variant="outline" className="text-xs">+{tool.alternates.length} alt</Badge>}
                                    </div>
                                    {tool.description && <div className="text-xs text-muted-foreground mt-0.5">{tool.description}</div>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })()}

                  {/* Outputs */}
                  {currentStep.outputs?.length > 0 && (() => {
                    const stepOutputs = checkedOutputs[currentStep.id] || new Set();
                    const completedCount = stepOutputs.size;
                    const totalCount = currentStep.outputs.length;
                    const isAllCompleted = completedCount === totalCount;
                    
                    return (
                      <AccordionItem value="outputs">
                        <AccordionTrigger className="text-base font-semibold py-3">
                          <div className="flex items-center gap-2">
                            <span>Outputs</span>
                            <Badge variant={isAllCompleted ? "default" : "outline"} className={isAllCompleted ? "bg-green-500 text-white" : ""}>
                              {completedCount}/{totalCount}
                            </Badge>
                            {isAllCompleted && <CheckCircle className="w-4 h-4 text-green-500" />}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pt-1">
                            {currentStep.outputs.map(output => (
                              <div key={output.id} className="p-2 bg-background/50 rounded-lg">
                                <div className="flex items-start gap-2">
                                  <Checkbox 
                                    id={`output-${output.id}`}
                                    checked={stepOutputs.has(output.id)}
                                    onCheckedChange={() => toggleOutputCheck(currentStep.id, output.id)}
                                    className="mt-0.5"
                                  />
                                   <div className="flex-1 min-w-0">
                                     <div className="flex items-center gap-2">
                                       <div className="text-sm font-medium">{output.name}</div>
                                       {output.type !== 'none' && (
                                         <Badge variant="outline" className="text-xs capitalize">{output.type}</Badge>
                                       )}
                                       <button
                                         onClick={() => {
                                           setSelectedOutput(output);
                                           setOutputPopupOpen(true);
                                         }}
                                         className="p-1 rounded-full hover:bg-muted transition-colors"
                                         title="View output details"
                                       >
                                         <Info className="w-3 h-3 text-muted-foreground hover:text-primary" />
                                       </button>
                                     </div>
                                     {output.description && <div className="text-xs text-muted-foreground mt-0.5">{output.description}</div>}
                                   </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })()}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <Card className="gradient-card border-0 shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <Button
                  onClick={handlePrevious}
                  disabled={currentStepIndex === 0}
                  variant="outline"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                
                {!isAdminEditing && (
                  <div className="flex items-center gap-4">
                    {currentStep && (
                      <Button
                        onClick={handleComplete}
                        disabled={!areAllOutputsCompleted(currentStep)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Complete Step
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setMessageType('issue-report');
                        setAccountabilityPopupOpen(true);
                      }}
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Report Issue
                    </Button>
                  </div>
                )}

                <Button
                  onClick={handleNext}
                  disabled={currentStepIndex >= allSteps.length - 1}
                  variant="outline"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Output Detail Popup */}
      {selectedOutput && (
        <OutputDetailPopup
          output={selectedOutput}
          isOpen={outputPopupOpen}
          onClose={() => {
            setOutputPopupOpen(false);
            setSelectedOutput(null);
          }}
        />
      )}

      {/* Accountability Partner Message Popup */}
      <AccountabilityMessagePopup
        isOpen={accountabilityPopupOpen}
        onClose={() => setAccountabilityPopupOpen(false)}
        messageType={messageType}
        progress={progress}
        projectName={currentProject?.name}
      />
      
      {/* Expert Help Window */}
      <ExpertHelpWindow
        isOpen={expertHelpOpen}
        onClose={() => setExpertHelpOpen(false)}
      />

      {/* Phase Completion Popup */}
      <PhaseCompletionPopup
        open={phaseCompletionPopupOpen}
        onOpenChange={setPhaseCompletionPopupOpen}
        phase={selectedPhase}
        checkedOutputs={checkedOutputs}
        onOutputToggle={toggleOutputCheck}
        onPhaseComplete={handlePhaseCompleted}
      />

      {/* Step Completion Tracker */}
      {completionTrackerOpen && currentStep && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <StepCompletionTracker
            stepId={currentStep.id}
            stepName={currentStep.step}
            currentPercentage={stepCompletionPercentages[currentStep.id] || 100}
            onComplete={handleStepCompletion}
            onCancel={() => setCompletionTrackerOpen(false)}
          />
        </div>
      )}

      {/* Materials Selection Window */}
      <MaterialsSelectionWindow
        open={false}
        onOpenChange={() => {}}
        project={null}
        projectRun={currentProjectRun}
        completedSteps={new Set()}
        onSelectionComplete={() => {}}
      />

      {/* Ordering Window */}
      <OrderingWindow
        open={orderingWindowOpen}
        onOpenChange={setOrderingWindowOpen}
        project={currentProject}
        projectRun={currentProjectRun}
        userOwnedTools={[]}
        onOrderingComplete={() => {
          // Mark the ordering step as complete
          if (currentStep?.id === 'ordering-step-1') {
            handleComplete();
          }
          setOrderingWindowOpen(false);
        }}
      />
    </div>
  );
}