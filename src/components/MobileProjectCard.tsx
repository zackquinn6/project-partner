import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { ChevronRight, Play, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { Project } from '@/interfaces/Project';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { useProject } from '@/contexts/ProjectContext';
import { useButtonTracker } from '@/hooks/useButtonTracker';
import { calculateProjectProgress } from '@/utils/progressCalculation';
import { getRiskFocusAwareDisplayName, isRiskFocusRun } from '@/utils/projectRunRiskFocus';
import {
  dashboardStatusBadgeClassName,
  dashboardStatusBadgeLabel,
  dashboardStatusFromProgressPercent,
  type DashboardRunStatus,
} from '@/utils/projectDashboardStatus';

interface MobileProjectCardProps {
  project: Project | ProjectRun;
  onSelect: () => void;
  variant?: 'project' | 'run';
  onDelete?: (projectId: string) => void;
}

export function MobileProjectCard({ project, onSelect, variant = 'project', onDelete }: MobileProjectCardProps) {
  const { deleteProjectRun } = useProject();
  const { trackClick } = useButtonTracker();
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  
  const isProjectRun = variant === 'run' || 'progress' in project;
  const projectRunData = isProjectRun ? (project as ProjectRun) : null;
  const progress = (() => {
    if (!projectRunData) return 0;
    try {
      return calculateProjectProgress(projectRunData);
    } catch (error) {
      console.error('Failed to calculate project progress:', error);
      return 0;
    }
  })();
  const status: DashboardRunStatus | 'template' = isProjectRun
    ? dashboardStatusFromProgressPercent(progress)
    : 'template';

  const displayTitle =
    projectRunData != null
      ? getRiskFocusAwareDisplayName(projectRunData)
      : project.name;

  // Only allow swipe to delete for project runs (not templates)
  const canDelete = isProjectRun;
  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!canDelete) return;
    
    startXRef.current = e.touches[0].clientX;
    isDraggingRef.current = false;
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!canDelete) return;
    
    const currentX = e.touches[0].clientX;
    const deltaX = startXRef.current - currentX;
    
    // Only allow left swipe (positive deltaX)
    if (deltaX > 0) {
      isDraggingRef.current = true;
      setSwipeOffset(Math.min(deltaX, 100)); // Max swipe distance of 100px
      e.preventDefault(); // Prevent scrolling when swiping
    }
  };
  
  const handleTouchEnd = () => {
    if (!canDelete) return;
    
    // If swiped more than 50px, keep it open, otherwise close
    if (swipeOffset > 50) {
      setSwipeOffset(100);
    } else {
      setSwipeOffset(0);
    }
    
    isDraggingRef.current = false;
  };
  
  const handleClick = (e: React.MouseEvent) => {
    console.log("🎯 Card clicked - target:", e.target, "currentTarget:", e.currentTarget);
    
    // Don't handle card clicks if clicking on a button
    if ((e.target as HTMLElement).closest('button')) {
      console.log("🎯 Click on button detected, ignoring card click");
      return;
    }
    
    // If delete button is showing, don't trigger onSelect
    if (swipeOffset > 50) {
      console.log("🎯 Delete button showing, preventing onSelect");
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    console.log("🎯 Calling onSelect from card click");
    onSelect();
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };
  
  const confirmDelete = async () => {
    if (!isProjectRun) return;
    
    setIsDeleting(true);
    try {
      await deleteProjectRun(project.id);
      setShowDeleteConfirm(false);
      setSwipeOffset(0);
    } catch (error) {
      console.error('Failed to delete project:', error);
    } finally {
      setIsDeleting(false);
    }
  };
  
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setSwipeOffset(0);
  };
  
  return (
    <>
      <div className="relative overflow-hidden">
        {/* Delete background - visible when swiping */}
        {canDelete && (
          <div 
            className="absolute inset-0 bg-destructive flex items-center justify-end pr-4 rounded-lg"
            style={{ 
              opacity: swipeOffset / 100,
              pointerEvents: swipeOffset > 50 ? 'auto' : 'none'
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-destructive-foreground hover:bg-destructive-foreground/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
        
        {/* Main card */}
        <Card 
          ref={cardRef}
          className="gradient-card hover:shadow-card transition-smooth cursor-pointer touch-target relative"
          style={{
            transform: `translateX(-${swipeOffset}px)`,
            transition: isDraggingRef.current ? 'none' : 'transform 0.2s ease-out'
          }}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <CardContent className={isProjectRun ? 'p-3' : 'p-4'}>
            {isProjectRun ? (
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {projectRunData != null && isRiskFocusRun(projectRunData) ? (
                        <Badge variant="outline" className="mb-0.5 inline-flex px-1.5 py-0 text-[9px] leading-tight">
                          Risk-Focus
                        </Badge>
                      ) : null}
                      <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-card-foreground">
                        {displayTitle}
                      </h3>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <StatusBadge status={status} compact />
                      <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Progress value={progress} className="h-1.5 min-w-[4rem] flex-1" />
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">{progress}%</span>
                    <ActionButton status={status} progress={progress} onSelect={onSelect} compact />
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    <span>Started {formatDate((project as ProjectRun).createdAt)}</span>
                    {(project as ProjectRun).updatedAt ? (
                      <span> · Updated {formatDate((project as ProjectRun).updatedAt)}</span>
                    ) : null}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-base font-semibold leading-tight text-card-foreground">
                      {displayTitle}
                    </h3>
                    {project.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={status} />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                {project.phases ? (
                  <div className="text-xs text-muted-foreground">
                    {project.phases.filter((phase) => phase.isStandard !== true).length} phases
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{displayTitle}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={cancelDelete}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatusBadge({
  status,
  compact = false,
}: {
  status: DashboardRunStatus | 'template';
  compact?: boolean;
}) {
  if (status === 'template') {
    return (
      <Badge
        className={`bg-muted font-medium text-muted-foreground ${compact ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-1 text-xs'}`}
      >
        Template
      </Badge>
    );
  }

  const Icon = status === 'not-started' ? Play : status === 'in-progress' ? Clock : CheckCircle;

  return (
    <Badge
      className={`${dashboardStatusBadgeClassName(status)} border font-medium ${compact ? 'gap-0.5 px-1.5 py-0 text-[10px]' : 'gap-1 px-2 py-1 text-xs'}`}
    >
      <div className="flex items-center gap-0.5">
        <Icon className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
        {dashboardStatusBadgeLabel(status)}
      </div>
    </Badge>
  );
}

function ActionButton({
  status,
  progress,
  onSelect,
  compact = false,
}: {
  status: DashboardRunStatus | 'template';
  progress: number;
  onSelect: () => void;
  compact?: boolean;
}) {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoading) return;
    
    console.log(`🎯 ActionButton clicked: ${status}`);
    setIsLoading(true);
    
    // REMOVED artificial delay - direct execution
    onSelect();
    setIsLoading(false);
  };
  
  const btnClass = compact ? 'h-7 px-2 text-[11px]' : 'h-7 px-3 text-xs';

  if (status === 'complete') {
    return (
      <Button variant="outline" size="sm" className={btnClass} onClick={handleClick} disabled={isLoading}>
        {isLoading ? '...' : 'View'}
      </Button>
    );
  }

  if (status === 'in-progress') {
    return (
      <Button variant="default" size="sm" className={btnClass} onClick={handleClick} disabled={isLoading}>
        {isLoading ? '...' : 'Continue'}
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" className={btnClass} onClick={handleClick} disabled={isLoading}>
      {isLoading ? '...' : 'Start'}
    </Button>
  );
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffInMs = now.getTime() - d.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'today';
  if (diffInDays === 1) return 'yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}