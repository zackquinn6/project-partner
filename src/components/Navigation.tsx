import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Home, FolderOpen, ChevronDown, Settings, LogOut, User } from "lucide-react";
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from "react";
import { DataPrivacyManager } from './DataPrivacyManager';
import ProfileManager from './ProfileManager';

interface NavigationProps {
  currentView: 'home' | 'admin' | 'user' | 'editWorkflow';
  onViewChange: (view: 'home' | 'admin' | 'user' | 'editWorkflow') => void;
  onAdminAccess: () => void;
  onProjectsView?: () => void;
  onProjectSelected?: () => void;
}

export default function Navigation({
  currentView,
  onViewChange,
  onAdminAccess,
  onProjectsView,
  onProjectSelected
}: NavigationProps) {
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Add error boundary for useProject hook
  let projectData;
  try {
    projectData = useProject();
  } catch (error) {
    console.error('Navigation: useProject hook failed:', error);
    // Fallback to empty state if context is not available
    projectData = {
      projectRuns: [],
      currentProjectRun: null,
      setCurrentProjectRun: () => {}
    };
  }
  
  const { projectRuns, currentProjectRun, setCurrentProjectRun } = projectData;
  const { signOut } = useAuth();
  
  // Filter to show only project runs that are not completed (progress < 100%)
  const activeProjectRuns = projectRuns.filter(run => 
    run.status !== 'complete' && run.progress < 100
  );

  return (
    <>
      <nav className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src="/lovable-uploads/dd8a6549-c627-436d-954c-e8c38a53fbee.png" alt="Project Partner Logo" className="h-11 w-auto" />
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
                          onProjectSelected?.();
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="transition-fast">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                    <User className="w-4 h-4 mr-2" />
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsPrivacyOpen(true)}>
                    Privacy & Data
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>
      
      <DataPrivacyManager open={isPrivacyOpen} onOpenChange={setIsPrivacyOpen} />
      <ProfileManager open={isProfileOpen} onOpenChange={setIsProfileOpen} />
    </>
  );
}