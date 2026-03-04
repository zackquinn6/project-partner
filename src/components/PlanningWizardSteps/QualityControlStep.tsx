import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck } from 'lucide-react';

interface QualityControlStepProps {
  onComplete: () => void;
  isCompleted: boolean;
}

export const QualityControlStep: React.FC<QualityControlStepProps> = ({
  onComplete,
  isCompleted
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
              Use quality control from your workflow when you reach the relevant steps. Document completion and results for future reference.
            </p>
            <Button type="button" onClick={onComplete} size="lg" className="w-full max-w-md">
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
