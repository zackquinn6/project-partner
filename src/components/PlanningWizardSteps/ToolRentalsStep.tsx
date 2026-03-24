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
            Tool rental partners
            {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm mt-0.5">
            Connect with our tool rental partners for this project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:p-4">
          <div className="text-center space-y-4 py-6">
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Make an account with our tool rental partners to browse rental options and resources matched to your area.
            </p>

            <Button
              type="button"
              onClick={handleOpen}
              size="lg"
              className="w-full max-w-md min-h-16 whitespace-normal px-3 py-3 text-base font-semibold leading-snug"
            >
              <Hammer className="mr-2 h-6 w-6 shrink-0" />
              Make an account with our tool rental partners
            </Button>

            {isCompleted && (
              <p className="text-xs sm:text-sm text-green-600 font-medium">
                ✓ Tool rental partners reviewed
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
