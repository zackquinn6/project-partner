import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Plus, SortAsc } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { MobileProjectCard } from './MobileProjectCard';
import { Project } from '@/interfaces/Project';
import { ProjectRun } from '@/interfaces/ProjectRun';

interface MobileProjectListingProps {
  onProjectSelect: (project: Project | ProjectRun) => void;
  onNewProject?: () => void;
}

export function MobileProjectListing({ onProjectSelect, onNewProject }: MobileProjectListingProps) {
  const { projects, projectRuns, currentProjectRun } = useProject();
  const [searchQuery, setSearchQuery] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'progress'>('recent');

  // Filter and sort project runs
  const filteredProjectRuns = useMemo(() => {
    let filtered = projectRuns.filter(run => {
      const matchesSearch = run.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          run.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

    // Sort by progress (active first, then completed)
    return filtered.sort((a, b) => {
      const aProgress = a.progress || 0;
      const bProgress = b.progress || 0;
      
      // Active projects first
      if (aProgress < 100 && bProgress >= 100) return -1;
      if (bProgress < 100 && aProgress >= 100) return 1;
      
      // Within same category, sort by recent activity
      return new Date(b.updatedAt || b.createdAt).getTime() - 
             new Date(a.updatedAt || a.createdAt).getTime();
    });
  }, [projectRuns, searchQuery, sortBy]);

  // Filter project templates
  const filteredProjects = useMemo(() => {
    let filtered = projects.filter(project => {
      return project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             project.description?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [projects, searchQuery]);

  // Get counts
  const activeCount = projectRuns.filter(run => (run.progress || 0) < 100).length;
  const completedCount = projectRuns.filter(run => (run.progress || 0) >= 100).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 space-y-4 bg-background/95 backdrop-blur-sm border-b border-border">
        {/* Search and Actions */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const nextSort = sortBy === 'recent' ? 'name' : sortBy === 'name' ? 'progress' : 'recent';
              setSortBy(nextSort);
            }}
            className="px-3 h-10"
          >
            <SortAsc className="h-4 w-4" />
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onNewProject}
            className="px-3 h-10"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Continue Current Project (if any) */}
        {currentProjectRun && !showTemplates && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary">Continue Current Project</p>
                <p className="text-xs text-muted-foreground truncate">{currentProjectRun.name}</p>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => onProjectSelect(currentProjectRun)}
                className="ml-3"
              >
                Continue
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Toggle between Projects and Templates */}
      <div className="flex-shrink-0 bg-background/95 backdrop-blur-sm">
        <div className="px-4 mb-4">
          <div className="flex gap-2">
            <Button
              variant={!showTemplates ? "default" : "outline"}
              onClick={() => setShowTemplates(false)}
              className="flex-1"
            >
              My Projects
              {(activeCount + completedCount) > 0 && (
                <Badge className="ml-2 bg-background text-foreground text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center">
                  {activeCount + completedCount}
                </Badge>
              )}
            </Button>
            <Button
              variant={showTemplates ? "default" : "outline"}
              onClick={() => setShowTemplates(true)}
              className="flex-1"
            >
              Templates
              {filteredProjects.length > 0 && (
                <Badge className="ml-2 bg-background text-foreground text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center">
                  {filteredProjects.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {showTemplates ? (
          // Templates view
          filteredProjects.length > 0 ? (
            filteredProjects.map((project) => (
              <MobileProjectCard
                key={project.id}
                project={project}
                variant="project"
                onSelect={() => onProjectSelect(project)}
              />
            ))
          ) : (
            <EmptyState
              title="No templates found"
              description="Try adjusting your search"
              actionLabel="Clear Search"
              onAction={() => setSearchQuery('')}
            />
          )
        ) : (
          // Projects view - active and completed together
          <>
            {/* Active Projects Section */}
            {filteredProjectRuns.filter(run => (run.progress || 0) < 100).length > 0 && (
              <>
                <div className="text-sm font-medium text-muted-foreground px-1 mb-2">
                  Active Projects ({activeCount})
                </div>
                {filteredProjectRuns
                  .filter(run => (run.progress || 0) < 100)
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
            {filteredProjectRuns.filter(run => (run.progress || 0) >= 100).length > 0 && (
              <>
                <div className="text-sm font-medium text-muted-foreground px-1 mb-2 mt-6">
                  Completed Projects ({completedCount})
                </div>
                {filteredProjectRuns
                  .filter(run => (run.progress || 0) >= 100)
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
                description="Start a new project from our templates"
                actionLabel="Browse Templates"
                onAction={() => setShowTemplates(true)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
        <Plus className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-card-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6">{description}</p>
      <Button variant="outline" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}