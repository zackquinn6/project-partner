import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hammer } from 'lucide-react';
import { PLANNING_WIZARD_OPEN_APP_BUTTON_CLASSNAME } from '@/components/PlanningWizardSteps/planningWizardOpenAppButton';

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
      <Card>
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
            <Hammer className="w-5 h-5" />
            Tool Rental
            {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:p-4">
          <div className="text-center space-y-4 py-6">
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
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

            {isCompleted && (
              <p className="text-xs sm:text-sm font-medium text-green-600">✓ Tool Rental reviewed</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
