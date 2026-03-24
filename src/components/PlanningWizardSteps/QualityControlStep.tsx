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
        <CardHeader className="p-2 sm:p-3">
          <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5" />
            Quality
            {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm mt-0.5">
            Document results for future inspections
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-2 sm:p-3">
          <div className="text-center space-y-3 py-4 sm:py-5">
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Open Quality Control to review outputs, adjust project settings, and export a PDF. This also continues the planning workflow.
            </p>
            {!isCompleted && (
              <Button
                type="button"
                variant="default"
                size="lg"
                className="w-full max-w-md min-h-14 text-base font-semibold whitespace-normal leading-snug px-3 py-3"
                onClick={() => {
                  onOpenQualityControlApp?.();
                  onComplete();
                }}
              >
                <ClipboardCheck className="mr-2 h-5 w-5 shrink-0" />
                Open Quality Control
              </Button>
            )}
            {isCompleted && (
              <p className="text-xs sm:text-sm text-green-600 font-medium">
                ✓ Quality reviewed
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
