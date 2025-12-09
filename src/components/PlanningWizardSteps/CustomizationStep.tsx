import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings } from 'lucide-react';

interface CustomizationStepProps {
  onComplete: () => void;
  isCompleted: boolean;
}

export const CustomizationStep: React.FC<CustomizationStepProps> = ({
  onComplete,
  isCompleted
}) => {
  const handleOpenCustomizer = () => {
    // Dispatch event to open Project Customizer
    // Don't call onComplete() here - let the customizer handle completion
    // The planning wizard should stay open while customizer is open
    window.dispatchEvent(new CustomEvent('open-project-customizer', {
      detail: { fromPlanningWizard: true, onComplete }
    }));
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Customization
            {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm mt-0.5">
            Make choices for your unique project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:p-4">
          <div className="text-center space-y-4 py-6">
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Customization includes making choices for your unique project and planning out the work to be done
            </p>
            
            <Button 
              onClick={handleOpenCustomizer}
              size="lg"
              className="w-full max-w-md h-16 text-lg font-semibold"
            >
              <Settings className="w-6 h-6 mr-3" />
              Open Project Customizer
            </Button>

            {isCompleted && (
              <p className="text-xs sm:text-sm text-green-600 font-medium">
                ✓ Customization completed
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

