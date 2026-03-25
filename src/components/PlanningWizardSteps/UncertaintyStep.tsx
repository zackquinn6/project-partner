import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { RiskManagementWindow } from '@/components/RiskManagementWindow';
import { PLANNING_WIZARD_OPEN_APP_BUTTON_CLASSNAME } from '@/components/PlanningWizardSteps/planningWizardOpenAppButton';
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
      <Card>
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Risk-Less
            {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:p-4">
          <div className="text-center space-y-4 py-6">
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
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

            {isCompleted && (
              <p className="text-xs sm:text-sm font-medium text-green-600">✓ Risk-Less step completed</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Risk Management Window: only when host does not provide onOpenRiskManagement (avoids nested dialog) */}
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

