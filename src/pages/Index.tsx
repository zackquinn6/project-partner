import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useIsMobile } from '@/hooks/use-mobile';
import Navigation from "@/components/Navigation";
import Home from "@/components/Home";
import { PostAuthLanding } from "@/components/PostAuthLanding";
import { AdminView } from "@/components/AdminView";
import { PreSignInNavigation } from '@/components/PreSignInNavigation';
import EditWorkflowView from "@/components/EditWorkflowView";
import UserView from "@/components/UserView";
import { ProjectNavigationErrorBoundary } from "@/components/ProjectNavigationErrorBoundary";
import ProjectCatalog from "@/components/ProjectCatalog";
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { MobileOptimizedHome } from '@/components/MobileOptimizedHome';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { MobileProjectListing } from '@/components/MobileProjectListing';
import { MobileWorkflowView } from '@/components/MobileWorkflowView';
import { RapidProjectAssessmentWindow } from '@/components/RapidProjectAssessmentWindow';
import { ToolRentalsWindow } from '@/components/ToolRentalsWindow';
import { CodePermitsWindow } from '@/components/CodePermitsWindow';
import { ContractorFinderWindow } from '@/components/ContractorFinderWindow';
import { CommunityPostsWindow } from '@/components/CommunityPostsWindow';
import { AIRepairWindow } from '@/components/AIRepairWindow';
import { HomeManager } from '@/components/HomeManager';
import { HomeMaintenanceWindow } from '@/components/HomeMaintenanceWindow';
import { UserToolsMaterialsWindow } from '@/components/UserToolsMaterialsWindow';
import { ToolsMaterialsLibraryView } from '@/components/ToolsMaterialsLibraryView';
import ProfileManager from '@/components/ProfileManager';
import { ExpertHelpWindow } from '@/components/ExpertHelpWindow';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { KeyCharacteristicsExplainer } from '@/components/KeyCharacteristicsExplainer';
import { Button } from '@/components/ui/button';

// Force rebuild to clear cache

const Index = () => {
  // ALL HOOKS MUST BE CALLED FIRST - BEFORE ANY CONDITIONAL RETURNS
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { setCurrentProject, setCurrentProjectRun, currentProject, currentProjectRun, projects, projectRuns } = useProject();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [currentView, setCurrentView] = useState<'home' | 'admin' | 'user' | 'editWorkflow'>('home');
  const [mobileView, setMobileView] = useState<'home' | 'projects' | 'workflow'>('home');
  const [resetUserView, setResetUserView] = useState(false);
  const [forceListingMode, setForceListingMode] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'home' | 'projects' | 'profile' | 'help' | 'expert'>('home');
  
  // Modal states - moved from Navigation to work on both mobile and desktop
  const [showKCExplainer, setShowKCExplainer] = useState(false);
  const [isHomeManagerOpen, setIsHomeManagerOpen] = useState(false);
  const [isUserToolsLibraryOpen, setIsUserToolsLibraryOpen] = useState(false);
  const [userToolsMode, setUserToolsMode] = useState<'library' | 'add-tools'>('library');
  const [isHomeMaintenanceOpen, setIsHomeMaintenanceOpen] = useState(false);
  const [isCommunityPostsOpen, setIsCommunityPostsOpen] = useState(false);
  const [isToolRentalsOpen, setIsToolRentalsOpen] = useState(false);
  const [isRapidAssessmentOpen, setIsRapidAssessmentOpen] = useState(false);
  const [isAIRepairOpen, setIsAIRepairOpen] = useState(false);
  const [isContractorFinderOpen, setIsContractorFinderOpen] = useState(false);
  const [isExpertHelpOpen, setIsExpertHelpOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isToolsLibraryGridOpen, setIsToolsLibraryGridOpen] = useState(false);

  // Removed debug logging - no longer tracking duplicate modals

  // Handle navigation state changes (including view parameter)
  useEffect(() => {
    if (location.state?.view) {
      console.log('🎯 Index: Setting view from navigation state:', location.state.view);
      setCurrentView(location.state.view);
      
      // Handle projectRunId on mobile - ensure we can find the project run
      if (location.state.projectRunId && isMobile) {
        console.log('📱 Index: Mobile navigation with projectRunId:', location.state.projectRunId);
        // Wait for project runs to load and then set the project run
        const projectRun = projectRuns.find(run => run.id === location.state.projectRunId);
        if (projectRun) {
          console.log('📱 Index: Found project run, setting as current:', projectRun.name);
          setCurrentProjectRun(projectRun);
          setMobileView('workflow');
        } else if (projectRuns.length > 0) {
          console.log('📱 Index: Project run not found in loaded runs, staying in projects view');
          setMobileView('projects');
        }
        // If projectRuns is empty, wait for them to load
      }
      
      if (location.state.resetToListing) {
        console.log('🔄 Index: Setting reset flags from navigation state');
        setResetUserView(true);
        setForceListingMode(true);
      }
    }
  }, [location.state, projectRuns, isMobile, setCurrentProjectRun]);

  // Prevent constant re-renders by memoizing navigation handlers
  const [hasHandledInitialState, setHasHandledInitialState] = useState(false);

  // Listen for edit workflow navigation event
  useEffect(() => {
    // Only handle state changes once per location change
    if (location.state?.view && !hasHandledInitialState) {
      console.log('🎯 Index: Setting view from navigation state:', location.state.view);
      setCurrentView(location.state.view);
      
      // Handle mobile view state
      if (location.state.mobileView && isMobile) {
        console.log('📱 Index: Setting mobile view from state:', location.state.mobileView);
        setMobileView(location.state.mobileView);
      }
      
      if (location.state.resetToListing) {
        console.log('🔄 Index: Setting reset flags from navigation state');
        setResetUserView(true);
        setForceListingMode(true);
      }
      setHasHandledInitialState(true);
    }
  }, [location.state, hasHandledInitialState]);

  // Reset handled state when location changes
  useEffect(() => {
    setHasHandledInitialState(false);
  }, [location.pathname]);

  // Add event listeners for modal windows (works on both mobile and desktop)
  useEffect(() => {
    const handleHomeManagerEvent = (event: Event) => {
      console.log('🏠 Opening Home Manager');
      event.stopPropagation();
      setIsHomeManagerOpen(true);
    };

    const handleHomeMaintenanceEvent = (event: Event) => {
      console.log('🏡 Opening Home Maintenance');
      event.stopPropagation();
      setIsHomeMaintenanceOpen(true);
    };

    const handleProfileManagerEvent = (event: Event) => {
      console.log('👤 Opening Profile Manager');
      event.stopPropagation();
      setIsProfileOpen(true);
    };

    const handleCommunityPostsEvent = (event: Event) => {
      console.log('👥 Opening Community Posts');
      event.stopPropagation();
      setIsCommunityPostsOpen(true);
    };

    const handleToolRentalsEvent = (event: Event) => {
      console.log('🔨 Opening Tool Rentals');
      event.stopPropagation();
      setIsToolRentalsOpen(true);
    };

    const handleRapidAssessmentEvent = (event: Event) => {
      console.log('⚡ Opening Rapid Assessment');
      event.stopPropagation();
      setIsRapidAssessmentOpen(true);
    };

    const handleUserToolsMaterialsEvent = (event: Event) => {
      console.log('🔧 Opening User Tools/Materials - library mode');
      event.stopPropagation();
      setUserToolsMode('library');
      setIsUserToolsLibraryOpen(true);
    };

    const handleToolsMaterialsEditorEvent = (event: Event) => {
      console.log('🔧 Opening User Tools/Materials - add tools mode');
      event.stopPropagation();
      setUserToolsMode('add-tools');
      setIsUserToolsLibraryOpen(true);
    };

    const handleAIRepairEvent = (event: Event) => {
      console.log('🤖 Opening AI Repair');
      event.stopPropagation();
      setIsAIRepairOpen(true);
    };

    const handleContractorFinderEvent = (event: Event) => {
      console.log('👷 Opening Contractor Finder');
      event.stopPropagation();
      setIsContractorFinderOpen(true);
    };

    const handleExpertHelpEvent = (event: Event) => {
      console.log('💡 Opening Expert Help');
      event.stopPropagation();
      setIsExpertHelpOpen(true);
    };

    const handleToolsLibraryGridEvent = (event: Event) => {
      console.log('🔧 Opening Tools Library Grid');
      event.stopPropagation();
      setIsToolsLibraryGridOpen(true);
    };

    // Add event listeners
    window.addEventListener('show-home-manager', handleHomeManagerEvent);
    window.addEventListener('show-home-maintenance', handleHomeMaintenanceEvent);
    window.addEventListener('open-profile-manager', handleProfileManagerEvent);
    window.addEventListener('show-community-posts', handleCommunityPostsEvent);
    window.addEventListener('show-tool-rentals', handleToolRentalsEvent);
    window.addEventListener('show-rapid-assessment', handleRapidAssessmentEvent);
    window.addEventListener('show-user-tools-materials', handleUserToolsMaterialsEvent);
    window.addEventListener('show-tools-materials-editor', handleToolsMaterialsEditorEvent);
    window.addEventListener('show-ai-repair', handleAIRepairEvent);
    window.addEventListener('show-contractor-finder', handleContractorFinderEvent);
    window.addEventListener('show-expert-help', handleExpertHelpEvent);
    window.addEventListener('show-tools-library-grid', handleToolsLibraryGridEvent);

    return () => {
      window.removeEventListener('show-home-manager', handleHomeManagerEvent);
      window.removeEventListener('show-home-maintenance', handleHomeMaintenanceEvent);
      window.removeEventListener('open-profile-manager', handleProfileManagerEvent);
      window.removeEventListener('show-community-posts', handleCommunityPostsEvent);
      window.removeEventListener('show-tool-rentals', handleToolRentalsEvent);
      window.removeEventListener('show-rapid-assessment', handleRapidAssessmentEvent);
      window.removeEventListener('show-user-tools-materials', handleUserToolsMaterialsEvent);
      window.removeEventListener('show-tools-materials-editor', handleToolsMaterialsEditorEvent);
      window.removeEventListener('show-ai-repair', handleAIRepairEvent);
      window.removeEventListener('show-contractor-finder', handleContractorFinderEvent);
      window.removeEventListener('show-expert-help', handleExpertHelpEvent);
      window.removeEventListener('show-tools-library-grid', handleToolsLibraryGridEvent);
    };
  }, []);

  // Listen for clear reset flags event and sync with Index
  useEffect(() => {
    const handleClearResetFlags = () => {
      console.log('🔄 Index: Clearing reset flags');
      setResetUserView(false);
      setForceListingMode(false);
      
      // Broadcast to MobileProjectListing
      window.dispatchEvent(new CustomEvent('update-reset-flags', {
        detail: { resetUserView: false, forceListingMode: false }
      }));
    };

    window.addEventListener('clear-reset-flags', handleClearResetFlags);
    return () => window.removeEventListener('clear-reset-flags', handleClearResetFlags);
  }, []);

  // Listen for edit workflow navigation event
  useEffect(() => {
    const handleEditWorkflowNavigation = () => {
      setCurrentView('editWorkflow');
    };

    const handleKickoffNavigation = (event: CustomEvent) => {
      const { projectRunId } = event.detail;
      console.log("🎯 Index: Received kickoff navigation event:", projectRunId);
      navigate('/', {
        state: {
          view: 'user',
          projectRunId: projectRunId
        }
      });
    };

    // Only keep mobile-specific handlers that Navigation.tsx doesn't handle
    const handleShowKCExplainer = () => {
      setShowKCExplainer(true);
    };

    // Mobile-specific projects navigation (Navigation.tsx only handles desktop)
    const handleProjectsNavigationMobile = () => {
      if (!isMobile) return; // Only handle on mobile
      console.log('📱 Index: Mobile "My Projects" clicked');
      
      // Check if user has a current project - if so, go directly to it
      if (currentProjectRun) {
        console.log('📱 Index: User has current project, going directly to workflow:', currentProjectRun.name);
        setMobileView('workflow');
        setCurrentView('user');
        // Clear reset flags since we're going to workflow
        setResetUserView(false);
        setForceListingMode(false);
      } else {
        console.log('📱 Index: No current project, showing projects listing');
        handleProjectsView();
      }
    };

    const handleProfileNavigation = () => {
      console.log('🔄 Index: "My Profile" clicked - dispatching to Navigation');
      // Let Navigation.tsx handle this
      window.dispatchEvent(new CustomEvent('open-profile-manager'));
    };

    const handleToolLibraryNavigation = (event: Event) => {
      console.log('🔧 Index: Tool Library navigation received');
      event.stopPropagation();
      // Set the view to user to ensure the Navigation component can handle it
      setCurrentView('user');
    };

    const handleAdminPanelNavigation = () => {
      console.log('🛡️ Index: Admin Panel navigation received');
      handleAdminAccess();
    };

    window.addEventListener('navigate-to-edit-workflow', handleEditWorkflowNavigation);
    window.addEventListener('navigate-to-kickoff', handleKickoffNavigation as EventListener);
    // Mobile-specific projects navigation (Navigation.tsx handles desktop)
    if (isMobile) {
      window.addEventListener('navigate-to-projects', handleProjectsNavigationMobile);
    }
    window.addEventListener('show-profile', handleProfileNavigation);
    window.addEventListener('show-tools-materials', handleToolLibraryNavigation);
    window.addEventListener('show-admin-panel', handleAdminPanelNavigation);
    
    // Only add mobile-specific event listeners that Navigation.tsx doesn't handle
    window.addEventListener('show-kc-explainer', handleShowKCExplainer);
    
    return () => {
      window.removeEventListener('navigate-to-edit-workflow', handleEditWorkflowNavigation);
      window.removeEventListener('navigate-to-kickoff', handleKickoffNavigation as EventListener);
      // Clean up mobile projects listener
      if (isMobile) {
        window.removeEventListener('navigate-to-projects', handleProjectsNavigationMobile);
      }
      window.removeEventListener('show-profile', handleProfileNavigation);
      window.removeEventListener('show-tools-materials', handleToolLibraryNavigation);
      window.removeEventListener('show-admin-panel', handleAdminPanelNavigation);
      
      // Clean up mobile-specific listeners
      window.removeEventListener('show-kc-explainer', handleShowKCExplainer);
    };
  }, [isMobile, navigate, currentProjectRun]);

  // Define functions BEFORE they are used in useEffect
  const handleProjectsView = () => {
    console.log('🔄 Index: handleProjectsView called');
    setResetUserView(true);
    setForceListingMode(true);
    setCurrentView('user');
    
    // Set mobile view for mobile devices
    if (isMobile) {
      console.log('📱 Index: Setting mobile view to projects');
      setMobileView('projects');
    }
    
    // Clear projectRunId by replacing location state
    navigate('/', { replace: true, state: {} });
  };

  const handleAdminAccess = () => {
    if (isAdmin) {
      setCurrentView('admin');
    } else {
      toast.error('Access denied. Admin role required.');
    }
  };

  // CONDITIONAL LOGIC AFTER ALL HOOKS
  // Show Home component as landing page for non-authenticated users
  if (!user) {
    return <Home onViewChange={() => {}} />;
  }

  const handleProjectSelected = () => {
    console.log('🎯 Index: Project selected from dropdown - clearing reset flags');
    setForceListingMode(false);
    setResetUserView(false);
  };

  // Mobile navigation handlers
  const handleMobileNavigation = (tab: 'home' | 'projects' | 'profile' | 'help' | 'expert') => {
    setMobileActiveTab(tab);
    switch (tab) {
      case 'home':
        setMobileView('home');
        break;
      case 'projects':
        setMobileView('projects');
        break;
      case 'profile':
        // Don't set showProfileManager here, Navigation handles this
        break;
      case 'help':
        window.dispatchEvent(new CustomEvent('show-expert-help'));
        break;
      case 'expert':
        setIsExpertHelpOpen(true);
        break;
    }
  };

  const handleMobileProjectSelect = useCallback((project: any) => {
    console.log('🎯 Index: Mobile project selected:', project.name);
    
    if ('progress' in project) {
      // Project run selected - go directly to workflow
      setCurrentProjectRun(project);
      setMobileView('workflow');
      setCurrentView('user');
      // CRITICAL: Clear reset flags for direct navigation
      setResetUserView(false);
      setForceListingMode(false);
    } else {
      // Project template selected
      setCurrentProject(project);
      setMobileView('workflow');
      setCurrentView('user');
    }
  }, [setCurrentProjectRun, setCurrentProject]);

  const handleMobileQuickAction = () => {
    if (currentProjectRun) {
      setMobileView('workflow');
    } else {
      setMobileView('projects');
    }
  };

  // This useEffect is now at the top with other hooks

  const renderView = () => {
    console.log('Index renderView - currentView:', currentView);
    
    // Mobile-specific rendering
    if (isMobile && user) {
      // Handle admin access on mobile by switching to desktop view
      if (currentView === 'admin') {
        return <AdminView />;
      }
      
      switch (mobileView) {
        case 'projects':
          console.log('🔍 RENDERING Index MobileProjectListing - mobileView is projects');
          return (
            <div className="h-screen flex flex-col">
              <MobileProjectListing
                onProjectSelect={handleMobileProjectSelect}
                onNewProject={() => setMobileView('home')}
                onClose={() => setMobileView('home')}
              />
              <MobileBottomNav
                currentView="projects"
                onViewChange={handleMobileNavigation}
                onQuickAction={handleMobileQuickAction}
              />
            </div>
          );
        case 'workflow':
          return (
            <div className="h-screen flex flex-col">
              <UserView 
                resetToListing={resetUserView && !currentProjectRun} 
                forceListingMode={forceListingMode}
                onProjectSelected={() => {
                  console.log('🎯 Index: Mobile workflow - onProjectSelected called');
                  setForceListingMode(false);
                  setResetUserView(false);
                  setMobileView('workflow');
                }} 
                projectRunId={location.state?.projectRunId}
                showProfile={location.state?.showProfile}
              />
              <MobileBottomNav
                currentView="projects"
                onViewChange={handleMobileNavigation}
                onQuickAction={handleMobileQuickAction}
              />
            </div>
          );
        case 'home':
        default:
          return (
            <div className="h-screen flex flex-col">
              <MobileOptimizedHome />
              <MobileBottomNav
                currentView={mobileActiveTab}
                onViewChange={handleMobileNavigation}
                onQuickAction={handleMobileQuickAction}
              />
            </div>
          );
      }
    }
    
    // Desktop rendering
    switch (currentView) {
      case 'admin':
        return <AdminView />;
      case 'user':
        console.log('🎯 Index: Rendering UserView with state:', {
          resetToListing: resetUserView,
          projectRunId: location.state?.projectRunId,
          hasProjectRunId: !!location.state?.projectRunId,
          currentView: currentView
        });
        return (
          <ProjectNavigationErrorBoundary fallbackMessage="Failed to load project view. Please refresh the page.">
            <UserView 
              resetToListing={resetUserView && !currentProjectRun} 
              forceListingMode={forceListingMode}
              onProjectSelected={() => {
                console.log('🎯 Index: onProjectSelected called - clearing all reset flags');
                setForceListingMode(false);
                setResetUserView(false);
                setCurrentView('user');
              }} 
              projectRunId={location.state?.projectRunId}
              showProfile={location.state?.showProfile}
            />
          </ProjectNavigationErrorBoundary>
        );
      case 'editWorkflow':
        return <EditWorkflowView onBackToAdmin={() => setCurrentView('admin')} />;
      case 'home':
      default:
        return <Home onViewChange={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen relative z-10">
      {user && !isMobile && <Navigation currentView={currentView} onViewChange={setCurrentView} onAdminAccess={handleAdminAccess} onProjectsView={handleProjectsView} onProjectSelected={handleProjectSelected} />}
      <div className="w-full h-full">
        {renderView()}
      </div>
      
      {/* Modal windows that work on both mobile and desktop */}
      <HomeManager 
        open={isHomeManagerOpen}
        onOpenChange={setIsHomeManagerOpen}
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

      <RapidProjectAssessmentWindow 
        open={isRapidAssessmentOpen} 
        onOpenChange={setIsRapidAssessmentOpen}
      />
      
      <AIRepairWindow 
        open={isAIRepairOpen}
        onOpenChange={setIsAIRepairOpen}
      />
      
      <ContractorFinderWindow 
        open={isContractorFinderOpen}
        onOpenChange={setIsContractorFinderOpen}
      />
      
      <ExpertHelpWindow 
        isOpen={isExpertHelpOpen}
        onClose={() => setIsExpertHelpOpen(false)}
      />

      <ProfileManager 
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
      />

      {/* Mobile-specific modals */}
      <KeyCharacteristicsExplainer
        open={showKCExplainer}
        onOpenChange={setShowKCExplainer}
      />

      <ToolsMaterialsLibraryView 
        open={isToolsLibraryGridOpen}
        onOpenChange={setIsToolsLibraryGridOpen}
      />
    </div>
  );
};

export default Index;
