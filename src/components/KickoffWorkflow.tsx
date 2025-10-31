import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { DIYProfileStep } from './KickoffSteps/DIYProfileStep';
import { ProjectOverviewStep } from './KickoffSteps/ProjectOverviewStep';
import { ProjectProfileStep } from './KickoffSteps/ProjectProfileStep';
import { toast } from 'sonner';
interface KickoffWorkflowProps {
  onKickoffComplete: () => void;
  onExit?: () => void; // Add optional exit handler
}
export const KickoffWorkflow: React.FC<KickoffWorkflowProps> = ({
  onKickoffComplete,
  onExit
}) => {
  const {
    currentProjectRun,
    updateProjectRun
  } = useProject();
  const [currentKickoffStep, setCurrentKickoffStep] = useState(0);
  const [completedKickoffSteps, setCompletedKickoffSteps] = useState<Set<number>>(new Set());
  const [checkedOutputs, setCheckedOutputs] = useState<Record<string, Set<string>>>({});
  // CRITICAL FIX: Use ref instead of state to avoid race conditions
  const isCompletingStepRef = useRef(false);
  const kickoffSteps = [{
    id: 'kickoff-step-1',
    title: 'Project Overview',
    description: 'Review and customize your project details'
  }, {
    id: 'kickoff-step-2',
    title: 'DIY Profile',
    description: 'Complete your DIY profile for personalized guidance'
  }, {
    id: 'kickoff-step-3',
    title: 'Project Profile',
    description: 'Set up your project team and home selection'
  }];

  // Initialize completed steps from project run data - ONLY on mount or when project changes
  useEffect(() => {
    // Don't overwrite state during step completion
    if (isCompletingStepRef.current) {
      console.log("⏸️ KickoffWorkflow: Skipping initialization during step completion");
      return;
    }
    if (currentProjectRun?.completedSteps) {
      const kickoffStepIds = ['kickoff-step-1', 'kickoff-step-2', 'kickoff-step-3'];
      const completedIndices = new Set<number>();
      console.log("KickoffWorkflow - Initializing from project run:", {
        completedSteps: currentProjectRun.completedSteps,
        kickoffStepIds
      });

      // Check BOTH kickoff step IDs AND actual workflow step IDs
      kickoffStepIds.forEach((stepId, index) => {
        const isKickoffStepComplete = currentProjectRun.completedSteps.includes(stepId);

        // Also check if the actual workflow step is complete (for longer step IDs)
        const hasWorkflowStepComplete = currentProjectRun.completedSteps.some(completedId => completedId.length > 20 && completedId.includes('-'));
        if (isKickoffStepComplete) {
          completedIndices.add(index);
          console.log(`KickoffWorkflow - Step ${index} (${stepId}) is complete`);
        } else {
          console.log(`KickoffWorkflow - Step ${index} (${stepId}) is NOT complete`);
        }
      });
      setCompletedKickoffSteps(completedIndices);

      // Only set current step if not all complete - otherwise let step completion handle it
      if (completedIndices.size < kickoffSteps.length) {
        const firstIncomplete = kickoffStepIds.findIndex((stepId, index) => !completedIndices.has(index));
        if (firstIncomplete !== -1) {
          console.log("KickoffWorkflow - Setting current step to first incomplete:", firstIncomplete);
          setCurrentKickoffStep(firstIncomplete);
        }
      }
    }
  }, [currentProjectRun?.id]); // Only re-run when project ID changes

  const handleStepComplete = async (stepIndex: number) => {
    console.log("🎯 handleStepComplete called with stepIndex:", stepIndex);
    if (!currentProjectRun) {
      console.error("❌ handleStepComplete: currentProjectRun is null/undefined!");
      return;
    }

    // Set flag to prevent useEffect from overwriting during completion
    isCompletingStepRef.current = true;
    try {
      const stepId = kickoffSteps[stepIndex].id;
      const newCompletedSteps = [...(currentProjectRun.completedSteps || [])];
      console.log("KickoffWorkflow - Completing step:", {
        stepIndex,
        stepId,
        currentCompletedSteps: currentProjectRun.completedSteps,
        alreadyCompleted: newCompletedSteps.includes(stepId)
      });

      // Find the actual workflow step ID in the Kickoff phase
      const kickoffPhase = currentProjectRun.phases.find(p => p.name === 'Kickoff');
      let actualStepId = stepId;
      if (kickoffPhase && kickoffPhase.operations && kickoffPhase.operations.length > 0) {
        // Map kickoff step index to actual step in the workflow
        const allKickoffSteps = kickoffPhase.operations.flatMap(op => op.steps || []);
        if (allKickoffSteps[stepIndex]) {
          actualStepId = allKickoffSteps[stepIndex].id;
          console.log("KickoffWorkflow - Found actual workflow step ID:", actualStepId);
        }
      }

      // Add both the kickoff step ID and the actual workflow step ID
      if (!newCompletedSteps.includes(stepId)) {
        newCompletedSteps.push(stepId);
      }
      if (actualStepId !== stepId && !newCompletedSteps.includes(actualStepId)) {
        newCompletedSteps.push(actualStepId);
        console.log("KickoffWorkflow - Also marking actual step as complete:", actualStepId);
      }

      // Update completed kickoff steps state immediately
      const newCompletedKickoffSteps = new Set(completedKickoffSteps);
      newCompletedKickoffSteps.add(stepIndex);
      setCompletedKickoffSteps(newCompletedKickoffSteps);
      console.log("KickoffWorkflow - Updating project run with steps:", newCompletedSteps);

      // Update project run with completed step - WAIT for completion
      const updatedProjectRun = {
        ...currentProjectRun,
        completedSteps: newCompletedSteps,
        progress: Math.round(newCompletedSteps.length / getTotalStepsCount() * 100),
        updatedAt: new Date()
      };

      // Wait for database update to complete
      await updateProjectRun(updatedProjectRun);
      console.log("✅ Kickoff step completion persisted to database");
      console.log("KickoffWorkflow - Checking if all kickoff complete:", {
        completedKickoffStepsSize: newCompletedKickoffSteps.size,
        totalKickoffSteps: kickoffSteps.length,
        allComplete: newCompletedKickoffSteps.size === kickoffSteps.length,
        actualCompletedSteps: newCompletedSteps
      });

      // Check if all kickoff steps are complete
      if (newCompletedKickoffSteps.size === kickoffSteps.length) {
        console.log("🎉 KickoffWorkflow - All steps complete, calling onKickoffComplete");

        // DEFENSIVE CHECK: Verify all 3 UI kickoff step IDs are in database
        const kickoffStepIds = ['kickoff-step-1', 'kickoff-step-2', 'kickoff-step-3'];
        const allIdsPresent = kickoffStepIds.every(id => newCompletedSteps.includes(id));
        if (!allIdsPresent) {
          console.error('❌ Not all kickoff step IDs present in database:', {
            expected: kickoffStepIds,
            actual: newCompletedSteps.filter(id => kickoffStepIds.includes(id))
          });
          toast.error('Error: Kickoff steps not properly saved');
          isCompletingStepRef.current = false;
          return;
        }

        // Delay clearing flag and calling complete to ensure database update finishes
        setTimeout(() => {
          isCompletingStepRef.current = false;
          onKickoffComplete();
        }, 200);
      } else {
        console.log("KickoffWorkflow - Moving to next step");
        // Move to next step if not already there
        if (stepIndex === currentKickoffStep && stepIndex < kickoffSteps.length - 1) {
          setCurrentKickoffStep(stepIndex + 1);
        }
        // Clear flag after short delay
        setTimeout(() => {
          isCompletingStepRef.current = false;
        }, 200);
      }
    } catch (error) {
      console.error("❌ Error completing kickoff step:", error);
      // Clear flag on error
      isCompletingStepRef.current = false;
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
  const progress = completedKickoffSteps.size / kickoffSteps.length * 100;
  const handleOutputToggle = (stepId: string, outputId: string) => {
    setCheckedOutputs(prev => {
      const stepOutputs = new Set(prev[stepId] || []);
      if (stepOutputs.has(outputId)) {
        stepOutputs.delete(outputId);
      } else {
        stepOutputs.add(outputId);
      }
      return {
        ...prev,
        [stepId]: stepOutputs
      };
    });
  };
  const renderCurrentStep = () => {
    const stepIndex = currentKickoffStep;
    const stepProps = {
      onComplete: () => {
        console.log("🎯 Step onComplete callback triggered for step:", stepIndex);
        handleStepComplete(stepIndex);
      },
      isCompleted: isStepCompleted(currentKickoffStep),
      checkedOutputs: checkedOutputs[kickoffSteps[currentKickoffStep].id] || new Set(),
      onOutputToggle: (outputId: string) => handleOutputToggle(kickoffSteps[currentKickoffStep].id, outputId)
    };
    switch (currentKickoffStep) {
      case 0:
        return <ProjectOverviewStep {...stepProps} />;
      case 1:
        return <DIYProfileStep {...stepProps} />;
      case 2:
        return <ProjectProfileStep {...stepProps} />;
      default:
        return null;
    }
  };
  return <div className="max-w-6xl mx-auto p-2 sm:p-6 space-y-4 sm:space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                Project Kickoff
                {allKickoffStepsComplete && <CheckCircle className="w-6 h-6 text-green-500" />}
              </CardTitle>
              <CardDescription>Three quick steps check that this project is a good fit - then personalizes the project to you</CardDescription>
            </div>
            <div className="flex items-center gap-4">
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
        <CardContent className="p-2 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto w-full sm:w-auto">
              {kickoffSteps.map((step, index) => <div key={step.id} className="flex items-center flex-shrink-0">
                  <div className={`
                    flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 transition-colors
                    ${index === currentKickoffStep ? 'border-primary bg-primary text-primary-foreground' : isStepCompleted(index) ? 'border-green-500 bg-green-500 text-white' : 'border-muted-foreground bg-background'}
                  `}>
                    {isStepCompleted(index) ? <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" /> : <span className="text-xs sm:text-sm font-medium">{index + 1}</span>}
                  </div>
                  <div className="ml-1 sm:ml-2 hidden md:block">
                    <p className={`text-xs sm:text-sm font-medium ${index === currentKickoffStep ? 'text-primary' : isStepCompleted(index) ? 'text-green-700' : 'text-muted-foreground'}`}>
                      {step.title}
                    </p>
                  </div>
                  {index < kickoffSteps.length - 1 && <div className="mx-2 sm:mx-4 w-4 sm:w-8 h-0.5 bg-muted-foreground/20" />}
                </div>)}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" onClick={handlePrevious} disabled={currentKickoffStep === 0} className="flex-1 sm:flex-initial">
                <ChevronLeft className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleNext} disabled={currentKickoffStep === kickoffSteps.length - 1} className="flex-1 sm:flex-initial">
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">Next</span>
                <ChevronRight className="w-4 h-4 ml-1 sm:ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Step Content - Scrollable with Fixed Button */}
      <div className="flex flex-col h-[calc(100vh-20rem)]">
        <div className="flex-1 overflow-y-auto min-h-0">
          {renderCurrentStep()}
        </div>
      </div>
    </div>;
};