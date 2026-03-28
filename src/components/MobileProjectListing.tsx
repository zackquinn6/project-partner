import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, SortAsc, FolderKanban } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MobileProjectCard } from './MobileProjectCard';
import { Project } from '@/interfaces/Project';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { useButtonTracker } from '@/hooks/useButtonTracker';
import { calculateProjectProgress } from '@/utils/progressCalculation';
import { getRiskFocusAwareDisplayName, isRiskFocusRun } from '@/utils/projectRunRiskFocus';
import { WorkspaceSubViewHeader } from '@/components/WorkspaceSubViewHeader';
import { HomeManager } from '@/components/HomeManager';

function listingProgressPercent(run: ProjectRun): number {
  try {
    return calculateProjectProgress(run);
  } catch {
    return run.progress || 0;
  }
}

interface MobileProjectListingProps {
  onProjectSelect: (project: Project | ProjectRun) => void;
  onNewProject?: () => void;
  /** When false, hide catalog entry (+) and adjust empty state (global admin toggle). */
  catalogNewProjectEnabled?: boolean;
  onClose?: () => void;
}

export function MobileProjectListing({
  onProjectSelect,
  onNewProject,
  catalogNewProjectEnabled = true,
  onClose,
}: MobileProjectListingProps) {
  const { user } = useAuth();
  const { projectRuns, currentProjectRun } = useProject();
  const { trackClick } = useButtonTracker();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'progress'>('recent');
  const [homes, setHomes] = useState<{ id: string; name: string }[]>([]);
  const [selectedHomeId, setSelectedHomeId] = useState<string | null>(null);
  const [showHomeManager, setShowHomeManager] = useState(false);

  const fetchHomes = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('homes')
      .select('id, name')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false });
    if (error || !data) return;
    setHomes(data);
    setSelectedHomeId((prev) => {
      if (prev && (prev === 'all' || data.some((h) => h.id === prev))) return prev;
      return data[0]?.id ?? 'all';
    });
  }, [user]);

  useEffect(() => {
    void fetchHomes();
  }, [fetchHomes]);

  // Get access to reset functions from parent Index component
  const [resetUserView, setResetUserView] = useState(false);
  const [forceListingMode, setForceListingMode] = useState(false);

  // Listen for reset flag updates from Index
  useEffect(() => {
    const handleResetFlags = (event: CustomEvent) => {
      setResetUserView(event.detail.resetUserView || false);
      setForceListingMode(event.detail.forceListingMode || false);
    };

    window.addEventListener('update-reset-flags', handleResetFlags as EventListener);
    return () => window.removeEventListener('update-reset-flags', handleResetFlags as EventListener);
  }, []);

  // Filter and sort project runs
  const filteredProjectRuns = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let filtered = projectRuns.filter((run) => {
      if (selectedHomeId && selectedHomeId !== 'all' && run.home_id !== selectedHomeId) {
        return false;
      }
      if (!q) return true;
      const display = getRiskFocusAwareDisplayName(run);
      const haystack = [run.name, run.customProjectName, display, run.description]
        .filter((s): s is string => typeof s === 'string' && s.length > 0)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });

    return filtered.sort((a, b) => {
      const aProgress = listingProgressPercent(a);
      const bProgress = listingProgressPercent(b);

      if (sortBy === 'name') {
        return getRiskFocusAwareDisplayName(a).localeCompare(getRiskFocusAwareDisplayName(b));
      }
      if (sortBy === 'progress') {
        if (aProgress !== bProgress) return bProgress - aProgress;
        return (
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime()
        );
      }
      if (aProgress < 100 && bProgress >= 100) return -1;
      if (bProgress < 100 && aProgress >= 100) return 1;
      return (
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime()
      );
    });
  }, [projectRuns, searchQuery, sortBy, selectedHomeId]);

  const runsInHomeScope = useMemo(() => {
    if (!selectedHomeId || selectedHomeId === 'all') return projectRuns;
    return projectRuns.filter((r) => r.home_id === selectedHomeId);
  }, [projectRuns, selectedHomeId]);

  const activeCount = runsInHomeScope.filter((run) => listingProgressPercent(run) < 100).length;
  const completedCount = runsInHomeScope.filter((run) => listingProgressPercent(run) >= 100).length;

  const goToWorkspace = () => {
    onClose?.();
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <WorkspaceSubViewHeader
        compactMobile
        screenTitle="Project Dashboard"
        screenIcon={<FolderKanban className="h-4 w-4 md:h-[18px] md:w-[18px]" aria-hidden />}
        helpTitle="About Project Dashboard"
        helpBody="View and open your active and completed project runs. Use the home selector to focus on projects linked to a property. Search and sort help you find a run quickly."
        onGoToWorkspace={goToWorkspace}
        homes={homes}
        selectedHomeId={selectedHomeId}
        onHomeChange={setSelectedHomeId}
        onOpenHomeManager={() => setShowHomeManager(true)}
      >
        <div className="flex items-center gap-1 md:flex-wrap md:gap-2">
          <div className="relative min-h-0 min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground md:left-2.5 md:h-4 md:w-4" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs md:h-10 md:pl-9 md:text-sm"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 px-2.5 md:h-10 md:px-3"
            title="Sort order"
            aria-label="Sort projects"
            onClick={() => {
              const nextSort = sortBy === 'recent' ? 'name' : sortBy === 'name' ? 'progress' : 'recent';
              setSortBy(nextSort);
            }}
          >
            <SortAsc className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
          {catalogNewProjectEnabled && onNewProject ? (
            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-8 shrink-0 px-2.5 md:h-10 md:px-3"
              onClick={() => {
                onNewProject();
              }}
              aria-label="New project"
            >
              <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Button>
          ) : null}
        </div>

        {currentProjectRun ? (
          <div className="rounded-md border border-primary/25 bg-primary/5 px-2 py-1.5 md:rounded-lg md:px-3 md:py-2">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Continue
                  </span>
                  {isRiskFocusRun(currentProjectRun) ? (
                    <Badge variant="outline" className="px-1.5 py-0 text-[9px] leading-none">
                      Risk-Focus
                    </Badge>
                  ) : null}
                </div>
                <p className="truncate text-sm font-medium leading-tight text-foreground">
                  {getRiskFocusAwareDisplayName(currentProjectRun)}
                </p>
              </div>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="h-8 shrink-0 px-3 text-xs"
                onClick={trackClick(
                  'continue-current-project',
                  () => {
                    setResetUserView(false);
                    setForceListingMode(false);
                    window.dispatchEvent(new CustomEvent('clear-reset-flags'));

                    if (currentProjectRun && isRiskFocusRun(currentProjectRun)) {
                      window.dispatchEvent(
                        new CustomEvent('open-risk-focus-register-for-run', {
                          detail: { projectRunId: currentProjectRun.id },
                        })
                      );
                      return;
                    }
                    if (currentProjectRun) {
                      onProjectSelect(currentProjectRun);
                    }
                  },
                  { preventBubbling: true }
                )}
              >
                Open
              </Button>
            </div>
          </div>
        ) : null}
      </WorkspaceSubViewHeader>

      <HomeManager
        open={showHomeManager}
        onOpenChange={setShowHomeManager}
        selectedHomeId={null}
        onHomeSelected={() => void fetchHomes()}
        showSelector={false}
      />

      {/* Content — flex-1 + min-h-0 so the list uses remaining viewport below header + bottom nav */}
      <div className="flex min-h-0 flex-1 flex-col overflow-auto px-2 pb-1 pt-0 md:space-y-3 md:px-6 md:py-4 md:pb-2">
        <div className="flex min-h-0 flex-1 flex-col space-y-1.5 md:space-y-3">
        {/* Active Projects Section */}
        {filteredProjectRuns.filter((run) => listingProgressPercent(run) < 100).length > 0 && (
          <>
            <div className="px-0.5 text-xs font-medium text-muted-foreground md:mb-0 md:px-1 md:text-sm mb-1">
              Active Projects ({activeCount})
            </div>
            {filteredProjectRuns
              .filter((run) => listingProgressPercent(run) < 100)
              .map((run) => (
                <MobileProjectCard
                  key={run.id}
                  project={run}
                  variant="run"
                  onSelect={() => onProjectSelect(run)}
                />
              ))
            }
          </>
        )}

        {/* Completed Projects Section */}
        {filteredProjectRuns.filter((run) => listingProgressPercent(run) >= 100).length > 0 && (
          <>
            <div className="mt-3 px-0.5 text-xs font-medium text-muted-foreground md:mt-6 md:mb-0 md:px-1 md:text-sm mb-1">
              Completed Projects ({completedCount})
            </div>
            {filteredProjectRuns
              .filter((run) => listingProgressPercent(run) >= 100)
              .map((run) => (
                <MobileProjectCard
                  key={run.id}
                  project={run}
                  variant="run"
                  onSelect={() => onProjectSelect(run)}
                />
              ))
            }
          </>
        )}

        {/* Empty State */}
        {filteredProjectRuns.length === 0 && (
          <EmptyState
            title="No projects yet"
            description={
              catalogNewProjectEnabled && onNewProject
                ? 'Start a new project by tapping the + button'
                : 'Add a project from your workshop on a larger screen, or when the project catalog is available.'
            }
            actionLabel="New Project"
            showAction={Boolean(catalogNewProjectEnabled && onNewProject)}
            onAction={() => onNewProject?.()}
          />
        )}
        </div>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel: string;
  showAction: boolean;
  onAction: () => void;
}

function EmptyState({ title, description, actionLabel, showAction, onAction }: EmptyStateProps) {
  return (
    <div className="py-8 text-center md:py-12">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted md:mb-4 md:h-16 md:w-16">
        <Plus className="h-7 w-7 text-muted-foreground md:h-8 md:w-8" />
      </div>
      <h3 className="mb-1.5 text-base font-semibold text-card-foreground md:mb-2 md:text-lg">{title}</h3>
      <p className="mb-4 px-2 text-sm text-muted-foreground md:mb-6 md:text-base">{description}</p>
      {showAction && (
        <Button variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}