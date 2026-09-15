import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Headphones } from 'lucide-react';
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

interface ExpertSupportStepProps {
  onComplete: () => void;
  isCompleted: boolean;
  /** When provided (e.g. from UserView), opens Expert Support at host level */
  onOpenExpertSupport?: (options?: { fromPlanningWizard?: boolean; onComplete?: () => void }) => void;
}

export const ExpertSupportStep: React.FC<ExpertSupportStepProps> = ({
  onComplete,
  isCompleted: _isCompleted,
  onOpenExpertSupport,
}) => {
  const handleOpen = () => {
    if (onOpenExpertSupport) {
      onOpenExpertSupport({ fromPlanningWizard: true, onComplete });
    } else {
      window.dispatchEvent(new CustomEvent('show-expert-help'));
    }
  };

  return (
    <div className="space-y-3">
      <Card className={PLANNING_WIZARD_STEP_CARD_CLASSNAME}>
        <CardHeader className={PLANNING_WIZARD_STEP_HEADER_CLASSNAME}>
          <CardTitle className={PLANNING_WIZARD_STEP_TITLE_CLASSNAME}>
            <Headphones className="h-5 w-5" aria-hidden />
            Support
          </CardTitle>
        </CardHeader>
        <CardContent className={PLANNING_WIZARD_STEP_CONTENT_CLASSNAME}>
          <div className={PLANNING_WIZARD_STEP_BODY_CLASSNAME}>
            <div className={PLANNING_WIZARD_STEP_ACTION_SLOT_CLASSNAME}>
              <div className={PLANNING_WIZARD_STEP_BUTTON_WRAP_CLASSNAME}>
                <p className={PLANNING_WIZARD_STEP_DESCRIPTION_CLASSNAME}>
                  Configure expert support so you can get guidance when you need it during your project.
                </p>
                <PlanningToolOpenCardButton toolId="expert_support" onClick={handleOpen} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
