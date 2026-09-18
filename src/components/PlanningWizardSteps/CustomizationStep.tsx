import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';
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

interface CustomizationStepProps {
  onComplete: () => void;
  isCompleted: boolean;
}

export const CustomizationStep: React.FC<CustomizationStepProps> = ({
  onComplete,
  isCompleted: _isCompleted,
}) => {
  const handleOpenCustomizer = () => {
    window.dispatchEvent(
      new CustomEvent('open-project-customizer', {
        detail: { fromPlanningWizard: true, onComplete },
      })
    );
  };

  return (
    <div className="space-y-3">
      <Card className={PLANNING_WIZARD_STEP_CARD_CLASSNAME}>
        <CardHeader className={PLANNING_WIZARD_STEP_HEADER_CLASSNAME}>
          <CardTitle className={PLANNING_WIZARD_STEP_TITLE_CLASSNAME}>
            <Settings className="h-5 w-5" aria-hidden />
            Scope
          </CardTitle>
        </CardHeader>
        <CardContent className={PLANNING_WIZARD_STEP_CONTENT_CLASSNAME}>
          <div className={PLANNING_WIZARD_STEP_BODY_CLASSNAME}>
            <div className={PLANNING_WIZARD_STEP_ACTION_SLOT_CLASSNAME}>
              <div className={PLANNING_WIZARD_STEP_BUTTON_WRAP_CLASSNAME}>
                <p className={PLANNING_WIZARD_STEP_DESCRIPTION_CLASSNAME}>
                  Make the decisions that customize your project
                </p>
                <PlanningToolOpenCardButton toolId="scope" onClick={handleOpenCustomizer} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
