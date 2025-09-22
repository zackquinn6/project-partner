import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { ProjectRun } from '@/interfaces/ProjectRun';

interface ManualProjectEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectRun: ProjectRun | null;
  onProjectUpdated?: () => void;
}

const statusOptions = [
  { value: 'not-started', label: 'Not Started' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'on-hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
];

const categoryOptions = [
  { value: 'interior-painting', label: 'Interior Painting' },
  { value: 'exterior-painting', label: 'Exterior Painting' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'drywall', label: 'Drywall' },
  { value: 'carpentry', label: 'Carpentry' },
  { value: 'other', label: 'Other' }
];

const difficultyOptions = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' }
];

export function ManualProjectEditDialog({ open, onOpenChange, projectRun, onProjectUpdated }: ManualProjectEditDialogProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    difficulty: '',
    status: 'completed',
    progress: 100,
    estimatedTime: '',
    startDate: '',
    endDate: '',
    projectLeader: '',
    notes: ''
  });

  // Update form data when projectRun changes
  useEffect(() => {
    if (projectRun && open) {
      const formatDate = (date: Date | undefined) => {
        if (!date) return '';
        return new Date(date).toISOString().split('T')[0];
      };

      setFormData({
        name: projectRun.customProjectName || projectRun.name || '',
        description: projectRun.description || '',
        category: projectRun.category || '',
        difficulty: projectRun.effortLevel || '',
        status: projectRun.status || 'completed',
        progress: projectRun.progress || 100,
        estimatedTime: projectRun.estimatedTime || '',
        startDate: formatDate(projectRun.startDate),
        endDate: formatDate(projectRun.endDate),
        projectLeader: projectRun.projectLeader || '',
        notes: ''
      });
    }
  }, [projectRun, open]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !projectRun) return;

    setIsSubmitting(true);
    try {
      const updateData = {
        name: formData.name,
        description: formData.description || null,
        custom_project_name: formData.name,
        category: formData.category || null,
        effort_level: formData.difficulty || null,
        status: formData.status,
        progress: formData.progress,
        estimated_time: formData.estimatedTime || null,
        project_leader: formData.projectLeader || null,
        start_date: formData.startDate ? new Date(formData.startDate).toISOString() : projectRun.startDate.toISOString(),
        end_date: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('project_runs')
        .update(updateData)
        .eq('id', projectRun.id)
        .eq('user_id', user.id) // Additional security check
        .eq('is_manual_entry', true); // Only allow editing manual entries

      if (error) throw error;

      toast({
        title: "Success",
        description: "Manual project updated successfully!"
      });
      onOpenChange(false);
      onProjectUpdated?.();
    } catch (error) {
      console.error('Error updating manual project:', error);
      toast({
        title: "Error", 
        description: "Failed to update project. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProgressChange = (status: string) => {
    // Auto-set progress based on status
    let progress = formData.progress;
    switch (status) {
      case 'not-started':
        progress = 0;
        break;
      case 'in-progress':
        progress = Math.max(progress, 1); // Keep current progress if > 1
        break;
      case 'on-hold':
        // Keep current progress
        break;
      case 'completed':
        progress = 100;
        break;
      case 'cancelled':
        // Keep current progress
        break;
    }
    
    setFormData(prev => ({
      ...prev,
      status,
      progress
    }));
  };

  if (!projectRun) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Manual Project</DialogTitle>
          <DialogDescription>
            Update your manually logged project information.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter project name"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what you accomplished"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select value={formData.difficulty} onValueChange={(value) => handleInputChange('difficulty', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    {difficultyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status *</Label>
                <Select value={formData.status} onValueChange={handleProgressChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="progress">Progress (%)</Label>
                <Input
                  id="progress"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.progress}
                  onChange={(e) => handleInputChange('progress', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estimatedTime">Time Spent</Label>
                <Input
                  id="estimatedTime"
                  value={formData.estimatedTime}
                  onChange={(e) => handleInputChange('estimatedTime', e.target.value)}
                  placeholder="e.g., 2 weeks, 40 hours"
                />
              </div>

              <div>
                <Label htmlFor="projectLeader">Project Leader</Label>
                <Input
                  id="projectLeader"
                  value={formData.projectLeader}
                  onChange={(e) => handleInputChange('projectLeader', e.target.value)}
                  placeholder="Who led this project?"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Project
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
