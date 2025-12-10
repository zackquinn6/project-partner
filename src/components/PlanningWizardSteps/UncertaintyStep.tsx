import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { RiskManagementWindow } from '@/components/RiskManagementWindow';
import { useProject } from '@/contexts/ProjectContext';

interface UncertaintyStepProps {
  onComplete: () => void;
  isCompleted: boolean;
}

export const UncertaintyStep: React.FC<UncertaintyStepProps> = ({
  onComplete,
  isCompleted
}) => {
  const { currentProjectRun } = useProject();
  const [riskManagementOpen, setRiskManagementOpen] = useState(false);

  const handleOpenRiskManagement = () => {
    setRiskManagementOpen(true);
    // Mark step as complete when opening risk management
    onComplete();
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Project Uncertainty
            {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm mt-0.5">
            Plan for potential risks and uncertainties
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:p-4">
          <div className="text-center space-y-4 py-6">
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Identify and plan for potential risks and uncertainties that could impact your project timeline and budget.
            </p>
            
            <Button 
              onClick={handleOpenRiskManagement}
              size="lg"
              className="w-full max-w-md h-16 text-lg font-semibold"
            >
              <AlertTriangle className="w-6 h-6 mr-3" />
              Plan for Uncertainty
            </Button>

            {isCompleted && (
              <p className="text-xs sm:text-sm text-green-600 font-medium">
                ✓ Uncertainty planning completed
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Risk Management Window */}
      <RiskManagementWindow
        open={riskManagementOpen}
        onOpenChange={setRiskManagementOpen}
        projectRunId={currentProjectRun?.id}
        mode="run"
        readOnly={false}
      />
    </div>
  );
};

