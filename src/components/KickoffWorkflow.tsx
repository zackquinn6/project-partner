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
    updateProjectRun,
    deleteProjectRun
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
  return <div className="max-w-6xl mx-auto p-2 sm:p-4 md:p-6 space-y-2 sm:space-y-4 md:space-y-6 pb-20 sm:pb-6">
      {/* Progress Header */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg sm:text-xl md:text-2xl flex items-center gap-2">
                Project Kickoff{currentProjectRun?.name ? `: ${currentProjectRun.name}` : ''}
                {allKickoffStepsComplete && <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-green-500 flex-shrink-0" />}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1">Three quick steps check that this project is a good fit - then personalizes the project to you</CardDescription>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <div className="text-right">
                <div className="text-xs sm:text-sm text-muted-foreground mb-1">
                  Step {currentKickoffStep + 1} of {kickoffSteps.length}
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
            <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-4 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 -mx-2 sm:mx-0 px-2 sm:px-0 scrollbar-hide">
              {kickoffSteps.map((step, index) => <div key={step.id} className="flex items-center flex-shrink-0">
                  <div className={`
                    flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full border-2 transition-colors flex-shrink-0
                    ${index === currentKickoffStep ? 'border-primary bg-primary text-primary-foreground' : isStepCompleted(index) ? 'border-green-500 bg-green-500 text-white' : 'border-muted-foreground bg-background'}
                  `}>
                    {isStepCompleted(index) ? <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" /> : <span className="text-[10px] sm:text-xs md:text-sm font-medium">{index + 1}</span>}
                  </div>
                  <div className="ml-1 sm:ml-1.5 md:ml-2 hidden lg:block">
                    <p className={`text-xs sm:text-sm font-medium whitespace-nowrap ${index === currentKickoffStep ? 'text-primary' : isStepCompleted(index) ? 'text-green-700' : 'text-muted-foreground'}`}>
                      {step.title}
                    </p>
                  </div>
                  {index < kickoffSteps.length - 1 && <div className="mx-1 sm:mx-2 md:mx-4 w-3 sm:w-4 md:w-8 h-0.5 bg-muted-foreground/20 flex-shrink-0" />}
                </div>)}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" onClick={handlePrevious} disabled={currentKickoffStep === 0} className="flex-1 sm:flex-initial text-xs h-8 sm:h-9">
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleNext} disabled={currentKickoffStep === kickoffSteps.length - 1} className="flex-1 sm:flex-initial text-xs h-8 sm:h-9">
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">Next</span>
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Step Content - Scrollable with Fixed Button */}
      <div className="flex flex-col" style={{ height: 'calc(100vh - 300px)', minHeight: '500px' }}>
        <div className="flex-1 overflow-y-auto -mx-2 sm:mx-0 px-2 sm:px-0 pb-4">
          {renderCurrentStep()}
        </div>
        {/* Fixed Button Area - Always Visible */}
        <div className="flex-shrink-0 bg-background border-t pt-4 pb-2 mt-4 -mx-2 sm:mx-0 px-2 sm:px-0">
          <Card>
            <CardContent className="p-3 sm:p-4">
              {!isStepCompleted(currentKickoffStep) ? (
                <div className="flex gap-2">
                  {currentKickoffStep === 0 && (
                    <Button 
                      onClick={async () => {
                        if (currentProjectRun) {
                          await deleteProjectRun(currentProjectRun.id);
                          toast.success('Project removed');
                          if (onExit) onExit();
                        }
                      }} 
                      variant="outline" 
                      className="w-1/4 border-red-300 text-red-700 hover:bg-red-50 text-[10px] sm:text-sm h-7 sm:h-auto sm:py-2 sm:px-3 sm:leading-tight"
                    >
                      <span className="hidden sm:inline sm:block">Not a match -<br />take me back to catalog</span>
                      <span className="sm:hidden">Not a match</span>
                    </Button>
                  )}
                  <Button 
                    onClick={async () => {
                      console.log('🎯 KickoffWorkflow: Step complete button clicked for step:', currentKickoffStep);
                      // For step 2 (ProjectProfileStep), call its save function first
                      if (currentKickoffStep === 2 && (window as any).__projectProfileStepSave) {
                        try {
                          await (window as any).__projectProfileStepSave();
                          // handleStepComplete will be called by ProjectProfileStep's handleSave
                          return;
                        } catch (error) {
                          console.error('Error saving project profile:', error);
                          return; // Don't proceed if save failed
                        }
                      }
                      handleStepComplete(currentKickoffStep);
                    }} 
                    className={`${currentKickoffStep === 0 ? "w-3/4" : "w-full"} bg-green-600 hover:bg-green-700 text-xs sm:text-sm h-9 sm:h-10`}
                  >
                    <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                    <span className="hidden sm:inline">Complete & Continue</span>
                    <span className="sm:hidden">Continue</span>
                  </Button>
                </div>
              ) : (
                <div className="w-full p-2 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-green-800 text-xs sm:text-sm">Step Completed ✓</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>;
};