import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Headphones } from 'lucide-react';
import { PLANNING_WIZARD_OPEN_APP_BUTTON_CLASSNAME } from '@/components/PlanningWizardSteps/planningWizardOpenAppButton';

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
      <Card>
        <CardHeader className="p-2 sm:p-3">
          <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
            Support
            {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-2 sm:p-3">
          <div className="text-center space-y-3 py-4 sm:py-5">
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
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
            {isCompleted && (
              <p className="text-xs sm:text-sm font-medium text-green-600">✓ Support reviewed</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
