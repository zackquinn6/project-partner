import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings } from 'lucide-react';
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

interface CustomizationStepProps {
  onComplete: () => void;
  isCompleted: boolean;
}

export const CustomizationStep: React.FC<CustomizationStepProps> = ({
  onComplete,
  isCompleted
}) => {
  const handleOpenCustomizer = () => {
    window.dispatchEvent(new CustomEvent('open-project-customizer', {
      detail: { fromPlanningWizard: true, onComplete }
    }));
  };

  return (
    <div className="space-y-3">
      <Card className={PLANNING_WIZARD_STEP_CARD_CLASSNAME}>
        <CardHeader className={PLANNING_WIZARD_STEP_HEADER_CLASSNAME}>
          <CardTitle className={PLANNING_WIZARD_STEP_TITLE_CLASSNAME}>
            <Settings className="h-5 w-5" aria-hidden />
            Customize
            {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className={PLANNING_WIZARD_STEP_CONTENT_CLASSNAME}>
          <div className={PLANNING_WIZARD_STEP_BODY_CLASSNAME}>
            <p className={PLANNING_WIZARD_STEP_DESCRIPTION_CLASSNAME}>
              Make choices for your unique project to plan out the work to be done
            </p>

            <Button
              type="button"
              variant="default"
              onClick={handleOpenCustomizer}
              className={PLANNING_WIZARD_OPEN_APP_BUTTON_CLASSNAME}
            >
              <Settings className="shrink-0" aria-hidden />
              Open Customize
            </Button>

            <p className={PLANNING_WIZARD_STEP_STATUS_ROW_CLASSNAME}>
              {isCompleted ? '✓ Customize completed' : '\u00a0'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
