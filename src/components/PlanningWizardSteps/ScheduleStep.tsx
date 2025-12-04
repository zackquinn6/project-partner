import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';

interface ScheduleStepProps {
  onComplete: () => void;
  isCompleted: boolean;
}

export const ScheduleStep: React.FC<ScheduleStepProps> = ({
  onComplete,
  isCompleted
}) => {
  const handleOpenScheduler = () => {
    // Dispatch event to open Project Scheduler
    window.dispatchEvent(new CustomEvent('open-project-scheduler'));
    onComplete();
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Schedule
            {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm mt-0.5">
            Create a realistic timeline
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:p-4">
          <div className="text-center space-y-4 py-6">
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Scheduling puts a realistic timeline to the work plan
            </p>
            
            <Button 
              onClick={handleOpenScheduler}
              size="lg"
              className="w-full max-w-md h-16 text-lg font-semibold"
            >
              <Calendar className="w-6 h-6 mr-3" />
              Open Project Scheduler
            </Button>

            {isCompleted && (
              <p className="text-xs sm:text-sm text-green-600 font-medium">
                ✓ Schedule completed
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

