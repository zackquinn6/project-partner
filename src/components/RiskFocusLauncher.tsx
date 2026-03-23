import { useMemo, useState } from 'react';
import { Crosshair, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Project } from '@/interfaces/Project';
import { useProject } from '@/contexts/ProjectContext';
import { useMembership } from '@/contexts/MembershipContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function getRiskFocusTemplateOptions(projects: Project[], isAdmin: boolean): Project[] {
  return projects
    .filter((project) => {
      const publishStatus = project.publishStatus;
      const visibility = project.visibilityStatus ?? 'default';
      const isHidden = visibility === 'hidden';
      const isComingSoon = visibility === 'coming-soon';
      const isPublishVisible = publishStatus === 'published' || publishStatus === 'beta-testing';
      const isValidStatus = !isHidden && (isComingSoon || isPublishVisible || isAdmin);

      const isNotManualTemplate = project.id !== '00000000-0000-0000-0000-000000000000';
      const isStandardById = project.id === '00000000-0000-0000-0000-000000000001';
      const isStandardByName =
        typeof project.name === 'string' &&
        project.name.trim().toLowerCase() === 'standard project foundation';
      const isNotStandardFoundation = !isStandardById && !isStandardByName;

      const allowedToStart =
        publishStatus === 'published' ||
        publishStatus === 'beta-testing' ||
        (isAdmin && publishStatus === 'draft');

      return isValidStatus && isNotManualTemplate && isNotStandardFoundation && allowedToStart;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function RiskFocusStartControls({
  onSessionStarted,
  className,
}: {
  /** Called with the new project run id after a Risk Focus run is created (stay on current page; open register in parent). */
  onSessionStarted?: (projectRunId: string) => void;
  className?: string;
}) {
  const { projects, createProjectRun, loading: projectsLoading } = useProject();
  const { canAccessApp, loading: membershipLoading } = useMembership();
  const { isAdmin } = useUserRole();
  const [selectedId, setSelectedId] = useState<string>('');
  const [starting, setStarting] = useState(false);

  const templates = useMemo(
    () => getRiskFocusTemplateOptions(projects, isAdmin),
    [projects, isAdmin]
  );

  const handleStart = async () => {
    if (!selectedId) {
      toast.error('Choose a project template first.');
      return;
    }
    if (membershipLoading) {
      toast.error('Please wait—your account is still loading.');
      return;
    }
    if (!canAccessApp('risk-focus')) {
      toast.error('A subscription or trial is required to use Risk Focus.');
      return;
    }
    const project = projects.find((p) => p.id === selectedId);
    if (!project) {
      toast.error('Template not found.');
      return;
    }

    setStarting(true);
    try {
      const runId = await createProjectRun(
        project,
        undefined,
        undefined,
        { riskFocusSession: true }
      );
      if (runId) {
        toast.success('Risk Focus session started.');
        onSessionStarted?.(runId);
      }
    } catch {
      // createProjectRun already toasts on failure
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="flex-1 h-9 text-xs sm:text-sm">
            <SelectValue placeholder="Select project template…" />
          </SelectTrigger>
          <SelectContent className="max-h-[min(50vh,320px)]">
            {projectsLoading ? (
              <div className="px-2 py-3 text-xs text-muted-foreground">Loading templates…</div>
            ) : templates.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground">No templates available.</div>
            ) : (
              templates.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs sm:text-sm">
                  {p.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button
          type="button"
          className="h-9 text-xs sm:text-sm sm:shrink-0"
          disabled={
            !selectedId ||
            starting ||
            projectsLoading ||
            (!projectsLoading && templates.length === 0)
          }
          onClick={() => void handleStart()}
        >
          {projectsLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading…
            </>
          ) : starting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Starting…
            </>
          ) : (
            'Start'
          )}
        </Button>
      </div>
    </div>
  );
}

export function RiskFocusLauncherDialog({
  open,
  onOpenChange,
  onRiskFocusRunStarted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRiskFocusRunStarted?: (projectRunId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crosshair className="h-5 w-5" />
            Risk Focus
          </DialogTitle>
          <DialogDescription>
            {`Choose a project and focus only on controlling for "what could go wrong". This is perfect for those who are following other content and want help to assure the project goes well.`}
          </DialogDescription>
        </DialogHeader>
        <RiskFocusStartControls
          onSessionStarted={(runId) => {
            onOpenChange(false);
            onRiskFocusRunStarted?.(runId);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
