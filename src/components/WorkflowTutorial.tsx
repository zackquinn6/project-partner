import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
  /** Persisted to profile when user checked "Don't show again" and closes or finishes */
  onPermanentOptOut: () => Promise<void>;
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
    description: 'Access helpful tools: Experts for questions, Key Characteristics for important details, and Re-Plan to adjust your project timeline.',
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
    id: 'step-checklist',
    title: 'Step Checklist',
    description: 'What you need to complete or verify before moving to the next step. Complete all items to mark the step as done.',
    targetSelector: '[data-tutorial="step-checklist"]',
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
    description: 'When you\'ve finished all checklist items for a step, mark it as complete to track your progress and unlock the next step.',
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

/** Layout size used for viewport clamping (must match card max dimensions). */
const TOOLTIP_W = 320;
const TOOLTIP_H = 380;

function clampTooltipPosition(
  top: number,
  left: number,
  viewportWidth: number,
  viewportHeight: number,
  tw: number,
  th: number
): { top: number; left: number } {
  const pad = 8;
  const maxTop = viewportHeight - th - pad;
  const maxLeft = viewportWidth - tw - pad;
  return {
    top: Math.max(pad, Math.min(top, maxTop)),
    left: Math.max(pad, Math.min(left, maxLeft)),
  };
}

export function WorkflowTutorial({ open, onOpenChange, onPermanentOptOut }: WorkflowTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const [highlightPosition, setHighlightPosition] = useState<DOMRect | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setDontShowAgain(false);
      setCurrentStep(0);
    }
  }, [open]);

  const calculateTooltipPosition = (element: HTMLElement, preferredPosition: string = 'bottom'): TooltipPosition => {
    const rect = element.getBoundingClientRect();
    const tooltipWidth = TOOLTIP_W;
    const tooltipHeight = TOOLTIP_H;
    const spacing = 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;
    let arrowPosition: 'top' | 'bottom' | 'left' | 'right' = 'bottom';

    const positions = [preferredPosition, 'bottom', 'top', 'right', 'left'];

    for (const pos of positions) {
      switch (pos) {
        case 'bottom':
          top = rect.bottom + spacing;
          left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
          arrowPosition = 'top';
          if (top + tooltipHeight <= viewportHeight && left >= 0 && left + tooltipWidth <= viewportWidth) {
            const c = clampTooltipPosition(top, left, viewportWidth, viewportHeight, tooltipWidth, tooltipHeight);
            return { top: c.top, left: c.left, arrowPosition };
          }
          break;
        case 'top':
          top = rect.top - tooltipHeight - spacing;
          left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
          arrowPosition = 'bottom';
          if (top >= 0 && left >= 0 && left + tooltipWidth <= viewportWidth) {
            const c = clampTooltipPosition(top, left, viewportWidth, viewportHeight, tooltipWidth, tooltipHeight);
            return { top: c.top, left: c.left, arrowPosition };
          }
          break;
        case 'right':
          top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
          left = rect.right + spacing;
          arrowPosition = 'left';
          if (left + tooltipWidth <= viewportWidth && top >= 0 && top + tooltipHeight <= viewportHeight) {
            const c = clampTooltipPosition(top, left, viewportWidth, viewportHeight, tooltipWidth, tooltipHeight);
            return { top: c.top, left: c.left, arrowPosition };
          }
          break;
        case 'left':
          top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
          left = rect.left - tooltipWidth - spacing;
          arrowPosition = 'right';
          if (left >= 0 && top >= 0 && top + tooltipHeight <= viewportHeight) {
            const c = clampTooltipPosition(top, left, viewportWidth, viewportHeight, tooltipWidth, tooltipHeight);
            return { top: c.top, left: c.left, arrowPosition };
          }
          break;
      }
    }

    const fallbackTop = viewportHeight / 2 - tooltipHeight / 2;
    const fallbackLeft = viewportWidth / 2 - tooltipWidth / 2;
    const c = clampTooltipPosition(fallbackTop, fallbackLeft, viewportWidth, viewportHeight, tooltipWidth, tooltipHeight);
    return {
      top: c.top,
      left: c.left,
      arrowPosition: 'bottom'
    };
  };

  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
      setTargetElement(null);
      setTooltipPosition(null);
      setHighlightPosition(null);
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

    const timer = setTimeout(() => {
      const element = document.querySelector(step.targetSelector!) as HTMLElement;
      if (element) {
        setTargetElement(element);

        const rect = element.getBoundingClientRect();
        setHighlightPosition(rect);

        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        setTimeout(() => {
          const updatedRect = element.getBoundingClientRect();
          setHighlightPosition(updatedRect);
          const position = calculateTooltipPosition(element, step.position);
          setTooltipPosition(position);
        }, 400);
      } else {
        console.warn('Tutorial element not found:', step.targetSelector);
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const c = clampTooltipPosition(
          vh / 2 - TOOLTIP_H / 2,
          vw / 2 - TOOLTIP_W / 2,
          vw,
          vh,
          TOOLTIP_W,
          TOOLTIP_H
        );
        setTooltipPosition({
          top: c.top,
          left: c.left,
          arrowPosition: 'bottom'
        });
        setHighlightPosition(null);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [open, currentStep]);

  useEffect(() => {
    if (!highlightPosition || !open) {
      document.querySelectorAll('.tutorial-highlight-circle').forEach(el => el.remove());
      return;
    }

    document.querySelectorAll('.tutorial-highlight-circle').forEach(el => el.remove());

    if (highlightPosition.width <= 0 || highlightPosition.height <= 0) {
      console.warn('Invalid highlight dimensions:', highlightPosition);
      return;
    }

    const circle = document.createElement('div');
    circle.className = 'tutorial-highlight-circle';
    circle.style.position = 'fixed';
    circle.style.top = `${highlightPosition.top}px`;
    circle.style.left = `${highlightPosition.left}px`;
    circle.style.width = `${highlightPosition.width}px`;
    circle.style.height = `${highlightPosition.height}px`;
    circle.style.borderRadius = '8px';
    circle.style.border = '3px solid #ef4444';
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

  const dismiss = async () => {
    document.querySelectorAll('.tutorial-highlight-circle').forEach(el => el.remove());
    if (dontShowAgain) {
      try {
        await onPermanentOptOut();
      } catch (e) {
        console.error('Workflow tutorial: failed to save opt-out', e);
      }
    }
    onOpenChange(false);
  };

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      void dismiss();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!open) return null;

  const step = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  const tooltipContent = (
    <div
      ref={tooltipRef}
      className="fixed z-[9999] bg-background border border-border rounded-lg shadow-lg flex flex-col max-h-[min(85dvh,26rem)] w-[min(20rem,calc(100vw-1rem))] transition-all duration-300 overflow-hidden"
      style={{
        top: tooltipPosition != null ? `${tooltipPosition.top}px` : '50%',
        left: tooltipPosition != null ? `${tooltipPosition.left}px` : '50%',
        transform: tooltipPosition != null ? 'none' : 'translate(-50%, -50%)',
        opacity: tooltipPosition != null ? 1 : 0,
        maxWidth: TOOLTIP_W,
      }}
    >
      {tooltipPosition && targetElement && (() => {
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

      <div className="flex flex-col min-h-0 flex-1 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 mb-2 shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Workflow Tutorial</h3>
            <p className="text-xs text-muted-foreground">
              Step {currentStep + 1} of {tutorialSteps.length}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => void dismiss()}
            className="h-8 w-8 shrink-0"
            aria-label="Close tutorial"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Progress value={progress} className="h-1 mb-2 shrink-0" />

        <div className="space-y-2 mb-2 min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <h4 className="font-semibold text-sm">{step.title}</h4>
          <p className="text-xs text-muted-foreground leading-relaxed pr-1">
            {step.description}
          </p>
        </div>

        <div className="shrink-0 pt-2 border-t space-y-3">
          <div className="flex items-start gap-2">
            <Checkbox
              id="workflow-tutorial-dont-show"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
              className="mt-0.5"
            />
            <Label
              htmlFor="workflow-tutorial-dont-show"
              className="text-xs font-normal leading-snug cursor-pointer"
            >
              Don&apos;t show this tutorial again (saved to your profile)
            </Label>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="w-full sm:flex-1 h-9 text-xs"
            >
              <ChevronLeft className="h-3 w-3 mr-1 shrink-0" />
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleNext}
              className="w-full sm:flex-1 h-9 text-xs"
            >
              {currentStep === tutorialSteps.length - 1 ? 'Finish' : 'Next'}
              {currentStep < tutorialSteps.length - 1 && (
                <ChevronRight className="h-3 w-3 ml-1 shrink-0" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(tooltipContent, document.body);
}
