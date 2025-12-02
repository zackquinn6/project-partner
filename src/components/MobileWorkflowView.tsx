import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, Circle, Clock, Menu, Eye, EyeOff, HelpCircle, Calendar as CalendarIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MultiContentRenderer } from '@/components/MultiContentRenderer';
import { useStepInstructions } from '@/hooks/useStepInstructions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WorkflowThemeSelector } from './WorkflowThemeSelector';

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
  instructionLevel?: 'beginner' | 'intermediate' | 'advanced';
  onInstructionLevelChange?: (level: 'beginner' | 'intermediate' | 'advanced') => void;
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
  onToggleTool,
  instructionLevel = 'intermediate',
  onInstructionLevelChange
}: MobileWorkflowViewProps) {
  const [showMaterials, setShowMaterials] = useState(true);
  const [showTools, setShowTools] = useState(true);
  const [isStepListOpen, setIsStepListOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['materials', 'tools']));
  const stepRef = useRef<HTMLDivElement>(null);

  // Fetch instructions based on level
  const { instruction, loading: instructionLoading } = useStepInstructions(
    currentStep?.id || '',
    instructionLevel
  );

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
        <div className="flex items-center justify-between p-2 sm:p-3 md:p-4 gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="flex-shrink-0 p-1.5 sm:p-2 h-8 w-8 sm:h-9 sm:w-9"
          >
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          
          <div className="flex-1 flex flex-col items-center justify-center min-w-0 px-1 sm:px-2">
            <div className="flex items-center gap-1.5 sm:gap-2 w-full justify-center">
              <h1 className="font-semibold text-sm sm:text-base text-card-foreground truncate text-center max-w-[140px] sm:max-w-none">
                {projectName}
              </h1>
              <div className="flex items-center gap-1 sm:gap-2">
                {onInstructionLevelChange && (
                  <Select value={instructionLevel} onValueChange={onInstructionLevelChange}>
                    <SelectTrigger className="h-7 sm:h-8 text-[10px] sm:text-xs w-[70px] sm:w-[90px] flex-shrink-0">
                      <SelectValue>
                        {instructionLevel === 'beginner' && 'Beginner'}
                        {instructionLevel === 'intermediate' && 'Intermediate'}
                        {instructionLevel === 'advanced' && 'Advanced'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner" className="text-xs">Beginner: Extra guidance</SelectItem>
                      <SelectItem value="intermediate" className="text-xs">Intermediate: Short step-by-step</SelectItem>
                      <SelectItem value="advanced" className="text-xs">Advanced: Key points only</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <WorkflowThemeSelector />
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground text-center mt-0.5">
              Step {currentStepIndex + 1} of {totalSteps}
            </p>
          </div>
          
          <Sheet open={isStepListOpen} onOpenChange={setIsStepListOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="flex-shrink-0 p-1.5 sm:p-2 h-8 w-8 sm:h-9 sm:w-9">
                <Menu className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] sm:w-80 p-0">
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
        <div className="px-2 sm:px-3 md:px-4 pb-2 sm:pb-3 md:pb-4">
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5 sm:h-2" />
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1" ref={stepRef}>
        <div className="p-3 sm:p-4 space-y-4 sm:space-y-6 pb-20">
          {/* Step Content */}
          <Card 
            key={instructionLevel}
            className="gradient-card"
          >
            <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                  {isStepCompleted ? (
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <Badge variant="outline" className="text-[10px] sm:text-xs truncate">
                    {currentStep.phaseName}
                  </Badge>
                </div>
                <Button
                  variant={isStepCompleted ? "outline" : "default"}
                  size="sm"
                  onClick={handleStepToggle}
                  className="text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 flex-shrink-0"
                >
                  {isStepCompleted ? "Undo" : "Complete"}
                </Button>
              </div>
              <CardTitle className="text-base sm:text-lg leading-tight mt-2">
                {currentStep.step}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-6 pt-0 sm:pt-0">
              <div className="space-y-4">
                  {/* Render instruction content based on level if available */}
                  {instructionLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-muted-foreground text-sm">Loading {instructionLevel === 'new_user' ? 'New DIY' : instructionLevel === 'detailed' ? 'Mid-level DIY' : 'Advanced DIY'} content...</div>
                    </div>
                  ) : instruction ? (
                    <div className="space-y-4 text-sm">
                      {instruction.content.text && (
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {instruction.content.text}
                        </div>
                      )}
                      
                      {instruction.content.sections && [...instruction.content.sections]
                        .sort((a, b) => {
                          // Sort warnings to top, then tips, then standard
                          const order = { warning: 0, tip: 1, standard: 2 };
                          return (order[a.type || 'standard'] || 2) - (order[b.type || 'standard'] || 2);
                        })
                        .map((section, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border text-xs ${
                            section.type === 'warning'
                              ? 'bg-orange-50 border-orange-200'
                              : section.type === 'tip'
                              ? 'bg-blue-50 border-blue-200'
                              : 'bg-muted'
                          }`}
                        >
                          <h4 className="font-semibold mb-1">{section.title}</h4>
                          <div className="whitespace-pre-wrap">{section.content}</div>
                        </div>
                      ))}

                      {instruction.content.photos && instruction.content.photos.map((photo, idx) => (
                        <div key={idx}>
                          <img src={photo.url} alt={photo.alt} className="w-full rounded-lg" />
                          {photo.caption && <p className="text-xs text-muted-foreground italic mt-1">{photo.caption}</p>}
                        </div>
                      ))}

                      {instruction.content.links && instruction.content.links.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-xs">Resources</h4>
                          {instruction.content.links.map((link, idx) => (
                            <a
                              key={idx}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block p-2 bg-muted rounded text-xs"
                            >
                              {link.title}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Fallback to original content */}
                      {currentStep.content && Array.isArray(currentStep.content) && currentStep.content.length > 0 ? (
                        <MultiContentRenderer sections={currentStep.content} />
                      ) : currentStep.description && (
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
                    </>
                  )}

                  {/* Special action buttons for specific steps */}
                  {((currentStep.step?.toLowerCase().includes('project') && (currentStep.step?.toLowerCase().includes('plan') || currentStep.step?.toLowerCase().includes('scope'))) ||
                    currentStep.step?.toLowerCase().includes('scheduling')) && (
                    <div className="flex flex-col gap-3 pt-4">
                      {/* Project Customizer button for Project Planning and Scope steps */}
                      {(currentStep.step?.toLowerCase().includes('project') && (currentStep.step?.toLowerCase().includes('plan') || currentStep.step?.toLowerCase().includes('scope'))) && (
                        <Button 
                          onClick={() => {
                            console.log('Opening project customizer for mobile step:', currentStep.step);
                            window.dispatchEvent(new CustomEvent('openProjectCustomizer'));
                          }}
                          variant="outline"
                          className="flex items-center gap-2"
                          size="sm"
                        >
                          <HelpCircle className="w-4 h-4" />
                          Project Customizer
                        </Button>
                      )}

                      {/* Project Scheduler button for scheduling step */}
                      {currentStep.step?.toLowerCase().includes('scheduling') && (
                        <Button 
                          onClick={() => {
                            console.log('Opening project scheduler for mobile step:', currentStep.step);
                            window.dispatchEvent(new CustomEvent('openProjectScheduler'));
                          }}
                          variant="outline"
                          className="flex items-center gap-2"
                          size="sm"
                        >
                          <CalendarIcon className="w-4 h-4" />
                          Project Scheduler
                        </Button>
                      )}
                    </div>
                  )}
                </div>
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
                  <CardHeader className="cursor-pointer hover:bg-muted/5 transition-fast pb-2 sm:pb-3 p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <CardTitle className="text-sm sm:text-base">Materials</CardTitle>
                        <Badge variant="secondary" className="text-[10px] sm:text-xs flex-shrink-0">
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
                        className="p-1 h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0"
                      >
                        {showMaterials ? <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                      </Button>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                {showMaterials && (
                  <CollapsibleContent>
                    <CardContent className="space-y-2 sm:space-y-3 pt-0 p-3 sm:p-4">
                      {currentStep.materials.map((material: any) => {
                        const isChecked = checkedMaterials[currentStep.id]?.has(material.id) || false;
                        return (
                          <div key={material.id} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-background/50 rounded-lg">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => onToggleMaterial(currentStep.id, material.id)}
                              className="mt-0.5 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium text-xs sm:text-sm break-words ${isChecked ? 'line-through text-muted-foreground' : 'text-card-foreground'}`}>
                                {material.name}
                              </p>
                              {material.description && (
                                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 break-words">
                                  {material.description}
                                </p>
                              )}
              {material.alternates && material.alternates.length > 0 && (
                <Badge variant="outline" className="text-[10px] sm:text-xs mt-1">+{material.alternates.length} alternatives</Badge>
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
                  <CardHeader className="cursor-pointer hover:bg-muted/5 transition-fast pb-2 sm:pb-3 p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <CardTitle className="text-sm sm:text-base">Tools</CardTitle>
                        <Badge variant="secondary" className="text-[10px] sm:text-xs flex-shrink-0">
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
                        className="p-1 h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0"
                      >
                        {showTools ? <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                      </Button>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                {showTools && (
                  <CollapsibleContent>
                    <CardContent className="space-y-2 sm:space-y-3 pt-0 p-3 sm:p-4">
                      {currentStep.tools.map((tool: any) => {
                        const isChecked = checkedTools[currentStep.id]?.has(tool.id) || false;
                        return (
                          <div key={tool.id} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-background/50 rounded-lg">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => onToggleTool(currentStep.id, tool.id)}
                              className="mt-0.5 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium text-xs sm:text-sm break-words ${isChecked ? 'line-through text-muted-foreground' : 'text-card-foreground'}`}>
                                {tool.name}
                              </p>
                              {tool.description && (
                                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 break-words">
                                  {tool.description}
                                </p>
                              )}
              {tool.alternates && tool.alternates.length > 0 && (
                <Badge variant="outline" className="text-[10px] sm:text-xs mt-1">+{tool.alternates.length} alternatives</Badge>
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
      <div className="flex-shrink-0 bg-card/95 backdrop-blur-sm border-t border-border p-2 sm:p-3 md:p-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={!canMovePrevious}
            className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
          >
            <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Prev</span>
          </Button>
          
          <div className="text-center flex-shrink-0 px-1 sm:px-2">
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {currentStepIndex + 1} / {totalSteps}
            </p>
          </div>
          
          <Button
            variant="default"
            onClick={onNext}
            disabled={!canMoveNext}
            className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
          >
            <span className="hidden sm:inline">Next</span>
            <span className="sm:hidden">Next</span>
            <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
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
      <div className="p-3 sm:p-4 border-b border-border">
        <h2 className="font-semibold text-base sm:text-lg">Project Steps</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          {Object.entries(phases).map(([phaseName, phaseSteps]: [string, any[]]) => (
            <div key={phaseName}>
              <h3 className="font-medium text-xs sm:text-sm text-muted-foreground mb-1.5 sm:mb-2 uppercase tracking-wide">
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
                      className={`w-full justify-start h-auto p-2 sm:p-3 text-left ${
                        isCurrent ? 'bg-primary/10 text-primary' : ''
                      }`}
                    >
                      <div className="flex items-start gap-1.5 sm:gap-2 w-full">
                        {isCompleted ? (
                          <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        ) : isCurrent ? (
                          <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary mt-0.5 flex-shrink-0" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs sm:text-sm font-medium leading-tight break-words ${
                            isCompleted ? 'line-through text-muted-foreground' : ''
                          }`}>
                            {step.step}
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
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