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
import { ChevronRight, Play, CheckCircle, Clock, AlertTriangle, Trash2 } from 'lucide-react';
import { Project } from '@/interfaces/Project';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { useProject } from '@/contexts/ProjectContext';
import { useButtonTracker } from '@/hooks/useButtonTracker';

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
  const progress = isProjectRun ? (project as ProjectRun).progress || 0 : 0;
  const status = isProjectRun ? getProjectRunStatus(project as ProjectRun) : 'template';
  
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
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-card-foreground text-base leading-tight line-clamp-2">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={status} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* Progress (for project runs) */}
              {isProjectRun && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium text-card-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {/* Metadata */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {isProjectRun && (
                    <>
                      <span>Started {formatDate((project as ProjectRun).createdAt)}</span>
                      {(project as ProjectRun).updatedAt && (
                        <span>• Updated {formatDate((project as ProjectRun).updatedAt)}</span>
                      )}
                    </>
                  )}
                  {!isProjectRun && project.phases && (
                    <span>{project.phases.length} phases</span>
                  )}
                </div>
                <ActionButton status={status} progress={progress} onSelect={onSelect} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{project.name}"? This action cannot be undone.
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

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    template: { 
      color: 'bg-muted text-muted-foreground',
      label: 'Template',
      icon: null
    },
    'not-started': { 
      color: 'bg-secondary text-secondary-foreground',
      label: 'Ready',
      icon: Play
    },
    'in-progress': { 
      color: 'bg-primary/10 text-primary',
      label: 'Active',
      icon: Clock
    },
    completed: { 
      color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
      label: 'Done',
      icon: CheckCircle
    },
    'needs-attention': { 
      color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
      label: 'Review',
      icon: AlertTriangle
    }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.template;
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} text-xs px-2 py-1 font-medium`}>
      <div className="flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {config.label}
      </div>
    </Badge>
  );
}

function ActionButton({ status, progress, onSelect }: { status: string; progress: number; onSelect: () => void }) {
  const { trackClick } = useButtonTracker();
  
  if (status === 'completed') {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        className="text-xs px-3 py-1 h-7"
        onClick={trackClick('View Project', onSelect)}
      >
        View
      </Button>
    );
  }
  
  if (status === 'in-progress') {
    return (
      <Button 
        variant="default" 
        size="sm" 
        className="text-xs px-3 py-1 h-7"
        onClick={trackClick('Continue Project', onSelect)}
      >
        Continue
      </Button>
    );
  }
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="text-xs px-3 py-1 h-7"
      onClick={trackClick('Start Project', onSelect)}
    >
      Start
    </Button>
  );
}

function getProjectRunStatus(projectRun: ProjectRun): string {
  if (!projectRun.progress || projectRun.progress === 0) return 'not-started';
  if (projectRun.progress >= 100) return 'completed';
  if (projectRun.progress > 0) return 'in-progress';
  return 'not-started';
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