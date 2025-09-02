import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { useUserRole } from '@/hooks/useUserRole';
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
import { HomeManager } from '@/components/HomeManager';
import { HelpPopup } from '@/components/HelpPopup';

const Index = () => {
  // ALL HOOKS MUST BE CALLED FIRST - BEFORE ANY CONDITIONAL RETURNS
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { setCurrentProject, setCurrentProjectRun, currentProject, currentProjectRun } = useProject();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentView, setCurrentView] = useState<'home' | 'admin' | 'user' | 'editWorkflow'>('user'); // Default to 'user' for authenticated users
  const [resetUserView, setResetUserView] = useState(false);
  const [forceListingMode, setForceListingMode] = useState(false);
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [showHomeManager, setShowHomeManager] = useState(false);

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

    const handleShowHomeManager = () => {
      console.log('🏠 Index: Home Manager clicked - showing home manager');
      setShowHomeManager(true);
    };

    const handleProjectsNavigation = () => {
      console.log('🔄 Index: "My Projects" clicked from PostAuthLanding');
      console.log('🔄 Index: Current view before switch:', currentView);
      console.log('🔄 Index: Current project before clear:', currentProject?.name);
      console.log('🔄 Index: Current project run before clear:', currentProjectRun?.name);
      handleProjectsView();
    };

    const handleProfileNavigation = () => {
      console.log('🔄 Index: "My Profile" clicked from PostAuthLanding');
      // Clear any force listing flags that might interfere
      setForceListingMode(false);
      setResetUserView(false);
      setCurrentView('user');
      // Clear any project selection to ensure profile shows
      setCurrentProject(null);
      setCurrentProjectRun(null);
      // Navigate with show profile state
      navigate('/', { 
        state: { view: 'user', showProfile: true } 
      });
    };

    const handleToolLibraryNavigation = (event: Event) => {
      console.log('🔧 Index: Tool Library navigation received');
      event.stopPropagation();
      // Set the view to user to ensure the Navigation component can handle it
      setCurrentView('user');
    };

    window.addEventListener('navigate-to-edit-workflow', handleEditWorkflowNavigation);
    window.addEventListener('navigate-to-kickoff', handleKickoffNavigation as EventListener);
    window.addEventListener('navigate-to-projects', handleProjectsNavigation);
    window.addEventListener('show-profile', handleProfileNavigation);
    window.addEventListener('show-help-popup', handleShowHelpPopup);
    window.addEventListener('show-home-manager', handleShowHomeManager);
    window.addEventListener('show-tools-materials', handleToolLibraryNavigation);
    
    return () => {
      window.removeEventListener('navigate-to-edit-workflow', handleEditWorkflowNavigation);
      window.removeEventListener('navigate-to-kickoff', handleKickoffNavigation as EventListener);
      window.removeEventListener('show-help-popup', handleShowHelpPopup);
      window.removeEventListener('navigate-to-projects', handleProjectsNavigation);
      window.removeEventListener('show-profile', handleProfileNavigation);
      window.removeEventListener('show-home-manager', handleShowHomeManager);
      window.removeEventListener('show-tools-materials', handleToolLibraryNavigation);
    };
  }, [navigate]);

  // CONDITIONAL LOGIC AFTER ALL HOOKS
  // Show Home component as landing page for non-authenticated users
  if (!user) {
    return <Home onViewChange={() => {}} />;
  }

  const handleAdminAccess = () => {
    if (isAdmin) {
      setCurrentView('admin');
    } else {
      toast.error('Access denied. Admin role required.');
    }
  };

  const handleProjectsView = () => {
    console.log('🔄 Index: handleProjectsView called');
    setResetUserView(true);
    setForceListingMode(true);
    setCurrentView('user');
    // Clear projectRunId by replacing location state
    navigate('/', { replace: true, state: {} });
  };

  const handleProjectSelected = () => {
    console.log('🎯 Index: Project selected from dropdown - clearing force listing mode');
    setForceListingMode(false);
    setResetUserView(false); // Also clear reset flag when project is selected
  };

  // This useEffect is now at the top with other hooks

  const renderView = () => {
    console.log('Index renderView - currentView:', currentView);
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
      default:
        return <PostAuthLanding />;
    }
  };

  return (
    <div className="min-h-screen relative z-10">
      {user && <Navigation currentView={currentView} onViewChange={setCurrentView} onAdminAccess={handleAdminAccess} onProjectsView={handleProjectsView} onProjectSelected={handleProjectSelected} />}
      <div className="w-full h-full">
        {renderView()}
      </div>
      <HelpPopup
        isOpen={showHelpPopup}
        onClose={() => setShowHelpPopup(false)}
      />
      <HomeManager 
        open={showHomeManager}
        onOpenChange={setShowHomeManager}
      />
    </div>
  );
};

export default Index;
