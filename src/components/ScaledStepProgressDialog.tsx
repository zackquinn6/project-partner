import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProjectRunSpace {
  id: string;
  space_name: string;
  space_type: string;
  scale_value: number | null;
  scale_unit: string | null;
  is_from_home: boolean;
}

interface StepProgress {
  space_id: string;
  progress_percentage: number;
}

interface ScaledStepProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectRunId: string;
  stepId: string;
  stepTitle: string;
  scalingUnit?: string; // Project scaling unit (e.g., 'per square foot', 'per item')
  onProgressComplete: () => void;
}

export const ScaledStepProgressDialog: React.FC<ScaledStepProgressDialogProps> = ({
  open,
  onOpenChange,
  projectRunId,
  stepId,
  stepTitle,
  scalingUnit = 'per item',
  onProgressComplete
}) => {
  const [spaces, setSpaces] = useState<ProjectRunSpace[]>([]);
  const [progressData, setProgressData] = useState<Map<string, number>>(new Map());
  const [completedAmounts, setCompletedAmounts] = useState<Map<string, number>>(new Map()); // Track completed amounts per space
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && projectRunId) {
      loadSpacesAndProgress();
    }
  }, [open, projectRunId, stepId]);

  const loadSpacesAndProgress = async () => {
    setLoading(true);
    try {
      // Load project spaces
      const { data: spacesData, error: spacesError } = await supabase
        .from('project_run_spaces')
        .select('*')
        .eq('project_run_id', projectRunId)
        .order('space_name');

      if (spacesError) throw spacesError;

      // Load existing progress for this step
      const { data: progressData, error: progressError } = await supabase
        .from('scaled_step_progress')
        .select('*')
        .eq('project_run_id', projectRunId)
        .eq('step_id', stepId);

      if (progressError) throw progressError;

      setSpaces(spacesData || []);

      // Initialize progress map and completed amounts
      const progressMap = new Map<string, number>();
      const amountsMap = new Map<string, number>();
      (spacesData || []).forEach(space => {
        const existingProgress = progressData?.find(p => p.space_id === space.id);
        const percentage = existingProgress?.progress_percentage || 0;
        progressMap.set(space.id, percentage);
        
        // Calculate completed amount from percentage and space scale_value
        if (space.scale_value && percentage > 0) {
          const completedAmount = (space.scale_value * percentage) / 100;
          amountsMap.set(space.id, completedAmount);
        } else {
          amountsMap.set(space.id, 0);
        }
      });
      setProgressData(progressMap);
      setCompletedAmounts(amountsMap);
    } catch (error) {
      console.error('Error loading spaces and progress:', error);
      toast.error('Failed to load space data');
    } finally {
      setLoading(false);
    }
  };

  // Get display name for scaling unit
  const getScalingUnitDisplay = () => {
    switch (scalingUnit) {
      case 'per square foot': return 'Square Feet';
      case 'per 10x10 room': return 'Rooms (10x10)';
      case 'per linear foot': return 'Linear Feet';
      case 'per cubic yard': return 'Cubic Yards';
      case 'per item': return 'Items';
      default: return 'Units';
    }
  };

  const handleAmountChange = (spaceId: string, amount: number) => {
    const space = spaces.find(s => s.id === spaceId);
    if (!space || !space.scale_value) {
      return;
    }
    
    // Calculate percentage based on completed amount vs total scale_value
    const percentage = Math.min(100, Math.max(0, (amount / space.scale_value) * 100));
    
    setCompletedAmounts(prev => new Map(prev).set(spaceId, amount));
    setProgressData(prev => new Map(prev).set(spaceId, percentage));
  };

  const handleReportProgress = async () => {
    setSaving(true);
    try {
      // Upsert progress for each space
      const progressRecords = Array.from(progressData.entries()).map(([spaceId, percentage]) => ({
        project_run_id: projectRunId,
        step_id: stepId,
        space_id: spaceId,
        progress_percentage: percentage
      }));

      const { error } = await supabase
        .from('scaled_step_progress')
        .upsert(progressRecords, {
          onConflict: 'project_run_id,step_id,space_id'
        });

      if (error) throw error;

      // Check if all spaces are 100% complete
      const allComplete = Array.from(progressData.values()).every(p => p === 100);

      toast.success('Progress updated successfully');

      if (allComplete) {
        // Mark step as complete
        onProgressComplete();
        onOpenChange(false);
      } else {
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error saving progress:', error);
      toast.error('Failed to save progress');
    } finally {
      setSaving(false);
    }
  };

  const allSpacesComplete = spaces.length > 0 && 
    spaces.every(space => progressData.get(space.id) === 100);

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            Loading space data...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (spaces.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>No Spaces Defined</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              No spaces have been defined for this project. Please add spaces in the Scope Builder during the Planning phase.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Report Progress: {stepTitle}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Enter the completed amount for each space in {getScalingUnitDisplay().toLowerCase()}. The step will be marked complete when all spaces reach 100%.
          </p>
        </DialogHeader>

        <div className="my-4">
          {allSpacesComplete && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                All spaces complete! This step will be marked as done.
              </span>
            </div>
          )}

          <div className="border rounded-lg overflow-hidden mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Space Name</TableHead>
                  <TableHead className="w-[15%]">Type</TableHead>
                  <TableHead className="w-[20%]">Total ({getScalingUnitDisplay()})</TableHead>
                  <TableHead className="w-[20%]">Completed ({getScalingUnitDisplay()})</TableHead>
                  <TableHead className="w-[15%]">% Complete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {spaces.map((space) => {
                  const currentProgress = progressData.get(space.id) || 0;
                  const completedAmount = completedAmounts.get(space.id) || 0;
                  const totalAmount = space.scale_value || 0;
                  
                  return (
                    <TableRow key={space.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {space.space_name}
                          {space.is_from_home && (
                            <Badge variant="outline" className="text-xs">
                              From Home
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {space.space_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {totalAmount > 0 ? totalAmount.toLocaleString() : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max={totalAmount}
                            step="0.01"
                            value={completedAmount || ''}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              handleAmountChange(space.id, value);
                            }}
                            className="w-full"
                            placeholder="0"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {currentProgress.toFixed(0)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReportProgress}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Report Progress'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
