import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Crosshair,
  Hammer,
  Home,
  Layers,
  Loader2,
  Clock,
  Palette,
  Shield,
  Target,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Project } from '@/interfaces/Project';
import { useProject } from '@/contexts/ProjectContext';
import { useMembership } from '@/contexts/MembershipContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BetaProjectWarning } from '@/components/BetaProjectWarning';
import {
  filterProjectsForCatalog,
  getProjectCatalogPublishStatus,
  getProjectCatalogVisibility,
  getProjectCategories,
} from '@/utils/catalogProjectFilters';
import { getProjectCoverUrl, resolveCatalogCoverUrl } from '@/utils/catalogCoverImage';
import { useGlobalPublicSettings } from '@/hooks/useGlobalPublicSettings';

const PREVIEW_CARD_COUNT = 3;

function getIconForCategory(category: string) {
  switch (category) {
    case 'Interior':
      return Palette;
    case 'Flooring':
      return Layers;
    case 'Kitchen':
      return Target;
    case 'Exterior':
      return Home;
    case 'Technology':
    case 'Electrical':
      return Zap;
    case 'Maintenance':
      return Shield;
    default:
      return Hammer;
  }
}

function isPopularProject(project: Project): boolean {
  return project.isPopular === true || (project as { is_popular?: boolean }).is_popular === true;
}

function sortCatalogTemplates(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => {
    const ap = isPopularProject(a) ? 1 : 0;
    const bp = isPopularProject(b) ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return a.name.localeCompare(b.name);
  });
}

function RiskFocusProjectCard({
  project,
  onSelect,
  disabled,
  starting,
}: {
  project: Project;
  onSelect: (project: Project) => void;
  disabled: boolean;
  starting: boolean;
}) {
  const categories = getProjectCategories(project);
  const IconComponent = getIconForCategory(categories[0] || '');
  const imageUrl = getProjectCoverUrl(project as Parameters<typeof getProjectCoverUrl>[0]);
  const thumbUrl = imageUrl ? resolveCatalogCoverUrl(imageUrl, 'thumb') : undefined;
  const gridUrl = imageUrl ? resolveCatalogCoverUrl(imageUrl, 'grid') : undefined;
  const publishStatus = getProjectCatalogPublishStatus(project);
  const visibility = getProjectCatalogVisibility(project);
  const isBeta = publishStatus === 'beta-testing';
  const isComingSoon = visibility === 'coming-soon';

  return (
    <div className="lg:w-[calc((100%-2rem)/3)] lg:max-w-[calc((100%-2rem)/3)] lg:shrink-0">
      {/* Compact row below lg */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(project)}
        className="lg:hidden w-full group hover:bg-muted/40 transition-colors cursor-pointer border rounded-lg bg-card overflow-hidden h-16 text-left disabled:opacity-60 disabled:pointer-events-none"
      >
        <div className="flex items-stretch h-full min-h-0">
          <div className="flex-shrink-0 w-14 h-16 self-stretch overflow-hidden bg-muted">
            {thumbUrl ? (
              <img src={thumbUrl} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary to-warning-soft flex items-center justify-center">
                <IconComponent className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 px-3 py-1.5 flex flex-col justify-center gap-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-semibold text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors min-w-0 flex-1">
                {project.name}
              </h3>
              <div className="flex items-center gap-1 shrink-0">
                {starting ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
                {isBeta ? (
                  <Badge variant="secondary" className="bg-warning-soft/15 text-warning-soft text-[10px] px-1 py-0">
                    BETA
                  </Badge>
                ) : null}
                {isComingSoon ? (
                  <Badge variant="secondary" className="bg-info/15 text-info text-[10px] px-1 py-0">
                    Soon
                  </Badge>
                ) : null}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              {(project as { difficulty?: string }).difficulty || 'Beginner'}
              {project.estimatedTime ? ` · ${project.estimatedTime}` : ''}
            </p>
          </div>
        </div>
      </button>

      {/* Photo card from lg up */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(project)}
        className="hidden lg:flex lg:flex-col lg:h-full lg:aspect-[4/3] w-full group hover:shadow-xl transition-all duration-300 cursor-pointer rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden text-left disabled:opacity-60 disabled:pointer-events-none"
      >
        <div className="flex-shrink-0 px-3 pt-2.5 pb-1.5 bg-card border-b border-border">
          <h3 className="text-sm font-semibold group-hover:text-primary transition-colors line-clamp-2 text-center">
            {project.name}
          </h3>
        </div>
        <div className="flex-1 relative overflow-hidden bg-muted min-h-0">
          <div
            className="gradient-background absolute inset-0 bg-gradient-to-br from-primary to-warning-soft"
            style={{ opacity: gridUrl ? 0 : 1, transition: 'opacity 0.3s ease', zIndex: 1 }}
          >
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <IconComponent className="w-8 h-8 text-white/80" />
            </div>
          </div>
          {gridUrl ? (
            <img
              src={gridUrl}
              alt={project.name}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              style={{ zIndex: 2, display: 'block' }}
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = 'none';
                const gradientDiv = img.parentElement?.querySelector('.gradient-background') as HTMLElement | null;
                if (gradientDiv) gradientDiv.style.opacity = '1';
              }}
              onLoad={(e) => {
                const img = e.target as HTMLImageElement;
                const gradientDiv = img.parentElement?.querySelector('.gradient-background') as HTMLElement | null;
                if (gradientDiv) gradientDiv.style.opacity = '0';
                img.style.display = 'block';
              }}
            />
          ) : null}
          {gridUrl ? (
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" style={{ zIndex: 3 }} />
          ) : null}
          <div className="absolute top-2 right-2 flex gap-1 items-center" style={{ zIndex: 4 }}>
            {starting ? (
              <span className="rounded-full bg-background/90 p-1 shadow-sm">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground" />
              </span>
            ) : null}
            {isBeta ? (
              <Badge
                variant="secondary"
                className="bg-warning-soft text-warning-soft-foreground border-warning-soft-foreground/25 text-[10px] px-1.5 py-0"
              >
                <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                BETA
              </Badge>
            ) : null}
            {isComingSoon ? (
              <Badge variant="secondary" className="bg-info text-info-foreground border-info-foreground/25 text-[10px] px-1.5 py-0">
                Soon
              </Badge>
            ) : null}
          </div>
        </div>
      </button>
    </div>
  );
}

function RiskFocusStartControls({
  onSessionStarted,
  className,
}: {
  /** Called with the new project run id after a Risk Radar run is created (stay on current page; open register in parent). */
  onSessionStarted?: (projectRunId: string) => void;
  className?: string;
}) {
  const { projects, createProjectRun, loading: projectsLoading } = useProject();
  const { canAccessApp, loading: membershipLoading } = useMembership();
  const { tileFocusMode } = useGlobalPublicSettings();
  const [startingId, setStartingId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [comingSoonProject, setComingSoonProject] = useState<Project | null>(null);
  const [betaWarningProject, setBetaWarningProject] = useState<Project | null>(null);

  /** Same listing as the user-facing project catalog (visibility + revision collapse); not admin “all drafts” mode. */
  const templates = useMemo(
    () => sortCatalogTemplates(filterProjectsForCatalog(projects, false, { tileFocusOnly: tileFocusMode })),
    [projects, tileFocusMode]
  );

  const visibleTemplates = showAll ? templates : templates.slice(0, PREVIEW_CARD_COUNT);
  const hasMoreThanPreview = templates.length > PREVIEW_CARD_COUNT;
  const starting = startingId != null;

  const doStartSession = async (project: Project) => {
    setStartingId(project.id);
    try {
      const runId = await createProjectRun(project, undefined, undefined, { riskFocusSession: true });
      if (runId) {
        onSessionStarted?.(runId);
      }
    } catch {
      // createProjectRun already toasts on failure
    } finally {
      setStartingId(null);
    }
  };

  const handleSelectProject = async (project: Project) => {
    if (membershipLoading) {
      toast.error('Please wait - your account is still loading.');
      return;
    }
    if (!canAccessApp('risk-focus')) {
      toast.error('Risk Radar requires a Risk Radar or Projects membership (or an active trial).');
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
      {projectsLoading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading projects…
        </div>
      ) : templates.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">No projects available.</div>
      ) : (
        <>
          <div className="space-y-2 lg:flex lg:flex-wrap lg:justify-center lg:gap-4 lg:space-y-0">
            {visibleTemplates.map((project) => (
              <RiskFocusProjectCard
                key={project.id}
                project={project}
                onSelect={(p) => void handleSelectProject(p)}
                disabled={starting}
                starting={startingId === project.id}
              />
            ))}
          </div>

          {hasMoreThanPreview && !showAll ? (
            <div className="mt-4 flex justify-center">
              <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setShowAll(true)}>
                See all
              </Button>
            </div>
          ) : null}

          {hasMoreThanPreview && showAll ? (
            <div className="mt-4 flex justify-center">
              <Button type="button" variant="ghost" size="sm" className="text-xs h-7" onClick={() => setShowAll(false)}>
                Show fewer
              </Button>
            </div>
          ) : null}
        </>
      )}

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
                  This project isn&apos;t available to start yet. You can browse it in the project catalog; Risk Radar
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
      <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-3xl lg:max-w-4xl max-h-[min(90vh,900px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crosshair className="h-5 w-5" />
            Risk Radar
          </DialogTitle>
          <p className="text-sm font-normal leading-snug text-muted-foreground">
            {`Spot what could go wrong, and plan how you'll handle it`}
          </p>
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
