import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign } from 'lucide-react';
import { PLANNING_WIZARD_OPEN_APP_BUTTON_CLASSNAME } from '@/components/PlanningWizardSteps/planningWizardOpenAppButton';

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
      <Card>
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Budget
            {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:p-4">
          <div className="text-center space-y-4 py-6">
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
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

            {isCompleted && (
              <p className="text-xs sm:text-sm text-green-600 font-medium">
                ✓ Budget completed
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

