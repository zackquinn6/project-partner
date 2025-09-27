import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, Circle, Clock, Menu, Eye, EyeOff } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface MobileWorkflowViewProps {
  projectName: string;
  currentStep: any;
  currentStepIndex: number;
  totalSteps: number;
  progress: number;
  completedSteps: Set<string>;
  onBack: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onStepComplete: (stepId: string) => void;
  onNavigateToStep: (stepIndex: number) => void;
  allSteps: any[];
  checkedMaterials: Record<string, Set<string>>;
  checkedTools: Record<string, Set<string>>;
  onToggleMaterial: (stepId: string, materialId: string) => void;
  onToggleTool: (stepId: string, toolId: string) => void;
}

export function MobileWorkflowView({
  projectName,
  currentStep,
  currentStepIndex,
  totalSteps,
  progress,
  completedSteps,
  onBack,
  onNext,
  onPrevious,
  onStepComplete,
  onNavigateToStep,
  allSteps,
  checkedMaterials,
  checkedTools,
  onToggleMaterial,
  onToggleTool
}: MobileWorkflowViewProps) {
  const [showMaterials, setShowMaterials] = useState(true);
  const [showTools, setShowTools] = useState(true);
  const [isStepListOpen, setIsStepListOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['materials', 'tools']));
  const stepRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when step changes
  useEffect(() => {
    if (stepRef.current) {
      stepRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStepIndex]);

  const isStepCompleted = completedSteps.has(currentStep?.id);
  const canMoveNext = currentStepIndex < totalSteps - 1;
  const canMovePrevious = currentStepIndex > 0;

  const handleStepToggle = () => {
    if (isStepCompleted) {
      // Remove from completed steps
      const newCompleted = new Set(completedSteps);
      newCompleted.delete(currentStep.id);
      onStepComplete(currentStep.id);
    } else {
      // Mark as completed
      onStepComplete(currentStep.id);
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  if (!currentStep) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No step selected</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex-shrink-0 bg-card/95 backdrop-blur-sm border-b border-border sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="flex-shrink-0 p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-base text-card-foreground truncate">
                {projectName}
              </h1>
              <p className="text-xs text-muted-foreground">
                Step {currentStepIndex + 1} of {totalSteps}
              </p>
            </div>
          </div>
          
          <Sheet open={isStepListOpen} onOpenChange={setIsStepListOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0">
              <StepsList 
                allSteps={allSteps}
                currentStepIndex={currentStepIndex}
                completedSteps={completedSteps}
                onNavigateToStep={(index) => {
                  onNavigateToStep(index);
                  setIsStepListOpen(false);
                }}
              />
            </SheetContent>
          </Sheet>
        </div>
        
        {/* Progress Bar */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1" ref={stepRef}>
        <div className="p-4 space-y-6 pb-20">
          {/* Step Content */}
          <Card className="gradient-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isStepCompleted ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <Badge variant="outline" className="text-xs">
                    {currentStep.phaseName}
                  </Badge>
                </div>
                <Button
                  variant={isStepCompleted ? "outline" : "default"}
                  size="sm"
                  onClick={handleStepToggle}
                  className="text-xs"
                >
                  {isStepCompleted ? "Undo" : "Complete"}
                </Button>
              </div>
              <CardTitle className="text-lg leading-tight">
                {currentStep.step}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Special case for ordering step - add Shopping List button */}
              {(currentStep.step === 'Tool & Material Ordering' || 
                currentStep.phaseName === 'Ordering' || 
                currentStep.id === 'ordering-step-1') ? (
                <div className="space-y-4">
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Use our integrated shopping browser to purchase all required tools and materials for your project. 
                    Our system will help you find the best prices and ensure you get everything you need.
                  </p>
                  
                  {/* Shopping List Button */}
                  <div className="flex justify-center pt-2">
                    <Button 
                      onClick={() => {
                        console.log('Opening ordering window for mobile step:', currentStep.step);
                        // This would need to be passed down as a prop or use a global state
                        window.dispatchEvent(new CustomEvent('open-ordering-window'));
                      }}
                      variant="outline"
                      className="flex items-center gap-2"
                      size="sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Shopping List
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentStep.description && (
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {currentStep.description}
                    </p>
                  )}
                  
                  {currentStep.instructions && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Instructions</h4>
                      <div className="text-sm leading-relaxed space-y-2">
                        {currentStep.instructions.split('\n').map((line: string, index: number) => (
                          <p key={index}>{line}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Materials - Hide for ordering steps */}
          {currentStep.materials && currentStep.materials.length > 0 && 
            !(currentStep.step === 'Tool & Material Ordering' || 
              currentStep.phaseName === 'Ordering' || 
              currentStep.id === 'ordering-step-1') && (
            <Collapsible
              open={expandedSections.has('materials')}
              onOpenChange={() => toggleSection('materials')}
            >
              <Card className="gradient-card">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/5 transition-fast pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">Materials</CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {currentStep.materials.length}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMaterials(!showMaterials);
                        }}
                        className="p-1"
                      >
                        {showMaterials ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                {showMaterials && (
                  <CollapsibleContent>
                    <CardContent className="space-y-3 pt-0">
                      {currentStep.materials.map((material: any) => {
                        const isChecked = checkedMaterials[currentStep.id]?.has(material.id) || false;
                        return (
                          <div key={material.id} className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => onToggleMaterial(currentStep.id, material.id)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium text-sm ${isChecked ? 'line-through text-muted-foreground' : 'text-card-foreground'}`}>
                                {material.name}
                              </p>
                              {material.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {material.description}
                                </p>
                              )}
              {material.alternates && material.alternates.length > 0 && (
                <Badge variant="outline" className="text-xs mt-1">+{material.alternates.length} alternatives</Badge>
              )}
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </CollapsibleContent>
                )}
              </Card>
            </Collapsible>
          )}

          {/* Tools - Hide for ordering steps */}
          {currentStep.tools && currentStep.tools.length > 0 && 
            !(currentStep.step === 'Tool & Material Ordering' || 
              currentStep.phaseName === 'Ordering' || 
              currentStep.id === 'ordering-step-1') && (
            <Collapsible
              open={expandedSections.has('tools')}
              onOpenChange={() => toggleSection('tools')}
            >
              <Card className="gradient-card">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/5 transition-fast pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">Tools</CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {currentStep.tools.length}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowTools(!showTools);
                        }}
                        className="p-1"
                      >
                        {showTools ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                {showTools && (
                  <CollapsibleContent>
                    <CardContent className="space-y-3 pt-0">
                      {currentStep.tools.map((tool: any) => {
                        const isChecked = checkedTools[currentStep.id]?.has(tool.id) || false;
                        return (
                          <div key={tool.id} className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => onToggleTool(currentStep.id, tool.id)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium text-sm ${isChecked ? 'line-through text-muted-foreground' : 'text-card-foreground'}`}>
                                {tool.name}
                              </p>
                              {tool.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {tool.description}
                                </p>
                              )}
              {tool.alternates && tool.alternates.length > 0 && (
                <Badge variant="outline" className="text-xs mt-1">+{tool.alternates.length} alternatives</Badge>
              )}
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </CollapsibleContent>
                )}
              </Card>
            </Collapsible>
          )}
        </div>
      </ScrollArea>

      {/* Navigation */}
      <div className="flex-shrink-0 bg-card/95 backdrop-blur-sm border-t border-border p-4">
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={!canMovePrevious}
            className="flex-1"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              {currentStepIndex + 1} / {totalSteps}
            </p>
          </div>
          
          <Button
            variant="default"
            onClick={onNext}
            disabled={!canMoveNext}
            className="flex-1"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface StepsListProps {
  allSteps: any[];
  currentStepIndex: number;
  completedSteps: Set<string>;
  onNavigateToStep: (index: number) => void;
}

function StepsList({ allSteps, currentStepIndex, completedSteps, onNavigateToStep }: StepsListProps) {
  const phases = allSteps.reduce((acc: Record<string, any[]>, step: any, index: number) => {
    const phaseName = step.phaseName || 'Unknown Phase';
    if (!acc[phaseName]) {
      acc[phaseName] = [];
    }
    acc[phaseName].push({ ...step, originalIndex: index });
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-lg">Project Steps</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {Object.entries(phases).map(([phaseName, phaseSteps]: [string, any[]]) => (
            <div key={phaseName}>
              <h3 className="font-medium text-sm text-muted-foreground mb-2 uppercase tracking-wide">
                {phaseName}
              </h3>
              <div className="space-y-1">
                {phaseSteps.map((step) => {
                  const isCompleted = completedSteps.has(step.id);
                  const isCurrent = step.originalIndex === currentStepIndex;
                  
                  return (
                    <Button
                      key={step.id}
                      variant={isCurrent ? "secondary" : "ghost"}
                      onClick={() => onNavigateToStep(step.originalIndex)}
                      className={`w-full justify-start h-auto p-3 text-left ${
                        isCurrent ? 'bg-primary/10 text-primary' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2 w-full">
                        {isCompleted ? (
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        ) : isCurrent ? (
                          <Clock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium leading-tight ${
                            isCompleted ? 'line-through text-muted-foreground' : ''
                          }`}>
                            {step.step}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Step {step.originalIndex + 1}
                          </p>
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}