import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface NoteUploadProps {
  projectRunId: string;
  templateId?: string | null;
  stepId: string;
  stepName?: string;
  phaseId?: string;
  phaseName?: string;
  operationId?: string;
  operationName?: string;
  onNoteAdded?: () => void;
}

export function NoteUpload({ 
  projectRunId, 
  templateId, 
  stepId, 
  stepName,
  phaseId,
  phaseName,
  operationId,
  operationName,
  onNoteAdded 
}: NoteUploadProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!noteText.trim() || !user) {
      toast.error('Please enter a note');
      return;
    }

    setUploading(true);
    try {
      const { error } = await supabase
        .from('project_notes')
        .insert({
          user_id: user.id,
          project_run_id: projectRunId,
          template_id: templateId || null,
          step_id: stepId,
          step_name: stepName || null,
          phase_id: phaseId || null,
          phase_name: phaseName || null,
          operation_id: operationId || null,
          operation_name: operationName || null,
          note_text: noteText.trim()
        });

      if (error) throw error;

      toast.success('Note added successfully');
      
      // Reset form
      setNoteText('');
      setOpen(false);
      
      if (onNoteAdded) {
        onNoteAdded();
      }
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setNoteText('');
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2"
      >
        <FileText className="w-4 h-4" />
        <span className="hidden sm:inline">Add Note</span>
        <span className="sm:hidden">Note</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Add Note
            </DialogTitle>
            <DialogDescription>
              Add a note for this step to track your progress, observations, or reminders.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="note-text">Note</Label>
              <Textarea
                id="note-text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Enter your note here..."
                rows={6}
                className="resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !noteText.trim()}>
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Note'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

