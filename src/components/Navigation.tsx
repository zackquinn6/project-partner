import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Home, FolderOpen, ChevronDown, Settings, LogOut, User, Users, TrendingUp, Shield, Lock, HelpCircle, BookOpen, MessageCircle } from "lucide-react";
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { FeedbackDialog } from './FeedbackDialog';
import { useState, useEffect } from "react";
import { DataPrivacyManager } from './DataPrivacyManager';
import ProfileManager from './ProfileManager';
import { FeatureRoadmapWindow } from './FeatureRoadmapWindow';
import { AppDocumentationWindow } from './AppDocumentationWindow';
import { HomeManager } from './HomeManager';
import { ToolsMaterialsWindow } from './ToolsMaterialsWindow';
import { UserToolsMaterialsWindow } from './UserToolsMaterialsWindow';
import { ToolsMaterialsLibraryView } from './ToolsMaterialsLibraryView';

import { HomeMaintenanceWindow } from './HomeMaintenanceWindow';
import { CommunityPostsWindow } from './CommunityPostsWindow';
import { ToolRentalsWindow } from './ToolRentalsWindow';
import { RapidProjectAssessment } from './RapidProjectAssessment';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AIRepairWindow } from './AIRepairWindow';
import { ContractorFinderWindow } from './ContractorFinderWindow';
import { HelpPopup } from './HelpPopup';

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
  const [isDocumentationOpen, setIsDocumentationOpen] = useState(false);
  const [isHomeManagerOpen, setIsHomeManagerOpen] = useState(false);
  const [isToolsLibraryOpen, setIsToolsLibraryOpen] = useState(false);
  const [isUserToolsLibraryOpen, setIsUserToolsLibraryOpen] = useState(false);
  const [userToolsMode, setUserToolsMode] = useState<'library' | 'add-tools'>('library');
  
  const [isHomeMaintenanceOpen, setIsHomeMaintenanceOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCommunityPostsOpen, setIsCommunityPostsOpen] = useState(false);
  const [isToolRentalsOpen, setIsToolRentalsOpen] = useState(false);
  const [isRapidAssessmentOpen, setIsRapidAssessmentOpen] = useState(false);
  const [isToolsLibraryGridOpen, setIsToolsLibraryGridOpen] = useState(false);
  const [isAIRepairOpen, setIsAIRepairOpen] = useState(false);
  const [isContractorFinderOpen, setIsContractorFinderOpen] = useState(false);
  const [isHelpPopupOpen, setIsHelpPopupOpen] = useState(false);
  
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
      event.stopPropagation();
      setIsHomeManagerOpen(true);
    };

    const handleToolsLibraryEvent = (event: Event) => {
      event.stopPropagation();
      setIsToolsLibraryOpen(true);
    };


    const handleHomeMaintenanceEvent = (event: Event) => {
      event.stopPropagation();
      setIsHomeMaintenanceOpen(true);
    };

    const handleProfileManagerEvent = (event: Event) => {
      event.stopPropagation();
      setIsProfileOpen(true);
    };

    const handleCommunityPostsEvent = (event: Event) => {
      event.stopPropagation();
      setIsCommunityPostsOpen(true);
    };

    const handleToolRentalsEvent = (event: Event) => {
      event.stopPropagation();
      setIsToolRentalsOpen(true);
    };

    const handleRapidAssessmentEvent = (event: Event) => {
      event.stopPropagation();
      setIsRapidAssessmentOpen(true);
    };

    const handleToolsLibraryGridEvent = (event: Event) => {
      console.log('Opening tools library grid view');
      event.stopPropagation();
      setIsToolsLibraryGridOpen(true);
    };

    const handleToolsMaterialsEditorEvent = (event: Event) => {
      console.log('handleToolsMaterialsEditorEvent triggered - opening add tools mode');
      event.stopPropagation();
      setUserToolsMode('add-tools');
      setIsUserToolsLibraryOpen(true);
    };

    const handleUserToolsMaterialsEvent = (event: Event) => {
      console.log('handleUserToolsMaterialsEvent triggered - opening library mode');
      event.stopPropagation();
      setUserToolsMode('library');
      setIsUserToolsLibraryOpen(true);
    };

    const handleNavigateToProjectsEvent = (event: Event) => {
      console.log('handleNavigateToProjectsEvent triggered');
      event.stopPropagation();
      onViewChange('user');
      onProjectsView?.();
    };

    const handleHelpPopupEvent = (event: Event) => {
      console.log('handleHelpPopupEvent triggered');
      event.stopPropagation();
      setIsHelpPopupOpen(true);
    };

    const handleExpertHelpPopupEvent = (event: Event) => {
      console.log('handleExpertHelpPopupEvent triggered');
      event.stopPropagation();
      setIsHelpPopupOpen(true);
    };

    const handleAIRepairEvent = (event: Event) => {
      console.log('handleAIRepairEvent triggered');
      event.stopPropagation();
      setIsAIRepairOpen(true);
    };

    const handleContractorFinderEvent = (event: Event) => {
      console.log('handleContractorFinderEvent triggered');
      event.stopPropagation();
      setIsContractorFinderOpen(true);
    };

    window.addEventListener('show-home-manager', handleHomeManagerEvent);
    window.addEventListener('show-tools-materials', handleToolsLibraryEvent);
    window.addEventListener('show-tools-library-grid', handleToolsLibraryGridEvent);
    window.addEventListener('show-home-maintenance', handleHomeMaintenanceEvent);
    window.addEventListener('open-profile-manager', handleProfileManagerEvent);
    window.addEventListener('show-community-posts', handleCommunityPostsEvent);
    window.addEventListener('show-tool-rentals', handleToolRentalsEvent);
    window.addEventListener('show-rapid-assessment', handleRapidAssessmentEvent);
    window.addEventListener('show-tools-materials-editor', handleToolsMaterialsEditorEvent);
    window.addEventListener('show-user-tools-materials', handleUserToolsMaterialsEvent);
    window.addEventListener('navigate-to-projects', handleNavigateToProjectsEvent);
    window.addEventListener('show-help-popup', handleHelpPopupEvent);
    window.addEventListener('show-expert-help-popup', handleExpertHelpPopupEvent);
    window.addEventListener('show-ai-repair', handleAIRepairEvent);
    window.addEventListener('show-contractor-finder', handleContractorFinderEvent);
    
    return () => {
      window.removeEventListener('show-home-manager', handleHomeManagerEvent);
      window.removeEventListener('show-tools-materials', handleToolsLibraryEvent);
      window.removeEventListener('show-tools-library-grid', handleToolsLibraryGridEvent);
      window.removeEventListener('show-home-maintenance', handleHomeMaintenanceEvent);
      window.removeEventListener('open-profile-manager', handleProfileManagerEvent);
      window.removeEventListener('show-community-posts', handleCommunityPostsEvent);
      window.removeEventListener('show-tool-rentals', handleToolRentalsEvent);
      window.removeEventListener('show-rapid-assessment', handleRapidAssessmentEvent);
      window.removeEventListener('show-tools-materials-editor', handleToolsMaterialsEditorEvent);
      window.removeEventListener('show-user-tools-materials', handleUserToolsMaterialsEvent);
      window.removeEventListener('navigate-to-projects', handleNavigateToProjectsEvent);
      window.removeEventListener('show-help-popup', handleHelpPopupEvent);
      window.removeEventListener('show-expert-help-popup', handleExpertHelpPopupEvent);
      window.removeEventListener('show-ai-repair', handleAIRepairEvent);
      window.removeEventListener('show-contractor-finder', handleContractorFinderEvent);
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
                  <span>Get Expert Help</span>
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="transition-fast p-1 sm:p-2">
                      <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                   <DropdownMenuContent align="end" className="w-48 bg-background border border-border shadow-lg z-[60] backdrop-blur-sm">
                     <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('open-profile-manager'))}>
                       <User className="w-4 h-4 mr-2 text-blue-500" />
                       My Profile
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
                 
                 {/* Help & Documentation Dropdown */}
                 <DropdownMenu>
                   <DropdownMenuTrigger asChild>
                     <Button variant="ghost" size="icon" className="transition-fast p-1 sm:p-2">
                       <HelpCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                     </Button>
                   </DropdownMenuTrigger>
                   <DropdownMenuContent align="end" className="w-48 bg-background border border-border shadow-lg z-[60] backdrop-blur-sm">
                     <DropdownMenuItem onClick={() => setShowFeedback(true)}>
                       <MessageCircle className="w-4 h-4 mr-2 text-green-500" />
                       Give us feedback
                     </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => setIsRoadmapOpen(true)}>
                       <TrendingUp className="w-4 h-4 mr-2 text-blue-500" />
                       App Roadmap
                     </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => setIsDocumentationOpen(true)}>
                       <BookOpen className="w-4 h-4 mr-2 text-purple-500" />
                       App Documentation
                     </DropdownMenuItem>
                   </DropdownMenuContent>
                 </DropdownMenu>
              </div>
            </div>
          </div>
        </nav>
        
        {/* Modals and Dialogs */}
        <FeedbackDialog 
          open={showFeedback}
          onOpenChange={setShowFeedback}
        />
        
        <DataPrivacyManager 
          open={isPrivacyOpen}
          onOpenChange={setIsPrivacyOpen}
        />
        
        <ProfileManager 
          open={isProfileOpen}
          onOpenChange={setIsProfileOpen}
        />
        
         <FeatureRoadmapWindow 
           open={isRoadmapOpen}
           onOpenChange={setIsRoadmapOpen}
         />
         
         <AppDocumentationWindow
           open={isDocumentationOpen}
           onOpenChange={setIsDocumentationOpen}
         />
        
        <HomeManager 
          open={isHomeManagerOpen}
          onOpenChange={setIsHomeManagerOpen}
        />
        
        <ToolsMaterialsWindow 
          open={isToolsLibraryOpen}
          onOpenChange={setIsToolsLibraryOpen}
        />
        
        <UserToolsMaterialsWindow 
          open={isUserToolsLibraryOpen}
          onOpenChange={(open) => {
            setIsUserToolsLibraryOpen(open);
            if (!open) setUserToolsMode('library'); // Reset mode when closing
          }}
          initialToolsMode={userToolsMode}
        />
        
        
        <HomeMaintenanceWindow 
          open={isHomeMaintenanceOpen}
          onOpenChange={setIsHomeMaintenanceOpen}
        />
        
        <CommunityPostsWindow 
          open={isCommunityPostsOpen}
          onOpenChange={setIsCommunityPostsOpen}
        />

        <ToolRentalsWindow 
          isOpen={isToolRentalsOpen}
          onClose={() => setIsToolRentalsOpen(false)}
        />

        <ToolsMaterialsLibraryView 
          open={isToolsLibraryGridOpen}
          onOpenChange={setIsToolsLibraryGridOpen}
        />

        <Dialog open={isRapidAssessmentOpen} onOpenChange={setIsRapidAssessmentOpen}>
          <DialogContent className="w-full h-full sm:max-w-7xl sm:max-h-[90vh] overflow-hidden border-none sm:border p-0 sm:p-6">
            <DialogHeader className="p-4 sm:p-0 border-b sm:border-none">
              <div className="flex items-center justify-between">
                <DialogTitle>Rapid Project Assessment</DialogTitle>
                <Button 
                  variant="ghost" 
                  onClick={() => setIsRapidAssessmentOpen(false)}
                  className="sm:hidden text-xs px-2 py-1 h-6"
                >
                  close
                </Button>
              </div>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[calc(90vh-8rem)]">
              <RapidProjectAssessment />
            </div>
          </DialogContent>
        </Dialog>
        
        <AIRepairWindow 
          open={isAIRepairOpen}
          onOpenChange={setIsAIRepairOpen}
        />
        
        <ContractorFinderWindow 
          open={isContractorFinderOpen}
          onOpenChange={setIsContractorFinderOpen}
        />
        
        <HelpPopup 
          isOpen={isHelpPopupOpen}
          onClose={() => setIsHelpPopupOpen(false)}
        />
    </>
  );
}