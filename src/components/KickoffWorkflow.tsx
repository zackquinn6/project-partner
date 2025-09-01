import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { ProjectOverviewStep } from './KickoffSteps/ProjectOverviewStep';
import { ProjectAgreementStep } from './KickoffSteps/ProjectAgreementStep';
import { ProjectCustomizationStep } from './KickoffSteps/ProjectCustomizationStep';

interface KickoffWorkflowProps {
  onKickoffComplete: () => void;
  onExit?: () => void; // Add optional exit handler
}

export const KickoffWorkflow: React.FC<KickoffWorkflowProps> = ({ onKickoffComplete, onExit }) => {
  const { currentProjectRun, updateProjectRun } = useProject();
  const [currentKickoffStep, setCurrentKickoffStep] = useState(0);
  const [completedKickoffSteps, setCompletedKickoffSteps] = useState<Set<number>>(new Set());

  const kickoffSteps = [
    {
      id: 'kickoff-step-1',
      title: 'Project Overview',
      description: 'Review and customize your project details'
    },
    {
      id: 'kickoff-step-2', 
      title: 'Project Partner Agreement',
      description: 'Review and sign the project agreement'
    }
  ];

  // Initialize completed steps from project run data
  useEffect(() => {
    if (currentProjectRun?.completedSteps) {
      const kickoffStepIds = ['kickoff-step-1', 'kickoff-step-2'];
      const completedIndices = new Set<number>();
      
      console.log("KickoffWorkflow - Initializing from project run:", {
        completedSteps: currentProjectRun.completedSteps,
        kickoffStepIds
      });
      
      kickoffStepIds.forEach((stepId, index) => {
        if (currentProjectRun.completedSteps.includes(stepId)) {
          completedIndices.add(index);
          console.log(`KickoffWorkflow - Step ${index} (${stepId}) is complete`);
        } else {
          console.log(`KickoffWorkflow - Step ${index} (${stepId}) is NOT complete`);
        }
      });
      
      setCompletedKickoffSteps(completedIndices);
      
      // Set current step to first incomplete step or last step if all complete
      const firstIncomplete = kickoffStepIds.findIndex(stepId => 
        !currentProjectRun.completedSteps.includes(stepId)
      );
      if (firstIncomplete !== -1) {
        console.log("KickoffWorkflow - Setting current step to first incomplete:", firstIncomplete);
        setCurrentKickoffStep(firstIncomplete);
      } else {
        console.log("KickoffWorkflow - All steps complete, showing last step");
        setCurrentKickoffStep(1); // All complete, show last step
      }
    }
  }, [currentProjectRun]);

  const handleStepComplete = async (stepIndex: number) => {
    if (!currentProjectRun) return;

    const stepId = kickoffSteps[stepIndex].id;
    const newCompletedSteps = [...(currentProjectRun.completedSteps || [])];
    
    console.log("KickoffWorkflow - Completing step:", {
      stepIndex,
      stepId,
      currentCompletedSteps: currentProjectRun.completedSteps,
      alreadyCompleted: newCompletedSteps.includes(stepId)
    });
    
    if (!newCompletedSteps.includes(stepId)) {
      newCompletedSteps.push(stepId);
    }

    // Update completed kickoff steps state immediately
    const newCompletedKickoffSteps = new Set(completedKickoffSteps);
    newCompletedKickoffSteps.add(stepIndex);
    setCompletedKickoffSteps(newCompletedKickoffSteps);

    console.log("KickoffWorkflow - Updating project run with steps:", newCompletedSteps);

    try {
      // Update project run with completed step - WAIT for completion
      const updatedProjectRun = {
        ...currentProjectRun,
        completedSteps: newCompletedSteps,
        progress: Math.round((newCompletedSteps.length / getTotalStepsCount()) * 100),
        updatedAt: new Date()
      };
      
      // Wait for database update to complete
      await updateProjectRun(updatedProjectRun);
      
      console.log("✅ Database update completed");

      console.log("KickoffWorkflow - Checking if all kickoff complete:", {
        completedKickoffStepsSize: newCompletedKickoffSteps.size,
        totalKickoffSteps: kickoffSteps.length,
        allComplete: newCompletedKickoffSteps.size === kickoffSteps.length,
        actualCompletedSteps: newCompletedSteps
      });

      // Check if all kickoff steps are complete
      if (newCompletedKickoffSteps.size === kickoffSteps.length) {
        console.log("🎉 KickoffWorkflow - All steps complete, calling onKickoffComplete");
        // Small delay to ensure state propagation
        setTimeout(() => {
          onKickoffComplete();
        }, 100);
      } else {
        console.log("KickoffWorkflow - Moving to next step");
        // Move to next step if not already there
        if (stepIndex === currentKickoffStep && stepIndex < kickoffSteps.length - 1) {
          setCurrentKickoffStep(stepIndex + 1);
        }
      }
    } catch (error) {
      console.error("❌ Error updating project run:", error);
    }
  };

  const getTotalStepsCount = () => {
    if (!currentProjectRun) return kickoffSteps.length;
    
    return currentProjectRun.phases.reduce((total, phase) => {
      return total + phase.operations.reduce((opTotal, operation) => {
        return opTotal + operation.steps.length;
      }, 0);
    }, 0);
  };

  const handleNext = () => {
    if (currentKickoffStep < kickoffSteps.length - 1) {
      setCurrentKickoffStep(currentKickoffStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentKickoffStep > 0) {
      setCurrentKickoffStep(currentKickoffStep - 1);
    }
  };

  const isStepCompleted = (stepIndex: number) => completedKickoffSteps.has(stepIndex);
  const allKickoffStepsComplete = completedKickoffSteps.size === kickoffSteps.length;
  const progress = (completedKickoffSteps.size / kickoffSteps.length) * 100;

  const renderCurrentStep = () => {
    const stepProps = {
      onComplete: () => handleStepComplete(currentKickoffStep),
      isCompleted: isStepCompleted(currentKickoffStep)
    };

    switch (currentKickoffStep) {
      case 0:
        return <ProjectOverviewStep {...stepProps} />;
      case 1:
        return <ProjectAgreementStep {...stepProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                Project Kickoff
                {allKickoffStepsComplete && <CheckCircle className="w-6 h-6 text-green-500" />}
              </CardTitle>
              <CardDescription>
                Complete these essential steps before starting your project
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              {onExit && (
                <Button variant="outline" onClick={onExit}>
                  Exit Kickoff
                </Button>
              )}
              <div className="text-right">
                <div className="text-sm text-muted-foreground mb-1">
                  Step {currentKickoffStep + 1} of {kickoffSteps.length}
                </div>
                <Progress value={progress} className="w-32" />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Step Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {kickoffSteps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors
                    ${index === currentKickoffStep 
                      ? 'border-primary bg-primary text-primary-foreground' 
                      : isStepCompleted(index)
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-muted-foreground bg-background'
                    }
                  `}>
                    {isStepCompleted(index) ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <div className="ml-2 hidden sm:block">
                    <p className={`text-sm font-medium ${
                      index === currentKickoffStep ? 'text-primary' : 
                      isStepCompleted(index) ? 'text-green-700' : 'text-muted-foreground'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                  {index < kickoffSteps.length - 1 && (
                    <div className="mx-4 w-8 h-0.5 bg-muted-foreground/20" />
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentKickoffStep === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={handleNext}
                disabled={currentKickoffStep === kickoffSteps.length - 1}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Step Content */}
      <div className="min-h-96">
        {renderCurrentStep()}
      </div>

      {/* Completion Message */}
      {allKickoffStepsComplete && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-green-800 mb-2">
              Kickoff Complete! 🎉
            </h3>
            <p className="text-green-700 mb-4">
              Nice work — you've wrapped up all your kickoff steps! Your full project workflow is ready and waiting for you to dive in.
            </p>
            <Button onClick={onKickoffComplete} className="bg-green-600 hover:bg-green-700">
              Start Project Workflow
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};