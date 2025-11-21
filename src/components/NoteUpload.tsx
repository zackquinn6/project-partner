import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface StepOption {
  id: string;
  step: string;
  phaseName?: string;
  operationName?: string;
}

interface NoteUploadProps {
  projectRunId: string;
  templateId?: string | null;
  stepId?: string;
  stepName?: string;
  phaseId?: string;
  phaseName?: string;
  operationId?: string;
  operationName?: string;
  availableSteps?: StepOption[];
  showButton?: boolean;
  onNoteAdded?: () => void;
}

export function NoteUpload({ 
  projectRunId, 
  templateId, 
  stepId: initialStepId = '', 
  stepName: initialStepName = '',
  phaseId: initialPhaseId,
  phaseName: initialPhaseName,
  operationId: initialOperationId,
  operationName: initialOperationName,
  availableSteps = [],
  showButton = true,
  onNoteAdded 
}: NoteUploadProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedStepId, setSelectedStepId] = useState<string>(initialStepId || '');
  
  // Get selected step details
  const selectedStep = availableSteps.find(s => s.id === selectedStepId);

  const handleUpload = async () => {
    if (!noteText.trim() || !user) {
      toast.error('Please enter a note');
      return;
    }

    setUploading(true);
    try {
      // Use selected step or fall back to initial values, or use "-" if blank
      const finalStepId = selectedStepId || initialStepId || '-';
      const finalStepName = selectedStep?.step || initialStepName || '-';
      const finalPhaseName = selectedStep?.phaseName || initialPhaseName || null;
      const finalOperationName = selectedStep?.operationName || initialOperationName || null;
      
      const { error } = await supabase
        .from('project_notes')
        .insert({
          user_id: user.id,
          project_run_id: projectRunId,
          template_id: templateId || null,
          step_id: finalStepId,
          step_name: finalStepId === '-' ? '-' : (finalStepName || null),
          phase_id: initialPhaseId || null,
          phase_name: finalPhaseName || null,
          operation_id: initialOperationId || null,
          operation_name: finalOperationName || null,
          note_text: noteText.trim()
        });

      if (error) throw error;

      toast.success('Note added successfully');
      
      // Reset form
      setNoteText('');
      setSelectedStepId(initialStepId || '');
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
    setSelectedStepId(initialStepId || '');
    setOpen(false);
  };

  return (
    <>
      {showButton && (
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
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Add Note
            </DialogTitle>
            <DialogDescription>
              {initialStepName ? `Add a note for: ${initialStepName}` : 'Add a note to your project to track your progress, observations, or reminders.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Step Selection - Only show if availableSteps provided */}
            {availableSteps.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="step-select">Tag to Step (Optional)</Label>
                <Select value={selectedStepId} onValueChange={setSelectedStepId}>
                  <SelectTrigger id="step-select">
                    <SelectValue placeholder="No step tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No step tag</SelectItem>
                    {availableSteps.map((step) => {
                      const displayName = [step.phaseName, step.operationName, step.step]
                        .filter(Boolean)
                        .join(' > ');
                      return (
                        <SelectItem key={step.id} value={step.id}>
                          {displayName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
            
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

