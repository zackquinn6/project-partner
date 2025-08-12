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
  const { projects, currentProject, setCurrentProject } = useProject();
  // Filter to show only user projects (not templates) that are in progress
  const openProjects = projects.filter(p => 
    (p.status === 'not-started' || p.status === 'in-progress') && 
    p.publishStatus === 'draft' && 
    !p.id.startsWith('template-')
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
              <DropdownMenuContent align="end" className="w-56 bg-background border border-border shadow-lg z-50">
                {openProjects.length > 0 ? (
                  openProjects.map((project) => (
                    <DropdownMenuItem 
                      key={project.id} 
                      onClick={() => {
                        setCurrentProject(project);
                        onViewChange('user');
                        // Reset user view if needed
                        onProjectsView?.();
                      }}
                      className={`cursor-pointer ${currentProject?.id === project.id ? 'bg-primary/10 text-primary' : ''}`}
                    >
                      {project.name}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>
                    No open projects
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