import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Home, FolderOpen, ChevronDown, Settings, LogOut, User, Users, TrendingUp, Shield, Lock, HelpCircle, BookOpen, MessageCircle } from "lucide-react";
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { FeedbackDialog } from './FeedbackDialog';
import { useState, useEffect } from "react";
import { DataPrivacyManager } from './DataPrivacyManager';
import { FeatureRoadmapWindow } from './FeatureRoadmapWindow';
import { AppDocumentationWindow } from './AppDocumentationWindow';
import { ToolsMaterialsWindow } from './ToolsMaterialsWindow';
import { ToolsMaterialsLibraryView } from './ToolsMaterialsLibraryView';

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
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
  const [isDocumentationOpen, setIsDocumentationOpen] = useState(false);
  const [isToolsLibraryOpen, setIsToolsLibraryOpen] = useState(false);
  const [isToolsLibraryGridOpen, setIsToolsLibraryGridOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  
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
  const { isAdmin } = useUserRole();

  useEffect(() => {
    // Only handle Navigation-specific events
    const handleToolsLibraryEvent = (event: Event) => {
      console.log('🔧 Opening Tools Library');
      event.stopPropagation();
      setIsToolsLibraryOpen(true);
    };

    const handleToolsLibraryGridEvent = (event: Event) => {
      console.log('Opening tools library grid view');
      event.stopPropagation();  
      setIsToolsLibraryGridOpen(true);
    };

    const handleNavigateToProjectsEvent = (event: Event) => {
      console.log('handleNavigateToProjectsEvent triggered');
      event.stopPropagation();
      onViewChange('user');
      onProjectsView?.();
    };

    window.addEventListener('show-tools-materials', handleToolsLibraryEvent);
    window.addEventListener('show-tools-library-grid', handleToolsLibraryGridEvent);
    window.addEventListener('navigate-to-projects', handleNavigateToProjectsEvent);
    
    return () => {
      window.removeEventListener('show-tools-materials', handleToolsLibraryEvent);
      window.removeEventListener('show-tools-library-grid', handleToolsLibraryGridEvent);
      window.removeEventListener('navigate-to-projects', handleNavigateToProjectsEvent);
    };
  }, [onViewChange, onProjectsView]);

  const activeProjectRuns = projectRuns.filter(run => run.progress && run.progress < 100);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleProjectSelect = (projectRunId: string) => {
    const selectedRun = projectRuns.find(run => run.id === projectRunId);
    if (selectedRun) {
      setCurrentProjectRun(selectedRun);
      onViewChange('user');
      onProjectSelected?.();
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-4">
          <div className="flex items-center space-x-4 flex-1">
            <div className="flex items-center space-x-2">
              <img 
                src="/lovable-uploads/1a837ddc-50ca-40f7-b975-0ad92fdf9882.png" 
                alt="Project Partner Logo" 
                className="h-8 w-auto"
              />
            </div>
            
            <div className="flex items-center space-x-1">
              <Button
                variant={currentView === 'home' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('home')}
                className="text-sm"
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
              
              <Button
                variant={currentView === 'user' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  onViewChange('user');
                  onProjectsView?.();
                }}
                className="text-sm"
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                My Projects
              </Button>
            </div>
            
            {currentProjectRun && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="text-sm max-w-64 truncate">
                    {currentProjectRun.name}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-80">
                  {activeProjectRuns.length > 0 ? (
                    activeProjectRuns.map((run) => (
                      <DropdownMenuItem
                        key={run.id}
                        onClick={() => handleProjectSelect(run.id)}
                        className="flex flex-col items-start py-3"
                      >
                        <div className="font-medium text-sm">{run.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {Math.round(run.progress || 0)}% complete
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
            )}
          </div>

          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('open-profile-manager'))}>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsPrivacyOpen(true)}>
                  <Lock className="h-4 w-4 mr-2" />
                  Privacy Settings
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={onAdminAccess}>
                    <Shield className="h-4 w-4 mr-2" />
                    Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowFeedback(true)}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Send Feedback
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsRoadmapOpen(true)}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  App Roadmap
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDocumentationOpen(true)}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Documentation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* Desktop-only modals */}
      <FeedbackDialog 
        open={showFeedback}
        onOpenChange={setShowFeedback}
      />
      
      <DataPrivacyManager 
        open={isPrivacyOpen}
        onOpenChange={setIsPrivacyOpen}
      />
      
       <FeatureRoadmapWindow 
         open={isRoadmapOpen}
         onOpenChange={setIsRoadmapOpen}
       />
       
       <AppDocumentationWindow
         open={isDocumentationOpen}
         onOpenChange={setIsDocumentationOpen}
       />
      
      <ToolsMaterialsWindow 
        open={isToolsLibraryOpen}
        onOpenChange={setIsToolsLibraryOpen}
      />

      <ToolsMaterialsLibraryView 
        open={isToolsLibraryGridOpen}
        onOpenChange={setIsToolsLibraryGridOpen}
      />
    </>
  );
}