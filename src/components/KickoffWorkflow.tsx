import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { DIYProfileStep } from './KickoffSteps/DIYProfileStep';
import { ProjectOverviewStep } from './KickoffSteps/ProjectOverviewStep';
import { ProjectProfileStep } from './KickoffSteps/ProjectProfileStep';

interface KickoffWorkflowProps {
  onKickoffComplete: () => void;
  onExit?: () => void; // Add optional exit handler
}

export const KickoffWorkflow: React.FC<KickoffWorkflowProps> = ({ onKickoffComplete, onExit }) => {
  const { currentProjectRun, updateProjectRun } = useProject();
  const [currentKickoffStep, setCurrentKickoffStep] = useState(0);
  const [completedKickoffSteps, setCompletedKickoffSteps] = useState<Set<number>>(new Set());
  const [checkedOutputs, setCheckedOutputs] = useState<Record<string, Set<string>>>({});

  const kickoffSteps = [
    {
      id: 'kickoff-step-1',
      title: 'DIY Profile',
      description: 'Complete your DIY profile for personalized guidance'
    },
    {
      id: 'kickoff-step-2',
      title: 'Project Overview',
      description: 'Review and customize your project details'
    },
    {
      id: 'kickoff-step-3',
      title: 'Project Profile',
      description: 'Set up your project team and home selection'
    }
  ];

  // Initialize completed steps from project run data
  useEffect(() => {
    if (currentProjectRun?.completedSteps) {
      const kickoffStepIds = ['kickoff-step-1', 'kickoff-step-2', 'kickoff-step-3'];
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
        setCurrentKickoffStep(2); // All complete, show last step (index 2 for 3 steps)
      }
    }
  }, [currentProjectRun]);

  const handleStepComplete = async (stepIndex: number) => {
    console.log("🎯 handleStepComplete called with stepIndex:", stepIndex);
    
    if (!currentProjectRun) {
      console.error("❌ handleStepComplete: currentProjectRun is null/undefined!");
      return;
    }

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
        return <DIYProfileStep {...stepProps} />;
      case 1:
        return <ProjectOverviewStep {...stepProps} />;
      case 2:
        return <ProjectProfileStep {...stepProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Progress Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 rounded-t-lg shadow-lg flex-shrink-0">
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Project Kickoff</h2>
            <p className="text-sm opacity-90">Complete these steps to begin your project</p>
          </div>
          
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">Overall Progress</span>
              <span className="font-bold">{completedKickoffSteps.size} of {kickoffSteps.length} steps completed</span>
            </div>
            <Progress value={progress} className="h-3 bg-white/20" />
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-between gap-2">
            {kickoffSteps.map((step, index) => {
              const isActive = currentKickoffStep === index;
              const isCompleted = isStepCompleted(index);
              
              return (
                <div key={step.id} className="flex-1">
                  <div 
                    className={`
                      flex flex-col items-center gap-2 p-3 rounded-lg transition-all cursor-pointer
                      ${isActive ? 'bg-white/20 shadow-md' : 'hover:bg-white/10'}
                    `}
                    onClick={() => setCurrentKickoffStep(index)}
                  >
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-base font-bold border-2
                      ${isCompleted ? 'bg-green-500 border-green-400' : isActive ? 'bg-white text-primary border-white' : 'bg-white/30 border-white/50'}
                    `}>
                      {isCompleted ? <CheckCircle className="w-6 h-6" /> : index + 1}
                    </div>
                    <span className={`text-xs text-center ${isActive ? 'font-semibold' : 'opacity-75'}`}>
                      Step {index + 1}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6 bg-background">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary flex-shrink-0">
              <span className="text-xl font-bold text-primary">{currentKickoffStep + 1}</span>
            </div>
            <div>
              <h3 className="text-2xl font-bold">{kickoffSteps[currentKickoffStep].title}</h3>
              <p className="text-sm text-muted-foreground">{kickoffSteps[currentKickoffStep].description}</p>
            </div>
          </div>
          {renderCurrentStep()}
        </div>
      </div>

      {/* Navigation Footer - Fixed at Bottom */}
      <div className="border-t bg-muted/30 p-4 flex items-center justify-between gap-4 flex-shrink-0">
        <Button 
          onClick={handlePrevious} 
          disabled={currentKickoffStep === 0}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>
        
        <div className="text-sm text-muted-foreground">
          Step {currentKickoffStep + 1} of {kickoffSteps.length}
        </div>
        
        <Button 
          onClick={handleNext} 
          disabled={currentKickoffStep === kickoffSteps.length - 1}
          className="flex items-center gap-2"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};