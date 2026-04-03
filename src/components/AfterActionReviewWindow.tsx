import React, { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogPortal } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, Plus, Save } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ProjectRun } from '@/interfaces/ProjectRun';

type AARRow = {
  id: string;
  project_run_id: string;
  intent: string;
  experience: string;
  reasons: string;
  changes: string;
  created_at: string;
  updated_at: string;
};

function projectRunDisplayName(run: ProjectRun): string {
  const custom = run.customProjectName?.trim();
  if (custom) return custom;
  const name = run.name?.trim();
  if (name) return name;
  return run.id;
}

export interface AfterActionReviewWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectRun: ProjectRun | null;
}

export function AfterActionReviewWindow({
  open,
  onOpenChange,
  projectRun,
}: AfterActionReviewWindowProps) {
  const { toast } = useToast();
  const [rows, setRows] = useState<AARRow[]>([]);
  const [index, setIndex] = useState(0);
  const [intent, setIntent] = useState('');
  const [experience, setExperience] = useState('');
  const [reasons, setReasons] = useState('');
  const [changes, setChanges] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadRows = useCallback(async () => {
    if (!projectRun?.id) {
      setRows([]);
      setIndex(0);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('after_action_reviews')
      .select('*')
      .eq('project_run_id', projectRun.id)
      .order('created_at', { ascending: true });
    setLoading(false);
    if (error) {
      toast({
        title: 'Could not load reviews',
        description: error.message,
        variant: 'destructive',
      });
      setRows([]);
      return;
    }
    const list = (data ?? []) as AARRow[];
    setRows(list);
    setIndex((prev) => {
      if (list.length === 0) return 0;
      return Math.min(prev, list.length - 1);
    });
  }, [projectRun?.id, toast]);

  useEffect(() => {
    if (!open || !projectRun?.id) return;
    void loadRows();
  }, [open, projectRun?.id, loadRows]);

  const current = rows[index] ?? null;

  useEffect(() => {
    if (!current) {
      setIntent('');
      setExperience('');
      setReasons('');
      setChanges('');
      return;
    }
    setIntent(current.intent);
    setExperience(current.experience);
    setReasons(current.reasons);
    setChanges(current.changes);
  }, [current?.id, open]);

  const isDirty =
    current !== null &&
    (intent !== current.intent ||
      experience !== current.experience ||
      reasons !== current.reasons ||
      changes !== current.changes);

  const saveCurrent = async () => {
    if (!projectRun?.id || !current) return;
    setSaving(true);
    const updatedAt = new Date().toISOString();
    const { error } = await supabase
      .from('after_action_reviews')
      .update({
        intent,
        experience,
        reasons,
        changes,
        updated_at: updatedAt,
      })
      .eq('id', current.id);
    setSaving(false);
    if (error) {
      toast({
        title: 'Save failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    setRows((prev) =>
      prev.map((r) =>
        r.id === current.id
          ? { ...r, intent, experience, reasons, changes, updated_at: updatedAt }
          : r
      )
    );
    window.dispatchEvent(
      new CustomEvent('after-action-reviews-changed', { detail: { projectRunId: projectRun.id } })
    );
      };

  const goToIndex = async (next: number) => {
    if (next < 0 || next >= rows.length) return;
    if (isDirty && current) {
      await saveCurrent();
    }
    setIndex(next);
  };

  const handleNew = async () => {
    if (!projectRun?.id) return;
    if (isDirty && current) {
      await saveCurrent();
    }
    setSaving(true);
    const { data, error } = await supabase
      .from('after_action_reviews')
      .insert({
        project_run_id: projectRun.id,
        intent: '',
        experience: '',
        reasons: '',
        changes: '',
      })
      .select('*')
      .single();
    setSaving(false);
    if (error || !data) {
      toast({
        title: 'Could not create review',
        description: error?.message ?? 'Unknown error',
        variant: 'destructive',
      });
      return;
    }
    const row = data as AARRow;
    const newIndex = rows.length;
    setRows((prev) => [...prev, row]);
    setIndex(newIndex);
    window.dispatchEvent(
      new CustomEvent('after-action-reviews-changed', { detail: { projectRunId: projectRun.id } })
    );
  };

  const headerSubtitle = projectRun ? projectRunDisplayName(projectRun) : '';
  const currentLabel =
    rows.length === 0
      ? 'No entries yet'
      : `${index + 1} of ${rows.length}${
          current
            ? ` · ${format(new Date(current.created_at), 'MMM d, yyyy h:mm a')}`
            : ''
        }`;

  const quadrant = (title: string, value: string, onChange: (v: string) => void) => (
    <div className="flex min-h-[12rem] flex-1 flex-col overflow-hidden rounded-md border bg-card md:min-h-0">
      <h3 className="shrink-0 border-b bg-muted/40 px-2 py-2 text-center text-xs font-semibold leading-snug text-foreground md:text-sm">
        {title}
      </h3>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={!current && rows.length > 0}
        className="min-h-0 flex-1 resize-none rounded-none border-0 text-sm focus-visible:ring-0 md:text-base"
        placeholder={current || rows.length === 0 ? 'Enter notes…' : 'Select or create a review'}
      />
    </div>
  );

  if (!projectRun) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogPortal>
        {open && (
          <div
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-md transition-opacity duration-200"
            style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
            aria-hidden="true"
          />
        )}
        <div
          data-dialog-content
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'fixed inset-0 z-[91] flex flex-col overflow-hidden bg-background',
            'md:left-1/2 md:top-1/2 md:h-[90vh] md:max-h-[90vh] md:w-[90vw] md:max-w-[90vw] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:border md:shadow-lg'
          )}
        >
          <DialogHeader className="shrink-0 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-medium text-muted-foreground">{headerSubtitle}</p>
                <DialogTitle className="text-3xl font-bold tracking-tight md:text-4xl">
                  After Action Review
                </DialogTitle>
                <p className="text-xs text-muted-foreground md:text-sm">{currentLabel}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={rows.length < 2 || loading}
                  onClick={() => void goToIndex(index - 1)}
                  className="h-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={rows.length < 2 || loading}
                  onClick={() => void goToIndex(index + 1)}
                  className="h-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={saving || loading}
                  onClick={() => void handleNew()}
                  className="h-8"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  New AAR
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!current || saving || loading || !isDirty}
                  onClick={() => void saveCurrent()}
                  className="h-8"
                >
                  <Save className="mr-1 h-4 w-4" />
                  Save
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 md:gap-4 md:p-6">
            {loading ? (
              <div className="flex flex-1 items-center justify-center text-muted-foreground">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                <p className="max-w-md text-sm text-muted-foreground">
                  Create your first After Action Review for this project run. You can add more at any time; each has its
                  own timestamp.
                </p>
                <Button type="button" onClick={() => void handleNew()} disabled={saving}>
                  <Plus className="mr-2 h-4 w-4" />
                  New AAR
                </Button>
              </div>
            ) : (
              <>
                <div className="hidden min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-3 md:grid md:gap-4">
                  {quadrant('What was supposed to happen?', intent, setIntent)}
                  {quadrant('What did happen?', experience, setExperience)}
                  {quadrant('Why did it happen?', reasons, setReasons)}
                  {quadrant('What do we need to change?', changes, setChanges)}
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto md:hidden">
                  {quadrant('What was supposed to happen?', intent, setIntent)}
                  {quadrant('What did happen?', experience, setExperience)}
                  {quadrant('Why did it happen?', reasons, setReasons)}
                  {quadrant('What do we need to change?', changes, setChanges)}
                </div>
              </>
            )}
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  );
}
