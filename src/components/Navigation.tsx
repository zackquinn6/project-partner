import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Home, FolderOpen, ChevronDown, Settings } from "lucide-react";
import { useProject } from '@/contexts/ProjectContext';

interface NavigationProps {
  currentView: 'home' | 'admin' | 'user';
  onViewChange: (view: 'home' | 'admin' | 'user') => void;
  onAdminAccess: () => void;
  onProjectsView?: () => void;
}
export default function Navigation({
  currentView,
  onViewChange,
  onAdminAccess,
  onProjectsView
}: NavigationProps) {
  const { projectRuns, currentProjectRun, setCurrentProjectRun } = useProject();
  
  // Filter to show only project runs that are not completed (progress < 100%)
  const activeProjectRuns = projectRuns.filter(run => 
    run.status !== 'complete' && run.progress < 100
  );
  return <nav className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="/lovable-uploads/4abd91fc-1cee-4a05-927d-e023723f8317.png" alt="Project Partner Logo" className="h-10 w-auto" />
            
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant={currentView === 'home' ? 'default' : 'ghost'} onClick={() => onViewChange('home')} className="transition-fast">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
            <Button variant={currentView === 'user' ? 'default' : 'ghost'} onClick={() => {
              onViewChange('user');
              onProjectsView?.();
            }} className="transition-fast">
              <FolderOpen className="w-4 h-4 mr-2" />
              My Projects
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="transition-fast">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  My Current Project
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-background border border-border shadow-lg z-[60] backdrop-blur-sm">
                {activeProjectRuns.length > 0 ? (
                  activeProjectRuns.map((projectRun) => (
                    <DropdownMenuItem 
                      key={projectRun.id} 
                      onClick={() => {
                        setCurrentProjectRun(projectRun);
                        onViewChange('user');
                        // This will trigger the workflow view
                        onProjectsView?.();
                      }}
                      className={`cursor-pointer ${currentProjectRun?.id === projectRun.id ? 'bg-primary/10 text-primary' : ''}`}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{projectRun.customProjectName || projectRun.name}</span>
                        <span className="text-xs text-muted-foreground">{Math.round(projectRun.progress)}% complete</span>
                      </div>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>
                    No active projects
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button variant="ghost" size="icon" onClick={onAdminAccess} className="transition-fast">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>;
}