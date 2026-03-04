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
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
            Expert support
            {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm mt-0.5">
            Get help from trades professionals when you need it
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:p-4">
          <div className="text-center space-y-4 py-6">
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Set up an account with Call the Trades to connect with expert tradespeople for support during your project.
            </p>
            <Button
              type="button"
              variant="default"
              size="lg"
              className="w-full max-w-md h-16 text-lg font-semibold"
              onClick={handleOpenLink}
            >
              <ExternalLink className="w-6 h-6 mr-3" />
              Setup an account with Call the Trades
            </Button>
            <p className="text-xs text-muted-foreground">
              <a href={CALL_THE_TRADES_URL} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">
                {CALL_THE_TRADES_URL}
              </a>
            </p>
            {isCompleted && (
              <p className="text-xs sm:text-sm text-green-600 font-medium">
                ✓ Expert support option reviewed
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
