import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart } from 'lucide-react';

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
            Shopping List
            {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm mt-0.5">
            Track tool & material shopping
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:p-4">
          <div className="text-center space-y-4 py-6">
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Select materials and tools you need for your project and track your shopping list.
            </p>

            <Button
              onClick={handleOpenShoppingList}
              size="lg"
              className="w-full max-w-md h-16 text-lg font-semibold"
            >
              <ShoppingCart className="w-6 h-6 mr-3" />
              Open Shopping List
            </Button>

            {isCompleted && (
              <p className="text-xs sm:text-sm text-green-600 font-medium">
                ✓ Shopping list step completed
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
