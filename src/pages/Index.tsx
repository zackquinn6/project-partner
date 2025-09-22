import React, { useState, useEffect } from "react";
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
import ProjectCatalog from "@/components/ProjectCatalog";
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { HelpPopup } from '@/components/HelpPopup';
import { MobileOptimizedHome } from '@/components/MobileOptimizedHome';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { MobileProjectListing } from '@/components/MobileProjectListing';
import { MobileWorkflowView } from '@/components/MobileWorkflowView';
import { RapidProjectAssessment } from '@/components/RapidProjectAssessment';
import { ToolRentalsWindow } from '@/components/ToolRentalsWindow';
import { CodePermitsWindow } from '@/components/CodePermitsWindow';
import { ContractorFinderWindow } from '@/components/ContractorFinderWindow';
import { HomeMaintenanceWindow } from '@/components/HomeMaintenanceWindow';
import { HomeManager } from '@/components/HomeManager';
import { CommunityPostsWindow } from '@/components/CommunityPostsWindow';
import { AIRepairWindow } from '@/components/AIRepairWindow';
import { UserToolsMaterialsWindow } from '@/components/UserToolsMaterialsWindow';
import ProfileManager from '@/components/ProfileManager';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calculator } from 'lucide-react';

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
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'home' | 'projects' | 'profile' | 'help'>('home');
  
  // Modal states for mobile app buttons
  const [showRapidAssessment, setShowRapidAssessment] = useState(false);
  const [showToolRentals, setShowToolRentals] = useState(false);
  const [showCodePermits, setShowCodePermits] = useState(false);
  const [showContractorFinder, setShowContractorFinder] = useState(false);
  const [showHomeMaintenanceMgmt, setShowHomeMaintenanceMgmt] = useState(false);
  const [showHomeMgmt, setShowHomeMgmt] = useState(false);
  const [showCommunityPosts, setShowCommunityPosts] = useState(false);
  const [showAIRepair, setShowAIRepair] = useState(false);
  const [showUserToolsMaterials, setShowUserToolsMaterials] = useState(false);
  const [showProfileManager, setShowProfileManager] = useState(false);

  // Add debug logging for modal state
  useEffect(() => {
    console.log('🔍 Index: Modal states changed:', {
      showRapidAssessment,
      showUserToolsMaterials,
      showProfileManager,
      showToolRentals,
      showCodePermits
    });
  }, [showRapidAssessment, showUserToolsMaterials, showProfileManager, showToolRentals, showCodePermits]);

  // Handle navigation state changes (including view parameter)
  useEffect(() => {
    if (location.state?.view) {
      console.log('🎯 Index: Setting view from navigation state:', location.state.view);
      setCurrentView(location.state.view);
      
      if (location.state.resetToListing) {
        console.log('🔄 Index: Setting reset flags from navigation state');
        setResetUserView(true);
        setForceListingMode(true);
      }
    }
  }, [location.state]);

  // Prevent constant re-renders by memoizing navigation handlers
  const [hasHandledInitialState, setHasHandledInitialState] = useState(false);

  // Listen for edit workflow navigation event
  useEffect(() => {
    // Only handle state changes once per location change
    if (location.state?.view && !hasHandledInitialState) {
      console.log('🎯 Index: Setting view from navigation state:', location.state.view);
      setCurrentView(location.state.view);
      
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

    const handleShowHelpPopup = () => {
      setShowHelpPopup(true);
    };

    const handleRapidAssessment = () => {
      console.log('🎯 Index: Rapid Assessment button clicked');
      setShowRapidAssessment(true);
    };

    const handleShowHomeMaintenanceMgmt = () => {
      setShowHomeMaintenanceMgmt(true);
    };

    const handleShowUserToolsMaterials = () => {
      setShowUserToolsMaterials(true);
    };

    const handleShowToolRentals = () => {
      setShowToolRentals(true);
    };

    const handleShowHomeMgmt = () => {
      setShowHomeMgmt(true);
    };

    const handleShowCommunityPosts = () => {
      setShowCommunityPosts(true);
    };

    const handleShowAIRepair = () => {
      setShowAIRepair(true);
    };

    const handleShowCodePermits = () => {
      setShowCodePermits(true);
    };

    const handleShowContractorFinder = () => {
      setShowContractorFinder(true);
    };


    const handleProjectsNavigation = () => {
      console.log('🔄 Index: "My Projects" clicked from PostAuthLanding');
      console.log('🔄 Index: Current view before switch:', currentView);
      console.log('🔄 Index: Current project before clear:', currentProject?.name);
      console.log('🔄 Index: Current project run before clear:', currentProjectRun?.name);
      if (isMobile) {
        setMobileView('projects');
      }
      handleProjectsView();
    };

    const handleProfileNavigation = () => {
      console.log('🔄 Index: "My Profile" clicked - opening ProfileManager');
      setShowProfileManager(true);
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
    window.addEventListener('navigate-to-projects', handleProjectsNavigation);
    window.addEventListener('show-profile', handleProfileNavigation);
    window.addEventListener('show-help-popup', handleShowHelpPopup);
    window.addEventListener('show-tools-materials', handleToolLibraryNavigation);
    window.addEventListener('show-admin-panel', handleAdminPanelNavigation);
    
    // Mobile app event listeners
    window.addEventListener('show-rapid-assessment', handleRapidAssessment);
    window.addEventListener('show-home-maintenance', handleShowHomeMaintenanceMgmt);
    window.addEventListener('show-user-tools-materials', handleShowUserToolsMaterials);
    window.addEventListener('show-tool-rentals', handleShowToolRentals);
    window.addEventListener('show-home-manager', handleShowHomeMgmt);
    window.addEventListener('show-community-posts', handleShowCommunityPosts);
    window.addEventListener('show-ai-repair', handleShowAIRepair);
    window.addEventListener('show-code-permits', handleShowCodePermits);
    window.addEventListener('show-contractor-finder', handleShowContractorFinder);
    
    return () => {
      window.removeEventListener('navigate-to-edit-workflow', handleEditWorkflowNavigation);
      window.removeEventListener('navigate-to-kickoff', handleKickoffNavigation as EventListener);
      window.removeEventListener('show-help-popup', handleShowHelpPopup);
      window.removeEventListener('navigate-to-projects', handleProjectsNavigation);
      window.removeEventListener('show-profile', handleProfileNavigation);
      window.removeEventListener('show-tools-materials', handleToolLibraryNavigation);
      window.removeEventListener('show-admin-panel', handleAdminPanelNavigation);
      
      // Mobile app event listener cleanup
      window.removeEventListener('show-rapid-assessment', handleRapidAssessment);
      window.removeEventListener('show-home-maintenance', handleShowHomeMaintenanceMgmt);
      window.removeEventListener('show-user-tools-materials', handleShowUserToolsMaterials);
      window.removeEventListener('show-tool-rentals', handleShowToolRentals);
      window.removeEventListener('show-home-manager', handleShowHomeMgmt);
      window.removeEventListener('show-community-posts', handleShowCommunityPosts);
      window.removeEventListener('show-ai-repair', handleShowAIRepair);
      window.removeEventListener('show-code-permits', handleShowCodePermits);
      window.removeEventListener('show-contractor-finder', handleShowContractorFinder);
    };
  }, [navigate]);

  // Define functions BEFORE they are used in useEffect
  const handleProjectsView = () => {
    console.log('🔄 Index: handleProjectsView called');
    setResetUserView(true);
    setForceListingMode(true);
    setCurrentView('user');
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
    console.log('🎯 Index: Project selected from dropdown - clearing force listing mode');
    setForceListingMode(false);
    setResetUserView(false); // Also clear reset flag when project is selected
  };

  // Mobile navigation handlers
  const handleMobileNavigation = (tab: 'home' | 'projects' | 'profile' | 'help') => {
    setMobileActiveTab(tab);
    switch (tab) {
      case 'home':
        setMobileView('home');
        break;
      case 'projects':
        setMobileView('projects');
        break;
      case 'profile':
        window.dispatchEvent(new CustomEvent('open-profile-manager'));
        break;
      case 'help':
        setShowHelpPopup(true);
        break;
    }
  };

  const handleMobileProjectSelect = (project: any) => {
    if ('progress' in project) {
      setCurrentProjectRun(project);
      setMobileView('workflow');
    } else {
      setCurrentProject(project);
      setMobileView('workflow');
    }
  };

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
          return (
            <div className="h-screen flex flex-col">
              <MobileProjectListing
                onProjectSelect={handleMobileProjectSelect}
                onNewProject={() => setMobileView('home')}
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
                resetToListing={resetUserView} 
                forceListingMode={forceListingMode}
                onProjectSelected={() => {
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
        return <UserView 
          resetToListing={resetUserView} 
          forceListingMode={forceListingMode}
          onProjectSelected={() => {
            console.log('🎯 Index: onProjectSelected called - clearing all reset flags');
            setForceListingMode(false);
            setResetUserView(false);
            setCurrentView('user');
          }} 
          projectRunId={location.state?.projectRunId}
          showProfile={location.state?.showProfile}
        />;
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
      <HelpPopup
        isOpen={showHelpPopup}
        onClose={() => setShowHelpPopup(false)}
      />
      
      {/* Mobile App Modals */}
      <Dialog open={showRapidAssessment} onOpenChange={setShowRapidAssessment}>
        <DialogContent className="w-[95vw] max-w-4xl h-[90vh] max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <Calculator className="w-5 h-5" />
              Rapid Plan
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <RapidProjectAssessment />
          </div>
        </DialogContent>
      </Dialog>
      
      <ToolRentalsWindow
        isOpen={showToolRentals}
        onClose={() => setShowToolRentals(false)}
      />
      
      <CodePermitsWindow
        open={showCodePermits}
        onOpenChange={setShowCodePermits}
      />
      
      <ContractorFinderWindow
        open={showContractorFinder}
        onOpenChange={setShowContractorFinder}
      />
      
      <HomeMaintenanceWindow
        open={showHomeMaintenanceMgmt}
        onOpenChange={setShowHomeMaintenanceMgmt}
      />
      
      <HomeManager 
        open={showHomeMgmt} 
        onOpenChange={setShowHomeMgmt}
      />
      
      {/* CommunityPostsWindow handled by Navigation component */}
      
      <AIRepairWindow
        open={showAIRepair}
        onOpenChange={setShowAIRepair}
      />
      
      <UserToolsMaterialsWindow
        open={showUserToolsMaterials}
        onOpenChange={setShowUserToolsMaterials}
      />
      
      <ProfileManager
        open={showProfileManager}
        onOpenChange={setShowProfileManager}
      />
    </div>
  );
};

export default Index;
