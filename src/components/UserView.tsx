import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Play, CheckCircle, ExternalLink, Image, Video } from "lucide-react";
import { useProject } from '@/contexts/ProjectContext';

export default function UserView() {
  const { currentProject } = useProject();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  // Flatten all steps from all phases and operations for navigation
  const allSteps = currentProject?.phases.flatMap(phase => 
    phase.operations.flatMap(operation => 
      operation.steps.map(step => ({
        ...step,
        phaseName: phase.name,
        operationName: operation.name
      }))
    )
  ) || [];

  const currentStep = allSteps[currentStepIndex];
  const progress = allSteps.length > 0 ? ((currentStepIndex + 1) / allSteps.length) * 100 : 0;

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

  const handleComplete = () => {
    if (currentStep) {
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
        return (
          <div className="space-y-4">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ExternalLink className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-orange-800">External Resource</span>
              </div>
              <a 
                href={step.content} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-orange-600 hover:text-orange-800 underline break-all"
              >
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
            <img 
              src={step.content} 
              alt={step.step}
              className="w-full rounded-lg shadow-card max-w-2xl"
            />
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
              <iframe
                src={step.content}
                className="w-full h-full"
                allowFullScreen
                title={step.step}
              />
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

  if (!currentProject || allSteps.length === 0) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              {!currentProject 
                ? 'Please select a project to view its workflow steps.' 
                : 'No workflow steps found. Please add some steps in the admin view.'
              }
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
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
              {Object.entries(groupedSteps).map(([phase, operations]) => (
                <div key={phase} className="space-y-2">
                  <h4 className="font-semibold text-primary">{phase}</h4>
                  {Object.entries(operations).map(([operation, opSteps]) => (
                    <div key={operation} className="ml-2 space-y-1">
                      <h5 className="text-sm font-medium text-muted-foreground">{operation}</h5>
                      {opSteps.map((step) => {
                        const stepIndex = allSteps.findIndex(s => s.id === step.id);
                        return (
                          <div 
                            key={step.id}
                            className={`ml-2 p-2 rounded text-sm cursor-pointer transition-fast ${
                              step.id === currentStep?.id 
                                ? 'bg-primary/10 text-primary border border-primary/20' 
                                : completedSteps.has(step.id)
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => setCurrentStepIndex(stepIndex)}
                          >
                            <div className="flex items-center gap-2">
                              {completedSteps.has(step.id) && <CheckCircle className="w-4 h-4" />}
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
              {currentStep?.description && (
                <CardDescription className="text-base">
                  {currentStep.description}
                </CardDescription>
              )}
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
            <div className="grid md:grid-cols-3 gap-6">
              {/* Materials */}
              {currentStep.materials?.length > 0 && (
                <Card className="gradient-card border-0 shadow-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Materials Needed</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {currentStep.materials.map((material) => (
                      <div key={material.id} className="p-3 bg-background/50 rounded-lg">
                        <div className="font-medium">{material.name}</div>
                        {material.category && (
                          <Badge variant="outline" className="text-xs mt-1">{material.category}</Badge>
                        )}
                        {material.description && (
                          <div className="text-sm text-muted-foreground mt-1">{material.description}</div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Tools */}
              {currentStep.tools?.length > 0 && (
                <Card className="gradient-card border-0 shadow-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Tools Required</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {currentStep.tools.map((tool) => (
                      <div key={tool.id} className="p-3 bg-background/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{tool.name}</div>
                          {tool.required && (
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                          )}
                        </div>
                        {tool.category && (
                          <Badge variant="outline" className="text-xs mt-1">{tool.category}</Badge>
                        )}
                        {tool.description && (
                          <div className="text-sm text-muted-foreground mt-1">{tool.description}</div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Outputs */}
              {currentStep.outputs?.length > 0 && (
                <Card className="gradient-card border-0 shadow-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Expected Outputs</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {currentStep.outputs.map((output) => (
                      <div key={output.id} className="p-3 bg-background/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{output.name}</div>
                          <Badge variant="outline" className="text-xs capitalize">{output.type}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">{output.description}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Navigation */}
          <Card className="gradient-card border-0 shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStepIndex === 0}
                  className="transition-fast"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>

                <div className="flex items-center gap-3">
                  {currentStep && !completedSteps.has(currentStep.id) && (
                    <Button
                      onClick={handleComplete}
                      className="gradient-primary text-white shadow-elegant hover:shadow-lg transition-smooth"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Complete
                    </Button>
                  )}
                  
                  <Button
                    onClick={handleNext}
                    disabled={currentStepIndex === allSteps.length - 1}
                    className="transition-fast"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}