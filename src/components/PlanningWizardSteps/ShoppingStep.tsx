import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart } from 'lucide-react';
import { PLANNING_WIZARD_OPEN_APP_BUTTON_CLASSNAME } from '@/components/PlanningWizardSteps/planningWizardOpenAppButton';

interface ShoppingStepProps {
  onComplete: () => void;
  isCompleted: boolean;
}

export const ShoppingStep: React.FC<ShoppingStepProps> = ({
  onComplete,
  isCompleted
}) => {
  const handleOpenShoppingList = () => {
    window.dispatchEvent(new CustomEvent('openMaterialsSelection'));
    onComplete();
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Shopping
            {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:p-4">
          <div className="text-center space-y-4 py-6">
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Setup your shopping list preferences
            </p>

            <Button
              type="button"
              variant="default"
              onClick={handleOpenShoppingList}
              className={PLANNING_WIZARD_OPEN_APP_BUTTON_CLASSNAME}
            >
              <ShoppingCart className="shrink-0" aria-hidden />
              Open Shopping
            </Button>

            {isCompleted && (
              <p className="text-xs sm:text-sm font-medium text-green-600">✓ Shopping step completed</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
