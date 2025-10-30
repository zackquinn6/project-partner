import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
  onProgressComplete: () => void;
}

export const ScaledStepProgressDialog: React.FC<ScaledStepProgressDialogProps> = ({
  open,
  onOpenChange,
  projectRunId,
  stepId,
  stepTitle,
  onProgressComplete
}) => {
  const [spaces, setSpaces] = useState<ProjectRunSpace[]>([]);
  const [progressData, setProgressData] = useState<Map<string, number>>(new Map());
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

      // Initialize progress map
      const progressMap = new Map<string, number>();
      (spacesData || []).forEach(space => {
        const existingProgress = progressData?.find(p => p.space_id === space.id);
        progressMap.set(space.id, existingProgress?.progress_percentage || 0);
      });
      setProgressData(progressMap);
    } catch (error) {
      console.error('Error loading spaces and progress:', error);
      toast.error('Failed to load space data');
    } finally {
      setLoading(false);
    }
  };

  const handleProgressChange = (spaceId: string, percentage: number) => {
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

  const percentageOptions = Array.from({ length: 11 }, (_, i) => i * 10);

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
            Update completion percentage for each space. The step will be marked complete when all spaces reach 100%.
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
                  <TableHead className="w-[40%]">Space Name</TableHead>
                  <TableHead className="w-[20%]">Type</TableHead>
                  <TableHead className="w-[20%]">Scale</TableHead>
                  <TableHead className="w-[20%]">% Complete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {spaces.map((space) => {
                  const currentProgress = progressData.get(space.id) || 0;
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
                        {space.scale_value ? `${space.scale_value} ${space.scale_unit}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={currentProgress.toString()}
                          onValueChange={(value) => handleProgressChange(space.id, parseInt(value))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {percentageOptions.map((percentage) => (
                              <SelectItem key={percentage} value={percentage.toString()}>
                                {percentage}%
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
