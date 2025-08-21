import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import Navigation from "@/components/Navigation";
import Home from "@/components/Home";
import { AdminView } from "@/components/AdminView";
import EditWorkflowView from "@/components/EditWorkflowView";
import UserView from "@/components/UserView";
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const { user, loading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentView, setCurrentView] = useState<'home' | 'admin' | 'user' | 'editWorkflow'>('home');
  const [resetUserView, setResetUserView] = useState(false);

  useEffect(() => {
    // Redirect to auth if not logged in
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    
    // Check if we're returning from project catalog with a view state
    if (location.state?.view) {
      console.log('🚀 Index: Navigating from project catalog with state:', location.state);
      setCurrentView(location.state.view);
      
      // DON'T reset to listing if we have a projectRunId - user should go directly to workflow
      if (location.state?.projectRunId) {
        console.log('📦 Index: Has projectRunId, NOT resetting to listing');
        setResetUserView(false);
      }
    }
  }, [user, loading, navigate, location.state]);

  const handleAdminAccess = () => {
    if (isAdmin) {
      setCurrentView('admin');
    } else {
      toast.error('Access denied. Admin role required.');
    }
  };

  const handleProjectsView = () => {
    console.log('🔄 Index: "My Projects" clicked - clearing navigation state and resetting to listing');
    
    // Clear the location state first to ensure clean navigation
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Force reset to listing when "My Projects" is clicked
    setResetUserView(true);
    
    // Keep the reset state active longer to ensure it takes effect
    setTimeout(() => {
      console.log('🔄 Index: Clearing resetUserView after delay');
      setResetUserView(false);
    }, 200);
  };

  // Listen for edit workflow navigation event
  useEffect(() => {
    const handleEditWorkflowNavigation = () => {
      setCurrentView('editWorkflow');
    };

    window.addEventListener('navigate-to-edit-workflow', handleEditWorkflowNavigation);
    return () => {
      window.removeEventListener('navigate-to-edit-workflow', handleEditWorkflowNavigation);
    };
  }, []);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }


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
          onProjectSelected={() => {
            console.log('🎯 Index: onProjectSelected called');
            setCurrentView('user');
          }} 
          projectRunId={location.state?.projectRunId} 
        />;
      case 'editWorkflow':
        return <EditWorkflowView onBackToAdmin={() => setCurrentView('admin')} />;
      default:
        return <Home onViewChange={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation currentView={currentView} onViewChange={setCurrentView} onAdminAccess={handleAdminAccess} onProjectsView={handleProjectsView} />
      {renderView()}
    </div>
  );
};

export default Index;
