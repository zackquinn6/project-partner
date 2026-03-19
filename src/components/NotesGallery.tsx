import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

type Mode = 'user' | 'admin';

type StepOption = {
  id: string;
  step: string;
  phaseName?: string;
  operationName?: string;
};

// Raw shapes coming back from `project_runs.phases` JSON.
// Keep this intentionally narrow to avoid `any` while still parsing dynamically.
type RawStep = { id: string; step?: string };
type RawOperation = { name?: string; steps?: RawStep[] };
type RawPhase = { name?: string; operations?: RawOperation[] };

interface NotesGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectRunId?: string;
  templateId?: string;
  mode?: Mode;
  title?: string;
  initialStepId?: string;
}

export function NotesGallery({
  open,
  onOpenChange,
  projectRunId,
  mode = 'user',
  title = 'Project Notes',
  initialStepId
}: NotesGalleryProps) {
  const { user } = useAuth();

  const isWorkflowNotes = mode === 'user' && !!projectRunId;

  const [availableSteps, setAvailableSteps] = useState<StepOption[]>([]);
  const [notesData, setNotesData] = useState<Record<string, string>>({});

  const [selectedStepId, setSelectedStepId] = useState<string>('');
  const [draft, setDraft] = useState<string>('');

  const [loadingSteps, setLoadingSteps] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const draftRef = useRef('');
  const selectedStepIdRef = useRef('');
  const notesDataRef = useRef<Record<string, string>>({});

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    selectedStepIdRef.current = selectedStepId;
  }, [selectedStepId]);

  useEffect(() => {
    notesDataRef.current = notesData;
  }, [notesData]);

  const getStepDisplayName = (step: StepOption) => {
    const parts = [step.phaseName, step.operationName, step.step].filter(Boolean);
    return parts.length ? parts.join(' > ') : step.id;
  };

  const fetchAvailableSteps = async (): Promise<StepOption[]> => {
    if (!projectRunId) return;
    setLoadingSteps(true);
    try {
      const { data: projectRun, error } = await supabase
        .from('project_runs')
        .select('phases')
        .eq('id', projectRunId)
        .single();

      if (error) throw error;

      const steps: StepOption[] = [];
      if (projectRun?.phases && Array.isArray(projectRun.phases)) {
        const phases = projectRun.phases as RawPhase[];

        phases.forEach((phase) => {
          if (!phase?.operations || !Array.isArray(phase.operations)) return;

          phase.operations.forEach((operation) => {
            if (!operation?.steps || !Array.isArray(operation.steps)) return;

            operation.steps.forEach((step) => {
              steps.push({
                id: step.id,
                step: step.step || '',
                phaseName: phase.name,
                operationName: operation.name
              });
            });
          });
        });
      }

      setAvailableSteps(steps);
      return steps;
    } catch (err) {
      console.error('Error fetching available steps:', err);
      toast.error('Failed to load steps for notes');
      return [];
    } finally {
      setLoadingSteps(false);
    }
  };

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
    } catch (err) {
      console.error('Error fetching notes:', err);
      toast.error('Failed to load existing notes');
    } finally {
      setLoadingNotes(false);
    }
  };

  const saveNow = useCallback(async () => {
    if (!projectRunId || !user) return;
    const stepId = selectedStepIdRef.current;
    if (!stepId) return;

    if (!dirtyRef.current) return;
    if (savingRef.current) return;

    savingRef.current = true;
    setSaving(true);

    try {
      const nextNotesData = {
        ...notesDataRef.current,
        [stepId]: draftRef.current
      };

      const { error } = await supabase
        .from('project_runs')
        .update({ notes_data: nextNotesData })
        .eq('id', projectRunId)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotesData(nextNotesData);
      setDirty(false);
      setLastSavedAt(new Date());
    } catch (err) {
      console.error('Error saving notes:', err);
      toast.error('Failed to save notes');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [projectRunId, user]);

  // Load steps + notes when the dialog opens.
  useEffect(() => {
    if (!open) return;
    if (!isWorkflowNotes) return;
    if (!user) return;

    setAvailableSteps([]);
    setNotesData({});
    setSelectedStepId('');
    setDraft('');
    setDirty(false);
    setLastSavedAt(null);

    const run = async () => {
      const steps = await fetchAvailableSteps();
      await fetchNotesData();

      // Only apply initialStepId once steps are loaded (so we can ensure it exists).
      if (initialStepId && steps.some(s => s.id === initialStepId)) {
        setSelectedStepId(initialStepId);
      }
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectRunId, user, isWorkflowNotes, initialStepId]);

  // Keep the draft in sync when notesData and selection are ready.
  useEffect(() => {
    if (!isWorkflowNotes) return;
    if (!selectedStepId) return;
    const existing = notesData[selectedStepId];
    setDraft(typeof existing === 'string' ? existing : '');
    setDirty(false);
  }, [isWorkflowNotes, selectedStepId, notesData]);

  // Autosave every 10 seconds.
  useEffect(() => {
    if (!open) return;
    if (!isWorkflowNotes) return;
    const interval = window.setInterval(() => {
      if (!dirtyRef.current) return;
      void saveNow();
    }, 10_000);

    return () => window.clearInterval(interval);
  }, [open, isWorkflowNotes, saveNow]);

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }

    // Save immediately, then close. Keeping the dialog open until save completes prevents data loss.
    void (async () => {
      await saveNow();
      onOpenChange(false);
    })();
  };

  const handleStepChange = async (nextStepId: string) => {
    if (nextStepId === selectedStepId) return;
    if (dirtyRef.current) {
      await saveNow();
    }
    setSelectedStepId(nextStepId);
    const existing = notesDataRef.current[nextStepId];
    setDraft(typeof existing === 'string' ? existing : '');
    setDirty(false);
  };

  if (!isWorkflowNotes) {
    // NotesGallery is only expected to be used in workflow 'user' mode.
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
        <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-lg md:text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {title}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDialogOpenChange(false)}
                disabled={saving}
                className="h-7 px-2 text-[9px] md:text-xs"
              >
                Close
              </Button>
            </div>
          </div>
          {saving ? (
            <DialogDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving...
            </DialogDescription>
          ) : (
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Autosaves every 10 seconds and on close
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
          {loadingSteps || loadingNotes ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading notes...
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes-step-select">Step</Label>
                <Select value={selectedStepId} onValueChange={handleStepChange} disabled={!availableSteps.length || saving}>
                  <SelectTrigger id="notes-step-select">
                    <SelectValue placeholder="Select a step" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSteps.map(step => (
                      <SelectItem key={step.id} value={step.id}>
                        {getStepDisplayName(step)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes-text">Note</Label>
                <Textarea
                  id="notes-text"
                  value={draft}
                  onChange={(e) => {
                    const next = e.target.value;
                    setDraft(next);
                    if (!selectedStepId) {
                      setDirty(false);
                      return;
                    }
                    const baseline = notesDataRef.current[selectedStepId] ?? '';
                    setDirty(next !== baseline);
                  }}
                  placeholder={selectedStepId ? 'Write your note here...' : 'Select a step to start writing...'}
                  rows={14}
                  className="resize-none"
                  disabled={!selectedStepId || saving}
                />
              </div>

              <div className="text-xs text-muted-foreground">
                {lastSavedAt ? `Last saved: ${format(lastSavedAt, 'MMM d, yyyy HH:mm')}` : 'Not saved yet'}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

