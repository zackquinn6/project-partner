import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
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

interface BudgetStepProps {
  onComplete: () => void;
  isCompleted: boolean;
  /** When provided (e.g. from UserView), opens Budget directly so the link works from the wizard */
  onOpenBudgeting?: (options?: { fromPlanningWizard?: boolean; onComplete?: () => void }) => void;
}

export const BudgetStep: React.FC<BudgetStepProps> = ({
  onComplete,
  isCompleted: _isCompleted,
  onOpenBudgeting,
}) => {
  const handleOpenBudgeting = () => {
    if (onOpenBudgeting) {
      onOpenBudgeting({ fromPlanningWizard: true, onComplete });
    } else {
      window.dispatchEvent(
        new CustomEvent('open-project-budgeting', {
          detail: { fromPlanningWizard: true, onComplete },
        })
      );
    }
  };

  return (
    <div className="space-y-3">
      <Card className={PLANNING_WIZARD_STEP_CARD_CLASSNAME}>
        <CardHeader className={PLANNING_WIZARD_STEP_HEADER_CLASSNAME}>
          <CardTitle className={PLANNING_WIZARD_STEP_TITLE_CLASSNAME}>
            <DollarSign className="h-5 w-5" aria-hidden />
            Budget
          </CardTitle>
        </CardHeader>
        <CardContent className={PLANNING_WIZARD_STEP_CONTENT_CLASSNAME}>
          <div className={PLANNING_WIZARD_STEP_BODY_CLASSNAME}>
            <div className={PLANNING_WIZARD_STEP_ACTION_SLOT_CLASSNAME}>
              <div className={PLANNING_WIZARD_STEP_BUTTON_WRAP_CLASSNAME}>
                <p className={PLANNING_WIZARD_STEP_DESCRIPTION_CLASSNAME}>
                  Manage finances for this project.
                </p>
                <PlanningToolOpenCardButton toolId="budget" onClick={handleOpenBudgeting} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
