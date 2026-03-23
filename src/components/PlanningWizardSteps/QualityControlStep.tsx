import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck } from 'lucide-react';

interface QualityControlStepProps {
  onComplete: () => void;
  isCompleted: boolean;
  /** Opens the full Quality Control app with settings accordion expanded */
  onOpenQualityControlApp?: () => void;
}

export const QualityControlStep: React.FC<QualityControlStepProps> = ({
  onComplete,
  isCompleted,
  onOpenQualityControlApp,
}) => {
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5" />
            Quality control
            {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm mt-0.5">
            Document results for future inspections
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:p-4">
          <div className="text-center space-y-4 py-6">
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Open Quality Control to review outputs, adjust project settings, and export a PDF. You can also mark this planning step as reviewed when you&apos;re done.
            </p>
            {onOpenQualityControlApp && (
              <Button
                type="button"
                variant="default"
                size="lg"
                className="w-full max-w-md"
                onClick={() => onOpenQualityControlApp()}
              >
                <ClipboardCheck className="w-5 h-5 mr-2" />
                Open Quality Control
              </Button>
            )}
            <Button type="button" onClick={onComplete} variant="outline" size="lg" className="w-full max-w-md">
              <ClipboardCheck className="w-5 h-5 mr-2" />
              Mark as reviewed
            </Button>
            {isCompleted && (
              <p className="text-xs sm:text-sm text-green-600 font-medium">
                ✓ Quality control reviewed
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
