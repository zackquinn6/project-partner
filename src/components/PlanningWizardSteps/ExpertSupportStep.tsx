import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Headphones } from 'lucide-react';
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

interface ExpertSupportStepProps {
  onComplete: () => void;
  isCompleted: boolean;
  /** When provided (e.g. from UserView), opens Expert Support at host level */
  onOpenExpertSupport?: () => void;
}

export const ExpertSupportStep: React.FC<ExpertSupportStepProps> = ({
  onComplete,
  isCompleted,
  onOpenExpertSupport,
}) => {
  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenExpertSupport) {
      onOpenExpertSupport();
    } else {
      window.dispatchEvent(new CustomEvent('show-expert-help'));
    }
    onComplete();
  };

  return (
    <div className="space-y-3">
      <Card className={PLANNING_WIZARD_STEP_CARD_CLASSNAME}>
        <CardHeader className={PLANNING_WIZARD_STEP_HEADER_CLASSNAME}>
          <CardTitle className={PLANNING_WIZARD_STEP_TITLE_CLASSNAME}>
            <Headphones className="h-5 w-5" aria-hidden />
            Support
            {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className={PLANNING_WIZARD_STEP_CONTENT_CLASSNAME}>
          <div className={PLANNING_WIZARD_STEP_BODY_CLASSNAME}>
            <p className={PLANNING_WIZARD_STEP_DESCRIPTION_CLASSNAME}>
              Configure expert support so you can get guidance when you need it during your project.
            </p>
            <Button
              type="button"
              variant="default"
              className={PLANNING_WIZARD_OPEN_APP_BUTTON_CLASSNAME}
              onClick={handleOpen}
            >
              <Headphones className="shrink-0" aria-hidden />
              Open Expert Support
            </Button>
            <p className={PLANNING_WIZARD_STEP_STATUS_ROW_CLASSNAME}>
              {isCompleted ? '✓ Support reviewed' : '\u00a0'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
