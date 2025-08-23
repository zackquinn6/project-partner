import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { useUserRole } from '@/hooks/useUserRole';
import Navigation from "@/components/Navigation";
import Home from "@/components/Home";
import { AdminView } from "@/components/AdminView";
import EditWorkflowView from "@/components/EditWorkflowView";
import UserView from "@/components/UserView";
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { setCurrentProject, setCurrentProjectRun } = useProject();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentView, setCurrentView] = useState<'home' | 'admin' | 'user' | 'editWorkflow'>('home');
  const [resetUserView, setResetUserView] = useState(false);
  const [forceListingMode, setForceListingMode] = useState(false);

  // Show public home page if not logged in
  if (!user) {
    return <Home />;
  }

  const handleAdminAccess = () => {
    if (isAdmin) {
      setCurrentView('admin');
    } else {
      toast.error('Access denied. Admin role required.');
    }
  };

  const handleProjectsView = () => {
    console.log('🔄 Index: "My Projects" clicked - forcing listing mode');
    
    // Clear the location state first to ensure clean navigation
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Immediately clear any project selections to prevent auto-switch to workflow
    setCurrentProject(null);
    setCurrentProjectRun(null);
    
    // Force listing mode - this won't auto-clear like resetUserView
    setForceListingMode(true);
    setResetUserView(true);
    
    // Clear the resetUserView quickly but keep forceListingMode active
    setTimeout(() => {
      setResetUserView(false);
    }, 100);
  };

  const handleProjectSelected = () => {
    console.log('🎯 Index: Project selected from dropdown - clearing force listing mode');
    setForceListingMode(false);
    setResetUserView(false); // Also clear reset flag when project is selected
  };

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

    window.addEventListener('navigate-to-edit-workflow', handleEditWorkflowNavigation);
    window.addEventListener('navigate-to-kickoff', handleKickoffNavigation as EventListener);
    
    return () => {
      window.removeEventListener('navigate-to-edit-workflow', handleEditWorkflowNavigation);
      window.removeEventListener('navigate-to-kickoff', handleKickoffNavigation as EventListener);
    };
  }, [navigate]);

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
          resetToListing={resetUserView || forceListingMode} 
          forceListingMode={forceListingMode}
          onProjectSelected={() => {
            console.log('🎯 Index: onProjectSelected called - clearing all reset flags');
            setForceListingMode(false);
            setResetUserView(false);
            setCurrentView('user');
          }} 
          projectRunId={location.state?.projectRunId} 
        />;
      case 'editWorkflow':
        return <EditWorkflowView onBackToAdmin={() => setCurrentView('admin')} />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation currentView={currentView} onViewChange={setCurrentView} onAdminAccess={handleAdminAccess} onProjectsView={handleProjectsView} onProjectSelected={handleProjectSelected} />
      {renderView()}
    </div>
  );
};

export default Index;
