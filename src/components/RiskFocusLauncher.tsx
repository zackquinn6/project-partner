import { useEffect, useMemo, useState } from 'react';
import { Crosshair, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Project } from '@/interfaces/Project';
import { useProject } from '@/contexts/ProjectContext';
import { useMembership } from '@/contexts/MembershipContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BetaProjectWarning } from '@/components/BetaProjectWarning';
import {
  filterProjectsForCatalog,
  getProjectCatalogPublishStatus,
  getProjectCatalogVisibility,
} from '@/utils/catalogProjectFilters';

/** Same listing as the user-facing project catalog (visibility + revision collapse); not admin “all drafts” mode. */
function getRiskLessTemplateOptions(projects: Project[]): Project[] {
  return filterProjectsForCatalog(projects, false);
}

function RiskFocusStartControls({
  onSessionStarted,
  className,
}: {
  /** Called with the new project run id after a Risk-Less run is created (stay on current page; open register in parent). */
  onSessionStarted?: (projectRunId: string) => void;
  className?: string;
}) {
  const { projects, createProjectRun, loading: projectsLoading } = useProject();
  const { canAccessApp, loading: membershipLoading } = useMembership();
  const [selectedId, setSelectedId] = useState<string>('');
  const [starting, setStarting] = useState(false);
  const [comingSoonProject, setComingSoonProject] = useState<Project | null>(null);
  const [betaWarningProject, setBetaWarningProject] = useState<Project | null>(null);

  const templates = useMemo(() => getRiskLessTemplateOptions(projects), [projects]);

  const doStartSession = async (project: Project) => {
    setStarting(true);
    try {
      const runId = await createProjectRun(project, undefined, undefined, { riskFocusSession: true });
      if (runId) {
                onSessionStarted?.(runId);
      }
    } catch {
      // createProjectRun already toasts on failure
    } finally {
      setStarting(false);
    }
  };

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
      toast.error('Risk-Less requires a Risk-less or Projects membership (or an active trial).');
      return;
    }
    const project = projects.find((p) => p.id === selectedId);
    if (!project) {
      toast.error('Template not found.');
      return;
    }

    const visibility = getProjectCatalogVisibility(project);
    if (visibility === 'coming-soon') {
      setComingSoonProject(project);
      return;
    }

    const publishStatus = getProjectCatalogPublishStatus(project);
    if (publishStatus !== 'published' && publishStatus !== 'beta-testing') {
      setComingSoonProject(project);
      return;
    }

    if (publishStatus === 'beta-testing') {
      setBetaWarningProject(project);
      return;
    }

    await doStartSession(project);
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

      <Dialog open={comingSoonProject !== null} onOpenChange={(open) => !open && setComingSoonProject(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Coming Soon</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {comingSoonProject ? (
              <>
                <div>
                  <h3 className="font-medium text-foreground">{comingSoonProject.name}</h3>
                  {comingSoonProject.description ? (
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                      {comingSoonProject.description}
                    </p>
                  ) : null}
                </div>
                <p className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                  <span className="text-muted-foreground">Release date:</span>
                  <span className="font-medium text-foreground">
                    {comingSoonProject.release_date
                      ? new Date(comingSoonProject.release_date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'TBD'}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This project isn&apos;t available to start yet. You can browse it in the project catalog; Risk-Less
                  opens only published or beta projects.
                </p>
              </>
            ) : null}
          </div>
          <div className="flex justify-end pt-2">
            <Button type="button" onClick={() => setComingSoonProject(null)}>
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BetaProjectWarning
        projectName={betaWarningProject?.name ?? ''}
        open={betaWarningProject !== null}
        onOpenChange={(open) => {
          if (!open) setBetaWarningProject(null);
        }}
        onAccept={() => {
          const p = betaWarningProject;
          setBetaWarningProject(null);
          if (p) void doStartSession(p);
        }}
      />
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
  const { fetchProjects } = useProject();
  useEffect(() => {
    if (open) {
      void fetchProjects();
    }
  }, [open, fetchProjects]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crosshair className="h-5 w-5" />
            Risk-Less
          </DialogTitle>
          <p className="text-sm font-normal leading-snug text-muted-foreground">
            {`Spot what could go wrong, and plan how you'll handle it`}
          </p>
          <DialogDescription>Choose a project to get started (same visibility as the project catalog).</DialogDescription>
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
