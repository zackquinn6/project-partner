import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Home, FolderOpen, ChevronDown, Settings, LogOut, User, Users, TrendingUp, Shield, Lock, HelpCircle } from "lucide-react";
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { FeedbackDialog } from './FeedbackDialog';
import { useState, useEffect } from "react";
import { DataPrivacyManager } from './DataPrivacyManager';
import ProfileManager from './ProfileManager';
import { FeatureRoadmapWindow } from './FeatureRoadmapWindow';
import { HomeManager } from './HomeManager';
import { ToolsMaterialsWindow } from './ToolsMaterialsWindow';
import { UserToolsMaterialsWindow } from './UserToolsMaterialsWindow';
import { ToolsMaterialsLibraryView } from './ToolsMaterialsLibraryView';
import { HomeMaintenanceWindow } from './HomeMaintenanceWindow';
import { CommunityPostsWindow } from './CommunityPostsWindow';

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
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
  const [isHomeManagerOpen, setIsHomeManagerOpen] = useState(false);
  const [isToolsLibraryOpen, setIsToolsLibraryOpen] = useState(false);
  const [isUserToolsLibraryOpen, setIsUserToolsLibraryOpen] = useState(false);
  const [isNewToolsLibraryOpen, setIsNewToolsLibraryOpen] = useState(false);
  const [isHomeMaintenanceOpen, setIsHomeMaintenanceOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCommunityPostsOpen, setIsCommunityPostsOpen] = useState(false);
  
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
    const handleHomeManagerEvent = (event: Event) => {
      console.log('🏠 Navigation: Home manager event received');
      event.stopPropagation();
      setIsHomeManagerOpen(true);
    };

    const handleToolsLibraryEvent = (event: Event) => {
      console.log('🔧 Navigation: Tools library event received');
      event.stopPropagation();
      setIsToolsLibraryOpen(true);
    };

    const handleUserToolsLibraryEvent = (event: Event) => {
      console.log('🔧 Navigation: User tools library event received');
      event.stopPropagation();
      setIsNewToolsLibraryOpen(true);
    };

    const handleHomeMaintenanceEvent = (event: Event) => {
      console.log('🏠 Navigation: Home maintenance event received');
      event.stopPropagation();
      setIsHomeMaintenanceOpen(true);
    };

    const handleProfileManagerEvent = (event: Event) => {
      console.log('👤 Navigation: Profile manager event received');
      event.stopPropagation();
      setIsProfileOpen(true);
    };

    const handleCommunityPostsEvent = (event: Event) => {
      console.log('🌐 Navigation: Community posts event received');
      event.stopPropagation();
      setIsCommunityPostsOpen(true);
    };

    window.addEventListener('show-home-manager', handleHomeManagerEvent);
    window.addEventListener('show-tools-materials', handleToolsLibraryEvent);
    window.addEventListener('show-user-tools-materials', handleUserToolsLibraryEvent);
    window.addEventListener('show-home-maintenance', handleHomeMaintenanceEvent);
    window.addEventListener('open-profile-manager', handleProfileManagerEvent);
    window.addEventListener('show-community-posts', handleCommunityPostsEvent);
    
    return () => {
      window.removeEventListener('show-home-manager', handleHomeManagerEvent);
      window.removeEventListener('show-tools-materials', handleToolsLibraryEvent);
      window.removeEventListener('show-user-tools-materials', handleUserToolsLibraryEvent);
      window.removeEventListener('show-home-maintenance', handleHomeMaintenanceEvent);
      window.removeEventListener('open-profile-manager', handleProfileManagerEvent);
      window.removeEventListener('show-community-posts', handleCommunityPostsEvent);
    };
  }, []);
  
  // Filter to show only project runs that are not completed (progress < 100%)
  const activeProjectRuns = projectRuns.filter(run => 
    run.status !== 'complete' && run.progress < 100
  );

  return (
    <>
        <nav className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 py-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <img src="/lovable-uploads/dd8a6549-c627-436d-954c-e8c38a53fbee.png" alt="Project Partner Logo" className="h-8 sm:h-11 w-auto" />
              </div>
              
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Button 
                  variant={currentView === 'home' ? 'default' : 'ghost'} 
                  onClick={() => onViewChange('home')} 
                  className="transition-fast text-xs sm:text-sm px-2 sm:px-3"
                >
                  <Home className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Home</span>
                </Button>
                <Button 
                  variant={currentView === 'user' ? 'default' : 'ghost'} 
                  onClick={() => {
                    onViewChange('user');
                    onProjectsView?.();
                  }} 
                  className="transition-fast text-xs sm:text-sm px-2 sm:px-3"
                >
                  <FolderOpen className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">My Projects</span>
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="transition-fast text-xs sm:text-sm px-2 sm:px-3">
                      <FolderOpen className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="hidden sm:inline">My Current Project</span>
                      <span className="sm:hidden">Current</span>
                      <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
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
                            <span className="font-medium text-sm">{projectRun.customProjectName || projectRun.name}</span>
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

                
                <Button 
                  variant="ghost" 
                  className="transition-fast text-xs sm:text-sm px-2 sm:px-3 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                  onClick={() => window.dispatchEvent(new CustomEvent('show-help-popup'))}
                >
                  <span>Call a Coach</span>
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="transition-fast p-1 sm:p-2">
                      <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-background border border-border shadow-lg z-[60] backdrop-blur-sm">
                    <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                      <User className="w-4 h-4 mr-2 text-blue-500" />
                      My Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsRoadmapOpen(true)}>
                      <TrendingUp className="w-4 h-4 mr-2" />
                      App Improvements & Feedback
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsPrivacyOpen(true)}>
                      <Lock className="w-4 h-4 mr-2" />
                      Privacy & Data
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem onClick={onAdminAccess}>
                        <Shield className="w-4 h-4 mr-2" />
                        Admin Panel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={signOut} className="text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>

                </DropdownMenuContent>
                </DropdownMenu>
                {/* Feedback Button */}
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="transition-fast p-1 sm:p-2"
                  onClick={() => setShowFeedback(true)}
                >
                  <HelpCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              </div>
            </div>
          </div>
        </nav>
    </>
  );
}