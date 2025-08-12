import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, CheckCircle, ExternalLink, Image, Video, Edit, Save, X, ArrowLeft } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useProject } from '@/contexts/ProjectContext';
import { WorkflowStep, Material, Tool, Output } from '@/interfaces/Project';
import { toast } from 'sonner';

interface EditWorkflowViewProps {
  onBackToAdmin: () => void;
}

export default function EditWorkflowView({ onBackToAdmin }: EditWorkflowViewProps) {
  const { currentProject, updateProject } = useProject();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Flatten all steps from all phases and operations for navigation
  const allSteps = currentProject?.phases.flatMap(phase => 
    phase.operations.flatMap(operation => 
      operation.steps.map(step => ({
        ...step,
        phaseName: phase.name,
        operationName: operation.name,
        phaseId: phase.id,
        operationId: operation.id
      }))
    )
  ) || [];

  const currentStep = allSteps[currentStepIndex];
  const progress = allSteps.length > 0 ? (currentStepIndex + 1) / allSteps.length * 100 : 0;

  useEffect(() => {
    if (currentStep) {
      setEditingStep({ ...currentStep });
    }
  }, [currentStep]);

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
    toast.success('Step updated successfully');
  };

  const updateEditingStep = (field: keyof WorkflowStep, value: any) => {
    if (!editingStep) return;
    setEditingStep({ ...editingStep, [field]: value });
  };

  const renderContent = (step: typeof currentStep) => {
    if (!step) return null;

    if (editMode && editingStep) {
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="step-content">Step Content</Label>
            <Textarea
              id="step-content"
              value={editingStep.content}
              onChange={(e) => updateEditingStep('content', e.target.value)}
              className="min-h-[200px]"
              placeholder="Enter step content..."
            />
          </div>
          <div>
            <Label htmlFor="content-type">Content Type</Label>
            <Select 
              value={editingStep.contentType} 
              onValueChange={(value) => updateEditingStep('contentType', value)}
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
        </div>
      );
    }

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
            <img src={step.content} alt={step.step} className="w-full rounded-lg shadow-card max-w-2xl" />
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
          </CardContent>
        </Card>
      </div>
    );
  }

  if (allSteps.length === 0) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={onBackToAdmin} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Admin
          </Button>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              This project has no workflow steps. Add some steps in the admin view first.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBackToAdmin} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Admin
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            Edit Mode
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
    </div>
  );
}