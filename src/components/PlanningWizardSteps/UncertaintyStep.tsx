import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { RiskManagementWindow } from '@/components/RiskManagementWindow';
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
import { useProject } from '@/contexts/ProjectContext';

interface UncertaintyStepProps {
  onComplete: () => void;
  isCompleted: boolean;
  /** When provided (e.g. from UserView), opens Risk Management at host level to avoid nested dialog */
  onOpenRiskManagement?: () => void;
}

export const UncertaintyStep: React.FC<UncertaintyStepProps> = ({
  onComplete,
  isCompleted,
  onOpenRiskManagement
}) => {
  const { currentProjectRun } = useProject();
  const [riskManagementOpen, setRiskManagementOpen] = useState(false);

  const handleOpenRiskManagement = () => {
    if (onOpenRiskManagement) {
      onOpenRiskManagement();
    } else {
      setRiskManagementOpen(true);
    }
    onComplete();
  };

  return (
    <div className="space-y-3">
      <Card className={PLANNING_WIZARD_STEP_CARD_CLASSNAME}>
        <CardHeader className={PLANNING_WIZARD_STEP_HEADER_CLASSNAME}>
          <CardTitle className={PLANNING_WIZARD_STEP_TITLE_CLASSNAME}>
            <AlertTriangle className="h-5 w-5" aria-hidden />
            Risk-Less
            {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className={PLANNING_WIZARD_STEP_CONTENT_CLASSNAME}>
          <div className={PLANNING_WIZARD_STEP_BODY_CLASSNAME}>
            <p className={PLANNING_WIZARD_STEP_DESCRIPTION_CLASSNAME}>
              Identify and plan for things that could impact your timeline and budget
            </p>

            <Button
              type="button"
              variant="default"
              onClick={handleOpenRiskManagement}
              className={PLANNING_WIZARD_OPEN_APP_BUTTON_CLASSNAME}
            >
              <AlertTriangle className="shrink-0" aria-hidden />
              Open Risk-Less
            </Button>

            <p className={PLANNING_WIZARD_STEP_STATUS_ROW_CLASSNAME}>
              {isCompleted ? '✓ Risk-Less step completed' : '\u00a0'}
            </p>
          </div>
        </CardContent>
      </Card>

      {!onOpenRiskManagement && (
        <RiskManagementWindow
          open={riskManagementOpen}
          onOpenChange={setRiskManagementOpen}
          projectRunId={currentProjectRun?.id}
          mode="run"
          readOnly={false}
        />
      )}
    </div>
  );
};
