import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Play, CheckCircle, ExternalLink, Image, Video } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useProject } from '@/contexts/ProjectContext';
import ProjectListing from './ProjectListing';
interface UserViewProps {
  resetToListing?: boolean;
}
export default function UserView({
  resetToListing
}: UserViewProps = {}) {
  const {
    currentProject
  } = useProject();
  const [viewMode, setViewMode] = useState<'listing' | 'workflow'>('listing');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [checkedMaterials, setCheckedMaterials] = useState<Record<string, Set<string>>>({});
  const [checkedTools, setCheckedTools] = useState<Record<string, Set<string>>>({});
  const [checkedOutputs, setCheckedOutputs] = useState<Record<string, Set<string>>>({});

  // Flatten all steps from all phases and operations for navigation
  const allSteps = currentProject?.phases.flatMap(phase => phase.operations.flatMap(operation => operation.steps.map(step => ({
    ...step,
    phaseName: phase.name,
    operationName: operation.name
  })))) || [];

  // Auto-switch to workflow view when a project is selected
  useEffect(() => {
    if (currentProject && allSteps.length > 0) {
      setViewMode('workflow');
    }
  }, [currentProject, allSteps.length]);

  // Reset to listing view when projects view is requested
  useEffect(() => {
    if (resetToListing) {
      setViewMode('listing');
    }
  }, [resetToListing]);
  const currentStep = allSteps[currentStepIndex];
  const progress = allSteps.length > 0 ? (currentStepIndex + 1) / allSteps.length * 100 : 0;
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

  // Check if all outputs are completed (required for step completion)
  const areAllOutputsCompleted = (step: typeof currentStep) => {
    if (!step || !step.outputs || step.outputs.length === 0) return true;
    const stepOutputs = checkedOutputs[step.id] || new Set();
    return step.outputs.every(output => stepOutputs.has(output.id));
  };

  const handleComplete = () => {
    if (currentStep && areAllOutputsCompleted(currentStep)) {
      setCompletedSteps(prev => new Set([...prev, currentStep.id]));
      if (currentStepIndex < allSteps.length - 1) {
        handleNext();
      }
    }
  };
  const renderContent = (step: typeof currentStep) => {
    if (!step) return null;
    switch (step.contentType) {
      case 'document':
        return <div className="space-y-4">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ExternalLink className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-orange-800">External Resource</span>
              </div>
              <a href={step.content} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-800 underline break-all">
                {step.content}
              </a>
            </div>
          </div>;
      case 'image':
        return <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Image className="w-5 h-5 text-primary" />
              <span className="font-medium">Visual Reference</span>
            </div>
            <img src={step.content} alt={step.step} className="w-full rounded-lg shadow-card max-w-2xl" />
          </div>;
      case 'video':
        return <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Video className="w-5 h-5 text-primary" />
              <span className="font-medium">Tutorial Video</span>
            </div>
            <div className="aspect-video rounded-lg overflow-hidden shadow-card">
              <iframe src={step.content} className="w-full h-full" allowFullScreen title={step.step} />
            </div>
          </div>;
      default:
        return <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-foreground leading-relaxed">
              {step.content}
            </div>
          </div>;
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
  // If no current project selected or viewing listing mode, show project listing
  if (!currentProject || viewMode === 'listing') {
    return <ProjectListing onProjectSelect={project => setViewMode('workflow')} />;
  }

  // If current project has no workflow steps
  if (allSteps.length === 0) {
    return <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              This project under construction - check back soon!
            </p>
          </CardContent>
        </Card>
      </div>;
  }
  return <div className="container mx-auto px-6 py-8">
      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <Card className="lg:col-span-1 gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Workflow Progress</CardTitle>
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
              {Object.entries(groupedSteps).map(([phase, operations]) => <div key={phase} className="space-y-2">
                  <h4 className="font-semibold text-primary">{phase}</h4>
                  {Object.entries(operations).map(([operation, opSteps]) => <div key={operation} className="ml-2 space-y-1">
                      <h5 className="text-sm font-medium text-muted-foreground">{operation}</h5>
                      {opSteps.map(step => {
                  const stepIndex = allSteps.findIndex(s => s.id === step.id);
                  return <div key={step.id} className={`ml-2 p-2 rounded text-sm cursor-pointer transition-fast ${step.id === currentStep?.id ? 'bg-primary/10 text-primary border border-primary/20' : completedSteps.has(step.id) ? 'bg-green-50 text-green-700 border border-green-200' : 'hover:bg-muted/50'}`} onClick={() => setCurrentStepIndex(stepIndex)}>
                            <div className="flex items-center gap-2">
                              {completedSteps.has(step.id) && <CheckCircle className="w-4 h-4" />}
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
          <Card className="gradient-card border-0 shadow-card">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {currentStep?.phaseName}
                </Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="outline">
                  {currentStep?.operationName}
                </Badge>
              </div>
              <CardTitle className="text-2xl">{currentStep?.step}</CardTitle>
              {currentStep?.description && <CardDescription className="text-base">
                  {currentStep.description}
                </CardDescription>}
            </CardHeader>
          </Card>

          {/* Content */}
          <Card className="gradient-card border-0 shadow-card">
            <CardContent className="p-8">
              {renderContent(currentStep)}
            </CardContent>
          </Card>

          {/* Materials, Tools, and Outputs */}
          {currentStep && (currentStep.materials?.length > 0 || currentStep.tools?.length > 0 || currentStep.outputs?.length > 0) && <Card className="gradient-card border-0 shadow-card">
              <CardContent className="p-6">
                <Accordion type="multiple" className="w-full">
                  {/* Materials */}
                  {currentStep.materials?.length > 0 && (() => {
                    const stepMaterials = checkedMaterials[currentStep.id] || new Set();
                    const completedCount = stepMaterials.size;
                    const totalCount = currentStep.materials.length;
                    const isAllCompleted = completedCount === totalCount;
                    
                    return <AccordionItem value="materials">
                      <AccordionTrigger className="text-lg font-semibold">
                        <div className="flex items-center gap-2">
                          <span>Materials Needed</span>
                          <Badge variant={isAllCompleted ? "default" : "outline"} className={isAllCompleted ? "bg-green-500 text-white" : ""}>
                            {completedCount}/{totalCount}
                          </Badge>
                          {isAllCompleted && <CheckCircle className="w-4 h-4 text-green-500" />}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {currentStep.materials.map(material => <div key={material.id} className="p-3 bg-background/50 rounded-lg">
                              <div className="flex items-start gap-3">
                                <Checkbox 
                                  id={`material-${material.id}`}
                                  checked={stepMaterials.has(material.id)}
                                  onCheckedChange={() => toggleMaterialCheck(currentStep.id, material.id)}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <div className="font-medium">{material.name}</div>
                                  {material.category && <Badge variant="outline" className="text-xs mt-1">{material.category}</Badge>}
                                  {material.description && <div className="text-sm text-muted-foreground mt-1">{material.description}</div>}
                                </div>
                              </div>
                            </div>)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>;
                  })()}

                  {/* Tools */}
                  {currentStep.tools?.length > 0 && (() => {
                    const stepTools = checkedTools[currentStep.id] || new Set();
                    const completedCount = stepTools.size;
                    const totalCount = currentStep.tools.length;
                    const isAllCompleted = completedCount === totalCount;
                    
                    return <AccordionItem value="tools">
                      <AccordionTrigger className="text-lg font-semibold">
                        <div className="flex items-center gap-2">
                          <span>Tools Required</span>
                          <Badge variant={isAllCompleted ? "default" : "outline"} className={isAllCompleted ? "bg-green-500 text-white" : ""}>
                            {completedCount}/{totalCount}
                          </Badge>
                          {isAllCompleted && <CheckCircle className="w-4 h-4 text-green-500" />}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {currentStep.tools.map(tool => <div key={tool.id} className="p-3 bg-background/50 rounded-lg">
                              <div className="flex items-start gap-3">
                                <Checkbox 
                                  id={`tool-${tool.id}`}
                                  checked={stepTools.has(tool.id)}
                                  onCheckedChange={() => toggleToolCheck(currentStep.id, tool.id)}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className="font-medium">{tool.name}</div>
                                    {tool.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                                  </div>
                                  {tool.category && <Badge variant="outline" className="text-xs mt-1">{tool.category}</Badge>}
                                  {tool.description && <div className="text-sm text-muted-foreground mt-1">{tool.description}</div>}
                                </div>
                              </div>
                            </div>)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>;
                  })()}

                  {/* Outputs */}
                  {currentStep.outputs?.length > 0 && (() => {
                    const stepOutputs = checkedOutputs[currentStep.id] || new Set();
                    const completedCount = stepOutputs.size;
                    const totalCount = currentStep.outputs.length;
                    const isAllCompleted = completedCount === totalCount;
                    
                    return <AccordionItem value="outputs">
                      <AccordionTrigger className="text-lg font-semibold">
                        <div className="flex items-center gap-2">
                          <span>Outputs</span>
                          <Badge variant={isAllCompleted ? "default" : "outline"} className={isAllCompleted ? "bg-green-500 text-white" : ""}>
                            {completedCount}/{totalCount}
                          </Badge>
                          {isAllCompleted && <CheckCircle className="w-4 h-4 text-green-500" />}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {currentStep.outputs.map(output => <div key={output.id} className="p-3 bg-background/50 rounded-lg">
                              <div className="flex items-start gap-3">
                                <Checkbox 
                                  id={`output-${output.id}`}
                                  checked={stepOutputs.has(output.id)}
                                  onCheckedChange={() => toggleOutputCheck(currentStep.id, output.id)}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className="font-medium">{output.name}</div>
                                    <Badge variant="outline" className="text-xs capitalize">{output.type}</Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground mt-1">{output.description}</div>
                                </div>
                              </div>
                            </div>)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>;
                  })()}
                </Accordion>
              </CardContent>
            </Card>}

          {/* Navigation */}
          <Card className="gradient-card border-0 shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                

                <div className="flex items-center gap-3">
                  {currentStep && !completedSteps.has(currentStep.id) && (
                    areAllOutputsCompleted(currentStep) ? (
                      <Button onClick={handleComplete} className="gradient-primary text-white shadow-elegant hover:shadow-lg transition-smooth">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Complete
                      </Button>
                    ) : (
                      <Button disabled className="opacity-50 cursor-not-allowed">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Complete All Outputs First
                      </Button>
                    )
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>;
}