import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Home from "@/components/Home";
import AdminView from "@/components/AdminView";
import UserView from "@/components/UserView";
import AdminPasswordGate from "@/components/AdminPasswordGate";

const Index = () => {
  console.log('Index component loaded, AdminView import successful');
  const location = useLocation();
  const [currentView, setCurrentView] = useState<'home' | 'admin' | 'user'>('home');
  const [showAdminGate, setShowAdminGate] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [resetUserView, setResetUserView] = useState(false);

  useEffect(() => {
    // Check if we're returning from project catalog with a view state
    if (location.state?.view) {
      setCurrentView(location.state.view);
    }
  }, [location.state]);

  const handleAdminAccess = () => {
    if (isAdminAuthenticated) {
      setCurrentView('admin');
    } else {
      setShowAdminGate(true);
    }
  };

  const handleAdminAuthenticated = () => {
    setIsAdminAuthenticated(true);
    setShowAdminGate(false);
    setCurrentView('admin');
  };

  const handleAdminCancel = () => {
    setShowAdminGate(false);
  };

  const handleProjectsView = () => {
    setResetUserView(true);
    setTimeout(() => setResetUserView(false), 100); // Reset after a brief moment
  };

  if (showAdminGate) {
    return <AdminPasswordGate onAuthenticated={handleAdminAuthenticated} onCancel={handleAdminCancel} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'admin':
        return <AdminView />;
      case 'user':
        return <UserView resetToListing={resetUserView} onProjectSelected={() => setCurrentView('user')} />;
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