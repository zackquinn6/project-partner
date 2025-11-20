import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { createPortal } from 'react-dom';

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
    targetSelector: '[data-tutorial="project-name"]',
    position: 'bottom'
  },
  {
    id: 'progress-bar',
    title: 'Progress Bar',
    description: 'Track your overall project completion. The percentage shows how many steps you\'ve completed, and "Step x of y" shows your current position in the workflow.',
    targetSelector: '[data-tutorial="progress-bar"]',
    position: 'bottom'
  },
  {
    id: 'project-tools',
    title: 'Project Tools',
    description: 'Access helpful tools: Chat for questions, KeyInfo for important details, and Re-Plan to adjust your project timeline.',
    targetSelector: '[data-tutorial="project-tools"]',
    position: 'bottom'
  },
  {
    id: 'workflow-navigation',
    title: 'Workflow Navigation',
    description: 'Browse all phases, operations, and steps in your project. Click on any step to jump directly to it. Completed steps are highlighted in green.',
    targetSelector: '[data-tutorial="workflow-navigation"]',
    position: 'right'
  },
  {
    id: 'step-name',
    title: 'Step Name',
    description: 'The current step you\'re working on. Each step has specific instructions to guide you through the work.',
    targetSelector: '[data-tutorial="step-name"]',
    position: 'bottom'
  },
  {
    id: 'step-instructions',
    title: 'Step Instructions',
    description: 'Detailed guidance for completing this step. Follow these instructions carefully to ensure quality work.',
    targetSelector: '[data-tutorial="step-instructions"]',
    position: 'bottom'
  },
  {
    id: 'detail-level',
    title: 'Detail Level',
    description: 'Adjust how much guidance you receive. Choose Beginner for extra help, Intermediate for standard guidance, or Advanced for key points only. This setting is in the navigation pane.',
    targetSelector: '[data-tutorial="detail-level"]',
    position: 'left'
  },
  {
    id: 'tools',
    title: 'Tools',
    description: 'See all the tools you\'ll need for this step. Make sure you have everything ready before starting.',
    targetSelector: '[data-tutorial="tools-materials"]',
    position: 'bottom'
  },
  {
    id: 'materials',
    title: 'Materials',
    description: 'List of materials required for this step. Check that you have all materials on hand before beginning.',
    targetSelector: '[data-tutorial="tools-materials"]',
    position: 'bottom'
  },
  {
    id: 'apps',
    title: 'Apps for This Step',
    description: 'Helpful apps and resources specific to this step. These can include calculators, guides, or external tools.',
    targetSelector: '[data-tutorial="apps"]',
    position: 'bottom'
  },
  {
    id: 'outputs',
    title: 'Outputs',
    description: 'What you need to complete or verify before moving to the next step. Complete all outputs to mark the step as done.',
    targetSelector: '[data-tutorial="outputs"]',
    position: 'bottom'
  },
  {
    id: 'navigation-buttons',
    title: 'Previous/Next Buttons',
    description: 'Navigate between steps. Use Previous to go back or Next to move forward through your workflow.',
    targetSelector: '[data-tutorial="navigation-buttons"]',
    position: 'top'
  },
  {
    id: 'photos-notes',
    title: 'Add Photos/Notes',
    description: 'Document your work with photos and notes. This helps track progress and can be useful for future reference.',
    targetSelector: '[data-tutorial="photos-notes"]',
    position: 'top'
  },
  {
    id: 'mark-complete',
    title: 'Mark as Complete',
    description: 'When you\'ve finished all outputs for a step, mark it as complete to track your progress and unlock the next step.',
    targetSelector: '[data-tutorial="mark-complete"]',
    position: 'top'
  },
  {
    id: 'report-issue',
    title: 'Report Issue',
    description: 'Found a problem or have feedback? Use this to report issues with the step instructions or project guidance.',
    targetSelector: '[data-tutorial="report-issue"]',
    position: 'top'
  },
  {
    id: 'help-button',
    title: 'Help Button',
    description: 'Access feedback forms, view the product roadmap, and get additional support. Your feedback helps us improve!',
    targetSelector: '[data-tutorial="help-button"]',
    position: 'top'
  }
];

interface TooltipPosition {
  top: number;
  left: number;
  arrowPosition: 'top' | 'bottom' | 'left' | 'right';
}

export function WorkflowTutorial({ open, onOpenChange, onComplete }: WorkflowTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const [highlightPosition, setHighlightPosition] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Calculate tooltip position based on target element
  const calculateTooltipPosition = (element: HTMLElement, preferredPosition: string = 'bottom'): TooltipPosition => {
    const rect = element.getBoundingClientRect();
    const tooltipWidth = 320; // Approximate tooltip width
    const tooltipHeight = 200; // Approximate tooltip height
    const spacing = 16; // Space between element and tooltip
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;
    let arrowPosition: 'top' | 'bottom' | 'left' | 'right' = 'bottom';

    // Try preferred position first, then fallback to others
    const positions = [preferredPosition, 'bottom', 'top', 'right', 'left'];
    
    for (const pos of positions) {
      switch (pos) {
        case 'bottom':
          top = rect.bottom + spacing;
          left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
          arrowPosition = 'top';
          if (top + tooltipHeight <= viewportHeight && left >= 0 && left + tooltipWidth <= viewportWidth) {
            return { top, left, arrowPosition };
          }
          break;
        case 'top':
          top = rect.top - tooltipHeight - spacing;
          left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
          arrowPosition = 'bottom';
          if (top >= 0 && left >= 0 && left + tooltipWidth <= viewportWidth) {
            return { top, left, arrowPosition };
          }
          break;
        case 'right':
          top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
          left = rect.right + spacing;
          arrowPosition = 'left';
          if (left + tooltipWidth <= viewportWidth && top >= 0 && top + tooltipHeight <= viewportHeight) {
            return { top, left, arrowPosition };
          }
          break;
        case 'left':
          top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
          left = rect.left - tooltipWidth - spacing;
          arrowPosition = 'right';
          if (left >= 0 && top >= 0 && top + tooltipHeight <= viewportHeight) {
            return { top, left, arrowPosition };
          }
          break;
      }
    }

    // Fallback to center if all positions fail
    return {
      top: viewportHeight / 2 - tooltipHeight / 2,
      left: viewportWidth / 2 - tooltipWidth / 2,
      arrowPosition: 'bottom'
    };
  };

  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
      setTargetElement(null);
      setTooltipPosition(null);
      setHighlightPosition(null);
      // Remove all highlights
      document.querySelectorAll('.tutorial-highlight-circle').forEach(el => el.remove());
      return;
    }

    const step = tutorialSteps[currentStep];
    if (!step.targetSelector) {
      setTargetElement(null);
      setTooltipPosition(null);
      setHighlightPosition(null);
      return;
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      const element = document.querySelector(step.targetSelector!) as HTMLElement;
      if (element) {
        setTargetElement(element);
        
        // Get initial position
        const rect = element.getBoundingClientRect();
        setHighlightPosition(rect);
        
        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Update highlight and tooltip position after scroll
        setTimeout(() => {
          const updatedRect = element.getBoundingClientRect();
          // Update highlight position after scroll
          setHighlightPosition(updatedRect);
          // Calculate tooltip position
          const position = calculateTooltipPosition(element, step.position);
          setTooltipPosition(position);
        }, 400);
      } else {
        console.warn('Tutorial element not found:', step.targetSelector);
        // Element not found, use center position
        setTooltipPosition({
          top: window.innerHeight / 2 - 100,
          left: window.innerWidth / 2 - 160,
          arrowPosition: 'bottom'
        });
        setHighlightPosition(null);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [open, currentStep]);

  // Create highlight circle overlay
  useEffect(() => {
    if (!highlightPosition || !open) {
      document.querySelectorAll('.tutorial-highlight-circle').forEach(el => el.remove());
      return;
    }

    // Remove existing circles
    document.querySelectorAll('.tutorial-highlight-circle').forEach(el => el.remove());

    // Ensure we have valid dimensions
    if (highlightPosition.width <= 0 || highlightPosition.height <= 0) {
      console.warn('Invalid highlight dimensions:', highlightPosition);
      return;
    }

    // Create circle overlay
    const circle = document.createElement('div');
    circle.className = 'tutorial-highlight-circle';
    circle.style.position = 'fixed';
    circle.style.top = `${highlightPosition.top}px`;
    circle.style.left = `${highlightPosition.left}px`;
    circle.style.width = `${highlightPosition.width}px`;
    circle.style.height = `${highlightPosition.height}px`;
    circle.style.borderRadius = '8px';
    circle.style.border = '3px solid #ef4444'; // Red border
    circle.style.boxShadow = '0 0 0 9999px rgba(0, 0, 0, 0.5), 0 0 20px rgba(239, 68, 68, 0.6)';
    circle.style.pointerEvents = 'none';
    circle.style.zIndex = '9998';
    circle.style.transition = 'all 0.3s ease-in-out';
    circle.style.backgroundColor = 'transparent';
    circle.style.display = 'block';
    
    document.body.appendChild(circle);

    return () => {
      circle.remove();
    };
  }, [highlightPosition, open]);

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
    document.querySelectorAll('.tutorial-highlight-circle').forEach(el => el.remove());
    onComplete();
    onOpenChange(false);
  };

  const handleSkip = () => {
    document.querySelectorAll('.tutorial-highlight-circle').forEach(el => el.remove());
    onComplete();
    onOpenChange(false);
  };

  if (!open) return null;

  const step = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  const tooltipContent = (
    <div
      ref={tooltipRef}
      className="fixed z-[9999] bg-background border border-border rounded-lg shadow-lg p-4 w-80 transition-all duration-300"
      style={{
        top: tooltipPosition?.top ? `${tooltipPosition.top}px` : '50%',
        left: tooltipPosition?.left ? `${tooltipPosition.left}px` : '50%',
        transform: tooltipPosition ? 'none' : 'translate(-50%, -50%)',
        opacity: tooltipPosition ? 1 : 0
      }}
    >
      {/* Arrow */}
      {tooltipPosition && targetElement && (() => {
        const rect = targetElement.getBoundingClientRect();
        const arrowStyles: React.CSSProperties = {
          position: 'absolute',
          width: 0,
          height: 0,
        };

        switch (tooltipPosition.arrowPosition) {
          case 'top':
            arrowStyles.bottom = '-16px';
            arrowStyles.left = '50%';
            arrowStyles.transform = 'translateX(-50%)';
            arrowStyles.borderLeft = '8px solid transparent';
            arrowStyles.borderRight = '8px solid transparent';
            arrowStyles.borderTop = '8px solid hsl(var(--border))';
            break;
          case 'bottom':
            arrowStyles.top = '-16px';
            arrowStyles.left = '50%';
            arrowStyles.transform = 'translateX(-50%)';
            arrowStyles.borderLeft = '8px solid transparent';
            arrowStyles.borderRight = '8px solid transparent';
            arrowStyles.borderBottom = '8px solid hsl(var(--border))';
            break;
          case 'left':
            arrowStyles.right = '-16px';
            arrowStyles.top = '50%';
            arrowStyles.transform = 'translateY(-50%)';
            arrowStyles.borderTop = '8px solid transparent';
            arrowStyles.borderBottom = '8px solid transparent';
            arrowStyles.borderLeft = '8px solid hsl(var(--border))';
            break;
          case 'right':
            arrowStyles.left = '-16px';
            arrowStyles.top = '50%';
            arrowStyles.transform = 'translateY(-50%)';
            arrowStyles.borderTop = '8px solid transparent';
            arrowStyles.borderBottom = '8px solid transparent';
            arrowStyles.borderRight = '8px solid hsl(var(--border))';
            break;
        }

        return <div style={arrowStyles} />;
      })()}

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold">Workflow Tutorial</h3>
          <p className="text-xs text-muted-foreground">
            Step {currentStep + 1} of {tutorialSteps.length}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSkip}
          className="h-6 w-6"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Progress Bar */}
      <Progress value={progress} className="h-1 mb-3" />

      {/* Content */}
      <div className="space-y-2 mb-3">
        <h4 className="font-semibold text-sm">{step.title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {step.description}
        </p>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className="flex-1 h-8 text-xs"
        >
          <ChevronLeft className="h-3 w-3 mr-1" />
          Previous
        </Button>
        <Button
          size="sm"
          onClick={handleNext}
          className="flex-1 h-8 text-xs"
        >
          {currentStep === tutorialSteps.length - 1 ? 'Finish' : 'Next'}
          {currentStep < tutorialSteps.length - 1 && <ChevronRight className="h-3 w-3 ml-1" />}
        </Button>
      </div>
    </div>
  );

  return createPortal(tooltipContent, document.body);
}
