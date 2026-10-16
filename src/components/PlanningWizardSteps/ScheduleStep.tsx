import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Sheet as SheetIcon } from 'lucide-react';
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

interface ScheduleStepProps {
  onComplete: () => void;
  isCompleted: boolean;
}

export const ScheduleStep: React.FC<ScheduleStepProps> = ({
  onComplete,
  isCompleted: _isCompleted,
}) => {
  const handleOpenScheduler = () => {
    window.dispatchEvent(
      new CustomEvent('open-project-scheduler', {
        detail: { fromPlanningWizard: true, onComplete },
      })
    );
  };

  const handleOpenSheet = () => {
    window.dispatchEvent(
      new CustomEvent('open-project-scheduler', {
        detail: { fromPlanningWizard: true, onComplete, view: 'sheet' },
      })
    );
  };

  return (
    <div className="space-y-3">
      <Card className={PLANNING_WIZARD_STEP_CARD_CLASSNAME}>
        <CardHeader className={PLANNING_WIZARD_STEP_HEADER_CLASSNAME}>
          <CardTitle className={PLANNING_WIZARD_STEP_TITLE_CLASSNAME}>
            <Calendar className="h-5 w-5" aria-hidden />
            Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className={PLANNING_WIZARD_STEP_CONTENT_CLASSNAME}>
          <div className={PLANNING_WIZARD_STEP_BODY_CLASSNAME}>
            <div className={PLANNING_WIZARD_STEP_ACTION_SLOT_CLASSNAME}>
              <div className={PLANNING_WIZARD_STEP_BUTTON_WRAP_CLASSNAME}>
                <p className={PLANNING_WIZARD_STEP_DESCRIPTION_CLASSNAME}>
                  Scheduling puts a realistic timeline to the work plan
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <PlanningToolOpenCardButton toolId="schedule" onClick={handleOpenScheduler} />
                  <Button type="button" variant="outline" size="sm" onClick={handleOpenSheet}>
                    <SheetIcon className="mr-1.5 h-3.5 w-3.5" />
                    Open sheet
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
