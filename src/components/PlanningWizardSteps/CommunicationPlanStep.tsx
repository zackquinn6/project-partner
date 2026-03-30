import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessagesSquare } from 'lucide-react';
import { PLANNING_WIZARD_OPEN_APP_BUTTON_CLASSNAME } from '@/components/PlanningWizardSteps/planningWizardOpenAppButton';

interface CommunicationPlanStepProps {
  onComplete: () => void;
  isCompleted: boolean;
  /** Opens Communication Plan at host level (e.g. UserView) */
  onOpenCommunicationPlan?: () => void;
}

export const CommunicationPlanStep: React.FC<CommunicationPlanStepProps> = ({
  onComplete,
  isCompleted,
  onOpenCommunicationPlan,
}) => {
  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenCommunicationPlan) {
      onOpenCommunicationPlan();
    } else {
      window.dispatchEvent(new CustomEvent('open-app', { detail: { actionKey: 'communication-plan' } }));
    }
    onComplete();
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
            <MessagesSquare className="w-5 h-5" aria-hidden />
            Communication Plan
            {isCompleted && (
              <Badge variant="secondary" className="flex-shrink-0 text-xs">
                Complete
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:p-4">
          <div className="text-center space-y-4 py-6">
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Set up who needs updates, how often, and send email or copy summaries for group chats — optional
              for this project.
            </p>

            <Button
              type="button"
              variant="default"
              onClick={handleOpen}
              className={PLANNING_WIZARD_OPEN_APP_BUTTON_CLASSNAME}
            >
              <MessagesSquare className="shrink-0" aria-hidden />
              Open Communication Plan
            </Button>

            {isCompleted && (
              <p className="text-xs sm:text-sm text-green-600 font-medium">✓ Communication Plan step completed</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
