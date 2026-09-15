import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessagesSquare } from 'lucide-react';
import { PlanningToolOpenCardButton } from '@/components/PlanningWizardSteps/PlanningToolOpenCardButton';
import {
  PLANNING_WIZARD_STEP_ACTION_SLOT_CLASSNAME,
  PLANNING_WIZARD_STEP_BODY_CLASSNAME,
  PLANNING_WIZARD_STEP_BUTTON_WRAP_CLASSNAME,
  PLANNING_WIZARD_STEP_CARD_CLASSNAME,
  PLANNING_WIZARD_STEP_CONTENT_CLASSNAME,
  PLANNING_WIZARD_STEP_DESCRIPTION_CLASSNAME,
  PLANNING_WIZARD_STEP_HEADER_CLASSNAME,
  PLANNING_WIZARD_STEP_TITLE_CLASSNAME,
} from '@/components/PlanningWizardSteps/planningWizardOpenAppButton';

interface CommunicationPlanStepProps {
  onComplete: () => void;
  isCompleted: boolean;
  /** Opens Communication Plan at host level (e.g. UserView) */
  onOpenCommunicationPlan?: (options?: { fromPlanningWizard?: boolean; onComplete?: () => void }) => void;
}

export const CommunicationPlanStep: React.FC<CommunicationPlanStepProps> = ({
  onComplete,
  isCompleted: _isCompleted,
  onOpenCommunicationPlan,
}) => {
  const handleOpen = () => {
    if (onOpenCommunicationPlan) {
      onOpenCommunicationPlan({ fromPlanningWizard: true, onComplete });
    } else {
      window.dispatchEvent(new CustomEvent('open-app', { detail: { actionKey: 'communication-plan' } }));
    }
  };

  return (
    <div className="space-y-3">
      <Card className={PLANNING_WIZARD_STEP_CARD_CLASSNAME}>
        <CardHeader className={PLANNING_WIZARD_STEP_HEADER_CLASSNAME}>
          <CardTitle className={PLANNING_WIZARD_STEP_TITLE_CLASSNAME}>
            <MessagesSquare className="h-5 w-5" aria-hidden />
            Communication Plan
          </CardTitle>
        </CardHeader>
        <CardContent className={PLANNING_WIZARD_STEP_CONTENT_CLASSNAME}>
          <div className={PLANNING_WIZARD_STEP_BODY_CLASSNAME}>
            <div className={PLANNING_WIZARD_STEP_ACTION_SLOT_CLASSNAME}>
              <div className={PLANNING_WIZARD_STEP_BUTTON_WRAP_CLASSNAME}>
                <p className={PLANNING_WIZARD_STEP_DESCRIPTION_CLASSNAME}>
                  Set up who needs updates, how often, and send email or copy summaries for group chats.
                </p>
                <PlanningToolOpenCardButton toolId="communication_plan" onClick={handleOpen} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
