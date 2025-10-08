import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Home, FolderOpen, ChevronDown, Settings, LogOut, User, Users, TrendingUp, Shield, Lock, HelpCircle, BookOpen, MessageCircle, Headphones } from "lucide-react";
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useIsMobile } from '@/hooks/use-mobile';
import { FeedbackDialog } from './FeedbackDialog';
import { useState, useEffect } from "react";
import { DataPrivacyManager } from './DataPrivacyManager';
import { FeatureRoadmapWindow } from './FeatureRoadmapWindow';
import { AppDocumentationWindow } from './AppDocumentationWindow';
import { ToolsMaterialsWindow } from './ToolsMaterialsWindow';
import { ExpertHelpWindow } from './ExpertHelpWindow';

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
  const [isExpertHelpOpen, setIsExpertHelpOpen] = useState(false);
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
  
  const { projectRuns, currentProjectRun, setCurrentProjectRun, projects, setCurrentProject } = projectData;
  const { signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const isMobile = useIsMobile();

  // Listen for user documentation request from admin guide
  useEffect(() => {
    const handleOpenUserDocs = () => {
      setIsDocumentationOpen(true);
    };

    window.addEventListener('open-user-documentation', handleOpenUserDocs);
    return () => window.removeEventListener('open-user-documentation', handleOpenUserDocs);
  }, []);

  useEffect(() => {
    // Only handle Navigation-specific events
    const handleToolsLibraryEvent = (event: Event) => {
      console.log('🔧 Opening Tools Library');
      event.stopPropagation();
      setIsToolsLibraryOpen(true);
    };

    const handleNavigateToProjectsEvent = (event: Event) => {
      console.log('handleNavigateToProjectsEvent triggered');
      event.stopPropagation();
      onViewChange('user');
      onProjectsView?.();
    };

    window.addEventListener('show-tools-materials', handleToolsLibraryEvent);
    window.addEventListener('navigate-to-projects', handleNavigateToProjectsEvent);
    
    return () => {
      window.removeEventListener('show-tools-materials', handleToolsLibraryEvent);
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
      
      // CRITICAL: Also update currentProject to match the template
      // This ensures EditWorkflowView shows the correct project
      const matchingProject = projects.find(p => p.id === selectedRun.templateId);
      if (matchingProject) {
        setCurrentProject(matchingProject);
      }
      
      onViewChange('user');
      onProjectSelected?.();
    }
  };

  console.log('🔧 Navigation rendering with mobile:', isMobile, 'buttons should be visible');

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
            
            {/* Project selector dropdown - only show on desktop */}
            {!isMobile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="text-sm max-w-64 truncate">
                    {currentProjectRun ? currentProjectRun.name : "Select Project"}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="start" 
                  className="w-80 z-50 bg-background border shadow-lg"
                  sideOffset={8}
                >
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
            {/* Get Expert Help Button - Always visible */}
            <Button 
              onClick={() => {
                console.log('Expert Help button clicked');
                setIsExpertHelpOpen(true);
              }}
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 shrink-0"
              size="sm"
            >
              <Headphones className="h-4 w-4 mr-0 sm:mr-2" />
              <span className="hidden sm:inline">Get Expert Help</span>
            </Button>
            
            {/* Settings Dropdown - Always visible */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-9 w-9 p-0 shrink-0"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="z-[9999] !bg-white dark:!bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl min-w-[200px] !opacity-100"
                sideOffset={5}
              >
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
            
            {/* Help Dropdown - Always visible */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-9 w-9 p-0 shrink-0"
                >
                  <HelpCircle className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="z-[9999] !bg-white dark:!bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl min-w-[200px] !opacity-100"
                sideOffset={5}
              >
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
        
        <ExpertHelpWindow 
          isOpen={isExpertHelpOpen}
          onClose={() => setIsExpertHelpOpen(false)}
        />
    </>
  );
}