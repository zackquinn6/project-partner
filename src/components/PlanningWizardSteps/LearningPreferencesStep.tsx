import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen } from 'lucide-react';

interface LearningPreferencesStepProps {
  onComplete: () => void;
  isCompleted: boolean;
}

export const LearningPreferencesStep: React.FC<LearningPreferencesStepProps> = ({
  onComplete,
  isCompleted
}) => {
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Learning preferences
            {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:p-4">
          <div className="text-center space-y-4 py-6">
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Set your learning preferences so instructions match your experience level. You can change this later in the workflow or in project settings.
            </p>
            <Button
              type="button"
              onClick={onComplete}
              size="lg"
              className="w-full max-w-md h-16 text-lg font-semibold"
            >
              <BookOpen className="w-6 h-6 mr-3" />
              Open learning preferences
            </Button>
            {isCompleted && (
              <p className="text-xs sm:text-sm text-green-600 font-medium">
                ✓ Learning preferences reviewed
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
