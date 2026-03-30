import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign } from 'lucide-react';
import {
  PLANNING_WIZARD_OPEN_APP_BUTTON_CLASSNAME,
  PLANNING_WIZARD_STEP_BODY_CLASSNAME,
  PLANNING_WIZARD_STEP_CARD_CLASSNAME,
  PLANNING_WIZARD_STEP_CONTENT_CLASSNAME,
  PLANNING_WIZARD_STEP_DESCRIPTION_CLASSNAME,
  PLANNING_WIZARD_STEP_HEADER_CLASSNAME,
  PLANNING_WIZARD_STEP_STATUS_ROW_CLASSNAME,
  PLANNING_WIZARD_STEP_TITLE_CLASSNAME,
} from '@/components/PlanningWizardSteps/planningWizardOpenAppButton';

interface BudgetStepProps {
  onComplete: () => void;
  isCompleted: boolean;
  /** When provided (e.g. from UserView), opens Project Budgeting directly so the link works from the wizard */
  onOpenBudgeting?: () => void;
}

export const BudgetStep: React.FC<BudgetStepProps> = ({
  onComplete,
  isCompleted,
  onOpenBudgeting
}) => {
  const handleOpenBudgeting = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenBudgeting) {
      onOpenBudgeting();
    } else {
      window.dispatchEvent(new CustomEvent('open-project-budgeting'));
    }
    onComplete();
  };

  return (
    <div className="space-y-3">
      <Card className={PLANNING_WIZARD_STEP_CARD_CLASSNAME}>
        <CardHeader className={PLANNING_WIZARD_STEP_HEADER_CLASSNAME}>
          <CardTitle className={PLANNING_WIZARD_STEP_TITLE_CLASSNAME}>
            <DollarSign className="h-5 w-5" aria-hidden />
            Budget
            {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className={PLANNING_WIZARD_STEP_CONTENT_CLASSNAME}>
          <div className={PLANNING_WIZARD_STEP_BODY_CLASSNAME}>
            <p className={PLANNING_WIZARD_STEP_DESCRIPTION_CLASSNAME}>
              Manage finances for this project.
            </p>

            <Button
              type="button"
              variant="default"
              onClick={handleOpenBudgeting}
              className={PLANNING_WIZARD_OPEN_APP_BUTTON_CLASSNAME}
            >
              <DollarSign className="shrink-0" aria-hidden />
              Open Project Budgeting
            </Button>

            <p className={PLANNING_WIZARD_STEP_STATUS_ROW_CLASSNAME}>
              {isCompleted ? '✓ Budget completed' : '\u00a0'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
