import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface ManualProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated?: () => void;
}

const statusOptions = [
  { value: 'not-started', label: 'Not Started' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'complete', label: 'Complete' }
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

export function ManualProjectDialog({ open, onOpenChange, onProjectCreated }: ManualProjectDialogProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: [] as string[],
    status: 'complete',
    progress: 100,
    estimatedTime: '',
    startDate: '',
    endDate: '',
    projectLeader: '',
    notes: ''
  });

  const handleInputChange = (field: string, value: string | number | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate status-progress alignment
    const progress = Number(formData.progress);
    let validatedStatus = formData.status;
    
    if (progress === 100) {
      validatedStatus = 'complete';
    } else if (progress === 0) {
      validatedStatus = 'not-started';
    } else if (progress > 0 && progress < 100) {
      validatedStatus = 'in-progress';
    }

    setIsSubmitting(true);
    try {
      // Determine end_date: use provided endDate, or auto-set if complete, or null
      let finalEndDate: string | null = null;
      
      if (formData.endDate && formData.endDate.trim() !== '') {
        // User provided an end date, use it
        finalEndDate = formData.endDate;
      } else if (validatedStatus === 'complete' || progress === 100) {
        // Project is complete but no end date provided, auto-set to today
        finalEndDate = new Date().toISOString().split('T')[0];
      }
      // Otherwise, finalEndDate remains null
      
      const projectData = {
        user_id: user.id,
        project_id: null, // Manual projects are not tied to a catalog project
        name: formData.name,
        description: formData.description || null,
        category: formData.category.length > 0 ? formData.category.join(', ') : null,
        status: validatedStatus,
        progress: progress,
        estimated_time: formData.estimatedTime || null,
        project_leader: formData.projectLeader || null,
        start_date: formData.startDate ? new Date(formData.startDate).toISOString() : new Date().toISOString(),
        end_date: finalEndDate ? new Date(finalEndDate).toISOString() : null,
        plan_end_date: finalEndDate ? new Date(finalEndDate).toISOString() : (formData.startDate ? new Date(new Date(formData.startDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()),
        is_manual_entry: true,
        phases: [],
        completed_steps: []
      };

      const { error } = await supabase
        .from('project_runs')
        .insert([projectData]);

      if (error) throw error;

            // Reset form
      setFormData({
        name: '',
        description: '',
        category: [],
        status: 'complete',
        progress: 100,
        estimatedTime: '',
        startDate: '',
        endDate: '',
        projectLeader: '',
        notes: ''
      });

      onOpenChange(false);
      onProjectCreated?.();
    } catch (error) {
      console.error('Error creating manual project:', error);
      toast.error('Failed to log project', {
        description: 'Please try again or contact support if the issue persists.'
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
      case 'complete':
        progress = 100;
        break;
    }
    
    setFormData(prev => ({
      ...prev,
      status,
      progress
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Manual Project</DialogTitle>
          <DialogDescription>
            Record a project you completed outside of Project Partner. This will be added to your project scoreboard.
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

            <div>
              <Label htmlFor="category">Category (multi-select)</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {categoryOptions.map((option) => {
                  const selected = formData.category.includes(option.value);
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant={selected ? 'default' : 'outline'}
                      size="xs"
                      className="text-[11px] px-2 py-1 h-7"
                      onClick={() => {
                        setFormData(prev => {
                          const current = prev.category;
                          const exists = current.includes(option.value);
                          return {
                            ...prev,
                            category: exists
                              ? current.filter(v => v !== option.value)
                              : [...current, option.value]
                          };
                        });
                      }}
                    >
                      {option.label}
                    </Button>
                  );
                })}
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
                  disabled={formData.status === 'complete'}
                  className={formData.status === 'complete' ? 'opacity-50 cursor-not-allowed' : ''}
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
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
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
              Log Project
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
