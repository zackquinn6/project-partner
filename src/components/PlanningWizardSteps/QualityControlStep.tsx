import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck } from 'lucide-react';
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

interface QualityControlStepProps {
  onComplete: () => void;
  isCompleted: boolean;
  /** Opens the full Quality Control app with settings accordion expanded */
  onOpenQualityControlApp?: () => void;
}

export const QualityControlStep: React.FC<QualityControlStepProps> = ({
  onComplete,
  isCompleted,
  onOpenQualityControlApp,
}) => {
  return (
    <div className="space-y-3">
      <Card className={PLANNING_WIZARD_STEP_CARD_CLASSNAME}>
        <CardHeader className={PLANNING_WIZARD_STEP_HEADER_CLASSNAME}>
          <CardTitle className={PLANNING_WIZARD_STEP_TITLE_CLASSNAME}>
            <ClipboardCheck className="h-5 w-5" aria-hidden />
            Quality
            {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className={PLANNING_WIZARD_STEP_CONTENT_CLASSNAME}>
          <div className={PLANNING_WIZARD_STEP_BODY_CLASSNAME}>
            <p className={PLANNING_WIZARD_STEP_DESCRIPTION_CLASSNAME}>
              Set the detail level of quality (documentation) tracking.
            </p>
            <Button
              type="button"
              variant="default"
              className={PLANNING_WIZARD_OPEN_APP_BUTTON_CLASSNAME}
              onClick={() => {
                onOpenQualityControlApp?.();
                onComplete();
              }}
            >
              <ClipboardCheck className="shrink-0" aria-hidden />
              Open Quality Control
            </Button>
            <p className={PLANNING_WIZARD_STEP_STATUS_ROW_CLASSNAME}>
              {isCompleted ? '✓ Quality reviewed' : '\u00a0'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
