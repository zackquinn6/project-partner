import { useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import ProjectCatalog from "@/components/ProjectCatalog";
import DIYSurveyPopup from "@/components/DIYSurveyPopup";

const ProjectCatalogPage = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [showSurvey, setShowSurvey] = useState(false);
  
  // Check for admin mode via URL param or route state
  const isAdminMode = searchParams.get('mode') === 'admin' || location.state?.view === 'admin';
  
  useEffect(() => {
    // Show survey for new users (not admin mode)
    if (!isAdminMode) {
      const hasSeenSurvey = localStorage.getItem('diy-survey-completed');
      if (!hasSeenSurvey) {
        setShowSurvey(true);
      }
    }
  }, [isAdminMode]);

  const handleSurveyClose = () => {
    setShowSurvey(false);
    localStorage.setItem('diy-survey-completed', 'true');
  };
  
  return (
    <>
      <ProjectCatalog isAdminMode={isAdminMode} />
      <DIYSurveyPopup 
        open={showSurvey} 
        onOpenChange={handleSurveyClose} 
      />
    </>
  );
};

export default ProjectCatalogPage;