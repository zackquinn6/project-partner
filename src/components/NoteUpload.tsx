import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  projectId?: string | null;
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
  stepId: initialStepId,
  availableSteps = [],
  showButton = true,
  onNoteAdded
}: NoteUploadProps) {
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [notesData, setNotesData] = useState<Record<string, string>>({});

  const [selectedStepId, setSelectedStepId] = useState<string>(initialStepId || '');
  const [noteText, setNoteText] = useState<string>('');

  const [loadingNotes, setLoadingNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const noteTextRef = useRef('');
  const selectedStepIdRef = useRef('');
  const notesDataRef = useRef<Record<string, string>>({});

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    noteTextRef.current = noteText;
  }, [noteText]);

  useEffect(() => {
    selectedStepIdRef.current = selectedStepId;
  }, [selectedStepId]);

  useEffect(() => {
    notesDataRef.current = notesData;
  }, [notesData]);

  const fetchNotesData = async () => {
    if (!projectRunId || !user) return;
    setLoadingNotes(true);
    try {
      const { data, error } = await supabase
        .from('project_runs')
        .select('notes_data')
        .eq('id', projectRunId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      const nextNotesData = (data?.notes_data ?? {}) as Record<string, string>;
      setNotesData(nextNotesData);

      const existing = selectedStepIdRef.current;
      const existingText = nextNotesData[existing];
      setNoteText(typeof existingText === 'string' ? existingText : '');
      setDirty(false);
    } catch (err) {
      console.error('Error fetching notes:', err);
      toast.error('Failed to load notes');
    } finally {
      setLoadingNotes(false);
    }
  };

  const saveNow = useCallback(async () => {
    if (!projectRunId || !user) return;
    const step = selectedStepIdRef.current;
    if (!step) return;
    if (!dirtyRef.current) return;
    if (savingRef.current) return;

    savingRef.current = true;
    setSaving(true);

    try {
      const nextNotesData = {
        ...notesDataRef.current,
        [step]: noteTextRef.current
      };

      const { error } = await supabase
        .from('project_runs')
        .update({ notes_data: nextNotesData })
        .eq('id', projectRunId)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotesData(nextNotesData);
      setDirty(false);
    } catch (err) {
      console.error('Error saving notes:', err);
      toast.error('Failed to save notes');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [projectRunId, user]);

  // Load notes whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    if (!user) return;
    if (!selectedStepId) return;
    void fetchNotesData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  // Autosave every 10 seconds.
  useEffect(() => {
    if (!open) return;
    const interval = window.setInterval(() => {
      if (!dirtyRef.current) return;
      void saveNow();
    }, 10_000);
    return () => window.clearInterval(interval);
  }, [open, projectRunId, user, saveNow]);

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setOpen(true);
      return;
    }

    // Save immediately then close (keeps the dialog mounted until save completes).
    void (async () => {
      await saveNow();
      setOpen(false);
      onNoteAdded?.();
    })();
  };

  const getStepDisplayName = (step: StepOption) => {
    const parts = [step.phaseName, step.operationName, step.step].filter(Boolean);
    return parts.length ? parts.join(' > ') : step.id;
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
          <span className="hidden sm:inline">Note</span>
          <span className="sm:hidden">Note</span>
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Notes
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Autosaves every 10 seconds and on close'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {availableSteps.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="step-select">Tag to Step (Optional)</Label>
                <Select
                  value={selectedStepId || 'none'}
                  onValueChange={(value) => {
                    const next = value === 'none' ? '' : value;
                    if (next === selectedStepId) return;
                    if (dirtyRef.current) void saveNow();
                    setSelectedStepId(next);
                    const existing = notesDataRef.current[next];
                    setNoteText(typeof existing === 'string' ? existing : '');
                    setDirty(false);
                  }}
                  disabled={saving}
                >
                  <SelectTrigger id="step-select">
                    <SelectValue placeholder="No step tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No step tag</SelectItem>
                    {availableSteps.map(step => (
                      <SelectItem key={step.id} value={step.id}>
                        {getStepDisplayName(step)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="note-text">Note</Label>
              <Textarea
                id="note-text"
                value={noteText}
                onChange={(e) => {
                  const next = e.target.value;
                  setNoteText(next);
                  if (!selectedStepId) {
                    setDirty(false);
                    return;
                  }
                  const baseline = notesDataRef.current[selectedStepId] ?? '';
                  setDirty(next !== baseline);
                }}
                placeholder={selectedStepId ? 'Write your note here...' : 'Select a step to start writing...'}
                rows={10}
                className="resize-none"
                disabled={!selectedStepId || saving || loadingNotes}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pb-2">
            <Button
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              disabled={saving}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

