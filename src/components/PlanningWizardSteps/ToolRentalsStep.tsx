import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hammer } from 'lucide-react';
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

interface ToolRentalsStepProps {
  onComplete: () => void;
  isCompleted: boolean;
  /** Opens Tool Access / rentals at host level (e.g. UserView) to avoid relying on window events */
  onOpenToolRentals?: () => void;
}

export const ToolRentalsStep: React.FC<ToolRentalsStepProps> = ({
  onComplete,
  isCompleted,
  onOpenToolRentals,
}) => {
  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenToolRentals) {
      onOpenToolRentals();
    } else {
      window.dispatchEvent(new CustomEvent('show-tool-rentals'));
    }
    onComplete();
  };

  return (
    <div className="space-y-3">
      <Card className={PLANNING_WIZARD_STEP_CARD_CLASSNAME}>
        <CardHeader className={PLANNING_WIZARD_STEP_HEADER_CLASSNAME}>
          <CardTitle className={PLANNING_WIZARD_STEP_TITLE_CLASSNAME}>
            <Hammer className="h-5 w-5" aria-hidden />
            Tool Rental
            {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className={PLANNING_WIZARD_STEP_CONTENT_CLASSNAME}>
          <div className={PLANNING_WIZARD_STEP_BODY_CLASSNAME}>
            <p className={PLANNING_WIZARD_STEP_DESCRIPTION_CLASSNAME}>
              Create an account to align your project to the tool rental period
            </p>

            <Button
              type="button"
              variant="default"
              onClick={handleOpen}
              className={PLANNING_WIZARD_OPEN_APP_BUTTON_CLASSNAME}
            >
              <Hammer className="shrink-0" aria-hidden />
              Open Tool Rental
            </Button>

            <p className={PLANNING_WIZARD_STEP_STATUS_ROW_CLASSNAME}>
              {isCompleted ? '✓ Tool Rental reviewed' : '\u00a0'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
