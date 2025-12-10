import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, CheckCircle, X } from 'lucide-react';
import { CustomizationStep } from './PlanningWizardSteps/CustomizationStep';
import { ScheduleStep } from './PlanningWizardSteps/ScheduleStep';
import { UncertaintyStep } from './PlanningWizardSteps/UncertaintyStep';
import { BudgetStep } from './PlanningWizardSteps/BudgetStep';

interface ProjectPlanningWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoToWorkflow?: () => void;
}

export const ProjectPlanningWizard: React.FC<ProjectPlanningWizardProps> = ({
  open,
  onOpenChange,
  onGoToWorkflow
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const wizardSteps = [
    {
      id: 'planning-step-1',
      title: 'Customization',
      description: 'Make choices and plan your work'
    },
    {
      id: 'planning-step-2',
      title: 'Schedule',
      description: 'Create a realistic timeline'
    },
    {
      id: 'planning-step-3',
      title: 'Project Uncertainty',
      description: 'Plan for potential risks'
    },
    {
      id: 'planning-step-4',
      title: 'Budget',
      description: 'Manage project finances'
    }
  ];

  const handleStepComplete = (stepIndex: number) => {
    const newCompletedSteps = new Set(completedSteps);
    newCompletedSteps.add(stepIndex);
    setCompletedSteps(newCompletedSteps);

    // Move to next step if not at the end
    if (stepIndex < wizardSteps.length - 1) {
      setCurrentStep(stepIndex + 1);
    }
  };

  const handleNext = () => {
    if (currentStep < wizardSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isStepCompleted = (stepIndex: number) => completedSteps.has(stepIndex);
  const allStepsComplete = completedSteps.size === wizardSteps.length;
  const progress = completedSteps.size / wizardSteps.length * 100;

  const renderCurrentStep = () => {
    const stepProps = {
      onComplete: () => handleStepComplete(currentStep),
      isCompleted: isStepCompleted(currentStep)
    };

    switch (currentStep) {
      case 0:
        return <CustomizationStep {...stepProps} />;
      case 1:
        return <ScheduleStep 
          {...stepProps}
          onNext={() => setCurrentStep(2)}
          onGoToWorkflow={() => {
            onOpenChange(false);
            if (onGoToWorkflow) onGoToWorkflow();
          }}
        />;
      case 2:
        return <UncertaintyStep {...stepProps} />;
      case 3:
        return <BudgetStep {...stepProps} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[95vw] md:h-[95vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
        {/* Accessibility: DialogTitle and DialogDescription required */}
        <DialogTitle className="sr-only">Project Planning Wizard</DialogTitle>
        <DialogDescription className="sr-only">Plan and customize your project workflow</DialogDescription>
        
        {/* Close button */}
        <div className="absolute right-4 top-4 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-2 sm:p-4 md:p-6 space-y-2 sm:space-y-4 md:space-y-6 pb-20 sm:pb-6">
            {/* Progress Header */}
            <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg sm:text-xl md:text-2xl flex items-center gap-2">
                  Project Planning Wizard
                  {allStepsComplete && <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-green-500 flex-shrink-0" />}
                </CardTitle>
                <p className="text-base sm:text-lg font-semibold mt-2 text-foreground">Build your complete project plan</p>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  Four steps to customize, schedule, plan for uncertainty, and budget your project
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                <div className="text-right">
                  <div className="text-xs sm:text-sm text-muted-foreground mb-1">
                    Step {currentStep + 1} of {wizardSteps.length}
                  </div>
                  <Progress value={progress} className="w-20 sm:w-24 md:w-32 h-1.5 sm:h-2" />
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Step Navigation */}
        <Card>
          <CardContent className="p-2 sm:p-3 md:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="flex items-center space-x-2 sm:space-x-2 md:space-x-4 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 -mx-2 sm:mx-0 px-2 sm:px-0 scrollbar-hide">
                {wizardSteps.map((step, index) => (
                  <div key={step.id} className="flex items-center flex-shrink-0">
                    <div className={`
                      flex items-center justify-center w-8 h-8 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full border-2 transition-colors flex-shrink-0
                      ${index === currentStep ? 'border-primary bg-primary text-primary-foreground' : isStepCompleted(index) ? 'border-green-500 bg-green-500 text-white' : 'border-muted-foreground bg-background'}
                    `}>
                      {isStepCompleted(index) ? (
                        <CheckCircle className="w-4 h-4 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                      ) : (
                        <span className="text-xs sm:text-xs md:text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    <div className="ml-1.5 sm:ml-1.5 md:ml-2 hidden sm:block">
                      <p className={`text-xs sm:text-sm font-medium whitespace-nowrap ${index === currentStep ? 'text-primary' : isStepCompleted(index) ? 'text-green-700' : 'text-muted-foreground'}`}>
                        {step.title}
                      </p>
                    </div>
                    {index < wizardSteps.length - 1 && (
                      <div className="mx-2 sm:mx-2 md:mx-4 w-4 sm:w-4 md:w-8 h-0.5 bg-muted-foreground/20 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={handlePrevious} disabled={currentStep === 0} className="flex-1 sm:flex-initial text-xs h-11 sm:h-9">
                  <ChevronLeft className="w-4 h-4 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Prev</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleNext} disabled={currentStep === wizardSteps.length - 1} className="flex-1 sm:flex-initial text-xs h-11 sm:h-9">
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="w-4 h-4 sm:w-4 sm:h-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Step Content */}
        <div className="flex flex-col" style={{ minHeight: '400px' }}>
          <div className="flex-1 overflow-y-auto -mx-2 sm:mx-0 px-2 sm:px-0 pb-4">
            {renderCurrentStep()}
          </div>
          
          {/* Fixed Button Area */}
          <div className="flex-shrink-0 bg-background border-t pt-4 pb-2 mt-4 -mx-2 sm:mx-0 px-2 sm:px-0">
            <Card>
              <CardContent className="p-3 sm:p-4">
                {allStepsComplete ? (
                  <Button 
                    onClick={() => onOpenChange(false)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Complete Planning
                  </Button>
                ) : (
                  <div className="text-center p-2 text-sm text-muted-foreground">
                    Complete all steps to finish planning
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

