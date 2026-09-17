import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface StepCompletionTrackerProps {
  stepId: string;
  stepName: string;
  currentPercentage?: number;
  onComplete: (percentage: number) => void;
  onCancel: () => void;
}

export const StepCompletionTracker: React.FC<StepCompletionTrackerProps> = ({
  stepId,
  stepName,
  currentPercentage = 100,
  onComplete,
  onCancel
}) => {
  const [selectedPercentage, setSelectedPercentage] = useState(currentPercentage);

  const percentageOptions = Array.from({ length: 11 }, (_, i) => i * 10);

  const handleComplete = () => {
    onComplete(selectedPercentage);
  };

  const getStatusColor = (percentage: number) => {
    if (percentage === 100) return 'text-success';
    if (percentage >= 50) return 'text-warning-soft';
    return 'text-destructive-soft';
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage === 100) return <CheckCircle className="w-5 h-5 text-success" />;
    if (percentage >= 50) return <Clock className="w-5 h-5 text-warning-soft" />;
    return <AlertCircle className="w-5 h-5 text-destructive-soft" />;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon(selectedPercentage)}
          Step Progress
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">
            Current Step:
          </Label>
          <p className="font-semibold">{stepName}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="percentage-select">
            Completion Percentage
          </Label>
          <Select 
            value={selectedPercentage.toString()} 
            onValueChange={(value) => setSelectedPercentage(parseInt(value))}
          >
            <SelectTrigger id="percentage-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {percentageOptions.map((percentage) => (
                <SelectItem key={percentage} value={percentage.toString()}>
                  <div className="flex items-center gap-2">
                    <span className={getStatusColor(percentage)}>
                      {percentage}%
                    </span>
                    {percentage === 0 && <span className="text-xs text-muted-foreground">Not Started</span>}
                    {percentage > 0 && percentage < 100 && <span className="text-xs text-muted-foreground">In Progress</span>}
                    {percentage === 100 && <span className="text-xs text-muted-foreground">Complete</span>}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedPercentage < 100 && (
          <div className="p-3 bg-warning-soft/10 border border-warning-soft/40 rounded-md">
            <p className="text-sm text-warning-soft">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              Step will remain open until marked as 100% complete.
            </p>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleComplete} 
            className={selectedPercentage === 100 ? 'bg-success hover:bg-success' : ''}
          >
            {selectedPercentage === 100 ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete Step
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 mr-2" />
                Update Progress
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};