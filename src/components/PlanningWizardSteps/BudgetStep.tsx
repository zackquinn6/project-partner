import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign } from 'lucide-react';

interface BudgetStepProps {
  onComplete: () => void;
  isCompleted: boolean;
}

export const BudgetStep: React.FC<BudgetStepProps> = ({
  onComplete,
  isCompleted
}) => {
  const handleOpenBudgeting = () => {
    // Dispatch event to open Project Budgeting
    window.dispatchEvent(new CustomEvent('open-project-budgeting'));
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
          <CardDescription className="text-xs sm:text-sm mt-0.5">
            Manage project finances
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:p-4">
          <div className="text-center space-y-4 py-6">
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Manage finances for this project. Go to Project Budgeting app.
            </p>
            
            <Button 
              onClick={handleOpenBudgeting}
              size="lg"
              className="w-full max-w-md h-16 text-lg font-semibold"
            >
              <DollarSign className="w-6 h-6 mr-3" />
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

