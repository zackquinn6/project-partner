import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Dialog, DialogPortal, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Target, RefreshCw, FileUp, Info } from 'lucide-react';
import { WorkflowStep } from '@/interfaces/Project';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { isStepCompleted } from '@/utils/projectUtils';
import { cn } from '@/lib/utils';
import {
  mergeQualityControlSettings,
  isOutputInQualityScope,
  type QualityControlSettings
} from '@/utils/qualityControlSettings';
import { toast } from 'sonner';
import { QualityControlPdfPrinter, type QualityControlPdfRow } from '@/components/QualityControlPdfPrinter';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type StepInstance = WorkflowStep & {
  phaseName?: string;
  operationName?: string;
  phaseId?: string;
  operationId?: string;
  spaceId?: string;
};

type QualityOutputRow = {
  key: string;
  phaseName: string;
  operationStepName: string;
  stepId: string;
  spaceId?: string;
  outputId: string;
  outputName: string;
  outputType: string;
  isComplete: boolean;
};

interface QualityCheckWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appTitle: string;
  projectRun: ProjectRun | null | undefined;
  updateProjectRun: (run: ProjectRun) => Promise<void>;
  steps: StepInstance[];
  completedSteps: Set<string>;
  checkedOutputs: Record<string, Set<string>>;
  onJumpToStep: (stepId: string, spaceId?: string | null) => void;
  onToggleOutputComplete: (stepId: string, outputId: string) => void;
  onRefresh?: () => void;
  userDisplayName: string;
  /** When true for an open cycle, the settings accordion starts expanded (e.g. opened from planning wizard). */
  expandSettingsAccordionWhenOpen?: boolean;
}

export function QualityCheckWindow({
  open,
  onOpenChange,
  appTitle,
  projectRun,
  updateProjectRun,
  steps,
  completedSteps,
  checkedOutputs,
  onJumpToStep,
  onToggleOutputComplete,
  onRefresh,
  userDisplayName,
  expandSettingsAccordionWhenOpen = false,
}: QualityCheckWindowProps) {
  const { user } = useAuth();
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  /** Open accordion item values: `qc-settings`, `qc-table` (multiple allowed). */
  const [accordionOpenValues, setAccordionOpenValues] = useState<string[]>([]);

  const settings = useMemo(
    () => mergeQualityControlSettings(projectRun?.quality_control_settings),
    [projectRun?.quality_control_settings]
  );

  const [localRequirePhotos, setLocalRequirePhotos] = useState(settings.require_photos_per_step);
  const [localRequireAllOutputs, setLocalRequireAllOutputs] = useState(settings.require_all_outputs);

  useEffect(() => {
    setLocalRequirePhotos(settings.require_photos_per_step);
    setLocalRequireAllOutputs(settings.require_all_outputs);
  }, [settings.require_photos_per_step, settings.require_all_outputs, projectRun?.id]);

  useEffect(() => {
    if (open) {
      setAccordionOpenValues(
        expandSettingsAccordionWhenOpen ? ['qc-settings'] : ['qc-table']
      );
    }
  }, [open, expandSettingsAccordionWhenOpen]);

  const persistSettings = useCallback(
    async (next: QualityControlSettings) => {
      if (!projectRun) {
        toast.error('No active project run');
        return;
      }
      setSavingSettings(true);
      try {
        await updateProjectRun({
          ...projectRun,
          quality_control_settings: next
        });
        toast.success('Quality Control settings saved');
      } catch (e) {
        console.error(e);
        toast.error('Failed to save settings');
      } finally {
        setSavingSettings(false);
      }
    },
    [projectRun, updateProjectRun]
  );

  const onRequirePhotosChange = (checked: boolean) => {
    setLocalRequirePhotos(checked);
    void persistSettings({
      require_photos_per_step: checked,
      require_all_outputs: localRequireAllOutputs
    });
  };

  const onRequireAllOutputsChange = (requireAll: boolean) => {
    setLocalRequireAllOutputs(requireAll);
    void persistSettings({
      require_photos_per_step: localRequirePhotos,
      require_all_outputs: requireAll
    });
  };

  const outputRows = useMemo<QualityOutputRow[]>(() => {
    const qc = mergeQualityControlSettings(projectRun?.quality_control_settings);
    const rows: QualityOutputRow[] = [];
    const seen = new Set<string>();

    for (const step of steps) {
      const stepOutputs = Array.isArray(step.outputs) ? step.outputs : [];
      if (stepOutputs.length === 0) continue;

      const stepIsComplete = isStepCompleted(completedSteps, step.id, step.spaceId ?? null);
      const checkedSet = checkedOutputs[step.id] || new Set<string>();

      for (const output of stepOutputs) {
        if (!isOutputInQualityScope(output, qc.require_all_outputs)) continue;

        const spaceId = step.spaceId ?? undefined;
        const rowKey = `${step.id}:${spaceId ?? 'global'}:${output.id}`;
        if (seen.has(rowKey)) continue;
        seen.add(rowKey);

        const outputMarked = checkedSet.has(output.id);
        const isComplete = stepIsComplete || outputMarked;

        rows.push({
          key: rowKey,
          phaseName: typeof step.phaseName === 'string' ? step.phaseName : '',
          operationStepName: step.step,
          stepId: step.id,
          spaceId,
          outputId: output.id,
          outputName: output.name,
          outputType: output.type,
          isComplete
        });
      }
    }

    rows.sort((a, b) => {
      const ap = a.phaseName || '';
      const bp = b.phaseName || '';
      if (ap !== bp) return ap.localeCompare(bp);
      if (a.operationStepName !== b.operationStepName) {
        return a.operationStepName.localeCompare(b.operationStepName);
      }
      return a.outputName.localeCompare(b.outputName);
    });

    return rows;
  }, [steps, completedSteps, checkedOutputs, projectRun?.quality_control_settings]);

  const visibleRows = useMemo(
    () => (showOnlyIncomplete ? outputRows.filter((r) => !r.isComplete) : outputRows),
    [outputRows, showOnlyIncomplete]
  );

  const incompleteCount = outputRows.filter((r) => !r.isComplete).length;

  const pdfRows = useMemo<QualityControlPdfRow[]>(
    () =>
      outputRows.map((r) => ({
        key: r.key,
        phaseName: r.phaseName,
        operationStepName: r.operationStepName,
        outputName: r.outputName,
        outputType: r.outputType,
        isComplete: r.isComplete
      })),
    [outputRows]
  );

  const projectDisplayName = projectRun
    ? projectRun.customProjectName?.trim() || projectRun.name?.trim() || projectRun.id
    : '';

  const handleDocumentUpload = useCallback(async (file: File | null) => {
    if (!file) return;
    if (!projectRun) {
      toast.error('No active project run');
      return;
    }
    if (!user) {
      toast.error('You must be signed in');
      return;
    }

    setUploadingDocument(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension) {
        toast.error('Invalid file name');
        return;
      }

      const safeExtension = extension.replace(/[^a-z0-9]/g, '');
      const safeFileStem = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
      const safeUserId = user.id.replace(/[^a-zA-Z0-9-]/g, '');
      const safeProjectRunId = projectRun.id.replace(/[^a-zA-Z0-9-]/g, '');
      const storagePath = `${safeUserId}/${safeProjectRunId}/documents/${Date.now()}-${safeFileStem}.${safeExtension}`;

      const { error: uploadError } = await supabase.storage
        .from('project-photos')
        .upload(storagePath, file, { upsert: false });
      if (uploadError) throw uploadError;

      const existingIssueReports: Record<string, unknown> =
        projectRun.issue_reports && typeof projectRun.issue_reports === 'object'
          ? (projectRun.issue_reports as Record<string, unknown>)
          : {};
      const maybeDocuments = existingIssueReports.quality_control_documents;
      const existingDocuments = Array.isArray(maybeDocuments)
        ? maybeDocuments
        : [];

      const nextIssueReports = {
        ...existingIssueReports,
        quality_control_documents: [
          ...existingDocuments,
          {
            name: file.name,
            storage_path: storagePath,
            uploaded_at: new Date().toISOString()
          }
        ]
      };

      await updateProjectRun({
        ...projectRun,
        issue_reports: nextIssueReports
      });

      toast.success('Document uploaded');
    } catch (e) {
      console.error('Failed to upload quality document', e);
      toast.error('Failed to upload document');
    } finally {
      setUploadingDocument(false);
    }
  }, [projectRun, updateProjectRun, user]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        {open && (
          <div
            className="bg-black/60 backdrop-blur-md fixed inset-0 z-[90] transition-opacity duration-200"
            aria-hidden="true"
          />
        )}
        <div
          data-dialog-content
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'fixed inset-0 z-[91]',
            'md:left-1/2 md:top-1/2 md:right-auto md:bottom-auto md:-translate-x-1/2 md:-translate-y-1/2',
            'md:w-[90vw] md:max-w-[90vw] md:h-[90vh] md:max-h-[90vh]',
            'md:max-w-[calc(100vw-2rem)] md:max-h-[calc(100vh-2rem)]',
            'bg-background md:border md:rounded-lg shadow-lg',
            'flex flex-col overflow-hidden'
          )}
        >
          <DialogHeader className="px-4 md:px-6 pt-5 pb-3 md:pt-6 md:pb-4 border-b flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 text-left space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <DialogTitle className="text-lg md:text-xl font-bold leading-tight truncate">
                  {appTitle}
                </DialogTitle>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative">
                  <input
                    id="quality-doc-upload-input"
                    type="file"
                    className="sr-only"
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp"
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] ?? null;
                      void handleDocumentUpload(nextFile);
                      event.currentTarget.value = '';
                    }}
                    disabled={uploadingDocument || !projectRun}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const input = document.getElementById('quality-doc-upload-input') as HTMLInputElement | null;
                      input?.click();
                    }}
                    disabled={uploadingDocument || !projectRun}
                    className="h-8 px-3 text-xs font-medium"
                  >
                    <FileUp className="w-3.5 h-3.5 mr-1" />
                    {uploadingDocument ? 'Uploading...' : 'Upload Document'}
                  </Button>
                </div>
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted"
                        aria-label="Document upload help"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Upload reference documents for this run, such as manufacturer manuals, permits, inspection records, or design documents.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {onRefresh && (
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={onRefresh}
                          aria-label={`Refresh ${appTitle}`}
                          className="h-8 w-8"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        Recompute outputs from the current project run.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="h-8 px-3 text-xs font-medium"
                >
                  Close
                </Button>
              </div>
            </div>
            <DialogDescription className="text-sm text-muted-foreground text-left">
              Track outputs for this project. Settings apply only to this project run.
            </DialogDescription>
            {projectRun ? (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <QualityControlPdfPrinter
                  rows={pdfRows}
                  reportTitle={appTitle}
                  projectName={projectDisplayName}
                  userDisplayName={userDisplayName}
                />
              </div>
            ) : null}
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 pt-6 md:pt-8 pb-4 md:pb-6 space-y-4">
            <Accordion
              type="multiple"
              value={accordionOpenValues}
              onValueChange={setAccordionOpenValues}
              className="w-full space-y-3"
            >
              <AccordionItem value="qc-settings" className="mb-3 rounded-lg border px-3">
                <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                  Quality Control Settings
                </AccordionTrigger>
                <AccordionContent className="space-y-5 pb-4 pt-0">
                    <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
                      <Checkbox
                        id="qc-require-photos"
                        checked={localRequirePhotos}
                        disabled={savingSettings || !projectRun}
                        onCheckedChange={(v) => onRequirePhotosChange(v === true)}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="qc-require-photos" className="text-sm font-medium cursor-pointer">
                          Require photos each step
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Users must upload at least one photo tagged to the current step before marking it complete.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                          <Label htmlFor="qc-all-outputs" className="text-sm font-medium">
                            Output completion requirement
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {localRequireAllOutputs
                              ? 'All outputs on each step must be checked off before the step can be completed.'
                              : 'Only critical outputs (non–“none” types: aesthetics, performance, safety) are required.'}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Critical only</span>
                            <Switch
                              id="qc-all-outputs"
                              checked={localRequireAllOutputs}
                              disabled={savingSettings || !projectRun}
                              onCheckedChange={onRequireAllOutputsChange}
                            />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">All outputs</span>
                          </div>
                        </div>
                      </div>
                    </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="qc-table" className="rounded-lg border px-3">
                <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                  Output checklist
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pb-4 pt-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {incompleteCount} incomplete / {outputRows.length} listed
                      </Badge>
                      <Button
                        type="button"
                        variant={showOnlyIncomplete ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => setShowOnlyIncomplete((v) => !v)}
                      >
                        Show only incomplete
                      </Button>
                    </div>

                    {visibleRows.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground border rounded-lg">
                        {outputRows.length === 0
                          ? 'No outputs match the current scope (try requiring all outputs in settings).'
                          : 'No incomplete outputs — turn off “Show only incomplete” to see every row.'}
                      </div>
                    ) : (
                      <div className="rounded-lg border overflow-hidden overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="min-w-[10rem] max-w-[18rem]">Phase &amp; step</TableHead>
                              <TableHead>Output</TableHead>
                              <TableHead className="w-32">Type</TableHead>
                              <TableHead className="w-28">Status</TableHead>
                              <TableHead className="w-[200px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {visibleRows.map((row) => (
                              <TableRow key={row.key}>
                                <TableCell className="align-top">
                                  <div className="text-sm font-medium leading-snug">{row.phaseName || '—'}</div>
                                  <div className="text-xs text-muted-foreground leading-snug mt-0.5">
                                    {row.operationStepName}
                                  </div>
                                </TableCell>
                                <TableCell className="align-top text-sm font-medium">{row.outputName}</TableCell>
                                <TableCell className="align-top">
                                  <Badge variant="outline" className="text-[10px] capitalize">
                                    {row.outputType.replace(/-/g, ' ')}
                                  </Badge>
                                </TableCell>
                                <TableCell className="align-top">
                                  {row.isComplete ? (
                                    <Badge className="bg-green-600 text-white text-xs">Complete</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">
                                      Incomplete
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="align-top">
                                  {!row.isComplete ? (
                                    <div className="flex items-center gap-2">
                                      <TooltipProvider delayDuration={150}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="icon"
                                              className="h-8 w-8"
                                              onClick={() => {
                                                onJumpToStep(row.stepId, row.spaceId ?? null);
                                                onOpenChange(false);
                                              }}
                                              aria-label="Jump to step"
                                            >
                                              <Target className="w-4 h-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent className="max-w-xs text-xs">
                                            Open this step in the workflow.
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                      <Button
                                        type="button"
                                        variant="default"
                                        className="bg-green-600 hover:bg-green-700 text-white text-xs h-8"
                                        onClick={() => onToggleOutputComplete(row.stepId, row.outputId)}
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                        Mark complete
                                      </Button>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  );
}
