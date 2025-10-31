import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { CalendarIcon, Upload, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface MaintenanceTask {
  id: string;
  title: string;
  description: string;
  category: string;
  frequency_days: number;
  last_completed_at: string | null;
  next_due_date: string;
  is_custom: boolean;
  home_id: string;
  template_id?: string;
}

interface TaskCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: MaintenanceTask;
  onCompleted: () => void;
}

export function TaskCompletionDialog({ 
  open, 
  onOpenChange, 
  task, 
  onCompleted 
}: TaskCompletionDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [completedDate, setCompletedDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image under 5MB",
          variant: "destructive",
        });
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      setPhotoFile(file);
    }
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${task.id}_${Date.now()}.${fileExt}`;
      const filePath = `maintenance-photos/${fileName}`;

      setUploadProgress(25);

      const { error: uploadError } = await supabase.storage
        .from('project-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setUploadProgress(75);

      const { data: { publicUrl } } = supabase.storage
        .from('project-photos')
        .getPublicUrl(filePath);

      setUploadProgress(100);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload photo",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let photoUrl: string | null = null;
      
      if (photoFile) {
        photoUrl = await uploadPhoto(photoFile);
        if (!photoUrl) {
          // Upload failed, but continue without photo
          setPhotoFile(null);
        }
      }

      const { error } = await supabase
        .from('maintenance_completions')
        .insert({
          user_id: user.id,
          task_id: task.id,
          completed_at: completedDate.toISOString(),
          notes: notes.trim() || null,
          photo_url: photoUrl
        });

      if (error) throw error;

      toast({
        title: "Task Completed!",
        description: `${task.title} has been marked as completed`,
      });

      onCompleted();
      
      // Reset form
      setNotes('');
      setPhotoFile(null);
      setUploadProgress(0);
      setCompletedDate(new Date());
      
    } catch (error) {
      console.error('Error completing task:', error);
      toast({
        title: "Error",
        description: "Failed to mark task as completed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md z-[100]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Complete Task
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-3 rounded-lg">
            <h3 className="font-medium">{task.title}</h3>
            {task.description && (
              <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Completion Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-11",
                    !completedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {completedDate ? format(completedDate, "PPP") : "Pick a date"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-auto max-w-[calc(100vw-24px)] p-0" 
                align="center" 
                sideOffset={4}
              >
                <Calendar
                  mode="single"
                  selected={completedDate}
                  onSelect={(date) => date && setCompletedDate(date)}
                  disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this maintenance task..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="photo">Photo (Optional)</Label>
            <div className="mt-1">
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="file:mr-2 file:rounded file:border-0 file:bg-primary file:text-primary-foreground"
              />
              {photoFile && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Selected: {photoFile.name}
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="mt-1 text-xs">Uploading: {uploadProgress}%</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleComplete}
              disabled={loading}
            >
              {loading ? 'Completing...' : 'Mark Complete'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}