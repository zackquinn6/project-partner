import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessagesSquare } from 'lucide-react';
import {
  PLANNING_WIZARD_OPEN_APP_BUTTON_CLASSNAME,
  PLANNING_WIZARD_STEP_ACTION_SLOT_CLASSNAME,
  PLANNING_WIZARD_STEP_BODY_CLASSNAME,
  PLANNING_WIZARD_STEP_BUTTON_WRAP_CLASSNAME,
  PLANNING_WIZARD_STEP_CARD_CLASSNAME,
  PLANNING_WIZARD_STEP_CONTENT_CLASSNAME,
  PLANNING_WIZARD_STEP_DESCRIPTION_CLASSNAME,
  PLANNING_WIZARD_STEP_HEADER_CLASSNAME,
  PLANNING_WIZARD_STEP_STATUS_ROW_CLASSNAME,
  PLANNING_WIZARD_STEP_TITLE_CLASSNAME,
} from '@/components/PlanningWizardSteps/planningWizardOpenAppButton';

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
      <Card className={PLANNING_WIZARD_STEP_CARD_CLASSNAME}>
        <CardHeader className={PLANNING_WIZARD_STEP_HEADER_CLASSNAME}>
          <CardTitle className={PLANNING_WIZARD_STEP_TITLE_CLASSNAME}>
            <MessagesSquare className="h-5 w-5" aria-hidden />
            Communication Plan
            {isCompleted && (
              <Badge variant="secondary" className="flex-shrink-0 text-xs">
                Complete
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className={PLANNING_WIZARD_STEP_CONTENT_CLASSNAME}>
          <div className={PLANNING_WIZARD_STEP_BODY_CLASSNAME}>
            <p className={PLANNING_WIZARD_STEP_DESCRIPTION_CLASSNAME}>
              Set up who needs updates, how often, and send email or copy summaries for group chats.
            </p>

            <div className={PLANNING_WIZARD_STEP_ACTION_SLOT_CLASSNAME}>
              <div className={PLANNING_WIZARD_STEP_BUTTON_WRAP_CLASSNAME}>
                <Button
                  type="button"
                  variant="default"
                  onClick={handleOpen}
                  className={PLANNING_WIZARD_OPEN_APP_BUTTON_CLASSNAME}
                >
                  <MessagesSquare className="shrink-0" aria-hidden />
                  Open Communication Plan
                </Button>
              </div>
            </div>

            <p className={PLANNING_WIZARD_STEP_STATUS_ROW_CLASSNAME}>
              {isCompleted ? '✓ Communication Plan step completed' : '\u00a0'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
