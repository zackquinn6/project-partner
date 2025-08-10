import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Play, CheckCircle, ExternalLink, Image, Video } from "lucide-react";
import { WorkflowStep } from "./AdminView";

// Sample data - in a real app this would come from a backend
const sampleSteps: WorkflowStep[] = [
  {
    id: '1',
    phase: 'Planning',
    operation: 'Requirements Gathering',
    step: 'Stakeholder Interview',
    description: 'Conduct interviews with key stakeholders to understand project requirements and expectations.',
    contentType: 'text',
    content: 'Prepare a comprehensive list of open-ended questions focusing on:\n\n• Project goals and objectives\n• Budget and timeline constraints\n• Success criteria and KPIs\n• Potential risks and challenges\n• Stakeholder expectations\n\nTip: Schedule 60-90 minutes for each interview and record with permission.',
    order: 1
  },
  {
    id: '2',
    phase: 'Planning',
    operation: 'Requirements Gathering',
    step: 'Document Requirements',
    description: 'Create comprehensive documentation of all gathered requirements using our template.',
    contentType: 'link',
    content: 'https://docs.google.com/document/d/example-requirements-template',
    order: 2
  },
  {
    id: '3',
    phase: 'Planning',
    operation: 'Technical Planning',
    step: 'Architecture Design',
    description: 'Review the system architecture diagram and understand the technical approach.',
    contentType: 'image',
    content: 'https://via.placeholder.com/800x400/6366f1/ffffff?text=System+Architecture+Diagram',
    order: 3
  },
  {
    id: '4',
    phase: 'Execution',
    operation: 'Development Setup',
    step: 'Environment Setup',
    description: 'Watch the tutorial video on setting up your development environment.',
    contentType: 'video',
    content: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    order: 4
  },
  {
    id: '5',
    phase: 'Execution',
    operation: 'Implementation',
    step: 'Core Features',
    description: 'Begin implementing the core features as outlined in the requirements document.',
    contentType: 'text',
    content: 'Focus on implementing these core features in order:\n\n1. User authentication and authorization\n2. Data models and database setup\n3. Core business logic\n4. User interface components\n5. API endpoints and integration\n\nRemember to write tests for each feature as you implement them.',
    order: 5
  }
];

export default function UserView() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [steps] = useState<WorkflowStep[]>(sampleSteps);

  const currentStep = steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleComplete = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep.id]));
    if (currentStepIndex < steps.length - 1) {
      handleNext();
    }
  };

  const renderContent = (step: WorkflowStep) => {
    switch (step.contentType) {
      case 'link':
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

  const groupedSteps = steps.reduce((acc, step) => {
    if (!acc[step.phase]) {
      acc[step.phase] = {};
    }
    if (!acc[step.phase][step.operation]) {
      acc[step.phase][step.operation] = [];
    }
    acc[step.phase][step.operation].push(step);
    return acc;
  }, {} as Record<string, Record<string, WorkflowStep[]>>);

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <Card className="lg:col-span-1 gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Workflow Progress</CardTitle>
            <CardDescription>
              Step {currentStepIndex + 1} of {steps.length}
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
                      {opSteps.map((step) => (
                        <div 
                          key={step.id}
                          className={`ml-2 p-2 rounded text-sm cursor-pointer transition-fast ${
                            step.id === currentStep.id 
                              ? 'bg-primary/10 text-primary border border-primary/20' 
                              : completedSteps.has(step.id)
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setCurrentStepIndex(steps.findIndex(s => s.id === step.id))}
                        >
                          <div className="flex items-center gap-2">
                            {completedSteps.has(step.id) && <CheckCircle className="w-4 h-4" />}
                            <span className="truncate">{step.step}</span>
                          </div>
                        </div>
                      ))}
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
                  {currentStep.phase}
                </Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="outline">
                  {currentStep.operation}
                </Badge>
              </div>
              <CardTitle className="text-2xl">{currentStep.step}</CardTitle>
              {currentStep.description && (
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
                  {!completedSteps.has(currentStep.id) && (
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
                    disabled={currentStepIndex === steps.length - 1}
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