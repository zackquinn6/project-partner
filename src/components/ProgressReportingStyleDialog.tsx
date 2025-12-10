import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { useProject } from '@/contexts/ProjectContext';
import { toast } from 'sonner';

interface ProgressReportingStyleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectRun?: ProjectRun;
}

export const ProgressReportingStyleDialog = ({
  open,
  onOpenChange,
  projectRun
}: ProgressReportingStyleDialogProps) => {
  const { updateProjectRun } = useProject();
  const [selectedStyle, setSelectedStyle] = useState<'linear' | 'exponential' | 'time-based'>(
    (projectRun?.progress_reporting_style as 'linear' | 'exponential' | 'time-based') || 'linear'
  );
  const [saving, setSaving] = useState(false);

  // Update local state when projectRun changes or dialog opens
  useEffect(() => {
    if (open && projectRun?.progress_reporting_style) {
      setSelectedStyle(projectRun.progress_reporting_style as 'linear' | 'exponential' | 'time-based');
    }
  }, [projectRun?.progress_reporting_style, open]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = selectedStyle !== (projectRun?.progress_reporting_style as 'linear' | 'exponential' | 'time-based');

  const handleApply = async () => {
    if (!projectRun) {
      toast.error('No project run selected');
      return;
    }

    setSaving(true);
    try {
      await updateProjectRun({
        ...projectRun,
        progress_reporting_style: selectedStyle
      });
      
      toast.success('Progress reporting style updated successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating progress reporting style:', error);
      toast.error('Failed to update progress reporting style');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original value
    if (projectRun?.progress_reporting_style) {
      setSelectedStyle(projectRun.progress_reporting_style as 'linear' | 'exponential' | 'time-based');
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Progress Reporting Style</DialogTitle>
          <DialogDescription>
            Choose how progress is calculated. Step numbers (e.g., "Step 4 of 15") remain unchanged.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-base">Progress Calculation Method</CardTitle>
              <CardDescription>
                Select how you want progress to be calculated and displayed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={selectedStyle}
                onValueChange={(value) => setSelectedStyle(value as 'linear' | 'exponential' | 'time-based')}
                className="space-y-3"
              >
                <Label 
                  htmlFor="linear" 
                  className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <RadioGroupItem value="linear" id="linear" className="mt-1" />
                  <div className="flex-1">
                    <div className="font-medium">Linear</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Simple step count-based progress. Step 7 of 14 complete = 50%
                    </div>
                  </div>
                </Label>
                
                <Label 
                  htmlFor="exponential" 
                  className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <RadioGroupItem value="exponential" id="exponential" className="mt-1" />
                  <div className="flex-1">
                    <div className="font-medium">Exponential</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Weighted toward completion. Work that shows 90% on linear measurement shows ~60% here, reflecting heavier effort to complete the final work.
                    </div>
                  </div>
                </Label>
                
                <Label 
                  htmlFor="time-based" 
                  className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <RadioGroupItem value="time-based" id="time-based" className="mt-1" />
                  <div className="flex-1">
                    <div className="font-medium">Time-Based</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Uses step estimated times aligned to your speed setting. Fast-track uses low end of time estimates, steady uses medium, extended uses high.
                    </div>
                  </div>
                </Label>
              </RadioGroup>
            </CardContent>
          </Card>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleApply}
            disabled={saving || !hasUnsavedChanges}
          >
            {saving ? 'Applying...' : 'Apply'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

