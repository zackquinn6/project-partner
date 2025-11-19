import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, X, HelpCircle } from 'lucide-react';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string; // CSS selector for highlighting
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface WorkflowTutorialProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'project-name',
    title: 'Project Name',
    description: 'This shows the name of your current project. You can see your progress and navigate through all project steps from here.',
    position: 'bottom'
  },
  {
    id: 'progress-bar',
    title: 'Progress Bar',
    description: 'Track your overall project completion. The percentage shows how many steps you\'ve completed, and "Step x of y" shows your current position in the workflow.',
    position: 'bottom'
  },
  {
    id: 'project-tools',
    title: 'Project Tools',
    description: 'Access helpful tools: Chat for questions, KeyInfo for important details, and Re-Plan to adjust your project timeline.',
    position: 'bottom'
  },
  {
    id: 'workflow-navigation',
    title: 'Workflow Navigation',
    description: 'Browse all phases, operations, and steps in your project. Click on any step to jump directly to it. Completed steps are highlighted in green.',
    position: 'right'
  },
  {
    id: 'step-name',
    title: 'Step Name',
    description: 'The current step you\'re working on. Each step has specific instructions to guide you through the work.',
    position: 'bottom'
  },
  {
    id: 'step-instructions',
    title: 'Step Instructions',
    description: 'Detailed guidance for completing this step. Follow these instructions carefully to ensure quality work.',
    position: 'bottom'
  },
  {
    id: 'detail-level',
    title: 'Detail Level',
    description: 'Adjust how much guidance you receive. Choose Beginner for extra help, Intermediate for standard guidance, or Advanced for key points only. This setting is in the navigation pane.',
    position: 'bottom'
  },
  {
    id: 'tools',
    title: 'Tools',
    description: 'See all the tools you\'ll need for this step. Make sure you have everything ready before starting.',
    position: 'bottom'
  },
  {
    id: 'materials',
    title: 'Materials',
    description: 'List of materials required for this step. Check that you have all materials on hand before beginning.',
    position: 'bottom'
  },
  {
    id: 'apps',
    title: 'Apps for This Step',
    description: 'Helpful apps and resources specific to this step. These can include calculators, guides, or external tools.',
    position: 'bottom'
  },
  {
    id: 'outputs',
    title: 'Outputs',
    description: 'What you need to complete or verify before moving to the next step. Complete all outputs to mark the step as done.',
    position: 'bottom'
  },
  {
    id: 'navigation-buttons',
    title: 'Previous/Next Buttons',
    description: 'Navigate between steps. Use Previous to go back or Next to move forward through your workflow.',
    position: 'top'
  },
  {
    id: 'photos-notes',
    title: 'Add Photos/Notes',
    description: 'Document your work with photos and notes. This helps track progress and can be useful for future reference.',
    position: 'top'
  },
  {
    id: 'mark-complete',
    title: 'Mark as Complete',
    description: 'When you\'ve finished all outputs for a step, mark it as complete to track your progress and unlock the next step.',
    position: 'top'
  },
  {
    id: 'report-issue',
    title: 'Report Issue',
    description: 'Found a problem or have feedback? Use this to report issues with the step instructions or project guidance.',
    position: 'top'
  },
  {
    id: 'help-button',
    title: 'Help Button',
    description: 'Access feedback forms, view the product roadmap, and get additional support. Your feedback helps us improve!',
    position: 'top'
  }
];

export function WorkflowTutorial({ open, onOpenChange, onComplete }: WorkflowTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
      removeHighlight();
      return;
    }

    // Highlight the current step's target element if selector is provided
    const step = tutorialSteps[currentStep];
    if (step.targetSelector) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const element = document.querySelector(step.targetSelector!) as HTMLElement;
        if (element) {
          setHighlightedElement(element);
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add highlight class
          element.classList.add('tutorial-highlight');
        }
      }, 100);

      return () => {
        clearTimeout(timer);
        removeHighlight();
      };
    }

    return () => {
      removeHighlight();
    };
  }, [open, currentStep]);

  const removeHighlight = () => {
    if (highlightedElement) {
      highlightedElement.classList.remove('tutorial-highlight');
    }
    // Also remove from all potential targets
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
      el.classList.remove('tutorial-highlight');
    });
  };

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    removeHighlight();
    onComplete();
    onOpenChange(false);
  };

  const handleSkip = () => {
    removeHighlight();
    onComplete();
    onOpenChange(false);
  };

  const step = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Workflow Tutorial</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Step {currentStep + 1} of {tutorialSteps.length}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress Bar */}
          <Progress value={progress} className="h-2" />

          {/* Content */}
          <div className="space-y-2 py-4">
            <h4 className="font-semibold text-base">{step.title}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex-1"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              onClick={handleNext}
              className="flex-1"
            >
              {currentStep === tutorialSteps.length - 1 ? 'Finish' : 'Next'}
              {currentStep < tutorialSteps.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

