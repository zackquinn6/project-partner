import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hammer } from 'lucide-react';

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
            Tool rentals
            {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm mt-0.5">
            Find rental locations and plan tool access for this project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:p-4">
          <div className="text-center space-y-4 py-6">
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Open Tool Access to browse rental options and resources matched to your area.
            </p>

            <Button
              type="button"
              onClick={handleOpen}
              size="lg"
              className="w-full max-w-md h-16 text-lg font-semibold"
            >
              <Hammer className="w-6 h-6 mr-3" />
              Open Tool Access
            </Button>

            {isCompleted && (
              <p className="text-xs sm:text-sm text-green-600 font-medium">
                ✓ Tool rentals step completed
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
