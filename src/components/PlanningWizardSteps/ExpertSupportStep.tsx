import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';

const CALL_THE_TRADES_URL = 'https://callthetrades.com';

interface ExpertSupportStepProps {
  onComplete: () => void;
  isCompleted: boolean;
}

export const ExpertSupportStep: React.FC<ExpertSupportStepProps> = ({
  onComplete,
  isCompleted
}) => {
  const handleOpenLink = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open(CALL_THE_TRADES_URL, '_blank', 'noopener,noreferrer');
    onComplete();
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="p-2 sm:p-3">
          <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
            Expert support
            {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm mt-0.5">
            Connect with our expert support partners when you need help
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-2 sm:p-3">
          <div className="text-center space-y-3 py-4 sm:py-5">
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Make an account with our expert support partners to get professional guidance during your project.
            </p>
            <Button
              type="button"
              variant="default"
              size="lg"
              className="w-full max-w-md min-h-16 whitespace-normal px-3 py-3 text-base font-semibold leading-snug"
              onClick={handleOpenLink}
            >
              <ExternalLink className="mr-2 h-6 w-6 shrink-0" />
              Make an account with our expert support partners
            </Button>
            <p className="text-xs text-muted-foreground">
              <a href={CALL_THE_TRADES_URL} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">
                {CALL_THE_TRADES_URL}
              </a>
            </p>
            {isCompleted && (
              <p className="text-xs sm:text-sm text-green-600 font-medium">
                ✓ Expert support reviewed
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
